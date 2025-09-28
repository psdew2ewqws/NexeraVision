import { Module } from '@nestjs/common';
import { PrintersController } from './printers.controller';
import { PrintersService } from './printers.service';
import { DatabaseModule } from '../database/database.module';
import { PrintingModule } from '../printing/printing.module';

@Module({
  imports: [DatabaseModule, PrintingModule],
  controllers: [PrintersController],
  providers: [PrintersService],
  exports: [PrintersService],
})
export class PrintersModule {}