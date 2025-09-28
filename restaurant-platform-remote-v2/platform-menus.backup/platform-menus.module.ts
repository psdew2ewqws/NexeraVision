// ================================================
// Platform Menus Module
// Restaurant Platform v2 - Complete Module Configuration
// ================================================

import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { HttpModule } from '@nestjs/axios';

// Controllers
import { PlatformMenusController } from './platform-menus.controller';
import { PlatformSpecificController } from './controllers/platform-specific.controller';

// Core Services
import { PlatformMenusService } from './services/platform-menus.service';
import { MenuSyncEngineService } from './services/menu-sync-engine.service';
import { MultiPlatformSyncService } from './services/multi-platform-sync.service';
import { PlatformAdapterService } from './services/platform-adapter.service';
import { MenuValidationService } from './services/menu-validation.service';
import { MenuCacheService } from './services/menu-cache.service';

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
    EventEmitterModule,
    HttpModule // For external API calls to Talabat/Careem
  ],
  controllers: [
    PlatformMenusController,
    PlatformSpecificController
  ],
  providers: [
    // Core services
    PlatformMenusService,
    MenuValidationService,
    MenuCacheService,

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
    SyncProgressGateway
  ]
})
export class PlatformMenusModule {}