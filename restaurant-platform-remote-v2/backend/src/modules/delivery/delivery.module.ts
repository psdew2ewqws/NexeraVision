import { Module } from '@nestjs/common';
import { DeliveryService } from './delivery.service';
import { DeliveryController } from './delivery.controller';
import { DeliveryMonitoringController } from './delivery-monitoring.controller';
import { DatabaseModule } from '../database/database.module';
import { DeliveryErrorLoggerService } from '../../common/services/delivery-error-logger.service';
import { DeliveryProviderService } from './services/delivery-provider.service';

@Module({
  imports: [DatabaseModule],
  controllers: [DeliveryController, DeliveryMonitoringController],
  providers: [
    DeliveryService,
    DeliveryErrorLoggerService,
    DeliveryProviderService
  ],
  exports: [DeliveryService, DeliveryErrorLoggerService, DeliveryProviderService]
})
export class DeliveryModule {}