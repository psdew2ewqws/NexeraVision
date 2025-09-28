import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PrinterController } from './printer.controller';
import { PrinterService } from './printer.service';
import { LicenseController } from './license.controller';
import { LicenseService } from './license.service';
import { DeviceController } from './device.controller';
import { DeviceService } from './device.service';
import { PrinterLicense } from './entities/printer-license.entity';
import { Printer } from './entities/printer.entity';
import { PrinterDevice } from './entities/printer-device.entity';
import { PrinterStatusLog } from './entities/printer-status-log.entity';
import { PrinterTestResult } from './entities/printer-test-result.entity';
import { PrinterWebSocketGateway } from './printer-websocket.gateway';
import { HealthModule } from '../health/health.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PrinterLicense,
      Printer,
      PrinterDevice,
      PrinterStatusLog,
      PrinterTestResult,
    ]),
    HealthModule,
  ],
  controllers: [
    PrinterController,
    LicenseController,
    DeviceController,
  ],
  providers: [
    PrinterService,
    LicenseService,
    DeviceService,
    PrinterWebSocketGateway,
  ],
  exports: [
    PrinterService,
    LicenseService,
    DeviceService,
  ],
})
export class PrinterModule {}