import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { DeliveryErrorLoggerService } from '../../../common/services/delivery-error-logger.service';

export interface DeliveryRequest {
  companyId: string;
  branchId: string;
  orderDetails: {
    id: string;
    customerName: string;
    customerPhone: string;
    deliveryAddress: string;
    items: Array<{
      name: string;
      quantity: number;
      price: number;
    }>;
    totalAmount: number;
    notes?: string;
  };
  preferredProvider?: string;
}

export interface DeliveryResponse {
  success: boolean;
  providerOrderId?: string;
  trackingNumber?: string;
  estimatedDeliveryTime?: Date;
  providerFee?: number;
  errorMessage?: string;
  providerType: string;
}

@Injectable()
export class DeliveryProviderService {
  private readonly logger = new Logger(DeliveryProviderService.name);

  constructor(
    private prisma: PrismaService,
    private errorLogger: DeliveryErrorLoggerService,
  ) {}

  /**
   * Create delivery order with intelligent provider selection and fallback
   */
  async createDeliveryOrder(request: DeliveryRequest): Promise<DeliveryResponse> {
    const startTime = Date.now();
    let selectedProvider: any = null;
    let lastError: Error | null = null;

    try {
      // Get available providers for this company/branch
      const availableProviders = await this.getAvailableProviders(
        request.companyId,
        request.branchId,
        request.preferredProvider
      );

      if (availableProviders.length === 0) {
        throw new BadRequestException('No delivery providers available for this location');
      }

      // Try providers in priority order with fallback
      for (const provider of availableProviders) {
        selectedProvider = provider;
        
        try {
          this.logger.log(`Attempting delivery with provider: ${provider.providerType}`, {
            companyId: request.companyId,
            orderId: request.orderDetails.id,
          });

          const result = await this.attemptDeliveryWithProvider(provider, request);
          
          if (result.success) {
            // Log successful delivery creation
            await this.errorLogger.updateProviderAnalytics(
              request.companyId,
              provider.providerType,
              { totalOrders: 1, successfulOrders: 1 }
            );

            // Track performance metrics
            const duration = Date.now() - startTime;
            this.logger.log(`Delivery order created successfully in ${duration}ms`, {
              provider: provider.providerType,
              orderId: request.orderDetails.id,
            });

            return result;
          }
        } catch (error) {
          lastError = error as Error;
          
          // Log provider-specific error
          await this.errorLogger.logDeliveryError({
            companyId: request.companyId,
            providerType: provider.providerType,
            errorType: this.categorizeError(error as Error),
            errorMessage: error.message,
            requestPayload: this.sanitizeOrderRequest(request),
            responsePayload: error,
          });

          // Update analytics for failed attempt
          await this.errorLogger.updateProviderAnalytics(
            request.companyId,
            provider.providerType,
            { totalOrders: 1, failedOrders: 1 }
          );

          this.logger.warn(`Provider ${provider.providerType} failed, trying next`, {
            error: error.message,
            orderId: request.orderDetails.id,
          });

          continue; // Try next provider
        }
      }

      // If we get here, all providers failed
      throw new Error(
        `All delivery providers failed. Last error: ${lastError?.message || 'Unknown error'}`
      );

    } catch (error) {
      const duration = Date.now() - startTime;
      
      this.logger.error(`Delivery order creation failed after ${duration}ms`, {
        error: error.message,
        orderId: request.orderDetails.id,
        providersAttempted: selectedProvider ? [selectedProvider.providerType] : [],
      });

      return {
        success: false,
        errorMessage: error.message,
        providerType: selectedProvider?.providerType || 'none',
      };
    }
  }

  /**
   * Cancel delivery order with provider
   */
  async cancelDeliveryOrder(
    companyId: string,
    providerOrderId: string
  ): Promise<{ success: boolean; errorMessage?: string }> {
    try {
      // Find the order in our system
      const order = await this.prisma.deliveryProviderOrder.findFirst({
        where: {
          companyId,
          providerOrderId,
          orderStatus: { notIn: ['delivered', 'cancelled'] },
        },
        include: {
          deliveryProvider: true,
        },
      });

      if (!order) {
        throw new Error('Order not found or already completed');
      }

      // Get provider configuration
      const providerConfig = await this.prisma.companyProviderConfig.findFirst({
        where: {
          companyId,
          providerType: order.deliveryProvider.name,
          isActive: true,
        },
      });

      if (!providerConfig) {
        throw new Error('Provider configuration not found');
      }

      // Attempt cancellation with provider
      const result = await this.cancelWithProvider(providerConfig, providerOrderId);

      if (result.success) {
        // Update order status in our system
        await this.prisma.deliveryProviderOrder.update({
          where: { id: order.id },
          data: {
            orderStatus: 'cancelled',
            failureReason: 'Cancelled by merchant',
          },
        });

        await this.errorLogger.updateProviderAnalytics(
          companyId,
          order.deliveryProvider.name,
          { cancelledOrders: 1 }
        );
      }

      return result;
    } catch (error) {
      await this.errorLogger.logDeliveryError({
        companyId,
        providerType: 'unknown',
        errorType: 'business_logic',
        errorMessage: error.message,
        requestPayload: { providerOrderId },
      });

      return { success: false, errorMessage: error.message };
    }
  }

  /**
   * Get order status from provider
   */
  async getOrderStatus(
    companyId: string,
    providerOrderId: string
  ): Promise<{
    status: string;
    trackingInfo?: any;
    estimatedDeliveryTime?: Date;
    actualDeliveryTime?: Date;
  }> {
    try {
      const order = await this.prisma.deliveryProviderOrder.findFirst({
        where: { companyId, providerOrderId },
        include: { deliveryProvider: true },
      });

      if (!order) {
        throw new Error('Order not found');
      }

      const providerConfig = await this.prisma.companyProviderConfig.findFirst({
        where: {
          companyId,
          providerType: order.deliveryProvider.name,
          isActive: true,
        },
      });

      if (!providerConfig) {
        throw new Error('Provider configuration not found');
      }

      const status = await this.getStatusFromProvider(providerConfig, providerOrderId);

      // Update our local status if different
      if (status.status !== order.orderStatus) {
        await this.prisma.deliveryProviderOrder.update({
          where: { id: order.id },
          data: {
            orderStatus: status.status,
            lastStatusCheck: new Date(),
            ...(status.actualDeliveryTime && {
              actualDeliveryTime: status.actualDeliveryTime,
            }),
          },
        });
      }

      return status;
    } catch (error) {
      await this.errorLogger.logDeliveryError({
        companyId,
        providerType: 'unknown',
        errorType: 'business_logic',
        errorMessage: error.message,
        requestPayload: { providerOrderId },
      });

      throw error;
    }
  }

  /**
   * Process incoming webhook from delivery provider
   */
  async processWebhook(
    providerType: string,
    webhookType: string,
    payload: any,
    signature?: string
  ): Promise<void> {
    let webhookLogId: string | null = null;

    try {
      // Validate webhook signature if provided
      if (signature) {
        await this.validateWebhookSignature(providerType, payload, signature);
      }

      // Log webhook receipt
      webhookLogId = await this.errorLogger.logWebhookEvent({
        companyId: payload.companyId || 'unknown',
        providerType,
        webhookType,
        orderId: payload.orderId,
        payload,
      });

      // Process webhook based on type
      switch (webhookType) {
        case 'order_status_update':
          await this.processOrderStatusWebhook(payload);
          break;
        case 'delivery_completed':
          await this.processDeliveryCompletedWebhook(payload);
          break;
        case 'delivery_failed':
          await this.processDeliveryFailedWebhook(payload);
          break;
        default:
          this.logger.warn(`Unknown webhook type: ${webhookType}`, { payload });
      }

      // Mark webhook as processed
      if (webhookLogId) {
        await this.errorLogger.markWebhookProcessed(webhookLogId);
      }
    } catch (error) {
      this.logger.error('Webhook processing failed', {
        error: error.message,
        providerType,
        webhookType,
        payload,
      });

      if (webhookLogId) {
        await this.errorLogger.markWebhookFailed(webhookLogId, error.message);
      }

      throw error;
    }
  }

  // Private helper methods

  private async getAvailableProviders(
    companyId: string,
    branchId: string,
    preferredProvider?: string
  ) {
    let whereCondition: any = {
      companyId,
      isActive: true,
      deletedAt: null,
    };

    // If preferred provider is specified, try it first
    if (preferredProvider) {
      whereCondition.providerType = preferredProvider;
    }

    const providers = await this.prisma.companyProviderConfig.findMany({
      where: whereCondition,
      orderBy: { priority: 'asc' },
      include: {
        branchMappings: {
          where: { branchId, isActive: true },
          take: 1,
        },
      },
    });

    // If no preferred provider found or no providers, get all available
    if (providers.length === 0 && preferredProvider) {
      return this.getAvailableProviders(companyId, branchId);
    }

    return providers.filter(p => p.branchMappings.length > 0);
  }

  private async attemptDeliveryWithProvider(
    provider: any,
    request: DeliveryRequest
  ): Promise<DeliveryResponse> {
    // This would be implemented based on provider type
    // For now, returning a mock response
    return {
      success: true,
      providerOrderId: `${provider.providerType}-${Date.now()}`,
      trackingNumber: `TRK-${Date.now()}`,
      estimatedDeliveryTime: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes
      providerFee: 2.5,
      providerType: provider.providerType,
    };
  }

  private async cancelWithProvider(
    providerConfig: any,
    providerOrderId: string
  ): Promise<{ success: boolean; errorMessage?: string }> {
    // Implementation depends on provider
    return { success: true };
  }

  private async getStatusFromProvider(
    providerConfig: any,
    providerOrderId: string
  ): Promise<any> {
    // Implementation depends on provider
    return {
      status: 'in_transit',
      trackingInfo: {},
    };
  }

  private async validateWebhookSignature(
    providerType: string,
    payload: any,
    signature: string
  ): Promise<void> {
    // Implementation depends on provider's signature method
    // Usually HMAC-SHA256 with webhook secret
  }

  private async processOrderStatusWebhook(payload: any): Promise<void> {
    // Update order status in database
    await this.prisma.deliveryProviderOrder.updateMany({
      where: { providerOrderId: payload.orderId },
      data: {
        orderStatus: payload.status,
        lastStatusCheck: new Date(),
      },
    });
  }

  private async processDeliveryCompletedWebhook(payload: any): Promise<void> {
    await this.prisma.deliveryProviderOrder.updateMany({
      where: { providerOrderId: payload.orderId },
      data: {
        orderStatus: 'delivered',
        actualDeliveryTime: new Date(),
        lastStatusCheck: new Date(),
      },
    });
  }

  private async processDeliveryFailedWebhook(payload: any): Promise<void> {
    await this.prisma.deliveryProviderOrder.updateMany({
      where: { providerOrderId: payload.orderId },
      data: {
        orderStatus: 'failed',
        failureReason: payload.reason || 'Delivery failed',
        lastStatusCheck: new Date(),
      },
    });
  }

  private categorizeError(error: Error): 'connection' | 'authentication' | 'validation' | 'business_logic' | 'timeout' | 'rate_limit' {
    const message = error.message.toLowerCase();
    
    if (message.includes('timeout') || message.includes('timed out')) return 'timeout';
    if (message.includes('unauthorized') || message.includes('auth')) return 'authentication';
    if (message.includes('validation') || message.includes('invalid')) return 'validation';
    if (message.includes('rate limit') || message.includes('too many')) return 'rate_limit';
    if (message.includes('connection') || message.includes('network')) return 'connection';
    
    return 'business_logic';
  }

  private sanitizeOrderRequest(request: DeliveryRequest): any {
    // Remove sensitive customer data from logs
    return {
      ...request,
      orderDetails: {
        ...request.orderDetails,
        customerPhone: request.orderDetails.customerPhone.replace(/\d{4}$/, '****'),
        deliveryAddress: '[REDACTED]',
      },
    };
  }
}