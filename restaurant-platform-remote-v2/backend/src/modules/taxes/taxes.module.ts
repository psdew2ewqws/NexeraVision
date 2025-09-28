import { Module } from '@nestjs/common';
import { TaxesController } from './taxes.controller';
import { TaxesService } from './taxes.service';
import { TaxCalculationService } from './services/tax-calculation.service';
import { TaxConfigurationService } from './services/tax-configuration.service';

@Module({
  controllers: [TaxesController],
  providers: [
    TaxesService,
    TaxCalculationService,
    TaxConfigurationService,
  ],
  exports: [
    TaxesService,
    TaxCalculationService,
    TaxConfigurationService,
  ],
})
export class TaxesModule {}