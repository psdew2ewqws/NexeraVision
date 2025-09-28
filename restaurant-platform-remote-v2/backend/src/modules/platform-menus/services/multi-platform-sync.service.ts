// ================================================
// Multi-Platform Sync Service
// Restaurant Platform v2 - Blazing Fast Multi-Platform Synchronization
// ================================================

import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../database/prisma.service';
import { MenuSyncEngineService, SyncRequest } from './menu-sync-engine.service';
import { PlatformAdapterService } from './platform-adapter.service';
import { MenuCacheService } from './menu-cache.service';
import {
  DeliveryPlatform,
  MenuSyncResponse,
  MenuSyncStatusResponse,
  SyncStatus
} from '../types/platform-menu.types';

// ================================================
// MULTI-PLATFORM SYNC INTERFACES
// ================================================

export interface MultiPlatformSyncRequest {
  menuId: string;
  platforms: DeliveryPlatform[];
  syncType: 'manual' | 'scheduled' | 'auto';
  options?: {
    parallelProcessing?: boolean;
    maxConcurrency?: number;
    stopOnFirstError?: boolean;
    notifyOnComplete?: boolean;
  };
  initiatedBy?: string;
}

export interface MultiPlatformSyncResponse {
  multiSyncId: string;
  individualSyncs: {
    platform: DeliveryPlatform;
    syncId: string;
    status: SyncStatus;
  }[];
  overallStatus: SyncStatus;
  estimatedDuration: number;
  startedAt: Date;
}

export interface MultiPlatformSyncStatus {
  multiSyncId: string;
  overallStatus: SyncStatus;
  overallProgress: {
    completedPlatforms: number;
    totalPlatforms: number;
    percentage: number;
  };
  platformStatuses: {
    platform: DeliveryPlatform;
    syncId: string;
    status: SyncStatus;
    progress: any;
    errors?: string[];
  }[];
  totalItemsSynced: number;
  totalErrors: number;
  estimatedTimeRemaining: number;
  startedAt: Date;
  completedAt?: Date;
}

export interface MultiSyncJob {
  id: string;
  menuId: string;
  platforms: DeliveryPlatform[];
  individualSyncs: Map<DeliveryPlatform, string>; // platform -> syncId
  status: SyncStatus;
  startedAt: Date;
  completedAt?: Date;
  options: MultiPlatformSyncRequest['options'];
  initiatedBy?: string;
}

// ================================================
// MULTI-PLATFORM SYNC SERVICE
// ================================================

@Injectable()
export class MultiPlatformSyncService {
  private readonly logger = new Logger(MultiPlatformSyncService.name);
  private readonly activeMultiSyncs = new Map<string, MultiSyncJob>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly syncEngine: MenuSyncEngineService,
    private readonly platformAdapter: PlatformAdapterService,
    private readonly cacheService: MenuCacheService,
    private readonly eventEmitter: EventEmitter2
  ) {}

  // ================================================
  // MULTI-PLATFORM SYNC OPERATIONS
  // ================================================

  /**
   * Start blazing fast multi-platform sync
   * Target: <30s for 500+ items across all platforms
   */
  async startMultiPlatformSync(request: MultiPlatformSyncRequest): Promise<MultiPlatformSyncResponse> {
    const multiSyncId = this.generateMultiSyncId();
    const startTime = new Date();

    try {
      // Validate platforms
      await this.validatePlatforms(request.platforms);

      // Get menu data once for all platforms
      const menu = await this.getMenuForSync(request.menuId);
      if (!menu) {
        throw new Error(`Menu ${request.menuId} not found`);
      }

      // Create multi-sync job
      const multiSyncJob: MultiSyncJob = {
        id: multiSyncId,
        menuId: request.menuId,
        platforms: request.platforms,
        individualSyncs: new Map(),
        status: SyncStatus.IN_PROGRESS,
        startedAt: startTime,
        options: {
          parallelProcessing: true,
          maxConcurrency: 4,
          stopOnFirstError: false,
          notifyOnComplete: true,
          ...request.options
        },
        initiatedBy: request.initiatedBy
      };

      this.activeMultiSyncs.set(multiSyncId, multiSyncJob);

      // Calculate estimated duration
      const totalItems = menu.items?.length || 0;
      const estimatedDuration = this.estimateMultiPlatformSyncDuration(
        request.platforms,
        totalItems,
        multiSyncJob.options.parallelProcessing
      );

      // Start individual platform syncs
      const individualSyncs = await this.startPlatformSyncs(multiSyncJob, menu, request);

      // Record multi-sync in database
      await this.recordMultiSyncStart(multiSyncJob, request);

      // Start monitoring async
      this.monitorMultiSyncProgress(multiSyncJob);

      this.logger.log(
        `Started multi-platform sync ${multiSyncId} for menu ${request.menuId} across ${request.platforms.length} platforms`
      );

      // Emit start event
      this.eventEmitter.emit('multi-sync.started', {
        multiSyncId,
        menuId: request.menuId,
        platforms: request.platforms
      });

      return {
        multiSyncId,
        individualSyncs,
        overallStatus: SyncStatus.IN_PROGRESS,
        estimatedDuration,
        startedAt: startTime
      };

    } catch (error) {
      this.logger.error(`Failed to start multi-platform sync for menu ${request.menuId}:`, error);
      throw error;
    }
  }

  /**
   * Get multi-platform sync status with real-time progress
   */
  async getMultiSyncStatus(multiSyncId: string): Promise<MultiPlatformSyncStatus> {
    // Try cache first
    const cacheKey = `multi-sync-status:${multiSyncId}`;
    let cachedStatus = await this.cacheService.get(cacheKey) as MultiPlatformSyncStatus;
    if (cachedStatus) {
      return cachedStatus;
    }

    // Check active syncs
    const multiSyncJob = this.activeMultiSyncs.get(multiSyncId);
    if (multiSyncJob) {
      const status = await this.buildMultiSyncStatus(multiSyncJob);
      await this.cacheService.set(cacheKey, status, 30); // Cache for 30 seconds
      return status;
    }

    // Check database for completed syncs
    const dbMultiSync = await this.prisma.multiPlatformSyncHistory.findUnique({
      where: { id: multiSyncId },
      include: {
        individualSyncs: true
      }
    });

    if (!dbMultiSync) {
      throw new Error(`Multi-platform sync ${multiSyncId} not found`);
    }

    // Build status from database
    return {
      multiSyncId,
      overallStatus: dbMultiSync.overallStatus as SyncStatus,
      overallProgress: {
        completedPlatforms: dbMultiSync.successfulPlatforms,
        totalPlatforms: dbMultiSync.totalPlatforms,
        percentage: (dbMultiSync.successfulPlatforms / dbMultiSync.totalPlatforms) * 100
      },
      platformStatuses: dbMultiSync.individualSyncs.map(sync => ({
        platform: (JSON.parse(sync.metadata as string).platform || 'call_center') as DeliveryPlatform,
        syncId: sync.id,
        status: sync.syncStatus as SyncStatus,
        progress: JSON.parse(sync.metadata as string).progress || {},
        errors: sync.errorMessage ? [sync.errorMessage] : []
      })),
      totalItemsSynced: dbMultiSync.individualSyncs.reduce((sum, sync) => sum + sync.itemsSynced, 0),
      totalErrors: dbMultiSync.failedPlatforms,
      estimatedTimeRemaining: 0,
      startedAt: dbMultiSync.startedAt,
      completedAt: dbMultiSync.completedAt
    };
  }

  /**
   * Cancel multi-platform sync operation
   */
  async cancelMultiSync(multiSyncId: string, userId?: string): Promise<void> {
    const multiSyncJob = this.activeMultiSyncs.get(multiSyncId);
    if (!multiSyncJob) {
      throw new Error(`Multi-platform sync ${multiSyncId} not found or already completed`);
    }

    // Cancel all individual syncs
    const cancelPromises = Array.from(multiSyncJob.individualSyncs.values()).map(syncId =>
      this.syncEngine.cancelSync(syncId, userId).catch(error => {
        this.logger.warn(`Failed to cancel sync ${syncId}: ${error.message}`);
      })
    );

    await Promise.all(cancelPromises);

    // Update multi-sync status
    multiSyncJob.status = SyncStatus.FAILED;
    multiSyncJob.completedAt = new Date();

    // Record cancellation
    await this.recordMultiSyncCompletion(multiSyncJob, false, 'Cancelled by user');

    // Clean up
    this.activeMultiSyncs.delete(multiSyncId);

    this.logger.log(`Multi-platform sync ${multiSyncId} cancelled by user ${userId}`);

    // Emit cancellation event
    this.eventEmitter.emit('multi-sync.cancelled', { multiSyncId, userId });
  }

  // ================================================
  // PRIVATE HELPER METHODS
  // ================================================

  private async startPlatformSyncs(
    multiSyncJob: MultiSyncJob,
    menu: any,
    request: MultiPlatformSyncRequest
  ): Promise<{ platform: DeliveryPlatform; syncId: string; status: SyncStatus }[]> {
    const results = [];

    if (multiSyncJob.options.parallelProcessing) {
      // Start all platform syncs in parallel for maximum speed
      const syncPromises = request.platforms.map(async (platform) => {
        try {
          const syncResult = await this.syncEngine.startSync({
            menuId: request.menuId,
            platform,
            syncType: request.syncType,
            options: {
              batchSize: 100, // Larger batches for speed
              parallelBatches: 3,
              notifyOnComplete: false // We'll handle notifications at multi-sync level
            },
            initiatedBy: request.initiatedBy
          });

          multiSyncJob.individualSyncs.set(platform, syncResult.syncId);

          return {
            platform,
            syncId: syncResult.syncId,
            status: SyncStatus.IN_PROGRESS
          };
        } catch (error) {
          this.logger.error(`Failed to start sync for platform ${platform}:`, error);
          return {
            platform,
            syncId: '',
            status: SyncStatus.FAILED
          };
        }
      });

      const syncResults = await Promise.all(syncPromises);
      results.push(...syncResults);

    } else {
      // Sequential sync (fallback mode)
      for (const platform of request.platforms) {
        try {
          const syncResult = await this.syncEngine.startSync({
            menuId: request.menuId,
            platform,
            syncType: request.syncType,
            initiatedBy: request.initiatedBy
          });

          multiSyncJob.individualSyncs.set(platform, syncResult.syncId);

          results.push({
            platform,
            syncId: syncResult.syncId,
            status: SyncStatus.IN_PROGRESS
          });

        } catch (error) {
          this.logger.error(`Failed to start sync for platform ${platform}:`, error);
          results.push({
            platform,
            syncId: '',
            status: SyncStatus.FAILED
          });

          if (multiSyncJob.options.stopOnFirstError) {
            break;
          }
        }
      }
    }

    return results;
  }

  private async monitorMultiSyncProgress(multiSyncJob: MultiSyncJob): Promise<void> {
    // Monitor progress every 5 seconds
    const monitorInterval = setInterval(async () => {
      try {
        const status = await this.buildMultiSyncStatus(multiSyncJob);

        // Check if completed
        if (status.overallStatus === SyncStatus.COMPLETED || status.overallStatus === SyncStatus.FAILED) {
          clearInterval(monitorInterval);

          multiSyncJob.status = status.overallStatus;
          multiSyncJob.completedAt = new Date();

          // Record completion
          await this.recordMultiSyncCompletion(
            multiSyncJob,
            status.overallStatus === SyncStatus.COMPLETED
          );

          // Clean up
          this.activeMultiSyncs.delete(multiSyncJob.id);

          // Emit completion event
          this.eventEmitter.emit('multi-sync.completed', {
            multiSyncId: multiSyncJob.id,
            menuId: multiSyncJob.menuId,
            overallStatus: status.overallStatus,
            totalItemsSynced: status.totalItemsSynced
          });

          this.logger.log(
            `Multi-platform sync ${multiSyncJob.id} completed with status ${status.overallStatus}`
          );
        }

        // Emit progress update
        this.eventEmitter.emit('multi-sync.progress', {
          multiSyncId: multiSyncJob.id,
          status
        });

      } catch (error) {
        this.logger.error(`Error monitoring multi-sync ${multiSyncJob.id}:`, error);
      }
    }, 5000);
  }

  private async buildMultiSyncStatus(multiSyncJob: MultiSyncJob): Promise<MultiPlatformSyncStatus> {
    const platformStatuses = [];
    let totalItemsSynced = 0;
    let totalErrors = 0;
    let completedPlatforms = 0;

    // Get status for each platform
    for (const [platform, syncId] of multiSyncJob.individualSyncs) {
      try {
        const syncStatus = await this.syncEngine.getSyncStatus(syncId);

        platformStatuses.push({
          platform,
          syncId,
          status: syncStatus.status,
          progress: syncStatus.progress,
          errors: syncStatus.errors
        });

        totalItemsSynced += syncStatus.itemsSynced || 0;
        totalErrors += syncStatus.errors?.length || 0;

        if (syncStatus.status === SyncStatus.COMPLETED || syncStatus.status === SyncStatus.FAILED) {
          completedPlatforms++;
        }

      } catch (error) {
        this.logger.warn(`Failed to get status for sync ${syncId}: ${error.message}`);
        platformStatuses.push({
          platform,
          syncId,
          status: SyncStatus.FAILED,
          progress: { current: 0, total: 0, percentage: 0 },
          errors: [error.message]
        });
        completedPlatforms++;
        totalErrors++;
      }
    }

    // Determine overall status
    let overallStatus: SyncStatus;
    if (completedPlatforms === multiSyncJob.platforms.length) {
      // All platforms completed
      const hasFailures = platformStatuses.some(p => p.status === SyncStatus.FAILED);
      overallStatus = hasFailures ? SyncStatus.FAILED : SyncStatus.COMPLETED;
    } else {
      overallStatus = SyncStatus.IN_PROGRESS;
    }

    // Calculate estimated time remaining
    const elapsedTime = Date.now() - multiSyncJob.startedAt.getTime();
    const progress = completedPlatforms / multiSyncJob.platforms.length;
    const estimatedTimeRemaining = progress > 0 ? (elapsedTime / progress) - elapsedTime : 0;

    return {
      multiSyncId: multiSyncJob.id,
      overallStatus,
      overallProgress: {
        completedPlatforms,
        totalPlatforms: multiSyncJob.platforms.length,
        percentage: (completedPlatforms / multiSyncJob.platforms.length) * 100
      },
      platformStatuses,
      totalItemsSynced,
      totalErrors,
      estimatedTimeRemaining: Math.max(0, estimatedTimeRemaining),
      startedAt: multiSyncJob.startedAt,
      completedAt: multiSyncJob.completedAt
    };
  }

  private estimateMultiPlatformSyncDuration(
    platforms: DeliveryPlatform[],
    itemCount: number,
    parallelProcessing: boolean
  ): number {
    // Estimate sync time per platform
    const platformTimes = platforms.map(platform => {
      switch (platform) {
        case DeliveryPlatform.CAREEM:
        case DeliveryPlatform.TALABAT:
          return itemCount * 50; // External APIs
        case DeliveryPlatform.WEBSITE:
        case DeliveryPlatform.CALL_CENTER:
        case DeliveryPlatform.MOBILE_APP:
          return itemCount * 5; // Internal platforms
        default:
          return itemCount * 20;
      }
    });

    if (parallelProcessing) {
      // Parallel execution - time is based on slowest platform + overhead
      return Math.max(...platformTimes) + 5000; // 5s overhead
    } else {
      // Sequential execution - sum of all platform times
      return platformTimes.reduce((sum, time) => sum + time, 0) + 5000;
    }
  }

  private generateMultiSyncId(): string {
    return `multi_sync_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  private async getMenuForSync(menuId: string): Promise<any> {
    return this.prisma.platformMenu.findUnique({
      where: { id: menuId },
      include: {
        items: {
          where: { deletedAt: null },
          include: {
            product: {
              select: {
                id: true,
                name: true,
                basePrice: true,
                pricing: true
              }
            }
          }
        }
      }
    });
  }

  private async validatePlatforms(platforms: DeliveryPlatform[]): Promise<void> {
    if (!platforms || platforms.length === 0) {
      throw new Error('At least one platform must be specified');
    }

    if (platforms.length > 10) {
      throw new Error('Maximum 10 platforms can be synced simultaneously');
    }

    // Validate platform availability
    const availablePlatforms = await this.platformAdapter.getAvailableAdapters();
    const invalidPlatforms = platforms.filter(p => !availablePlatforms.includes(p));

    if (invalidPlatforms.length > 0) {
      throw new Error(`Invalid platforms: ${invalidPlatforms.join(', ')}`);
    }
  }

  private async recordMultiSyncStart(multiSyncJob: MultiSyncJob, request: MultiPlatformSyncRequest): Promise<void> {
    await this.prisma.multiPlatformSyncHistory.create({
      data: {
        id: multiSyncJob.id,
        menuId: multiSyncJob.menuId,
        platforms: multiSyncJob.platforms,
        overallStatus: SyncStatus.IN_PROGRESS,
        totalPlatforms: multiSyncJob.platforms.length,
        successfulPlatforms: 0,
        failedPlatforms: 0,
        startedAt: multiSyncJob.startedAt,
        initiatedBy: multiSyncJob.initiatedBy,
        metadata: {
          syncType: request.syncType,
          options: multiSyncJob.options
        }
      }
    });
  }

  private async recordMultiSyncCompletion(
    multiSyncJob: MultiSyncJob,
    success: boolean,
    errorMessage?: string
  ): Promise<void> {
    const status = await this.buildMultiSyncStatus(multiSyncJob);

    await this.prisma.multiPlatformSyncHistory.update({
      where: { id: multiSyncJob.id },
      data: {
        overallStatus: success ? SyncStatus.COMPLETED : SyncStatus.FAILED,
        completedAt: multiSyncJob.completedAt,
        successfulPlatforms: status.overallProgress.completedPlatforms,
        failedPlatforms: status.totalErrors,
        errorMessage
      }
    });
  }
}