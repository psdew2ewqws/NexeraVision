import { 
  IsString, 
  IsOptional, 
  IsEnum,
  IsObject,
  IsBoolean,
  IsDateString,
  IsArray,
  ValidateNested,
  ArrayNotEmpty,
  MinLength,
  MaxLength
} from 'class-validator';
import { Type } from 'class-transformer';
import { PlatformPricingDto } from './branch-availability.dto';

export enum TemplateType {
  SEASONAL = 'seasonal',
  HOLIDAY = 'holiday',
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
  SPECIAL_EVENT = 'special_event'
}

// Template configuration structure
export class TemplateConfigurationDto {
  @IsOptional()
  @IsBoolean()
  isInStock?: boolean;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @ValidateNested()
  @Type(() => PlatformPricingDto)
  prices?: PlatformPricingDto;

  @IsOptional()
  @IsString()
  availableFrom?: string;

  @IsOptional()
  @IsString()
  availableTo?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  availableDays?: string[];

  @IsOptional()
  @IsObject()
  recurringPattern?: {
    frequency?: 'daily' | 'weekly' | 'monthly';
    interval?: number;
    daysOfWeek?: number[];
    daysOfMonth?: number[];
    endDate?: string;
  };

  // Index signature for Prisma compatibility
  [key: string]: any;
}

// Create template DTO
export class CreateAvailabilityTemplateDto {
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsEnum(TemplateType)
  templateType: TemplateType;

  @ValidateNested()
  @Type(() => TemplateConfigurationDto)
  configuration: TemplateConfigurationDto;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean = true;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsObject()
  recurringPattern?: Record<string, any>;
}

// Update template DTO
export class UpdateAvailabilityTemplateDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsEnum(TemplateType)
  templateType?: TemplateType;

  @IsOptional()
  @ValidateNested()
  @Type(() => TemplateConfigurationDto)
  configuration?: TemplateConfigurationDto;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsObject()
  recurringPattern?: Record<string, any>;
}

// Apply template to items DTO
export class ApplyTemplateDto {
  @IsString()
  templateId: string;

  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  connectedIds: string[];

  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  branchIds: string[];

  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  @IsBoolean()
  overrideExisting?: boolean = false;

  @IsOptional()
  @IsBoolean()
  previewOnly?: boolean = false; // For testing template effects
}

// Template filters DTO
export class TemplateFiltersDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsEnum(TemplateType)
  templateType?: TemplateType;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  sortBy?: 'name' | 'templateType' | 'createdAt' | 'lastAppliedAt' | 'appliedCount';

  @IsOptional()
  @IsEnum(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc';

  @IsOptional()
  @IsString()
  companyId?: string;
}