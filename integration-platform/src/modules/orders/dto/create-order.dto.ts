import { IsString, IsNotEmpty, IsOptional, IsNumber, IsEnum, IsEmail, IsPhoneNumber, IsObject, Min, IsArray, ValidateNested } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { Provider, PaymentStatus } from '@prisma/client';
// import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class OrderItemDto {
  @ApiProperty({ description: 'Item identifier' })
  @IsString()
  @IsNotEmpty()
  id: string;

  @ApiProperty({ description: 'Item name' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: 'Item quantity', minimum: 1 })
  @IsNumber()
  @Min(1)
  quantity: number;

  @ApiProperty({ description: 'Unit price' })
  @IsNumber()
  @Min(0)
  unitPrice: number;

  @ApiPropertyOptional({ description: 'Item description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Item modifiers or customizations' })
  @IsOptional()
  @IsArray()
  modifiers?: any[];

  @ApiPropertyOptional({ description: 'Item-specific metadata' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

class DeliveryAddressDto {
  @ApiProperty({ description: 'Street address' })
  @IsString()
  @IsNotEmpty()
  street: string;

  @ApiProperty({ description: 'City' })
  @IsString()
  @IsNotEmpty()
  city: string;

  @ApiPropertyOptional({ description: 'State or province' })
  @IsOptional()
  @IsString()
  state?: string;

  @ApiPropertyOptional({ description: 'Postal code' })
  @IsOptional()
  @IsString()
  postalCode?: string;

  @ApiProperty({ description: 'Country' })
  @IsString()
  @IsNotEmpty()
  country: string;

  @ApiPropertyOptional({ description: 'Building or apartment number' })
  @IsOptional()
  @IsString()
  building?: string;

  @ApiPropertyOptional({ description: 'Floor number' })
  @IsOptional()
  @IsString()
  floor?: string;

  @ApiPropertyOptional({ description: 'Additional delivery instructions' })
  @IsOptional()
  @IsString()
  instructions?: string;

  @ApiPropertyOptional({ description: 'Latitude coordinate' })
  @IsOptional()
  @IsNumber()
  latitude?: number;

  @ApiPropertyOptional({ description: 'Longitude coordinate' })
  @IsOptional()
  @IsNumber()
  longitude?: number;
}

export class CreateOrderDto {
  @ApiProperty({ description: 'External order ID from the provider', example: 'CRM-12345' })
  @IsString()
  @IsNotEmpty()
  externalOrderId: string;

  @ApiProperty({ description: 'Delivery provider', enum: Provider })
  @IsEnum(Provider)
  provider: Provider;

  @ApiProperty({ description: 'Client ID for multi-tenant isolation' })
  @IsString()
  @IsNotEmpty()
  clientId: string;

  @ApiPropertyOptional({ description: 'Customer name' })
  @IsOptional()
  @IsString()
  customerName?: string;

  @ApiPropertyOptional({ description: 'Customer phone number' })
  @IsOptional()
  @IsPhoneNumber()
  customerPhone?: string;

  @ApiPropertyOptional({ description: 'Customer email address' })
  @IsOptional()
  @IsEmail()
  customerEmail?: string;

  @ApiPropertyOptional({ description: 'Delivery address information', type: DeliveryAddressDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => DeliveryAddressDto)
  deliveryAddress?: DeliveryAddressDto;

  @ApiProperty({ description: 'Order items', type: [OrderItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items: OrderItemDto[];

  @ApiProperty({ description: 'Total order amount', minimum: 0 })
  @IsNumber()
  @Min(0)
  totalAmount: number;

  @ApiPropertyOptional({ description: 'Currency code', default: 'USD' })
  @IsOptional()
  @IsString()
  currency?: string = 'USD';

  @ApiPropertyOptional({ description: 'Payment method used' })
  @IsOptional()
  @IsString()
  paymentMethod?: string;

  @ApiPropertyOptional({ description: 'Payment status', enum: PaymentStatus, default: PaymentStatus.PENDING })
  @IsOptional()
  @IsEnum(PaymentStatus)
  paymentStatus?: PaymentStatus = PaymentStatus.PENDING;

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
}