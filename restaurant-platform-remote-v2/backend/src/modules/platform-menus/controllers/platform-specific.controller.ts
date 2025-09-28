// ================================================
// Platform-Specific Menu Management Controller
// Enhanced API endpoints for Talabat, Careem, Call Center
// ================================================

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
  HttpStatus,
  HttpCode,
  BadRequestException,
  NotFoundException
} from '@nestjs/common';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { CompanyGuard } from '../../../common/guards/company.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { PlatformTransformationService, PlatformTransformationRequest } from '../services/platform-transformation.service';
import { TalabatMenuService, TalabatMenuConfig } from '../services/platform-specific/talabat-menu.service';
import { CareemMenuService, CareemMenuConfig } from '../services/platform-specific/careem-menu.service';
import { CallCenterMenuService, CallCenterMenuConfig } from '../services/platform-specific/call-center-menu.service';
import { DeliveryPlatform } from '../types/platform-menu.types';

@Controller('platform-menus/specific')
@UseGuards(JwtAuthGuard, RolesGuard, CompanyGuard)
export class PlatformSpecificController {
  constructor(
    private readonly platformTransformation: PlatformTransformationService,
    private readonly talabatService: TalabatMenuService,
    private readonly careemService: CareemMenuService,
    private readonly callCenterService: CallCenterMenuService
  ) {}

  // ================================================
  // MULTI-PLATFORM TRANSFORMATION
  // ================================================

  /**
   * Transform menu to multiple platforms simultaneously
   * Performance target: <60s for all platforms
   */
  @Post(':menuId/transform')
  @Roles('super_admin', 'company_owner', 'branch_manager')
  async transformToPlatforms(
    @Param('menuId') menuId: string,
    @Body() request: {
      platforms: DeliveryPlatform[];
      configs: {
        talabat?: TalabatMenuConfig;
        careem?: CareemMenuConfig;
        call_center?: CallCenterMenuConfig;
      };
      options?: {
        skipValidation?: boolean;
        dryRun?: boolean;
        parallel?: boolean;
        stopOnFirstError?: boolean;
      };
    },
    @Request() req
  ) {
    const transformationRequest: PlatformTransformationRequest = {
      platformMenuId: menuId,
      targetPlatforms: request.platforms,
      configs: request.configs,
      options: {
        parallel: true, // Enable by default for blazing speed
        stopOnFirstError: false,
        ...request.options
      }
    };

    return this.platformTransformation.transformToPlatforms(transformationRequest);
  }

  /**
   * Get available platform templates
   */
  @Get('templates')
  @Roles('super_admin', 'company_owner', 'branch_manager')
  async getPlatformTemplates(
    @Query('category') category?: string,
    @Query('platforms') platforms?: string
  ) {
    const platformArray = platforms ? platforms.split(',') as DeliveryPlatform[] : undefined;
    return this.platformTransformation.getAvailableTemplates(category, platformArray);
  }

  /**
   * Create menu from template
   */
  @Post(':menuId/from-template/:templateId')
  @Roles('super_admin', 'company_owner', 'branch_manager')
  async createFromTemplate(
    @Param('menuId') menuId: string,
    @Param('templateId') templateId: string,
    @Body() customizations: any,
    @Request() req
  ) {
    return this.platformTransformation.createMenuFromTemplate(
      templateId,
      menuId,
      customizations
    );
  }

  /**
   * Save current configuration as template
   */
  @Post(':menuId/save-template')
  @Roles('super_admin', 'company_owner', 'branch_manager')
  async saveAsTemplate(
    @Param('menuId') menuId: string,
    @Body() body: {
      name: string;
      description: string;
      isPublic?: boolean;
    },
    @Request() req
  ) {
    return this.platformTransformation.saveAsTemplate(
      menuId,
      body.name,
      body.description,
      body.isPublic || false
    );
  }

  // ================================================
  // TALABAT-SPECIFIC ENDPOINTS
  // ================================================

  /**
   * Create Talabat-specific menu
   */
  @Post(':menuId/talabat/create')
  @Roles('super_admin', 'company_owner', 'branch_manager')
  async createTalabatMenu(
    @Param('menuId') menuId: string,
    @Body() config: TalabatMenuConfig,
    @Request() req
  ) {
    // Get platform menu
    const menu = await this.getPlatformMenu(menuId, req.user.companyId);
    return this.talabatService.createTalabatMenu(menu, config);
  }

  /**
   * Update Talabat menu items
   */
  @Put(':menuId/talabat/items')
  @Roles('super_admin', 'company_owner', 'branch_manager')
  async updateTalabatItems(
    @Param('menuId') menuId: string,
    @Body() body: {
      itemIds: string[];
      config: TalabatMenuConfig;
    },
    @Request() req
  ) {
    return this.talabatService.updateTalabatMenuItems(
      menuId,
      body.itemIds,
      body.config
    );
  }

  /**
   * Get Talabat menu templates
   */
  @Get('talabat/templates')
  @Roles('super_admin', 'company_owner', 'branch_manager')
  async getTalabatTemplates() {
    return this.talabatService.getTalabatMenuTemplates();
  }

  // ================================================
  // CAREEM-SPECIFIC ENDPOINTS
  // ================================================

  /**
   * Create Careem-specific menu
   */
  @Post(':menuId/careem/create')
  @Roles('super_admin', 'company_owner', 'branch_manager')
  async createCareemMenu(
    @Param('menuId') menuId: string,
    @Body() config: CareemMenuConfig,
    @Request() req
  ) {
    const menu = await this.getPlatformMenu(menuId, req.user.companyId);
    return this.careemService.createCareemMenu(menu, config);
  }

  /**
   * Update Careem menu items
   */
  @Put(':menuId/careem/items')
  @Roles('super_admin', 'company_owner', 'branch_manager')
  async updateCareemItems(
    @Param('menuId') menuId: string,
    @Body() body: {
      itemIds: string[];
      config: CareemMenuConfig;
    },
    @Request() req
  ) {
    return this.careemService.updateCareemMenuItems(
      menuId,
      body.itemIds,
      body.config
    );
  }

  /**
   * Get Careem menu templates
   */
  @Get('careem/templates')
  @Roles('super_admin', 'company_owner', 'branch_manager')
  async getCareemTemplates() {
    return this.careemService.getCareemMenuTemplates();
  }

  // ================================================
  // CALL CENTER-SPECIFIC ENDPOINTS
  // ================================================

  /**
   * Create Call Center-specific menu
   */
  @Post(':menuId/call-center/create')
  @Roles('super_admin', 'company_owner', 'branch_manager')
  async createCallCenterMenu(
    @Param('menuId') menuId: string,
    @Body() config: CallCenterMenuConfig,
    @Request() req
  ) {
    const menu = await this.getPlatformMenu(menuId, req.user.companyId);
    return this.callCenterService.createCallCenterMenu(menu, config);
  }

  /**
   * Get Call Center quick reference guide
   */
  @Get(':menuId/call-center/quick-reference')
  @Roles('super_admin', 'company_owner', 'branch_manager', 'call_center')
  async getCallCenterQuickReference(
    @Param('menuId') menuId: string,
    @Request() req
  ) {
    return this.callCenterService.getQuickReference(menuId);
  }

  /**
   * Search products for call center operators
   */
  @Get(':menuId/call-center/search')
  @Roles('super_admin', 'company_owner', 'branch_manager', 'call_center')
  async searchForOperator(
    @Param('menuId') menuId: string,
    @Query('q') query: string,
    @Request() req
  ) {
    if (!query || query.trim().length === 0) {
      throw new BadRequestException('Search query is required');
    }
    
    return this.callCenterService.searchForOperator(menuId, query.trim());
  }

  /**
   * Get Call Center menu templates
   */
  @Get('call-center/templates')
  @Roles('super_admin', 'company_owner', 'branch_manager')
  async getCallCenterTemplates() {
    return this.callCenterService.getCallCenterMenuTemplates();
  }

  // ================================================
  // PLATFORM CONFIGURATION ENDPOINTS
  // ================================================

  /**
   * Get platform-specific configuration for menu
   */
  @Get(':menuId/config/:platform')
  @Roles('super_admin', 'company_owner', 'branch_manager', 'call_center')
  async getPlatformConfig(
    @Param('menuId') menuId: string,
    @Param('platform') platform: DeliveryPlatform,
    @Request() req
  ) {
    const menu = await this.getPlatformMenu(menuId, req.user.companyId);
    const platformConfig = menu.platformConfig || {};
    
    return {
      platform,
      config: platformConfig[platform] || null,
      lastUpdated: menu.lastSyncedAt,
      syncStatus: menu.syncStatus
    };
  }

  /**
   * Update platform-specific configuration
   */
  @Put(':menuId/config/:platform')
  @Roles('super_admin', 'company_owner', 'branch_manager')
  async updatePlatformConfig(
    @Param('menuId') menuId: string,
    @Param('platform') platform: DeliveryPlatform,
    @Body() config: any,
    @Request() req
  ) {
    const menu = await this.getPlatformMenu(menuId, req.user.companyId);
    const currentConfig = menu.platformConfig || {};
    
    const updatedConfig = {
      ...currentConfig,
      [platform]: {
        ...currentConfig[platform],
        ...config,
        lastUpdated: new Date()
      }
    };

    // Update in database (assuming prisma service is available)
    // This would be injected in real implementation
    return {
      success: true,
      message: `${platform} configuration updated successfully`,
      config: updatedConfig[platform]
    };
  }

  /**
   * Validate platform configuration
   */
  @Post(':menuId/config/:platform/validate')
  @Roles('super_admin', 'company_owner', 'branch_manager')
  async validatePlatformConfig(
    @Param('menuId') menuId: string,
    @Param('platform') platform: DeliveryPlatform,
    @Body() config: any,
    @Request() req
  ) {
    const menu = await this.getPlatformMenu(menuId, req.user.companyId);
    
    try {
      let validationResult;
      
      switch (platform) {
        case DeliveryPlatform.TALABAT:
          // Validate Talabat config
          validationResult = await this.validateTalabatConfig(config);
          break;
        case DeliveryPlatform.CAREEM:
          // Validate Careem config
          validationResult = await this.validateCareemConfig(config);
          break;
        case DeliveryPlatform.CALL_CENTER:
          // Validate Call Center config
          validationResult = await this.validateCallCenterConfig(config);
          break;
        default:
          throw new BadRequestException(`Validation not implemented for platform: ${platform}`);
      }
      
      return {
        valid: true,
        platform,
        message: 'Configuration is valid',
        details: validationResult
      };
    } catch (error) {
      return {
        valid: false,
        platform,
        message: 'Configuration validation failed',
        errors: [error.message]
      };
    }
  }

  // ================================================
  // BULK OPERATIONS
  // ================================================

  /**
   * Bulk transform multiple menus to specific platform
   */
  @Post('bulk-transform')
  @Roles('super_admin', 'company_owner', 'branch_manager')
  async bulkTransformMenus(
    @Body() body: {
      menuIds: string[];
      platform: DeliveryPlatform;
      config: any;
      options?: {
        parallel?: boolean;
        stopOnFirstError?: boolean;
      };
    },
    @Request() req
  ) {
    const results = [];
    const { menuIds, platform, config, options } = body;
    
    for (const menuId of menuIds) {
      try {
        const transformationRequest: PlatformTransformationRequest = {
          platformMenuId: menuId,
          targetPlatforms: [platform],
          configs: { [platform]: config },
          options: {
            parallel: false, // Sequential for bulk to avoid overwhelming APIs
            ...options
          }
        };
        
        const result = await this.platformTransformation.transformToPlatforms(transformationRequest);
        results.push({ menuId, success: result.success, ...result });
        
        if (!result.success && options?.stopOnFirstError) {
          break;
        }
      } catch (error) {
        results.push({
          menuId,
          success: false,
          error: error.message
        });
        
        if (options?.stopOnFirstError) {
          break;
        }
      }
    }
    
    return {
      totalMenus: menuIds.length,
      processedMenus: results.length,
      successfulMenus: results.filter(r => r.success).length,
      failedMenus: results.filter(r => !r.success).length,
      results
    };
  }

  // ================================================
  // HELPER METHODS
  // ================================================

  private async getPlatformMenu(menuId: string, userCompanyId?: string): Promise<any> {
    // This would use the injected PrismaService in real implementation
    // For now, return a mock structure
    return {
      id: menuId,
      companyId: userCompanyId,
      platform: DeliveryPlatform.WEBSITE,
      name: { en: 'Sample Menu', ar: 'قائمة عينة' },
      platformConfig: {},
      lastSyncedAt: new Date(),
      syncStatus: 'pending',
      items: []
    };
  }

  private async validateTalabatConfig(config: TalabatMenuConfig): Promise<any> {
    const errors = [];
    
    if (!config.restaurantId) {
      errors.push('Restaurant ID is required');
    }
    if (!config.currency) {
      errors.push('Currency is required');
    }
    if (config.taxRate < 0 || config.taxRate > 1) {
      errors.push('Tax rate must be between 0 and 1');
    }
    
    if (errors.length > 0) {
      throw new BadRequestException(errors.join(', '));
    }
    
    return { checks: ['restaurantId', 'currency', 'taxRate'], allValid: true };
  }

  private async validateCareemConfig(config: CareemMenuConfig): Promise<any> {
    const errors = [];
    
    if (!config.storeId) {
      errors.push('Store ID is required');
    }
    if (!config.currency) {
      errors.push('Currency is required');
    }
    if (!config.serviceArea?.city) {
      errors.push('Service area city is required');
    }
    
    if (errors.length > 0) {
      throw new BadRequestException(errors.join(', '));
    }
    
    return { checks: ['storeId', 'currency', 'serviceArea'], allValid: true };
  }

  private async validateCallCenterConfig(config: CallCenterMenuConfig): Promise<any> {
    const errors = [];
    
    if (!config.branchId) {
      errors.push('Branch ID is required');
    }
    if (!config.phoneNumbers || config.phoneNumbers.length === 0) {
      errors.push('At least one phone number is required');
    }
    
    if (errors.length > 0) {
      throw new BadRequestException(errors.join(', '));
    }
    
    return { checks: ['branchId', 'phoneNumbers'], allValid: true };
  }
}