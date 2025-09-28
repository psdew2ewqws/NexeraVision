import { Module } from '@nestjs/common';
import { DeliveryService } from './delivery.service';
import { DeliveryController } from './delivery.controller';
import { DeliveryMonitoringController } from './delivery-monitoring.controller';
import { DatabaseModule } from '../database/database.module';
import { DeliveryErrorLoggerService } from '../../common/services/delivery-error-logger.service';
import { DeliveryProviderService } from './services/delivery-provider.service';
// Temporarily disabled to allow frontend testing
// import { OrderSynchronizationService } from './services/order-synchronization.service';
// import { MenuSyncService } from './services/menu-sync.service';
// import { RealTimeStatusService } from './services/real-time-status.service';

@Module({
  imports: [DatabaseModule],
  controllers: [DeliveryController, DeliveryMonitoringController],
  providers: [
    DeliveryService,
    DeliveryErrorLoggerService,
    DeliveryProviderService
    // Temporarily disabled to allow frontend testing
    // OrderSynchronizationService,
    // MenuSyncService,
    // RealTimeStatusService
  ],
  exports: [
    DeliveryService,
    DeliveryErrorLoggerService,
    DeliveryProviderService
    // Temporarily disabled to allow frontend testing
    // OrderSynchronizationService,
    // MenuSyncService,
    // RealTimeStatusService
  ]
})
export class DeliveryModule {}