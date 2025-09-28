// Phase 4 Monitoring Controller - Advanced Analytics and Testing
import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Delete,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { AdvancedPrinterAnalyticsService } from '../services/advanced-printer-analytics.service';
import { PrinterTestingService } from '../services/printer-testing.service';
import { EnterpriseMonitoringService } from '../services/enterprise-monitoring.service';

@ApiTags('Phase 4 - Advanced Monitoring')
@Controller('printing/phase4')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class Phase4MonitoringController {
  constructor(
    private readonly analyticsService: AdvancedPrinterAnalyticsService,
    private readonly testingService: PrinterTestingService,
    private readonly enterpriseService: EnterpriseMonitoringService,
  ) {}

  // Advanced Analytics Endpoints
  @Get('analytics/printer/:printerId/metrics')
  @ApiOperation({ summary: 'Get detailed printer metrics and analytics' })
  @ApiResponse({ status: 200, description: 'Printer metrics retrieved successfully' })
  async getPrinterMetrics(
    @Param('printerId') printerId: string,
    @Req() req: any
  ) {
    const companyId = req.user?.role === 'super_admin' ? undefined : req.user?.companyId;
    return this.analyticsService.getPrinterMetrics(printerId, companyId);
  }

  @Get('analytics/system')
  @ApiOperation({ summary: 'Get system-wide analytics dashboard' })
  @ApiResponse({ status: 200, description: 'System analytics retrieved successfully' })
  async getSystemAnalytics(@Req() req: any) {
    const companyId = req.user?.role === 'super_admin' ? undefined : req.user?.companyId;
    const branchId = req.user?.branchId;
    return this.analyticsService.getSystemAnalytics(companyId, branchId);
  }

  @Get('analytics/performance/report')
  @ApiOperation({ summary: 'Get performance report for specified period' })
  @ApiResponse({ status: 200, description: 'Performance report generated successfully' })
  @ApiQuery({ name: 'period', enum: ['hour', 'day', 'week', 'month'] })
  async getPerformanceReport(
    @Query('period') period: 'hour' | 'day' | 'week' | 'month' = 'day',
    @Req() req: any
  ) {
    const companyId = req.user?.role === 'super_admin' ? undefined : req.user?.companyId;
    const branchId = req.user?.branchId;
    return this.analyticsService.getPerformanceReport(period, companyId, branchId);
  }

  @Get('analytics/predictive/maintenance')
  @ApiOperation({ summary: 'Get predictive maintenance alerts' })
  @ApiResponse({ status: 200, description: 'Predictive maintenance alerts retrieved successfully' })
  async getPredictiveMaintenanceAlerts(@Req() req: any) {
    const companyId = req.user?.role === 'super_admin' ? undefined : req.user?.companyId;
    return this.analyticsService.getPredictiveMaintenanceAlerts(companyId);
  }

  // Advanced Testing Endpoints
  @Get('testing/suites')
  @ApiOperation({ summary: 'Get available test suites' })
  @ApiResponse({ status: 200, description: 'Test suites retrieved successfully' })
  async getTestSuites() {
    return this.testingService.getAvailableTestSuites();
  }

  @Post('testing/printer/:printerId/suite/:suiteId')
  @ApiOperation({ summary: 'Run test suite on printer' })
  @ApiResponse({ status: 200, description: 'Test suite started successfully' })
  async runTestSuite(
    @Param('printerId') printerId: string,
    @Param('suiteId') suiteId: string,
    @Body() options: {
      skipTests?: string[];
      parameters?: any;
    },
    @Req() req: any
  ) {
    const companyId = req.user?.role === 'super_admin' ? undefined : req.user?.companyId;
    return this.testingService.runTestSuite(printerId, suiteId, {
      ...options,
      companyId
    });
  }

  @Post('testing/printer/:printerId/quick')
  @ApiOperation({ summary: 'Run quick test on printer' })
  @ApiResponse({ status: 200, description: 'Quick test completed successfully' })
  async runQuickTest(
    @Param('printerId') printerId: string,
    @Req() req: any
  ) {
    const companyId = req.user?.role === 'super_admin' ? undefined : req.user?.companyId;
    return this.testingService.runQuickTest(printerId, companyId);
  }

  @Post('testing/printer/:printerId/network')
  @ApiOperation({ summary: 'Run network latency test' })
  @ApiResponse({ status: 200, description: 'Network test completed successfully' })
  async runNetworkTest(@Param('printerId') printerId: string) {
    return this.testingService.runNetworkLatencyTest(printerId);
  }

  @Get('testing/report/:reportId')
  @ApiOperation({ summary: 'Get test report by ID' })
  @ApiResponse({ status: 200, description: 'Test report retrieved successfully' })
  async getTestReport(@Param('reportId') reportId: string) {
    return this.testingService.getTestReport(reportId);
  }

  @Delete('testing/report/:reportId/cancel')
  @ApiOperation({ summary: 'Cancel running test' })
  @ApiResponse({ status: 200, description: 'Test cancelled successfully' })
  @HttpCode(HttpStatus.OK)
  async cancelTest(@Param('reportId') reportId: string) {
    const cancelled = await this.testingService.cancelTest(reportId);
    return { cancelled, message: cancelled ? 'Test cancelled successfully' : 'Test not found or already completed' };
  }

  @Get('testing/history')
  @ApiOperation({ summary: 'Get test history' })
  @ApiResponse({ status: 200, description: 'Test history retrieved successfully' })
  @ApiQuery({ name: 'printerId', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async getTestHistory(
    @Query('printerId') printerId?: string,
    @Query('limit') limit?: number,
    @Req() req?: any
  ) {
    const companyId = req.user?.role === 'super_admin' ? undefined : req.user?.companyId;
    return this.testingService.getTestHistory(printerId, limit, companyId);
  }

  // Enterprise Monitoring Endpoints
  @Get('enterprise/company/:companyId/dashboard')
  @ApiOperation({ summary: 'Get company dashboard with all branch monitoring data' })
  @ApiResponse({ status: 200, description: 'Company dashboard retrieved successfully' })
  @Roles('super_admin', 'company_owner')
  async getCompanyDashboard(
    @Param('companyId') companyId: string,
    @Req() req: any
  ) {
    // Validate access - users can only access their own company unless super_admin
    if (req.user?.role !== 'super_admin' && req.user?.companyId !== companyId) {
      throw new Error('Access denied to company dashboard');
    }
    return this.enterpriseService.getCompanyDashboard(companyId);
  }

  @Get('enterprise/system/metrics')
  @ApiOperation({ summary: 'Get system-wide metrics across all companies' })
  @ApiResponse({ status: 200, description: 'System metrics retrieved successfully' })
  @Roles('super_admin')
  async getSystemWideMetrics() {
    return this.enterpriseService.getSystemWideMetrics();
  }

  @Get('enterprise/branch/:branchId/monitoring')
  @ApiOperation({ summary: 'Get detailed branch monitoring data' })
  @ApiResponse({ status: 200, description: 'Branch monitoring data retrieved successfully' })
  async getBranchMonitoring(
    @Param('branchId') branchId: string,
    @Req() req: any
  ) {
    const companyId = req.user?.role === 'super_admin' ? undefined : req.user?.companyId;
    return this.enterpriseService.getBranchMonitoring(branchId, companyId);
  }

  @Post('enterprise/branches/compare')
  @ApiOperation({ summary: 'Compare multiple branches performance' })
  @ApiResponse({ status: 200, description: 'Branch comparison completed successfully' })
  async compareMultipleBranches(
    @Body() body: { branchIds: string[] },
    @Req() req: any
  ) {
    const companyId = req.user?.role === 'super_admin' ? undefined : req.user?.companyId;
    return this.enterpriseService.getMultiBranchComparison(body.branchIds, companyId);
  }

  @Get('enterprise/optimization/report')
  @ApiOperation({ summary: 'Get performance optimization recommendations' })
  @ApiResponse({ status: 200, description: 'Optimization report generated successfully' })
  async getOptimizationReport(@Req() req: any) {
    const companyId = req.user?.role === 'super_admin' ? undefined : req.user?.companyId;
    return this.enterpriseService.getPerformanceOptimizationReport(companyId);
  }

  @Post('enterprise/alerts/rule')
  @ApiOperation({ summary: 'Create custom alert rule' })
  @ApiResponse({ status: 201, description: 'Alert rule created successfully' })
  async createAlertRule(
    @Body() rule: {
      name: string;
      description: string;
      conditions: Array<{
        metric: string;
        operator: '>' | '<' | '=' | '>=' | '<=';
        value: number;
        timeWindow: number;
      }>;
      severity: 'low' | 'medium' | 'high' | 'critical';
      actions: {
        email?: boolean;
        webhook?: string;
        escalation?: {
          after: number;
          to: string[];
        };
      };
    },
    @Req() req: any
  ) {
    const companyId = req.user?.role === 'super_admin' ? undefined : req.user?.companyId;
    const branchId = req.user?.branchId;
    
    return this.enterpriseService.generateAlertRule({
      ...rule,
      companyId,
      branchId
    });
  }

  @Get('enterprise/alerts/history')
  @ApiOperation({ summary: 'Get alert history' })
  @ApiResponse({ status: 200, description: 'Alert history retrieved successfully' })
  @ApiQuery({ name: 'branchId', required: false })
  @ApiQuery({ name: 'severity', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async getAlertHistory(
    @Query('branchId') branchId?: string,
    @Query('severity') severity?: string,
    @Query('limit') limit?: number,
    @Req() req?: any
  ) {
    const companyId = req.user?.role === 'super_admin' ? undefined : req.user?.companyId;
    return this.enterpriseService.getAlertHistory(companyId, branchId, limit, severity);
  }

  // Real-time Status Endpoints
  @Get('realtime/printers/status')
  @ApiOperation({ summary: 'Get real-time printer statuses with live metrics' })
  @ApiResponse({ status: 200, description: 'Real-time printer statuses retrieved successfully' })
  async getRealtimePrinterStatus(@Req() req: any) {
    const companyId = req.user?.role === 'super_admin' ? undefined : req.user?.companyId;
    const branchId = req.user?.branchId;
    
    // This would integrate with the WebSocket gateway to get live data
    const systemAnalytics = await this.analyticsService.getSystemAnalytics(companyId, branchId);
    
    return {
      timestamp: new Date(),
      live: true,
      analytics: systemAnalytics,
      connectionCount: this.getActiveWebSocketConnections()
    };
  }

  @Get('realtime/performance/metrics')
  @ApiOperation({ summary: 'Get real-time performance metrics' })
  @ApiResponse({ status: 200, description: 'Real-time performance metrics retrieved successfully' })
  async getRealtimePerformanceMetrics(@Req() req: any) {
    const companyId = req.user?.role === 'super_admin' ? undefined : req.user?.companyId;
    const branchId = req.user?.branchId;
    
    const [analytics, performance] = await Promise.all([
      this.analyticsService.getSystemAnalytics(companyId, branchId),
      this.analyticsService.getPerformanceReport('hour', companyId, branchId)
    ]);
    
    return {
      timestamp: new Date(),
      live: true,
      currentMetrics: analytics.performance,
      hourlyPerformance: performance,
      trends: analytics.trends
    };
  }

  @Post('realtime/printer/:printerId/stress-test')
  @ApiOperation({ summary: 'Start real-time stress test on printer' })
  @ApiResponse({ status: 200, description: 'Stress test started successfully' })
  async startStressTest(
    @Param('printerId') printerId: string,
    @Body() options: {
      duration?: number; // minutes
      jobCount?: number;
      intensity?: 'low' | 'medium' | 'high';
    },
    @Req() req: any
  ) {
    const companyId = req.user?.role === 'super_admin' ? undefined : req.user?.companyId;
    
    // Run the stress test suite
    const report = await this.testingService.runTestSuite(printerId, 'performance', {
      parameters: {
        ...options,
        realtime: true
      },
      companyId
    });
    
    return {
      testId: report.id,
      status: 'started',
      estimatedDuration: report.suiteName,
      realTimeUpdates: true,
      message: 'Stress test started - monitor via WebSocket for real-time updates'
    };
  }

  // Helper method to get WebSocket connection count
  private getActiveWebSocketConnections(): number {
    // This would be implemented by the WebSocket gateway
    return 0; // Placeholder
  }

  // Health Check Endpoint
  @Get('health/detailed')
  @ApiOperation({ summary: 'Get detailed health check of Phase 4 monitoring systems' })
  @ApiResponse({ status: 200, description: 'Health check completed successfully' })
  async getDetailedHealthCheck(@Req() req: any) {
    const companyId = req.user?.role === 'super_admin' ? undefined : req.user?.companyId;
    
    try {
      // Test all Phase 4 services
      const [analytics, testSuites, systemMetrics] = await Promise.all([
        this.analyticsService.getSystemAnalytics(companyId).then(() => true).catch(() => false),
        this.testingService.getAvailableTestSuites().then(() => true).catch(() => false),
        this.enterpriseService.getSystemWideMetrics().then(() => true).catch(() => false)
      ]);
      
      const allHealthy = analytics && testSuites && systemMetrics;
      
      return {
        status: allHealthy ? 'healthy' : 'degraded',
        timestamp: new Date(),
        services: {
          advancedAnalytics: {
            status: analytics ? 'healthy' : 'error',
            description: 'Advanced printer analytics and reporting'
          },
          printerTesting: {
            status: testSuites ? 'healthy' : 'error',
            description: 'Comprehensive printer testing framework'
          },
          enterpriseMonitoring: {
            status: systemMetrics ? 'healthy' : 'error',
            description: 'Enterprise-grade monitoring and alerting'
          }
        },
        phase4Features: {
          realTimeMonitoring: true,
          predictiveAnalytics: true,
          advancedTesting: true,
          enterpriseDashboard: true,
          multiLocationSupport: true
        }
      };
    } catch (error) {
      return {
        status: 'error',
        timestamp: new Date(),
        error: error.message,
        message: 'Phase 4 health check failed'
      };
    }
  }
}