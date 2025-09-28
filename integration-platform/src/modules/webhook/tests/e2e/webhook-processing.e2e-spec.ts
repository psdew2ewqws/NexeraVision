import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import * as crypto from 'crypto';
import { WebhookModule } from '../../webhook.module';
import { WebhookProcessorService } from '../../webhook-processor.service';
import { WebhookLoggerService } from '../../webhook-logger.service';

describe('Webhook Processing E2E Tests', () => {
  let app: INestApplication;
  let processorService: WebhookProcessorService;
  let loggerService: WebhookLoggerService;

  const testClientId = 'processing-test-client';

  // Mock secrets for signature validation
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

    processorService = moduleFixture.get<WebhookProcessorService>(WebhookProcessorService);
    loggerService = moduleFixture.get<WebhookLoggerService>(WebhookLoggerService);

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Order Event Processing', () => {
    const createValidSignature = (payload: string, provider: string): string => {
      const secret = mockSecrets[provider];
      if (provider === 'deliveroo') {
        return crypto.createHmac('sha256', secret).update(payload).digest('base64');
      }
      return crypto.createHmac('sha256', secret).update(payload).digest('hex');
    };

    it('should process Careem order creation event successfully', async () => {
      const payload = {
        event_type: 'order_created',
        order_id: 'CAREEM_ORDER_001',
        restaurant_id: 'REST_456',
        status: 'confirmed',
        timestamp: new Date().toISOString(),
        data: {
          customer: {
            id: 'cust_123',
            name: 'Mohammed Ahmed',
            phone: '+966501234567',
            email: 'mohammed@example.com'
          },
          delivery_address: {
            street: 'King Fahd Road',
            building: '123',
            floor: '2',
            apartment: '5A',
            city: 'Riyadh',
            postal_code: '12345',
            country: 'Saudi Arabia',
            coordinates: {
              latitude: 24.7136,
              longitude: 46.6753
            }
          },
          items: [
            {
              id: 'item_1',
              name: 'Chicken Shawarma',
              quantity: 2,
              unit_price: 15.00,
              total_price: 30.00,
              modifiers: [
                {
                  id: 'mod_1',
                  name: 'Extra Garlic',
                  price: 2.00
                }
              ],
              special_instructions: 'No onions please'
            },
            {
              id: 'item_2',
              name: 'French Fries',
              quantity: 1,
              unit_price: 8.00,
              total_price: 8.00
            }
          ],
          payment: {
            method: 'credit_card',
            status: 'paid',
            amount: 50.00,
            currency: 'SAR',
            transaction_id: 'txn_careem_123',
            paid_at: new Date().toISOString()
          },
          pricing: {
            subtotal: 40.00,
            delivery_fee: 5.00,
            service_fee: 3.00,
            tax: 2.00,
            total: 50.00,
            currency: 'SAR'
          },
          delivery_time: {
            estimated_at: new Date(Date.now() + 45 * 60 * 1000).toISOString(),
            requested_for: 'asap'
          },
          notes: 'Please call when you arrive'
        }
      };

      const payloadString = JSON.stringify(payload);
      const signature = createValidSignature(payloadString, 'careem');

      const response = await request(app.getHttpServer())
        .post(`/webhooks/careem/${testClientId}`)
        .set('x-careem-signature', signature)
        .set('Content-Type', 'application/json')
        .send(payload)
        .expect(200);

      expect(response.body).toHaveProperty('status', 'received');

      // Verify event was logged
      const logs = await loggerService.getWebhookLogs({
        provider: 'careem',
        clientId: testClientId,
        limit: 1
      });

      expect(logs.logs).toHaveLength(1);
      expect(logs.logs[0]).toHaveProperty('eventType', 'order_created');
      expect(logs.logs[0]).toHaveProperty('status', 'processed');
    });

    it('should process Talabat order update event with status changes', async () => {
      const payload = {
        type: 'order_status_update',
        order_id: 'TALABAT_ORDER_002',
        restaurant_id: 'REST_789',
        previous_status: 'new',
        current_status: 'accepted',
        timestamp: new Date().toISOString(),
        order_details: {
          customer: {
            name: 'Sara Al-Mansouri',
            phone: '+971501234567'
          },
          items: [
            {
              id: 'item_1',
              name: 'Margherita Pizza',
              quantity: 1,
              price: 45.00
            }
          ],
          total: 45.00,
          currency: 'AED',
          estimated_delivery: new Date(Date.now() + 30 * 60 * 1000).toISOString()
        },
        metadata: {
          restaurant_notes: 'Order accepted, preparing now',
          kitchen_display_time: new Date().toISOString()
        }
      };

      const response = await request(app.getHttpServer())
        .post(`/webhooks/talabat/${testClientId}`)
        .set('x-talabat-api-key', mockSecrets.talabat)
        .set('Content-Type', 'application/json')
        .send(payload)
        .expect(200);

      expect(response.body).toHaveProperty('status', 'success');

      // Verify status update was processed
      const logs = await loggerService.getWebhookLogs({
        provider: 'talabat',
        clientId: testClientId,
        limit: 1
      });

      expect(logs.logs[0]).toHaveProperty('eventType', 'order_status_update');
      expect(logs.logs[0].payload.current_status).toBe('accepted');
    });

    it('should process Deliveroo order cancellation event', async () => {
      const payload = {
        event: 'order_cancelled',
        order: {
          id: 'DELIVEROO_ORDER_003',
          reference: 'DR789123',
          status: 'cancelled',
          cancelled_at: new Date().toISOString(),
          cancellation_reason: 'customer_request',
          cancellation_details: {
            reason_code: 'CUSTOMER_CANCEL',
            refund_status: 'processing',
            refund_amount: 2500, // in cents
            notes: 'Customer changed mind'
          },
          customer: {
            first_name: 'James',
            last_name: 'Wilson',
            phone_number: '+44123456789'
          },
          restaurant: {
            id: 'deliveroo_rest_456',
            name: 'Test Restaurant'
          }
        },
        metadata: {
          cancellation_source: 'customer_app',
          processing_time_ms: 150
        }
      };

      const payloadString = JSON.stringify(payload);
      const signature = createValidSignature(payloadString, 'deliveroo');

      const response = await request(app.getHttpServer())
        .post(`/webhooks/deliveroo/${testClientId}`)
        .set('x-deliveroo-hmac-sha256', signature)
        .set('Content-Type', 'application/json')
        .send(payload)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);

      // Verify cancellation was processed
      const logs = await loggerService.getWebhookLogs({
        provider: 'deliveroo',
        clientId: testClientId,
        limit: 1
      });

      expect(logs.logs[0]).toHaveProperty('eventType', 'order_cancelled');
      expect(logs.logs[0].payload.order.cancellation_reason).toBe('customer_request');
    });

    it('should process Jahez order delivery confirmation', async () => {
      const payload = {
        action: 'order_delivered',
        orderId: 'JAHEZ_ORDER_004',
        restaurantCode: 'JAHEZ_REST_001',
        status: 'delivered',
        requestId: 'req_delivery_' + Date.now(),
        timestamp: new Date().toISOString(),
        orderData: {
          customer: {
            name: 'Fatima Al-Zahra',
            phone: '+966501234567'
          },
          delivery_details: {
            delivered_at: new Date().toISOString(),
            driver: {
              id: 'driver_123',
              name: 'Ahmed Ali',
              phone: '+966501234568'
            },
            delivery_time_minutes: 28,
            customer_rating: 5,
            delivery_notes: 'Delivered successfully to customer'
          },
          payment_confirmation: {
            method: 'cash',
            amount: 75.00,
            currency: 'SAR',
            collected_by_driver: true
          }
        }
      };

      const response = await request(app.getHttpServer())
        .post(`/webhooks/jahez/${testClientId}`)
        .set('authorization', `Bearer ${mockSecrets.jahez}`)
        .set('Content-Type', 'application/json')
        .send(payload)
        .expect(200);

      expect(response.body).toHaveProperty('result', 'ok');

      // Verify delivery confirmation was processed
      const logs = await loggerService.getWebhookLogs({
        provider: 'jahez',
        clientId: testClientId,
        limit: 1
      });

      expect(logs.logs[0]).toHaveProperty('eventType', 'order_delivered');
      expect(logs.logs[0].payload.orderData.delivery_details.delivered_at).toBeDefined();
    });
  });

  describe('Menu Event Processing', () => {
    it('should process menu item availability changes', async () => {
      const payload = {
        event_type: 'item_availability_changed',
        restaurant_id: 'REST_456',
        timestamp: new Date().toISOString(),
        data: {
          items: [
            {
              id: 'item_burger',
              name: 'Classic Burger',
              was_available: true,
              is_available: false,
              reason: 'out_of_stock',
              estimated_restock_time: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString()
            },
            {
              id: 'item_pizza',
              name: 'Margherita Pizza',
              was_available: false,
              is_available: true,
              reason: 'restocked'
            }
          ],
          category_updates: [
            {
              id: 'cat_beverages',
              name: 'Beverages',
              available_count: 15,
              total_count: 20
            }
          ]
        }
      };

      const payloadString = JSON.stringify(payload);
      const signature = createValidSignature(payloadString, 'careem');

      const response = await request(app.getHttpServer())
        .post(`/webhooks/careem/${testClientId}`)
        .set('x-careem-signature', signature)
        .set('Content-Type', 'application/json')
        .send(payload)
        .expect(200);

      expect(response.body).toHaveProperty('status', 'received');

      // Verify menu update was processed
      const logs = await loggerService.getWebhookLogs({
        provider: 'careem',
        clientId: testClientId,
        eventType: 'item_availability_changed',
        limit: 1
      });

      expect(logs.logs[0].payload.data.items).toHaveLength(2);
    });

    it('should process bulk menu updates', async () => {
      const payload = {
        type: 'menu_bulk_update',
        restaurant_id: 'REST_789',
        timestamp: new Date().toISOString(),
        update_type: 'price_change',
        changes: {
          items: Array.from({ length: 50 }, (_, i) => ({
            id: `item_${i + 1}`,
            name: `Menu Item ${i + 1}`,
            old_price: 20.00 + i,
            new_price: 22.00 + i,
            currency: 'SAR',
            effective_from: new Date().toISOString()
          })),
          categories_affected: ['appetizers', 'main_courses', 'desserts'],
          reason: 'inflation_adjustment',
          batch_id: 'batch_' + Date.now()
        }
      };

      const response = await request(app.getHttpServer())
        .post(`/webhooks/talabat/${testClientId}`)
        .set('x-talabat-api-key', mockSecrets.talabat)
        .set('Content-Type', 'application/json')
        .send(payload)
        .expect(200);

      expect(response.body).toHaveProperty('status', 'success');

      // Verify bulk update was processed
      const logs = await loggerService.getWebhookLogs({
        provider: 'talabat',
        clientId: testClientId,
        limit: 1
      });

      expect(logs.logs[0].payload.changes.items).toHaveLength(50);
    });
  });

  describe('Event Normalization and Transformation', () => {
    it('should normalize different provider order formats to standard format', async () => {
      // Test data transformation from provider-specific format to normalized format
      const careemPayload = {
        event_type: 'order_created',
        order_id: 'CAREEM_123',
        data: {
          customer: { name: 'John Doe', phone: '+1234567890' },
          items: [{ id: 'item_1', name: 'Burger', quantity: 1, unit_price: 25.00 }],
          pricing: { total: 25.00, currency: 'SAR' }
        }
      };

      const payloadString = JSON.stringify(careemPayload);
      const signature = createValidSignature(payloadString, 'careem');

      await request(app.getHttpServer())
        .post(`/webhooks/careem/${testClientId}`)
        .set('x-careem-signature', signature)
        .set('Content-Type', 'application/json')
        .send(careemPayload)
        .expect(200);

      // Verify normalized data was stored
      const logs = await loggerService.getWebhookLogs({
        provider: 'careem',
        clientId: testClientId,
        limit: 1
      });

      const log = logs.logs[0];
      expect(log).toHaveProperty('normalizedData');
      expect(log.normalizedData).toHaveProperty('orderId', 'CAREEM_123');
      expect(log.normalizedData).toHaveProperty('provider', 'careem');
      expect(log.normalizedData).toHaveProperty('customer');
      expect(log.normalizedData).toHaveProperty('items');
      expect(log.normalizedData).toHaveProperty('total', 25.00);
    });

    it('should handle provider-specific field mappings correctly', async () => {
      const deliverooPayload = {
        event: 'order_placed',
        order: {
          id: 'DELIVEROO_456',
          reference: 'DR123456',
          items: [
            {
              external_id: 'ext_item_1',
              name: 'Pizza',
              quantity: 1,
              price_excluding_tax: 2000, // Deliveroo uses cents
              price_including_tax: 2200
            }
          ],
          total_price_excluding_tax: 2000,
          total_price_including_tax: 2200,
          customer: {
            first_name: 'Jane',
            last_name: 'Smith',
            phone_number: '+44123456789'
          }
        }
      };

      const payloadString = JSON.stringify(deliverooPayload);
      const signature = createValidSignature(payloadString, 'deliveroo');

      await request(app.getHttpServer())
        .post(`/webhooks/deliveroo/${testClientId}`)
        .set('x-deliveroo-hmac-sha256', signature)
        .set('Content-Type', 'application/json')
        .send(deliverooPayload)
        .expect(200);

      // Verify Deliveroo-specific fields were mapped correctly
      const logs = await loggerService.getWebhookLogs({
        provider: 'deliveroo',
        clientId: testClientId,
        limit: 1
      });

      const log = logs.logs[0];
      expect(log.normalizedData.orderId).toBe('DELIVEROO_456');
      expect(log.normalizedData.customer.name).toBe('Jane Smith');
      expect(log.normalizedData.total).toBe(22.00); // Converted from cents to currency units
    });
  });

  describe('Real-time WebSocket Events', () => {
    it('should emit WebSocket events for processed webhooks', async () => {
      // Mock WebSocket client connection
      const websocketEvents = [];

      // Mock the WebSocket gateway to capture emitted events
      jest.spyOn(processorService, 'processWebhook').mockImplementation(async (data) => {
        // Simulate real processing
        const processed = await processorService.processWebhook(data);

        // Capture what would be emitted to WebSocket
        websocketEvents.push({
          event: 'webhook_processed',
          data: {
            provider: data.provider,
            clientId: data.clientId,
            eventType: data.eventType,
            timestamp: new Date().toISOString()
          }
        });

        return processed;
      });

      const payload = {
        event_type: 'order_created',
        order_id: 'WEBSOCKET_TEST_001'
      };

      const payloadString = JSON.stringify(payload);
      const signature = createValidSignature(payloadString, 'careem');

      await request(app.getHttpServer())
        .post(`/webhooks/careem/${testClientId}`)
        .set('x-careem-signature', signature)
        .set('Content-Type', 'application/json')
        .send(payload)
        .expect(200);

      // Verify WebSocket event was emitted
      expect(websocketEvents).toHaveLength(1);
      expect(websocketEvents[0]).toHaveProperty('event', 'webhook_processed');
      expect(websocketEvents[0].data).toHaveProperty('provider', 'careem');
      expect(websocketEvents[0].data).toHaveProperty('clientId', testClientId);
    });
  });

  describe('Performance Metrics Collection', () => {
    it('should collect processing time metrics', async () => {
      const startTime = Date.now();

      const payload = {
        event_type: 'order_created',
        order_id: 'METRICS_TEST_001',
        data: {
          items: Array.from({ length: 20 }, (_, i) => ({
            id: `item_${i}`,
            name: `Item ${i}`,
            quantity: 1,
            price: 10.00
          }))
        }
      };

      const payloadString = JSON.stringify(payload);
      const signature = createValidSignature(payloadString, 'careem');

      const response = await request(app.getHttpServer())
        .post(`/webhooks/careem/${testClientId}`)
        .set('x-careem-signature', signature)
        .set('Content-Type', 'application/json')
        .send(payload)
        .expect(200);

      const endTime = Date.now();
      const processingTime = endTime - startTime;

      // Verify processing completed within reasonable time
      expect(processingTime).toBeLessThan(5000); // Should process within 5 seconds

      // Verify metrics were collected
      const logs = await loggerService.getWebhookLogs({
        provider: 'careem',
        clientId: testClientId,
        limit: 1
      });

      const log = logs.logs[0];
      expect(log).toHaveProperty('processingTimeMs');
      expect(log.processingTimeMs).toBeGreaterThan(0);
      expect(log.processingTimeMs).toBeLessThan(processingTime);
    });

    it('should track payload size metrics', async () => {
      const largePayload = {
        event_type: 'order_created',
        order_id: 'SIZE_METRICS_001',
        data: {
          description: 'A'.repeat(10000), // 10KB of data
          items: Array.from({ length: 100 }, (_, i) => ({
            id: `item_${i}`,
            name: `Large Item Name ${i} with detailed description`,
            description: 'B'.repeat(500),
            quantity: 1,
            price: 10.00
          }))
        }
      };

      const payloadString = JSON.stringify(largePayload);
      const signature = createValidSignature(payloadString, 'careem');

      await request(app.getHttpServer())
        .post(`/webhooks/careem/${testClientId}`)
        .set('x-careem-signature', signature)
        .set('Content-Type', 'application/json')
        .send(largePayload)
        .expect(200);

      // Verify payload size was tracked
      const logs = await loggerService.getWebhookLogs({
        provider: 'careem',
        clientId: testClientId,
        limit: 1
      });

      const log = logs.logs[0];
      expect(log).toHaveProperty('payloadSizeBytes');
      expect(log.payloadSizeBytes).toBeGreaterThan(50000); // Should be > 50KB
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle malformed event data gracefully', async () => {
      const malformedPayload = {
        event_type: 'order_created',
        order_id: null, // Invalid order ID
        data: {
          customer: {
            name: '', // Empty name
            phone: 'invalid-phone' // Invalid phone format
          },
          items: [] // Empty items array
        }
      };

      const payloadString = JSON.stringify(malformedPayload);
      const signature = createValidSignature(payloadString, 'careem');

      const response = await request(app.getHttpServer())
        .post(`/webhooks/careem/${testClientId}`)
        .set('x-careem-signature', signature)
        .set('Content-Type', 'application/json')
        .send(malformedPayload)
        .expect(200);

      expect(response.body).toHaveProperty('status', 'received');

      // Verify error was logged but processing continued
      const logs = await loggerService.getWebhookLogs({
        provider: 'careem',
        clientId: testClientId,
        limit: 1
      });

      const log = logs.logs[0];
      expect(log).toHaveProperty('status', 'processed_with_warnings');
      expect(log).toHaveProperty('warnings');
      expect(log.warnings).toContain('Invalid order ID');
    });

    it('should handle processing timeout scenarios', async () => {
      // Mock a slow processing scenario
      jest.spyOn(processorService, 'processWebhook').mockImplementation(async (data) => {
        // Simulate slow processing
        await new Promise(resolve => setTimeout(resolve, 100));
        return { status: 'processed', processingTime: 100 };
      });

      const payload = {
        event_type: 'order_created',
        order_id: 'TIMEOUT_TEST_001'
      };

      const payloadString = JSON.stringify(payload);
      const signature = createValidSignature(payloadString, 'careem');

      const response = await request(app.getHttpServer())
        .post(`/webhooks/careem/${testClientId}`)
        .set('x-careem-signature', signature)
        .set('Content-Type', 'application/json')
        .send(payload)
        .expect(200);

      expect(response.body).toHaveProperty('status', 'received');
    });

    it('should handle concurrent processing of multiple events', async () => {
      const promises = [];

      for (let i = 0; i < 10; i++) {
        const payload = {
          event_type: 'order_created',
          order_id: `CONCURRENT_ORDER_${i}`,
          timestamp: new Date().toISOString(),
          data: {
            customer: { name: `Customer ${i}` },
            items: [{ id: `item_${i}`, price: 10.00 * (i + 1) }]
          }
        };

        const payloadString = JSON.stringify(payload);
        const signature = createValidSignature(payloadString, 'careem');

        promises.push(
          request(app.getHttpServer())
            .post(`/webhooks/careem/${testClientId}`)
            .set('x-careem-signature', signature)
            .set('Content-Type', 'application/json')
            .send(payload)
        );
      }

      const responses = await Promise.all(promises);

      // All requests should be processed successfully
      responses.forEach((response, index) => {
        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('status', 'received');
      });

      // Verify all events were logged
      const logs = await loggerService.getWebhookLogs({
        provider: 'careem',
        clientId: testClientId,
        limit: 10
      });

      expect(logs.logs).toHaveLength(10);
    });
  });
});