import { IsOptional, IsEnum, IsString, IsNumber, IsObject, Min } from 'class-validator';
import { Transform } from 'class-transformer';
import { OrderStatus, PaymentStatus } from '@prisma/client';

export class UpdateOrderDto {
  @IsOptional()
  @IsEnum(OrderStatus)
  status?: OrderStatus;

  @IsOptional()
  @IsString()
  customerName?: string;

  @IsOptional()
  @IsString()
  customerPhone?: string;

  @IsOptional()
  @IsString()
  customerEmail?: string;

  @IsOptional()
  @IsObject()
  deliveryAddress?: any;

  @IsOptional()
  @IsObject()
  items?: any;

  @IsOptional()
  @IsNumber()
  @Min(0)
  totalAmount?: number;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsString()
  paymentMethod?: string;

  @IsOptional()
  @IsEnum(PaymentStatus)
  paymentStatus?: PaymentStatus;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;

  @IsOptional()
  @Transform(({ value }) => value ? new Date(value) : undefined)
  estimatedDeliveryTime?: Date;

  @IsOptional()
  @Transform(({ value }) => value ? new Date(value) : undefined)
  actualDeliveryTime?: Date;
}