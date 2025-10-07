import { Module, Global } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { MonitoringController } from './monitoring.controller';
import { ClusterHealthService } from './cluster-health.service';
import { CircuitBreakerService } from '../../common/services/circuit-breaker.service';

/**
 * PHASE 18: Monitoring Module
 *
 * Provides cluster-wide monitoring, health checks, and circuit breaker management
 */
@Global()
@Module({
  imports: [ScheduleModule.forRoot()],
  controllers: [MonitoringController],
  providers: [ClusterHealthService, CircuitBreakerService],
  exports: [ClusterHealthService, CircuitBreakerService],
})
export class MonitoringModule {}
