// ================================================
// Platform Menu Management Controller
// Restaurant Platform v2 - API Endpoints
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
  NotFoundException,
  UseInterceptors,
  UploadedFile,
  Sse,
  MessageEvent
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Observable, interval, map, switchMap } from 'rxjs';
import { PlatformMenusService } from './services/platform-menus.service';
import { MultiPlatformSyncService, MultiPlatformSyncRequest } from './services/multi-platform-sync.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CompanyGuard } from '../../common/guards/company.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import {
  CreatePlatformMenuDto,
  UpdatePlatformMenuDto,
  CreatePlatformMenuItemDto,
  UpdatePlatformMenuItemDto,
  PlatformMenuFiltersDto,
  BulkMenuOperationDto,
  MenuSyncRequestDto,
  DeliveryPlatform,
  MenuStatus,
  PlatformMenuResponse,
  PlatformMenuDetailResponse,
  MenuSyncResponse,
  MenuSyncStatusResponse,
  PaginatedResponse,
  MenuAnalyticsResponse
} from './types/platform-menu.types';

@Controller('platform-menus')
@UseGuards(JwtAuthGuard, RolesGuard, CompanyGuard)
export class PlatformMenusController {
  constructor(
    private readonly platformMenusService: PlatformMenusService,
    private readonly multiPlatformSync: MultiPlatformSyncService
  ) {}

  // ================================================
  // MENU MANAGEMENT ENDPOINTS
  // ================================================

  /**
   * Get paginated platform menus with filters
   * Performance: <500ms for 1000+ menus
   */
  @Post('search')
  @Roles('super_admin', 'company_owner', 'branch_manager', 'call_center', 'cashier')
  async getPlatformMenus(
    @Body() filters: PlatformMenuFiltersDto,
    @Request() req
  ): Promise<PaginatedResponse<PlatformMenuResponse>> {
    const userCompanyId = req.user.role === 'super_admin' ? undefined : req.user.companyId;
    return this.platformMenusService.getPaginatedMenus(filters, userCompanyId, req.user.role);
  }

  /**
   * Get all available platforms for menu creation
   */
  @Get('platforms')
  @Roles('super_admin', 'company_owner', 'branch_manager')
  async getAvailablePlatforms(@Request() req) {
    return this.platformMenusService.getAvailablePlatforms(req.user.companyId);
  }

  /**
   * Get menu analytics and statistics
   */
  @Get('analytics')
  @Roles('super_admin', 'company_owner', 'branch_manager')
  async getMenuAnalytics(@Request() req): Promise<MenuAnalyticsResponse> {
    const userCompanyId = req.user.role === 'super_admin' ? undefined : req.user.companyId;
    return this.platformMenusService.getMenuAnalytics(userCompanyId);
  }

  /**
   * Create new platform menu
   */
  @Post()
  @Roles('super_admin', 'company_owner', 'branch_manager')
  async createPlatformMenu(
    @Body() createMenuDto: CreatePlatformMenuDto,
    @Request() req
  ): Promise<PlatformMenuDetailResponse> {
    const userCompanyId = req.user.role === 'super_admin' ? req.body.companyId : req.user.companyId;
    return this.platformMenusService.createMenu(createMenuDto, userCompanyId, req.user.id);
  }

  /**
   * Get single platform menu with details
   */
  @Get(':id')
  @Roles('super_admin', 'company_owner', 'branch_manager', 'call_center', 'cashier')
  async getPlatformMenu(
    @Param('id') id: string,
    @Request() req
  ): Promise<PlatformMenuDetailResponse> {
    const userCompanyId = req.user.role === 'super_admin' ? undefined : req.user.companyId;
    return this.platformMenusService.getMenuById(id, userCompanyId);
  }

  /**
   * Update platform menu
   */
  @Put(':id')
  @Roles('super_admin', 'company_owner', 'branch_manager')
  async updatePlatformMenu(
    @Param('id') id: string,
    @Body() updateMenuDto: UpdatePlatformMenuDto,
    @Request() req
  ): Promise<PlatformMenuDetailResponse> {
    const userCompanyId = req.user.role === 'super_admin' ? undefined : req.user.companyId;
    return this.platformMenusService.updateMenu(id, updateMenuDto, userCompanyId, req.user.id);
  }

  /**
   * Delete platform menu
   */
  @Delete(':id')
  @Roles('super_admin', 'company_owner')
  async deletePlatformMenu(
    @Param('id') id: string,
    @Request() req
  ): Promise<{ message: string }> {
    const userCompanyId = req.user.role === 'super_admin' ? undefined : req.user.companyId;
    await this.platformMenusService.deleteMenu(id, userCompanyId, req.user.id);
    return { message: 'Platform menu deleted successfully' };
  }

  /**
   * Duplicate platform menu to another platform
   */
  @Post(':id/duplicate')
  @Roles('super_admin', 'company_owner', 'branch_manager')
  async duplicatePlatformMenu(
    @Param('id') id: string,
    @Body() body: { targetPlatform: DeliveryPlatform; name: any },
    @Request() req
  ): Promise<PlatformMenuDetailResponse> {
    const userCompanyId = req.user.role === 'super_admin' ? undefined : req.user.companyId;
    return this.platformMenusService.duplicateMenu(
      id,
      body.targetPlatform,
      body.name,
      userCompanyId,
      req.user.id
    );
  }

  // ================================================
  // MENU ITEMS MANAGEMENT
  // ================================================

  /**
   * Get menu items for a platform menu
   */
  @Get(':menuId/items')
  @Roles('super_admin', 'company_owner', 'branch_manager', 'call_center', 'cashier')
  async getMenuItems(
    @Param('menuId') menuId: string,
    @Query() query: any,
    @Request() req
  ) {
    const userCompanyId = req.user.role === 'super_admin' ? undefined : req.user.companyId;
    return this.platformMenusService.getMenuItems(menuId, query, userCompanyId);
  }

  /**
   * Add items to platform menu (bulk operation)
   */
  @Post(':menuId/items/bulk-add')
  @Roles('super_admin', 'company_owner', 'branch_manager')
  async bulkAddItems(
    @Param('menuId') menuId: string,
    @Body() body: { productIds: string[]; defaultConfig?: any },
    @Request() req
  ) {
    const userCompanyId = req.user.role === 'super_admin' ? undefined : req.user.companyId;
    return this.platformMenusService.bulkAddItems(
      menuId,
      body.productIds,
      body.defaultConfig,
      userCompanyId,
      req.user.id
    );
  }

  /**
   * Create single menu item
   */
  @Post(':menuId/items')
  @Roles('super_admin', 'company_owner', 'branch_manager')
  async createMenuItem(
    @Param('menuId') menuId: string,
    @Body() createItemDto: CreatePlatformMenuItemDto,
    @Request() req
  ) {
    const userCompanyId = req.user.role === 'super_admin' ? undefined : req.user.companyId;
    return this.platformMenusService.createMenuItem(
      menuId,
      createItemDto,
      userCompanyId,
      req.user.id
    );
  }

  /**
   * Update menu item
   */
  @Put(':menuId/items/:itemId')
  @Roles('super_admin', 'company_owner', 'branch_manager')
  async updateMenuItem(
    @Param('menuId') menuId: string,
    @Param('itemId') itemId: string,
    @Body() updateItemDto: UpdatePlatformMenuItemDto,
    @Request() req
  ) {
    const userCompanyId = req.user.role === 'super_admin' ? undefined : req.user.companyId;
    return this.platformMenusService.updateMenuItem(
      itemId,
      updateItemDto,
      userCompanyId,
      req.user.id
    );
  }

  /**
   * Remove item from menu
   */
  @Delete(':menuId/items/:itemId')
  @Roles('super_admin', 'company_owner', 'branch_manager')
  async removeMenuItem(
    @Param('menuId') menuId: string,
    @Param('itemId') itemId: string,
    @Request() req
  ) {
    const userCompanyId = req.user.role === 'super_admin' ? undefined : req.user.companyId;
    await this.platformMenusService.removeMenuItem(itemId, userCompanyId, req.user.id);
    return { message: 'Menu item removed successfully' };
  }

  /**
   * Bulk update menu items
   */
  @Post(':menuId/items/bulk-update')
  @Roles('super_admin', 'company_owner', 'branch_manager')
  async bulkUpdateItems(
    @Param('menuId') menuId: string,
    @Body() body: {
      itemIds: string[];
      updates: Partial<UpdatePlatformMenuItemDto>;
      operation: 'activate' | 'deactivate' | 'feature' | 'unfeature' | 'repricing';
    },
    @Request() req
  ) {
    const userCompanyId = req.user.role === 'super_admin' ? undefined : req.user.companyId;
    return this.platformMenusService.bulkUpdateItems(
      body.itemIds,
      body.updates,
      body.operation,
      userCompanyId,
      req.user.id
    );
  }

  // ================================================
  // SYNC MANAGEMENT ENDPOINTS
  // ================================================

  /**
   * Trigger manual sync for platform menu
   * Performance target: <30s for 500+ items
   */
  @Post(':menuId/sync')
  @Roles('super_admin', 'company_owner', 'branch_manager')
  async syncPlatformMenu(
    @Param('menuId') menuId: string,
    @Body() syncRequest: MenuSyncRequestDto,
    @Request() req
  ): Promise<MenuSyncResponse> {
    const userCompanyId = req.user.role === 'super_admin' ? undefined : req.user.companyId;
    return this.platformMenusService.syncMenu(menuId, syncRequest, userCompanyId, req.user.id);
  }

  /**
   * Get sync status with real-time updates
   */
  @Get(':menuId/sync/:syncId/status')
  @Roles('super_admin', 'company_owner', 'branch_manager', 'call_center')
  async getSyncStatus(
    @Param('menuId') menuId: string,
    @Param('syncId') syncId: string,
    @Request() req
  ): Promise<MenuSyncStatusResponse> {
    const userCompanyId = req.user.role === 'super_admin' ? undefined : req.user.companyId;
    return this.platformMenusService.getSyncStatus(syncId, userCompanyId);
  }

  /**
   * Server-Sent Events for real-time sync progress
   */
  @Sse(':menuId/sync/:syncId/progress')
  @Roles('super_admin', 'company_owner', 'branch_manager', 'call_center')
  getSyncProgress(
    @Param('menuId') menuId: string,
    @Param('syncId') syncId: string,
    @Request() req
  ): Observable<MessageEvent> {
    const userCompanyId = req.user.role === 'super_admin' ? undefined : req.user.companyId;

    return interval(1000).pipe(
      switchMap(async () => {
        const status = await this.platformMenusService.getSyncStatus(syncId, userCompanyId);
        return {
          data: status,
          type: 'sync-progress'
        } as MessageEvent;
      })
    );
  }

  /**
   * Cancel ongoing sync operation
   */
  @Post(':menuId/sync/:syncId/cancel')
  @Roles('super_admin', 'company_owner', 'branch_manager')
  async cancelSync(
    @Param('menuId') menuId: string,
    @Param('syncId') syncId: string,
    @Request() req
  ) {
    const userCompanyId = req.user.role === 'super_admin' ? undefined : req.user.companyId;
    await this.platformMenusService.cancelSync(syncId, userCompanyId, req.user.id);
    return { message: 'Sync operation cancelled' };
  }

  /**
   * Get sync history for menu
   */
  @Get(':menuId/sync-history')
  @Roles('super_admin', 'company_owner', 'branch_manager')
  async getSyncHistory(
    @Param('menuId') menuId: string,
    @Query() query: any,
    @Request() req
  ) {
    const userCompanyId = req.user.role === 'super_admin' ? undefined : req.user.companyId;
    return this.platformMenusService.getSyncHistory(menuId, query, userCompanyId);
  }

  // ================================================
  // MULTI-PLATFORM SYNC ENDPOINTS (BLAZING FAST)
  // ================================================

  /**
   * Trigger blazing fast multi-platform sync
   * Performance target: <30s for 500+ items across ALL platforms
   */
  @Post(':menuId/sync/multi-platform')
  @Roles('super_admin', 'company_owner', 'branch_manager')
  async syncMultiplePlatforms(
    @Param('menuId') menuId: string,
    @Body() syncRequest: {
      platforms: DeliveryPlatform[];
      syncType?: 'manual' | 'scheduled' | 'auto';
      options?: {
        parallelProcessing?: boolean;
        maxConcurrency?: number;
        stopOnFirstError?: boolean;
        notifyOnComplete?: boolean;
      };
    },
    @Request() req
  ) {
    const userCompanyId = req.user.role === 'super_admin' ? undefined : req.user.companyId;

    const multiSyncRequest: MultiPlatformSyncRequest = {
      menuId,
      platforms: syncRequest.platforms,
      syncType: syncRequest.syncType || 'manual',
      options: {
        parallelProcessing: true, // Always enable for blazing speed
        maxConcurrency: 4,
        stopOnFirstError: false,
        notifyOnComplete: true,
        ...syncRequest.options
      },
      initiatedBy: req.user.id
    };

    return this.multiPlatformSync.startMultiPlatformSync(multiSyncRequest);
  }

  /**
   * Get multi-platform sync status with real-time progress
   */
  @Get('sync/multi-platform/:multiSyncId/status')
  @Roles('super_admin', 'company_owner', 'branch_manager', 'call_center')
  async getMultiSyncStatus(
    @Param('multiSyncId') multiSyncId: string,
    @Request() req
  ) {
    return this.multiPlatformSync.getMultiSyncStatus(multiSyncId);
  }

  /**
   * Cancel multi-platform sync operation
   */
  @Post('sync/multi-platform/:multiSyncId/cancel')
  @Roles('super_admin', 'company_owner', 'branch_manager')
  async cancelMultiSync(
    @Param('multiSyncId') multiSyncId: string,
    @Request() req
  ) {
    await this.multiPlatformSync.cancelMultiSync(multiSyncId, req.user.id);
    return { message: 'Multi-platform sync operation cancelled' };
  }

  /**
   * Server-Sent Events for real-time multi-platform sync progress
   */
  @Sse('sync/multi-platform/:multiSyncId/progress')
  @Roles('super_admin', 'company_owner', 'branch_manager', 'call_center')
  getMultiSyncProgress(
    @Param('multiSyncId') multiSyncId: string,
    @Request() req
  ): Observable<MessageEvent> {
    return interval(2000).pipe(
      switchMap(async () => {
        try {
          const status = await this.multiPlatformSync.getMultiSyncStatus(multiSyncId);
          return {
            data: status,
            type: 'multi-sync-progress'
          } as MessageEvent;
        } catch (error) {
          return {
            data: { error: error.message },
            type: 'multi-sync-error'
          } as MessageEvent;
        }
      })
    );
  }

  // ================================================
  // BULK OPERATIONS
  // ================================================

  /**
   * Bulk operations on multiple menus
   */
  @Post('bulk-operations')
  @Roles('super_admin', 'company_owner', 'branch_manager')
  @HttpCode(HttpStatus.OK)
  async bulkMenuOperations(
    @Body() bulkOperation: BulkMenuOperationDto,
    @Request() req
  ) {
    const userCompanyId = req.user.role === 'super_admin' ? undefined : req.user.companyId;
    return this.platformMenusService.bulkMenuOperations(
      bulkOperation,
      userCompanyId,
      req.user.id
    );
  }

  // ================================================
  // TEMPLATE MANAGEMENT
  // ================================================

  /**
   * Get available menu templates
   */
  @Get('templates/available')
  @Roles('super_admin', 'company_owner', 'branch_manager')
  async getMenuTemplates(@Query() query: any) {
    return this.platformMenusService.getMenuTemplates(query);
  }

  /**
   * Create menu from template
   */
  @Post('templates/:templateId/create-menu')
  @Roles('super_admin', 'company_owner', 'branch_manager')
  async createMenuFromTemplate(
    @Param('templateId') templateId: string,
    @Body() body: {
      platform: DeliveryPlatform;
      name: any;
      customizations?: any;
    },
    @Request() req
  ) {
    const userCompanyId = req.user.role === 'super_admin' ? req.body.companyId : req.user.companyId;
    return this.platformMenusService.createMenuFromTemplate(
      templateId,
      body.platform,
      body.name,
      userCompanyId,
      req.user.id,
      body.customizations
    );
  }

  /**
   * Save current menu as template
   */
  @Post(':menuId/save-as-template')
  @Roles('super_admin', 'company_owner', 'branch_manager')
  async saveAsTemplate(
    @Param('menuId') menuId: string,
    @Body() body: {
      templateName: any;
      description?: any;
      isPublic?: boolean;
    },
    @Request() req
  ) {
    const userCompanyId = req.user.role === 'super_admin' ? undefined : req.user.companyId;
    return this.platformMenusService.saveAsTemplate(
      menuId,
      body.templateName,
      body.description,
      body.isPublic,
      userCompanyId,
      req.user.id
    );
  }

  // ================================================
  // IMPORT/EXPORT OPERATIONS
  // ================================================

  /**
   * Export menu configuration
   */
  @Get(':menuId/export')
  @Roles('super_admin', 'company_owner', 'branch_manager')
  async exportMenu(
    @Param('menuId') menuId: string,
    @Query('format') format: 'json' | 'excel' = 'json',
    @Request() req
  ) {
    const userCompanyId = req.user.role === 'super_admin' ? undefined : req.user.companyId;
    return this.platformMenusService.exportMenu(menuId, format, userCompanyId);
  }

  /**
   * Import menu configuration
   */
  @Post('import')
  @Roles('super_admin', 'company_owner', 'branch_manager')
  @UseInterceptors(FileInterceptor('file'))
  async importMenu(
    @UploadedFile() file: Express.Multer.File,
    @Body() body: {
      platform: DeliveryPlatform;
      replaceExisting?: boolean;
    },
    @Request() req
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    const userCompanyId = req.user.role === 'super_admin' ? req.body.companyId : req.user.companyId;
    return this.platformMenusService.importMenu(
      file,
      body.platform,
      body.replaceExisting,
      userCompanyId,
      req.user.id
    );
  }

  // ================================================
  // HEALTH & MONITORING
  // ================================================

  /**
   * Get platform menu health status
   */
  @Get('health/status')
  @Roles('super_admin', 'company_owner', 'branch_manager')
  async getHealthStatus(@Request() req) {
    const userCompanyId = req.user.role === 'super_admin' ? undefined : req.user.companyId;
    return this.platformMenusService.getHealthStatus(userCompanyId);
  }

  /**
   * Validate menu configuration
   */
  @Post(':menuId/validate')
  @Roles('super_admin', 'company_owner', 'branch_manager')
  async validateMenu(
    @Param('menuId') menuId: string,
    @Request() req
  ) {
    const userCompanyId = req.user.role === 'super_admin' ? undefined : req.user.companyId;
    return this.platformMenusService.validateMenu(menuId, userCompanyId);
  }
}