import { IsString, IsOptional, IsEnum, MinLength, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateCompanyDto {
  @ApiProperty({ example: 'Pizza Palace' })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name: string;

  @ApiProperty({ example: 'pizza-palace' })
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  slug: string;

  @ApiProperty({ example: 'Restaurant', required: false })
  @IsOptional()
  @IsString()
  businessType?: string;

  @ApiProperty({ example: 'Asia/Amman', required: false })
  @IsOptional()
  @IsString()
  timezone?: string;

  @ApiProperty({ example: 'JOD', required: false })
  @IsOptional()
  @IsString()
  currency?: string;
}