import { IsString, IsOptional, IsDecimal, IsNumber } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ValidatePromotionCodeDto {
  @ApiProperty({ description: 'Promotion code to validate' })
  @IsString()
  code: string;

  @ApiPropertyOptional({ description: 'Customer ID (if logged in)' })
  @IsOptional()
  @IsString()
  customerId?: string;

  @ApiPropertyOptional({ description: 'Customer email (for guest orders)' })
  @IsOptional()
  @IsString()
  customerEmail?: string;

  @ApiPropertyOptional({ description: 'Customer phone (for call center orders)' })
  @IsOptional()
  @IsString()
  customerPhone?: string;

  @ApiProperty({ description: 'Order total amount' })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Transform(({ value }) => typeof value === 'string' ? parseFloat(value) : value)
  orderTotal: number;

  @ApiPropertyOptional({ description: 'Number of items in order', default: 1 })
  @IsOptional()
  @IsNumber()
  itemsCount?: number;

  @ApiProperty({ description: 'Platform making the request' })
  @IsString()
  platform: string;

  @ApiPropertyOptional({ description: 'Branch ID' })
  @IsOptional()
  @IsString()
  branchId?: string;

  @ApiPropertyOptional({ description: 'Product IDs in the order' })
  @IsOptional()
  @IsString({ each: true })
  productIds?: string[];

  @ApiPropertyOptional({ description: 'Category IDs in the order' })
  @IsOptional()
  @IsString({ each: true })
  categoryIds?: string[];
}