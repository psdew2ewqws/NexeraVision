import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
  ParseUUIDPipe,
  ValidationPipe,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../shared/common/guards/jwt-auth.guard';
import { RolesGuard } from '../../shared/common/guards/roles.guard';
import { CompanyGuard } from '../../shared/common/guards/company.guard';
import { Roles } from '../../shared/common/decorators/roles.decorator';
import { CurrentUser } from '../../shared/common/decorators/current-user.decorator';
import { PromotionCampaignsService } from './promotion-campaigns.service';
import { MenuPromotionIntegrationService } from './services/menu-integration.service';
import { CreatePromotionCampaignDto } from './dto/create-promotion-campaign.dto';
import { UpdatePromotionCampaignDto } from './dto/update-promotion-campaign.dto';
import { ValidatePromotionCodeDto } from './dto/validate-promotion-code.dto';
import { PromotionStatus } from '@prisma/client';

@ApiTags('Promotion Campaigns')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, CompanyGuard)
@Controller('promotion-campaigns')
export class PromotionCampaignsController {
  constructor(
    private readonly promotionCampaignsService: PromotionCampaignsService,
    private readonly menuIntegrationService: MenuPromotionIntegrationService
  ) {}

  @Post()
  @Roles('super_admin', 'company_owner', 'branch_manager')
  @ApiOperation({ summary: 'Create a new promotion campaign' })
  @ApiResponse({ status: 201, description: 'Campaign created successfully' })
  @ApiResponse({ status: 400, description: 'Validation failed' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  async create(
    @Body(ValidationPipe) createDto: CreatePromotionCampaignDto,
    @CurrentUser() user: any,
  ) {
    // Super admin can specify company, others use their own
    const targetCompanyId = createDto.companyId || user.companyId;
    
    const campaign = await this.promotionCampaignsService.create(
      { ...createDto, companyId: targetCompanyId },
      user.id,
    );

    return {
      success: true,
      message: 'Promotion campaign created successfully',
      data: campaign,
    };
  }

  @Get()
  @Roles('super_admin', 'company_owner', 'branch_manager', 'call_center')
  @ApiOperation({ summary: 'Get all promotion campaigns' })
  @ApiResponse({ status: 200, description: 'Campaigns retrieved successfully' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number (default: 1)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page (default: 20)' })
  @ApiQuery({ name: 'status', required: false, enum: PromotionStatus, description: 'Filter by status' })
  async findAll(
    @CurrentUser() user: any,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('status') status?: PromotionStatus,
  ) {
    const result = await this.promotionCampaignsService.findAll(
      user.companyId,
      page,
      Math.min(limit, 100), // Max 100 items per page
      status,
    );

    return {
      success: true,
      message: 'Promotion campaigns retrieved successfully',
      ...result,
    };
  }

  @Get('active')
  @ApiOperation({ summary: 'Get active promotion campaigns for public use' })
  @ApiResponse({ status: 200, description: 'Active campaigns retrieved successfully' })
  async getActiveCampaigns(@CurrentUser() user: any) {
    const result = await this.promotionCampaignsService.findAll(
      user.companyId,
      1,
      100,
      PromotionStatus.active,
    );

    // Filter only public campaigns and essential data
    const publicCampaigns = result.data
      .filter(campaign => campaign.isPublic)
      .map(campaign => ({
        id: campaign.id,
        name: campaign.name,
        description: campaign.description,
        type: campaign.type,
        codes: campaign.codes.filter(code => code.isActive).map(code => ({
          id: code.id,
          code: code.code,
        })),
        minimumOrderAmount: campaign.minimumOrderAmount,
        targetPlatforms: campaign.targetPlatforms,
      }));

    return {
      success: true,
      message: 'Active promotion campaigns retrieved successfully',
      data: publicCampaigns,
    };
  }

  @Get(':id')
  @Roles('super_admin', 'company_owner', 'branch_manager', 'call_center')
  @ApiOperation({ summary: 'Get a promotion campaign by ID' })
  @ApiResponse({ status: 200, description: 'Campaign retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Campaign not found' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    const campaign = await this.promotionCampaignsService.findOne(id);

    return {
      success: true,
      message: 'Promotion campaign retrieved successfully',
      data: campaign,
    };
  }

  @Patch(':id')
  @Roles('super_admin', 'company_owner', 'branch_manager')
  @ApiOperation({ summary: 'Update a promotion campaign' })
  @ApiResponse({ status: 200, description: 'Campaign updated successfully' })
  @ApiResponse({ status: 404, description: 'Campaign not found' })
  @ApiResponse({ status: 400, description: 'Validation failed' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(ValidationPipe) updateDto: UpdatePromotionCampaignDto,
    @CurrentUser() user: any,
  ) {
    const campaign = await this.promotionCampaignsService.update(id, updateDto, user.id);

    return {
      success: true,
      message: 'Promotion campaign updated successfully',
      data: campaign,
    };
  }

  @Delete(':id')
  @Roles('super_admin', 'company_owner', 'branch_manager')
  @ApiOperation({ summary: 'Delete a promotion campaign' })
  @ApiResponse({ status: 200, description: 'Campaign deleted successfully' })
  @ApiResponse({ status: 404, description: 'Campaign not found' })
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    await this.promotionCampaignsService.remove(id);

    return {
      success: true,
      message: 'Promotion campaign deleted successfully',
    };
  }

  @Post('validate-code')
  @ApiOperation({ summary: 'Validate a promotion code' })
  @ApiResponse({ status: 200, description: 'Code validation result' })
  @ApiResponse({ status: 400, description: 'Invalid request' })
  async validateCode(@Body(ValidationPipe) dto: ValidatePromotionCodeDto) {
    const result = await this.promotionCampaignsService.validatePromotionCode(dto);

    return {
      success: result.isValid,
      message: result.isValid ? 'Promotion code is valid' : result.message,
      data: result,
    };
  }

  @Post('apply-code')
  @Roles('super_admin', 'company_owner', 'branch_manager', 'call_center', 'cashier')
  @ApiOperation({ summary: 'Apply a promotion code to an order' })
  @ApiResponse({ status: 200, description: 'Code applied successfully' })
  @ApiResponse({ status: 400, description: 'Code validation failed' })
  async applyCode(
    @Body(ValidationPipe) dto: ValidatePromotionCodeDto & { orderId?: string },
  ) {
    const result = await this.promotionCampaignsService.applyPromotionCode(dto);

    return {
      success: true,
      message: 'Promotion code applied successfully',
      data: result,
    };
  }

  @Get(':id/analytics')
  @Roles('super_admin', 'company_owner', 'branch_manager')
  @ApiOperation({ summary: 'Get promotion campaign analytics' })
  @ApiResponse({ status: 200, description: 'Analytics retrieved successfully' })
  @ApiQuery({ name: 'startDate', required: false, type: String, description: 'Start date (ISO string)' })
  @ApiQuery({ name: 'endDate', required: false, type: String, description: 'End date (ISO string)' })
  async getAnalytics(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;
    
    const analytics = await this.promotionCampaignsService.getAnalytics(id, start, end);

    return {
      success: true,
      message: 'Campaign analytics retrieved successfully',
      data: analytics,
    };
  }

  @Patch(':id/status')
  @Roles('super_admin', 'company_owner', 'branch_manager')
  @ApiOperation({ summary: 'Update campaign status (activate, pause, etc.)' })
  @ApiResponse({ status: 200, description: 'Status updated successfully' })
  async updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('status') status: PromotionStatus,
    @CurrentUser() user: any,
  ) {
    const campaign = await this.promotionCampaignsService.update(
      id,
      { status },
      user.id,
    );

    return {
      success: true,
      message: `Campaign status updated to ${status}`,
      data: { id: campaign.id, status: campaign.status },
    };
  }

  @Post(':id/duplicate')
  @Roles('super_admin', 'company_owner', 'branch_manager')
  @ApiOperation({ summary: 'Duplicate a promotion campaign' })
  @ApiResponse({ status: 201, description: 'Campaign duplicated successfully' })
  async duplicate(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: any,
    @Body('name') newName?: string,
  ) {
    const originalCampaign = await this.promotionCampaignsService.findOne(id);
    
    // Prepare data for duplication
    const duplicateData = {
      name: newName ? { en: newName } : {
        en: `Copy of ${(originalCampaign.name as any)?.en || 'Campaign'}`,
        ar: `نسخة من ${(originalCampaign.name as any)?.ar || 'الحملة'}`,
      },
      description: originalCampaign.description,
      slug: `${originalCampaign.slug}-copy-${Date.now()}`,
      type: originalCampaign.type,
      status: PromotionStatus.draft, // Always start as draft
      priority: originalCampaign.priority,
      isPublic: originalCampaign.isPublic,
      isStackable: originalCampaign.isStackable,
      // Copy all other relevant fields
      discountValue: originalCampaign.discountValue,
      maxDiscountAmount: originalCampaign.maxDiscountAmount,
      minimumOrderAmount: originalCampaign.minimumOrderAmount,
      minimumItemsCount: originalCampaign.minimumItemsCount,
      buyQuantity: originalCampaign.buyQuantity,
      getQuantity: originalCampaign.getQuantity,
      getDiscountPercentage: originalCampaign.getDiscountPercentage,
      targetPlatforms: originalCampaign.targetPlatforms,
      targetCustomerSegments: originalCampaign.targetCustomerSegments,
      daysOfWeek: originalCampaign.daysOfWeek,
      timeRanges: originalCampaign.timeRanges,
      totalUsageLimit: originalCampaign.totalUsageLimit,
      perCustomerLimit: originalCampaign.perCustomerLimit,
      targetPlatforms: originalCampaign.targetPlatforms || [],
      targetCustomerSegments: originalCampaign.targetCustomerSegments || [],
      // Don't copy codes - let user create new ones
      companyId: user.companyId,
    };

    const duplicatedCampaign = await this.promotionCampaignsService.create(
      duplicateData as CreatePromotionCampaignDto,
      user.id,
    );

    return {
      success: true,
      message: 'Campaign duplicated successfully',
      data: duplicatedCampaign,
    };
  }

  @Get(':id/preview')
  @ApiOperation({ summary: 'Preview how a promotion will look to customers' })
  @ApiResponse({ status: 200, description: 'Campaign preview generated' })
  async previewCampaign(@Param('id', ParseUUIDPipe) id: string) {
    const campaign = await this.promotionCampaignsService.findOne(id);
    
    // Generate customer-facing preview
    const preview = {
      id: campaign.id,
      name: campaign.name,
      description: campaign.description,
      type: campaign.type,
      discountValue: campaign.discountValue,
      minimumOrderAmount: campaign.minimumOrderAmount,
      codes: (campaign.codes || [])
        .filter(code => code.isActive)
        .slice(0, 1) // Show only one code for preview
        .map(code => ({ code: code.code })),
      isActive: campaign.status === PromotionStatus.active,
      validPlatforms: campaign.targetPlatforms,
      restrictions: {
        minimumOrder: campaign.minimumOrderAmount,
        minimumItems: campaign.minimumItemsCount,
        usageLimit: campaign.perCustomerLimit,
        validDays: campaign.daysOfWeek,
        validTimes: campaign.timeRanges,
      },
    };

    return {
      success: true,
      message: 'Campaign preview generated successfully',
      data: preview,
    };
  }

  // Menu Integration Endpoints
  @Post(':id/menu-items')
  @Roles('super_admin', 'company_owner', 'branch_manager')
  @ApiOperation({ summary: 'Apply promotion to menu items' })
  @ApiResponse({ status: 201, description: 'Promotion applied to menu items successfully' })
  async applyToMenuItems(
    @Param('id', ParseUUIDPipe) campaignId: string,
    @Body() data: {
      menuItemIds: string[];
      discountType: 'percentage' | 'fixed';
      discountValue: number;
      maxDiscountAmount?: number;
      platforms: string[];
      startDate?: string;
      endDate?: string;
    },
    @CurrentUser() user: any,
  ) {
    const applyData = {
      campaignId,
      menuItemIds: data.menuItemIds,
      discountType: data.discountType,
      discountValue: data.discountValue,
      maxDiscountAmount: data.maxDiscountAmount,
      platforms: data.platforms,
      startDate: data.startDate ? new Date(data.startDate) : undefined,
      endDate: data.endDate ? new Date(data.endDate) : undefined,
    };

    // Validate the application first
    const validation = await this.menuIntegrationService.validatePromotionApplication(
      applyData,
      user.companyId
    );

    if (!validation.isValid) {
      return {
        success: false,
        message: 'Validation failed',
        errors: validation.errors,
      };
    }

    const result = await this.menuIntegrationService.applyPromotionToMenuItems(
      applyData,
      user.companyId
    );

    return {
      success: true,
      message: 'Promotion applied to menu items successfully',
      data: result,
    };
  }

  @Delete(':id/menu-items')
  @Roles('super_admin', 'company_owner', 'branch_manager')
  @ApiOperation({ summary: 'Remove promotion from menu items' })
  @ApiResponse({ status: 200, description: 'Promotion removed from menu items successfully' })
  async removeFromMenuItems(
    @Param('id', ParseUUIDPipe) campaignId: string,
    @Body('menuItemIds') menuItemIds: string[],
    @CurrentUser() user: any,
  ) {
    const result = await this.menuIntegrationService.removePromotionFromMenuItems(
      campaignId,
      menuItemIds,
      user.companyId
    );

    return {
      success: true,
      message: 'Promotion removed from menu items successfully',
      data: result,
    };
  }

  @Get(':id/menu-items/stats')
  @Roles('super_admin', 'company_owner', 'branch_manager')
  @ApiOperation({ summary: 'Get menu item statistics for campaign' })
  @ApiResponse({ status: 200, description: 'Menu item stats retrieved successfully' })
  async getMenuItemStats(
    @Param('id', ParseUUIDPipe) campaignId: string,
    @CurrentUser() user: any,
  ) {
    const stats = await this.menuIntegrationService.getCampaignMenuItemStats(
      campaignId,
      user.companyId
    );

    return {
      success: true,
      message: 'Menu item statistics retrieved successfully',
      data: stats,
    };
  }
}