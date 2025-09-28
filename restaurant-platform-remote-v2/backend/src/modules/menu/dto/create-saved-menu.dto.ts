import { IsString, IsOptional, IsArray, IsEnum, IsUUID, IsNotEmpty, MaxLength, MinLength } from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateSavedMenuDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(100)
  @Transform(({ value }) => value?.trim())
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  @Transform(({ value }) => value?.trim())
  description?: string;

  @IsOptional()
  @IsEnum(['active', 'draft', 'archived'])
  status?: 'active' | 'draft' | 'archived';

  @IsOptional()
  @IsUUID()
  platformId?: string; // Optional platform association

  @IsOptional()
  @IsArray()
  @IsUUID(undefined, { each: true })
  productIds?: string[]; // Initial products to add to the saved menu

  @IsOptional()
  @IsString()
  companyId?: string; // For super_admin use
}