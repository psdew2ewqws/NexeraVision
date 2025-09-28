import { IsString, IsOptional, IsBoolean, IsNumber, IsEnum, IsArray, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreatePrinterDto {
  @ApiProperty({ description: 'Printer name' })
  @IsString()
  name: string;

  @ApiProperty({ 
    enum: ['thermal', 'receipt', 'kitchen', 'label'], 
    description: 'Type of printer' 
  })
  @IsEnum(['thermal', 'receipt', 'kitchen', 'label'])
  type: 'thermal' | 'receipt' | 'kitchen' | 'label';

  @ApiProperty({ 
    enum: ['network', 'usb', 'bluetooth'], 
    description: 'Connection type' 
  })
  @IsEnum(['network', 'usb', 'bluetooth'])
  connection: 'network' | 'usb' | 'bluetooth';

  @ApiPropertyOptional({ description: 'Printer IP address (for network printers)' })
  @IsOptional()
  @IsString()
  ip?: string;

  @ApiPropertyOptional({ description: 'Printer port (default: 9100)', default: 9100 })
  @IsOptional()
  @IsNumber()
  port?: number;

  @ApiPropertyOptional({ description: 'Printer manufacturer' })
  @IsOptional()
  @IsString()
  manufacturer?: string;

  @ApiPropertyOptional({ description: 'Printer model' })
  @IsOptional()
  @IsString()
  model?: string;

  @ApiPropertyOptional({ description: 'Physical location of printer' })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiPropertyOptional({ description: 'Paper width in mm' })
  @IsOptional()
  @IsNumber()
  paperWidth?: number;

  @ApiProperty({ 
    enum: ['kitchen', 'cashier', 'bar', 'all'], 
    description: 'Assignment target',
    default: 'cashier'
  })
  @IsEnum(['kitchen', 'cashier', 'bar', 'all'])
  assignedTo: 'kitchen' | 'cashier' | 'bar' | 'all';

  @ApiPropertyOptional({ description: 'Set as default printer', default: false })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @ApiPropertyOptional({ description: 'Printer capabilities', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  capabilities?: string[];

  @ApiPropertyOptional({ description: 'Company ID (super_admin only)' })
  @IsOptional()
  @IsUUID()
  companyId?: string;

  @ApiPropertyOptional({ description: 'Branch ID' })
  @IsOptional()
  @IsUUID()
  branchId?: string;
}