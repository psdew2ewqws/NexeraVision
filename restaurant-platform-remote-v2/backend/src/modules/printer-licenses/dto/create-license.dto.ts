import { IsString, IsNotEmpty, IsEnum, IsOptional, IsArray, IsNumber, IsDateString, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { PrinterLicenseStatus } from '@prisma/client';

export class CreatePrinterLicenseDto {
  @ApiProperty({
    description: 'License key in format XXXX-XXXX-XXXX-XXXX',
    example: 'PROD-PRINT-2024-0001'
  })
  @IsString()
  @IsNotEmpty()
  licenseKey: string;

  @ApiProperty({
    description: 'Branch ID this license is assigned to',
    example: 'uuid-branch-id'
  })
  @IsUUID()
  @IsNotEmpty()
  branchId: string;

  @ApiProperty({
    description: 'License status',
    enum: PrinterLicenseStatus,
    default: 'active'
  })
  @IsEnum(PrinterLicenseStatus)
  @IsOptional()
  status?: PrinterLicenseStatus = PrinterLicenseStatus.active;

  @ApiProperty({
    description: 'License expiry date',
    example: '2025-09-13T00:00:00.000Z'
  })
  @IsOptional()
  @IsDateString()
  expiresAt?: string;

  @ApiProperty({
    description: 'Available features for this license',
    example: ['printer_management', 'receipt_printing', 'kitchen_orders'],
    isArray: true
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  features?: string[];

  @ApiProperty({
    description: 'Maximum number of printers allowed',
    example: 10,
    default: 5
  })
  @IsOptional()
  @IsNumber()
  maxPrinters?: number = 5;
}