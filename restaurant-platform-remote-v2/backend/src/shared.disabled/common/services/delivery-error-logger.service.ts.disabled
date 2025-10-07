import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

export interface DeliveryError {
  companyId: string;
  providerType: string;
  errorType: 'connection' | 'authentication' | 'validation' | 'business_logic' | 'timeout' | 'rate_limit';
  errorCode?: string;
  errorMessage: string;
  requestPayload?: any;
  responsePayload?: any;
  retryCount?: number;
}

export interface WebhookError {
  companyId: string;
  providerType: string;
  webhookType: string;
  orderId?: string;
  payload: any;
  errorMessage?: string;
}

@Injectable()
export class DeliveryErrorLoggerService {
  private readonly logger = new Logger(DeliveryErrorLoggerService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Log delivery provider errors with comprehensive details
   */
  async logDeliveryError(error: DeliveryError): Promise<void> {
    try {
      // Sanitize sensitive data from payloads
      const sanitizedRequest = this.sanitizePayload(error.requestPayload);
      const sanitizedResponse = this.sanitizePayload(error.responsePayload);

      await this.prisma.deliveryErrorLog.create({
        data: {
          companyId: error.companyId,
          providerType: error.providerType,
          errorType: error.errorType,
          errorCode: error.errorCode,
          errorMessage: error.errorMessage,
          requestPayload: sanitizedRequest,
          responsePayload: sanitizedResponse,
          retryCount: error.retryCount || 0,
        },
      });

      // Log to application logs as well for immediate monitoring
      this.logger.error(`Delivery Error [${error.providerType}]: ${error.errorMessage}`, {
        companyId: error.companyId,
        errorType: error.errorType,
        errorCode: error.errorCode,
        retryCount: error.retryCount,
      });

      // Check if error rate is too high and trigger alerts
      await this.checkErrorRateThreshold(error.companyId, error.providerType);
    } catch (err) {
      this.logger.error('Failed to log delivery error', err);
    }
  }

  /**
   * Log webhook processing events
   */
  async logWebhookEvent(webhook: WebhookError): Promise<string> {
    try {
      const sanitizedPayload = this.sanitizePayload(webhook.payload);

      const log = await this.prisma.webhookDeliveryLog.create({
        data: {
          companyId: webhook.companyId,
          providerType: webhook.providerType,
          webhookType: webhook.webhookType,
          orderId: webhook.orderId,
          payload: sanitizedPayload,
          status: webhook.errorMessage ? 'failed' : 'pending',
          errorMessage: webhook.errorMessage,
        },
      });

      return log.id;
    } catch (err) {
      this.logger.error('Failed to log webhook event', err);
      throw err;
    }
  }

  /**
   * Mark webhook as processed
   */
  async markWebhookProcessed(webhookLogId: string): Promise<void> {
    try {
      await this.prisma.webhookDeliveryLog.update({
        where: { id: webhookLogId },
        data: {
          status: 'processed',
          processedAt: new Date(),
        },
      });
    } catch (err) {
      this.logger.error('Failed to mark webhook as processed', err);
    }
  }

  /**
   * Mark webhook as failed with retry increment
   */
  async markWebhookFailed(webhookLogId: string, errorMessage: string): Promise<void> {
    try {
      const current = await this.prisma.webhookDeliveryLog.findUnique({
        where: { id: webhookLogId },
        select: { processingAttempts: true },
      });

      await this.prisma.webhookDeliveryLog.update({
        where: { id: webhookLogId },
        data: {
          status: current && current.processingAttempts < 3 ? 'retrying' : 'failed',
          processingAttempts: { increment: 1 },
          errorMessage,
        },
      });
    } catch (err) {
      this.logger.error('Failed to mark webhook as failed', err);
    }
  }

  /**
   * Resolve delivery error (mark as fixed)
   */
  async resolveDeliveryError(errorId: string): Promise<void> {
    try {
      await this.prisma.deliveryErrorLog.update({
        where: { id: errorId },
        data: { resolvedAt: new Date() },
      });
    } catch (err) {
      this.logger.error('Failed to resolve delivery error', err);
    }
  }

  /**
   * Get recent unresolved errors for monitoring dashboard
   */
  async getUnresolvedErrors(companyId?: string, hours: number = 24) {
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);

    return this.prisma.deliveryErrorLog.findMany({
      where: {
        ...(companyId && { companyId }),
        resolvedAt: null,
        createdAt: { gte: since },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: {
        company: { select: { name: true, slug: true } },
      },
    });
  }

  /**
   * Get error statistics for analytics
   */
  async getErrorStatistics(companyId: string, providerType?: string, days: number = 7) {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const baseWhere = {
      companyId,
      createdAt: { gte: since },
      ...(providerType && { providerType }),
    };

    const [total, byType, byProvider, resolved] = await Promise.all([
      this.prisma.deliveryErrorLog.count({ where: baseWhere }),
      this.prisma.deliveryErrorLog.groupBy({
        by: ['errorType'],
        where: baseWhere,
        _count: true,
      }),
      this.prisma.deliveryErrorLog.groupBy({
        by: ['providerType'],
        where: baseWhere,
        _count: true,
      }),
      this.prisma.deliveryErrorLog.count({
        where: { ...baseWhere, resolvedAt: { not: null } },
      }),
    ]);

    return {
      total,
      resolved,
      unresolved: total - resolved,
      resolutionRate: total > 0 ? (resolved / total) * 100 : 0,
      byType,
      byProvider,
    };
  }

  /**
   * Update daily analytics for provider performance
   */
  async updateProviderAnalytics(
    companyId: string,
    providerType: string,
    data: {
      totalOrders?: number;
      successfulOrders?: number;
      failedOrders?: number;
      cancelledOrders?: number;
      totalRevenue?: number;
      totalDeliveryFee?: number;
      averageDeliveryTime?: number;
      customerRating?: number;
    }
  ): Promise<void> {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      await this.prisma.deliveryProviderAnalytics.upsert({
        where: {
          companyId_providerType_date: {
            companyId,
            providerType,
            date: today,
          },
        },
        create: {
          companyId,
          providerType,
          date: today,
          totalOrders: data.totalOrders || 0,
          successfulOrders: data.successfulOrders || 0,
          failedOrders: data.failedOrders || 0,
          cancelledOrders: data.cancelledOrders || 0,
          totalRevenue: data.totalRevenue || 0,
          totalDeliveryFee: data.totalDeliveryFee || 0,
          averageDeliveryTime: data.averageDeliveryTime || 0,
          customerRatingsSum: data.customerRating || 0,
          customerRatingsCount: data.customerRating ? 1 : 0,
        },
        update: {
          totalOrders: { increment: data.totalOrders || 0 },
          successfulOrders: { increment: data.successfulOrders || 0 },
          failedOrders: { increment: data.failedOrders || 0 },
          cancelledOrders: { increment: data.cancelledOrders || 0 },
          totalRevenue: { increment: data.totalRevenue || 0 },
          totalDeliveryFee: { increment: data.totalDeliveryFee || 0 },
          averageDeliveryTime: data.averageDeliveryTime || undefined,
          ...(data.customerRating && {
            customerRatingsSum: { increment: data.customerRating },
            customerRatingsCount: { increment: 1 },
          }),
        },
      });
    } catch (err) {
      this.logger.error('Failed to update provider analytics', err);
    }
  }

  /**
   * Get provider analytics for dashboard
   */
  async getProviderAnalytics(companyId: string, days: number = 30) {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    return this.prisma.deliveryProviderAnalytics.findMany({
      where: {
        companyId,
        date: { gte: since },
      },
      orderBy: [{ providerType: 'asc' }, { date: 'desc' }],
    });
  }

  /**
   * Private method to sanitize sensitive data from payloads
   */
  private sanitizePayload(payload: any): any {
    if (!payload) return null;

    const sensitiveFields = [
      'password', 'token', 'key', 'secret', 'authorization',
      'apiKey', 'api_key', 'accessToken', 'access_token',
      'clientSecret', 'client_secret', 'webhookSecret',
    ];

    const sanitize = (obj: any): any => {
      if (Array.isArray(obj)) {
        return obj.map(sanitize);
      }

      if (obj && typeof obj === 'object') {
        const sanitized: any = {};
        for (const [key, value] of Object.entries(obj)) {
          if (sensitiveFields.some(field => key.toLowerCase().includes(field.toLowerCase()))) {
            sanitized[key] = '[REDACTED]';
          } else {
            sanitized[key] = sanitize(value);
          }
        }
        return sanitized;
      }

      return obj;
    };

    return sanitize(payload);
  }

  /**
   * Check if error rate exceeds threshold and trigger alerts
   */
  private async checkErrorRateThreshold(companyId: string, providerType: string): Promise<void> {
    try {
      const lastHour = new Date(Date.now() - 60 * 60 * 1000);
      
      const [totalRequests, errors] = await Promise.all([
        this.prisma.deliveryErrorLog.count({
          where: {
            companyId,
            providerType,
            createdAt: { gte: lastHour },
          },
        }),
        this.prisma.deliveryErrorLog.count({
          where: {
            companyId,
            providerType,
            createdAt: { gte: lastHour },
            errorType: { in: ['connection', 'timeout'] },
          },
        }),
      ]);

      const errorRate = totalRequests > 0 ? (errors / totalRequests) * 100 : 0;

      if (errorRate > 20 && totalRequests > 10) {
        this.logger.warn(`High error rate detected for ${providerType}: ${errorRate.toFixed(1)}%`, {
          companyId,
          providerType,
          errorRate,
          totalRequests,
          errors,
        });

        // Here you could integrate with alerting services like Slack, PagerDuty, etc.
        // await this.alertingService.sendAlert({ ... });
      }
    } catch (err) {
      this.logger.error('Failed to check error rate threshold', err);
    }
  }
}