import { PrismaClient } from '@prisma/client';
import { Injectable } from '@nestjs/common';

@Injectable()
export class ChannelSyncService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Start a sync operation for a channel assignment
   */
  async startSync(data: {
    companyChannelAssignmentId?: string;
    platformMenuChannelAssignmentId?: string;
    syncType: string;
    triggeredBy?: string;
  }) {
    const syncLog = await this.prisma.channelSyncLog.create({
      data: {
        companyChannelAssignmentId: data.companyChannelAssignmentId || null,
        platformMenuChannelAssignmentId: data.platformMenuChannelAssignmentId || null,
        syncType: data.syncType,
        status: 'pending',
        startedAt: new Date(),
        itemsProcessed: 0,
        itemsTotal: 0,
      }
    });

    // Update assignment status
    if (data.companyChannelAssignmentId) {
      await this.prisma.companyChannelAssignment.update({
        where: { id: data.companyChannelAssignmentId },
        data: { syncStatus: 'in_progress' }
      });
    }

    if (data.platformMenuChannelAssignmentId) {
      await this.prisma.platformMenuChannelAssignment.update({
        where: { id: data.platformMenuChannelAssignmentId },
        data: { menuSyncStatus: 'in_progress' }
      });
    }

    return syncLog;
  }

  /**
   * Update sync progress
   */
  async updateSyncProgress(
    syncLogId: string,
    data: {
      status?: string;
      itemsProcessed?: number;
      itemsTotal?: number;
      errors?: any;
      performanceMetrics?: any;
    }
  ) {
    const updateData: any = { ...data };

    if (data.status === 'completed' || data.status === 'failed') {
      updateData.completedAt = new Date();
    }

    return this.prisma.channelSyncLog.update({
      where: { id: syncLogId },
      data: updateData
    });
  }

  /**
   * Complete sync operation
   */
  async completeSync(
    syncLogId: string,
    data: {
      status: 'completed' | 'failed';
      itemsProcessed: number;
      itemsTotal: number;
      errors?: any;
      performanceMetrics?: any;
    }
  ) {
    const syncLog = await this.prisma.channelSyncLog.update({
      where: { id: syncLogId },
      data: {
        status: data.status,
        completedAt: new Date(),
        itemsProcessed: data.itemsProcessed,
        itemsTotal: data.itemsTotal,
        errors: data.errors || null,
        performanceMetrics: data.performanceMetrics || null,
      }
    });

    // Update assignment status
    const finalStatus = data.status === 'completed' ? 'completed' : 'failed';
    const errorMessage = data.status === 'failed' ?
      (typeof data.errors === 'string' ? data.errors : JSON.stringify(data.errors)) : null;

    if (syncLog.companyChannelAssignmentId) {
      await this.prisma.companyChannelAssignment.update({
        where: { id: syncLog.companyChannelAssignmentId },
        data: {
          syncStatus: finalStatus,
          lastSyncAt: data.status === 'completed' ? new Date() : undefined,
          syncErrorMessage: errorMessage,
          syncRetryCount: data.status === 'failed' ? { increment: 1 } : 0,
        }
      });
    }

    if (syncLog.platformMenuChannelAssignmentId) {
      await this.prisma.platformMenuChannelAssignment.update({
        where: { id: syncLog.platformMenuChannelAssignmentId },
        data: {
          menuSyncStatus: finalStatus,
          lastMenuSyncAt: data.status === 'completed' ? new Date() : undefined,
          menuSyncError: errorMessage,
        }
      });
    }

    return syncLog;
  }

  /**
   * Get sync logs for a channel assignment
   */
  async getSyncLogs(
    assignmentId: string,
    assignmentType: 'company' | 'platform_menu',
    options: {
      limit?: number;
      offset?: number;
      status?: string;
    } = {}
  ) {
    const where: any = {};

    if (assignmentType === 'company') {
      where.companyChannelAssignmentId = assignmentId;
    } else {
      where.platformMenuChannelAssignmentId = assignmentId;
    }

    if (options.status) {
      where.status = options.status;
    }

    return this.prisma.channelSyncLog.findMany({
      where,
      orderBy: { startedAt: 'desc' },
      take: options.limit || 20,
      skip: options.offset || 0,
      select: {
        id: true,
        syncType: true,
        status: true,
        startedAt: true,
        completedAt: true,
        itemsProcessed: true,
        itemsTotal: true,
        errors: true,
        performanceMetrics: true,
      }
    });
  }

  /**
   * Get sync statistics for a channel assignment
   */
  async getSyncStatistics(
    assignmentId: string,
    assignmentType: 'company' | 'platform_menu',
    timeRange: 'day' | 'week' | 'month' = 'week'
  ) {
    const now = new Date();
    const startDate = new Date();

    switch (timeRange) {
      case 'day':
        startDate.setDate(now.getDate() - 1);
        break;
      case 'week':
        startDate.setDate(now.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(now.getMonth() - 1);
        break;
    }

    const where: any = {
      startedAt: { gte: startDate }
    };

    if (assignmentType === 'company') {
      where.companyChannelAssignmentId = assignmentId;
    } else {
      where.platformMenuChannelAssignmentId = assignmentId;
    }

    const [totalSyncs, successfulSyncs, failedSyncs] = await Promise.all([
      this.prisma.channelSyncLog.count({ where }),
      this.prisma.channelSyncLog.count({
        where: { ...where, status: 'completed' }
      }),
      this.prisma.channelSyncLog.count({
        where: { ...where, status: 'failed' }
      }),
    ]);

    const successRate = totalSyncs > 0 ? (successfulSyncs / totalSyncs) * 100 : 0;

    return {
      totalSyncs,
      successfulSyncs,
      failedSyncs,
      successRate: Math.round(successRate * 100) / 100,
      timeRange,
    };
  }

  /**
   * Trigger menu sync for platform assignment
   */
  async triggerMenuSync(
    platformMenuChannelAssignmentId: string,
    companyId: string,
    triggeredBy?: string
  ) {
    // Verify assignment belongs to company
    const assignment = await this.prisma.platformMenuChannelAssignment.findFirst({
      where: {
        id: platformMenuChannelAssignmentId,
        companyChannelAssignment: { companyId },
        deletedAt: null,
      },
      include: {
        platformMenu: {
          select: { id: true, name: true, platformType: true }
        },
        companyChannelAssignment: {
          include: {
            channel: {
              select: { id: true, name: true, slug: true }
            }
          }
        }
      }
    });

    if (!assignment) {
      throw new Error('Platform menu channel assignment not found');
    }

    // Start sync operation
    const syncLog = await this.startSync({
      platformMenuChannelAssignmentId,
      syncType: 'manual',
      triggeredBy,
    });

    // Here you would integrate with actual sync logic
    // For now, we'll simulate a sync operation
    setTimeout(async () => {
      try {
        // Simulate sync work
        await this.updateSyncProgress(syncLog.id, {
          status: 'in_progress',
          itemsTotal: 100,
          itemsProcessed: 0,
        });

        // Simulate processing
        for (let i = 1; i <= 10; i++) {
          await new Promise(resolve => setTimeout(resolve, 100));
          await this.updateSyncProgress(syncLog.id, {
            itemsProcessed: i * 10,
          });
        }

        // Complete sync
        await this.completeSync(syncLog.id, {
          status: 'completed',
          itemsProcessed: 100,
          itemsTotal: 100,
          performanceMetrics: {
            duration: Date.now() - syncLog.startedAt.getTime(),
            throughput: 100 / ((Date.now() - syncLog.startedAt.getTime()) / 1000),
          }
        });

      } catch (error) {
        await this.completeSync(syncLog.id, {
          status: 'failed',
          itemsProcessed: 0,
          itemsTotal: 100,
          errors: { message: error.message }
        });
      }
    }, 1000);

    return {
      syncLogId: syncLog.id,
      message: 'Menu sync started successfully',
      assignment: {
        id: assignment.id,
        platformMenu: assignment.platformMenu,
        channel: assignment.companyChannelAssignment.channel,
      }
    };
  }
}