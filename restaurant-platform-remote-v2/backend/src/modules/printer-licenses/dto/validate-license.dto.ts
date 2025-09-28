import { IsString, IsNotEmpty, IsObject, IsOptional, Length, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class DeviceInfoDto {
  @ApiProperty({
    description: 'Unique device identifier',
    example: 'a1b2c3d4e5f6...'
  })
  @IsString()
  @IsNotEmpty()
  deviceId: string;

  @ApiProperty({
    description: 'Device hostname',
    example: 'restaurant-pos-01'
  })
  @IsString()
  @IsNotEmpty()
  hostname: string;

  @ApiProperty({
    description: 'Operating system platform',
    example: 'win32'
  })
  @IsString()
  @IsNotEmpty()
  platform: string;

  @ApiProperty({
    description: 'System architecture',
    example: 'x64'
  })
  @IsString()
  @IsNotEmpty()
  arch: string;

  @ApiProperty({
    description: 'Total memory in bytes',
    example: 8589934592
  })
  @IsOptional()
  totalmem?: number;

  @ApiProperty({
    description: 'Timestamp of validation',
    example: '2024-09-13T10:00:00.000Z'
  })
  @IsOptional()
  @IsString()
  timestamp?: string;
}

export class ValidateLicenseDto {
  @ApiProperty({
    description: 'Branch ID (used as license key) in UUID format',
    example: '40f863e7-b719-4142-8e94-724572002d9b'
  })
  @IsString()
  @IsNotEmpty()
  @IsUUID('4', { message: 'License key must be a valid UUID (branch ID)' })
  licenseKey: string;

  @ApiProperty({
    description: 'Device information for license binding',
    type: DeviceInfoDto
  })
  @IsObject()
  @IsNotEmpty()
  deviceInfo: DeviceInfoDto;
}