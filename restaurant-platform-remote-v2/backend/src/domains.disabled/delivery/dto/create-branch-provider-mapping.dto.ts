import { IsString, IsUUID, IsBoolean, IsOptional, IsObject, IsNumber } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateBranchProviderMappingDto {
  @ApiProperty({ description: 'Branch ID' })
  @IsUUID()
  branchId: string;

  @ApiProperty({ description: 'Company provider configuration ID' })
  @IsUUID()
  companyProviderConfigId: string;

  @ApiProperty({ 
    description: 'Provider-specific branch ID (e.g., Talabat branch ID, DHUB branch ID)',
    example: 'talabat_branch_12345' 
  })
  @IsString()
  providerBranchId: string;

  @ApiProperty({ 
    description: 'Provider-specific site ID (for food aggregators)',
    example: 'site_98765'
  })
  @IsString()
  @IsOptional()
  providerSiteId?: string;

  @ApiProperty({ 
    description: 'Branch-specific configuration override',
    example: {
      deliveryRadius: 12,
      minimumOrderAmount: 15.0,
      preparationTimeMinutes: 25,
      acceptsScheduledOrders: true,
      specialInstructions: 'Ring doorbell twice'
    }
  })
  @IsObject()
  @IsOptional()
  branchConfiguration?: Record<string, any>;

  @ApiProperty({ description: 'Is mapping active', default: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean = true;

  @ApiProperty({ description: 'Branch priority for this provider (1 = highest)', default: 1 })
  @IsNumber()
  @IsOptional()
  priority?: number = 1;

  @ApiProperty({ description: 'Minimum order value for this branch-provider combination' })
  @IsNumber()
  @IsOptional()
  minOrderValue?: number;

  @ApiProperty({ description: 'Maximum order value for this branch-provider combination' })
  @IsNumber()
  @IsOptional()
  maxOrderValue?: number;

  @ApiProperty({ 
    description: 'Supported payment methods for this mapping',
    example: ['cash', 'card', 'online', 'wallet']
  })
  @IsOptional()
  supportedPaymentMethods?: string[];
}