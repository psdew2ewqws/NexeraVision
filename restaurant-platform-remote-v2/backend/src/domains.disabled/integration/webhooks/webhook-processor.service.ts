import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { WebhookRetryService } from './webhook-retry.service';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { v4 as uuidv4 } from 'uuid';

/**
 * Webhook event structure
 */
export interface WebhookEvent {
  provider: string;
  clientId: string;
  companyId: string;
  eventType: string;
  payload: any;
  headers: Record<string, any>;
  correlationId?: string;
}

/**
 * Webhook Processor Service
 *
 * @description Processes incoming webhooks from delivery providers
 * Refactored from integration-platform with enhanced logging and event emission
 *
 * @responsibilities
 * - Process webhooks from multiple delivery providers
 * - Normalize different provider payload formats
 * - Emit domain events for order processing
 * - Handle errors and queue for retry
 * - Track processing metrics
 *
 * @example
 * ```typescript
 * await webhookProcessor.processWebhook({
 *   provider: 'careem',
 *   clientId: 'client-123',
 *   companyId: 'company-456',
 *   eventType: 'order.created',
 *   payload: { order_id: 'ORD-001', ... },
 *   headers: { 'x-careem-signature': '...' }
 * });
 * ```
 */
@Injectable()
export class WebhookProcessorService {
  private readonly logger = new Logger(WebhookProcessorService.name);

  constructor(
    private readonly eventEmitter: EventEmitter2,
    private readonly retryService: WebhookRetryService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Process incoming webhook from provider
   *
   * @param event - Webhook event data
   * @returns Processing result
   */
  async processWebhook(event: WebhookEvent): Promise<{
    success: boolean;
    logId: string;
    processingTime: number;
  }> {
    const startTime = Date.now();
    const correlationId = event.correlationId || uuidv4();
    let status: 'delivered' | 'failed' | 'pending' = 'pending';
    let error: string | null = null;
    let logId: string;

    try {
      this.logger.log(
        `Processing webhook: provider=${event.provider}, event=${event.eventType}, company=${event.companyId}, correlation=${correlationId}`,
      );

      // Create webhook log entry
      const webhookLog = await this.prisma.webhookLog.create({
        data: {
          id: uuidv4(),
          companyId: event.companyId,
          provider: event.provider,
          clientId: event.clientId,
          eventType: event.eventType,
          status: 'pending',
          requestHeaders: event.headers,
          requestPayload: event.payload,
          correlationId,
          metadata: {
            processedAt: new Date().toISOString(),
          },
        },
      });

      logId = webhookLog.id;

      // Process based on provider
      await this.processProviderWebhook(event);

      // Emit domain event for further processing
      await this.eventEmitter.emitAsync(
        `webhook.${event.provider}.${event.eventType}`,
        {
          ...event,
          correlationId,
          logId,
        },
      );

      status = 'delivered';
      const processingTime = Date.now() - startTime;

      // Update log with success
      await this.prisma.webhookLog.update({
        where: { id: logId },
        data: {
          status: 'delivered',
          deliveredAt: new Date(),
          responseTimeMs: processingTime,
          httpStatusCode: 200,
        },
      });

      this.logger.log(
        `Successfully processed webhook: ${event.eventType} in ${processingTime}ms`,
      );

      return {
        success: true,
        logId,
        processingTime,
      };
    } catch (err) {
      status = 'failed';
      error = err.message;
      const processingTime = Date.now() - startTime;

      this.logger.error(
        `Failed to process webhook: provider=${event.provider}, event=${event.eventType}, error=${error}`,
        err.stack,
      );

      // Update log with failure
      if (logId) {
        await this.prisma.webhookLog.update({
          where: { id: logId },
          data: {
            status: 'failed',
            failedAt: new Date(),
            responseTimeMs: processingTime,
            errorMessage: error,
            errorDetails: {
              stack: err.stack,
              timestamp: new Date().toISOString(),
            },
          },
        });

        // Queue for retry
        await this.retryService.queueForRetry(
          {
            id: logId,
            url: '', // Will be populated by retry service
            method: 'POST',
            headers: event.headers,
            body: event.payload,
            companyId: event.companyId,
            originalEventId: logId,
            metadata: {
              provider: event.provider,
              eventType: event.eventType,
            },
          },
          error,
          'high',
        );
      }

      return {
        success: false,
        logId: logId || 'unknown',
        processingTime,
      };
    }
  }

  /**
   * Process webhook based on provider type
   *
   * @private
   * @param event - Webhook event
   */
  private async processProviderWebhook(event: WebhookEvent): Promise<void> {
    switch (event.provider.toLowerCase()) {
      case 'careem':
        await this.processCareemEvent(event);
        break;
      case 'talabat':
        await this.processTalabatEvent(event);
        break;
      case 'deliveroo':
        await this.processDeliverooEvent(event);
        break;
      case 'jahez':
        await this.processJahezEvent(event);
        break;
      case 'hungerstatiton':
        await this.processHungerStationEvent(event);
        break;
      default:
        this.logger.warn(`Unknown provider: ${event.provider}`);
        throw new Error(`Unsupported provider: ${event.provider}`);
    }
  }

  /**
   * Process Careem webhook events
   * @private
   */
  private async processCareemEvent(event: WebhookEvent): Promise<void> {
    const { eventType, payload, companyId, clientId } = event;

    switch (eventType) {
      case 'order.created':
        await this.handleNewOrder('careem', companyId, clientId, payload);
        break;
      case 'order.updated':
        await this.handleOrderUpdate('careem', companyId, clientId, payload);
        break;
      case 'order.cancelled':
        await this.handleOrderCancellation('careem', companyId, clientId, payload);
        break;
      case 'order.delivered':
        await this.handleOrderDelivered('careem', companyId, clientId, payload);
        break;
      case 'rider.assigned':
        await this.handleRiderAssigned('careem', companyId, clientId, payload);
        break;
      default:
        this.logger.warn(`Unhandled Careem event: ${eventType}`);
    }
  }

  /**
   * Process Talabat webhook events
   * @private
   */
  private async processTalabatEvent(event: WebhookEvent): Promise<void> {
    const { eventType, payload, companyId, clientId } = event;

    switch (eventType) {
      case 'order_notification':
      case 'new_order':
        await this.handleNewOrder('talabat', companyId, clientId, payload);
        break;
      case 'status_update':
        await this.handleOrderUpdate('talabat', companyId, clientId, payload);
        break;
      case 'cancellation':
        await this.handleOrderCancellation('talabat', companyId, clientId, payload);
        break;
      default:
        this.logger.warn(`Unhandled Talabat event: ${eventType}`);
    }
  }

  /**
   * Process Deliveroo webhook events
   * @private
   */
  private async processDeliverooEvent(event: WebhookEvent): Promise<void> {
    const { payload, companyId, clientId } = event;
    const action = payload.action || event.eventType;

    switch (action) {
      case 'order_placed':
        await this.handleNewOrder('deliveroo', companyId, clientId, payload);
        break;
      case 'order_confirmed':
        await this.handleOrderConfirmation('deliveroo', companyId, clientId, payload);
        break;
      case 'order_cancelled':
        await this.handleOrderCancellation('deliveroo', companyId, clientId, payload);
        break;
      case 'order_fulfilled':
        await this.handleOrderDelivered('deliveroo', companyId, clientId, payload);
        break;
      default:
        this.logger.warn(`Unhandled Deliveroo action: ${action}`);
    }
  }

  /**
   * Process Jahez webhook events
   * @private
   */
  private async processJahezEvent(event: WebhookEvent): Promise<void> {
    const { payload, companyId, clientId } = event;
    const action = payload.action || event.eventType;

    switch (action) {
      case 'new_order':
        await this.handleNewOrder('jahez', companyId, clientId, payload);
        break;
      case 'order_accepted':
        await this.handleOrderConfirmation('jahez', companyId, clientId, payload);
        break;
      case 'order_completed':
        await this.handleOrderDelivered('jahez', companyId, clientId, payload);
        break;
      default:
        this.logger.warn(`Unhandled Jahez action: ${action}`);
    }
  }

  /**
   * Process HungerStation webhook events
   * @private
   */
  private async processHungerStationEvent(event: WebhookEvent): Promise<void> {
    const { eventType, payload, companyId, clientId } = event;

    switch (eventType) {
      case 'ORDER_PLACED':
        await this.handleNewOrder('hungerstatiton', companyId, clientId, payload);
        break;
      case 'ORDER_CONFIRMED':
        await this.handleOrderConfirmation('hungerstatiton', companyId, clientId, payload);
        break;
      case 'ORDER_CANCELLED':
        await this.handleOrderCancellation('hungerstatiton', companyId, clientId, payload);
        break;
      default:
        this.logger.warn(`Unhandled HungerStation event: ${eventType}`);
    }
  }

  /**
   * Handle new order event
   * @private
   */
  private async handleNewOrder(
    provider: string,
    companyId: string,
    clientId: string,
    payload: any,
  ): Promise<void> {
    this.logger.log(`New order from ${provider}: company=${companyId}`);

    const orderData = this.normalizeOrderData(provider, payload);

    await this.eventEmitter.emitAsync('integration.order.created', {
      provider,
      companyId,
      clientId,
      orderData,
      originalPayload: payload,
    });
  }

  /**
   * Handle order update event
   * @private
   */
  private async handleOrderUpdate(
    provider: string,
    companyId: string,
    clientId: string,
    payload: any,
  ): Promise<void> {
    await this.eventEmitter.emitAsync('integration.order.updated', {
      provider,
      companyId,
      clientId,
      orderId: payload.order_id || payload.orderId || payload.id,
      status: payload.status,
      originalPayload: payload,
    });
  }

  /**
   * Handle order cancellation event
   * @private
   */
  private async handleOrderCancellation(
    provider: string,
    companyId: string,
    clientId: string,
    payload: any,
  ): Promise<void> {
    await this.eventEmitter.emitAsync('integration.order.cancelled', {
      provider,
      companyId,
      clientId,
      orderId: payload.order_id || payload.orderId || payload.id,
      reason: payload.cancellation_reason || payload.reason,
      originalPayload: payload,
    });
  }

  /**
   * Handle order delivered event
   * @private
   */
  private async handleOrderDelivered(
    provider: string,
    companyId: string,
    clientId: string,
    payload: any,
  ): Promise<void> {
    await this.eventEmitter.emitAsync('integration.order.delivered', {
      provider,
      companyId,
      clientId,
      orderId: payload.order_id || payload.orderId || payload.id,
      deliveryTime: payload.delivered_at || payload.delivery_time,
      originalPayload: payload,
    });
  }

  /**
   * Handle order confirmation event
   * @private
   */
  private async handleOrderConfirmation(
    provider: string,
    companyId: string,
    clientId: string,
    payload: any,
  ): Promise<void> {
    await this.eventEmitter.emitAsync('integration.order.confirmed', {
      provider,
      companyId,
      clientId,
      orderId: payload.order_id || payload.orderId || payload.id,
      estimatedTime: payload.estimated_delivery_time,
      originalPayload: payload,
    });
  }

  /**
   * Handle rider assigned event
   * @private
   */
  private async handleRiderAssigned(
    provider: string,
    companyId: string,
    clientId: string,
    payload: any,
  ): Promise<void> {
    await this.eventEmitter.emitAsync('integration.rider.assigned', {
      provider,
      companyId,
      clientId,
      orderId: payload.order_id || payload.orderId || payload.id,
      rider: {
        name: payload.rider_name || payload.driver_name,
        phone: payload.rider_phone || payload.driver_phone,
        location: payload.rider_location || payload.driver_location,
      },
      originalPayload: payload,
    });
  }

  /**
   * Normalize order data from different providers
   *
   * @private
   * @param provider - Provider name
   * @param payload - Raw provider payload
   * @returns Normalized order data
   */
  private normalizeOrderData(provider: string, payload: any) {
    return {
      externalOrderId: payload.order_id || payload.orderId || payload.id,
      customerName: payload.customer?.name || payload.customer_name,
      customerPhone: payload.customer?.phone || payload.customer_phone,
      customerAddress: payload.delivery_address || payload.address,
      items: payload.items || payload.order_items || [],
      totalAmount: payload.total_amount || payload.total || payload.orderTotal,
      paymentMethod: payload.payment_method || payload.payment_type,
      notes: payload.notes || payload.special_instructions || payload.customerNotes,
      estimatedDeliveryTime:
        payload.estimated_delivery_time || payload.eta || payload.deliveryTime,
      provider,
    };
  }
}
