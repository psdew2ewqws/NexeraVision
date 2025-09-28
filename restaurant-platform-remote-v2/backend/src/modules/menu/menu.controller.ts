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
  UseInterceptors,
  UploadedFiles,
  UploadedFile,
  BadRequestException,
  Res
} from '@nestjs/common';
import { FilesInterceptor, FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { MenuService } from './menu.service';
import { ImageUploadService } from './services/image-upload.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CompanyGuard } from '../../common/guards/company.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Public } from '../../common/decorators/public.decorator';
import {
  CreateProductDto,
  UpdateProductDto,
  ProductFiltersDto,
  BulkStatusUpdateDto,
  BulkDeleteDto,
  CreateCategoryDto
} from './dto';

@Controller('menu')
@UseGuards(JwtAuthGuard, RolesGuard, CompanyGuard)
export class MenuController {
  constructor(
    private readonly menuService: MenuService,
    private readonly imageUploadService: ImageUploadService
  ) {}

  // Get paginated products for VirtualizedProductGrid
  @Post('products/paginated')
  @Public() // Make public for development
  @Roles('super_admin', 'company_owner', 'branch_manager', 'call_center', 'cashier')
  async getPaginatedProducts(@Body() filters: ProductFiltersDto, @Request() req?) {
    // For authenticated users, use their company and role
    if (req?.user) {
      const userCompanyId = req.user.role === 'super_admin' ? undefined : req.user.companyId;
      return this.menuService.getPaginatedProducts(filters, userCompanyId, req.user.role);
    }
    // For public access, use companyId from filters or get all products
    return this.menuService.getPaginatedProducts(filters, filters.companyId || 'test-company-uuid-123456789', 'public');
  }

  // Get all categories for filters (supports both public and authenticated access)
  @Get('categories')
  @Public()
  async getCategories(@Query('companyId') companyId?: string, @Request() req?) {
    // For authenticated users, use their company and role
    if (req?.user) {
      const userCompanyId = req.user.role === 'super_admin' ? companyId : req.user.companyId;
      return this.menuService.getCategories(userCompanyId, req.user.role);
    }
    // For public access, use companyId from query parameter or get all categories
    return this.menuService.getCategories(companyId, 'public');
  }

  // Get available tags for filters (public endpoint for menu display)
  @Get('tags')
  @Public()
  async getTags(@Query('companyId') companyId?: string) {
    // For public access, use companyId from query parameter or get all tags
    return this.menuService.getTags(companyId);
  }

  // Get product statistics
  @Get('stats')
  @Roles('super_admin', 'company_owner', 'branch_manager')
  async getProductStats(@Request() req) {
    const userCompanyId = req.user.role === 'super_admin' ? undefined : req.user.companyId;
    return this.menuService.getProductStats(userCompanyId);
  }

  // Create new product
  @Post('products')
  @Roles('super_admin', 'company_owner', 'branch_manager')
  async createProduct(@Body() createProductDto: CreateProductDto, @Request() req) {
    const userCompanyId = req.user.role === 'super_admin' ? undefined : req.user.companyId;
    return this.menuService.createProduct(createProductDto, userCompanyId);
  }

  // Download import template
  @Get('products/import-template')
  @Roles('super_admin', 'company_owner', 'branch_manager')
  async downloadImportTemplate(@Request() req, @Res() res: Response) {
    const userCompanyId = req.user.role === 'super_admin' ? undefined : req.user.companyId;
    const templateResult = await this.menuService.generateImportTemplate(userCompanyId, req.user.role);
    
    // Return JSON data for frontend to handle Excel generation
    res.json(templateResult);
  }

  // Get single product
  @Get('products/:id')
  @Roles('super_admin', 'company_owner', 'branch_manager', 'call_center', 'cashier')
  async getProduct(@Param('id') id: string, @Request() req) {
    const userCompanyId = req.user.role === 'super_admin' ? undefined : req.user.companyId;
    return this.menuService.getProduct(id, userCompanyId);
  }

  // Update product
  @Put('products/:id')
  @Roles('super_admin', 'company_owner', 'branch_manager')
  async updateProduct(
    @Param('id') id: string,
    @Body() updateProductDto: UpdateProductDto,
    @Request() req
  ) {
    const userCompanyId = req.user.role === 'super_admin' ? undefined : req.user.companyId;
    return this.menuService.updateProduct(id, updateProductDto, userCompanyId);
  }

  // Delete product
  @Delete('products/:id')
  @Roles('super_admin', 'company_owner')
  async deleteProduct(@Param('id') id: string, @Request() req) {
    const userCompanyId = req.user.role === 'super_admin' ? undefined : req.user.companyId;
    return this.menuService.deleteProduct(id, userCompanyId);
  }

  // Bulk status update
  @Post('products/bulk-status')
  @Roles('super_admin', 'company_owner', 'branch_manager')
  @HttpCode(HttpStatus.OK)
  async bulkUpdateStatus(@Body() bulkStatusDto: BulkStatusUpdateDto, @Request() req) {
    const userCompanyId = req.user.role === 'super_admin' ? undefined : req.user.companyId;
    return this.menuService.bulkUpdateStatus(bulkStatusDto, userCompanyId);
  }

  // Bulk delete
  @Post('products/bulk-delete')
  @Roles('super_admin', 'company_owner')
  @HttpCode(HttpStatus.OK)
  async bulkDelete(@Body() bulkDeleteDto: BulkDeleteDto, @Request() req) {
    const userCompanyId = req.user.role === 'super_admin' ? undefined : req.user.companyId;
    return this.menuService.bulkDelete(bulkDeleteDto, userCompanyId);
  }

  // Create category
  @Post('categories')
  @Roles('super_admin', 'company_owner', 'branch_manager')
  async createCategory(@Body() createCategoryDto: CreateCategoryDto, @Request() req) {
    const userCompanyId = req.user.role === 'super_admin' ? undefined : req.user.companyId;
    return this.menuService.createCategory(createCategoryDto, userCompanyId);
  }

  // Update category
  @Put('categories/:id')
  @Roles('super_admin', 'company_owner', 'branch_manager')
  async updateCategory(
    @Param('id') id: string,
    @Body() updateCategoryDto: CreateCategoryDto,
    @Request() req
  ) {
    const userCompanyId = req.user.role === 'super_admin' ? undefined : req.user.companyId;
    return this.menuService.updateCategory(id, updateCategoryDto, userCompanyId);
  }

  // Delete category
  @Delete('categories/:id')
  @Roles('super_admin', 'company_owner')
  async deleteCategory(@Param('id') id: string, @Request() req) {
    const userCompanyId = req.user.role === 'super_admin' ? undefined : req.user.companyId;
    return this.menuService.deleteCategory(id, userCompanyId);
  }

  // Upload product images
  @Post('products/upload-images')
  @Roles('super_admin', 'company_owner', 'branch_manager')
  @UseInterceptors(FilesInterceptor('images', 10)) // Max 10 files
  async uploadProductImages(
    @UploadedFiles() files: Express.Multer.File[],
    @Body('productId') productId?: string,
    @Request() req?
  ) {
    if (!files || files.length === 0) {
      throw new BadRequestException('No files uploaded');
    }

    // Validate files
    for (const file of files) {
      const validation = this.imageUploadService.validateImageFile(file);
      if (!validation.valid) {
        throw new BadRequestException(validation.error);
      }
    }

    return this.imageUploadService.bulkUploadAndOptimize(files, productId);
  }

  // Get product images
  @Get('products/:id/images')
  @Roles('super_admin', 'company_owner', 'branch_manager', 'call_center', 'cashier')
  async getProductImages(@Param('id') productId: string) {
    return this.imageUploadService.getProductImages(productId);
  }

  // Delete image
  @Delete('images/:id')
  @Roles('super_admin', 'company_owner', 'branch_manager')
  async deleteImage(@Param('id') imageId: string) {
    await this.imageUploadService.deleteImage(imageId);
    return { message: 'Image deleted successfully' };
  }

  // Update images with productId after product creation
  @Post('images/update-product')
  @Roles('super_admin', 'company_owner', 'branch_manager')
  async updateImageProductId(@Body() body: { imageUrls: string[]; productId: string }) {
    await this.imageUploadService.updateImageProductId(body.imageUrls, body.productId);
    return { message: 'Images updated successfully' };
  }

  // Get upload configuration
  @Get('upload-config')
  @Roles('super_admin', 'company_owner', 'branch_manager', 'call_center')
  getUploadConfig() {
    return this.imageUploadService.getUploadConfig();
  }

  // Get modifier categories for a specific product
  @Get('products/:id/modifiers')
  @Roles('super_admin', 'company_owner', 'branch_manager', 'call_center', 'cashier')
  async getProductModifiers(@Param('id') productId: string, @Request() req) {
    const userCompanyId = req.user.role === 'super_admin' ? undefined : req.user.companyId;
    return this.menuService.getProductModifiers(productId, userCompanyId);
  }

  // Save modifier categories for a specific product
  @Post('products/:id/modifiers')
  @Roles('super_admin', 'company_owner', 'branch_manager')
  async saveProductModifiers(
    @Param('id') productId: string,
    @Body() modifierCategoryIds: string[],
    @Request() req
  ) {
    const userCompanyId = req.user.role === 'super_admin' ? undefined : req.user.companyId;
    return this.menuService.saveProductModifiers(productId, modifierCategoryIds, userCompanyId);
  }

  // Export products to Excel
  @Get('products/export')
  @Roles('super_admin', 'company_owner', 'branch_manager')
  async exportProducts(@Request() req, @Res() res: Response) {
    const userCompanyId = req.user.role === 'super_admin' ? undefined : req.user.companyId;
    const exportResult = await this.menuService.exportProducts(userCompanyId, req.user.role);
    
    // Return JSON data for frontend to handle Excel generation
    res.json(exportResult);
  }

  // Import products from Excel
  @Post('products/import')
  @Roles('super_admin', 'company_owner', 'branch_manager')
  async importProducts(
    @Body() importData: { data: any[] },
    @Request() req
  ) {
    if (!importData.data || !Array.isArray(importData.data)) {
      throw new BadRequestException('Import data array is required');
    }

    if (importData.data.length === 0) {
      throw new BadRequestException('Import data cannot be empty');
    }

    const userCompanyId = req.user.role === 'super_admin' ? undefined : req.user.companyId;
    
    return this.menuService.importProducts(importData.data, userCompanyId, req.user.role);
  }

  // Tax-enhanced endpoints

  // Get product with tax calculations
  @Get('products/:id/with-tax')
  @Roles('super_admin', 'company_owner', 'branch_manager', 'call_center', 'cashier')
  async getProductWithTax(
    @Param('id') id: string,
    @Query('platform') platform: string,
    @Request() req
  ) {
    const userCompanyId = req.user.role === 'super_admin' ? undefined : req.user.companyId;
    return this.menuService.getProductWithTaxCalculations(id, userCompanyId, platform);
  }

  // Create product with automatic tax assignment
  @Post('products/with-tax')
  @Roles('super_admin', 'company_owner', 'branch_manager')
  async createProductWithTax(
    @Body() createProductDto: CreateProductDto & { autoAssignTax?: boolean },
    @Request() req
  ) {
    const userCompanyId = req.user.role === 'super_admin' ? undefined : req.user.companyId;
    const { autoAssignTax = true, ...productData } = createProductDto;

    return this.menuService.createProductWithTax(productData, userCompanyId, autoAssignTax);
  }

  // Update product pricing with tax recalculation
  @Put('products/:id/pricing-with-tax')
  @Roles('super_admin', 'company_owner', 'branch_manager')
  async updateProductPricingWithTax(
    @Param('id') id: string,
    @Body() body: { pricing: Record<string, number> },
    @Request() req
  ) {
    const userCompanyId = req.user.role === 'super_admin' ? undefined : req.user.companyId;
    return this.menuService.updateProductPricingWithTax(id, body.pricing, userCompanyId);
  }

  // Get products for receipt with tax breakdown
  @Post('products/receipt-data')
  @Roles('super_admin', 'company_owner', 'branch_manager', 'call_center', 'cashier')
  async getProductsForReceipt(
    @Body() body: {
      productIds: string[];
      quantities: Record<string, number>;
      modifierData: Record<string, Array<{ modifierId: string; price: number }>>;
    },
    @Request() req
  ) {
    const userCompanyId = req.user.role === 'super_admin' ? undefined : req.user.companyId;
    if (!userCompanyId) {
      throw new BadRequestException('Company ID is required');
    }

    return this.menuService.getProductsForReceipt(
      body.productIds,
      body.quantities,
      body.modifierData,
      userCompanyId
    );
  }

  // Bulk assign tax to products
  @Post('products/bulk-assign-tax')
  @Roles('super_admin', 'company_owner', 'branch_manager')
  async bulkAssignTaxToProducts(
    @Body() body: { productIds: string[]; taxId: string },
    @Request() req
  ) {
    const userCompanyId = req.user.role === 'super_admin' ? undefined : req.user.companyId;
    return this.menuService.bulkAssignTaxToProducts(body.productIds, body.taxId, userCompanyId);
  }

  // Get products with Jordan VAT compliance
  @Get('products/jordan-vat-compliance')
  @Roles('super_admin', 'company_owner', 'branch_manager')
  async getProductsWithJordanVAT(
    @Query('limit') limit: string = '50',
    @Request() req
  ) {
    const userCompanyId = req.user.role === 'super_admin' ? undefined : req.user.companyId;
    return this.menuService.getProductsWithJordanVAT(userCompanyId, parseInt(limit));
  }

}