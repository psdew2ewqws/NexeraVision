import { Module } from '@nestjs/common';
import { PrismaModule } from '../../shared/database/prisma.module';

// Controllers
import { POSSystemController } from './controllers/pos-system.controller';
import { POSIntegrationController } from './controllers/pos-integration.controller';
import { DeliveryProviderEnhancedController } from './controllers/delivery-provider-enhanced.controller';
import { IntegrationAnalyticsController } from './controllers/integration-analytics.controller';
import { WebhookManagementController } from './controllers/webhook-management.controller';
import { IntegrationMonitoringController } from './controllers/integration-monitoring.controller';
import { VendorSelectionController } from './controllers/vendor-selection.controller';

// Services
import { POSSystemService } from './services/pos-system.service';
import { POSIntegrationService } from './services/pos-integration.service';
import { VendorSelectionService } from './services/vendor-selection.service';
import { GeographicService } from './services/geographic.service';
import { CostCalculationService } from './services/cost-calculation.service';
import { AvailabilityTrackingService } from './services/availability-tracking.service';
import { PerformanceAnalyticsService } from './services/performance-analytics.service';
import { WebhookIntegrationService } from './services/webhook-integration.service';
import { IntegrationAnalyticsService } from './services/integration-analytics.service';
import { IntegrationMonitoringService } from './services/integration-monitoring.service';

// Provider-specific services
import { DHUBService } from './integrations/dhub.service';
import { CareemService } from './integrations/careem.service';
import { TalabatService } from './integrations/talabat.service';
import { SquarePOSService } from './integrations/square-pos.service';
import { ToastPOSService } from './integrations/toast-pos.service';
import { CloverPOSService } from './integrations/clover-pos.service';
import { LightspeedPOSService } from './integrations/lightspeed-pos.service';

@Module({
  imports: [PrismaModule],
  controllers: [
    POSSystemController,
    POSIntegrationController,
    DeliveryProviderEnhancedController,
    IntegrationAnalyticsController,
    WebhookManagementController,
    IntegrationMonitoringController,
    VendorSelectionController,
  ],
  providers: [
    // Core Services
    POSSystemService,
    POSIntegrationService,
    VendorSelectionService,
    GeographicService,
    CostCalculationService,
    AvailabilityTrackingService,
    PerformanceAnalyticsService,
    WebhookIntegrationService,
    IntegrationAnalyticsService,
    IntegrationMonitoringService,

    // Delivery Provider Services
    DHUBService,
    CareemService,
    TalabatService,

    // POS System Services
    SquarePOSService,
    ToastPOSService,
    CloverPOSService,
    LightspeedPOSService,
  ],
  exports: [
    POSSystemService,
    POSIntegrationService,
    VendorSelectionService,
    GeographicService,
    CostCalculationService,
    AvailabilityTrackingService,
    PerformanceAnalyticsService,
    WebhookIntegrationService,
    IntegrationAnalyticsService,
    IntegrationMonitoringService,
  ],
})
export class IntegrationManagementModule {}