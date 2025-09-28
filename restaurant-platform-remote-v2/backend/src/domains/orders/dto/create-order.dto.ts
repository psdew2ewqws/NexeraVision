import { IsString, IsEmail, IsOptional, IsEnum, IsArray, ValidateNested, IsNumber, IsDecimal, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum OrderType {
  delivery = 'delivery',
  pickup = 'pickup',
  dine_in = 'dine_in',
}

export enum PaymentMethod {
  cash = 'cash',
  card = 'card',
  online = 'online',
  wallet = 'wallet',
}

export class CreateOrderItemDto {
  @ApiProperty()
  @IsString()
  productId: string;

  @ApiProperty()
  @IsNumber()
  quantity: number;

  @ApiProperty()
  @IsDecimal()
  unitPrice: number;

  @ApiPropertyOptional()
  @IsOptional()
  modifiers?: any;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  specialRequests?: string;
}

export class CreateOrderDto {
  @ApiProperty()
  @IsString()
  branchId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  deliveryZoneId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  deliveryProviderId?: string;

  @ApiProperty()
  @IsString()
  customerName: string;

  @ApiProperty()
  @IsString()
  customerPhone: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  customerEmail?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  deliveryAddress?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  deliveryLat?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  deliveryLng?: number;

  @ApiProperty({ enum: OrderType })
  @IsEnum(OrderType)
  orderType: OrderType;

  @ApiProperty()
  @IsDecimal()
  subtotal: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDecimal()
  deliveryFee?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDecimal()
  taxAmount?: number;

  @ApiProperty()
  @IsDecimal()
  totalAmount: number;

  @ApiProperty({ enum: PaymentMethod })
  @IsEnum(PaymentMethod)
  paymentMethod: PaymentMethod;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  estimatedDeliveryTime?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  providerOrderId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  providerTrackingUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  driverInfo?: any;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({ type: [CreateOrderItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  orderItems: CreateOrderItemDto[];
}