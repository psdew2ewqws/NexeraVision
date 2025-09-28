import { Injectable, Logger } from '@nestjs/common';
import { Cache } from 'cache-manager';
import { Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Provider } from '@prisma/client';

import { OrderAnalyticsService } from '../orders/order-analytics.service';
import { PrismaService } from '../../shared/services/prisma.service';
import { OrderEvents } from '../orders/order-events.enum';
import {
  BaseAnalyticsQueryDto,
  MetricType,
  TimePeriod,
  parseDateRange,
  validateTimeRange,
  calculateComparisonPeriod,
} from './dto/analytics-query.dto';

export interface DashboardMetrics {
  summary: {
    totalOrders: number;
    totalRevenue: number;
    averageOrderValue: number;
    activeOrders: number;
    completionRate: number;
  };
  trends: {
    orderGrowth: number;
    revenueGrowth: number;
    aovGrowth: number;
  };
  providers: Array<{
    provider: Provider;
    orders: number;
    revenue: number;
    growth: number;
  }>;
  realtimeData: {
    ordersLastHour: number;
    revenueLastHour: number;
    averageProcessingTime: number;
    errorRate: number;
  };
}

export interface AnalyticsAlert {
  id: string;
  metric: MetricType;
  threshold: number;
  currentValue: number;
  condition: 'above' | 'below';
  provider?: Provider;
  clientId?: string;
  triggeredAt: Date;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
}

export interface MetricSnapshot {
  timestamp: Date;
  metric: MetricType;
  value: number;
  provider?: Provider;
  clientId?: string;
  metadata?: any;
}

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  private readonly REALTIME_CACHE_TTL = 30 * 1000; // 30 seconds
  private metricSnapshots = new Map<string, MetricSnapshot[]>();
  private activeAlerts = new Map<string, AnalyticsAlert>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly orderAnalyticsService: OrderAnalyticsService,
    private readonly eventEmitter: EventEmitter2,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {
    this.setupMetricTracking();
  }

  /**
   * Get comprehensive dashboard metrics
   */
  async getDashboardMetrics(
    query: BaseAnalyticsQueryDto = {},
  ): Promise<DashboardMetrics> {
    const cacheKey = `dashboard_metrics_${JSON.stringify(query)}`;

    try {
      const cached = await this.cacheManager.get<DashboardMetrics>(cacheKey);
      if (cached) {
        this.logger.debug(`Cache hit for dashboard metrics`);
        return cached;
      }

      const { start: startDate, end: endDate } = parseDateRange(query.startDate, query.endDate);
      if (startDate && endDate) {
        validateTimeRange(startDate, endDate);
      }

      // Get current period metrics
      const [
        totalOrders,
        totalRevenue,
        averageOrderValue,
        activeOrders,
        completionRate,
        providerPerformance,
        realtimeMetrics,
      ] = await Promise.all([
        this.getTotalOrders(query.provider, startDate, endDate),
        this.getTotalRevenue(query.provider, startDate, endDate, query.currency),
        this.orderAnalyticsService.getAverageOrderValue(query.provider, startDate, endDate),
        this.getActiveOrdersCount(query.provider),
        this.orderAnalyticsService.getCompletionRates(query.provider, startDate, endDate),
        this.getProviderSummary(startDate, endDate),
        this.getRealtimeMetrics(),
      ]);

      // Calculate growth trends (compare with previous period)
      const trends = await this.calculateGrowthTrends(query, {
        totalOrders,
        totalRevenue,
        averageOrderValue,
      });

      const result: DashboardMetrics = {
        summary: {
          totalOrders,
          totalRevenue,
          averageOrderValue,
          activeOrders,
          completionRate,
        },
        trends,
        providers: providerPerformance,
        realtimeData: realtimeMetrics,
      };

      await this.cacheManager.set(cacheKey, result, this.CACHE_TTL);
      this.logger.log(`Dashboard metrics calculated: ${totalOrders} orders, ${totalRevenue} revenue`);

      return result;
    } catch (error) {
      this.logger.error(`Failed to get dashboard metrics: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Get multi-metric analytics data
   */
  async getMultiMetricAnalytics(
    metrics: MetricType[],
    query: BaseAnalyticsQueryDto = {},
    includeDetails: boolean = false,
  ): Promise<any> {
    const cacheKey = `multi_metrics_${metrics.join('_')}_${JSON.stringify(query)}_${includeDetails}`;

    try {
      const cached = await this.cacheManager.get(cacheKey);
      if (cached) return cached;

      const { start: startDate, end: endDate } = parseDateRange(query.startDate, query.endDate);
      if (startDate && endDate) {
        validateTimeRange(startDate, endDate);
      }

      const results: any = {
        timestamp: new Date(),
        period: {
          start: startDate,
          end: endDate,
        },
        provider: query.provider,
        clientId: query.clientId,
        metrics: {},
      };

      // Process each requested metric
      for (const metric of metrics) {
        try {
          results.metrics[metric] = await this.getMetricData(metric, query, includeDetails);
        } catch (error) {
          this.logger.warn(`Failed to get metric ${metric}: ${error.message}`);
          results.metrics[metric] = { error: error.message };
        }
      }

      await this.cacheManager.set(cacheKey, results, this.CACHE_TTL);
      this.logger.log(`Multi-metric analytics calculated for ${metrics.length} metrics`);

      return results;
    } catch (error) {
      this.logger.error(`Failed to get multi-metric analytics: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Get real-time metrics for the last specified time window
   */
  async getRealtimeMetrics(timeWindowMinutes: number = 60): Promise<any> {
    const cacheKey = `realtime_metrics_${timeWindowMinutes}`;

    try {
      const cached = await this.cacheManager.get(cacheKey);
      if (cached) return cached;

      const now = new Date();
      const startTime = new Date(now.getTime() - timeWindowMinutes * 60 * 1000);

      const [
        ordersLastPeriod,
        revenueLastPeriod,
        activeOrders,
        errorRate,
        averageProcessingTime,
      ] = await Promise.all([
        this.getOrderCountInTimeWindow(startTime, now),
        this.getRevenueInTimeWindow(startTime, now),
        this.getActiveOrdersCount(),
        this.getErrorRate(timeWindowMinutes),
        this.getAverageProcessingTime(timeWindowMinutes),
      ]);

      const result = {
        timestamp: now,
        timeWindowMinutes,
        ordersLastHour: ordersLastPeriod,
        revenueLastHour: revenueLastPeriod,
        activeOrders,
        averageProcessingTime,
        errorRate,
      };

      await this.cacheManager.set(cacheKey, result, this.REALTIME_CACHE_TTL);

      return result;
    } catch (error) {
      this.logger.error(`Failed to get realtime metrics: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Compare metrics between two time periods
   */
  async compareMetrics(
    metrics: MetricType[],
    currentPeriod: { start: Date; end: Date },
    comparisonPeriod: { start: Date; end: Date },
    provider?: Provider,
  ): Promise<any> {
    const cacheKey = `comparison_${metrics.join('_')}_${currentPeriod.start.getTime()}_${comparisonPeriod.start.getTime()}_${provider}`;

    try {
      const cached = await this.cacheManager.get(cacheKey);
      if (cached) return cached;

      validateTimeRange(currentPeriod.start, currentPeriod.end);
      validateTimeRange(comparisonPeriod.start, comparisonPeriod.end);

      const currentQuery = {
        startDate: currentPeriod.start.toISOString(),
        endDate: currentPeriod.end.toISOString(),
        provider,
      };

      const comparisonQuery = {
        startDate: comparisonPeriod.start.toISOString(),
        endDate: comparisonPeriod.end.toISOString(),
        provider,
      };

      const [currentMetrics, comparisonMetrics] = await Promise.all([
        this.getMultiMetricAnalytics(metrics, currentQuery),
        this.getMultiMetricAnalytics(metrics, comparisonQuery),
      ]);

      const comparison = {
        current: currentMetrics,
        comparison: comparisonMetrics,
        changes: this.calculateMetricChanges(currentMetrics.metrics, comparisonMetrics.metrics),
        timestamp: new Date(),
      };

      await this.cacheManager.set(cacheKey, comparison, this.CACHE_TTL);
      this.logger.log(`Metric comparison calculated for ${metrics.length} metrics`);

      return comparison;
    } catch (error) {
      this.logger.error(`Failed to compare metrics: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Set up and manage metric-based alerts
   */
  async setupAlert(
    metric: MetricType,
    threshold: number,
    condition: 'above' | 'below',
    options: {
      provider?: Provider;
      clientId?: string;
      timeWindowMinutes?: number;
    } = {},
  ): Promise<string> {
    const alertId = `${metric}_${threshold}_${condition}_${options.provider || 'all'}_${options.clientId || 'all'}`;

    const alert: AnalyticsAlert = {
      id: alertId,
      metric,
      threshold,
      currentValue: 0,
      condition,
      provider: options.provider,
      clientId: options.clientId,
      triggeredAt: new Date(),
      severity: this.calculateAlertSeverity(metric, threshold),
      message: `${metric} is ${condition} ${threshold}`,
    };

    this.activeAlerts.set(alertId, alert);
    this.logger.log(`Alert set up: ${alertId}`);

    return alertId;
  }

  /**
   * Get active alerts
   */
  getActiveAlerts(): AnalyticsAlert[] {
    return Array.from(this.activeAlerts.values());
  }

  /**
   * Clear analytics cache with optional pattern matching
   */
  async clearCache(pattern?: string): Promise<void> {
    try {
      if (pattern) {
        // In a real implementation, you'd use Redis with pattern-based deletion
        this.logger.log(`Cache pattern clearing not fully implemented for: ${pattern}`);
      } else {
        await this.cacheManager.reset();
        this.logger.log('Analytics cache cleared successfully');
      }
    } catch (error) {
      this.logger.error(`Failed to clear cache: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Track metric snapshots for trend analysis
   */
  trackMetricSnapshot(metric: MetricType, value: number, metadata?: any): void {
    const snapshot: MetricSnapshot = {
      timestamp: new Date(),
      metric,
      value,
      metadata,
    };

    const key = `${metric}_${metadata?.provider || 'all'}`;
    if (!this.metricSnapshots.has(key)) {
      this.metricSnapshots.set(key, []);
    }

    const snapshots = this.metricSnapshots.get(key)!;
    snapshots.push(snapshot);

    // Keep only last 1000 snapshots
    if (snapshots.length > 1000) {
      snapshots.splice(0, snapshots.length - 1000);
    }

    // Emit event for real-time updates
    this.eventEmitter.emit(OrderEvents.ANALYTICS_METRICS_REFRESHED, {
      eventType: OrderEvents.ANALYTICS_METRICS_REFRESHED,
      timestamp: new Date(),
      data: {
        metric,
        value,
        metadata,
      },
    });
  }

  // =========================
  // PRIVATE HELPER METHODS
  // =========================

  private async getMetricData(
    metric: MetricType,
    query: BaseAnalyticsQueryDto,
    includeDetails: boolean,
  ): Promise<any> {
    const { start: startDate, end: endDate } = parseDateRange(query.startDate, query.endDate);

    switch (metric) {
      case MetricType.ORDER_VOLUME:
        return this.orderAnalyticsService.getOrderVolumeByProvider(
          query.provider,
          startDate,
          endDate,
          query.period as any,
        );

      case MetricType.REVENUE:
        return this.orderAnalyticsService.getRevenueMetrics(startDate, endDate, query.currency);

      case MetricType.AOV:
        return this.orderAnalyticsService.getAverageOrderValue(query.provider, startDate, endDate);

      case MetricType.COMPLETION_RATE:
        return this.orderAnalyticsService.getCompletionRates(query.provider, startDate, endDate);

      case MetricType.PROVIDER_PERFORMANCE:
        if (!query.provider) {
          throw new Error('Provider required for provider performance metrics');
        }
        return this.orderAnalyticsService.getProviderPerformance(query.provider, startDate, endDate);

      case MetricType.CUSTOMER_BEHAVIOR:
        return this.orderAnalyticsService.getCustomerBehaviorMetrics(query.provider, startDate, endDate);

      case MetricType.GEOGRAPHIC_DISTRIBUTION:
        return this.orderAnalyticsService.getGeographicDistribution(query.provider, startDate, endDate);

      case MetricType.PEAK_TIMES:
        return this.orderAnalyticsService.getPeakOrderTimes(query.provider, startDate, endDate);

      default:
        throw new Error(`Unsupported metric type: ${metric}`);
    }
  }

  private async getTotalOrders(provider?: Provider, startDate?: Date, endDate?: Date): Promise<number> {
    const whereClause: any = {};
    if (provider) whereClause.provider = provider;
    if (startDate && endDate) {
      whereClause.createdAt = { gte: startDate, lte: endDate };
    }

    return this.prisma.order.count({ where: whereClause });
  }

  private async getTotalRevenue(
    provider?: Provider,
    startDate?: Date,
    endDate?: Date,
    currency: string = 'USD',
  ): Promise<number> {
    const whereClause: any = {
      paymentStatus: 'PAID',
      currency,
    };
    if (provider) whereClause.provider = provider;
    if (startDate && endDate) {
      whereClause.createdAt = { gte: startDate, lte: endDate };
    }

    const result = await this.prisma.order.aggregate({
      where: whereClause,
      _sum: { totalAmount: true },
    });

    return result._sum.totalAmount || 0;
  }

  private async getActiveOrdersCount(provider?: Provider): Promise<number> {
    const whereClause: any = {
      status: { in: ['CONFIRMED', 'PREPARING', 'READY', 'PICKED_UP', 'IN_DELIVERY'] },
    };
    if (provider) whereClause.provider = provider;

    return this.prisma.order.count({ where: whereClause });
  }

  private async getProviderSummary(startDate?: Date, endDate?: Date): Promise<any[]> {
    const whereClause: any = {};
    if (startDate && endDate) {
      whereClause.createdAt = { gte: startDate, lte: endDate };
    }

    const providerData = await this.prisma.order.groupBy({
      by: ['provider'],
      where: whereClause,
      _count: { id: true },
      _sum: { totalAmount: true },
    });

    return providerData.map(provider => ({
      provider: provider.provider,
      orders: provider._count.id,
      revenue: provider._sum.totalAmount || 0,
      growth: 0, // Calculate in separate method
    }));
  }

  private async getOrderCountInTimeWindow(startTime: Date, endTime: Date): Promise<number> {
    return this.prisma.order.count({
      where: {
        createdAt: {
          gte: startTime,
          lte: endTime,
        },
      },
    });
  }

  private async getRevenueInTimeWindow(startTime: Date, endTime: Date): Promise<number> {
    const result = await this.prisma.order.aggregate({
      where: {
        createdAt: {
          gte: startTime,
          lte: endTime,
        },
        paymentStatus: 'PAID',
      },
      _sum: { totalAmount: true },
    });

    return result._sum.totalAmount || 0;
  }

  private async getErrorRate(timeWindowMinutes: number): Promise<number> {
    // Calculate based on webhook logs or order failures
    const now = new Date();
    const startTime = new Date(now.getTime() - timeWindowMinutes * 60 * 1000);

    const [totalRequests, failedRequests] = await Promise.all([
      this.prisma.webhookLog.count({
        where: {
          createdAt: { gte: startTime, lte: now },
        },
      }),
      this.prisma.webhookLog.count({
        where: {
          createdAt: { gte: startTime, lte: now },
          status: 'FAILED',
        },
      }),
    ]);

    return totalRequests > 0 ? (failedRequests / totalRequests) * 100 : 0;
  }

  private async getAverageProcessingTime(timeWindowMinutes: number): Promise<number> {
    // Calculate based on webhook response times
    const now = new Date();
    const startTime = new Date(now.getTime() - timeWindowMinutes * 60 * 1000);

    const result = await this.prisma.webhookLog.aggregate({
      where: {
        createdAt: { gte: startTime, lte: now },
        responseTime: { not: null },
      },
      _avg: { responseTime: true },
    });

    return result._avg.responseTime || 0;
  }

  private async calculateGrowthTrends(
    query: BaseAnalyticsQueryDto,
    currentMetrics: { totalOrders: number; totalRevenue: number; averageOrderValue: number },
  ): Promise<any> {
    const { start: startDate, end: endDate } = parseDateRange(query.startDate, query.endDate);

    if (!startDate || !endDate) {
      return { orderGrowth: 0, revenueGrowth: 0, aovGrowth: 0 };
    }

    const { comparisonStart, comparisonEnd } = calculateComparisonPeriod(startDate, endDate);

    const [previousOrders, previousRevenue, previousAOV] = await Promise.all([
      this.getTotalOrders(query.provider, comparisonStart, comparisonEnd),
      this.getTotalRevenue(query.provider, comparisonStart, comparisonEnd, query.currency),
      this.orderAnalyticsService.getAverageOrderValue(query.provider, comparisonStart, comparisonEnd),
    ]);

    return {
      orderGrowth: this.calculatePercentageChange(previousOrders, currentMetrics.totalOrders),
      revenueGrowth: this.calculatePercentageChange(previousRevenue, currentMetrics.totalRevenue),
      aovGrowth: this.calculatePercentageChange(previousAOV, currentMetrics.averageOrderValue),
    };
  }

  private calculatePercentageChange(oldValue: number, newValue: number): number {
    if (oldValue === 0) return newValue > 0 ? 100 : 0;
    return ((newValue - oldValue) / oldValue) * 100;
  }

  private calculateMetricChanges(currentMetrics: any, comparisonMetrics: any): any {
    const changes: any = {};

    for (const [metric, currentData] of Object.entries(currentMetrics)) {
      const comparisonData = comparisonMetrics[metric];

      if (comparisonData && !currentData.error && !comparisonData.error) {
        changes[metric] = this.calculateChangeForMetric(currentData, comparisonData);
      }
    }

    return changes;
  }

  private calculateChangeForMetric(current: any, comparison: any): any {
    // This is a simplified implementation - in practice, you'd need to handle
    // different metric structures differently
    if (typeof current === 'number' && typeof comparison === 'number') {
      return {
        absolute: current - comparison,
        percentage: this.calculatePercentageChange(comparison, current),
      };
    }

    return { message: 'Complex metric comparison not implemented' };
  }

  private calculateAlertSeverity(metric: MetricType, threshold: number): 'low' | 'medium' | 'high' | 'critical' {
    // Simplified severity calculation - in practice, this would be more sophisticated
    switch (metric) {
      case MetricType.ORDER_VOLUME:
        return threshold > 1000 ? 'critical' : threshold > 100 ? 'high' : 'medium';
      case MetricType.REVENUE:
        return threshold > 10000 ? 'critical' : threshold > 1000 ? 'high' : 'medium';
      default:
        return 'medium';
    }
  }

  private setupMetricTracking(): void {
    // Set up event listeners for automatic metric tracking
    this.eventEmitter.on(OrderEvents.ORDER_CREATED, (event) => {
      this.trackMetricSnapshot(MetricType.ORDER_VOLUME, 1, { provider: event.provider });
    });

    this.eventEmitter.on(OrderEvents.PAYMENT_COMPLETED, (event) => {
      this.trackMetricSnapshot(MetricType.REVENUE, event.paymentData?.amount || 0, {
        provider: event.provider,
      });
    });
  }

  /**
   * Scheduled method to refresh analytics cache
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async refreshAnalyticsCache(): Promise<void> {
    try {
      this.logger.debug('Refreshing analytics cache...');

      // Refresh dashboard metrics for common scenarios
      const commonQueries = [
        {}, // All data
        { period: TimePeriod.DAY },
        { period: TimePeriod.HOUR },
      ];

      for (const query of commonQueries) {
        await this.getDashboardMetrics(query);
      }

      this.logger.debug('Analytics cache refreshed successfully');
    } catch (error) {
      this.logger.error(`Failed to refresh analytics cache: ${error.message}`, error.stack);
    }
  }

  /**
   * Scheduled method to check alerts
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async checkAlerts(): Promise<void> {
    try {
      for (const alert of this.activeAlerts.values()) {
        await this.evaluateAlert(alert);
      }
    } catch (error) {
      this.logger.error(`Failed to check alerts: ${error.message}`, error.stack);
    }
  }

  private async evaluateAlert(alert: AnalyticsAlert): Promise<void> {
    try {
      const currentValue = await this.getMetricCurrentValue(alert);
      const shouldTrigger = alert.condition === 'above'
        ? currentValue > alert.threshold
        : currentValue < alert.threshold;

      if (shouldTrigger) {
        alert.currentValue = currentValue;
        alert.triggeredAt = new Date();

        this.eventEmitter.emit('analytics.alert.triggered', alert);
        this.logger.warn(`Alert triggered: ${alert.id} (${currentValue} ${alert.condition} ${alert.threshold})`);
      }
    } catch (error) {
      this.logger.error(`Failed to evaluate alert ${alert.id}: ${error.message}`);
    }
  }

  private async getMetricCurrentValue(alert: AnalyticsAlert): Promise<number> {
    const query = {
      provider: alert.provider,
      clientId: alert.clientId,
    };

    const metricData = await this.getMetricData(alert.metric, query, false);

    // Extract numeric value from metric data (simplified)
    if (typeof metricData === 'number') {
      return metricData;
    }

    if (metricData && typeof metricData === 'object') {
      return metricData.value || metricData.totalOrders || metricData.totalRevenue || 0;
    }

    return 0;
  }
}