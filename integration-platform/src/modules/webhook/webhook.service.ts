import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../shared/services/prisma.service';
import { RegisterWebhookDto } from './dto/register-webhook.dto';
import { WebhookRetryService } from './webhook-retry.service';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class WebhookService {
  private readonly logger = new Logger(WebhookService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly retryService: WebhookRetryService,
  ) {}

  async registerWebhook(dto: RegisterWebhookDto) {
    const webhookId = uuidv4();
    const secretKey = this.generateSecretKey();

    // Store webhook registration in database
    const webhook = {
      id: webhookId,
      clientId: dto.clientId,
      provider: dto.provider,
      url: dto.url,
      events: dto.events,
      secretKey,
      isActive: true,
      createdAt: new Date(),
    };

    // In a real implementation, save to database
    // await this.prisma.webhook.create({ data: webhook });

    this.logger.log(`Registered webhook for ${dto.provider} - ${dto.clientId}`);

    return {
      webhookId,
      url: this.buildWebhookUrl(dto.provider, dto.clientId),
      secretKey,
      status: 'active',
    };
  }

  async getWebhookLogs(filters: {
    provider?: string;
    clientId?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
    limit: number;
    offset: number;
  }) {
    // In a real implementation, fetch from database
    const logs = this.getMockWebhookLogs(filters);

    return {
      logs,
      total: logs.length,
      limit: filters.limit,
      offset: filters.offset,
    };
  }

  async getWebhookStats(params: {
    provider?: string;
    clientId?: string;
    period: string;
  }) {
    const stats = {
      total: 1523,
      successful: 1456,
      failed: 67,
      pending: 12,
      avgResponseTime: 145, // ms
      providers: {
        careem: { total: 423, successful: 410, failed: 13 },
        talabat: { total: 567, successful: 550, failed: 17 },
        deliveroo: { total: 289, successful: 280, failed: 9 },
        jahez: { total: 244, successful: 216, failed: 28 },
      },
      recentEvents: [
        {
          provider: 'careem',
          event: 'order.created',
          timestamp: new Date().toISOString(),
          status: 'success',
        },
        {
          provider: 'talabat',
          event: 'order.updated',
          timestamp: new Date().toISOString(),
          status: 'success',
        },
      ],
      period: params.period,
    };

    if (params.provider) {
      return stats.providers[params.provider] || {};
    }

    return stats;
  }

  async retryWebhook(logId: string) {
    try {
      await this.retryService.retryWebhook(logId);
      return {
        success: true,
        message: 'Webhook retry initiated',
        logId,
      };
    } catch (error) {
      return {
        success: false,
        message: 'Retry failed',
        error: error.message,
      };
    }
  }

  async getWebhookConfig(clientId: string) {
    // In a real implementation, fetch from database
    return {
      clientId,
      webhooks: [
        {
          provider: 'careem',
          url: this.buildWebhookUrl('careem', clientId),
          events: ['order.created', 'order.updated', 'order.cancelled'],
          isActive: true,
        },
        {
          provider: 'talabat',
          url: this.buildWebhookUrl('talabat', clientId),
          events: ['order_notification', 'status_update'],
          isActive: true,
        },
        {
          provider: 'deliveroo',
          url: this.buildWebhookUrl('deliveroo', clientId),
          events: ['order_event'],
          isActive: true,
        },
        {
          provider: 'jahez',
          url: this.buildWebhookUrl('jahez', clientId),
          events: ['order_action'],
          isActive: false,
        },
      ],
      retryPolicy: {
        maxRetries: 3,
        retryDelays: [1000, 5000, 10000], // ms
        exponentialBackoff: true,
      },
      security: {
        signatureValidation: true,
        ipWhitelist: [],
        rateLimiting: {
          enabled: true,
          maxRequests: 1000,
          windowMs: 60000, // 1 minute
        },
      },
    };
  }

  async updateWebhookConfig(clientId: string, config: any) {
    // In a real implementation, update in database
    this.logger.log(`Updated webhook config for client ${clientId}`);

    return {
      success: true,
      message: 'Configuration updated successfully',
      clientId,
      updatedAt: new Date().toISOString(),
    };
  }

  async deleteWebhook(webhookId: string) {
    // In a real implementation, soft delete from database
    this.logger.log(`Deleted webhook ${webhookId}`);

    return {
      success: true,
      message: 'Webhook deleted successfully',
      webhookId,
      deletedAt: new Date().toISOString(),
    };
  }

  private buildWebhookUrl(provider: string, clientId: string): string {
    const baseUrl = process.env.WEBHOOK_BASE_URL || 'https://api.nexara.io';
    return `${baseUrl}/webhooks/${provider}/${clientId}`;
  }

  private generateSecretKey(): string {
    return Buffer.from(uuidv4()).toString('base64');
  }

  private getMockWebhookLogs(filters: any) {
    const providers = ['careem', 'talabat', 'deliveroo', 'jahez'];
    const statuses = ['success', 'failed', 'pending'];
    const events = [
      'order.created',
      'order.updated',
      'order.cancelled',
      'order.delivered',
    ];

    const logs = [];
    const count = Math.min(filters.limit, 20);

    for (let i = 0; i < count; i++) {
      const provider = filters.provider || providers[i % providers.length];
      const status = filters.status || statuses[i % statuses.length];

      logs.push({
        id: uuidv4(),
        provider,
        clientId: filters.clientId || `client-${i + 1}`,
        event: events[i % events.length],
        status,
        responseTime: Math.floor(Math.random() * 500),
        timestamp: new Date(Date.now() - i * 3600000).toISOString(),
        payload: {
          orderId: `ORD-${1000 + i}`,
          amount: Math.floor(Math.random() * 100) + 20,
        },
        response: status === 'success'
          ? { status: 'received' }
          : { error: 'Connection timeout' },
      });
    }

    return logs;
  }
}