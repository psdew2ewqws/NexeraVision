import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { WebhookService } from '../webhook.service';
import { WebhookValidationService } from '../webhook-validation.service';
import { WebhookRetryService } from '../webhook-retry.service';
import { PrismaService } from '../../../shared/services/prisma.service';
import { EventProvider, EventType } from '../dto/webhook-event.dto';
import { WebhookTestUtils } from './test-utils';
import { MockWebhookPayloads } from './mock-payloads';
import * as request from 'supertest';

describe('Webhook Performance Tests', () => {
  let app: INestApplication;
  let module: TestingModule;
  let webhookService: WebhookService;
  let webhookRetryService: WebhookRetryService;

  beforeAll(async () => {
    module = await WebhookTestUtils.createTestingModule();
    app = await WebhookTestUtils.createTestApp(module);

    webhookService = module.get<WebhookService>(WebhookService);
    webhookRetryService = module.get<WebhookRetryService>(WebhookRetryService);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    jest.clearAllMocks();
    await webhookRetryService.clearAllQueues();
  });

  describe('High Volume Load Tests', () => {
    it('should handle 1000 concurrent webhook requests', async () => {
      const clientId = WebhookTestUtils.generateClientId();
      const numRequests = 1000;
      const batchSize = 50; // Process in batches to avoid overwhelming the system

      const timer = WebhookTestUtils.createPerformanceTimer();
      const results: any[] = [];

      // Process requests in batches
      for (let batch = 0; batch < numRequests / batchSize; batch++) {
        const batchPromises = [];

        for (let i = 0; i < batchSize; i++) {
          const payload = MockWebhookPayloads.careem.orderCreated(clientId);
          const rawBody = JSON.stringify(payload);
          const secret = `careem_secret_key_${clientId}`;
          const signature = WebhookTestUtils.generateHmacSignature(rawBody, secret);

          batchPromises.push(
            request(app.getHttpServer())
              .post(`/webhooks/careem/${clientId}`)
              .set('x-careem-signature', signature)
              .set('content-type', 'application/json')
              .send(payload)
          );
        }

        const batchResults = await Promise.allSettled(batchPromises);
        results.push(...batchResults);

        // Small delay between batches to simulate realistic load
        await WebhookTestUtils.delay(10);
      }

      const executionTime = timer.stop();

      // Performance assertions
      expect(executionTime).toBeLessThan(30000); // Should complete within 30 seconds
      expect(results.length).toBe(numRequests);

      const successfulRequests = results.filter(
        result => result.status === 'fulfilled' && result.value.status === 200
      );

      const successRate = (successfulRequests.length / numRequests) * 100;
      expect(successRate).toBeGreaterThan(90); // 90% success rate minimum

      const avgResponseTime = executionTime / numRequests;
      expect(avgResponseTime).toBeLessThan(100); // Average response time under 100ms
    });

    it('should handle mixed provider webhook load', async () => {
      const clientId = WebhookTestUtils.generateClientId();
      const providersLoad = [
        { provider: EventProvider.CAREEM, count: 200 },
        { provider: EventProvider.TALABAT, count: 200 },
        { provider: EventProvider.DELIVEROO, count: 200 },
        { provider: EventProvider.JAHEZ, count: 200 },
      ];

      const timer = WebhookTestUtils.createPerformanceTimer();
      const allPromises: Promise<any>[] = [];

      for (const { provider, count } of providersLoad) {
        for (let i = 0; i < count; i++) {
          const payload = MockWebhookPayloads.getPayload(provider, EventType.ORDER_CREATED, clientId);
          const headers = WebhookTestUtils.createMockHeaders(provider, clientId);

          // Add signatures for providers that require them
          if (provider === EventProvider.CAREEM) {
            const rawBody = JSON.stringify(payload);
            const secret = `careem_secret_key_${clientId}`;
            headers['x-careem-signature'] = WebhookTestUtils.generateHmacSignature(rawBody, secret);
          } else if (provider === EventProvider.DELIVEROO) {
            const rawBody = JSON.stringify(payload);
            const secret = `deliveroo_secret_key_${clientId}`;
            headers['x-deliveroo-hmac-sha256'] = WebhookTestUtils.generateHmacSignatureBase64(rawBody, secret);
          }

          allPromises.push(
            request(app.getHttpServer())
              .post(`/webhooks/${provider}/${clientId}`)
              .set(headers)
              .set('content-type', 'application/json')
              .send(payload)
          );
        }
      }

      const results = await Promise.allSettled(allPromises);
      const executionTime = timer.stop();

      const totalRequests = providersLoad.reduce((sum, load) => sum + load.count, 0);
      const successfulRequests = results.filter(
        result => result.status === 'fulfilled' && result.value.status === 200
      );

      expect(results.length).toBe(totalRequests);
      expect(successfulRequests.length / totalRequests).toBeGreaterThan(0.85); // 85% success rate
      expect(executionTime).toBeLessThan(45000); // Should complete within 45 seconds
    });

    it('should maintain performance under sustained webhook traffic', async () => {
      const clientId = WebhookTestUtils.generateClientId();
      const duration = 30; // 30 seconds
      const requestsPerSecond = 20;
      const totalRequests = duration * requestsPerSecond;

      const startTime = Date.now();
      const results: any[] = [];
      let requestCount = 0;

      const sendWebhookRequest = async () => {
        const payload = MockWebhookPayloads.talabat.orderCreated(clientId);

        const response = await request(app.getHttpServer())
          .post(`/webhooks/talabat/${clientId}`)
          .set('x-talabat-api-key', `talabat_api_key_${clientId}`)
          .set('content-type', 'application/json')
          .send(payload);

        return response;
      };

      // Send requests at a steady rate
      const interval = setInterval(async () => {
        if (requestCount >= totalRequests) {
          clearInterval(interval);
          return;
        }

        const batchPromises = [];
        for (let i = 0; i < requestsPerSecond && requestCount < totalRequests; i++) {
          batchPromises.push(sendWebhookRequest());
          requestCount++;
        }

        const batchResults = await Promise.allSettled(batchPromises);
        results.push(...batchResults);
      }, 1000);

      // Wait for all requests to complete
      await new Promise(resolve => {
        const checkComplete = () => {
          if (results.length >= totalRequests) {
            resolve(true);
          } else {
            setTimeout(checkComplete, 100);
          }
        };
        checkComplete();
      });

      const actualDuration = Date.now() - startTime;

      // Performance assertions
      expect(results.length).toBe(totalRequests);
      expect(actualDuration).toBeLessThan((duration + 5) * 1000); // Allow 5 second buffer

      const successfulRequests = results.filter(
        result => result.status === 'fulfilled' && result.value.status === 200
      );
      expect(successfulRequests.length / totalRequests).toBeGreaterThan(0.90); // 90% success rate
    });
  });

  describe('Memory and Resource Usage Tests', () => {
    it('should not leak memory during high volume processing', async () => {
      const clientId = WebhookTestUtils.generateClientId();
      const numIterations = 10;
      const requestsPerIteration = 100;

      const initialMemory = process.memoryUsage();
      const memorySnapshots: NodeJS.MemoryUsage[] = [initialMemory];

      for (let iteration = 0; iteration < numIterations; iteration++) {
        const promises = [];

        for (let i = 0; i < requestsPerIteration; i++) {
          const payload = MockWebhookPayloads.deliveroo.orderCreated(clientId);
          const rawBody = JSON.stringify(payload);
          const secret = `deliveroo_secret_key_${clientId}`;
          const signature = WebhookTestUtils.generateHmacSignatureBase64(rawBody, secret);

          promises.push(
            request(app.getHttpServer())
              .post(`/webhooks/deliveroo/${clientId}`)
              .set('x-deliveroo-hmac-sha256', signature)
              .set('content-type', 'application/json')
              .send(payload)
          );
        }

        await Promise.all(promises);

        // Force garbage collection if available
        if (global.gc) {
          global.gc();
        }

        memorySnapshots.push(process.memoryUsage());

        // Small delay between iterations
        await WebhookTestUtils.delay(100);
      }

      const finalMemory = memorySnapshots[memorySnapshots.length - 1];
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;

      // Memory increase should be reasonable (less than 100MB)
      expect(memoryIncrease).toBeLessThan(100 * 1024 * 1024);

      // Check for consistent memory pattern (no significant growth trend)
      const midPointMemory = memorySnapshots[Math.floor(numIterations / 2)];
      const midToEndIncrease = finalMemory.heapUsed - midPointMemory.heapUsed;

      // Memory shouldn't continue growing significantly in second half
      expect(midToEndIncrease).toBeLessThan(50 * 1024 * 1024);
    });

    it('should handle large payload sizes efficiently', async () => {
      const clientId = WebhookTestUtils.generateClientId();
      const payloadSizes = [
        { name: 'small', size: 1 * 1024 }, // 1KB
        { name: 'medium', size: 100 * 1024 }, // 100KB
        { name: 'large', size: 1024 * 1024 }, // 1MB
      ];

      const results: Record<string, { time: number; success: boolean }> = {};

      for (const { name, size } of payloadSizes) {
        const payload = MockWebhookPayloads.jahez.orderCreated(clientId);

        // Add large data field
        payload.data.largeField = 'x'.repeat(size);

        const timer = WebhookTestUtils.createPerformanceTimer();

        try {
          const response = await request(app.getHttpServer())
            .post(`/webhooks/jahez/${clientId}`)
            .set('authorization', `Bearer jahez_bearer_token_${clientId}`)
            .set('content-type', 'application/json')
            .send(payload)
            .timeout(30000); // 30 second timeout

          const executionTime = timer.stop();
          results[name] = {
            time: executionTime,
            success: response.status === 200,
          };
        } catch (error) {
          const executionTime = timer.stop();
          results[name] = {
            time: executionTime,
            success: false,
          };
        }
      }

      // Verify that processing time scales reasonably with payload size
      expect(results.small.success).toBe(true);
      expect(results.medium.success).toBe(true);

      // Large payloads might be rejected, but should fail gracefully
      if (!results.large.success) {
        expect(results.large.time).toBeLessThan(5000); // Should fail quickly, not timeout
      }

      // Processing time should increase reasonably with size
      expect(results.medium.time).toBeGreaterThan(results.small.time);
    });
  });

  describe('Retry Queue Performance Tests', () => {
    it('should handle high volume retry queue operations', async () => {
      const clientId = WebhookTestUtils.generateClientId();
      const numWebhooks = 500;

      const timer = WebhookTestUtils.createPerformanceTimer();

      // Queue many webhooks for retry
      const queuePromises = Array(numWebhooks).fill(null).map((_, index) => {
        const payload = {
          id: `bulk-webhook-${index}`,
          url: 'https://httpbin.org/status/500',
          method: 'POST' as const,
          headers: { 'content-type': 'application/json' },
          body: MockWebhookPayloads.careem.orderCreated(clientId),
          companyId: clientId,
        };

        return webhookRetryService.queueForRetry(payload, `Bulk test failure ${index}`);
      });

      await Promise.all(queuePromises);
      const queueTime = timer.stop();

      // Verify all items were queued
      const queueItems = webhookRetryService.getRetryQueueItems(clientId);
      expect(queueItems.length).toBe(numWebhooks);

      // Performance assertions
      expect(queueTime).toBeLessThan(10000); // Should complete within 10 seconds
      expect(queueTime / numWebhooks).toBeLessThan(50); // Average under 50ms per item

      // Test batch retry operations
      const retryTimer = WebhookTestUtils.createPerformanceTimer();

      const retryPromises = queueItems.slice(0, 50).map(item =>
        webhookRetryService.retryWebhook(item.id)
      );

      await Promise.allSettled(retryPromises);
      const retryTime = retryTimer.stop();

      expect(retryTime).toBeLessThan(30000); // Should complete within 30 seconds
    });

    it('should maintain queue performance under concurrent access', async () => {
      const numClients = 10;
      const webhooksPerClient = 50;

      const timer = WebhookTestUtils.createPerformanceTimer();

      const clientOperations = Array(numClients).fill(null).map(async (_, clientIndex) => {
        const clientId = `client-${clientIndex}`;

        const operations = Array(webhooksPerClient).fill(null).map(async (_, webhookIndex) => {
          const payload = {
            id: `client-${clientIndex}-webhook-${webhookIndex}`,
            url: 'https://test.webhook.com/endpoint',
            method: 'POST' as const,
            headers: { 'content-type': 'application/json' },
            body: MockWebhookPayloads.talabat.orderCreated(clientId),
            companyId: clientId,
          };

          // Mix of operations: queue, retry, remove
          const operation = webhookIndex % 3;

          if (operation === 0) {
            return webhookRetryService.queueForRetry(payload, 'Concurrent test');
          } else if (operation === 1) {
            await webhookRetryService.queueForRetry(payload, 'Concurrent test');
            return webhookRetryService.retryWebhook(payload.id);
          } else {
            await webhookRetryService.queueForRetry(payload, 'Concurrent test');
            return webhookRetryService.removeFromQueue(payload.id);
          }
        });

        return Promise.all(operations);
      });

      await Promise.all(clientOperations);
      const executionTime = timer.stop();

      const totalOperations = numClients * webhooksPerClient;
      expect(executionTime).toBeLessThan(20000); // Should complete within 20 seconds
      expect(executionTime / totalOperations).toBeLessThan(100); // Average under 100ms per operation

      // Verify system stability
      const stats = webhookRetryService.getRetryStats();
      expect(typeof stats.totalQueued).toBe('number');
      expect(stats.totalQueued).toBeGreaterThanOrEqual(0);
    });

    it('should efficiently process retry queue at scale', async () => {
      const clientId = WebhookTestUtils.generateClientId();
      const numItems = 200;

      // Queue items with immediate retry times
      const queuePromises = Array(numItems).fill(null).map((_, index) => {
        const payload = {
          id: `queue-process-${index}`,
          url: index % 2 === 0 ? 'https://httpbin.org/status/200' : 'https://httpbin.org/status/500',
          method: 'POST' as const,
          headers: { 'content-type': 'application/json' },
          body: MockWebhookPayloads.deliveroo.orderCreated(clientId),
          companyId: clientId,
        };

        return webhookRetryService.queueForRetry(payload, 'Queue processing test', 'medium', {
          maxRetries: 2,
          baseDelayMs: 100,
          maxDelayMs: 1000,
          exponentialMultiplier: 2,
          jitterMs: 50,
          deadLetterQueueEnabled: true,
        });
      });

      await Promise.all(queuePromises);

      const timer = WebhookTestUtils.createPerformanceTimer();

      // Simulate queue processing
      await webhookRetryService.processRetryQueue();

      const processingTime = timer.stop();

      expect(processingTime).toBeLessThan(60000); // Should complete within 60 seconds

      const stats = webhookRetryService.getRetryStats();
      expect(stats.totalSuccessful + stats.totalFailed).toBeGreaterThan(0);
    });
  });

  describe('Stress Tests', () => {
    it('should handle webhook bursts without degradation', async () => {
      const clientId = WebhookTestUtils.generateClientId();
      const burstSizes = [10, 50, 100, 200];
      const burstResults: Record<number, { time: number; successRate: number }> = {};

      for (const burstSize of burstSizes) {
        const timer = WebhookTestUtils.createPerformanceTimer();

        const promises = Array(burstSize).fill(null).map(() => {
          const payload = MockWebhookPayloads.careem.orderCreated(clientId);
          const rawBody = JSON.stringify(payload);
          const secret = `careem_secret_key_${clientId}`;
          const signature = WebhookTestUtils.generateHmacSignature(rawBody, secret);

          return request(app.getHttpServer())
            .post(`/webhooks/careem/${clientId}`)
            .set('x-careem-signature', signature)
            .set('content-type', 'application/json')
            .send(payload);
        });

        const results = await Promise.allSettled(promises);
        const executionTime = timer.stop();

        const successfulRequests = results.filter(
          result => result.status === 'fulfilled' && result.value.status === 200
        );

        burstResults[burstSize] = {
          time: executionTime,
          successRate: successfulRequests.length / burstSize,
        };

        // Small delay between bursts
        await WebhookTestUtils.delay(1000);
      }

      // Verify that performance doesn't degrade significantly with burst size
      for (const burstSize of burstSizes) {
        expect(burstResults[burstSize].successRate).toBeGreaterThan(0.85); // 85% success rate
        expect(burstResults[burstSize].time / burstSize).toBeLessThan(200); // Average under 200ms per request
      }

      // Performance should scale roughly linearly
      const ratio100to10 = burstResults[100].time / burstResults[10].time;
      expect(ratio100to10).toBeLessThan(15); // Shouldn't be more than 15x slower for 10x the load
    });

    it('should recover gracefully from simulated failures', async () => {
      const clientId = WebhookTestUtils.generateClientId();

      // Send successful requests
      const successPromises = Array(50).fill(null).map(() => {
        const payload = MockWebhookPayloads.talabat.orderCreated(clientId);

        return request(app.getHttpServer())
          .post(`/webhooks/talabat/${clientId}`)
          .set('x-talabat-api-key', `talabat_api_key_${clientId}`)
          .set('content-type', 'application/json')
          .send(payload);
      });

      // Send failing requests (invalid signatures)
      const failPromises = Array(50).fill(null).map(() => {
        const payload = MockWebhookPayloads.careem.orderCreated(clientId);

        return request(app.getHttpServer())
          .post(`/webhooks/careem/${clientId}`)
          .set('x-careem-signature', 'invalid_signature')
          .set('content-type', 'application/json')
          .send(payload);
      });

      const timer = WebhookTestUtils.createPerformanceTimer();

      const [successResults, failResults] = await Promise.all([
        Promise.allSettled(successPromises),
        Promise.allSettled(failPromises),
      ]);

      const executionTime = timer.stop();

      // Verify system handles mixed success/failure gracefully
      const successfulRequests = successResults.filter(
        result => result.status === 'fulfilled' && result.value.status === 200
      );

      const failedRequests = failResults.filter(
        result => result.status === 'fulfilled' && result.value.status === 401
      );

      expect(successfulRequests.length).toBe(50); // All valid requests should succeed
      expect(failedRequests.length).toBe(50); // All invalid requests should fail with 401
      expect(executionTime).toBeLessThan(15000); // Should complete within 15 seconds

      // System should still be responsive after mixed load
      const healthCheckPayload = MockWebhookPayloads.deliveroo.connectionTest(clientId);
      const rawBody = JSON.stringify(healthCheckPayload);
      const secret = `deliveroo_secret_key_${clientId}`;
      const signature = WebhookTestUtils.generateHmacSignatureBase64(rawBody, secret);

      const healthResponse = await request(app.getHttpServer())
        .post(`/webhooks/deliveroo/${clientId}`)
        .set('x-deliveroo-hmac-sha256', signature)
        .set('content-type', 'application/json')
        .send(healthCheckPayload);

      expect(healthResponse.status).toBe(200);
    });
  });
});