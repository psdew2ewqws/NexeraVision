import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { WebhookService } from '../webhook.service';
import { WebhookValidationService } from '../webhook-validation.service';
import { WebhookRetryService } from '../webhook-retry.service';
import { PrismaService } from '../../../shared/services/prisma.service';
import { EventProvider, EventType, OrderStatus } from '../dto/webhook-event.dto';
import { WebhookTestUtils } from './test-utils';
import { MockWebhookPayloads } from './mock-payloads';
import * as request from 'supertest';
import * as crypto from 'crypto';

describe('WebhookModule', () => {
  let app: INestApplication;
  let module: TestingModule;
  let webhookService: WebhookService;
  let webhookValidationService: WebhookValidationService;
  let webhookRetryService: WebhookRetryService;
  let prismaService: PrismaService;

  beforeAll(async () => {
    // Validate test environment
    if (!WebhookTestUtils.validateTestEnvironment()) {
      throw new Error('Test environment not properly configured');
    }

    module = await WebhookTestUtils.createTestingModule();
    app = await WebhookTestUtils.createTestApp(module);

    webhookService = module.get<WebhookService>(WebhookService);
    webhookValidationService = module.get<WebhookValidationService>(WebhookValidationService);
    webhookRetryService = module.get<WebhookRetryService>(WebhookRetryService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  afterAll(async () => {
    await WebhookTestUtils.cleanupTestData(prismaService);
    await app.close();
  });

  beforeEach(async () => {
    jest.clearAllMocks();
  });

  describe('WebhookValidationService', () => {
    describe('validateCareemWebhook', () => {
      it('should validate Careem webhook with correct signature', async () => {
        const clientId = WebhookTestUtils.generateClientId();
        const payload = MockWebhookPayloads.careem.orderCreated(clientId);
        const rawBody = Buffer.from(JSON.stringify(payload));
        const secret = `careem_secret_key_${clientId}`;
        const signature = WebhookTestUtils.generateHmacSignature(
          rawBody.toString(),
          secret
        );

        const headers = {
          'x-careem-signature': signature,
          'content-type': 'application/json'
        };

        const result = await webhookValidationService.validateCareemWebhook(
          clientId,
          headers,
          rawBody
        );

        expect(result).toBe(true);
      });

      it('should reject Careem webhook with invalid signature', async () => {
        const clientId = WebhookTestUtils.generateClientId();
        const payload = MockWebhookPayloads.careem.orderCreated(clientId);
        const rawBody = Buffer.from(JSON.stringify(payload));

        const headers = {
          'x-careem-signature': 'invalid_signature',
          'content-type': 'application/json'
        };

        const result = await webhookValidationService.validateCareemWebhook(
          clientId,
          headers,
          rawBody
        );

        expect(result).toBe(false);
      });

      it('should reject Careem webhook without signature header', async () => {
        const clientId = WebhookTestUtils.generateClientId();
        const payload = MockWebhookPayloads.careem.orderCreated(clientId);
        const rawBody = Buffer.from(JSON.stringify(payload));

        const headers = {
          'content-type': 'application/json'
        };

        const result = await webhookValidationService.validateCareemWebhook(
          clientId,
          headers,
          rawBody
        );

        expect(result).toBe(false);
      });
    });

    describe('validateTalabatWebhook', () => {
      it('should validate Talabat webhook with correct API key', async () => {
        const clientId = WebhookTestUtils.generateClientId();
        const payload = MockWebhookPayloads.talabat.orderCreated(clientId);

        const headers = {
          'x-talabat-api-key': `talabat_api_key_${clientId}`,
          'content-type': 'application/json'
        };

        const result = await webhookValidationService.validateTalabatWebhook(
          clientId,
          headers,
          payload
        );

        expect(result).toBe(true);
      });

      it('should reject Talabat webhook with invalid API key', async () => {
        const clientId = WebhookTestUtils.generateClientId();
        const payload = MockWebhookPayloads.talabat.orderCreated(clientId);

        const headers = {
          'x-talabat-api-key': 'invalid_api_key',
          'content-type': 'application/json'
        };

        const result = await webhookValidationService.validateTalabatWebhook(
          clientId,
          headers,
          payload
        );

        expect(result).toBe(false);
      });

      it('should reject Talabat webhook with old timestamp', async () => {
        const clientId = WebhookTestUtils.generateClientId();
        const payload = MockWebhookPayloads.talabat.orderCreated(clientId);

        // Set timestamp to 10 minutes ago (should be rejected)
        payload.timestamp = new Date(Date.now() - 10 * 60 * 1000).toISOString();

        const headers = {
          'x-talabat-api-key': `talabat_api_key_${clientId}`,
          'content-type': 'application/json'
        };

        const result = await webhookValidationService.validateTalabatWebhook(
          clientId,
          headers,
          payload
        );

        expect(result).toBe(false);
      });
    });

    describe('validateDeliverooWebhook', () => {
      it('should validate Deliveroo webhook with correct signature', async () => {
        const clientId = WebhookTestUtils.generateClientId();
        const payload = MockWebhookPayloads.deliveroo.orderCreated(clientId);
        const rawBody = Buffer.from(JSON.stringify(payload));
        const secret = `deliveroo_secret_key_${clientId}`;
        const signature = WebhookTestUtils.generateHmacSignatureBase64(
          rawBody.toString(),
          secret
        );

        const headers = {
          'x-deliveroo-hmac-sha256': signature,
          'content-type': 'application/json'
        };

        const result = await webhookValidationService.validateDeliverooWebhook(
          clientId,
          headers,
          rawBody
        );

        expect(result).toBe(true);
      });

      it('should reject Deliveroo webhook with invalid signature', async () => {
        const clientId = WebhookTestUtils.generateClientId();
        const payload = MockWebhookPayloads.deliveroo.orderCreated(clientId);
        const rawBody = Buffer.from(JSON.stringify(payload));

        const headers = {
          'x-deliveroo-hmac-sha256': 'invalid_signature',
          'content-type': 'application/json'
        };

        const result = await webhookValidationService.validateDeliverooWebhook(
          clientId,
          headers,
          rawBody
        );

        expect(result).toBe(false);
      });
    });

    describe('validateJahezWebhook', () => {
      it('should validate Jahez webhook with correct bearer token', async () => {
        const clientId = WebhookTestUtils.generateClientId();
        const payload = MockWebhookPayloads.jahez.orderCreated(clientId);

        const headers = {
          'authorization': `Bearer jahez_bearer_token_${clientId}`,
          'content-type': 'application/json'
        };

        const result = await webhookValidationService.validateJahezWebhook(
          clientId,
          headers,
          payload
        );

        expect(result).toBe(true);
      });

      it('should reject Jahez webhook with invalid token', async () => {
        const clientId = WebhookTestUtils.generateClientId();
        const payload = MockWebhookPayloads.jahez.orderCreated(clientId);

        const headers = {
          'authorization': 'Bearer invalid_token',
          'content-type': 'application/json'
        };

        const result = await webhookValidationService.validateJahezWebhook(
          clientId,
          headers,
          payload
        );

        expect(result).toBe(false);
      });

      it('should reject Jahez webhook without authorization header', async () => {
        const clientId = WebhookTestUtils.generateClientId();
        const payload = MockWebhookPayloads.jahez.orderCreated(clientId);

        const headers = {
          'content-type': 'application/json'
        };

        const result = await webhookValidationService.validateJahezWebhook(
          clientId,
          headers,
          payload
        );

        expect(result).toBe(false);
      });
    });

    describe('Rate Limiting', () => {
      it('should respect rate limits', async () => {
        const clientId = WebhookTestUtils.generateClientId();

        const result = await webhookValidationService.checkRateLimit(
          clientId,
          EventProvider.CAREEM
        );

        expect(result).toBe(true);
      });
    });

    describe('IP Validation', () => {
      it('should validate IP addresses', async () => {
        const clientId = WebhookTestUtils.generateClientId();

        const result = await webhookValidationService.validateIpAddress(
          clientId,
          EventProvider.CAREEM,
          '127.0.0.1'
        );

        expect(result).toBe(true);
      });
    });
  });

  describe('WebhookRetryService', () => {
    describe('queueForRetry', () => {
      it('should queue webhook for retry with exponential backoff', async () => {
        const clientId = WebhookTestUtils.generateClientId();
        const payload = {
          id: WebhookTestUtils.generateEventId(),
          url: 'https://test.webhook.com/endpoint',
          method: 'POST' as const,
          headers: { 'content-type': 'application/json' },
          body: MockWebhookPayloads.careem.orderCreated(clientId),
          companyId: clientId
        };

        await webhookRetryService.queueForRetry(payload, 'Connection timeout');

        const stats = webhookRetryService.getRetryStats();
        expect(stats.totalQueued).toBeGreaterThan(0);
      });

      it('should move to dead letter queue after max retries', async () => {
        const clientId = WebhookTestUtils.generateClientId();
        const payload = {
          id: WebhookTestUtils.generateEventId(),
          url: 'https://test.webhook.com/endpoint',
          method: 'POST' as const,
          headers: { 'content-type': 'application/json' },
          body: MockWebhookPayloads.careem.orderCreated(clientId),
          companyId: clientId
        };

        const config = {
          maxRetries: 1,
          baseDelayMs: 100,
          maxDelayMs: 1000,
          exponentialMultiplier: 2,
          jitterMs: 50,
          deadLetterQueueEnabled: true
        };

        // Queue for first retry
        await webhookRetryService.queueForRetry(payload, 'Error 1', 'medium', config);

        // Queue for second retry (should exceed max retries)
        await webhookRetryService.queueForRetry(payload, 'Error 2', 'medium', config);

        const deadLetterItems = webhookRetryService.getDeadLetterQueueItems(clientId);
        expect(deadLetterItems.length).toBeGreaterThan(0);
      });

      it('should prioritize high priority webhooks', async () => {
        const clientId = WebhookTestUtils.generateClientId();

        const lowPriorityPayload = {
          id: WebhookTestUtils.generateEventId(),
          url: 'https://test.webhook.com/low',
          method: 'POST' as const,
          headers: { 'content-type': 'application/json' },
          body: MockWebhookPayloads.careem.orderCreated(clientId),
          companyId: clientId
        };

        const highPriorityPayload = {
          id: WebhookTestUtils.generateEventId(),
          url: 'https://test.webhook.com/high',
          method: 'POST' as const,
          headers: { 'content-type': 'application/json' },
          body: MockWebhookPayloads.careem.orderCreated(clientId),
          companyId: clientId
        };

        await webhookRetryService.queueForRetry(lowPriorityPayload, 'Error', 'low');
        await webhookRetryService.queueForRetry(highPriorityPayload, 'Error', 'high');

        const queueItems = webhookRetryService.getRetryQueueItems(clientId);
        expect(queueItems.length).toBe(2);
      });
    });

    describe('retryWebhook', () => {
      it('should retry webhook and return success', async () => {
        const clientId = WebhookTestUtils.generateClientId();
        const webhookId = WebhookTestUtils.generateEventId();

        const payload = {
          id: webhookId,
          url: 'https://httpbin.org/status/200',
          method: 'POST' as const,
          headers: { 'content-type': 'application/json' },
          body: MockWebhookPayloads.careem.orderCreated(clientId),
          companyId: clientId
        };

        await webhookRetryService.queueForRetry(payload);

        const result = await webhookRetryService.retryWebhook(webhookId);
        expect(result).toBe(true);
      });

      it('should handle retry failure gracefully', async () => {
        const clientId = WebhookTestUtils.generateClientId();
        const webhookId = WebhookTestUtils.generateEventId();

        const payload = {
          id: webhookId,
          url: 'https://httpbin.org/status/500',
          method: 'POST' as const,
          headers: { 'content-type': 'application/json' },
          body: MockWebhookPayloads.careem.orderCreated(clientId),
          companyId: clientId
        };

        await webhookRetryService.queueForRetry(payload);

        const result = await webhookRetryService.retryWebhook(webhookId);
        expect(result).toBe(false);
      });
    });

    describe('getRetryStats', () => {
      it('should return accurate retry statistics', async () => {
        const stats = webhookRetryService.getRetryStats();

        expect(stats).toHaveProperty('totalQueued');
        expect(stats).toHaveProperty('totalRetrying');
        expect(stats).toHaveProperty('totalSuccessful');
        expect(stats).toHaveProperty('totalFailed');
        expect(stats).toHaveProperty('totalDeadLettered');
        expect(typeof stats.totalQueued).toBe('number');
      });
    });

    describe('Queue Management', () => {
      it('should remove webhook from retry queue', async () => {
        const clientId = WebhookTestUtils.generateClientId();
        const webhookId = WebhookTestUtils.generateEventId();

        const payload = {
          id: webhookId,
          url: 'https://test.webhook.com/endpoint',
          method: 'POST' as const,
          headers: { 'content-type': 'application/json' },
          body: MockWebhookPayloads.careem.orderCreated(clientId),
          companyId: clientId
        };

        await webhookRetryService.queueForRetry(payload);

        const removed = await webhookRetryService.removeFromQueue(webhookId);
        expect(removed).toBe(true);
      });

      it('should clear all queues', async () => {
        await webhookRetryService.clearAllQueues();

        const stats = webhookRetryService.getRetryStats();
        expect(stats.totalQueued).toBe(0);
        expect(stats.totalDeadLettered).toBe(0);
      });
    });
  });

  describe('WebhookService', () => {
    describe('registerWebhook', () => {
      it('should register webhook successfully', async () => {
        const registerDto = {
          clientId: WebhookTestUtils.generateClientId(),
          provider: EventProvider.CAREEM,
          url: 'https://test.webhook.com/careem',
          events: [EventType.ORDER_CREATED, EventType.ORDER_UPDATED]
        };

        const result = await webhookService.registerWebhook(registerDto);

        expect(result).toHaveProperty('webhookId');
        expect(result).toHaveProperty('url');
        expect(result).toHaveProperty('secretKey');
        expect(result.status).toBe('active');
      });
    });

    describe('getWebhookLogs', () => {
      it('should return webhook logs with pagination', async () => {
        const filters = {
          provider: EventProvider.CAREEM,
          limit: 10,
          offset: 0
        };

        const result = await webhookService.getWebhookLogs(filters);

        expect(result).toHaveProperty('logs');
        expect(result).toHaveProperty('total');
        expect(result).toHaveProperty('limit');
        expect(result).toHaveProperty('offset');
        expect(Array.isArray(result.logs)).toBe(true);
      });

      it('should filter logs by provider', async () => {
        const filters = {
          provider: EventProvider.TALABAT,
          limit: 5,
          offset: 0
        };

        const result = await webhookService.getWebhookLogs(filters);

        expect(result.logs.every(log => log.provider === EventProvider.TALABAT)).toBe(true);
      });
    });

    describe('getWebhookStats', () => {
      it('should return comprehensive webhook statistics', async () => {
        const params = {
          period: 'last_24_hours'
        };

        const result = await webhookService.getWebhookStats(params);

        expect(result).toHaveProperty('total');
        expect(result).toHaveProperty('successful');
        expect(result).toHaveProperty('failed');
        expect(result).toHaveProperty('pending');
        expect(result).toHaveProperty('avgResponseTime');
        expect(result).toHaveProperty('providers');
        expect(result).toHaveProperty('recentEvents');
      });

      it('should return provider-specific stats', async () => {
        const params = {
          provider: EventProvider.CAREEM,
          period: 'last_7_days'
        };

        const result = await webhookService.getWebhookStats(params);

        expect(result).toHaveProperty('total');
        expect(result).toHaveProperty('successful');
        expect(result).toHaveProperty('failed');
      });
    });

    describe('retryWebhook', () => {
      it('should retry webhook and return success response', async () => {
        const logId = WebhookTestUtils.generateEventId();

        const result = await webhookService.retryWebhook(logId);

        expect(result).toHaveProperty('success');
        expect(result).toHaveProperty('message');
        expect(result).toHaveProperty('logId');
        expect(result.logId).toBe(logId);
      });
    });

    describe('getWebhookConfig', () => {
      it('should return webhook configuration for client', async () => {
        const clientId = WebhookTestUtils.generateClientId();

        const result = await webhookService.getWebhookConfig(clientId);

        expect(result).toHaveProperty('clientId');
        expect(result).toHaveProperty('webhooks');
        expect(result).toHaveProperty('retryPolicy');
        expect(result).toHaveProperty('security');
        expect(Array.isArray(result.webhooks)).toBe(true);
      });
    });

    describe('updateWebhookConfig', () => {
      it('should update webhook configuration successfully', async () => {
        const clientId = WebhookTestUtils.generateClientId();
        const config = {
          retryPolicy: {
            maxRetries: 5,
            retryDelays: [1000, 2000, 4000, 8000, 16000]
          }
        };

        const result = await webhookService.updateWebhookConfig(clientId, config);

        expect(result).toHaveProperty('success');
        expect(result).toHaveProperty('message');
        expect(result).toHaveProperty('clientId');
        expect(result).toHaveProperty('updatedAt');
        expect(result.success).toBe(true);
      });
    });

    describe('deleteWebhook', () => {
      it('should delete webhook successfully', async () => {
        const webhookId = WebhookTestUtils.generateEventId();

        const result = await webhookService.deleteWebhook(webhookId);

        expect(result).toHaveProperty('success');
        expect(result).toHaveProperty('message');
        expect(result).toHaveProperty('webhookId');
        expect(result).toHaveProperty('deletedAt');
        expect(result.success).toBe(true);
      });
    });
  });

  describe('Integration Tests', () => {
    describe('Webhook Endpoints', () => {
      it('should handle valid Careem webhook', async () => {
        const clientId = WebhookTestUtils.generateClientId();
        const payload = MockWebhookPayloads.careem.orderCreated(clientId);
        const rawBody = JSON.stringify(payload);
        const secret = `careem_secret_key_${clientId}`;
        const signature = WebhookTestUtils.generateHmacSignature(rawBody, secret);

        const response = await request(app.getHttpServer())
          .post(`/webhooks/careem/${clientId}`)
          .set('x-careem-signature', signature)
          .set('content-type', 'application/json')
          .send(payload)
          .expect(200);

        expect(WebhookTestUtils.validateWebhookResponse(response.body)).toBe(true);
        expect(response.body.success).toBe(true);
      });

      it('should reject Careem webhook with invalid signature', async () => {
        const clientId = WebhookTestUtils.generateClientId();
        const payload = MockWebhookPayloads.careem.orderCreated(clientId);

        const response = await request(app.getHttpServer())
          .post(`/webhooks/careem/${clientId}`)
          .set('x-careem-signature', 'invalid_signature')
          .set('content-type', 'application/json')
          .send(payload)
          .expect(401);

        expect(response.body.success).toBe(false);
      });

      it('should handle valid Talabat webhook', async () => {
        const clientId = WebhookTestUtils.generateClientId();
        const payload = MockWebhookPayloads.talabat.orderCreated(clientId);

        const response = await request(app.getHttpServer())
          .post(`/webhooks/talabat/${clientId}`)
          .set('x-talabat-api-key', `talabat_api_key_${clientId}`)
          .set('content-type', 'application/json')
          .send(payload)
          .expect(200);

        expect(WebhookTestUtils.validateWebhookResponse(response.body)).toBe(true);
        expect(response.body.success).toBe(true);
      });

      it('should handle valid Deliveroo webhook', async () => {
        const clientId = WebhookTestUtils.generateClientId();
        const payload = MockWebhookPayloads.deliveroo.orderCreated(clientId);
        const rawBody = JSON.stringify(payload);
        const secret = `deliveroo_secret_key_${clientId}`;
        const signature = WebhookTestUtils.generateHmacSignatureBase64(rawBody, secret);

        const response = await request(app.getHttpServer())
          .post(`/webhooks/deliveroo/${clientId}`)
          .set('x-deliveroo-hmac-sha256', signature)
          .set('content-type', 'application/json')
          .send(payload)
          .expect(200);

        expect(WebhookTestUtils.validateWebhookResponse(response.body)).toBe(true);
        expect(response.body.success).toBe(true);
      });

      it('should handle valid Jahez webhook', async () => {
        const clientId = WebhookTestUtils.generateClientId();
        const payload = MockWebhookPayloads.jahez.orderCreated(clientId);

        const response = await request(app.getHttpServer())
          .post(`/webhooks/jahez/${clientId}`)
          .set('authorization', `Bearer jahez_bearer_token_${clientId}`)
          .set('content-type', 'application/json')
          .send(payload)
          .expect(200);

        expect(WebhookTestUtils.validateWebhookResponse(response.body)).toBe(true);
        expect(response.body.success).toBe(true);
      });

      it('should handle malformed JSON gracefully', async () => {
        const clientId = WebhookTestUtils.generateClientId();

        const response = await request(app.getHttpServer())
          .post(`/webhooks/careem/${clientId}`)
          .set('content-type', 'application/json')
          .send('{"invalid": json}')
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.message).toContain('Invalid JSON');
      });

      it('should validate webhook event structure', async () => {
        const clientId = WebhookTestUtils.generateClientId();
        const invalidPayload = {
          // Missing required fields
          eventType: EventType.ORDER_CREATED,
          provider: EventProvider.CAREEM
        };

        const response = await request(app.getHttpServer())
          .post(`/webhooks/careem/${clientId}`)
          .set('content-type', 'application/json')
          .send(invalidPayload)
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.errors).toBeDefined();
      });
    });

    describe('Rate Limiting', () => {
      it('should enforce rate limits', async () => {
        const clientId = WebhookTestUtils.generateClientId();
        const payload = MockWebhookPayloads.careem.orderCreated(clientId);
        const rawBody = JSON.stringify(payload);
        const secret = `careem_secret_key_${clientId}`;
        const signature = WebhookTestUtils.generateHmacSignature(rawBody, secret);

        // Configure aggressive rate limiting for test
        const config = WebhookTestUtils.getTestConfig('ratelimit');

        // Send multiple requests rapidly
        const promises = Array(5).fill(null).map(() =>
          request(app.getHttpServer())
            .post(`/webhooks/careem/${clientId}`)
            .set('x-careem-signature', signature)
            .set('content-type', 'application/json')
            .send(payload)
        );

        const responses = await Promise.all(promises);

        // At least one should be rate limited
        const rateLimitedResponses = responses.filter(r => r.status === 429);
        expect(rateLimitedResponses.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Performance Tests', () => {
    describe('High Volume Scenarios', () => {
      it('should handle burst of webhooks efficiently', async () => {
        const clientId = WebhookTestUtils.generateClientId();
        const batchSize = 50;
        const payloads = MockWebhookPayloads.generateBatchPayloads(
          EventProvider.CAREEM,
          EventType.ORDER_CREATED,
          batchSize,
          clientId
        );

        const timer = WebhookTestUtils.createPerformanceTimer();

        const promises = payloads.map(payload => {
          const rawBody = JSON.stringify(payload);
          const secret = `careem_secret_key_${clientId}`;
          const signature = WebhookTestUtils.generateHmacSignature(rawBody, secret);

          return request(app.getHttpServer())
            .post(`/webhooks/careem/${clientId}`)
            .set('x-careem-signature', signature)
            .set('content-type', 'application/json')
            .send(payload);
        });

        const responses = await Promise.all(promises);
        const executionTime = timer.stop();

        // Performance assertions
        expect(executionTime).toBeLessThan(5000); // Should complete within 5 seconds
        expect(responses.length).toBe(batchSize);

        const successfulResponses = responses.filter(r => r.status === 200);
        expect(successfulResponses.length).toBeGreaterThan(batchSize * 0.95); // 95% success rate
      });

      it('should maintain performance under sustained load', async () => {
        const clientId = WebhookTestUtils.generateClientId();
        const rounds = 3;
        const batchSize = 20;
        const executionTimes: number[] = [];

        for (let round = 0; round < rounds; round++) {
          const payloads = MockWebhookPayloads.generateBatchPayloads(
            EventProvider.TALABAT,
            EventType.ORDER_UPDATED,
            batchSize,
            clientId
          );

          const timer = WebhookTestUtils.createPerformanceTimer();

          const promises = payloads.map(payload =>
            request(app.getHttpServer())
              .post(`/webhooks/talabat/${clientId}`)
              .set('x-talabat-api-key', `talabat_api_key_${clientId}`)
              .set('content-type', 'application/json')
              .send(payload)
          );

          await Promise.all(promises);
          const executionTime = timer.stop();
          executionTimes.push(executionTime);

          // Small delay between rounds
          await WebhookTestUtils.delay(100);
        }

        // Performance should not degrade significantly
        const avgTime = executionTimes.reduce((a, b) => a + b, 0) / executionTimes.length;
        const maxTime = Math.max(...executionTimes);
        const minTime = Math.min(...executionTimes);

        expect(maxTime - minTime).toBeLessThan(avgTime * 0.5); // Max variance of 50%
      });

      it('should handle concurrent webhook processing', async () => {
        const clientIds = Array(5).fill(null).map(() => WebhookTestUtils.generateClientId());
        const providers = [
          EventProvider.CAREEM,
          EventProvider.TALABAT,
          EventProvider.DELIVEROO,
          EventProvider.JAHEZ
        ];

        const timer = WebhookTestUtils.createPerformanceTimer();

        const promises = clientIds.flatMap(clientId =>
          providers.map(provider => {
            const payload = MockWebhookPayloads.getPayload(provider, EventType.ORDER_CREATED, clientId);
            const headers = WebhookTestUtils.createMockHeaders(provider, clientId);

            return request(app.getHttpServer())
              .post(`/webhooks/${provider}/${clientId}`)
              .set(headers)
              .set('content-type', 'application/json')
              .send(payload);
          })
        );

        const responses = await Promise.all(promises);
        const executionTime = timer.stop();

        expect(executionTime).toBeLessThan(3000); // Should complete within 3 seconds
        expect(responses.length).toBe(clientIds.length * providers.length);

        const successfulResponses = responses.filter(r => r.status === 200);
        expect(successfulResponses.length).toBeGreaterThan(responses.length * 0.9); // 90% success rate
      });

      it('should process retry queue efficiently', async () => {
        const clientId = WebhookTestUtils.generateClientId();
        const failedPayloads = Array(10).fill(null).map(() => ({
          id: WebhookTestUtils.generateEventId(),
          url: 'https://httpbin.org/status/500', // Will fail
          method: 'POST' as const,
          headers: { 'content-type': 'application/json' },
          body: MockWebhookPayloads.careem.orderCreated(clientId),
          companyId: clientId
        }));

        const timer = WebhookTestUtils.createPerformanceTimer();

        // Queue all for retry
        await Promise.all(
          failedPayloads.map(payload =>
            webhookRetryService.queueForRetry(payload, 'Connection timeout')
          )
        );

        const queueingTime = timer.stop();

        expect(queueingTime).toBeLessThan(1000); // Should queue within 1 second

        const stats = webhookRetryService.getRetryStats();
        expect(stats.totalQueued).toBeGreaterThanOrEqual(failedPayloads.length);
      });
    });

    describe('Memory and Resource Usage', () => {
      it('should not leak memory during processing', async () => {
        const initialMemory = process.memoryUsage();
        const clientId = WebhookTestUtils.generateClientId();

        // Process a large batch
        for (let i = 0; i < 100; i++) {
          const payload = MockWebhookPayloads.careem.orderCreated(clientId);
          const rawBody = JSON.stringify(payload);
          const secret = `careem_secret_key_${clientId}`;
          const signature = WebhookTestUtils.generateHmacSignature(rawBody, secret);

          await request(app.getHttpServer())
            .post(`/webhooks/careem/${clientId}`)
            .set('x-careem-signature', signature)
            .set('content-type', 'application/json')
            .send(payload);
        }

        // Force garbage collection if available
        if (global.gc) {
          global.gc();
        }

        const finalMemory = process.memoryUsage();
        const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;

        // Memory increase should be reasonable (less than 50MB)
        expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
      });
    });
  });

  describe('End-to-End Webhook Flow Tests', () => {
    describe('Complete Order Lifecycle', () => {
      it('should handle complete Careem order lifecycle', async () => {
        const clientId = WebhookTestUtils.generateClientId();
        const orderId = `ORD-${Math.floor(Math.random() * 100000)}`;

        // Step 1: Order Created
        const orderCreatedPayload = MockWebhookPayloads.careem.orderCreated(clientId);
        orderCreatedPayload.data.order.id = orderId;

        let rawBody = JSON.stringify(orderCreatedPayload);
        let secret = `careem_secret_key_${clientId}`;
        let signature = WebhookTestUtils.generateHmacSignature(rawBody, secret);

        const createResponse = await request(app.getHttpServer())
          .post(`/webhooks/careem/${clientId}`)
          .set('x-careem-signature', signature)
          .set('content-type', 'application/json')
          .send(orderCreatedPayload)
          .expect(200);

        expect(createResponse.body.success).toBe(true);

        // Step 2: Order Updated (Confirmed)
        const orderUpdatedPayload = MockWebhookPayloads.careem.orderUpdated(clientId);
        orderUpdatedPayload.data.order.id = orderId;

        rawBody = JSON.stringify(orderUpdatedPayload);
        signature = WebhookTestUtils.generateHmacSignature(rawBody, secret);

        const updateResponse = await request(app.getHttpServer())
          .post(`/webhooks/careem/${clientId}`)
          .set('x-careem-signature', signature)
          .set('content-type', 'application/json')
          .send(orderUpdatedPayload)
          .expect(200);

        expect(updateResponse.body.success).toBe(true);

        // Step 3: Order Cancelled (if needed)
        const orderCancelledPayload = MockWebhookPayloads.careem.orderCancelled(clientId);
        orderCancelledPayload.data.order.id = orderId;

        rawBody = JSON.stringify(orderCancelledPayload);
        signature = WebhookTestUtils.generateHmacSignature(rawBody, secret);

        const cancelResponse = await request(app.getHttpServer())
          .post(`/webhooks/careem/${clientId}`)
          .set('x-careem-signature', signature)
          .set('content-type', 'application/json')
          .send(orderCancelledPayload)
          .expect(200);

        expect(cancelResponse.body.success).toBe(true);

        // Verify logs contain all events
        const logs = await webhookService.getWebhookLogs({
          provider: EventProvider.CAREEM,
          clientId,
          limit: 10,
          offset: 0
        });

        expect(logs.logs.length).toBeGreaterThanOrEqual(3);
      });

      it('should handle Deliveroo order with pickup', async () => {
        const clientId = WebhookTestUtils.generateClientId();
        const orderId = `DEL-${Math.floor(Math.random() * 100000)}`;

        // Step 1: Order Created
        const orderCreatedPayload = MockWebhookPayloads.deliveroo.orderCreated(clientId);
        orderCreatedPayload.data.order.id = orderId;

        let rawBody = JSON.stringify(orderCreatedPayload);
        let secret = `deliveroo_secret_key_${clientId}`;
        let signature = WebhookTestUtils.generateHmacSignatureBase64(rawBody, secret);

        const createResponse = await request(app.getHttpServer())
          .post(`/webhooks/deliveroo/${clientId}`)
          .set('x-deliveroo-hmac-sha256', signature)
          .set('content-type', 'application/json')
          .send(orderCreatedPayload)
          .expect(200);

        expect(createResponse.body.success).toBe(true);

        // Step 2: Order Picked Up
        const orderPickedUpPayload = MockWebhookPayloads.deliveroo.orderPickedUp(clientId);
        orderPickedUpPayload.data.order_id = orderId;

        rawBody = JSON.stringify(orderPickedUpPayload);
        signature = WebhookTestUtils.generateHmacSignatureBase64(rawBody, secret);

        const pickupResponse = await request(app.getHttpServer())
          .post(`/webhooks/deliveroo/${clientId}`)
          .set('x-deliveroo-hmac-sha256', signature)
          .set('content-type', 'application/json')
          .send(orderPickedUpPayload)
          .expect(200);

        expect(pickupResponse.body.success).toBe(true);
      });
    });

    describe('Menu Synchronization Flow', () => {
      it('should handle menu updates across providers', async () => {
        const clientId = WebhookTestUtils.generateClientId();

        // Talabat menu update
        const talabatMenuUpdate = MockWebhookPayloads.talabat.menuUpdated(clientId);

        const talabatResponse = await request(app.getHttpServer())
          .post(`/webhooks/talabat/${clientId}`)
          .set('x-talabat-api-key', `talabat_api_key_${clientId}`)
          .set('content-type', 'application/json')
          .send(talabatMenuUpdate)
          .expect(200);

        expect(talabatResponse.body.success).toBe(true);

        // Jahez availability change
        const jahezAvailabilityChange = MockWebhookPayloads.jahez.itemAvailabilityChanged(clientId);

        const jahezResponse = await request(app.getHttpServer())
          .post(`/webhooks/jahez/${clientId}`)
          .set('authorization', `Bearer jahez_bearer_token_${clientId}`)
          .set('content-type', 'application/json')
          .send(jahezAvailabilityChange)
          .expect(200);

        expect(jahezResponse.body.success).toBe(true);
      });
    });

    describe('Connection Testing Flow', () => {
      it('should handle connection test events', async () => {
        const clientId = WebhookTestUtils.generateClientId();

        // Test connection for each provider
        const providers = [
          EventProvider.CAREEM,
          EventProvider.TALABAT,
          EventProvider.DELIVEROO,
          EventProvider.JAHEZ
        ];

        for (const provider of providers) {
          let response;

          if (provider === EventProvider.DELIVEROO) {
            const testPayload = MockWebhookPayloads.deliveroo.connectionTest(clientId);
            const rawBody = JSON.stringify(testPayload);
            const secret = `deliveroo_secret_key_${clientId}`;
            const signature = WebhookTestUtils.generateHmacSignatureBase64(rawBody, secret);

            response = await request(app.getHttpServer())
              .post(`/webhooks/deliveroo/${clientId}`)
              .set('x-deliveroo-hmac-sha256', signature)
              .set('content-type', 'application/json')
              .send(testPayload);
          } else {
            // For other providers, use generic test payload
            const testPayload = {
              eventId: WebhookTestUtils.generateEventId(),
              eventType: EventType.CONNECTION_TEST,
              provider,
              clientId,
              timestamp: new Date().toISOString(),
              version: '1.0',
              isTest: true,
              data: {
                test_message: `${provider} webhook connection test`
              }
            };

            const headers = WebhookTestUtils.createMockHeaders(provider, clientId);

            response = await request(app.getHttpServer())
              .post(`/webhooks/${provider}/${clientId}`)
              .set(headers)
              .set('content-type', 'application/json')
              .send(testPayload);
          }

          expect(response.status).toBe(200);
          expect(response.body.success).toBe(true);
        }
      });
    });

    describe('Error Handling and Recovery', () => {
      it('should handle webhook failures with retry mechanism', async () => {
        const clientId = WebhookTestUtils.generateClientId();

        // Create a webhook that will initially fail
        const payload = {
          id: WebhookTestUtils.generateEventId(),
          url: 'https://httpbin.org/status/500',
          method: 'POST' as const,
          headers: { 'content-type': 'application/json' },
          body: MockWebhookPayloads.careem.orderCreated(clientId),
          companyId: clientId
        };

        // Queue for retry
        await webhookRetryService.queueForRetry(payload, 'Initial failure');

        let retryResult = await webhookRetryService.retryWebhook(payload.id);
        expect(retryResult).toBe(false); // Should fail

        // Update URL to success endpoint
        payload.url = 'https://httpbin.org/status/200';
        await webhookRetryService.queueForRetry(payload, 'Retry after URL fix');

        retryResult = await webhookRetryService.retryWebhook(payload.id);
        expect(retryResult).toBe(true); // Should succeed
      });

      it('should handle malformed webhook gracefully', async () => {
        const clientId = WebhookTestUtils.generateClientId();
        const invalidPayloads = MockWebhookPayloads.getInvalidPayloads();

        for (const [name, invalidPayload] of Object.entries(invalidPayloads)) {
          if (name === 'nullPayload' || name === 'stringPayload') {
            continue; // Skip these as they can't be sent via HTTP
          }

          const response = await request(app.getHttpServer())
            .post(`/webhooks/careem/${clientId}`)
            .set('content-type', 'application/json')
            .send(invalidPayload);

          expect(response.status).toBeGreaterThanOrEqual(400);
          expect(response.body.success).toBe(false);
        }
      });
    });
  });

  describe('Security Tests', () => {
    describe('Signature Validation', () => {
      it('should reject webhooks with tampered payloads', async () => {
        const clientId = WebhookTestUtils.generateClientId();
        const originalPayload = MockWebhookPayloads.careem.orderCreated(clientId);
        const rawBody = JSON.stringify(originalPayload);
        const secret = `careem_secret_key_${clientId}`;
        const validSignature = WebhookTestUtils.generateHmacSignature(rawBody, secret);

        // Tamper with the payload but keep the original signature
        const tamperedPayload = { ...originalPayload };
        tamperedPayload.data.order.totalAmount = 99999.99;

        const response = await request(app.getHttpServer())
          .post(`/webhooks/careem/${clientId}`)
          .set('x-careem-signature', validSignature)
          .set('content-type', 'application/json')
          .send(tamperedPayload)
          .expect(401);

        expect(response.body.success).toBe(false);
      });
    });

    describe('Request Validation', () => {
      it('should validate client ID format', async () => {
        const invalidClientId = 'invalid-client-id-with-special-chars!@#$';
        const payload = MockWebhookPayloads.careem.orderCreated();

        const response = await request(app.getHttpServer())
          .post(`/webhooks/careem/${invalidClientId}`)
          .set('content-type', 'application/json')
          .send(payload)
          .expect(400);

        expect(response.body.success).toBe(false);
      });

      it('should handle large payloads appropriately', async () => {
        const clientId = WebhookTestUtils.generateClientId();
        const largePayload = MockWebhookPayloads.careem.orderCreated(clientId);

        // Create a very large payload
        largePayload.data.largeField = 'x'.repeat(10 * 1024 * 1024); // 10MB string

        const rawBody = JSON.stringify(largePayload);
        const secret = `careem_secret_key_${clientId}`;
        const signature = WebhookTestUtils.generateHmacSignature(rawBody, secret);

        const response = await request(app.getHttpServer())
          .post(`/webhooks/careem/${clientId}`)
          .set('x-careem-signature', signature)
          .set('content-type', 'application/json')
          .send(largePayload);

        // Should either succeed or fail gracefully with appropriate status code
        expect([200, 413, 400]).toContain(response.status);
      });
    });
  });
});