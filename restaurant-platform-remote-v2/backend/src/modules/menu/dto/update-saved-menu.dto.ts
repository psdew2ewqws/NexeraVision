import { IsString, IsOptional, IsEnum, IsUUID, MaxLength, MinLength } from 'class-validator';
import { Transform } from 'class-transformer';
import { PartialType } from '@nestjs/mapped-types';
import { CreateSavedMenuDto } from './create-saved-menu.dto';

export class UpdateSavedMenuDto extends PartialType(CreateSavedMenuDto) {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  @Transform(({ value }) => value?.trim())
  name?: string;

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
  platformId?: string;
}