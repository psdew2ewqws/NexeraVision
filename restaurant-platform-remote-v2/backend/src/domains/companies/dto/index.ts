import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum, IsBoolean, IsNumber, Min, Max } from 'class-validator';
import { CompanyStatus } from '@prisma/client';

export class CreateCompanyDto {
  @ApiProperty({ description: 'Company name' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Company slug (unique identifier)' })
  @IsString()
  slug: string;

  @ApiProperty({ description: 'Company logo URL', required: false })
  @IsOptional()
  @IsString()
  logo?: string;

  @ApiProperty({ description: 'Business type', default: 'restaurant' })
  @IsOptional()
  @IsString()
  businessType?: string;

  @ApiProperty({ description: 'Timezone', default: 'Asia/Amman' })
  @IsOptional()
  @IsString()
  timezone?: string;

  @ApiProperty({ description: 'Default currency', default: 'JOD' })
  @IsOptional()
  @IsString()
  defaultCurrency?: string;


  @ApiProperty({ description: 'License duration in months', default: 1, minimum: 1, maximum: 60 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(60)
  licenseDuration?: number;
}

export class UpdateCompanyDto {
  @ApiProperty({ description: 'Company name', required: false })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ description: 'Company logo URL', required: false })
  @IsOptional()
  @IsString()
  logo?: string;

  @ApiProperty({ description: 'Business type', required: false })
  @IsOptional()
  @IsString()
  businessType?: string;

  @ApiProperty({ description: 'Timezone', required: false })
  @IsOptional()
  @IsString()
  timezone?: string;

  @ApiProperty({ description: 'Default currency', required: false })
  @IsOptional()
  @IsString()
  defaultCurrency?: string;

  @ApiProperty({ description: 'Company status', required: false })
  @IsOptional()
  @IsEnum(CompanyStatus)
  status?: CompanyStatus;


  @ApiProperty({ description: 'License duration in months', minimum: 1, maximum: 60, required: false })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(60)
  licenseDuration?: number;
}

export class CompanyResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  slug: string;

  @ApiProperty()
  logo?: string;

  @ApiProperty()
  businessType?: string;

  @ApiProperty()
  timezone: string;

  @ApiProperty()
  defaultCurrency: string;

  @ApiProperty()
  status: CompanyStatus;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiProperty()
  branches?: any[];

  @ApiProperty()
  users?: any[];

  @ApiProperty()
  licenses?: any[];
}