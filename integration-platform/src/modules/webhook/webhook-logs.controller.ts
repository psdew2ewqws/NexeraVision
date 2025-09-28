import {
  Controller,
  Get,
  Query,
  Param,
  ParseUUIDPipe,
  UseGuards,
  Request,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { WebhookLoggerService } from './webhook-logger.service';
import { WebhookLogFiltersDto } from './dto/webhook-log-filters.dto';
import { SearchWebhookLogsDto } from './dto/search-webhook-logs.dto';

@ApiTags('Webhook Logs')
@Controller('webhook-logs')
@ApiBearerAuth()
// @UseGuards(JwtAuthGuard) // Uncomment when you have auth guards
export class WebhookLogsController {
  constructor(private readonly webhookLoggerService: WebhookLoggerService) {}

  @Get()
  @ApiOperation({ summary: 'Get webhook logs with filtering and pagination' })
  @ApiResponse({
    status: 200,
    description: 'Webhook logs retrieved successfully',
  })
  async getWebhookLogs(
    @Query() filters: WebhookLogFiltersDto,
    @Request() req: any,
  ) {
    // In a real app, extract organizationId from JWT token
    const organizationId = req.user?.organizationId || req.headers['x-organization-id'];

    if (!organizationId) {
      throw new BadRequestException('Organization ID is required');
    }

    try {
      const result = await this.webhookLoggerService.getWebhookLogs({
        organizationId,
        ...filters,
        startDate: filters.startDate ? new Date(filters.startDate) : undefined,
        endDate: filters.endDate ? new Date(filters.endDate) : undefined,
      });

      return {
        success: true,
        data: result.logs,
        pagination: result.pagination,
      };
    } catch (error) {
      throw new BadRequestException(`Failed to retrieve webhook logs: ${error.message}`);
    }
  }

  @Get('search')
  @ApiOperation({ summary: 'Search webhook logs' })
  @ApiResponse({
    status: 200,
    description: 'Webhook logs search completed successfully',
  })
  async searchWebhookLogs(
    @Query() searchDto: SearchWebhookLogsDto,
    @Request() req: any,
  ) {
    const organizationId = req.user?.organizationId || req.headers['x-organization-id'];

    if (!organizationId) {
      throw new BadRequestException('Organization ID is required');
    }

    if (!searchDto.searchQuery) {
      throw new BadRequestException('Search query is required');
    }

    try {
      const result = await this.webhookLoggerService.searchWebhookLogs(
        organizationId,
        searchDto.searchQuery,
        {
          ...searchDto,
          startDate: searchDto.startDate ? new Date(searchDto.startDate) : undefined,
          endDate: searchDto.endDate ? new Date(searchDto.endDate) : undefined,
        },
      );

      return {
        success: true,
        data: result.logs,
        totalCount: result.totalCount,
        searchQuery: result.searchQuery,
      };
    } catch (error) {
      throw new BadRequestException(`Failed to search webhook logs: ${error.message}`);
    }
  }

  @Get('metrics')
  @ApiOperation({ summary: 'Get webhook metrics and analytics' })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
  @ApiQuery({ name: 'configurationId', required: false, type: String })
  @ApiResponse({
    status: 200,
    description: 'Webhook metrics retrieved successfully',
  })
  async getWebhookMetrics(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('configurationId') configurationId?: string,
    @Request() req?: any,
  ) {
    const organizationId = req.user?.organizationId || req.headers['x-organization-id'];

    if (!organizationId) {
      throw new BadRequestException('Organization ID is required');
    }

    try {
      const metrics = await this.webhookLoggerService.getWebhookMetrics(
        organizationId,
        startDate ? new Date(startDate) : undefined,
        endDate ? new Date(endDate) : undefined,
        configurationId,
      );

      return {
        success: true,
        data: metrics,
      };
    } catch (error) {
      throw new BadRequestException(`Failed to retrieve webhook metrics: ${error.message}`);
    }
  }

  @Get('performance')
  @ApiOperation({ summary: 'Get webhook performance analytics' })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
  @ApiResponse({
    status: 200,
    description: 'Webhook performance analytics retrieved successfully',
  })
  async getPerformanceAnalytics(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Request() req?: any,
  ) {
    const organizationId = req.user?.organizationId || req.headers['x-organization-id'];

    if (!organizationId) {
      throw new BadRequestException('Organization ID is required');
    }

    try {
      const analytics = await this.webhookLoggerService.getPerformanceAnalytics(
        organizationId,
        startDate ? new Date(startDate) : undefined,
        endDate ? new Date(endDate) : undefined,
      );

      return {
        success: true,
        data: analytics,
      };
    } catch (error) {
      throw new BadRequestException(`Failed to retrieve performance analytics: ${error.message}`);
    }
  }

  @Get('errors')
  @ApiOperation({ summary: 'Get webhook error analytics' })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
  @ApiResponse({
    status: 200,
    description: 'Webhook error analytics retrieved successfully',
  })
  async getErrorAnalytics(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Request() req?: any,
  ) {
    const organizationId = req.user?.organizationId || req.headers['x-organization-id'];

    if (!organizationId) {
      throw new BadRequestException('Organization ID is required');
    }

    try {
      const analytics = await this.webhookLoggerService.getErrorAnalytics(
        organizationId,
        startDate ? new Date(startDate) : undefined,
        endDate ? new Date(endDate) : undefined,
      );

      return {
        success: true,
        data: analytics,
      };
    } catch (error) {
      throw new BadRequestException(`Failed to retrieve error analytics: ${error.message}`);
    }
  }

  @Get('correlation/:correlationId')
  @ApiOperation({ summary: 'Get webhook logs by correlation ID' })
  @ApiParam({ name: 'correlationId', description: 'Correlation ID to trace webhooks' })
  @ApiResponse({
    status: 200,
    description: 'Webhook logs retrieved successfully',
  })
  async getWebhookLogsByCorrelation(
    @Param('correlationId') correlationId: string,
    @Request() req: any,
  ) {
    const organizationId = req.user?.organizationId || req.headers['x-organization-id'];

    if (!organizationId) {
      throw new BadRequestException('Organization ID is required');
    }

    try {
      const logs = await this.webhookLoggerService.getWebhookLogsByCorrelation(
        organizationId,
        correlationId,
      );

      if (logs.length === 0) {
        throw new NotFoundException(`No webhook logs found for correlation ID: ${correlationId}`);
      }

      return {
        success: true,
        data: logs,
        correlationId,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException(`Failed to retrieve webhook logs: ${error.message}`);
    }
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a specific webhook log by ID' })
  @ApiParam({ name: 'id', description: 'Webhook log ID' })
  @ApiResponse({
    status: 200,
    description: 'Webhook log retrieved successfully',
  })
  async getWebhookLogById(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: any,
  ) {
    const organizationId = req.user?.organizationId || req.headers['x-organization-id'];

    if (!organizationId) {
      throw new BadRequestException('Organization ID is required');
    }

    try {
      // Use the existing filter method to get a single log
      const result = await this.webhookLoggerService.getWebhookLogs({
        organizationId,
        page: 1,
        limit: 1,
      });

      const log = result.logs.find(l => l.id === id);

      if (!log) {
        throw new NotFoundException(`Webhook log not found: ${id}`);
      }

      return {
        success: true,
        data: log,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException(`Failed to retrieve webhook log: ${error.message}`);
    }
  }
}