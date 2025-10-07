import { IsString, IsOptional, IsNumber, IsEnum, IsUUID, IsObject } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreatePrintJobDto {
  @ApiProperty({ description: 'Printer ID' })
  @IsUUID()
  printerId: string;

  @ApiProperty({ 
    enum: ['receipt', 'kitchen_order', 'label', 'test'], 
    description: 'Type of print job' 
  })
  @IsEnum(['receipt', 'kitchen_order', 'label', 'test'])
  type: 'receipt' | 'kitchen_order' | 'label' | 'test';

  @ApiProperty({ description: 'Print content data' })
  @IsObject()
  content: any;

  @ApiPropertyOptional({ description: 'Related order ID' })
  @IsOptional()
  @IsString()
  orderId?: string;

  @ApiPropertyOptional({ 
    description: 'Job priority (1 = highest, 10 = lowest)',
    minimum: 1,
    maximum: 10,
    default: 5 
  })
  @IsOptional()
  @IsNumber()
  priority?: number;
}