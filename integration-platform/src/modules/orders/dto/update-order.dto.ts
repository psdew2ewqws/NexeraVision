import { IsOptional, IsEnum, IsString, IsNumber, IsObject, Min } from 'class-validator';
import { Transform } from 'class-transformer';
import { OrderStatus, PaymentStatus } from '@prisma/client';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateOrderDto {
  @ApiPropertyOptional({ description: 'Order status', enum: OrderStatus })
  @IsOptional()
  @IsEnum(OrderStatus)
  status?: OrderStatus;

  @ApiPropertyOptional({ description: 'Customer name' })
  @IsOptional()
  @IsString()
  customerName?: string;

  @ApiPropertyOptional({ description: 'Customer phone number' })
  @IsOptional()
  @IsString()
  customerPhone?: string;

  @ApiPropertyOptional({ description: 'Customer email address' })
  @IsOptional()
  @IsString()
  customerEmail?: string;

  @ApiPropertyOptional({ description: 'Delivery address information' })
  @IsOptional()
  @IsObject()
  deliveryAddress?: any;

  @ApiPropertyOptional({ description: 'Order items array' })
  @IsOptional()
  @IsObject()
  items?: any;

  @ApiPropertyOptional({ description: 'Total order amount', minimum: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  totalAmount?: number;

  @ApiPropertyOptional({ description: 'Currency code' })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional({ description: 'Payment method used' })
  @IsOptional()
  @IsString()
  paymentMethod?: string;

  @ApiPropertyOptional({ description: 'Payment status', enum: PaymentStatus })
  @IsOptional()
  @IsEnum(PaymentStatus)
  paymentStatus?: PaymentStatus;

  @ApiPropertyOptional({ description: 'Special instructions or notes' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ description: 'Provider-specific metadata' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Estimated delivery time' })
  @IsOptional()
  @Transform(({ value }) => value ? new Date(value) : undefined)
  estimatedDeliveryTime?: Date;

  @ApiPropertyOptional({ description: 'Actual delivery time' })
  @IsOptional()
  @Transform(({ value }) => value ? new Date(value) : undefined)
  actualDeliveryTime?: Date;
}