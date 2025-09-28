import { IsString, IsOptional, IsNumber, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { WebhookLogFiltersDto } from './webhook-log-filters.dto';

export class SearchWebhookLogsDto extends WebhookLogFiltersDto {
  @ApiProperty({ description: 'Search query to find in webhook logs' })
  @IsString()
  searchQuery: string;

  @ApiProperty({
    required: false,
    default: 50,
    description: 'Maximum number of results to return'
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(1000)
  limit?: number = 50;

  @ApiProperty({
    required: false,
    default: 1,
    description: 'Page number for pagination'
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;
}