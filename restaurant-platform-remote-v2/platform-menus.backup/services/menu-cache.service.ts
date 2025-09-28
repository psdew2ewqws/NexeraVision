// ================================================
// Menu Cache Service
// Restaurant Platform v2 - Performance Optimization
// ================================================

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PlatformMenu, PlatformMenuItem, DeliveryPlatform } from '../types/platform-menu.types';

// ================================================
// CACHE CONFIGURATION INTERFACE
// ================================================

export interface CacheConfig {
  // TTL Configuration (in seconds)
  menuDetailTtl: number;        // 10 minutes
  menuListTtl: number;          // 5 minutes
  syncStatusTtl: number;        // 30 seconds
  analyticsDataTtl: number;     // 15 minutes
  healthStatusTtl: number;      // 2 minutes

  // Cache Keys
  menuListPrefix: string;
  menuDetailPrefix: string;
  syncStatusPrefix: string;
  analyticsPrefix: string;
  healthPrefix: string;

  // Performance Settings
  maxCacheSize: number;         // Maximum cache entries
  compressionEnabled: boolean;  // Gzip compression for large objects
  preloadEnabled: boolean;      // Preload frequently accessed data
}

export interface CacheStats {
  hits: number;
  misses: number;
  hitRate: number;
  totalRequests: number;
  cacheSize: number;
  memoryUsage: number;
}

// ================================================
// MENU CACHE SERVICE
// ================================================

@Injectable()
export class MenuCacheService {
  private readonly logger = new Logger(MenuCacheService.name);
  private readonly config: CacheConfig;
  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    hitRate: 0,
    totalRequests: 0,
    cacheSize: 0,
    memoryUsage: 0
  };

  constructor(
    private readonly configService: ConfigService
  ) {
    this.config = this.loadCacheConfig();
    this.initializeCache();
  }

  // ================================================
  // CORE CACHE OPERATIONS
  // ================================================

  /**
   * Get data from cache with performance tracking
   */
  async get<T>(key: string): Promise<T | null> {
    this.stats.totalRequests++;
    // In-memory cache implementation - replace with Redis when available
    this.stats.misses++;
    this.logger.debug(`Cache MISS for key: ${key} (in-memory cache not implemented)`);
    this.updateHitRate();
    return null;
  }

  /**
   * Set data in cache with TTL and compression
   */
  async set<T>(key: string, data: T, ttl?: number): Promise<void> {
    // In-memory cache implementation - replace with Redis when available
    this.logger.debug(`Cache SET for key: ${key} (in-memory cache not implemented)`);
  }

  /**
   * Invalidate specific cache key
   */
  async invalidate(key: string): Promise<void> {
    // In-memory cache implementation - replace with Redis when available
    this.logger.debug(`Cache INVALIDATED for key: ${key} (in-memory cache not implemented)`);
  }

  /**
   * Invalidate multiple keys by pattern
   */
  async invalidatePattern(pattern: string): Promise<number> {
    // In-memory cache implementation - replace with Redis when available
    this.logger.debug(`Cache INVALIDATED pattern: ${pattern} (in-memory cache not implemented)`);
    return 0;
  }

  // ================================================
  // MENU-SPECIFIC CACHE OPERATIONS
  // ================================================

  /**
   * Cache menu list with filters as key component
   */
  async cacheMenuList(
    companyId: string,
    filters: any,
    data: any,
    ttl?: number
  ): Promise<void> {
    const key = this.buildMenuListKey(companyId, filters);
    await this.set(key, data, ttl || this.config.menuListTtl);
  }

  /**
   * Get cached menu list
   */
  async getCachedMenuList(companyId: string, filters: any): Promise<any | null> {
    const key = this.buildMenuListKey(companyId, filters);
    return this.get(key);
  }

  /**
   * Cache menu details
   */
  async cacheMenuDetail(menuId: string, companyId: string, data: PlatformMenu): Promise<void> {
    const key = this.buildMenuDetailKey(menuId, companyId);
    await this.set(key, data, this.config.menuDetailTtl);
  }

  /**
   * Get cached menu details
   */
  async getCachedMenuDetail(menuId: string, companyId: string): Promise<PlatformMenu | null> {
    const key = this.buildMenuDetailKey(menuId, companyId);
    return this.get<PlatformMenu>(key);
  }

  /**
   * Cache sync status with short TTL for real-time updates
   */
  async cacheSyncStatus(syncId: string, status: any): Promise<void> {
    const key = this.buildSyncStatusKey(syncId);
    await this.set(key, status, this.config.syncStatusTtl);
  }

  /**
   * Get cached sync status
   */
  async getCachedSyncStatus(syncId: string): Promise<any | null> {
    const key = this.buildSyncStatusKey(syncId);
    return this.get(key);
  }

  /**
   * Cache analytics data
   */
  async cacheAnalytics(companyId: string, data: any): Promise<void> {
    const key = this.buildAnalyticsKey(companyId);
    await this.set(key, data, this.config.analyticsDataTtl);
  }

  /**
   * Get cached analytics
   */
  async getCachedAnalytics(companyId: string): Promise<any | null> {
    const key = this.buildAnalyticsKey(companyId);
    return this.get(key);
  }

  // ================================================
  // INVALIDATION STRATEGIES
  // ================================================

  /**
   * Invalidate all menu-related cache for a company
   */
  async invalidateCompanyMenus(companyId: string): Promise<void> {
    const patterns = [
      `${this.config.menuListPrefix}:${companyId}:*`,
      `${this.config.menuDetailPrefix}:*:${companyId}`,
      `${this.config.analyticsPrefix}:${companyId}:*`
    ];

    for (const pattern of patterns) {
      await this.invalidatePattern(pattern);
    }

    this.logger.log(`Invalidated all menu cache for company: ${companyId}`);
  }

  /**
   * Invalidate specific menu cache
   */
  async invalidateMenu(menuId: string, companyId: string): Promise<void> {
    const patterns = [
      `${this.config.menuDetailPrefix}:${menuId}:${companyId}`,
      `${this.config.menuListPrefix}:${companyId}:*` // List cache might include this menu
    ];

    for (const pattern of patterns) {
      await this.invalidatePattern(pattern);
    }

    this.logger.log(`Invalidated cache for menu: ${menuId}`);
  }

  /**
   * Smart cache invalidation based on data changes
   */
  async smartInvalidate(
    changeType: 'menu_created' | 'menu_updated' | 'menu_deleted' | 'item_updated',
    menuId: string,
    companyId: string,
    affectedFields?: string[]
  ): Promise<void> {
    switch (changeType) {
      case 'menu_created':
      case 'menu_deleted':
        // Invalidate list cache and analytics
        await this.invalidatePattern(`${this.config.menuListPrefix}:${companyId}:*`);
        await this.invalidatePattern(`${this.config.analyticsPrefix}:${companyId}:*`);
        break;

      case 'menu_updated':
        // Invalidate specific menu and list cache
        await this.invalidateMenu(menuId, companyId);
        break;

      case 'item_updated':
        // Only invalidate menu detail if items changed
        await this.invalidate(this.buildMenuDetailKey(menuId, companyId));
        break;
    }
  }

  // ================================================
  // PERFORMANCE OPTIMIZATION
  // ================================================

  /**
   * Preload frequently accessed menus
   */
  async preloadFrequentMenus(companyId: string): Promise<void> {
    if (!this.config.preloadEnabled) return;

    try {
      // This would be called during off-peak hours
      // Implementation would identify and preload most accessed menus
      this.logger.debug(`Preloading frequent menus for company: ${companyId}`);
    } catch (error) {
      this.logger.error(`Preload error for company ${companyId}:`, error);
    }
  }

  /**
   * Warm up cache for new menu
   */
  async warmUpMenu(menuId: string, companyId: string): Promise<void> {
    try {
      // Preload menu detail into cache
      // This would typically be called after menu creation
      this.logger.debug(`Warming up cache for menu: ${menuId}`);
    } catch (error) {
      this.logger.error(`Cache warm-up error for menu ${menuId}:`, error);
    }
  }

  /**
   * Get cache statistics and performance metrics
   */
  async getCacheStats(): Promise<CacheStats> {
    // In-memory cache implementation - replace with Redis when available
    return {
      ...this.stats,
      cacheSize: 0,
      memoryUsage: 0
    };
  }

  /**
   * Clear all cache (use with caution)
   */
  async clearAll(): Promise<void> {
    // In-memory cache implementation - replace with Redis when available
    this.logger.warn('ALL CACHE CLEARED (in-memory cache not implemented)');
    this.resetStats();
  }

  // ================================================
  // HELPER METHODS
  // ================================================

  private loadCacheConfig(): CacheConfig {
    return {
      menuDetailTtl: this.configService.get<number>('CACHE_MENU_DETAIL_TTL', 600), // 10 min
      menuListTtl: this.configService.get<number>('CACHE_MENU_LIST_TTL', 300),     // 5 min
      syncStatusTtl: this.configService.get<number>('CACHE_SYNC_STATUS_TTL', 30),  // 30 sec
      analyticsDataTtl: this.configService.get<number>('CACHE_ANALYTICS_TTL', 900), // 15 min
      healthStatusTtl: this.configService.get<number>('CACHE_HEALTH_TTL', 120),     // 2 min

      menuListPrefix: 'platform-menus',
      menuDetailPrefix: 'platform-menu',
      syncStatusPrefix: 'sync-status',
      analyticsPrefix: 'menu-analytics',
      healthPrefix: 'menu-health',

      maxCacheSize: this.configService.get<number>('CACHE_MAX_SIZE', 10000),
      compressionEnabled: this.configService.get<boolean>('CACHE_COMPRESSION', true),
      preloadEnabled: this.configService.get<boolean>('CACHE_PRELOAD', true)
    };
  }

  private initializeCache(): void {
    this.logger.log('Initializing Menu Cache Service with configuration:');
    this.logger.log(`- Menu Detail TTL: ${this.config.menuDetailTtl}s`);
    this.logger.log(`- Menu List TTL: ${this.config.menuListTtl}s`);
    this.logger.log(`- Compression: ${this.config.compressionEnabled ? 'Enabled' : 'Disabled'}`);
    this.logger.log(`- Preload: ${this.config.preloadEnabled ? 'Enabled' : 'Disabled'}`);
  }

  private buildMenuListKey(companyId: string, filters: any): string {
    const filterHash = this.hashFilters(filters);
    return `${this.config.menuListPrefix}:${companyId}:${filterHash}`;
  }

  private buildMenuDetailKey(menuId: string, companyId: string): string {
    return `${this.config.menuDetailPrefix}:${menuId}:${companyId}`;
  }

  private buildSyncStatusKey(syncId: string): string {
    return `${this.config.syncStatusPrefix}:${syncId}`;
  }

  private buildAnalyticsKey(companyId: string): string {
    return `${this.config.analyticsPrefix}:${companyId}:current`;
  }

  private hashFilters(filters: any): string {
    // Create deterministic hash of filters for consistent cache keys
    const filterString = JSON.stringify(filters, Object.keys(filters).sort());
    return Buffer.from(filterString).toString('base64').substring(0, 16);
  }

  private getTtlForKey(key: string): number {
    if (key.includes(this.config.menuDetailPrefix)) return this.config.menuDetailTtl;
    if (key.includes(this.config.menuListPrefix)) return this.config.menuListTtl;
    if (key.includes(this.config.syncStatusPrefix)) return this.config.syncStatusTtl;
    if (key.includes(this.config.analyticsPrefix)) return this.config.analyticsDataTtl;
    if (key.includes(this.config.healthPrefix)) return this.config.healthStatusTtl;
    return 300; // Default 5 minutes
  }

  private serializeData<T>(data: T): string {
    const jsonString = JSON.stringify(data);

    if (this.config.compressionEnabled && jsonString.length > 1024) {
      // For large objects, could implement compression here
      // For now, return JSON string
      return jsonString;
    }

    return jsonString;
  }

  private deserializeData<T>(data: string): T {
    try {
      return JSON.parse(data);
    } catch (error) {
      this.logger.error('Cache deserialization error:', error);
      throw error;
    }
  }

  private updateHitRate(): void {
    this.stats.hitRate = this.stats.totalRequests > 0
      ? (this.stats.hits / this.stats.totalRequests) * 100
      : 0;
  }

  private parseMemoryUsage(info: string): number {
    // Parse Redis memory info to extract usage in bytes
    const match = info.match(/used_memory:(\d+)/);
    return match ? parseInt(match[1]) : 0;
  }

  private resetStats(): void {
    this.stats = {
      hits: 0,
      misses: 0,
      hitRate: 0,
      totalRequests: 0,
      cacheSize: 0,
      memoryUsage: 0
    };
  }
}

// ================================================
// CACHE DECORATOR FOR AUTOMATIC CACHING
// ================================================

export function Cacheable(
  keyBuilder: (args: any[]) => string,
  ttl?: number
) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const cacheService: MenuCacheService = this.cacheService;

      if (!cacheService) {
        return method.apply(this, args);
      }

      const cacheKey = keyBuilder(args);

      // Try cache first
      const cached = await cacheService.get(cacheKey);
      if (cached !== null) {
        return cached;
      }

      // Execute method and cache result
      const result = await method.apply(this, args);
      await cacheService.set(cacheKey, result, ttl);

      return result;
    };

    return descriptor;
  };
}

// Usage example:
// @Cacheable(
//   (args) => `menu-items:${args[0]}`, // menuId
//   300 // 5 minutes TTL
// )
// async getMenuItems(menuId: string) { ... }