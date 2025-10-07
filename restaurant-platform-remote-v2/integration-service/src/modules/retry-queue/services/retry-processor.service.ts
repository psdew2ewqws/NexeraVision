import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { RetryQueueService } from './retry-queue.service';
import { BackendClientService } from '../../backend-communication/services/backend-client.service';

/**
 * Retry Processor Service
 * Processes retry queue items on a schedule
 */
@Injectable()
export class RetryProcessorService implements OnModuleInit {
  private readonly logger = new Logger(RetryProcessorService.name);
  private isProcessing = false;

  constructor(
    private retryQueue: RetryQueueService,
    private backendClient: BackendClientService,
  ) {}

  async onModuleInit() {
    this.logger.log('Retry processor service initialized');
    // Process any pending retries on startup
    await this.processRetryQueue();
  }

  /**
   * Process retry queue every minute
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async handleRetryQueue() {
    if (this.isProcessing) {
      this.logger.debug('Retry processor is already running, skipping this cycle');
      return;
    }

    await this.processRetryQueue();
  }

  /**
   * Process all items ready for retry
   */
  async processRetryQueue() {
    this.isProcessing = true;

    try {
      const items = await this.retryQueue.getItemsForRetry();

      if (items.length === 0) {
        return;
      }

      this.logger.log(`Processing ${items.length} items from retry queue`);

      for (const item of items) {
        await this.processRetryItem(item);
      }
    } catch (error) {
      this.logger.error('Error processing retry queue:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Process individual retry item
   */
  private async processRetryItem(item: any) {
    try {
      this.logger.log(
        `Retrying webhook ${item.webhookLogId} from ${item.provider} (attempt ${item.attemptNumber})`,
      );

      // Attempt to send to backend
      const result = await this.backendClient.createOrder(item.payload);

      if (result.success) {
        // Success - remove from retry queue
        await this.retryQueue.removeFromQueue(item.webhookLogId);
        this.logger.log(`Retry successful for webhook ${item.webhookLogId}`);
      } else {
        // Failed - update retry attempt
        await this.retryQueue.updateRetryAttempt(
          item.webhookLogId,
          item.attemptNumber + 1,
          result.error || 'Unknown error',
        );
      }
    } catch (error) {
      // Error - update retry attempt
      await this.retryQueue.updateRetryAttempt(
        item.webhookLogId,
        item.attemptNumber + 1,
        error.message || 'Processing failed',
      );

      this.logger.error(`Retry failed for webhook ${item.webhookLogId}:`, error);
    }
  }

  /**
   * Get retry processor status
   */
  getStatus() {
    return {
      isProcessing: this.isProcessing,
      nextRun: 'Every minute',
    };
  }
}