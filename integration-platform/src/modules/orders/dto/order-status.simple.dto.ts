import { IsEnum, IsOptional, IsString, IsObject } from 'class-validator';
import { OrderStatus } from '@prisma/client';

export class OrderStatusUpdateDto {
  @IsEnum(OrderStatus)
  status: OrderStatus;

  @IsOptional()
  @IsString()
  eventType?: string;

  @IsOptional()
  @IsObject()
  eventData?: Record<string, any>;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class BulkStatusUpdateDto {
  @IsString({ each: true })
  orderIds: string[];

  @IsEnum(OrderStatus)
  status: OrderStatus;

  @IsOptional()
  @IsString()
  eventType?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}