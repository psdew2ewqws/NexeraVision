import { IsArray, IsString, IsEnum, IsOptional, IsNumber, IsBoolean, IsObject } from 'class-validator';

export class BulkStatusUpdateDto {
  @IsArray()
  @IsString({ each: true })
  productIds: string[];

  @IsEnum([0, 1])
  status: number;
}

export class BulkDeleteDto {
  @IsArray()
  @IsString({ each: true })
  productIds: string[];
}

export class CreateCategoryDto {
  @IsObject()
  name: { en?: string; ar?: string; [key: string]: string };

  @IsOptional()
  @IsObject()
  description?: { en?: string; ar?: string; [key: string]: string };

  @IsOptional()
  @IsString()
  image?: string;

  @IsOptional()
  @IsNumber()
  displayNumber?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  companyId?: string;
}