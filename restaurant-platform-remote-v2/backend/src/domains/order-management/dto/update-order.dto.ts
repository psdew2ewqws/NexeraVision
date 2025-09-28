import { IsString, IsOptional, IsEnum, IsDateString, IsDecimal } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PartialType } from '@nestjs/mapped-types';
import { CreateOrderDto } from './create-order.dto';

export enum OrderStatus {
  pending = 'pending',
  confirmed = 'confirmed',
  preparing = 'preparing',
  ready_for_pickup = 'ready_for_pickup',
  out_for_delivery = 'out_for_delivery',
  delivered = 'delivered',
  cancelled = 'cancelled',
  refunded = 'refunded',
}

export enum PaymentStatus {
  pending = 'pending',
  paid = 'paid',
  failed = 'failed',
  refunded = 'refunded',
}

export class UpdateOrderDto extends PartialType(CreateOrderDto) {
  @ApiPropertyOptional({ enum: OrderStatus })
  @IsOptional()
  @IsEnum(OrderStatus)
  status?: OrderStatus;

  @ApiPropertyOptional({ enum: PaymentStatus })
  @IsOptional()
  @IsEnum(PaymentStatus)
  paymentStatus?: PaymentStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  actualDeliveryTime?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  deliveredAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  cancelledAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  cancellationReason?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  providerTrackingUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  driverInfo?: any;
}

export class UpdateOrderStatusDto {
  @ApiPropertyOptional({ enum: OrderStatus })
  @IsEnum(OrderStatus)
  status: OrderStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  estimatedDeliveryTime?: string;

  @ApiPropertyOptional()
  @IsOptional()
  driverInfo?: any;
}