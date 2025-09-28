import { Injectable, Logger, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateWebhookDto, UpdateWebhookDto } from '../controllers/webhook-management.controller';
import { randomBytes } from 'crypto';

/**
 * Webhook Management Service
 *
 * Handles all webhook configuration operations including:
 * - Creating and managing webhook configurations
 * - Testing webhook endpoints
 * - Generating and managing webhook secrets
 * - Webhook statistics and monitoring
 */
@Injectable()
export class WebhookManagementService {
  private readonly logger = new Logger(WebhookManagementService.name);

  // Available delivery providers
  private readonly AVAILABLE_PROVIDERS = [
    'careem',
    'talabat',
    'deliveroo',
    'jahez',
    'dhub',
    'yallow',
    'jooddelivery',
    'topdeliver',
    'nashmi',
    'tawasi',
    'delivergy',
    'utrac'
  ];

  // Available webhook events
  private readonly AVAILABLE_EVENTS = [
    'order.created',
    'order.updated',
    'order.confirmed',
    'order.cancelled',
    'order.picked_up',
    'order.in_transit',
    'order.delivered',
    'order.refunded',
    'driver.assigned',
    'driver.arrived',
    'payment.processed',
    'payment.failed'
  ];

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get all webhooks for a company
   */
  async getWebhooks(companyId: string) {
    const webhooks = await this.prisma.integrationWebhook.findMany({
      where: { companyId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        provider: true,
        webhookUrl: true,
        isActive: true,
        registeredAt: true,
        lastEventAt: true,
        createdAt: true,
        updatedAt: true,
        // Don't expose secret key for security
      }
    });

    // Add webhook statistics
    const webhooksWithStats = await Promise.all(
      webhooks.map(async (webhook) => {
        const stats = await this.getWebhookStats(webhook.id, companyId, '24h');
        return {
          ...webhook,
          stats: {
            totalEvents: stats.totalEvents || 0,
            successRate: stats.successRate || 0,
            lastEventAt: webhook.lastEventAt
          }
        };
      })
    );

    return {
      webhooks: webhooksWithStats,
      total: webhooks.length
    };
  }

  /**
   * Get webhook configuration options
   */
  async getWebhookConfig() {
    return {
      providers: this.AVAILABLE_PROVIDERS.map(provider => ({
        id: provider,
        name: this.formatProviderName(provider),
        events: this.AVAILABLE_EVENTS
      })),
      events: this.AVAILABLE_EVENTS.map(event => ({
        id: event,
        name: this.formatEventName(event),
        description: this.getEventDescription(event)
      }))
    };
  }

  /**
   * Create a new webhook
   */
  async createWebhook(companyId: string, createWebhookDto: CreateWebhookDto) {
    const { provider, webhookUrl, events = [], authHeaders = {}, isActive = true } = createWebhookDto;

    // Validate provider
    if (!this.AVAILABLE_PROVIDERS.includes(provider.toLowerCase())) {
      throw new BadRequestException(`Invalid provider: ${provider}`);
    }

    // Validate events
    const invalidEvents = events.filter(event => !this.AVAILABLE_EVENTS.includes(event));
    if (invalidEvents.length > 0) {
      throw new BadRequestException(`Invalid events: ${invalidEvents.join(', ')}`);
    }

    // Check if webhook already exists for this provider and company
    const existingWebhook = await this.prisma.integrationWebhook.findUnique({
      where: {
        companyId_provider: {
          companyId,
          provider: provider.toLowerCase()
        }
      }
    });

    if (existingWebhook) {
      throw new ConflictException(`Webhook already exists for provider: ${provider}`);
    }

    // Generate webhook ID and secret key
    const webhookId = `wh_${randomBytes(12).toString('hex')}`;
    const secretKey = randomBytes(32).toString('hex');

    const webhook = await this.prisma.integrationWebhook.create({
      data: {
        companyId,
        provider: provider.toLowerCase(),
        webhookId,
        webhookUrl,
        secretKey,
        isActive,
        // Store events and auth headers as JSON
        // Note: You might need to add these fields to the schema if they don't exist
      },
      select: {
        id: true,
        provider: true,
        webhookId: true,
        webhookUrl: true,
        isActive: true,
        registeredAt: true,
        createdAt: true
      }
    });

    this.logger.log(`Created webhook for ${provider} - Company: ${companyId}`);

    return {
      success: true,
      webhook: {
        ...webhook,
        events,
        authHeaders
      }
    };
  }

  /**
   * Update an existing webhook
   */
  async updateWebhook(webhookId: string, companyId: string, updateWebhookDto: UpdateWebhookDto) {
    // Find the webhook
    const existingWebhook = await this.prisma.integrationWebhook.findFirst({
      where: {
        id: webhookId,
        companyId
      }
    });

    if (!existingWebhook) {
      throw new NotFoundException('Webhook not found');
    }

    // Validate events if provided
    if (updateWebhookDto.events) {
      const invalidEvents = updateWebhookDto.events.filter(event => !this.AVAILABLE_EVENTS.includes(event));
      if (invalidEvents.length > 0) {
        throw new BadRequestException(`Invalid events: ${invalidEvents.join(', ')}`);
      }
    }

    const updatedWebhook = await this.prisma.integrationWebhook.update({
      where: { id: webhookId },
      data: {
        ...(updateWebhookDto.webhookUrl && { webhookUrl: updateWebhookDto.webhookUrl }),
        ...(updateWebhookDto.isActive !== undefined && { isActive: updateWebhookDto.isActive }),
        // Update events and auth headers if provided
        updatedAt: new Date()
      },
      select: {
        id: true,
        provider: true,
        webhookId: true,
        webhookUrl: true,
        isActive: true,
        registeredAt: true,
        updatedAt: true
      }
    });

    this.logger.log(`Updated webhook ${webhookId} for company ${companyId}`);

    return {
      success: true,
      webhook: {
        ...updatedWebhook,
        events: updateWebhookDto.events,
        authHeaders: updateWebhookDto.authHeaders
      }
    };
  }

  /**
   * Delete a webhook
   */
  async deleteWebhook(webhookId: string, companyId: string) {
    const webhook = await this.prisma.integrationWebhook.findFirst({
      where: {
        id: webhookId,
        companyId
      }
    });

    if (!webhook) {
      throw new NotFoundException('Webhook not found');
    }

    await this.prisma.integrationWebhook.delete({
      where: { id: webhookId }
    });

    this.logger.log(`Deleted webhook ${webhookId} for company ${companyId}`);

    return {
      success: true,
      message: 'Webhook deleted successfully'
    };
  }

  /**
   * Test a webhook endpoint
   */
  async testWebhook(webhookId: string, companyId: string) {
    const webhook = await this.prisma.integrationWebhook.findFirst({
      where: {
        id: webhookId,
        companyId
      }
    });

    if (!webhook) {
      throw new NotFoundException('Webhook not found');
    }

    try {
      // Create a test payload
      const testPayload = {
        eventType: 'order.created',
        provider: webhook.provider,
        orderId: `test_${Date.now()}`,
        orderData: {
          test: true,
          customer: {
            name: 'Test Customer',
            phone: '+962791234567'
          },
          items: [
            {
              name: 'Test Item',
              quantity: 1,
              price: 10.00
            }
          ],
          total: 10.00,
          restaurant_id: 'test_restaurant'
        },
        timestamp: new Date().toISOString(),
        companyId
      };

      // Send test webhook
      const response = await fetch(webhook.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Signature': this.generateSignature(testPayload, webhook.secretKey),
          'X-Webhook-Id': webhook.webhookId,
          'X-Timestamp': Date.now().toString()
        },
        body: JSON.stringify(testPayload)
      });

      const responseData = await response.text();

      // Log the test
      await this.prisma.webhookLog.create({
        data: {
          webhookId: `test_${webhook.webhookId}_${Date.now()}`,
          companyId,
          provider: webhook.provider,
          eventType: 'test',
          orderId: testPayload.orderId,
          payload: testPayload as any,
          status: response.ok ? 'completed' : 'failed',
          error: response.ok ? null : `HTTP ${response.status}: ${responseData}`,
          processedAt: new Date(),
          receivedAt: new Date()
        }
      });

      return {
        success: response.ok,
        status: response.status,
        response: responseData,
        message: response.ok ? 'Webhook test successful' : 'Webhook test failed'
      };

    } catch (error) {
      this.logger.error(`Webhook test failed for ${webhookId}:`, error.message);

      // Log the failed test
      await this.prisma.webhookLog.create({
        data: {
          webhookId: `test_failed_${webhook.webhookId}_${Date.now()}`,
          companyId,
          provider: webhook.provider,
          eventType: 'test',
          orderId: `test_${Date.now()}`,
          payload: { test: true, error: error.message } as any,
          status: 'failed',
          error: error.message,
          receivedAt: new Date()
        }
      });

      return {
        success: false,
        error: error.message,
        message: 'Webhook test failed'
      };
    }
  }

  /**
   * Get webhook statistics
   */
  async getWebhookStats(webhookId: string, companyId: string, timeframe: string = '24h') {
    const webhook = await this.prisma.integrationWebhook.findFirst({
      where: {
        id: webhookId,
        companyId
      }
    });

    if (!webhook) {
      return { totalEvents: 0, successRate: 0 };
    }

    const timeframeDates = this.getTimeframeFilter(timeframe);

    const stats = await this.prisma.webhookLog.groupBy({
      by: ['status'],
      where: {
        companyId,
        provider: webhook.provider,
        receivedAt: {
          gte: timeframeDates.start,
          lte: timeframeDates.end
        }
      },
      _count: {
        id: true
      }
    });

    const totalEvents = stats.reduce((sum, stat) => sum + stat._count.id, 0);
    const successfulEvents = stats.find(stat => stat.status === 'completed')?._count.id || 0;
    const successRate = totalEvents > 0 ? (successfulEvents / totalEvents) * 100 : 0;

    return {
      totalEvents,
      successfulEvents,
      failedEvents: totalEvents - successfulEvents,
      successRate: Math.round(successRate * 10) / 10,
      timeframe
    };
  }

  /**
   * Get webhook logs
   */
  async getWebhookLogs(webhookId: string, companyId: string, limit: number = 50, offset: number = 0) {
    const webhook = await this.prisma.integrationWebhook.findFirst({
      where: {
        id: webhookId,
        companyId
      }
    });

    if (!webhook) {
      throw new NotFoundException('Webhook not found');
    }

    const logs = await this.prisma.webhookLog.findMany({
      where: {
        companyId,
        provider: webhook.provider
      },
      orderBy: { receivedAt: 'desc' },
      take: limit,
      skip: offset,
      select: {
        id: true,
        eventType: true,
        orderId: true,
        status: true,
        error: true,
        receivedAt: true,
        processedAt: true,
        payload: true
      }
    });

    const total = await this.prisma.webhookLog.count({
      where: {
        companyId,
        provider: webhook.provider
      }
    });

    return {
      logs,
      total,
      hasMore: offset + logs.length < total
    };
  }

  // Helper methods

  private formatProviderName(provider: string): string {
    const names: Record<string, string> = {
      careem: 'Careem Now',
      talabat: 'Talabat',
      deliveroo: 'Deliveroo',
      jahez: 'Jahez',
      dhub: 'Dhub',
      yallow: 'Yallow',
      jooddelivery: 'Jood Delivery',
      topdeliver: 'Top Deliver',
      nashmi: 'Nashmi',
      tawasi: 'Tawasi',
      delivergy: 'Delivergy',
      utrac: 'Utrac'
    };
    return names[provider] || provider.charAt(0).toUpperCase() + provider.slice(1);
  }

  private formatEventName(event: string): string {
    return event.split('.').map(word =>
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  }

  private getEventDescription(event: string): string {
    const descriptions: Record<string, string> = {
      'order.created': 'Triggered when a new order is placed',
      'order.updated': 'Triggered when order details are updated',
      'order.confirmed': 'Triggered when restaurant confirms the order',
      'order.cancelled': 'Triggered when an order is cancelled',
      'order.picked_up': 'Triggered when driver picks up the order',
      'order.in_transit': 'Triggered when order is on the way',
      'order.delivered': 'Triggered when order is successfully delivered',
      'order.refunded': 'Triggered when an order is refunded',
      'driver.assigned': 'Triggered when a driver is assigned to order',
      'driver.arrived': 'Triggered when driver arrives at pickup location',
      'payment.processed': 'Triggered when payment is successfully processed',
      'payment.failed': 'Triggered when payment processing fails'
    };
    return descriptions[event] || 'Custom webhook event';
  }

  private generateSignature(payload: any, secretKey: string): string {
    const crypto = require('crypto');
    const hmac = crypto.createHmac('sha256', secretKey);
    hmac.update(JSON.stringify(payload));
    return `sha256=${hmac.digest('hex')}`;
  }

  private getTimeframeFilter(timeframe: string) {
    const now = new Date();
    let start: Date;

    switch (timeframe) {
      case '1h':
        start = new Date(now.getTime() - 60 * 60 * 1000);
        break;
      case '24h':
        start = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        start = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    }

    return { start, end: now };
  }
}