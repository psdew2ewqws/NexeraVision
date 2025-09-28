import { Controller, Get, Logger } from '@nestjs/common';
import { HealthService } from './health.service';

@Controller('health')
export class HealthController {
  private readonly logger = new Logger(HealthController.name);

  constructor(private readonly healthService: HealthService) {}

  @Get()
  async getHealth() {
    this.logger.log('🏥 Health check requested');

    const healthStatus = await this.healthService.getSystemHealth();

    this.logger.log(`🏥 Health check completed - Status: ${healthStatus.status}`);

    return healthStatus;
  }
}