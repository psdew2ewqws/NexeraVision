import { IsString, IsNotEmpty, IsOptional, IsNumber, IsEnum, IsEmail, IsPhoneNumber, IsObject, Min, IsArray, ValidateNested } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { Provider, PaymentStatus } from '@prisma/client';

class OrderItemDto {
  @IsString()
  @IsNotEmpty()
  id: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsNumber()
  @Min(1)
  quantity: number;

  @IsNumber()
  @Min(0)
  unitPrice: number;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsArray()
  modifiers?: any[];

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

class DeliveryAddressDto {
  @IsString()
  @IsNotEmpty()
  street: string;

  @IsString()
  @IsNotEmpty()
  city: string;

  @IsOptional()
  @IsString()
  state?: string;

  @IsOptional()
  @IsString()
  postalCode?: string;

  @IsString()
  @IsNotEmpty()
  country: string;

  @IsOptional()
  @IsString()
  building?: string;

  @IsOptional()
  @IsString()
  floor?: string;

  @IsOptional()
  @IsString()
  instructions?: string;

  @IsOptional()
  @IsNumber()
  latitude?: number;

  @IsOptional()
  @IsNumber()
  longitude?: number;
}

export class CreateOrderDto {
  @IsString()
  @IsNotEmpty()
  externalOrderId: string;

  @IsEnum(Provider)
  provider: Provider;

  @IsString()
  @IsNotEmpty()
  clientId: string;

  @IsOptional()
  @IsString()
  customerName?: string;

  @IsOptional()
  @IsPhoneNumber()
  customerPhone?: string;

  @IsOptional()
  @IsEmail()
  customerEmail?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => DeliveryAddressDto)
  deliveryAddress?: DeliveryAddressDto;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items: OrderItemDto[];

  @IsNumber()
  @Min(0)
  totalAmount: number;

  @IsOptional()
  @IsString()
  currency?: string = 'USD';

  @IsOptional()
  @IsString()
  paymentMethod?: string;

  @IsOptional()
  @IsEnum(PaymentStatus)
  paymentStatus?: PaymentStatus = PaymentStatus.PENDING;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;

  @IsOptional()
  @Transform(({ value }) => value ? new Date(value) : undefined)
  estimatedDeliveryTime?: Date;
}