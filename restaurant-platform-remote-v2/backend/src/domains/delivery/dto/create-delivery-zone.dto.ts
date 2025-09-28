import { IsString, IsNumber, IsBoolean, IsOptional, IsJSON, ValidateNested, IsArray } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class CreateDeliveryZoneDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsString()
  branchId: string;

  @ApiProperty({ 
    example: { en: 'Downtown Amman', ar: 'وسط البلد عمان' },
    description: 'Multi-language zone name'
  })
  @IsJSON()
  zoneName: any;

  @ApiProperty({ example: 'downtown-amman', required: false })
  @IsOptional()
  @IsString()
  zoneNameSlug?: string;

  @ApiProperty({ example: 3.50, description: 'Delivery fee in JOD - set by company', required: false })
  @IsOptional()
  @IsNumber()
  deliveryFee?: number;

  @ApiProperty({ example: 45, description: 'Average delivery time in minutes - auto-calculated', required: false })
  @IsOptional()
  @IsNumber()
  averageDeliveryTimeMins?: number;

  @ApiProperty({ example: 2, description: '1=premium, 2=standard, 3=extended', required: false })
  @IsOptional()
  @IsNumber()
  priorityLevel?: number;

  @ApiProperty({ example: true, required: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiProperty({ 
    example: {
      type: 'Polygon',
      coordinates: [[[35.9106, 31.9539], [35.9206, 31.9539], [35.9206, 31.9639], [35.9106, 31.9639], [35.9106, 31.9539]]]
    },
    required: false,
    description: 'GeoJSON polygon for precise delivery area'
  })
  @IsOptional()
  polygon?: any;

  @ApiProperty({ example: 31.9539, required: false, description: 'Center latitude for circular zones' })
  @IsOptional()
  @IsNumber()
  centerLat?: number;

  @ApiProperty({ example: 35.9106, required: false, description: 'Center longitude for circular zones' })
  @IsOptional()
  @IsNumber()
  centerLng?: number;

  @ApiProperty({ example: 5.0, required: false, description: 'Radius in km for circular zones' })
  @IsOptional()
  @IsNumber()
  radius?: number;
}