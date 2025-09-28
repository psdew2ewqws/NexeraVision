import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../shared/services/prisma.service';
import { WebhookLog, Prisma } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';

export interface LogWebhookOptions {
  organizationId: string;
  configurationId?: string;
  webhookUrl: string;
  method?: string;
  eventType: string;
  eventId?: string;
  requestHeaders?: Record<string, any>;
  requestPayload: Record<string, any>;
  correlationId?: string;
  ipAddress?: string;
  userAgent?: string;
  signature?: string;
  metadata?: Record<string, any>;
}

export interface UpdateWebhookLogOptions {
  httpStatusCode?: number;
  responseHeaders?: Record<string, any>;
  responseBody?: Record<string, any>;
  errorMessage?: string;
  errorDetails?: Record<string, any>;
  responseTimeMs?: number;
  status: 'delivered' | 'failed' | 'retrying';
  attemptNumber?: number;
  nextRetryAt?: Date;
}

export interface WebhookMetrics {
  totalWebhooks: number;
  successfulWebhooks: number;
  failedWebhooks: number;
  successRate: number;
  averageResponseTime: number;
  webhooksByStatus: Record<string, number>;
  webhooksByEventType: Record<string, number>;
  hourlyStats: Array<{
    hour: string;
    total: number;
    successful: number;
    failed: number;
  }>;
  dailyStats: Array<{
    date: string;
    total: number;
    successful: number;
    failed: number;
    averageResponseTime: number;
  }>;
}

export interface WebhookLogFilters {
  organizationId: string;
  configurationId?: string;
  eventType?: string;
  status?: string;
  eventId?: string;
  correlationId?: string;
  startDate?: Date;
  endDate?: Date;
  minResponseTime?: number;
  maxResponseTime?: number;
  httpStatusCode?: number;
  page?: number;
  limit?: number;
  sortBy?: 'createdAt' | 'responseTimeMs' | 'status';
  sortOrder?: 'asc' | 'desc';
}

@Injectable()
export class WebhookLoggerService {
  private readonly logger = new Logger(WebhookLoggerService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Log an incoming webhook request
   */
  async logIncomingWebhook(options: LogWebhookOptions): Promise<WebhookLog> {
    try {
      const webhookLog = await this.prisma.webhookLog.create({
        data: {
          id: uuidv4(),
          organizationId: options.organizationId,
          configurationId: options.configurationId,
          webhookUrl: options.webhookUrl,
          method: options.method || 'POST',
          eventType: options.eventType,
          eventId: options.eventId,
          status: 'pending',
          requestHeaders: options.requestHeaders || {},
          requestPayload: options.requestPayload,
          correlationId: options.correlationId || uuidv4(),
          ipAddress: options.ipAddress,
          userAgent: options.userAgent,
          signature: options.signature,
          metadata: options.metadata || {},
          sentAt: new Date(),
        },
        include: {
          organization: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
          configuration: {
            select: {
              id: true,
              name: true,
              url: true,
            },
          },
        },
      });

      this.logger.log(`Webhook logged for organization ${options.organizationId}, event: ${options.eventType}, correlation: ${webhookLog.correlationId}`);

      return webhookLog;
    } catch (error) {
      this.logger.error(`Failed to log webhook: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Update webhook log with response details
   */
  async updateWebhookLog(
    webhookLogId: string,
    options: UpdateWebhookLogOptions,
  ): Promise<WebhookLog> {
    try {
      const updateData: Prisma.WebhookLogUpdateInput = {
        status: options.status,
        httpStatusCode: options.httpStatusCode,
        responseHeaders: options.responseHeaders || {},
        responseBody: options.responseBody,
        errorMessage: options.errorMessage,
        errorDetails: options.errorDetails,
        responseTimeMs: options.responseTimeMs,
        attemptNumber: options.attemptNumber,
        nextRetryAt: options.nextRetryAt,
        updatedAt: new Date(),
      };

      // Set delivery timestamp based on status
      if (options.status === 'delivered') {
        updateData.deliveredAt = new Date();
      } else if (options.status === 'failed') {
        updateData.failedAt = new Date();
      }

      const updatedLog = await this.prisma.webhookLog.update({
        where: { id: webhookLogId },
        data: updateData,
        include: {
          organization: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
          configuration: {
            select: {
              id: true,
              name: true,
              url: true,
            },
          },
        },
      });

      this.logger.log(`Webhook log updated: ${webhookLogId}, status: ${options.status}, response time: ${options.responseTimeMs}ms`);

      return updatedLog;
    } catch (error) {
      this.logger.error(`Failed to update webhook log ${webhookLogId}: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Get webhook logs with advanced filtering and pagination
   */
  async getWebhookLogs(filters: WebhookLogFilters) {
    try {
      const {
        organizationId,
        configurationId,
        eventType,
        status,
        eventId,
        correlationId,
        startDate,
        endDate,
        minResponseTime,
        maxResponseTime,
        httpStatusCode,
        page = 1,
        limit = 50,
        sortBy = 'createdAt',
        sortOrder = 'desc',
      } = filters;

      const skip = (page - 1) * limit;

      // Build where clause
      const where: Prisma.WebhookLogWhereInput = {
        organizationId,
      };

      if (configurationId) {
        where.configurationId = configurationId;
      }

      if (eventType) {
        where.eventType = { contains: eventType, mode: 'insensitive' };
      }

      if (status) {
        where.status = status;
      }

      if (eventId) {
        where.eventId = eventId;
      }

      if (correlationId) {
        where.correlationId = correlationId;
      }

      if (startDate || endDate) {
        where.createdAt = {};
        if (startDate) where.createdAt.gte = startDate;
        if (endDate) where.createdAt.lte = endDate;
      }

      if (minResponseTime !== undefined || maxResponseTime !== undefined) {
        where.responseTimeMs = {};
        if (minResponseTime !== undefined) where.responseTimeMs.gte = minResponseTime;
        if (maxResponseTime !== undefined) where.responseTimeMs.lte = maxResponseTime;
      }

      if (httpStatusCode) {
        where.httpStatusCode = httpStatusCode;
      }

      // Execute queries in parallel
      const [logs, totalCount] = await Promise.all([
        this.prisma.webhookLog.findMany({
          where,
          skip,
          take: limit,
          orderBy: { [sortBy]: sortOrder },
          include: {
            organization: {
              select: {
                id: true,
                name: true,
                slug: true,
              },
            },
            configuration: {
              select: {
                id: true,
                name: true,
                url: true,
              },
            },
          },
        }),
        this.prisma.webhookLog.count({ where }),
      ]);

      const totalPages = Math.ceil(totalCount / limit);

      return {
        logs,
        pagination: {
          page,
          limit,
          totalCount,
          totalPages,
          hasNextPage: page < totalPages,
          hasPreviousPage: page > 1,
        },
      };
    } catch (error) {
      this.logger.error(`Failed to get webhook logs: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Get comprehensive webhook metrics and analytics
   */
  async getWebhookMetrics(
    organizationId: string,
    startDate?: Date,
    endDate?: Date,
    configurationId?: string,
  ): Promise<WebhookMetrics> {
    try {
      const where: Prisma.WebhookLogWhereInput = {
        organizationId,
      };

      if (configurationId) {
        where.configurationId = configurationId;
      }

      if (startDate || endDate) {
        where.createdAt = {};
        if (startDate) where.createdAt.gte = startDate;
        if (endDate) where.createdAt.lte = endDate;
      }

      // Basic metrics
      const [
        totalWebhooks,
        successfulWebhooks,
        failedWebhooks,
        averageResponseTimeResult,
        statusGroups,
        eventTypeGroups,
      ] = await Promise.all([
        this.prisma.webhookLog.count({ where }),
        this.prisma.webhookLog.count({
          where: { ...where, status: 'delivered' },
        }),
        this.prisma.webhookLog.count({
          where: { ...where, status: 'failed' },
        }),
        this.prisma.webhookLog.aggregate({
          where: { ...where, responseTimeMs: { not: null } },
          _avg: { responseTimeMs: true },
        }),
        this.prisma.webhookLog.groupBy({
          by: ['status'],
          where,
          _count: { _all: true },
        }),
        this.prisma.webhookLog.groupBy({
          by: ['eventType'],
          where,
          _count: { _all: true },
        }),
      ]);

      const successRate = totalWebhooks > 0 ? (successfulWebhooks / totalWebhooks) * 100 : 0;
      const averageResponseTime = averageResponseTimeResult._avg.responseTimeMs || 0;

      // Convert groups to objects
      const webhooksByStatus = statusGroups.reduce((acc, group) => {
        acc[group.status] = group._count._all;
        return acc;
      }, {} as Record<string, number>);

      const webhooksByEventType = eventTypeGroups.reduce((acc, group) => {
        acc[group.eventType] = group._count._all;
        return acc;
      }, {} as Record<string, number>);

      // Hourly stats (last 24 hours)
      const last24Hours = new Date();
      last24Hours.setHours(last24Hours.getHours() - 24);

      const hourlyStatsRaw = await this.prisma.$queryRaw<Array<{
        hour: string;
        total: bigint;
        successful: bigint;
        failed: bigint;
      }>>`
        SELECT
          TO_CHAR(DATE_TRUNC('hour', created_at), 'YYYY-MM-DD HH24:00') as hour,
          COUNT(*) as total,
          COUNT(CASE WHEN status = 'delivered' THEN 1 END) as successful,
          COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed
        FROM webhook_logs
        WHERE organization_id = ${organizationId}
          AND created_at >= ${last24Hours}
          ${configurationId ? Prisma.sql`AND configuration_id = ${configurationId}` : Prisma.empty}
        GROUP BY DATE_TRUNC('hour', created_at)
        ORDER BY hour DESC
        LIMIT 24
      `;

      const hourlyStats = hourlyStatsRaw.map(row => ({
        hour: row.hour,
        total: Number(row.total),
        successful: Number(row.successful),
        failed: Number(row.failed),
      }));

      // Daily stats (last 30 days)
      const last30Days = new Date();
      last30Days.setDate(last30Days.getDate() - 30);

      const dailyStatsRaw = await this.prisma.$queryRaw<Array<{
        date: string;
        total: bigint;
        successful: bigint;
        failed: bigint;
        avg_response_time: number | null;
      }>>`
        SELECT
          TO_CHAR(DATE_TRUNC('day', created_at), 'YYYY-MM-DD') as date,
          COUNT(*) as total,
          COUNT(CASE WHEN status = 'delivered' THEN 1 END) as successful,
          COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed,
          AVG(response_time_ms) as avg_response_time
        FROM webhook_logs
        WHERE organization_id = ${organizationId}
          AND created_at >= ${last30Days}
          ${configurationId ? Prisma.sql`AND configuration_id = ${configurationId}` : Prisma.empty}
        GROUP BY DATE_TRUNC('day', created_at)
        ORDER BY date DESC
        LIMIT 30
      `;

      const dailyStats = dailyStatsRaw.map(row => ({
        date: row.date,
        total: Number(row.total),
        successful: Number(row.successful),
        failed: Number(row.failed),
        averageResponseTime: row.avg_response_time || 0,
      }));

      return {
        totalWebhooks,
        successfulWebhooks,
        failedWebhooks,
        successRate: Number(successRate.toFixed(2)),
        averageResponseTime: Number(averageResponseTime.toFixed(2)),
        webhooksByStatus,
        webhooksByEventType,
        hourlyStats,
        dailyStats,
      };
    } catch (error) {
      this.logger.error(`Failed to get webhook metrics: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Search webhook logs with advanced text search
   */
  async searchWebhookLogs(
    organizationId: string,
    searchQuery: string,
    filters?: Partial<WebhookLogFilters>,
  ) {
    try {
      const where: Prisma.WebhookLogWhereInput = {
        organizationId,
        OR: [
          { eventType: { contains: searchQuery, mode: 'insensitive' } },
          { eventId: { contains: searchQuery, mode: 'insensitive' } },
          { correlationId: { contains: searchQuery, mode: 'insensitive' } },
          { webhookUrl: { contains: searchQuery, mode: 'insensitive' } },
          { errorMessage: { contains: searchQuery, mode: 'insensitive' } },
        ],
      };

      // Apply additional filters
      if (filters) {
        if (filters.status) where.status = filters.status;
        if (filters.eventType) where.eventType = { contains: filters.eventType, mode: 'insensitive' };
        if (filters.startDate || filters.endDate) {
          where.createdAt = {};
          if (filters.startDate) where.createdAt.gte = filters.startDate;
          if (filters.endDate) where.createdAt.lte = filters.endDate;
        }
      }

      const logs = await this.prisma.webhookLog.findMany({
        where,
        take: filters?.limit || 50,
        skip: filters?.page ? (filters.page - 1) * (filters.limit || 50) : 0,
        orderBy: { [filters?.sortBy || 'createdAt']: filters?.sortOrder || 'desc' },
        include: {
          organization: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
          configuration: {
            select: {
              id: true,
              name: true,
              url: true,
            },
          },
        },
      });

      const totalCount = await this.prisma.webhookLog.count({ where });

      return {
        logs,
        totalCount,
        searchQuery,
      };
    } catch (error) {
      this.logger.error(`Failed to search webhook logs: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Get webhook logs by correlation ID for tracing
   */
  async getWebhookLogsByCorrelation(
    organizationId: string,
    correlationId: string,
  ): Promise<WebhookLog[]> {
    try {
      return await this.prisma.webhookLog.findMany({
        where: {
          organizationId,
          correlationId,
        },
        orderBy: { createdAt: 'asc' },
        include: {
          organization: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
          configuration: {
            select: {
              id: true,
              name: true,
              url: true,
            },
          },
        },
      });
    } catch (error) {
      this.logger.error(`Failed to get webhook logs by correlation ${correlationId}: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Delete old webhook logs based on retention policy
   * Runs daily at 2 AM
   */
  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async cleanupOldLogs(): Promise<void> {
    try {
      // Default retention: 90 days
      const retentionDays = parseInt(process.env.WEBHOOK_LOG_RETENTION_DAYS || '90');
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

      const deletedCount = await this.prisma.webhookLog.deleteMany({
        where: {
          createdAt: {
            lt: cutoffDate,
          },
        },
      });

      this.logger.log(`Cleaned up ${deletedCount.count} webhook logs older than ${retentionDays} days`);
    } catch (error) {
      this.logger.error(`Failed to cleanup old webhook logs: ${error.message}`, error.stack);
    }
  }

  /**
   * Archive old webhook logs to reduce storage (alternative to deletion)
   */
  async archiveOldLogs(organizationId: string, archiveDays = 30): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - archiveDays);

      // In a real implementation, you might move these to an archive table
      // For now, we'll mark them as archived in metadata
      const result = await this.prisma.webhookLog.updateMany({
        where: {
          organizationId,
          createdAt: {
            lt: cutoffDate,
          },
          metadata: {
            path: ['archived'],
            equals: null,
          },
        },
        data: {
          metadata: {
            archived: true,
            archivedAt: new Date().toISOString(),
          },
        },
      });

      this.logger.log(`Archived ${result.count} webhook logs for organization ${organizationId}`);
      return result.count;
    } catch (error) {
      this.logger.error(`Failed to archive webhook logs: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Get webhook performance analytics
   */
  async getPerformanceAnalytics(
    organizationId: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<{
    averageResponseTime: number;
    medianResponseTime: number;
    p95ResponseTime: number;
    p99ResponseTime: number;
    slowestWebhooks: Array<{
      id: string;
      eventType: string;
      responseTimeMs: number;
      webhookUrl: string;
      createdAt: Date;
    }>;
    fastestWebhooks: Array<{
      id: string;
      eventType: string;
      responseTimeMs: number;
      webhookUrl: string;
      createdAt: Date;
    }>;
  }> {
    try {
      const where: Prisma.WebhookLogWhereInput = {
        organizationId,
        responseTimeMs: { not: null },
        status: 'delivered',
      };

      if (startDate || endDate) {
        where.createdAt = {};
        if (startDate) where.createdAt.gte = startDate;
        if (endDate) where.createdAt.lte = endDate;
      }

      // Get percentile calculations using raw SQL
      const percentiles = await this.prisma.$queryRaw<Array<{
        avg_response_time: number;
        median_response_time: number;
        p95_response_time: number;
        p99_response_time: number;
      }>>`
        SELECT
          AVG(response_time_ms) as avg_response_time,
          PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY response_time_ms) as median_response_time,
          PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY response_time_ms) as p95_response_time,
          PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY response_time_ms) as p99_response_time
        FROM webhook_logs
        WHERE organization_id = ${organizationId}
          AND response_time_ms IS NOT NULL
          AND status = 'delivered'
          ${startDate ? Prisma.sql`AND created_at >= ${startDate}` : Prisma.empty}
          ${endDate ? Prisma.sql`AND created_at <= ${endDate}` : Prisma.empty}
      `;

      const [slowestWebhooks, fastestWebhooks] = await Promise.all([
        this.prisma.webhookLog.findMany({
          where,
          orderBy: { responseTimeMs: 'desc' },
          take: 10,
          select: {
            id: true,
            eventType: true,
            responseTimeMs: true,
            webhookUrl: true,
            createdAt: true,
          },
        }),
        this.prisma.webhookLog.findMany({
          where,
          orderBy: { responseTimeMs: 'asc' },
          take: 10,
          select: {
            id: true,
            eventType: true,
            responseTimeMs: true,
            webhookUrl: true,
            createdAt: true,
          },
        }),
      ]);

      const stats = percentiles[0] || {
        avg_response_time: 0,
        median_response_time: 0,
        p95_response_time: 0,
        p99_response_time: 0,
      };

      return {
        averageResponseTime: Number(stats.avg_response_time) || 0,
        medianResponseTime: Number(stats.median_response_time) || 0,
        p95ResponseTime: Number(stats.p95_response_time) || 0,
        p99ResponseTime: Number(stats.p99_response_time) || 0,
        slowestWebhooks: slowestWebhooks.filter(w => w.responseTimeMs !== null),
        fastestWebhooks: fastestWebhooks.filter(w => w.responseTimeMs !== null),
      };
    } catch (error) {
      this.logger.error(`Failed to get performance analytics: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Get webhook error analytics
   */
  async getErrorAnalytics(
    organizationId: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<{
    totalErrors: number;
    errorsByStatusCode: Record<string, number>;
    errorsByEventType: Record<string, number>;
    commonErrors: Array<{
      errorMessage: string;
      count: number;
      lastOccurrence: Date;
    }>;
    recentErrors: Array<{
      id: string;
      eventType: string;
      errorMessage: string;
      httpStatusCode: number;
      createdAt: Date;
    }>;
  }> {
    try {
      const where: Prisma.WebhookLogWhereInput = {
        organizationId,
        status: 'failed',
      };

      if (startDate || endDate) {
        where.createdAt = {};
        if (startDate) where.createdAt.gte = startDate;
        if (endDate) where.createdAt.lte = endDate;
      }

      const [
        totalErrors,
        statusCodeGroups,
        eventTypeGroups,
        commonErrorsRaw,
        recentErrors,
      ] = await Promise.all([
        this.prisma.webhookLog.count({ where }),
        this.prisma.webhookLog.groupBy({
          by: ['httpStatusCode'],
          where: { ...where, httpStatusCode: { not: null } },
          _count: { _all: true },
        }),
        this.prisma.webhookLog.groupBy({
          by: ['eventType'],
          where,
          _count: { _all: true },
        }),
        this.prisma.webhookLog.groupBy({
          by: ['errorMessage'],
          where: { ...where, errorMessage: { not: null } },
          _count: { _all: true },
          _max: { createdAt: true },
          orderBy: { _count: { _all: 'desc' } },
          take: 10,
        }),
        this.prisma.webhookLog.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          take: 20,
          select: {
            id: true,
            eventType: true,
            errorMessage: true,
            httpStatusCode: true,
            createdAt: true,
          },
        }),
      ]);

      const errorsByStatusCode = statusCodeGroups.reduce((acc, group) => {
        if (group.httpStatusCode) {
          acc[group.httpStatusCode.toString()] = group._count._all;
        }
        return acc;
      }, {} as Record<string, number>);

      const errorsByEventType = eventTypeGroups.reduce((acc, group) => {
        acc[group.eventType] = group._count._all;
        return acc;
      }, {} as Record<string, number>);

      const commonErrors = commonErrorsRaw.map(error => ({
        errorMessage: error.errorMessage || 'Unknown error',
        count: error._count._all,
        lastOccurrence: error._max.createdAt || new Date(),
      }));

      return {
        totalErrors,
        errorsByStatusCode,
        errorsByEventType,
        commonErrors,
        recentErrors: recentErrors.filter(e => e.errorMessage),
      };
    } catch (error) {
      this.logger.error(`Failed to get error analytics: ${error.message}`, error.stack);
      throw error;
    }
  }
}