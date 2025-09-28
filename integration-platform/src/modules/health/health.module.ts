import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';

@Module({
  imports: [
    HttpModule.register({
      timeout: 5000,
      maxRedirects: 5,
    }),
  ],
  controllers: [HealthController],
  providers: [HealthService],
  exports: [HealthService],
})
export class HealthModule {}