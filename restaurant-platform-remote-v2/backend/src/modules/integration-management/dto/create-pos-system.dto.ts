import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsBoolean, IsOptional, IsObject, IsEnum } from 'class-validator';

export enum POSProvider {
  SQUARE = 'square',
  CLOVER = 'clover',
  TOAST = 'toast',
  LIGHTSPEED = 'lightspeed',
  NCR = 'ncr',
  MICROS = 'micros',
  CUSTOM = 'custom',
}

export class CreatePOSSystemDto {
  @ApiProperty({ description: 'POS system name' })
  @IsString()
  name: string;

  @ApiProperty({ enum: POSProvider, description: 'POS provider' })
  @IsEnum(POSProvider)
  provider: POSProvider;

  @ApiProperty({ description: 'API endpoint URL', required: false })
  @IsOptional()
  @IsString()
  apiEndpoint?: string;

  @ApiProperty({ description: 'API credentials', required: false })
  @IsOptional()
  @IsObject()
  credentials?: Record<string, any>;

  @ApiProperty({ description: 'Is system active', default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiProperty({ description: 'Configuration settings', required: false })
  @IsOptional()
  @IsObject()
  config?: Record<string, any>;
}