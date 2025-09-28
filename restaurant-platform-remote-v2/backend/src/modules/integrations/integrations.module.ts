import { Module } from '@nestjs/common';
import { CareemModule } from './careem/careem.module';
import { HttpModule } from '@nestjs/axios';

@Module({
  imports: [
    HttpModule.register({
      timeout: 30000,
      maxRedirects: 5,
    }),
    CareemModule,
    // Add other integrations here (Talabat, UberEats, etc.)
  ],
  exports: [CareemModule],
})
export class IntegrationsModule {}
