/**
 * Webhook Logger Service Usage Examples
 *
 * This file demonstrates how to use the WebhookLoggerService
 * in various scenarios within your application.
 */

import { Injectable, Logger } from '@nestjs/common';
import { WebhookLoggerService } from './webhook-logger.service';

@Injectable()
export class WebhookLoggerUsageExample {
  private readonly logger = new Logger(WebhookLoggerUsageExample.name);

  constructor(private readonly webhookLogger: WebhookLoggerService) {}

  /**
   * Example 1: Log an incoming webhook from an external service
   */
  async handleIncomingWebhook(
    organizationId: string,
    configurationId: string,
    payload: any,
    headers: Record<string, string>,
    ipAddress: string,
  ) {
    try {
      // Log the incoming webhook
      const webhookLog = await this.webhookLogger.logIncomingWebhook({
        organizationId,
        configurationId,
        webhookUrl: 'https://api.example.com/webhooks/orders',
        eventType: 'order.created',
        eventId: payload.order?.id,
        requestHeaders: headers,
        requestPayload: payload,
        ipAddress,
        userAgent: headers['user-agent'],
        signature: headers['x-webhook-signature'],
        metadata: {
          source: 'external_service',
          version: 'v1.0.0',
        },
      });

      this.logger.log(`Webhook logged with ID: ${webhookLog.id}`);

      // Process the webhook
      const startTime = Date.now();
      let success = false;
      let errorMessage: string | undefined;

      try {
        // Your webhook processing logic here
        await this.processOrderCreatedWebhook(payload);
        success = true;
      } catch (error) {
        success = false;
        errorMessage = error.message;
      }

      const responseTime = Date.now() - startTime;

      // Update the webhook log with the result
      await this.webhookLogger.updateWebhookLog(webhookLog.id, {
        status: success ? 'delivered' : 'failed',
        httpStatusCode: success ? 200 : 500,
        responseTimeMs: responseTime,
        errorMessage: success ? undefined : errorMessage,
        errorDetails: success ? undefined : { error: errorMessage, stack: 'Error stack trace...' },
        responseHeaders: { 'content-type': 'application/json' },
        responseBody: success ? { success: true } : { error: errorMessage },
      });

      return webhookLog;
    } catch (error) {
      this.logger.error(`Failed to handle webhook: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Example 2: Retry a failed webhook with logging
   */
  async retryFailedWebhook(webhookLogId: string) {
    try {
      // Get the original webhook log
      const logs = await this.webhookLogger.getWebhookLogs({
        organizationId: 'example-org-id',
        page: 1,
        limit: 1,
      });

      const originalLog = logs.logs.find(log => log.id === webhookLogId);
      if (!originalLog) {
        throw new Error(`Webhook log not found: ${webhookLogId}`);
      }

      // Create a new log entry for the retry attempt
      const retryLog = await this.webhookLogger.logIncomingWebhook({
        organizationId: originalLog.organizationId,
        configurationId: originalLog.configurationId,
        webhookUrl: originalLog.webhookUrl,
        eventType: originalLog.eventType,
        eventId: originalLog.eventId,
        requestHeaders: originalLog.requestHeaders as Record<string, any>,
        requestPayload: originalLog.requestPayload as Record<string, any>,
        correlationId: originalLog.correlationId,
        metadata: {
          ...originalLog.metadata as Record<string, any>,
          retryAttempt: true,
          originalLogId: originalLog.id,
        },
      });

      // Attempt to process the webhook again
      const startTime = Date.now();
      let success = false;
      let errorMessage: string | undefined;

      try {
        // Your retry logic here
        await this.processOrderCreatedWebhook(originalLog.requestPayload);
        success = true;
      } catch (error) {
        success = false;
        errorMessage = error.message;
      }

      const responseTime = Date.now() - startTime;

      // Update the retry log
      await this.webhookLogger.updateWebhookLog(retryLog.id, {
        status: success ? 'delivered' : 'failed',
        httpStatusCode: success ? 200 : 500,
        responseTimeMs: responseTime,
        errorMessage: success ? undefined : errorMessage,
        attemptNumber: (originalLog.attemptNumber || 1) + 1,
        nextRetryAt: success ? undefined : new Date(Date.now() + 60000), // Retry in 1 minute
      });

      return retryLog;
    } catch (error) {
      this.logger.error(`Failed to retry webhook: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Example 3: Generate webhook analytics report
   */
  async generateWebhookReport(organizationId: string, days = 30) {
    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      // Get comprehensive metrics
      const [metrics, performanceAnalytics, errorAnalytics] = await Promise.all([
        this.webhookLogger.getWebhookMetrics(organizationId, startDate, endDate),
        this.webhookLogger.getPerformanceAnalytics(organizationId, startDate, endDate),
        this.webhookLogger.getErrorAnalytics(organizationId, startDate, endDate),
      ]);

      const report = {
        period: {
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          days,
        },
        summary: {
          totalWebhooks: metrics.totalWebhooks,
          successRate: metrics.successRate,
          averageResponseTime: metrics.averageResponseTime,
        },
        performance: {
          averageResponseTime: performanceAnalytics.averageResponseTime,
          medianResponseTime: performanceAnalytics.medianResponseTime,
          p95ResponseTime: performanceAnalytics.p95ResponseTime,
          p99ResponseTime: performanceAnalytics.p99ResponseTime,
          slowestWebhooks: performanceAnalytics.slowestWebhooks.slice(0, 5),
        },
        errors: {
          totalErrors: errorAnalytics.totalErrors,
          errorRate: (errorAnalytics.totalErrors / metrics.totalWebhooks) * 100,
          commonErrors: errorAnalytics.commonErrors.slice(0, 10),
          errorsByStatusCode: errorAnalytics.errorsByStatusCode,
        },
        trends: {
          daily: metrics.dailyStats,
          hourly: metrics.hourlyStats,
          byEventType: metrics.webhooksByEventType,
        },
      };

      this.logger.log(`Generated webhook report for organization ${organizationId}: ${JSON.stringify(report.summary)}`);

      return report;
    } catch (error) {
      this.logger.error(`Failed to generate webhook report: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Example 4: Monitor webhook health and alert on issues
   */
  async monitorWebhookHealth(organizationId: string) {
    try {
      const last24Hours = new Date();
      last24Hours.setHours(last24Hours.getHours() - 24);

      const metrics = await this.webhookLogger.getWebhookMetrics(
        organizationId,
        last24Hours,
        new Date(),
      );

      // Define health thresholds
      const healthThresholds = {
        minSuccessRate: 95, // 95%
        maxAverageResponseTime: 2000, // 2 seconds
        maxErrorRate: 5, // 5%
      };

      const issues: string[] = [];

      // Check success rate
      if (metrics.successRate < healthThresholds.minSuccessRate) {
        issues.push(
          `Low success rate: ${metrics.successRate.toFixed(2)}% (threshold: ${healthThresholds.minSuccessRate}%)`,
        );
      }

      // Check response time
      if (metrics.averageResponseTime > healthThresholds.maxAverageResponseTime) {
        issues.push(
          `High response time: ${metrics.averageResponseTime.toFixed(2)}ms (threshold: ${healthThresholds.maxAverageResponseTime}ms)`,
        );
      }

      // Check error rate
      const errorRate = ((metrics.failedWebhooks / metrics.totalWebhooks) * 100) || 0;
      if (errorRate > healthThresholds.maxErrorRate) {
        issues.push(
          `High error rate: ${errorRate.toFixed(2)}% (threshold: ${healthThresholds.maxErrorRate}%)`,
        );
      }

      const healthStatus = {
        healthy: issues.length === 0,
        issues,
        metrics: {
          totalWebhooks: metrics.totalWebhooks,
          successRate: metrics.successRate,
          averageResponseTime: metrics.averageResponseTime,
          errorRate,
        },
        timestamp: new Date().toISOString(),
      };

      if (!healthStatus.healthy) {
        this.logger.warn(`Webhook health issues detected for organization ${organizationId}: ${JSON.stringify(issues)}`);

        // Here you could trigger alerts, send notifications, etc.
        await this.sendHealthAlert(organizationId, healthStatus);
      } else {
        this.logger.log(`Webhook health check passed for organization ${organizationId}`);
      }

      return healthStatus;
    } catch (error) {
      this.logger.error(`Failed to monitor webhook health: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Example 5: Search and troubleshoot webhook issues
   */
  async troubleshootWebhookIssues(organizationId: string, eventId: string) {
    try {
      // Search for all logs related to this event
      const searchResults = await this.webhookLogger.searchWebhookLogs(
        organizationId,
        eventId,
        {
          limit: 100,
          sortBy: 'createdAt',
          sortOrder: 'asc',
        },
      );

      // Get logs by correlation ID if available
      const correlationLogs = searchResults.logs.length > 0 && searchResults.logs[0].correlationId
        ? await this.webhookLogger.getWebhookLogsByCorrelation(
            organizationId,
            searchResults.logs[0].correlationId,
          )
        : [];

      const troubleshootingInfo = {
        eventId,
        totalLogs: searchResults.totalCount,
        logs: searchResults.logs,
        correlationLogs,
        analysis: {
          hasFailures: searchResults.logs.some(log => log.status === 'failed'),
          hasRetries: searchResults.logs.filter(log => log.attemptNumber > 1).length,
          uniqueErrors: [
            ...new Set(
              searchResults.logs
                .filter(log => log.errorMessage)
                .map(log => log.errorMessage)
            ),
          ],
          responseTimeRange: {
            min: Math.min(...searchResults.logs.map(log => log.responseTimeMs || 0)),
            max: Math.max(...searchResults.logs.map(log => log.responseTimeMs || 0)),
          },
        },
      };

      this.logger.log(`Troubleshooting completed for event ${eventId}: ${JSON.stringify(troubleshootingInfo.analysis)}`);

      return troubleshootingInfo;
    } catch (error) {
      this.logger.error(`Failed to troubleshoot webhook issues: ${error.message}`, error.stack);
      throw error;
    }
  }

  // Helper methods

  private async processOrderCreatedWebhook(payload: any): Promise<void> {
    // Simulate webhook processing
    await new Promise(resolve => setTimeout(resolve, Math.random() * 1000));

    // Simulate occasional failures
    if (Math.random() < 0.1) {
      throw new Error('Simulated processing error');
    }
  }

  private async sendHealthAlert(organizationId: string, healthStatus: any): Promise<void> {
    // Implement your alerting logic here (email, Slack, etc.)
    this.logger.warn(`ALERT: Webhook health issues for organization ${organizationId}`, healthStatus);
  }
}