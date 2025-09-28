import { Injectable, Logger } from '@nestjs/common';
import { RedisCacheService } from '../cache/redis-cache.service';

export interface PerformanceMetrics {
  memoryUsage: NodeJS.MemoryUsage;
  cpuUsage: number;
  activeConnections: number;
  cacheHitRate: number;
  avgResponseTime: number;
  requestsPerSecond: number;
  errorRate: number;
}

export interface QueryOptimizationResult {
  originalDuration: number;
  optimizedDuration: number;
  improvement: number;
  cacheUsed: boolean;
  recommendations: string[];
}

@Injectable()
export class PerformanceService {
  private readonly logger = new Logger(PerformanceService.name);
  private requestMetrics: Map<string, number[]> = new Map();
  private responseTimeHistory: number[] = [];
  private errorCount = 0;
  private requestCount = 0;
  private lastResetTime = Date.now();

  constructor(private readonly cacheService: RedisCacheService) {
    // Clean up old metrics every hour
    setInterval(() => this.cleanupMetrics(), 3600000);
  }

  /**
   * Memory Management and Optimization
   */
  async optimizeMemoryUsage(): Promise<void> {
    try {
      // Force garbage collection if available
      if (global.gc) {
        global.gc();
        this.logger.log('Forced garbage collection executed');
      }

      // Clean up old cache entries
      await this.cleanupOldCacheEntries();

      // Monitor memory usage
      const memoryUsage = process.memoryUsage();
      const memoryUsageMB = {
        rss: Math.round(memoryUsage.rss / 1024 / 1024),
        heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024),
        heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024),
        external: Math.round(memoryUsage.external / 1024 / 1024),
      };

      this.logger.log(`Memory usage: ${JSON.stringify(memoryUsageMB)} MB`);

      // Alert if memory usage is too high
      if (memoryUsageMB.heapUsed > 1024) { // 1GB
        this.logger.warn(`High memory usage detected: ${memoryUsageMB.heapUsed}MB`);
        await this.emergencyMemoryCleanup();
      }

    } catch (error) {
      this.logger.error('Memory optimization failed:', error);
    }
  }

  private async cleanupOldCacheEntries(): Promise<void> {
    // Clean up cache entries older than 24 hours
    const patterns = [
      'rp:temp:*',
      'rp:session:*',
      'rp:rate_limit:*',
    ];

    for (const pattern of patterns) {
      await this.cacheService.delPattern(pattern);
    }
  }

  private async emergencyMemoryCleanup(): Promise<void> {
    this.logger.warn('Executing emergency memory cleanup');

    try {
      // Clear non-essential caches
      await this.cacheService.delPattern('rp:cache:*');
      await this.cacheService.delPattern('rp:temp:*');

      // Clear in-memory metrics
      this.responseTimeHistory = this.responseTimeHistory.slice(-100);
      this.requestMetrics.clear();

      // Force garbage collection
      if (global.gc) {
        global.gc();
      }

      this.logger.log('Emergency memory cleanup completed');
    } catch (error) {
      this.logger.error('Emergency memory cleanup failed:', error);
    }
  }

  /**
   * Database Query Optimization
   */
  async optimizeQuery<T>(
    queryName: string,
    queryFunction: () => Promise<T>,
    cacheOptions?: {
      ttl?: number;
      useCache?: boolean;
      invalidatePattern?: string;
    }
  ): Promise<{ result: T; metrics: QueryOptimizationResult }> {
    const startTime = Date.now();
    const cacheKey = `query:${queryName}`;

    let result: T;
    let cacheUsed = false;

    try {
      // Try to get from cache first
      if (cacheOptions?.useCache !== false) {
        const cachedResult = await this.cacheService.get<T>(cacheKey, {
          ttl: cacheOptions?.ttl || 300, // 5 minutes default
        });

        if (cachedResult) {
          result = cachedResult;
          cacheUsed = true;
        }
      }

      // Execute query if not cached
      if (!result) {
        result = await queryFunction();

        // Cache the result if caching is enabled
        if (cacheOptions?.useCache !== false) {
          await this.cacheService.set(cacheKey, result, {
            ttl: cacheOptions?.ttl || 300,
          });
        }
      }

      const duration = Date.now() - startTime;

      // Record metrics
      this.recordQueryMetrics(queryName, duration, cacheUsed);

      const metrics: QueryOptimizationResult = {
        originalDuration: duration,
        optimizedDuration: cacheUsed ? 1 : duration,
        improvement: cacheUsed ? ((duration - 1) / duration) * 100 : 0,
        cacheUsed,
        recommendations: this.generateQueryRecommendations(queryName, duration, cacheUsed),
      };

      return { result, metrics };

    } catch (error) {
      this.logger.error(`Query optimization failed for ${queryName}:`, error);
      throw error;
    }
  }

  private recordQueryMetrics(queryName: string, duration: number, cacheUsed: boolean): void {
    if (!this.requestMetrics.has(queryName)) {
      this.requestMetrics.set(queryName, []);
    }

    const metrics = this.requestMetrics.get(queryName)!;
    metrics.push(duration);

    // Keep only last 100 measurements
    if (metrics.length > 100) {
      metrics.shift();
    }

    // Update global metrics
    this.responseTimeHistory.push(duration);
    if (this.responseTimeHistory.length > 1000) {
      this.responseTimeHistory.shift();
    }
  }

  private generateQueryRecommendations(
    queryName: string,
    duration: number,
    cacheUsed: boolean
  ): string[] {
    const recommendations: string[] = [];

    if (duration > 1000 && !cacheUsed) {
      recommendations.push('Consider enabling caching for this slow query');
    }

    if (duration > 5000) {
      recommendations.push('Query is very slow - check for missing indexes');
      recommendations.push('Consider query optimization or data denormalization');
    }

    const metrics = this.requestMetrics.get(queryName);
    if (metrics && metrics.length > 10) {
      const avgDuration = metrics.reduce((a, b) => a + b, 0) / metrics.length;
      if (avgDuration > 500) {
        recommendations.push('Consistently slow query - consider structural optimization');
      }
    }

    return recommendations;
  }

  /**
   * Resource Pooling and Connection Management
   */
  async optimizeConnectionPool(): Promise<void> {
    try {
      // Monitor active connections
      const activeConnections = await this.getActiveConnections();

      if (activeConnections > 50) { // Threshold for connection pooling
        this.logger.warn(`High number of active connections: ${activeConnections}`);
        // Implement connection cleanup logic here
      }

      // Optimize database connection pool
      await this.optimizeDatabasePool();

    } catch (error) {
      this.logger.error('Connection pool optimization failed:', error);
    }
  }

  private async getActiveConnections(): Promise<number> {
    // Implementation would count active database connections
    // This is a placeholder - actual implementation depends on database driver
    return 0;
  }

  private async optimizeDatabasePool(): Promise<void> {
    // Implementation would optimize database connection pool settings
    // Based on current load and performance metrics
  }

  /**
   * Lazy Loading and Streaming
   */
  async implementLazyLoading<T>(
    items: T[],
    pageSize: number = 20
  ): Promise<{
    items: T[];
    hasMore: boolean;
    loadMore: () => Promise<T[]>;
  }> {
    let currentIndex = 0;

    const loadMore = async (): Promise<T[]> => {
      const start = currentIndex;
      const end = Math.min(start + pageSize, items.length);
      currentIndex = end;

      return items.slice(start, end);
    };

    const initialItems = await loadMore();

    return {
      items: initialItems,
      hasMore: currentIndex < items.length,
      loadMore,
    };
  }

  /**
   * Async Operation Optimization
   */
  async optimizeAsyncOperations<T>(
    operations: (() => Promise<T>)[],
    options: {
      maxConcurrency?: number;
      timeout?: number;
      retries?: number;
    } = {}
  ): Promise<T[]> {
    const {
      maxConcurrency = 5,
      timeout = 30000,
      retries = 3
    } = options;

    const results: T[] = [];
    const executing: Promise<void>[] = [];

    for (const operation of operations) {
      const promise = this.executeWithRetry(operation, retries, timeout)
        .then(result => results.push(result))
        .catch(error => {
          this.logger.error('Async operation failed:', error);
          // Don't push failed results, but don't fail the whole batch
        });

      executing.push(promise);

      // Limit concurrency
      if (executing.length >= maxConcurrency) {
        await Promise.race(executing);
        // Remove completed promises
        const completed = executing.filter(p =>
          p instanceof Promise &&
          (p as any)[Symbol.toStringTag] === 'resolved'
        );
        completed.forEach(p => {
          const index = executing.indexOf(p);
          if (index > -1) executing.splice(index, 1);
        });
      }
    }

    // Wait for all remaining operations
    await Promise.allSettled(executing);

    return results;
  }

  private async executeWithRetry<T>(
    operation: () => Promise<T>,
    retries: number,
    timeout: number
  ): Promise<T> {
    let lastError: Error;

    for (let i = 0; i <= retries; i++) {
      try {
        return await Promise.race([
          operation(),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('Operation timeout')), timeout)
          ),
        ]);
      } catch (error) {
        lastError = error as Error;
        if (i < retries) {
          // Exponential backoff
          const delay = Math.min(1000 * Math.pow(2, i), 10000);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError!;
  }

  /**
   * Performance Monitoring and Metrics
   */
  recordRequest(duration: number, success: boolean): void {
    this.requestCount++;
    if (!success) {
      this.errorCount++;
    }

    this.responseTimeHistory.push(duration);
    if (this.responseTimeHistory.length > 1000) {
      this.responseTimeHistory.shift();
    }
  }

  async getPerformanceMetrics(): Promise<PerformanceMetrics> {
    const memoryUsage = process.memoryUsage();
    const uptime = process.uptime();
    const currentTime = Date.now();
    const timePeriod = (currentTime - this.lastResetTime) / 1000; // seconds

    const avgResponseTime = this.responseTimeHistory.length > 0
      ? this.responseTimeHistory.reduce((a, b) => a + b, 0) / this.responseTimeHistory.length
      : 0;

    const requestsPerSecond = this.requestCount / timePeriod;
    const errorRate = this.requestCount > 0 ? (this.errorCount / this.requestCount) * 100 : 0;

    // Get cache stats
    const cacheStats = await this.cacheService.getCacheStats();
    const cacheHitRate = cacheStats ? this.calculateCacheHitRate(cacheStats) : 0;

    return {
      memoryUsage,
      cpuUsage: this.getCPUUsage(),
      activeConnections: await this.getActiveConnections(),
      cacheHitRate,
      avgResponseTime,
      requestsPerSecond,
      errorRate,
    };
  }

  private calculateCacheHitRate(cacheStats: any): number {
    // Implementation would calculate cache hit rate from Redis stats
    return 0; // Placeholder
  }

  private getCPUUsage(): number {
    // Implementation would calculate CPU usage
    // This is a simplified version
    const cpuUsage = process.cpuUsage();
    return (cpuUsage.user + cpuUsage.system) / 1000000; // Convert to seconds
  }

  private cleanupMetrics(): void {
    // Reset counters every hour
    const now = Date.now();
    if (now - this.lastResetTime > 3600000) { // 1 hour
      this.requestCount = 0;
      this.errorCount = 0;
      this.lastResetTime = now;
    }

    // Clean old response time history
    const cutoff = now - 3600000; // 1 hour
    this.responseTimeHistory = this.responseTimeHistory.slice(-1000);

    // Clean old request metrics
    this.requestMetrics.forEach((metrics, key) => {
      if (metrics.length > 100) {
        this.requestMetrics.set(key, metrics.slice(-100));
      }
    });

    this.logger.log('Performance metrics cleanup completed');
  }

  /**
   * Data Structure Optimization
   */
  optimizeDataStructures<T>(data: T[]): T[] {
    // Remove duplicates efficiently
    const uniqueData = [...new Set(data)];

    // Sort if data has natural ordering (numbers, dates)
    if (uniqueData.length > 0 && typeof uniqueData[0] === 'number') {
      return (uniqueData as any[]).sort((a, b) => a - b) as T[];
    }

    return uniqueData;
  }

  /**
   * Batch Processing Optimization
   */
  async processBatch<T, R>(
    items: T[],
    processor: (batch: T[]) => Promise<R[]>,
    batchSize: number = 50
  ): Promise<R[]> {
    const results: R[] = [];

    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);
      try {
        const batchResults = await processor(batch);
        results.push(...batchResults);
      } catch (error) {
        this.logger.error(`Batch processing failed for batch ${i / batchSize + 1}:`, error);
        // Continue with next batch instead of failing completely
      }
    }

    return results;
  }
}