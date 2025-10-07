import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import axios, { AxiosError } from 'axios';

export interface WebhookRetryPayload {
  id: string;
  url: string;
  method: 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  headers: Record<string, string>;
  body: any;
  companyId: string;
  originalEventId?: string;
  metadata?: Record<string, any>;
}

export interface RetryQueueItem {
  id: string;
  payload: WebhookRetryPayload;
  attemptCount: number;
  nextRetryAt: Date;
  createdAt: Date;
  lastError?: string;
  priority: 'low' | 'medium' | 'high';
}

export interface WebhookRetryConfig {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
  exponentialMultiplier: number;
  jitterMs: number;
  deadLetterQueueEnabled: boolean;
}

/**
 * Webhook Retry Service
 *
 * @description Manages webhook retry logic with exponential backoff and dead letter queue
 * Refactored from integration-platform with enhanced persistence and monitoring
 *
 * @responsibilities
 * - Queue failed webhooks for retry
 * - Implement exponential backoff strategy
 * - Manage dead letter queue for permanently failed webhooks
 * - Persist retry state to database for durability
 * - Provide retry statistics and monitoring
 *
 * @features
 * - Configurable retry policy
 * - Priority-based queue processing
 * - Automatic dead letter queue management
 * - Database persistence for retry state
 * - Comprehensive logging and monitoring
 *
 * @example
 * ```typescript
 * await retryService.queueForRetry(
 *   {
 *     id: 'webhook-123',
 *     url: 'https://api.provider.com/webhook',
 *     method: 'POST',
 *     headers: { 'Content-Type': 'application/json' },
 *     body: { event: 'order.created' },
 *     companyId: 'company-456'
 *   },
 *   'Connection timeout',
 *   'high'
 * );
 * ```
 */
@Injectable()
export class WebhookRetryService implements OnModuleInit {
  private readonly logger = new Logger(WebhookRetryService.name);
  private readonly retryQueue = new Map<string, RetryQueueItem>();
  private readonly deadLetterQueue = new Map<string, RetryQueueItem>();
  private readonly processingQueue = new Set<string>();

  private readonly defaultConfig: WebhookRetryConfig = {
    maxRetries: 3,
    baseDelayMs: 1000, // 1 second
    maxDelayMs: 300000, // 5 minutes
    exponentialMultiplier: 2,
    jitterMs: 500,
    deadLetterQueueEnabled: true,
  };

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    this.logger.log('Webhook Retry Service initialized');
    await this.loadPersistedRetries();
  }

  /**
   * Queue a webhook for retry with exponential backoff
   *
   * @param payload - Webhook retry payload
   * @param error - Error message
   * @param priority - Queue priority
   * @param config - Optional retry configuration
   */
  async queueForRetry(
    payload: WebhookRetryPayload,
    error?: string,
    priority: 'low' | 'medium' | 'high' = 'medium',
    config?: Partial<WebhookRetryConfig>,
  ): Promise<void> {
    try {
      const retryConfig = { ...this.defaultConfig, ...config };
      const existingItem = this.retryQueue.get(payload.id);
      const attemptCount = existingItem ? existingItem.attemptCount + 1 : 1;

      // Check if max retries exceeded
      if (attemptCount > retryConfig.maxRetries) {
        await this.moveToDeadLetterQueue(payload, error, attemptCount);
        return;
      }

      const nextRetryAt = this.calculateNextRetryTime(attemptCount, retryConfig);

      const retryItem: RetryQueueItem = {
        id: payload.id,
        payload,
        attemptCount,
        nextRetryAt,
        createdAt: existingItem?.createdAt || new Date(),
        lastError: error,
        priority,
      };

      this.retryQueue.set(payload.id, retryItem);
      await this.persistRetryItem(retryItem);

      this.logger.debug(
        `Queued webhook ${payload.id} for retry ${attemptCount}/${retryConfig.maxRetries} at ${nextRetryAt.toISOString()}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to queue webhook ${payload.id} for retry: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Retry a specific webhook immediately
   *
   * @param webhookId - Webhook ID to retry
   * @returns Success status
   */
  async retryWebhook(webhookId: string): Promise<boolean> {
    const retryItem = this.retryQueue.get(webhookId);
    if (!retryItem) {
      this.logger.warn(`Webhook ${webhookId} not found in retry queue`);
      return false;
    }

    if (this.processingQueue.has(webhookId)) {
      this.logger.debug(`Webhook ${webhookId} is already being processed`);
      return false;
    }

    return await this.executeWebhookRetry(retryItem);
  }

  /**
   * Process the retry queue on scheduled intervals
   */
  @Cron(CronExpression.EVERY_30_SECONDS)
  async processRetryQueue(): Promise<void> {
    const now = new Date();
    const readyItems = Array.from(this.retryQueue.values())
      .filter(
        (item) =>
          item.nextRetryAt <= now && !this.processingQueue.has(item.id),
      )
      .sort((a, b) => {
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
        if (priorityDiff !== 0) return priorityDiff;
        return a.nextRetryAt.getTime() - b.nextRetryAt.getTime();
      });

    if (readyItems.length === 0) {
      return;
    }

    this.logger.debug(`Processing ${readyItems.length} webhooks from retry queue`);

    // Process items in parallel with concurrency limit
    const concurrencyLimit = 5;
    const batches = this.chunkArray(readyItems, concurrencyLimit);

    for (const batch of batches) {
      await Promise.allSettled(
        batch.map((item) => this.executeWebhookRetry(item)),
      );
    }
  }

  /**
   * Clean up old entries from dead letter queue
   */
  @Cron(CronExpression.EVERY_HOUR)
  async cleanupDeadLetterQueue(): Promise<void> {
    const cutoffDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // 7 days

    let cleanedCount = 0;
    for (const [id, item] of this.deadLetterQueue.entries()) {
      if (item.createdAt < cutoffDate) {
        this.deadLetterQueue.delete(id);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      this.logger.log(
        `Cleaned up ${cleanedCount} old entries from dead letter queue`,
      );
    }

    await this.cleanupPersistedRetries(cutoffDate);
  }

  /**
   * Get retry queue statistics
   */
  getRetryStats() {
    return {
      totalQueued: this.retryQueue.size,
      totalRetrying: this.processingQueue.size,
      totalDeadLettered: this.deadLetterQueue.size,
    };
  }

  /**
   * Get items from retry queue with optional filtering
   */
  getRetryQueueItems(companyId?: string, priority?: string): RetryQueueItem[] {
    let items = Array.from(this.retryQueue.values());

    if (companyId) {
      items = items.filter((item) => item.payload.companyId === companyId);
    }

    if (priority) {
      items = items.filter((item) => item.priority === priority);
    }

    return items.sort(
      (a, b) => a.nextRetryAt.getTime() - b.nextRetryAt.getTime(),
    );
  }

  /**
   * Remove a webhook from retry queue
   */
  async removeFromQueue(webhookId: string): Promise<boolean> {
    const removed = this.retryQueue.delete(webhookId);
    if (removed) {
      await this.removePersistedRetry(webhookId);
      this.logger.debug(`Removed webhook ${webhookId} from retry queue`);
    }
    return removed;
  }

  /**
   * Execute webhook retry attempt
   * @private
   */
  private async executeWebhookRetry(retryItem: RetryQueueItem): Promise<boolean> {
    const { id, payload, attemptCount } = retryItem;
    this.processingQueue.add(id);

    try {
      this.logger.debug(
        `Attempting webhook retry ${attemptCount} for ${id}`,
      );

      const response = await axios({
        method: payload.method,
        url: payload.url,
        headers: payload.headers,
        data: payload.body,
        timeout: 30000,
        validateStatus: (status) => status >= 200 && status < 300,
      });

      // Success - remove from retry queue
      await this.removeFromQueue(id);

      this.logger.log(
        `Webhook retry successful for ${id} after ${attemptCount} attempts`,
      );

      return true;
    } catch (error) {
      const errorMessage = this.extractErrorMessage(error);

      this.logger.warn(
        `Webhook retry failed for ${id} (attempt ${attemptCount}): ${errorMessage}`,
      );

      // Queue for next retry or move to dead letter queue
      await this.queueForRetry(payload, errorMessage, retryItem.priority);

      return false;
    } finally {
      this.processingQueue.delete(id);
    }
  }

  /**
   * Calculate next retry time with exponential backoff
   * @private
   */
  private calculateNextRetryTime(
    attemptCount: number,
    config: WebhookRetryConfig,
  ): Date {
    const exponentialDelay =
      config.baseDelayMs * Math.pow(config.exponentialMultiplier, attemptCount - 1);
    const jitter = Math.random() * config.jitterMs;
    const totalDelay = Math.min(exponentialDelay + jitter, config.maxDelayMs);

    return new Date(Date.now() + totalDelay);
  }

  /**
   * Move failed webhook to dead letter queue
   * @private
   */
  private async moveToDeadLetterQueue(
    payload: WebhookRetryPayload,
    error?: string,
    attemptCount?: number,
  ): Promise<void> {
    if (!this.defaultConfig.deadLetterQueueEnabled) {
      this.logger.debug(`Dead letter queue disabled, dropping webhook ${payload.id}`);
      return;
    }

    const deadLetterItem: RetryQueueItem = {
      id: payload.id,
      payload,
      attemptCount: attemptCount || this.defaultConfig.maxRetries,
      nextRetryAt: new Date(),
      createdAt: new Date(),
      lastError: error,
      priority: 'low',
    };

    this.deadLetterQueue.set(payload.id, deadLetterItem);
    this.retryQueue.delete(payload.id);
    await this.removePersistedRetry(payload.id);

    this.logger.error(
      `Webhook ${payload.id} moved to dead letter queue after ${attemptCount} attempts`,
    );
  }

  /**
   * Persist retry item to database
   * @private
   */
  private async persistRetryItem(retryItem: RetryQueueItem): Promise<void> {
    try {
      await this.prisma.webhookRetryQueue.upsert({
        where: { id: retryItem.id },
        update: {
          payload: retryItem.payload as any,
          attemptCount: retryItem.attemptCount,
          nextRetryAt: retryItem.nextRetryAt,
          lastError: retryItem.lastError,
          priority: retryItem.priority,
          updatedAt: new Date(),
        },
        create: {
          id: retryItem.id,
          payload: retryItem.payload as any,
          attemptCount: retryItem.attemptCount,
          nextRetryAt: retryItem.nextRetryAt,
          createdAt: retryItem.createdAt,
          lastError: retryItem.lastError,
          priority: retryItem.priority,
        },
      });
    } catch (error) {
      this.logger.error(
        `Failed to persist retry item ${retryItem.id}: ${error.message}`,
      );
    }
  }

  /**
   * Load persisted retry items from database
   * @private
   */
  private async loadPersistedRetries(): Promise<void> {
    try {
      const persistedItems = await this.prisma.webhookRetryQueue.findMany({
        where: {
          nextRetryAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
          },
        },
      });

      for (const item of persistedItems) {
        const retryItem: RetryQueueItem = {
          id: item.id,
          payload: item.payload as WebhookRetryPayload,
          attemptCount: item.attemptCount,
          nextRetryAt: item.nextRetryAt,
          createdAt: item.createdAt,
          lastError: item.lastError,
          priority: item.priority as 'low' | 'medium' | 'high',
        };

        this.retryQueue.set(item.id, retryItem);
      }

      this.logger.log(`Loaded ${persistedItems.length} persisted retry items`);
    } catch (error) {
      this.logger.error(
        `Failed to load persisted retries: ${error.message}`,
      );
    }
  }

  /**
   * Remove persisted retry from database
   * @private
   */
  private async removePersistedRetry(webhookId: string): Promise<void> {
    try {
      await this.prisma.webhookRetryQueue.delete({
        where: { id: webhookId },
      });
    } catch (error) {
      if (!error.code || error.code !== 'P2025') {
        this.logger.error(
          `Failed to remove persisted retry ${webhookId}: ${error.message}`,
        );
      }
    }
  }

  /**
   * Clean up old persisted retries
   * @private
   */
  private async cleanupPersistedRetries(cutoffDate: Date): Promise<void> {
    try {
      const result = await this.prisma.webhookRetryQueue.deleteMany({
        where: {
          createdAt: {
            lt: cutoffDate,
          },
        },
      });

      if (result.count > 0) {
        this.logger.log(`Cleaned up ${result.count} persisted retry records`);
      }
    } catch (error) {
      this.logger.error(
        `Failed to cleanup persisted retries: ${error.message}`,
      );
    }
  }

  /**
   * Extract error message from various error types
   * @private
   */
  private extractErrorMessage(error: any): string {
    if (error instanceof AxiosError) {
      return `HTTP ${error.response?.status || 'unknown'}: ${
        error.response?.statusText || error.message
      }`;
    }

    if (error instanceof Error) {
      return error.message;
    }

    return String(error);
  }

  /**
   * Split array into chunks
   * @private
   */
  private chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }
}
