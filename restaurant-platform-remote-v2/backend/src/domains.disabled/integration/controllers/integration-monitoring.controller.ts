import {
  Controller,
  Get,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { Public } from '../../../common/decorators/public.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { BaseUser } from '../../../shared/common/services/base.service';
import { IntegrationMonitoringService } from '../services/integration-monitoring.service';

@ApiTags('Integration - Monitoring')
@Controller('integration/v1/monitoring')
export class IntegrationMonitoringController {
  constructor(
    private readonly integrationMonitoringService: IntegrationMonitoringService,
  ) {}

  @Get('health')
  @Public()
  @ApiOperation({
    summary: 'Integration health check',
    description: 'Check the health status of integration services',
  })
  @ApiResponse({
    status: 200,
    description: 'Health status',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', enum: ['healthy', 'degraded', 'down'] },
        timestamp: { type: 'string', format: 'date-time' },
        services: {
          type: 'object',
          properties: {
            webhooks: {
              type: 'object',
              properties: {
                status: { type: 'string' },
                activeWebhooks: { type: 'number' },
                failedWebhooks: { type: 'number' },
              },
            },
            apiKeys: {
              type: 'object',
              properties: {
                status: { type: 'string' },
                activeKeys: { type: 'number' },
                rateLimitStatus: { type: 'string' },
              },
            },
            orders: {
              type: 'object',
              properties: {
                status: { type: 'string' },
                processingLatency: { type: 'number', description: 'Average latency in ms' },
              },
            },
          },
        },
      },
    },
  })
  async getHealth(): Promise<any> {
    return this.integrationMonitoringService.getHealthStatus();
  }

  @Get('metrics')
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('company_owner', 'super_admin', 'branch_manager')
  @ApiOperation({
    summary: 'Get integration metrics',
    description: 'Retrieve performance metrics and statistics',
  })
  @ApiQuery({ name: 'period', required: false, enum: ['1h', '24h', '7d', '30d'], description: 'Time period' })
  @ApiResponse({
    status: 200,
    description: 'Integration metrics',
    schema: {
      type: 'object',
      properties: {
        period: { type: 'string' },
        apiRequests: {
          type: 'object',
          properties: {
            total: { type: 'number' },
            successful: { type: 'number' },
            failed: { type: 'number' },
            averageResponseTime: { type: 'number' },
            requestsPerMinute: { type: 'number' },
          },
        },
        webhooks: {
          type: 'object',
          properties: {
            totalDeliveries: { type: 'number' },
            successfulDeliveries: { type: 'number' },
            failedDeliveries: { type: 'number' },
            averageDeliveryTime: { type: 'number' },
          },
        },
        orders: {
          type: 'object',
          properties: {
            totalOrders: { type: 'number' },
            ordersBySource: { type: 'object' },
            averageProcessingTime: { type: 'number' },
          },
        },
        topEndpoints: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              endpoint: { type: 'string' },
              requests: { type: 'number' },
              averageResponseTime: { type: 'number' },
            },
          },
        },
      },
    },
  })
  async getMetrics(
    @Query('period') period?: string,
    @CurrentUser() user?: BaseUser,
  ): Promise<any> {
    return this.integrationMonitoringService.getMetrics(period || '24h', user);
  }

  @Get('providers')
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('company_owner', 'super_admin', 'branch_manager')
  @ApiOperation({
    summary: 'Get provider status',
    description: 'Check the status of integrated delivery providers',
  })
  @ApiResponse({
    status: 200,
    description: 'Provider statuses',
    schema: {
      type: 'object',
      properties: {
        providers: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              status: { type: 'string', enum: ['active', 'inactive', 'error'] },
              lastSync: { type: 'string', format: 'date-time' },
              ordersToday: { type: 'number' },
              errorRate: { type: 'number' },
              averageResponseTime: { type: 'number' },
            },
          },
        },
      },
    },
  })
  async getProviderStatus(
    @CurrentUser() user: BaseUser,
  ): Promise<any> {
    return this.integrationMonitoringService.getProviderStatus(user);
  }

  @Get('rate-limits')
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('company_owner', 'super_admin')
  @ApiOperation({
    summary: 'Get rate limit status',
    description: 'Check current rate limit usage for API keys',
  })
  @ApiQuery({ name: 'apiKeyId', required: false, description: 'Filter by specific API key' })
  @ApiResponse({
    status: 200,
    description: 'Rate limit status',
    schema: {
      type: 'object',
      properties: {
        apiKeys: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              apiKeyId: { type: 'string' },
              name: { type: 'string' },
              limit: { type: 'number', description: 'Requests per minute' },
              current: { type: 'number', description: 'Current usage' },
              remaining: { type: 'number' },
              resetAt: { type: 'string', format: 'date-time' },
              status: { type: 'string', enum: ['ok', 'warning', 'exceeded'] },
            },
          },
        },
      },
    },
  })
  async getRateLimitStatus(
    @Query('apiKeyId') apiKeyId?: string,
    @CurrentUser() user?: BaseUser,
  ): Promise<any> {
    return this.integrationMonitoringService.getRateLimitStatus(apiKeyId, user);
  }
}
