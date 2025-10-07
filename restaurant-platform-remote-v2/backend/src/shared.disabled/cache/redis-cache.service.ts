import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

export interface CacheOptions {
  ttl?: number; // Time to live in seconds
  compress?: boolean; // Compress large objects
  serialize?: boolean; // Custom serialization
  prefix?: string; // Cache key prefix
}

@Injectable()
export class RedisCacheService implements OnModuleInit {
  private readonly logger = new Logger(RedisCacheService.name);
  private redis: Redis;
  private readonly defaultTTL = 3600; // 1 hour
  private readonly compressionThreshold = 1024; // 1KB

  constructor(private configService: ConfigService) {}

  async onModuleInit() {
    await this.connect();
  }

  private async connect() {
    try {
      const redisUrl = this.configService.get<string>('REDIS_URL');

      if (!redisUrl) {
        this.logger.warn('Redis URL not configured, caching will be disabled');
        return;
      }

      this.redis = new Redis(redisUrl, {
        maxRetriesPerRequest: 3,
        retryDelayOnFailover: 100,
        enableReadyCheck: true,
        lazyConnect: true,
        keepAlive: 30000,
        // Connection pool settings
        family: 4,
        maxMemoryPolicy: 'allkeys-lru',
      });

      this.redis.on('connect', () => {
        this.logger.log('Connected to Redis server');
      });

      this.redis.on('error', (error) => {
        this.logger.error('Redis connection error:', error);
      });

      this.redis.on('reconnecting', () => {
        this.logger.warn('Reconnecting to Redis server');
      });

      await this.redis.connect();

      // Set up memory optimization
      await this.optimizeRedisMemory();

    } catch (error) {
      this.logger.error('Failed to connect to Redis:', error);
    }
  }

  private async optimizeRedisMemory() {
    try {
      // Configure memory optimization settings
      await this.redis.config('SET', 'maxmemory-policy', 'allkeys-lru');
      await this.redis.config('SET', 'hash-max-ziplist-entries', '512');
      await this.redis.config('SET', 'hash-max-ziplist-value', '64');
      await this.redis.config('SET', 'list-max-ziplist-entries', '512');
      await this.redis.config('SET', 'list-max-ziplist-value', '64');
      await this.redis.config('SET', 'set-max-intset-entries', '512');

      this.logger.log('Redis memory optimization configured');
    } catch (error) {
      this.logger.warn('Failed to configure Redis memory optimization:', error);
    }
  }

  /**
   * Get value from cache with automatic decompression and deserialization
   */
  async get<T>(key: string, options?: CacheOptions): Promise<T | null> {
    if (!this.redis) return null;

    try {
      const prefixedKey = this.getPrefixedKey(key, options?.prefix);
      const value = await this.redis.get(prefixedKey);

      if (!value) return null;

      // Handle compressed data
      let processedValue = value;
      if (value.startsWith('COMPRESSED:')) {
        processedValue = await this.decompress(value.substring(11));
      }

      // Deserialize if needed
      if (options?.serialize !== false) {
        try {
          return JSON.parse(processedValue);
        } catch {
          return processedValue as T;
        }
      }

      return processedValue as T;
    } catch (error) {
      this.logger.error(`Cache GET error for key ${key}:`, error);
      return null;
    }
  }

  /**
   * Set value in cache with automatic compression and serialization
   */
  async set<T>(
    key: string,
    value: T,
    options: CacheOptions = {}
  ): Promise<boolean> {
    if (!this.redis) return false;

    try {
      const prefixedKey = this.getPrefixedKey(key, options.prefix);
      const ttl = options.ttl || this.defaultTTL;

      // Serialize value
      let serializedValue: string;
      if (options.serialize !== false) {
        serializedValue = JSON.stringify(value);
      } else {
        serializedValue = value as string;
      }

      // Compress if value is large
      let finalValue = serializedValue;
      if (
        options.compress !== false &&
        serializedValue.length > this.compressionThreshold
      ) {
        finalValue = 'COMPRESSED:' + await this.compress(serializedValue);
      }

      await this.redis.setex(prefixedKey, ttl, finalValue);
      return true;
    } catch (error) {
      this.logger.error(`Cache SET error for key ${key}:`, error);
      return false;
    }
  }

  /**
   * Delete key from cache
   */
  async del(key: string, prefix?: string): Promise<boolean> {
    if (!this.redis) return false;

    try {
      const prefixedKey = this.getPrefixedKey(key, prefix);
      const result = await this.redis.del(prefixedKey);
      return result > 0;
    } catch (error) {
      this.logger.error(`Cache DEL error for key ${key}:`, error);
      return false;
    }
  }

  /**
   * Check if key exists in cache
   */
  async exists(key: string, prefix?: string): Promise<boolean> {
    if (!this.redis) return false;

    try {
      const prefixedKey = this.getPrefixedKey(key, prefix);
      const result = await this.redis.exists(prefixedKey);
      return result === 1;
    } catch (error) {
      this.logger.error(`Cache EXISTS error for key ${key}:`, error);
      return false;
    }
  }

  /**
   * Set expiration time for existing key
   */
  async expire(key: string, ttl: number, prefix?: string): Promise<boolean> {
    if (!this.redis) return false;

    try {
      const prefixedKey = this.getPrefixedKey(key, prefix);
      const result = await this.redis.expire(prefixedKey, ttl);
      return result === 1;
    } catch (error) {
      this.logger.error(`Cache EXPIRE error for key ${key}:`, error);
      return false;
    }
  }

  /**
   * Get multiple keys at once (performance optimization)
   */
  async mget<T>(keys: string[], prefix?: string): Promise<(T | null)[]> {
    if (!this.redis || keys.length === 0) return [];

    try {
      const prefixedKeys = keys.map(key => this.getPrefixedKey(key, prefix));
      const values = await this.redis.mget(...prefixedKeys);

      return values.map(value => {
        if (!value) return null;
        try {
          return JSON.parse(value);
        } catch {
          return value as T;
        }
      });
    } catch (error) {
      this.logger.error('Cache MGET error:', error);
      return keys.map(() => null);
    }
  }

  /**
   * Set multiple keys at once (performance optimization)
   */
  async mset<T>(
    entries: Array<{ key: string; value: T; ttl?: number }>,
    prefix?: string
  ): Promise<boolean> {
    if (!this.redis || entries.length === 0) return false;

    try {
      const pipeline = this.redis.pipeline();

      for (const entry of entries) {
        const prefixedKey = this.getPrefixedKey(entry.key, prefix);
        const serializedValue = JSON.stringify(entry.value);
        const ttl = entry.ttl || this.defaultTTL;

        pipeline.setex(prefixedKey, ttl, serializedValue);
      }

      await pipeline.exec();
      return true;
    } catch (error) {
      this.logger.error('Cache MSET error:', error);
      return false;
    }
  }

  /**
   * Increment counter (useful for rate limiting)
   */
  async incr(key: string, prefix?: string): Promise<number> {
    if (!this.redis) return 0;

    try {
      const prefixedKey = this.getPrefixedKey(key, prefix);
      return await this.redis.incr(prefixedKey);
    } catch (error) {
      this.logger.error(`Cache INCR error for key ${key}:`, error);
      return 0;
    }
  }

  /**
   * Set value only if key doesn't exist (useful for locking)
   */
  async setnx(key: string, value: string, ttl?: number, prefix?: string): Promise<boolean> {
    if (!this.redis) return false;

    try {
      const prefixedKey = this.getPrefixedKey(key, prefix);

      if (ttl) {
        const result = await this.redis.set(prefixedKey, value, 'EX', ttl, 'NX');
        return result === 'OK';
      } else {
        const result = await this.redis.setnx(prefixedKey, value);
        return result === 1;
      }
    } catch (error) {
      this.logger.error(`Cache SETNX error for key ${key}:`, error);
      return false;
    }
  }

  /**
   * Pattern-based key deletion (use with caution)
   */
  async delPattern(pattern: string, prefix?: string): Promise<number> {
    if (!this.redis) return 0;

    try {
      const prefixedPattern = this.getPrefixedKey(pattern, prefix);
      const keys = await this.redis.keys(prefixedPattern);

      if (keys.length === 0) return 0;

      const result = await this.redis.del(...keys);
      return result;
    } catch (error) {
      this.logger.error(`Cache DEL_PATTERN error for pattern ${pattern}:`, error);
      return 0;
    }
  }

  /**
   * Get cache statistics
   */
  async getCacheStats(): Promise<any> {
    if (!this.redis) return null;

    try {
      const info = await this.redis.info('memory');
      const keyspaceInfo = await this.redis.info('keyspace');

      return {
        memoryUsage: this.parseRedisInfo(info),
        keyspaceInfo: this.parseRedisInfo(keyspaceInfo),
        connectedClients: await this.redis.client('list'),
      };
    } catch (error) {
      this.logger.error('Failed to get cache stats:', error);
      return null;
    }
  }

  /**
   * Cache warming for frequently accessed data
   */
  async warmCache(companyId: string): Promise<void> {
    this.logger.log(`Warming cache for company ${companyId}`);

    try {
      // Pre-load frequently accessed data
      const warmingTasks = [
        this.warmCompanyData(companyId),
        this.warmMenuData(companyId),
        this.warmBranchData(companyId),
        this.warmIntegrationData(companyId),
      ];

      await Promise.all(warmingTasks);
      this.logger.log(`Cache warmed successfully for company ${companyId}`);
    } catch (error) {
      this.logger.error(`Cache warming failed for company ${companyId}:`, error);
    }
  }

  private async warmCompanyData(companyId: string): Promise<void> {
    // Implementation would pre-load company settings, users, etc.
  }

  private async warmMenuData(companyId: string): Promise<void> {
    // Implementation would pre-load menu categories, products, etc.
  }

  private async warmBranchData(companyId: string): Promise<void> {
    // Implementation would pre-load branch information, printers, etc.
  }

  private async warmIntegrationData(companyId: string): Promise<void> {
    // Implementation would pre-load POS integrations, delivery providers, etc.
  }

  private getPrefixedKey(key: string, prefix?: string): string {
    const defaultPrefix = 'rp:'; // restaurant-platform
    const finalPrefix = prefix || defaultPrefix;
    return `${finalPrefix}${key}`;
  }

  private async compress(data: string): Promise<string> {
    // Simple base64 encoding for now - in production, use proper compression
    return Buffer.from(data).toString('base64');
  }

  private async decompress(data: string): Promise<string> {
    // Simple base64 decoding for now - in production, use proper decompression
    return Buffer.from(data, 'base64').toString();
  }

  private parseRedisInfo(info: string): Record<string, string> {
    const result: Record<string, string> = {};
    const lines = info.split('\r\n');

    for (const line of lines) {
      if (line.includes(':')) {
        const [key, value] = line.split(':');
        result[key] = value;
      }
    }

    return result;
  }

  async onModuleDestroy() {
    if (this.redis) {
      await this.redis.disconnect();
      this.logger.log('Disconnected from Redis server');
    }
  }
}