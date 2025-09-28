import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, IsOptional, IsObject, IsArray } from 'class-validator';
import { Type } from 'class-transformer';

export class SelectOptimalVendorDto {
  @ApiProperty({ description: 'Order ID for vendor selection' })
  @IsString()
  orderId: string;

  @ApiProperty({ description: 'Branch ID' })
  @IsString()
  branchId: string;

  @ApiProperty({ description: 'Order total amount' })
  @Type(() => Number)
  @IsNumber()
  orderAmount: number;

  @ApiProperty({ description: 'Customer location coordinates' })
  @IsObject()
  customerLocation: {
    latitude: number;
    longitude: number;
  };

  @ApiProperty({ description: 'Selection criteria weights', required: false })
  @IsOptional()
  @IsObject()
  criteriaWeights?: {
    cost?: number;
    time?: number;
    reliability?: number;
    quality?: number;
  };

  @ApiProperty({ description: 'Excluded vendors', required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  excludeVendors?: string[];
}