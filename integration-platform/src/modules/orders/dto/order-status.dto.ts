import { IsEnum, IsOptional, IsString, IsObject } from 'class-validator';
import { OrderStatus } from '@prisma/client';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class OrderStatusUpdateDto {
  @ApiProperty({ description: 'New order status', enum: OrderStatus })
  @IsEnum(OrderStatus)
  status: OrderStatus;

  @ApiPropertyOptional({ description: 'Event type for tracking', example: 'STATUS_CHANGED' })
  @IsOptional()
  @IsString()
  eventType?: string;

  @ApiPropertyOptional({ description: 'Additional data associated with status change' })
  @IsOptional()
  @IsObject()
  eventData?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Notes about the status change' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class BulkStatusUpdateDto {
  @ApiProperty({ description: 'Array of order IDs to update' })
  @IsString({ each: true })
  orderIds: string[];

  @ApiProperty({ description: 'New status for all orders', enum: OrderStatus })
  @IsEnum(OrderStatus)
  status: OrderStatus;

  @ApiPropertyOptional({ description: 'Event type for tracking', example: 'BULK_STATUS_CHANGE' })
  @IsOptional()
  @IsString()
  eventType?: string;

  @ApiPropertyOptional({ description: 'Notes for the bulk update' })
  @IsOptional()
  @IsString()
  notes?: string;
}