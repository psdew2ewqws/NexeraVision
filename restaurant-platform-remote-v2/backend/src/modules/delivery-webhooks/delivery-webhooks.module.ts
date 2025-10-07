import { Module } from '@nestjs/common';
import { CareemWebhookController } from './careem-webhook.controller';
import { DeliveryProvidersController } from './delivery-providers.controller';
import { WebhookLogsController } from './webhook-logs.controller';
import { BranchConfigController } from './branch-config.controller';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [
    CareemWebhookController,
    DeliveryProvidersController,
    WebhookLogsController,
    BranchConfigController
  ],
})
export class DeliveryWebhooksModule {}
