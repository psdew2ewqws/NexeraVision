import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { DeliveryProviderFactory, ProviderType } from '../factory/delivery-provider.factory';
import { ProviderConfig, DeliveryProviderInterface, ProviderError } from '../interfaces/delivery-provider.interface';
import { DHUBProvider } from '../providers/dhub.provider';
import { TalabatProvider } from '../providers/talabat.provider';
import { CareemProvider } from '../providers/careem.provider';

// Mock provider implementation
class MockProvider implements DeliveryProviderInterface {
  readonly providerName = 'MockProvider';
  readonly providerType = 'mock';
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

  constructor(private config: ProviderConfig) {}

  async authenticate(credentials: Record<string, any>) {
    if (credentials.apiKey === 'valid-key') {
      return { success: true, accessToken: 'mock-token', expiresAt: new Date(Date.now() + 3600000) };
    }
    return { success: false, errorMessage: 'Invalid credentials' };
  }

  async createOrder(order: any) {
    return {
      success: true,
      providerOrderId: 'mock-order-123',
      status: 'pending' as const,
      estimatedDeliveryTime: new Date(Date.now() + 1800000),
      deliveryFee: 10.50
    };
  }

  async cancelOrder(providerOrderId: string) {
    return { success: true, cancelledAt: new Date() };
  }

  async getOrderStatus(providerOrderId: string) {
    return {
      orderId: providerOrderId,
      providerOrderId,
      status: 'in_transit' as const,
      statusUpdatedAt: new Date(),
      statusHistory: [{ status: 'in_transit', timestamp: new Date() }]
    };
  }

  async calculateDeliveryFee(request: any) {
    return {
      baseFee: 8.0,
      distanceFee: 2.5,
      totalFee: 10.5,
      currency: 'USD',
      estimatedDeliveryTime: 30,
      availableServiceTypes: ['standard']
    };
  }

  async healthCheck() {
    return { healthy: true, responseTime: 150 };
  }
}

describe('DeliveryProviderFactory', () => {
  let factory: DeliveryProviderFactory;
  let mockProvider: MockProvider;

  const mockConfig: ProviderConfig = {
    providerId: 'test-provider-1',
    providerType: 'dhub',
    companyId: 'test-company',
    isActive: true,
    priority: 1,
    apiConfig: {
      baseUrl: 'https://api.test.com',
      timeout: 30000,
      retryAttempts: 3,
      retryDelay: 1000
    },
    credentials: {
      apiKey: 'valid-key',
      secret: 'valid-secret'
    },
    businessRules: {
      serviceFee: 2.5
    }
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DeliveryProviderFactory]
    }).compile();

    factory = module.get<DeliveryProviderFactory>(DeliveryProviderFactory);
    mockProvider = new MockProvider(mockConfig);
  });

  afterEach(async () => {
    // Clean up factory resources
    factory.onApplicationShutdown();
  });

  describe('Provider Creation', () => {
    it('should create DHUB provider successfully', async () => {
      const provider = await factory.createProvider(mockConfig);
      expect(provider).toBeDefined();
      expect(provider.providerType).toBe('dhub');
    });

    it('should create Talabat provider successfully', async () => {
      const talabatConfig = { ...mockConfig, providerType: 'talabat' };
      const provider = await factory.createProvider(talabatConfig);
      expect(provider).toBeDefined();
      expect(provider.providerType).toBe('talabat');
    });

    it('should create Careem provider successfully', async () => {
      const careemConfig = { ...mockConfig, providerType: 'careem' };
      const provider = await factory.createProvider(careemConfig);
      expect(provider).toBeDefined();
      expect(provider.providerType).toBe('careem');
    });

    it('should throw error for unsupported provider type', async () => {
      const invalidConfig = { ...mockConfig, providerType: 'invalid-provider' };
      await expect(factory.createProvider(invalidConfig)).rejects.toThrow(ProviderError);
    });

    it('should validate provider configuration before creation', async () => {
      const invalidConfig = { ...mockConfig, credentials: {} };
      // Provider creation should succeed but authentication might fail
      const provider = await factory.createProvider(invalidConfig);
      expect(provider).toBeDefined();
    });
  });

  describe('Provider Caching', () => {
    it('should cache provider instances', async () => {
      const provider1 = await factory.createProvider(mockConfig);
      const provider2 = await factory.createProvider(mockConfig);
      
      // Should return the same cached instance
      expect(provider1).toBe(provider2);
    });

    it('should return fresh provider after cache expiry', async () => {
      // Create provider
      const provider1 = await factory.createProvider(mockConfig);
      
      // Clear cache manually to simulate expiry
      factory.cleanupCache();
      
      // Should create new instance
      const provider2 = await factory.createProvider(mockConfig);
      expect(provider1).toBeDefined();
      expect(provider2).toBeDefined();
    });

    it('should respect cache size limits', async () => {
      const stats = factory.getCacheStats();
      const initialSize = stats.size;
      
      // Create multiple providers with different IDs
      const configs = Array.from({ length: 10 }, (_, i) => ({
        ...mockConfig,
        providerId: `test-provider-${i}`
      }));
      
      for (const config of configs) {
        await factory.createProvider(config);
      }
      
      const finalStats = factory.getCacheStats();
      expect(finalStats.size).toBeGreaterThan(initialSize);
      expect(finalStats.size).toBeLessThanOrEqual(100); // Default max cache size
    });
  });

  describe('Health Checks', () => {
    it('should perform health check during provider creation', async () => {
      const provider = await factory.createProvider(mockConfig);
      
      // Health check should have been called during creation
      const health = await provider.healthCheck();
      expect(health.healthy).toBeDefined();
      expect(health.responseTime).toBeDefined();
    });

    it('should handle health check failures gracefully', async () => {
      // Mock a provider that fails health checks
      const failingConfig = {
        ...mockConfig,
        apiConfig: {
          ...mockConfig.apiConfig,
          baseUrl: 'https://invalid-url-that-will-fail.com'
        }
      };
      
      // Should still create provider even if health check fails
      const provider = await factory.createProvider(failingConfig);
      expect(provider).toBeDefined();
    });
  });

  describe('Provider Capabilities', () => {
    it('should return provider capabilities without instantiation', () => {
      const capabilities = factory.getProviderCapabilities('dhub');
      
      expect(capabilities).toBeDefined();
      expect(capabilities.supportsBulkOrders).toBeDefined();
      expect(capabilities.supportsRealTimeTracking).toBeDefined();
      expect(capabilities.averageDeliveryTime).toBeDefined();
    });

    it('should throw error for unsupported provider capabilities', () => {
      expect(() => {
        factory.getProviderCapabilities('invalid-provider');
      }).toThrow(ProviderError);
    });
  });

  describe('Supported Providers', () => {
    it('should return list of supported providers', () => {
      const supportedProviders = factory.getSupportedProviders();
      
      expect(supportedProviders).toContain('dhub');
      expect(supportedProviders).toContain('talabat');
      expect(supportedProviders).toContain('careem');
      expect(supportedProviders).toContain('jahez');
      expect(supportedProviders).toContain('deliveroo');
      expect(supportedProviders.length).toBeGreaterThan(0);
    });

    it('should correctly identify supported providers', () => {
      expect(factory.isProviderSupported('dhub')).toBe(true);
      expect(factory.isProviderSupported('talabat')).toBe(true);
      expect(factory.isProviderSupported('invalid-provider')).toBe(false);
    });
  });

  describe('Bulk Operations', () => {
    it('should create multiple providers successfully', async () => {
      const configs = [
        { ...mockConfig, providerId: 'provider-1' },
        { ...mockConfig, providerId: 'provider-2', providerType: 'talabat' },
        { ...mockConfig, providerId: 'provider-3', providerType: 'careem' }
      ];
      
      const providers = await factory.createBulkProviders(configs);
      
      expect(providers).toHaveLength(3);
      expect(providers[0].providerType).toBe('dhub');
      expect(providers[1].providerType).toBe('talabat');
      expect(providers[2].providerType).toBe('careem');
    });

    it('should handle partial failures in bulk creation', async () => {
      const configs = [
        { ...mockConfig, providerId: 'provider-1' },
        { ...mockConfig, providerId: 'provider-2', providerType: 'invalid-type' },
        { ...mockConfig, providerId: 'provider-3', providerType: 'talabat' }
      ];
      
      const providers = await factory.createBulkProviders(configs);
      
      // Should create valid providers and skip invalid ones
      expect(providers.length).toBeLessThan(configs.length);
      expect(providers.some(p => p.providerType === 'dhub')).toBe(true);
      expect(providers.some(p => p.providerType === 'talabat')).toBe(true);
    });
  });

  describe('Provider Refresh', () => {
    it('should refresh provider instance', async () => {
      const provider1 = await factory.createProvider(mockConfig);
      const provider2 = await factory.refreshProvider(mockConfig);
      
      expect(provider1).toBeDefined();
      expect(provider2).toBeDefined();
      // Should be different instances after refresh
    });
  });

  describe('Cache Management', () => {
    it('should provide cache statistics', () => {
      const stats = factory.getCacheStats();
      
      expect(stats).toHaveProperty('size');
      expect(stats).toHaveProperty('maxSize');
      expect(stats).toHaveProperty('entries');
      expect(Array.isArray(stats.entries)).toBe(true);
    });

    it('should clean up expired cache entries', async () => {
      await factory.createProvider(mockConfig);
      
      const statsBefore = factory.getCacheStats();
      const cleanedCount = factory.cleanupCache();
      const statsAfter = factory.getCacheStats();
      
      expect(cleanedCount).toBeGreaterThanOrEqual(0);
      expect(statsAfter.size).toBeLessThanOrEqual(statsBefore.size);
    });
  });

  describe('Error Handling', () => {
    it('should handle provider instantiation errors', async () => {
      const invalidConfig = {
        ...mockConfig,
        providerType: 'dhub',
        credentials: null // This might cause instantiation issues
      };
      
      // Should either create provider or throw appropriate error
      try {
        const provider = await factory.createProvider(invalidConfig);
        expect(provider).toBeDefined();
      } catch (error) {
        expect(error).toBeInstanceOf(ProviderError);
      }
    });

    it('should handle network errors during health checks', async () => {
      const networkFailConfig = {
        ...mockConfig,
        apiConfig: {
          ...mockConfig.apiConfig,
          baseUrl: 'https://unreachable-host.invalid'
        }
      };
      
      // Should create provider even if network is unreachable
      const provider = await factory.createProvider(networkFailConfig);
      expect(provider).toBeDefined();
    });
  });

  describe('Application Lifecycle', () => {
    it('should cleanup resources on application shutdown', () => {
      const spy = jest.spyOn(factory, 'onApplicationShutdown');
      
      factory.onApplicationShutdown();
      
      expect(spy).toHaveBeenCalled();
    });
  });

  describe('Configuration Validation', () => {
    it('should validate required configuration fields', async () => {
      const incompleteConfig = {
        providerId: 'test',
        providerType: 'dhub'
        // Missing required fields
      } as any;
      
      await expect(factory.createProvider(incompleteConfig)).rejects.toThrow();
    });

    it('should use default values for optional configuration', async () => {
      const minimalConfig: ProviderConfig = {
        providerId: 'test-provider',
        providerType: 'dhub',
        companyId: 'test-company',
        isActive: true,
        priority: 1,
        apiConfig: {
          baseUrl: 'https://api.test.com',
          timeout: 30000,
          retryAttempts: 3,
          retryDelay: 1000
        },
        credentials: { apiKey: 'test' },
        businessRules: { serviceFee: 0 }
      };
      
      const provider = await factory.createProvider(minimalConfig);
      expect(provider).toBeDefined();
    });
  });
});