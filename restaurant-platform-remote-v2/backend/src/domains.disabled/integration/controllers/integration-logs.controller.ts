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
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { BaseUser } from '../../../shared/common/services/base.service';
import { IntegrationLogsService } from '../services/integration-logs.service';

@ApiTags('Integration - Logs')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('integration/v1/logs')
export class IntegrationLogsController {
  constructor(
    private readonly integrationLogsService: IntegrationLogsService,
  ) {}

  @Get('webhooks')
  @Roles('company_owner', 'super_admin', 'branch_manager')
  @ApiOperation({
    summary: 'Get webhook delivery logs',
    description: 'Retrieve webhook delivery history with filtering options',
  })
  @ApiQuery({ name: 'webhookId', required: false, description: 'Filter by webhook ID' })
  @ApiQuery({ name: 'status', required: false, enum: ['success', 'failed', 'retrying'] })
  @ApiQuery({ name: 'startDate', required: false, description: 'Start date (ISO 8601)' })
  @ApiQuery({ name: 'endDate', required: false, description: 'End date (ISO 8601)' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({
    status: 200,
    description: 'Webhook delivery logs',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              webhookId: { type: 'string' },
              event: { type: 'string' },
              status: { type: 'string' },
              statusCode: { type: 'number' },
              attempt: { type: 'number' },
              error: { type: 'string' },
              createdAt: { type: 'string', format: 'date-time' },
              deliveredAt: { type: 'string', format: 'date-time' },
            },
          },
        },
        total: { type: 'number' },
      },
    },
  })
  async getWebhookLogs(
    @Query('webhookId') webhookId?: string,
    @Query('status') status?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('limit') limit?: string,
    @CurrentUser() user?: BaseUser,
  ): Promise<any> {
    const limitNum = parseInt(limit) || 100;

    return this.integrationLogsService.getWebhookLogs(
      {
        webhookId,
        status,
        startDate,
        endDate,
        limit: limitNum,
      },
      user,
    );
  }

  @Get('requests')
  @Roles('company_owner', 'super_admin', 'branch_manager')
  @ApiOperation({
    summary: 'Get API request logs',
    description: 'Retrieve API request history and statistics',
  })
  @ApiQuery({ name: 'apiKeyId', required: false, description: 'Filter by API key' })
  @ApiQuery({ name: 'endpoint', required: false, description: 'Filter by endpoint' })
  @ApiQuery({ name: 'method', required: false, enum: ['GET', 'POST', 'PUT', 'DELETE'] })
  @ApiQuery({ name: 'statusCode', required: false, type: Number })
  @ApiQuery({ name: 'startDate', required: false, description: 'Start date (ISO 8601)' })
  @ApiQuery({ name: 'endDate', required: false, description: 'End date (ISO 8601)' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({
    status: 200,
    description: 'API request logs',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              apiKeyId: { type: 'string' },
              method: { type: 'string' },
              endpoint: { type: 'string' },
              statusCode: { type: 'number' },
              duration: { type: 'number', description: 'Response time in ms' },
              error: { type: 'string' },
              createdAt: { type: 'string', format: 'date-time' },
            },
          },
        },
        total: { type: 'number' },
      },
    },
  })
  async getRequestLogs(
    @Query('apiKeyId') apiKeyId?: string,
    @Query('endpoint') endpoint?: string,
    @Query('method') method?: string,
    @Query('statusCode') statusCode?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('limit') limit?: string,
    @CurrentUser() user?: BaseUser,
  ): Promise<any> {
    const limitNum = parseInt(limit) || 100;
    const statusCodeNum = statusCode ? parseInt(statusCode) : undefined;

    return this.integrationLogsService.getRequestLogs(
      {
        apiKeyId,
        endpoint,
        method,
        statusCode: statusCodeNum,
        startDate,
        endDate,
        limit: limitNum,
      },
      user,
    );
  }

  @Get('errors')
  @Roles('company_owner', 'super_admin', 'branch_manager')
  @ApiOperation({
    summary: 'Get error logs',
    description: 'Retrieve integration error logs for debugging',
  })
  @ApiQuery({ name: 'type', required: false, enum: ['request', 'webhook', 'system'] })
  @ApiQuery({ name: 'severity', required: false, enum: ['low', 'medium', 'high', 'critical'] })
  @ApiQuery({ name: 'startDate', required: false, description: 'Start date (ISO 8601)' })
  @ApiQuery({ name: 'endDate', required: false, description: 'End date (ISO 8601)' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({
    status: 200,
    description: 'Error logs',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              type: { type: 'string' },
              error: { type: 'string' },
              endpoint: { type: 'string' },
              statusCode: { type: 'number' },
              metadata: { type: 'object' },
              createdAt: { type: 'string', format: 'date-time' },
            },
          },
        },
        total: { type: 'number' },
      },
    },
  })
  async getErrorLogs(
    @Query('type') type?: string,
    @Query('severity') severity?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('limit') limit?: string,
    @CurrentUser() user?: BaseUser,
  ): Promise<any> {
    const limitNum = parseInt(limit) || 100;

    return this.integrationLogsService.getErrorLogs(
      {
        type,
        severity,
        startDate,
        endDate,
        limit: limitNum,
      },
      user,
    );
  }
}
