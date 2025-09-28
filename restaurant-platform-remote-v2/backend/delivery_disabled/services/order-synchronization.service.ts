import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../database/prisma.service';

export interface OrderSyncRequest {
  orderId: string;
  companyId: string;
  branchId: string;
  orderData: {
    customerInfo: {
      name: string;
      phone: string;
      address: string;
      coordinates: { lat: number; lng: number };
    };
    items: Array<{
      id: string;
      name: string;
      quantity: number;
      price: number;
      modifiers?: string[];
    }>;
    totalAmount: number;
    preparationTime: number;
    specialInstructions?: string;
    deliveryFee: number;
    paymentMethod: string;
    scheduledTime?: Date;
  };
  providerType: 'careem' | 'talabat' | 'dhub';
}

export interface OrderSyncResult {
  success: boolean;
  providerOrderId?: string;
  trackingUrl?: string;
  estimatedDeliveryTime?: number;
  error?: string;
  retryable?: boolean;
}

@Injectable()
export class OrderSynchronizationService {
  private readonly logger = new Logger(OrderSynchronizationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2
  ) {}

  /**
   * Synchronize order with delivery platform
   */
  async synchronizeOrder(request: OrderSyncRequest): Promise<OrderSyncResult> {
    this.logger.log(`Starting order sync for order ${request.orderId} with ${request.providerType}`);

    try {
      // 1. Validate order data
      await this.validateOrderData(request);

      // 2. Check if order already synced
      const existingSync = await this.findExistingSync(request.orderId, request.providerType);
      if (existingSync) {
        this.logger.warn(`Order ${request.orderId} already synced with ${request.providerType}`);
        return {
          success: true,
          providerOrderId: existingSync.providerOrderId
        };
      }

      // 3. Mock sync with provider (until real implementations are ready)
      const syncResult = await this.mockSyncWithProvider(request);

      // 4. Store sync result
      if (syncResult.success) {
        await this.storeSyncResult(request, syncResult);

        // 5. Emit success event
        this.eventEmitter.emit('order.sync.success', {
          orderId: request.orderId,
          providerType: request.providerType,
          providerOrderId: syncResult.providerOrderId
        });
      } else {
        // 6. Emit failure event
        this.eventEmitter.emit('order.sync.failed', {
          orderId: request.orderId,
          providerType: request.providerType,
          error: syncResult.error,
          retryable: syncResult.retryable
        });
      }

      return syncResult;

    } catch (error) {
      this.logger.error(`Order sync failed for ${request.orderId}:`, error);

      return {
        success: false,
        error: error.message,
        retryable: true
      };
    }
  }

  /**
   * Batch synchronize multiple orders
   */
  async batchSynchronizeOrders(requests: OrderSyncRequest[]): Promise<OrderSyncResult[]> {
    this.logger.log(`Starting batch sync for ${requests.length} orders`);

    const results = [];
    const maxConcurrent = 5; // Limit concurrent requests

    for (let i = 0; i < requests.length; i += maxConcurrent) {
      const batch = requests.slice(i, i + maxConcurrent);
      const batchResults = await Promise.allSettled(
        batch.map(request => this.synchronizeOrder(request))
      );

      for (const result of batchResults) {
        if (result.status === 'fulfilled') {
          results.push(result.value);
        } else {
          results.push({
            success: false,
            error: result.reason?.message || 'Unknown error',
            retryable: true
          });
        }
      }

      // Small delay between batches
      if (i + maxConcurrent < requests.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    this.logger.log(`Batch sync completed: ${results.filter(r => r.success).length}/${results.length} successful`);
    return results;
  }

  /**
   * Validate order data before sync
   */
  private async validateOrderData(request: OrderSyncRequest): Promise<void> {
    const { orderData } = request;

    if (!orderData.customerInfo?.name || !orderData.customerInfo?.phone) {
      throw new Error('Customer name and phone are required');
    }

    if (!orderData.customerInfo?.coordinates?.lat || !orderData.customerInfo?.coordinates?.lng) {
      throw new Error('Customer coordinates are required');
    }

    if (!orderData.items || orderData.items.length === 0) {
      throw new Error('Order must have at least one item');
    }

    if (!orderData.totalAmount || orderData.totalAmount <= 0) {
      throw new Error('Order total must be greater than 0');
    }
  }

  /**
   * Find existing sync record
   */
  private async findExistingSync(orderId: string, providerType: string) {
    try {
      return await this.prisma.deliveryProviderOrder.findFirst({
        where: {
          orderNumber: orderId,
          orderStatus: { not: 'sync_failed' }
        }
      });
    } catch (error) {
      this.logger.error(`Error finding existing sync: ${error.message}`);
      return null;
    }
  }

  /**
   * Mock sync with provider (until real implementations are ready)
   */
  private async mockSyncWithProvider(request: OrderSyncRequest): Promise<OrderSyncResult> {
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Mock successful response
    return {
      success: true,
      providerOrderId: `${request.providerType.toUpperCase()}-${Date.now()}`,
      trackingUrl: `https://${request.providerType}.com/track/${request.orderId}`,
      estimatedDeliveryTime: 35
    };
  }

  /**
   * Store successful sync result
   */
  private async storeSyncResult(request: OrderSyncRequest, result: OrderSyncResult): Promise<void> {
    try {
      await this.prisma.deliveryProviderOrder.create({
        data: {
          companyId: request.companyId,
          branchId: request.branchId,
          deliveryProviderId: await this.getProviderIdByType(request.providerType),
          providerOrderId: result.providerOrderId,
          orderNumber: request.orderId,
          orderDetails: request.orderData as any,
          orderStatus: 'synced',
          estimatedDeliveryTime: new Date(Date.now() + (result.estimatedDeliveryTime || 35) * 60000)
        }
      });
    } catch (error) {
      this.logger.error(`Error storing sync result: ${error.message}`);
      // Continue even if storage fails
    }
  }

  /**
   * Get provider ID by type
   */
  private async getProviderIdByType(providerType: string): Promise<string> {
    try {
      const provider = await this.prisma.deliveryProvider.findFirst({
        where: { name: providerType }
      });

      return provider?.id || 'default-provider-id';
    } catch (error) {
      this.logger.error(`Error getting provider ID: ${error.message}`);
      return 'default-provider-id';
    }
  }
}