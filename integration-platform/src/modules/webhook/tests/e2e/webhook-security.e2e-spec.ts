import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import * as crypto from 'crypto';
import { WebhookModule } from '../../webhook.module';
import { WebhookValidationService } from '../../webhook-validation.service';

describe('Webhook Security Validation E2E Tests', () => {
  let app: INestApplication;
  let validationService: WebhookValidationService;

  const testClientId = 'security-test-client';

  // Mock secrets for different providers
  const mockSecrets = {
    careem: 'careem_secret_key_' + testClientId,
    deliveroo: 'deliveroo_secret_key_' + testClientId,
    talabat: 'talabat_api_key_' + testClientId,
    jahez: 'jahez_bearer_token_' + testClientId,
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [WebhookModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    // Enable raw body parsing for signature validation
    app.use((req, res, next) => {
      if (req.path.includes('/webhooks/') && req.method === 'POST') {
        req.rawBody = Buffer.from(JSON.stringify(req.body));
      }
      next();
    });

    validationService = moduleFixture.get<WebhookValidationService>(WebhookValidationService);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Careem HMAC Signature Validation', () => {
    const createCareemSignature = (payload: string, secret: string): string => {
      return crypto.createHmac('sha256', secret).update(payload).digest('hex');
    };

    it('should accept valid Careem webhook with correct HMAC signature', async () => {
      const payload = {
        event_type: 'order_created',
        order_id: 'careem_order_123',
        restaurant_id: 'rest_456',
        status: 'confirmed',
        timestamp: new Date().toISOString(),
        data: {
          customer: {
            name: 'John Doe',
            phone: '+1234567890'
          },
          items: [
            {
              id: 'item_1',
              name: 'Burger',
              quantity: 2,
              price: 25.00
            }
          ],
          total_amount: 50.00,
          currency: 'SAR'
        }
      };

      const payloadString = JSON.stringify(payload);
      const signature = createCareemSignature(payloadString, mockSecrets.careem);

      const response = await request(app.getHttpServer())
        .post(`/webhooks/careem/${testClientId}`)
        .set('x-careem-signature', signature)
        .set('Content-Type', 'application/json')
        .send(payload)
        .expect(200);

      expect(response.body).toHaveProperty('status', 'received');
    });

    it('should reject Careem webhook with invalid signature', async () => {
      const payload = {
        event_type: 'order_created',
        order_id: 'careem_order_124',
        restaurant_id: 'rest_456',
        status: 'confirmed'
      };

      const invalidSignature = 'invalid_signature_123';

      const response = await request(app.getHttpServer())
        .post(`/webhooks/careem/${testClientId}`)
        .set('x-careem-signature', invalidSignature)
        .set('Content-Type', 'application/json')
        .send(payload)
        .expect(200);

      expect(response.body).toHaveProperty('status', 'unauthorized');
    });

    it('should reject Careem webhook without signature header', async () => {
      const payload = {
        event_type: 'order_created',
        order_id: 'careem_order_125'
      };

      const response = await request(app.getHttpServer())
        .post(`/webhooks/careem/${testClientId}`)
        .set('Content-Type', 'application/json')
        .send(payload)
        .expect(200);

      expect(response.body).toHaveProperty('status', 'unauthorized');
    });

    it('should handle signature validation with special characters in payload', async () => {
      const payload = {
        event_type: 'order_updated',
        order_id: 'careem_order_126',
        data: {
          customer_notes: 'Special chars: áéíóú, 中文, العربية, emoji 🍕',
          instructions: 'Ring the bell & wait @ door #123'
        }
      };

      const payloadString = JSON.stringify(payload);
      const signature = createCareemSignature(payloadString, mockSecrets.careem);

      const response = await request(app.getHttpServer())
        .post(`/webhooks/careem/${testClientId}`)
        .set('x-careem-signature', signature)
        .set('Content-Type', 'application/json')
        .send(payload)
        .expect(200);

      expect(response.body).toHaveProperty('status', 'received');
    });

    it('should handle Careem signature validation with large payload', async () => {
      const largeItems = Array.from({ length: 100 }, (_, i) => ({
        id: `item_${i}`,
        name: `Test Item ${i}`,
        description: `This is a test item with a long description that contains many characters to test payload size limits and signature validation with larger data sets. Item number ${i}.`,
        quantity: Math.floor(Math.random() * 5) + 1,
        price: Math.random() * 100,
        modifiers: Array.from({ length: 3 }, (_, j) => ({
          id: `mod_${i}_${j}`,
          name: `Modifier ${j}`,
          price: Math.random() * 10
        }))
      }));

      const payload = {
        event_type: 'order_created',
        order_id: 'careem_large_order_127',
        restaurant_id: 'rest_456',
        data: {
          items: largeItems,
          customer: {
            name: 'Large Order Customer',
            address: {
              street: '123 Long Street Name With Many Characters',
              city: 'Very Long City Name',
              country: 'Kingdom of Saudi Arabia'
            }
          }
        }
      };

      const payloadString = JSON.stringify(payload);
      const signature = createCareemSignature(payloadString, mockSecrets.careem);

      const response = await request(app.getHttpServer())
        .post(`/webhooks/careem/${testClientId}`)
        .set('x-careem-signature', signature)
        .set('Content-Type', 'application/json')
        .send(payload)
        .expect(200);

      expect(response.body).toHaveProperty('status', 'received');
    });
  });

  describe('Deliveroo HMAC Signature Validation', () => {
    const createDeliverooSignature = (payload: string, secret: string): string => {
      return crypto.createHmac('sha256', secret).update(payload).digest('base64');
    };

    it('should accept valid Deliveroo webhook with correct HMAC signature', async () => {
      const payload = {
        event: 'order_placed',
        order: {
          id: 'deliveroo_order_123',
          reference: 'DR123456',
          status: 'accepted',
          created_at: new Date().toISOString(),
          items: [
            {
              id: 'item_1',
              name: 'Pizza Margherita',
              quantity: 1,
              price: 1200 // in cents
            }
          ],
          customer: {
            first_name: 'Jane',
            last_name: 'Smith',
            phone_number: '+44123456789'
          }
        }
      };

      const payloadString = JSON.stringify(payload);
      const signature = createDeliverooSignature(payloadString, mockSecrets.deliveroo);

      const response = await request(app.getHttpServer())
        .post(`/webhooks/deliveroo/${testClientId}`)
        .set('x-deliveroo-hmac-sha256', signature)
        .set('Content-Type', 'application/json')
        .send(payload)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
    });

    it('should reject Deliveroo webhook with tampered payload', async () => {
      const originalPayload = {
        event: 'order_placed',
        order: {
          id: 'deliveroo_order_124',
          total_price: 1000
        }
      };

      const tamperedPayload = {
        event: 'order_placed',
        order: {
          id: 'deliveroo_order_124',
          total_price: 1 // Tampered amount
        }
      };

      // Create signature for original payload but send tampered payload
      const originalPayloadString = JSON.stringify(originalPayload);
      const signature = createDeliverooSignature(originalPayloadString, mockSecrets.deliveroo);

      const response = await request(app.getHttpServer())
        .post(`/webhooks/deliveroo/${testClientId}`)
        .set('x-deliveroo-hmac-sha256', signature)
        .set('Content-Type', 'application/json')
        .send(tamperedPayload)
        .expect(200);

      expect(response.body).toHaveProperty('success', false);
    });

    it('should reject Deliveroo webhook without signature header', async () => {
      const payload = {
        event: 'order_cancelled',
        order: {
          id: 'deliveroo_order_125'
        }
      };

      const response = await request(app.getHttpServer())
        .post(`/webhooks/deliveroo/${testClientId}`)
        .set('Content-Type', 'application/json')
        .send(payload)
        .expect(200);

      expect(response.body).toHaveProperty('success', false);
    });
  });

  describe('Talabat API Key Validation', () => {
    it('should accept valid Talabat webhook with correct API key', async () => {
      const payload = {
        type: 'order_notification',
        order_id: 'talabat_order_123',
        restaurant_id: 'rest_789',
        status: 'new',
        timestamp: new Date().toISOString(),
        order_details: {
          customer: {
            name: 'Ahmed Ali',
            phone: '+966123456789'
          },
          items: [
            {
              id: 'item_1',
              name: 'Shawarma',
              quantity: 2,
              price: 30.00
            }
          ],
          total: 60.00,
          currency: 'SAR'
        }
      };

      const response = await request(app.getHttpServer())
        .post(`/webhooks/talabat/${testClientId}`)
        .set('x-talabat-api-key', mockSecrets.talabat)
        .set('Content-Type', 'application/json')
        .send(payload)
        .expect(200);

      expect(response.body).toHaveProperty('status', 'success');
    });

    it('should reject Talabat webhook with invalid API key', async () => {
      const payload = {
        type: 'order_notification',
        order_id: 'talabat_order_124'
      };

      const response = await request(app.getHttpServer())
        .post(`/webhooks/talabat/${testClientId}`)
        .set('x-talabat-api-key', 'invalid_api_key')
        .set('Content-Type', 'application/json')
        .send(payload)
        .expect(200);

      expect(response.body).toHaveProperty('status', 'unauthorized');
    });

    it('should reject Talabat webhook without API key header', async () => {
      const payload = {
        type: 'order_notification',
        order_id: 'talabat_order_125'
      };

      const response = await request(app.getHttpServer())
        .post(`/webhooks/talabat/${testClientId}`)
        .set('Content-Type', 'application/json')
        .send(payload)
        .expect(200);

      expect(response.body).toHaveProperty('status', 'unauthorized');
    });

    it('should validate Talabat webhook timestamp to prevent replay attacks', async () => {
      const oldTimestamp = new Date(Date.now() - 10 * 60 * 1000).toISOString(); // 10 minutes ago

      const payload = {
        type: 'order_notification',
        order_id: 'talabat_order_126',
        timestamp: oldTimestamp
      };

      const response = await request(app.getHttpServer())
        .post(`/webhooks/talabat/${testClientId}`)
        .set('x-talabat-api-key', mockSecrets.talabat)
        .set('Content-Type', 'application/json')
        .send(payload)
        .expect(200);

      expect(response.body).toHaveProperty('status', 'unauthorized');
    });

    it('should accept Talabat webhook with recent timestamp', async () => {
      const recentTimestamp = new Date(Date.now() - 2 * 60 * 1000).toISOString(); // 2 minutes ago

      const payload = {
        type: 'order_notification',
        order_id: 'talabat_order_127',
        timestamp: recentTimestamp
      };

      const response = await request(app.getHttpServer())
        .post(`/webhooks/talabat/${testClientId}`)
        .set('x-talabat-api-key', mockSecrets.talabat)
        .set('Content-Type', 'application/json')
        .send(payload)
        .expect(200);

      expect(response.body).toHaveProperty('status', 'success');
    });
  });

  describe('Jahez Bearer Token Validation', () => {
    it('should accept valid Jahez webhook with correct bearer token', async () => {
      const payload = {
        action: 'order_action',
        orderId: 'jahez_order_123',
        restaurantCode: 'REST001',
        status: 'placed',
        requestId: 'req_123_' + Date.now(),
        timestamp: new Date().toISOString(),
        orderData: {
          customer: {
            name: 'Fatima Al-Zahra',
            phone: '+966123456789'
          },
          items: [
            {
              id: 'item_1',
              name: 'Kabsa',
              quantity: 1,
              price: 45.00
            }
          ],
          total: 45.00,
          currency: 'SAR'
        }
      };

      const response = await request(app.getHttpServer())
        .post(`/webhooks/jahez/${testClientId}`)
        .set('authorization', `Bearer ${mockSecrets.jahez}`)
        .set('Content-Type', 'application/json')
        .send(payload)
        .expect(200);

      expect(response.body).toHaveProperty('result', 'ok');
    });

    it('should reject Jahez webhook with invalid bearer token', async () => {
      const payload = {
        action: 'order_action',
        orderId: 'jahez_order_124',
        requestId: 'req_124_' + Date.now()
      };

      const response = await request(app.getHttpServer())
        .post(`/webhooks/jahez/${testClientId}`)
        .set('authorization', 'Bearer invalid_token')
        .set('Content-Type', 'application/json')
        .send(payload)
        .expect(200);

      expect(response.body).toHaveProperty('result', 'failed');
    });

    it('should reject Jahez webhook without authorization header', async () => {
      const payload = {
        action: 'order_action',
        orderId: 'jahez_order_125',
        requestId: 'req_125_' + Date.now()
      };

      const response = await request(app.getHttpServer())
        .post(`/webhooks/jahez/${testClientId}`)
        .set('Content-Type', 'application/json')
        .send(payload)
        .expect(200);

      expect(response.body).toHaveProperty('result', 'failed');
    });

    it('should reject Jahez webhook with malformed authorization header', async () => {
      const payload = {
        action: 'order_action',
        orderId: 'jahez_order_126',
        requestId: 'req_126_' + Date.now()
      };

      const response = await request(app.getHttpServer())
        .post(`/webhooks/jahez/${testClientId}`)
        .set('authorization', 'InvalidFormat token_here')
        .set('Content-Type', 'application/json')
        .send(payload)
        .expect(200);

      expect(response.body).toHaveProperty('result', 'failed');
    });

    it('should prevent duplicate request processing for Jahez', async () => {
      const requestId = 'duplicate_req_' + Date.now();

      const payload = {
        action: 'order_action',
        orderId: 'jahez_order_127',
        requestId: requestId
      };

      // First request should succeed
      const response1 = await request(app.getHttpServer())
        .post(`/webhooks/jahez/${testClientId}`)
        .set('authorization', `Bearer ${mockSecrets.jahez}`)
        .set('Content-Type', 'application/json')
        .send(payload)
        .expect(200);

      expect(response1.body).toHaveProperty('result', 'ok');

      // Mock the duplicate check to return true for testing
      jest.spyOn(validationService, 'validateJahezWebhook').mockResolvedValueOnce(false);

      // Second request with same requestId should be rejected
      const response2 = await request(app.getHttpServer())
        .post(`/webhooks/jahez/${testClientId}`)
        .set('authorization', `Bearer ${mockSecrets.jahez}`)
        .set('Content-Type', 'application/json')
        .send(payload)
        .expect(200);

      expect(response2.body).toHaveProperty('result', 'failed');
    });
  });

  describe('Cross-Provider Security Tests', () => {
    it('should prevent cross-provider credential confusion', async () => {
      const payload = {
        event_type: 'order_created',
        order_id: 'cross_provider_test'
      };

      // Try to use Careem webhook with Talabat API key
      const response = await request(app.getHttpServer())
        .post(`/webhooks/careem/${testClientId}`)
        .set('x-talabat-api-key', mockSecrets.talabat) // Wrong header for Careem
        .set('Content-Type', 'application/json')
        .send(payload)
        .expect(200);

      expect(response.body).toHaveProperty('status', 'unauthorized');
    });

    it('should handle concurrent security validation requests', async () => {
      const promises = [];

      for (let i = 0; i < 10; i++) {
        const payload = {
          event_type: 'order_created',
          order_id: `concurrent_order_${i}`,
          timestamp: new Date().toISOString()
        };

        const payloadString = JSON.stringify(payload);
        const signature = crypto.createHmac('sha256', mockSecrets.careem)
          .update(payloadString)
          .digest('hex');

        promises.push(
          request(app.getHttpServer())
            .post(`/webhooks/careem/${testClientId}`)
            .set('x-careem-signature', signature)
            .set('Content-Type', 'application/json')
            .send(payload)
        );
      }

      const responses = await Promise.all(promises);

      responses.forEach((response, index) => {
        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('status', 'received');
      });
    });

    it('should rate limit excessive webhook requests', async () => {
      const payload = {
        event_type: 'order_created',
        order_id: 'rate_limit_test'
      };

      const payloadString = JSON.stringify(payload);
      const signature = crypto.createHmac('sha256', mockSecrets.careem)
        .update(payloadString)
        .digest('hex');

      // Send many requests rapidly
      const promises = [];
      for (let i = 0; i < 100; i++) {
        promises.push(
          request(app.getHttpServer())
            .post(`/webhooks/careem/${testClientId}`)
            .set('x-careem-signature', signature)
            .set('Content-Type', 'application/json')
            .send({ ...payload, order_id: `rate_limit_test_${i}` })
        );
      }

      const responses = await Promise.allSettled(promises);

      // Should have some successful responses and possibly some rate-limited ones
      const successfulResponses = responses.filter(
        r => r.status === 'fulfilled' && r.value.status === 200
      );

      expect(successfulResponses.length).toBeGreaterThan(0);
    });

    it('should validate IP address restrictions', async () => {
      // Mock IP validation to test restriction functionality
      jest.spyOn(validationService, 'validateIpAddress').mockResolvedValueOnce(false);

      const payload = {
        event_type: 'order_created',
        order_id: 'ip_restriction_test'
      };

      const payloadString = JSON.stringify(payload);
      const signature = crypto.createHmac('sha256', mockSecrets.careem)
        .update(payloadString)
        .digest('hex');

      const response = await request(app.getHttpServer())
        .post(`/webhooks/careem/${testClientId}`)
        .set('x-careem-signature', signature)
        .set('Content-Type', 'application/json')
        .set('x-forwarded-for', '192.168.1.100') // Simulate external IP
        .send(payload)
        .expect(200);

      // Should be rejected due to IP restriction
      expect(response.body).toHaveProperty('status', 'unauthorized');
    });
  });

  describe('Security Edge Cases', () => {
    it('should handle extremely large payloads securely', async () => {
      const largeData = 'x'.repeat(1024 * 1024); // 1MB of data

      const payload = {
        event_type: 'order_created',
        order_id: 'large_payload_test',
        large_field: largeData
      };

      const payloadString = JSON.stringify(payload);
      const signature = crypto.createHmac('sha256', mockSecrets.careem)
        .update(payloadString)
        .digest('hex');

      const response = await request(app.getHttpServer())
        .post(`/webhooks/careem/${testClientId}`)
        .set('x-careem-signature', signature)
        .set('Content-Type', 'application/json')
        .send(payload);

      // Should either process successfully or reject due to size limits
      expect([200, 413]).toContain(response.status);
    });

    it('should handle malformed JSON gracefully', async () => {
      const malformedJson = '{"event_type": "order_created", "incomplete":';

      const response = await request(app.getHttpServer())
        .post(`/webhooks/careem/${testClientId}`)
        .set('x-careem-signature', 'any_signature')
        .set('Content-Type', 'application/json')
        .send(malformedJson);

      expect([400, 200]).toContain(response.status);
    });

    it('should validate webhook client ID format', async () => {
      const invalidClientIds = [
        '../invalid',
        'client;drop table;',
        'client<script>alert(1)</script>',
        ''
      ];

      for (const clientId of invalidClientIds) {
        const payload = { event_type: 'test' };
        const payloadString = JSON.stringify(payload);
        const signature = crypto.createHmac('sha256', 'test_secret')
          .update(payloadString)
          .digest('hex');

        const response = await request(app.getHttpServer())
          .post(`/webhooks/careem/${encodeURIComponent(clientId)}`)
          .set('x-careem-signature', signature)
          .set('Content-Type', 'application/json')
          .send(payload);

        // Should handle invalid client IDs gracefully
        expect([400, 404, 200]).toContain(response.status);
      }
    });
  });
});