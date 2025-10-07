import { Module } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';
import { WebhookReceiverController } from './controllers/webhook-receiver.controller';
import { WebhookProcessorService } from './services/webhook-processor.service';
import { SignatureValidatorService } from './services/signature-validator.service';
import { SignatureValidationGuard } from './guards/signature-validation.guard';
import { RateLimitGuard } from './guards/rate-limit.guard';
import { AdaptersModule } from '../adapters/adapters.module';
import { TransformationModule } from '../transformation/transformation.module';
import { BackendCommunicationModule } from '../backend-communication/backend-communication.module';

@Module({
  imports: [
    ThrottlerModule,
    AdaptersModule,
    TransformationModule,
    BackendCommunicationModule,
  ],
  controllers: [WebhookReceiverController],
  providers: [
    WebhookProcessorService,
    SignatureValidatorService,
    SignatureValidationGuard,
    RateLimitGuard,
  ],
  exports: [WebhookProcessorService, SignatureValidatorService],
})
export class WebhooksModule {}