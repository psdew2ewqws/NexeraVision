import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { BackendClientService } from './services/backend-client.service';
import { CircuitBreakerService } from './services/circuit-breaker.service';

@Module({
  imports: [HttpModule],
  providers: [BackendClientService, CircuitBreakerService],
  exports: [BackendClientService, CircuitBreakerService],
})
export class BackendCommunicationModule {}