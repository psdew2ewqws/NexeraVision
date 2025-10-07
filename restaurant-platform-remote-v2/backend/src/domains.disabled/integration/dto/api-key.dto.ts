import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsArray, IsOptional, IsNumber, IsEnum, IsDateString, Min, Max, IsNotEmpty, ArrayNotEmpty } from 'class-validator';

export class CreateApiKeyDto {
  @ApiProperty({ description: 'Friendly name for the API key', example: 'Production Integration' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    description: 'API scopes/permissions',
    example: ['orders:read', 'orders:write', 'webhooks:manage'],
    isArray: true,
  })
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  scopes: string[];

  @ApiPropertyOptional({
    description: 'Rate limit (requests per minute)',
    example: 100,
    minimum: 10,
    maximum: 1000,
  })
  @IsOptional()
  @IsNumber()
  @Min(10)
  @Max(1000)
  rateLimit?: number;

  @ApiPropertyOptional({
    description: 'Expiration date (ISO 8601)',
    example: '2025-12-31T23:59:59Z',
  })
  @IsOptional()
  @IsDateString()
  expiresAt?: string;

  @ApiPropertyOptional({
    description: 'Additional metadata',
    example: { environment: 'production', owner: 'tech-team' },
  })
  @IsOptional()
  metadata?: Record<string, any>;
}

export class UpdateApiKeyDto {
  @ApiPropertyOptional({ description: 'Update friendly name' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: 'Update API scopes' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  scopes?: string[];

  @ApiPropertyOptional({ description: 'Update rate limit' })
  @IsOptional()
  @IsNumber()
  @Min(10)
  @Max(1000)
  rateLimit?: number;

  @ApiPropertyOptional({
    description: 'Update status',
    enum: ['active', 'revoked'],
  })
  @IsOptional()
  @IsEnum(['active', 'revoked'])
  status?: 'active' | 'revoked';

  @ApiPropertyOptional({ description: 'Update metadata' })
  @IsOptional()
  metadata?: Record<string, any>;
}

export class ApiKeyResponseDto {
  @ApiProperty({ description: 'API key ID' })
  id: string;

  @ApiProperty({ description: 'Friendly name' })
  name: string;

  @ApiProperty({ description: 'API key (only shown once on creation)' })
  key?: string;

  @ApiProperty({ description: 'Key prefix for identification' })
  keyPrefix: string;

  @ApiProperty({ description: 'Company ID' })
  companyId: string;

  @ApiProperty({ description: 'Scopes/permissions' })
  scopes: string[];

  @ApiProperty({ description: 'Rate limit per minute' })
  rateLimit: number;

  @ApiProperty({ description: 'Status', enum: ['active', 'revoked', 'expired'] })
  status: string;

  @ApiPropertyOptional({ description: 'Expiration date' })
  expiresAt?: Date;

  @ApiPropertyOptional({ description: 'Last used timestamp' })
  lastUsedAt?: Date;

  @ApiProperty({ description: 'Total usage count' })
  usageCount: number;

  @ApiProperty({ description: 'Created at' })
  createdAt: Date;

  @ApiProperty({ description: 'Updated at' })
  updatedAt: Date;
}

export class ApiKeyUsageResponseDto {
  @ApiProperty({ description: 'Total requests' })
  totalRequests: number;

  @ApiProperty({ description: 'Successful requests' })
  successfulRequests: number;

  @ApiProperty({ description: 'Failed requests' })
  failedRequests: number;

  @ApiProperty({ description: 'Success rate percentage' })
  successRate: number;

  @ApiPropertyOptional({ description: 'Last used timestamp' })
  lastUsed?: Date;

  @ApiProperty({ description: 'Average response time (ms)' })
  averageResponseTime: number;

  @ApiProperty({
    description: 'Requests by endpoint',
    example: { '/api/integration/v1/orders': 150, '/api/integration/v1/webhooks': 25 },
  })
  requestsByEndpoint: Record<string, number>;

  @ApiProperty({
    description: 'Daily request statistics',
    isArray: true,
  })
  requestsByDay: Array<{
    date: string;
    count: number;
  }>;
}
