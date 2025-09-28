import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import * as crypto from 'crypto';
import { WebhookModule } from '../../webhook.module';
import { WebhookRetryService } from '../../webhook-retry.service';
import { WebhookLoggerService } from '../../webhook-logger.service';
import { WebhookProcessorService } from '../../webhook-processor.service';

describe('Webhook Retry Mechanism E2E Tests', () => {
  let app: INestApplication;
  let retryService: WebhookRetryService;
  let loggerService: WebhookLoggerService;
  let processorService: WebhookProcessorService;

  const testClientId = 'retry-test-client';
  const testApiKey = 'test-api-key-retry';

  // Mock webhook endpoint that can simulate failures
  let mockWebhookServer: any;
  let mockWebhookResponses: { [key: string]: { status: number; body?: any; delay?: number } } = {};

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [WebhookModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    retryService = moduleFixture.get<WebhookRetryService>(WebhookRetryService);
    loggerService = moduleFixture.get<WebhookLoggerService>(WebhookLoggerService);
    processorService = moduleFixture.get<WebhookProcessorService>(WebhookProcessorService);

    await app.init();

    // Setup mock webhook server to simulate destination endpoints
    setupMockWebhookServer();
  });

  afterAll(async () => {
    if (mockWebhookServer) {
      mockWebhookServer.close();
    }
    await app.close();
  });

  beforeEach(() => {
    // Reset mock responses before each test
    mockWebhookResponses = {};
    jest.clearAllMocks();
  });

  const setupMockWebhookServer = () => {
    const express = require('express');
    const mockApp = express();

    mockApp.use(express.json());

    mockApp.post('/webhook-endpoint/:scenario', (req, res) => {
      const scenario = req.params.scenario;
      const response = mockWebhookResponses[scenario] || { status: 200 };

      if (response.delay) {
        setTimeout(() => {
          res.status(response.status).json(response.body || { received: true });
        }, response.delay);
      } else {
        res.status(response.status).json(response.body || { received: true });
      }
    });

    mockWebhookServer = mockApp.listen(0); // Use random available port
  };

  const getMockWebhookUrl = (scenario: string): string => {
    const port = mockWebhookServer.address().port;
    return `http://localhost:${port}/webhook-endpoint/${scenario}`;
  };

  describe('Automatic Retry on Webhook Delivery Failure', () => {
    it('should retry failed webhook deliveries with exponential backoff', async () => {
      // Configure mock endpoint to fail first 2 attempts, then succeed
      let attemptCount = 0;
      mockWebhookResponses['retry-success'] = {
        status: 500,
        body: { error: 'Server error' }
      };

      // Mock the webhook delivery to track retry attempts
      const originalDeliverWebhook = retryService.deliverWebhook;
      const deliveryAttempts = [];

      jest.spyOn(retryService, 'deliverWebhook').mockImplementation(async (webhookConfig, payload) => {
        attemptCount++;
        deliveryAttempts.push({
          attempt: attemptCount,
          timestamp: Date.now(),
          url: webhookConfig.endpointUrl
        });

        if (attemptCount <= 2) {
          throw new Error('Mock delivery failure');
        }

        return { success: true, statusCode: 200, response: { received: true } };
      });

      // Register webhook with retry configuration
      const webhookConfig = {
        id: 'webhook-retry-test-1',
        clientId: testClientId,
        provider: 'careem',
        endpointUrl: getMockWebhookUrl('retry-success'),
        secret: 'test-secret',
        events: ['order.created'],
        isActive: true,
        retryConfig: {
          maxRetries: 5,
          retryDelay: 100, // Short delay for testing
          backoffMultiplier: 2,
          maxRetryDelay: 10000
        }
      };

      // Create a failed webhook log entry
      const webhookEvent = {
        provider: 'careem',
        clientId: testClientId,
        eventType: 'order.created',
        payload: {
          event_type: 'order_created',
          order_id: 'retry_test_order_001',
          data: { test: true }
        },
        headers: {}
      };

      await processorService.processWebhook(webhookEvent);

      // Trigger retry process
      await retryService.processRetryQueue();

      // Wait for retries to complete
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Verify retry attempts were made
      expect(deliveryAttempts).toHaveLength(3); // Initial attempt + 2 retries + success

      // Verify exponential backoff timing
      const timeDiffs = [];
      for (let i = 1; i < deliveryAttempts.length; i++) {
        timeDiffs.push(deliveryAttempts[i].timestamp - deliveryAttempts[i - 1].timestamp);
      }

      // Each retry should take longer than the previous (exponential backoff)
      for (let i = 1; i < timeDiffs.length; i++) {
        expect(timeDiffs[i]).toBeGreaterThanOrEqual(timeDiffs[i - 1] * 1.5);
      }
    });

    it('should stop retrying after max retry limit is reached', async () => {
      let attemptCount = 0;

      jest.spyOn(retryService, 'deliverWebhook').mockImplementation(async () => {
        attemptCount++;
        throw new Error('Persistent failure');
      });

      const webhookConfig = {
        id: 'webhook-retry-test-2',
        clientId: testClientId,
        provider: 'talabat',
        endpointUrl: getMockWebhookUrl('persistent-failure'),
        retryConfig: {
          maxRetries: 3,
          retryDelay: 50,
          backoffMultiplier: 2
        }
      };

      const webhookEvent = {
        provider: 'talabat',
        clientId: testClientId,
        eventType: 'order.updated',
        payload: {
          type: 'order_notification',
          order_id: 'retry_test_order_002'
        },
        headers: {}
      };

      await processorService.processWebhook(webhookEvent);
      await retryService.processRetryQueue();

      // Wait for all retry attempts to complete
      await new Promise(resolve => setTimeout(resolve, 500));

      // Should have made initial attempt + maxRetries attempts
      expect(attemptCount).toBe(4); // 1 initial + 3 retries

      // Verify webhook is marked as permanently failed
      const logs = await loggerService.getWebhookLogs({
        provider: 'talabat',
        clientId: testClientId,
        status: 'failed',
        limit: 1
      });

      expect(logs.logs).toHaveLength(1);
      expect(logs.logs[0]).toHaveProperty('retryCount', 3);
      expect(logs.logs[0]).toHaveProperty('status', 'failed');
    });

    it('should handle different HTTP error codes appropriately', async () => {
      const errorScenarios = [
        { status: 400, shouldRetry: false, description: 'Bad Request - no retry' },
        { status: 401, shouldRetry: false, description: 'Unauthorized - no retry' },
        { status: 403, shouldRetry: false, description: 'Forbidden - no retry' },
        { status: 404, shouldRetry: false, description: 'Not Found - no retry' },
        { status: 422, shouldRetry: false, description: 'Unprocessable Entity - no retry' },
        { status: 429, shouldRetry: true, description: 'Rate Limited - should retry' },
        { status: 500, shouldRetry: true, description: 'Server Error - should retry' },
        { status: 502, shouldRetry: true, description: 'Bad Gateway - should retry' },
        { status: 503, shouldRetry: true, description: 'Service Unavailable - should retry' },
        { status: 504, shouldRetry: true, description: 'Gateway Timeout - should retry' }
      ];

      for (const scenario of errorScenarios) {
        let attemptCount = 0;

        jest.spyOn(retryService, 'deliverWebhook').mockImplementation(async () => {
          attemptCount++;
          const error = new Error(`HTTP ${scenario.status}`);
          (error as any).statusCode = scenario.status;
          throw error;
        });

        const webhookEvent = {
          provider: 'deliveroo',
          clientId: testClientId,
          eventType: 'order.created',
          payload: {
            event: 'order_placed',
            order: { id: `error_test_${scenario.status}` }
          },
          headers: {}
        };

        await processorService.processWebhook(webhookEvent);
        await retryService.processRetryQueue();

        await new Promise(resolve => setTimeout(resolve, 200));

        if (scenario.shouldRetry) {
          expect(attemptCount).toBeGreaterThan(1);
        } else {
          expect(attemptCount).toBe(1);
        }

        jest.restoreAllMocks();
      }
    });
  });

  describe('Manual Retry Functionality', () => {
    it('should allow manual retry of failed webhooks via API', async () => {
      // Create a failed webhook log
      const failedWebhookId = await createFailedWebhookLog();

      // Mock successful retry
      jest.spyOn(retryService, 'deliverWebhook').mockResolvedValueOnce({
        success: true,
        statusCode: 200,
        response: { received: true }
      });

      // Trigger manual retry
      const response = await request(app.getHttpServer())
        .post(`/webhooks/retry/${failedWebhookId}`)
        .set('x-api-key', testApiKey)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message');

      // Verify webhook status was updated
      const logs = await loggerService.getWebhookLogs({
        provider: 'careem',
        clientId: testClientId,
        limit: 1
      });

      expect(logs.logs[0]).toHaveProperty('status', 'processed');
    });

    it('should handle manual retry of non-existent webhook', async () => {
      const response = await request(app.getHttpServer())
        .post('/webhooks/retry/non-existent-webhook-id')
        .set('x-api-key', testApiKey)
        .expect(404);

      expect(response.body).toHaveProperty('error');
      expect(response.body.message).toContain('not found');
    });

    it('should prevent manual retry of already successful webhooks', async () => {
      // Create a successful webhook log
      const successfulWebhookId = await createSuccessfulWebhookLog();

      const response = await request(app.getHttpServer())
        .post(`/webhooks/retry/${successfulWebhookId}`)
        .set('x-api-key', testApiKey)
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.message).toContain('already processed');
    });
  });

  describe('Retry Queue Management', () => {
    it('should prioritize retries based on event importance and age', async () => {
      const webhookEvents = [
        {
          provider: 'careem',
          clientId: testClientId,
          eventType: 'order.created',
          payload: { order_id: 'priority_test_1', priority: 'high' },
          priority: 'high',
          createdAt: new Date(Date.now() - 60000) // 1 minute ago
        },
        {
          provider: 'talabat',
          clientId: testClientId,
          eventType: 'menu.updated',
          payload: { menu_id: 'priority_test_2', priority: 'low' },
          priority: 'low',
          createdAt: new Date(Date.now() - 30000) // 30 seconds ago
        },
        {
          provider: 'deliveroo',
          clientId: testClientId,
          eventType: 'order.cancelled',
          payload: { order_id: 'priority_test_3', priority: 'critical' },
          priority: 'critical',
          createdAt: new Date(Date.now() - 45000) // 45 seconds ago
        }
      ];

      const processingOrder = [];

      jest.spyOn(retryService, 'deliverWebhook').mockImplementation(async (config, payload) => {
        processingOrder.push(payload.order_id || payload.menu_id);
        throw new Error('Mock failure for queue testing');
      });

      // Process all webhook events (they will all fail and be queued for retry)
      for (const event of webhookEvents) {
        await processorService.processWebhook(event);
      }

      // Process retry queue
      await retryService.processRetryQueue();

      // Verify processing order: critical first, then by age (oldest first)
      expect(processingOrder[0]).toBe('priority_test_3'); // Critical priority
      expect(processingOrder[1]).toBe('priority_test_1'); // High priority, older
      expect(processingOrder[2]).toBe('priority_test_2'); // Low priority, newer
    });

    it('should handle retry queue cleanup of old failed items', async () => {
      // Create old failed webhook entries
      const oldWebhookEvents = Array.from({ length: 10 }, (_, i) => ({
        provider: 'careem',
        clientId: testClientId,
        eventType: 'order.created',
        payload: { order_id: `old_webhook_${i}` },
        createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // 7 days ago
      }));

      // Mock all deliveries to fail
      jest.spyOn(retryService, 'deliverWebhook').mockRejectedValue(new Error('Persistent failure'));

      // Process old webhook events
      for (const event of oldWebhookEvents) {
        await processorService.processWebhook(event);
      }

      // Run retry queue cleanup
      await retryService.cleanupOldRetryItems(6 * 24 * 60 * 60 * 1000); // 6 days retention

      // Verify old items were cleaned up
      const logs = await loggerService.getWebhookLogs({
        provider: 'careem',
        clientId: testClientId,
        status: 'failed',
        limit: 20
      });

      const oldLogs = logs.logs.filter(log =>
        log.createdAt < new Date(Date.now() - 6 * 24 * 60 * 60 * 1000)
      );

      expect(oldLogs).toHaveLength(0); // Old logs should be cleaned up
    });

    it('should handle burst retry processing efficiently', async () => {
      const burstSize = 50;
      const webhookEvents = Array.from({ length: burstSize }, (_, i) => ({
        provider: 'careem',
        clientId: testClientId,
        eventType: 'order.created',
        payload: { order_id: `burst_test_${i}` },
        headers: {}
      }));

      let processedCount = 0;
      const startTime = Date.now();

      jest.spyOn(retryService, 'deliverWebhook').mockImplementation(async () => {
        processedCount++;
        if (processedCount <= burstSize / 2) {
          throw new Error('Mock failure for burst testing');
        }
        return { success: true, statusCode: 200, response: { received: true } };
      });

      // Process all webhook events in parallel
      await Promise.all(webhookEvents.map(event => processorService.processWebhook(event)));

      // Process retry queue
      await retryService.processRetryQueue();

      const endTime = Date.now();
      const processingTime = endTime - startTime;

      // Should process efficiently (less than 10 seconds for 50 items)
      expect(processingTime).toBeLessThan(10000);

      // Should have processed all items
      expect(processedCount).toBeGreaterThanOrEqual(burstSize);
    });
  });

  describe('Retry Configuration and Customization', () => {
    it('should respect per-client retry configuration', async () => {
      const clientConfigs = [
        {
          clientId: 'client-conservative',
          retryConfig: { maxRetries: 2, retryDelay: 1000, backoffMultiplier: 1.5 }
        },
        {
          clientId: 'client-aggressive',
          retryConfig: { maxRetries: 10, retryDelay: 100, backoffMultiplier: 3 }
        }
      ];

      for (const config of clientConfigs) {
        let attemptCount = 0;

        jest.spyOn(retryService, 'deliverWebhook').mockImplementation(async () => {
          attemptCount++;
          throw new Error('Persistent failure');
        });

        const webhookEvent = {
          provider: 'careem',
          clientId: config.clientId,
          eventType: 'order.created',
          payload: { order_id: `config_test_${config.clientId}` },
          headers: {}
        };

        await processorService.processWebhook(webhookEvent);
        await retryService.processRetryQueue();

        await new Promise(resolve => setTimeout(resolve, 2000));

        // Verify retry attempts match configuration
        const expectedAttempts = config.retryConfig.maxRetries + 1; // Initial + retries
        expect(attemptCount).toBe(expectedAttempts);

        jest.clearAllMocks();
        attemptCount = 0;
      }
    });

    it('should support circuit breaker pattern for consistently failing endpoints', async () => {
      const endpointUrl = getMockWebhookUrl('circuit-breaker-test');
      let attemptCount = 0;

      // Mock consistent failures to trigger circuit breaker
      jest.spyOn(retryService, 'deliverWebhook').mockImplementation(async () => {
        attemptCount++;
        throw new Error('Consistent endpoint failure');
      });

      // Send multiple webhook events to trigger circuit breaker
      const webhookEvents = Array.from({ length: 10 }, (_, i) => ({
        provider: 'careem',
        clientId: testClientId,
        eventType: 'order.created',
        payload: { order_id: `circuit_breaker_${i}` },
        headers: {}
      }));

      for (const event of webhookEvents) {
        await processorService.processWebhook(event);
      }

      await retryService.processRetryQueue();

      // Circuit breaker should prevent excessive retry attempts
      // After a threshold of failures, retries should be limited
      expect(attemptCount).toBeLessThan(webhookEvents.length * 5); // Should not retry everything indefinitely
    });
  });

  describe('Retry Metrics and Monitoring', () => {
    it('should track retry success rates and performance metrics', async () => {
      const testEvents = Array.from({ length: 20 }, (_, i) => ({
        provider: 'careem',
        clientId: testClientId,
        eventType: 'order.created',
        payload: { order_id: `metrics_test_${i}` },
        headers: {}
      }));

      let attemptCount = 0;

      jest.spyOn(retryService, 'deliverWebhook').mockImplementation(async () => {
        attemptCount++;
        // Succeed on 70% of attempts after first failure
        if (attemptCount % 3 === 0) {
          return { success: true, statusCode: 200, response: { received: true } };
        }
        throw new Error('Intermittent failure');
      });

      // Process all events
      for (const event of testEvents) {
        await processorService.processWebhook(event);
      }

      await retryService.processRetryQueue();

      // Get retry metrics
      const metrics = await retryService.getRetryMetrics(testClientId);

      expect(metrics).toHaveProperty('totalRetryAttempts');
      expect(metrics).toHaveProperty('successfulRetries');
      expect(metrics).toHaveProperty('failedRetries');
      expect(metrics).toHaveProperty('averageRetryCount');
      expect(metrics).toHaveProperty('successRate');

      expect(metrics.totalRetryAttempts).toBeGreaterThan(0);
      expect(metrics.successRate).toBeGreaterThan(0.5); // Should have some success
    });

    it('should provide detailed retry analytics', async () => {
      // Create diverse retry scenarios
      const scenarios = [
        { provider: 'careem', eventType: 'order.created', shouldSucceed: true },
        { provider: 'talabat', eventType: 'order.updated', shouldSucceed: false },
        { provider: 'deliveroo', eventType: 'order.cancelled', shouldSucceed: true },
        { provider: 'jahez', eventType: 'menu.updated', shouldSucceed: false }
      ];

      for (const scenario of scenarios) {
        jest.spyOn(retryService, 'deliverWebhook').mockImplementation(async () => {
          if (scenario.shouldSucceed) {
            return { success: true, statusCode: 200, response: { received: true } };
          }
          throw new Error('Scenario failure');
        });

        const webhookEvent = {
          provider: scenario.provider,
          clientId: testClientId,
          eventType: scenario.eventType,
          payload: { test: true },
          headers: {}
        };

        await processorService.processWebhook(webhookEvent);
        jest.clearAllMocks();
      }

      await retryService.processRetryQueue();

      // Get analytics
      const analytics = await retryService.getRetryAnalytics({
        clientId: testClientId,
        timeRange: '24h'
      });

      expect(analytics).toHaveProperty('byProvider');
      expect(analytics).toHaveProperty('byEventType');
      expect(analytics).toHaveProperty('byTimeRange');

      expect(analytics.byProvider.careem).toBeDefined();
      expect(analytics.byProvider.talabat).toBeDefined();
      expect(analytics.byEventType['order.created']).toBeDefined();
      expect(analytics.byEventType['menu.updated']).toBeDefined();
    });
  });

  // Helper functions
  const createFailedWebhookLog = async (): Promise<string> => {
    const webhookEvent = {
      provider: 'careem',
      clientId: testClientId,
      eventType: 'order.created',
      payload: { order_id: 'failed_webhook_test' },
      headers: {}
    };

    // Mock delivery failure
    jest.spyOn(retryService, 'deliverWebhook').mockRejectedValueOnce(new Error('Mock failure'));

    await processorService.processWebhook(webhookEvent);

    const logs = await loggerService.getWebhookLogs({
      provider: 'careem',
      clientId: testClientId,
      status: 'failed',
      limit: 1
    });

    return logs.logs[0].id;
  };

  const createSuccessfulWebhookLog = async (): Promise<string> => {
    const webhookEvent = {
      provider: 'careem',
      clientId: testClientId,
      eventType: 'order.created',
      payload: { order_id: 'successful_webhook_test' },
      headers: {}
    };

    // Mock successful delivery
    jest.spyOn(retryService, 'deliverWebhook').mockResolvedValueOnce({
      success: true,
      statusCode: 200,
      response: { received: true }
    });

    await processorService.processWebhook(webhookEvent);

    const logs = await loggerService.getWebhookLogs({
      provider: 'careem',
      clientId: testClientId,
      status: 'processed',
      limit: 1
    });

    return logs.logs[0].id;
  };
});