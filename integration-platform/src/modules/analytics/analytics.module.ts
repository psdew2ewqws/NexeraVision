import { Module } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ScheduleModule } from '@nestjs/schedule';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';
import { OrderAnalyticsService } from '../orders/order-analytics.service';
import { PrismaService } from '../../shared/services/prisma.service';

@Module({
  imports: [
    // Cache configuration for analytics
    CacheModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        ttl: configService.get('ANALYTICS_CACHE_TTL', 300), // 5 minutes default
        max: configService.get('ANALYTICS_CACHE_MAX_ITEMS', 1000),
        store: 'memory', // In production, consider Redis
      }),
      inject: [ConfigService],
    }),

    // Event emitter for real-time analytics updates
    EventEmitterModule.forRoot({
      wildcard: false,
      delimiter: '.',
      newListener: false,
      removeListener: false,
      maxListeners: 50, // Higher limit for analytics events
      verboseMemoryLeak: false,
      ignoreErrors: false,
    }),

    // Schedule module for periodic analytics tasks
    ScheduleModule.forRoot(),

    // JWT module for authentication
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: configService.get<string>('JWT_EXPIRES_IN', '24h'),
        },
      }),
      inject: [ConfigService],
    }),

    ConfigModule,
  ],
  controllers: [AnalyticsController],
  providers: [
    AnalyticsService,
    OrderAnalyticsService,
    PrismaService,

    // Analytics-specific providers
    {
      provide: 'ANALYTICS_CONFIG',
      useFactory: (configService: ConfigService) => ({
        cacheEnabled: configService.get('ANALYTICS_CACHE_ENABLED', 'true') === 'true',
        cacheTTL: configService.get('ANALYTICS_CACHE_TTL', 300),
        realtimeCacheTTL: configService.get('ANALYTICS_REALTIME_CACHE_TTL', 30),
        maxDataPoints: configService.get('ANALYTICS_MAX_DATA_POINTS', 10000),
        alertCheckInterval: configService.get('ANALYTICS_ALERT_CHECK_INTERVAL', 60),
        exportEnabled: configService.get('ANALYTICS_EXPORT_ENABLED', 'true') === 'true',
        maxExportRows: configService.get('ANALYTICS_MAX_EXPORT_ROWS', 100000),
        metricsRetentionDays: configService.get('ANALYTICS_METRICS_RETENTION_DAYS', 90),
      }),
      inject: [ConfigService],
    },
  ],
  exports: [
    AnalyticsService,
    OrderAnalyticsService,

    // Export services for use in other modules
    'ANALYTICS_CONFIG',
  ],
})
export class AnalyticsModule {
  constructor() {
    // Module initialization logging
    console.log('📊 Analytics Module initialized');
    console.log('✅ Cache: Memory-based (configure Redis for production)');
    console.log('✅ Events: Real-time analytics updates enabled');
    console.log('✅ Scheduling: Periodic cache refresh and alerts enabled');
    console.log('✅ Authentication: JWT-based API protection');
  }
}