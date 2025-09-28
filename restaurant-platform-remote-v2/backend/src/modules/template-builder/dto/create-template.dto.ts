import { IsString, IsOptional, IsBoolean, IsArray, IsObject, IsUUID, ValidateNested, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CanvasSettingsDto {
  @IsInt()
  @Min(1)
  width: number;

  @IsInt()
  @Min(1)
  height: number;

  @IsString()
  paperType: string; // '58mm', '80mm', 'custom'

  @IsOptional()
  @IsObject()
  margins?: {
    top: number;
    bottom: number;
    left: number;
    right: number;
  };
}

export class PrintSettingsDto {
  @IsString()
  density: string; // 'low', 'medium', 'high'

  @IsString()
  encoding: string; // 'utf8', 'gb18030', 'big5'

  @IsOptional()
  @IsBoolean()
  autocut?: boolean;

  @IsOptional()
  @IsBoolean()
  cashdraw?: boolean;

  @IsOptional()
  @IsInt()
  copies?: number;
}

export class CreateTemplateDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsUUID()
  categoryId: string;

  @IsOptional()
  @IsUUID()
  branchId?: string;

  @IsOptional()
  @IsObject()
  designData?: any;

  @IsOptional()
  @ValidateNested()
  @Type(() => CanvasSettingsDto)
  canvasSettings?: CanvasSettingsDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => PrintSettingsDto)
  printSettings?: PrintSettingsDto;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;

  @IsOptional()
  @IsUUID()
  parentTemplateId?: string;
}