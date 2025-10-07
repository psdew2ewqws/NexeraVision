import { Module } from '@nestjs/common';
import { IntegrationMonitoringService } from './integration-monitoring.service';
import { PrismaService } from '../../../infrastructure/database/prisma.service';

@Module({
  providers: [IntegrationMonitoringService, PrismaService],
  exports: [IntegrationMonitoringService],
})
export class IntegrationMonitoringModule {}
