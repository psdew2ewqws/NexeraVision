import { IsOptional, IsEnum, IsDateString, IsString, IsArray, IsNumber, Min, Max } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { Provider } from '@prisma/client';

export enum TimePeriod {
  HOUR = 'hour',
  DAY = 'day',
  WEEK = 'week',
  MONTH = 'month',
  QUARTER = 'quarter',
  YEAR = 'year',
}

export enum MetricType {
  ORDER_VOLUME = 'order_volume',
  REVENUE = 'revenue',
  AOV = 'average_order_value',
  COMPLETION_RATE = 'completion_rate',
  CANCELLATION_RATE = 'cancellation_rate',
  CUSTOMER_BEHAVIOR = 'customer_behavior',
  GEOGRAPHIC_DISTRIBUTION = 'geographic_distribution',
  PEAK_TIMES = 'peak_times',
  PROVIDER_PERFORMANCE = 'provider_performance',
}

export enum SortDirection {
  ASC = 'asc',
  DESC = 'desc',
}

export class BaseAnalyticsQueryDto {
  @ApiProperty({
    description: 'Start date for the analytics query (ISO string)',
    example: '2024-01-01T00:00:00.000Z',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiProperty({
    description: 'End date for the analytics query (ISO string)',
    example: '2024-12-31T23:59:59.999Z',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiProperty({
    description: 'Provider to filter by',
    enum: Provider,
    required: false,
  })
  @IsOptional()
  @IsEnum(Provider)
  provider?: Provider;

  @ApiProperty({
    description: 'Client ID to filter by',
    example: 'client-123',
    required: false,
  })
  @IsOptional()
  @IsString()
  clientId?: string;

  @ApiProperty({
    description: 'Time period for grouping data',
    enum: TimePeriod,
    default: TimePeriod.DAY,
    required: false,
  })
  @IsOptional()
  @IsEnum(TimePeriod)
  period?: TimePeriod = TimePeriod.DAY;

  @ApiProperty({
    description: 'Currency for financial metrics',
    example: 'USD',
    default: 'USD',
    required: false,
  })
  @IsOptional()
  @IsString()
  currency?: string = 'USD';
}

export class OrderVolumeQueryDto extends BaseAnalyticsQueryDto {
  @ApiProperty({
    description: 'Include breakdown by status',
    default: false,
    required: false,
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  includeStatusBreakdown?: boolean = false;

  @ApiProperty({
    description: 'Include hourly distribution',
    default: false,
    required: false,
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  includeHourlyDistribution?: boolean = false;
}

export class RevenueQueryDto extends BaseAnalyticsQueryDto {
  @ApiProperty({
    description: 'Include revenue trends over time',
    default: true,
    required: false,
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  includeTrends?: boolean = true;

  @ApiProperty({
    description: 'Include breakdown by payment method',
    default: false,
    required: false,
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  includePaymentMethods?: boolean = false;

  @ApiProperty({
    description: 'Include comparison with previous period',
    default: false,
    required: false,
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  includePreviousPeriodComparison?: boolean = false;
}

export class ProviderPerformanceQueryDto extends BaseAnalyticsQueryDto {
  @ApiProperty({
    description: 'Include delivery time analysis',
    default: true,
    required: false,
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  includeDeliveryTimes?: boolean = true;

  @ApiProperty({
    description: 'Include peak order times',
    default: true,
    required: false,
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  includePeakTimes?: boolean = true;

  @ApiProperty({
    description: 'Include customer satisfaction metrics',
    default: false,
    required: false,
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  includeCustomerSatisfaction?: boolean = false;
}

export class CustomerBehaviorQueryDto extends BaseAnalyticsQueryDto {
  @ApiProperty({
    description: 'Minimum order count for customer inclusion',
    default: 1,
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  minOrderCount?: number = 1;

  @ApiProperty({
    description: 'Maximum number of top customers to return',
    default: 100,
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(1000)
  topCustomersLimit?: number = 100;

  @ApiProperty({
    description: 'Include customer segmentation analysis',
    default: false,
    required: false,
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  includeSegmentation?: boolean = false;
}

export class GeographicDistributionQueryDto extends BaseAnalyticsQueryDto {
  @ApiProperty({
    description: 'Minimum order count for location inclusion',
    default: 5,
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  minOrderCount?: number = 5;

  @ApiProperty({
    description: 'Maximum number of locations to return',
    default: 50,
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(500)
  maxLocations?: number = 50;

  @ApiProperty({
    description: 'Include revenue density analysis',
    default: false,
    required: false,
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  includeRevenueDensity?: boolean = false;
}

export class PeakTimesQueryDto extends BaseAnalyticsQueryDto {
  @ApiProperty({
    description: 'Include day of week analysis',
    default: true,
    required: false,
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  includeDayOfWeek?: boolean = true;

  @ApiProperty({
    description: 'Include seasonal patterns',
    default: false,
    required: false,
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  includeSeasonalPatterns?: boolean = false;

  @ApiProperty({
    description: 'Time zone for hour calculations',
    example: 'UTC',
    default: 'UTC',
    required: false,
  })
  @IsOptional()
  @IsString()
  timezone?: string = 'UTC';
}

export class MultiMetricQueryDto extends BaseAnalyticsQueryDto {
  @ApiProperty({
    description: 'List of metrics to include in the response',
    enum: MetricType,
    isArray: true,
    required: true,
  })
  @IsArray()
  @IsEnum(MetricType, { each: true })
  metrics: MetricType[];

  @ApiProperty({
    description: 'Include detailed breakdown for each metric',
    default: false,
    required: false,
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  includeDetails?: boolean = false;
}

export class ComparisonQueryDto extends BaseAnalyticsQueryDto {
  @ApiProperty({
    description: 'Comparison start date (ISO string)',
    example: '2023-01-01T00:00:00.000Z',
    required: true,
  })
  @IsDateString()
  comparisonStartDate: string;

  @ApiProperty({
    description: 'Comparison end date (ISO string)',
    example: '2023-12-31T23:59:59.999Z',
    required: true,
  })
  @IsDateString()
  comparisonEndDate: string;

  @ApiProperty({
    description: 'Metrics to compare',
    enum: MetricType,
    isArray: true,
    required: true,
  })
  @IsArray()
  @IsEnum(MetricType, { each: true })
  metrics: MetricType[];
}

export class RealTimeMetricsQueryDto {
  @ApiProperty({
    description: 'Time window in minutes for real-time data',
    default: 60,
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(1440) // Max 24 hours
  timeWindowMinutes?: number = 60;

  @ApiProperty({
    description: 'Provider to filter by',
    enum: Provider,
    required: false,
  })
  @IsOptional()
  @IsEnum(Provider)
  provider?: Provider;

  @ApiProperty({
    description: 'Include order status distribution',
    default: true,
    required: false,
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  includeStatusDistribution?: boolean = true;

  @ApiProperty({
    description: 'Include active order count',
    default: true,
    required: false,
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  includeActiveOrders?: boolean = true;
}

export class AlertConfigDto {
  @ApiProperty({
    description: 'Metric to monitor',
    enum: MetricType,
    required: true,
  })
  @IsEnum(MetricType)
  metric: MetricType;

  @ApiProperty({
    description: 'Threshold value for alerts',
    required: true,
  })
  @Type(() => Number)
  @IsNumber()
  threshold: number;

  @ApiProperty({
    description: 'Alert condition (above or below threshold)',
    enum: ['above', 'below'],
    required: true,
  })
  @IsEnum(['above', 'below'])
  condition: 'above' | 'below';

  @ApiProperty({
    description: 'Time window for alert evaluation in minutes',
    default: 15,
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(1440)
  timeWindowMinutes?: number = 15;

  @ApiProperty({
    description: 'Provider to monitor (optional)',
    enum: Provider,
    required: false,
  })
  @IsOptional()
  @IsEnum(Provider)
  provider?: Provider;
}

export class ExportQueryDto extends BaseAnalyticsQueryDto {
  @ApiProperty({
    description: 'Export format',
    enum: ['csv', 'json', 'xlsx'],
    default: 'csv',
    required: false,
  })
  @IsOptional()
  @IsEnum(['csv', 'json', 'xlsx'])
  format?: 'csv' | 'json' | 'xlsx' = 'csv';

  @ApiProperty({
    description: 'Metrics to include in export',
    enum: MetricType,
    isArray: true,
    required: true,
  })
  @IsArray()
  @IsEnum(MetricType, { each: true })
  metrics: MetricType[];

  @ApiProperty({
    description: 'Include raw data in export',
    default: false,
    required: false,
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  includeRawData?: boolean = false;
}

export class PaginationDto {
  @ApiProperty({
    description: 'Page number (1-based)',
    default: 1,
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiProperty({
    description: 'Number of items per page',
    default: 50,
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(1000)
  limit?: number = 50;

  @ApiProperty({
    description: 'Field to sort by',
    required: false,
  })
  @IsOptional()
  @IsString()
  sortBy?: string;

  @ApiProperty({
    description: 'Sort direction',
    enum: SortDirection,
    default: SortDirection.DESC,
    required: false,
  })
  @IsOptional()
  @IsEnum(SortDirection)
  sortDirection?: SortDirection = SortDirection.DESC;
}

// Helper function to parse date strings and create Date objects
export function parseDateRange(startDate?: string, endDate?: string): { start?: Date; end?: Date } {
  return {
    start: startDate ? new Date(startDate) : undefined,
    end: endDate ? new Date(endDate) : undefined,
  };
}

// Helper function to calculate comparison period
export function calculateComparisonPeriod(
  startDate: Date,
  endDate: Date
): { comparisonStart: Date; comparisonEnd: Date } {
  const periodLength = endDate.getTime() - startDate.getTime();
  const comparisonEnd = new Date(startDate.getTime() - 1);
  const comparisonStart = new Date(comparisonEnd.getTime() - periodLength);

  return {
    comparisonStart,
    comparisonEnd,
  };
}

// Helper function to validate time range
export function validateTimeRange(startDate?: Date, endDate?: Date): void {
  if (startDate && endDate && startDate >= endDate) {
    throw new Error('Start date must be before end date');
  }

  if (startDate && startDate > new Date()) {
    throw new Error('Start date cannot be in the future');
  }

  if (endDate && endDate > new Date()) {
    throw new Error('End date cannot be in the future');
  }

  // Limit to maximum 2 years of data
  if (startDate && endDate) {
    const maxPeriod = 2 * 365 * 24 * 60 * 60 * 1000; // 2 years in milliseconds
    if (endDate.getTime() - startDate.getTime() > maxPeriod) {
      throw new Error('Time range cannot exceed 2 years');
    }
  }
}