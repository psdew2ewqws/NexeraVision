import { Test, TestingModule } from '@nestjs/testing';
import { ProviderSelectionEngine, SelectionCriteria, BusinessRule } from '../engines/provider-selection.engine';
import { DeliveryProviderFactory } from '../factory/delivery-provider.factory';
import { ProviderConfig, StandardOrderFormat, DeliveryProviderInterface } from '../interfaces/delivery-provider.interface';

// Mock provider for testing
class MockDeliveryProvider implements DeliveryProviderInterface {
  readonly providerName: string;
  readonly providerType: string;
  readonly capabilities = {
    supportsBulkOrders: true,
    supportsScheduledDelivery: true,
    supportsRealTimeTracking: true,
    supportsDriverAssignment: true,
    supportsAddressValidation: true,
    supportsCancellation: true,
    supportsRefunds: true,
    maxOrderValue: 1000,
    maxDeliveryDistance: 25,
    operatingHours: { start: '08:00', end: '22:00' },
    supportedPaymentMethods: ['cash', 'card'],
    averageDeliveryTime: 30,
    serviceFeePercentage: 2.5
  };

  constructor(name: string, type: string, private customMetrics?: any) {
    this.providerName = name;
    this.providerType = type;
  }

  async authenticate(credentials: Record<string, any>) {
    return { success: true, accessToken: 'mock-token' };
  }

  async createOrder(order: any) {
    return { success: true, providerOrderId: 'mock-order', status: 'pending' as const };
  }

  async cancelOrder(providerOrderId: string) {
    return { success: true, cancelledAt: new Date() };
  }

  async getOrderStatus(providerOrderId: string) {
    return {
      orderId: providerOrderId,
      providerOrderId,
      status: 'delivered' as const,
      statusUpdatedAt: new Date(),
      statusHistory: []
    };
  }

  async calculateDeliveryFee(request: any) {
    const baseFee = this.customMetrics?.baseFee || 8.0;
    const totalFee = this.customMetrics?.totalFee || 12.0;
    
    return {
      baseFee,
      distanceFee: 2.0,
      totalFee,
      currency: 'USD',
      estimatedDeliveryTime: this.capabilities.averageDeliveryTime,
      availableServiceTypes: ['standard']
    };
  }

  async healthCheck() {
    return { 
      healthy: this.customMetrics?.healthy !== false, 
      responseTime: this.customMetrics?.responseTime || 200 
    };
  }

  async getProviderMetrics() {
    return {
      totalOrders: this.customMetrics?.totalOrders || 100,
      successRate: this.customMetrics?.successRate || 95,
      averageResponseTime: this.customMetrics?.responseTime || 200,
      currentLoad: this.customMetrics?.currentLoad || 50
    };
  }
}

describe('ProviderSelectionEngine', () => {
  let selectionEngine: ProviderSelectionEngine;
  let mockProviderFactory: jest.Mocked<DeliveryProviderFactory>;

  const mockOrder: StandardOrderFormat = {
    orderId: 'test-order-123',
    branchId: 'test-branch',
    companyId: 'test-company',
    customer: {
      name: 'John Doe',
      phone: '+1234567890',
      email: 'john@example.com'
    },
    deliveryAddress: {
      street: '123 Test St',
      city: 'Test City',
      area: 'Test Area',
      latitude: 40.7128,
      longitude: -74.0060
    },
    items: [
      {
        id: 'item-1',
        name: 'Test Item',
        quantity: 2,
        price: 15.00
      }
    ],
    subtotal: 30.00,
    deliveryFee: 5.00,
    total: 35.00,
    paymentMethod: 'cash',
    priority: 'normal',
    estimatedPreparationTime: 15
  };

  const mockConfigs: ProviderConfig[] = [
    {
      providerId: 'provider-1',
      providerType: 'dhub',
      companyId: 'test-company',
      isActive: true,
      priority: 1,
      apiConfig: { baseUrl: 'https://api.dhub.com', timeout: 30000, retryAttempts: 3, retryDelay: 1000 },
      credentials: { apiKey: 'dhub-key' },
      businessRules: { serviceFee: 2.0 }
    },
    {
      providerId: 'provider-2',
      providerType: 'talabat',
      companyId: 'test-company',
      isActive: true,
      priority: 2,
      apiConfig: { baseUrl: 'https://api.talabat.com', timeout: 30000, retryAttempts: 3, retryDelay: 1000 },
      credentials: { apiKey: 'talabat-key' },
      businessRules: { serviceFee: 3.0 }
    },
    {
      providerId: 'provider-3',
      providerType: 'careem',
      companyId: 'test-company',
      isActive: true,
      priority: 3,
      apiConfig: { baseUrl: 'https://api.careem.com', timeout: 30000, retryAttempts: 3, retryDelay: 1000 },
      credentials: { apiKey: 'careem-key' },
      businessRules: { serviceFee: 2.5 }
    }
  ];

  beforeEach(async () => {
    const mockFactory = {
      createProvider: jest.fn(),
      getSupportedProviders: jest.fn().mockReturnValue(['dhub', 'talabat', 'careem']),
      getProviderCapabilities: jest.fn().mockImplementation((type) => ({
        supportsBulkOrders: true,
        supportsScheduledDelivery: true,
        supportsRealTimeTracking: true,
        averageDeliveryTime: type === 'dhub' ? 25 : type === 'talabat' ? 30 : 35
      }))
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProviderSelectionEngine,
        { provide: DeliveryProviderFactory, useValue: mockFactory }
      ]
    }).compile();

    selectionEngine = module.get<ProviderSelectionEngine>(ProviderSelectionEngine);
    mockProviderFactory = module.get(DeliveryProviderFactory);
  });

  describe('Provider Selection', () => {
    it('should select the best provider based on default criteria', async () => {
      // Setup mock providers with different performance characteristics
      mockProviderFactory.createProvider.mockImplementation(async (config) => {
        if (config.providerType === 'dhub') {
          return new MockDeliveryProvider('DHUB', 'dhub', {
            totalFee: 10.0, // Lower cost
            responseTime: 150, // Fast response
            successRate: 98 // High success rate
          });
        } else if (config.providerType === 'talabat') {
          return new MockDeliveryProvider('Talabat', 'talabat', {
            totalFee: 15.0, // Higher cost
            responseTime: 300, // Slower response
            successRate: 95 // Good success rate
          });
        } else {
          return new MockDeliveryProvider('Careem', 'careem', {
            totalFee: 12.0, // Medium cost
            responseTime: 200, // Medium response
            successRate: 96 // Good success rate
          });
        }
      });

      const criteria = selectionEngine.getDefaultCriteria();
      const result = await selectionEngine.selectProvider(mockOrder, mockConfigs, criteria);

      expect(result.selectedProvider).toBeDefined();
      expect(result.selectedProvider.providerType).toBe('dhub'); // Should select DHUB due to better overall score
      expect(result.allProviderScores).toHaveLength(3);
      expect(result.selectionReasons).toBeDefined();
      expect(result.selectionReasons.length).toBeGreaterThan(0);
    });

    it('should prioritize cost when using cost-optimized criteria', async () => {
      mockProviderFactory.createProvider.mockImplementation(async (config) => {
        const costs = { dhub: 8.0, talabat: 6.0, careem: 12.0 }; // Talabat cheapest
        return new MockDeliveryProvider(config.providerType, config.providerType, {
          totalFee: costs[config.providerType],
          successRate: 95
        });
      });

      const criteria = selectionEngine.getCostOptimizedCriteria();
      const result = await selectionEngine.selectProvider(mockOrder, mockConfigs, criteria);

      expect(result.selectedProvider.providerType).toBe('talabat'); // Cheapest option
    });

    it('should prioritize speed when using speed-optimized criteria', async () => {
      mockProviderFactory.createProvider.mockImplementation(async (config) => {
        const avgTimes = { dhub: 20, talabat: 35, careem: 25 }; // DHUB fastest
        return new MockDeliveryProvider(config.providerType, config.providerType, {
          totalFee: 12.0,
          successRate: 95,
          customCapabilities: { averageDeliveryTime: avgTimes[config.providerType] }
        });
      });

      const criteria = selectionEngine.getSpeedOptimizedCriteria();
      const result = await selectionEngine.selectProvider(mockOrder, mockConfigs, criteria);

      expect(result.selectedProvider.providerType).toBe('dhub'); // Fastest option
    });

    it('should handle custom selection criteria', async () => {
      mockProviderFactory.createProvider.mockImplementation(async (config) => {
        return new MockDeliveryProvider(config.providerType, config.providerType, {
          totalFee: 10.0,
          successRate: 95
        });
      });

      const customCriteria: SelectionCriteria = {
        costWeight: 0.8, // Very high cost importance
        speedWeight: 0.1,
        reliabilityWeight: 0.1,
        customerPreferenceWeight: 0.0,
        businessRulesWeight: 0.0,
        maxDeliveryCost: 15.0
      };

      const result = await selectionEngine.selectProvider(mockOrder, mockConfigs, customCriteria);

      expect(result.selectedProvider).toBeDefined();
      expect(result.selectedProvider.breakdown.costScore).toBeGreaterThan(0);
    });

    it('should respect customer preferences', async () => {
      mockProviderFactory.createProvider.mockImplementation(async (config) => {
        return new MockDeliveryProvider(config.providerType, config.providerType, {
          totalFee: 12.0,
          successRate: 95
        });
      });

      const criteria: SelectionCriteria = {
        costWeight: 0.3,
        speedWeight: 0.3,
        reliabilityWeight: 0.2,
        customerPreferenceWeight: 0.2,
        businessRulesWeight: 0.0,
        preferredProviders: ['careem', 'talabat'] // Prefer these providers
      };

      const result = await selectionEngine.selectProvider(mockOrder, mockConfigs, criteria);

      expect(result.selectedProvider).toBeDefined();
      expect(['careem', 'talabat']).toContain(result.selectedProvider.providerType);
    });

    it('should exclude providers based on criteria', async () => {
      mockProviderFactory.createProvider.mockImplementation(async (config) => {
        return new MockDeliveryProvider(config.providerType, config.providerType);
      });

      const criteria: SelectionCriteria = {
        costWeight: 0.5,
        speedWeight: 0.5,
        reliabilityWeight: 0.0,
        customerPreferenceWeight: 0.0,
        businessRulesWeight: 0.0,
        excludedProviders: ['dhub', 'talabat'] // Exclude these
      };

      const result = await selectionEngine.selectProvider(mockOrder, mockConfigs, criteria);

      expect(result.selectedProvider).toBeDefined();
      expect(result.selectedProvider.providerType).toBe('careem'); // Only remaining option
    });
  });

  describe('Business Rules', () => {
    it('should apply business rules to filter providers', async () => {
      mockProviderFactory.createProvider.mockImplementation(async (config) => {
        return new MockDeliveryProvider(config.providerType, config.providerType);
      });

      const businessRules: BusinessRule[] = [
        {
          id: 'rule-1',
          name: 'Exclude expensive providers for small orders',
          priority: 10,
          conditions: {
            orderValue: { max: 50 }
          },
          actions: {
            excludeProviders: ['careem'] // Exclude Careem for small orders
          }
        }
      ];

      const criteria = selectionEngine.getDefaultCriteria();
      const result = await selectionEngine.selectProvider(mockOrder, mockConfigs, criteria, businessRules);

      expect(result.selectedProvider).toBeDefined();
      expect(result.selectedProvider.providerType).not.toBe('careem');
      expect(result.allProviderScores.length).toBe(2); // Should exclude Careem
    });

    it('should apply time-based business rules', async () => {
      mockProviderFactory.createProvider.mockImplementation(async (config) => {
        return new MockDeliveryProvider(config.providerType, config.providerType);
      });

      const businessRules: BusinessRule[] = [
        {
          id: 'rule-2',
          name: 'Prefer fast providers during peak hours',
          priority: 5,
          conditions: {
            timeOfDay: { start: '11:00', end: '14:00' }
          },
          actions: {
            modifySpeedWeight: 0.8 // Increase speed importance
          }
        }
      ];

      const criteria = selectionEngine.getDefaultCriteria();
      const result = await selectionEngine.selectProvider(mockOrder, mockConfigs, criteria, businessRules);

      expect(result.selectedProvider).toBeDefined();
      // Speed weight should have been increased
    });

    it('should handle multiple business rules with priorities', async () => {
      mockProviderFactory.createProvider.mockImplementation(async (config) => {
        return new MockDeliveryProvider(config.providerType, config.providerType);
      });

      const businessRules: BusinessRule[] = [
        {
          id: 'rule-high-priority',
          name: 'High priority rule',
          priority: 100,
          conditions: { orderValue: { min: 0 } },
          actions: { preferProviders: ['dhub'] }
        },
        {
          id: 'rule-low-priority',
          name: 'Low priority rule',
          priority: 1,
          conditions: { orderValue: { min: 0 } },
          actions: { preferProviders: ['talabat'] }
        }
      ];

      const criteria = selectionEngine.getDefaultCriteria();
      const result = await selectionEngine.selectProvider(mockOrder, mockConfigs, criteria, businessRules);

      expect(result.selectedProvider).toBeDefined();
      // Higher priority rule should take precedence
    });
  });

  describe('Provider Scoring', () => {
    it('should calculate comprehensive scores for all providers', async () => {
      mockProviderFactory.createProvider.mockImplementation(async (config) => {
        return new MockDeliveryProvider(config.providerType, config.providerType, {
          totalFee: 10.0,
          successRate: 95,
          responseTime: 200
        });
      });

      const criteria = selectionEngine.getDefaultCriteria();
      const result = await selectionEngine.selectProvider(mockOrder, mockConfigs, criteria);

      expect(result.allProviderScores).toHaveLength(3);
      
      result.allProviderScores.forEach(score => {
        expect(score.totalScore).toBeGreaterThanOrEqual(0);
        expect(score.totalScore).toBeLessThanOrEqual(1);
        expect(score.breakdown).toBeDefined();
        expect(score.breakdown.costScore).toBeGreaterThanOrEqual(0);
        expect(score.breakdown.speedScore).toBeGreaterThanOrEqual(0);
        expect(score.breakdown.reliabilityScore).toBeGreaterThanOrEqual(0);
      });
    });

    it('should provide detailed scoring breakdown', async () => {
      mockProviderFactory.createProvider.mockImplementation(async (config) => {
        return new MockDeliveryProvider(config.providerType, config.providerType, {
          totalFee: 8.0, // Good cost
          successRate: 98, // Excellent reliability
          responseTime: 150 // Fast response
        });
      });

      const criteria = selectionEngine.getDefaultCriteria();
      const result = await selectionEngine.selectProvider(mockOrder, mockConfigs, criteria);

      const topProvider = result.allProviderScores[0];
      expect(topProvider.breakdown.costScore).toBeGreaterThan(0.5); // Good cost score
      expect(topProvider.breakdown.reliabilityScore).toBeGreaterThan(0.8); // Excellent reliability
      expect(topProvider.reasons).toBeDefined();
      expect(topProvider.reasons.length).toBeGreaterThan(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle provider creation failures gracefully', async () => {
      mockProviderFactory.createProvider.mockImplementation(async (config) => {
        if (config.providerType === 'dhub') {
          throw new Error('Provider unavailable');
        }
        return new MockDeliveryProvider(config.providerType, config.providerType);
      });

      const criteria = selectionEngine.getDefaultCriteria();
      const result = await selectionEngine.selectProvider(mockOrder, mockConfigs, criteria);

      // Should still select from available providers
      expect(result.selectedProvider).toBeDefined();
      expect(result.selectedProvider.providerType).not.toBe('dhub');
      expect(result.allProviderScores.length).toBeGreaterThan(0);
    });

    it('should handle case when no providers are available', async () => {
      mockProviderFactory.createProvider.mockRejectedValue(new Error('All providers unavailable'));

      const criteria = selectionEngine.getDefaultCriteria();
      const result = await selectionEngine.selectProvider(mockOrder, [], criteria);

      expect(result.selectedProvider).toBeNull();
      expect(result.selectionReasons).toContain('No providers available after applying business rules');
    });

    it('should handle fee calculation failures', async () => {
      mockProviderFactory.createProvider.mockImplementation(async (config) => {
        const mockProvider = new MockDeliveryProvider(config.providerType, config.providerType);
        // Override calculateDeliveryFee to throw error
        mockProvider.calculateDeliveryFee = jest.fn().mockRejectedValue(new Error('Fee calculation failed'));
        return mockProvider;
      });

      const criteria = selectionEngine.getDefaultCriteria();
      const result = await selectionEngine.selectProvider(mockOrder, mockConfigs, criteria);

      // Should still attempt to select provider despite fee calculation failures
      expect(result.allProviderScores.length).toBeGreaterThan(0);
    });
  });

  describe('Fallback Recommendations', () => {
    it('should provide fallback recommendations', async () => {
      mockProviderFactory.createProvider.mockImplementation(async (config) => {
        const scores = { dhub: 0.9, talabat: 0.8, careem: 0.7 };
        return new MockDeliveryProvider(config.providerType, config.providerType, {
          customScore: scores[config.providerType]
        });
      });

      const criteria = selectionEngine.getDefaultCriteria();
      const result = await selectionEngine.selectProvider(mockOrder, mockConfigs, criteria);

      expect(result.fallbackRecommendations).toBeDefined();
      expect(result.fallbackRecommendations.length).toBeGreaterThan(0);
      expect(result.fallbackRecommendations.length).toBeLessThanOrEqual(3); // Max 3 alternatives
    });
  });

  describe('Performance Cache', () => {
    it('should clear performance cache', () => {
      expect(() => {
        selectionEngine.clearPerformanceCache();
      }).not.toThrow();
    });
  });
});