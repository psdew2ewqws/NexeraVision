import {
  IsString,
  IsObject,
  IsOptional,
  IsEnum,
  IsNotEmpty,
  IsUUID,
  IsDateString,
  IsNumber,
  IsArray,
  ValidateNested,
  IsBoolean,
  MaxLength,
  Min,
  Max
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export enum EventProvider {
  CAREEM = 'careem',
  TALABAT = 'talabat',
  DELIVEROO = 'deliveroo',
  JAHEZ = 'jahez',
  UBER_EATS = 'uber_eats',
  FOODPANDA = 'foodpanda',
  POS_SYSTEM = 'pos_system',
  INTERNAL = 'internal',
}

export enum EventType {
  ORDER_CREATED = 'order.created',
  ORDER_UPDATED = 'order.updated',
  ORDER_CANCELLED = 'order.cancelled',
  ORDER_DELIVERED = 'order.delivered',
  ORDER_CONFIRMED = 'order.confirmed',
  ORDER_PREPARED = 'order.prepared',
  ORDER_PICKED_UP = 'order.picked_up',
  MENU_UPDATED = 'menu.updated',
  ITEM_AVAILABILITY_CHANGED = 'item.availability_changed',
  CONNECTION_TEST = 'connection.test',
  SYSTEM_ALERT = 'system.alert',
}

export enum OrderStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  PREPARING = 'preparing',
  READY = 'ready',
  PICKED_UP = 'picked_up',
  DELIVERED = 'delivered',
  CANCELLED = 'cancelled',
  REFUNDED = 'refunded',
}

export class CustomerDto {
  @ApiProperty({ description: 'Customer ID' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  id?: string;

  @ApiProperty({ description: 'Customer name' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  name?: string;

  @ApiProperty({ description: 'Customer phone number' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  phone?: string;

  @ApiProperty({ description: 'Customer email' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  email?: string;

  @ApiProperty({ description: 'Customer address' })
  @IsOptional()
  @IsObject()
  address?: {
    street?: string;
    city?: string;
    country?: string;
    postalCode?: string;
    coordinates?: {
      latitude: number;
      longitude: number;
    };
  };
}

export class OrderItemDto {
  @ApiProperty({ description: 'Item ID' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  id: string;

  @ApiProperty({ description: 'Item name' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(300)
  name: string;

  @ApiProperty({ description: 'Item quantity' })
  @IsNumber()
  @Min(1)
  @Max(999)
  quantity: number;

  @ApiProperty({ description: 'Item unit price' })
  @IsNumber()
  @Min(0)
  unitPrice: number;

  @ApiProperty({ description: 'Item total price' })
  @IsNumber()
  @Min(0)
  totalPrice: number;

  @ApiProperty({ description: 'Item modifiers/customizations', required: false })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => Object)
  modifiers?: Array<{
    id: string;
    name: string;
    price: number;
  }>;

  @ApiProperty({ description: 'Special instructions', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  specialInstructions?: string;
}

export class OrderPaymentDto {
  @ApiProperty({ description: 'Payment method' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  method: string;

  @ApiProperty({ description: 'Payment status' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  status: string;

  @ApiProperty({ description: 'Payment amount' })
  @IsNumber()
  @Min(0)
  amount: number;

  @ApiProperty({ description: 'Currency code' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(3)
  currency: string;

  @ApiProperty({ description: 'Transaction ID', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  transactionId?: string;

  @ApiProperty({ description: 'Payment timestamp', required: false })
  @IsOptional()
  @IsDateString()
  paidAt?: string;
}

export class OrderDto {
  @ApiProperty({ description: 'Order ID' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  id: string;

  @ApiProperty({ description: 'External order reference' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  externalId?: string;

  @ApiProperty({ description: 'Order status', enum: OrderStatus })
  @IsEnum(OrderStatus)
  status: OrderStatus;

  @ApiProperty({ description: 'Order total amount' })
  @IsNumber()
  @Min(0)
  totalAmount: number;

  @ApiProperty({ description: 'Currency code' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(3)
  currency: string;

  @ApiProperty({ description: 'Order creation timestamp' })
  @IsDateString()
  createdAt: string;

  @ApiProperty({ description: 'Expected delivery time', required: false })
  @IsOptional()
  @IsDateString()
  expectedDeliveryAt?: string;

  @ApiProperty({ description: 'Customer information' })
  @ValidateNested()
  @Type(() => CustomerDto)
  customer: CustomerDto;

  @ApiProperty({ description: 'Order items', type: [OrderItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items: OrderItemDto[];

  @ApiProperty({ description: 'Payment information', required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => OrderPaymentDto)
  payment?: OrderPaymentDto;

  @ApiProperty({ description: 'Delivery fee', required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  deliveryFee?: number;

  @ApiProperty({ description: 'Service fee', required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  serviceFee?: number;

  @ApiProperty({ description: 'Tax amount', required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  taxAmount?: number;

  @ApiProperty({ description: 'Discount amount', required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  discountAmount?: number;

  @ApiProperty({ description: 'Order notes', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;

  @ApiProperty({ description: 'Additional metadata', required: false })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class MenuItemDto {
  @ApiProperty({ description: 'Menu item ID' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  id: string;

  @ApiProperty({ description: 'Item name' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(300)
  name: string;

  @ApiProperty({ description: 'Item availability status' })
  @IsBoolean()
  isAvailable: boolean;

  @ApiProperty({ description: 'Item price', required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number;

  @ApiProperty({ description: 'Item category', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  category?: string;

  @ApiProperty({ description: 'Reason for unavailability', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  unavailabilityReason?: string;
}

export class WebhookEventDto {
  @ApiProperty({ description: 'Unique event ID' })
  @IsUUID()
  eventId: string;

  @ApiProperty({ description: 'Event type', enum: EventType })
  @IsEnum(EventType)
  eventType: EventType;

  @ApiProperty({ description: 'Event provider', enum: EventProvider })
  @IsEnum(EventProvider)
  provider: EventProvider;

  @ApiProperty({ description: 'Client/restaurant ID' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  clientId: string;

  @ApiProperty({ description: 'Event timestamp' })
  @IsDateString()
  timestamp: string;

  @ApiProperty({ description: 'API version' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  version: string;

  @ApiProperty({ description: 'Correlation ID for tracking', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  correlationId?: string;

  @ApiProperty({ description: 'Event signature for validation', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  signature?: string;

  @ApiProperty({ description: 'Order data for order events', required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => OrderDto)
  order?: OrderDto;

  @ApiProperty({ description: 'Menu item data for menu events', required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => MenuItemDto)
  menuItem?: MenuItemDto;

  @ApiProperty({ description: 'Array of menu items for bulk updates', required: false })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MenuItemDto)
  menuItems?: MenuItemDto[];

  @ApiProperty({ description: 'Event payload data' })
  @IsObject()
  data: Record<string, any>;

  @ApiProperty({ description: 'Additional metadata', required: false })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;

  @ApiProperty({ description: 'Previous state for update events', required: false })
  @IsOptional()
  @IsObject()
  previousState?: Record<string, any>;

  @ApiProperty({ description: 'Test event flag', required: false })
  @IsOptional()
  @IsBoolean()
  isTest?: boolean;

  @ApiProperty({ description: 'Event priority level', required: false })
  @IsOptional()
  @IsEnum(['low', 'normal', 'high', 'critical'])
  priority?: 'low' | 'normal' | 'high' | 'critical';
}

// Provider-specific event DTOs
export class CareemWebhookEventDto extends WebhookEventDto {
  @ApiProperty({ description: 'Careem-specific order reference' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  careemOrderId?: string;

  @ApiProperty({ description: 'Careem restaurant ID' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  restaurantId?: string;
}

export class TalabatWebhookEventDto extends WebhookEventDto {
  @ApiProperty({ description: 'Talabat-specific order reference' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  talabatOrderId?: string;

  @ApiProperty({ description: 'Talabat branch ID' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  branchId?: string;
}

export class DeliverooWebhookEventDto extends WebhookEventDto {
  @ApiProperty({ description: 'Deliveroo-specific order reference' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  deliverooOrderId?: string;

  @ApiProperty({ description: 'Deliveroo restaurant reference' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  restaurantReference?: string;
}

export class JahezWebhookEventDto extends WebhookEventDto {
  @ApiProperty({ description: 'Jahez-specific order reference' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  jahezOrderId?: string;

  @ApiProperty({ description: 'Jahez restaurant code' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  restaurantCode?: string;
}

// Webhook validation response DTO
export class WebhookValidationResponseDto {
  @ApiProperty({ description: 'Validation success status' })
  success: boolean;

  @ApiProperty({ description: 'Event ID that was processed' })
  eventId: string;

  @ApiProperty({ description: 'Response message' })
  message: string;

  @ApiProperty({ description: 'Processing timestamp' })
  processedAt: string;

  @ApiProperty({ description: 'Validation errors if any', required: false })
  @IsOptional()
  @IsArray()
  errors?: string[];

  @ApiProperty({ description: 'Additional response data', required: false })
  @IsOptional()
  @IsObject()
  data?: Record<string, any>;
}

// Webhook test event DTO
export class WebhookTestEventDto {
  @ApiProperty({ description: 'Client ID to send test event to' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  clientId: string;

  @ApiProperty({ description: 'Provider to simulate', enum: EventProvider })
  @IsEnum(EventProvider)
  provider: EventProvider;

  @ApiProperty({ description: 'Event type to simulate', enum: EventType })
  @IsEnum(EventType)
  eventType: EventType;

  @ApiProperty({ description: 'Custom test data', required: false })
  @IsOptional()
  @IsObject()
  testData?: Record<string, any>;
}