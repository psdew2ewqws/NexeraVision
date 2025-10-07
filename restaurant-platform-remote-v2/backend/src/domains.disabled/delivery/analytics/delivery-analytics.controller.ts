import {
  Controller,
  Get,
  Query,
  UseGuards,
  Request,
  ParseIntPipe,
  ValidationPipe,
  UsePipes,
  BadRequestException,
  Logger
} from '@nestjs/common';
import { JwtAuthGuard } from '../../../shared/common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../shared/common/guards/roles.guard';
import { CompanyGuard } from '../../../shared/common/guards/company.guard';
import { Roles } from '../../../shared/common/decorators/roles.decorator';
import { 
  DeliveryAnalyticsService, 
  DeliveryAnalyticsDashboard, 
  PerformanceReport 
} from './delivery-analytics.service';
import { IsOptional, IsString, IsDateString, IsEnum } from 'class-validator';
import { Transform } from 'class-transformer';

// DTOs for request validation
class DashboardQueryDto {
  @IsOptional()
  @IsString()
  companyId?: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsEnum(['1h', '24h', '7d', '30d'])
  timeRange?: '1h' | '24h' | '7d' | '30d';
}

class ReportQueryDto extends DashboardQueryDto {
  @IsOptional()
  @IsEnum(['summary', 'detailed', 'comparison'])
  reportType?: 'summary' | 'detailed' | 'comparison';
}

class MetricsQueryDto {
  @IsOptional()
  @IsString()
  companyId?: string;

  @IsOptional()
  @IsString()
  providerId?: string;

  @IsOptional()
  @IsEnum(['overview', 'providers', 'realtime', 'alerts', 'costs', 'geographic'])
  section?: 'overview' | 'providers' | 'realtime' | 'alerts' | 'costs' | 'geographic';
}

@Controller('api/v1/delivery/analytics')
@UseGuards(JwtAuthGuard, RolesGuard, CompanyGuard)
@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
export class DeliveryAnalyticsController {
  private readonly logger = new Logger(DeliveryAnalyticsController.name);

  constructor(
    private readonly analyticsService: DeliveryAnalyticsService
  ) {}

  /**
   * Get comprehensive delivery analytics dashboard
   */
  @Get('dashboard')
  @Roles('super_admin', 'company_owner', 'branch_manager')
  async getDashboard(
    @Query() query: DashboardQueryDto,
    @Request() req: any
  ): Promise<DeliveryAnalyticsDashboard> {
    try {
      this.logger.log(`Dashboard request from user ${req.user.id} for company ${query.companyId || req.user.companyId}`);

      const companyId = this.getCompanyId(req, query.companyId);
      const timeRange = this.parseTimeRange(query.startDate, query.endDate, query.timeRange);

      const dashboard = await this.analyticsService.getDashboardData(companyId, timeRange);
      
      this.logger.log(`Dashboard data generated successfully for company ${companyId}`);
      return dashboard;

    } catch (error) {
      this.logger.error('Failed to get dashboard data:', error.message);
      throw error;
    }
  }

  /**
   * Get specific metrics section
   */
  @Get('metrics')
  @Roles('super_admin', 'company_owner', 'branch_manager')
  async getMetrics(
    @Query() query: MetricsQueryDto,
    @Request() req: any
  ): Promise<any> {
    try {
      const companyId = this.getCompanyId(req, query.companyId);
      const dashboard = await this.analyticsService.getDashboardData(companyId);

      // Return specific section if requested
      if (query.section) {
        const sectionData = this.extractDashboardSection(dashboard, query.section);
        return { section: query.section, data: sectionData };
      }

      // Filter by provider if specified
      if (query.providerId) {
        const providerMetrics = dashboard.providerPerformance.find(p => p.providerId === query.providerId);
        if (!providerMetrics) {
          throw new BadRequestException(`Provider ${query.providerId} not found`);
        }
        return { providerId: query.providerId, metrics: providerMetrics };
      }

      return dashboard;

    } catch (error) {
      this.logger.error('Failed to get metrics:', error.message);
      throw error;
    }
  }

  /**
   * Get real-time statistics
   */
  @Get('realtime')
  @Roles('super_admin', 'company_owner', 'branch_manager', 'call_center')
  async getRealTimeStats(
    @Query('companyId') companyId: string,
    @Request() req: any
  ): Promise<any> {
    try {
      const targetCompanyId = this.getCompanyId(req, companyId);
      const dashboard = await this.analyticsService.getDashboardData(targetCompanyId);
      
      return {
        timestamp: new Date(),
        stats: dashboard.realTimeStats,
        healthSummary: await this.analyticsService.getSystemHealthSummary()
      };

    } catch (error) {
      this.logger.error('Failed to get real-time stats:', error.message);
      throw error;
    }
  }

  /**
   * Get provider performance comparison
   */
  @Get('providers/performance')
  @Roles('super_admin', 'company_owner', 'branch_manager')
  async getProviderPerformance(
    @Query() query: DashboardQueryDto,
    @Request() req: any
  ): Promise<any> {
    try {
      const companyId = this.getCompanyId(req, query.companyId);
      const timeRange = this.parseTimeRange(query.startDate, query.endDate, query.timeRange);
      
      const dashboard = await this.analyticsService.getDashboardData(companyId, timeRange);
      
      return {
        providers: dashboard.providerPerformance,
        topPerforming: dashboard.topPerformingProviders,
        summary: {
          totalProviders: dashboard.providerPerformance.length,
          healthyProviders: dashboard.providerPerformance.filter(p => p.healthScore > 80).length,
          averageSuccessRate: dashboard.providerPerformance.reduce((sum, p) => sum + p.successRate, 0) / dashboard.providerPerformance.length,
          averageResponseTime: dashboard.providerPerformance.reduce((sum, p) => sum + p.averageResponseTime, 0) / dashboard.providerPerformance.length
        }
      };

    } catch (error) {
      this.logger.error('Failed to get provider performance:', error.message);
      throw error;
    }
  }

  /**
   * Get order volume trends
   */
  @Get('trends/orders')
  @Roles('super_admin', 'company_owner', 'branch_manager')
  async getOrderTrends(
    @Query() query: DashboardQueryDto,
    @Request() req: any
  ): Promise<any> {
    try {
      const companyId = this.getCompanyId(req, query.companyId);
      const timeRange = this.parseTimeRange(query.startDate, query.endDate, query.timeRange);
      
      const dashboard = await this.analyticsService.getDashboardData(companyId, timeRange);
      
      return {
        timeRange: timeRange || { start: new Date(Date.now() - 24 * 60 * 60 * 1000), end: new Date() },
        volumeChart: dashboard.orderVolumeChart,
        summary: {
          totalOrders: dashboard.overview.totalOrders,
          peakHour: dashboard.realTimeStats.peakOrdersPerHour,
          averagePerHour: dashboard.overview.totalOrders / 24
        }
      };

    } catch (error) {
      this.logger.error('Failed to get order trends:', error.message);
      throw error;
    }
  }

  /**
   * Get cost analysis
   */
  @Get('costs/analysis')
  @Roles('super_admin', 'company_owner', 'branch_manager')
  async getCostAnalysis(
    @Query() query: DashboardQueryDto,
    @Request() req: any
  ): Promise<any> {
    try {
      const companyId = this.getCompanyId(req, query.companyId);
      const timeRange = this.parseTimeRange(query.startDate, query.endDate, query.timeRange);
      
      const dashboard = await this.analyticsService.getDashboardData(companyId, timeRange);
      
      return {
        costAnalysis: dashboard.costAnalysis,
        recommendations: [
          dashboard.costAnalysis.savingsFromOptimization > 1000 ? 
            `Potential savings of $${dashboard.costAnalysis.savingsFromOptimization.toFixed(2)} through optimization` :
            'Current cost optimization is effective',
          dashboard.costAnalysis.averageFeePerOrder > 15 ?
            'Consider negotiating better rates with high-cost providers' :
            'Delivery fees are within acceptable range'
        ]
      };

    } catch (error) {
      this.logger.error('Failed to get cost analysis:', error.message);
      throw error;
    }
  }

  /**
   * Get geographic distribution analysis
   */
  @Get('geographic/distribution')
  @Roles('super_admin', 'company_owner', 'branch_manager')
  async getGeographicDistribution(
    @Query() query: DashboardQueryDto,
    @Request() req: any
  ): Promise<any> {
    try {
      const companyId = this.getCompanyId(req, query.companyId);
      const timeRange = this.parseTimeRange(query.startDate, query.endDate, query.timeRange);
      
      const dashboard = await this.analyticsService.getDashboardData(companyId, timeRange);
      
      return {
        distribution: dashboard.geographicDistribution,
        insights: {
          topAreas: dashboard.geographicDistribution
            .sort((a, b) => b.orderCount - a.orderCount)
            .slice(0, 5)
            .map(area => ({ area: area.area, orders: area.orderCount })),
          bestPerformingAreas: dashboard.geographicDistribution
            .sort((a, b) => b.successRate - a.successRate)
            .slice(0, 3)
            .map(area => ({ area: area.area, successRate: area.successRate })),
          averageDeliveryTime: dashboard.geographicDistribution
            .reduce((sum, area) => sum + area.averageDeliveryTime, 0) / dashboard.geographicDistribution.length
        }
      };

    } catch (error) {
      this.logger.error('Failed to get geographic distribution:', error.message);
      throw error;
    }
  }

  /**
   * Get active alerts and notifications
   */
  @Get('alerts')
  @Roles('super_admin', 'company_owner', 'branch_manager', 'call_center')
  async getAlerts(
    @Query() query: { companyId?: string; severity?: string; resolved?: boolean },
    @Request() req: any
  ): Promise<any> {
    try {
      const companyId = this.getCompanyId(req, query.companyId);
      const dashboard = await this.analyticsService.getDashboardData(companyId);
      
      let alerts = dashboard.alerts;

      // Filter by severity if specified
      if (query.severity) {
        alerts = alerts.filter(alert => alert.severity === query.severity);
      }

      // Filter by resolved status if specified
      if (query.resolved !== undefined) {
        alerts = alerts.filter(alert => alert.resolved === query.resolved);
      }

      return {
        alerts,
        summary: {
          total: alerts.length,
          critical: alerts.filter(a => a.severity === 'critical').length,
          high: alerts.filter(a => a.severity === 'high').length,
          unresolved: alerts.filter(a => !a.resolved).length
        }
      };

    } catch (error) {
      this.logger.error('Failed to get alerts:', error.message);
      throw error;
    }
  }

  /**
   * Generate performance report
   */
  @Get('reports/performance')
  @Roles('super_admin', 'company_owner', 'branch_manager')
  async generatePerformanceReport(
    @Query() query: ReportQueryDto,
    @Request() req: any
  ): Promise<PerformanceReport> {
    try {
      const companyId = this.getCompanyId(req, query.companyId);
      const timeRange = this.parseTimeRange(query.startDate, query.endDate, query.timeRange);
      
      const report = await this.analyticsService.generatePerformanceReport(companyId, timeRange);
      
      this.logger.log(`Performance report generated for company ${companyId}`);
      return report;

    } catch (error) {
      this.logger.error('Failed to generate performance report:', error.message);
      throw error;
    }
  }

  /**
   * Get system health summary
   */
  @Get('health/summary')
  @Roles('super_admin', 'company_owner', 'branch_manager')
  async getSystemHealth(@Request() req: any): Promise<any> {
    try {
      const healthSummary = await this.analyticsService.getSystemHealthSummary();
      
      return {
        timestamp: new Date(),
        health: healthSummary,
        status: healthSummary.overallHealth,
        details: {
          providerHealth: `${healthSummary.healthyProviders}/${healthSummary.activeProviders} providers healthy`,
          systemLoad: `${healthSummary.systemLoad}% system load`,
          uptime: `${healthSummary.uptime}% uptime`
        }
      };

    } catch (error) {
      this.logger.error('Failed to get system health:', error.message);
      throw error;
    }
  }

  // Helper methods

  /**
   * Get company ID based on user role and request
   */
  private getCompanyId(req: any, queryCompanyId?: string): string | undefined {
    // Super admins can specify any company ID
    if (req.user.role === 'super_admin' && queryCompanyId) {
      return queryCompanyId;
    }
    
    // Other users are restricted to their own company
    return req.user.companyId;
  }

  /**
   * Parse time range from query parameters
   */
  private parseTimeRange(
    startDate?: string, 
    endDate?: string, 
    timeRange?: string
  ): { start: Date; end: Date } | undefined {
    if (startDate && endDate) {
      return {
        start: new Date(startDate),
        end: new Date(endDate)
      };
    }

    if (timeRange) {
      const end = new Date();
      let start: Date;

      switch (timeRange) {
        case '1h':
          start = new Date(end.getTime() - 60 * 60 * 1000);
          break;
        case '24h':
          start = new Date(end.getTime() - 24 * 60 * 60 * 1000);
          break;
        case '7d':
          start = new Date(end.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case '30d':
          start = new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        default:
          return undefined;
      }

      return { start, end };
    }

    return undefined;
  }

  /**
   * Extract specific section from dashboard data
   */
  private extractDashboardSection(dashboard: DeliveryAnalyticsDashboard, section: string): any {
    switch (section) {
      case 'overview':
        return dashboard.overview;
      case 'providers':
        return dashboard.providerPerformance;
      case 'realtime':
        return dashboard.realTimeStats;
      case 'alerts':
        return dashboard.alerts;
      case 'costs':
        return dashboard.costAnalysis;
      case 'geographic':
        return dashboard.geographicDistribution;
      default:
        throw new BadRequestException(`Invalid section: ${section}`);
    }
  }
}