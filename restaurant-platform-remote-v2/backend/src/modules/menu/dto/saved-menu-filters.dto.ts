import { IsOptional, IsString, IsEnum, IsUUID, IsInt, Min, Max } from 'class-validator';
import { Transform, Type } from 'class-transformer';

export class SavedMenuFiltersDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsEnum(['active', 'draft', 'archived'])
  status?: 'active' | 'draft' | 'archived';

  @IsOptional()
  @IsUUID()
  platformId?: string;

  @IsOptional()
  @IsUUID()
  createdBy?: string;

  @IsOptional()
  @IsString()
  @IsEnum(['name', 'createdAt', 'updatedAt', 'productCount'])
  sortBy?: 'name' | 'createdAt' | 'updatedAt' | 'productCount';

  @IsOptional()
  @IsString()
  @IsEnum(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc';

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @IsOptional()
  @IsUUID()
  companyId?: string; // For super_admin filtering
}