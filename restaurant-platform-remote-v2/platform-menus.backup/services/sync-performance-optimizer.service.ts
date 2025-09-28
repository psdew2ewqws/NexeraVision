// ================================================
// Sync Performance Optimizer Service
// Restaurant Platform v2 - Advanced Performance Optimizations
// ================================================

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { MenuCacheService } from './menu-cache.service';
import { DeliveryPlatform, PlatformMenuItem, PlatformMenu } from '../types/platform-menu.types';

// ================================================
// PERFORMANCE OPTIMIZATION INTERFACES
// ================================================

interface SyncBatch {
  items: PlatformMenuItem[];
  platform: DeliveryPlatform;
  batchId: string;
  estimatedTime: number;
}

interface OptimizationResult {
  optimizedBatches: SyncBatch[];
  estimatedTotalTime: number;
  parallelismFactor: number;
  recommendations: string[];
}

interface PerformanceMetrics {
  averageItemSyncTime: number;
  platformPerformance: Record<DeliveryPlatform, number>;
  networkLatency: Record<DeliveryPlatform, number>;
  throughputPerSecond: number;
}

// ================================================
// SYNC PERFORMANCE OPTIMIZER SERVICE
// ================================================

@Injectable()
export class SyncPerformanceOptimizerService {
  private readonly logger = new Logger(SyncPerformanceOptimizerService.name);
  private readonly performanceMetrics: PerformanceMetrics = {
    averageItemSyncTime: 50, // milliseconds
    platformPerformance: {
      [DeliveryPlatform.CAREEM]: 80, // ms per item
      [DeliveryPlatform.TALABAT]: 60, // ms per item
      [DeliveryPlatform.WEBSITE]: 5,
      [DeliveryPlatform.CALL_CENTER]: 2,
      [DeliveryPlatform.MOBILE_APP]: 8,
      [DeliveryPlatform.KIOSK]: 5,
      [DeliveryPlatform.IN_STORE_DISPLAY]: 3,
      [DeliveryPlatform.CHATBOT]: 2,
      [DeliveryPlatform.ONLINE_ORDERING]: 6
    },
    networkLatency: {
      [DeliveryPlatform.CAREEM]: 200, // ms base latency
      [DeliveryPlatform.TALABAT]: 150,
      [DeliveryPlatform.WEBSITE]: 5,
      [DeliveryPlatform.CALL_CENTER]: 1,
      [DeliveryPlatform.MOBILE_APP]: 10,
      [DeliveryPlatform.KIOSK]: 5,
      [DeliveryPlatform.IN_STORE_DISPLAY]: 2,
      [DeliveryPlatform.CHATBOT]: 1,
      [DeliveryPlatform.ONLINE_ORDERING]: 8
    },
    throughputPerSecond: 20 // items per second per platform
  };

  constructor(
    private readonly prisma: PrismaService,
    private readonly cacheService: MenuCacheService
  ) {}

  // ================================================
  // OPTIMIZATION ALGORITHMS
  // ================================================

  /**
   * Optimize sync strategy for blazing fast performance
   * Target: <30s for 500+ items across multiple platforms
   */
  async optimizeSyncStrategy(
    menu: PlatformMenu,
    platforms: DeliveryPlatform[],
    maxConcurrency: number = 4
  ): Promise<OptimizationResult> {
    const items = menu.items || [];
    const totalItems = items.length;

    this.logger.log(`Optimizing sync for ${totalItems} items across ${platforms.length} platforms`);

    // 1. Calculate optimal batch sizes per platform
    const optimalBatches = this.calculateOptimalBatches(items, platforms, maxConcurrency);

    // 2. Apply intelligent load balancing
    const loadBalancedBatches = this.applyLoadBalancing(optimalBatches);

    // 3. Calculate parallelism factor
    const parallelismFactor = this.calculateParallelismFactor(platforms, maxConcurrency);

    // 4. Estimate total time with optimizations
    const estimatedTotalTime = this.estimateOptimizedSyncTime(loadBalancedBatches, parallelismFactor);

    // 5. Generate performance recommendations
    const recommendations = this.generateRecommendations(platforms, totalItems, estimatedTotalTime);

    return {
      optimizedBatches: loadBalancedBatches,
      estimatedTotalTime,
      parallelismFactor,
      recommendations
    };
  }

  /**
   * Calculate optimal batch sizes for each platform
   */
  private calculateOptimalBatches(
    items: PlatformMenuItem[],
    platforms: DeliveryPlatform[],
    maxConcurrency: number
  ): SyncBatch[] {
    const batches: SyncBatch[] = [];

    platforms.forEach(platform => {
      const platformPerf = this.performanceMetrics.platformPerformance[platform];
      const networkLatency = this.performanceMetrics.networkLatency[platform];

      // Calculate optimal batch size based on platform performance
      // Formula: Minimize (batch_size * item_time + network_latency) * num_batches
      const optimalBatchSize = this.calculateOptimalBatchSize(
        items.length,
        platformPerf,
        networkLatency,
        maxConcurrency
      );

      // Split items into optimized batches
      for (let i = 0; i < items.length; i += optimalBatchSize) {
        const batchItems = items.slice(i, i + optimalBatchSize);
        const estimatedTime = (batchItems.length * platformPerf) + networkLatency;

        batches.push({
          items: batchItems,
          platform,
          batchId: `${platform}_batch_${Math.floor(i / optimalBatchSize) + 1}`,
          estimatedTime
        });
      }
    });

    return batches;
  }

  /**
   * Calculate optimal batch size using performance modeling
   */
  private calculateOptimalBatchSize(
    totalItems: number,
    itemTime: number,
    networkLatency: number,
    maxConcurrency: number
  ): number {
    // Mathematical optimization for minimal total time
    // Considers: network overhead, parallel processing, and API limits

    const baseOptimal = Math.sqrt((totalItems * networkLatency) / itemTime);
    const concurrencyAdjusted = Math.min(baseOptimal, Math.ceil(totalItems / maxConcurrency));

    // Platform-specific limits
    const platformLimits = {
      min: 10,   // Minimum for efficiency
      max: 100   // Maximum to prevent API overload
    };

    return Math.max(
      platformLimits.min,
      Math.min(platformLimits.max, Math.round(concurrencyAdjusted))
    );
  }

  /**
   * Apply intelligent load balancing across platforms
   */
  private applyLoadBalancing(batches: SyncBatch[]): SyncBatch[] {
    // Group batches by estimated completion time
    const timeGroups = this.groupBatchesByTime(batches);

    // Redistribute work to minimize total sync time
    return this.redistributeWorkload(timeGroups);
  }

  /**
   * Group batches by estimated completion time for load balancing
   */
  private groupBatchesByTime(batches: SyncBatch[]): Map<string, SyncBatch[]> {
    const timeGroups = new Map<string, SyncBatch[]>();

    batches.forEach(batch => {
      const timeGroup = Math.floor(batch.estimatedTime / 5000) * 5000; // 5-second groups
      const key = `${timeGroup}ms`;

      if (!timeGroups.has(key)) {
        timeGroups.set(key, []);
      }
      timeGroups.get(key)!.push(batch);
    });

    return timeGroups;
  }

  /**
   * Redistribute workload for optimal performance
   */
  private redistributeWorkload(timeGroups: Map<string, SyncBatch[]>): SyncBatch[] {
    const redistributed: SyncBatch[] = [];

    // Sort time groups by estimated time
    const sortedGroups = Array.from(timeGroups.entries())
      .sort(([a], [b]) => parseInt(a) - parseInt(b));

    // Apply work redistribution algorithm
    sortedGroups.forEach(([timeKey, batches]) => {
      // For high-latency platforms, merge smaller batches
      const optimizedBatches = this.mergeBatchesForEfficiency(batches);
      redistributed.push(...optimizedBatches);
    });

    return redistributed;
  }

  /**
   * Merge smaller batches for efficiency
   */
  private mergeBatchesForEfficiency(batches: SyncBatch[]): SyncBatch[] {
    const merged: SyncBatch[] = [];
    const platformGroups = new Map<DeliveryPlatform, SyncBatch[]>();

    // Group by platform
    batches.forEach(batch => {
      if (!platformGroups.has(batch.platform)) {
        platformGroups.set(batch.platform, []);
      }
      platformGroups.get(batch.platform)!.push(batch);
    });

    // Merge small batches within each platform
    platformGroups.forEach((platformBatches, platform) => {
      const networkLatency = this.performanceMetrics.networkLatency[platform];

      // If network latency is high, merge smaller batches
      if (networkLatency > 100) {
        const mergedBatch = this.mergeSmallBatches(platformBatches);
        merged.push(...mergedBatch);
      } else {
        merged.push(...platformBatches);
      }
    });

    return merged;
  }

  /**
   * Merge small batches to reduce network overhead
   */
  private mergeSmallBatches(batches: SyncBatch[]): SyncBatch[] {
    if (batches.length <= 1) return batches;

    const merged: SyncBatch[] = [];
    let currentBatch: SyncBatch | null = null;
    const maxMergedSize = 75; // Maximum items per merged batch

    batches.forEach(batch => {
      if (!currentBatch) {
        currentBatch = { ...batch };
      } else if (currentBatch.items.length + batch.items.length <= maxMergedSize) {
        // Merge with current batch
        currentBatch.items = [...currentBatch.items, ...batch.items];
        currentBatch.estimatedTime = Math.max(currentBatch.estimatedTime, batch.estimatedTime);
        currentBatch.batchId = `${currentBatch.batchId}_merged`;
      } else {
        // Start new batch
        merged.push(currentBatch);
        currentBatch = { ...batch };
      }
    });

    if (currentBatch) {
      merged.push(currentBatch);
    }

    return merged;
  }

  /**
   * Calculate parallelism factor for performance estimation
   */
  private calculateParallelismFactor(platforms: DeliveryPlatform[], maxConcurrency: number): number {
    const externalPlatforms = platforms.filter(p =>
      p === DeliveryPlatform.CAREEM || p === DeliveryPlatform.TALABAT
    ).length;

    const internalPlatforms = platforms.length - externalPlatforms;

    // External platforms have lower parallelism due to API limits
    const externalParallelism = Math.min(externalPlatforms, 2);
    const internalParallelism = Math.min(internalPlatforms, maxConcurrency - externalParallelism);

    return externalParallelism + internalParallelism;
  }

  /**
   * Estimate optimized sync time with all optimizations applied
   */
  private estimateOptimizedSyncTime(batches: SyncBatch[], parallelismFactor: number): number {
    if (batches.length === 0) return 0;

    // Group batches by platform for parallel execution
    const platformBatches = new Map<DeliveryPlatform, SyncBatch[]>();
    batches.forEach(batch => {
      if (!platformBatches.has(batch.platform)) {
        platformBatches.set(batch.platform, []);
      }
      platformBatches.get(batch.platform)!.push(batch);
    });

    // Calculate time for each platform (batches run sequentially per platform)
    const platformTimes = Array.from(platformBatches.values()).map(platformBatchList => {
      return platformBatchList.reduce((total, batch) => total + batch.estimatedTime, 0);
    });

    // With parallel execution, total time is the maximum platform time
    const maxPlatformTime = Math.max(...platformTimes);

    // Apply parallelism factor (efficiency reduction for coordination overhead)
    const parallelismEfficiency = 0.85; // 15% overhead for coordination
    const optimizedTime = maxPlatformTime * parallelismEfficiency;

    // Add base startup overhead
    const startupOverhead = 2000; // 2 seconds

    return optimizedTime + startupOverhead;
  }

  /**
   * Generate performance recommendations
   */
  private generateRecommendations(
    platforms: DeliveryPlatform[],
    totalItems: number,
    estimatedTime: number
  ): string[] {
    const recommendations: string[] = [];

    // Performance target analysis
    const targetTime = 30000; // 30 seconds
    if (estimatedTime > targetTime) {
      recommendations.push(
        `Estimated sync time (${Math.ceil(estimatedTime / 1000)}s) exceeds target (30s). Consider reducing platforms or item count.`
      );
    } else {
      recommendations.push(
        `Performance target achieved: ${Math.ceil(estimatedTime / 1000)}s (under 30s target)`
      );
    }

    // Platform-specific recommendations
    const externalPlatforms = platforms.filter(p =>
      p === DeliveryPlatform.CAREEM || p === DeliveryPlatform.TALABAT
    );

    if (externalPlatforms.length > 2) {
      recommendations.push(
        'Consider limiting external platforms to 2 concurrent syncs for optimal performance'
      );
    }

    // Item count recommendations
    if (totalItems > 1000) {
      recommendations.push(
        'Large menu detected. Consider incremental sync for regular updates'
      );
    }

    // Caching recommendations
    recommendations.push(
      'Enable menu caching for repeated syncs to improve performance'
    );

    return recommendations;
  }

  // ================================================
  // PERFORMANCE MONITORING
  // ================================================

  /**
   * Update performance metrics based on actual sync results
   */
  async updatePerformanceMetrics(
    platform: DeliveryPlatform,
    itemCount: number,
    syncTimeMs: number
  ): Promise<void> {
    const timePerItem = syncTimeMs / itemCount;

    // Update running average (exponential moving average)
    const alpha = 0.1; // Learning rate
    this.performanceMetrics.platformPerformance[platform] =
      (1 - alpha) * this.performanceMetrics.platformPerformance[platform] +
      alpha * timePerItem;

    // Cache updated metrics
    await this.cacheService.set(
      `performance_metrics_${platform}`,
      this.performanceMetrics.platformPerformance[platform],
      3600 // 1 hour
    );

    this.logger.debug(
      `Updated performance metrics for ${platform}: ${timePerItem.toFixed(2)}ms per item`
    );
  }

  /**
   * Get current performance metrics
   */
  getPerformanceMetrics(): PerformanceMetrics {
    return { ...this.performanceMetrics };
  }

  /**
   * Predict sync performance for given parameters
   */
  predictSyncPerformance(
    itemCount: number,
    platforms: DeliveryPlatform[],
    concurrency: number = 4
  ): {
    estimatedTime: number;
    itemsPerSecond: number;
    recommendedBatchSize: number;
  } {
    const averageTimePerItem = platforms.reduce(
      (sum, platform) => sum + this.performanceMetrics.platformPerformance[platform],
      0
    ) / platforms.length;

    const averageLatency = platforms.reduce(
      (sum, platform) => sum + this.performanceMetrics.networkLatency[platform],
      0
    ) / platforms.length;

    const recommendedBatchSize = this.calculateOptimalBatchSize(
      itemCount,
      averageTimePerItem,
      averageLatency,
      concurrency
    );

    const estimatedTime = (itemCount * averageTimePerItem) / concurrency + averageLatency;
    const itemsPerSecond = itemCount / (estimatedTime / 1000);

    return {
      estimatedTime,
      itemsPerSecond,
      recommendedBatchSize
    };
  }
}