import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';
import { DHUBProvider } from '../../providers/dhub.provider';
import { ProviderConfig, StandardOrderFormat, DeliveryStatus } from '../../interfaces/delivery-provider.interface';

describe('DHUB Integration Tests', () => {
  let dhubProvider: DHUBProvider;
  let mockAxios: MockAdapter;
  let config: ProviderConfig;

  beforeEach(() => {
    mockAxios = new MockAdapter(axios);
    config = {
      providerId: 'dhub-test',
      providerType: 'dhub',
      companyId: 'test-company',
      isActive: true,
      priority: 1,
      apiConfig: {
        baseUrl: 'https://api.dhub.jo',
        timeout: 30000,
        retryAttempts: 3,
        retryDelay: 1000
      },
      credentials: {
        username: 'test_user',
        password: 'test_pass',
        merchantId: 'MERCH001'
      },
      businessRules: {
        serviceFee: 2.5,
        minimumOrderValue: 5.0,
        maximumOrderValue: 200.0,
        coverageRadius: 15,
        operatingHours: {
          start: '08:00',
          end: '23:00'
        }
      }
    };
    dhubProvider = new DHUBProvider(config);
  });

  afterEach(() => {
    mockAxios.restore();
  });

  describe('Authentication Flow', () => {
    it('should authenticate successfully and get access token', async () => {
      const mockAuthResponse = {
        access_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        token_type: 'Bearer',
        expires_in: 3600,
        refresh_token: 'refresh_token_here'
      };

      mockAxios.onPost('/oauth/token').reply(200, mockAuthResponse);

      const result = await dhubProvider.authenticate();

      expect(result).toBe(true);
      expect(mockAxios.history.post).toHaveLength(1);
      
      const authRequest = mockAxios.history.post[0];
      expect(authRequest.url).toBe('/oauth/token');
      expect(authRequest.data).toContain('grant_type=password');
      expect(authRequest.data).toContain('username=test_user');
    });

    it('should handle authentication failure', async () => {
      mockAxios.onPost('/oauth/token').reply(401, {
        error: 'invalid_credentials',
        error_description: 'Invalid username or password'
      });

      const result = await dhubProvider.authenticate();

      expect(result).toBe(false);
    });

    it('should retry authentication on network error', async () => {
      mockAxios
        .onPost('/oauth/token')
        .replyOnce(500, { error: 'Internal Server Error' })
        .onPost('/oauth/token')
        .replyOnce(200, {
          access_token: 'token_after_retry',
          token_type: 'Bearer',
          expires_in: 3600
        });

      const result = await dhubProvider.authenticate();

      expect(result).toBe(true);
      expect(mockAxios.history.post).toHaveLength(2);
    });
  });

  describe('Order Creation Flow', () => {
    const mockOrder: StandardOrderFormat = {
      orderId: 'ORDER-12345',
      branchId: 'BRANCH-001',
      companyId: 'test-company',
      customer: {
        name: 'أحمد محمد علي',
        phone: '+962791234567',
        email: 'ahmed@example.com'
      },
      deliveryAddress: {
        street: 'شارع الملك حسين 15',
        city: 'عمان',
        area: 'جبل عمان',
        latitude: 31.9454,
        longitude: 35.9284,
        instructions: 'بجانب البنك العربي، الطابق الثاني'
      },
      items: [
        {
          id: 'ITEM-001',
          name: 'برجر كلاسيك',
          quantity: 2,
          price: 8.50,
          modifiers: [
            { name: 'جبنة إضافية', price: 1.0 }
          ]
        },
        {
          id: 'ITEM-002',
          name: 'بطاطا مقلية',
          quantity: 1,
          price: 3.75
        }
      ],
      subtotal: 21.75,
      deliveryFee: 2.50,
      tax: 0.0,
      discount: 0.0,
      total: 24.25,
      paymentMethod: 'cash',
      priority: 'normal',
      estimatedPreparationTime: 25,
      notes: 'بدون بصل في البرجر'
    };

    beforeEach(async () => {
      // Mock successful authentication
      mockAxios.onPost('/oauth/token').reply(200, {
        access_token: 'valid_token',
        token_type: 'Bearer',
        expires_in: 3600
      });
      await dhubProvider.authenticate();
      mockAxios.reset();
    });

    it('should create order successfully with Arabic content', async () => {
      const mockOrderResponse = {
        order_id: 'DHUB-789123',
        status: 'confirmed',
        tracking_number: 'TRK-456789',
        estimated_delivery_time: '2024-01-15T14:30:00Z',
        delivery_fee: 2.50,
        total_cost: 24.25
      };

      mockAxios.onPost('/api/v1/orders').reply(201, mockOrderResponse);

      const result = await dhubProvider.createOrder(mockOrder);

      expect(result.success).toBe(true);
      expect(result.orderId).toBe('DHUB-789123');
      expect(result.trackingNumber).toBe('TRK-456789');
      expect(result.estimatedDeliveryTime).toBeDefined();

      const orderRequest = mockAxios.history.post[0];
      const requestData = JSON.parse(orderRequest.data);
      
      // Verify Arabic content is preserved
      expect(requestData.customer.name).toBe('أحمد محمد علي');
      expect(requestData.delivery_address.street).toBe('شارع الملك حسين 15');
      expect(requestData.delivery_address.city).toBe('عمان');
      expect(requestData.items[0].name).toBe('برجر كلاسيك');
      expect(requestData.notes).toBe('بدون بصل في البرجر');
    });

    it('should handle order rejection due to out of coverage area', async () => {
      mockAxios.onPost('/api/v1/orders').reply(400, {
        error: 'out_of_coverage',
        message: 'Delivery address is outside our service area',
        supported_areas: ['عمان', 'الزرقاء', 'إربد']
      });

      const result = await dhubProvider.createOrder(mockOrder);

      expect(result.success).toBe(false);
      expect(result.error).toContain('out_of_coverage');
    });

    it('should validate Jordan phone numbers correctly', async () => {
      const invalidOrder = {
        ...mockOrder,
        customer: {
          ...mockOrder.customer,
          phone: '+1234567890' // Non-Jordan number
        }
      };

      mockAxios.onPost('/api/v1/orders').reply(400, {
        error: 'invalid_phone',
        message: 'Phone number must be a valid Jordan mobile number'
      });

      const result = await dhubProvider.createOrder(invalidOrder);

      expect(result.success).toBe(false);
      expect(result.error).toContain('invalid_phone');
    });
  });

  describe('Order Tracking Flow', () => {
    beforeEach(async () => {
      mockAxios.onPost('/oauth/token').reply(200, {
        access_token: 'valid_token',
        token_type: 'Bearer',
        expires_in: 3600
      });
      await dhubProvider.authenticate();
      mockAxios.reset();
    });

    it('should track order status successfully', async () => {
      const mockTrackingResponse = {
        order_id: 'DHUB-789123',
        status: 'in_transit',
        driver: {
          name: 'محمد أحمد',
          phone: '+962791234567',
          location: {
            latitude: 31.9500,
            longitude: 35.9300
          }
        },
        estimated_arrival: '2024-01-15T14:45:00Z',
        status_history: [
          {
            status: 'confirmed',
            timestamp: '2024-01-15T13:00:00Z'
          },
          {
            status: 'preparing',
            timestamp: '2024-01-15T13:15:00Z'
          },
          {
            status: 'ready_for_pickup',
            timestamp: '2024-01-15T13:45:00Z'
          },
          {
            status: 'picked_up',
            timestamp: '2024-01-15T14:00:00Z'
          },
          {
            status: 'in_transit',
            timestamp: '2024-01-15T14:15:00Z'
          }
        ]
      };

      mockAxios.onGet('/api/v1/orders/DHUB-789123/tracking').reply(200, mockTrackingResponse);

      const result = await dhubProvider.trackOrder('DHUB-789123');

      expect(result.orderId).toBe('DHUB-789123');
      expect(result.status).toBe(DeliveryStatus.IN_TRANSIT);
      expect(result.driverInfo?.name).toBe('محمد أحمد');
      expect(result.driverInfo?.location).toEqual({
        latitude: 31.9500,
        longitude: 35.9300
      });
      expect(result.statusHistory).toHaveLength(5);
    });

    it('should handle order not found error', async () => {
      mockAxios.onGet('/api/v1/orders/INVALID-ORDER/tracking').reply(404, {
        error: 'order_not_found',
        message: 'Order not found'
      });

      await expect(dhubProvider.trackOrder('INVALID-ORDER')).rejects.toThrow('Order not found');
    });
  });

  describe('Coverage Area Validation', () => {
    beforeEach(async () => {
      mockAxios.onPost('/oauth/token').reply(200, {
        access_token: 'valid_token',
        token_type: 'Bearer',
        expires_in: 3600
      });
      await dhubProvider.authenticate();
      mockAxios.reset();
    });

    it('should validate coverage for Amman locations', async () => {
      const mockCoverageResponse = {
        is_covered: true,
        area_name: 'جبل عمان',
        delivery_fee: 2.50,
        estimated_delivery_time: 35
      };

      mockAxios.onGet('/api/v1/coverage/check').reply(200, mockCoverageResponse);

      const result = await dhubProvider.validateCoverage({
        latitude: 31.9454,
        longitude: 35.9284
      });

      expect(result.isSupported).toBe(true);
      expect(result.deliveryFee).toBe(2.50);
      expect(result.estimatedDeliveryTime).toBe(35);
    });

    it('should reject coverage for locations outside Jordan', async () => {
      const mockCoverageResponse = {
        is_covered: false,
        message: 'Location outside Jordan coverage area'
      };

      mockAxios.onGet('/api/v1/coverage/check').reply(200, mockCoverageResponse);

      const result = await dhubProvider.validateCoverage({
        latitude: 33.8869,
        longitude: 35.5131 // Beirut coordinates
      });

      expect(result.isSupported).toBe(false);
    });
  });

  describe('Order Cancellation Flow', () => {
    beforeEach(async () => {
      mockAxios.onPost('/oauth/token').reply(200, {
        access_token: 'valid_token',
        token_type: 'Bearer',
        expires_in: 3600
      });
      await dhubProvider.authenticate();
      mockAxios.reset();
    });

    it('should cancel order successfully', async () => {
      const mockCancelResponse = {
        order_id: 'DHUB-789123',
        status: 'cancelled',
        cancellation_reason: 'customer_request',
        refund_amount: 24.25,
        cancelled_at: '2024-01-15T13:30:00Z'
      };

      mockAxios.onPost('/api/v1/orders/DHUB-789123/cancel').reply(200, mockCancelResponse);

      const result = await dhubProvider.cancelOrder('DHUB-789123', 'customer_request');

      expect(result.success).toBe(true);
      expect(result.refundAmount).toBe(24.25);
    });

    it('should handle cancellation failure when order is already dispatched', async () => {
      mockAxios.onPost('/api/v1/orders/DHUB-789123/cancel').reply(400, {
        error: 'cannot_cancel',
        message: 'Order cannot be cancelled as it is already dispatched'
      });

      const result = await dhubProvider.cancelOrder('DHUB-789123', 'customer_request');

      expect(result.success).toBe(false);
      expect(result.error).toContain('cannot_cancel');
    });
  });

  describe('Webhook Handling', () => {
    it('should process webhook notifications correctly', async () => {
      const webhookPayload = {
        order_id: 'DHUB-789123',
        status: 'delivered',
        delivered_at: '2024-01-15T15:00:00Z',
        driver_rating: 4.8,
        signature: 'customer_signature_hash'
      };

      const result = dhubProvider.processWebhook(webhookPayload, {
        'x-dhub-signature': 'sha256=valid_signature_hash'
      });

      expect(result.orderId).toBe('DHUB-789123');
      expect(result.status).toBe(DeliveryStatus.DELIVERED);
      expect(result.deliveredAt).toBeDefined();
    });

    it('should reject webhook with invalid signature', async () => {
      const webhookPayload = {
        order_id: 'DHUB-789123',
        status: 'delivered'
      };

      expect(() => {
        dhubProvider.processWebhook(webhookPayload, {
          'x-dhub-signature': 'sha256=invalid_signature'
        });
      }).toThrow('Invalid webhook signature');
    });
  });

  describe('Error Handling and Resilience', () => {
    beforeEach(async () => {
      mockAxios.onPost('/oauth/token').reply(200, {
        access_token: 'valid_token',
        token_type: 'Bearer',
        expires_in: 3600
      });
      await dhubProvider.authenticate();
      mockAxios.reset();
    });

    it('should handle rate limiting with exponential backoff', async () => {
      const mockOrder: StandardOrderFormat = createMockOrder();

      mockAxios
        .onPost('/api/v1/orders')
        .replyOnce(429, { error: 'rate_limit_exceeded', retry_after: 2 })
        .onPost('/api/v1/orders')
        .replyOnce(200, { order_id: 'DHUB-SUCCESS', status: 'confirmed' });

      const result = await dhubProvider.createOrder(mockOrder);

      expect(result.success).toBe(true);
      expect(result.orderId).toBe('DHUB-SUCCESS');
      expect(mockAxios.history.post).toHaveLength(2);
    });

    it('should handle network timeouts gracefully', async () => {
      const mockOrder: StandardOrderFormat = createMockOrder();

      mockAxios.onPost('/api/v1/orders').timeout();

      const result = await dhubProvider.createOrder(mockOrder);

      expect(result.success).toBe(false);
      expect(result.error).toContain('timeout');
    });

    it('should handle server errors with proper logging', async () => {
      const mockOrder: StandardOrderFormat = createMockOrder();

      mockAxios.onPost('/api/v1/orders').reply(500, {
        error: 'internal_server_error',
        message: 'Temporary server issue'
      });

      const result = await dhubProvider.createOrder(mockOrder);

      expect(result.success).toBe(false);
      expect(result.error).toContain('internal_server_error');
    });
  });
});

function createMockOrder(): StandardOrderFormat {
  return {
    orderId: 'TEST-ORDER-123',
    branchId: 'TEST-BRANCH',
    companyId: 'test-company',
    customer: {
      name: 'Test Customer',
      phone: '+962791234567',
      email: 'test@example.com'
    },
    deliveryAddress: {
      street: 'Test Street 123',
      city: 'عمان',
      area: 'Test Area',
      latitude: 31.9454,
      longitude: 35.9284
    },
    items: [
      {
        id: 'ITEM-1',
        name: 'Test Item',
        quantity: 1,
        price: 10.00
      }
    ],
    subtotal: 10.00,
    deliveryFee: 2.50,
    tax: 0.0,
    discount: 0.0,
    total: 12.50,
    paymentMethod: 'cash',
    priority: 'normal',
    estimatedPreparationTime: 20
  };
}