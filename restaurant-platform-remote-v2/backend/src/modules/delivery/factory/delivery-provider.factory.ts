import { Injectable, Logger } from '@nestjs/common';
import { 
  DeliveryProviderInterface, 
  ProviderConfig, 
  ProviderError 
} from '../interfaces/delivery-provider.interface';

// Import provider implementations
import { DHUBProvider } from '../providers/dhub.provider';
import { TalabatProvider } from '../providers/talabat.provider';
import { CareemProvider } from '../providers/careem.provider';
// import { CareemExpressProvider } from '../providers/careem-express.provider';
import { JahezProvider } from '../providers/jahez.provider';
import { DeliverooProvider } from '../providers/deliveroo.provider';
// import { YallowProvider } from '../providers/yallow.provider';
// import { JoodDeliveryProvider } from '../providers/jood-delivery.provider';
// import { TopDeliverProvider } from '../providers/top-deliver.provider';
// import { NashmiProvider } from '../providers/nashmi.provider';
// import { TawasiProvider } from '../providers/tawasi.provider';
// import { DelivergyProvider } from '../providers/delivergy.provider';
// import { UtracProvider } from '../providers/utrac.provider';
// import { LocalDeliveryProvider } from '../providers/local-delivery.provider';

/**
 * Provider Type Registry
 */
export enum ProviderType {
  DHUB = 'dhub',
  TALABAT = 'talabat',
  CAREEM = 'careem',
  CAREEMEXPRESS = 'careemexpress',
  JAHEZ = 'jahez',
  DELIVEROO = 'deliveroo',
  YALLOW = 'yallow',
  JOODDELIVERY = 'jooddelivery',
  TOPDELIVER = 'topdeliver',
  NASHMI = 'nashmi',
  TAWASI = 'tawasi',
  DELIVERGY = 'delivergy',
  UTRAC = 'utrac',
  LOCAL_DELIVERY = 'local_delivery'
}

/**
 * Provider Instance Cache
 */
interface CachedProvider {
  instance: DeliveryProviderInterface;
  config: ProviderConfig;
  lastAccessed: Date;
  accessCount: number;
}

/**
 * Provider Factory Configuration
 */
interface FactoryConfig {
  cacheEnabled: boolean;
  cacheMaxAge: number; // in milliseconds
  maxCacheSize: number;
  healthCheckInterval: number; // in milliseconds
}

/**
 * Delivery Provider Factory
 * Manages creation, caching, and lifecycle of delivery provider instances
 */
@Injectable()
export class DeliveryProviderFactory {
  private readonly logger = new Logger(DeliveryProviderFactory.name);
  private readonly providerCache = new Map<string, CachedProvider>();
  private readonly healthCheckTimers = new Map<string, NodeJS.Timeout>();

  private readonly config: FactoryConfig = {
    cacheEnabled: true,
    cacheMaxAge: 30 * 60 * 1000, // 30 minutes
    maxCacheSize: 100,
    healthCheckInterval: 5 * 60 * 1000 // 5 minutes
  };

  /**
   * Create or retrieve a provider instance
   */
  async createProvider(config: ProviderConfig): Promise<DeliveryProviderInterface> {
    const cacheKey = this.getCacheKey(config);

    // Check cache first
    if (this.config.cacheEnabled && this.providerCache.has(cacheKey)) {
      const cached = this.providerCache.get(cacheKey);
      
      // Validate cache age
      if (this.isCacheValid(cached)) {
        cached.lastAccessed = new Date();
        cached.accessCount++;
        this.logger.debug(`Retrieved cached provider: ${config.providerType}`);
        return cached.instance;
      } else {
        // Remove stale cache entry
        this.removeFromCache(cacheKey);
      }
    }

    // Create new provider instance
    const provider = await this.instantiateProvider(config);

    // Test provider health before caching
    try {
      const healthCheck = await provider.healthCheck();
      if (!healthCheck.healthy) {
        this.logger.warn(`Provider ${config.providerType} failed health check`, healthCheck);
      }
    } catch (error) {
      this.logger.error(`Health check failed for ${config.providerType}:`, error.message);
    }

    // Cache the provider
    if (this.config.cacheEnabled) {
      this.addToCache(cacheKey, provider, config);
    }

    return provider;
  }

  /**
   * Get all supported provider types
   */
  getSupportedProviders(): string[] {
    return Object.values(ProviderType);
  }

  /**
   * Check if provider type is supported
   */
  isProviderSupported(providerType: string): boolean {
    return Object.values(ProviderType).includes(providerType as ProviderType);
  }

  /**
   * Get provider capabilities without instantiation
   */
  getProviderCapabilities(providerType: string) {
    const ProviderClass = this.getProviderClass(providerType);
    
    // Create temporary instance to get capabilities
    const tempConfig: ProviderConfig = {
      providerId: 'temp',
      providerType,
      companyId: 'temp',
      isActive: true,
      priority: 1,
      apiConfig: {
        baseUrl: '',
        timeout: 30000,
        retryAttempts: 3,
        retryDelay: 1000
      },
      credentials: {},
      businessRules: {
        serviceFee: 0
      }
    };

    const tempProvider = new ProviderClass(tempConfig);
    return tempProvider.capabilities;
  }

  /**
   * Clean up expired cache entries and health check timers
   */
  cleanupCache(): number {
    let cleanedCount = 0;
    const now = new Date();

    for (const [key, cached] of this.providerCache.entries()) {
      if (!this.isCacheValid(cached)) {
        this.removeFromCache(key);
        cleanedCount++;
      }
    }

    this.logger.debug(`Cleaned up ${cleanedCount} expired provider cache entries`);
    return cleanedCount;
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return {
      size: this.providerCache.size,
      maxSize: this.config.maxCacheSize,
      entries: Array.from(this.providerCache.entries()).map(([key, cached]) => ({
        key,
        providerType: cached.config.providerType,
        companyId: cached.config.companyId,
        lastAccessed: cached.lastAccessed,
        accessCount: cached.accessCount,
        age: Date.now() - cached.lastAccessed.getTime()
      }))
    };
  }

  /**
   * Force refresh a provider instance
   */
  async refreshProvider(config: ProviderConfig): Promise<DeliveryProviderInterface> {
    const cacheKey = this.getCacheKey(config);
    this.removeFromCache(cacheKey);
    return this.createProvider(config);
  }

  /**
   * Bulk create providers for multiple configurations
   */
  async createBulkProviders(configs: ProviderConfig[]): Promise<DeliveryProviderInterface[]> {
    const providers: DeliveryProviderInterface[] = [];
    const errors: Error[] = [];

    await Promise.allSettled(
      configs.map(async (config) => {
        try {
          const provider = await this.createProvider(config);
          providers.push(provider);
        } catch (error) {
          errors.push(error);
          this.logger.error(`Failed to create provider ${config.providerType}:`, error.message);
        }
      })
    );

    if (errors.length > 0) {
      this.logger.warn(`Created ${providers.length} providers with ${errors.length} errors`);
    }

    return providers;
  }

  // Private methods

  /**
   * Instantiate a specific provider
   */
  private async instantiateProvider(config: ProviderConfig): Promise<DeliveryProviderInterface> {
    try {
      const ProviderClass = this.getProviderClass(config.providerType);
      const provider = new ProviderClass(config);

      // Initialize provider (authenticate, setup connections, etc.)
      await this.initializeProvider(provider, config);

      this.logger.log(`Created provider instance: ${config.providerType} for company: ${config.companyId}`);
      return provider;

    } catch (error) {
      const errorMsg = `Failed to create provider ${config.providerType}: ${error.message}`;
      this.logger.error(errorMsg, error.stack);
      throw new ProviderError(errorMsg, 'PROVIDER_CREATION_FAILED', config.providerType, error);
    }
  }

  /**
   * Get provider class constructor
   */
  private getProviderClass(providerType: string): new (config: ProviderConfig) => DeliveryProviderInterface {
    switch (providerType) {
      case ProviderType.DHUB:
        return DHUBProvider;
      case ProviderType.TALABAT:
        return TalabatProvider;
      case ProviderType.CAREEM:
        return CareemProvider;
      // case ProviderType.CAREEMEXPRESS:
      //   return CareemExpressProvider;
      case ProviderType.JAHEZ:
        return JahezProvider;
      case ProviderType.DELIVEROO:
        return DeliverooProvider;
      // case ProviderType.YALLOW:
      //   return YallowProvider;
      // case ProviderType.JOODDELIVERY:
      //   return JoodDeliveryProvider;
      // case ProviderType.TOPDELIVER:
      //   return TopDeliverProvider;
      // case ProviderType.NASHMI:
      //   return NashmiProvider;
      // case ProviderType.TAWASI:
      //   return TawasiProvider;
      // case ProviderType.DELIVERGY:
      //   return DelivergyProvider;
      // case ProviderType.UTRAC:
      //   return UtracProvider;
      // case ProviderType.LOCAL_DELIVERY:
      //   return LocalDeliveryProvider;
      default:
        throw new ProviderError(
          `Unsupported provider type: ${providerType}`,
          'UNSUPPORTED_PROVIDER',
          providerType
        );
    }
  }

  /**
   * Initialize provider (authentication, etc.)
   */
  private async initializeProvider(
    provider: DeliveryProviderInterface, 
    config: ProviderConfig
  ): Promise<void> {
    try {
      // Authenticate with provider
      const authResult = await provider.authenticate(config.credentials);
      if (!authResult.success) {
        throw new Error(authResult.errorMessage || 'Authentication failed');
      }

      // Set up periodic health checks
      if (this.config.healthCheckInterval > 0) {
        this.setupHealthCheck(provider, config);
      }

    } catch (error) {
      throw new ProviderError(
        `Provider initialization failed: ${error.message}`,
        'PROVIDER_INIT_FAILED',
        config.providerType,
        error
      );
    }
  }

  /**
   * Set up periodic health checks for provider
   */
  private setupHealthCheck(provider: DeliveryProviderInterface, config: ProviderConfig): void {
    const cacheKey = this.getCacheKey(config);
    
    // Clear existing timer if any
    if (this.healthCheckTimers.has(cacheKey)) {
      clearInterval(this.healthCheckTimers.get(cacheKey));
    }

    // Set up new health check timer
    const timer = setInterval(async () => {
      try {
        const health = await provider.healthCheck();
        if (!health.healthy) {
          this.logger.warn(`Provider ${config.providerType} health check failed`, health);
          // Remove unhealthy provider from cache
          this.removeFromCache(cacheKey);
        }
      } catch (error) {
        this.logger.error(`Health check error for ${config.providerType}:`, error.message);
        this.removeFromCache(cacheKey);
      }
    }, this.config.healthCheckInterval);

    this.healthCheckTimers.set(cacheKey, timer);
  }

  /**
   * Generate cache key
   */
  private getCacheKey(config: ProviderConfig): string {
    return `${config.providerType}:${config.companyId}:${config.providerId}`;
  }

  /**
   * Check if cached provider is still valid
   */
  private isCacheValid(cached: CachedProvider): boolean {
    const age = Date.now() - cached.lastAccessed.getTime();
    return age < this.config.cacheMaxAge;
  }

  /**
   * Add provider to cache
   */
  private addToCache(key: string, provider: DeliveryProviderInterface, config: ProviderConfig): void {
    // Enforce cache size limit
    if (this.providerCache.size >= this.config.maxCacheSize) {
      this.evictLeastRecentlyUsed();
    }

    this.providerCache.set(key, {
      instance: provider,
      config,
      lastAccessed: new Date(),
      accessCount: 1
    });

    this.logger.debug(`Cached provider: ${key}`);
  }

  /**
   * Remove provider from cache
   */
  private removeFromCache(key: string): void {
    this.providerCache.delete(key);
    
    // Clear health check timer
    if (this.healthCheckTimers.has(key)) {
      clearInterval(this.healthCheckTimers.get(key));
      this.healthCheckTimers.delete(key);
    }

    this.logger.debug(`Removed from cache: ${key}`);
  }

  /**
   * Evict least recently used provider from cache
   */
  private evictLeastRecentlyUsed(): void {
    let oldestKey: string | null = null;
    let oldestTime = Date.now();

    for (const [key, cached] of this.providerCache.entries()) {
      if (cached.lastAccessed.getTime() < oldestTime) {
        oldestTime = cached.lastAccessed.getTime();
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.removeFromCache(oldestKey);
      this.logger.debug(`Evicted LRU provider: ${oldestKey}`);
    }
  }

  /**
   * Cleanup on application shutdown
   */
  onApplicationShutdown(): void {
    // Clear all health check timers
    for (const timer of this.healthCheckTimers.values()) {
      clearInterval(timer);
    }
    this.healthCheckTimers.clear();

    // Clear cache
    this.providerCache.clear();

    this.logger.log('DeliveryProviderFactory shut down gracefully');
  }
}