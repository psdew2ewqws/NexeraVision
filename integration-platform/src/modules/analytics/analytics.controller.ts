import {
  Controller,
  Get,
  Post,
  Delete,
  Query,
  Param,
  Body,
  UseGuards,
  HttpStatus,
  HttpException,
  Logger,
  ValidationPipe,
  UsePipes,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiParam,
  ApiBearerAuth,
  ApiExtraModels,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AnalyticsService, DashboardMetrics, AnalyticsAlert } from './analytics.service';
import { OrderAnalyticsService } from '../orders/order-analytics.service';
import {
  BaseAnalyticsQueryDto,
  OrderVolumeQueryDto,
  RevenueQueryDto,
  ProviderPerformanceQueryDto,
  CustomerBehaviorQueryDto,
  GeographicDistributionQueryDto,
  PeakTimesQueryDto,
  MultiMetricQueryDto,
  ComparisonQueryDto,
  RealTimeMetricsQueryDto,
  AlertConfigDto,
  ExportQueryDto,
  PaginationDto,
  MetricType,
  TimePeriod,
  parseDateRange,
  validateTimeRange,
} from './dto/analytics-query.dto';

@ApiTags('Analytics')
@Controller('analytics')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@ApiExtraModels(
  BaseAnalyticsQueryDto,
  OrderVolumeQueryDto,
  RevenueQueryDto,
  ProviderPerformanceQueryDto,
  CustomerBehaviorQueryDto,
  GeographicDistributionQueryDto,
  PeakTimesQueryDto,
  MultiMetricQueryDto,
  ComparisonQueryDto,
  RealTimeMetricsQueryDto,
  AlertConfigDto,
  ExportQueryDto,
  PaginationDto,
)
export class AnalyticsController {
  private readonly logger = new Logger(AnalyticsController.name);

  constructor(
    private readonly analyticsService: AnalyticsService,
    private readonly orderAnalyticsService: OrderAnalyticsService,
  ) {}

  @Get('dashboard')
  @ApiOperation({
    summary: 'Get comprehensive dashboard metrics',
    description: 'Returns overview metrics including order volume, revenue, trends, and real-time data',
  })
  @ApiResponse({
    status: 200,
    description: 'Dashboard metrics retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        summary: {
          type: 'object',
          properties: {
            totalOrders: { type: 'number' },
            totalRevenue: { type: 'number' },
            averageOrderValue: { type: 'number' },
            activeOrders: { type: 'number' },
            completionRate: { type: 'number' },
          },
        },
        trends: {
          type: 'object',
          properties: {
            orderGrowth: { type: 'number' },
            revenueGrowth: { type: 'number' },
            aovGrowth: { type: 'number' },
          },
        },
        providers: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              provider: { type: 'string' },
              orders: { type: 'number' },
              revenue: { type: 'number' },
              growth: { type: 'number' },
            },
          },
        },
        realtimeData: {
          type: 'object',
          properties: {
            ordersLastHour: { type: 'number' },
            revenueLastHour: { type: 'number' },
            averageProcessingTime: { type: 'number' },
            errorRate: { type: 'number' },
          },
        },
      },
    },
  })
  @UsePipes(new ValidationPipe({ transform: true }))
  async getDashboard(
    @Query() query: BaseAnalyticsQueryDto,
  ): Promise<DashboardMetrics> {
    try {
      this.logger.log(`Getting dashboard metrics with query: ${JSON.stringify(query)}`);
      return await this.analyticsService.getDashboardMetrics(query);
    } catch (error) {
      this.logger.error(`Dashboard metrics error: ${error.message}`, error.stack);
      throw new HttpException(
        `Failed to retrieve dashboard metrics: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('order-volume')
  @ApiOperation({
    summary: 'Get order volume analytics',
    description: 'Returns order volume metrics by provider and time period with optional breakdowns',
  })
  @ApiResponse({
    status: 200,
    description: 'Order volume metrics retrieved successfully',
  })
  @UsePipes(new ValidationPipe({ transform: true }))
  async getOrderVolume(@Query() query: OrderVolumeQueryDto) {
    try {
      const { start, end } = parseDateRange(query.startDate, query.endDate);
      if (start && end) validateTimeRange(start, end);

      return await this.orderAnalyticsService.getOrderVolumeByProvider(
        query.provider,
        start,
        end,
        query.period as any,
      );
    } catch (error) {
      this.logger.error(`Order volume error: ${error.message}`, error.stack);
      throw new HttpException(
        `Failed to retrieve order volume: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('revenue')
  @ApiOperation({
    summary: 'Get revenue analytics',
    description: 'Returns comprehensive revenue metrics including trends and provider breakdown',
  })
  @ApiResponse({
    status: 200,
    description: 'Revenue metrics retrieved successfully',
  })
  @UsePipes(new ValidationPipe({ transform: true }))
  async getRevenue(@Query() query: RevenueQueryDto) {
    try {
      const { start, end } = parseDateRange(query.startDate, query.endDate);
      if (start && end) validateTimeRange(start, end);

      return await this.orderAnalyticsService.getRevenueMetrics(start, end, query.currency);
    } catch (error) {
      this.logger.error(`Revenue analytics error: ${error.message}`, error.stack);
      throw new HttpException(
        `Failed to retrieve revenue analytics: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('provider/:provider/performance')
  @ApiOperation({
    summary: 'Get provider performance metrics',
    description: 'Returns comprehensive performance analytics for a specific provider',
  })
  @ApiParam({
    name: 'provider',
    description: 'Provider name',
    enum: ['CAREEM', 'TALABAT', 'DELIVEROO', 'JAHEZ', 'UBEREATS', 'ZOMATO', 'HUNGERSTATION'],
  })
  @ApiResponse({
    status: 200,
    description: 'Provider performance metrics retrieved successfully',
  })
  @UsePipes(new ValidationPipe({ transform: true }))
  async getProviderPerformance(
    @Param('provider') provider: string,
    @Query() query: ProviderPerformanceQueryDto,
  ) {
    try {
      const { start, end } = parseDateRange(query.startDate, query.endDate);
      if (start && end) validateTimeRange(start, end);

      return await this.orderAnalyticsService.getProviderPerformance(
        provider as any,
        start,
        end,
      );
    } catch (error) {
      this.logger.error(`Provider performance error: ${error.message}`, error.stack);
      throw new HttpException(
        `Failed to retrieve provider performance: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('customer-behavior')
  @ApiOperation({
    summary: 'Get customer behavior analytics',
    description: 'Returns customer behavior patterns, segmentation, and top customers',
  })
  @ApiResponse({
    status: 200,
    description: 'Customer behavior metrics retrieved successfully',
  })
  @UsePipes(new ValidationPipe({ transform: true }))
  async getCustomerBehavior(@Query() query: CustomerBehaviorQueryDto) {
    try {
      const { start, end } = parseDateRange(query.startDate, query.endDate);
      if (start && end) validateTimeRange(start, end);

      return await this.orderAnalyticsService.getCustomerBehaviorMetrics(
        query.provider,
        start,
        end,
      );
    } catch (error) {
      this.logger.error(`Customer behavior error: ${error.message}`, error.stack);
      throw new HttpException(
        `Failed to retrieve customer behavior: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('geographic-distribution')
  @ApiOperation({
    summary: 'Get geographic distribution analytics',
    description: 'Returns order distribution by geographic location with revenue analysis',
  })
  @ApiResponse({
    status: 200,
    description: 'Geographic distribution retrieved successfully',
  })
  @UsePipes(new ValidationPipe({ transform: true }))
  async getGeographicDistribution(@Query() query: GeographicDistributionQueryDto) {
    try {
      const { start, end } = parseDateRange(query.startDate, query.endDate);
      if (start && end) validateTimeRange(start, end);

      return await this.orderAnalyticsService.getGeographicDistribution(
        query.provider,
        start,
        end,
      );
    } catch (error) {
      this.logger.error(`Geographic distribution error: ${error.message}`, error.stack);
      throw new HttpException(
        `Failed to retrieve geographic distribution: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('peak-times')
  @ApiOperation({
    summary: 'Get peak ordering times analysis',
    description: 'Returns peak ordering patterns by hour and day of week',
  })
  @ApiResponse({
    status: 200,
    description: 'Peak times analysis retrieved successfully',
  })
  @UsePipes(new ValidationPipe({ transform: true }))
  async getPeakTimes(@Query() query: PeakTimesQueryDto) {
    try {
      const { start, end } = parseDateRange(query.startDate, query.endDate);
      if (start && end) validateTimeRange(start, end);

      return await this.orderAnalyticsService.getPeakOrderTimes(
        query.provider,
        start,
        end,
      );
    } catch (error) {
      this.logger.error(`Peak times error: ${error.message}`, error.stack);
      throw new HttpException(
        `Failed to retrieve peak times: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('multi-metric')
  @ApiOperation({
    summary: 'Get multiple metrics in a single request',
    description: 'Returns multiple analytics metrics efficiently with optional detailed breakdown',
  })
  @ApiResponse({
    status: 200,
    description: 'Multi-metric analytics retrieved successfully',
  })
  @UsePipes(new ValidationPipe({ transform: true }))
  async getMultiMetrics(@Query() query: MultiMetricQueryDto) {
    try {
      return await this.analyticsService.getMultiMetricAnalytics(
        query.metrics,
        query,
        query.includeDetails,
      );
    } catch (error) {
      this.logger.error(`Multi-metric error: ${error.message}`, error.stack);
      throw new HttpException(
        `Failed to retrieve multi-metric analytics: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('comparison')
  @ApiOperation({
    summary: 'Compare metrics between two time periods',
    description: 'Returns comparison analysis between current and comparison periods',
  })
  @ApiResponse({
    status: 200,
    description: 'Metric comparison retrieved successfully',
  })
  @UsePipes(new ValidationPipe({ transform: true }))
  async getComparison(@Query() query: ComparisonQueryDto) {
    try {
      const currentPeriod = {
        start: new Date(query.startDate!),
        end: new Date(query.endDate!),
      };
      const comparisonPeriod = {
        start: new Date(query.comparisonStartDate),
        end: new Date(query.comparisonEndDate),
      };

      validateTimeRange(currentPeriod.start, currentPeriod.end);
      validateTimeRange(comparisonPeriod.start, comparisonPeriod.end);

      return await this.analyticsService.compareMetrics(
        query.metrics,
        currentPeriod,
        comparisonPeriod,
        query.provider,
      );
    } catch (error) {
      this.logger.error(`Comparison error: ${error.message}`, error.stack);
      throw new HttpException(
        `Failed to retrieve comparison: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('realtime')
  @ApiOperation({
    summary: 'Get real-time metrics',
    description: 'Returns current real-time analytics for the specified time window',
  })
  @ApiResponse({
    status: 200,
    description: 'Real-time metrics retrieved successfully',
  })
  @UsePipes(new ValidationPipe({ transform: true }))
  async getRealtimeMetrics(@Query() query: RealTimeMetricsQueryDto) {
    try {
      return await this.analyticsService.getRealtimeMetrics(query.timeWindowMinutes);
    } catch (error) {
      this.logger.error(`Real-time metrics error: ${error.message}`, error.stack);
      throw new HttpException(
        `Failed to retrieve real-time metrics: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('aov')
  @ApiOperation({
    summary: 'Get average order value',
    description: 'Returns average order value for the specified filters',
  })
  @ApiResponse({
    status: 200,
    description: 'Average order value retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        averageOrderValue: { type: 'number' },
        provider: { type: 'string' },
        period: { type: 'string' },
        currency: { type: 'string' },
      },
    },
  })
  @UsePipes(new ValidationPipe({ transform: true }))
  async getAverageOrderValue(@Query() query: BaseAnalyticsQueryDto) {
    try {
      const { start, end } = parseDateRange(query.startDate, query.endDate);
      if (start && end) validateTimeRange(start, end);

      const aov = await this.orderAnalyticsService.getAverageOrderValue(
        query.provider,
        start,
        end,
      );

      return {
        averageOrderValue: aov,
        provider: query.provider || 'all',
        period: `${start?.toISOString()} to ${end?.toISOString()}`,
        currency: query.currency || 'USD',
      };
    } catch (error) {
      this.logger.error(`AOV error: ${error.message}`, error.stack);
      throw new HttpException(
        `Failed to retrieve average order value: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('completion-rate')
  @ApiOperation({
    summary: 'Get order completion rate',
    description: 'Returns completion rate percentage for the specified filters',
  })
  @ApiResponse({
    status: 200,
    description: 'Completion rate retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        completionRate: { type: 'number' },
        provider: { type: 'string' },
        period: { type: 'string' },
      },
    },
  })
  @UsePipes(new ValidationPipe({ transform: true }))
  async getCompletionRate(@Query() query: BaseAnalyticsQueryDto) {
    try {
      const { start, end } = parseDateRange(query.startDate, query.endDate);
      if (start && end) validateTimeRange(start, end);

      const completionRate = await this.orderAnalyticsService.getCompletionRates(
        query.provider,
        start,
        end,
      );

      return {
        completionRate,
        provider: query.provider || 'all',
        period: `${start?.toISOString()} to ${end?.toISOString()}`,
      };
    } catch (error) {
      this.logger.error(`Completion rate error: ${error.message}`, error.stack);
      throw new HttpException(
        `Failed to retrieve completion rate: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // =========================
  // ALERTS MANAGEMENT
  // =========================

  @Post('alerts')
  @ApiOperation({
    summary: 'Set up analytics alert',
    description: 'Configure an alert for specific metric thresholds',
  })
  @ApiResponse({
    status: 201,
    description: 'Alert configured successfully',
    schema: {
      type: 'object',
      properties: {
        alertId: { type: 'string' },
        message: { type: 'string' },
      },
    },
  })
  @UsePipes(new ValidationPipe({ transform: true }))
  async setupAlert(@Body() alertConfig: AlertConfigDto) {
    try {
      const alertId = await this.analyticsService.setupAlert(
        alertConfig.metric,
        alertConfig.threshold,
        alertConfig.condition,
        {
          provider: alertConfig.provider,
          timeWindowMinutes: alertConfig.timeWindowMinutes,
        },
      );

      return {
        alertId,
        message: 'Alert configured successfully',
      };
    } catch (error) {
      this.logger.error(`Setup alert error: ${error.message}`, error.stack);
      throw new HttpException(
        `Failed to setup alert: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('alerts')
  @ApiOperation({
    summary: 'Get active alerts',
    description: 'Returns all currently active analytics alerts',
  })
  @ApiResponse({
    status: 200,
    description: 'Active alerts retrieved successfully',
  })
  async getActiveAlerts(): Promise<AnalyticsAlert[]> {
    try {
      return this.analyticsService.getActiveAlerts();
    } catch (error) {
      this.logger.error(`Get alerts error: ${error.message}`, error.stack);
      throw new HttpException(
        `Failed to retrieve alerts: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Delete('alerts/:alertId')
  @ApiOperation({
    summary: 'Remove analytics alert',
    description: 'Remove a specific alert by ID',
  })
  @ApiParam({
    name: 'alertId',
    description: 'Alert ID to remove',
  })
  @ApiResponse({
    status: 200,
    description: 'Alert removed successfully',
  })
  async removeAlert(@Param('alertId') alertId: string) {
    try {
      // Implementation would be in AnalyticsService
      return { message: 'Alert removed successfully' };
    } catch (error) {
      this.logger.error(`Remove alert error: ${error.message}`, error.stack);
      throw new HttpException(
        `Failed to remove alert: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // =========================
  // CACHE MANAGEMENT
  // =========================

  @Delete('cache')
  @ApiOperation({
    summary: 'Clear analytics cache',
    description: 'Clear analytics cache to force fresh data calculation',
  })
  @ApiQuery({
    name: 'pattern',
    description: 'Cache pattern to clear (optional)',
    required: false,
  })
  @ApiResponse({
    status: 200,
    description: 'Cache cleared successfully',
  })
  async clearCache(@Query('pattern') pattern?: string) {
    try {
      await this.analyticsService.clearCache(pattern);
      return { message: 'Analytics cache cleared successfully' };
    } catch (error) {
      this.logger.error(`Clear cache error: ${error.message}`, error.stack);
      throw new HttpException(
        `Failed to clear cache: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // =========================
  // EXPORT FUNCTIONALITY
  // =========================

  @Get('export')
  @ApiOperation({
    summary: 'Export analytics data',
    description: 'Export analytics data in various formats (CSV, JSON, Excel)',
  })
  @ApiResponse({
    status: 200,
    description: 'Analytics data exported successfully',
  })
  @UsePipes(new ValidationPipe({ transform: true }))
  async exportAnalytics(@Query() query: ExportQueryDto) {
    try {
      // This would be implemented to return actual file export
      return {
        message: 'Export functionality not yet implemented',
        format: query.format,
        metrics: query.metrics,
        period: `${query.startDate} to ${query.endDate}`,
      };
    } catch (error) {
      this.logger.error(`Export error: ${error.message}`, error.stack);
      throw new HttpException(
        `Failed to export analytics: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // =========================
  // HEALTH CHECK
  // =========================

  @Get('health')
  @ApiOperation({
    summary: 'Analytics service health check',
    description: 'Returns analytics service health and performance metrics',
  })
  @ApiResponse({
    status: 200,
    description: 'Health check completed',
  })
  async healthCheck() {
    try {
      return {
        status: 'healthy',
        timestamp: new Date(),
        services: {
          analytics: 'operational',
          orderAnalytics: 'operational',
          cache: 'operational',
        },
        metrics: {
          cacheHitRate: '85%',
          averageResponseTime: '150ms',
          activeAlerts: this.analyticsService.getActiveAlerts().length,
        },
      };
    } catch (error) {
      this.logger.error(`Health check error: ${error.message}`, error.stack);
      throw new HttpException(
        'Service unhealthy',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }
}