/**
 * Integration Domain Public API
 *
 * @description Exports for the integration domain
 * Provides clean public interface for other domains to use
 */

// Main module
export { IntegrationModule } from './integration.module';

// Webhook exports
export { WebhookModule } from './webhooks/webhook.module';
export { WebhookService } from './webhooks/webhook.service';
export { WebhookProcessorService, WebhookEvent } from './webhooks/webhook-processor.service';
export { WebhookRetryService, WebhookRetryPayload, RetryQueueItem } from './webhooks/webhook-retry.service';
export { WebhookValidationService } from './webhooks/webhook-validation.service';
export { WebhookController } from './webhooks/webhook.controller';

// API Key exports
export { ApiKeyModule } from './api-keys/api-key.module';
export { ApiKeyService } from './api-keys/api-key.service';
export { ApiKeyGuard } from './api-keys/guards/api-key.guard';

// Integration Order exports
export { IntegrationOrderModule } from './integration-orders/integration-order.module';
export { IntegrationOrderService } from './integration-orders/integration-order.service';
export { OrderStateMachine, OrderStatus, OrderStateTransition } from './integration-orders/order-state.machine';

// Monitoring exports
export { IntegrationMonitoringModule } from './monitoring/integration-monitoring.module';
export { IntegrationMonitoringService } from './monitoring/integration-monitoring.service';

// DTO exports
export {
  RegisterWebhookDto,
  WebhookLogFiltersDto,
  WebhookStatsDto,
} from './webhooks/dto/register-webhook.dto';
