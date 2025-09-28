import { IsOptional, IsEnum, IsString, IsNumber, IsDateString, Min, Max } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { Provider, OrderStatus, PaymentStatus } from '@prisma/client';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class OrderFiltersDto {
  @ApiPropertyOptional({ description: 'Filter by provider', enum: Provider })
  @IsOptional()
  @IsEnum(Provider)
  provider?: Provider;

  @ApiPropertyOptional({ description: 'Filter by order status', enum: OrderStatus })
  @IsOptional()
  @IsEnum(OrderStatus)
  status?: OrderStatus;

  @ApiPropertyOptional({ description: 'Filter by payment status', enum: PaymentStatus })
  @IsOptional()
  @IsEnum(PaymentStatus)
  paymentStatus?: PaymentStatus;

  @ApiPropertyOptional({ description: 'Filter by client ID for multi-tenancy' })
  @IsOptional()
  @IsString()
  clientId?: string;

  @ApiPropertyOptional({ description: 'Search by customer name (partial match)' })
  @IsOptional()
  @IsString()
  customerName?: string;

  @ApiPropertyOptional({ description: 'Filter by customer phone number' })
  @IsOptional()
  @IsString()
  customerPhone?: string;

  @ApiPropertyOptional({ description: 'Filter by customer email' })
  @IsOptional()
  @IsString()
  customerEmail?: string;

  @ApiPropertyOptional({ description: 'Search by external order ID' })
  @IsOptional()
  @IsString()
  externalOrderId?: string;

  @ApiPropertyOptional({ description: 'Filter by minimum order amount' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  minAmount?: number;

  @ApiPropertyOptional({ description: 'Filter by maximum order amount' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  maxAmount?: number;

  @ApiPropertyOptional({ description: 'Filter orders created after this date', example: '2024-01-01T00:00:00Z' })
  @IsOptional()
  @IsDateString()
  createdAfter?: string;

  @ApiPropertyOptional({ description: 'Filter orders created before this date', example: '2024-12-31T23:59:59Z' })
  @IsOptional()
  @IsDateString()
  createdBefore?: string;

  @ApiPropertyOptional({ description: 'Filter by estimated delivery after this date', example: '2024-01-01T00:00:00Z' })
  @IsOptional()
  @IsDateString()
  deliveryAfter?: string;

  @ApiPropertyOptional({ description: 'Filter by estimated delivery before this date', example: '2024-12-31T23:59:59Z' })
  @IsOptional()
  @IsDateString()
  deliveryBefore?: string;

  @ApiPropertyOptional({ description: 'Page number for pagination', minimum: 1, default: 1 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Number of items per page', minimum: 1, maximum: 100, default: 20 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number = 20;

  @ApiPropertyOptional({ description: 'Sort field', enum: ['createdAt', 'totalAmount', 'estimatedDeliveryTime'], default: 'createdAt' })
  @IsOptional()
  @IsString()
  sortBy?: string = 'createdAt';

  @ApiPropertyOptional({ description: 'Sort order', enum: ['asc', 'desc'], default: 'desc' })
  @IsOptional()
  @IsString()
  sortOrder?: 'asc' | 'desc' = 'desc';

  @ApiPropertyOptional({ description: 'Include order events in response', default: false })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  includeEvents?: boolean = false;

  @ApiPropertyOptional({ description: 'Text search across order fields (name, phone, notes)' })
  @IsOptional()
  @IsString()
  search?: string;
}