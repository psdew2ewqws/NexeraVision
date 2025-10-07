import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../database/prisma.service';

export interface RetryItem {
  webhookLogId: string;
  provider: string;
  payload: any;
  attemptNumber: number;
  nextRetryAt?: Date;
  error?: string;
}

/**
 * Retry Queue Service
 * Manages failed webhook processing with exponential backoff
 */
@Injectable()
export class RetryQueueService {
  private readonly logger = new Logger(RetryQueueService.name);
  private readonly maxAttempts: number;
  private readonly initialDelay: number;
  private readonly maxDelay: number;
  private readonly backoffMultiplier: number;

  // In-memory queue for immediate processing
  private queue: Map<string, RetryItem> = new Map();

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {
    const retryConfig = this.configService.get('app.retry');
    this.maxAttempts = retryConfig.maxAttempts;
    this.initialDelay = retryConfig.initialDelay;
    this.maxDelay = retryConfig.maxDelay;
    this.backoffMultiplier = retryConfig.backoffMultiplier;
  }

  /**
   * Add item to retry queue
   */
  async addToQueue(item: RetryItem): Promise<void> {
    if (item.attemptNumber >= this.maxAttempts) {
      this.logger.warn(`Max retry attempts reached for webhook ${item.webhookLogId}`);
      await this.moveToDeadLetterQueue(item);
      return;
    }

    // Calculate next retry time with exponential backoff
    const delay = this.calculateBackoffDelay(item.attemptNumber);
    item.nextRetryAt = new Date(Date.now() + delay);

    // Store in memory queue
    this.queue.set(item.webhookLogId, item);

    // Also persist to database for durability
    await this.persistRetryItem(item);

    this.logger.log(
      `Added webhook ${item.webhookLogId} to retry queue. ` +
      `Attempt ${item.attemptNumber}/${this.maxAttempts}. ` +
      `Next retry at ${item.nextRetryAt.toISOString()}`,
    );
  }

  /**
   * Get items ready for retry
   */
  async getItemsForRetry(): Promise<RetryItem[]> {
    const now = new Date();
    const items: RetryItem[] = [];

    // Check in-memory queue
    for (const [id, item] of this.queue) {
      if (item.nextRetryAt && item.nextRetryAt <= now) {
        items.push(item);
      }
    }

    // Also check database for persisted items
    const dbItems = await this.prisma.deliveryErrorLog.findMany({
      where: {
        errorType: 'retry_pending',
        retryCount: {
          lt: this.maxAttempts,
        },
        nextRetryAt: {
          lte: now,
        },
      },
      take: 10, // Process max 10 items at a time
    });

    // Convert database items to RetryItem format
    for (const dbItem of dbItems) {
      const details = typeof dbItem.errorDetails === 'string'
        ? JSON.parse(dbItem.errorDetails)
        : (dbItem.errorDetails as any) || {};
      items.push({
        webhookLogId: dbItem.webhookLogId || '',
        provider: dbItem.providerId,
        payload: details.payload,
        attemptNumber: dbItem.retryCount || 1,
        error: dbItem.errorMessage,
      });
    }

    return items;
  }

  /**
   * Remove item from queue after successful processing
   */
  async removeFromQueue(webhookLogId: string): Promise<void> {
    this.queue.delete(webhookLogId);

    // Update database
    await this.prisma.deliveryErrorLog.updateMany({
      where: {
        webhookLogId: webhookLogId,
        errorType: 'retry_pending',
      },
      data: {
        errorType: 'resolved',
        resolvedAt: new Date(),
      },
    });

    this.logger.log(`Removed webhook ${webhookLogId} from retry queue (success)`);
  }

  /**
   * Update retry attempt
   */
  async updateRetryAttempt(
    webhookLogId: string,
    attemptNumber: number,
    error: string,
  ): Promise<void> {
    const item = this.queue.get(webhookLogId);

    if (item) {
      item.attemptNumber = attemptNumber;
      item.error = error;

      if (attemptNumber >= this.maxAttempts) {
        await this.moveToDeadLetterQueue(item);
      } else {
        // Calculate next retry time
        const delay = this.calculateBackoffDelay(attemptNumber);
        item.nextRetryAt = new Date(Date.now() + delay);

        // Update in database
        await this.prisma.deliveryErrorLog.updateMany({
          where: {
            webhookLogId: webhookLogId,
            errorType: 'retry_pending',
          },
          data: {
            retryCount: attemptNumber,
            errorMessage: error,
            nextRetryAt: item.nextRetryAt,
          },
        });

        this.logger.log(
          `Updated retry attempt for webhook ${webhookLogId}. ` +
          `Attempt ${attemptNumber}/${this.maxAttempts}. ` +
          `Next retry at ${item.nextRetryAt.toISOString()}`,
        );
      }
    }
  }

  /**
   * Calculate exponential backoff delay
   */
  private calculateBackoffDelay(attemptNumber: number): number {
    // Exponential backoff: initialDelay * (backoffMultiplier ^ attemptNumber)
    const delay = Math.min(
      this.initialDelay * Math.pow(this.backoffMultiplier, attemptNumber - 1),
      this.maxDelay,
    );

    // Add jitter (10% randomization) to prevent thundering herd
    const jitter = delay * 0.1 * Math.random();

    return Math.floor(delay + jitter);
  }

  /**
   * Persist retry item to database
   */
  private async persistRetryItem(item: RetryItem): Promise<void> {
    await this.prisma.deliveryErrorLog.create({
      data: {
        providerId: item.provider,
        webhookLogId: item.webhookLogId,
        errorType: 'retry_pending',
        errorMessage: item.error || 'Processing failed',
        errorDetails: JSON.stringify({
          payload: item.payload,
          attemptNumber: item.attemptNumber,
        }),
        retryCount: item.attemptNumber,
        nextRetryAt: item.nextRetryAt,
        occurredAt: new Date(),
      },
    });
  }

  /**
   * Move item to dead letter queue
   */
  private async moveToDeadLetterQueue(item: RetryItem): Promise<void> {
    this.queue.delete(item.webhookLogId);

    await this.prisma.deliveryErrorLog.updateMany({
      where: {
        webhookLogId: item.webhookLogId,
        errorType: 'retry_pending',
      },
      data: {
        errorType: 'dead_letter',
        errorMessage: `Max retry attempts (${this.maxAttempts}) exceeded. Last error: ${item.error}`,
        movedToDeadLetterAt: new Date(),
      },
    });

    this.logger.error(
      `Webhook ${item.webhookLogId} moved to dead letter queue after ${this.maxAttempts} attempts`,
    );
  }

  /**
   * Get dead letter queue items
   */
  async getDeadLetterItems(limit = 100): Promise<any[]> {
    return await this.prisma.deliveryErrorLog.findMany({
      where: {
        errorType: 'dead_letter',
      },
      orderBy: {
        occurredAt: 'desc',
      },
      take: limit,
    });
  }

  /**
   * Manually retry dead letter item
   */
  async retryDeadLetterItem(webhookLogId: string): Promise<void> {
    const deadLetterItem = await this.prisma.deliveryErrorLog.findFirst({
      where: {
        webhookLogId: webhookLogId,
        errorType: 'dead_letter',
      },
    });

    if (deadLetterItem) {
      const details = typeof deadLetterItem.errorDetails === 'string'
        ? JSON.parse(deadLetterItem.errorDetails)
        : (deadLetterItem.errorDetails as any) || {};

      // Reset and add back to retry queue
      await this.addToQueue({
        webhookLogId: webhookLogId,
        provider: deadLetterItem.providerId,
        payload: details.payload,
        attemptNumber: 1, // Reset attempt count
      });

      // Update database
      await this.prisma.deliveryErrorLog.update({
        where: { id: deadLetterItem.id },
        data: {
          errorType: 'retry_pending',
          retryCount: 1,
          nextRetryAt: new Date(Date.now() + this.initialDelay),
        },
      });

      this.logger.log(`Dead letter item ${webhookLogId} requeued for retry`);
    }
  }

  /**
   * Get queue statistics
   */
  async getQueueStats() {
    const [pending, deadLetter, resolved] = await Promise.all([
      this.prisma.deliveryErrorLog.count({
        where: { errorType: 'retry_pending' },
      }),
      this.prisma.deliveryErrorLog.count({
        where: { errorType: 'dead_letter' },
      }),
      this.prisma.deliveryErrorLog.count({
        where: { errorType: 'resolved' },
      }),
    ]);

    return {
      inMemoryQueue: this.queue.size,
      pendingRetries: pending,
      deadLetterQueue: deadLetter,
      resolved: resolved,
      maxAttempts: this.maxAttempts,
      initialDelay: `${this.initialDelay}ms`,
      maxDelay: `${this.maxDelay}ms`,
    };
  }
}