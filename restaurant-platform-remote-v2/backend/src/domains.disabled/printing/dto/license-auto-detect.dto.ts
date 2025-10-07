import { IsString, IsOptional, IsBoolean, IsNumber } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class LicenseAutoDetectDto {
  @ApiProperty({ 
    description: 'Branch ID used as license key for printer auto-detection',
    example: 'branch_12345'
  })
  @IsString()
  licenseKey: string;

  @ApiPropertyOptional({ 
    description: 'Timeout for detection process in milliseconds',
    default: 30000
  })
  @IsOptional()
  @IsNumber()
  timeout?: number;

  @ApiPropertyOptional({ 
    description: 'Force re-detection even if printers already exist for this license',
    default: false
  })
  @IsOptional()
  @IsBoolean()
  forceRedetection?: boolean;

  @ApiPropertyOptional({ 
    description: 'Auto-assign detected printers to delivery platforms',
    default: true
  })
  @IsOptional()
  @IsBoolean()
  autoAssignPlatforms?: boolean;
}

export class LicenseValidationDto {
  @ApiProperty({ 
    description: 'Branch ID to validate',
    example: 'branch_12345'
  })
  @IsString()
  licenseKey: string;
}