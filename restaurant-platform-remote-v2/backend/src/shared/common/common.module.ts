import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';

// Guards
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { CompanyGuard } from './guards/company.guard';

@Module({
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
    {
      provide: APP_GUARD,
      useClass: CompanyGuard,
    },
  ],
})
export class CommonModule {}