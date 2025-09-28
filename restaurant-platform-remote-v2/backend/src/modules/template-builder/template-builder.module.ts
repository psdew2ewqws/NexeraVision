import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { TemplateBuilderController } from './controllers/template-builder.controller';
import { ThermalPrinterController } from './controllers/thermal-printer.controller';
import { TemplateBuilderService } from './services/template-builder.service';
import { EscposRendererService } from './services/escpos-renderer.service';
import { ThermalPrinterDetectionService } from './services/thermal-printer-detection.service';
import { ThermalLogoProcessorService } from './services/thermal-logo-processor.service';
import { PrinterConfigurationService } from './services/printer-configuration.service';
import { MenuIntegrationService } from './services/menu-integration.service';
import { JordanCurrencyService } from './services/jordan-currency.service';
import { TemplateAccessGuard } from './guards/template-access.guard';
import { PrismaService } from '../database/prisma.service';

@Module({
  imports: [
    MulterModule.register({
      dest: './uploads/temp',
      limits: {
        fileSize: 5 * 1024 * 1024 // 5MB
      }
    })
  ],
  controllers: [
    TemplateBuilderController,
    ThermalPrinterController
  ],
  providers: [
    // Core services
    TemplateBuilderService,
    EscposRendererService,

    // Thermal printer services
    ThermalPrinterDetectionService,
    ThermalLogoProcessorService,
    PrinterConfigurationService,

    // Integration services
    MenuIntegrationService,
    JordanCurrencyService,

    // Guards
    TemplateAccessGuard,

    // Database
    PrismaService
  ],
  exports: [
    TemplateBuilderService,
    EscposRendererService,
    ThermalPrinterDetectionService,
    ThermalLogoProcessorService,
    PrinterConfigurationService,
    MenuIntegrationService,
    JordanCurrencyService,
    TemplateAccessGuard
  ]
})
export class TemplateBuilderModule {}