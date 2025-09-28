import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { WebhookLoggerService } from './webhook-logger.service';
import { WebhookRetryService } from './webhook-retry.service';

export interface WebhookEvent {
  provider: string;
  clientId: string;
  eventType: string;
  payload: any;
  headers: any;
}

@Injectable()
export class WebhookProcessorService {
  private readonly logger = new Logger(WebhookProcessorService.name);

  constructor(
    private readonly eventEmitter: EventEmitter2,
    private readonly webhookLogger: WebhookLoggerService,
    private readonly retryService: WebhookRetryService,
  ) {}

  async processWebhook(event: WebhookEvent) {
    const startTime = Date.now();
    let status = 'processing';
    let error = null;

    try {
      // Log incoming webhook
      const logId = await this.webhookLogger.logIncomingWebhook(event);

      this.logger.log(
        `Processing ${event.provider} webhook for client ${event.clientId}: ${event.eventType}`,
      );

      // Process based on provider
      switch (event.provider) {
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
        case 'test':
          await this.processTestEvent(event);
          break;
        default:
          this.logger.warn(`Unknown provider: ${event.provider}`);
      }

      // Emit event for further processing
      await this.eventEmitter.emitAsync(
        `webhook.${event.provider}.${event.eventType}`,
        event,
      );

      status = 'success';
      this.logger.log(
        `Successfully processed ${event.provider} webhook: ${event.eventType}`,
      );
    } catch (err) {
      status = 'failed';
      error = err.message;
      this.logger.error(
        `Error processing ${event.provider} webhook: ${error}`,
        err.stack,
      );

      // Queue for retry
      await this.retryService.queueForRetry(event, error);
    } finally {
      const processingTime = Date.now() - startTime;

      // Log processing result
      await this.webhookLogger.updateWebhookLog(event, {
        status,
        processingTime,
        error,
      });
    }
  }

  private async processCareemEvent(event: WebhookEvent) {
    const { eventType, payload } = event;

    switch (eventType) {
      case 'order.created':
        await this.handleNewOrder('careem', event.clientId, payload);
        break;
      case 'order.updated':
        await this.handleOrderUpdate('careem', event.clientId, payload);
        break;
      case 'order.cancelled':
        await this.handleOrderCancellation('careem', event.clientId, payload);
        break;
      case 'order.delivered':
        await this.handleOrderDelivered('careem', event.clientId, payload);
        break;
      case 'rider.assigned':
        await this.handleRiderAssigned('careem', event.clientId, payload);
        break;
      default:
        this.logger.warn(`Unhandled Careem event type: ${eventType}`);
    }
  }

  private async processTalabatEvent(event: WebhookEvent) {
    const { eventType, payload } = event;

    switch (eventType) {
      case 'order_notification':
        await this.handleNewOrder('talabat', event.clientId, payload);
        break;
      case 'status_update':
        await this.handleStatusUpdate('talabat', event.clientId, payload);
        break;
      case 'cancellation':
        await this.handleOrderCancellation('talabat', event.clientId, payload);
        break;
      case 'rider_update':
        await this.handleRiderUpdate('talabat', event.clientId, payload);
        break;
      default:
        this.logger.warn(`Unhandled Talabat event type: ${eventType}`);
    }
  }

  private async processDeliverooEvent(event: WebhookEvent) {
    const { eventType, payload } = event;

    // Deliveroo typically sends a single event type with action field
    const action = payload.action || eventType;

    switch (action) {
      case 'order_placed':
        await this.handleNewOrder('deliveroo', event.clientId, payload);
        break;
      case 'order_confirmed':
        await this.handleOrderConfirmation('deliveroo', event.clientId, payload);
        break;
      case 'order_cancelled':
        await this.handleOrderCancellation('deliveroo', event.clientId, payload);
        break;
      case 'order_fulfilled':
        await this.handleOrderDelivered('deliveroo', event.clientId, payload);
        break;
      case 'driver_assigned':
        await this.handleRiderAssigned('deliveroo', event.clientId, payload);
        break;
      default:
        this.logger.warn(`Unhandled Deliveroo action: ${action}`);
    }
  }

  private async processJahezEvent(event: WebhookEvent) {
    const { eventType, payload } = event;
    const action = payload.action || eventType;

    switch (action) {
      case 'new_order':
        await this.handleNewOrder('jahez', event.clientId, payload);
        break;
      case 'order_accepted':
        await this.handleOrderConfirmation('jahez', event.clientId, payload);
        break;
      case 'order_rejected':
        await this.handleOrderRejection('jahez', event.clientId, payload);
        break;
      case 'order_ready':
        await this.handleOrderReady('jahez', event.clientId, payload);
        break;
      case 'order_completed':
        await this.handleOrderDelivered('jahez', event.clientId, payload);
        break;
      default:
        this.logger.warn(`Unhandled Jahez action: ${action}`);
    }
  }

  private async processTestEvent(event: WebhookEvent) {
    this.logger.log('Processing test webhook event:', event);
    // Just log for testing purposes
  }

  // Common order handling methods
  private async handleNewOrder(
    provider: string,
    clientId: string,
    payload: any,
  ) {
    this.logger.log(`New order from ${provider} for client ${clientId}`);

    // Extract order data (structure varies by provider)
    const orderData = this.normalizeOrderData(provider, payload);

    // Emit event for order service to handle
    await this.eventEmitter.emitAsync('order.new', {
      provider,
      clientId,
      orderData,
      originalPayload: payload,
    });
  }

  private async handleOrderUpdate(
    provider: string,
    clientId: string,
    payload: any,
  ) {
    this.logger.log(`Order update from ${provider} for client ${clientId}`);

    await this.eventEmitter.emitAsync('order.updated', {
      provider,
      clientId,
      orderId: payload.order_id || payload.orderId,
      status: payload.status,
      originalPayload: payload,
    });
  }

  private async handleOrderCancellation(
    provider: string,
    clientId: string,
    payload: any,
  ) {
    this.logger.log(`Order cancellation from ${provider} for client ${clientId}`);

    await this.eventEmitter.emitAsync('order.cancelled', {
      provider,
      clientId,
      orderId: payload.order_id || payload.orderId,
      reason: payload.cancellation_reason || payload.reason,
      originalPayload: payload,
    });
  }

  private async handleOrderDelivered(
    provider: string,
    clientId: string,
    payload: any,
  ) {
    this.logger.log(`Order delivered from ${provider} for client ${clientId}`);

    await this.eventEmitter.emitAsync('order.delivered', {
      provider,
      clientId,
      orderId: payload.order_id || payload.orderId,
      deliveryTime: payload.delivered_at || payload.delivery_time,
      originalPayload: payload,
    });
  }

  private async handleOrderConfirmation(
    provider: string,
    clientId: string,
    payload: any,
  ) {
    this.logger.log(`Order confirmed by ${provider} for client ${clientId}`);

    await this.eventEmitter.emitAsync('order.confirmed', {
      provider,
      clientId,
      orderId: payload.order_id || payload.orderId,
      estimatedTime: payload.estimated_delivery_time,
      originalPayload: payload,
    });
  }

  private async handleOrderRejection(
    provider: string,
    clientId: string,
    payload: any,
  ) {
    this.logger.log(`Order rejected by ${provider} for client ${clientId}`);

    await this.eventEmitter.emitAsync('order.rejected', {
      provider,
      clientId,
      orderId: payload.order_id || payload.orderId,
      reason: payload.rejection_reason,
      originalPayload: payload,
    });
  }

  private async handleOrderReady(
    provider: string,
    clientId: string,
    payload: any,
  ) {
    this.logger.log(`Order ready for ${provider} client ${clientId}`);

    await this.eventEmitter.emitAsync('order.ready', {
      provider,
      clientId,
      orderId: payload.order_id || payload.orderId,
      originalPayload: payload,
    });
  }

  private async handleStatusUpdate(
    provider: string,
    clientId: string,
    payload: any,
  ) {
    this.logger.log(`Status update from ${provider} for client ${clientId}`);

    await this.eventEmitter.emitAsync('order.status_changed', {
      provider,
      clientId,
      orderId: payload.order_id || payload.orderId,
      oldStatus: payload.previous_status,
      newStatus: payload.status,
      originalPayload: payload,
    });
  }

  private async handleRiderAssigned(
    provider: string,
    clientId: string,
    payload: any,
  ) {
    this.logger.log(`Rider assigned by ${provider} for client ${clientId}`);

    await this.eventEmitter.emitAsync('rider.assigned', {
      provider,
      clientId,
      orderId: payload.order_id || payload.orderId,
      rider: {
        name: payload.rider_name || payload.driver_name,
        phone: payload.rider_phone || payload.driver_phone,
        location: payload.rider_location || payload.driver_location,
      },
      originalPayload: payload,
    });
  }

  private async handleRiderUpdate(
    provider: string,
    clientId: string,
    payload: any,
  ) {
    this.logger.log(`Rider update from ${provider} for client ${clientId}`);

    await this.eventEmitter.emitAsync('rider.updated', {
      provider,
      clientId,
      orderId: payload.order_id || payload.orderId,
      riderLocation: payload.location,
      estimatedArrival: payload.eta,
      originalPayload: payload,
    });
  }

  // Normalize order data from different providers
  private normalizeOrderData(provider: string, payload: any) {
    // This would contain provider-specific mapping logic
    return {
      externalOrderId: payload.order_id || payload.id,
      customerName: payload.customer?.name || payload.customer_name,
      customerPhone: payload.customer?.phone || payload.customer_phone,
      customerAddress: payload.delivery_address || payload.address,
      items: payload.items || payload.order_items || [],
      totalAmount: payload.total_amount || payload.total,
      paymentMethod: payload.payment_method || payload.payment_type,
      notes: payload.notes || payload.special_instructions,
      estimatedDeliveryTime: payload.estimated_delivery_time || payload.eta,
    };
  }
}