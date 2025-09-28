import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';
import { DeliverySystem } from '../../delivery.system';
import { ProviderFactory } from '../../factory/provider.factory';
import { ProviderSelectionEngine } from '../../engines/provider-selection.engine';
import { FailoverEngine } from '../../engines/failover.engine';
import { DeliveryAnalyticsService } from '../../analytics/delivery-analytics.service';
import { ProviderConfig, StandardOrderFormat, DeliveryStatus } from '../../interfaces/delivery-provider.interface';

describe('Delivery System Integration Tests', () => {
  let deliverySystem: DeliverySystem;
  let providerFactory: ProviderFactory;
  let selectionEngine: ProviderSelectionEngine;
  let failoverEngine: FailoverEngine;
  let analyticsService: DeliveryAnalyticsService;
  let mockAxios: MockAdapter;

  const mockConfigs: ProviderConfig[] = [
    {
      providerId: 'dhub-integration',
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
        username: 'test_dhub',
        password: 'test_pass',
        merchantId: 'MERCH_DHUB'
      },
      businessRules: {
        serviceFee: 2.5,
        coverageRadius: 15,
        operatingHours: { start: '08:00', end: '23:00' }
      }
    },
    {
      providerId: 'talabat-integration',
      providerType: 'talabat',
      companyId: 'test-company',
      isActive: true,
      priority: 2,
      apiConfig: {
        baseUrl: 'https://api.talabat.com',
        timeout: 30000,
        retryAttempts: 3,
        retryDelay: 1000
      },
      credentials: {
        apiKey: 'test_talabat_key',
        restaurantId: 'REST_TLB',
        region: 'gulf'
      },
      businessRules: {
        serviceFee: 1.5,
        coverageRadius: 20,
        operatingHours: { start: '09:00', end: '02:00' }
      }
    },
    {
      providerId: 'careem-integration',
      providerType: 'careem',
      companyId: 'test-company',
      isActive: true,
      priority: 3,
      apiConfig: {
        baseUrl: 'https://api.careem.com',
        timeout: 30000,
        retryAttempts: 3,
        retryDelay: 1000
      },
      credentials: {
        clientId: 'test_careem_client',
        clientSecret: 'test_careem_secret',
        merchantId: 'MERCH_CRM'
      },
      businessRules: {
        serviceFee: 3.0,
        coverageRadius: 25,
        operatingHours: { start: '06:00', end: '03:00' }
      }
    }
  ];

  beforeEach(async () => {
    mockAxios = new MockAdapter(axios);
    
    // Initialize services
    providerFactory = new ProviderFactory();
    selectionEngine = new ProviderSelectionEngine();
    failoverEngine = new FailoverEngine(providerFactory, selectionEngine);
    analyticsService = new DeliveryAnalyticsService();
    
    deliverySystem = new DeliverySystem(
      providerFactory,
      selectionEngine,
      failoverEngine,
      analyticsService
    );

    // Mock authentication for all providers
    mockAxios.onPost('/oauth/token').reply(200, { access_token: 'dhub_token', expires_in: 3600 });
    mockAxios.onGet('/v1/auth/verify').reply(200, { status: 'authenticated' });
    mockAxios.onPost('/oauth2/token').reply(200, { access_token: 'careem_token', expires_in: 7200 });

    // Initialize system with configurations
    await deliverySystem.initialize(mockConfigs);
    
    // Reset mocks after initialization
    mockAxios.reset();
  });

  afterEach(() => {
    mockAxios.restore();
  });

  describe('End-to-End Order Flow', () => {
    const mockOrder: StandardOrderFormat = {
      orderId: 'E2E-ORDER-12345',
      branchId: 'BRANCH-E2E-001',
      companyId: 'test-company',
      customer: {
        name: 'عبدالله محمد',
        phone: '+962791234567',
        email: 'abdullah@test.com'
      },
      deliveryAddress: {
        street: 'شارع الملك حسين 25',
        city: 'عمان',
        area: 'جبل عمان',
        latitude: 31.9454,
        longitude: 35.9284,
        instructions: 'بجانب الصيدلية'
      },
      items: [
        {
          id: 'ITEM-001',
          name: 'منسف ملكي',
          quantity: 2,
          price: 18.0
        },
        {
          id: 'ITEM-002', 
          name: 'فتوش',
          quantity: 1,
          price: 6.5
        }
      ],
      subtotal: 42.5,
      deliveryFee: 3.0,
      tax: 0.0,
      discount: 0.0,
      total: 45.5,
      paymentMethod: 'cash',
      priority: 'normal',
      estimatedPreparationTime: 25
    };

    it('should execute complete order lifecycle with provider selection', async () => {
      // Mock provider selection and order creation
      mockAxios.onPost('/api/v1/orders').reply(201, {
        order_id: 'DHUB-E2E-123',
        status: 'confirmed',
        tracking_number: 'TRK-E2E-456',
        estimated_delivery_time: '2024-01-15T14:30:00Z'
      });

      // Mock coverage validation
      mockAxios.onGet('/api/v1/coverage/check').reply(200, {
        is_covered: true,
        delivery_fee: 3.0,
        estimated_delivery_time: 35
      });

      // Execute order
      const result = await deliverySystem.createOrder(mockOrder, {
        preferredProviders: ['dhub'],
        maxDeliveryTime: 45,
        budgetConstraint: 50.0
      });

      expect(result.success).toBe(true);
      expect(result.orderId).toBe('DHUB-E2E-123');
      expect(result.selectedProvider).toBe('dhub');
      expect(result.trackingNumber).toBe('TRK-E2E-456');

      // Verify analytics were recorded
      const analytics = await deliverySystem.getOrderAnalytics(mockOrder.companyId!);
      expect(analytics.totalOrders).toBeGreaterThan(0);
    });

    it('should handle provider failover when primary fails', async () => {
      // Mock DHUB failure
      mockAxios.onPost('/api/v1/orders').reply(500, {
        error: 'service_unavailable',
        message: 'Service temporarily unavailable'
      });

      // Mock successful Talabat fallback
      mockAxios.onPost('/v1/orders').reply(201, {
        order_id: 'TLB-FAILOVER-789',
        status: 'confirmed',
        tracking_id: 'TRK-FAILOVER-123'
      });

      // Mock coverage for both providers
      mockAxios.onGet('/api/v1/coverage/check').reply(500, { error: 'service_down' });
      mockAxios.onGet('/v1/coverage/check').reply(200, {
        is_covered: true,
        delivery_fee: 4.0,
        estimated_delivery_time: 40
      });

      const result = await deliverySystem.createOrderWithFailover(mockOrder, {
        enableFailover: true,
        maxFailoverAttempts: 3,
        preferredProviders: ['dhub', 'talabat']
      });

      expect(result.success).toBe(true);
      expect(result.orderId).toBe('TLB-FAILOVER-789');
      expect(result.selectedProvider).toBe('talabat');
      expect(result.failoverInfo).toBeDefined();
      expect(result.failoverInfo?.attemptsCount).toBe(2);
      expect(result.failoverInfo?.failedProviders).toContain('dhub');
    });

    it('should handle real-time tracking across providers', async () => {
      // Mock order creation
      mockAxios.onPost('/api/v1/orders').reply(201, {
        order_id: 'DHUB-TRACK-123',
        status: 'confirmed'
      });

      const createResult = await deliverySystem.createOrder(mockOrder);
      
      // Mock tracking responses for different stages
      const trackingStages = [
        {
          status: 'confirmed',
          mockResponse: {
            order_id: 'DHUB-TRACK-123',
            status: 'confirmed',
            restaurant_acknowledged: true
          }
        },
        {
          status: 'preparing',
          mockResponse: {
            order_id: 'DHUB-TRACK-123',
            status: 'preparing',
            estimated_ready_time: '2024-01-15T13:45:00Z'
          }
        },
        {
          status: 'ready_for_pickup',
          mockResponse: {
            order_id: 'DHUB-TRACK-123',
            status: 'ready_for_pickup',
            pickup_code: '1234'
          }
        },
        {
          status: 'picked_up',
          mockResponse: {
            order_id: 'DHUB-TRACK-123',
            status: 'picked_up',
            driver: {
              name: 'أحمد السائق',
              phone: '+962791234567',
              location: { latitude: 31.9500, longitude: 35.9300 }
            }
          }
        },
        {
          status: 'delivered',
          mockResponse: {
            order_id: 'DHUB-TRACK-123',
            status: 'delivered',
            delivered_at: '2024-01-15T14:15:00Z',
            signature: 'customer_signature_hash'
          }
        }
      ];

      // Test each tracking stage
      for (const stage of trackingStages) {
        mockAxios.onGet(`/api/v1/orders/${createResult.orderId}/tracking`).replyOnce(200, stage.mockResponse);
        
        const trackResult = await deliverySystem.trackOrder(createResult.orderId!);
        
        expect(trackResult.orderId).toBe('DHUB-TRACK-123');
        
        switch (stage.status) {
          case 'confirmed':
            expect(trackResult.status).toBe(DeliveryStatus.CONFIRMED);
            break;
          case 'preparing':
            expect(trackResult.status).toBe(DeliveryStatus.PREPARING);
            break;
          case 'ready_for_pickup':
            expect(trackResult.status).toBe(DeliveryStatus.READY_FOR_PICKUP);
            break;
          case 'picked_up':
            expect(trackResult.status).toBe(DeliveryStatus.PICKED_UP);
            expect(trackResult.driverInfo?.name).toBe('أحمد السائق');
            break;
          case 'delivered':
            expect(trackResult.status).toBe(DeliveryStatus.DELIVERED);
            expect(trackResult.deliveredAt).toBeDefined();
            break;
        }
      }
    });
  });

  describe('Multi-Provider Order Management', () => {
    it('should handle concurrent orders across different providers', async () => {
      const orders = [
        { ...mockOrder, orderId: 'CONCURRENT-001', preferredProvider: 'dhub' },
        { ...mockOrder, orderId: 'CONCURRENT-002', preferredProvider: 'talabat' },
        { ...mockOrder, orderId: 'CONCURRENT-003', preferredProvider: 'careem' }
      ];

      // Mock responses for each provider
      mockAxios.onPost('/api/v1/orders').reply(201, {
        order_id: 'DHUB-CONCURRENT-001',
        status: 'confirmed'
      });

      mockAxios.onPost('/v1/orders').reply(201, {
        order_id: 'TLB-CONCURRENT-002', 
        status: 'confirmed'
      });

      mockAxios.onPost('/v1/delivery/premium/orders').reply(201, {
        order_id: 'CRM-CONCURRENT-003',
        status: 'confirmed'
      });

      // Mock coverage for all
      mockAxios.onGet(/.*coverage.*/).reply(200, {
        is_covered: true,
        delivery_fee: 3.0
      });

      // Create concurrent orders
      const results = await Promise.all(
        orders.map(order => deliverySystem.createOrder(order, {
          preferredProviders: [order.preferredProvider]
        }))
      );

      // Verify all orders succeeded
      results.forEach((result, index) => {
        expect(result.success).toBe(true);
        expect(result.selectedProvider).toBe(orders[index].preferredProvider);
      });

      // Verify different provider IDs
      const providerIds = results.map(r => r.orderId);
      expect(providerIds[0]).toContain('DHUB');
      expect(providerIds[1]).toContain('TLB');
      expect(providerIds[2]).toContain('CRM');
    });

    it('should handle batch order cancellations', async () => {
      const orderIds = ['BATCH-CANCEL-001', 'BATCH-CANCEL-002', 'BATCH-CANCEL-003'];
      
      // Mock cancellation responses
      mockAxios.onPost(/.*cancel/).reply(200, {
        status: 'cancelled',
        refund_amount: 45.5,
        cancellation_reason: 'batch_cancellation'
      });

      const cancellationResults = await deliverySystem.cancelMultipleOrders(orderIds, {
        reason: 'batch_cancellation',
        requestedBy: 'system_admin',
        refundMethod: 'original_payment'
      });

      expect(cancellationResults.successCount).toBe(3);
      expect(cancellationResults.failureCount).toBe(0);
      expect(cancellationResults.totalRefunds).toBe(136.5); // 45.5 * 3
    });
  });

  describe('Analytics and Performance Monitoring', () => {
    it('should collect comprehensive delivery metrics', async () => {
      // Mock order creation
      mockAxios.onPost('/api/v1/orders').reply(201, {
        order_id: 'ANALYTICS-TEST-123',
        status: 'confirmed',
        estimated_delivery_time: '2024-01-15T14:30:00Z'
      });

      mockAxios.onGet('/api/v1/coverage/check').reply(200, {
        is_covered: true,
        delivery_fee: 3.0
      });

      // Create test order
      await deliverySystem.createOrder(mockOrder);

      // Get analytics
      const analytics = await deliverySystem.getDeliveryAnalytics('test-company', {
        timeRange: 'today',
        includeProviderBreakdown: true,
        includePerformanceMetrics: true
      });

      expect(analytics.overview.totalOrders).toBeGreaterThan(0);
      expect(analytics.providerPerformance).toBeDefined();
      expect(analytics.providerPerformance.length).toBeGreaterThan(0);
      expect(analytics.realTimeStats).toBeDefined();
      expect(analytics.costAnalysis).toBeDefined();
    });

    it('should track provider performance and reliability', async () => {
      // Simulate multiple orders with different outcomes
      const scenarios = [
        { success: true, deliveryTime: 25, provider: 'dhub' },
        { success: true, deliveryTime: 30, provider: 'dhub' },
        { success: false, error: 'timeout', provider: 'dhub' },
        { success: true, deliveryTime: 35, provider: 'talabat' },
        { success: true, deliveryTime: 20, provider: 'careem' }
      ];

      for (const scenario of scenarios) {
        if (scenario.success) {
          mockAxios.onPost(/.*orders/).replyOnce(201, {
            order_id: `${scenario.provider.toUpperCase()}-SUCCESS-${Date.now()}`,
            status: 'confirmed',
            estimated_delivery_time: new Date(Date.now() + scenario.deliveryTime * 60000).toISOString()
          });
        } else {
          mockAxios.onPost(/.*orders/).replyOnce(500, {
            error: scenario.error
          });
        }

        try {
          await deliverySystem.createOrder({
            ...mockOrder,
            orderId: `PERF-TEST-${Date.now()}`
          }, {
            preferredProviders: [scenario.provider]
          });
        } catch (error) {
          // Expected for failed scenarios
        }
      }

      // Get performance metrics
      const performance = await deliverySystem.getProviderPerformanceReport('test-company', {
        timeRange: 'last_hour',
        includeReliabilityMetrics: true,
        includeSpeedMetrics: true
      });

      expect(performance.providers).toHaveLength(3);
      
      const dhubPerf = performance.providers.find(p => p.providerType === 'dhub');
      expect(dhubPerf?.successRate).toBeLessThan(100); // Due to one failure
      expect(dhubPerf?.averageDeliveryTime).toBeGreaterThan(0);
    });
  });

  describe('System Health and Monitoring', () => {
    it('should perform comprehensive health checks', async () => {
      // Mock health check responses
      mockAxios.onGet('/health').reply(200, { status: 'healthy', response_time: 120 });
      mockAxios.onGet('/v1/health').reply(200, { status: 'operational', latency: 95 });
      mockAxios.onPost('/oauth2/token').reply(200, { access_token: 'health_token' });

      const healthStatus = await deliverySystem.performHealthCheck();

      expect(healthStatus.overallStatus).toBe('healthy');
      expect(healthStatus.providerStatuses).toHaveLength(3);
      
      healthStatus.providerStatuses.forEach(status => {
        expect(['healthy', 'degraded', 'unhealthy']).toContain(status.status);
        expect(status.responseTime).toBeGreaterThan(0);
      });
    });

    it('should detect and handle system degradation', async () => {
      // Mock degraded service responses
      mockAxios.onPost('/api/v1/orders').reply(429, {
        error: 'rate_limited',
        retry_after: 30
      });

      mockAxios.onPost('/v1/orders').reply(200, {
        order_id: 'DEGRADED-FALLBACK-123',
        status: 'confirmed'
      });

      const result = await deliverySystem.createOrderWithAdaptiveHandling(mockOrder, {
        adaptToSystemLoad: true,
        degradationStrategy: 'fallback_providers',
        maxResponseTime: 5000
      });

      expect(result.success).toBe(true);
      expect(result.selectedProvider).toBe('talabat'); // Fallback
      expect(result.systemAdaptation).toBeDefined();
      expect(result.systemAdaptation?.degradationDetected).toBe(true);
      expect(result.systemAdaptation?.adaptationStrategy).toBe('provider_fallback');
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should gracefully handle network failures', async () => {
      // Mock network timeout
      mockAxios.onPost('/api/v1/orders').timeout();
      mockAxios.onPost('/v1/orders').timeout();
      mockAxios.onPost('/v1/delivery/premium/orders').reply(201, {
        order_id: 'NETWORK-RECOVERY-123',
        status: 'confirmed'
      });

      const result = await deliverySystem.createOrderWithRetry(mockOrder, {
        maxRetries: 3,
        retryDelay: 100,
        enableFailover: true,
        networkTimeoutHandling: true
      });

      expect(result.success).toBe(true);
      expect(result.selectedProvider).toBe('careem');
      expect(result.retryInfo?.totalAttempts).toBeGreaterThan(1);
      expect(result.retryInfo?.networkTimeoutsEncountered).toBeGreaterThan(0);
    });

    it('should handle partial system failures', async () => {
      // Mock partial failures
      mockAxios.onGet('/api/v1/coverage/check').reply(503, { error: 'service_unavailable' });
      mockAxios.onPost('/api/v1/orders').reply(500, { error: 'database_error' });
      
      // Only Careem works
      mockAxios.onGet('/v1/coverage/check').reply(200, { is_covered: true });
      mockAxios.onPost('/v1/delivery/premium/orders').reply(201, {
        order_id: 'PARTIAL-FAILURE-RECOVERY-123',
        status: 'confirmed'
      });

      const result = await deliverySystem.createOrderWithSystemResilience(mockOrder, {
        resilientMode: true,
        partialFailureTolerance: true,
        minimumProviderRequirement: 1
      });

      expect(result.success).toBe(true);
      expect(result.systemResilience?.partialFailuresDetected).toBe(true);
      expect(result.systemResilience?.workingProviders).toBe(1);
      expect(result.systemResilience?.failedProviders).toBe(2);
    });
  });
});