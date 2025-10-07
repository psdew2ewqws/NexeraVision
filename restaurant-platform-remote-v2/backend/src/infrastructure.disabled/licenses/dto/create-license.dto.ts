import { IsString, IsOptional, IsInt, IsArray, IsEnum, Min, Max, IsBoolean, IsJSON } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';


export class CreateLicenseDto {
  @ApiProperty({
    description: 'Company ID to assign the license to',
    example: 'comp_123abc'
  })
  @IsString()
  companyId: string;


  @ApiPropertyOptional({
    description: 'License duration in days',
    example: 365,
    default: 30
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(3650) // Max 10 years
  durationDays?: number = 30;


  @ApiPropertyOptional({
    description: 'List of enabled features',
    example: ['advanced_pos', 'analytics', 'delivery_integration'],
    default: ['basic_features']
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  features?: string[] = ['basic_features'];

  @ApiPropertyOptional({
    description: 'Pricing information as JSON',
    example: { monthly: 99, yearly: 999, setup_fee: 0 }
  })
  @IsOptional()
  pricing?: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Auto-renew license when it expires',
    example: false,
    default: false
  })
  @IsOptional()
  @IsBoolean()
  autoRenew?: boolean = false;
}