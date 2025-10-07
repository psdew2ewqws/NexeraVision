import { IsString, IsOptional, IsObject, IsEnum, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum WebhookEventType {
  ORDER_CREATED = 'order_created',
  ORDER_CONFIRMED = 'order_confirmed',
  ORDER_PICKED_UP = 'order_picked_up',
  ORDER_IN_TRANSIT = 'order_in_transit',
  ORDER_DELIVERED = 'order_delivered',
  ORDER_CANCELLED = 'order_cancelled',
  ORDER_FAILED = 'order_failed',
  DRIVER_ASSIGNED = 'driver_assigned',
  DRIVER_LOCATION_UPDATE = 'driver_location_update',
  PAYMENT_CONFIRMED = 'payment_confirmed',
  PAYMENT_FAILED = 'payment_failed'
}

export class WebhookPayloadDto {
  @ApiProperty({ 
    description: 'Provider type sending the webhook',
    enum: ['dhub', 'talabat', 'careem', 'careemexpress', 'jahez', 'deliveroo', 'yallow', 'jooddelivery', 'topdeliver', 'nashmi', 'tawasi', 'delivergy', 'utrac', 'local_delivery']
  })
  @IsString()
  providerType: string;

  @ApiProperty({ description: 'Event type from provider' })
  @IsEnum(WebhookEventType)
  eventType: WebhookEventType;

  @ApiProperty({ description: 'Provider order ID' })
  @IsString()
  providerOrderId: string;

  @ApiProperty({ description: 'Internal order ID (if available)' })
  @IsOptional()
  @IsString()
  internalOrderId?: string;

  @ApiProperty({ description: 'Event timestamp from provider' })
  @IsOptional()
  @IsString()
  timestamp?: string;

  @ApiProperty({ 
    description: 'Full webhook payload from provider',
    example: {
      order_id: 'DHUB-123456789',
      status: 'delivered',
      driver: {
        name: 'Ahmad Khaled',
        phone: '+962771234567',
        location: {
          lat: 31.905614,
          lng: 35.922546
        }
      },
      estimated_delivery_time: '2024-01-15T14:30:00Z',
      actual_delivery_time: '2024-01-15T14:25:00Z',
      delivery_fee: 3.50,
      notes: 'Left at door as requested'
    }
  })
  @IsObject()
  payload: Record<string, any>;

  @ApiProperty({ description: 'Webhook signature for verification' })
  @IsOptional()
  @IsString()
  signature?: string;

  @ApiProperty({ description: 'Provider webhook source IP' })
  @IsOptional()
  @IsString()
  sourceIp?: string;
}

export class ProcessWebhookResponseDto {
  @ApiProperty({ description: 'Processing success status' })
  success: boolean;

  @ApiProperty({ description: 'Response message' })
  message: string;

  @ApiProperty({ description: 'Internal order ID if found' })
  @IsOptional()
  orderId?: string;

  @ApiProperty({ description: 'Updated order status' })
  @IsOptional()
  orderStatus?: string;

  @ApiProperty({ description: 'Processing timestamp' })
  processedAt: string;

  @ApiProperty({ description: 'Log entry ID' })
  logId: string;
}