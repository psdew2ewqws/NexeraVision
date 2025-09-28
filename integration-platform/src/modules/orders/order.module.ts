import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { CacheModule } from '@nestjs/cache-manager';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { OrderController } from './order.controller.simple';
import { OrderService } from './order.service';
import { OrderStateMachine } from './order-state.machine';
import { OrderAnalyticsService } from './order-analytics.service';
import { OrderGateway } from './order-gateway';
import { PrismaService } from '../../shared/services/prisma.service';

@Module({
  imports: [
    // Event emitter configuration for real-time order updates and analytics
    EventEmitterModule.forRoot({
      wildcard: false,
      delimiter: '.',
      newListener: false,
      removeListener: false,
      maxListeners: 25, // Increased for analytics events
      verboseMemoryLeak: false,
      ignoreErrors: false,
    }),

    // Cache module for analytics performance
    CacheModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        ttl: configService.get('ORDER_ANALYTICS_CACHE_TTL', 300), // 5 minutes
        max: configService.get('ORDER_ANALYTICS_CACHE_MAX_ITEMS', 500),
        store: 'memory',
      }),
      inject: [ConfigService],
    }),

    // JWT module for WebSocket authentication
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
  controllers: [OrderController],
  providers: [
    OrderService,
    OrderStateMachine,
    OrderAnalyticsService,
    OrderGateway,
    PrismaService,
  ],
  exports: [
    OrderService,
    OrderStateMachine,
    OrderAnalyticsService,
    OrderGateway,
  ],
})
export class OrderModule {
  constructor() {
    console.log('📦 Order Module updated with Analytics and WebSocket support');
    console.log('✅ Analytics: Order analytics service integrated');
    console.log('✅ WebSocket: Real-time order updates gateway enabled');
    console.log('✅ Cache: Order analytics caching configured');
    console.log('✅ Events: Enhanced event emitter for real-time updates');
  }
}