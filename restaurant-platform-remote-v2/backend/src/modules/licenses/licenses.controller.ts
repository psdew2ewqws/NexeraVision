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
  Request,
  HttpStatus,
  BadRequestException,
  Logger
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { LicensesService } from './licenses.service';
import { CreateLicenseDto, UpdateLicenseDto, ExtendLicenseDto, LicenseQueryDto, RenewLicenseDto } from './dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('licenses')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('licenses')
export class LicensesController {
  private readonly logger = new Logger(LicensesController.name);

  constructor(private readonly licensesService: LicensesService) {}

  @Post()
  @Roles('super_admin')
  @ApiOperation({ 
    summary: 'Create a new license',
    description: 'Creates a new license for a company. Only super_admin can create licenses.' 
  })
  @ApiResponse({ status: 201, description: 'License created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input or company already has active license' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  async create(
    @Body() createLicenseDto: CreateLicenseDto,
    @CurrentUser() user: any
  ) {
    try {
      const license = await this.licensesService.create(createLicenseDto, user.id);
      return {
        status: 'success',
        data: license,
        message: 'License created successfully'
      };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @Get()
  @Roles('super_admin')
  @ApiOperation({ 
    summary: 'Get all licenses',
    description: 'Retrieves all licenses with pagination and filtering. Only super_admin can view all licenses.' 
  })
  @ApiQuery({ name: 'page', required: false, description: 'Page number', example: 1 })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page', example: 10 })
  @ApiQuery({ name: 'status', required: false, description: 'Filter by status' })
  @ApiQuery({ name: 'type', required: false, description: 'Filter by type' })
  @ApiQuery({ name: 'search', required: false, description: 'Search company names' })
  @ApiResponse({ status: 200, description: 'Licenses retrieved successfully' })
  async findAll(@Query() query: LicenseQueryDto) {
    const result = await this.licensesService.findAll(
      query.page,
      query.limit,
      query.status,
      query.type,
      query.search
    );
    
    return {
      status: 'success',
      data: result.licenses,
      pagination: result.pagination,
      message: 'Licenses retrieved successfully'
    };
  }

  @Get('stats')
  @Roles('super_admin')
  @ApiOperation({ 
    summary: 'Get license statistics',
    description: 'Retrieves comprehensive license statistics for dashboard display.' 
  })
  @ApiResponse({ status: 200, description: 'License statistics retrieved successfully' })
  async getStats() {
    const stats = await this.licensesService.getStats();
    return {
      status: 'success',
      data: stats,
      message: 'License statistics retrieved successfully'
    };
  }

  @Get('expiring')
  @Roles('super_admin')
  @ApiOperation({ 
    summary: 'Get expiring licenses',
    description: 'Retrieves licenses that are expiring within a specified number of days.' 
  })
  @ApiQuery({ name: 'days', required: false, description: 'Number of days ahead to check', example: 30 })
  @ApiResponse({ status: 200, description: 'Expiring licenses retrieved successfully' })
  async getExpiringLicenses(@Query('days') days?: number) {
    const expiringLicenses = await this.licensesService.getExpiringLicenses(days || 30);
    return {
      status: 'success',
      data: expiringLicenses,
      message: 'Expiring licenses retrieved successfully'
    };
  }

  @Get('my-company')
  @Roles('super_admin', 'company_owner', 'branch_manager')
  @ApiOperation({ 
    summary: 'Get current user\'s company license',
    description: 'Retrieves the license information for the current user\'s company.' 
  })
  @ApiResponse({ status: 200, description: 'Company license retrieved successfully' })
  async getMyCompanyLicense(@CurrentUser() user: any) {
    const license = await this.licensesService.findByCompany(user.companyId);
    return {
      status: 'success',
      data: license,
      message: 'Company license retrieved successfully'
    };
  }

  @Get('company/:companyId')
  @Roles('super_admin')
  @ApiOperation({ 
    summary: 'Get license by company ID',
    description: 'Retrieves the active license for a specific company.' 
  })
  @ApiResponse({ status: 200, description: 'Company license retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Company or license not found' })
  async getLicenseByCompany(@Param('companyId') companyId: string) {
    const license = await this.licensesService.findByCompany(companyId);
    return {
      status: 'success',
      data: license,
      message: 'Company license retrieved successfully'
    };
  }

  @Get(':id')
  @Roles('super_admin')
  @ApiOperation({ 
    summary: 'Get license by ID',
    description: 'Retrieves a specific license by its ID.' 
  })
  @ApiResponse({ status: 200, description: 'License retrieved successfully' })
  @ApiResponse({ status: 404, description: 'License not found' })
  async findOne(@Param('id') id: string) {
    const license = await this.licensesService.findOne(id);
    return {
      status: 'success',
      data: license,
      message: 'License retrieved successfully'
    };
  }

  @Patch(':id')
  @Roles('super_admin')
  @ApiOperation({ 
    summary: 'Update a license',
    description: 'Updates a license. Only super_admin can update licenses.' 
  })
  @ApiResponse({ status: 200, description: 'License updated successfully' })
  @ApiResponse({ status: 404, description: 'License not found' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  async update(
    @Param('id') id: string,
    @Body() updateLicenseDto: UpdateLicenseDto,
    @CurrentUser() user: any
  ) {
    const license = await this.licensesService.update(id, updateLicenseDto, user.id);
    return {
      status: 'success',
      data: license,
      message: 'License updated successfully'
    };
  }

  @Post(':id/extend')
  @Roles('super_admin')
  @ApiOperation({ 
    summary: 'Extend a license',
    description: 'Extends a license by a specified number of days.' 
  })
  @ApiResponse({ status: 200, description: 'License extended successfully' })
  @ApiResponse({ status: 404, description: 'License not found' })
  async extendLicense(
    @Param('id') id: string,
    @Body() extendLicenseDto: ExtendLicenseDto,
    @CurrentUser() user: any
  ) {
    const license = await this.licensesService.extendLicense(id, extendLicenseDto.days, user.id);
    return {
      status: 'success',
      data: license,
      message: `License extended by ${extendLicenseDto.days} days successfully`
    };
  }

  @Delete(':id')
  @Roles('super_admin')
  @ApiOperation({ 
    summary: 'Cancel a license',
    description: 'Cancels (soft deletes) a license. Only super_admin can cancel licenses.' 
  })
  @ApiResponse({ status: 200, description: 'License cancelled successfully' })
  @ApiResponse({ status: 404, description: 'License not found' })
  async remove(@Param('id') id: string, @CurrentUser() user: any) {
    const license = await this.licensesService.remove(id, user.id);
    return {
      status: 'success',
      data: license,
      message: 'License cancelled successfully'
    };
  }

  @Get('feature-access/:feature')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ 
    summary: 'Check feature access',
    description: 'Checks if the current user\'s company has access to a specific feature.' 
  })
  @ApiResponse({ status: 200, description: 'Feature access checked successfully' })
  async checkFeatureAccess(
    @Param('feature') feature: string,
    @CurrentUser() user: any
  ) {
    const hasAccess = await this.licensesService.hasFeatureAccess(user.companyId, feature);
    return {
      status: 'success',
      data: { 
        feature,
        hasAccess,
        companyId: user.companyId
      },
      message: `Feature access for ${feature}: ${hasAccess ? 'granted' : 'denied'}`
    };
  }

  @Post('track-usage/:feature')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ 
    summary: 'Track feature usage',
    description: 'Tracks usage of a specific feature for analytics and licensing.' 
  })
  @ApiResponse({ status: 200, description: 'Usage tracked successfully' })
  async trackUsage(
    @Param('feature') feature: string,
    @CurrentUser() user: any,
    @Body() metadata?: Record<string, any>
  ) {
    // Track usage in PostgreSQL
    await this.licensesService['prisma'].$queryRaw`
      SELECT track_license_usage(${user.companyId}, ${feature}, 1, ${JSON.stringify(metadata || {})}::jsonb)
    `;

    return {
      status: 'success',
      message: 'Feature usage tracked successfully'
    };
  }

  @Get('notifications/my-company')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ 
    summary: 'Get license notifications',
    description: 'Retrieves license-related notifications for the current user\'s company.' 
  })
  @ApiResponse({ status: 200, description: 'Notifications retrieved successfully' })
  async getNotifications(@CurrentUser() user: any) {
    // TODO: Implement license_notifications table
    // For now, return empty array to prevent 500 errors
    const notifications: any[] = [];

    return {
      status: 'success',
      data: notifications,
      message: 'Notifications retrieved successfully (notifications table not implemented yet)'
    };
  }

  @Post('notifications/:id/read')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ 
    summary: 'Mark notification as read',
    description: 'Marks a license notification as read.' 
  })
  @ApiResponse({ status: 200, description: 'Notification marked as read' })
  async markNotificationRead(@Param('id') id: string, @CurrentUser() user: any) {
    // TODO: Implement license_notifications table
    // For now, just return success to prevent 500 errors

    return {
      status: 'success',
      message: 'Notification marked as read (notifications table not implemented yet)'
    };
  }

  @Post('renew')
  @Roles('super_admin', 'company_owner')
  @ApiOperation({ 
    summary: 'Renew company license',
    description: 'Renews a company license for a specified duration and generates an invoice. Super admins can specify companyId.' 
  })
  @ApiResponse({ status: 200, description: 'License renewed successfully' })
  @ApiResponse({ status: 400, description: 'Invalid renewal request' })
  async renewLicense(
    @Body() renewLicenseDto: RenewLicenseDto,
    @CurrentUser() user: any
  ) {
    // Determine target company: use provided companyId if super_admin, otherwise use user's company
    const targetCompanyId = user.role === 'super_admin' && renewLicenseDto.companyId 
      ? renewLicenseDto.companyId 
      : user.companyId;
    
    this.logger.debug(`Renewal request: user=${user.id}, role=${user.role}, userCompanyId=${user.companyId}, targetCompanyId=${targetCompanyId}, durationDays=${renewLicenseDto.durationDays}`);
    
    const result = await this.licensesService.renewLicense(targetCompanyId, renewLicenseDto, user.id);
    return {
      status: 'success',
      data: result,
      message: 'License renewed successfully'
    };
  }

  @Get('invoices')
  @Roles('super_admin', 'company_owner', 'branch_manager')
  @ApiOperation({ 
    summary: 'Get company invoices',
    description: 'Retrieves invoices for the current user\'s company.' 
  })
  @ApiResponse({ status: 200, description: 'Invoices retrieved successfully' })
  async getInvoices(@CurrentUser() user: any) {
    const invoices = await this.licensesService.getInvoices(user.companyId);
    return {
      status: 'success',
      data: invoices,
      message: 'Invoices retrieved successfully'
    };
  }

  @Get('invoices/:id/download')
  @Roles('super_admin', 'company_owner', 'branch_manager')
  @ApiOperation({
    summary: 'Download invoice PDF',
    description: 'Downloads an invoice PDF for the specified invoice ID.'
  })
  @ApiResponse({ status: 200, description: 'Invoice PDF generated successfully' })
  async downloadInvoice(@Param('id') invoiceId: string, @CurrentUser() user: any) {
    const pdfBuffer = await this.licensesService.generateInvoicePDF(invoiceId, user.companyId);
    return {
      status: 'success',
      data: pdfBuffer,
      message: 'Invoice PDF generated successfully'
    };
  }

  // ========== PUBLIC DEMO ENDPOINTS (FOR TESTING ONLY) ==========

  @Public()
  @Get('demo/my-company')
  @ApiOperation({
    summary: '[DEMO] Get demo company license',
    description: 'Public endpoint for demo purposes - returns sample license data.'
  })
  @ApiResponse({ status: 200, description: 'Demo license data retrieved' })
  async getDemoLicense() {
    // Return sample license data for demo/testing
    const demoLicense = {
      license_id: "demo-license-123",
      company_id: "demo-company-456",
      type: "active",
      status: "active",
      days_remaining: 30,
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      is_expired: false,
      is_near_expiry: false,
      is_critical: false,
      features: ["printing", "inventory", "analytics"],
      warning_level: "active"
    };

    return {
      status: 'success',
      data: demoLicense,
      message: '[DEMO] Sample license data retrieved for testing'
    };
  }

  @Public()
  @Get('demo/notifications/my-company')
  @ApiOperation({
    summary: '[DEMO] Get demo license notifications',
    description: 'Public endpoint for demo purposes - returns sample notification data.'
  })
  @ApiResponse({ status: 200, description: 'Demo notifications retrieved' })
  async getDemoNotifications() {
    // Return empty notifications for demo
    return {
      status: 'success',
      data: [],
      message: '[DEMO] No notifications available (demo mode)'
    };
  }

  @Public()
  @Get('demo/feature-access/:feature')
  @ApiOperation({
    summary: '[DEMO] Check demo feature access',
    description: 'Public endpoint for demo purposes - always returns true access.'
  })
  @ApiResponse({ status: 200, description: 'Demo feature access granted' })
  async getDemoFeatureAccess(@Param('feature') feature: string) {
    return {
      status: 'success',
      data: {
        feature,
        hasAccess: true,
        companyId: "demo-company-456"
      },
      message: `[DEMO] Feature access for ${feature}: granted (demo mode)`
    };
  }

  @Public()
  @Post('demo/track-usage/:feature')
  @ApiOperation({
    summary: '[DEMO] Track demo feature usage',
    description: 'Public endpoint for demo purposes - logs usage tracking.'
  })
  @ApiResponse({ status: 200, description: 'Demo usage tracked' })
  async trackDemoUsage(
    @Param('feature') feature: string,
    @Body() metadata?: Record<string, any>
  ) {
    this.logger.log(`[DEMO] Feature usage tracked: ${feature}`, metadata);
    return {
      status: 'success',
      message: '[DEMO] Feature usage tracked successfully (demo mode)'
    };
  }

  @Public()
  @Post('demo/notifications/:id/read')
  @ApiOperation({
    summary: '[DEMO] Mark demo notification as read',
    description: 'Public endpoint for demo purposes - always returns success.'
  })
  @ApiResponse({ status: 200, description: 'Demo notification marked as read' })
  async markDemoNotificationRead(@Param('id') id: string) {
    return {
      status: 'success',
      message: '[DEMO] Notification marked as read (demo mode)'
    };
  }
}