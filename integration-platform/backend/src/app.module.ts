import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule } from '@nestjs/throttler';
import { CacheModule } from '@nestjs/cache-manager';
import * as redisStore from 'cache-manager-redis-store';

// Core modules
import { DatabaseModule } from './common/database/database.module';
import { LoggingModule } from './common/logging/logging.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { OrganizationsModule } from './modules/organizations/organizations.module';

// Integration modules
import { IntegrationProvidersModule } from './modules/integration-providers/integration-providers.module';
import { IntegrationConnectionsModule } from './modules/integration-connections/integration-connections.module';
import { WebhookModule } from './modules/webhooks/webhooks.module';

// Sync modules
import { MenuSyncModule } from './modules/menu-sync/menu-sync.module';
import { OrderSyncModule } from './modules/order-sync/order-sync.module';

// Monitoring modules
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { HealthModule } from './modules/health/health.module';

// Microservice client modules
import { MicroservicesModule } from './microservices/microservices.module';

// Validation schemas
import { validationSchema } from './common/config/validation.schema';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema,
      envFilePath: ['.env.local', '.env'],
      cache: true,
    }),

    // Rate limiting
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => [
        {
          ttl: configService.get<number>('RATE_LIMIT_WINDOW_MS') || 900000, // 15 minutes
          limit: configService.get<number>('RATE_LIMIT_MAX_REQUESTS') || 100,
          skipIf: () => process.env.NODE_ENV === 'development',
        },
      ],
    }),

    // Caching with Redis
    CacheModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => {
        const redisUrl = configService.get<string>('REDIS_URL');

        if (redisUrl) {
          return {
            store: redisStore,
            url: redisUrl,
            ttl: 3600, // 1 hour default TTL
            max: 1000, // Maximum number of items in cache
          };
        }

        // Fallback to in-memory cache
        return {
          ttl: 3600,
          max: 1000,
        };
      },
    }),

    // Task scheduling
    ScheduleModule.forRoot(),

    // Core infrastructure
    DatabaseModule,
    LoggingModule,

    // Authentication & Users
    AuthModule,
    UsersModule,
    OrganizationsModule,

    // Integration Management
    IntegrationProvidersModule,
    IntegrationConnectionsModule,
    WebhookModule,

    // Data Synchronization
    MenuSyncModule,
    OrderSyncModule,

    // Monitoring & Analytics
    AnalyticsModule,
    HealthModule,

    // Microservices Communication
    MicroservicesModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}