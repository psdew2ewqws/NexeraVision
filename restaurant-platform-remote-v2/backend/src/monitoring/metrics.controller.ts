import { Controller, Get, Header } from '@nestjs/common';
import { PrometheusService } from './prometheus.service';

/**
 * Metrics Controller
 * Exposes Prometheus metrics endpoint
 */
@Controller('api/v1/metrics')
export class MetricsController {
  constructor(private readonly prometheusService: PrometheusService) {}

  /**
   * Prometheus metrics endpoint
   * GET /api/v1/metrics
   */
  @Get()
  async getMetrics(): Promise<string> {
    return this.prometheusService.getMetrics();
  }
}
