import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AvailabilityController } from './availability.controller';
import { AvailabilityService } from './availability.service';
import { AvailabilityGateway } from './availability.gateway';
import { TemplateService } from './services/template.service';
import { AlertService } from './services/alert.service';
import { DatabaseModule } from '../../shared/database/database.module';

@Module({
  imports: [
    DatabaseModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'restaurant-platform-jwt-secret-2024',
      signOptions: { expiresIn: '24h' },
    }),
  ],
  controllers: [AvailabilityController],
  providers: [
    AvailabilityService,
    AvailabilityGateway,
    TemplateService,
    AlertService
  ],
  exports: [
    AvailabilityService,
    AvailabilityGateway,
    TemplateService,
    AlertService
  ]
})
export class AvailabilityModule {}