import { Module, Logger } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ScheduleModule } from '@nestjs/schedule';
import { WebhookModule } from './modules/webhook/webhook.module';
import { HealthModule } from './modules/health/health.module';
import { EventsGateway } from './gateways/events.gateway';
import { HttpModule } from '@nestjs/axios';

@Module({
  imports: [
    // Core modules
    EventEmitterModule.forRoot(),
    ScheduleModule.forRoot(),
    HttpModule.register({
      timeout: 10000,
      maxRedirects: 5,
    }),

    // Feature modules
    WebhookModule,
    HealthModule,
  ],
  controllers: [],
  providers: [
    EventsGateway,
    Logger,
  ],
  exports: [
    EventsGateway,
  ],
})
export class AppModule {
  constructor(private readonly logger: Logger) {
    this.logger.log('🚀 NEXARA Integration Platform initialized');
  }
}