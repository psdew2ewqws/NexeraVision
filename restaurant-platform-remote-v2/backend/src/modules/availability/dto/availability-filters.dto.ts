import { 
  IsString, 
  IsOptional, 
  IsBoolean,
  IsEnum,
  IsArray,
  IsNumber,
  Min,
  Max
} from 'class-validator';
import { Transform } from 'class-transformer';
import { ConnectedType } from './branch-availability.dto';

export class AvailabilityFiltersDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  branchId?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  branchIds?: string[];

  @IsOptional()
  @IsEnum(ConnectedType)
  connectedType?: ConnectedType;

  @IsOptional()
  @IsString()
  categoryId?: string;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => {
    if (value === 'true' || value === true) return true;
    if (value === 'false' || value === false) return false;
    return undefined;
  })
  isInStock?: boolean;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => {
    if (value === 'true' || value === true) return true;
    if (value === 'false' || value === false) return false;
    return undefined;
  })
  isActive?: boolean;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => {
    if (value === 'true' || value === true) return true;
    if (value === 'false' || value === false) return false;
    return undefined;
  })
  hasLowStock?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Transform(({ value }) => {
    const num = parseInt(value);
    return isNaN(num) ? undefined : num;
  })
  minStockLevel?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Transform(({ value }) => {
    const num = parseInt(value);
    return isNaN(num) ? undefined : num;
  })
  maxStockLevel?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  platforms?: string[]; // Filter by platforms that have pricing

  @IsOptional()
  @IsString()
  availableFrom?: string; // Time filter

  @IsOptional()
  @IsString()
  availableTo?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  availableDays?: string[];

  @IsOptional()
  @IsEnum(['name', 'stock_level', 'priority', 'updated_at', 'created_at'])
  sortBy?: 'name' | 'stock_level' | 'priority' | 'updated_at' | 'created_at';

  @IsOptional()
  @IsEnum(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc';

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  @Transform(({ value }) => {
    const num = parseInt(value);
    return isNaN(num) ? 20 : num;
  })
  limit?: number = 20;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Transform(({ value }) => {
    const num = parseInt(value);
    return isNaN(num) ? 1 : num;
  })
  page?: number = 1;

  @IsOptional()
  @IsString()
  companyId?: string;
}

// Quick filter presets for common operations
export class QuickFiltersDto {
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  outOfStock?: boolean;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  lowStock?: boolean;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  inactive?: boolean;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  noPricing?: boolean; // Items without platform pricing

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  scheduledUnavailable?: boolean; // Items outside their availability schedule

  @IsOptional()
  @IsString()
  preset?: 'all' | 'available' | 'issues' | 'review_needed';
}

// Advanced analytics filters
export class AvailabilityAnalyticsFiltersDto {
  @IsOptional()
  @IsString()
  dateFrom?: string; // ISO date string

  @IsOptional()
  @IsString()
  dateTo?: string;

  @IsOptional()
  @IsEnum(['daily', 'weekly', 'monthly'])
  groupBy?: 'daily' | 'weekly' | 'monthly';

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  metrics?: string[]; // ['stock_changes', 'price_changes', 'availability_hours']

  @IsOptional()
  @IsString()
  branchId?: string;

  @IsOptional()
  @IsEnum(ConnectedType)
  connectedType?: ConnectedType;
}