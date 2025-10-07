import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ScheduleModule } from '@nestjs/schedule';
import { WebhookController } from './webhook.controller';
import { WebhookService } from './webhook.service';
import { WebhookProcessorService } from './webhook-processor.service';
import { WebhookRetryService } from './webhook-retry.service';
import { WebhookValidationService } from './webhook-validation.service';
import { PrismaService } from '../../../infrastructure/database/prisma.service';

/**
 * Webhook Module
 *
 * @description Manages webhook registration, processing, and retry logic
 * Provides comprehensive webhook handling for delivery provider integrations
 */
@Module({
  imports: [
    EventEmitterModule.forRoot(),
    ScheduleModule.forRoot(),
  ],
  controllers: [WebhookController],
  providers: [
    WebhookService,
    WebhookProcessorService,
    WebhookRetryService,
    WebhookValidationService,
    PrismaService,
  ],
  exports: [
    WebhookService,
    WebhookProcessorService,
    WebhookRetryService,
    WebhookValidationService,
  ],
})
export class WebhookModule {}
