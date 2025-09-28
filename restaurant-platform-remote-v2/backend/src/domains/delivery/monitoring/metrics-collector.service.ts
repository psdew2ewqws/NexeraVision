import { Injectable } from '@nestjs/common';
import { SystemHealthStatus, MonitoringMetrics, MetricDataPoint, TimeSeriesData } from '../interfaces/monitoring.interface';

@Injectable()
export class MetricsCollector {
  private readonly metrics: Map<string, TimeSeriesData> = new Map();
  private readonly maxDataPoints = 1440; // 24 hours of minute-by-minute data
  private readonly retentionPeriod = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds

  constructor() {
    // Initialize metric storage
    this.initializeMetrics();
    
    // Start cleanup timer
    setInterval(() => this.cleanupOldMetrics(), 60000); // Every minute
  }

  private initializeMetrics(): void {
    const metricTypes = [
      'system.memory.heap_used',
      'system.memory.heap_total',
      'system.memory.rss',
      'system.cpu.usage',
      'system.uptime',
      'delivery.total_orders',
      'delivery.successful_orders',
      'delivery.failed_orders',
      'delivery.error_rate',
      'delivery.order_rate',
      'delivery.average_delivery_time',
      'provider.dhub.success_rate',
      'provider.dhub.response_time',
      'provider.talabat.success_rate',
      'provider.talabat.response_time',
      'provider.careem.success_rate',
      'provider.careem.response_time',
      'health.overall_status',
      'health.check_duration'
    ];

    for (const metricType of metricTypes) {
      this.metrics.set(metricType, {
        metricName: metricType,
        dataPoints: [],
        lastUpdated: new Date(),
        aggregations: {
          avg: 0,
          min: 0,
          max: 0,
          sum: 0,
          count: 0
        }
      });
    }
  }

  async recordHealthCheck(healthStatus: SystemHealthStatus): Promise<void> {
    const timestamp = new Date();
    
    // Record overall health status (convert to numeric for trending)
    const statusValue = this.healthStatusToNumeric(healthStatus.status);
    await this.recordMetric('health.overall_status', statusValue, timestamp);
    
    // Record check duration if available
    if (healthStatus.checkDuration) {
      await this.recordMetric('health.check_duration', healthStatus.checkDuration, timestamp);
    }
    
    // Record uptime
    await this.recordMetric('system.uptime', healthStatus.uptime, timestamp);
    
    // Record individual check results
    for (const check of healthStatus.checks) {
      const checkStatusValue = this.healthStatusToNumeric(check.status);
      await this.recordMetric(`health.check.${check.name}`, checkStatusValue, timestamp);
      
      if (check.responseTime) {
        await this.recordMetric(`health.check.${check.name}.response_time`, check.responseTime, timestamp);
      }
    }
  }

  async recordPerformanceMetrics(metrics: MonitoringMetrics): Promise<void> {
    const timestamp = metrics.timestamp;
    
    // System metrics
    if (metrics.system) {
      if (metrics.system.memory) {
        await this.recordMetric('system.memory.heap_used', metrics.system.memory.heapUsed, timestamp);
        await this.recordMetric('system.memory.heap_total', metrics.system.memory.heapTotal, timestamp);
        await this.recordMetric('system.memory.rss', metrics.system.memory.rss, timestamp);
      }
      
      if (metrics.system.cpu) {
        await this.recordMetric('system.cpu.usage', metrics.system.cpu.usage, timestamp);
      }
      
      if (metrics.system.uptime) {
        await this.recordMetric('system.uptime', metrics.system.uptime, timestamp);
      }
    }
    
    // Delivery metrics
    if (metrics.delivery) {
      await this.recordMetric('delivery.total_orders', metrics.delivery.totalOrders, timestamp);
      await this.recordMetric('delivery.successful_orders', metrics.delivery.successfulOrders, timestamp);
      await this.recordMetric('delivery.failed_orders', metrics.delivery.failedOrders, timestamp);
      await this.recordMetric('delivery.error_rate', metrics.delivery.errorRate, timestamp);
      await this.recordMetric('delivery.order_rate', metrics.delivery.orderRate, timestamp);
      await this.recordMetric('delivery.average_delivery_time', metrics.delivery.averageDeliveryTime, timestamp);
    }
    
    // Provider metrics
    if (metrics.providers) {
      for (const provider of metrics.providers) {
        await this.recordMetric(`provider.${provider.name}.success_rate`, provider.successRate, timestamp);
        await this.recordMetric(`provider.${provider.name}.response_time`, provider.averageResponseTime, timestamp);
        await this.recordMetric(`provider.${provider.name}.total_orders`, provider.totalOrders, timestamp);
      }
    }
  }

  async recordMetric(metricName: string, value: number, timestamp: Date = new Date(), tags?: Record<string, string>): Promise<void> {
    let timeSeriesData = this.metrics.get(metricName);
    
    if (!timeSeriesData) {
      // Create new metric if it doesn't exist
      timeSeriesData = {
        metricName,
        dataPoints: [],
        lastUpdated: timestamp,
        aggregations: {
          avg: 0,
          min: value,
          max: value,
          sum: 0,
          count: 0
        }
      };
      this.metrics.set(metricName, timeSeriesData);
    }
    
    // Add new data point
    const dataPoint: MetricDataPoint = {
      timestamp,
      value,
      tags
    };
    
    timeSeriesData.dataPoints.push(dataPoint);
    timeSeriesData.lastUpdated = timestamp;
    
    // Maintain max data points limit
    if (timeSeriesData.dataPoints.length > this.maxDataPoints) {
      timeSeriesData.dataPoints = timeSeriesData.dataPoints.slice(-this.maxDataPoints);
    }
    
    // Update aggregations
    this.updateAggregations(timeSeriesData);
  }

  private updateAggregations(timeSeriesData: TimeSeriesData): void {
    const values = timeSeriesData.dataPoints.map(dp => dp.value);
    
    if (values.length === 0) {
      return;
    }
    
    timeSeriesData.aggregations = {
      avg: values.reduce((sum, val) => sum + val, 0) / values.length,
      min: Math.min(...values),
      max: Math.max(...values),
      sum: values.reduce((sum, val) => sum + val, 0),
      count: values.length
    };
  }

  async getMetric(metricName: string, timeRange?: { start: Date; end: Date }): Promise<TimeSeriesData | null> {
    const metric = this.metrics.get(metricName);
    
    if (!metric) {
      return null;
    }
    
    if (!timeRange) {
      return metric;
    }
    
    // Filter data points by time range
    const filteredDataPoints = metric.dataPoints.filter(dp => 
      dp.timestamp >= timeRange.start && dp.timestamp <= timeRange.end
    );
    
    const filteredMetric: TimeSeriesData = {
      ...metric,
      dataPoints: filteredDataPoints
    };
    
    // Recalculate aggregations for filtered data
    this.updateAggregations(filteredMetric);
    
    return filteredMetric;
  }

  async getMultipleMetrics(metricNames: string[], timeRange?: { start: Date; end: Date }): Promise<Map<string, TimeSeriesData>> {
    const results = new Map<string, TimeSeriesData>();
    
    for (const metricName of metricNames) {
      const metric = await this.getMetric(metricName, timeRange);
      if (metric) {
        results.set(metricName, metric);
      }
    }
    
    return results;
  }

  async getMetricsByPattern(pattern: string, timeRange?: { start: Date; end: Date }): Promise<Map<string, TimeSeriesData>> {
    const regex = new RegExp(pattern.replace('*', '.*'));
    const matchingMetricNames = Array.from(this.metrics.keys()).filter(name => regex.test(name));
    
    return await this.getMultipleMetrics(matchingMetricNames, timeRange);
  }

  async getSystemOverview(): Promise<{
    totalMetrics: number;
    dataPointsCount: number;
    oldestDataPoint: Date | null;
    newestDataPoint: Date | null;
    memoryUsage: number;
  }> {
    let totalDataPoints = 0;
    let oldestTimestamp: Date | null = null;
    let newestTimestamp: Date | null = null;
    
    for (const metric of this.metrics.values()) {
      totalDataPoints += metric.dataPoints.length;
      
      if (metric.dataPoints.length > 0) {
        const metricOldest = metric.dataPoints[0].timestamp;
        const metricNewest = metric.dataPoints[metric.dataPoints.length - 1].timestamp;
        
        if (!oldestTimestamp || metricOldest < oldestTimestamp) {
          oldestTimestamp = metricOldest;
        }
        
        if (!newestTimestamp || metricNewest > newestTimestamp) {
          newestTimestamp = metricNewest;
        }
      }
    }
    
    // Estimate memory usage
    const avgBytesPerDataPoint = 100; // Rough estimate
    const memoryUsage = totalDataPoints * avgBytesPerDataPoint;
    
    return {
      totalMetrics: this.metrics.size,
      dataPointsCount: totalDataPoints,
      oldestDataPoint: oldestTimestamp,
      newestDataPoint: newestTimestamp,
      memoryUsage
    };
  }

  async calculateMovingAverage(metricName: string, windowSize: number, timeRange?: { start: Date; end: Date }): Promise<MetricDataPoint[]> {
    const metric = await this.getMetric(metricName, timeRange);
    
    if (!metric || metric.dataPoints.length < windowSize) {
      return [];
    }
    
    const movingAverages: MetricDataPoint[] = [];
    
    for (let i = windowSize - 1; i < metric.dataPoints.length; i++) {
      const windowData = metric.dataPoints.slice(i - windowSize + 1, i + 1);
      const average = windowData.reduce((sum, dp) => sum + dp.value, 0) / windowSize;
      
      movingAverages.push({
        timestamp: metric.dataPoints[i].timestamp,
        value: average
      });
    }
    
    return movingAverages;
  }

  async detectAnomalies(metricName: string, threshold: number = 2): Promise<MetricDataPoint[]> {
    const metric = await this.getMetric(metricName);
    
    if (!metric || metric.dataPoints.length < 10) {
      return [];
    }
    
    const values = metric.dataPoints.map(dp => dp.value);
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    const standardDeviation = Math.sqrt(variance);
    
    const upperBound = mean + (threshold * standardDeviation);
    const lowerBound = mean - (threshold * standardDeviation);
    
    return metric.dataPoints.filter(dp => 
      dp.value > upperBound || dp.value < lowerBound
    );
  }

  async getMetricTrend(metricName: string, timeRange?: { start: Date; end: Date }): Promise<{
    trend: 'increasing' | 'decreasing' | 'stable';
    slope: number;
    correlation: number;
  } | null> {
    const metric = await this.getMetric(metricName, timeRange);
    
    if (!metric || metric.dataPoints.length < 3) {
      return null;
    }
    
    const dataPoints = metric.dataPoints;
    const n = dataPoints.length;
    
    // Convert timestamps to numeric values (milliseconds since epoch)
    const x = dataPoints.map(dp => dp.timestamp.getTime());
    const y = dataPoints.map(dp => dp.value);
    
    // Calculate linear regression
    const sumX = x.reduce((sum, val) => sum + val, 0);
    const sumY = y.reduce((sum, val) => sum + val, 0);
    const sumXY = x.reduce((sum, val, i) => sum + (val * y[i]), 0);
    const sumXX = x.reduce((sum, val) => sum + (val * val), 0);
    const sumYY = y.reduce((sum, val) => sum + (val * val), 0);
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    
    // Calculate correlation coefficient
    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt((n * sumXX - sumX * sumX) * (n * sumYY - sumY * sumY));
    const correlation = numerator / denominator;
    
    let trend: 'increasing' | 'decreasing' | 'stable';
    if (Math.abs(slope) < 1e-6) {
      trend = 'stable';
    } else if (slope > 0) {
      trend = 'increasing';
    } else {
      trend = 'decreasing';
    }
    
    return { trend, slope, correlation };
  }

  private cleanupOldMetrics(): void {
    const cutoffTime = new Date(Date.now() - this.retentionPeriod);
    
    for (const metric of this.metrics.values()) {
      metric.dataPoints = metric.dataPoints.filter(dp => dp.timestamp > cutoffTime);
      
      // Update aggregations after cleanup
      this.updateAggregations(metric);
    }
  }

  private healthStatusToNumeric(status: string): number {
    switch (status) {
      case 'healthy': return 1;
      case 'degraded': return 0.5;
      case 'unhealthy': return 0.2;
      case 'critical': return 0;
      default: return -1;
    }
  }

  // Export/Import functionality for backup and analysis
  async exportMetrics(metricNames?: string[]): Promise<any> {
    const metricsToExport = metricNames ? 
      metricNames.filter(name => this.metrics.has(name)) :
      Array.from(this.metrics.keys());
    
    const exportData = {
      timestamp: new Date().toISOString(),
      metrics: {}
    };
    
    for (const metricName of metricsToExport) {
      const metric = this.metrics.get(metricName);
      if (metric) {
        exportData.metrics[metricName] = {
          dataPoints: metric.dataPoints,
          aggregations: metric.aggregations,
          lastUpdated: metric.lastUpdated.toISOString()
        };
      }
    }
    
    return exportData;
  }

  async importMetrics(importData: any): Promise<void> {
    if (!importData.metrics) {
      throw new Error('Invalid import data format');
    }
    
    for (const [metricName, metricData] of Object.entries(importData.metrics)) {
      const timeSeriesData: TimeSeriesData = {
        metricName,
        dataPoints: (metricData as any).dataPoints.map((dp: any) => ({
          ...dp,
          timestamp: new Date(dp.timestamp)
        })),
        lastUpdated: new Date((metricData as any).lastUpdated),
        aggregations: (metricData as any).aggregations
      };
      
      this.metrics.set(metricName, timeSeriesData);
    }
  }

  // Reset all metrics (useful for testing)
  async clearAllMetrics(): Promise<void> {
    for (const metric of this.metrics.values()) {
      metric.dataPoints = [];
      metric.aggregations = {
        avg: 0,
        min: 0,
        max: 0,
        sum: 0,
        count: 0
      };
    }
  }

  // Get list of all available metrics
  getAvailableMetrics(): string[] {
    return Array.from(this.metrics.keys());
  }
}