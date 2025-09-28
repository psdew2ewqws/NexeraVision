import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { WebSocketGateway } from '@nestjs/websockets';
import { IntegrationService } from './services/integration.service';
import { WebhookHandlerService } from './services/webhook-handler.service';
import { WebhookManagementService } from './services/webhook-management.service';
import { OrderMappingService } from './services/order-mapping.service';
import { IntegrationController } from './controllers/integration.controller';
import { WebhookController } from './controllers/webhook.controller';
import { WebhookManagementController } from './controllers/webhook-management.controller';
import { DatabaseModule } from '../database/database.module';
// import { DeliveryModule } from '../delivery/delivery.module';
// import { OrdersModule } from '../orders/orders.module';

/**
 * Integration Module for NEXARA Webhook System
 *
 * This module handles:
 * - Webhook registration and processing from NEXARA integration platform
 * - Order mapping between external providers and internal order system
 * - Real-time status synchronization
 * - Multi-tenant provider configuration
 */
@Module({
  imports: [
    DatabaseModule,
    // DeliveryModule,
    // OrdersModule,
    HttpModule.register({
      timeout: 30000,
      maxRedirects: 5,
    })
  ],
  controllers: [
    // IntegrationController,
    WebhookController,
    // WebhookManagementController
  ],
  providers: [
    // IntegrationService,
    WebhookHandlerService,
    // WebhookManagementService,
    // OrderMappingService
  ],
  exports: [
    // IntegrationService,
    WebhookHandlerService,
    // WebhookManagementService,
    // OrderMappingService
  ]
})
export class IntegrationModule {}