import { IsString, IsNotEmpty, IsOptional, IsBoolean, IsInt, IsObject, IsEnum, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ModifierSelectionType } from '@prisma/client';

export class CreateModifierCategoryDto {
  @ApiProperty({
    description: 'Multi-language name object',
    example: { en: 'Size', ar: 'الحجم' }
  })
  @IsObject()
  @IsNotEmpty()
  name: Record<string, string>;

  @ApiPropertyOptional({
    description: 'Multi-language description object',
    example: { en: 'Choose your size', ar: 'اختر حجمك' }
  })
  @IsOptional()
  @IsObject()
  description?: Record<string, string>;

  @ApiProperty({
    description: 'Selection type for this modifier category',
    enum: ModifierSelectionType,
    example: ModifierSelectionType.single
  })
  @IsEnum(ModifierSelectionType)
  selectionType: ModifierSelectionType;

  @ApiProperty({
    description: 'Whether this modifier category is required',
    example: true
  })
  @IsBoolean()
  isRequired: boolean;

  @ApiProperty({
    description: 'Minimum number of selections required',
    example: 0
  })
  @IsInt()
  @Min(0)
  minSelections: number;

  @ApiProperty({
    description: 'Maximum number of selections allowed',
    example: 1
  })
  @IsInt()
  @Min(1)
  @Max(99)
  maxSelections: number;

  @ApiPropertyOptional({
    description: 'Display order number (lower = higher priority)',
    example: 1
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  displayNumber?: number;

  @ApiPropertyOptional({
    description: 'Category image URL',
    example: 'https://example.com/size-icon.png'
  })
  @IsOptional()
  @IsString()
  image?: string;

  @ApiPropertyOptional({
    description: 'Company ID (auto-assigned for non-super_admin users)'
  })
  @IsOptional()
  @IsString()
  companyId?: string;
}