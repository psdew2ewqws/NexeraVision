import { IsString, IsArray, IsUrl, IsOptional, IsEnum, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO for registering a new webhook endpoint
 *
 * @description Validates webhook registration data for external providers
 * @example
 * {
 *   "provider": "careem",
 *   "clientId": "123e4567-e89b-12d3-a456-426614174000",
 *   "url": "https://api.provider.com/webhooks",
 *   "events": ["order.created", "order.updated"],
 *   "companyId": "company-123"
 * }
 */
export class RegisterWebhookDto {
  @ApiProperty({
    description: 'Delivery provider name',
    example: 'careem',
    enum: ['careem', 'talabat', 'deliveroo', 'jahez', 'hungerstatiton'],
  })
  @IsString()
  @IsEnum(['careem', 'talabat', 'deliveroo', 'jahez', 'hungerstatiton'])
  provider: string;

  @ApiProperty({
    description: 'Client identifier for the provider',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsString()
  clientId: string;

  @ApiProperty({
    description: 'Webhook endpoint URL',
    example: 'https://api.provider.com/webhooks/orders',
  })
  @IsUrl()
  url: string;

  @ApiProperty({
    description: 'List of event types to subscribe to',
    example: ['order.created', 'order.updated', 'order.cancelled'],
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  events: string[];

  @ApiProperty({
    description: 'Company ID for multi-tenant support',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  companyId: string;

  @ApiProperty({
    description: 'Optional webhook description',
    example: 'Production webhook for order events',
    required: false,
  })
  @IsOptional()
  @IsString()
  description?: string;
}

/**
 * DTO for webhook log filters
 */
export class WebhookLogFiltersDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  provider?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  clientId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  startDate?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  endDate?: string;

  @ApiProperty({ default: 50 })
  @IsOptional()
  limit?: number;

  @ApiProperty({ default: 0 })
  @IsOptional()
  offset?: number;
}

/**
 * DTO for webhook stats query
 */
export class WebhookStatsDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  provider?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  clientId?: string;

  @ApiProperty({ default: '24h', enum: ['1h', '24h', '7d', '30d'] })
  @IsOptional()
  @IsString()
  period?: string;
}
