import { Module } from '@nestjs/common';
import { WebhookController } from './webhook.controller';
import { WebhookLogsController } from './webhook-logs.controller';
import { WebhookService } from './webhook.service';
import { WebhookProcessorService } from './webhook-processor.service';
import { WebhookValidationService } from './webhook-validation.service';
import { WebhookRetryService } from './webhook-retry.service';
import { WebhookLoggerService } from './webhook-logger.service';
import { PrismaService } from '../../shared/services/prisma.service';
import { EventsGateway } from '../../gateways/events.gateway';
import { HttpModule } from '@nestjs/axios';
import { ScheduleModule } from '@nestjs/schedule';

@Module({
  imports: [
    HttpModule.register({
      timeout: 10000,
      maxRedirects: 5,
    }),
    ScheduleModule.forRoot(),
  ],
  controllers: [WebhookController, WebhookLogsController],
  providers: [
    WebhookService,
    WebhookProcessorService,
    WebhookValidationService,
    WebhookRetryService,
    WebhookLoggerService,
    PrismaService,
    EventsGateway,
  ],
  exports: [
    WebhookService,
    WebhookProcessorService,
    WebhookLoggerService,
    EventsGateway,
  ],
})
export class WebhookModule {}