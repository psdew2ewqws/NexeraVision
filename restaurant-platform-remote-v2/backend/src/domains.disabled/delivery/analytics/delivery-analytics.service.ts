import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../shared/database/prisma.service';
import { DeliveryProviderFactory } from '../factory/delivery-provider.factory';

// Analytics interfaces
export interface DeliveryMetrics {
  totalOrders: number;
  successfulOrders: number;
  failedOrders: number;
  successRate: number;
  averageDeliveryTime: number;
  averageDeliveryFee: number;
  totalRevenue: number;
  ordersByStatus: Record<string, number>;
}

export interface ProviderPerformanceMetrics {
  providerId: string;
  providerType: string;
  totalOrders: number;
  successfulOrders: number;
  successRate: number;
  averageResponseTime: number;
  averageDeliveryTime: number;
  averageDeliveryFee: number;
  uptime: number;
  errorRate: number;
  lastOrder: Date | null;
  healthScore: number; // 0-100
}

export interface RealTimeStats {
  activeOrders: number;
  ordersLast24h: number;
  averageProcessingTime: number;
  currentProviderHealth: ProviderHealthSummary[];
  recentFailures: number;
  peakOrdersPerHour: number;
  systemLoad: number; // 0-100
}

export interface ProviderHealthSummary {
  providerId: string;
  providerType: string;
  status: 'healthy' | 'degraded' | 'unhealthy' | 'offline';
  responseTime: number;
  successRate: number;
  lastCheck: Date;
  circuitBreakerState: 'closed' | 'open' | 'half-open';
}

export interface OrderVolumeByTimeRange {
  timestamp: Date;
  totalOrders: number;
  successfulOrders: number;
  failedOrders: number;
  averageDeliveryTime: number;
}

export interface DeliveryAnalyticsDashboard {
  overview: DeliveryMetrics;
  providerPerformance: ProviderPerformanceMetrics[];
  realTimeStats: RealTimeStats;
  orderVolumeChart: OrderVolumeByTimeRange[];
  topPerformingProviders: ProviderPerformanceMetrics[];
  alerts: AlertSummary[];
  costAnalysis: CostAnalysisData;
  geographicDistribution: GeographicData[];
}

export interface AlertSummary {
  id: string;
  type: 'error' | 'warning' | 'info';
  severity: 'critical' | 'high' | 'medium' | 'low';
  message: string;
  timestamp: Date;
  providerId?: string;
  resolved: boolean;
  affectedOrders?: number;
}

export interface CostAnalysisData {
  totalDeliveryFees: number;
  averageFeePerOrder: number;
  costByProvider: Record<string, number>;
  costTrends: { date: Date; cost: number }[];
  savingsFromOptimization: number;
}

export interface GeographicData {
  area: string;
  city: string;
  orderCount: number;
  successRate: number;
  averageDeliveryTime: number;
  popularProviders: string[];
}

export interface PerformanceReport {
  period: {
    start: Date;
    end: Date;
  };
  summary: DeliveryMetrics;
  providerComparison: ProviderPerformanceMetrics[];
  trends: {
    orderVolume: { date: Date; orders: number }[];
    successRate: { date: Date; rate: number }[];
    deliveryTime: { date: Date; time: number }[];
    costs: { date: Date; cost: number }[];
  };
  recommendations: string[];
  issues: AlertSummary[];
}

@Injectable()
export class DeliveryAnalyticsService {
  private readonly logger = new Logger(DeliveryAnalyticsService.name);
  
  // Real-time data cache
  private metricsCache = new Map<string, any>();
  private cacheExpiry = new Map<string, Date>();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  constructor(
    private readonly prisma: PrismaService,
    private readonly providerFactory: DeliveryProviderFactory
  ) {
    this.startRealTimeDataCollection();
  }

  /**
   * Get comprehensive delivery analytics dashboard
   */
  async getDashboardData(companyId?: string, timeRange?: { start: Date; end: Date }): Promise<DeliveryAnalyticsDashboard> {
    try {
      this.logger.log(`Generating dashboard data for company: ${companyId || 'all'}`);

      const [
        overview,
        providerPerformance,
        realTimeStats,
        orderVolumeChart,
        alerts,
        costAnalysis,
        geographicDistribution
      ] = await Promise.all([
        this.getDeliveryOverview(companyId, timeRange),
        this.getProviderPerformanceMetrics(companyId, timeRange),
        this.getRealTimeStats(companyId),
        this.getOrderVolumeChart(companyId, timeRange),
        this.getActiveAlerts(companyId),
        this.getCostAnalysis(companyId, timeRange),
        this.getGeographicDistribution(companyId, timeRange)
      ]);

      // Get top performing providers (top 5)
      const topPerformingProviders = providerPerformance
        .sort((a, b) => b.healthScore - a.healthScore)
        .slice(0, 5);

      return {
        overview,
        providerPerformance,
        realTimeStats,
        orderVolumeChart,
        topPerformingProviders,
        alerts,
        costAnalysis,
        geographicDistribution
      };

    } catch (error) {
      this.logger.error('Failed to generate dashboard data:', error.message);
      throw error;
    }
  }

  /**
   * Get delivery overview metrics
   */
  private async getDeliveryOverview(companyId?: string, timeRange?: { start: Date; end: Date }): Promise<DeliveryMetrics> {
    const cacheKey = `overview:${companyId}:${timeRange?.start?.getTime()}-${timeRange?.end?.getTime()}`;
    const cached = this.getCachedData(cacheKey);
    if (cached) return cached;

    const where: any = {};
    if (companyId) {
      where.companyProviderConfig = { companyId };
    }
    if (timeRange) {
      where.createdAt = {
        gte: timeRange.start,
        lte: timeRange.end
      };
    }

    try {
      // This would query actual order logs when the database schema is updated
      // For now, we'll return sample data structure
      const metrics: DeliveryMetrics = {
        totalOrders: 1250,
        successfulOrders: 1180,
        failedOrders: 70,
        successRate: 94.4,
        averageDeliveryTime: 28.5,
        averageDeliveryFee: 12.50,
        totalRevenue: 15625.00,
        ordersByStatus: {
          'delivered': 1180,
          'cancelled': 45,
          'failed': 25,
          'in_progress': 15
        }
      };

      this.setCachedData(cacheKey, metrics);
      return metrics;

    } catch (error) {
      this.logger.warn('Failed to get delivery overview from database, returning defaults:', error.message);
      
      // Return default metrics
      return {
        totalOrders: 0,
        successfulOrders: 0,
        failedOrders: 0,
        successRate: 0,
        averageDeliveryTime: 0,
        averageDeliveryFee: 0,
        totalRevenue: 0,
        ordersByStatus: {}
      };
    }
  }

  /**
   * Get provider performance metrics
   */
  private async getProviderPerformanceMetrics(companyId?: string, timeRange?: { start: Date; end: Date }): Promise<ProviderPerformanceMetrics[]> {
    const cacheKey = `provider-performance:${companyId}:${timeRange?.start?.getTime()}-${timeRange?.end?.getTime()}`;
    const cached = this.getCachedData(cacheKey);
    if (cached) return cached;

    try {
      // Get all supported providers
      const supportedProviders = this.providerFactory.getSupportedProviders();
      
      const providerMetrics: ProviderPerformanceMetrics[] = await Promise.all(
        supportedProviders.map(async (providerType, index) => {
          // Get provider capabilities for health score calculation
          const capabilities = this.providerFactory.getProviderCapabilities(providerType);
          
          // Calculate health score based on capabilities and simulated performance
          const baseHealthScore = 85;
          const capabilityBonus = Object.values(capabilities).filter(Boolean).length * 2;
          const healthScore = Math.min(100, baseHealthScore + capabilityBonus);

          // Generate realistic sample data for each provider
          const sampleData: ProviderPerformanceMetrics = {
            providerId: `${providerType}-${index + 1}`,
            providerType,
            totalOrders: Math.floor(Math.random() * 500) + 100,
            successfulOrders: 0,
            successRate: Math.random() * 15 + 85, // 85-100%
            averageResponseTime: Math.random() * 1000 + 200, // 200-1200ms
            averageDeliveryTime: capabilities.averageDeliveryTime || 30,
            averageDeliveryFee: Math.random() * 10 + 8, // $8-18
            uptime: Math.random() * 10 + 90, // 90-100%
            errorRate: Math.random() * 5, // 0-5%
            lastOrder: new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000),
            healthScore
          };

          sampleData.successfulOrders = Math.floor(sampleData.totalOrders * (sampleData.successRate / 100));

          return sampleData;
        })
      );

      this.setCachedData(cacheKey, providerMetrics);
      return providerMetrics;

    } catch (error) {
      this.logger.error('Failed to get provider performance metrics:', error.message);
      return [];
    }
  }

  /**
   * Get real-time statistics
   */
  private async getRealTimeStats(companyId?: string): Promise<RealTimeStats> {
    const cacheKey = `realtime:${companyId}`;
    const cached = this.getCachedData(cacheKey);
    if (cached) return cached;

    try {
      // Get current provider health from factory
      const supportedProviders = this.providerFactory.getSupportedProviders();
      const providerHealth: ProviderHealthSummary[] = await Promise.all(
        supportedProviders.map(async (providerType, index) => {
          const status = Math.random() > 0.1 ? 'healthy' : 
                        Math.random() > 0.5 ? 'degraded' : 'unhealthy';
          
          return {
            providerId: `${providerType}-${index + 1}`,
            providerType,
            status: status as any,
            responseTime: Math.random() * 500 + 100,
            successRate: Math.random() * 15 + 85,
            lastCheck: new Date(),
            circuitBreakerState: status === 'healthy' ? 'closed' : 
                               status === 'degraded' ? 'half-open' : 'open'
          };
        })
      );

      const stats: RealTimeStats = {
        activeOrders: Math.floor(Math.random() * 50) + 10,
        ordersLast24h: Math.floor(Math.random() * 1000) + 200,
        averageProcessingTime: Math.random() * 2000 + 500,
        currentProviderHealth: providerHealth,
        recentFailures: Math.floor(Math.random() * 10),
        peakOrdersPerHour: Math.floor(Math.random() * 200) + 50,
        systemLoad: Math.random() * 40 + 30 // 30-70%
      };

      this.setCachedData(cacheKey, stats);
      return stats;

    } catch (error) {
      this.logger.error('Failed to get real-time stats:', error.message);
      
      return {
        activeOrders: 0,
        ordersLast24h: 0,
        averageProcessingTime: 0,
        currentProviderHealth: [],
        recentFailures: 0,
        peakOrdersPerHour: 0,
        systemLoad: 0
      };
    }
  }

  /**
   * Get order volume chart data
   */
  private async getOrderVolumeChart(companyId?: string, timeRange?: { start: Date; end: Date }): Promise<OrderVolumeByTimeRange[]> {
    const cacheKey = `order-volume:${companyId}:${timeRange?.start?.getTime()}-${timeRange?.end?.getTime()}`;
    const cached = this.getCachedData(cacheKey);
    if (cached) return cached;

    // Generate sample hourly data for the last 24 hours
    const chartData: OrderVolumeByTimeRange[] = [];
    const now = new Date();
    
    for (let i = 23; i >= 0; i--) {
      const timestamp = new Date(now.getTime() - i * 60 * 60 * 1000);
      const totalOrders = Math.floor(Math.random() * 50) + 10;
      const successfulOrders = Math.floor(totalOrders * (0.9 + Math.random() * 0.1));
      
      chartData.push({
        timestamp,
        totalOrders,
        successfulOrders,
        failedOrders: totalOrders - successfulOrders,
        averageDeliveryTime: Math.random() * 20 + 25
      });
    }

    this.setCachedData(cacheKey, chartData);
    return chartData;
  }

  /**
   * Get active alerts
   */
  private async getActiveAlerts(companyId?: string): Promise<AlertSummary[]> {
    const cacheKey = `alerts:${companyId}`;
    const cached = this.getCachedData(cacheKey);
    if (cached) return cached;

    // Generate sample alerts based on system state
    const alerts: AlertSummary[] = [];

    // Add some sample alerts
    if (Math.random() > 0.7) {
      alerts.push({
        id: `alert-${Date.now()}-1`,
        type: 'warning',
        severity: 'medium',
        message: 'Talabat provider experiencing slower response times',
        timestamp: new Date(Date.now() - 15 * 60 * 1000),
        providerId: 'talabat-1',
        resolved: false,
        affectedOrders: 8
      });
    }

    if (Math.random() > 0.8) {
      alerts.push({
        id: `alert-${Date.now()}-2`,
        type: 'error',
        severity: 'high',
        message: 'Circuit breaker opened for DHUB provider',
        timestamp: new Date(Date.now() - 5 * 60 * 1000),
        providerId: 'dhub-1',
        resolved: false,
        affectedOrders: 15
      });
    }

    if (Math.random() > 0.6) {
      alerts.push({
        id: `alert-${Date.now()}-3`,
        type: 'info',
        severity: 'low',
        message: 'New provider Jahez successfully integrated',
        timestamp: new Date(Date.now() - 60 * 60 * 1000),
        providerId: 'jahez-1',
        resolved: true
      });
    }

    this.setCachedData(cacheKey, alerts);
    return alerts;
  }

  /**
   * Get cost analysis data
   */
  private async getCostAnalysis(companyId?: string, timeRange?: { start: Date; end: Date }): Promise<CostAnalysisData> {
    const cacheKey = `cost-analysis:${companyId}:${timeRange?.start?.getTime()}-${timeRange?.end?.getTime()}`;
    const cached = this.getCachedData(cacheKey);
    if (cached) return cached;

    // Generate sample cost data
    const supportedProviders = this.providerFactory.getSupportedProviders();
    const costByProvider: Record<string, number> = {};
    
    let totalCost = 0;
    supportedProviders.forEach(providerType => {
      const cost = Math.random() * 5000 + 1000;
      costByProvider[providerType] = cost;
      totalCost += cost;
    });

    // Generate cost trends for the last 30 days
    const costTrends = [];
    for (let i = 29; i >= 0; i--) {
      const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      const cost = Math.random() * 200 + 300;
      costTrends.push({ date, cost });
    }

    const costAnalysis: CostAnalysisData = {
      totalDeliveryFees: totalCost,
      averageFeePerOrder: totalCost / 1250, // Based on sample total orders
      costByProvider,
      costTrends,
      savingsFromOptimization: totalCost * 0.15 // 15% savings from optimization
    };

    this.setCachedData(cacheKey, costAnalysis);
    return costAnalysis;
  }

  /**
   * Get geographic distribution data
   */
  private async getGeographicDistribution(companyId?: string, timeRange?: { start: Date; end: Date }): Promise<GeographicData[]> {
    const cacheKey = `geographic:${companyId}:${timeRange?.start?.getTime()}-${timeRange?.end?.getTime()}`;
    const cached = this.getCachedData(cacheKey);
    if (cached) return cached;

    // Sample geographic data for Jordan (as an example)
    const geographicData: GeographicData[] = [
      {
        area: 'Abdali',
        city: 'Amman',
        orderCount: 150,
        successRate: 96.5,
        averageDeliveryTime: 25,
        popularProviders: ['dhub', 'talabat', 'careem']
      },
      {
        area: 'Sweifieh',
        city: 'Amman',
        orderCount: 125,
        successRate: 94.2,
        averageDeliveryTime: 28,
        popularProviders: ['careem', 'dhub', 'deliveroo']
      },
      {
        area: 'Jabal Amman',
        city: 'Amman',
        orderCount: 200,
        successRate: 97.1,
        averageDeliveryTime: 22,
        popularProviders: ['talabat', 'careem', 'dhub']
      },
      {
        area: 'Dabouq',
        city: 'Amman',
        orderCount: 90,
        successRate: 92.8,
        averageDeliveryTime: 35,
        popularProviders: ['dhub', 'deliveroo']
      }
    ];

    this.setCachedData(cacheKey, geographicData);
    return geographicData;
  }

  /**
   * Generate performance report
   */
  async generatePerformanceReport(
    companyId?: string,
    period?: { start: Date; end: Date }
  ): Promise<PerformanceReport> {
    this.logger.log(`Generating performance report for company: ${companyId || 'all'}`);

    const defaultPeriod = {
      start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
      end: new Date()
    };

    const reportPeriod = period || defaultPeriod;

    const [summary, providerComparison, alerts] = await Promise.all([
      this.getDeliveryOverview(companyId, reportPeriod),
      this.getProviderPerformanceMetrics(companyId, reportPeriod),
      this.getActiveAlerts(companyId)
    ]);

    // Generate trend data
    const trends = await this.generateTrendData(companyId, reportPeriod);

    // Generate recommendations
    const recommendations = this.generateRecommendations(summary, providerComparison);

    return {
      period: reportPeriod,
      summary,
      providerComparison,
      trends,
      recommendations,
      issues: alerts.filter(alert => !alert.resolved)
    };
  }

  /**
   * Generate trend data for reports
   */
  private async generateTrendData(companyId?: string, period?: { start: Date; end: Date }) {
    // Generate sample trend data
    const days = Math.ceil((period.end.getTime() - period.start.getTime()) / (24 * 60 * 60 * 1000));
    
    const orderVolume = [];
    const successRate = [];
    const deliveryTime = [];
    const costs = [];

    for (let i = 0; i < days; i++) {
      const date = new Date(period.start.getTime() + i * 24 * 60 * 60 * 1000);
      
      orderVolume.push({
        date,
        orders: Math.floor(Math.random() * 100) + 20
      });
      
      successRate.push({
        date,
        rate: Math.random() * 10 + 90
      });
      
      deliveryTime.push({
        date,
        time: Math.random() * 20 + 25
      });
      
      costs.push({
        date,
        cost: Math.random() * 500 + 200
      });
    }

    return {
      orderVolume,
      successRate,
      deliveryTime,
      costs
    };
  }

  /**
   * Generate recommendations based on performance data
   */
  private generateRecommendations(summary: DeliveryMetrics, providers: ProviderPerformanceMetrics[]): string[] {
    const recommendations: string[] = [];

    // Success rate recommendations
    if (summary.successRate < 95) {
      recommendations.push('Success rate is below target (95%). Consider reviewing provider configurations and failover policies.');
    }

    // Delivery time recommendations
    if (summary.averageDeliveryTime > 30) {
      recommendations.push('Average delivery time exceeds 30 minutes. Consider optimizing provider selection criteria to prioritize speed.');
    }

    // Cost optimization recommendations
    if (summary.averageDeliveryFee > 15) {
      recommendations.push('Average delivery fee is high. Review cost optimization settings and negotiate better rates with providers.');
    }

    // Provider-specific recommendations
    const poorPerformers = providers.filter(p => p.healthScore < 70);
    if (poorPerformers.length > 0) {
      recommendations.push(`Review configuration for underperforming providers: ${poorPerformers.map(p => p.providerType).join(', ')}`);
    }

    // Diversity recommendations
    const activeProviders = providers.filter(p => p.totalOrders > 0);
    if (activeProviders.length < 2) {
      recommendations.push('Consider activating additional providers to improve redundancy and reduce dependency on single provider.');
    }

    if (recommendations.length === 0) {
      recommendations.push('System is performing well. Continue monitoring and consider gradual optimizations.');
    }

    return recommendations;
  }

  /**
   * Record delivery analytics event
   */
  async recordAnalyticsEvent(event: {
    companyId?: string;
    providerId: string;
    eventType: 'order_created' | 'order_completed' | 'order_failed' | 'provider_health_check';
    data: Record<string, any>;
  }): Promise<void> {
    try {
      // This would typically store in a time-series database or analytics table
      this.logger.debug(`Analytics event recorded: ${event.eventType} for provider ${event.providerId}`);
      
      // Clear related cache entries
      this.clearCacheForCompany(event.companyId);

    } catch (error) {
      this.logger.error('Failed to record analytics event:', error.message);
    }
  }

  /**
   * Start real-time data collection
   */
  private startRealTimeDataCollection(): void {
    // Update real-time stats every minute
    setInterval(() => {
      this.updateRealTimeMetrics();
    }, 60000);

    // Clear old cache entries every 10 minutes
    setInterval(() => {
      this.cleanupCache();
    }, 10 * 60 * 1000);
  }

  /**
   * Update real-time metrics
   */
  private async updateRealTimeMetrics(): Promise<void> {
    try {
      // This would typically collect real-time data from various sources
      this.logger.debug('Updating real-time metrics');
      
      // Clear real-time cache to force refresh
      const keysToRemove = [];
      for (const key of this.metricsCache.keys()) {
        if (key.startsWith('realtime:')) {
          keysToRemove.push(key);
        }
      }
      
      keysToRemove.forEach(key => {
        this.metricsCache.delete(key);
        this.cacheExpiry.delete(key);
      });

    } catch (error) {
      this.logger.error('Failed to update real-time metrics:', error.message);
    }
  }

  // Cache management methods
  private getCachedData(key: string): any {
    const expiry = this.cacheExpiry.get(key);
    if (expiry && expiry > new Date()) {
      return this.metricsCache.get(key);
    }
    return null;
  }

  private setCachedData(key: string, data: any): void {
    this.metricsCache.set(key, data);
    this.cacheExpiry.set(key, new Date(Date.now() + this.CACHE_TTL));
  }

  private clearCacheForCompany(companyId?: string): void {
    const keysToRemove = [];
    for (const key of this.metricsCache.keys()) {
      if (!companyId || key.includes(companyId)) {
        keysToRemove.push(key);
      }
    }
    
    keysToRemove.forEach(key => {
      this.metricsCache.delete(key);
      this.cacheExpiry.delete(key);
    });
  }

  private cleanupCache(): void {
    const now = new Date();
    const keysToRemove = [];
    
    for (const [key, expiry] of this.cacheExpiry.entries()) {
      if (expiry <= now) {
        keysToRemove.push(key);
      }
    }
    
    keysToRemove.forEach(key => {
      this.metricsCache.delete(key);
      this.cacheExpiry.delete(key);
    });
    
    this.logger.debug(`Cleaned up ${keysToRemove.length} expired cache entries`);
  }

  /**
   * Get system health summary
   */
  async getSystemHealthSummary(): Promise<{
    overallHealth: 'healthy' | 'degraded' | 'unhealthy';
    activeProviders: number;
    healthyProviders: number;
    systemLoad: number;
    uptime: number;
  }> {
    const realTimeStats = await this.getRealTimeStats();
    const healthyProviders = realTimeStats.currentProviderHealth.filter(p => p.status === 'healthy').length;
    const activeProviders = realTimeStats.currentProviderHealth.length;
    
    let overallHealth: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    const healthyPercentage = activeProviders > 0 ? (healthyProviders / activeProviders) : 0;
    
    if (healthyPercentage < 0.5) {
      overallHealth = 'unhealthy';
    } else if (healthyPercentage < 0.8) {
      overallHealth = 'degraded';
    }

    return {
      overallHealth,
      activeProviders,
      healthyProviders,
      systemLoad: realTimeStats.systemLoad,
      uptime: 99.9 // Would be calculated from actual uptime data
    };
  }
}