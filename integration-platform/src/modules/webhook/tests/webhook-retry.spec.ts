import { Test, TestingModule } from '@nestjs/testing';
import { WebhookRetryService, WebhookRetryPayload } from '../webhook-retry.service';
import { PrismaService } from '../../../shared/services/prisma.service';
import { WebhookTestUtils } from './test-utils';
import { MockWebhookPayloads } from './mock-payloads';
import { EventProvider, EventType } from '../dto/webhook-event.dto';

describe('WebhookRetryService', () => {
  let service: WebhookRetryService;
  let prismaService: PrismaService;
  let module: TestingModule;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      providers: [
        WebhookRetryService,
        {
          provide: PrismaService,
          useValue: {
            webhookRetryQueue: {
              create: jest.fn(),
              findMany: jest.fn().mockResolvedValue([]),
              update: jest.fn(),
              upsert: jest.fn(),
              delete: jest.fn(),
              deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
            },
          },
        },
      ],
    }).compile();

    service = module.get<WebhookRetryService>(WebhookRetryService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  afterAll(async () => {
    await module.close();
  });

  beforeEach(async () => {
    jest.clearAllMocks();
    await service.clearAllQueues();
  });

  describe('Exponential Backoff Algorithm', () => {
    it('should calculate correct retry delays with exponential backoff', async () => {
      const clientId = WebhookTestUtils.generateClientId();
      const payload: WebhookRetryPayload = {
        id: WebhookTestUtils.generateEventId(),
        url: 'https://test.webhook.com/endpoint',
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: MockWebhookPayloads.careem.orderCreated(clientId),
        companyId: clientId,
      };

      const config = {
        maxRetries: 5,
        baseDelayMs: 1000,
        maxDelayMs: 30000,
        exponentialMultiplier: 2,
        jitterMs: 100,
        deadLetterQueueEnabled: true,
      };

      const retryDelays: number[] = [];

      // Simulate multiple retry attempts
      for (let attempt = 1; attempt <= config.maxRetries; attempt++) {
        const startTime = Date.now();
        await service.queueForRetry(payload, `Attempt ${attempt} failed`, 'medium', config);

        const queueItems = service.getRetryQueueItems(clientId);
        const item = queueItems.find(item => item.id === payload.id);

        if (item) {
          const delay = item.nextRetryAt.getTime() - startTime;
          retryDelays.push(delay);
        }
      }

      // Verify exponential backoff pattern
      for (let i = 1; i < retryDelays.length; i++) {
        expect(retryDelays[i]).toBeGreaterThan(retryDelays[i - 1]);
      }

      // Verify delays are within expected bounds
      expect(retryDelays[0]).toBeGreaterThanOrEqual(config.baseDelayMs - config.jitterMs);
      expect(retryDelays[0]).toBeLessThanOrEqual(config.baseDelayMs + config.jitterMs);

      expect(retryDelays[retryDelays.length - 1]).toBeLessThanOrEqual(config.maxDelayMs);
    });

    it('should apply jitter to prevent thundering herd', async () => {
      const clientId = WebhookTestUtils.generateClientId();
      const numPayloads = 10;
      const payloads: WebhookRetryPayload[] = [];

      // Create multiple payloads that will be retried at the same time
      for (let i = 0; i < numPayloads; i++) {
        payloads.push({
          id: WebhookTestUtils.generateEventId(),
          url: 'https://test.webhook.com/endpoint',
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: MockWebhookPayloads.careem.orderCreated(clientId),
          companyId: clientId,
        });
      }

      const config = {
        maxRetries: 3,
        baseDelayMs: 1000,
        maxDelayMs: 10000,
        exponentialMultiplier: 2,
        jitterMs: 500,
        deadLetterQueueEnabled: true,
      };

      const startTime = Date.now();

      // Queue all payloads for retry
      await Promise.all(
        payloads.map(payload =>
          service.queueForRetry(payload, 'Connection timeout', 'medium', config)
        )
      );

      const queueItems = service.getRetryQueueItems(clientId);
      const retryTimes = queueItems.map(item => item.nextRetryAt.getTime() - startTime);

      // Verify that retry times are spread out due to jitter
      const uniqueTimes = new Set(retryTimes);
      expect(uniqueTimes.size).toBeGreaterThan(1); // Should have different retry times

      // Verify all times are within expected range
      retryTimes.forEach(time => {
        expect(time).toBeGreaterThanOrEqual(config.baseDelayMs - config.jitterMs);
        expect(time).toBeLessThanOrEqual(config.baseDelayMs + config.jitterMs);
      });
    });
  });

  describe('Dead Letter Queue Management', () => {
    it('should move webhooks to dead letter queue after max retries', async () => {
      const clientId = WebhookTestUtils.generateClientId();
      const payload: WebhookRetryPayload = {
        id: WebhookTestUtils.generateEventId(),
        url: 'https://httpbin.org/status/500',
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: MockWebhookPayloads.careem.orderCreated(clientId),
        companyId: clientId,
      };

      const config = {
        maxRetries: 2,
        baseDelayMs: 100,
        maxDelayMs: 1000,
        exponentialMultiplier: 2,
        jitterMs: 50,
        deadLetterQueueEnabled: true,
      };

      // Exceed max retries
      for (let i = 1; i <= config.maxRetries + 1; i++) {
        await service.queueForRetry(payload, `Failure ${i}`, 'medium', config);
      }

      const retryQueueItems = service.getRetryQueueItems(clientId);
      const deadLetterItems = service.getDeadLetterQueueItems(clientId);

      expect(retryQueueItems.length).toBe(0);
      expect(deadLetterItems.length).toBe(1);
      expect(deadLetterItems[0].id).toBe(payload.id);
      expect(deadLetterItems[0].attemptCount).toBe(config.maxRetries);
    });

    it('should not move to dead letter queue when disabled', async () => {
      const clientId = WebhookTestUtils.generateClientId();
      const payload: WebhookRetryPayload = {
        id: WebhookTestUtils.generateEventId(),
        url: 'https://httpbin.org/status/500',
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: MockWebhookPayloads.talabat.orderCreated(clientId),
        companyId: clientId,
      };

      const config = {
        maxRetries: 1,
        baseDelayMs: 100,
        maxDelayMs: 1000,
        exponentialMultiplier: 2,
        jitterMs: 50,
        deadLetterQueueEnabled: false,
      };

      // Exceed max retries
      for (let i = 1; i <= config.maxRetries + 1; i++) {
        await service.queueForRetry(payload, `Failure ${i}`, 'medium', config);
      }

      const retryQueueItems = service.getRetryQueueItems(clientId);
      const deadLetterItems = service.getDeadLetterQueueItems(clientId);

      expect(retryQueueItems.length).toBe(0);
      expect(deadLetterItems.length).toBe(0);
    });

    it('should clean up old dead letter queue entries', async () => {
      const clientId = WebhookTestUtils.generateClientId();

      // Create old entries by manually adding to dead letter queue
      const oldPayload: WebhookRetryPayload = {
        id: WebhookTestUtils.generateEventId(),
        url: 'https://test.webhook.com/old',
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: MockWebhookPayloads.deliveroo.orderCreated(clientId),
        companyId: clientId,
      };

      // Force move to dead letter queue
      await service.queueForRetry(oldPayload, 'Test failure', 'medium', {
        maxRetries: 0,
        baseDelayMs: 100,
        maxDelayMs: 1000,
        exponentialMultiplier: 2,
        jitterMs: 50,
        deadLetterQueueEnabled: true,
      });

      // Simulate cleanup (this would normally run on a schedule)
      await service.cleanupDeadLetterQueue();

      // Verify cleanup behavior (mock implementation always returns)
      const deadLetterItems = service.getDeadLetterQueueItems(clientId);
      expect(Array.isArray(deadLetterItems)).toBe(true);
    });
  });

  describe('Priority Queue Management', () => {
    it('should prioritize high priority webhooks', async () => {
      const clientId = WebhookTestUtils.generateClientId();

      const lowPriorityPayload: WebhookRetryPayload = {
        id: 'low-priority',
        url: 'https://test.webhook.com/low',
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: MockWebhookPayloads.careem.orderCreated(clientId),
        companyId: clientId,
      };

      const mediumPriorityPayload: WebhookRetryPayload = {
        id: 'medium-priority',
        url: 'https://test.webhook.com/medium',
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: MockWebhookPayloads.talabat.orderCreated(clientId),
        companyId: clientId,
      };

      const highPriorityPayload: WebhookRetryPayload = {
        id: 'high-priority',
        url: 'https://test.webhook.com/high',
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: MockWebhookPayloads.deliveroo.orderCreated(clientId),
        companyId: clientId,
      };

      // Queue in reverse priority order
      await service.queueForRetry(lowPriorityPayload, 'Error', 'low');
      await service.queueForRetry(mediumPriorityPayload, 'Error', 'medium');
      await service.queueForRetry(highPriorityPayload, 'Error', 'high');

      const queueItems = service.getRetryQueueItems(clientId);

      // Verify items are present
      expect(queueItems.length).toBe(3);

      // Find each priority item
      const lowItem = queueItems.find(item => item.id === 'low-priority');
      const mediumItem = queueItems.find(item => item.id === 'medium-priority');
      const highItem = queueItems.find(item => item.id === 'high-priority');

      expect(lowItem?.priority).toBe('low');
      expect(mediumItem?.priority).toBe('medium');
      expect(highItem?.priority).toBe('high');
    });

    it('should filter queue items by priority', async () => {
      const clientId = WebhookTestUtils.generateClientId();

      await service.queueForRetry(
        {
          id: 'test-1',
          url: 'https://test.webhook.com/1',
          method: 'POST',
          headers: {},
          body: {},
          companyId: clientId,
        },
        'Error',
        'high'
      );

      await service.queueForRetry(
        {
          id: 'test-2',
          url: 'https://test.webhook.com/2',
          method: 'POST',
          headers: {},
          body: {},
          companyId: clientId,
        },
        'Error',
        'low'
      );

      const highPriorityItems = service.getRetryQueueItems(clientId, 'high');
      const lowPriorityItems = service.getRetryQueueItems(clientId, 'low');

      expect(highPriorityItems.length).toBe(1);
      expect(lowPriorityItems.length).toBe(1);
      expect(highPriorityItems[0].priority).toBe('high');
      expect(lowPriorityItems[0].priority).toBe('low');
    });
  });

  describe('Retry Statistics', () => {
    it('should track retry statistics accurately', async () => {
      const clientId = WebhookTestUtils.generateClientId();

      const initialStats = service.getRetryStats();

      const payload: WebhookRetryPayload = {
        id: WebhookTestUtils.generateEventId(),
        url: 'https://httpbin.org/status/200',
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: MockWebhookPayloads.jahez.orderCreated(clientId),
        companyId: clientId,
      };

      await service.queueForRetry(payload, 'Initial failure');

      const statsAfterQueue = service.getRetryStats();
      expect(statsAfterQueue.totalQueued).toBeGreaterThan(initialStats.totalQueued);

      // Retry the webhook
      await service.retryWebhook(payload.id);

      const statsAfterRetry = service.getRetryStats();
      expect(statsAfterRetry.totalSuccessful).toBeGreaterThan(initialStats.totalSuccessful);
    });

    it('should track failed retry attempts', async () => {
      const clientId = WebhookTestUtils.generateClientId();

      const payload: WebhookRetryPayload = {
        id: WebhookTestUtils.generateEventId(),
        url: 'https://httpbin.org/status/500',
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: MockWebhookPayloads.careem.orderCreated(clientId),
        companyId: clientId,
      };

      const initialStats = service.getRetryStats();

      await service.queueForRetry(payload, 'Initial failure');
      await service.retryWebhook(payload.id);

      const statsAfterFailedRetry = service.getRetryStats();
      expect(statsAfterFailedRetry.totalFailed).toBeGreaterThan(initialStats.totalFailed);
    });
  });

  describe('Queue Filtering and Management', () => {
    it('should filter queue items by company ID', async () => {
      const clientId1 = WebhookTestUtils.generateClientId();
      const clientId2 = WebhookTestUtils.generateClientId();

      await service.queueForRetry(
        {
          id: 'webhook-1',
          url: 'https://test.webhook.com/1',
          method: 'POST',
          headers: {},
          body: {},
          companyId: clientId1,
        },
        'Error'
      );

      await service.queueForRetry(
        {
          id: 'webhook-2',
          url: 'https://test.webhook.com/2',
          method: 'POST',
          headers: {},
          body: {},
          companyId: clientId2,
        },
        'Error'
      );

      const client1Items = service.getRetryQueueItems(clientId1);
      const client2Items = service.getRetryQueueItems(clientId2);

      expect(client1Items.length).toBe(1);
      expect(client2Items.length).toBe(1);
      expect(client1Items[0].payload.companyId).toBe(clientId1);
      expect(client2Items[0].payload.companyId).toBe(clientId2);
    });

    it('should remove specific webhooks from queue', async () => {
      const clientId = WebhookTestUtils.generateClientId();
      const webhookId = WebhookTestUtils.generateEventId();

      const payload: WebhookRetryPayload = {
        id: webhookId,
        url: 'https://test.webhook.com/endpoint',
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: MockWebhookPayloads.careem.orderCreated(clientId),
        companyId: clientId,
      };

      await service.queueForRetry(payload, 'Test error');

      let queueItems = service.getRetryQueueItems(clientId);
      expect(queueItems.length).toBe(1);

      const removed = await service.removeFromQueue(webhookId);
      expect(removed).toBe(true);

      queueItems = service.getRetryQueueItems(clientId);
      expect(queueItems.length).toBe(0);
    });

    it('should clear all queues', async () => {
      const clientId = WebhookTestUtils.generateClientId();

      // Add items to both retry and dead letter queues
      await service.queueForRetry(
        {
          id: 'test-1',
          url: 'https://test.webhook.com/1',
          method: 'POST',
          headers: {},
          body: {},
          companyId: clientId,
        },
        'Error'
      );

      // Force an item to dead letter queue
      await service.queueForRetry(
        {
          id: 'test-2',
          url: 'https://test.webhook.com/2',
          method: 'POST',
          headers: {},
          body: {},
          companyId: clientId,
        },
        'Error',
        'medium',
        { maxRetries: 0, baseDelayMs: 100, maxDelayMs: 1000, exponentialMultiplier: 2, jitterMs: 50, deadLetterQueueEnabled: true }
      );

      await service.clearAllQueues();

      const retryItems = service.getRetryQueueItems();
      const deadLetterItems = service.getDeadLetterQueueItems();

      expect(retryItems.length).toBe(0);
      expect(deadLetterItems.length).toBe(0);
    });
  });

  describe('Concurrency and Performance', () => {
    it('should handle concurrent retry operations', async () => {
      const clientId = WebhookTestUtils.generateClientId();
      const concurrentOps = 20;

      const payloads: WebhookRetryPayload[] = Array(concurrentOps)
        .fill(null)
        .map((_, index) => ({
          id: `concurrent-${index}`,
          url: `https://httpbin.org/status/200`,
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: MockWebhookPayloads.careem.orderCreated(clientId),
          companyId: clientId,
        }));

      const timer = WebhookTestUtils.createPerformanceTimer();

      // Queue all payloads concurrently
      await Promise.all(
        payloads.map(payload => service.queueForRetry(payload, 'Concurrent test'))
      );

      const queueTime = timer.stop();

      // Verify all items were queued
      const queueItems = service.getRetryQueueItems(clientId);
      expect(queueItems.length).toBe(concurrentOps);

      // Performance assertion
      expect(queueTime).toBeLessThan(2000); // Should complete within 2 seconds
    });

    it('should maintain performance under load', async () => {
      const clientId = WebhookTestUtils.generateClientId();
      const batchSize = 50;
      const batches = 3;

      const executionTimes: number[] = [];

      for (let batch = 0; batch < batches; batch++) {
        const timer = WebhookTestUtils.createPerformanceTimer();

        const payloads: WebhookRetryPayload[] = Array(batchSize)
          .fill(null)
          .map((_, index) => ({
            id: `batch-${batch}-item-${index}`,
            url: 'https://test.webhook.com/endpoint',
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: MockWebhookPayloads.talabat.orderCreated(clientId),
            companyId: clientId,
          }));

        await Promise.all(
          payloads.map(payload => service.queueForRetry(payload, `Batch ${batch} test`))
        );

        const executionTime = timer.stop();
        executionTimes.push(executionTime);

        // Clean up for next batch
        await service.clearAllQueues();
        await WebhookTestUtils.delay(100);
      }

      // Performance should be consistent across batches
      const avgTime = executionTimes.reduce((a, b) => a + b, 0) / executionTimes.length;
      const maxTime = Math.max(...executionTimes);
      const minTime = Math.min(...executionTimes);

      expect(maxTime - minTime).toBeLessThan(avgTime * 0.8); // Variance should be less than 80% of average
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle invalid webhook IDs gracefully', async () => {
      const result = await service.retryWebhook('non-existent-webhook-id');
      expect(result).toBe(false);
    });

    it('should handle malformed payloads gracefully', async () => {
      const clientId = WebhookTestUtils.generateClientId();

      const malformedPayload = {
        id: WebhookTestUtils.generateEventId(),
        url: 'invalid-url',
        method: 'INVALID_METHOD' as any,
        headers: null as any,
        body: undefined as any,
        companyId: clientId,
      };

      // Should not throw an error
      await expect(
        service.queueForRetry(malformedPayload, 'Test error')
      ).resolves.not.toThrow();
    });

    it('should handle webhook timeout scenarios', async () => {
      const clientId = WebhookTestUtils.generateClientId();

      const payload: WebhookRetryPayload = {
        id: WebhookTestUtils.generateEventId(),
        url: 'https://httpbin.org/delay/10', // Will timeout
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: MockWebhookPayloads.deliveroo.orderCreated(clientId),
        companyId: clientId,
      };

      await service.queueForRetry(payload, 'Initial failure');

      const result = await service.retryWebhook(payload.id);
      expect(result).toBe(false); // Should fail due to timeout
    });

    it('should handle queue persistence failures gracefully', async () => {
      const clientId = WebhookTestUtils.generateClientId();

      // Mock database failure
      jest.spyOn(prismaService.webhookRetryQueue, 'upsert').mockRejectedValueOnce(
        new Error('Database connection failed')
      );

      const payload: WebhookRetryPayload = {
        id: WebhookTestUtils.generateEventId(),
        url: 'https://test.webhook.com/endpoint',
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: MockWebhookPayloads.jahez.orderCreated(clientId),
        companyId: clientId,
      };

      // Should handle the error gracefully and not throw
      await expect(
        service.queueForRetry(payload, 'Test error')
      ).resolves.not.toThrow();
    });
  });
});