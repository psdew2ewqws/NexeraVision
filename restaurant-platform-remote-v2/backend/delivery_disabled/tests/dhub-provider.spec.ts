import { Test, TestingModule } from '@nestjs/testing';
import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';
import { DHUBProvider } from '../providers/dhub.provider';
import { ProviderConfig, StandardOrderFormat, DeliveryFeeRequest } from '../interfaces/delivery-provider.interface';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('DHUBProvider', () => {
  let provider: DHUBProvider;
  let mockAxios: MockAdapter;

  const mockConfig: ProviderConfig = {
    providerId: 'dhub-test-1',
    providerType: 'dhub',
    companyId: 'test-company',
    isActive: true,
    priority: 1,
    apiConfig: {
      baseUrl: 'https://api.dhub.com/v1',
      timeout: 30000,
      retryAttempts: 3,
      retryDelay: 1000
    },
    credentials: {
      apiKey: 'test-api-key',
      merchantId: 'test-merchant-123'
    },
    businessRules: {
      serviceFee: 2.5
    }
  };

  const mockOrder: StandardOrderFormat = {
    orderId: 'test-order-123',
    branchId: 'test-branch',
    companyId: 'test-company',
    customer: {
      name: 'احمد محمد', // Arabic name
      phone: '+962791234567',
      email: 'ahmed@example.com'
    },
    deliveryAddress: {
      street: 'شارع الملك حسين', // Arabic street name
      city: 'عمان', // Amman in Arabic
      area: 'الدوار السابع', // 7th Circle in Arabic
      building: '15',
      floor: '3',
      apartment: '12',
      latitude: 31.9454,
      longitude: 35.9284,
      instructions: 'بجانب البنك العربي' // Next to Arab Bank in Arabic
    },
    items: [
      {
        id: 'item-1',
        name: 'Mansaf',
        nameAr: 'منسف',
        quantity: 2,
        price: 18.00,
        modifiers: [
          { id: 'mod-1', name: 'Extra Meat', price: 5.00 }
        ]
      },
      {
        id: 'item-2',
        name: 'Knafeh',
        nameAr: 'كنافة',
        quantity: 1,
        price: 8.00
      }
    ],
    subtotal: 44.00,
    deliveryFee: 3.50,
    taxes: 1.50,
    total: 49.00,
    paymentMethod: 'cash',
    priority: 'normal',
    estimatedPreparationTime: 25,
    specialInstructions: 'يرجى الاتصال عند الوصول' // Please call when arriving in Arabic
  };

  beforeEach(async () => {
    // Create mock adapter
    mockAxios = new MockAdapter(axios);
    
    // Mock axios.create to return our mocked axios instance
    const mockInstance = {
      ...axios,
      interceptors: {
        request: { use: jest.fn() },
        response: { use: jest.fn() }
      }
    };
    
    mockedAxios.create.mockReturnValue(mockInstance as any);

    provider = new DHUBProvider(mockConfig);
  });

  afterEach(() => {
    mockAxios.reset();
    jest.clearAllMocks();
  });

  describe('Provider Properties', () => {
    it('should have correct provider identification', () => {
      expect(provider.providerName).toBe('DHUB');
      expect(provider.providerType).toBe('dhub');
    });

    it('should have appropriate capabilities for Jordan market', () => {
      const capabilities = provider.capabilities;
      
      expect(capabilities.supportsBulkOrders).toBe(true);
      expect(capabilities.supportsScheduledDelivery).toBe(true);
      expect(capabilities.supportsRealTimeTracking).toBe(true);
      expect(capabilities.supportsDriverAssignment).toBe(true);
      expect(capabilities.supportsCancellation).toBe(true);
      expect(capabilities.maxDeliveryDistance).toBe(50); // 50km coverage
      expect(capabilities.averageDeliveryTime).toBe(35); // 35 minutes
      expect(capabilities.supportedPaymentMethods).toContain('cash');
    });
  });

  describe('Authentication', () => {
    it('should authenticate successfully with valid credentials', async () => {
      const mockAuthResponse = {
        access_token: 'dhub-access-token-123',
        token_type: 'Bearer',
        expires_in: 3600,
        merchant_info: {
          id: 'test-merchant-123',
          name: 'Test Restaurant'
        }
      };

      mockAxios.onPost('/auth/token').reply(200, mockAuthResponse);

      const result = await provider.authenticate(mockConfig.credentials);

      expect(result.success).toBe(true);
      expect(result.accessToken).toBe('dhub-access-token-123');
      expect(result.expiresAt).toBeDefined();
      expect(result.details?.merchantId).toBe('test-merchant-123');
    });

    it('should handle authentication failure', async () => {
      mockAxios.onPost('/auth/token').reply(401, {
        error: 'invalid_client',
        error_description: 'Invalid API key'
      });

      const result = await provider.authenticate({ apiKey: 'invalid-key' });

      expect(result.success).toBe(false);
      expect(result.errorMessage).toContain('Invalid API key');
    });

    it('should handle network errors during authentication', async () => {
      mockAxios.onPost('/auth/token').networkError();

      const result = await provider.authenticate(mockConfig.credentials);

      expect(result.success).toBe(false);
      expect(result.errorMessage).toBeDefined();
    });
  });

  describe('Order Creation', () => {
    beforeEach(async () => {
      // Mock successful authentication first
      mockAxios.onPost('/auth/token').reply(200, {
        access_token: 'test-token',
        token_type: 'Bearer',
        expires_in: 3600
      });
      
      await provider.authenticate(mockConfig.credentials);
    });

    it('should create order successfully with Arabic content', async () => {
      const mockOrderResponse = {
        order_id: 'dhub-order-456789',
        tracking_number: 'TRK-456789',
        status: 'confirmed',
        estimated_pickup_time: new Date(Date.now() + 1500000).toISOString(),
        estimated_delivery_time: new Date(Date.now() + 3600000).toISOString(),
        delivery_fee: {
          amount: 3.50,
          currency: 'JOD'
        },
        driver: {
          name: 'خالد أحمد', // Arabic driver name
          phone: '+962799876543',
          vehicle_info: 'Honda CRV - White',
          license_plate: '12345'
        }
      };

      mockAxios.onPost('/orders').reply(200, mockOrderResponse);

      const result = await provider.createOrder(mockOrder);

      expect(result.success).toBe(true);
      expect(result.providerOrderId).toBe('dhub-order-456789');
      expect(result.trackingNumber).toBe('TRK-456789');
      expect(result.status).toBe('confirmed');
      expect(result.deliveryFee).toBe(3.50);
      expect(result.driverInfo).toBeDefined();
      expect(result.driverInfo?.name).toBe('خالد أحمد');
    });

    it('should handle order creation failure', async () => {
      mockAxios.onPost('/orders').reply(400, {
        error: 'VALIDATION_ERROR',
        message: 'Address outside delivery zone',
        details: {
          field: 'delivery_address',
          code: 'OUT_OF_ZONE'
        }
      });

      const result = await provider.createOrder(mockOrder);

      expect(result.success).toBe(false);
      expect(result.status).toBe('failed');
      expect(result.errorMessage).toContain('Address outside delivery zone');
    });

    it('should validate order data before creation', async () => {
      const invalidOrder = { ...mockOrder, customer: { name: '', phone: '' } };

      const result = await provider.createOrder(invalidOrder);

      expect(result.success).toBe(false);
      expect(result.errorMessage).toContain('Customer name and phone are required');
    });

    it('should handle Jordan-specific phone number validation', async () => {
      const orderWithInvalidPhone = {
        ...mockOrder,
        customer: { ...mockOrder.customer, phone: '+1234567890' } // Non-Jordan number
      };

      const result = await provider.createOrder(orderWithInvalidPhone);

      expect(result.success).toBe(false);
      expect(result.errorMessage).toContain('Invalid Jordan phone number format');
    });
  });

  describe('Order Cancellation', () => {
    beforeEach(async () => {
      mockAxios.onPost('/auth/token').reply(200, {
        access_token: 'test-token',
        expires_in: 3600
      });
      await provider.authenticate(mockConfig.credentials);
    });

    it('should cancel order successfully', async () => {
      const mockCancelResponse = {
        success: true,
        cancelled_at: new Date().toISOString(),
        cancellation_fee: 0,
        refund_amount: 49.00
      };

      mockAxios.onPut('/orders/dhub-order-456789/cancel').reply(200, mockCancelResponse);

      const result = await provider.cancelOrder('dhub-order-456789', 'Customer requested');

      expect(result.success).toBe(true);
      expect(result.cancelledAt).toBeDefined();
      expect(result.refundAmount).toBe(49.00);
      expect(result.cancellationFee).toBe(0);
    });

    it('should handle cancellation failure', async () => {
      mockAxios.onPut('/orders/dhub-order-456789/cancel').reply(400, {
        error: 'CANCELLATION_NOT_ALLOWED',
        message: 'Order already picked up by driver'
      });

      const result = await provider.cancelOrder('dhub-order-456789');

      expect(result.success).toBe(false);
      expect(result.errorMessage).toContain('Order already picked up by driver');
    });
  });

  describe('Order Status Tracking', () => {
    beforeEach(async () => {
      mockAxios.onPost('/auth/token').reply(200, {
        access_token: 'test-token',
        expires_in: 3600
      });
      await provider.authenticate(mockConfig.credentials);
    });

    it('should get order status with real-time tracking', async () => {
      const mockStatusResponse = {
        order_id: 'dhub-order-456789',
        status: 'in_transit',
        status_updated_at: new Date().toISOString(),
        estimated_delivery_time: new Date(Date.now() + 900000).toISOString(),
        driver: {
          name: 'محمد الأحمد', // Arabic name
          phone: '+962798765432',
          rating: 4.8,
          vehicle_type: 'Motorcycle',
          current_location: {
            latitude: 31.9500,
            longitude: 35.9300,
            last_updated: new Date().toISOString()
          }
        },
        delivery_attempts: 0,
        status_history: [
          {
            status: 'confirmed',
            timestamp: new Date(Date.now() - 1800000).toISOString(),
            notes: 'Order confirmed'
          },
          {
            status: 'preparing',
            timestamp: new Date(Date.now() - 1200000).toISOString(),
            notes: 'Restaurant preparing order'
          },
          {
            status: 'ready_for_pickup',
            timestamp: new Date(Date.now() - 600000).toISOString(),
            notes: 'Order ready for driver pickup'
          },
          {
            status: 'picked_up',
            timestamp: new Date(Date.now() - 300000).toISOString(),
            notes: 'Driver picked up order'
          },
          {
            status: 'in_transit',
            timestamp: new Date().toISOString(),
            notes: 'Driver en route to customer'
          }
        ]
      };

      mockAxios.onGet('/orders/dhub-order-456789/status').reply(200, mockStatusResponse);

      const result = await provider.getOrderStatus('dhub-order-456789');

      expect(result.orderId).toBe('dhub-order-456789');
      expect(result.status).toBe('in_transit');
      expect(result.driverInfo).toBeDefined();
      expect(result.driverInfo?.name).toBe('محمد الأحمد');
      expect(result.driverLocation).toBeDefined();
      expect(result.driverLocation?.latitude).toBe(31.9500);
      expect(result.statusHistory).toHaveLength(5);
    });
  });

  describe('Delivery Fee Calculation', () => {
    beforeEach(async () => {
      mockAxios.onPost('/auth/token').reply(200, {
        access_token: 'test-token',
        expires_in: 3600
      });
      await provider.authenticate(mockConfig.credentials);
    });

    it('should calculate delivery fee for Jordan locations', async () => {
      const feeRequest: DeliveryFeeRequest = {
        pickupAddress: {
          street: 'Restaurant Street',
          city: 'عمان',
          area: 'الدوار الرابع',
          latitude: 31.9500,
          longitude: 35.9200
        },
        deliveryAddress: mockOrder.deliveryAddress,
        orderValue: 49.00,
        urgency: 'normal'
      };

      const mockFeeResponse = {
        quote_id: 'quote-123',
        base_fee: 2.50,
        distance_fee: 1.00,
        service_fee: 0.50,
        total_fee: 4.00,
        currency: 'JOD',
        estimated_delivery_time: 35,
        is_in_service_area: true,
        zone_info: {
          zone_name: 'Central Amman',
          zone_id: 'amm-central-01'
        }
      };

      mockAxios.onPost('/quotes/delivery-fee').reply(200, mockFeeResponse);

      const result = await provider.calculateDeliveryFee(feeRequest);

      expect(result.baseFee).toBe(2.50);
      expect(result.distanceFee).toBe(1.00);
      expect(result.serviceFee).toBe(0.50);
      expect(result.totalFee).toBe(4.00);
      expect(result.currency).toBe('JOD');
      expect(result.estimatedDeliveryTime).toBe(35);
    });

    it('should handle out of service area', async () => {
      const feeRequest: DeliveryFeeRequest = {
        pickupAddress: mockOrder.deliveryAddress,
        deliveryAddress: {
          street: 'Remote Area',
          city: 'Zarqa',
          area: 'Far District',
          latitude: 32.0728,
          longitude: 36.0876
        },
        orderValue: 49.00,
        urgency: 'normal'
      };

      mockAxios.onPost('/quotes/delivery-fee').reply(400, {
        error: 'OUT_OF_SERVICE_AREA',
        message: 'Delivery address is outside our service area'
      });

      await expect(provider.calculateDeliveryFee(feeRequest)).rejects.toThrow(
        'Delivery address is outside service area'
      );
    });
  });

  describe('Address Validation', () => {
    beforeEach(async () => {
      mockAxios.onPost('/auth/token').reply(200, {
        access_token: 'test-token',
        expires_in: 3600
      });
      await provider.authenticate(mockConfig.credentials);
    });

    it('should validate Jordan address successfully', async () => {
      const address = {
        street: 'شارع الملك حسين',
        city: 'عمان',
        area: 'الدوار السابع',
        latitude: 31.9454,
        longitude: 35.9284
      };

      const mockValidationResponse = {
        is_valid: true,
        is_in_service_area: true,
        normalized_address: {
          street: 'شارع الملك حسين',
          area: 'الدوار السابع',
          city: 'عمان',
          governorate: 'العاصمة',
          latitude: 31.9454,
          longitude: 35.9284
        },
        zone_info: {
          zone_name: 'West Amman',
          delivery_available: true
        }
      };

      mockAxios.onPost('/addresses/validate').reply(200, mockValidationResponse);

      const result = await provider.validateAddress(address);

      expect(result.isValid).toBe(true);
      expect(result.isServiceableArea).toBe(true);
      expect(result.normalizedAddress).toBeDefined();
      expect(result.normalizedAddress?.city).toBe('عمان');
    });
  });

  describe('Health Check', () => {
    it('should perform health check', async () => {
      const mockHealthResponse = {
        status: 'operational',
        version: '2.1.0',
        response_time: 145,
        service_areas: ['amman', 'irbid', 'zarqa'],
        active_drivers: 1247
      };

      mockAxios.onGet('/health').reply(200, mockHealthResponse);

      const result = await provider.healthCheck();

      expect(result.healthy).toBe(true);
      expect(result.responseTime).toBeGreaterThan(0);
      expect(result.details?.service_areas).toContain('amman');
    });

    it('should handle unhealthy service', async () => {
      mockAxios.onGet('/health').reply(503, {
        status: 'maintenance',
        message: 'Service temporarily unavailable'
      });

      const result = await provider.healthCheck();

      expect(result.healthy).toBe(false);
      expect(result.details?.error).toBeDefined();
    });
  });

  describe('Webhook Processing', () => {
    it('should validate webhook signature', () => {
      const payload = JSON.stringify({
        order_id: 'dhub-order-123',
        status: 'delivered',
        timestamp: new Date().toISOString()
      });
      
      const secret = 'webhook-secret-key';
      const validSignature = require('crypto')
        .createHmac('sha256', secret)
        .update(payload)
        .digest('hex');

      const isValid = provider.validateWebhookSignature(payload, `sha256=${validSignature}`, secret);
      expect(isValid).toBe(true);

      const isInvalid = provider.validateWebhookSignature(payload, 'sha256=invalid-signature', secret);
      expect(isInvalid).toBe(false);
    });

    it('should process webhook payload', async () => {
      const webhookPayload = {
        providerOrderId: 'dhub-order-123',
        internalOrderId: 'internal-order-456',
        eventType: 'order_confirmed' as const,
        timestamp: new Date(),
        status: 'confirmed',
        data: {
          driver_assigned: true,
          estimated_delivery: new Date(Date.now() + 1800000).toISOString()
        }
      };

      const result = await provider.processWebhook(webhookPayload);

      expect(result.processed).toBe(true);
      expect(result.action).toContain('dhub-order-123');
    });
  });

  describe('Error Handling', () => {
    it('should handle rate limiting', async () => {
      mockAxios.onPost('/auth/token').reply(429, {
        error: 'rate_limit_exceeded',
        retry_after: 60
      });

      await expect(provider.authenticate(mockConfig.credentials)).rejects.toThrow();
    });

    it('should handle timeout errors', async () => {
      mockAxios.onPost('/auth/token').timeout();

      const result = await provider.authenticate(mockConfig.credentials);
      expect(result.success).toBe(false);
    });

    it('should handle malformed responses', async () => {
      mockAxios.onPost('/auth/token').reply(200, 'invalid-json');

      const result = await provider.authenticate(mockConfig.credentials);
      expect(result.success).toBe(false);
    });
  });
});