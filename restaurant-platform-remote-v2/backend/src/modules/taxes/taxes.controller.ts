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
} from '@nestjs/common';
import { TaxesService } from './taxes.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CompanyGuard } from '../../common/guards/company.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '@prisma/client';
import {
  CreateTaxDto,
  UpdateTaxDto,
  CreateCompanyTaxSettingDto,
} from './services/tax-configuration.service';
import { TaxDisplayMode } from '@prisma/client';

@Controller('taxes')
@UseGuards(JwtAuthGuard, RolesGuard, CompanyGuard)
export class TaxesController {
  constructor(private readonly taxesService: TaxesService) {}

  @Post('initialize')
  @Roles('company_owner', 'super_admin')
  async initializeTaxSystem(@CurrentUser() user: User) {
    return this.taxesService.initializeCompanyTaxSystem(user.companyId);
  }

  @Get('overview')
  async getTaxOverview(@CurrentUser() user: User) {
    return this.taxesService.getCompanyTaxOverview(user.companyId);
  }

  @Get('/')
  async getCompanyTaxes(@CurrentUser() user: User) {
    return this.taxesService.getCompanyTaxes(user.companyId);
  }

  @Post('/')
  @Roles('company_owner', 'branch_manager', 'super_admin')
  async createTax(@Body() dto: Omit<CreateTaxDto, 'companyId'>, @CurrentUser() user: User) {
    return this.taxesService.createTax({
      ...dto,
      companyId: user.companyId,
    });
  }

  @Post('presets')
  @Roles('company_owner', 'super_admin')
  async createTaxPresets(@CurrentUser() user: User) {
    return this.taxesService.createTaxPresets(user.companyId);
  }

  @Post('jordan-vat')
  @Roles('company_owner', 'super_admin')
  async createJordanVAT(@CurrentUser() user: User) {
    return this.taxesService.createJordanVAT(user.companyId);
  }

  @Put(':id')
  @Roles('company_owner', 'branch_manager', 'super_admin')
  async updateTax(@Param('id') id: string, @Body() dto: UpdateTaxDto) {
    return this.taxesService.updateTax(id, dto);
  }

  @Post(':taxId/assign/product/:productId')
  @Roles('company_owner', 'branch_manager', 'super_admin')
  async assignTaxToProduct(
    @Param('taxId') taxId: string,
    @Param('productId') productId: string,
  ) {
    return this.taxesService.assignTaxToProduct(taxId, productId);
  }

  @Post(':taxId/assign/category/:categoryId')
  @Roles('company_owner', 'branch_manager', 'super_admin')
  async assignTaxToCategory(
    @Param('taxId') taxId: string,
    @Param('categoryId') categoryId: string,
  ) {
    return this.taxesService.assignTaxToCategory(taxId, categoryId);
  }

  @Post(':taxId/assign/modifier/:modifierId')
  @Roles('company_owner', 'branch_manager', 'super_admin')
  async assignTaxToModifier(
    @Param('taxId') taxId: string,
    @Param('modifierId') modifierId: string,
  ) {
    return this.taxesService.assignTaxToModifier(taxId, modifierId);
  }

  @Post('assign-default-to-all-products')
  @Roles('company_owner', 'super_admin')
  async assignDefaultTaxToAllProducts(@CurrentUser() user: User) {
    return this.taxesService.assignDefaultTaxToAllProducts(user.companyId);
  }

  @Get('settings')
  async getTaxSettings(@CurrentUser() user: User) {
    return this.taxesService.getCompanyTaxSettings(user.companyId);
  }

  @Post('settings')
  @Roles('company_owner', 'branch_manager', 'super_admin')
  async upsertTaxSettings(
    @Body() dto: Omit<CreateCompanyTaxSettingDto, 'companyId'>,
    @CurrentUser() user: User,
  ) {
    return this.taxesService.upsertCompanyTaxSettings({
      ...dto,
      companyId: user.companyId,
    });
  }

  @Post('calculate/product')
  async calculateProductTax(
    @Body()
    body: {
      productId: string;
      basePrice: number;
      platformPricing?: Record<string, number>;
      displayMode?: TaxDisplayMode;
    },
    @CurrentUser() user: User,
  ) {
    return this.taxesService.calculateProductTax(
      body.productId,
      {
        basePrice: body.basePrice,
        platformPricing: body.platformPricing,
        companyId: user.companyId,
      },
      body.displayMode,
    );
  }

  @Post('calculate/order-item')
  async calculateOrderItemTax(
    @Body()
    body: {
      productId: string;
      modifierIds: string[];
      productPrice: number;
      modifierPrices: Record<string, number>;
    },
    @CurrentUser() user: User,
  ) {
    return this.taxesService.calculateOrderItemTax(
      body.productId,
      body.modifierIds,
      body.productPrice,
      body.modifierPrices,
      user.companyId,
    );
  }

  @Post('calculate/jordan-vat')
  async calculateJordanVAT(
    @Body() body: { basePrice: number; isVATIncluded?: boolean },
  ) {
    return this.taxesService.calculateJordanVAT(
      body.basePrice,
      body.isVATIncluded,
    );
  }

  @Post('enhance-pricing')
  async enhancePricingWithTax(
    @Body()
    body: {
      productId: string;
      basePricing: Record<string, number>;
    },
    @CurrentUser() user: User,
  ) {
    return this.taxesService.enhancePricingWithTax(
      body.productId,
      body.basePricing,
      user.companyId,
    );
  }

  @Post('receipt-summary')
  async generateReceiptTaxSummary(
    @Body()
    body: {
      orderItems: Array<{
        productId: string;
        quantity: number;
        unitPrice: number;
        modifiers?: Array<{
          modifierId: string;
          price: number;
        }>;
      }>;
    },
    @CurrentUser() user: User,
  ) {
    return this.taxesService.generateReceiptTaxSummary(
      body.orderItems,
      user.companyId,
    );
  }
}