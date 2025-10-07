import { PartialType } from '@nestjs/swagger';
import { CreatePromotionCampaignDto } from './create-promotion-campaign.dto';

export class UpdatePromotionCampaignDto extends PartialType(CreatePromotionCampaignDto) {}