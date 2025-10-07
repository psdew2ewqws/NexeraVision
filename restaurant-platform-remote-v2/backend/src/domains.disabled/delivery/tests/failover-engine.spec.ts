import { Test, TestingModule } from '@nestjs/testing';
import { FailoverEngine, FailoverConfig, RetryPolicy } from '../engines/failover.engine';
import { DeliveryProviderFactory } from '../factory/delivery-provider.factory';
import { ProviderSelectionEngine, SelectionCriteria } from '../engines/provider-selection.engine';
import { 
  DeliveryProviderInterface, 
  StandardOrderFormat, 
  ProviderConfig,
  ProviderError,
  ProviderTimeoutError,
  ProviderRateLimitError,
  ProviderAuthenticationError
} from '../interfaces/delivery-provider.interface';

// Mock failing provider
class FailingProvider implements DeliveryProviderInterface {
  readonly providerName = 'FailingProvider';
  readonly providerType = 'failing';
  readonly capabilities = {
    supportsBulkOrders: false,
    supportsScheduledDelivery: false,
    supportsRealTimeTracking: false,
    supportsDriverAssignment: false,
    supportsAddressValidation: false,
    supportsCancellation: false,
    supportsRefunds: false,
    operatingHours: { start: '08:00', end: '22:00' },
    supportedPaymentMethods: ['cash'],
    averageDeliveryTime: 30
  };

  constructor(private failureType: 'timeout' | 'auth' | 'rate_limit' | 'generic' = 'generic') {}

  async authenticate(credentials: any) {
    if (this.failureType === 'auth') {
      throw new ProviderAuthenticationError(this.providerType, 'Authentication failed');
    }
    return { success: true, accessToken: 'token' };
  }

  async createOrder(order: any) {
    switch (this.failureType) {
      case 'timeout':
        throw new ProviderTimeoutError(this.providerType, 30000);
      case 'rate_limit':
        throw new ProviderRateLimitError(this.providerType);
      case 'auth':
        throw new ProviderAuthenticationError(this.providerType);
      default:
        throw new ProviderError('Generic failure', 'GENERIC_ERROR', this.providerType);
    }
  }

  async cancelOrder() { return { success: false, errorMessage: 'Not supported' }; }
  async getOrderStatus() { throw new Error('Not supported'); }
  async calculateDeliveryFee() { throw new Error('Not supported'); }
  async healthCheck() { 
    return { 
      healthy: false, 
      responseTime: 5000,
      details: { error: `Provider failing with ${this.failureType}` }
    }; 
  }
}

// Mock successful provider
class SuccessfulProvider implements DeliveryProviderInterface {
  readonly providerName = 'SuccessfulProvider';
  readonly providerType = 'successful';
  readonly capabilities = {
    supportsBulkOrders: true,
    supportsScheduledDelivery: true,
    supportsRealTimeTracking: true,
    supportsDriverAssignment: true,
    supportsAddressValidation: true,
    supportsCancellation: true,
    supportsRefunds: true,
    operatingHours: { start: '00:00', end: '23:59' },
    supportedPaymentMethods: ['cash', 'card'],
    averageDeliveryTime: 25
  };

  async authenticate(credentials: any) {
    return { success: true, accessToken: 'success-token' };
  }

  async createOrder(order: any) {
    return {
      success: true,
      providerOrderId: 'success-order-123',
      status: 'confirmed' as const,
      estimatedDeliveryTime: new Date(Date.now() + 1500000),
      deliveryFee: 8.50
    };
  }

  async cancelOrder() { return { success: true, cancelledAt: new Date() }; }
  
  async getOrderStatus() { 
    return {
      orderId: 'success-order-123',
      providerOrderId: 'success-order-123',
      status: 'delivered' as const,
      statusUpdatedAt: new Date(),
      statusHistory: []
    };
  }
  
  async calculateDeliveryFee() {
    return {
      baseFee: 6.0,
      distanceFee: 2.5,
      totalFee: 8.5,
      currency: 'USD',
      estimatedDeliveryTime: 25,
      availableServiceTypes: ['standard']
    };
  }

  async healthCheck() { 
    return { 
      healthy: true, 
      responseTime: 150,
      details: { status: 'operational' }
    }; 
  }
}

describe('FailoverEngine', () => {
  let failoverEngine: FailoverEngine;
  let mockProviderFactory: jest.Mocked<DeliveryProviderFactory>;
  let mockSelectionEngine: jest.Mocked<ProviderSelectionEngine>;

  const mockOrder: StandardOrderFormat = {
    orderId: 'test-order-123',
    branchId: 'test-branch',
    companyId: 'test-company',
    customer: {
      name: 'John Doe',
      phone: '+1234567890'
    },
    deliveryAddress: {
      street: '123 Test St',
      city: 'Test City',
      area: 'Test Area',
      latitude: 40.7128,
      longitude: -74.0060
    },
    items: [
      { id: 'item-1', name: 'Test Item', quantity: 1, price: 25.00 }
    ],
    subtotal: 25.00,
    deliveryFee: 5.00,
    total: 30.00,
    paymentMethod: 'cash',
    priority: 'normal',
    estimatedPreparationTime: 15
  };

  const mockConfigs: ProviderConfig[] = [
    {
      providerId: 'provider-1',
      providerType: 'failing',
      companyId: 'test-company',
      isActive: true,
      priority: 1,
      apiConfig: { baseUrl: 'https://api.failing.com', timeout: 30000, retryAttempts: 3, retryDelay: 1000 },
      credentials: { apiKey: 'failing-key' },
      businessRules: { serviceFee: 2.0 }
    },
    {
      providerId: 'provider-2',
      providerType: 'successful',
      companyId: 'test-company',
      isActive: true,
      priority: 2,
      apiConfig: { baseUrl: 'https://api.success.com', timeout: 30000, retryAttempts: 3, retryDelay: 1000 },
      credentials: { apiKey: 'success-key' },
      businessRules: { serviceFee: 2.5 }
    }
  ];

  beforeEach(async () => {
    const mockFactory = {
      createProvider: jest.fn(),
      getSupportedProviders: jest.fn().mockReturnValue(['failing', 'successful'])
    };

    const mockSelection = {
      selectProvider: jest.fn()
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FailoverEngine,
        { provide: DeliveryProviderFactory, useValue: mockFactory },
        { provide: ProviderSelectionEngine, useValue: mockSelection }
      ]
    }).compile();

    failoverEngine = module.get<FailoverEngine>(FailoverEngine);
    mockProviderFactory = module.get(DeliveryProviderFactory);
    mockSelectionEngine = module.get(ProviderSelectionEngine);
  });

  describe('Basic Failover Operation', () => {
    it('should successfully execute operation with healthy provider', async () => {
      const successfulProvider = new SuccessfulProvider();
      
      mockProviderFactory.createProvider.mockResolvedValue(successfulProvider);
      mockSelectionEngine.selectProvider.mockResolvedValue({
        selectedProvider: {
          providerId: 'provider-2',
          providerType: 'successful',
          totalScore: 0.9,
          breakdown: { costScore: 0.8, speedScore: 0.9, reliabilityScore: 0.9, customerPreferenceScore: 0, businessRulesScore: 0.8, capabilityScore: 1 },
          estimatedCost: 8.5,
          estimatedTime: 25,
          provider: successfulProvider,
          reasons: ['High performance provider'],
          warnings: []
        },
        allProviderScores: [],
        selectionReasons: ['Selected best performing provider'],
        warnings: [],
        fallbackRecommendations: []
      });

      const mockOperation = jest.fn().mockResolvedValue('success-result');
      const criteria: SelectionCriteria = {
        costWeight: 0.3,
        speedWeight: 0.4,
        reliabilityWeight: 0.3,
        customerPreferenceWeight: 0,
        businessRulesWeight: 0
      };

      const result = await failoverEngine.executeWithFailover(
        mockOperation,
        mockOrder,
        mockConfigs,
        criteria
      );

      expect(result.result).toBe('success-result');
      expect(result.failoverResult.success).toBe(true);
      expect(result.failoverResult.fallbackUsed).toBe(false);
      expect(result.failoverResult.allAttempts).toHaveLength(1);
      expect(result.failoverResult.allAttempts[0].success).toBe(true);
    });

    it('should failover to backup provider when primary fails', async () => {
      const failingProvider = new FailingProvider('timeout');
      const successfulProvider = new SuccessfulProvider();
      
      mockProviderFactory.createProvider
        .mockResolvedValueOnce(failingProvider)
        .mockResolvedValueOnce(successfulProvider);

      mockSelectionEngine.selectProvider.mockResolvedValue({
        selectedProvider: {
          providerId: 'provider-1',
          providerType: 'failing',
          totalScore: 0.8,
          breakdown: { costScore: 0.7, speedScore: 0.8, reliabilityScore: 0.5, customerPreferenceScore: 0, businessRulesScore: 0.8, capabilityScore: 1 },
          estimatedCost: 10.0,
          estimatedTime: 30,
          provider: failingProvider,
          reasons: [],
          warnings: []
        },
        allProviderScores: [],
        selectionReasons: [],
        warnings: [],
        fallbackRecommendations: [
          {
            providerId: 'provider-2',
            providerType: 'successful',
            totalScore: 0.7,
            breakdown: { costScore: 0.8, speedScore: 0.9, reliabilityScore: 0.9, customerPreferenceScore: 0, businessRulesScore: 0.8, capabilityScore: 1 },
            estimatedCost: 8.5,
            estimatedTime: 25,
            provider: successfulProvider,
            reasons: [],
            warnings: []
          }
        ]
      });

      const mockOperation = jest.fn()
        .mockRejectedValueOnce(new ProviderTimeoutError('failing', 30000))
        .mockResolvedValueOnce('fallback-success');

      const criteria: SelectionCriteria = {
        costWeight: 0.3,
        speedWeight: 0.4,
        reliabilityWeight: 0.3,
        customerPreferenceWeight: 0,
        businessRulesWeight: 0
      };

      const result = await failoverEngine.executeWithFailover(
        mockOperation,
        mockOrder,
        mockConfigs,
        criteria
      );

      expect(result.result).toBe('fallback-success');
      expect(result.failoverResult.success).toBe(true);
      expect(result.failoverResult.fallbackUsed).toBe(true);
      expect(result.failoverResult.allAttempts.length).toBeGreaterThan(1);
      expect(result.failoverResult.failedProviders).toContain('provider-1');
    });
  });

  describe('Retry Logic', () => {
    it('should retry failed operations according to retry policy', async () => {
      const failingProvider = new FailingProvider('timeout');
      
      mockProviderFactory.createProvider.mockResolvedValue(failingProvider);
      mockSelectionEngine.selectProvider.mockResolvedValue({
        selectedProvider: {
          providerId: 'provider-1',
          providerType: 'failing',
          totalScore: 0.8,
          breakdown: { costScore: 0.7, speedScore: 0.8, reliabilityScore: 0.5, customerPreferenceScore: 0, businessRulesScore: 0.8, capabilityScore: 1 },
          estimatedCost: 10.0,
          estimatedTime: 30,
          provider: failingProvider,
          reasons: [],
          warnings: []
        },
        allProviderScores: [],
        selectionReasons: [],
        warnings: [],
        fallbackRecommendations: []
      });

      const mockOperation = jest.fn()
        .mockRejectedValueOnce(new ProviderTimeoutError('failing', 30000))
        .mockRejectedValueOnce(new ProviderTimeoutError('failing', 30000))
        .mockResolvedValueOnce('retry-success'); // Succeeds on 3rd attempt

      const criteria: SelectionCriteria = {
        costWeight: 0.3,
        speedWeight: 0.4,
        reliabilityWeight: 0.3,
        customerPreferenceWeight: 0,
        businessRulesWeight: 0
      };

      const customConfig: Partial<FailoverConfig> = {
        maxRetries: 3,
        retryDelayMs: 100 // Short delay for testing
      };

      const result = await failoverEngine.executeWithFailover(
        mockOperation,
        mockOrder,
        mockConfigs,
        criteria,
        customConfig
      );

      expect(result.result).toBe('retry-success');
      expect(result.failoverResult.success).toBe(true);
      expect(mockOperation).toHaveBeenCalledTimes(3);
      expect(result.failoverResult.allAttempts).toHaveLength(3);
      expect(result.failoverResult.allAttempts[2].success).toBe(true);
    });

    it('should not retry non-retryable errors', async () => {
      const failingProvider = new FailingProvider('auth');
      
      mockProviderFactory.createProvider.mockResolvedValue(failingProvider);
      mockSelectionEngine.selectProvider.mockResolvedValue({
        selectedProvider: {
          providerId: 'provider-1',
          providerType: 'failing',
          totalScore: 0.8,
          breakdown: { costScore: 0.7, speedScore: 0.8, reliabilityScore: 0.5, customerPreferenceScore: 0, businessRulesScore: 0.8, capabilityScore: 1 },
          estimatedCost: 10.0,
          estimatedTime: 30,
          provider: failingProvider,
          reasons: [],
          warnings: []
        },
        allProviderScores: [],
        selectionReasons: [],
        warnings: [],
        fallbackRecommendations: []
      });

      const mockOperation = jest.fn().mockRejectedValue(new ProviderAuthenticationError('failing'));

      const criteria: SelectionCriteria = {
        costWeight: 0.3,
        speedWeight: 0.4,
        reliabilityWeight: 0.3,
        customerPreferenceWeight: 0,
        businessRulesWeight: 0
      };

      const result = await failoverEngine.executeWithFailover(
        mockOperation,
        mockOrder,
        mockConfigs,
        criteria
      );

      expect(result.result).toBeNull();
      expect(result.failoverResult.success).toBe(false);
      expect(mockOperation).toHaveBeenCalledTimes(1); // Should not retry auth errors
      expect(result.failoverResult.allAttempts).toHaveLength(1);
    });

    it('should use custom retry policy', async () => {
      const failingProvider = new FailingProvider('generic');
      
      mockProviderFactory.createProvider.mockResolvedValue(failingProvider);
      mockSelectionEngine.selectProvider.mockResolvedValue({
        selectedProvider: {
          providerId: 'provider-1',
          providerType: 'failing',
          totalScore: 0.8,
          breakdown: { costScore: 0.7, speedScore: 0.8, reliabilityScore: 0.5, customerPreferenceScore: 0, businessRulesScore: 0.8, capabilityScore: 1 },
          estimatedCost: 10.0,
          estimatedTime: 30,
          provider: failingProvider,
          reasons: [],
          warnings: []
        },
        allProviderScores: [],
        selectionReasons: [],
        warnings: [],
        fallbackRecommendations: []
      });

      const mockOperation = jest.fn().mockRejectedValue(new ProviderError('Custom error', 'CUSTOM_ERROR', 'failing'));

      const customRetryPolicy: Partial<RetryPolicy> = {
        retryableErrors: ['CUSTOM_ERROR'],
        customRetryLogic: (error, attempt) => attempt < 2 // Retry twice max
      };

      const criteria: SelectionCriteria = {
        costWeight: 0.3,
        speedWeight: 0.4,
        reliabilityWeight: 0.3,
        customerPreferenceWeight: 0,
        businessRulesWeight: 0
      };

      const result = await failoverEngine.executeWithFailover(
        mockOperation,
        mockOrder,
        mockConfigs,
        criteria,
        {},
        customRetryPolicy
      );

      expect(mockOperation).toHaveBeenCalledTimes(2); // Custom retry logic
      expect(result.failoverResult.allAttempts).toHaveLength(2);
    });
  });

  describe('Circuit Breaker', () => {
    it('should track provider failures and open circuit breaker', async () => {
      const failingProvider = new FailingProvider('generic');
      
      mockProviderFactory.createProvider.mockResolvedValue(failingProvider);
      mockSelectionEngine.selectProvider.mockResolvedValue({
        selectedProvider: {
          providerId: 'provider-1',
          providerType: 'failing',
          totalScore: 0.8,
          breakdown: { costScore: 0.7, speedScore: 0.8, reliabilityScore: 0.5, customerPreferenceWeight: 0, businessRulesScore: 0.8, capabilityScore: 1 },
          estimatedCost: 10.0,
          estimatedTime: 30,
          provider: failingProvider,
          reasons: [],
          warnings: []
        },
        allProviderScores: [],
        selectionReasons: [],
        warnings: [],
        fallbackRecommendations: []
      });

      const mockOperation = jest.fn().mockRejectedValue(new Error('Consistent failure'));
      const criteria: SelectionCriteria = {
        costWeight: 0.3,
        speedWeight: 0.4,
        reliabilityWeight: 0.3,
        customerPreferenceWeight: 0,
        businessRulesWeight: 0
      };

      // Execute multiple times to trigger circuit breaker
      for (let i = 0; i < 6; i++) {
        await failoverEngine.executeWithFailover(
          mockOperation,
          mockOrder,
          mockConfigs,
          criteria
        );
      }

      // Check circuit breaker status
      const circuitBreakerStatus = failoverEngine.getCircuitBreakerStatus();
      expect(circuitBreakerStatus.has('provider-1')).toBe(true);
      
      const providerStatus = circuitBreakerStatus.get('provider-1');
      expect(providerStatus?.state).toBe('OPEN');
    });

    it('should manually reset circuit breaker', async () => {
      // First trigger circuit breaker
      const failingProvider = new FailingProvider('generic');
      mockProviderFactory.createProvider.mockResolvedValue(failingProvider);
      mockSelectionEngine.selectProvider.mockResolvedValue({
        selectedProvider: {
          providerId: 'provider-1',
          providerType: 'failing',
          totalScore: 0.8,
          breakdown: { costScore: 0.7, speedScore: 0.8, reliabilityScore: 0.5, customerPreferenceScore: 0, businessRulesScore: 0.8, capabilityScore: 1 },
          estimatedCost: 10.0,
          estimatedTime: 30,
          provider: failingProvider,
          reasons: [],
          warnings: []
        },
        allProviderScores: [],
        selectionReasons: [],
        warnings: [],
        fallbackRecommendations: []
      });

      const mockOperation = jest.fn().mockRejectedValue(new Error('Failure'));
      const criteria: SelectionCriteria = {
        costWeight: 0.3,
        speedWeight: 0.4,
        reliabilityWeight: 0.3,
        customerPreferenceWeight: 0,
        businessRulesWeight: 0
      };

      // Trigger failures
      for (let i = 0; i < 6; i++) {
        await failoverEngine.executeWithFailover(mockOperation, mockOrder, mockConfigs, criteria);
      }

      // Reset circuit breaker
      failoverEngine.resetCircuitBreaker('provider-1');

      const circuitBreakerStatus = failoverEngine.getCircuitBreakerStatus();
      const providerStatus = circuitBreakerStatus.get('provider-1');
      expect(providerStatus?.state).toBe('CLOSED');
    });
  });

  describe('Health Monitoring', () => {
    it('should provide provider health status', async () => {
      const healthStatus = failoverEngine.getProviderHealthStatus();
      expect(healthStatus).toBeDefined();
      expect(healthStatus instanceof Map).toBe(true);
    });

    it('should provide failover statistics', async () => {
      const stats = failoverEngine.getFailoverStatistics();
      
      expect(stats).toHaveProperty('totalCircuitBreakers');
      expect(stats).toHaveProperty('openCircuitBreakers');
      expect(stats).toHaveProperty('healthyProviders');
      expect(stats).toHaveProperty('unhealthyProviders');
      expect(stats).toHaveProperty('averageResponseTime');
      
      expect(typeof stats.totalCircuitBreakers).toBe('number');
      expect(typeof stats.openCircuitBreakers).toBe('number');
      expect(typeof stats.healthyProviders).toBe('number');
      expect(typeof stats.unhealthyProviders).toBe('number');
      expect(typeof stats.averageResponseTime).toBe('number');
    });
  });

  describe('Configuration', () => {
    it('should use custom failover configuration', async () => {
      const failingProvider = new FailingProvider('timeout');
      
      mockProviderFactory.createProvider.mockResolvedValue(failingProvider);
      mockSelectionEngine.selectProvider.mockResolvedValue({
        selectedProvider: {
          providerId: 'provider-1',
          providerType: 'failing',
          totalScore: 0.8,
          breakdown: { costScore: 0.7, speedScore: 0.8, reliabilityScore: 0.5, customerPreferenceScore: 0, businessRulesScore: 0.8, capabilityScore: 1 },
          estimatedCost: 10.0,
          estimatedTime: 30,
          provider: failingProvider,
          reasons: [],
          warnings: []
        },
        allProviderScores: [],
        selectionReasons: [],
        warnings: [],
        fallbackRecommendations: []
      });

      const mockOperation = jest.fn().mockRejectedValue(new ProviderTimeoutError('failing', 30000));
      
      const customConfig: Partial<FailoverConfig> = {
        maxRetries: 1, // Only retry once
        retryDelayMs: 50,
        enableCascadeFailover: false // Disable cascade
      };

      const criteria: SelectionCriteria = {
        costWeight: 0.3,
        speedWeight: 0.4,
        reliabilityWeight: 0.3,
        customerPreferenceWeight: 0,
        businessRulesWeight: 0
      };

      const result = await failoverEngine.executeWithFailover(
        mockOperation,
        mockOrder,
        mockConfigs,
        criteria,
        customConfig
      );

      expect(mockOperation).toHaveBeenCalledTimes(1); // maxRetries = 1
      expect(result.failoverResult.fallbackUsed).toBe(false); // Cascade disabled
    });

    it('should handle all providers being unhealthy', async () => {
      // Mock selection engine to return no providers
      mockSelectionEngine.selectProvider.mockResolvedValue({
        selectedProvider: null,
        allProviderScores: [],
        selectionReasons: ['No healthy providers available'],
        warnings: ['All providers filtered out'],
        fallbackRecommendations: []
      });

      const mockOperation = jest.fn();
      const criteria: SelectionCriteria = {
        costWeight: 0.3,
        speedWeight: 0.4,
        reliabilityWeight: 0.3,
        customerPreferenceWeight: 0,
        businessRulesWeight: 0
      };

      const result = await failoverEngine.executeWithFailover(
        mockOperation,
        mockOrder,
        [],
        criteria
      );

      expect(result.result).toBeNull();
      expect(result.failoverResult.success).toBe(false);
      expect(result.failoverResult.recommendedActions.length).toBeGreaterThan(0);
      expect(mockOperation).not.toHaveBeenCalled();
    });
  });
});