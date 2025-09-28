import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);
  private readonly restaurantPlatformUrl = 'http://localhost:3001';

  constructor(private readonly httpService: HttpService) {}

  async getSystemHealth() {
    const startTime = Date.now();
    const healthData = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      service: 'NEXARA Integration Platform',
      port: 3002,
      uptime: process.uptime(),
      responseTime: 0,
      dependencies: {
        restaurantPlatform: await this.checkRestaurantPlatform(),
      },
      endpoints: {
        '/api/webhooks/register': 'active',
        '/api/webhooks/event': 'active',
        '/api/health': 'active',
      },
      websocket: {
        namespace: '/events',
        status: 'active',
      },
      system: {
        memory: {
          used: process.memoryUsage().heapUsed,
          total: process.memoryUsage().heapTotal,
          external: process.memoryUsage().external,
          rss: process.memoryUsage().rss,
        },
        nodejs: process.version,
        platform: process.platform,
        arch: process.arch,
      },
    };

    const responseTime = Date.now() - startTime;
    healthData.responseTime = responseTime;

    // Determine overall status based on dependencies
    const hasUnhealthyDependencies = Object.values(healthData.dependencies).some(
      (dep: any) => dep.status !== 'healthy'
    );

    if (hasUnhealthyDependencies) {
      healthData.status = 'degraded';
    }

    return healthData;
  }

  private async checkRestaurantPlatform() {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.restaurantPlatformUrl}/api/health`, {
          timeout: 3000,
        })
      );

      return {
        status: 'healthy',
        url: this.restaurantPlatformUrl,
        responseTime: response.headers['x-response-time'] || 'unknown',
        lastChecked: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.warn(`Restaurant platform health check failed: ${error.message}`);

      return {
        status: 'unhealthy',
        url: this.restaurantPlatformUrl,
        error: error.message,
        lastChecked: new Date().toISOString(),
      };
    }
  }
}