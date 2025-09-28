import { IsOptional, IsNumber, IsUUID } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class DiscoverPrintersDto {
  @ApiPropertyOptional({ 
    description: 'Discovery timeout in milliseconds',
    minimum: 1000,
    maximum: 30000,
    default: 10000 
  })
  @IsOptional()
  @IsNumber()
  timeout?: number;

  @ApiPropertyOptional({ description: 'Company ID (super_admin only)' })
  @IsOptional()
  @IsUUID()
  companyId?: string;

  @ApiPropertyOptional({ description: 'Branch ID for discovery scope' })
  @IsOptional()
  @IsUUID()
  branchId?: string;
}