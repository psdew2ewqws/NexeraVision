import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_INTERCEPTOR } from '@nestjs/core';

// Core modules
import { DatabaseModule } from './modules/database/database.module';
import { AuthModule } from './modules/auth/auth.module';
import { CompaniesModule } from './modules/companies/companies.module';
import { BranchesModule } from './modules/branches/branches.module';
import { UsersModule } from './modules/users/users.module';
import { LicensesModule } from './modules/licenses/licenses.module';
import { MenuModule } from './modules/menu/menu.module';
import { ModifiersModule } from './modules/modifiers/modifiers.module';
import { AvailabilityModule } from './modules/availability/availability.module';
import { DeliveryModule } from './modules/delivery/delivery.module';
import { PrintingModule } from './modules/printing/printing.module';
import { PrinterLicensesModule } from './modules/printer-licenses/printer-licenses.module';
import { PrintersModule } from './modules/printers/printers.module';
import { TemplateBuilderModule } from './modules/template-builder/template-builder.module';
import { TaxesModule } from './modules/taxes/taxes.module';
// import { PromotionsModule } from './modules/promotions/promotions.module'; // Still disabled due to TypeScript errors
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { OrdersModule } from './modules/orders/orders.module';

// Configuration
import { appConfig } from './config/app.config';
import { databaseConfig } from './config/database.config';
import { authConfig } from './config/auth.config';

// Common modules
import { CommonModule } from './common/common.module';

// Security middleware and interceptors
import { SecurityLoggingMiddleware } from './common/middleware/security-logging.middleware';
import { InputSanitizationMiddleware } from './common/middleware/input-sanitization.middleware';
import { SecurityResponseInterceptor } from './common/interceptors/security-response.interceptor';

// App controller for health checks
import { AppController } from './app.controller';

@Module({
  imports: [
    // Configuration module (environment-based like Picolinate)
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      load: [appConfig, databaseConfig, authConfig],
      envFilePath: ['.env.local', '.env.development', '.env'],
    }),

    // Core business modules
    CommonModule,
    DatabaseModule,
    AuthModule,
    CompaniesModule,
    BranchesModule,
    UsersModule,
    LicensesModule,
    MenuModule,
    ModifiersModule,
    AvailabilityModule,
    DeliveryModule,
    PrintingModule,
    PrinterLicensesModule,
    PrintersModule,
    TemplateBuilderModule,
    TaxesModule,
    // PromotionsModule, // Still disabled due to TypeScript errors
    AnalyticsModule,
    OrdersModule,
  ],
  controllers: [AppController],
  providers: [
    // Global security interceptor
    {
      provide: APP_INTERCEPTOR,
      useClass: SecurityResponseInterceptor,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // Apply security middleware to all routes
    consumer
      .apply(SecurityLoggingMiddleware, InputSanitizationMiddleware)
      .forRoutes('*');
  }
}