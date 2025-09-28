import { Module } from '@nestjs/common';
import { DeliveryProvidersController } from './delivery-providers.controller';
import { DeliveryProvidersService } from './delivery-providers.service';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [DeliveryProvidersController],
  providers: [DeliveryProvidersService],
  exports: [DeliveryProvidersService],
})
export class DeliveryProvidersModule {}