// ================================================
// Platform Sync DTOs
// Data Transfer Objects for Sync Operations
// ================================================

import { IsString, IsUUID, IsObject, IsArray, IsOptional, IsEnum, IsBoolean, IsNumber, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// ================================================
// SINGLE PLATFORM SYNC DTO
// ================================================

export class CreatePlatformSyncDto {
  @ApiProperty({ description: 'Platform menu ID to sync' })
  @IsUUID()
  platformMenuId: string;

  @ApiProperty({ description: 'Target platform type', enum: ['careem', 'talabat', 'deliveroo'] })
  @IsEnum(['careem', 'talabat', 'deliveroo'])
  platformType: string;

  @ApiProperty({ description: 'Platform-specific configuration' })
  @IsObject()
  configuration: any;

  @ApiPropertyOptional({ description: 'Force sync even if no changes detected' })
  @IsOptional()
  @IsBoolean()
  forceSync?: boolean;

  @ApiPropertyOptional({ description: 'Sync specific items only' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  itemIds?: string[];
}

// ================================================
// BATCH SYNC DTO
// ================================================

export class PlatformConfigDto {
  @ApiProperty({ description: 'Platform type', enum: ['careem', 'talabat', 'deliveroo'] })
  @IsEnum(['careem', 'talabat', 'deliveroo'])
  platformType: string;

  @ApiProperty({ description: 'Platform-specific configuration' })
  @IsObject()
  configuration: any;

  @ApiPropertyOptional({ description: 'Priority for this platform (1-10)' })
  @IsOptional()
  @IsNumber()
  priority?: number;
}

export class BatchSyncDto {
  @ApiProperty({ description: 'Platform menu ID to sync' })
  @IsUUID()
  platformMenuId: string;

  @ApiProperty({ description: 'Array of platform configurations', type: [PlatformConfigDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PlatformConfigDto)
  platforms: PlatformConfigDto[];

  @ApiPropertyOptional({ description: 'Execute platforms in parallel (default) or sequence' })
  @IsOptional()
  @IsEnum(['parallel', 'sequence'])
  executionMode?: 'parallel' | 'sequence';

  @ApiPropertyOptional({ description: 'Stop batch on first failure' })
  @IsOptional()
  @IsBoolean()
  failFast?: boolean;
}

// ================================================
// SYNC CONFIGURATION DTO
// ================================================

export class SyncConfigurationDto {
  @ApiProperty({ description: 'Platform-specific configuration object' })
  @IsObject()
  configuration: any;

  @ApiPropertyOptional({ description: 'Auto-sync enabled for this platform' })
  @IsOptional()
  @IsBoolean()
  autoSyncEnabled?: boolean;

  @ApiPropertyOptional({ description: 'Sync schedule (cron expression)' })
  @IsOptional()
  @IsString()
  syncSchedule?: string;

  @ApiPropertyOptional({ description: 'Webhook URL for sync notifications' })
  @IsOptional()
  @IsString()
  webhookUrl?: string;
}

// ================================================
// SYNC FILTERS DTO
// ================================================

export class SyncFiltersDto {
  @ApiPropertyOptional({ description: 'Page number', default: 1 })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Items per page', default: 20 })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  limit?: number = 20;

  @ApiPropertyOptional({ description: 'Filter by platform type' })
  @IsOptional()
  @IsEnum(['careem', 'talabat', 'deliveroo'])
  platformType?: string;

  @ApiPropertyOptional({ description: 'Filter by sync status' })
  @IsOptional()
  @IsEnum(['pending', 'in_progress', 'completed', 'failed', 'cancelled'])
  status?: string;

  @ApiPropertyOptional({ description: 'Filter by platform menu ID' })
  @IsOptional()
  @IsUUID()
  platformMenuId?: string;

  @ApiPropertyOptional({ description: 'Start date filter (ISO string)' })
  @IsOptional()
  @IsString()
  dateFrom?: string;

  @ApiPropertyOptional({ description: 'End date filter (ISO string)' })
  @IsOptional()
  @IsString()
  dateTo?: string;

  @ApiPropertyOptional({ description: 'Filter by user ID' })
  @IsOptional()
  @IsUUID()
  userId?: string;

  @ApiPropertyOptional({ description: 'Include only failed syncs with retry available' })
  @IsOptional()
  @IsBoolean()
  retryableOnly?: boolean;
}

// ================================================
// RETRY FAILED SYNC DTO
// ================================================

export class RetryFailedSyncDto {
  @ApiProperty({ description: 'Array of sync IDs to retry' })
  @IsArray()
  @IsString({ each: true })
  syncIds: string[];

  @ApiPropertyOptional({ description: 'Force retry even if retry limit exceeded' })
  @IsOptional()
  @IsBoolean()
  forceRetry?: boolean;

  @ApiPropertyOptional({ description: 'Reset retry count before retrying' })
  @IsOptional()
  @IsBoolean()
  resetRetryCount?: boolean;

  @ApiPropertyOptional({ description: 'Updated configuration for retry' })
  @IsOptional()
  @IsObject()
  updatedConfiguration?: any;
}

// ================================================
// WEBHOOK DATA DTO
// ================================================

export class WebhookDataDto {
  @ApiProperty({ description: 'Sync operation ID' })
  @IsString()
  sync_id: string;

  @ApiProperty({ description: 'Sync status from platform' })
  @IsString()
  status: string;

  @ApiPropertyOptional({ description: 'Status message' })
  @IsOptional()
  @IsString()
  message?: string;

  @ApiPropertyOptional({ description: 'External platform ID' })
  @IsOptional()
  @IsString()
  external_id?: string;

  @ApiPropertyOptional({ description: 'Items processed count' })
  @IsOptional()
  @IsNumber()
  items_processed?: number;

  @ApiPropertyOptional({ description: 'Additional platform-specific data' })
  @IsOptional()
  @IsObject()
  metadata?: any;
}

// ================================================
// SYNC ANALYTICS QUERY DTO
// ================================================

export class SyncAnalyticsQueryDto {
  @ApiPropertyOptional({ description: 'Analytics period', enum: ['day', 'week', 'month', 'quarter'] })
  @IsOptional()
  @IsEnum(['day', 'week', 'month', 'quarter'])
  period?: string = 'week';

  @ApiPropertyOptional({ description: 'Platform type filter' })
  @IsOptional()
  @IsEnum(['careem', 'talabat', 'deliveroo'])
  platformType?: string;

  @ApiPropertyOptional({ description: 'Include detailed breakdown' })
  @IsOptional()
  @IsBoolean()
  detailed?: boolean = false;
}

// ================================================
// CAREEM SPECIFIC CONFIGURATION DTO
// ================================================

export class CareemSyncConfigDto {
  @ApiProperty({ description: 'Careem store ID' })
  @IsString()
  storeId: string;

  @ApiPropertyOptional({ description: 'Existing menu ID for updates' })
  @IsOptional()
  @IsString()
  menuId?: string;

  @ApiProperty({ description: 'Currency code', default: 'JOD' })
  @IsString()
  currency: string = 'JOD';

  @ApiProperty({ description: 'Service area configuration' })
  @IsObject()
  serviceArea: {
    city: string;
    zones: string[];
    maxDeliveryRadius: number;
  };

  @ApiProperty({ description: 'Delivery settings' })
  @IsObject()
  deliverySettings: {
    estimatedDeliveryTime: number;
    minOrderValue: number;
    deliveryFee: number;
    freeDeliveryThreshold?: number;
  };

  @ApiProperty({ description: 'Operational hours' })
  @IsObject()
  operationalHours: {
    [day: string]: { open: string; close: string; isOpen: boolean };
  };

  @ApiPropertyOptional({ description: 'Promotions configuration' })
  @IsOptional()
  @IsObject()
  promotions?: {
    enabled: boolean;
    types: string[];
    autoApply: boolean;
  };

  @ApiPropertyOptional({ description: 'Display settings' })
  @IsOptional()
  @IsObject()
  display?: {
    showPreparationTime: boolean;
    showIngredients: boolean;
    showNutritionalFacts: boolean;
    enableItemCustomization: boolean;
  };
}

// ================================================
// TALABAT SPECIFIC CONFIGURATION DTO
// ================================================

export class TalabatSyncConfigDto {
  @ApiProperty({ description: 'Talabat restaurant ID' })
  @IsString()
  restaurantId: string;

  @ApiPropertyOptional({ description: 'Existing menu ID for updates' })
  @IsOptional()
  @IsString()
  menuId?: string;

  @ApiProperty({ description: 'Currency code', default: 'JOD' })
  @IsString()
  currency: string = 'JOD';

  @ApiProperty({ description: 'Tax rate (0-1)', default: 0.16 })
  @IsNumber()
  taxRate: number = 0.16;

  @ApiProperty({ description: 'Delivery zones' })
  @IsArray()
  @IsString({ each: true })
  deliveryZones: string[];

  @ApiProperty({ description: 'Operating hours' })
  @IsObject()
  operatingHours: {
    [day: string]: { open: string; close: string; available: boolean };
  };

  @ApiPropertyOptional({ description: 'Special offers configuration' })
  @IsOptional()
  @IsObject()
  specialOffers?: {
    enabled: boolean;
    types: string[];
  };

  @ApiPropertyOptional({ description: 'Menu display settings' })
  @IsOptional()
  @IsObject()
  menuDisplay?: {
    showNutrition: boolean;
    showCalories: boolean;
    showAllergens: boolean;
    groupByCategory: boolean;
  };
}