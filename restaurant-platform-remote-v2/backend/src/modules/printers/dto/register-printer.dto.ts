import { IsString, IsNotEmpty, IsOptional, IsArray, IsEnum, IsUUID, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export enum PrinterType {
  RECEIPT = 'receipt',
  KITCHEN = 'kitchen',
  LABEL = 'label',
  STANDARD = 'standard'
}

export enum PrinterStatus {
  ONLINE = 'online',
  OFFLINE = 'offline',
  BUSY = 'busy',
  ERROR = 'error'
}

export enum ConnectionType {
  USB = 'usb',
  NETWORK = 'network',
  LOCAL = 'local'
}

export class PrinterInfoDto {
  @ApiProperty({ description: 'Printer name' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: 'Printer type', enum: PrinterType })
  @IsEnum(PrinterType)
  type: PrinterType;

  @ApiProperty({ description: 'Printer status', enum: PrinterStatus })
  @IsEnum(PrinterStatus)
  status: PrinterStatus;

  @ApiProperty({ description: 'Connection type', enum: ConnectionType })
  @IsEnum(ConnectionType)
  connectionType: ConnectionType;

  @ApiProperty({ description: 'Device ID or path', required: false })
  @IsOptional()
  @IsString()
  deviceId?: string;

  @ApiProperty({ description: 'Network IP address', required: false })
  @IsOptional()
  @IsString()
  ipAddress?: string;

  @ApiProperty({ description: 'Printer port', required: false })
  @IsOptional()
  @IsString()
  port?: string;

  @ApiProperty({ description: 'Printer model', required: false })
  @IsOptional()
  @IsString()
  model?: string;

  @ApiProperty({ description: 'Printer manufacturer', required: false })
  @IsOptional()
  @IsString()
  manufacturer?: string;

  @ApiProperty({ description: 'Printer capabilities', required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  capabilities?: string[];
}

export class RegisterPrintersDto {
  @ApiProperty({ description: 'Branch ID where printers were discovered' })
  @IsString()
  @IsNotEmpty()
  @IsUUID('4', { message: 'Branch ID must be a valid UUID' })
  branchId: string;

  @ApiProperty({ description: 'Array of discovered printers', type: [PrinterInfoDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PrinterInfoDto)
  printers: PrinterInfoDto[];

  @ApiProperty({ description: 'Desktop app version', required: false })
  @IsOptional()
  @IsString()
  appVersion?: string;

  @ApiProperty({ description: 'Discovery timestamp', required: false })
  @IsOptional()
  @IsString()
  timestamp?: string;
}