import { IsString, IsNumber, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateJordanLocationDto {
  @ApiProperty({ example: 'Amman', description: 'Governorate name' })
  @IsString()
  governorate: string;

  @ApiProperty({ example: 'Amman', description: 'City name' })
  @IsString()
  city: string;

  @ApiProperty({ example: 'Abdali', required: false, description: 'District name' })
  @IsOptional()
  @IsString()
  district?: string;

  @ApiProperty({ example: 'Downtown', description: 'Area name in English' })
  @IsString()
  areaNameEn: string;

  @ApiProperty({ example: 'وسط البلد', description: 'Area name in Arabic' })
  @IsString()
  areaNameAr: string;

  @ApiProperty({ example: '11181', required: false, description: 'Postal code' })
  @IsOptional()
  @IsString()
  postalCode?: string;

  @ApiProperty({ example: 2, description: '1=easy, 2=normal, 3=hard, 4=very_hard, 5=restricted' })
  @IsNumber()
  deliveryDifficulty: number;

  @ApiProperty({ example: 3.00, description: 'Average delivery fee in JOD' })
  @IsNumber()
  averageDeliveryFee: number;

  @ApiProperty({ example: 31.9539, required: false, description: 'Latitude' })
  @IsOptional()
  @IsNumber()
  lat?: number;

  @ApiProperty({ example: 35.9106, required: false, description: 'Longitude' })
  @IsOptional()
  @IsNumber()
  lng?: number;

  @ApiProperty({ example: true, required: false, description: 'Is location active' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}