import { 
  IsString, 
  IsEnum, 
  IsOptional, 
  IsBoolean, 
  IsNumber, 
  IsObject,
  IsArray,
  Min,
  Max,
  IsDateString,
  ValidateNested,
  ArrayNotEmpty
} from 'class-validator';
import { Transform, Type } from 'class-transformer';

// Enums matching the Prisma schema
export enum ConnectedType {
  PRODUCT = 'product',
  MODIFIER = 'modifier',
  CATEGORY = 'category'
}

export enum AvailabilityChangeType {
  STATUS_CHANGE = 'status_change',
  STOCK_UPDATE = 'stock_update',
  STOCK_CHANGE = 'stock_update', // Alias for compatibility
  PRICE_CHANGE = 'price_change',
  SCHEDULE_UPDATE = 'schedule_update',
  BULK_OPERATION = 'bulk_operation',
  TEMPLATE_APPLIED = 'template_applied'
}

// Platform pricing structure
export class PlatformPricingDto {
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  talabat?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  careem?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  website?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  call_center?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  uber_eats?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  deliveroo?: number;

  // Index signature for Prisma compatibility
  [key: string]: number | undefined;
}

// Create branch availability DTO
export class CreateBranchAvailabilityDto {
  @IsString()
  connectedId: string;

  @IsEnum(ConnectedType)
  connectedType: ConnectedType;

  @IsString()
  branchId: string;

  @IsOptional()
  @IsString()
  companyId?: string;

  @IsOptional()
  @IsBoolean()
  isInStock?: boolean = true;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean = true;

  @IsOptional()
  @IsNumber()
  @Min(0)
  stockLevel?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  lowStockThreshold?: number;

  @IsOptional()
  @ValidateNested()
  @Type(() => PlatformPricingDto)
  prices?: PlatformPricingDto;

  @IsOptional()
  @IsObject()
  taxes?: Record<string, any>;

  @IsOptional()
  @IsString()
  availableFrom?: string; // "06:00"

  @IsOptional()
  @IsString()
  availableTo?: string; // "23:30"

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  availableDays?: string[]; // ["monday", "tuesday", ...]

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(999)
  priority?: number = 0;
}

// Update branch availability DTO
export class UpdateBranchAvailabilityDto {
  @IsOptional()
  @IsBoolean()
  isInStock?: boolean;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0)
  stockLevel?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  lowStockThreshold?: number;

  @IsOptional()
  @ValidateNested()
  @Type(() => PlatformPricingDto)
  prices?: PlatformPricingDto;

  @IsOptional()
  @IsObject()
  taxes?: Record<string, any>;

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
  @IsString()
  notes?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(999)
  priority?: number;

  @IsOptional()
  @IsString()
  changeReason?: string;
}

// Bulk availability update DTO for efficiency
export class BulkAvailabilityUpdateDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  availabilityIds: string[];

  @IsOptional()
  @IsBoolean()
  isInStock?: boolean;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0)
  stockLevel?: number;

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
  @IsNumber()
  @Min(0)
  @Max(999)
  priority?: number;

  @IsOptional()
  @IsString()
  changeReason?: string;
}

// Bulk create availability for new items
export class BulkCreateAvailabilityDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  connectedIds: string[];

  @IsEnum(ConnectedType)
  connectedType: ConnectedType;

  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  branchIds: string[];

  @IsOptional()
  @IsBoolean()
  isInStock?: boolean = true;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean = true;

  @IsOptional()
  @IsNumber()
  @Min(0)
  stockLevel?: number;

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
  @IsString()
  notes?: string;
}