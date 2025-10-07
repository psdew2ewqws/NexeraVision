import { Module } from '@nestjs/common';
import { OrderTransformerService } from './services/order-transformer.service';
import { ValidationService } from './services/validation.service';

@Module({
  providers: [OrderTransformerService, ValidationService],
  exports: [OrderTransformerService, ValidationService],
})
export class TransformationModule {}