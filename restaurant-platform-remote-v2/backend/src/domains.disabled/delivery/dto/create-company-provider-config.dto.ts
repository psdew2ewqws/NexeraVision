import { IsString, IsObject, IsBoolean, IsOptional, IsUUID, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum ProviderType {
  DHUB = 'dhub',
  TALABAT = 'talabat', 
  CAREEM = 'careem',
  CAREEMEXPRESS = 'careemexpress',
  JAHEZ = 'jahez',
  DELIVEROO = 'deliveroo',
  YALLOW = 'yallow',
  JOODDELIVERY = 'jooddelivery',
  TOPDELIVER = 'topdeliver',
  NASHMI = 'nashmi',
  TAWASI = 'tawasi',
  DELIVERGY = 'delivergy',
  UTRAC = 'utrac',
  LOCAL_DELIVERY = 'local_delivery'
}

export class CreateCompanyProviderConfigDto {
  @ApiProperty({ description: 'Company ID' })
  @IsUUID()
  companyId: string;

  @ApiProperty({ 
    description: 'Delivery provider type',
    enum: ProviderType 
  })
  @IsEnum(ProviderType)
  providerType: ProviderType;

  @ApiProperty({ 
    description: 'Provider configuration (API keys, URLs, etc.)',
    example: {
      apiKey: 'your_api_key',
      secretKey: 'your_secret_key',
      apiBaseUrl: 'https://api.provider.com',
      clientId: 'client_id',
      clientSecret: 'client_secret',
      brandId: 'brand_123',
      merchantId: 'merchant_456'
    }
  })
  @IsObject()
  configuration: Record<string, any>;

  @ApiProperty({ 
    description: 'Provider credentials (secure storage)',
    example: {
      username: 'api_username',
      password: 'api_password', 
      accessToken: 'bearer_token',
      refreshToken: 'refresh_token',
      tokenExpiresAt: '2024-12-31T23:59:59Z'
    }
  })
  @IsObject()
  credentials: Record<string, any>;

  @ApiProperty({ description: 'Is provider active for this company', default: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean = true;

  @ApiProperty({ description: 'Provider priority (1 = highest)', default: 1 })
  @IsOptional()
  priority?: number = 1;

  @ApiProperty({ description: 'Maximum delivery distance in KM', default: 15 })
  @IsOptional()
  maxDistance?: number = 15;

  @ApiProperty({ description: 'Base delivery fee', default: 2.5 })
  @IsOptional()
  baseFee?: number = 2.5;

  @ApiProperty({ description: 'Fee per kilometer', default: 0.5 })
  @IsOptional()
  feePerKm?: number = 0.5;

  @ApiProperty({ description: 'Average delivery time in minutes', default: 30 })
  @IsOptional()
  avgDeliveryTime?: number = 30;
}