import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';
import { CareemProvider } from '../../providers/careem.provider';
import { ProviderConfig, StandardOrderFormat, DeliveryStatus } from '../../interfaces/delivery-provider.interface';

describe('Careem Integration Tests', () => {
  let careemProvider: CareemProvider;
  let mockAxios: MockAdapter;
  let config: ProviderConfig;

  beforeEach(() => {
    mockAxios = new MockAdapter(axios);
    config = {
      providerId: 'careem-test',
      providerType: 'careem',
      companyId: 'test-company',
      isActive: true,
      priority: 1,
      apiConfig: {
        baseUrl: 'https://api.careem.com',
        timeout: 30000,
        retryAttempts: 3,
        retryDelay: 1000
      },
      credentials: {
        clientId: 'careem_client_12345',
        clientSecret: 'careem_secret_abcdef',
        merchantId: 'MERCHANT_001',
        region: 'mena'
      },
      businessRules: {
        serviceFee: 3.0,
        minimumOrderValue: 20.0,
        maximumOrderValue: 1000.0,
        coverageRadius: 25,
        operatingHours: {
          start: '06:00',
          end: '03:00'
        },
        supportedCurrencies: ['AED', 'SAR', 'EGP', 'PKR', 'JOD'],
        premiumService: true,
        priorityDelivery: true
      }
    };
    careemProvider = new CareemProvider(config);
  });

  afterEach(() => {
    mockAxios.restore();
  });

  describe('OAuth 2.0 Authentication Flow', () => {
    it('should authenticate using OAuth 2.0 client credentials', async () => {
      const mockAuthResponse = {
        access_token: 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...',
        token_type: 'Bearer',
        expires_in: 7200,
        scope: 'delivery_api merchant_api',
        merchant_id: 'MERCHANT_001'
      };

      mockAxios.onPost('/oauth2/token').reply(200, mockAuthResponse);

      const result = await careemProvider.authenticate();

      expect(result).toBe(true);
      expect(mockAxios.history.post).toHaveLength(1);
      
      const authRequest = mockAxios.history.post[0];
      expect(authRequest.url).toBe('/oauth2/token');
      expect(authRequest.data).toContain('grant_type=client_credentials');
      expect(authRequest.data).toContain('client_id=careem_client_12345');
      expect(authRequest.headers['Content-Type']).toBe('application/x-www-form-urlencoded');
    });

    it('should handle token refresh when access token expires', async () => {
      // Initial auth
      mockAxios.onPost('/oauth2/token').replyOnce(200, {
        access_token: 'expired_token',
        expires_in: 1 // Very short expiry
      });

      await careemProvider.authenticate();
      mockAxios.reset();

      // Simulate API call with expired token
      mockAxios.onGet('/v1/merchant/profile').replyOnce(401, {
        error: 'token_expired',
        message: 'Access token has expired'
      });

      // Token refresh
      mockAxios.onPost('/oauth2/token').replyOnce(200, {
        access_token: 'new_fresh_token',
        expires_in: 7200
      });

      // Retry with new token
      mockAxios.onGet('/v1/merchant/profile').replyOnce(200, {
        merchant_id: 'MERCHANT_001',
        status: 'active'
      });

      const result = await careemProvider.getMerchantProfile();

      expect(result.merchantId).toBe('MERCHANT_001');
      expect(mockAxios.history.post).toHaveLength(1); // Token refresh
      expect(mockAxios.history.get).toHaveLength(2); // Initial + retry
    });
  });

  describe('MENA Region Premium Delivery', () => {
    const createPremiumOrder = (region: string, currency: string): StandardOrderFormat => ({
      orderId: 'PREMIUM-ORDER-456',
      branchId: 'BRANCH-PREMIUM-001',
      companyId: 'test-company',
      customer: {
        name: 'عبدالله الأحمد',
        phone: '+966501234567',
        email: 'abdullah@example.com',
        vipStatus: 'gold'
      },
      deliveryAddress: {
        street: 'King Fahd Road, Tower 1, Floor 25',
        city: 'Riyadh',
        area: 'Olaya District',
        latitude: 24.7136,
        longitude: 46.6753,
        instructions: 'Premium delivery - Call upon arrival',
        buildingType: 'commercial'
      },
      items: [
        {
          id: 'PREMIUM-001',
          name: 'Wagyu Beef Burger',
          quantity: 1,
          price: 85.0,
          category: 'premium'
        },
        {
          id: 'PREMIUM-002',
          name: 'Truffle Fries',
          quantity: 1,
          price: 45.0,
          category: 'premium'
        }
      ],
      subtotal: 130.0,
      deliveryFee: 15.0, // Premium delivery fee
      serviceFee: 6.5,
      tax: 19.5, // 15% VAT
      discount: 0.0,
      total: 171.0,
      currency: currency,
      paymentMethod: 'card',
      priority: 'premium',
      serviceType: 'premium',
      estimatedPreparationTime: 35
    });

    beforeEach(async () => {
      mockAxios.onPost('/oauth2/token').reply(200, {
        access_token: 'valid_token',
        expires_in: 7200
      });
      await careemProvider.authenticate();
      mockAxios.reset();
    });

    it('should create premium order in UAE with VIP customer handling', async () => {
      const mockOrder = createPremiumOrder('UAE', 'AED');
      
      const mockOrderResponse = {
        order_id: 'CRM-PREM-UAE-123',
        status: 'confirmed',
        service_type: 'premium',
        tracking_id: 'TRK-PREM-456',
        estimated_delivery: '2024-01-15T14:20:00Z',
        assigned_captain: {
          id: 'CAPT-001',
          name: 'Ahmed Hassan',
          rating: 4.9,
          vehicle: 'luxury_sedan',
          phone: '+971501234567'
        },
        premium_features: {
          white_glove_service: true,
          real_time_tracking: true,
          priority_handling: true,
          signature_required: true
        },
        total_amount: 171.0,
        currency: 'AED'
      };

      mockAxios.onPost('/v1/delivery/premium/orders').reply(201, mockOrderResponse);

      const result = await careemProvider.createOrder(mockOrder);

      expect(result.success).toBe(true);
      expect(result.orderId).toBe('CRM-PREM-UAE-123');
      expect(result.serviceType).toBe('premium');
      expect(result.assignedDriver?.vehicle).toBe('luxury_sedan');
      expect(result.premiumFeatures?.whiteGloveService).toBe(true);
      
      const orderRequest = mockAxios.history.post[0];
      const requestData = JSON.parse(orderRequest.data);
      expect(requestData.service_type).toBe('premium');
      expect(requestData.customer.vip_status).toBe('gold');
      expect(requestData.currency).toBe('AED');
    });

    it('should handle multi-currency support across MENA region', async () => {
      const currencies = [
        { region: 'Saudi', currency: 'SAR', total: 640.0 },
        { region: 'Egypt', currency: 'EGP', total: 2700.0 },
        { region: 'Pakistan', currency: 'PKR', total: 38000.0 },
        { region: 'Jordan', currency: 'JOD', total: 120.0 }
      ];

      for (const { region, currency, total } of currencies) {
        const mockOrder = createPremiumOrder(region, currency);
        mockOrder.total = total;
        
        const mockResponse = {
          order_id: `CRM-${region.toUpperCase()}-123`,
          status: 'confirmed',
          currency: currency,
          total_amount: total
        };

        mockAxios.onPost('/v1/delivery/premium/orders').replyOnce(201, mockResponse);

        const result = await careemProvider.createOrder(mockOrder);

        expect(result.success).toBe(true);
        expect(result.currency).toBe(currency);
        
        const orderRequest = mockAxios.history.post[mockAxios.history.post.length - 1];
        const requestData = JSON.parse(orderRequest.data);
        expect(requestData.currency).toBe(currency);
        expect(requestData.total_amount).toBe(total);
      }
    });
  });

  describe('Real-time Captain Tracking', () => {
    beforeEach(async () => {
      mockAxios.onPost('/oauth2/token').reply(200, {
        access_token: 'valid_token',
        expires_in: 7200
      });
      await careemProvider.authenticate();
      mockAxios.reset();
    });

    it('should provide detailed captain tracking with route information', async () => {
      const mockTrackingResponse = {
        order_id: 'CRM-PREM-UAE-123',
        status: 'captain_en_route',
        captain: {
          id: 'CAPT-001',
          name: 'أحمد حسن',
          phone: '+971501234567',
          rating: 4.9,
          vehicle: {
            type: 'luxury_sedan',
            model: 'Mercedes E-Class',
            plate_number: 'ABC123',
            color: 'black'
          },
          location: {
            latitude: 25.2100,
            longitude: 55.2750,
            heading: 45,
            speed: 35
          }
        },
        route: {
          distance_remaining: 2.3,
          time_remaining: 8,
          traffic_conditions: 'moderate',
          route_polyline: 'encrypted_polyline_string',
          waypoints: [
            { latitude: 25.2100, longitude: 55.2750 },
            { latitude: 25.2080, longitude: 55.2720 },
            { latitude: 25.2048, longitude: 55.2708 }
          ]
        },
        estimated_arrival: '2024-01-15T14:25:00Z',
        delivery_instructions: 'Premium delivery - Call upon arrival'
      };

      mockAxios.onGet('/v1/orders/CRM-PREM-UAE-123/tracking').reply(200, mockTrackingResponse);

      const result = await careemProvider.trackOrder('CRM-PREM-UAE-123');

      expect(result.orderId).toBe('CRM-PREM-UAE-123');
      expect(result.status).toBe(DeliveryStatus.EN_ROUTE);
      expect(result.driverInfo?.name).toBe('أحمد حسن');
      expect(result.driverInfo?.vehicle?.model).toBe('Mercedes E-Class');
      expect(result.driverInfo?.location?.speed).toBe(35);
      expect(result.route?.distanceRemaining).toBe(2.3);
      expect(result.route?.timeRemaining).toBe(8);
      expect(result.route?.waypoints).toHaveLength(3);
    });

    it('should handle captain assignment and departure updates', async () => {
      const stages = [
        {
          status: 'captain_assigned',
          mockResponse: {
            order_id: 'CRM-TEST-123',
            status: 'captain_assigned',
            captain: {
              id: 'CAPT-002',
              name: 'محمد علي',
              estimated_pickup: '2024-01-15T13:45:00Z'
            }
          }
        },
        {
          status: 'captain_at_restaurant',
          mockResponse: {
            order_id: 'CRM-TEST-123',
            status: 'captain_at_restaurant',
            captain: {
              id: 'CAPT-002',
              arrived_at: '2024-01-15T13:47:00Z',
              waiting_time: 3
            }
          }
        },
        {
          status: 'order_picked_up',
          mockResponse: {
            order_id: 'CRM-TEST-123',
            status: 'order_picked_up',
            pickup_time: '2024-01-15T13:52:00Z',
            estimated_delivery: '2024-01-15T14:15:00Z'
          }
        }
      ];

      for (const stage of stages) {
        mockAxios.onGet('/v1/orders/CRM-TEST-123/tracking').replyOnce(200, stage.mockResponse);
        
        const result = await careemProvider.trackOrder('CRM-TEST-123');
        
        expect(result.orderId).toBe('CRM-TEST-123');
        
        switch (stage.status) {
          case 'captain_assigned':
            expect(result.status).toBe(DeliveryStatus.DRIVER_ASSIGNED);
            expect(result.driverInfo?.name).toBe('محمد علي');
            break;
          case 'captain_at_restaurant':
            expect(result.status).toBe(DeliveryStatus.DRIVER_AT_RESTAURANT);
            expect(result.waitingTime).toBe(3);
            break;
          case 'order_picked_up':
            expect(result.status).toBe(DeliveryStatus.PICKED_UP);
            expect(result.pickedUpAt).toBeDefined();
            break;
        }
      }
    });
  });

  describe('Advanced Coverage and Pricing', () => {
    beforeEach(async () => {
      mockAxios.onPost('/oauth2/token').reply(200, {
        access_token: 'valid_token',
        expires_in: 7200
      });
      await careemProvider.authenticate();
      mockAxios.reset();
    });

    it('should provide dynamic pricing based on demand and distance', async () => {
      const mockPricingResponse = {
        base_delivery_fee: 10.0,
        distance_fee: 5.0,
        time_multiplier: 1.2,
        demand_multiplier: 1.3,
        final_delivery_fee: 19.5,
        service_fee: 3.0,
        estimated_delivery_time: 28,
        pricing_breakdown: {
          base_fee: 10.0,
          distance_charge: 5.0,
          peak_hour_surcharge: 2.4,
          high_demand_surcharge: 2.1
        }
      };

      mockAxios.onPost('/v1/pricing/calculate').reply(200, mockPricingResponse);

      const result = await careemProvider.calculatePricing({
        pickup: { latitude: 24.7136, longitude: 46.6753 },
        dropoff: { latitude: 24.7200, longitude: 46.6800 },
        orderValue: 150.0,
        serviceType: 'premium',
        timeOfDay: '19:30' // Peak hour
      });

      expect(result.finalDeliveryFee).toBe(19.5);
      expect(result.demandMultiplier).toBe(1.3);
      expect(result.timeMultiplier).toBe(1.2);
      expect(result.pricingBreakdown?.peakHourSurcharge).toBe(2.4);
      expect(result.pricingBreakdown?.highDemandSurcharge).toBe(2.1);
    });

    it('should validate coverage across multiple MENA cities', async () => {
      const menaCities = [
        { name: 'Dubai', country: 'UAE', lat: 25.2048, lng: 55.2708 },
        { name: 'Cairo', country: 'Egypt', lat: 30.0444, lng: 31.2357 },
        { name: 'Karachi', country: 'Pakistan', lat: 24.8607, lng: 67.0011 },
        { name: 'Amman', country: 'Jordan', lat: 31.9454, lng: 35.9284 }
      ];

      for (const city of menaCities) {
        const mockCoverageResponse = {
          is_covered: true,
          city_name: city.name,
          country: city.country,
          service_types: ['standard', 'premium', 'express'],
          operating_hours: {
            standard: { start: '06:00', end: '02:00' },
            premium: { start: '08:00', end: '24:00' }
          },
          minimum_order_values: {
            standard: 15.0,
            premium: 25.0
          }
        };

        mockAxios.onGet('/v1/coverage/check').replyOnce(200, mockCoverageResponse);

        const result = await careemProvider.validateCoverage({
          latitude: city.lat,
          longitude: city.lng
        });

        expect(result.isSupported).toBe(true);
        expect(result.supportedServiceTypes).toContain('premium');
        expect(result.operatingHours?.premium?.start).toBe('08:00');
      }
    });
  });

  describe('Corporate and Bulk Order Handling', () => {
    beforeEach(async () => {
      mockAxios.onPost('/oauth2/token').reply(200, {
        access_token: 'valid_token',
        expires_in: 7200
      });
      await careemProvider.authenticate();
      mockAxios.reset();
    });

    it('should handle corporate bulk orders with special pricing', async () => {
      const bulkOrder: StandardOrderFormat = {
        orderId: 'BULK-CORP-789',
        branchId: 'BRANCH-CORP-001',
        companyId: 'corporate-client',
        customer: {
          name: 'Corporate Events Team',
          phone: '+971504567890',
          email: 'events@corporation.com',
          corporateAccount: 'CORP-12345'
        },
        deliveryAddress: {
          street: 'Business Bay, Office Tower 1',
          city: 'Dubai',
          area: 'Business Bay',
          latitude: 25.1830,
          longitude: 55.2662,
          instructions: 'Reception desk, ask for Events Team'
        },
        items: Array.from({ length: 25 }, (_, i) => ({
          id: `BULK-ITEM-${i + 1}`,
          name: `Executive Meal ${i + 1}`,
          quantity: 2,
          price: 45.0
        })),
        subtotal: 2250.0,
        deliveryFee: 25.0, // Bulk delivery discount
        serviceFee: 45.0,
        tax: 344.25,
        discount: 225.0, // 10% corporate discount
        total: 2439.25,
        currency: 'AED',
        paymentMethod: 'corporate_account',
        priority: 'scheduled',
        serviceType: 'bulk',
        scheduledDelivery: '2024-01-16T12:00:00Z',
        estimatedPreparationTime: 90
      };

      const mockBulkResponse = {
        order_id: 'CRM-BULK-789',
        status: 'scheduled',
        service_type: 'corporate_bulk',
        scheduled_delivery: '2024-01-16T12:00:00Z',
        captain_team: [
          {
            id: 'CAPT-BULK-001',
            name: 'Team Lead Ahmed',
            role: 'lead_captain'
          },
          {
            id: 'CAPT-BULK-002',
            name: 'Support Captain Sara',
            role: 'support_captain'
          }
        ],
        corporate_benefits: {
          discount_applied: 225.0,
          priority_handling: true,
          dedicated_support: true,
          invoice_generation: true
        }
      };

      mockAxios.onPost('/v1/delivery/corporate/bulk').reply(201, mockBulkResponse);

      const result = await careemProvider.createOrder(bulkOrder);

      expect(result.success).toBe(true);
      expect(result.orderId).toBe('CRM-BULK-789');
      expect(result.serviceType).toBe('corporate_bulk');
      expect(result.captainTeam).toHaveLength(2);
      expect(result.corporateBenefits?.discountApplied).toBe(225.0);
    });
  });

  describe('Payment Processing and Refunds', () => {
    beforeEach(async () => {
      mockAxios.onPost('/oauth2/token').reply(200, {
        access_token: 'valid_token',
        expires_in: 7200
      });
      await careemProvider.authenticate();
      mockAxios.reset();
    });

    it('should handle payment processing with multiple payment methods', async () => {
      const paymentMethods = [
        {
          type: 'careem_wallet',
          payload: { wallet_balance: 500.0 }
        },
        {
          type: 'apple_pay',
          payload: { device_id: 'iPhone-123', touch_id: true }
        },
        {
          type: 'corporate_credit',
          payload: { credit_line: 10000.0, available: 8500.0 }
        }
      ];

      for (const payment of paymentMethods) {
        const mockPaymentResponse = {
          payment_id: `PAY-${payment.type.toUpperCase()}-123`,
          status: 'processed',
          amount: 171.0,
          currency: 'AED',
          payment_method: payment.type,
          transaction_id: `TXN-${Date.now()}`
        };

        mockAxios.onPost('/v1/payments/process').replyOnce(200, mockPaymentResponse);

        const result = await careemProvider.processPayment(payment.type, 171.0, payment.payload);

        expect(result.success).toBe(true);
        expect(result.paymentMethod).toBe(payment.type);
        expect(result.transactionId).toBeDefined();
      }
    });

    it('should handle refund processing with different refund policies', async () => {
      const refundScenarios = [
        {
          reason: 'restaurant_cancelled',
          expectedRefund: 171.0,
          processingTime: 'immediate'
        },
        {
          reason: 'quality_issue',
          expectedRefund: 171.0,
          processingTime: '24_hours'
        },
        {
          reason: 'customer_request',
          expectedRefund: 156.0, // Minus processing fee
          processingTime: '3_business_days'
        }
      ];

      for (const scenario of refundScenarios) {
        const mockRefundResponse = {
          refund_id: `REF-${scenario.reason.toUpperCase()}-123`,
          original_order_id: 'CRM-TEST-123',
          refund_amount: scenario.expectedRefund,
          refund_method: 'original_payment_method',
          processing_time: scenario.processingTime,
          status: 'approved'
        };

        mockAxios.onPost('/v1/refunds/process').replyOnce(200, mockRefundResponse);

        const result = await careemProvider.processRefund('CRM-TEST-123', scenario.reason);

        expect(result.success).toBe(true);
        expect(result.refundAmount).toBe(scenario.expectedRefund);
        expect(result.processingTime).toBe(scenario.processingTime);
      }
    });
  });

  describe('Webhook Event Processing', () => {
    it('should process comprehensive webhook events', async () => {
      const webhookEvents = [
        {
          event: 'order.status.updated',
          payload: {
            order_id: 'CRM-WEBHOOK-123',
            status: 'delivered',
            delivered_at: '2024-01-15T15:30:00Z',
            captain_rating: 4.8,
            customer_rating: 5.0,
            delivery_proof: 'https://proof.careem.com/delivery123.jpg'
          }
        },
        {
          event: 'payment.completed',
          payload: {
            order_id: 'CRM-WEBHOOK-123',
            payment_id: 'PAY-WEBHOOK-456',
            amount: 171.0,
            currency: 'AED',
            payment_method: 'careem_wallet'
          }
        },
        {
          event: 'captain.location.updated',
          payload: {
            order_id: 'CRM-WEBHOOK-123',
            captain_id: 'CAPT-123',
            location: {
              latitude: 25.2048,
              longitude: 55.2708,
              timestamp: '2024-01-15T15:25:00Z'
            },
            eta: 5
          }
        }
      ];

      for (const event of webhookEvents) {
        const result = careemProvider.processWebhook(event.payload, {
          'x-careem-event': event.event,
          'x-careem-signature': 'sha256=valid_signature_hash'
        });

        switch (event.event) {
          case 'order.status.updated':
            expect(result.status).toBe(DeliveryStatus.DELIVERED);
            expect(result.customerRating).toBe(5.0);
            expect(result.captainRating).toBe(4.8);
            break;
          case 'payment.completed':
            expect(result.paymentStatus).toBe('completed');
            expect(result.paymentMethod).toBe('careem_wallet');
            break;
          case 'captain.location.updated':
            expect(result.driverLocation).toEqual({
              latitude: 25.2048,
              longitude: 55.2708
            });
            expect(result.eta).toBe(5);
            break;
        }
      }
    });
  });
});