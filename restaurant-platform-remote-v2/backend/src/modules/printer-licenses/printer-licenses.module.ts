import { Module } from '@nestjs/common';
import { PrinterLicensesController } from './printer-licenses.controller';
import { PrinterLicensesService } from './printer-licenses.service';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [PrinterLicensesController],
  providers: [PrinterLicensesService],
  exports: [PrinterLicensesService],
})
export class PrinterLicensesModule {}