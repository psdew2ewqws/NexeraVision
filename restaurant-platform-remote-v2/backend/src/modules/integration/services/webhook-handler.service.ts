import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
// import { OrderMappingService } from './order-mapping.service';
// import { EventEmitter2 } from '@nestjs/event-emitter';
import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server } from 'socket.io';

export interface WebhookEventPayload {
  eventType: string;
  provider: string;
  orderId: string;
  orderData: any;
  timestamp: string;
  signature?: string;
  companyId?: string;
}

/**
 * Webhook Handler Service for NEXARA Integration Events
 *
 * Processes incoming webhook events from delivery providers via NEXARA platform:
 * - Careem Now orders
 * - Talabat orders
 * - Deliveroo orders
 * - Jahez orders
 */
@Injectable()
@WebSocketGateway({
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
    credentials: true
  }
})
export class WebhookHandlerService {
  private readonly logger = new Logger(WebhookHandlerService.name);

  @WebSocketServer()
  server: Server;

  constructor(
    private readonly prisma: PrismaService,
    // private readonly orderMappingService: OrderMappingService,
    // private readonly eventEmitter: EventEmitter2
  ) {}

  /**
   * Process incoming webhook event from NEXARA platform
   * Simplified version for testing - just logs the webhook
   */
  async processWebhookEvent(payload: WebhookEventPayload) {
    try {
      this.logger.log(`✅ WEBHOOK RECEIVED: ${payload.eventType} from ${payload.provider} - Order: ${payload.orderId}`);
      this.logger.log(`📦 Webhook Data: ${JSON.stringify(payload, null, 2)}`);

      // For now, just return success to verify the endpoint is working
      return {
        success: true,
        message: 'Webhook received and logged successfully',
        eventType: payload.eventType,
        provider: payload.provider,
        orderId: payload.orderId,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      this.logger.error(`❌ Webhook processing failed:`, error.message);
      throw new BadRequestException(`Webhook processing failed: ${error.message}`);
    }
  }
}