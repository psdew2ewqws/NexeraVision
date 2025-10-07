import { Injectable, Logger } from '@nestjs/common';

/**
 * Latency Measurement for Print Operations
 */
interface LatencyMeasurement {
  printerId: string;
  operationType: 'test' | 'print_job' | 'status_check';
  startTime: Date;
  endTime: Date;
  duration: number; // milliseconds
  success: boolean;
  error?: string;
}

/**
 * Latency Statistics
 */
interface LatencyStats {
  printerId: string;
  operationType: string;
  count: number;
  mean: number;
  median: number;
  p50: number; // 50th percentile
  p75: number; // 75th percentile
  p90: number; // 90th percentile
  p95: number; // 95th percentile
  p99: number; // 99th percentile
  min: number;
  max: number;
  standardDeviation: number;
  recommendedTimeout: number; // P95 + buffer
}

/**
 * Adaptive Timeout Configuration
 */
interface AdaptiveTimeoutConfig {
  printerId: string;
  operationType: string;
  baseTimeout: number;
  currentTimeout: number;
  minTimeout: number;
  maxTimeout: number;
  lastUpdated: Date;
  adjustmentFactor: number; // Multiplier for P95 to get timeout
}

/**
 * Timeout Optimizer Service
 *
 * Measures print job latencies and dynamically adjusts timeouts
 * based on historical performance data and statistical analysis
 */
@Injectable()
export class TimeoutOptimizerService {
  private readonly logger = new Logger(TimeoutOptimizerService.name);

  // Store latency measurements (keep last 1000 measurements per printer/operation)
  private measurements: Map<string, LatencyMeasurement[]> = new Map();
  private readonly MAX_MEASUREMENTS = 1000;

  // Adaptive timeout configurations
  private timeoutConfigs: Map<string, AdaptiveTimeoutConfig> = new Map();

  // Default configuration
  private readonly DEFAULT_TIMEOUT = 15000; // 15 seconds
  private readonly MIN_TIMEOUT = 5000; // 5 seconds minimum
  private readonly MAX_TIMEOUT = 120000; // 120 seconds maximum
  private readonly ADJUSTMENT_FACTOR = 1.5; // P95 * 1.5 for safety margin

  /**
   * Start measuring operation latency
   */
  startMeasurement(printerId: string, operationType: 'test' | 'print_job' | 'status_check'): string {
    const measurementId = `${printerId}_${operationType}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    this.logger.debug(`⏱️ [LATENCY] Starting measurement: ${measurementId}`);

    return measurementId;
  }

  /**
   * Complete measurement and record latency
   */
  completeMeasurement(
    measurementId: string,
    printerId: string,
    operationType: 'test' | 'print_job' | 'status_check',
    startTime: Date,
    success: boolean,
    error?: string
  ): number {
    const endTime = new Date();
    const duration = endTime.getTime() - startTime.getTime();

    const measurement: LatencyMeasurement = {
      printerId,
      operationType,
      startTime,
      endTime,
      duration,
      success,
      error,
    };

    this.recordMeasurement(printerId, operationType, measurement);

    this.logger.log(
      `📊 [LATENCY] ${operationType} for ${printerId}: ${duration}ms ` +
      `(${success ? 'SUCCESS' : 'FAILED'})`
    );

    // Update adaptive timeout if we have enough data
    this.updateAdaptiveTimeout(printerId, operationType);

    return duration;
  }

  /**
   * Record measurement
   */
  private recordMeasurement(
    printerId: string,
    operationType: string,
    measurement: LatencyMeasurement
  ): void {
    const key = this.getMeasurementKey(printerId, operationType);

    if (!this.measurements.has(key)) {
      this.measurements.set(key, []);
    }

    const measurements = this.measurements.get(key)!;
    measurements.push(measurement);

    // Keep only last MAX_MEASUREMENTS
    if (measurements.length > this.MAX_MEASUREMENTS) {
      measurements.shift();
    }
  }

  /**
   * Calculate latency statistics
   */
  calculateStats(printerId: string, operationType: string): LatencyStats | null {
    const key = this.getMeasurementKey(printerId, operationType);
    const measurements = this.measurements.get(key);

    if (!measurements || measurements.length < 10) {
      this.logger.debug(
        `📊 [STATS] Not enough data for ${printerId}/${operationType} ` +
        `(${measurements?.length || 0} measurements, need at least 10)`
      );
      return null;
    }

    // Filter successful measurements only for latency stats
    const successfulMeasurements = measurements
      .filter(m => m.success)
      .map(m => m.duration)
      .sort((a, b) => a - b);

    if (successfulMeasurements.length < 5) {
      this.logger.debug(
        `📊 [STATS] Not enough successful measurements for ${printerId}/${operationType}`
      );
      return null;
    }

    const count = successfulMeasurements.length;
    const mean = successfulMeasurements.reduce((a, b) => a + b, 0) / count;
    const median = this.getPercentile(successfulMeasurements, 50);
    const min = successfulMeasurements[0];
    const max = successfulMeasurements[count - 1];

    // Calculate percentiles
    const p50 = this.getPercentile(successfulMeasurements, 50);
    const p75 = this.getPercentile(successfulMeasurements, 75);
    const p90 = this.getPercentile(successfulMeasurements, 90);
    const p95 = this.getPercentile(successfulMeasurements, 95);
    const p99 = this.getPercentile(successfulMeasurements, 99);

    // Calculate standard deviation
    const variance =
      successfulMeasurements.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / count;
    const standardDeviation = Math.sqrt(variance);

    // Recommended timeout: P95 + adjustment factor
    const recommendedTimeout = Math.min(
      Math.max(
        Math.ceil(p95 * this.ADJUSTMENT_FACTOR),
        this.MIN_TIMEOUT
      ),
      this.MAX_TIMEOUT
    );

    const stats: LatencyStats = {
      printerId,
      operationType,
      count,
      mean,
      median,
      p50,
      p75,
      p90,
      p95,
      p99,
      min,
      max,
      standardDeviation,
      recommendedTimeout,
    };

    this.logger.debug(`📈 [STATS] ${printerId}/${operationType} statistics:`, {
      count,
      mean: `${mean.toFixed(0)}ms`,
      p95: `${p95.toFixed(0)}ms`,
      recommendedTimeout: `${recommendedTimeout}ms`,
    });

    return stats;
  }

  /**
   * Get percentile value from sorted array
   */
  private getPercentile(sortedArray: number[], percentile: number): number {
    const index = (percentile / 100) * (sortedArray.length - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    const weight = index - lower;

    if (upper >= sortedArray.length) {
      return sortedArray[sortedArray.length - 1];
    }

    return sortedArray[lower] * (1 - weight) + sortedArray[upper] * weight;
  }

  /**
   * Update adaptive timeout based on recent measurements
   */
  private updateAdaptiveTimeout(printerId: string, operationType: string): void {
    const stats = this.calculateStats(printerId, operationType);

    if (!stats) {
      return; // Not enough data yet
    }

    const key = this.getMeasurementKey(printerId, operationType);
    const existingConfig = this.timeoutConfigs.get(key);

    const newConfig: AdaptiveTimeoutConfig = {
      printerId,
      operationType,
      baseTimeout: this.DEFAULT_TIMEOUT,
      currentTimeout: stats.recommendedTimeout,
      minTimeout: this.MIN_TIMEOUT,
      maxTimeout: this.MAX_TIMEOUT,
      lastUpdated: new Date(),
      adjustmentFactor: this.ADJUSTMENT_FACTOR,
    };

    // Log timeout changes
    if (existingConfig && existingConfig.currentTimeout !== newConfig.currentTimeout) {
      this.logger.log(
        `⚡ [TIMEOUT] Updated timeout for ${printerId}/${operationType}: ` +
        `${existingConfig.currentTimeout}ms → ${newConfig.currentTimeout}ms ` +
        `(P95: ${stats.p95.toFixed(0)}ms)`
      );
    }

    this.timeoutConfigs.set(key, newConfig);
  }

  /**
   * Get current timeout for operation
   */
  getTimeout(printerId: string, operationType: string): number {
    const key = this.getMeasurementKey(printerId, operationType);
    const config = this.timeoutConfigs.get(key);

    return config?.currentTimeout || this.DEFAULT_TIMEOUT;
  }

  /**
   * Get adaptive timeout configuration
   */
  getTimeoutConfig(printerId: string, operationType: string): AdaptiveTimeoutConfig | null {
    const key = this.getMeasurementKey(printerId, operationType);
    return this.timeoutConfigs.get(key) || null;
  }

  /**
   * Get all timeout configurations
   */
  getAllTimeoutConfigs(): Map<string, AdaptiveTimeoutConfig> {
    return new Map(this.timeoutConfigs);
  }

  /**
   * Get all statistics
   */
  getAllStats(): Map<string, LatencyStats> {
    const allStats = new Map<string, LatencyStats>();

    for (const key of this.measurements.keys()) {
      const [printerId, operationType] = key.split('::');
      const stats = this.calculateStats(printerId, operationType);

      if (stats) {
        allStats.set(key, stats);
      }
    }

    return allStats;
  }

  /**
   * Get measurement key
   */
  private getMeasurementKey(printerId: string, operationType: string): string {
    return `${printerId}::${operationType}`;
  }

  /**
   * Get recent measurements for analysis
   */
  getRecentMeasurements(
    printerId: string,
    operationType: string,
    limit: number = 100
  ): LatencyMeasurement[] {
    const key = this.getMeasurementKey(printerId, operationType);
    const measurements = this.measurements.get(key) || [];

    return measurements.slice(-limit);
  }

  /**
   * Clear measurements for printer
   */
  clearMeasurements(printerId?: string): void {
    if (printerId) {
      const keysToDelete: string[] = [];

      for (const key of this.measurements.keys()) {
        if (key.startsWith(`${printerId}::`)) {
          keysToDelete.push(key);
        }
      }

      keysToDelete.forEach(key => {
        this.measurements.delete(key);
        this.timeoutConfigs.delete(key);
      });

      this.logger.log(`🗑️ [LATENCY] Cleared measurements for printer: ${printerId}`);
    } else {
      this.measurements.clear();
      this.timeoutConfigs.clear();
      this.logger.log(`🗑️ [LATENCY] Cleared all measurements`);
    }
  }

  /**
   * Generate latency report
   */
  generateLatencyReport(): {
    summary: {
      totalMeasurements: number;
      totalPrinters: number;
      totalOperations: number;
    };
    printerStats: Map<string, LatencyStats>;
    recommendations: string[];
  } {
    const allStats = this.getAllStats();
    const printers = new Set<string>();
    const operations = new Set<string>();
    let totalMeasurements = 0;

    for (const [key, stats] of allStats.entries()) {
      printers.add(stats.printerId);
      operations.add(stats.operationType);
      totalMeasurements += stats.count;
    }

    const recommendations: string[] = [];

    // Generate recommendations based on statistics
    for (const [key, stats] of allStats.entries()) {
      // High latency warning
      if (stats.p95 > 30000) { // > 30 seconds
        recommendations.push(
          `⚠️ High latency detected for ${stats.printerId}/${stats.operationType}: ` +
          `P95 = ${stats.p95.toFixed(0)}ms. Consider network or printer optimization.`
        );
      }

      // High variance warning
      if (stats.standardDeviation > stats.mean) {
        recommendations.push(
          `⚠️ High latency variance for ${stats.printerId}/${stats.operationType}: ` +
          `SD = ${stats.standardDeviation.toFixed(0)}ms. Inconsistent performance detected.`
        );
      }

      // Success rate check (if we stored failures)
      const measurements = this.getRecentMeasurements(stats.printerId, stats.operationType);
      const successRate = (measurements.filter(m => m.success).length / measurements.length) * 100;

      if (successRate < 95) {
        recommendations.push(
          `⚠️ Low success rate for ${stats.printerId}/${stats.operationType}: ` +
          `${successRate.toFixed(1)}%. Investigate printer reliability.`
        );
      }
    }

    return {
      summary: {
        totalMeasurements,
        totalPrinters: printers.size,
        totalOperations: operations.size,
      },
      printerStats: allStats,
      recommendations,
    };
  }
}
