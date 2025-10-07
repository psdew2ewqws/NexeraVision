import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsArray, IsOptional, IsUrl, IsEnum, IsObject, IsNumber, IsNotEmpty, ArrayNotEmpty, Min, Max } from 'class-validator';

export class CreateWebhookDto {
  @ApiProperty({ description: 'Webhook name', example: 'Order Status Updates' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: 'Webhook URL endpoint', example: 'https://api.partner.com/webhooks/orders' })
  @IsUrl()
  @IsNotEmpty()
  url: string;

  @ApiProperty({
    description: 'Events to subscribe to',
    example: ['order.created', 'order.updated', 'order.completed'],
    isArray: true,
  })
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  events: string[];

  @ApiPropertyOptional({
    description: 'Custom HTTP headers',
    example: { 'X-Partner-Token': 'secret123' },
  })
  @IsOptional()
  @IsObject()
  headers?: Record<string, string>;

  @ApiPropertyOptional({
    description: 'Maximum retry attempts',
    example: 3,
    minimum: 0,
    maximum: 10,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(10)
  maxRetries?: number;

  @ApiPropertyOptional({
    description: 'Retry delay in seconds',
    example: 60,
    minimum: 10,
    maximum: 3600,
  })
  @IsOptional()
  @IsNumber()
  @Min(10)
  @Max(3600)
  retryDelay?: number;

  @ApiPropertyOptional({ description: 'Additional metadata' })
  @IsOptional()
  metadata?: Record<string, any>;
}

export class UpdateWebhookDto {
  @ApiPropertyOptional({ description: 'Update webhook name' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: 'Update webhook URL' })
  @IsOptional()
  @IsUrl()
  url?: string;

  @ApiPropertyOptional({ description: 'Update subscribed events' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  events?: string[];

  @ApiPropertyOptional({ description: 'Update custom headers' })
  @IsOptional()
  @IsObject()
  headers?: Record<string, string>;

  @ApiPropertyOptional({
    description: 'Update status',
    enum: ['active', 'inactive'],
  })
  @IsOptional()
  @IsEnum(['active', 'inactive'])
  status?: 'active' | 'inactive';

  @ApiPropertyOptional({ description: 'Update retry policy' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(10)
  maxRetries?: number;

  @ApiPropertyOptional({ description: 'Update metadata' })
  @IsOptional()
  metadata?: Record<string, any>;
}

export class WebhookResponseDto {
  @ApiProperty({ description: 'Webhook ID' })
  id: string;

  @ApiProperty({ description: 'Company ID' })
  companyId: string;

  @ApiProperty({ description: 'Webhook name' })
  name: string;

  @ApiProperty({ description: 'Webhook URL' })
  url: string;

  @ApiProperty({ description: 'Subscribed events' })
  events: string[];

  @ApiProperty({ description: 'Status', enum: ['active', 'inactive', 'failed'] })
  status: string;

  @ApiProperty({ description: 'Retry policy configuration' })
  retryPolicy: {
    maxRetries: number;
    retryDelay: number;
    backoffMultiplier: number;
  };

  @ApiPropertyOptional({ description: 'Custom headers (secrets masked)' })
  headers?: Record<string, string>;

  @ApiProperty({ description: 'Created at' })
  createdAt: Date;

  @ApiProperty({ description: 'Updated at' })
  updatedAt: Date;

  @ApiPropertyOptional({ description: 'Last triggered timestamp' })
  lastTriggeredAt?: Date;

  @ApiProperty({ description: 'Consecutive failure count' })
  failureCount: number;
}

export class WebhookTestDto {
  @ApiPropertyOptional({
    description: 'Test event type',
    example: 'order.created',
  })
  @IsOptional()
  @IsString()
  event?: string;

  @ApiPropertyOptional({
    description: 'Test payload',
    example: { orderId: '123', status: 'confirmed' },
  })
  @IsOptional()
  payload?: any;
}

export class WebhookDeliveryResponseDto {
  @ApiProperty({ description: 'Delivery ID' })
  id: string;

  @ApiProperty({ description: 'Webhook ID' })
  webhookId: string;

  @ApiProperty({ description: 'Event type' })
  event: string;

  @ApiProperty({ description: 'Delivery status', enum: ['pending', 'success', 'failed', 'retrying'] })
  status: string;

  @ApiProperty({ description: 'Attempt number' })
  attempt: number;

  @ApiPropertyOptional({ description: 'Response status code' })
  responseStatusCode?: number;

  @ApiPropertyOptional({ description: 'Error message if failed' })
  error?: string;

  @ApiProperty({ description: 'Created at' })
  createdAt: Date;

  @ApiPropertyOptional({ description: 'Delivered at' })
  deliveredAt?: Date;

  @ApiPropertyOptional({ description: 'Next retry scheduled at' })
  nextRetryAt?: Date;
}
