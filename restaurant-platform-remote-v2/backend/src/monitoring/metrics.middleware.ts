import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { PrometheusService } from './prometheus.service';

/**
 * Metrics Middleware
 * Automatically tracks HTTP request metrics
 */
@Injectable()
export class MetricsMiddleware implements NestMiddleware {
  constructor(private readonly prometheusService: PrometheusService) {}

  use(req: Request, res: Response, next: NextFunction) {
    const startTime = Date.now();

    // Track request completion
    res.on('finish', () => {
      const duration = (Date.now() - startTime) / 1000; // Convert to seconds
      const route = this.normalizeRoute(req.route?.path || req.path);

      this.prometheusService.recordHttpRequest(
        req.method,
        route,
        res.statusCode,
        duration,
      );

      // Track errors separately
      if (res.statusCode >= 400) {
        this.prometheusService.httpRequestErrors.inc({
          method: req.method,
          route,
          error: res.statusCode.toString(),
        });
      }
    });

    next();
  }

  /**
   * Normalize route to avoid high cardinality
   * Replaces dynamic segments with placeholders
   */
  private normalizeRoute(path: string): string {
    return path
      .replace(/\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '/:id')
      .replace(/\/\d+/g, '/:id')
      .replace(/\/[a-f0-9]{24}/gi, '/:id');
  }
}
