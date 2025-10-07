import { PartialType } from '@nestjs/mapped-types';
import { IsOptional, IsEnum, IsInt, Min, Max, IsString } from 'class-validator';
import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';
import { CreateLicenseDto } from './create-license.dto';

export enum LicenseStatusEnum {
  ACTIVE = 'active',
  EXPIRED = 'expired',
  SUSPENDED = 'suspended',
  CANCELLED = 'cancelled'
}

export class UpdateLicenseDto extends PartialType(CreateLicenseDto) {
  @ApiPropertyOptional({
    description: 'License status',
    enum: LicenseStatusEnum,
    example: LicenseStatusEnum.ACTIVE
  })
  @IsOptional()
  @IsEnum(LicenseStatusEnum)
  status?: LicenseStatusEnum;

  @ApiPropertyOptional({
    description: 'Extend license by X days (adds to current expiry)',
    example: 30
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(365)
  extensionDays?: number;
}

export class ExtendLicenseDto {
  @ApiPropertyOptional({
    description: 'Number of days to extend the license',
    example: 90,
    default: 30
  })
  @IsInt()
  @Min(1)
  @Max(1095) // Max 3 years extension
  days: number = 30;
}

export class RenewLicenseDto {
  @ApiProperty({
    description: 'Renewal duration in days',
    example: 365,
    minimum: 1,
    maximum: 1095
  })
  @IsInt()
  @Min(1)
  @Max(1095) // Max 3 years
  durationDays: number;

  @ApiPropertyOptional({
    description: 'Company ID to renew license for (super_admin only)',
    example: 'dc3c6a10-96c6-4467-9778-313af66956af'
  })
  @IsOptional()
  @IsString()
  companyId?: string;

  @ApiProperty({
    description: 'Renewal amount in USD',
    example: 99.99
  })
  @IsOptional()
  @Min(0)
  amount?: number;

  @ApiPropertyOptional({
    description: 'Payment currency',
    example: 'USD',
    default: 'USD'
  })
  @IsOptional()
  @IsString()
  currency?: string = 'USD';

  @ApiPropertyOptional({
    description: 'Payment metadata',
    example: { plan: 'yearly', discount: '25%' }
  })
  @IsOptional()
  paymentMetadata?: Record<string, any>;
}