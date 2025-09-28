import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsObject } from 'class-validator';

export class TestPOSConnectionDto {
  @ApiProperty({ description: 'Branch ID to test connection for', required: false })
  @IsOptional()
  @IsString()
  branchId?: string;

  @ApiProperty({ description: 'Test parameters', required: false })
  @IsOptional()
  @IsObject()
  testParams?: Record<string, any>;
}