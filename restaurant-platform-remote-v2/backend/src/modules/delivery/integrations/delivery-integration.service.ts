import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { 
  DeliveryProviderService, 
  DeliveryProviderConfig,
  DeliveryRequest,
  DeliveryResponse,
  DeliveryStatusUpdate
} from './delivery-provider.interface';
import { DHUBDeliveryService } from './dhub.service';
import { CareemDeliveryService } from './careem.service';
import { TalabatDeliveryService } from './talabat.service';
import { JahezDeliveryService } from './jahez-adapter.service';
import { DeliverooDeliveryService } from './deliveroo-adapter.service';

@Injectable()
export class DeliveryIntegrationService {
  private providerInstances = new Map<string, DeliveryProviderService>();

  constructor(private prisma: PrismaService) {}

  async getProviderService(providerId: string): Promise<DeliveryProviderService> {
    // Check cache first
    if (this.providerInstances.has(providerId)) {
      return this.providerInstances.get(providerId)!;
    }

    // Get provider configuration from database
    const provider = await this.prisma.deliveryProvider.findUnique({
      where: { id: providerId }
    });

    if (!provider || !provider.isActive) {
      throw new Error(`Provider ${providerId} not found or inactive`);
    }

    // Create provider configuration
    const config: DeliveryProviderConfig = {
      apiKey: provider.apiKey || '',
      apiSecret: (provider.configuration as any)?.apiSecret,
      baseUrl: provider.apiBaseUrl,
      timeout: (provider.configuration as any)?.timeout || 30000,
      retryAttempts: (provider.configuration as any)?.retryAttempts || 3,
      webhookUrl: (provider.configuration as any)?.webhookUrl,
      sandboxMode: (provider.configuration as any)?.sandboxMode || false,
      additionalHeaders: (provider.configuration as any)?.additionalHeaders || {},
      rateLimit: (provider.configuration as any)?.rateLimit
    };

    // Create appropriate provider instance
    let providerService: DeliveryProviderService;
    
    switch (provider.name.toLowerCase()) {
      case 'dhub':
        providerService = new DHUBDeliveryService(config);
        break;
      case 'careem':
        providerService = new CareemDeliveryService(config);
        break;
      case 'talabat':
        providerService = new TalabatDeliveryService(config);
        break;
      case 'jahez':
        providerService = new JahezDeliveryService(config);
        break;
      case 'deliveroo':
        providerService = new DeliverooDeliveryService(config);
        break;
      default:
        throw new Error(`Unsupported provider: ${provider.name}`);
    }

    // Cache the instance
    this.providerInstances.set(providerId, providerService);
    return providerService;
  }

  async createDeliveryOrder(
    branchId: string,
    request: DeliveryRequest
  ): Promise<{
    provider: any;
    response: DeliveryResponse;
  }> {
    // Find the best provider for this delivery
    const bestProvider = await this.findBestProvider(
      branchId,
      request.pickupLocation.lat,
      request.pickupLocation.lng,
      request.dropoffLocation.lat,
      request.dropoffLocation.lng
    );

    if (!bestProvider) {
      throw new Error('No available delivery provider found for this location');
    }

    // Get provider service and create order
    const providerService = await this.getProviderService(bestProvider.id);
    const response = await providerService.createDeliveryOrder(request);

    // Store order in database
    if (response.success) {
      await this.prisma.order.create({
        data: {
          id: request.orderId,
          branchId: branchId,
          orderType: 'delivery',
          status: 'confirmed',
          totalAmount: request.orderDetails.totalAmount,
          deliveryProviderId: bestProvider.id,
          providerOrderId: response.providerOrderId,
          deliveryFee: response.deliveryFee,
          pickupLocation: JSON.stringify(request.pickupLocation),
          dropoffLocation: JSON.stringify(request.dropoffLocation),
          estimatedDeliveryTime: response.estimatedDeliveryTime || 30
        }
      });
    }

    return {
      provider: bestProvider,
      response
    };
  }

  async cancelDeliveryOrder(orderId: string): Promise<boolean> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { deliveryProvider: true }
    });

    if (!order || !order.deliveryProvider) {
      throw new Error('Order or delivery provider not found');
    }

    const providerService = await this.getProviderService(order.deliveryProvider.id);
    const success = await providerService.cancelDeliveryOrder(orderId, order.providerOrderId!);

    if (success) {
      await this.prisma.order.update({
        where: { id: orderId },
        data: { status: 'cancelled' }
      });
    }

    return success;
  }

  async getDeliveryStatus(orderId: string): Promise<DeliveryStatusUpdate> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { deliveryProvider: true }
    });

    if (!order || !order.deliveryProvider) {
      throw new Error('Order or delivery provider not found');
    }

    const providerService = await this.getProviderService(order.deliveryProvider.id);
    const status = await providerService.getDeliveryStatus(order.providerOrderId!);

    // Update order status in database
    await this.prisma.order.update({
      where: { id: orderId },
      data: { 
        status: this.mapDeliveryStatusToOrderStatus(status.status),
        updatedAt: new Date()
      }
    });

    return status;
  }

  async processWebhookUpdate(
    providerId: string,
    payload: any,
    signature?: string
  ): Promise<DeliveryStatusUpdate | null> {
    try {
      const providerService = await this.getProviderService(providerId);
      
      // Validate webhook signature
      if (!providerService.validateWebhook(payload, signature)) {
        console.error(`[${providerId}] Invalid webhook signature`);
        return null;
      }

      // Process the update
      const statusUpdate = providerService.processWebhookUpdate(payload);

      // Update order in database
      await this.prisma.order.updateMany({
        where: { 
          id: statusUpdate.orderId,
          deliveryProviderId: providerId 
        },
        data: {
          status: this.mapDeliveryStatusToOrderStatus(statusUpdate.status),
          updatedAt: statusUpdate.timestamp
        }
      });

      return statusUpdate;
    } catch (error) {
      console.error(`[${providerId}] Webhook processing failed:`, error);
      return null;
    }
  }

  async calculateDeliveryFees(
    branchId: string,
    pickupLat: number,
    pickupLng: number,
    dropoffLat: number,
    dropoffLng: number
  ): Promise<Array<{
    provider: any;
    fee: number;
    estimatedTime: number;
  }>> {
    // Get all active providers
    const providers = await this.prisma.deliveryProvider.findMany({
      where: { isActive: true },
      orderBy: { priority: 'asc' }
    });

    const results = [];

    for (const provider of providers) {
      try {
        const providerService = await this.getProviderService(provider.id);
        const fee = await providerService.calculateDeliveryFee(
          pickupLat, pickupLng, dropoffLat, dropoffLng
        );

        results.push({
          provider,
          fee,
          estimatedTime: provider.avgDeliveryTime
        });
      } catch (error) {
        console.error(`[${provider.name}] Fee calculation failed:`, error);
      }
    }

    // Sort by fee (lowest first)
    return results.sort((a, b) => a.fee - b.fee);
  }

  private async findBestProvider(
    branchId: string,
    pickupLat: number,
    pickupLng: number,
    dropoffLat: number,
    dropoffLng: number
  ): Promise<any> {
    // Get delivery fees from all providers
    const providerOptions = await this.calculateDeliveryFees(
      branchId, pickupLat, pickupLng, dropoffLat, dropoffLng
    );

    if (providerOptions.length === 0) {
      return null;
    }

    // Simple strategy: return the provider with lowest fee and highest priority
    // In production, this could be more sophisticated (considering success rate, speed, etc.)
    return providerOptions.sort((a, b) => {
      // First sort by priority (lower number = higher priority)
      if (a.provider.priority !== b.provider.priority) {
        return a.provider.priority - b.provider.priority;
      }
      // Then by fee (lower fee = better)
      return a.fee - b.fee;
    })[0].provider;
  }

  private mapDeliveryStatusToOrderStatus(deliveryStatus: string): string {
    const statusMap: Record<string, string> = {
      'accepted': 'confirmed',
      'picked_up': 'preparing',
      'in_transit': 'out_for_delivery',
      'delivered': 'delivered',
      'cancelled': 'cancelled',
      'failed': 'cancelled'
    };

    return statusMap[deliveryStatus] || 'confirmed';
  }

  // Configuration management methods
  async updateProviderConfig(
    providerId: string, 
    config: Partial<DeliveryProviderConfig>
  ): Promise<void> {
    await this.prisma.deliveryProvider.update({
      where: { id: providerId },
      data: {
        apiKey: config.apiKey,
        configuration: config as any,
        updatedAt: new Date()
      }
    });

    // Clear cached instance to force reload with new config
    this.providerInstances.delete(providerId);
  }

  async testProviderConnection(providerId: string): Promise<{
    success: boolean;
    error?: string;
    responseTime?: number;
  }> {
    try {
      const startTime = Date.now();
      const providerService = await this.getProviderService(providerId);
      
      // Test with a simple fee calculation
      await providerService.calculateDeliveryFee(31.9539, 35.9106, 31.9628, 35.9094);
      
      const responseTime = Date.now() - startTime;
      
      return {
        success: true,
        responseTime
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
}