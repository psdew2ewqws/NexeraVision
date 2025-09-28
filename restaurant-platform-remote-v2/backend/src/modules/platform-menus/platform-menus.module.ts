// ================================================
// Platform Menus Module
// Restaurant Platform v2 - Complete Module Configuration
// ================================================

import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { HttpModule } from '@nestjs/axios';
import { ScheduleModule } from '@nestjs/schedule';

// Controllers
import { PlatformMenusController } from './platform-menus.controller';
import { PlatformSpecificController } from './controllers/platform-specific.controller';
import { PlatformSyncController } from './controllers/platform-sync.controller';

// Core Services
import { PlatformMenusService } from './services/platform-menus.service';
import { MenuSyncEngineService } from './services/menu-sync-engine.service';
import { MultiPlatformSyncService } from './services/multi-platform-sync.service';
import { PlatformAdapterService } from './services/platform-adapter.service';
import { MenuValidationService } from './services/menu-validation.service';
import { MenuCacheService } from './services/menu-cache.service';
import { PlatformSyncService } from './services/platform-sync.service';
import { RetryMechanismService } from './services/retry-mechanism.service';

// Platform-Specific Services
import { PlatformTransformationService } from './services/platform-transformation.service';
import { TalabatMenuService } from './services/platform-specific/talabat-menu.service';
import { CareemMenuService } from './services/platform-specific/careem-menu.service';
import { CallCenterMenuService } from './services/platform-specific/call-center-menu.service';

// Gateways
import { SyncProgressGateway } from './gateways/sync-progress.gateway';

// Shared modules
import { DatabaseModule } from '../database/database.module';
import { CommonModule } from '../../common/common.module';

@Module({
  imports: [
    DatabaseModule,
    CommonModule,
    EventEmitterModule.forRoot({
      wildcard: true,
      delimiter: '.',
      maxListeners: 20,
    }),
    HttpModule.register({
      timeout: 30000,
      maxRedirects: 3,
    }),
    ScheduleModule.forRoot()
  ],
  controllers: [
    PlatformMenusController,
    PlatformSpecificController,
    PlatformSyncController
  ],
  providers: [
    // Core services
    PlatformMenusService,
    MenuValidationService,
    MenuCacheService,

    // Enhanced sync services
    PlatformSyncService,
    RetryMechanismService,

    // Sync engine services
    MenuSyncEngineService,
    MultiPlatformSyncService,
    PlatformAdapterService,

    // Platform-specific services
    PlatformTransformationService,
    TalabatMenuService,
    CareemMenuService,
    CallCenterMenuService,

    // WebSocket gateway
    SyncProgressGateway
  ],
  exports: [
    PlatformMenusService,
    MenuSyncEngineService,
    MultiPlatformSyncService,
    PlatformAdapterService,
    PlatformTransformationService,
    TalabatMenuService,
    CareemMenuService,
    CallCenterMenuService,
    SyncProgressGateway,
    // New enhanced services
    PlatformSyncService,
    RetryMechanismService
  ]
})
export class PlatformMenusModule {}