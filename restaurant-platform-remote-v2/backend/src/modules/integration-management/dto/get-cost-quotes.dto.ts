import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, IsObject, IsOptional, IsArray } from 'class-validator';
import { Type } from 'class-transformer';

export class GetCostQuotesDto {
  @ApiProperty({ description: 'Branch ID' })
  @IsString()
  branchId: string;

  @ApiProperty({ description: 'Delivery location' })
  @IsObject()
  deliveryLocation: {
    latitude: number;
    longitude: number;
  };

  @ApiProperty({ description: 'Order amount for quote calculation' })
  @Type(() => Number)
  @IsNumber()
  orderAmount: number;

  @ApiProperty({ description: 'Delivery time preference', required: false })
  @IsOptional()
  @IsString()
  deliveryTime?: string;

  @ApiProperty({ description: 'Specific providers to get quotes from', required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  providers?: string[];
}