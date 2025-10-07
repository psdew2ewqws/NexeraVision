import { Module } from '@nestjs/common';
import { ApiKeyService } from './api-key.service';
import { ApiKeyGuard } from './guards/api-key.guard';
import { PrismaService } from '../../../infrastructure/database/prisma.service';

@Module({
  providers: [ApiKeyService, ApiKeyGuard, PrismaService],
  exports: [ApiKeyService, ApiKeyGuard],
})
export class ApiKeyModule {}
