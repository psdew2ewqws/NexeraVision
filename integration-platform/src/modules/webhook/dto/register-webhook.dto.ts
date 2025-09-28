import {
  IsString,
  IsArray,
  IsUrl,
  IsOptional,
  IsObject,
  IsEnum,
  IsNotEmpty,
  ArrayMinSize,
  ValidateNested,
  IsBoolean,
  MaxLength,
  MinLength
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export enum SupportedProvider {
  CAREEM = 'careem',
  TALABAT = 'talabat',
  DELIVEROO = 'deliveroo',
  JAHEZ = 'jahez',
  UBER_EATS = 'uber_eats',
  FOODPANDA = 'foodpanda',
  POS_SYSTEM = 'pos_system',
}

export enum WebhookEventType {
  // Order events
  ORDER_CREATED = 'order.created',
  ORDER_UPDATED = 'order.updated',
  ORDER_CANCELLED = 'order.cancelled',
  ORDER_DELIVERED = 'order.delivered',
  ORDER_CONFIRMED = 'order.confirmed',
  ORDER_PREPARED = 'order.prepared',
  ORDER_PICKED_UP = 'order.picked_up',

  // Menu events
  MENU_UPDATED = 'menu.updated',
  ITEM_AVAILABILITY_CHANGED = 'item.availability_changed',

  // System events
  CONNECTION_TEST = 'connection.test',
  SYSTEM_ALERT = 'system.alert',

  // Provider specific events
  CAREEM_ORDER_NOTIFICATION = 'careem.order_notification',
  TALABAT_STATUS_UPDATE = 'talabat.status_update',
  DELIVEROO_ORDER_EVENT = 'deliveroo.order_event',
  JAHEZ_ORDER_ACTION = 'jahez.order_action',
}

export class WebhookHeaderDto {
  @ApiProperty({ description: 'Header name' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @ApiProperty({ description: 'Header value' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  value: string;
}

export class WebhookRetryConfigDto {
  @ApiProperty({ description: 'Maximum number of retry attempts', default: 3 })
  @IsOptional()
  @Type(() => Number)
  maxRetries?: number = 3;

  @ApiProperty({ description: 'Enable exponential backoff', default: true })
  @IsOptional()
  @IsBoolean()
  exponentialBackoff?: boolean = true;

  @ApiProperty({
    description: 'Initial retry delay in milliseconds',
    default: 1000
  })
  @IsOptional()
  @Type(() => Number)
  initialDelay?: number = 1000;

  @ApiProperty({
    description: 'Maximum retry delay in milliseconds',
    default: 30000
  })
  @IsOptional()
  @Type(() => Number)
  maxDelay?: number = 30000;
}

export class RegisterWebhookDto {
  @ApiProperty({
    description: 'Unique client identifier',
    example: 'restaurant-abc-123'
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(100)
  @Transform(({ value }) => value?.trim())
  clientId: string;

  @ApiProperty({
    enum: SupportedProvider,
    description: 'Provider for webhook integration'
  })
  @IsEnum(SupportedProvider)
  provider: SupportedProvider;

  @ApiProperty({
    description: 'Webhook endpoint URL',
    example: 'https://restaurant.example.com/webhooks/orders'
  })
  @IsUrl({
    protocols: ['https'],
    require_protocol: true,
    require_valid_protocol: true,
  })
  @MaxLength(2000)
  url: string;

  @ApiProperty({
    enum: WebhookEventType,
    isArray: true,
    description: 'Array of event types to subscribe to',
    example: [
      WebhookEventType.ORDER_CREATED,
      WebhookEventType.ORDER_UPDATED,
      WebhookEventType.ORDER_CANCELLED
    ]
  })
  @IsArray()
  @ArrayMinSize(1)
  @IsEnum(WebhookEventType, { each: true })
  events: WebhookEventType[];

  @ApiProperty({
    type: [WebhookHeaderDto],
    description: 'Optional custom headers to include in webhook requests',
    required: false
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WebhookHeaderDto)
  headers?: WebhookHeaderDto[];

  @ApiProperty({
    type: WebhookRetryConfigDto,
    description: 'Retry configuration for failed webhooks',
    required: false
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => WebhookRetryConfigDto)
  retryConfig?: WebhookRetryConfigDto;

  @ApiProperty({
    description: 'Optional description for the webhook',
    required: false,
    maxLength: 500
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiProperty({
    description: 'Enable webhook immediately after registration',
    default: true,
    required: false
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean = true;

  @ApiProperty({
    description: 'Additional metadata for the webhook',
    required: false,
    type: 'object'
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;

  @ApiProperty({
    description: 'Timeout for webhook requests in milliseconds',
    default: 30000,
    required: false
  })
  @IsOptional()
  @Type(() => Number)
  timeoutMs?: number = 30000;

  @ApiProperty({
    description: 'Enable signature validation for webhook security',
    default: true,
    required: false
  })
  @IsOptional()
  @IsBoolean()
  enableSignatureValidation?: boolean = true;
}

export class RegisterWebhookResponseDto {
  @ApiProperty({ description: 'Generated webhook ID' })
  webhookId: string;

  @ApiProperty({ description: 'Full webhook URL for the provider' })
  url: string;

  @ApiProperty({ description: 'Secret key for signature validation' })
  secretKey: string;

  @ApiProperty({ description: 'Webhook status' })
  status: string;

  @ApiProperty({ description: 'Registration timestamp' })
  createdAt: string;

  @ApiProperty({ description: 'Client ID' })
  clientId: string;

  @ApiProperty({ description: 'Provider name' })
  provider: string;

  @ApiProperty({ description: 'Subscribed events' })
  events: string[];
}

export class UpdateWebhookDto {
  @ApiProperty({ description: 'Webhook endpoint URL', required: false })
  @IsOptional()
  @IsUrl({
    protocols: ['https'],
    require_protocol: true,
    require_valid_protocol: true,
  })
  @MaxLength(2000)
  url?: string;

  @ApiProperty({
    enum: WebhookEventType,
    isArray: true,
    description: 'Array of event types to subscribe to',
    required: false
  })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @IsEnum(WebhookEventType, { each: true })
  events?: WebhookEventType[];

  @ApiProperty({
    type: [WebhookHeaderDto],
    description: 'Custom headers to include in webhook requests',
    required: false
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WebhookHeaderDto)
  headers?: WebhookHeaderDto[];

  @ApiProperty({
    description: 'Enable or disable the webhook',
    required: false
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiProperty({
    type: WebhookRetryConfigDto,
    description: 'Retry configuration for failed webhooks',
    required: false
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => WebhookRetryConfigDto)
  retryConfig?: WebhookRetryConfigDto;

  @ApiProperty({
    description: 'Optional description for the webhook',
    required: false,
    maxLength: 500
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiProperty({
    description: 'Additional metadata for the webhook',
    required: false,
    type: 'object'
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;

  @ApiProperty({
    description: 'Timeout for webhook requests in milliseconds',
    required: false
  })
  @IsOptional()
  @Type(() => Number)
  timeoutMs?: number;

  @ApiProperty({
    description: 'Enable signature validation for webhook security',
    required: false
  })
  @IsOptional()
  @IsBoolean()
  enableSignatureValidation?: boolean;
}