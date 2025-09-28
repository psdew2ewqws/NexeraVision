import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';
import { TalabatProvider } from '../../providers/talabat.provider';
import { ProviderConfig, StandardOrderFormat, DeliveryStatus } from '../../interfaces/delivery-provider.interface';

describe('Talabat Integration Tests', () => {
  let talabatProvider: TalabatProvider;
  let mockAxios: MockAdapter;
  let config: ProviderConfig;

  beforeEach(() => {
    mockAxios = new MockAdapter(axios);
    config = {
      providerId: 'talabat-test',
      providerType: 'talabat',
      companyId: 'test-company',
      isActive: true,
      priority: 1,
      apiConfig: {
        baseUrl: 'https://api.talabat.com',
        timeout: 30000,
        retryAttempts: 3,
        retryDelay: 1000
      },
      credentials: {
        apiKey: 'tlb_test_key_12345',
        restaurantId: 'REST001',
        region: 'gulf'
      },
      businessRules: {
        serviceFee: 1.5,
        minimumOrderValue: 15.0,
        maximumOrderValue: 500.0,
        coverageRadius: 20,
        operatingHours: {
          start: '09:00',
          end: '02:00'
        },
        supportedCurrencies: ['AED', 'SAR', 'KWD', 'BHD', 'OMR', 'QAR']
      }
    };
    talabatProvider = new TalabatProvider(config);
  });

  afterEach(() => {
    mockAxios.restore();
  });

  describe('API Authentication', () => {
    it('should authenticate with API key successfully', async () => {
      const mockAuthResponse = {
        status: 'authenticated',
        restaurant_id: 'REST001',
        permissions: ['create_order', 'track_order', 'cancel_order'],
        rate_limits: {
          requests_per_minute: 100,
          orders_per_hour: 500
        }
      };

      mockAxios.onGet('/v1/auth/verify').reply(200, mockAuthResponse);

      const result = await talabatProvider.authenticate();

      expect(result).toBe(true);
      expect(mockAxios.history.get).toHaveLength(1);
      
      const authRequest = mockAxios.history.get[0];
      expect(authRequest.headers['X-API-Key']).toBe('tlb_test_key_12345');
      expect(authRequest.headers['X-Restaurant-ID']).toBe('REST001');
    });

    it('should handle invalid API key', async () => {
      mockAxios.onGet('/v1/auth/verify').reply(401, {
        error: 'invalid_api_key',
        message: 'The provided API key is invalid or expired'
      });

      const result = await talabatProvider.authenticate();

      expect(result).toBe(false);
    });

    it('should handle region-specific authentication', async () => {
      const saudiConfig = {
        ...config,
        credentials: {
          ...config.credentials,
          region: 'saudi'
        }
      };

      const saudiProvider = new TalabatProvider(saudiConfig);
      
      mockAxios.onGet('/v1/auth/verify').reply(200, {
        status: 'authenticated',
        region: 'saudi',
        supported_cities: ['الرياض', 'جدة', 'الدمام', 'مكة']
      });

      const result = await saudiProvider.authenticate();

      expect(result).toBe(true);
      expect(mockAxios.history.get[0].headers['X-Region']).toBe('saudi');
    });
  });

  describe('Multi-Currency Order Creation', () => {
    const createMockOrder = (currency: string, total: number): StandardOrderFormat => ({
      orderId: 'ORDER-MULTI-123',
      branchId: 'BRANCH-GULF-001',
      companyId: 'test-company',
      customer: {
        name: 'أحمد العلي',
        phone: '+971501234567',
        email: 'ahmed@example.com'
      },
      deliveryAddress: {
        street: 'Sheikh Zayed Road 123',
        city: 'Dubai',
        area: 'Downtown Dubai',
        latitude: 25.2048,
        longitude: 55.2708,
        instructions: 'Building entrance next to Metro station'
      },
      items: [
        {
          id: 'ITEM-001',
          name: 'Chicken Shawarma',
          quantity: 2,
          price: 25.0
        }
      ],
      subtotal: total - 5.0, // Assuming 5.0 delivery fee
      deliveryFee: 5.0,
      tax: 0.0,
      discount: 0.0,
      total: total,
      currency: currency,
      paymentMethod: 'card',
      priority: 'normal',
      estimatedPreparationTime: 20
    });

    beforeEach(async () => {
      mockAxios.onGet('/v1/auth/verify').reply(200, { status: 'authenticated' });
      await talabatProvider.authenticate();
      mockAxios.reset();
    });

    it('should create order with AED currency (UAE)', async () => {
      const mockOrder = createMockOrder('AED', 55.0);
      
      const mockOrderResponse = {
        order_id: 'TLB-UAE-789456',
        status: 'confirmed',
        tracking_id: 'TRK-UAE-123',
        estimated_delivery: '2024-01-15T14:30:00Z',
        delivery_fee: 5.0,
        total_amount: 55.0,
        currency: 'AED',
        payment_status: 'paid'
      };

      mockAxios.onPost('/v1/orders').reply(201, mockOrderResponse);

      const result = await talabatProvider.createOrder(mockOrder);

      expect(result.success).toBe(true);
      expect(result.orderId).toBe('TLB-UAE-789456');
      
      const orderRequest = mockAxios.history.post[0];
      const requestData = JSON.parse(orderRequest.data);
      expect(requestData.currency).toBe('AED');
      expect(requestData.total_amount).toBe(55.0);
    });

    it('should create order with SAR currency (Saudi Arabia)', async () => {
      const mockOrder = createMockOrder('SAR', 45.0);
      
      const mockOrderResponse = {
        order_id: 'TLB-SAU-789456',
        status: 'confirmed',
        currency: 'SAR',
        total_amount: 45.0
      };

      mockAxios.onPost('/v1/orders').reply(201, mockOrderResponse);

      const result = await talabatProvider.createOrder(mockOrder);

      expect(result.success).toBe(true);
      const orderRequest = mockAxios.history.post[0];
      const requestData = JSON.parse(orderRequest.data);
      expect(requestData.currency).toBe('SAR');
    });

    it('should handle unsupported currency', async () => {
      const mockOrder = createMockOrder('USD', 50.0);

      mockAxios.onPost('/v1/orders').reply(400, {
        error: 'unsupported_currency',
        message: 'Currency USD is not supported in this region',
        supported_currencies: ['AED', 'SAR', 'KWD', 'BHD', 'OMR', 'QAR']
      });

      const result = await talabatProvider.createOrder(mockOrder);

      expect(result.success).toBe(false);
      expect(result.error).toContain('unsupported_currency');
    });
  });

  describe('Gulf Region Coverage Validation', () => {
    beforeEach(async () => {
      mockAxios.onGet('/v1/auth/verify').reply(200, { status: 'authenticated' });
      await talabatProvider.authenticate();
      mockAxios.reset();
    });

    const gulfCities = [
      { name: 'Dubai', country: 'UAE', latitude: 25.2048, longitude: 55.2708 },
      { name: 'Riyadh', country: 'Saudi', latitude: 24.7136, longitude: 46.6753 },
      { name: 'Kuwait City', country: 'Kuwait', latitude: 29.3759, longitude: 47.9774 },
      { name: 'Manama', country: 'Bahrain', latitude: 26.2285, longitude: 50.5860 },
      { name: 'Doha', country: 'Qatar', latitude: 25.2854, longitude: 51.5310 }
    ];

    gulfCities.forEach(city => {
      it(`should validate coverage for ${city.name}, ${city.country}`, async () => {
        const mockCoverageResponse = {
          is_covered: true,
          city_name: city.name,
          country: city.country,
          delivery_fee: 5.0,
          estimated_delivery_time: 35,
          supported_payment_methods: ['cash', 'card', 'digital_wallet']
        };

        mockAxios.onGet('/v1/coverage/check').reply(200, mockCoverageResponse);

        const result = await talabatProvider.validateCoverage({
          latitude: city.latitude,
          longitude: city.longitude
        });

        expect(result.isSupported).toBe(true);
        expect(result.deliveryFee).toBe(5.0);
        
        const coverageRequest = mockAxios.history.get[0];
        expect(coverageRequest.params.lat).toBe(city.latitude);
        expect(coverageRequest.params.lng).toBe(city.longitude);
      });
    });

    it('should reject locations outside Gulf region', async () => {
      mockAxios.onGet('/v1/coverage/check').reply(200, {
        is_covered: false,
        message: 'Location outside Gulf region coverage area',
        nearest_supported_city: 'Dubai'
      });

      const result = await talabatProvider.validateCoverage({
        latitude: 31.9454, // Amman coordinates
        longitude: 35.9284
      });

      expect(result.isSupported).toBe(false);
    });
  });

  describe('Real-time Order Tracking', () => {
    beforeEach(async () => {
      mockAxios.onGet('/v1/auth/verify').reply(200, { status: 'authenticated' });
      await talabatProvider.authenticate();
      mockAxios.reset();
    });

    it('should track order with driver information', async () => {
      const mockTrackingResponse = {
        order_id: 'TLB-UAE-789456',
        status: 'driver_assigned',
        driver: {
          name: 'Mohammed Ali',
          phone: '+971501234567',
          rating: 4.8,
          vehicle_type: 'motorcycle',
          location: {
            latitude: 25.2100,
            longitude: 55.2800
          }
        },
        estimated_arrival: '2024-01-15T14:45:00Z',
        delivery_stages: [
          { stage: 'order_confirmed', timestamp: '2024-01-15T13:00:00Z' },
          { stage: 'restaurant_preparing', timestamp: '2024-01-15T13:15:00Z' },
          { stage: 'driver_assigned', timestamp: '2024-01-15T13:45:00Z' }
        ]
      };

      mockAxios.onGet('/v1/orders/TLB-UAE-789456/tracking').reply(200, mockTrackingResponse);

      const result = await talabatProvider.trackOrder('TLB-UAE-789456');

      expect(result.orderId).toBe('TLB-UAE-789456');
      expect(result.status).toBe(DeliveryStatus.DRIVER_ASSIGNED);
      expect(result.driverInfo?.name).toBe('Mohammed Ali');
      expect(result.driverInfo?.rating).toBe(4.8);
      expect(result.driverInfo?.location).toEqual({
        latitude: 25.2100,
        longitude: 55.2800
      });
      expect(result.statusHistory).toHaveLength(3);
    });

    it('should handle tracking for delivered orders', async () => {
      const mockTrackingResponse = {
        order_id: 'TLB-UAE-789456',
        status: 'delivered',
        delivered_at: '2024-01-15T15:00:00Z',
        delivery_proof: {
          type: 'photo',
          url: 'https://proof.talabat.com/photo123.jpg'
        },
        customer_rating: 5,
        driver_rating: 4.9
      };

      mockAxios.onGet('/v1/orders/TLB-UAE-789456/tracking').reply(200, mockTrackingResponse);

      const result = await talabatProvider.trackOrder('TLB-UAE-789456');

      expect(result.status).toBe(DeliveryStatus.DELIVERED);
      expect(result.deliveredAt).toBeDefined();
      expect(result.customerRating).toBe(5);
    });
  });

  describe('Peak Hours and Surge Pricing', () => {
    beforeEach(async () => {
      mockAxios.onGet('/v1/auth/verify').reply(200, { status: 'authenticated' });
      await talabatProvider.authenticate();
      mockAxios.reset();
    });

    it('should handle surge pricing during peak hours', async () => {
      const mockOrder = createMockOrder('AED', 55.0);
      
      const mockOrderResponse = {
        order_id: 'TLB-SURGE-123',
        status: 'confirmed',
        delivery_fee: 8.0, // Increased from normal 5.0
        surge_multiplier: 1.6,
        surge_reason: 'high_demand',
        total_amount: 58.0 // Adjusted for surge pricing
      };

      mockAxios.onPost('/v1/orders').reply(201, mockOrderResponse);

      const result = await talabatProvider.createOrder(mockOrder);

      expect(result.success).toBe(true);
      expect(result.surgePricing).toBe(1.6);
      expect(result.deliveryFee).toBe(8.0);
    });

    it('should provide surge pricing information during quote', async () => {
      const mockQuoteResponse = {
        base_delivery_fee: 5.0,
        current_delivery_fee: 7.5,
        surge_multiplier: 1.5,
        surge_reason: 'weather_conditions',
        estimated_delivery_time: 45
      };

      mockAxios.onPost('/v1/quotes').reply(200, mockQuoteResponse);

      const result = await talabatProvider.getDeliveryQuote({
        latitude: 25.2048,
        longitude: 55.2708
      }, 50.0);

      expect(result.deliveryFee).toBe(7.5);
      expect(result.surgePricing).toBe(1.5);
      expect(result.estimatedDeliveryTime).toBe(45);
    });
  });

  describe('Payment Method Integration', () => {
    beforeEach(async () => {
      mockAxios.onGet('/v1/auth/verify').reply(200, { status: 'authenticated' });
      await talabatProvider.authenticate();
      mockAxios.reset();
    });

    it('should handle cash on delivery orders', async () => {
      const mockOrder = createMockOrder('AED', 55.0);
      mockOrder.paymentMethod = 'cash';
      
      const mockOrderResponse = {
        order_id: 'TLB-COD-123',
        status: 'confirmed',
        payment_method: 'cash_on_delivery',
        cash_required: 55.0
      };

      mockAxios.onPost('/v1/orders').reply(201, mockOrderResponse);

      const result = await talabatProvider.createOrder(mockOrder);

      expect(result.success).toBe(true);
      expect(result.paymentMethod).toBe('cash_on_delivery');
    });

    it('should handle card payment with 3D Secure', async () => {
      const mockOrder = createMockOrder('AED', 55.0);
      mockOrder.paymentMethod = 'card';
      mockOrder.paymentDetails = {
        cardToken: 'card_token_12345',
        requiresAuthentication: true
      };
      
      const mockOrderResponse = {
        order_id: 'TLB-CARD-123',
        status: 'payment_pending',
        payment_url: 'https://secure.talabat.com/pay/12345',
        payment_method: 'credit_card'
      };

      mockAxios.onPost('/v1/orders').reply(201, mockOrderResponse);

      const result = await talabatProvider.createOrder(mockOrder);

      expect(result.success).toBe(true);
      expect(result.paymentUrl).toBeDefined();
      expect(result.paymentStatus).toBe('pending');
    });
  });

  describe('Order Modifications and Cancellations', () => {
    beforeEach(async () => {
      mockAxios.onGet('/v1/auth/verify').reply(200, { status: 'authenticated' });
      await talabatProvider.authenticate();
      mockAxios.reset();
    });

    it('should handle order cancellation with refund', async () => {
      const mockCancelResponse = {
        order_id: 'TLB-UAE-789456',
        status: 'cancelled',
        cancellation_reason: 'restaurant_unavailable',
        refund_amount: 55.0,
        refund_method: 'original_payment_method',
        processing_time: '3-5_business_days'
      };

      mockAxios.onPost('/v1/orders/TLB-UAE-789456/cancel').reply(200, mockCancelResponse);

      const result = await talabatProvider.cancelOrder('TLB-UAE-789456', 'restaurant_unavailable');

      expect(result.success).toBe(true);
      expect(result.refundAmount).toBe(55.0);
      expect(result.refundMethod).toBe('original_payment_method');
    });

    it('should handle order modification requests', async () => {
      const modifications = {
        items: [
          {
            action: 'add',
            item_id: 'ITEM-002',
            name: 'Extra Sauce',
            quantity: 1,
            price: 2.0
          }
        ],
        total_adjustment: 2.0
      };

      const mockModifyResponse = {
        order_id: 'TLB-UAE-789456',
        status: 'modified',
        new_total: 57.0,
        modification_fee: 0.0
      };

      mockAxios.onPut('/v1/orders/TLB-UAE-789456/modify').reply(200, mockModifyResponse);

      const result = await talabatProvider.modifyOrder('TLB-UAE-789456', modifications);

      expect(result.success).toBe(true);
      expect(result.newTotal).toBe(57.0);
    });
  });

  describe('Webhook Processing', () => {
    it('should process status update webhooks', async () => {
      const webhookPayload = {
        order_id: 'TLB-UAE-789456',
        status: 'delivered',
        delivered_at: '2024-01-15T15:00:00Z',
        driver_id: 'DRV-123',
        delivery_proof_url: 'https://proof.talabat.com/photo456.jpg',
        signature: 'webhook_signature_hash'
      };

      const result = talabatProvider.processWebhook(webhookPayload, {
        'x-talabat-signature': 'sha256=valid_signature_hash'
      });

      expect(result.orderId).toBe('TLB-UAE-789456');
      expect(result.status).toBe(DeliveryStatus.DELIVERED);
      expect(result.deliveredAt).toBeDefined();
      expect(result.deliveryProofUrl).toBe('https://proof.talabat.com/photo456.jpg');
    });

    it('should handle payment confirmation webhooks', async () => {
      const webhookPayload = {
        order_id: 'TLB-CARD-123',
        payment_status: 'confirmed',
        payment_id: 'PAY-789123',
        amount: 55.0,
        currency: 'AED'
      };

      const result = talabatProvider.processWebhook(webhookPayload, {
        'x-talabat-signature': 'sha256=valid_payment_signature'
      });

      expect(result.orderId).toBe('TLB-CARD-123');
      expect(result.paymentStatus).toBe('confirmed');
      expect(result.paymentId).toBe('PAY-789123');
    });
  });
});

function createMockOrder(currency: string, total: number): StandardOrderFormat {
  return {
    orderId: 'TEST-TLB-123',
    branchId: 'TEST-BRANCH-GULF',
    companyId: 'test-company',
    customer: {
      name: 'Test Customer Gulf',
      phone: '+971501234567',
      email: 'test.gulf@example.com'
    },
    deliveryAddress: {
      street: 'Test Street 123',
      city: 'Dubai',
      area: 'Test Area',
      latitude: 25.2048,
      longitude: 55.2708
    },
    items: [
      {
        id: 'ITEM-1',
        name: 'Test Item',
        quantity: 1,
        price: total - 5.0
      }
    ],
    subtotal: total - 5.0,
    deliveryFee: 5.0,
    tax: 0.0,
    discount: 0.0,
    total: total,
    currency: currency,
    paymentMethod: 'cash',
    priority: 'normal',
    estimatedPreparationTime: 20
  };
}