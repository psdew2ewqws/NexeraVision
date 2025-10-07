import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { PrometheusModule as NestPrometheusModule } from '@willsoto/nestjs-prometheus';
import { PrometheusService } from './prometheus.service';
import { MetricsController } from './metrics.controller';
import { MetricsMiddleware } from './metrics.middleware';

/**
 * Metrics Module
 * Provides Prometheus metrics collection and exposure
 */
@Module({
  imports: [
    NestPrometheusModule.register({
      defaultMetrics: {
        enabled: true,
        config: {
          prefix: 'restaurant_platform_',
        },
      },
      path: '/metrics',
      defaultLabels: {
        app: 'restaurant-platform',
      },
    }),
  ],
  providers: [PrometheusService],
  controllers: [MetricsController],
  exports: [PrometheusService],
})
export class MetricsModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // Apply metrics middleware to all routes
    consumer.apply(MetricsMiddleware).forRoutes('*');
  }
}
