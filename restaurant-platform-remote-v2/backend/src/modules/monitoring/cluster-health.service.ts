import { Injectable, Logger } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { CircuitBreakerService, CircuitState } from '../../common/services/circuit-breaker.service';

/**
 * PHASE 18: Cluster Health Monitoring Service
 *
 * Monitors the health of the entire cluster including:
 * - Individual backend instances
 * - Redis connection state
 * - Circuit breaker states
 * - WebSocket connection pool
 * - Database connection pool
 */

export interface InstanceHealth {
  instanceId: string;
  healthy: boolean;
  uptime: number;
  memoryUsage: {
    used: number;
    total: number;
    percentage: number;
  };
  cpuUsage: number;
  activeConnections: number;
  requestRate: number;
  errorRate: number;
  lastCheck: Date;
}

export interface ClusterHealth {
  healthy: boolean;
  totalInstances: number;
  healthyInstances: number;
  unhealthyInstances: number;
  instances: InstanceHealth[];
  redis: {
    connected: boolean;
    latency: number;
    memory: number;
  };
  database: {
    connected: boolean;
    activeConnections: number;
    maxConnections: number;
  };
  circuitBreakers: Map<string, { state: CircuitState; metrics: any }>;
  timestamp: Date;
}

@Injectable()
export class ClusterHealthService {
  private readonly logger = new Logger(ClusterHealthService.name);
  private instanceHealth: InstanceHealth;
  private startTime: Date = new Date();
  private requestCount = 0;
  private errorCount = 0;
  private lastRequestCount = 0;
  private lastErrorCount = 0;

  constructor(private readonly circuitBreakerService: CircuitBreakerService) {
    this.initializeInstanceHealth();
  }

  /**
   * Initialize health tracking for this instance
   */
  private initializeInstanceHealth(): void {
    this.instanceHealth = {
      instanceId: process.env.INSTANCE_ID || `instance-${process.pid}`,
      healthy: true,
      uptime: 0,
      memoryUsage: {
        used: 0,
        total: 0,
        percentage: 0,
      },
      cpuUsage: 0,
      activeConnections: 0,
      requestRate: 0,
      errorRate: 0,
      lastCheck: new Date(),
    };

    this.logger.log(`🏥 [HEALTH] Instance initialized: ${this.instanceHealth.instanceId}`);
  }

  /**
   * Periodic health check (every 30 seconds)
   */
  @Interval(30000)
  async performHealthCheck(): Promise<void> {
    try {
      this.updateInstanceMetrics();
      this.checkResourceLimits();
      this.logger.debug(`✅ [HEALTH] Instance ${this.instanceHealth.instanceId}: ${this.instanceHealth.healthy ? 'HEALTHY' : 'UNHEALTHY'}`);
    } catch (error) {
      this.logger.error(`❌ [HEALTH] Health check failed:`, error.message);
      this.instanceHealth.healthy = false;
    }
  }

  /**
   * Update instance metrics
   */
  private updateInstanceMetrics(): void {
    const now = new Date();
    const uptimeSeconds = Math.floor((now.getTime() - this.startTime.getTime()) / 1000);

    // Memory usage
    const memUsage = process.memoryUsage();
    const totalMemory = require('os').totalmem();
    const usedMemory = memUsage.heapUsed;

    // CPU usage (approximation based on process.cpuUsage())
    const cpuUsage = process.cpuUsage();
    const cpuPercent = (cpuUsage.user + cpuUsage.system) / 1000000 / uptimeSeconds * 100;

    // Request rate (requests per second over last 30s)
    const requestDiff = this.requestCount - this.lastRequestCount;
    const errorDiff = this.errorCount - this.lastErrorCount;
    const timeDiff = 30; // 30 seconds between checks

    this.instanceHealth = {
      ...this.instanceHealth,
      uptime: uptimeSeconds,
      memoryUsage: {
        used: usedMemory,
        total: totalMemory,
        percentage: (usedMemory / totalMemory) * 100,
      },
      cpuUsage: Math.min(cpuPercent, 100),
      requestRate: requestDiff / timeDiff,
      errorRate: errorDiff / timeDiff,
      lastCheck: now,
    };

    // Update counters for next interval
    this.lastRequestCount = this.requestCount;
    this.lastErrorCount = this.errorCount;
  }

  /**
   * Check if resource limits are exceeded
   */
  private checkResourceLimits(): void {
    const memoryThreshold = 85; // 85% memory usage
    const cpuThreshold = 90; // 90% CPU usage
    const errorRateThreshold = 10; // 10 errors per second

    let healthy = true;

    if (this.instanceHealth.memoryUsage.percentage > memoryThreshold) {
      this.logger.warn(`⚠️ [HEALTH] High memory usage: ${this.instanceHealth.memoryUsage.percentage.toFixed(2)}%`);
      healthy = false;
    }

    if (this.instanceHealth.cpuUsage > cpuThreshold) {
      this.logger.warn(`⚠️ [HEALTH] High CPU usage: ${this.instanceHealth.cpuUsage.toFixed(2)}%`);
      healthy = false;
    }

    if (this.instanceHealth.errorRate > errorRateThreshold) {
      this.logger.warn(`⚠️ [HEALTH] High error rate: ${this.instanceHealth.errorRate.toFixed(2)} errors/sec`);
      healthy = false;
    }

    this.instanceHealth.healthy = healthy;
  }

  /**
   * Increment request counter
   */
  incrementRequestCount(): void {
    this.requestCount++;
  }

  /**
   * Increment error counter
   */
  incrementErrorCount(): void {
    this.errorCount++;
  }

  /**
   * Update active connections count
   */
  updateActiveConnections(count: number): void {
    this.instanceHealth.activeConnections = count;
  }

  /**
   * Get current instance health
   */
  getInstanceHealth(): InstanceHealth {
    return { ...this.instanceHealth };
  }

  /**
   * Get cluster health (aggregated from all instances)
   * Note: In production, this would query all instances via service discovery
   */
  async getClusterHealth(): Promise<ClusterHealth> {
    const circuitBreakers = this.circuitBreakerService.getAllCircuits();

    return {
      healthy: this.instanceHealth.healthy,
      totalInstances: 1, // In single-instance mode
      healthyInstances: this.instanceHealth.healthy ? 1 : 0,
      unhealthyInstances: this.instanceHealth.healthy ? 0 : 1,
      instances: [this.instanceHealth],
      redis: {
        connected: this.isRedisConnected(),
        latency: 0, // TODO: Implement Redis ping
        memory: 0, // TODO: Get Redis memory usage
      },
      database: {
        connected: true, // TODO: Check actual DB connection
        activeConnections: 0, // TODO: Get from Prisma
        maxConnections: 100,
      },
      circuitBreakers,
      timestamp: new Date(),
    };
  }

  /**
   * Check Redis connection (placeholder)
   */
  private isRedisConnected(): boolean {
    // TODO: Implement actual Redis connection check
    const redisCircuit = this.circuitBreakerService.getMetrics('redis');
    return redisCircuit ? redisCircuit.state === CircuitState.CLOSED : false;
  }

  /**
   * Health check endpoint response
   */
  async getHealthCheckResponse(): Promise<{
    status: 'ok' | 'degraded' | 'down';
    instance: string;
    uptime: number;
    timestamp: Date;
    checks: {
      memory: boolean;
      cpu: boolean;
      errors: boolean;
    };
  }> {
    const memoryOk = this.instanceHealth.memoryUsage.percentage < 85;
    const cpuOk = this.instanceHealth.cpuUsage < 90;
    const errorsOk = this.instanceHealth.errorRate < 10;

    const allHealthy = memoryOk && cpuOk && errorsOk;
    const someHealthy = memoryOk || cpuOk || errorsOk;

    return {
      status: allHealthy ? 'ok' : someHealthy ? 'degraded' : 'down',
      instance: this.instanceHealth.instanceId,
      uptime: this.instanceHealth.uptime,
      timestamp: new Date(),
      checks: {
        memory: memoryOk,
        cpu: cpuOk,
        errors: errorsOk,
      },
    };
  }
}
