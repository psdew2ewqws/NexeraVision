import { Module } from '@nestjs/common';
import { PromotionCampaignsService } from './promotion-campaigns.service';
import { PromotionCampaignsController } from './promotion-campaigns.controller';
import { MenuPromotionIntegrationService } from './services/menu-integration.service';
import { PrismaService } from '../database/prisma.service';

@Module({
  controllers: [PromotionCampaignsController],
  providers: [PromotionCampaignsService, MenuPromotionIntegrationService, PrismaService],
  exports: [PromotionCampaignsService, MenuPromotionIntegrationService],
})
export class PromotionsModule {}