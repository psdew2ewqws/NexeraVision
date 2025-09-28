import { Controller, Post, Body, Headers, Logger, BadRequestException } from '@nestjs/common';
import { WebhookHandlerService, WebhookEventPayload } from '../services/webhook-handler.service';

/**
 * Webhook Controller for NEXARA Integration Events
 *
 * Public endpoint that receives webhook events from NEXARA platform
 * for delivery provider integrations (Careem, Talabat, Deliveroo, Jahez)
 *
 * Endpoint: POST /api/integration/webhook
 */
@Controller('api/integration')
export class WebhookController {
  private readonly logger = new Logger(WebhookController.name);

  constructor(private readonly webhookHandler: WebhookHandlerService) {}

  /**
   * Main webhook endpoint for receiving NEXARA events
   *
   * This endpoint receives webhook events from the NEXARA integration platform
   * running on port 3002 and processes them for the restaurant platform.
   *
   * Expected payload structure:
   * {
   *   "eventType": "order.created",
   *   "provider": "careem",
   *   "orderId": "external_order_id_123",
   *   "orderData": { ... provider-specific order data ... },
   *   "timestamp": "2024-01-01T12:00:00Z",
   *   "signature": "webhook_signature_hash",
   *   "companyId": "restaurant_company_uuid"
   * }
   */
  @Post('webhook')
  async handleWebhook(
    @Body() payload: WebhookEventPayload,
    @Headers('x-nexara-signature') signature?: string,
    @Headers('x-webhook-id') webhookId?: string,
    @Headers('x-timestamp') timestamp?: string
  ) {
    try {
      this.logger.log(`Received webhook: ${payload.eventType} from ${payload.provider} for order ${payload.orderId}`);

      // Add headers to payload for signature validation
      const enrichedPayload: WebhookEventPayload = {
        ...payload,
        signature: signature || payload.signature
      };

      // Validate required fields
      if (!payload.eventType || !payload.provider || !payload.orderId) {
        throw new BadRequestException('Missing required webhook fields: eventType, provider, orderId');
      }

      // Process the webhook event
      const result = await this.webhookHandler.processWebhookEvent(enrichedPayload);

      this.logger.log(`Successfully processed webhook for order ${payload.orderId}: ${JSON.stringify(result)}`);

      return {
        success: true,
        message: 'Webhook processed successfully',
        orderId: payload.orderId,
        provider: payload.provider,
        eventType: payload.eventType,
        result
      };

    } catch (error) {
      this.logger.error(`Webhook processing failed for ${payload?.provider} order ${payload?.orderId}:`, error.message);

      // Return error response but don't throw to prevent webhook retries for client errors
      return {
        success: false,
        error: error.message,
        orderId: payload?.orderId,
        provider: payload?.provider,
        eventType: payload?.eventType,
        timestamp: new Date()
      };
    }
  }

  /**
   * Webhook health check endpoint
   * GET /api/integration/webhook/health
   */
  @Post('webhook/health')
  async webhookHealthCheck() {
    return {
      success: true,
      message: 'Webhook endpoint is healthy',
      timestamp: new Date(),
      version: '1.0.0'
    };
  }

  /**
   * Test webhook endpoint for development/debugging
   * POST /api/integration/webhook/test
   */
  @Post('webhook/test')
  async testWebhook(@Body() testPayload?: any) {
    this.logger.log('Test webhook endpoint called');

    // Sample test payload
    const samplePayload: WebhookEventPayload = testPayload || {
      eventType: 'order.created',
      provider: 'careem',
      orderId: 'test_order_123',
      orderData: {
        customer: {
          name: 'Test Customer',
          phone: '+962791234567'
        },
        restaurant_id: 'test_restaurant_1',
        order_amount: '25.50',
        items: [
          {
            name: 'Test Item',
            quantity: '2',
            price: '12.75'
          }
        ]
      },
      timestamp: new Date().toISOString(),
      companyId: 'test_company_id'
    };

    try {
      const result = await this.webhookHandler.processWebhookEvent(samplePayload);

      return {
        success: true,
        message: 'Test webhook processed successfully',
        testPayload: samplePayload,
        result
      };

    } catch (error) {
      this.logger.error('Test webhook failed:', error.message);

      return {
        success: false,
        error: error.message,
        testPayload: samplePayload
      };
    }
  }

  /**
   * Provider-specific webhook endpoints (optional, for direct provider webhooks)
   */

  @Post('webhook/careem')
  async handleCareemWebhook(@Body() payload: any, @Headers() headers: any) {
    const webhookPayload: WebhookEventPayload = {
      eventType: this.mapCareemEventType(payload.event_type || payload.status),
      provider: 'careem',
      orderId: payload.order_id || payload.order_number,
      orderData: payload,
      timestamp: new Date().toISOString(),
      signature: headers['x-careem-signature']
    };

    return await this.handleWebhook(webhookPayload, webhookPayload.signature);
  }

  @Post('webhook/talabat')
  async handleTalabatWebhook(@Body() payload: any, @Headers() headers: any) {
    const webhookPayload: WebhookEventPayload = {
      eventType: this.mapTalabatEventType(payload.event || payload.status),
      provider: 'talabat',
      orderId: payload.order_id,
      orderData: payload,
      timestamp: new Date().toISOString(),
      signature: headers['x-talabat-signature']
    };

    return await this.handleWebhook(webhookPayload, webhookPayload.signature);
  }

  @Post('webhook/deliveroo')
  async handleDeliverooWebhook(@Body() payload: any, @Headers() headers: any) {
    const webhookPayload: WebhookEventPayload = {
      eventType: this.mapDeliverooEventType(payload.event_name || payload.status),
      provider: 'deliveroo',
      orderId: payload.order_id,
      orderData: payload,
      timestamp: new Date().toISOString(),
      signature: headers['x-deliveroo-signature']
    };

    return await this.handleWebhook(webhookPayload, webhookPayload.signature);
  }

  @Post('webhook/jahez')
  async handleJahezWebhook(@Body() payload: any, @Headers() headers: any) {
    const webhookPayload: WebhookEventPayload = {
      eventType: this.mapJahezEventType(payload.event_type || payload.status),
      provider: 'jahez',
      orderId: payload.order_number || payload.order_id,
      orderData: payload,
      timestamp: new Date().toISOString(),
      signature: headers['x-jahez-signature']
    };

    return await this.handleWebhook(webhookPayload, webhookPayload.signature);
  }

  /**
   * Helper methods to map provider-specific event types
   */
  private mapCareemEventType(careemEvent: string): string {
    const eventMap: Record<string, string> = {
      'new_order': 'order.created',
      'order_accepted': 'order.updated',
      'order_cancelled': 'order.cancelled',
      'order_delivered': 'order.delivered',
      'status_changed': 'order.status_changed'
    };

    return eventMap[careemEvent] || 'order.updated';
  }

  private mapTalabatEventType(talabatEvent: string): string {
    const eventMap: Record<string, string> = {
      'order_created': 'order.created',
      'order_confirmed': 'order.updated',
      'order_cancelled': 'order.cancelled',
      'order_delivered': 'order.delivered'
    };

    return eventMap[talabatEvent] || 'order.updated';
  }

  private mapDeliverooEventType(deliverooEvent: string): string {
    const eventMap: Record<string, string> = {
      'order_created': 'order.created',
      'order_acknowledged': 'order.updated',
      'order_cancelled': 'order.cancelled',
      'order_delivered': 'order.delivered'
    };

    return eventMap[deliverooEvent] || 'order.updated';
  }

  private mapJahezEventType(jahezEvent: string): string {
    const eventMap: Record<string, string> = {
      'order_received': 'order.created',
      'order_confirmed': 'order.updated',
      'order_cancelled': 'order.cancelled',
      'order_delivered': 'order.delivered'
    };

    return eventMap[jahezEvent] || 'order.updated';
  }
}