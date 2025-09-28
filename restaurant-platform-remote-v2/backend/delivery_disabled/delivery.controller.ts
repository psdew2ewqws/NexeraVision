import { 
  Controller, 
  Get, 
  Post, 
  Body, 
  Patch, 
  Param, 
  Delete,
  Query,
  UseGuards,
  Request
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery, ApiParam } from '@nestjs/swagger';
import { DeliveryService } from './delivery.service';
import { CreateDeliveryZoneDto } from './dto/create-delivery-zone.dto';
import { UpdateDeliveryZoneDto } from './dto/update-delivery-zone.dto';
import { CreateJordanLocationDto } from './dto/create-jordan-location.dto';
import { CreateDeliveryProviderDto } from './dto/create-delivery-provider.dto';
import { CreateCompanyProviderConfigDto, ProviderType } from './dto/create-company-provider-config.dto';
import { CreateBranchProviderMappingDto } from './dto/create-branch-provider-mapping.dto';
import { TestProviderConnectionDto, CreateOrderWithProviderDto } from './dto/test-provider-connection.dto';
import { WebhookPayloadDto, ProcessWebhookResponseDto } from './dto/webhook-payload.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('Delivery Management')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('delivery')
export class DeliveryController {
  constructor(private readonly deliveryService: DeliveryService) {}

  // Delivery Zones Endpoints
  @Post('zones')
  @Roles('super_admin', 'company_owner', 'branch_manager')
  @ApiOperation({ summary: 'Create a new delivery zone' })
  @ApiResponse({ status: 201, description: 'Delivery zone created successfully' })
  async createDeliveryZone(@Body() createDeliveryZoneDto: CreateDeliveryZoneDto) {
    return this.deliveryService.createDeliveryZone(createDeliveryZoneDto);
  }

  @Get('zones')
  @Public()
  @ApiOperation({ summary: 'Get all delivery zones' })
  @ApiQuery({ name: 'branchId', required: false, description: 'Filter by branch ID' })
  @ApiQuery({ name: 'companyId', required: false, description: 'Filter by company ID' })
  async findAllDeliveryZones(
    @Query('branchId') branchId?: string,
    @Query('companyId') companyId?: string
  ) {
    return this.deliveryService.findAllDeliveryZones(branchId, companyId);
  }

  @Get('zones/:id')
  @Roles('super_admin', 'company_owner', 'branch_manager', 'call_center')
  @ApiOperation({ summary: 'Get delivery zone by ID' })
  async findOneDeliveryZone(@Param('id') id: string) {
    return this.deliveryService.findOneDeliveryZone(id);
  }

  @Patch('zones/:id')
  @Roles('super_admin', 'company_owner', 'branch_manager')
  @ApiOperation({ summary: 'Update delivery zone' })
  async updateDeliveryZone(
    @Param('id') id: string,
    @Body() updateDeliveryZoneDto: UpdateDeliveryZoneDto,
  ) {
    return this.deliveryService.updateDeliveryZone(id, updateDeliveryZoneDto);
  }

  @Delete('zones/:id')
  @Roles('super_admin', 'company_owner', 'branch_manager')
  @ApiOperation({ summary: 'Delete delivery zone' })
  async removeDeliveryZone(@Param('id') id: string) {
    return this.deliveryService.removeDeliveryZone(id);
  }

  // Jordan Locations Endpoints
  @Post('jordan-locations')
  @Roles('super_admin')
  @ApiOperation({ summary: 'Create a new Jordan location' })
  @ApiResponse({ status: 201, description: 'Jordan location created successfully' })
  async createJordanLocation(@Body() createJordanLocationDto: CreateJordanLocationDto) {
    return this.deliveryService.createJordanLocation(createJordanLocationDto);
  }

  @Get('jordan-locations')
  @Public()
  @ApiOperation({ summary: 'Get all Jordan locations with pagination support' })
  @ApiQuery({ name: 'governorate', required: false })
  @ApiQuery({ name: 'city', required: false })
  @ApiQuery({ name: 'limit', required: false, description: 'Number of results to return' })
  @ApiQuery({ name: 'offset', required: false, description: 'Number of results to skip' })
  @ApiQuery({ name: 'sortBy', required: false, description: 'Field to sort by' })
  @ApiQuery({ name: 'sortOrder', required: false, description: 'Sort order (asc/desc)' })
  async findAllJordanLocations(
    @Query('governorate') governorate?: string,
    @Query('city') city?: string,
    @Query('limit') limitParam?: string,
    @Query('offset') offsetParam?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: string,
  ) {
    const limit = limitParam ? parseInt(limitParam, 10) : undefined;
    const offset = offsetParam ? parseInt(offsetParam, 10) : undefined;
    return this.deliveryService.findAllJordanLocations(governorate, city, limit, offset, sortBy, sortOrder);
  }

  @Get('jordan-locations/search')
  @Public()
  @ApiOperation({ summary: 'Search Jordan locations by area name' })
  @ApiQuery({ name: 'q', description: 'Search term for area name' })
  @ApiQuery({ name: 'limit', required: false, description: 'Limit results (default 100)' })
  async searchJordanLocations(
    @Query('q') searchTerm: string,
    @Query('limit') limit?: string
  ) {
    return this.deliveryService.findJordanLocationsByArea(
      searchTerm, 
      limit ? parseInt(limit) : undefined
    );
  }

  @Get('locations/by-role')
  @Roles('super_admin', 'company_owner', 'branch_manager')
  @ApiOperation({ summary: 'Get available locations based on user role and hierarchy' })
  @ApiQuery({ name: 'role', description: 'User role' })
  @ApiQuery({ name: 'companyId', required: false, description: 'Company ID for company_owner' })
  @ApiQuery({ name: 'branchId', required: false, description: 'Branch ID for branch_manager' })
  async getLocationsByRole(
    @Query('role') role: string,
    @Query('companyId') companyId?: string,
    @Query('branchId') branchId?: string
  ) {
    return this.deliveryService.getAvailableLocationsByRole(role, companyId, branchId);
  }

  @Get('locations/statistics')
  @Public()
  @ApiOperation({ summary: 'Get location statistics with hierarchy breakdown' })
  @ApiQuery({ name: 'companyId', required: false, description: 'Filter by company' })
  async getLocationStatistics(@Query('companyId') companyId?: string) {
    return this.deliveryService.getLocationStatistics(companyId);
  }

  @Post('locations/bulk-assign')
  @Roles('super_admin', 'company_owner', 'branch_manager')
  @ApiOperation({ summary: 'Bulk assign locations to delivery zones' })
  async bulkAssignLocations(@Body() body: {
    locationIds: string[];
    zoneId: string;
    companyId?: string;
    branchId?: string;
  }) {
    return this.deliveryService.bulkAssignLocationsToZones(body);
  }

  // Delivery Providers Endpoints
  @Post('providers')
  @Roles('super_admin')
  @ApiOperation({ summary: 'Create a new delivery provider' })
  @ApiResponse({ status: 201, description: 'Delivery provider created successfully' })
  async createDeliveryProvider(@Body() createDeliveryProviderDto: CreateDeliveryProviderDto) {
    return this.deliveryService.createDeliveryProvider(createDeliveryProviderDto);
  }

  @Get('providers')
  @Public()
  @ApiOperation({ summary: 'Get all delivery providers' })
  @ApiQuery({ name: 'activeOnly', required: false, type: 'boolean' })
  @ApiQuery({ name: 'companyId', required: false, description: 'Filter by company (includes global providers)' })
  async findAllDeliveryProviders(
    @Query('activeOnly') activeOnly?: boolean,
    @Query('companyId') companyId?: string
  ) {
    return this.deliveryService.findAllDeliveryProviders(activeOnly, companyId);
  }

  @Get('providers/:id')
  @ApiOperation({ summary: 'Get delivery provider by ID' })
  async findOneDeliveryProvider(@Param('id') id: string) {
    return this.deliveryService.findOneDeliveryProvider(id);
  }

  // Delivery Fee Calculator
  @Post('calculate-fee')
  @Public()
  @ApiOperation({ summary: 'Calculate delivery fee for coordinates' })
  @ApiResponse({ 
    status: 200, 
    description: 'Delivery fee calculated successfully',
    schema: {
      example: {
        zone: { id: '...', zoneName: { en: 'Downtown', ar: 'وسط البلد' } },
        provider: { id: '...', name: 'dhub' },
        fee: 3.50,
        estimatedTime: 30,
        distance: 2.5
      }
    }
  })
  async calculateDeliveryFee(@Body() body: { branchId: string; lat: number; lng: number }) {
    const { branchId, lat, lng } = body;
    return this.deliveryService.calculateDeliveryFee(branchId, lat, lng);
  }

  // Location Validation
  @Post('validate-location')
  @Public()
  @ApiOperation({ summary: 'Validate if delivery is available to location' })
  async validateDeliveryLocation(@Body() body: { branchId: string; lat: number; lng: number }) {
    const { branchId, lat, lng } = body;
    return this.deliveryService.validateDeliveryLocation(branchId, lat, lng);
  }

  // Delivery Statistics
  @Get('stats')
  @Public()
  @ApiOperation({ summary: 'Get delivery statistics' })
  @ApiQuery({ name: 'branchId', required: false })
  @ApiQuery({ name: 'companyId', required: false, description: 'Filter statistics by company' })
  async getDeliveryStats(
    @Query('branchId') branchId?: string,
    @Query('companyId') companyId?: string
  ) {
    // Use the new multi-tenant statistics method
    return this.deliveryService.getDeliveryStatistics(companyId);
  }

  // Multi-tenant Provider Orders
  @Get('provider-orders')
  @Roles('super_admin', 'company_owner', 'branch_manager', 'call_center')
  @ApiOperation({ summary: 'Get delivery provider orders for company' })
  @ApiQuery({ name: 'companyId', required: true, description: 'Company ID' })
  @ApiQuery({ name: 'status', required: false, description: 'Filter by order status' })
  async getProviderOrders(
    @Query('companyId') companyId: string,
    @Query('status') status?: string
  ) {
    return this.deliveryService.findCompanyProviderOrders(companyId, status);
  }

  @Post('provider-orders')
  @Roles('super_admin', 'company_owner', 'branch_manager')
  @ApiOperation({ summary: 'Create delivery provider order' })
  async createProviderOrder(@Body() createOrderDto: {
    companyId: string;
    branchId: string;
    deliveryProviderId: string;
    providerOrderId: string;
    orderNumber: string;
    orderDetails: any;
    customerDetails?: any;
    deliveryAddress?: any;
  }) {
    return this.deliveryService.createProviderOrder(createOrderDto);
  }

  @Patch('provider-orders/:id/status')
  @Public() // Allow webhooks from providers
  @ApiOperation({ summary: 'Update provider order status (webhook endpoint)' })
  async updateProviderOrderStatus(
    @Param('id') id: string,
    @Body() updateDto: {
      orderStatus: string;
      webhookData?: any;
    }
  ) {
    return this.deliveryService.updateProviderOrderStatus(
      id, 
      updateDto.orderStatus, 
      updateDto.webhookData
    );
  }

  // Location Assignment Endpoints
  @Post('assign-location-to-branch')
  @Roles('super_admin', 'company_owner', 'branch_manager')
  @ApiOperation({ summary: 'Assign a location to a branch (creates delivery zone)' })
  async assignLocationToBranch(@Body() body: {
    locationId: string;
    branchId: string;
    deliveryFee?: number;
    isActive?: boolean;
  }) {
    return this.deliveryService.assignLocationToBranch(body);
  }

  @Post('assign-locations-to-branch')
  @Roles('super_admin', 'company_owner', 'branch_manager')
  @ApiOperation({ summary: 'Assign multiple locations to a branch (creates delivery zones)' })
  async assignLocationsToBranch(@Body() body: {
    locationIds: string[];
    branchId: string;
    deliveryFee?: number;
    isActive?: boolean;
  }) {
    return this.deliveryService.assignLocationsToBranch(body);
  }

  @Delete('unassign-location-from-branch')
  @Roles('super_admin', 'company_owner', 'branch_manager')
  @ApiOperation({ summary: 'Remove location assignment from a branch (deletes delivery zone)' })
  async unassignLocationFromBranch(@Body() body: {
    locationId: string;
    branchId: string;
  }) {
    return this.deliveryService.unassignLocationFromBranch(body);
  }

  @Get('locations-with-branches')
  @Public()
  @ApiOperation({ summary: 'Get all locations with their assigned branches' })
  @ApiQuery({ name: 'locationId', required: false, description: 'Filter by specific location' })
  @ApiQuery({ name: 'companyId', required: false, description: 'Filter by company' })
  async getLocationsWithBranches(
    @Query('locationId') locationId?: string,
    @Query('companyId') companyId?: string,
  ) {
    return this.deliveryService.getLocationsWithBranches(locationId, companyId);
  }

  // Bulk Operations
  @Post('zones/bulk-activate')
  @Roles('super_admin', 'company_owner', 'branch_manager')
  @ApiOperation({ summary: 'Bulk activate/deactivate delivery zones' })
  async bulkActivateZones(@Body() body: { zoneIds: string[]; isActive: boolean }) {
    // Implementation for bulk operations would go here
    return { message: 'Bulk operation completed' };
  }

  // ===== MULTI-TENANT PROVIDER CONFIGURATION ENDPOINTS =====
  
  // Company Provider Configuration Management
  @Post('company-provider-configs')
  @Roles('super_admin')
  @ApiOperation({ summary: 'Create company provider configuration (Super Admin Only)' })
  @ApiResponse({ status: 201, description: 'Provider configuration created successfully' })
  async createCompanyProviderConfig(
    @Body() createDto: CreateCompanyProviderConfigDto,
    @Request() req: any
  ) {
    return this.deliveryService.createCompanyProviderConfig(createDto, req.user?.userId);
  }

  @Get('company-provider-configs')
  @Roles('super_admin', 'company_owner')
  @ApiOperation({ summary: 'Get all company provider configurations' })
  @ApiQuery({ name: 'companyId', required: false, description: 'Filter by company ID' })
  @ApiQuery({ name: 'providerType', required: false, enum: ProviderType, description: 'Filter by provider type' })
  @ApiQuery({ name: 'activeOnly', required: false, type: 'boolean', description: 'Show only active configurations' })
  async findAllCompanyProviderConfigs(
    @Query('companyId') companyId?: string,
    @Query('providerType') providerType?: ProviderType,
    @Query('activeOnly') activeOnly?: boolean
  ) {
    return this.deliveryService.findAllCompanyProviderConfigs(companyId, providerType, activeOnly !== false);
  }

  @Get('company-provider-configs/:id')
  @Roles('super_admin', 'company_owner')
  @ApiOperation({ summary: 'Get company provider configuration by ID' })
  async findOneCompanyProviderConfig(@Param('id') id: string) {
    return this.deliveryService.findOneCompanyProviderConfig(id);
  }

  @Patch('company-provider-configs/:id')
  @Roles('super_admin')
  @ApiOperation({ summary: 'Update company provider configuration (Super Admin Only)' })
  async updateCompanyProviderConfig(
    @Param('id') id: string,
    @Body() updateData: Partial<CreateCompanyProviderConfigDto>,
    @Request() req: any
  ) {
    return this.deliveryService.updateCompanyProviderConfig(id, updateData, req.user?.userId);
  }

  @Delete('company-provider-configs/:id')
  @Roles('super_admin')
  @ApiOperation({ summary: 'Delete company provider configuration (Super Admin Only)' })
  async deleteCompanyProviderConfig(@Param('id') id: string) {
    return this.deliveryService.deleteCompanyProviderConfig(id);
  }

  // Branch-to-Provider Mapping Management
  @Post('branch-provider-mappings')
  @Roles('super_admin', 'company_owner', 'branch_manager')
  @ApiOperation({ summary: 'Create branch-to-provider mapping' })
  @ApiResponse({ status: 201, description: 'Branch provider mapping created successfully' })
  async createBranchProviderMapping(
    @Body() createDto: CreateBranchProviderMappingDto,
    @Request() req: any
  ) {
    return this.deliveryService.createBranchProviderMapping(createDto, req.user?.userId);
  }

  @Get('branch-provider-mappings')
  @Roles('super_admin', 'company_owner', 'branch_manager')
  @ApiOperation({ summary: 'Get all branch provider mappings' })
  @ApiQuery({ name: 'branchId', required: false, description: 'Filter by branch ID' })
  @ApiQuery({ name: 'companyId', required: false, description: 'Filter by company ID' })
  @ApiQuery({ name: 'providerType', required: false, enum: ProviderType, description: 'Filter by provider type' })
  async findAllBranchProviderMappings(
    @Query('branchId') branchId?: string,
    @Query('companyId') companyId?: string,
    @Query('providerType') providerType?: ProviderType
  ) {
    return this.deliveryService.findAllBranchProviderMappings(branchId, companyId, providerType);
  }

  @Patch('branch-provider-mappings/:id')
  @Roles('super_admin', 'company_owner', 'branch_manager')
  @ApiOperation({ summary: 'Update branch provider mapping' })
  async updateBranchProviderMapping(
    @Param('id') id: string,
    @Body() updateData: Partial<CreateBranchProviderMappingDto>,
    @Request() req: any
  ) {
    return this.deliveryService.updateBranchProviderMapping(id, updateData, req.user?.userId);
  }

  // Provider Connection Testing
  @Post('test-provider-connection')
  @Roles('super_admin', 'company_owner')
  @ApiOperation({ 
    summary: 'Test provider connection and credentials',
    description: 'Test connection to delivery provider using stored credentials and configuration'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Connection test completed',
    schema: {
      example: {
        success: true,
        message: 'DHUB connection successful',
        providerType: 'dhub',
        testDetails: {
          apiBaseUrl: 'https://api.dhub.com',
          tokenValid: true,
          testLatitude: 31.905614,
          testLongitude: 35.922546
        },
        logId: 'uuid'
      }
    }
  })
  async testProviderConnection(
    @Body() testDto: TestProviderConnectionDto,
    @Request() req: any
  ) {
    return this.deliveryService.testProviderConnection(testDto, req.user?.userId);
  }

  // Provider Order Creation
  @Post('create-order-with-provider')
  @Roles('super_admin', 'company_owner', 'branch_manager')
  @ApiOperation({ 
    summary: 'Create order with delivery provider',
    description: 'Send order to external delivery provider (Talabat, Careem, DHUB, etc.)'
  })
  @ApiResponse({ 
    status: 201, 
    description: 'Order created with provider successfully',
    schema: {
      example: {
        success: true,
        providerOrderId: 'DHUB-1234567890-abc123',
        message: 'DHUB order created successfully',
        estimatedDeliveryTime: 30,
        trackingUrl: 'https://api.dhub.com/track/DHUB-1234567890-abc123',
        logId: 'uuid'
      }
    }
  })
  async createOrderWithProvider(
    @Body() orderDto: CreateOrderWithProviderDto,
    @Request() req: any
  ) {
    return this.deliveryService.createOrderWithProvider(orderDto, req.user?.userId);
  }

  // Provider Configuration Statistics
  @Get('provider-configuration-stats')
  @Roles('super_admin', 'company_owner')
  @ApiOperation({ summary: 'Get provider configuration statistics' })
  @ApiQuery({ name: 'companyId', required: false, description: 'Filter by company ID' })
  @ApiResponse({
    status: 200,
    description: 'Provider configuration statistics',
    schema: {
      example: {
        configurations: {
          total: 5,
          active: 4,
          inactive: 1
        },
        mappings: {
          total: 12,
          active: 10,
          inactive: 2
        },
        orders: {
          total: 156,
          success: 142,
          failed: 8,
          pending: 6
        }
      }
    }
  })
  async getProviderConfigurationStats(@Query('companyId') companyId?: string) {
    return this.deliveryService.getProviderConfigurationStats(companyId);
  }

  @Get('provider-analytics')
  @Roles('super_admin', 'company_owner', 'branch_manager')
  @ApiOperation({ summary: 'Get comprehensive provider analytics' })
  @ApiQuery({ name: 'companyId', required: false, description: 'Filter by company ID' })
  @ApiQuery({ name: 'timeframe', required: false, description: 'Time frame (24h, 7d, 30d, 90d)' })
  @ApiQuery({ name: 'providerType', required: false, enum: ProviderType, description: 'Filter by provider type' })
  @ApiResponse({
    status: 200,
    description: 'Provider analytics data',
    schema: {
      example: {
        overview: {
          totalOrders: 2847,
          successfulOrders: 2695,
          failedOrders: 152,
          averageDeliveryTime: 28.5,
          totalRevenue: 42350.75,
          successRate: 94.6
        },
        providerPerformance: [
          {
            providerType: 'dhub',
            totalOrders: 856,
            successRate: 96.2,
            avgDeliveryTime: 25.3,
            totalRevenue: 15240.50,
            trend: 'up',
            issues: 8
          }
        ],
        timeSeriesData: [
          {
            date: '2024-01-15',
            orders: 425,
            revenue: 7250.50,
            avgDeliveryTime: 27.5
          }
        ],
        webhookStats: {
          totalWebhooks: 15420,
          successfulWebhooks: 14892,
          failedWebhooks: 528,
          successRate: 96.6,
          eventTypeBreakdown: {
            order_created: 3855,
            order_confirmed: 3698,
            order_delivered: 3542
          }
        },
        orderDistribution: {
          dhub: 30.1,
          talabat: 25.8,
          careem: 21.9
        },
        performanceMetrics: {
          onTimeDelivery: 87.3,
          customerRating: 4.2,
          orderAccuracy: 94.8,
          responseTime: 1.8
        }
      }
    }
  })
  async getProviderAnalytics(
    @Query('companyId') companyId?: string,
    @Query('timeframe') timeframe?: string,
    @Query('providerType') providerType?: ProviderType
  ) {
    return this.deliveryService.getProviderAnalytics(companyId, timeframe || '7d', providerType);
  }

  // ===== CREDENTIAL MANAGEMENT ENDPOINTS =====
  
  @Post('provider-configs/:configId/refresh-credentials')
  @Roles('super_admin', 'company_owner', 'branch_manager')
  @ApiOperation({ 
    summary: 'Refresh provider credentials',
    description: 'Manually refresh OAuth2 tokens or validate API keys for a specific provider configuration'
  })
  @ApiResponse({ status: 200, description: 'Credentials refreshed successfully' })
  @ApiResponse({ status: 404, description: 'Configuration not found' })
  @ApiResponse({ status: 400, description: 'Credential refresh failed' })
  async refreshProviderCredentials(
    @Param('configId') configId: string
  ) {
    return this.deliveryService.refreshProviderCredentials(configId);
  }

  @Post('provider-configs/refresh-expiring')
  @Roles('super_admin')
  @ApiOperation({ 
    summary: 'Refresh all expiring credentials',
    description: 'Batch refresh all provider credentials that are expiring within 24 hours'
  })
  @ApiResponse({ status: 200, description: 'Batch refresh completed' })
  async refreshExpiringCredentials() {
    return this.deliveryService.refreshExpiringCredentials();
  }

  @Get('provider-configs/credential-health')
  @Roles('super_admin', 'company_owner', 'branch_manager')
  @ApiOperation({ 
    summary: 'Check credential health',
    description: 'Get health status of all provider credentials including expiration warnings'
  })
  @ApiQuery({ name: 'companyId', required: false, description: 'Filter by company ID' })
  @ApiResponse({ status: 200, description: 'Credential health report generated' })
  async checkCredentialHealth(
    @Query('companyId') companyId?: string
  ) {
    return this.deliveryService.checkCredentialHealth(companyId);
  }

  // ===== ZONE OPTIMIZATION ENDPOINTS =====
  
  @Post('zones/optimize')
  @Roles('super_admin', 'company_owner', 'branch_manager')
  @ApiOperation({ 
    summary: 'Optimize delivery zones',
    description: 'Analyze delivery zones and provide optimization recommendations based on provider coverage'
  })
  @ApiQuery({ name: 'companyId', required: false, description: 'Filter by company ID' })
  @ApiResponse({ status: 200, description: 'Zone optimization analysis completed' })
  async optimizeDeliveryZones(
    @Query('companyId') companyId?: string
  ) {
    return this.deliveryService.optimizeDeliveryZones(companyId);
  }

  @Get('zones/optimization-analytics')
  @Roles('super_admin', 'company_owner', 'branch_manager')
  @ApiOperation({ 
    summary: 'Get zone optimization analytics',
    description: 'Get comprehensive analytics for delivery zone optimization including trends and benchmarks'
  })
  @ApiQuery({ name: 'companyId', required: false, description: 'Filter by company ID' })
  @ApiResponse({ status: 200, description: 'Zone optimization analytics retrieved' })
  async getZoneOptimizationAnalytics(
    @Query('companyId') companyId?: string
  ) {
    return this.deliveryService.getZoneOptimizationAnalytics(companyId);
  }

  // ===== REAL-TIME TRACKING ENDPOINTS =====
  
  @Post('tracking/sessions')
  @Roles('super_admin', 'company_owner', 'branch_manager', 'call_center')
  @ApiOperation({ 
    summary: 'Create real-time tracking session',
    description: 'Initialize real-time tracking for an order with automatic updates'
  })
  @ApiResponse({ status: 201, description: 'Tracking session created successfully' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  async createTrackingSession(
    @Body('orderId') orderId: string
  ) {
    return this.deliveryService.createRealTimeTrackingSession(orderId);
  }

  @Get('tracking/:orderId')
  @Roles('super_admin', 'company_owner', 'branch_manager', 'call_center')
  @ApiOperation({ 
    summary: 'Get real-time order tracking information',
    description: 'Get current tracking status and location information for an order'
  })
  @ApiParam({ name: 'orderId', description: 'Order ID to track' })
  @ApiResponse({ status: 200, description: 'Tracking information retrieved' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  async getOrderTracking(
    @Param('orderId') orderId: string
  ) {
    return this.deliveryService.getOrderTrackingInfo(orderId);
  }

  @Get('tracking/analytics/overview')
  @Roles('super_admin', 'company_owner', 'branch_manager')
  @ApiOperation({ 
    summary: 'Get tracking analytics overview',
    description: 'Get comprehensive analytics for real-time tracking performance'
  })
  @ApiQuery({ name: 'companyId', required: false, description: 'Filter by company ID' })
  @ApiResponse({ status: 200, description: 'Tracking analytics retrieved' })
  async getTrackingAnalytics(
    @Query('companyId') companyId?: string
  ) {
    return this.deliveryService.getTrackingAnalytics(companyId);
  }

  @Delete('tracking/sessions/cleanup')
  @Roles('super_admin')
  @ApiOperation({ 
    summary: 'Cleanup inactive tracking sessions',
    description: 'Remove completed and expired tracking sessions from memory'
  })
  @ApiResponse({ status: 200, description: 'Cleanup completed' })
  async cleanupTrackingSessions() {
    return this.deliveryService.cleanupTrackingSessions();
  }

  // ===== PERFORMANCE MONITORING ENDPOINTS =====
  
  @Post('performance/monitoring/sessions')
  @Roles('super_admin', 'company_owner', 'branch_manager')
  @ApiOperation({ 
    summary: 'Create performance monitoring session',
    description: 'Initialize real-time performance monitoring for delivery providers'
  })
  @ApiQuery({ name: 'companyId', required: false, description: 'Filter by company ID' })
  @ApiResponse({ status: 201, description: 'Performance monitoring session created' })
  async createPerformanceMonitoringSession(
    @Query('companyId') companyId?: string
  ) {
    return this.deliveryService.createPerformanceMonitoringSession(companyId);
  }

  @Get('performance/reports/comprehensive')
  @Roles('super_admin', 'company_owner', 'branch_manager')
  @ApiOperation({ 
    summary: 'Get comprehensive performance monitoring report',
    description: 'Get detailed performance analysis with alerts and recommendations'
  })
  @ApiQuery({ name: 'companyId', required: false, description: 'Filter by company ID' })
  @ApiResponse({ status: 200, description: 'Performance monitoring report generated' })
  async getPerformanceMonitoringReport(
    @Query('companyId') companyId?: string
  ) {
    return this.deliveryService.getPerformanceMonitoringReport(companyId);
  }

  @Get('performance/dashboard')
  @Roles('super_admin', 'company_owner', 'branch_manager')
  @ApiOperation({ 
    summary: 'Get real-time performance dashboard',
    description: 'Get live performance metrics and alerts dashboard'
  })
  @ApiQuery({ name: 'companyId', required: false, description: 'Filter by company ID' })
  @ApiResponse({ status: 200, description: 'Performance dashboard data retrieved' })
  async getPerformanceDashboard(
    @Query('companyId') companyId?: string
  ) {
    return this.deliveryService.getPerformanceDashboard(companyId);
  }

  // ===== AUTOMATED FAILOVER ENDPOINTS =====
  
  @Post('failover/sessions')
  @Roles('super_admin', 'company_owner', 'branch_manager')
  @ApiOperation({ 
    summary: 'Create automated failover session',
    description: 'Initialize automated failover monitoring and rules for delivery providers'
  })
  @ApiQuery({ name: 'companyId', required: false, description: 'Filter by company ID' })
  @ApiResponse({ status: 201, description: 'Failover session created successfully' })
  async createFailoverSession(
    @Query('companyId') companyId?: string
  ) {
    return this.deliveryService.createFailoverSession(companyId);
  }

  @Post('failover/execute')
  @Roles('super_admin', 'company_owner', 'branch_manager', 'call_center')
  @ApiOperation({ 
    summary: 'Execute automatic failover for an order',
    description: 'Automatically switch an order to the next healthy provider'
  })
  @ApiResponse({ status: 200, description: 'Failover executed successfully' })
  @ApiResponse({ status: 404, description: 'Order or healthy provider not found' })
  async executeFailover(
    @Body('orderId') orderId: string,
    @Body('reason') reason: string
  ) {
    return this.deliveryService.executeFailover(orderId, reason);
  }

  @Post('failover/manual')
  @Roles('super_admin', 'company_owner', 'branch_manager')
  @ApiOperation({ 
    summary: 'Trigger manual failover',
    description: 'Manually switch an order to a specific provider (for testing or emergency)'
  })
  @ApiResponse({ status: 200, description: 'Manual failover executed' })
  @ApiResponse({ status: 404, description: 'Order or target provider not found' })
  async triggerManualFailover(
    @Body('orderId') orderId: string,
    @Body('newProviderId') newProviderId: string,
    @Body('reason') reason: string
  ) {
    return this.deliveryService.triggerManualFailover(orderId, newProviderId, reason);
  }

  @Get('failover/analytics')
  @Roles('super_admin', 'company_owner', 'branch_manager')
  @ApiOperation({ 
    summary: 'Get failover analytics',
    description: 'Get comprehensive analytics on failover performance and patterns'
  })
  @ApiQuery({ name: 'companyId', required: false, description: 'Filter by company ID' })
  @ApiResponse({ status: 200, description: 'Failover analytics retrieved' })
  async getFailoverAnalytics(
    @Query('companyId') companyId?: string
  ) {
    return this.deliveryService.getFailoverAnalytics(companyId);
  }

  @Get('failover/orders/:orderId/status')
  @Roles('super_admin', 'company_owner', 'branch_manager', 'call_center')
  @ApiOperation({ 
    summary: 'Get order failover status',
    description: 'Get failover history and current status for a specific order'
  })
  @ApiParam({ name: 'orderId', description: 'Order ID to check failover status' })
  @ApiResponse({ status: 200, description: 'Order failover status retrieved' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  async getOrderFailoverStatus(
    @Param('orderId') orderId: string
  ) {
    return this.deliveryService.getOrderFailoverStatus(orderId);
  }

  // ===== DASHBOARD INTEGRATION ENDPOINTS =====
  
  @Get('dashboard/provider-overview')
  @Roles('super_admin', 'company_owner')
  @ApiOperation({ summary: 'Get provider overview for dashboard' })
  @ApiQuery({ name: 'companyId', required: false, description: 'Filter by company ID' })
  async getDashboardProviderOverview(@Query('companyId') companyId?: string) {
    const [stats, configs, mappings] = await Promise.all([
      this.deliveryService.getProviderConfigurationStats(companyId),
      this.deliveryService.findAllCompanyProviderConfigs(companyId, undefined, true),
      this.deliveryService.findAllBranchProviderMappings(undefined, companyId)
    ]);

    return {
      statistics: stats,
      recentConfigs: configs.slice(0, 5),
      recentMappings: mappings.slice(0, 5),
      supportedProviders: Object.values(ProviderType)
    };
  }

  // ===== WEBHOOK PROCESSING ENDPOINTS =====
  
  @Post('webhooks/:providerType')
  @Public() // Allow webhooks from external providers
  @ApiOperation({ 
    summary: 'Process provider webhook',
    description: 'Receive and process webhooks from delivery providers (DHUB, Talabat, Careem, etc.)'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Webhook processed successfully',
    type: ProcessWebhookResponseDto
  })
  @ApiResponse({ status: 400, description: 'Invalid webhook payload or signature' })
  async processProviderWebhook(
    @Param('providerType') providerType: ProviderType,
    @Body() webhookPayload: WebhookPayloadDto,
    @Request() req: any
  ): Promise<ProcessWebhookResponseDto> {
    // Extract source IP and headers for security verification
    const sourceIp = req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for'];
    const headers = req.headers;

    // Set provider type from URL parameter
    webhookPayload.providerType = providerType;
    webhookPayload.sourceIp = sourceIp;

    return this.deliveryService.processProviderWebhook(webhookPayload, sourceIp, headers);
  }

  @Get('webhook-logs')
  @Roles('super_admin', 'company_owner')
  @ApiOperation({ summary: 'Get webhook processing logs' })
  @ApiQuery({ name: 'companyId', required: false, description: 'Filter by company ID' })
  @ApiQuery({ name: 'providerType', required: false, enum: ProviderType, description: 'Filter by provider type' })
  @ApiQuery({ name: 'eventType', required: false, description: 'Filter by event type' })
  @ApiQuery({ name: 'limit', required: false, description: 'Limit results (default 50)' })
  @ApiQuery({ name: 'offset', required: false, description: 'Offset for pagination' })
  @ApiResponse({
    status: 200,
    description: 'Webhook logs retrieved successfully',
    schema: {
      example: {
        logs: [
          {
            id: 'uuid',
            providerType: 'dhub',
            eventType: 'order_delivered',
            success: true,
            message: 'Order status updated successfully',
            webhookData: { /* webhook payload */ },
            processedAt: '2024-01-15T10:30:00Z'
          }
        ],
        total: 156,
        hasMore: true
      }
    }
  })
  async getWebhookLogs(
    @Query('companyId') companyId?: string,
    @Query('providerType') providerType?: ProviderType,
    @Query('eventType') eventType?: string,
    @Query('limit') limitParam?: string,
    @Query('offset') offsetParam?: string
  ) {
    const limit = limitParam ? parseInt(limitParam, 10) : 50;
    const offset = offsetParam ? parseInt(offsetParam, 10) : 0;

    return this.deliveryService.getWebhookLogs(
      companyId,
      providerType,
      eventType,
      limit,
      offset
    );
  }

  @Get('webhook-stats')
  @Roles('super_admin', 'company_owner')
  @ApiOperation({ summary: 'Get webhook processing statistics' })
  @ApiQuery({ name: 'companyId', required: false, description: 'Filter by company ID' })
  @ApiQuery({ name: 'timeframe', required: false, description: 'Time frame (24h, 7d, 30d)' })
  @ApiResponse({
    status: 200,
    description: 'Webhook statistics',
    schema: {
      example: {
        totalWebhooks: 1250,
        successfulWebhooks: 1198,
        failedWebhooks: 52,
        successRate: 95.84,
        providerBreakdown: {
          dhub: { total: 450, success: 441, failed: 9 },
          talabat: { total: 380, success: 375, failed: 5 },
          careem: { total: 420, success: 382, failed: 38 }
        },
        eventTypeBreakdown: {
          order_created: 312,
          order_confirmed: 298,
          order_delivered: 285,
          order_cancelled: 47
        },
        timeSeriesData: [
          { date: '2024-01-15', webhooks: 85, success: 82, failed: 3 }
        ]
      }
    }
  })
  async getWebhookStats(
    @Query('companyId') companyId?: string,
    @Query('timeframe') timeframe?: string
  ) {
    return this.deliveryService.getWebhookStatistics(companyId, timeframe || '7d');
  }

  // ===== ORDER STATUS SYNCHRONIZATION ENDPOINTS =====
  
  @Post('sync/order-status/:orderId')
  @Roles('super_admin', 'company_owner', 'branch_manager')
  @ApiOperation({ 
    summary: 'Manually sync order status with provider',
    description: 'Force synchronization of order status with delivery provider'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Order status synchronized successfully',
    schema: {
      example: {
        success: true,
        orderId: 'internal-order-123',
        providerOrderId: 'DHUB-1234567890',
        previousStatus: 'confirmed',
        newStatus: 'in_transit',
        lastUpdated: '2024-01-15T14:25:00Z',
        syncedAt: '2024-01-15T14:30:00Z'
      }
    }
  })
  async syncOrderStatus(@Param('orderId') orderId: string) {
    return this.deliveryService.syncOrderStatusWithProvider(orderId);
  }

  @Post('sync/batch-order-status')
  @Roles('super_admin', 'company_owner')
  @ApiOperation({ 
    summary: 'Batch sync order statuses',
    description: 'Sync status for multiple orders with their respective providers'
  })
  async batchSyncOrderStatus(@Body() body: { 
    orderIds: string[];
    companyId?: string;
  }) {
    return this.deliveryService.batchSyncOrderStatuses(body.orderIds, body.companyId);
  }

  // ===== REAL-TIME TRACKING ENDPOINTS =====

  // ===== MANUAL SYNC ENDPOINTS =====

  @Post('sync/menu')
  @Roles('super_admin', 'company_owner', 'branch_manager')
  @ApiOperation({
    summary: 'Manually sync menu with delivery platforms',
    description: 'Trigger manual menu synchronization with all configured delivery providers'
  })
  @ApiResponse({
    status: 200,
    description: 'Menu sync completed successfully',
    schema: {
      example: {
        success: true,
        results: [
          {
            providerType: 'careem',
            success: true,
            syncedItems: 45,
            failedItems: 0,
            errors: []
          },
          {
            providerType: 'talabat',
            success: true,
            syncedItems: 45,
            failedItems: 0,
            errors: []
          },
          {
            providerType: 'dhub',
            success: true,
            syncedItems: 45,
            failedItems: 0,
            errors: []
          }
        ],
        totalSynced: 135,
        totalFailed: 0,
        syncedAt: '2024-01-15T14:30:00Z'
      }
    }
  })
  async manualMenuSync(
    @Request() req: any,
    @Body() body?: { companyId?: string; branchId?: string; providerType?: string; fullSync?: boolean }
  ) {
    const companyId = body?.companyId || req.user?.companyId;
    const branchId = body?.branchId;

    return this.deliveryService.triggerManualMenuSync(companyId, branchId, body?.providerType, body?.fullSync);
  }

  @Post('sync/order')
  @Roles('super_admin', 'company_owner', 'branch_manager', 'call_center')
  @ApiOperation({
    summary: 'Manually sync specific order with delivery platforms',
    description: 'Trigger manual order synchronization with delivery providers'
  })
  @ApiResponse({
    status: 200,
    description: 'Order sync completed successfully',
    schema: {
      example: {
        success: true,
        orderId: 'order-123',
        providerOrderId: 'CAREEM-789456123',
        providerType: 'careem',
        estimatedDeliveryTime: 35,
        trackingUrl: 'https://careem.com/track/CAREEM-789456123',
        syncedAt: '2024-01-15T14:30:00Z'
      }
    }
  })
  async manualOrderSync(
    @Body() body: {
      orderId: string;
      orderData: any;
      providerType?: string;
      companyId?: string;
      branchId?: string
    },
    @Request() req: any
  ) {
    const companyId = body.companyId || req.user?.companyId;
    const branchId = body.branchId;

    return this.deliveryService.triggerManualOrderSync({
      orderId: body.orderId,
      companyId,
      branchId,
      orderData: body.orderData,
      providerType: body.providerType || 'careem'
    });
  }

  @Post('sync/all')
  @Roles('super_admin', 'company_owner', 'branch_manager')
  @ApiOperation({
    summary: 'Trigger complete sync of menu, orders, and status updates',
    description: 'Comprehensive sync of all delivery platform data'
  })
  @ApiResponse({
    status: 200,
    description: 'Complete sync initiated successfully',
    schema: {
      example: {
        success: true,
        menuSync: {
          totalProviders: 3,
          successfulSyncs: 3,
          failedSyncs: 0,
          totalItemsSynced: 135
        },
        orderSync: {
          totalOrders: 12,
          successfulSyncs: 12,
          failedSyncs: 0
        },
        statusTracking: {
          activeTrackingSessions: 8,
          statusUpdatesReceived: 24
        },
        syncedAt: '2024-01-15T14:30:00Z'
      }
    }
  })
  async triggerCompleteSync(
    @Request() req: any,
    @Body() body?: { companyId?: string; branchId?: string }
  ) {
    const companyId = body?.companyId || req.user?.companyId;
    const branchId = body?.branchId;

    return this.deliveryService.triggerCompleteSync(companyId, branchId);
  }

  @Get('sync/status')
  @Roles('super_admin', 'company_owner', 'branch_manager', 'call_center')
  @ApiOperation({
    summary: 'Get current sync status',
    description: 'Get real-time status of all synchronization processes'
  })
  @ApiQuery({ name: 'companyId', required: false, description: 'Filter by company ID' })
  @ApiResponse({
    status: 200,
    description: 'Sync status retrieved successfully',
    schema: {
      example: {
        menuSync: {
          lastSync: '2024-01-15T14:30:00Z',
          nextScheduledSync: '2024-01-16T02:00:00Z',
          status: 'idle',
          providersInSync: ['careem', 'talabat', 'dhub'],
          errors: []
        },
        orderSync: {
          activeOrderSyncs: 2,
          recentSyncs: 15,
          failedSyncs: 0,
          lastSync: '2024-01-15T14:25:00Z'
        },
        realTimeTracking: {
          activeTrackingSessions: 8,
          connectedClients: 15,
          statusUpdatesPerMinute: 4.2,
          performanceMetrics: {
            averageUpdateInterval: 30,
            totalUpdatesToday: 150
          }
        }
      }
    }
  })
  async getSyncStatus(
    @Query('companyId') companyId?: string,
    @Request() req?: any
  ) {
    const userCompanyId = companyId || req?.user?.companyId;
    return this.deliveryService.getSyncStatus(userCompanyId);
  }

  // ===== LEGACY ENDPOINTS (Kept for backward compatibility) =====

  // Simplified endpoints - complex integrations will be implemented later
}