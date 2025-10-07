import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { RegisterWebhookDto } from './dto/register-webhook.dto';
import { WebhookRetryService } from './webhook-retry.service';
import { v4 as uuidv4 } from 'uuid';
import * as crypto from 'crypto';

/**
 * Webhook Service
 *
 * @description Manages webhook registration, configuration, and lifecycle
 * Refactored from integration-platform with enhanced error handling and validation
 *
 * @responsibilities
 * - Webhook registration and configuration management
 * - Secret key generation and rotation
 * - Webhook URL building for different providers
 * - Integration with retry service for failed webhooks
 *
 * @example
 * ```typescript
 * const webhook = await webhookService.registerWebhook({
 *   provider: 'careem',
 *   clientId: 'client-123',
 *   url: 'https://api.restaurant.com/webhooks',
 *   events: ['order.created'],
 *   companyId: 'company-456'
 * });
 * ```
 */
@Injectable()
export class WebhookService {
  private readonly logger = new Logger(WebhookService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly retryService: WebhookRetryService,
  ) {}

  /**
   * Register a new webhook endpoint for a provider
   *
   * @param dto - Webhook registration data
   * @returns Webhook configuration with credentials
   * @throws BadRequestException if validation fails
   */
  async registerWebhook(dto: RegisterWebhookDto) {
    try {
      const webhookId = uuidv4();
      const secretKey = this.generateSecretKey();

      this.logger.log(
        `Registering webhook for provider: ${dto.provider}, company: ${dto.companyId}`,
      );

      // Create webhook registration in database
      const webhook = await this.prisma.webhookConfiguration.create({
        data: {
          id: webhookId,
          companyId: dto.companyId,
          provider: dto.provider,
          clientId: dto.clientId,
          url: dto.url,
          events: dto.events,
          secretKey: this.hashSecretKey(secretKey),
          isActive: true,
          description: dto.description,
          metadata: {
            registeredAt: new Date().toISOString(),
            registeredBy: 'system', // TODO: Add user context
          },
        },
      });

      this.logger.log(
        `Successfully registered webhook ${webhookId} for ${dto.provider}`,
      );

      return {
        webhookId: webhook.id,
        url: this.buildWebhookUrl(dto.provider, dto.clientId, dto.companyId),
        secretKey, // Return plain secret key only once
        status: 'active',
        provider: dto.provider,
        events: dto.events,
        createdAt: webhook.createdAt,
      };
    } catch (error) {
      this.logger.error(
        `Failed to register webhook for ${dto.provider}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Get webhook logs with advanced filtering
   *
   * @param filters - Query filters for webhook logs
   * @returns Paginated webhook logs
   */
  async getWebhookLogs(filters: {
    companyId: string;
    provider?: string;
    clientId?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
    limit: number;
    offset: number;
  }) {
    try {
      const where: any = {
        companyId: filters.companyId,
      };

      if (filters.provider) {
        where.provider = filters.provider;
      }

      if (filters.clientId) {
        where.clientId = filters.clientId;
      }

      if (filters.status) {
        where.status = filters.status;
      }

      if (filters.startDate || filters.endDate) {
        where.createdAt = {};
        if (filters.startDate) {
          where.createdAt.gte = new Date(filters.startDate);
        }
        if (filters.endDate) {
          where.createdAt.lte = new Date(filters.endDate);
        }
      }

      const [logs, total] = await Promise.all([
        this.prisma.webhookLog.findMany({
          where,
          take: filters.limit,
          skip: filters.offset,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            provider: true,
            clientId: true,
            eventType: true,
            status: true,
            responseTimeMs: true,
            httpStatusCode: true,
            errorMessage: true,
            createdAt: true,
            metadata: true,
          },
        }),
        this.prisma.webhookLog.count({ where }),
      ]);

      return {
        logs,
        pagination: {
          total,
          limit: filters.limit,
          offset: filters.offset,
          hasMore: filters.offset + filters.limit < total,
        },
      };
    } catch (error) {
      this.logger.error(
        `Failed to get webhook logs: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Get comprehensive webhook statistics
   *
   * @param params - Query parameters for stats
   * @returns Webhook statistics and metrics
   */
  async getWebhookStats(params: {
    companyId: string;
    provider?: string;
    clientId?: string;
    period: string;
  }) {
    try {
      const periodMap = {
        '1h': 1,
        '24h': 24,
        '7d': 168,
        '30d': 720,
      };

      const hours = periodMap[params.period] || 24;
      const startDate = new Date(Date.now() - hours * 60 * 60 * 1000);

      const where: any = {
        companyId: params.companyId,
        createdAt: {
          gte: startDate,
        },
      };

      if (params.provider) {
        where.provider = params.provider;
      }

      if (params.clientId) {
        where.clientId = params.clientId;
      }

      // Run all queries in parallel for performance
      const [
        totalCount,
        successCount,
        failedCount,
        pendingCount,
        avgResponseTime,
        providerStats,
      ] = await Promise.all([
        this.prisma.webhookLog.count({ where }),
        this.prisma.webhookLog.count({
          where: { ...where, status: 'delivered' },
        }),
        this.prisma.webhookLog.count({ where: { ...where, status: 'failed' } }),
        this.prisma.webhookLog.count({
          where: { ...where, status: 'pending' },
        }),
        this.prisma.webhookLog.aggregate({
          where: { ...where, responseTimeMs: { not: null } },
          _avg: { responseTimeMs: true },
        }),
        this.prisma.webhookLog.groupBy({
          by: ['provider'],
          where,
          _count: { _all: true },
        }),
      ]);

      const providers = providerStats.reduce((acc, stat) => {
        acc[stat.provider] = {
          total: stat._count._all,
          percentage: totalCount > 0 ? (stat._count._all / totalCount) * 100 : 0,
        };
        return acc;
      }, {});

      return {
        period: params.period,
        timeRange: {
          start: startDate.toISOString(),
          end: new Date().toISOString(),
        },
        totals: {
          total: totalCount,
          successful: successCount,
          failed: failedCount,
          pending: pendingCount,
          successRate: totalCount > 0 ? (successCount / totalCount) * 100 : 0,
        },
        performance: {
          avgResponseTime: Math.round(avgResponseTime._avg.responseTimeMs || 0),
        },
        byProvider: providers,
      };
    } catch (error) {
      this.logger.error(
        `Failed to get webhook stats: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Retry a failed webhook
   *
   * @param logId - Webhook log ID to retry
   * @returns Retry operation result
   */
  async retryWebhook(logId: string) {
    try {
      const log = await this.prisma.webhookLog.findUnique({
        where: { id: logId },
      });

      if (!log) {
        throw new NotFoundException(`Webhook log ${logId} not found`);
      }

      await this.retryService.retryWebhook(logId);

      this.logger.log(`Initiated retry for webhook log: ${logId}`);

      return {
        success: true,
        message: 'Webhook retry initiated',
        logId,
      };
    } catch (error) {
      this.logger.error(
        `Failed to retry webhook ${logId}: ${error.message}`,
        error.stack,
      );

      return {
        success: false,
        message: 'Retry failed',
        error: error.message,
      };
    }
  }

  /**
   * Get webhook configuration for a company
   *
   * @param companyId - Company identifier
   * @returns Webhook configurations
   */
  async getWebhookConfig(companyId: string) {
    try {
      const configurations = await this.prisma.webhookConfiguration.findMany({
        where: { companyId },
        select: {
          id: true,
          provider: true,
          clientId: true,
          url: true,
          events: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
          description: true,
        },
        orderBy: { createdAt: 'desc' },
      });

      return {
        companyId,
        webhooks: configurations.map((config) => ({
          id: config.id,
          provider: config.provider,
          url: this.buildWebhookUrl(config.provider, config.clientId, companyId),
          events: config.events,
          isActive: config.isActive,
          description: config.description,
          createdAt: config.createdAt,
          updatedAt: config.updatedAt,
        })),
        retryPolicy: {
          maxRetries: 3,
          retryDelays: [1000, 5000, 10000],
          exponentialBackoff: true,
        },
      };
    } catch (error) {
      this.logger.error(
        `Failed to get webhook config for company ${companyId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Update webhook configuration
   *
   * @param webhookId - Webhook configuration ID
   * @param updateData - Data to update
   * @returns Updated webhook configuration
   */
  async updateWebhookConfig(
    webhookId: string,
    updateData: {
      url?: string;
      events?: string[];
      isActive?: boolean;
      description?: string;
    },
  ) {
    try {
      const updated = await this.prisma.webhookConfiguration.update({
        where: { id: webhookId },
        data: {
          ...updateData,
          updatedAt: new Date(),
        },
      });

      this.logger.log(`Updated webhook configuration: ${webhookId}`);

      return {
        success: true,
        message: 'Webhook configuration updated successfully',
        webhookId,
        updatedAt: updated.updatedAt,
      };
    } catch (error) {
      this.logger.error(
        `Failed to update webhook ${webhookId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Delete webhook configuration (soft delete)
   *
   * @param webhookId - Webhook configuration ID
   * @returns Deletion result
   */
  async deleteWebhook(webhookId: string) {
    try {
      await this.prisma.webhookConfiguration.update({
        where: { id: webhookId },
        data: {
          isActive: false,
          deletedAt: new Date(),
        },
      });

      this.logger.log(`Soft deleted webhook configuration: ${webhookId}`);

      return {
        success: true,
        message: 'Webhook deleted successfully',
        webhookId,
        deletedAt: new Date(),
      };
    } catch (error) {
      this.logger.error(
        `Failed to delete webhook ${webhookId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Build webhook URL for provider
   *
   * @private
   * @param provider - Provider name
   * @param clientId - Client identifier
   * @param companyId - Company identifier
   * @returns Complete webhook URL
   */
  private buildWebhookUrl(
    provider: string,
    clientId: string,
    companyId: string,
  ): string {
    const baseUrl =
      process.env.WEBHOOK_BASE_URL || 'https://api.restaurant-platform.com';
    return `${baseUrl}/api/v1/integrations/webhooks/${provider}/${companyId}/${clientId}`;
  }

  /**
   * Generate secure secret key for webhook signing
   *
   * @private
   * @returns Base64 encoded secret key
   */
  private generateSecretKey(): string {
    return crypto.randomBytes(32).toString('base64');
  }

  /**
   * Hash secret key for storage
   *
   * @private
   * @param secretKey - Plain secret key
   * @returns Hashed secret key
   */
  private hashSecretKey(secretKey: string): string {
    return crypto.createHash('sha256').update(secretKey).digest('hex');
  }
}
