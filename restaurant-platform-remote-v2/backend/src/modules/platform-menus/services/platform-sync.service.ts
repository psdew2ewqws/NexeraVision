// ================================================
// Platform Sync Service
// Core Synchronization Service for Multiple Platforms
// ================================================

import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';

// Platform-specific services
import { CareemMenuService } from './platform-specific/careem-menu.service';
import { TalabatMenuService } from './platform-specific/talabat-menu.service';

// Other services
import { SyncProgressGateway } from '../gateways/sync-progress.gateway';
import { MenuValidationService } from './menu-validation.service';

// Types and interfaces
import {
  PlatformSyncRequest,
  BatchSyncRequest,
  SyncConfiguration,
  SyncStatus,
  SyncHistory,
  RetryRequest,
  SyncAnalytics,
  HealthStatus
} from '../types/sync.types';

export interface SyncResult {
  syncId: string;
  status: 'initiated' | 'in_progress' | 'completed' | 'failed';
  platformType: string;
  platformMenuId: string;
  estimatedDuration?: number;
  error?: string;
}

export interface BatchSyncResult {
  batchId: string;
  syncOperations: SyncResult[];
  estimatedTotalDuration: number;
}

@Injectable()
export class PlatformSyncService {
  private readonly logger = new Logger(PlatformSyncService.name);
  private readonly syncQueue = new Map<string, any>();
  private readonly activeSyncs = new Set<string>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly eventEmitter: EventEmitter2,
    private readonly careemMenuService: CareemMenuService,
    private readonly talabatMenuService: TalabatMenuService,
    private readonly syncProgressGateway: SyncProgressGateway,
    private readonly menuValidationService: MenuValidationService
  ) {}

  // ================================================
  // SINGLE PLATFORM SYNC
  // ================================================

  async syncToSinglePlatform(request: PlatformSyncRequest): Promise<SyncResult> {
    const syncId = this.generateSyncId();
    this.logger.log(`Starting single platform sync: ${syncId} for ${request.platformType}`);

    try {
      // Create sync log entry
      const syncLog = await this.createSyncLog({
        syncId,
        platformMenuId: request.platformMenuId,
        platformType: request.platformType,
        syncType: 'full_menu',
        userId: request.userId,
        companyId: request.companyId,
        configuration: request.configuration
      });

      // Add to active syncs
      this.activeSyncs.add(syncId);

      // Process sync asynchronously
      this.processSingleSync(syncId, request).catch(error => {
        this.logger.error(`Async sync failed for ${syncId}:`, error);
        this.handleSyncError(syncId, error);
      });

      return {
        syncId,
        status: 'initiated',
        platformType: request.platformType,
        platformMenuId: request.platformMenuId,
        estimatedDuration: this.estimateSyncDuration(request.platformType)
      };
    } catch (error) {
      this.logger.error(`Failed to initiate sync: ${error.message}`, error.stack);
      throw error;
    }
  }

  private async processSingleSync(syncId: string, request: PlatformSyncRequest): Promise<void> {
    const startTime = Date.now();

    try {
      // Update sync status to in_progress
      await this.updateSyncStatus(syncId, 'in_progress', { progress: 0 });

      // Emit progress update
      this.syncProgressGateway.emitSyncProgress(request.companyId, {
        syncId,
        status: 'in_progress',
        progress: 0,
        message: 'Starting synchronization...'
      });

      // Get platform menu data
      const platformMenu = await this.getPlatformMenuData(request.platformMenuId);
      if (!platformMenu) {
        throw new Error('Platform menu not found');
      }

      // Update progress: 20%
      await this.updateSyncStatus(syncId, 'in_progress', { progress: 20 });
      this.syncProgressGateway.emitSyncProgress(request.companyId, {
        syncId,
        status: 'in_progress',
        progress: 20,
        message: 'Validating menu data...'
      });

      // Validate menu data
      const validation = await this.menuValidationService.validateMenuForPlatform(
        platformMenu,
        request.platformType
      );

      if (!validation.isValid) {
        throw new Error(`Menu validation failed: ${validation.errors.join(', ')}`);
      }

      // Update progress: 40%
      await this.updateSyncStatus(syncId, 'in_progress', { progress: 40 });
      this.syncProgressGateway.emitSyncProgress(request.companyId, {
        syncId,
        status: 'in_progress',
        progress: 40,
        message: 'Transforming menu data...'
      });

      // Sync to platform
      let syncResult;
      switch (request.platformType) {
        case 'careem':
          syncResult = await this.careemMenuService.createCareemMenu(
            platformMenu,
            request.configuration as any
          );
          break;
        case 'talabat':
          syncResult = await this.talabatMenuService.createTalabatMenu(
            platformMenu,
            request.configuration as any
          );
          break;
        default:
          throw new Error(`Unsupported platform type: ${request.platformType}`);
      }

      // Update progress: 80%
      await this.updateSyncStatus(syncId, 'in_progress', { progress: 80 });
      this.syncProgressGateway.emitSyncProgress(request.companyId, {
        syncId,
        status: 'in_progress',
        progress: 80,
        message: 'Finalizing synchronization...'
      });

      if (!syncResult.success) {
        throw new Error(syncResult.message || 'Platform sync failed');
      }

      // Complete sync
      const duration = Date.now() - startTime;
      await this.updateSyncStatus(syncId, 'completed', {
        progress: 100,
        duration,
        itemsProcessed: syncResult.itemsProcessed,
        externalId: syncResult.storeMenuId || syncResult.menuId
      });

      // Emit completion
      this.syncProgressGateway.emitSyncCompleted(request.companyId, {
        syncId,
        status: 'completed',
        progress: 100,
        duration,
        itemsProcessed: syncResult.itemsProcessed,
        message: 'Synchronization completed successfully'
      });

      // Update platform menu sync status
      await this.updatePlatformMenuSyncStatus(
        request.platformMenuId,
        request.platformType,
        'completed',
        syncResult
      );

      this.logger.log(`Sync ${syncId} completed successfully in ${duration}ms`);
    } catch (error) {
      await this.handleSyncError(syncId, error);
      throw error;
    } finally {
      this.activeSyncs.delete(syncId);
    }
  }

  // ================================================
  // BATCH SYNC OPERATIONS
  // ================================================

  async batchSyncToPlatforms(request: BatchSyncRequest): Promise<BatchSyncResult> {
    const batchId = this.generateBatchId();
    this.logger.log(`Starting batch sync: ${batchId} for ${request.platforms.length} platforms`);

    try {
      // Create batch sync log
      await this.createBatchSyncLog({
        batchId,
        platformMenuId: request.platformMenuId,
        platforms: request.platforms.map(p => p.platformType),
        userId: request.userId,
        companyId: request.companyId
      });

      // Create individual sync operations
      const syncOperations: Promise<SyncResult>[] = request.platforms.map(platform =>
        this.syncToSinglePlatform({
          platformMenuId: request.platformMenuId,
          platformType: platform.platformType,
          configuration: platform.configuration,
          userId: request.userId,
          companyId: request.companyId
        })
      );

      // Wait for all syncs to be initiated
      const results = await Promise.all(syncOperations);

      // Calculate estimated total duration
      const estimatedTotalDuration = results.reduce(
        (sum, result) => sum + (result.estimatedDuration || 0),
        0
      );

      // Update batch sync with operation IDs
      await this.updateBatchSyncOperations(batchId, results.map(r => r.syncId));

      return {
        batchId,
        syncOperations: results,
        estimatedTotalDuration
      };
    } catch (error) {
      this.logger.error(`Batch sync initiation failed: ${error.message}`, error.stack);
      throw error;
    }
  }

  // ================================================
  // SYNC STATUS & MONITORING
  // ================================================

  async getSyncStatus(syncId: string, companyId: string): Promise<SyncStatus | null> {
    const syncLog = await this.prisma.platformSyncLog.findFirst({
      where: {
        id: syncId,
        companyId
      },
      include: {
        platformMenu: {
          select: {
            id: true,
            name: true,
            platformType: true
          }
        }
      }
    });

    if (!syncLog) {
      return null;
    }

    return {
      syncId: syncLog.id,
      platformType: syncLog.platformType,
      platformMenuId: syncLog.platformMenuId,
      status: syncLog.status as any,
      progress: syncLog.progress || 0,
      startedAt: syncLog.createdAt,
      completedAt: syncLog.completedAt,
      duration: syncLog.duration,
      itemsProcessed: syncLog.itemsProcessed,
      error: syncLog.errorMessage,
      platformMenu: syncLog.platformMenu
    };
  }

  async getBatchSyncStatus(batchId: string, companyId: string): Promise<any> {
    const batchSync = await this.prisma.multiPlatformSyncHistory.findFirst({
      where: {
        id: batchId,
        companyId
      },
      include: {
        syncOperations: {
          include: {
            platformMenu: {
              select: {
                id: true,
                name: true,
                platformType: true
              }
            }
          }
        }
      }
    });

    if (!batchSync) {
      return null;
    }

    const operations = batchSync.syncOperations || [];
    const completed = operations.filter(op => op.status === 'completed').length;
    const failed = operations.filter(op => op.status === 'failed').length;
    const inProgress = operations.filter(op => op.status === 'in_progress').length;

    return {
      batchId: batchSync.id,
      platformMenuId: batchSync.menuId,
      platforms: batchSync.platforms,
      overallStatus: batchSync.overallStatus,
      startedAt: batchSync.startedAt,
      completedAt: batchSync.completedAt,
      totalOperations: operations.length,
      completedOperations: completed,
      failedOperations: failed,
      inProgressOperations: inProgress,
      operations: operations.map(op => ({
        syncId: op.id,
        platformType: op.platformType,
        status: op.status,
        progress: op.progress,
        error: op.errorMessage
      }))
    };
  }

  // ================================================
  // SYNC HISTORY & AUDIT
  // ================================================

  async getSyncHistory(filters: any): Promise<any> {
    const {
      companyId,
      page = 1,
      limit = 20,
      platformType,
      status,
      dateFrom,
      dateTo
    } = filters;

    const where: any = { companyId };

    if (platformType) {
      where.platformType = platformType;
    }

    if (status) {
      where.status = status;
    }

    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) {
        where.createdAt.gte = new Date(dateFrom);
      }
      if (dateTo) {
        where.createdAt.lte = new Date(dateTo);
      }
    }

    const [total, data] = await Promise.all([
      this.prisma.platformSyncLog.count({ where }),
      this.prisma.platformSyncLog.findMany({
        where,
        include: {
          platformMenu: {
            select: {
              id: true,
              name: true,
              platformType: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit
      })
    ]);

    return {
      data,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    };
  }

  async getSyncHistoryDetails(syncId: string, companyId: string): Promise<any> {
    const syncLog = await this.prisma.platformSyncLog.findFirst({
      where: {
        id: syncId,
        companyId
      },
      include: {
        platformMenu: {
          include: {
            menuItems: {
              include: {
                product: {
                  select: {
                    id: true,
                    name: true,
                    basePrice: true,
                    isAvailable: true
                  }
                }
              }
            }
          }
        },
        integrationLogs: {
          orderBy: { createdAt: 'asc' }
        }
      }
    });

    if (!syncLog) {
      return null;
    }

    return {
      syncDetails: syncLog,
      timeline: syncLog.integrationLogs || [],
      menuItems: syncLog.platformMenu?.menuItems || []
    };
  }

  // ================================================
  // ERROR HANDLING & RETRY
  // ================================================

  async retryFailedSyncs(request: RetryRequest): Promise<any> {
    const { syncIds, companyId, userId } = request;

    // Get failed sync operations
    const failedSyncs = await this.prisma.platformSyncLog.findMany({
      where: {
        id: { in: syncIds },
        companyId,
        status: 'failed'
      }
    });

    const retriedOperations: any[] = [];
    const skippedOperations: any[] = [];

    for (const failedSync of failedSyncs) {
      try {
        // Check retry limit
        if (failedSync.retryCount >= 3) {
          skippedOperations.push({
            syncId: failedSync.id,
            reason: 'Maximum retry limit exceeded'
          });
          continue;
        }

        // Increment retry count
        await this.prisma.platformSyncLog.update({
          where: { id: failedSync.id },
          data: {
            retryCount: failedSync.retryCount + 1,
            status: 'pending',
            errorMessage: null
          }
        });

        // Re-initiate sync
        const retryResult = await this.syncToSinglePlatform({
          platformMenuId: failedSync.platformMenuId,
          platformType: failedSync.platformType,
          configuration: failedSync.configuration as any,
          userId,
          companyId
        });

        retriedOperations.push(retryResult);
      } catch (error) {
        this.logger.error(`Retry failed for sync ${failedSync.id}:`, error);
        skippedOperations.push({
          syncId: failedSync.id,
          reason: error.message
        });
      }
    }

    return {
      retriedOperations,
      skippedOperations
    };
  }

  async cancelSync(syncId: string, companyId: string): Promise<any> {
    const syncLog = await this.prisma.platformSyncLog.findFirst({
      where: {
        id: syncId,
        companyId,
        status: { in: ['pending', 'in_progress'] }
      }
    });

    if (!syncLog) {
      return {
        success: false,
        message: 'Sync operation not found or cannot be cancelled'
      };
    }

    // Update status to cancelled
    await this.prisma.platformSyncLog.update({
      where: { id: syncId },
      data: {
        status: 'cancelled',
        completedAt: new Date(),
        errorMessage: 'Cancelled by user'
      }
    });

    // Remove from active syncs
    this.activeSyncs.delete(syncId);

    // Emit cancellation event
    this.syncProgressGateway.emitSyncCancelled(companyId, {
      syncId,
      message: 'Sync operation cancelled'
    });

    return {
      success: true,
      message: 'Sync operation cancelled successfully'
    };
  }

  // ================================================
  // CONFIGURATION MANAGEMENT
  // ================================================

  async getSyncConfigurations(platformMenuId: string, companyId: string): Promise<any> {
    const platformMenu = await this.prisma.platformMenu.findFirst({
      where: {
        id: platformMenuId,
        companyId
      },
      select: {
        id: true,
        platformConfig: true,
        platformType: true
      }
    });

    if (!platformMenu) {
      throw new NotFoundException('Platform menu not found');
    }

    return {
      platformMenuId,
      platformType: platformMenu.platformType,
      configurations: platformMenu.platformConfig || {}
    };
  }

  async updateSyncConfiguration(
    platformMenuId: string,
    platformType: string,
    config: any,
    companyId: string
  ): Promise<any> {
    const platformMenu = await this.prisma.platformMenu.findFirst({
      where: {
        id: platformMenuId,
        companyId
      }
    });

    if (!platformMenu) {
      throw new NotFoundException('Platform menu not found');
    }

    const currentConfig = (platformMenu.platformConfig as any) || {};
    const updatedConfig = {
      ...currentConfig,
      [platformType]: {
        ...currentConfig[platformType],
        ...config.configuration,
        updatedAt: new Date()
      }
    };

    const updated = await this.prisma.platformMenu.update({
      where: { id: platformMenuId },
      data: {
        platformConfig: updatedConfig
      }
    });

    return {
      platformMenuId,
      platformType,
      configuration: updatedConfig[platformType]
    };
  }

  // ================================================
  // ANALYTICS & HEALTH
  // ================================================

  async getSyncAnalytics(period: string, companyId: string): Promise<SyncAnalytics> {
    const days = this.getPeriodDays(period);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const [totalSyncs, successfulSyncs, failedSyncs, avgDuration] = await Promise.all([
      this.prisma.platformSyncLog.count({
        where: {
          companyId,
          createdAt: { gte: startDate }
        }
      }),
      this.prisma.platformSyncLog.count({
        where: {
          companyId,
          createdAt: { gte: startDate },
          status: 'completed'
        }
      }),
      this.prisma.platformSyncLog.count({
        where: {
          companyId,
          createdAt: { gte: startDate },
          status: 'failed'
        }
      }),
      this.prisma.platformSyncLog.aggregate({
        where: {
          companyId,
          createdAt: { gte: startDate },
          status: 'completed',
          duration: { not: null }
        },
        _avg: { duration: true }
      })
    ]);

    // Get platform breakdown
    const platformBreakdown = await this.prisma.platformSyncLog.groupBy({
      by: ['platformType', 'status'],
      where: {
        companyId,
        createdAt: { gte: startDate }
      },
      _count: true
    });

    return {
      period,
      totalSyncs,
      successfulSyncs,
      failedSyncs,
      successRate: totalSyncs > 0 ? (successfulSyncs / totalSyncs) * 100 : 0,
      avgDuration: avgDuration._avg.duration || 0,
      platformBreakdown: this.formatPlatformBreakdown(platformBreakdown)
    };
  }

  async getSyncHealthStatus(companyId: string): Promise<HealthStatus> {
    const now = new Date();
    const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const [recentSyncs, activeSyncsCount, failedSyncsLast24h] = await Promise.all([
      this.prisma.platformSyncLog.findMany({
        where: {
          companyId,
          createdAt: { gte: last24Hours }
        },
        select: {
          status: true,
          platformType: true,
          duration: true
        }
      }),
      this.prisma.platformSyncLog.count({
        where: {
          companyId,
          status: 'in_progress'
        }
      }),
      this.prisma.platformSyncLog.count({
        where: {
          companyId,
          createdAt: { gte: last24Hours },
          status: 'failed'
        }
      })
    ]);

    const totalRecent = recentSyncs.length;
    const successfulRecent = recentSyncs.filter(s => s.status === 'completed').length;
    const healthScore = totalRecent > 0 ? (successfulRecent / totalRecent) * 100 : 100;

    let healthStatus: 'healthy' | 'warning' | 'critical';
    if (healthScore >= 90) healthStatus = 'healthy';
    else if (healthScore >= 70) healthStatus = 'warning';
    else healthStatus = 'critical';

    return {
      status: healthStatus,
      healthScore,
      activeSyncs: activeSyncsCount,
      failedSyncsLast24h,
      recentSyncCount: totalRecent,
      avgResponseTime: this.calculateAvgResponseTime(recentSyncs),
      platformStatus: this.calculatePlatformStatus(recentSyncs)
    };
  }

  // ================================================
  // WEBHOOK HANDLING
  // ================================================

  async handlePlatformWebhook(platformType: string, webhookData: any): Promise<any> {
    this.logger.log(`Processing webhook from ${platformType}:`, webhookData);

    try {
      // Extract sync ID and status from webhook data
      const { syncId, status, message, externalId } = this.parseWebhookData(
        platformType,
        webhookData
      );

      if (syncId) {
        // Update sync status based on webhook
        await this.updateSyncStatusFromWebhook(syncId, status, message, externalId);

        // Emit real-time update
        const syncLog = await this.prisma.platformSyncLog.findUnique({
          where: { id: syncId }
        });

        if (syncLog) {
          this.syncProgressGateway.emitSyncProgress(syncLog.companyId, {
            syncId,
            status,
            message,
            externalId
          });
        }
      }

      return {
        processed: true,
        syncId,
        status
      };
    } catch (error) {
      this.logger.error(`Webhook processing failed: ${error.message}`, error.stack);
      throw error;
    }
  }

  // ================================================
  // HELPER METHODS
  // ================================================

  private generateSyncId(): string {
    return `sync_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateBatchId(): string {
    return `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private estimateSyncDuration(platformType: string): number {
    // Estimated durations in milliseconds
    const estimations = {
      careem: 30000, // 30 seconds
      talabat: 25000, // 25 seconds
      deliveroo: 35000, // 35 seconds
      default: 30000
    };

    return estimations[platformType] || estimations.default;
  }

  private async createSyncLog(data: any): Promise<any> {
    return this.prisma.platformSyncLog.create({
      data: {
        id: data.syncId,
        platformMenuId: data.platformMenuId,
        platformType: data.platformType,
        syncType: data.syncType,
        status: 'pending',
        userId: data.userId,
        companyId: data.companyId,
        configuration: data.configuration,
        progress: 0,
        retryCount: 0
      }
    });
  }

  private async createBatchSyncLog(data: any): Promise<any> {
    return this.prisma.multiPlatformSyncHistory.create({
      data: {
        id: data.batchId,
        menuId: data.platformMenuId,
        platforms: data.platforms,
        overallStatus: 'in_progress',
        userId: data.userId,
        companyId: data.companyId
      }
    });
  }

  private async updateSyncStatus(
    syncId: string,
    status: string,
    data: any = {}
  ): Promise<void> {
    const updateData: any = {
      status,
      ...data
    };

    if (status === 'completed' || status === 'failed') {
      updateData.completedAt = new Date();
    }

    await this.prisma.platformSyncLog.update({
      where: { id: syncId },
      data: updateData
    });
  }

  private async updateBatchSyncOperations(
    batchId: string,
    syncIds: string[]
  ): Promise<void> {
    // This would link individual sync operations to the batch
    // Implementation depends on your exact schema structure
    await this.prisma.multiPlatformSyncHistory.update({
      where: { id: batchId },
      data: {
        syncOperationIds: syncIds
      }
    });
  }

  private async handleSyncError(syncId: string, error: any): Promise<void> {
    this.logger.error(`Sync ${syncId} failed:`, error);

    await this.updateSyncStatus(syncId, 'failed', {
      errorMessage: error.message,
      completedAt: new Date()
    });

    // Get sync log to emit error
    const syncLog = await this.prisma.platformSyncLog.findUnique({
      where: { id: syncId }
    });

    if (syncLog) {
      this.syncProgressGateway.emitSyncFailed(syncLog.companyId, {
        syncId,
        error: error.message
      });
    }
  }

  private async getPlatformMenuData(platformMenuId: string): Promise<any> {
    return this.prisma.platformMenu.findUnique({
      where: { id: platformMenuId },
      include: {
        menuItems: {
          include: {
            product: {
              include: {
                category: true,
                productImages: true,
                modifierCategories: {
                  include: {
                    modifierCategory: {
                      include: { modifiers: true }
                    }
                  }
                }
              }
            }
          }
        }
      }
    });
  }

  private async updatePlatformMenuSyncStatus(
    platformMenuId: string,
    platformType: string,
    status: string,
    result: any
  ): Promise<void> {
    const currentConfig = await this.prisma.platformMenu.findUnique({
      where: { id: platformMenuId },
      select: { platformConfig: true }
    });

    const config = (currentConfig?.platformConfig as any) || {};
    config[platformType] = {
      ...config[platformType],
      lastSyncedAt: new Date(),
      syncStatus: status,
      externalId: result.storeMenuId || result.menuId,
      lastSyncResult: result
    };

    await this.prisma.platformMenu.update({
      where: { id: platformMenuId },
      data: {
        platformConfig: config,
        lastSyncedAt: new Date(),
        syncStatus: status
      }
    });
  }

  private getPeriodDays(period: string): number {
    switch (period) {
      case 'day': return 1;
      case 'week': return 7;
      case 'month': return 30;
      case 'quarter': return 90;
      default: return 7;
    }
  }

  private formatPlatformBreakdown(breakdown: any[]): any {
    const result: any = {};
    breakdown.forEach(item => {
      if (!result[item.platformType]) {
        result[item.platformType] = {};
      }
      result[item.platformType][item.status] = item._count;
    });
    return result;
  }

  private calculateAvgResponseTime(syncs: any[]): number {
    const completedSyncs = syncs.filter(s => s.duration);
    if (completedSyncs.length === 0) return 0;

    const total = completedSyncs.reduce((sum, s) => sum + s.duration, 0);
    return total / completedSyncs.length;
  }

  private calculatePlatformStatus(syncs: any[]): any {
    const platforms = ['careem', 'talabat', 'deliveroo'];
    const status: any = {};

    platforms.forEach(platform => {
      const platformSyncs = syncs.filter(s => s.platformType === platform);
      const successful = platformSyncs.filter(s => s.status === 'completed').length;
      const total = platformSyncs.length;

      status[platform] = {
        total,
        successful,
        successRate: total > 0 ? (successful / total) * 100 : 0,
        status: total === 0 ? 'inactive' : (successful / total) >= 0.9 ? 'healthy' : 'degraded'
      };
    });

    return status;
  }

  private parseWebhookData(platformType: string, webhookData: any): any {
    // Platform-specific webhook parsing
    switch (platformType) {
      case 'careem':
        return {
          syncId: webhookData.sync_id || webhookData.reference_id,
          status: this.mapCareemStatus(webhookData.status),
          message: webhookData.message,
          externalId: webhookData.store_menu_id
        };
      case 'talabat':
        return {
          syncId: webhookData.sync_id || webhookData.operation_id,
          status: this.mapTalabatStatus(webhookData.status),
          message: webhookData.message,
          externalId: webhookData.menu_id
        };
      default:
        return {
          syncId: webhookData.sync_id,
          status: webhookData.status,
          message: webhookData.message,
          externalId: webhookData.external_id
        };
    }
  }

  private mapCareemStatus(careemStatus: string): string {
    const statusMap: any = {
      'processing': 'in_progress',
      'completed': 'completed',
      'failed': 'failed',
      'cancelled': 'cancelled'
    };
    return statusMap[careemStatus] || careemStatus;
  }

  private mapTalabatStatus(talabatStatus: string): string {
    const statusMap: any = {
      'processing': 'in_progress',
      'success': 'completed',
      'error': 'failed',
      'cancelled': 'cancelled'
    };
    return statusMap[talabatStatus] || talabatStatus;
  }

  private async updateSyncStatusFromWebhook(
    syncId: string,
    status: string,
    message?: string,
    externalId?: string
  ): Promise<void> {
    const updateData: any = {
      status,
      lastWebhookAt: new Date()
    };

    if (message) {
      updateData.webhookMessage = message;
    }

    if (externalId) {
      updateData.externalId = externalId;
    }

    if (status === 'completed' || status === 'failed') {
      updateData.completedAt = new Date();
    }

    await this.prisma.platformSyncLog.update({
      where: { id: syncId },
      data: updateData
    });
  }
}