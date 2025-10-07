import { Module } from '@nestjs/common';
import { CommonModule } from '../../common/common.module';

// Controllers
import { ApiKeysController } from './controllers/api-keys.controller';
import { WebhooksController } from './controllers/webhooks.controller';
import { IntegrationOrdersController } from './controllers/integration-orders.controller';
import { IntegrationLogsController } from './controllers/integration-logs.controller';
import { IntegrationMonitoringController } from './controllers/integration-monitoring.controller';

// Services
import { ApiKeysService } from './services/api-keys.service';
import { WebhooksService } from './services/webhooks.service';
import { IntegrationOrdersService } from './services/integration-orders.service';
import { IntegrationLogsService } from './services/integration-logs.service';
import { IntegrationMonitoringService } from './services/integration-monitoring.service';

// Guards
import { ApiKeyAuthGuard } from './guards/api-key-auth.guard';

@Module({
  imports: [CommonModule],
  controllers: [
    ApiKeysController,
    WebhooksController,
    IntegrationOrdersController,
    IntegrationLogsController,
    IntegrationMonitoringController,
  ],
  providers: [
    ApiKeysService,
    WebhooksService,
    IntegrationOrdersService,
    IntegrationLogsService,
    IntegrationMonitoringService,
    ApiKeyAuthGuard,
  ],
  exports: [
    ApiKeysService,
    WebhooksService,
    IntegrationOrdersService,
    IntegrationLogsService,
    IntegrationMonitoringService,
  ],
})
export class IntegrationModule {}
