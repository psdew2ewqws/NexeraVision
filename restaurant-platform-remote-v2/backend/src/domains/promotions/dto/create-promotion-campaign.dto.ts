import {
  IsString,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsNumber,
  IsArray,
  IsObject,
  ValidateNested,
  IsDateString,
  Min,
  Max,
  IsDecimal,
  ArrayMinSize,
  ArrayMaxSize,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PromotionCampaignType, PromotionStatus } from '@prisma/client';

class MultiLanguageStringDto {
  @ApiPropertyOptional({ description: 'English text' })
  @IsOptional()
  @IsString()
  en?: string;

  @ApiPropertyOptional({ description: 'Arabic text' })
  @IsOptional()
  @IsString()
  ar?: string;
}

class TimeRangeDto {
  @ApiProperty({ description: 'Start time in HH:MM format', example: '09:00' })
  @IsString()
  start: string;

  @ApiProperty({ description: 'End time in HH:MM format', example: '17:00' })
  @IsString()
  end: string;
}

class PromotionTargetDto {
  @ApiProperty({ enum: ['product', 'category', 'branch', 'customer', 'modifier'] })
  @IsEnum(['product', 'category', 'branch', 'customer', 'modifier'])
  targetType: string;

  @ApiProperty({ description: 'Target entity ID' })
  @IsString()
  targetId: string;
}

export class CreatePromotionCampaignDto {
  @ApiProperty({ description: 'Campaign name in multiple languages' })
  @ValidateNested()
  @Type(() => MultiLanguageStringDto)
  name: MultiLanguageStringDto;

  @ApiPropertyOptional({ description: 'Campaign description in multiple languages' })
  @IsOptional()
  @ValidateNested()
  @Type(() => MultiLanguageStringDto)
  description?: MultiLanguageStringDto;

  @ApiProperty({ description: 'URL-friendly slug', example: 'summer-sale-2024' })
  @IsString()
  slug: string;

  @ApiProperty({ enum: PromotionCampaignType, description: 'Type of promotion' })
  @IsEnum(PromotionCampaignType)
  type: PromotionCampaignType;

  @ApiPropertyOptional({ enum: PromotionStatus, default: 'draft' })
  @IsOptional()
  @IsEnum(PromotionStatus)
  status?: PromotionStatus;

  @ApiPropertyOptional({ description: 'Priority (1 = highest)', minimum: 1, default: 999 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  priority?: number;

  @ApiPropertyOptional({ description: 'Is promotion public', default: true })
  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;

  @ApiPropertyOptional({ description: 'Can stack with other promotions', default: false })
  @IsOptional()
  @IsBoolean()
  isStackable?: boolean;

  // Time restrictions
  @ApiPropertyOptional({ description: 'Promotion start date and time' })
  @IsOptional()
  @IsDateString()
  startsAt?: string;

  @ApiPropertyOptional({ description: 'Promotion end date and time' })
  @IsOptional()
  @IsDateString()
  endsAt?: string;

  @ApiPropertyOptional({ 
    description: 'Days of week (1=Monday, 7=Sunday)', 
    type: [Number],
    example: [1, 2, 3, 4, 5] 
  })
  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  @Min(1, { each: true })
  @Max(7, { each: true })
  daysOfWeek?: number[];

  @ApiPropertyOptional({ 
    description: 'Time ranges when promotion is active',
    type: [TimeRangeDto] 
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TimeRangeDto)
  timeRanges?: TimeRangeDto[];

  // Usage limits
  @ApiPropertyOptional({ description: 'Total usage limit across all customers' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  totalUsageLimit?: number;

  @ApiPropertyOptional({ description: 'Usage limit per customer', default: 1 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  perCustomerLimit?: number;

  // Discount configuration
  @ApiPropertyOptional({ description: 'Discount value (percentage or fixed amount)' })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Transform(({ value }) => typeof value === 'string' ? parseFloat(value) : value)
  discountValue?: number;

  @ApiPropertyOptional({ description: 'Maximum discount amount for percentage discounts' })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Transform(({ value }) => typeof value === 'string' ? parseFloat(value) : value)
  maxDiscountAmount?: number;

  @ApiPropertyOptional({ description: 'Minimum order amount to qualify' })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Transform(({ value }) => typeof value === 'string' ? parseFloat(value) : value)
  minimumOrderAmount?: number;

  @ApiPropertyOptional({ description: 'Minimum items count to qualify', default: 1 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  minimumItemsCount?: number;

  // Buy X Get Y configuration
  @ApiPropertyOptional({ description: 'Number of items to buy for BXGY promotions' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  buyQuantity?: number;

  @ApiPropertyOptional({ description: 'Number of items to get for BXGY promotions' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  getQuantity?: number;

  @ApiPropertyOptional({ description: 'Discount percentage on "get" items for BXGY' })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Transform(({ value }) => typeof value === 'string' ? parseFloat(value) : value)
  @Min(0)
  @Max(100)
  getDiscountPercentage?: number;

  // Platform targeting
  @ApiPropertyOptional({ 
    description: 'Target platforms',
    type: [String],
    example: ['talabat', 'careem', 'website', 'call_center'] 
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  targetPlatforms?: string[];

  @ApiPropertyOptional({ 
    description: 'Target customer segments',
    type: [String],
    example: ['new', 'vip', 'regular'] 
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  targetCustomerSegments?: string[];

  // Promotion targets
  @ApiPropertyOptional({ 
    description: 'Specific targets for the promotion',
    type: [PromotionTargetDto] 
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PromotionTargetDto)
  targets?: PromotionTargetDto[];

  // Promotion codes
  @ApiPropertyOptional({ 
    description: 'Promo codes for the campaign',
    type: [String],
    example: ['SUMMER20', 'SAVE25'] 
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  codes?: string[];

  // Company assignment (for super admin)
  @ApiPropertyOptional({ description: 'Company ID (super_admin only)' })
  @IsOptional()
  @IsString()
  companyId?: string;
}