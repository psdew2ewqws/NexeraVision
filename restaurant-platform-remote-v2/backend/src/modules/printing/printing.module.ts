import { Module, forwardRef } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { PrintingService } from './printing.service';
import { PrintingController } from './printing.controller';
import { PrinterBridgeController } from './controllers/printer-bridge.controller';
import { PublicPrintingController } from './public-printing.controller';
import { Phase4MonitoringController } from './controllers/phase4-monitoring.controller';
// import { TestMenuHereController } from '../../test-menuhere.controller';
import { PrinterDiscoveryService } from './services/printer-discovery.service';
import { PrintJobService } from './services/print-job.service';
import { ESCPOSService } from './services/escpos.service';
import { TaxThermalPrinterService } from './services/tax-thermal-printer.service';
// import { MenuHereIntegrationService } from './services/menuhere-integration.service';
// import { AIESCPOSService } from './services/ai-escpos.service';
import { PrintingWebSocketGateway } from './gateways/printing-websocket.gateway';
import { NetworkDiscoveryService } from './discovery/network-discovery.service';
import { TenantPrintingService } from './services/tenant-printing.service';
import { ModernPrinterDiscoveryService } from './services/modern-printer-discovery.service';
// Phase 4 Services
import { AdvancedPrinterAnalyticsService } from './services/advanced-printer-analytics.service';
import { PrinterTestingService } from './services/printer-testing.service';
import { EnterpriseMonitoringService } from './services/enterprise-monitoring.service';
// Phase 2 Services - Service Discovery Architecture (now enabled)
import { ServiceRegistryService } from './services/service-registry.service';
// import { ServiceRegistryController } from './controllers/service-registry.controller';
import { HealthController } from './controllers/health.controller';
import { SimpleHealthController } from './controllers/simple-health.controller';
// Phase 3 Services - Background Discovery Architecture
import { DiscoveryService } from './services/discovery.service';
import { DiscoveryHeartbeatService } from './services/discovery-heartbeat.service';
import { DiscoveryController } from './controllers/discovery.controller';
import { DatabaseModule } from '../database/database.module';
import { TaxesModule } from '../taxes/taxes.module';

@Module({
  imports: [
    DatabaseModule,
    EventEmitterModule,
    forwardRef(() => TaxesModule)
  ],
  controllers: [
    PrintingController,
    PrinterBridgeController, // Direct bridge to PrinterMaster service
    PublicPrintingController,
    Phase4MonitoringController,
    SimpleHealthController,
    HealthController, // New health controller
    // Phase 3 Controllers
    DiscoveryController
    // ServiceRegistryController,
  ], // TestMenuHereController temporarily disabled
  providers: [
    PrintingService,
    PrinterDiscoveryService,
    PrintJobService,
    ESCPOSService,
    TaxThermalPrinterService,
    // MenuHereIntegrationService,
    // AIESCPOSService,
    PrintingWebSocketGateway,
    NetworkDiscoveryService,
    TenantPrintingService,
    ModernPrinterDiscoveryService,
    // Phase 4 Services
    AdvancedPrinterAnalyticsService,
    PrinterTestingService,
    EnterpriseMonitoringService,
    // Phase 3 Services
    DiscoveryService,
    DiscoveryHeartbeatService,
    // Phase 2 Services - Service Discovery Architecture (now enabled)
    ServiceRegistryService
  ],
  exports: [
    PrintingService,
    PrintJobService,
    ESCPOSService,
    TaxThermalPrinterService,
    /* MenuHereIntegrationService, */
    /* AIESCPOSService, */
    PrintingWebSocketGateway,
    TenantPrintingService,
    // Phase 4 Services
    AdvancedPrinterAnalyticsService,
    PrinterTestingService,
    EnterpriseMonitoringService,
    // Phase 3 Services
    DiscoveryService,
    DiscoveryHeartbeatService,
    // Phase 2 Services - Service Discovery Architecture (now enabled)
    ServiceRegistryService
  ]
})
export class PrintingModule {}