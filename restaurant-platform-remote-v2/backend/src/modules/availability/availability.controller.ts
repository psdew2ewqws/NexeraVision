import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  BadRequestException
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CompanyGuard } from '../../common/guards/company.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { AvailabilityService } from './availability.service';
import { TemplateService } from './services/template.service';
import { AlertService } from './services/alert.service';
import {
  CreateBranchAvailabilityDto,
  UpdateBranchAvailabilityDto,
  BulkAvailabilityUpdateDto,
  BulkCreateAvailabilityDto,
  AvailabilityFiltersDto,
  QuickFiltersDto,
  CreateAvailabilityTemplateDto,
  UpdateAvailabilityTemplateDto,
  ApplyTemplateDto,
  TemplateFiltersDto,
  CreateAvailabilityAlertDto,
  UpdateAvailabilityAlertDto,
  AlertFiltersDto,
  BulkAlertOperationDto
} from './dto';

@Controller('availability')
@UseGuards(JwtAuthGuard, RolesGuard, CompanyGuard)
export class AvailabilityController {
  constructor(
    private readonly availabilityService: AvailabilityService,
    private readonly templateService: TemplateService,
    private readonly alertService: AlertService
  ) {}

  // ========================
  // BRANCH AVAILABILITY ENDPOINTS
  // ========================

  @Post('branch')
  @Roles('super_admin', 'company_owner', 'branch_manager')
  @HttpCode(HttpStatus.CREATED)
  async createBranchAvailability(
    @Body() createDto: CreateBranchAvailabilityDto,
    @Request() req
  ) {
    const companyId = req.user.role === 'super_admin' ? createDto.companyId || req.user.companyId : req.user.companyId;
    return this.availabilityService.createBranchAvailability(createDto, companyId, req.user.id);
  }

  @Put('branch/:id')
  @Roles('super_admin', 'company_owner', 'branch_manager')
  async updateBranchAvailability(
    @Param('id') id: string,
    @Body() updateDto: UpdateBranchAvailabilityDto,
    @Request() req
  ) {
    const companyId = req.user.role === 'super_admin' ? undefined : req.user.companyId;
    return this.availabilityService.updateBranchAvailability(id, updateDto, companyId || req.user.companyId, req.user.id);
  }

  @Delete('branch/:id')
  @Roles('super_admin', 'company_owner', 'branch_manager')
  async deleteBranchAvailability(
    @Param('id') id: string,
    @Request() req
  ) {
    const companyId = req.user.role === 'super_admin' ? undefined : req.user.companyId;
    return this.availabilityService.deleteBranchAvailability(id, companyId || req.user.companyId, req.user.id);
  }

  // ========================
  // SEARCH AND FILTERING ENDPOINTS
  // ========================

  @Post('search')
  @Roles('super_admin', 'company_owner', 'branch_manager', 'call_center', 'cashier')
  async getAvailabilityWithFilters(
    @Body() filters: AvailabilityFiltersDto,
    @Request() req
  ) {
    const companyId = req.user.role === 'super_admin' ? filters.companyId || req.user.companyId : req.user.companyId;
    return this.availabilityService.getAvailabilityWithFilters(filters, companyId);
  }

  @Get('quick-filters')
  @Roles('super_admin', 'company_owner', 'branch_manager', 'call_center', 'cashier')
  async getQuickFilters(
    @Query() filters: QuickFiltersDto,
    @Request() req
  ) {
    const companyId = req.user.role === 'super_admin' ? req.query.companyId || req.user.companyId : req.user.companyId;
    return this.availabilityService.getQuickFilters(filters, companyId);
  }

  // ========================
  // BULK OPERATIONS ENDPOINTS
  // ========================

  @Post('bulk/update')
  @Roles('super_admin', 'company_owner', 'branch_manager')
  @HttpCode(HttpStatus.OK)
  async bulkUpdateAvailability(
    @Body() bulkDto: BulkAvailabilityUpdateDto,
    @Request() req
  ) {
    if (!bulkDto.availabilityIds.length) {
      throw new BadRequestException('At least one availability ID is required');
    }

    const companyId = req.user.role === 'super_admin' ? undefined : req.user.companyId;
    return this.availabilityService.bulkUpdateAvailability(bulkDto, companyId || req.user.companyId, req.user.id);
  }

  @Post('bulk/create')
  @Roles('super_admin', 'company_owner', 'branch_manager')
  @HttpCode(HttpStatus.CREATED)
  async bulkCreateAvailability(
    @Body() bulkDto: BulkCreateAvailabilityDto,
    @Request() req
  ) {
    if (!bulkDto.connectedIds.length || !bulkDto.branchIds.length) {
      throw new BadRequestException('Connected IDs and branch IDs are required');
    }

    const companyId = req.user.role === 'super_admin' ? undefined : req.user.companyId;
    return this.availabilityService.bulkCreateAvailability(bulkDto, companyId || req.user.companyId, req.user.id);
  }

  @Post('bulk/delete')
  @Roles('super_admin', 'company_owner', 'branch_manager')
  @HttpCode(HttpStatus.OK)
  async bulkDeleteAvailability(
    @Body() body: { availabilityIds: string[] },
    @Request() req
  ) {
    if (!body.availabilityIds.length) {
      throw new BadRequestException('At least one availability ID is required');
    }

    const companyId = req.user.role === 'super_admin' ? undefined : req.user.companyId;
    return this.availabilityService.bulkDeleteAvailability(
      body.availabilityIds, 
      companyId || req.user.companyId, 
      req.user.id
    );
  }

  @Post('bulk/status-change')
  @Roles('super_admin', 'company_owner', 'branch_manager')
  @HttpCode(HttpStatus.OK)
  async bulkStatusChange(
    @Body() body: { 
      availabilityIds: string[];
      isActive: boolean;
      changeReason?: string;
    },
    @Request() req
  ) {
    if (!body.availabilityIds.length) {
      throw new BadRequestException('At least one availability ID is required');
    }

    const companyId = req.user.role === 'super_admin' ? undefined : req.user.companyId;
    return this.availabilityService.bulkStatusChange(
      body.availabilityIds,
      body.isActive,
      companyId || req.user.companyId,
      req.user.id,
      body.changeReason
    );
  }

  @Post('bulk/stock-update')
  @Roles('super_admin', 'company_owner', 'branch_manager')
  @HttpCode(HttpStatus.OK)
  async bulkStockUpdate(
    @Body() body: { 
      availabilityIds: string[];
      stockLevel: number;
      changeReason?: string;
    },
    @Request() req
  ) {
    if (!body.availabilityIds.length) {
      throw new BadRequestException('At least one availability ID is required');
    }

    if (body.stockLevel < 0) {
      throw new BadRequestException('Stock level cannot be negative');
    }

    const companyId = req.user.role === 'super_admin' ? undefined : req.user.companyId;
    return this.availabilityService.bulkStockUpdate(
      body.availabilityIds,
      body.stockLevel,
      companyId || req.user.companyId,
      req.user.id,
      body.changeReason
    );
  }

  // ========================
  // TEMPLATE MANAGEMENT ENDPOINTS
  // ========================

  @Post('templates')
  @Roles('super_admin', 'company_owner', 'branch_manager')
  @HttpCode(HttpStatus.CREATED)
  async createTemplate(
    @Body() createDto: CreateAvailabilityTemplateDto,
    @Request() req
  ) {
    const companyId = req.user.role === 'super_admin' ? undefined : req.user.companyId;
    return this.templateService.createTemplate(createDto, companyId || req.user.companyId, req.user.id);
  }

  @Get('templates')
  @Roles('super_admin', 'company_owner', 'branch_manager', 'call_center')
  async getTemplates(
    @Query() filters: TemplateFiltersDto,
    @Request() req
  ) {
    const companyId = req.user.role === 'super_admin' ? filters.companyId || req.user.companyId : req.user.companyId;
    return this.templateService.getTemplates(filters, companyId);
  }

  @Get('templates/:id')
  @Roles('super_admin', 'company_owner', 'branch_manager', 'call_center')
  async getTemplate(
    @Param('id') id: string,
    @Request() req
  ) {
    const companyId = req.user.role === 'super_admin' ? undefined : req.user.companyId;
    return this.templateService.getTemplate(id, companyId || req.user.companyId);
  }

  @Put('templates/:id')
  @Roles('super_admin', 'company_owner', 'branch_manager')
  async updateTemplate(
    @Param('id') id: string,
    @Body() updateDto: UpdateAvailabilityTemplateDto,
    @Request() req
  ) {
    const companyId = req.user.role === 'super_admin' ? undefined : req.user.companyId;
    return this.templateService.updateTemplate(id, updateDto, companyId || req.user.companyId);
  }

  @Delete('templates/:id')
  @Roles('super_admin', 'company_owner')
  async deleteTemplate(
    @Param('id') id: string,
    @Request() req
  ) {
    const companyId = req.user.role === 'super_admin' ? undefined : req.user.companyId;
    return this.templateService.deleteTemplate(id, companyId || req.user.companyId);
  }

  @Post('templates/apply')
  @Roles('super_admin', 'company_owner', 'branch_manager')
  @HttpCode(HttpStatus.OK)
  async applyTemplate(
    @Body() applyDto: ApplyTemplateDto,
    @Request() req
  ) {
    if (!applyDto.connectedIds.length || !applyDto.branchIds.length) {
      throw new BadRequestException('Connected IDs and branch IDs are required');
    }

    const companyId = req.user.role === 'super_admin' ? undefined : req.user.companyId;
    return this.templateService.applyTemplate(applyDto, companyId || req.user.companyId, req.user.id);
  }

  @Get('templates/suggestions/:connectedType')
  @Roles('super_admin', 'company_owner', 'branch_manager')
  async suggestTemplates(
    @Param('connectedType') connectedType: string,
    @Request() req
  ) {
    const companyId = req.user.role === 'super_admin' ? undefined : req.user.companyId;
    return this.templateService.suggestTemplates(connectedType, companyId || req.user.companyId);
  }

  @Post('templates/predefined')
  @Roles('super_admin', 'company_owner')
  @HttpCode(HttpStatus.CREATED)
  async createPredefinedTemplates(@Request() req) {
    const companyId = req.user.role === 'super_admin' ? undefined : req.user.companyId;
    return this.templateService.createPredefinedTemplates(companyId || req.user.companyId, req.user.id);
  }

  // ========================
  // ALERT MANAGEMENT ENDPOINTS
  // ========================

  @Post('alerts')
  @Roles('super_admin', 'company_owner', 'branch_manager')
  @HttpCode(HttpStatus.CREATED)
  async createAlert(
    @Body() createDto: CreateAvailabilityAlertDto,
    @Request() req
  ) {
    const companyId = req.user.role === 'super_admin' ? undefined : req.user.companyId;
    return this.alertService.createAlert(createDto, companyId || req.user.companyId);
  }

  @Get('alerts')
  @Roles('super_admin', 'company_owner', 'branch_manager', 'call_center')
  async getAlerts(
    @Query() filters: AlertFiltersDto,
    @Request() req
  ) {
    const companyId = req.user.role === 'super_admin' ? filters.companyId || req.user.companyId : req.user.companyId;
    return this.alertService.getAlerts(filters, companyId);
  }

  @Get('alerts/stats')
  @Roles('super_admin', 'company_owner', 'branch_manager', 'call_center')
  async getAlertStats(
    @Request() req,
    @Query('branchId') branchId?: string
  ) {
    const companyId = req.user.role === 'super_admin' ? undefined : req.user.companyId;
    return this.alertService.getAlertStats(companyId || req.user.companyId, branchId);
  }

  @Put('alerts/:id')
  @Roles('super_admin', 'company_owner', 'branch_manager')
  async updateAlert(
    @Param('id') id: string,
    @Body() updateDto: UpdateAvailabilityAlertDto,
    @Request() req
  ) {
    const companyId = req.user.role === 'super_admin' ? undefined : req.user.companyId;
    return this.alertService.updateAlert(id, updateDto, companyId || req.user.companyId, req.user.id);
  }

  @Delete('alerts/:id')
  @Roles('super_admin', 'company_owner', 'branch_manager')
  async deleteAlert(
    @Param('id') id: string,
    @Request() req
  ) {
    const companyId = req.user.role === 'super_admin' ? undefined : req.user.companyId;
    return this.alertService.deleteAlert(id, companyId || req.user.companyId);
  }

  @Post('alerts/bulk')
  @Roles('super_admin', 'company_owner', 'branch_manager')
  @HttpCode(HttpStatus.OK)
  async bulkUpdateAlerts(
    @Body() bulkDto: BulkAlertOperationDto,
    @Request() req
  ) {
    if (!bulkDto.alertIds.length) {
      throw new BadRequestException('At least one alert ID is required');
    }

    const companyId = req.user.role === 'super_admin' ? undefined : req.user.companyId;
    return this.alertService.bulkUpdateAlerts(bulkDto, companyId || req.user.companyId, req.user.id);
  }

  @Post('alerts/generate-stock')
  @Roles('super_admin', 'company_owner', 'branch_manager')
  @HttpCode(HttpStatus.OK)
  async generateStockAlerts(@Request() req) {
    const companyId = req.user.role === 'super_admin' ? undefined : req.user.companyId;
    return this.alertService.generateStockAlerts(companyId || req.user.companyId);
  }

  @Delete('alerts/cleanup/:days')
  @Roles('super_admin', 'company_owner')
  async cleanupOldAlerts(
    @Param('days') days: string,
    @Request() req
  ) {
    const daysOld = parseInt(days);
    if (isNaN(daysOld) || daysOld < 1) {
      throw new BadRequestException('Invalid number of days');
    }

    const companyId = req.user.role === 'super_admin' ? undefined : req.user.companyId;
    return this.alertService.cleanupOldAlerts(companyId || req.user.companyId, daysOld);
  }

  // ========================
  // ANALYTICS AND REPORTING ENDPOINTS
  // ========================

  @Get('analytics')
  @Roles('super_admin', 'company_owner', 'branch_manager')
  async getAvailabilityAnalytics(
    @Request() req,
    @Query('branchId') branchId?: string,
    @Query('days') daysParam?: string
  ) {
    const companyId = req.user.role === 'super_admin' && req.query.companyId 
      ? req.query.companyId 
      : req.user.companyId;
    
    const days = daysParam ? parseInt(daysParam, 10) : 30;
    
    const analytics = await this.availabilityService.getAvailabilityAnalytics(
      companyId,
      branchId,
      days
    );

    return { success: true, analytics };
  }

  @Get('analytics/stock-trends')
  @Roles('super_admin', 'company_owner', 'branch_manager')
  async getStockTrends(
    @Request() req,
    @Query('branchId') branchId?: string,
    @Query('days') daysParam?: string
  ) {
    const companyId = req.user.role === 'super_admin' && req.query.companyId 
      ? req.query.companyId 
      : req.user.companyId;
    
    const days = daysParam ? parseInt(daysParam, 10) : 7;
    
    const trendData = await this.availabilityService.getStockTrendData(
      companyId,
      branchId,
      days
    );

    return { success: true, trends: trendData };
  }

  @Get('analytics/top-performing')
  @Roles('super_admin', 'company_owner', 'branch_manager')
  async getTopPerformingItems(
    @Request() req,
    @Query('branchId') branchId?: string,
    @Query('limit') limitParam?: string
  ) {
    const companyId = req.user.role === 'super_admin' && req.query.companyId 
      ? req.query.companyId 
      : req.user.companyId;
    
    const limit = limitParam ? parseInt(limitParam, 10) : 10;
    
    const topItems = await this.availabilityService.getTopPerformingItems(
      companyId,
      branchId,
      limit
    );

    return { success: true, topItems };
  }

  @Get('analytics/overview')
  @Roles('super_admin', 'company_owner', 'branch_manager')
  async getAvailabilityOverview(@Request() req) {
    const companyId = req.user.role === 'super_admin' ? undefined : req.user.companyId;
    
    // Get basic availability statistics
    const [totalItems, activeItems, outOfStockItems, lowStockItems] = await Promise.all([
      this.availabilityService.getAvailabilityWithFilters({ limit: 1 }, companyId || req.user.companyId)
        .then(result => result.pagination.total),
      this.availabilityService.getAvailabilityWithFilters({ isActive: true, limit: 1 }, companyId || req.user.companyId)
        .then(result => result.pagination.total),
      this.availabilityService.getAvailabilityWithFilters({ isInStock: false, limit: 1 }, companyId || req.user.companyId)
        .then(result => result.pagination.total),
      this.availabilityService.getQuickFilters({ lowStock: true }, companyId || req.user.companyId)
        .then(result => result.lowStock)
    ]);

    return {
      overview: {
        totalItems,
        activeItems,
        outOfStockItems,
        lowStockItems,
        availabilityRate: totalItems > 0 ? ((activeItems / totalItems) * 100).toFixed(2) : 0
      }
    };
  }

  @Get('analytics/branch/:branchId')
  @Roles('super_admin', 'company_owner', 'branch_manager')
  async getBranchAnalytics(
    @Param('branchId') branchId: string,
    @Request() req
  ) {
    const companyId = req.user.role === 'super_admin' ? undefined : req.user.companyId;
    
    const branchStats = await this.availabilityService.getAvailabilityWithFilters(
      { branchId, limit: 1000 }, 
      companyId || req.user.companyId
    );

    const items = branchStats.items;
    const analytics = {
      branchId,
      totalItems: items.length,
      activeItems: items.filter(item => item.isActive).length,
      inStockItems: items.filter(item => item.isInStock).length,
      outOfStockItems: items.filter(item => !item.isInStock).length,
      lowStockItems: items.filter(item => 
        item.stockLevel !== null && 
        item.lowStockThreshold !== null && 
        item.stockLevel <= item.lowStockThreshold
      ).length,
      platformCoverage: {
        talabat: items.filter(item => item.prices?.talabat !== undefined).length,
        careem: items.filter(item => item.prices?.careem !== undefined).length,
        website: items.filter(item => item.prices?.website !== undefined).length,
        call_center: items.filter(item => item.prices?.call_center !== undefined).length
      }
    };

    return { analytics };
  }

  // ========================
  // HEALTH CHECK AND STATUS
  // ========================

  @Get('health')
  @Roles('super_admin', 'company_owner', 'branch_manager', 'call_center', 'cashier')
  async healthCheck() {
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'availability-service',
      version: '1.0.0'
    };
  }
}