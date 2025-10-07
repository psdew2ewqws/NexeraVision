import { Controller, Get, Logger } from '@nestjs/common';
import { ClusterHealthService } from './cluster-health.service';
import { CircuitBreakerService } from '../../common/services/circuit-breaker.service';

/**
 * PHASE 18: Monitoring and Health Check Controller
 *
 * Provides endpoints for:
 * - Instance health checks (for load balancer)
 * - Cluster health overview
 * - Circuit breaker status
 * - Performance metrics
 */
@Controller('monitoring')
export class MonitoringController {
  private readonly logger = new Logger(MonitoringController.name);

  constructor(
    private readonly healthService: ClusterHealthService,
    private readonly circuitBreakerService: CircuitBreakerService,
  ) {}

  /**
   * Simple health check for load balancer
   * Returns 200 OK if instance is healthy, 503 if degraded/down
   */
  @Get('/health')
  async getHealth() {
    const health = await this.healthService.getHealthCheckResponse();

    if (health.status === 'down') {
      return {
        status: 503,
        ...health,
      };
    }

    return health;
  }

  /**
   * Detailed instance health
   */
  @Get('/instance')
  async getInstanceHealth() {
    return this.healthService.getInstanceHealth();
  }

  /**
   * Cluster health overview
   */
  @Get('/cluster')
  async getClusterHealth() {
    return this.healthService.getClusterHealth();
  }

  /**
   * Circuit breaker status
   */
  @Get('/circuits')
  async getCircuitBreakers() {
    const circuits = this.circuitBreakerService.getAllCircuits();
    const circuitArray = Array.from(circuits.entries()).map(([name, status]) => ({
      name,
      ...status,
    }));

    return {
      total: circuitArray.length,
      circuits: circuitArray,
      timestamp: new Date(),
    };
  }

  /**
   * Performance metrics
   */
  @Get('/metrics')
  async getMetrics() {
    const instance = this.healthService.getInstanceHealth();

    return {
      instanceId: instance.instanceId,
      uptime: instance.uptime,
      memory: instance.memoryUsage,
      cpu: instance.cpuUsage,
      requests: {
        rate: instance.requestRate,
        errorRate: instance.errorRate,
      },
      connections: instance.activeConnections,
      timestamp: new Date(),
    };
  }
}
