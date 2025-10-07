import { Controller, Get, Post, Body, Query, Param, HttpStatus, HttpException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiParam } from '@nestjs/swagger';
import { DeliveryMonitoringService } from './delivery-monitoring.service';
import { AlertingService } from './alerting.service';
import { MetricsCollector } from './metrics-collector.service';
import { 
  SystemHealthStatus, 
  MonitoringMetrics, 
  Alert, 
  AlertSeverity,
  TimeSeriesData,
  SystemStatusSummary,
  PerformanceSummary,
  ProviderHealthSummary,
  TrendAnalysis,
  CapacityReport
} from '../interfaces/monitoring.interface';

@ApiTags('Delivery Monitoring')
@Controller('delivery/monitoring')
export class MonitoringController {
  constructor(
    private readonly monitoringService: DeliveryMonitoringService,
    private readonly alertingService: AlertingService,
    private readonly metricsCollector: MetricsCollector
  ) {}

  @Get('health')
  @ApiOperation({ summary: 'Get system health status' })
  @ApiResponse({ status: 200, description: 'System health status' })
  async getSystemHealth(): Promise<SystemHealthStatus> {
    return await this.monitoringService.getSystemHealth();
  }

  @Get('health/detailed')
  @ApiOperation({ summary: 'Get detailed system health with component breakdown' })
  @ApiResponse({ status: 200, description: 'Detailed system health status' })
  async getDetailedSystemHealth(): Promise<SystemStatusSummary> {
    const healthStatus = await this.monitoringService.getSystemHealth();
    
    // Convert health check results to component status
    const components = {
      database: this.getComponentStatus(healthStatus.checks, 'database'),
      providers: this.getAggregatedProviderStatus(healthStatus.checks),
      memory: this.getComponentStatus(healthStatus.checks, 'memory'),
      cpu: this.getComponentStatus(healthStatus.checks, 'cpu'),
      external: this.getAggregatedExternalStatus(healthStatus.checks)
    };

    // Count active alerts (would typically come from a database)
    const activeAlerts = 0; // This would be implemented with actual alert storage

    // Identify pending issues
    const pendingIssues = healthStatus.checks
      .filter(check => check.status !== 'healthy')
      .map(check => `${check.name}: ${check.status}${check.error ? ' - ' + check.error : ''}`);

    return {
      overall: healthStatus.status,
      components,
      uptime: healthStatus.uptime,
      lastCheck: healthStatus.lastCheck,
      activeAlerts,
      pendingIssues
    };
  }

  @Get('health/check')
  @ApiOperation({ summary: 'Trigger manual health check' })
  @ApiResponse({ status: 200, description: 'Health check completed' })
  async triggerHealthCheck(): Promise<SystemHealthStatus> {
    return await this.monitoringService.triggerHealthCheck();
  }

  @Get('metrics')
  @ApiOperation({ summary: 'Get current performance metrics' })
  @ApiResponse({ status: 200, description: 'Current performance metrics' })
  async getPerformanceMetrics(): Promise<MonitoringMetrics> {
    return await this.monitoringService.getPerformanceMetrics();
  }

  @Get('metrics/summary')
  @ApiOperation({ summary: 'Get performance metrics summary' })
  @ApiResponse({ status: 200, description: 'Performance metrics summary' })
  async getPerformanceSummary(): Promise<PerformanceSummary> {
    const metrics = await this.monitoringService.getPerformanceMetrics();
    
    return {
      ordersPerSecond: metrics.delivery.orderRate / 60, // Convert from per minute to per second
      averageResponseTime: metrics.providers.reduce((sum, p) => sum + p.averageResponseTime, 0) / metrics.providers.length,
      errorRate: metrics.delivery.errorRate,
      memoryUsage: metrics.system.memory.heapUsed,
      cpuUsage: metrics.system.cpu.usage,
      activeConnections: 0, // Would be tracked separately
      queueSize: 0, // Would be tracked separately
      cacheHitRate: 95.5 // Would be tracked separately
    };
  }

  @Get('metrics/:metricName')
  @ApiOperation({ summary: 'Get specific metric data' })
  @ApiParam({ name: 'metricName', description: 'Name of the metric to retrieve' })
  @ApiQuery({ name: 'start', description: 'Start time (ISO string)', required: false })
  @ApiQuery({ name: 'end', description: 'End time (ISO string)', required: false })
  @ApiResponse({ status: 200, description: 'Metric data' })
  async getMetric(
    @Param('metricName') metricName: string,
    @Query('start') start?: string,
    @Query('end') end?: string
  ): Promise<TimeSeriesData | null> {
    const timeRange = start && end ? {
      start: new Date(start),
      end: new Date(end)
    } : undefined;

    return await this.metricsCollector.getMetric(metricName, timeRange);
  }

  @Get('metrics/pattern/:pattern')
  @ApiOperation({ summary: 'Get metrics matching a pattern' })
  @ApiParam({ name: 'pattern', description: 'Pattern to match metrics (e.g., provider.*)', example: 'provider.*' })
  @ApiQuery({ name: 'start', description: 'Start time (ISO string)', required: false })
  @ApiQuery({ name: 'end', description: 'End time (ISO string)', required: false })
  @ApiResponse({ status: 200, description: 'Matching metrics data' })
  async getMetricsByPattern(
    @Param('pattern') pattern: string,
    @Query('start') start?: string,
    @Query('end') end?: string
  ): Promise<Record<string, TimeSeriesData>> {
    const timeRange = start && end ? {
      start: new Date(start),
      end: new Date(end)
    } : undefined;

    const metrics = await this.metricsCollector.getMetricsByPattern(pattern, timeRange);
    return Object.fromEntries(metrics);
  }

  @Get('metrics/:metricName/trend')
  @ApiOperation({ summary: 'Get metric trend analysis' })
  @ApiParam({ name: 'metricName', description: 'Name of the metric to analyze' })
  @ApiQuery({ name: 'start', description: 'Start time (ISO string)', required: false })
  @ApiQuery({ name: 'end', description: 'End time (ISO string)', required: false })
  @ApiResponse({ status: 200, description: 'Trend analysis data' })
  async getMetricTrend(
    @Param('metricName') metricName: string,
    @Query('start') start?: string,
    @Query('end') end?: string
  ): Promise<TrendAnalysis | null> {
    const timeRange = start && end ? {
      start: new Date(start),
      end: new Date(end)
    } : undefined;

    const trendData = await this.metricsCollector.getMetricTrend(metricName, timeRange);
    
    if (!trendData) {
      return null;
    }

    return {
      metric: metricName,
      period: timeRange ? `${start} to ${end}` : 'All time',
      trend: trendData.trend,
      changePercentage: Math.abs(trendData.slope) * 100, // Simplified percentage calculation
      prediction: trendData.correlation > 0.7 ? {
        nextValue: 0, // Would calculate based on trend
        confidence: Math.abs(trendData.correlation) * 100,
        timeframe: '1 hour'
      } : undefined
    };
  }

  @Get('metrics/:metricName/anomalies')
  @ApiOperation({ summary: 'Detect anomalies in metric data' })
  @ApiParam({ name: 'metricName', description: 'Name of the metric to analyze' })
  @ApiQuery({ name: 'threshold', description: 'Standard deviation threshold (default: 2)', required: false })
  @ApiResponse({ status: 200, description: 'Detected anomalies' })
  async detectAnomalies(
    @Param('metricName') metricName: string,
    @Query('threshold') threshold?: number
  ): Promise<any[]> {
    const anomalies = await this.metricsCollector.detectAnomalies(metricName, threshold || 2);
    
    return anomalies.map(anomaly => ({
      timestamp: anomaly.timestamp,
      value: anomaly.value,
      severity: this.getAnomalySeverity(anomaly.value, threshold || 2),
      tags: anomaly.tags
    }));
  }

  @Get('providers/health')
  @ApiOperation({ summary: 'Get provider health summary' })
  @ApiResponse({ status: 200, description: 'Provider health summary' })
  async getProviderHealthSummary(): Promise<ProviderHealthSummary[]> {
    const healthStatus = await this.monitoringService.getSystemHealth();
    const providers = ['dhub', 'talabat', 'careem', 'jahez', 'deliveroo'];
    
    return providers.map(providerType => {
      const providerCheck = healthStatus.checks.find(check => 
        check.name === `provider-${providerType}`
      );
      
      return {
        providerId: `${providerType}-provider`,
        providerType,
        status: providerCheck?.status || 'offline',
        lastCheck: providerCheck?.timestamp || healthStatus.lastCheck,
        responseTime: providerCheck?.responseTime || 0,
        successRate: 0, // Would be calculated from metrics
        activeOrders: 0, // Would be tracked separately
        errorCount: 0, // Would be tracked separately
        region: this.getProviderRegion(providerType)
      };
    });
  }

  @Get('capacity')
  @ApiOperation({ summary: 'Get system capacity report' })
  @ApiResponse({ status: 200, description: 'System capacity report' })
  async getCapacityReport(): Promise<CapacityReport> {
    const metrics = await this.monitoringService.getPerformanceMetrics();
    
    // Calculate current load based on various metrics
    const memoryLoad = (metrics.system.memory.heapUsed / metrics.system.memory.heapTotal) * 100;
    const cpuLoad = metrics.system.cpu.usage;
    const orderRateLoad = (metrics.delivery.orderRate / 100) * 100; // Assuming 100 orders/min max capacity
    
    const currentLoad = Math.max(memoryLoad, cpuLoad, orderRateLoad);
    const maxCapacity = 100;
    const utilizationPercentage = (currentLoad / maxCapacity) * 100;
    
    // Identify bottlenecks
    const bottlenecks: string[] = [];
    if (memoryLoad > 80) bottlenecks.push('Memory usage high');
    if (cpuLoad > 80) bottlenecks.push('CPU usage high');
    if (orderRateLoad > 80) bottlenecks.push('Order processing rate high');
    if (metrics.delivery.errorRate > 5) bottlenecks.push('High error rate');
    
    // Generate recommendations
    const recommendations: string[] = [];
    if (memoryLoad > 70) recommendations.push('Consider increasing memory allocation');
    if (cpuLoad > 70) recommendations.push('Scale horizontally or optimize CPU-intensive operations');
    if (orderRateLoad > 70) recommendations.push('Add more order processing capacity');
    if (bottlenecks.length === 0) recommendations.push('System operating within normal parameters');
    
    return {
      currentLoad,
      maxCapacity,
      utilizationPercentage,
      bottlenecks,
      recommendations,
      scalingMetrics: {
        cpu: cpuLoad,
        memory: memoryLoad,
        network: 0, // Would be tracked separately
        database: 0 // Would be tracked separately
      }
    };
  }

  @Get('alerts/channels')
  @ApiOperation({ summary: 'Get configured alert channels' })
  @ApiResponse({ status: 200, description: 'Alert channels configuration' })
  async getAlertChannels(): Promise<any> {
    const channels = this.alertingService.getAlertChannels();
    
    // Convert Map to object and remove sensitive config data
    const channelsObject = {};
    for (const [name, channel] of channels) {
      channelsObject[name] = {
        type: channel.type,
        name: channel.name,
        enabled: channel.enabled,
        severityFilter: channel.severityFilter,
        // Omit sensitive config data
        hasConfig: Object.keys(channel.config).length > 0
      };
    }
    
    return channelsObject;
  }

  @Get('alerts/rules')
  @ApiOperation({ summary: 'Get configured alert rules' })
  @ApiResponse({ status: 200, description: 'Alert rules configuration' })
  async getAlertRules(): Promise<any[]> {
    return this.alertingService.getAlertRules().map(rule => ({
      name: rule.name,
      channels: rule.channels,
      suppressionTime: rule.suppressionTime
      // Don't expose the condition function
    }));
  }

  @Post('alerts/test')
  @ApiOperation({ summary: 'Send test alert' })
  @ApiResponse({ status: 200, description: 'Test alert sent' })
  async sendTestAlert(@Body() testAlertData: {
    severity?: AlertSeverity;
    title?: string;
    message?: string;
    channels?: string[];
  }): Promise<{ success: boolean; message: string }> {
    try {
      const testAlert: Alert = {
        severity: testAlertData.severity || AlertSeverity.INFO,
        title: testAlertData.title || 'Test Alert',
        message: testAlertData.message || 'This is a test alert from the monitoring system',
        timestamp: new Date(),
        source: 'MonitoringController',
        details: {
          testAlert: true,
          requestedChannels: testAlertData.channels
        }
      };

      await this.alertingService.sendAlert(testAlert);
      
      return {
        success: true,
        message: 'Test alert sent successfully'
      };
    } catch (error) {
      throw new HttpException(
        `Failed to send test alert: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('dashboard/overview')
  @ApiOperation({ summary: 'Get monitoring dashboard overview' })
  @ApiResponse({ status: 200, description: 'Dashboard overview data' })
  async getDashboardOverview(): Promise<any> {
    const [health, metrics, summary] = await Promise.all([
      this.monitoringService.getSystemHealth(),
      this.monitoringService.getPerformanceMetrics(),
      this.getPerformanceSummary()
    ]);

    return {
      systemHealth: {
        status: health.status,
        uptime: health.uptime,
        lastCheck: health.lastCheck,
        issues: health.checks.filter(check => check.status !== 'healthy').length
      },
      performance: {
        ordersPerSecond: summary.ordersPerSecond,
        responseTime: summary.averageResponseTime,
        errorRate: summary.errorRate,
        memoryUsage: summary.memoryUsage
      },
      providers: metrics.providers.map(provider => ({
        name: provider.name,
        status: provider.status,
        successRate: provider.successRate,
        responseTime: provider.averageResponseTime
      })),
      recentAlerts: [], // Would come from alert storage
      capacity: await this.getCapacityReport()
    };
  }

  @Get('export/:metricName')
  @ApiOperation({ summary: 'Export metric data' })
  @ApiParam({ name: 'metricName', description: 'Name of the metric to export' })
  @ApiResponse({ status: 200, description: 'Exported metric data' })
  async exportMetric(@Param('metricName') metricName: string): Promise<any> {
    return await this.metricsCollector.exportMetrics([metricName]);
  }

  @Get('system/overview')
  @ApiOperation({ summary: 'Get metrics system overview' })
  @ApiResponse({ status: 200, description: 'Metrics system overview' })
  async getSystemOverview(): Promise<any> {
    return await this.metricsCollector.getSystemOverview();
  }

  // Helper methods
  private getComponentStatus(checks: any[], componentName: string): 'healthy' | 'degraded' | 'unhealthy' {
    const component = checks.find(check => check.name === componentName);
    if (!component) return 'unhealthy';
    return component.status === 'healthy' ? 'healthy' : 
           component.status === 'degraded' ? 'degraded' : 'unhealthy';
  }

  private getAggregatedProviderStatus(checks: any[]): 'healthy' | 'degraded' | 'unhealthy' {
    const providerChecks = checks.filter(check => check.name.startsWith('provider-'));
    if (providerChecks.length === 0) return 'unhealthy';
    
    const healthyCount = providerChecks.filter(check => check.status === 'healthy').length;
    const totalCount = providerChecks.length;
    
    if (healthyCount === totalCount) return 'healthy';
    if (healthyCount >= totalCount / 2) return 'degraded';
    return 'unhealthy';
  }

  private getAggregatedExternalStatus(checks: any[]): 'healthy' | 'degraded' | 'unhealthy' {
    const externalChecks = checks.filter(check => 
      ['location-service', 'payment-gateway', 'notification-service'].includes(check.name)
    );
    
    if (externalChecks.length === 0) return 'healthy'; // External services are optional
    
    const healthyCount = externalChecks.filter(check => check.status === 'healthy').length;
    const totalCount = externalChecks.length;
    
    if (healthyCount === totalCount) return 'healthy';
    if (healthyCount >= totalCount / 2) return 'degraded';
    return 'unhealthy';
  }

  private getProviderRegion(providerType: string): string {
    const regionMap = {
      dhub: 'Jordan',
      talabat: 'Gulf',
      careem: 'MENA',
      jahez: 'Saudi Arabia',
      deliveroo: 'International'
    };
    return regionMap[providerType] || 'Unknown';
  }

  private getAnomalySeverity(value: number, threshold: number): string {
    const severity = Math.abs(value) / threshold;
    if (severity > 3) return 'critical';
    if (severity > 2) return 'high';
    if (severity > 1.5) return 'medium';
    return 'low';
  }
}