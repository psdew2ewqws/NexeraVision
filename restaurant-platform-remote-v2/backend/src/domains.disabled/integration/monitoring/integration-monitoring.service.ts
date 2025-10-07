import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma.service';

/**
 * Integration Monitoring Service
 *
 * @description Provides monitoring, analytics, and health checks for integrations
 */
@Injectable()
export class IntegrationMonitoringService {
  private readonly logger = new Logger(IntegrationMonitoringService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get comprehensive integration health status
   */
  async getIntegrationHealth(companyId: string) {
    try {
      const [
        webhookStats,
        orderStats,
        recentErrors,
        providerStatus,
      ] = await Promise.all([
        this.getWebhookHealthStats(companyId),
        this.getOrderHealthStats(companyId),
        this.getRecentErrors(companyId),
        this.getProviderStatus(companyId),
      ]);

      return {
        overall: this.calculateOverallHealth(webhookStats, orderStats),
        webhooks: webhookStats,
        orders: orderStats,
        providers: providerStatus,
        recentErrors,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error(
        `Failed to get integration health: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Get webhook health statistics
   * @private
   */
  private async getWebhookHealthStats(companyId: string) {
    const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const [total, successful, failed, pending] = await Promise.all([
      this.prisma.webhookLog.count({
        where: { companyId, createdAt: { gte: last24Hours } },
      }),
      this.prisma.webhookLog.count({
        where: { companyId, status: 'delivered', createdAt: { gte: last24Hours } },
      }),
      this.prisma.webhookLog.count({
        where: { companyId, status: 'failed', createdAt: { gte: last24Hours } },
      }),
      this.prisma.webhookLog.count({
        where: { companyId, status: 'pending', createdAt: { gte: last24Hours } },
      }),
    ]);

    const successRate = total > 0 ? (successful / total) * 100 : 100;

    return {
      total,
      successful,
      failed,
      pending,
      successRate: Math.round(successRate),
      health: successRate >= 95 ? 'healthy' : successRate >= 80 ? 'degraded' : 'unhealthy',
    };
  }

  /**
   * Get order health statistics
   * @private
   */
  private async getOrderHealthStats(companyId: string) {
    const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const [total, completed, failed, processing] = await Promise.all([
      this.prisma.integrationOrder.count({
        where: { companyId, createdAt: { gte: last24Hours } },
      }),
      this.prisma.integrationOrder.count({
        where: { companyId, status: 'DELIVERED', createdAt: { gte: last24Hours } },
      }),
      this.prisma.integrationOrder.count({
        where: { companyId, status: 'FAILED', createdAt: { gte: last24Hours } },
      }),
      this.prisma.integrationOrder.count({
        where: {
          companyId,
          status: { in: ['PENDING', 'CONFIRMED', 'PREPARING', 'READY'] },
          createdAt: { gte: last24Hours },
        },
      }),
    ]);

    const completionRate = total > 0 ? (completed / total) * 100 : 100;

    return {
      total,
      completed,
      failed,
      processing,
      completionRate: Math.round(completionRate),
      health: completionRate >= 90 ? 'healthy' : completionRate >= 75 ? 'degraded' : 'unhealthy',
    };
  }

  /**
   * Get recent errors
   * @private
   */
  private async getRecentErrors(companyId: string, limit = 10) {
    return this.prisma.webhookLog.findMany({
      where: {
        companyId,
        status: 'failed',
      },
      select: {
        id: true,
        provider: true,
        eventType: true,
        errorMessage: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  /**
   * Get provider status
   * @private
   */
  private async getProviderStatus(companyId: string) {
    const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const providerStats = await this.prisma.webhookLog.groupBy({
      by: ['provider'],
      where: {
        companyId,
        createdAt: { gte: last24Hours },
      },
      _count: { _all: true },
    });

    const providersWithSuccess = await Promise.all(
      providerStats.map(async (stat) => {
        const successful = await this.prisma.webhookLog.count({
          where: {
            companyId,
            provider: stat.provider,
            status: 'delivered',
            createdAt: { gte: last24Hours },
          },
        });

        const successRate = stat._count._all > 0
          ? (successful / stat._count._all) * 100
          : 100;

        return {
          provider: stat.provider,
          total: stat._count._all,
          successful,
          successRate: Math.round(successRate),
          status: successRate >= 95 ? 'operational' : successRate >= 80 ? 'degraded' : 'down',
        };
      }),
    );

    return providersWithSuccess;
  }

  /**
   * Calculate overall health
   * @private
   */
  private calculateOverallHealth(webhookStats: any, orderStats: any): string {
    const avgHealth = (webhookStats.successRate + orderStats.completionRate) / 2;

    if (avgHealth >= 95) return 'healthy';
    if (avgHealth >= 80) return 'degraded';
    return 'unhealthy';
  }

  /**
   * Get integration analytics
   */
  async getIntegrationAnalytics(companyId: string, days = 7) {
    try {
      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

      const [webhookTrends, orderTrends, providerPerformance] = await Promise.all([
        this.getWebhookTrends(companyId, startDate),
        this.getOrderTrends(companyId, startDate),
        this.getProviderPerformance(companyId, startDate),
      ]);

      return {
        period: `${days}d`,
        startDate: startDate.toISOString(),
        endDate: new Date().toISOString(),
        webhookTrends,
        orderTrends,
        providerPerformance,
      };
    } catch (error) {
      this.logger.error(
        `Failed to get integration analytics: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Get webhook trends
   * @private
   */
  private async getWebhookTrends(companyId: string, startDate: Date) {
    const dailyStats = await this.prisma.$queryRaw<Array<{
      date: string;
      total: bigint;
      successful: bigint;
      failed: bigint;
    }>>`
      SELECT
        DATE_TRUNC('day', created_at)::date as date,
        COUNT(*) as total,
        COUNT(CASE WHEN status = 'delivered' THEN 1 END) as successful,
        COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed
      FROM webhook_logs
      WHERE company_id = ${companyId}
        AND created_at >= ${startDate}
      GROUP BY DATE_TRUNC('day', created_at)
      ORDER BY date DESC
    `;

    return dailyStats.map((row) => ({
      date: row.date,
      total: Number(row.total),
      successful: Number(row.successful),
      failed: Number(row.failed),
      successRate: Number(row.total) > 0
        ? Math.round((Number(row.successful) / Number(row.total)) * 100)
        : 100,
    }));
  }

  /**
   * Get order trends
   * @private
   */
  private async getOrderTrends(companyId: string, startDate: Date) {
    const dailyStats = await this.prisma.$queryRaw<Array<{
      date: string;
      total: bigint;
      completed: bigint;
      failed: bigint;
    }>>`
      SELECT
        DATE_TRUNC('day', created_at)::date as date,
        COUNT(*) as total,
        COUNT(CASE WHEN status = 'DELIVERED' THEN 1 END) as completed,
        COUNT(CASE WHEN status = 'FAILED' THEN 1 END) as failed
      FROM integration_orders
      WHERE company_id = ${companyId}
        AND created_at >= ${startDate}
      GROUP BY DATE_TRUNC('day', created_at)
      ORDER BY date DESC
    `;

    return dailyStats.map((row) => ({
      date: row.date,
      total: Number(row.total),
      completed: Number(row.completed),
      failed: Number(row.failed),
      completionRate: Number(row.total) > 0
        ? Math.round((Number(row.completed) / Number(row.total)) * 100)
        : 100,
    }));
  }

  /**
   * Get provider performance
   * @private
   */
  private async getProviderPerformance(companyId: string, startDate: Date) {
    const providerStats = await this.prisma.webhookLog.groupBy({
      by: ['provider'],
      where: {
        companyId,
        createdAt: { gte: startDate },
      },
      _count: { _all: true },
      _avg: { responseTimeMs: true },
    });

    return Promise.all(
      providerStats.map(async (stat) => {
        const successful = await this.prisma.webhookLog.count({
          where: {
            companyId,
            provider: stat.provider,
            status: 'delivered',
            createdAt: { gte: startDate },
          },
        });

        return {
          provider: stat.provider,
          totalWebhooks: stat._count._all,
          successfulWebhooks: successful,
          successRate: Math.round((successful / stat._count._all) * 100),
          avgResponseTime: Math.round(stat._avg.responseTimeMs || 0),
        };
      }),
    );
  }
}
