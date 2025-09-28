// ================================================
// Menu Sync Engine Service
// Restaurant Platform v2 - High-Performance Synchronization
// ================================================

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PlatformAdapterService } from './platform-adapter.service';
import { MenuCacheService } from './menu-cache.service';
import {
  DeliveryPlatform,
  MenuSyncResponse,
  MenuSyncStatusResponse,
  SyncStatus,
  PlatformMenu,
  PlatformMenuItem
} from '../types/platform-menu.types';

// ================================================
// SYNC ENGINE INTERFACES
// ================================================

export interface SyncRequest {
  menuId: string;
  platform: DeliveryPlatform;
  syncType: 'manual' | 'scheduled' | 'webhook' | 'auto' | 'force' | 'incremental';
  specificItems?: string[];
  options?: {
    validateOnly?: boolean;
    dryRun?: boolean;
    notifyOnComplete?: boolean;
    batchSize?: number;
    parallelBatches?: number;
  };
  initiatedBy?: string;
}

export interface SyncJob {
  id: string;
  menuId: string;
  platform: DeliveryPlatform;
  status: SyncStatus;
  progress: SyncProgress;
  errors: SyncError[];
  warnings: SyncWarning[];
  metrics: SyncMetrics;
  startedAt: Date;
  estimatedCompletionAt?: Date;
  completedAt?: Date;
  cancelledAt?: Date;
  retryCount: number;
  maxRetries: number;
}

export interface SyncProgress {
  current: number;
  total: number;
  percentage: number;
  currentOperation: string;
  remainingTime?: number;
}

export interface SyncError {
  type: 'validation' | 'network' | 'platform' | 'data' | 'system';
  message: string;
  details?: any;
  itemId?: string;
  retryable: boolean;
  timestamp: Date;
}

export interface SyncWarning {
  type: 'performance' | 'data' | 'compatibility';
  message: string;
  suggestion?: string;
  itemId?: string;
  timestamp: Date;
}

export interface SyncMetrics {
  itemsProcessed: number;
  itemsSuccessful: number;
  itemsFailed: number;
  apiCallsMade: number;
  dataTransferred: number; // bytes
  averageItemTime: number; // ms per item
  throughput: number; // items per second
}

// ================================================
// MENU SYNC ENGINE SERVICE
// ================================================

@Injectable()
export class MenuSyncEngineService {
  private readonly logger = new Logger(MenuSyncEngineService.name);
  private readonly activeSyncs = new Map<string, SyncJob>();
  private readonly syncQueue = new Map<string, SyncRequest[]>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly platformAdapter: PlatformAdapterService,
    private readonly cacheService: MenuCacheService,
    private readonly eventEmitter: EventEmitter2
  ) {
    this.initializeSyncEngine();
  }

  // ================================================
  // PUBLIC SYNC OPERATIONS
  // ================================================

  /**
   * Start menu synchronization with performance optimization
   * Target: <30s for 500+ items
   */
  async startSync(request: SyncRequest): Promise<MenuSyncResponse> {
    const syncId = this.generateSyncId();

    try {
      // Validate sync request
      await this.validateSyncRequest(request);

      // Get menu data
      const menu = await this.getMenuForSync(request.menuId);
      if (!menu) {
        throw new Error(`Menu ${request.menuId} not found`);
      }

      // Calculate sync metrics
      const totalItems = this.calculateTotalItems(menu, request.specificItems);
      const estimatedDuration = this.estimateSyncDuration(menu.platform, totalItems);

      // Create sync job
      const syncJob: SyncJob = {
        id: syncId,
        menuId: request.menuId,
        platform: request.platform,
        status: SyncStatus.IN_PROGRESS,
        progress: {
          current: 0,
          total: totalItems,
          percentage: 0,
          currentOperation: 'Initializing sync...'
        },
        errors: [],
        warnings: [],
        metrics: {
          itemsProcessed: 0,
          itemsSuccessful: 0,
          itemsFailed: 0,
          apiCallsMade: 0,
          dataTransferred: 0,
          averageItemTime: 0,
          throughput: 0
        },
        startedAt: new Date(),
        estimatedCompletionAt: new Date(Date.now() + estimatedDuration),
        retryCount: 0,
        maxRetries: 3
      };

      // Store active sync
      this.activeSyncs.set(syncId, syncJob);

      // Cache sync status for quick retrieval
      await this.cacheService.cacheSyncStatus(syncId, this.transformSyncJobToStatus(syncJob));

      // Start async sync process
      this.executeSyncAsync(syncJob, menu, request);

      // Record sync start in database
      await this.recordSyncStart(syncJob, request);

      this.logger.log(`Started sync ${syncId} for menu ${request.menuId} (${totalItems} items)`);

      return {
        syncId,
        status: SyncStatus.IN_PROGRESS,
        startedAt: syncJob.startedAt,
        estimatedDuration,
        itemsToSync: totalItems,
        progress: syncJob.progress
      };

    } catch (error) {
      this.logger.error(`Failed to start sync for menu ${request.menuId}:`, error);
      throw error;
    }
  }

  /**
   * Get sync status with real-time progress
   */
  async getSyncStatus(syncId: string): Promise<MenuSyncStatusResponse> {
    // Try cache first for performance
    let cachedStatus = await this.cacheService.getCachedSyncStatus(syncId);
    if (cachedStatus) {
      return cachedStatus;
    }

    // Check active syncs
    const activeSync = this.activeSyncs.get(syncId);
    if (activeSync) {
      const status = this.transformSyncJobToStatus(activeSync);
      await this.cacheService.cacheSyncStatus(syncId, status);
      return status;
    }

    // Check database for completed syncs
    const dbSync = await this.prisma.menuSyncHistory.findUnique({
      where: { id: syncId }
    });

    if (!dbSync) {
      throw new Error(`Sync ${syncId} not found`);
    }

    return {
      syncId,
      status: dbSync.syncStatus as SyncStatus,
      progress: {
        current: dbSync.itemsSynced,
        total: dbSync.itemsSynced,
        percentage: 100
      },
      itemsSynced: dbSync.itemsSynced,
      errors: dbSync.errorDetails ? [dbSync.errorMessage] : [],
      warnings: [],
      estimatedTimeRemaining: 0
    };
  }

  /**
   * Cancel ongoing sync operation
   */
  async cancelSync(syncId: string, userId?: string): Promise<void> {
    const syncJob = this.activeSyncs.get(syncId);
    if (!syncJob) {
      throw new Error(`Sync ${syncId} not found or already completed`);
    }

    syncJob.status = SyncStatus.FAILED;
    syncJob.cancelledAt = new Date();
    syncJob.progress.currentOperation = 'Cancelling sync...';

    // Update cache
    await this.cacheService.cacheSyncStatus(syncId, this.transformSyncJobToStatus(syncJob));

    // Record cancellation in database
    await this.recordSyncCompletion(syncJob, false, 'Cancelled by user');

    // Remove from active syncs
    this.activeSyncs.delete(syncId);

    this.logger.log(`Sync ${syncId} cancelled by user ${userId}`);

    // Emit cancellation event
    this.eventEmitter.emit('sync.cancelled', { syncId, userId });
  }

  // ================================================
  // ASYNC SYNC EXECUTION
  // ================================================

  /**
   * Execute synchronization asynchronously with optimization
   */
  private async executeSyncAsync(
    syncJob: SyncJob,
    menu: PlatformMenu,
    request: SyncRequest
  ): Promise<void> {
    const startTime = Date.now();

    try {
      // Update progress
      syncJob.progress.currentOperation = 'Preparing synchronization...';
      await this.updateSyncProgress(syncJob);

      // Get platform adapter
      const adapter = await this.platformAdapter.getAdapter(menu.platform);

      // Validate menu structure
      syncJob.progress.currentOperation = 'Validating menu structure...';
      await this.updateSyncProgress(syncJob);

      const validation = await adapter.validateMenuStructure(menu);
      if (!validation.isValid) {
        const errorMessages = validation.errors.map(e => e.message);
        throw new Error(`Menu validation failed: ${errorMessages.join(', ')}`);
      }

      // Add warnings from validation
      validation.warnings.forEach(warning => {
        syncJob.warnings.push({
          type: 'data',
          message: warning.message,
          suggestion: warning.suggestion,
          timestamp: new Date()
        });
      });

      // Execute sync based on type
      if (request.syncType === 'incremental') {
        await this.executeIncrementalSync(syncJob, menu, adapter, request);
      } else {
        await this.executeFullSync(syncJob, menu, adapter, request);
      }

      // Complete sync successfully
      syncJob.status = SyncStatus.COMPLETED;
      syncJob.completedAt = new Date();
      syncJob.progress.percentage = 100;
      syncJob.progress.currentOperation = 'Sync completed successfully';

      // Calculate final metrics
      const totalTime = Date.now() - startTime;
      syncJob.metrics.averageItemTime = syncJob.metrics.itemsProcessed > 0
        ? totalTime / syncJob.metrics.itemsProcessed
        : 0;
      syncJob.metrics.throughput = syncJob.metrics.itemsProcessed > 0
        ? (syncJob.metrics.itemsProcessed / totalTime) * 1000
        : 0;

      // Record successful completion
      await this.recordSyncCompletion(syncJob, true);

      this.logger.log(
        `Sync ${syncJob.id} completed: ${syncJob.metrics.itemsSuccessful}/${syncJob.metrics.itemsProcessed} items in ${totalTime}ms`
      );

      // Emit completion event
      this.eventEmitter.emit('sync.completed', {
        syncId: syncJob.id,
        menuId: syncJob.menuId,
        platform: syncJob.platform,
        metrics: syncJob.metrics
      });

    } catch (error) {
      // Handle sync failure
      syncJob.status = SyncStatus.FAILED;
      syncJob.completedAt = new Date();
      syncJob.errors.push({
        type: 'system',
        message: error.message,
        retryable: this.isRetryableError(error),
        timestamp: new Date()
      });

      this.logger.error(`Sync ${syncJob.id} failed:`, error);

      // Record failed completion
      await this.recordSyncCompletion(syncJob, false, error.message);

      // Emit failure event
      this.eventEmitter.emit('sync.failed', {
        syncId: syncJob.id,
        menuId: syncJob.menuId,
        error: error.message
      });

    } finally {
      // Update final progress and cleanup
      await this.updateSyncProgress(syncJob);
      this.activeSyncs.delete(syncJob.id);

      // Invalidate menu cache
      await this.cacheService.invalidateMenu(syncJob.menuId, menu.companyId);
    }
  }

  /**
   * Execute full synchronization
   */
  private async executeFullSync(
    syncJob: SyncJob,
    menu: PlatformMenu,
    adapter: any,
    request: SyncRequest
  ): Promise<void> {
    syncJob.progress.currentOperation = 'Synchronizing menu structure...';
    await this.updateSyncProgress(syncJob);

    // Sync menu metadata first
    const menuSyncResult = await adapter.syncMenu(menu);
    syncJob.metrics.apiCallsMade += 1;

    if (!menuSyncResult.success) {
      throw new Error(`Menu sync failed: ${menuSyncResult.errors.join(', ')}`);
    }

    // Sync items in optimized batches
    if (menu.items && menu.items.length > 0) {
      await this.syncItemsInBatches(syncJob, menu.items, adapter, request);
    }
  }

  /**
   * Execute incremental synchronization (only changed items)
   */
  private async executeIncrementalSync(
    syncJob: SyncJob,
    menu: PlatformMenu,
    adapter: any,
    request: SyncRequest
  ): Promise<void> {
    syncJob.progress.currentOperation = 'Identifying changed items...';
    await this.updateSyncProgress(syncJob);

    // Get items that changed since last sync
    const changedItems = await this.getChangedItemsSinceLastSync(menu.id, menu.lastSyncedAt);

    if (changedItems.length === 0) {
      syncJob.progress.currentOperation = 'No changes detected';
      return;
    }

    syncJob.progress.total = changedItems.length;
    await this.syncItemsInBatches(syncJob, changedItems, adapter, request);
  }

  /**
   * Sync items in optimized batches for performance
   */
  private async syncItemsInBatches(
    syncJob: SyncJob,
    items: PlatformMenuItem[],
    adapter: any,
    request: SyncRequest
  ): Promise<void> {
    const batchSize = request.options?.batchSize || adapter.getApiLimits().maxBatchSize;
    const maxParallelBatches = request.options?.parallelBatches || 3;

    syncJob.progress.currentOperation = `Syncing ${items.length} items in batches of ${batchSize}...`;
    await this.updateSyncProgress(syncJob);

    // Process items in parallel batches for performance
    for (let i = 0; i < items.length; i += batchSize * maxParallelBatches) {
      const parallelBatches: Promise<void>[] = [];

      // Create parallel batches
      for (let j = 0; j < maxParallelBatches && (i + j * batchSize) < items.length; j++) {
        const batchStart = i + j * batchSize;
        const batchEnd = Math.min(batchStart + batchSize, items.length);
        const batch = items.slice(batchStart, batchEnd);

        parallelBatches.push(this.processBatch(syncJob, batch, adapter));
      }

      // Wait for all parallel batches to complete
      await Promise.all(parallelBatches);

      // Update progress
      syncJob.progress.current = Math.min(i + batchSize * maxParallelBatches, items.length);
      syncJob.progress.percentage = (syncJob.progress.current / syncJob.progress.total) * 100;
      syncJob.progress.currentOperation = `Processed ${syncJob.progress.current}/${syncJob.progress.total} items`;

      await this.updateSyncProgress(syncJob);
    }
  }

  /**
   * Process a single batch of items
   */
  private async processBatch(
    syncJob: SyncJob,
    batch: PlatformMenuItem[],
    adapter: any
  ): Promise<void> {
    try {
      const batchStartTime = Date.now();
      const syncResults = await adapter.syncItems(batch);

      syncJob.metrics.apiCallsMade += 1;
      syncJob.metrics.itemsProcessed += batch.length;

      // Process results
      syncResults.forEach((result, index) => {
        if (result.success) {
          syncJob.metrics.itemsSuccessful += 1;
        } else {
          syncJob.metrics.itemsFailed += 1;
          syncJob.errors.push({
            type: 'platform',
            message: result.error || 'Unknown sync error',
            itemId: batch[index]?.id,
            retryable: false,
            timestamp: new Date()
          });
        }
      });

      // Update metrics
      const batchTime = Date.now() - batchStartTime;
      syncJob.metrics.dataTransferred += JSON.stringify(batch).length;

    } catch (error) {
      syncJob.metrics.itemsFailed += batch.length;
      syncJob.errors.push({
        type: 'system',
        message: `Batch processing failed: ${error.message}`,
        retryable: this.isRetryableError(error),
        timestamp: new Date()
      });
    }
  }

  // ================================================
  // HELPER METHODS
  // ================================================

  private async initializeSyncEngine(): Promise<void> {
    this.logger.log('Initializing Menu Sync Engine');

    // Clean up any orphaned syncs from previous restart
    await this.cleanupOrphanedSyncs();

    // Set up periodic cleanup
    setInterval(() => {
      this.cleanupCompletedSyncs();
    }, 5 * 60 * 1000); // Every 5 minutes
  }

  private generateSyncId(): string {
    return `sync_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  private async updateSyncProgress(syncJob: SyncJob): Promise<void> {
    // Update cache for real-time status retrieval
    await this.cacheService.cacheSyncStatus(
      syncJob.id,
      this.transformSyncJobToStatus(syncJob)
    );
  }

  private transformSyncJobToStatus(syncJob: SyncJob): MenuSyncStatusResponse {
    return {
      syncId: syncJob.id,
      status: syncJob.status,
      progress: syncJob.progress,
      itemsSynced: syncJob.metrics.itemsSuccessful,
      errors: syncJob.errors.map(e => e.message),
      warnings: syncJob.warnings.map(w => w.message),
      estimatedTimeRemaining: this.calculateRemainingTime(syncJob)
    };
  }

  private calculateRemainingTime(syncJob: SyncJob): number {
    if (syncJob.progress.percentage === 0) return 0;

    const elapsedTime = Date.now() - syncJob.startedAt.getTime();
    const estimatedTotalTime = (elapsedTime / syncJob.progress.percentage) * 100;
    return Math.max(0, estimatedTotalTime - elapsedTime);
  }

  private calculateTotalItems(menu: PlatformMenu, specificItems?: string[]): number {
    if (specificItems) return specificItems.length;
    return menu.items?.length || 0;
  }

  private estimateSyncDuration(platform: DeliveryPlatform, itemCount: number): number {
    // Estimate based on platform and item count
    const baseTimePerItem = this.getBaseTimePerItem(platform);
    const overhead = 5000; // 5 second overhead

    return (itemCount * baseTimePerItem) + overhead;
  }

  private getBaseTimePerItem(platform: DeliveryPlatform): number {
    // Platform-specific sync time estimates in milliseconds
    switch (platform) {
      case DeliveryPlatform.CAREEM:
      case DeliveryPlatform.TALABAT:
        return 50; // External APIs are slower
      case DeliveryPlatform.WEBSITE:
      case DeliveryPlatform.CALL_CENTER:
        return 10; // Internal platforms are faster
      default:
        return 30; // Default estimate
    }
  }

  private async getMenuForSync(menuId: string): Promise<PlatformMenu | null> {
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
    }) as any;
  }

  private async getChangedItemsSinceLastSync(
    menuId: string,
    lastSyncDate?: Date
  ): Promise<PlatformMenuItem[]> {
    if (!lastSyncDate) {
      // If never synced, return all items
      const menu = await this.getMenuForSync(menuId);
      return menu?.items || [];
    }

    return this.prisma.platformMenuItem.findMany({
      where: {
        platformMenuId: menuId,
        updatedAt: { gt: lastSyncDate },
        deletedAt: null
      },
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
    }) as any;
  }

  private async validateSyncRequest(request: SyncRequest): Promise<void> {
    // Add sync request validation logic
    if (!request.menuId) {
      throw new Error('Menu ID is required');
    }

    if (!request.platform) {
      throw new Error('Platform is required');
    }
  }

  private async recordSyncStart(syncJob: SyncJob, request: SyncRequest): Promise<void> {
    await this.prisma.menuSyncHistory.create({
      data: {
        id: syncJob.id,
        platformMenuId: syncJob.menuId,
        syncType: request.syncType,
        syncStatus: SyncStatus.IN_PROGRESS,
        startedAt: syncJob.startedAt,
        initiatedBy: request.initiatedBy
      }
    });
  }

  private async recordSyncCompletion(
    syncJob: SyncJob,
    success: boolean,
    errorMessage?: string
  ): Promise<void> {
    await this.prisma.menuSyncHistory.update({
      where: { id: syncJob.id },
      data: {
        syncStatus: success ? SyncStatus.COMPLETED : SyncStatus.FAILED,
        completedAt: syncJob.completedAt,
        itemsSynced: syncJob.metrics.itemsSuccessful,
        syncDurationMs: syncJob.completedAt
          ? syncJob.completedAt.getTime() - syncJob.startedAt.getTime()
          : 0,
        apiCallsMade: syncJob.metrics.apiCallsMade,
        errorMessage,
        errorDetails: syncJob.errors.length > 0 ? syncJob.errors : null,
        retryCount: syncJob.retryCount
      }
    });
  }

  private isRetryableError(error: any): boolean {
    // Network errors, timeouts, and rate limits are retryable
    return error.code === 'NETWORK_ERROR' ||
           error.code === 'TIMEOUT' ||
           error.code === 'RATE_LIMITED' ||
           error.statusCode >= 500;
  }

  private async cleanupOrphanedSyncs(): Promise<void> {
    // Clean up syncs that were in progress during restart
    const cutoffTime = new Date(Date.now() - 60 * 60 * 1000); // 1 hour ago

    await this.prisma.menuSyncHistory.updateMany({
      where: {
        syncStatus: SyncStatus.IN_PROGRESS,
        startedAt: { lt: cutoffTime }
      },
      data: {
        syncStatus: SyncStatus.FAILED,
        errorMessage: 'Sync interrupted by system restart',
        completedAt: new Date()
      }
    });
  }

  private cleanupCompletedSyncs(): void {
    // Remove completed syncs from memory after some time
    const cutoffTime = Date.now() - 30 * 60 * 1000; // 30 minutes ago

    for (const [syncId, syncJob] of this.activeSyncs.entries()) {
      if (
        (syncJob.status === SyncStatus.COMPLETED || syncJob.status === SyncStatus.FAILED) &&
        syncJob.completedAt &&
        syncJob.completedAt.getTime() < cutoffTime
      ) {
        this.activeSyncs.delete(syncId);
      }
    }
  }
}