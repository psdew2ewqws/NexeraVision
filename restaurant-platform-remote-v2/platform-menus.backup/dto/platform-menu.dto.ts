import { IsString, IsOptional, IsBoolean, IsObject, IsEnum, IsUUID, IsArray, ValidateNested } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum PlatformType {
  TALABAT = 'talabat',
  CAREEM = 'careem',
  CALL_CENTER = 'call_center',
  WEBSITE = 'website',
  CHATBOT = 'chatbot'
}

export enum SyncStatus {
  DRAFT = 'draft',
  SYNCING = 'syncing',
  SYNCED = 'synced',
  ERROR = 'error',
  PENDING = 'pending'
}

export class MultiLanguageTextDto {
  @ApiProperty({ example: 'Main Dishes' })
  @IsString()
  en: string;

  @ApiProperty({ example: 'الأطباق الرئيسية' })
  @IsString()
  ar: string;
}

export class CreatePlatformMenuDto {
  @ApiProperty({ enum: PlatformType })
  @IsEnum(PlatformType)
  platformType: PlatformType;

  @ApiProperty({ type: MultiLanguageTextDto })
  @ValidateNested()
  @Type(() => MultiLanguageTextDto)
  name: MultiLanguageTextDto;

  @ApiPropertyOptional({ type: MultiLanguageTextDto })
  @ValidateNested()
  @Type(() => MultiLanguageTextDto)
  @IsOptional()
  description?: MultiLanguageTextDto;

  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  branchId?: string;

  @ApiPropertyOptional({ default: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiPropertyOptional({
    example: {
      autoSync: false,
      commissionRate: 0.15,
      deliveryFee: 2.5,
      minimumOrder: 15.0
    }
  })
  @IsObject()
  @IsOptional()
  settings?: any;
}

export class UpdatePlatformMenuDto {
  @ApiPropertyOptional({ type: MultiLanguageTextDto })
  @ValidateNested()
  @Type(() => MultiLanguageTextDto)
  @IsOptional()
  name?: MultiLanguageTextDto;

  @ApiPropertyOptional({ type: MultiLanguageTextDto })
  @ValidateNested()
  @Type(() => MultiLanguageTextDto)
  @IsOptional()
  description?: MultiLanguageTextDto;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiPropertyOptional()
  @IsObject()
  @IsOptional()
  settings?: any;

  @ApiPropertyOptional({ enum: SyncStatus })
  @IsEnum(SyncStatus)
  @IsOptional()
  syncStatus?: SyncStatus;
}

export class CreatePlatformMenuCategoryDto {
  @ApiProperty({ type: MultiLanguageTextDto })
  @ValidateNested()
  @Type(() => MultiLanguageTextDto)
  name: MultiLanguageTextDto;

  @ApiPropertyOptional({ type: MultiLanguageTextDto })
  @ValidateNested()
  @Type(() => MultiLanguageTextDto)
  @IsOptional()
  description?: MultiLanguageTextDto;

  @ApiPropertyOptional()
  @IsOptional()
  displayOrder?: number;

  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  parentCategoryId?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  imageUrl?: string;

  @ApiPropertyOptional({ default: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class CreatePlatformMenuItemDto {
  @ApiProperty()
  @IsUUID()
  productId: string;

  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  platformCategoryId?: string;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  displayOrder?: number;

  @ApiPropertyOptional({ default: true })
  @IsBoolean()
  @IsOptional()
  isAvailable?: boolean;

  @ApiPropertyOptional({
    example: {
      platformPrice: 12.50,
      platformName: { en: 'Special Burger', ar: 'برجر خاص' },
      customizations: {}
    }
  })
  @IsObject()
  @IsOptional()
  platformSpecificData?: any;

  @ApiPropertyOptional()
  @IsObject()
  @IsOptional()
  availabilitySchedule?: any;
}

export class BulkAddItemsDto {
  @ApiProperty({ type: [String] })
  @IsArray()
  @IsUUID(undefined, { each: true })
  productIds: string[];

  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  defaultCategoryId?: string;

  @ApiPropertyOptional({ default: true })
  @IsBoolean()
  @IsOptional()
  isAvailable?: boolean;
}

export class SyncPlatformMenuDto {
  @ApiPropertyOptional({ default: false })
  @IsBoolean()
  @IsOptional()
  dryRun?: boolean;

  @ApiPropertyOptional()
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  itemsToSync?: string[];

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  forceFull?: boolean;
}

export class PlatformMenuQueryDto {
  @ApiPropertyOptional({ enum: PlatformType })
  @IsEnum(PlatformType)
  @IsOptional()
  platformType?: PlatformType;

  @ApiPropertyOptional({ enum: SyncStatus })
  @IsEnum(SyncStatus)
  @IsOptional()
  syncStatus?: SyncStatus;

  @ApiPropertyOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true')
  @IsOptional()
  isActive?: boolean;

  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  branchId?: string;

  @ApiPropertyOptional({ default: 1 })
  @Transform(({ value }) => parseInt(value) || 1)
  @IsOptional()
  page?: number;

  @ApiPropertyOptional({ default: 20 })
  @Transform(({ value }) => parseInt(value) || 20)
  @IsOptional()
  limit?: number;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  search?: string;
}