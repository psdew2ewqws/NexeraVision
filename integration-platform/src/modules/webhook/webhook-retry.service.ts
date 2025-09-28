import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../shared/services/prisma.service';
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

export interface WebhookRetryStats {
  totalQueued: number;
  totalRetrying: number;
  totalSuccessful: number;
  totalFailed: number;
  totalDeadLettered: number;
  averageRetryDelay: number;
}

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

  private stats: WebhookRetryStats = {
    totalQueued: 0,
    totalRetrying: 0,
    totalSuccessful: 0,
    totalFailed: 0,
    totalDeadLettered: 0,
    averageRetryDelay: 0,
  };

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    this.logger.log('Webhook Retry Service initialized');
    await this.loadPersistedRetries();
  }

  /**
   * Queue a webhook for retry with exponential backoff
   */
  async queueForRetry(
    payload: WebhookRetryPayload,
    error?: string,
    priority: 'low' | 'medium' | 'high' = 'medium',
    config?: Partial<WebhookRetryConfig>
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
      this.stats.totalQueued++;

      // Persist to database for durability
      await this.persistRetryItem(retryItem);

      this.logger.debug(
        `Queued webhook ${payload.id} for retry ${attemptCount}/${retryConfig.maxRetries} at ${nextRetryAt.toISOString()}`,
        {
          webhookId: payload.id,
          attemptCount,
          nextRetryAt: nextRetryAt.toISOString(),
          priority,
          companyId: payload.companyId,
        }
      );
    } catch (error) {
      this.logger.error(
        `Failed to queue webhook ${payload.id} for retry: ${error.message}`,
        error.stack
      );
      throw error;
    }
  }

  /**
   * Retry a specific webhook immediately
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
      .filter(item => item.nextRetryAt <= now && !this.processingQueue.has(item.id))
      .sort((a, b) => {
        // Sort by priority and then by nextRetryAt
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
        if (priorityDiff !== 0) return priorityDiff;
        return a.nextRetryAt.getTime() - b.nextRetryAt.getTime();
      });

    if (readyItems.length === 0) {
      return;
    }

    this.logger.debug(`Processing ${readyItems.length} webhooks from retry queue`);
    this.stats.totalRetrying = readyItems.length;

    // Process items in parallel with concurrency limit
    const concurrencyLimit = 5;
    const batches = this.chunkArray(readyItems, concurrencyLimit);

    for (const batch of batches) {
      await Promise.allSettled(
        batch.map(item => this.executeWebhookRetry(item))
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
      this.logger.log(`Cleaned up ${cleanedCount} old entries from dead letter queue`);
    }

    // Also clean up database entries
    await this.cleanupPersistedRetries(cutoffDate);
  }

  /**
   * Get retry queue statistics
   */
  getRetryStats(): WebhookRetryStats {
    return {
      ...this.stats,
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
      items = items.filter(item => item.payload.companyId === companyId);
    }

    if (priority) {
      items = items.filter(item => item.priority === priority);
    }

    return items.sort((a, b) => a.nextRetryAt.getTime() - b.nextRetryAt.getTime());
  }

  /**
   * Get items from dead letter queue
   */
  getDeadLetterQueueItems(companyId?: string): RetryQueueItem[] {
    let items = Array.from(this.deadLetterQueue.values());

    if (companyId) {
      items = items.filter(item => item.payload.companyId === companyId);
    }

    return items.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
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
   * Clear all retry queues (for testing/admin purposes)
   */
  async clearAllQueues(): Promise<void> {
    const retryCount = this.retryQueue.size;
    const deadLetterCount = this.deadLetterQueue.size;

    this.retryQueue.clear();
    this.deadLetterQueue.clear();
    this.processingQueue.clear();

    await this.clearPersistedRetries();

    this.logger.warn(
      `Cleared all retry queues: ${retryCount} retry items, ${deadLetterCount} dead letter items`
    );
  }

  private async executeWebhookRetry(retryItem: RetryQueueItem): Promise<boolean> {
    const { id, payload, attemptCount } = retryItem;

    this.processingQueue.add(id);

    try {
      this.logger.debug(
        `Attempting webhook retry ${attemptCount} for ${id}`,
        {
          webhookId: id,
          attemptCount,
          url: payload.url,
          method: payload.method,
          companyId: payload.companyId,
        }
      );

      const response = await axios({
        method: payload.method,
        url: payload.url,
        headers: payload.headers,
        data: payload.body,
        timeout: 30000, // 30 seconds
        validateStatus: (status) => status >= 200 && status < 300,
      });

      // Success - remove from retry queue
      await this.removeFromQueue(id);
      this.stats.totalSuccessful++;

      this.logger.log(
        `Webhook retry successful for ${id} after ${attemptCount} attempts`,
        {
          webhookId: id,
          attemptCount,
          responseStatus: response.status,
          companyId: payload.companyId,
        }
      );

      return true;
    } catch (error) {
      const errorMessage = this.extractErrorMessage(error);
      this.stats.totalFailed++;

      this.logger.warn(
        `Webhook retry failed for ${id} (attempt ${attemptCount}): ${errorMessage}`,
        {
          webhookId: id,
          attemptCount,
          error: errorMessage,
          companyId: payload.companyId,
        }
      );

      // Queue for next retry or move to dead letter queue
      await this.queueForRetry(payload, errorMessage, retryItem.priority);

      return false;
    } finally {
      this.processingQueue.delete(id);
    }
  }

  private calculateNextRetryTime(
    attemptCount: number,
    config: WebhookRetryConfig
  ): Date {
    // Exponential backoff: baseDelay * (multiplier ^ (attempt - 1))
    const exponentialDelay = config.baseDelayMs *
      Math.pow(config.exponentialMultiplier, attemptCount - 1);

    // Apply jitter to prevent thundering herd
    const jitter = Math.random() * config.jitterMs;

    // Cap at max delay
    const totalDelay = Math.min(exponentialDelay + jitter, config.maxDelayMs);

    return new Date(Date.now() + totalDelay);
  }

  private async moveToDeadLetterQueue(
    payload: WebhookRetryPayload,
    error?: string,
    attemptCount?: number
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
    this.stats.totalDeadLettered++;

    await this.removePersistedRetry(payload.id);

    this.logger.error(
      `Webhook ${payload.id} moved to dead letter queue after ${attemptCount} attempts`,
      {
        webhookId: payload.id,
        attemptCount,
        lastError: error,
        companyId: payload.companyId,
      }
    );
  }

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
        error.stack
      );
    }
  }

  private async loadPersistedRetries(): Promise<void> {
    try {
      const persistedItems = await this.prisma.webhookRetryQueue.findMany({
        where: {
          nextRetryAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
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
        error.stack
      );
    }
  }

  private async removePersistedRetry(webhookId: string): Promise<void> {
    try {
      await this.prisma.webhookRetryQueue.delete({
        where: { id: webhookId },
      });
    } catch (error) {
      // Ignore not found errors
      if (!error.code || error.code !== 'P2025') {
        this.logger.error(
          `Failed to remove persisted retry ${webhookId}: ${error.message}`,
          error.stack
        );
      }
    }
  }

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
        error.stack
      );
    }
  }

  private async clearPersistedRetries(): Promise<void> {
    try {
      await this.prisma.webhookRetryQueue.deleteMany({});
    } catch (error) {
      this.logger.error(
        `Failed to clear persisted retries: ${error.message}`,
        error.stack
      );
    }
  }

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

  private chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }
}