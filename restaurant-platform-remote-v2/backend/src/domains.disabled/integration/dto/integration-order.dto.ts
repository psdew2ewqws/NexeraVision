import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsArray, IsOptional, IsNumber, IsEnum, IsNotEmpty, ArrayNotEmpty, ValidateNested, IsUUID } from 'class-validator';
import { Type } from 'class-transformer';

export class OrderItemDto {
  @ApiProperty({ description: 'Product ID', example: 'uuid-product-123' })
  @IsString()
  @IsNotEmpty()
  productId: string;

  @ApiProperty({ description: 'Quantity', example: 2 })
  @IsNumber()
  @IsNotEmpty()
  quantity: number;

  @ApiPropertyOptional({
    description: 'Product modifiers',
    example: ['extra-cheese', 'no-onions'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  modifiers?: string[];

  @ApiPropertyOptional({ description: 'Special instructions', example: 'Extra sauce on the side' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ description: 'Unit price override' })
  @IsOptional()
  @IsNumber()
  price?: number;
}

export class CreateIntegrationOrderDto {
  @ApiProperty({ description: 'Branch ID where order is placed' })
  @IsString()
  @IsNotEmpty()
  branchId: string;

  @ApiPropertyOptional({ description: 'External order ID from partner system', example: 'UBER-123456' })
  @IsOptional()
  @IsString()
  externalOrderId?: string;

  @ApiPropertyOptional({
    description: 'Order source/provider',
    example: 'uber_eats',
    enum: ['uber_eats', 'deliveroo', 'careem', 'talabat', 'api'],
  })
  @IsOptional()
  @IsEnum(['uber_eats', 'deliveroo', 'careem', 'talabat', 'api'])
  source?: string;

  @ApiProperty({
    description: 'Order type',
    enum: ['delivery', 'pickup', 'dine_in'],
    example: 'delivery',
  })
  @IsEnum(['delivery', 'pickup', 'dine_in'])
  @IsNotEmpty()
  orderType: string;

  @ApiProperty({
    description: 'Order items',
    type: [OrderItemDto],
  })
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items: OrderItemDto[];

  @ApiPropertyOptional({ description: 'Customer name', example: 'John Doe' })
  @IsOptional()
  @IsString()
  customerName?: string;

  @ApiPropertyOptional({ description: 'Customer phone', example: '+971501234567' })
  @IsOptional()
  @IsString()
  customerPhone?: string;

  @ApiPropertyOptional({ description: 'Customer email', example: 'john@example.com' })
  @IsOptional()
  @IsString()
  customerEmail?: string;

  @ApiPropertyOptional({ description: 'Delivery address' })
  @IsOptional()
  @IsString()
  deliveryAddress?: string;

  @ApiPropertyOptional({ description: 'Delivery instructions' })
  @IsOptional()
  @IsString()
  deliveryInstructions?: string;

  @ApiPropertyOptional({ description: 'Scheduled delivery time (ISO 8601)' })
  @IsOptional()
  @IsString()
  scheduledFor?: string;

  @ApiPropertyOptional({
    description: 'Payment method',
    enum: ['cash', 'card', 'online', 'wallet'],
  })
  @IsOptional()
  @IsEnum(['cash', 'card', 'online', 'wallet'])
  paymentMethod?: string;

  @ApiPropertyOptional({ description: 'Additional metadata' })
  @IsOptional()
  metadata?: Record<string, any>;
}

export class UpdateOrderStatusDto {
  @ApiProperty({
    description: 'New order status',
    enum: ['confirmed', 'preparing', 'ready', 'out_for_delivery', 'delivered', 'cancelled'],
  })
  @IsEnum(['confirmed', 'preparing', 'ready', 'out_for_delivery', 'delivered', 'cancelled'])
  @IsNotEmpty()
  status: string;

  @ApiPropertyOptional({ description: 'Status update reason/notes' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ description: 'Estimated preparation/delivery time in minutes' })
  @IsOptional()
  @IsNumber()
  estimatedTime?: number;
}

export class IntegrationOrderResponseDto {
  @ApiProperty({ description: 'Order ID' })
  id: string;

  @ApiProperty({ description: 'Order number for display' })
  orderNumber: string;

  @ApiProperty({ description: 'Branch ID' })
  branchId: string;

  @ApiPropertyOptional({ description: 'External order ID' })
  externalOrderId?: string;

  @ApiProperty({ description: 'Order source/provider' })
  source: string;

  @ApiProperty({ description: 'Order type' })
  orderType: string;

  @ApiProperty({ description: 'Current status' })
  status: string;

  @ApiProperty({ description: 'Order items' })
  items: any[];

  @ApiProperty({ description: 'Total amount' })
  totalAmount: number;

  @ApiPropertyOptional({ description: 'Customer information' })
  customer?: {
    name?: string;
    phone?: string;
    email?: string;
  };

  @ApiPropertyOptional({ description: 'Delivery details' })
  delivery?: {
    address?: string;
    instructions?: string;
    scheduledFor?: Date;
  };

  @ApiProperty({ description: 'Created at' })
  createdAt: Date;

  @ApiProperty({ description: 'Updated at' })
  updatedAt: Date;
}

export class OrderEventResponseDto {
  @ApiProperty({ description: 'Event ID' })
  id: string;

  @ApiProperty({ description: 'Order ID' })
  orderId: string;

  @ApiProperty({ description: 'Event type', example: 'status_changed' })
  eventType: string;

  @ApiProperty({ description: 'Event data' })
  data: any;

  @ApiProperty({ description: 'Created at' })
  createdAt: Date;

  @ApiPropertyOptional({ description: 'Created by user ID' })
  createdBy?: string;
}
