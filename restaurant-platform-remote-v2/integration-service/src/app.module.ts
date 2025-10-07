import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { HttpModule } from '@nestjs/axios';

// Configuration files
import appConfig from './config/app.config';
import databaseConfig from './config/database.config';
import providersConfig from './config/providers.config';

// Feature modules
import { DatabaseModule } from './modules/database/database.module';
import { WebhooksModule } from './modules/webhooks/webhooks.module';
import { AdaptersModule } from './modules/adapters/adapters.module';
import { TransformationModule } from './modules/transformation/transformation.module';
import { BackendCommunicationModule } from './modules/backend-communication/backend-communication.module';
import { RetryQueueModule } from './modules/retry-queue/retry-queue.module';

// Common filters and interceptors
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      load: [appConfig, databaseConfig, providersConfig],
      envFilePath: ['.env'],
    }),

    // Rate limiting
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ([{
        ttl: config.get('WEBHOOK_RATE_WINDOW_MS', 60000),
        limit: config.get('WEBHOOK_RATE_LIMIT', 100),
      }]),
    }),

    // Scheduling for retry jobs
    ScheduleModule.forRoot(),

    // HTTP client for backend communication
    HttpModule.register({
      timeout: 5000,
      maxRedirects: 5,
    }),

    // Feature modules
    DatabaseModule,
    WebhooksModule,
    AdaptersModule,
    TransformationModule,
    BackendCommunicationModule,
    RetryQueueModule,
  ],
  providers: [
    // Global exception filter
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
    // Global logging interceptor
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
  ],
})
export class AppModule {}