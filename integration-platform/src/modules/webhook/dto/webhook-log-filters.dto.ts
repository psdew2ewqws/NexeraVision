import { IsOptional, IsString, IsNumber, IsDateString, IsEnum, Min, Max } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export enum WebhookLogStatus {
  PENDING = 'pending',
  DELIVERED = 'delivered',
  FAILED = 'failed',
  RETRYING = 'retrying',
}

export enum WebhookLogSortBy {
  CREATED_AT = 'createdAt',
  RESPONSE_TIME_MS = 'responseTimeMs',
  STATUS = 'status',
}

export enum SortOrder {
  ASC = 'asc',
  DESC = 'desc',
}

export class WebhookLogFiltersDto {
  @ApiProperty({ required: false, description: 'Configuration ID to filter by' })
  @IsOptional()
  @IsString()
  configurationId?: string;

  @ApiProperty({ required: false, description: 'Event type to filter by' })
  @IsOptional()
  @IsString()
  eventType?: string;

  @ApiProperty({
    required: false,
    enum: WebhookLogStatus,
    description: 'Webhook status to filter by'
  })
  @IsOptional()
  @IsEnum(WebhookLogStatus)
  status?: WebhookLogStatus;

  @ApiProperty({ required: false, description: 'Event ID to filter by' })
  @IsOptional()
  @IsString()
  eventId?: string;

  @ApiProperty({ required: false, description: 'Correlation ID to filter by' })
  @IsOptional()
  @IsString()
  correlationId?: string;

  @ApiProperty({ required: false, description: 'Start date for filtering (ISO string)' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiProperty({ required: false, description: 'End date for filtering (ISO string)' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiProperty({ required: false, description: 'Minimum response time in milliseconds' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  minResponseTime?: number;

  @ApiProperty({ required: false, description: 'Maximum response time in milliseconds' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  maxResponseTime?: number;

  @ApiProperty({ required: false, description: 'HTTP status code to filter by' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(100)
  @Max(599)
  httpStatusCode?: number;

  @ApiProperty({ required: false, default: 1, description: 'Page number for pagination' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiProperty({ required: false, default: 50, description: 'Number of items per page' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(1000)
  limit?: number = 50;

  @ApiProperty({
    required: false,
    enum: WebhookLogSortBy,
    default: WebhookLogSortBy.CREATED_AT,
    description: 'Field to sort by'
  })
  @IsOptional()
  @IsEnum(WebhookLogSortBy)
  sortBy?: WebhookLogSortBy = WebhookLogSortBy.CREATED_AT;

  @ApiProperty({
    required: false,
    enum: SortOrder,
    default: SortOrder.DESC,
    description: 'Sort order'
  })
  @IsOptional()
  @IsEnum(SortOrder)
  sortOrder?: SortOrder = SortOrder.DESC;
}