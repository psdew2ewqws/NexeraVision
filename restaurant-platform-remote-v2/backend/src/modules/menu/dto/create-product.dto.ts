import { IsString, IsNumber, IsOptional, IsArray, IsEnum, IsDecimal, ValidateNested, IsObject, IsBoolean } from 'class-validator';
import { Transform, Type } from 'class-transformer';

export class LocalizedTextDto {
  @IsOptional()
  @IsString()
  en?: string;

  @IsOptional()  
  @IsString()
  ar?: string;

  // Support for additional languages - properly typed
  @IsOptional()
  @IsString()
  tr?: string;

  @IsOptional()
  @IsString()
  fa?: string;

  @IsOptional()
  @IsString()
  ur?: string;

  @IsOptional()
  @IsString()
  ku?: string;

  @IsOptional()
  @IsString()
  fr?: string;

  @IsOptional()
  @IsString()
  de?: string;

  @IsOptional()
  @IsString()
  es?: string;

  @IsOptional()
  @IsString()
  ru?: string;

  // Catch-all for any additional languages
  [key: string]: string | undefined;
}

export class PricingChannelDto {
  @IsString()
  id: string;

  @IsString()
  name: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Transform(({ value }) => parseFloat(value))
  price: number;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}

export class PricingDto {
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Transform(({ value }) => parseFloat(value))
  talabat?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Transform(({ value }) => parseFloat(value))
  careem?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Transform(({ value }) => parseFloat(value))
  callcenter?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Transform(({ value }) => parseFloat(value))
  website?: number;

  // Support for custom channels
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PricingChannelDto)
  customChannels?: PricingChannelDto[];
}

export class CreateProductDto {
  @ValidateNested()
  @Type(() => LocalizedTextDto)
  name: LocalizedTextDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => LocalizedTextDto)
  description?: LocalizedTextDto;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Transform(({ value }) => parseFloat(value))
  basePrice: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Transform(({ value }) => parseFloat(value))
  cost?: number;

  @ValidateNested()
  @Type(() => PricingDto)
  pricing: PricingDto;

  @IsString()
  categoryId: string;

  @IsOptional()
  @IsString()
  image?: string; // Primary image for backward compatibility

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => parseInt(value))
  preparationTimeOverride?: number;

  @IsOptional()
  @IsBoolean()
  calculatePreparationTime?: boolean;

  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => parseInt(value))
  priority?: number; // Lower number = higher priority (1 = first position)

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images?: string[];

  @IsOptional()
  @IsEnum([0, 1])
  @Transform(({ value }) => parseInt(value))
  status?: number;

  @IsOptional()
  @IsString()
  companyId?: string;

  // Add-ons will be handled in next step
  @IsOptional()
  @IsBoolean()
  hasAddons?: boolean;

  @IsOptional()
  @IsArray()
  addonIds?: string[];
}