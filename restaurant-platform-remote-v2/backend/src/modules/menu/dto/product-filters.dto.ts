import { IsString, IsOptional, IsNumber, IsArray, IsEnum, Min } from 'class-validator';
import { Transform } from 'class-transformer';

export class ProductFiltersDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  categoryId?: string;

  @IsOptional()
  @IsEnum([0, 1])
  @Transform(({ value }) => value !== undefined ? parseInt(value) : undefined)
  status?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsEnum(['name', 'price', 'createdAt', 'priority'])
  sortBy?: 'name' | 'price' | 'createdAt' | 'priority';

  @IsOptional()
  @IsEnum(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc';

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Transform(({ value }) => parseInt(value))
  page?: number = 1;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Transform(({ value }) => parseInt(value))
  limit?: number = 50;

  @IsOptional()
  @IsString()
  companyId?: string;
}