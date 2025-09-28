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
} from '@nestjs/common';
import { SavedMenusService } from '../services/saved-menus.service';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { CompanyGuard } from '../../../common/guards/company.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import {
  CreateSavedMenuDto,
  UpdateSavedMenuDto,
  SavedMenuFiltersDto,
  AddProductsToSavedMenuDto,
  RemoveProductsFromSavedMenuDto,
  UpdateSavedMenuItemsDto
} from '../dto';

@Controller('menu/saved-menus')
@UseGuards(JwtAuthGuard, RolesGuard, CompanyGuard)
export class SavedMenusController {
  constructor(
    private readonly savedMenusService: SavedMenusService
  ) {}

  // Get paginated saved menus
  @Get()
  @Roles('super_admin', 'company_owner', 'branch_manager', 'call_center', 'cashier')
  async getSavedMenus(@Query() filters: SavedMenuFiltersDto, @Request() req) {
    // Super admin can specify companyId, others use their own
    const userCompanyId = req.user?.role === 'super_admin' ? undefined : req.user?.companyId;
    return this.savedMenusService.getSavedMenus(filters, userCompanyId, req.user?.role, req.user?.id);
  }

  // Create new saved menu
  @Post()
  @Roles('super_admin', 'company_owner', 'branch_manager')
  async createSavedMenu(@Body() createSavedMenuDto: CreateSavedMenuDto, @Request() req) {
    const userCompanyId = req.user?.role === 'super_admin' ? undefined : req.user?.companyId;
    return this.savedMenusService.createSavedMenu(createSavedMenuDto, userCompanyId, req.user?.id);
  }

  // Get single saved menu
  @Get(':id')
  @Roles('super_admin', 'company_owner', 'branch_manager', 'call_center', 'cashier')
  async getSavedMenu(@Param('id') id: string, @Request() req) {
    const userCompanyId = req.user?.role === 'super_admin' ? undefined : req.user?.companyId;
    return this.savedMenusService.getSavedMenu(id, userCompanyId);
  }

  // Update saved menu
  @Put(':id')
  @Roles('super_admin', 'company_owner', 'branch_manager')
  async updateSavedMenu(
    @Param('id') id: string,
    @Body() updateSavedMenuDto: UpdateSavedMenuDto,
    @Request() req
  ) {
    const userCompanyId = req.user?.role === 'super_admin' ? undefined : req.user?.companyId;
    return this.savedMenusService.updateSavedMenu(id, updateSavedMenuDto, userCompanyId, req.user?.id);
  }

  // Delete saved menu
  @Delete(':id')
  @Roles('super_admin', 'company_owner')
  async deleteSavedMenu(@Param('id') id: string, @Request() req) {
    const userCompanyId = req.user?.role === 'super_admin' ? undefined : req.user?.companyId;
    return this.savedMenusService.deleteSavedMenu(id, userCompanyId, req.user?.id);
  }

  // Add products to saved menu
  @Post(':id/products')
  @Roles('super_admin', 'company_owner', 'branch_manager')
  async addProductsToSavedMenu(
    @Param('id') savedMenuId: string,
    @Body() addProductsDto: AddProductsToSavedMenuDto,
    @Request() req
  ) {
    if (!addProductsDto.productIds || addProductsDto.productIds.length === 0) {
      throw new BadRequestException('Product IDs are required');
    }

    const userCompanyId = req.user?.role === 'super_admin' ? undefined : req.user?.companyId;
    return this.savedMenusService.addProductsToSavedMenu(savedMenuId, addProductsDto, userCompanyId);
  }

  // Remove products from saved menu
  @Delete(':id/products')
  @Roles('super_admin', 'company_owner', 'branch_manager')
  async removeProductsFromSavedMenu(
    @Param('id') savedMenuId: string,
    @Body() removeProductsDto: RemoveProductsFromSavedMenuDto,
    @Request() req
  ) {
    if (!removeProductsDto.productIds || removeProductsDto.productIds.length === 0) {
      throw new BadRequestException('Product IDs are required');
    }

    const userCompanyId = req.user?.role === 'super_admin' ? undefined : req.user?.companyId;
    return this.savedMenusService.removeProductsFromSavedMenu(savedMenuId, removeProductsDto, userCompanyId);
  }

  // Update saved menu items (reorder, update notes, etc.)
  @Put(':id/items')
  @Roles('super_admin', 'company_owner', 'branch_manager')
  async updateSavedMenuItems(
    @Param('id') savedMenuId: string,
    @Body() updateItemsDto: UpdateSavedMenuItemsDto,
    @Request() req
  ) {
    if (!updateItemsDto.items || updateItemsDto.items.length === 0) {
      throw new BadRequestException('Items are required');
    }

    const userCompanyId = req.user?.role === 'super_admin' ? undefined : req.user?.companyId;
    return this.savedMenusService.updateSavedMenuItems(savedMenuId, updateItemsDto, userCompanyId);
  }

  // Get saved menu statistics
  @Get('stats/overview')
  @Roles('super_admin', 'company_owner', 'branch_manager')
  async getSavedMenuStats(@Request() req) {
    const userCompanyId = req.user?.role === 'super_admin' ? undefined : req.user?.companyId;
    return this.savedMenusService.getSavedMenuStats(userCompanyId);
  }

  // Clone/duplicate a saved menu
  @Post(':id/clone')
  @Roles('super_admin', 'company_owner', 'branch_manager')
  async cloneSavedMenu(
    @Param('id') savedMenuId: string,
    @Body() body: { name: string; description?: string },
    @Request() req
  ) {
    if (!body.name) {
      throw new BadRequestException('Name is required for cloned menu');
    }

    const userCompanyId = req.user?.role === 'super_admin' ? undefined : req.user?.companyId;

    // Get the original saved menu with its items
    const originalMenu = await this.savedMenusService.getSavedMenu(savedMenuId, userCompanyId);

    // Create new saved menu with the same products
    const productIds = originalMenu.items.map(item => item.productId);

    const createDto: CreateSavedMenuDto = {
      name: body.name,
      description: body.description || `Copy of ${originalMenu.name}`,
      status: 'draft', // Start as draft for review
      platformId: originalMenu.platformId,
      productIds
    };

    return this.savedMenusService.createSavedMenu(createDto, userCompanyId, req.user?.id);
  }

  // Export saved menu as JSON
  @Get(':id/export')
  @Roles('super_admin', 'company_owner', 'branch_manager')
  async exportSavedMenu(@Param('id') savedMenuId: string, @Request() req) {
    const userCompanyId = req.user?.role === 'super_admin' ? undefined : req.user?.companyId;
    const savedMenu = await this.savedMenusService.getSavedMenu(savedMenuId, userCompanyId);

    // Format for export
    const exportData = {
      name: savedMenu.name,
      description: savedMenu.description,
      status: savedMenu.status,
      productCount: savedMenu.productCount,
      platform: savedMenu.platform?.name,
      products: savedMenu.items.map(item => ({
        id: item.product.id,
        name: item.product.name,
        description: item.product.description,
        basePrice: item.product.basePrice,
        category: item.product.category?.name,
        displayOrder: item.displayOrder,
        notes: item.notes
      })),
      exportedAt: new Date().toISOString(),
      exportedBy: req.user?.name || req.user?.email
    };

    return {
      data: exportData,
      filename: `saved-menu-${savedMenu.name.replace(/[^a-zA-Z0-9]/g, '-')}-${new Date().toISOString().split('T')[0]}.json`
    };
  }
}