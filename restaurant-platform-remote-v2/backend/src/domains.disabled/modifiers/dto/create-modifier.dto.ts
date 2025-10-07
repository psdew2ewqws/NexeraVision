import { IsString, IsNotEmpty, IsOptional, IsBoolean, IsInt, IsObject, IsDecimal, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

export class CreateModifierDto {
  @ApiProperty({
    description: 'Modifier category ID this modifier belongs to'
  })
  @IsString()
  @IsNotEmpty()
  modifierCategoryId: string;

  @ApiProperty({
    description: 'Multi-language name object',
    example: { en: 'Large', ar: 'كبير' }
  })
  @IsObject()
  @IsNotEmpty()
  name: Record<string, string>;

  @ApiPropertyOptional({
    description: 'Multi-language description object',
    example: { en: 'Large size option', ar: 'خيار الحجم الكبير' }
  })
  @IsOptional()
  @IsObject()
  description?: Record<string, string>;

  @ApiProperty({
    description: 'Base price for this modifier in JOD',
    example: 2.50
  })
  @Transform(({ value }) => parseFloat(value))
  @IsDecimal({ decimal_digits: '0,2' })
  basePrice: number;

  @ApiPropertyOptional({
    description: 'Platform-specific pricing JSON',
    example: { talabat: 2.75, careem: 2.60, call_center: 2.50, website: 2.50 }
  })
  @IsOptional()
  @IsObject()
  pricing?: Record<string, number>;

  @ApiPropertyOptional({
    description: 'Cost price for this modifier',
    example: 1.20
  })
  @IsOptional()
  @Transform(({ value }) => parseFloat(value))
  @IsDecimal({ decimal_digits: '0,2' })
  cost?: number;

  @ApiPropertyOptional({
    description: 'Display order number (lower = higher priority)',
    example: 1
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  displayNumber?: number;

  @ApiProperty({
    description: 'Whether this modifier is selected by default',
    example: false
  })
  @IsBoolean()
  isDefault: boolean;

  @ApiPropertyOptional({
    description: 'Modifier image URL',
    example: 'https://example.com/large-size.png'
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