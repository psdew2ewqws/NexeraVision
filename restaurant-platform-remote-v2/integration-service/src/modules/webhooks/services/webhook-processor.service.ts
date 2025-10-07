import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../database/prisma.service';
import { AdapterFactory } from '../../adapters/factories/adapter.factory';
import { OrderTransformerService } from '../../transformation/services/order-transformer.service';
import { BackendClientService } from '../../backend-communication/services/backend-client.service';
import { RetryQueueService } from '../../retry-queue/services/retry-queue.service';
import * as DOMPurify from 'isomorphic-dompurify';

export interface WebhookPayload {
  provider: string;
  payload: any;
  headers: Record<string, string>;
  ipAddress: string;
  timestamp: Date;
}

export interface ProcessedWebhookResult {
  orderId: string;
  success: boolean;
  retryNeeded?: boolean;
}

@Injectable()
export class WebhookProcessorService {
  private readonly logger = new Logger(WebhookProcessorService.name);

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
    private adapterFactory: AdapterFactory,
    private orderTransformer: OrderTransformerService,
    private backendClient: BackendClientService,
    private retryQueue: RetryQueueService,
  ) {}

  /**
   * Main webhook processing pipeline
   */
  async processWebhook(webhook: WebhookPayload): Promise<ProcessedWebhookResult> {
    const startTime = Date.now();

    // 1. Log incoming webhook to database
    const webhookLog = await this.logWebhook(webhook);

    try {
      // 2. Sanitize input data (prevent XSS/injection)
      const sanitizedPayload = this.sanitizePayload(webhook.payload);

      // 3. Get provider adapter
      const adapter = this.adapterFactory.getAdapter(webhook.provider);

      // 4. Extract order data using provider-specific adapter
      const providerOrder = await adapter.extractOrder(sanitizedPayload);

      // 5. Validate and transform to internal format
      const internalOrder = await this.orderTransformer.transform(
        providerOrder,
        webhook.provider,
      );

      // 6. Log provider order for tracking
      const providerOrderLog = await this.logProviderOrder(
        internalOrder,
        webhook.provider,
        webhookLog.id,
      );

      // 7. Forward to main backend
      const backendResult = await this.backendClient.createOrder(internalOrder);

      if (backendResult.success) {
        // 8. Update webhook log with success
        await this.updateWebhookLog(webhookLog.id, {
          status: 'processed',
          processingTime: Date.now() - startTime,
          orderId: backendResult.orderId,
        });

        this.logger.log(`Order ${backendResult.orderId} successfully processed from ${webhook.provider}`);

        return {
          orderId: backendResult.orderId,
          success: true,
        };
      } else {
        // Backend rejected the order, add to retry queue
        await this.handleFailedOrder(
          internalOrder,
          webhook,
          webhookLog.id,
          backendResult.error,
        );

        return {
          orderId: internalOrder.externalOrderId,
          success: false,
          retryNeeded: true,
        };
      }
    } catch (error) {
      this.logger.error(`Webhook processing failed for ${webhook.provider}:`, error);

      // Update webhook log with error
      await this.updateWebhookLog(webhookLog.id, {
        status: 'failed',
        error: error.message,
        processingTime: Date.now() - startTime,
      });

      // Add to retry queue if it's a temporary failure
      if (this.isRetryableError(error)) {
        await this.retryQueue.addToQueue({
          webhookLogId: webhookLog.id,
          provider: webhook.provider,
          payload: webhook.payload,
          attemptNumber: 1,
        });
      }

      throw error;
    }
  }

  /**
   * Log webhook to database for audit trail
   */
  private async logWebhook(webhook: WebhookPayload) {
    return await this.prisma.webhookLog.create({
      data: {
        providerId: webhook.provider,
        webhookType: 'order_created', // Default webhook type
        endpoint: `/api/webhooks/${webhook.provider}`,
        method: 'POST',
        headers: webhook.headers,
        payload: webhook.payload,
        ipAddress: webhook.ipAddress,
        status: 'pending',
        receivedAt: webhook.timestamp,
      },
    });
  }

  /**
   * Update webhook log with processing results
   */
  private async updateWebhookLog(
    webhookLogId: string,
    updates: {
      status: string;
      processingTime?: number;
      orderId?: string;
      error?: string;
    },
  ) {
    // Map status to WebhookStatus enum
    const statusMap: Record<string, string> = {
      'processed': 'completed',
      'failed': 'failed',
      'processing': 'processing',
    };
    const webhookStatus = statusMap[updates.status] || updates.status;

    return await this.prisma.webhookLog.update({
      where: { id: webhookLogId },
      data: {
        status: webhookStatus as any,
        internalOrderId: updates.orderId,
        errorMessage: updates.error,
        processedAt: new Date(),
      },
    });
  }

  /**
   * Log provider order for tracking
   */
  private async logProviderOrder(
    order: any,
    provider: string,
    webhookLogId: string,
  ) {
    // Get branch and company from order
    const branch = await this.prisma.branch.findFirst({
      where: { id: order.branchId },
      select: { companyId: true },
    });

    return await this.prisma.providerOrderLog.create({
      data: {
        orderId: order.id || order.externalOrderId,
        providerId: provider,
        branchId: order.branchId,
        companyId: branch?.companyId || '',
        externalOrderId: order.externalOrderId,
        providerStatus: 'received',
      },
    });
  }

  /**
   * Handle failed order processing
   */
  private async handleFailedOrder(
    order: any,
    webhook: WebhookPayload,
    webhookLogId: string,
    error: string,
  ) {
    // Log error to delivery_error_logs
    await this.prisma.deliveryErrorLog.create({
      data: {
        providerId: webhook.provider,
        branchId: order.branchId,
        companyId: order.companyId,
        webhookLogId: webhookLogId,
        orderId: order.externalOrderId,
        errorType: 'processing_failed',
        errorMessage: error,
        errorDetails: JSON.stringify({
          order,
          webhook: {
            provider: webhook.provider,
            timestamp: webhook.timestamp,
          },
        }),
        occurredAt: new Date(),
      },
    });

    // Add to retry queue
    await this.retryQueue.addToQueue({
      webhookLogId,
      provider: webhook.provider,
      payload: order,
      attemptNumber: 1,
      nextRetryAt: new Date(Date.now() + this.configService.get('app.retry.initialDelay')),
    });
  }

  /**
   * Log webhook error for debugging
   */
  async logWebhookError(errorData: {
    provider: string;
    payload: any;
    headers: Record<string, string>;
    error: string;
    stackTrace?: string;
  }) {
    await this.prisma.deliveryErrorLog.create({
      data: {
        providerId: errorData.provider,
        errorType: 'webhook_processing',
        errorMessage: errorData.error,
        errorDetails: JSON.stringify({
          payload: errorData.payload,
          headers: errorData.headers,
          stackTrace: errorData.stackTrace,
        }),
        occurredAt: new Date(),
      },
    });
  }

  /**
   * Sanitize payload to prevent XSS/injection attacks
   */
  private sanitizePayload(payload: any): any {
    if (typeof payload === 'string') {
      return DOMPurify.sanitize(payload);
    }

    if (typeof payload === 'object' && payload !== null) {
      const sanitized: any = Array.isArray(payload) ? [] : {};

      for (const key in payload) {
        if (payload.hasOwnProperty(key)) {
          if (typeof payload[key] === 'string') {
            sanitized[key] = DOMPurify.sanitize(payload[key]);
          } else if (typeof payload[key] === 'object') {
            sanitized[key] = this.sanitizePayload(payload[key]);
          } else {
            sanitized[key] = payload[key];
          }
        }
      }

      return sanitized;
    }

    return payload;
  }

  /**
   * Check if error is retryable
   */
  private isRetryableError(error: any): boolean {
    // Network errors, timeouts, and 5xx errors are retryable
    if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
      return true;
    }

    if (error.response && error.response.status >= 500) {
      return true;
    }

    // Circuit breaker open is retryable
    if (error.message && error.message.includes('Circuit breaker is open')) {
      return true;
    }

    return false;
  }
}