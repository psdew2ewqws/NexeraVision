import { IsString, IsNumber, IsBoolean, IsOptional, IsJSON, IsArray, IsUrl } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateDeliveryProviderDto {
  @ApiProperty({ example: 'dhub', description: 'Provider identifier' })
  @IsString()
  name: string;

  @ApiProperty({ 
    example: { en: 'DHUB Delivery', ar: 'دهب للتوصيل' },
    description: 'Multi-language display names'
  })
  @IsJSON()
  displayName: any;

  @ApiProperty({ example: 'https://jordon.dhub.pro/', required: false })
  @IsOptional()
  @IsUrl()
  apiBaseUrl?: string;

  @ApiProperty({ example: 'your-api-key-here', required: false })
  @IsOptional()
  @IsString()
  apiKey?: string;

  @ApiProperty({ example: true, required: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiProperty({ example: 1, description: 'Lower number = higher priority' })
  @IsNumber()
  priority: number;

  @ApiProperty({ 
    example: ['location-id-1', 'location-id-2'],
    description: 'Array of supported location IDs',
    required: false
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  supportedAreas?: string[];

  @ApiProperty({ example: 30, description: 'Average delivery time in minutes' })
  @IsNumber()
  avgDeliveryTime: number;

  @ApiProperty({ example: 2.00, description: 'Base delivery fee in JOD' })
  @IsNumber()
  baseFee: number;

  @ApiProperty({ example: 0.50, description: 'Fee per kilometer in JOD' })
  @IsNumber()
  feePerKm: number;

  @ApiProperty({ example: 15.00, description: 'Maximum delivery distance in km' })
  @IsNumber()
  maxDistance: number;

  @ApiProperty({ 
    example: { webhookUrl: 'https://example.com/webhook', timeout: 30000 },
    required: false,
    description: 'Provider-specific configuration'
  })
  @IsOptional()
  configuration?: any;
}