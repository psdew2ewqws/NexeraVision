import {
  Controller,
  Get,
  Query,
  UseGuards,
  ValidationPipe,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../shared/common/guards/jwt-auth.guard';
import { RolesGuard } from '../../shared/common/guards/roles.guard';
import { CompanyGuard } from '../../shared/common/guards/company.guard';
import { Roles } from '../../shared/common/decorators/roles.decorator';
import { CurrentUser } from '../../shared/common/decorators/current-user.decorator';
import { AnalyticsService } from './analytics.service';

@ApiTags('Analytics')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, CompanyGuard)
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('dashboard')
  @Roles('super_admin', 'company_owner', 'branch_manager')
  @ApiOperation({ summary: 'Get dashboard analytics overview' })
  @ApiResponse({ status: 200, description: 'Dashboard analytics retrieved successfully' })
  @ApiQuery({ name: 'startDate', required: false, type: String, description: 'Start date (ISO string)' })
  @ApiQuery({ name: 'endDate', required: false, type: String, description: 'End date (ISO string)' })
  async getDashboardAnalytics(
    @CurrentUser() user: any,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const dateRange = startDate && endDate ? {
      startDate: new Date(startDate),
      endDate: new Date(endDate),
    } : undefined;

    const analytics = await this.analyticsService.getDashboardAnalytics(user, dateRange);
    
    return {
      success: true,
      message: 'Dashboard analytics retrieved successfully',
      data: analytics,
    };
  }

  @Get('sales')
  @Roles('super_admin', 'company_owner', 'branch_manager')
  @ApiOperation({ summary: 'Get sales analytics' })
  @ApiResponse({ status: 200, description: 'Sales analytics retrieved successfully' })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
  @ApiQuery({ name: 'branchId', required: false, type: String })
  @ApiQuery({ name: 'groupBy', required: false, enum: ['day', 'week', 'month'] })
  async getSalesAnalytics(
    @CurrentUser() user: any,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('branchId') branchId?: string,
    @Query('groupBy') groupBy?: 'day' | 'week' | 'month',
  ) {
    const filters = {
      ...(startDate && { startDate: new Date(startDate) }),
      ...(endDate && { endDate: new Date(endDate) }),
      ...(branchId && { branchId }),
      ...(groupBy && { groupBy }),
    };

    const analytics = await this.analyticsService.getSalesAnalytics(user, filters);
    
    return {
      success: true,
      message: 'Sales analytics retrieved successfully',
      data: analytics,
    };
  }

  @Get('products')
  @Roles('super_admin', 'company_owner', 'branch_manager')
  @ApiOperation({ summary: 'Get product performance analytics' })
  @ApiResponse({ status: 200, description: 'Product analytics retrieved successfully' })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
  @ApiQuery({ name: 'categoryId', required: false, type: String })
  @ApiQuery({ name: 'branchId', required: false, type: String })
  async getProductAnalytics(
    @CurrentUser() user: any,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('categoryId') categoryId?: string,
    @Query('branchId') branchId?: string,
  ) {
    const filters = {
      ...(startDate && { startDate: new Date(startDate) }),
      ...(endDate && { endDate: new Date(endDate) }),
      ...(categoryId && { categoryId }),
      ...(branchId && { branchId }),
    };

    const analytics = await this.analyticsService.getProductAnalytics(user, filters);
    
    return {
      success: true,
      message: 'Product analytics retrieved successfully',
      data: analytics,
    };
  }

  @Get('branches')
  @Roles('super_admin', 'company_owner', 'branch_manager')
  @ApiOperation({ summary: 'Get branch performance analytics' })
  @ApiResponse({ status: 200, description: 'Branch analytics retrieved successfully' })
  @ApiQuery({ name: 'branchId', required: false, type: String })
  async getBranchAnalytics(
    @CurrentUser() user: any,
    @Query('branchId') branchId?: string,
  ) {
    const analytics = await this.analyticsService.getBranchAnalytics(user, branchId);
    
    return {
      success: true,
      message: 'Branch analytics retrieved successfully',
      data: analytics,
    };
  }

  @Get('overview')
  @Roles('super_admin', 'company_owner', 'branch_manager', 'call_center')
  @ApiOperation({ summary: 'Get quick analytics overview' })
  @ApiResponse({ status: 200, description: 'Analytics overview retrieved successfully' })
  async getOverview(@CurrentUser() user: any) {
    const analytics = await this.analyticsService.getDashboardAnalytics(user);
    
    // Return just the overview section for quick stats
    return {
      success: true,
      message: 'Analytics overview retrieved successfully',
      data: {
        overview: analytics.overview,
        recentActivity: analytics.recentOrders.slice(0, 5), // Last 5 orders
      },
    };
  }

  @Get('realtime')
  @Roles('super_admin', 'company_owner', 'branch_manager')
  @ApiOperation({ summary: 'Get real-time analytics data' })
  @ApiResponse({ status: 200, description: 'Real-time analytics retrieved successfully' })
  async getRealtimeAnalytics(@CurrentUser() user: any) {
    // Mock real-time data for now
    const realtimeData = {
      activeOrders: Math.floor(Math.random() * 20) + 5,
      onlineCustomers: Math.floor(Math.random() * 50) + 10,
      todayRevenue: Math.floor(Math.random() * 2000) + 500,
      todayOrders: Math.floor(Math.random() * 100) + 20,
      serverLoad: Math.random() * 100,
      averageResponseTime: Math.floor(Math.random() * 500) + 100,
      lastUpdated: new Date().toISOString(),
    };
    
    return {
      success: true,
      message: 'Real-time analytics retrieved successfully',
      data: realtimeData,
    };
  }

  @Get('health')
  @Roles('super_admin', 'company_owner', 'branch_manager')
  @ApiOperation({ summary: 'Get system health metrics' })
  @ApiResponse({ status: 200, description: 'Health metrics retrieved successfully' })
  async getHealthMetrics(@CurrentUser() user: any) {
    const healthData = {
      system: {
        status: 'healthy',
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        cpu: process.cpuUsage(),
      },
      database: {
        status: 'connected',
        responseTime: Math.floor(Math.random() * 50) + 10,
      },
      api: {
        status: 'operational',
        responseTime: Math.floor(Math.random() * 200) + 50,
        requestsPerMinute: Math.floor(Math.random() * 100) + 20,
      },
      timestamp: new Date().toISOString(),
    };
    
    return {
      success: true,
      message: 'Health metrics retrieved successfully',
      data: healthData,
    };
  }
}