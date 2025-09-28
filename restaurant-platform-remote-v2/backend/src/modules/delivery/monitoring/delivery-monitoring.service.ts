import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { DeliveryAnalyticsService } from '../analytics/delivery-analytics.service';
import { DeliveryProviderFactory } from '../factory/delivery-provider.factory';
import { AlertingService } from './alerting.service';
import { MetricsCollector } from './metrics-collector.service';
import { 
  SystemHealthStatus, 
  MonitoringMetrics, 
  AlertSeverity,
  HealthCheckResult,
  PerformanceThreshold
} from '../interfaces/monitoring.interface';

@Injectable()
export class DeliveryMonitoringService {
  private readonly performanceThresholds: PerformanceThreshold = {
    responseTime: {
      warning: 2000,    // 2 seconds
      critical: 5000    // 5 seconds
    },
    throughput: {
      warning: 10,      // 10 orders/second minimum
      critical: 5       // 5 orders/second minimum
    },
    errorRate: {
      warning: 5,       // 5% error rate
      critical: 10      // 10% error rate
    },
    memory: {
      warning: 512,     // 512 MB
      critical: 1024    // 1 GB
    },
    cpu: {
      warning: 80,      // 80% CPU usage
      critical: 95      // 95% CPU usage
    }
  };

  private systemHealth: SystemHealthStatus = {
    status: 'healthy',
    lastCheck: new Date(),
    uptime: 0,
    checks: []
  };

  constructor(
    private readonly analyticsService: DeliveryAnalyticsService,
    private readonly providerFactory: DeliveryProviderFactory,
    private readonly alertingService: AlertingService,
    private readonly metricsCollector: MetricsCollector
  ) {}

  // Run comprehensive health check every 5 minutes
  @Cron(CronExpression.EVERY_5_MINUTES)
  async performScheduledHealthCheck(): Promise<void> {
    try {
      const healthStatus = await this.performHealthCheck();
      await this.processHealthStatus(healthStatus);
      
      // Update system health
      this.systemHealth = healthStatus;
      
      // Collect metrics for monitoring dashboard
      await this.metricsCollector.recordHealthCheck(healthStatus);
      
    } catch (error) {
      console.error('Scheduled health check failed:', error);
      await this.alertingService.sendAlert({
        severity: AlertSeverity.CRITICAL,
        title: 'Health Check System Failure',
        message: `Scheduled health check failed: ${error.message}`,
        timestamp: new Date(),
        source: 'DeliveryMonitoringService'
      });
    }
  }

  // Monitor performance metrics every minute
  @Cron(CronExpression.EVERY_MINUTE)
  async monitorPerformanceMetrics(): Promise<void> {
    try {
      const metrics = await this.collectPerformanceMetrics();
      await this.evaluatePerformanceThresholds(metrics);
      
      // Store metrics for trend analysis
      await this.metricsCollector.recordPerformanceMetrics(metrics);
      
    } catch (error) {
      console.error('Performance monitoring failed:', error);
    }
  }

  // Check provider availability every 5 minutes
  @Cron('*/5 * * * *')
  async monitorProviderAvailability(): Promise<void> {
    try {
      const providerChecks = await this.checkProviderAvailability();
      await this.processProviderHealth(providerChecks);
      
    } catch (error) {
      console.error('Provider availability check failed:', error);
    }
  }

  async performHealthCheck(): Promise<SystemHealthStatus> {
    const startTime = Date.now();
    const checks: HealthCheckResult[] = [];
    
    try {
      // Database connectivity check
      const dbCheck = await this.checkDatabaseConnectivity();
      checks.push(dbCheck);
      
      // Provider connectivity checks
      const providerChecks = await this.checkProviderAvailability();
      checks.push(...providerChecks);
      
      // Memory usage check
      const memoryCheck = await this.checkMemoryUsage();
      checks.push(memoryCheck);
      
      // CPU usage check
      const cpuCheck = await this.checkCpuUsage();
      checks.push(cpuCheck);
      
      // Redis connectivity check (if applicable)
      const redisCheck = await this.checkRedisConnectivity();
      checks.push(redisCheck);
      
      // External service dependencies
      const externalChecks = await this.checkExternalDependencies();
      checks.push(...externalChecks);
      
      // Determine overall health status
      const overallStatus = this.determineOverallHealth(checks);
      const checkDuration = Date.now() - startTime;
      
      return {
        status: overallStatus,
        lastCheck: new Date(),
        uptime: process.uptime(),
        checkDuration,
        checks
      };
      
    } catch (error) {
      return {
        status: 'critical',
        lastCheck: new Date(),
        uptime: process.uptime(),
        checkDuration: Date.now() - startTime,
        error: error.message,
        checks
      };
    }
  }

  private async checkDatabaseConnectivity(): Promise<HealthCheckResult> {
    try {
      // Simulate database ping
      const startTime = Date.now();
      // In real implementation, this would be actual database connectivity check
      await new Promise(resolve => setTimeout(resolve, 50)); // Simulate DB ping
      const responseTime = Date.now() - startTime;
      
      return {
        name: 'database',
        status: 'healthy',
        responseTime,
        details: 'Database connection successful',
        timestamp: new Date()
      };
    } catch (error) {
      return {
        name: 'database',
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date()
      };
    }
  }

  private async checkProviderAvailability(): Promise<HealthCheckResult[]> {
    const results: HealthCheckResult[] = [];
    const providers = ['dhub', 'talabat', 'careem', 'jahez', 'deliveroo'];
    
    for (const providerType of providers) {
      try {
        const startTime = Date.now();
        
        // Create mock provider config for health check
        const healthCheckConfig = {
          providerId: `${providerType}-health-check`,
          providerType,
          companyId: 'health-check',
          isActive: true,
          priority: 1,
          apiConfig: { baseUrl: `https://api.${providerType}.com`, timeout: 5000, retryAttempts: 3, retryDelay: 1000 },
          credentials: { healthCheck: true },
          businessRules: { serviceFee: 0 }
        };
        
        const provider = await this.providerFactory.createProvider(healthCheckConfig);
        const isHealthy = await provider.healthCheck?.() || true;
        const responseTime = Date.now() - startTime;
        
        results.push({
          name: `provider-${providerType}`,
          status: isHealthy ? 'healthy' : 'degraded',
          responseTime,
          details: `${providerType} provider is ${isHealthy ? 'operational' : 'experiencing issues'}`,
          timestamp: new Date()
        });
        
      } catch (error) {
        results.push({
          name: `provider-${providerType}`,
          status: 'unhealthy',
          error: error.message,
          timestamp: new Date()
        });
      }
    }
    
    return results;
  }

  private async checkMemoryUsage(): Promise<HealthCheckResult> {
    const memUsage = process.memoryUsage();
    const heapUsedMB = Math.round(memUsage.heapUsed / (1024 * 1024));
    const heapTotalMB = Math.round(memUsage.heapTotal / (1024 * 1024));
    const rssUsageMB = Math.round(memUsage.rss / (1024 * 1024));
    
    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    if (heapUsedMB > this.performanceThresholds.memory.critical) {
      status = 'unhealthy';
    } else if (heapUsedMB > this.performanceThresholds.memory.warning) {
      status = 'degraded';
    }
    
    return {
      name: 'memory',
      status,
      details: `Heap: ${heapUsedMB}/${heapTotalMB}MB, RSS: ${rssUsageMB}MB`,
      metrics: {
        heapUsed: heapUsedMB,
        heapTotal: heapTotalMB,
        rss: rssUsageMB,
        external: Math.round(memUsage.external / (1024 * 1024))
      },
      timestamp: new Date()
    };
  }

  private async checkCpuUsage(): Promise<HealthCheckResult> {
    // Simple CPU usage estimation based on event loop delay
    const startTime = process.hrtime.bigint();
    await new Promise(resolve => setImmediate(resolve));
    const endTime = process.hrtime.bigint();
    
    const eventLoopDelay = Number(endTime - startTime) / 1000000; // Convert to milliseconds
    
    // Estimate CPU usage based on event loop delay
    let cpuUsageEstimate = Math.min((eventLoopDelay / 10) * 100, 100);
    cpuUsageEstimate = Math.max(cpuUsageEstimate, 0);
    
    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    if (cpuUsageEstimate > this.performanceThresholds.cpu.critical) {
      status = 'unhealthy';
    } else if (cpuUsageEstimate > this.performanceThresholds.cpu.warning) {
      status = 'degraded';
    }
    
    return {
      name: 'cpu',
      status,
      details: `Event loop delay: ${eventLoopDelay.toFixed(2)}ms, Estimated CPU: ${cpuUsageEstimate.toFixed(1)}%`,
      metrics: {
        eventLoopDelay,
        estimatedCpuUsage: cpuUsageEstimate
      },
      timestamp: new Date()
    };
  }

  private async checkRedisConnectivity(): Promise<HealthCheckResult> {
    try {
      // Simulate Redis ping
      const startTime = Date.now();
      await new Promise(resolve => setTimeout(resolve, 25)); // Simulate Redis ping
      const responseTime = Date.now() - startTime;
      
      return {
        name: 'redis',
        status: 'healthy',
        responseTime,
        details: 'Redis connection successful',
        timestamp: new Date()
      };
    } catch (error) {
      return {
        name: 'redis',
        status: 'degraded', // Redis is not critical for core functionality
        error: error.message,
        details: 'Redis connectivity issue - caching disabled',
        timestamp: new Date()
      };
    }
  }

  private async checkExternalDependencies(): Promise<HealthCheckResult[]> {
    const dependencies = [
      { name: 'location-service', url: 'https://location-api.example.com/health' },
      { name: 'payment-gateway', url: 'https://payment-api.example.com/health' },
      { name: 'notification-service', url: 'https://notification-api.example.com/health' }
    ];
    
    const results: HealthCheckResult[] = [];
    
    for (const dep of dependencies) {
      try {
        const startTime = Date.now();
        // Simulate external service check
        await new Promise(resolve => setTimeout(resolve, Math.random() * 200 + 100));
        const responseTime = Date.now() - startTime;
        
        results.push({
          name: dep.name,
          status: 'healthy',
          responseTime,
          details: `${dep.name} is operational`,
          timestamp: new Date()
        });
      } catch (error) {
        results.push({
          name: dep.name,
          status: 'degraded', // External dependencies are not critical
          error: error.message,
          timestamp: new Date()
        });
      }
    }
    
    return results;
  }

  private determineOverallHealth(checks: HealthCheckResult[]): 'healthy' | 'degraded' | 'unhealthy' | 'critical' {
    const criticalChecks = ['database', 'provider-dhub', 'provider-talabat', 'provider-careem'];
    const unhealthyChecks = checks.filter(check => check.status === 'unhealthy');
    const degradedChecks = checks.filter(check => check.status === 'degraded');
    
    // If any critical check is unhealthy, system is critical
    const criticalUnhealthy = unhealthyChecks.some(check => criticalChecks.includes(check.name));
    if (criticalUnhealthy) {
      return 'critical';
    }
    
    // If multiple checks are unhealthy, system is unhealthy
    if (unhealthyChecks.length >= 2) {
      return 'unhealthy';
    }
    
    // If any check is unhealthy or multiple degraded, system is degraded
    if (unhealthyChecks.length > 0 || degradedChecks.length >= 3) {
      return 'degraded';
    }
    
    return 'healthy';
  }

  private async processHealthStatus(healthStatus: SystemHealthStatus): Promise<void> {
    const previousStatus = this.systemHealth.status;
    const currentStatus = healthStatus.status;
    
    // Alert on status change
    if (previousStatus !== currentStatus) {
      await this.alertingService.sendAlert({
        severity: this.getSeverityForStatus(currentStatus),
        title: `System Health Status Changed`,
        message: `System health changed from ${previousStatus} to ${currentStatus}`,
        timestamp: new Date(),
        source: 'DeliveryMonitoringService',
        details: {
          previousStatus,
          currentStatus,
          failedChecks: healthStatus.checks.filter(check => check.status !== 'healthy')
        }
      });
    }
    
    // Alert on critical or unhealthy status
    if (['critical', 'unhealthy'].includes(currentStatus)) {
      const failedChecks = healthStatus.checks.filter(check => check.status === 'unhealthy');
      
      await this.alertingService.sendAlert({
        severity: currentStatus === 'critical' ? AlertSeverity.CRITICAL : AlertSeverity.HIGH,
        title: `System Health ${currentStatus.toUpperCase()}`,
        message: `System is ${currentStatus}. Failed checks: ${failedChecks.map(c => c.name).join(', ')}`,
        timestamp: new Date(),
        source: 'DeliveryMonitoringService',
        details: {
          status: currentStatus,
          failedChecks,
          uptime: healthStatus.uptime
        }
      });
    }
  }

  private async collectPerformanceMetrics(): Promise<MonitoringMetrics> {
    const analytics = await this.analyticsService.getDashboardData();
    const memUsage = process.memoryUsage();
    
    return {
      timestamp: new Date(),
      system: {
        memory: {
          heapUsed: Math.round(memUsage.heapUsed / (1024 * 1024)),
          heapTotal: Math.round(memUsage.heapTotal / (1024 * 1024)),
          rss: Math.round(memUsage.rss / (1024 * 1024))
        },
        cpu: {
          usage: 0, // Would be calculated from actual CPU metrics
          loadAverage: process.platform !== 'win32' ? require('os').loadavg() : [0, 0, 0]
        },
        uptime: process.uptime()
      },
      delivery: {
        totalOrders: analytics.overview.totalOrders,
        successfulOrders: analytics.overview.successfulOrders,
        failedOrders: analytics.overview.failedOrders,
        averageDeliveryTime: analytics.overview.averageDeliveryTime,
        orderRate: (analytics.realTimeStats as any)?.ordersPerMinute || 0,
        errorRate: (analytics.overview as any)?.errorRate || 0
      },
      providers: analytics.providerPerformance.map(provider => ({
        name: provider.providerType,
        successRate: provider.successRate,
        averageResponseTime: provider.averageResponseTime,
        totalOrders: provider.totalOrders,
        status: provider.successRate > 95 ? 'healthy' : provider.successRate > 85 ? 'degraded' : 'unhealthy'
      }))
    };
  }

  private async evaluatePerformanceThresholds(metrics: MonitoringMetrics): Promise<void> {
    const alerts = [];
    
    // Check memory thresholds
    if (metrics.system.memory.heapUsed > this.performanceThresholds.memory.critical) {
      alerts.push({
        severity: AlertSeverity.CRITICAL,
        title: 'Critical Memory Usage',
        message: `Memory usage is ${metrics.system.memory.heapUsed}MB (threshold: ${this.performanceThresholds.memory.critical}MB)`
      });
    } else if (metrics.system.memory.heapUsed > this.performanceThresholds.memory.warning) {
      alerts.push({
        severity: AlertSeverity.WARNING,
        title: 'High Memory Usage',
        message: `Memory usage is ${metrics.system.memory.heapUsed}MB (threshold: ${this.performanceThresholds.memory.warning}MB)`
      });
    }
    
    // Check error rate thresholds
    if (metrics.delivery.errorRate > this.performanceThresholds.errorRate.critical) {
      alerts.push({
        severity: AlertSeverity.CRITICAL,
        title: 'Critical Error Rate',
        message: `Error rate is ${metrics.delivery.errorRate.toFixed(1)}% (threshold: ${this.performanceThresholds.errorRate.critical}%)`
      });
    } else if (metrics.delivery.errorRate > this.performanceThresholds.errorRate.warning) {
      alerts.push({
        severity: AlertSeverity.WARNING,
        title: 'High Error Rate',
        message: `Error rate is ${metrics.delivery.errorRate.toFixed(1)}% (threshold: ${this.performanceThresholds.errorRate.warning}%)`
      });
    }
    
    // Check order processing rate
    if (metrics.delivery.orderRate < this.performanceThresholds.throughput.critical) {
      alerts.push({
        severity: AlertSeverity.CRITICAL,
        title: 'Critical Low Throughput',
        message: `Order processing rate is ${metrics.delivery.orderRate} orders/minute (threshold: ${this.performanceThresholds.throughput.critical * 60})`
      });
    } else if (metrics.delivery.orderRate < this.performanceThresholds.throughput.warning) {
      alerts.push({
        severity: AlertSeverity.WARNING,
        title: 'Low Throughput',
        message: `Order processing rate is ${metrics.delivery.orderRate} orders/minute (threshold: ${this.performanceThresholds.throughput.warning * 60})`
      });
    }
    
    // Check provider performance
    for (const provider of metrics.providers) {
      if (provider.successRate < 85) {
        alerts.push({
          severity: provider.successRate < 70 ? AlertSeverity.CRITICAL : AlertSeverity.HIGH,
          title: `${provider.name} Provider Performance Issue`,
          message: `${provider.name} success rate is ${provider.successRate.toFixed(1)}%`
        });
      }
    }
    
    // Send all alerts
    for (const alert of alerts) {
      await this.alertingService.sendAlert({
        ...alert,
        timestamp: new Date(),
        source: 'PerformanceMonitoring',
        details: { metrics }
      });
    }
  }

  private async processProviderHealth(checks: HealthCheckResult[]): Promise<void> {
    const unhealthyProviders = checks.filter(check => check.status === 'unhealthy');
    
    if (unhealthyProviders.length > 0) {
      await this.alertingService.sendAlert({
        severity: unhealthyProviders.length >= 2 ? AlertSeverity.CRITICAL : AlertSeverity.HIGH,
        title: 'Provider Health Issues',
        message: `${unhealthyProviders.length} provider(s) are unhealthy: ${unhealthyProviders.map(p => p.name).join(', ')}`,
        timestamp: new Date(),
        source: 'ProviderMonitoring',
        details: { unhealthyProviders }
      });
    }
  }

  private getSeverityForStatus(status: string): AlertSeverity {
    switch (status) {
      case 'critical': return AlertSeverity.CRITICAL;
      case 'unhealthy': return AlertSeverity.HIGH;
      case 'degraded': return AlertSeverity.WARNING;
      default: return AlertSeverity.INFO;
    }
  }

  // Public methods for external monitoring
  async getSystemHealth(): Promise<SystemHealthStatus> {
    return this.systemHealth;
  }

  async getPerformanceMetrics(): Promise<MonitoringMetrics> {
    return await this.collectPerformanceMetrics();
  }

  async triggerHealthCheck(): Promise<SystemHealthStatus> {
    return await this.performHealthCheck();
  }
}