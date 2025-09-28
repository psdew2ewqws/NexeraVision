import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { WebhookModule } from '../../webhook.module';
import { WebhookService } from '../../webhook.service';
import { WebhookValidationService } from '../../webhook-validation.service';
import { RegisterWebhookDto } from '../../dto/register-webhook.dto';

describe('Webhook Registration E2E Tests', () => {
  let app: INestApplication;
  let webhookService: WebhookService;
  let validationService: WebhookValidationService;

  const testApiKey = 'test-api-key-123';
  const testClientId = 'test-client-001';

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [WebhookModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    webhookService = moduleFixture.get<WebhookService>(WebhookService);
    validationService = moduleFixture.get<WebhookValidationService>(WebhookValidationService);

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  afterEach(async () => {
    // Cleanup registered webhooks after each test
    jest.clearAllMocks();
  });

  describe('POST /webhooks/register', () => {
    it('should successfully register a new webhook endpoint', async () => {
      const registerDto: RegisterWebhookDto = {
        clientId: testClientId,
        provider: 'careem',
        endpointUrl: 'https://restaurant.example.com/webhooks/careem',
        secret: 'webhook-secret-123',
        events: ['order.created', 'order.updated'],
        isActive: true,
      };

      const response = await request(app.getHttpServer())
        .post('/webhooks/register')
        .set('x-api-key', testApiKey)
        .send(registerDto)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('clientId', testClientId);
      expect(response.body).toHaveProperty('provider', 'careem');
      expect(response.body).toHaveProperty('endpointUrl', registerDto.endpointUrl);
      expect(response.body).toHaveProperty('isActive', true);
      expect(response.body).toHaveProperty('events');
      expect(response.body.events).toEqual(expect.arrayContaining(['order.created', 'order.updated']));
      expect(response.body).toHaveProperty('createdAt');
    });

    it('should reject registration without API key', async () => {
      const registerDto: RegisterWebhookDto = {
        clientId: testClientId,
        provider: 'talabat',
        endpointUrl: 'https://restaurant.example.com/webhooks/talabat',
        secret: 'webhook-secret-456',
        events: ['order.created'],
        isActive: true,
      };

      await request(app.getHttpServer())
        .post('/webhooks/register')
        .send(registerDto)
        .expect(401);
    });

    it('should reject registration with invalid API key', async () => {
      const registerDto: RegisterWebhookDto = {
        clientId: testClientId,
        provider: 'deliveroo',
        endpointUrl: 'https://restaurant.example.com/webhooks/deliveroo',
        secret: 'webhook-secret-789',
        events: ['order.created'],
        isActive: true,
      };

      await request(app.getHttpServer())
        .post('/webhooks/register')
        .set('x-api-key', 'invalid-api-key')
        .send(registerDto)
        .expect(401);
    });

    it('should validate required fields', async () => {
      const incompleteDto = {
        clientId: testClientId,
        // Missing required fields
      };

      const response = await request(app.getHttpServer())
        .post('/webhooks/register')
        .set('x-api-key', testApiKey)
        .send(incompleteDto)
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('message');
      expect(Array.isArray(response.body.message)).toBe(true);
    });

    it('should validate provider enum values', async () => {
      const invalidDto = {
        clientId: testClientId,
        provider: 'invalid-provider',
        endpointUrl: 'https://restaurant.example.com/webhooks',
        secret: 'webhook-secret',
        events: ['order.created'],
        isActive: true,
      };

      const response = await request(app.getHttpServer())
        .post('/webhooks/register')
        .set('x-api-key', testApiKey)
        .send(invalidDto)
        .expect(400);

      expect(response.body.message).toContain('provider');
    });

    it('should validate URL format', async () => {
      const invalidUrlDto: RegisterWebhookDto = {
        clientId: testClientId,
        provider: 'careem',
        endpointUrl: 'not-a-valid-url',
        secret: 'webhook-secret',
        events: ['order.created'],
        isActive: true,
      };

      const response = await request(app.getHttpServer())
        .post('/webhooks/register')
        .set('x-api-key', testApiKey)
        .send(invalidUrlDto)
        .expect(400);

      expect(response.body.message).toContain('endpointUrl');
    });

    it('should validate event types', async () => {
      const invalidEventsDto = {
        clientId: testClientId,
        provider: 'careem',
        endpointUrl: 'https://restaurant.example.com/webhooks',
        secret: 'webhook-secret',
        events: ['invalid.event', 'another.invalid'],
        isActive: true,
      };

      const response = await request(app.getHttpServer())
        .post('/webhooks/register')
        .set('x-api-key', testApiKey)
        .send(invalidEventsDto)
        .expect(400);

      expect(response.body.message).toContain('events');
    });

    it('should prevent duplicate registrations for same client and provider', async () => {
      const registerDto: RegisterWebhookDto = {
        clientId: testClientId,
        provider: 'careem',
        endpointUrl: 'https://restaurant.example.com/webhooks/careem',
        secret: 'webhook-secret-123',
        events: ['order.created'],
        isActive: true,
      };

      // First registration should succeed
      await request(app.getHttpServer())
        .post('/webhooks/register')
        .set('x-api-key', testApiKey)
        .send(registerDto)
        .expect(201);

      // Second registration with same client and provider should fail
      const response = await request(app.getHttpServer())
        .post('/webhooks/register')
        .set('x-api-key', testApiKey)
        .send(registerDto)
        .expect(409);

      expect(response.body).toHaveProperty('error');
      expect(response.body.message).toContain('already exists');
    });

    it('should register multiple providers for same client', async () => {
      const careemDto: RegisterWebhookDto = {
        clientId: testClientId,
        provider: 'careem',
        endpointUrl: 'https://restaurant.example.com/webhooks/careem',
        secret: 'careem-secret',
        events: ['order.created'],
        isActive: true,
      };

      const talabatDto: RegisterWebhookDto = {
        clientId: testClientId,
        provider: 'talabat',
        endpointUrl: 'https://restaurant.example.com/webhooks/talabat',
        secret: 'talabat-secret',
        events: ['order.created'],
        isActive: true,
      };

      // Register Careem webhook
      const careemResponse = await request(app.getHttpServer())
        .post('/webhooks/register')
        .set('x-api-key', testApiKey)
        .send(careemDto)
        .expect(201);

      // Register Talabat webhook for same client
      const talabatResponse = await request(app.getHttpServer())
        .post('/webhooks/register')
        .set('x-api-key', testApiKey)
        .send(talabatDto)
        .expect(201);

      expect(careemResponse.body.provider).toBe('careem');
      expect(talabatResponse.body.provider).toBe('talabat');
      expect(careemResponse.body.clientId).toBe(testClientId);
      expect(talabatResponse.body.clientId).toBe(testClientId);
    });

    it('should validate webhook endpoint accessibility', async () => {
      const registerDto: RegisterWebhookDto = {
        clientId: testClientId,
        provider: 'careem',
        endpointUrl: 'https://nonexistent-domain-12345.com/webhooks',
        secret: 'webhook-secret',
        events: ['order.created'],
        isActive: true,
        validateEndpoint: true, // Enable endpoint validation
      };

      const response = await request(app.getHttpServer())
        .post('/webhooks/register')
        .set('x-api-key', testApiKey)
        .send(registerDto)
        .expect(400);

      expect(response.body.message).toContain('endpoint');
    });

    it('should handle registration with custom configuration', async () => {
      const registerDto: RegisterWebhookDto = {
        clientId: testClientId,
        provider: 'jahez',
        endpointUrl: 'https://restaurant.example.com/webhooks/jahez',
        secret: 'jahez-secret',
        events: ['order.created', 'order.updated', 'order.cancelled'],
        isActive: true,
        retryConfig: {
          maxRetries: 5,
          retryDelay: 2000,
          backoffMultiplier: 2,
        },
        timeoutMs: 30000,
        metadata: {
          restaurant_name: 'Test Restaurant',
          contact_email: 'admin@restaurant.example.com',
        },
      };

      const response = await request(app.getHttpServer())
        .post('/webhooks/register')
        .set('x-api-key', testApiKey)
        .send(registerDto)
        .expect(201);

      expect(response.body).toHaveProperty('retryConfig');
      expect(response.body.retryConfig.maxRetries).toBe(5);
      expect(response.body).toHaveProperty('timeoutMs', 30000);
      expect(response.body).toHaveProperty('metadata');
      expect(response.body.metadata.restaurant_name).toBe('Test Restaurant');
    });
  });

  describe('GET /webhooks/config/:clientId', () => {
    beforeEach(async () => {
      // Register a webhook for testing configuration retrieval
      const registerDto: RegisterWebhookDto = {
        clientId: testClientId,
        provider: 'careem',
        endpointUrl: 'https://restaurant.example.com/webhooks/careem',
        secret: 'webhook-secret',
        events: ['order.created'],
        isActive: true,
      };

      await request(app.getHttpServer())
        .post('/webhooks/register')
        .set('x-api-key', testApiKey)
        .send(registerDto);
    });

    it('should retrieve webhook configuration for client', async () => {
      const response = await request(app.getHttpServer())
        .get(`/webhooks/config/${testClientId}`)
        .set('x-api-key', testApiKey)
        .expect(200);

      expect(response.body).toHaveProperty('clientId', testClientId);
      expect(response.body).toHaveProperty('webhooks');
      expect(Array.isArray(response.body.webhooks)).toBe(true);
      expect(response.body.webhooks.length).toBeGreaterThan(0);
    });

    it('should require API key for configuration access', async () => {
      await request(app.getHttpServer())
        .get(`/webhooks/config/${testClientId}`)
        .expect(401);
    });

    it('should return empty configuration for non-existent client', async () => {
      const response = await request(app.getHttpServer())
        .get('/webhooks/config/non-existent-client')
        .set('x-api-key', testApiKey)
        .expect(200);

      expect(response.body).toHaveProperty('clientId', 'non-existent-client');
      expect(response.body).toHaveProperty('webhooks');
      expect(response.body.webhooks).toHaveLength(0);
    });
  });

  describe('DELETE /webhooks/:webhookId', () => {
    let webhookId: string;

    beforeEach(async () => {
      // Register a webhook for testing deletion
      const registerDto: RegisterWebhookDto = {
        clientId: testClientId,
        provider: 'deliveroo',
        endpointUrl: 'https://restaurant.example.com/webhooks/deliveroo',
        secret: 'webhook-secret',
        events: ['order.created'],
        isActive: true,
      };

      const response = await request(app.getHttpServer())
        .post('/webhooks/register')
        .set('x-api-key', testApiKey)
        .send(registerDto);

      webhookId = response.body.id;
    });

    it('should successfully delete a webhook registration', async () => {
      const response = await request(app.getHttpServer())
        .delete(`/webhooks/${webhookId}`)
        .set('x-api-key', testApiKey)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message');
    });

    it('should require API key for deletion', async () => {
      await request(app.getHttpServer())
        .delete(`/webhooks/${webhookId}`)
        .expect(401);
    });

    it('should return 404 for non-existent webhook', async () => {
      await request(app.getHttpServer())
        .delete('/webhooks/non-existent-webhook-id')
        .set('x-api-key', testApiKey)
        .expect(404);
    });

    it('should return 400 for invalid webhook ID format', async () => {
      await request(app.getHttpServer())
        .delete('/webhooks/invalid-id-format')
        .set('x-api-key', testApiKey)
        .expect(400);
    });
  });

  describe('GET /webhooks/health', () => {
    it('should return health status without authentication', async () => {
      const response = await request(app.getHttpServer())
        .get('/webhooks/health')
        .expect(200);

      expect(response.body).toHaveProperty('status', 'healthy');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('endpoints');
      expect(response.body.endpoints).toHaveProperty('careem', 'active');
      expect(response.body.endpoints).toHaveProperty('talabat', 'active');
      expect(response.body.endpoints).toHaveProperty('deliveroo', 'active');
      expect(response.body.endpoints).toHaveProperty('jahez', 'active');
      expect(response.body.endpoints).toHaveProperty('test', 'active');
    });

    it('should include response time in health check', async () => {
      const startTime = Date.now();

      const response = await request(app.getHttpServer())
        .get('/webhooks/health')
        .expect(200);

      const endTime = Date.now();
      const responseTime = endTime - startTime;

      expect(responseTime).toBeLessThan(1000); // Should respond within 1 second
      expect(response.body.timestamp).toBeDefined();
    });
  });

  describe('Webhook Registration Validation Edge Cases', () => {
    it('should handle extremely long URLs gracefully', async () => {
      const longUrl = 'https://restaurant.example.com/' + 'a'.repeat(2000);

      const registerDto: RegisterWebhookDto = {
        clientId: testClientId,
        provider: 'careem',
        endpointUrl: longUrl,
        secret: 'webhook-secret',
        events: ['order.created'],
        isActive: true,
      };

      const response = await request(app.getHttpServer())
        .post('/webhooks/register')
        .set('x-api-key', testApiKey)
        .send(registerDto)
        .expect(400);

      expect(response.body.message).toContain('endpointUrl');
    });

    it('should handle registration with special characters in client ID', async () => {
      const specialClientId = 'client-123_test@domain.com';

      const registerDto: RegisterWebhookDto = {
        clientId: specialClientId,
        provider: 'careem',
        endpointUrl: 'https://restaurant.example.com/webhooks',
        secret: 'webhook-secret',
        events: ['order.created'],
        isActive: true,
      };

      const response = await request(app.getHttpServer())
        .post('/webhooks/register')
        .set('x-api-key', testApiKey)
        .send(registerDto)
        .expect(201);

      expect(response.body.clientId).toBe(specialClientId);
    });

    it('should validate secret strength requirements', async () => {
      const registerDto: RegisterWebhookDto = {
        clientId: testClientId,
        provider: 'careem',
        endpointUrl: 'https://restaurant.example.com/webhooks',
        secret: '123', // Too short
        events: ['order.created'],
        isActive: true,
      };

      const response = await request(app.getHttpServer())
        .post('/webhooks/register')
        .set('x-api-key', testApiKey)
        .send(registerDto)
        .expect(400);

      expect(response.body.message).toContain('secret');
    });

    it('should handle registration with all supported event types', async () => {
      const allEvents = [
        'order.created',
        'order.updated',
        'order.cancelled',
        'order.delivered',
        'order.confirmed',
        'order.prepared',
        'order.picked_up',
        'menu.updated',
        'item.availability_changed'
      ];

      const registerDto: RegisterWebhookDto = {
        clientId: testClientId,
        provider: 'careem',
        endpointUrl: 'https://restaurant.example.com/webhooks',
        secret: 'webhook-secret-all-events',
        events: allEvents,
        isActive: true,
      };

      const response = await request(app.getHttpServer())
        .post('/webhooks/register')
        .set('x-api-key', testApiKey)
        .send(registerDto)
        .expect(201);

      expect(response.body.events).toEqual(expect.arrayContaining(allEvents));
      expect(response.body.events).toHaveLength(allEvents.length);
    });
  });

  describe('Concurrent Registration Tests', () => {
    it('should handle concurrent registrations gracefully', async () => {
      const promises = [];

      for (let i = 0; i < 5; i++) {
        const registerDto: RegisterWebhookDto = {
          clientId: `concurrent-client-${i}`,
          provider: 'careem',
          endpointUrl: `https://restaurant${i}.example.com/webhooks`,
          secret: `webhook-secret-${i}`,
          events: ['order.created'],
          isActive: true,
        };

        promises.push(
          request(app.getHttpServer())
            .post('/webhooks/register')
            .set('x-api-key', testApiKey)
            .send(registerDto)
        );
      }

      const responses = await Promise.all(promises);

      responses.forEach((response, index) => {
        expect(response.status).toBe(201);
        expect(response.body.clientId).toBe(`concurrent-client-${index}`);
      });
    });

    it('should handle race condition in duplicate prevention', async () => {
      const registerDto: RegisterWebhookDto = {
        clientId: 'race-condition-client',
        provider: 'careem',
        endpointUrl: 'https://restaurant.example.com/webhooks',
        secret: 'webhook-secret',
        events: ['order.created'],
        isActive: true,
      };

      // Attempt simultaneous registrations
      const [response1, response2] = await Promise.allSettled([
        request(app.getHttpServer())
          .post('/webhooks/register')
          .set('x-api-key', testApiKey)
          .send(registerDto),
        request(app.getHttpServer())
          .post('/webhooks/register')
          .set('x-api-key', testApiKey)
          .send(registerDto)
      ]);

      // One should succeed, one should fail with conflict
      const statuses = [
        response1.status === 'fulfilled' ? response1.value.status : 500,
        response2.status === 'fulfilled' ? response2.value.status : 500
      ];

      expect(statuses).toContain(201); // One success
      expect(statuses).toContain(409); // One conflict
    });
  });
});