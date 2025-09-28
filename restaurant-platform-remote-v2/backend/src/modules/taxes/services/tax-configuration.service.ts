import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { TaxType, TaxDisplayMode, TaxRoundingMode } from '@prisma/client';

export interface CreateTaxDto {
  companyId: string;
  name: Record<string, string>;
  description?: Record<string, string>;
  taxType: TaxType;
  percentage?: number;
  fixedAmount?: number;
  isDefault?: boolean;
  taxCode?: string;
  reportingCategory?: string;
}

export interface UpdateTaxDto extends Partial<CreateTaxDto> {
  isActive?: boolean;
}

export interface CreateCompanyTaxSettingDto {
  companyId: string;
  priceDisplayMode?: TaxDisplayMode;
  taxRoundingMode?: TaxRoundingMode;
  decimalPlaces?: number;
  showTaxBreakdown?: boolean;
  showTaxInclusiveText?: boolean;
  taxLineLabel?: Record<string, string>;
  vatNumberLabel?: Record<string, string>;
  taxRegistrationNumber?: string;
  vatNumber?: string;
  defaultTaxId?: string;
  autoApplyDefaultTax?: boolean;
}

@Injectable()
export class TaxConfigurationService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new tax configuration
   */
  async createTax(dto: CreateTaxDto) {
    // Validate tax type and values
    if (dto.taxType === TaxType.percentage && (!dto.percentage || dto.percentage < 0 || dto.percentage > 100)) {
      throw new Error('Percentage tax must have a valid percentage value (0-100)');
    }

    if (dto.taxType === TaxType.fixed && (!dto.fixedAmount || dto.fixedAmount < 0)) {
      throw new Error('Fixed tax must have a valid fixed amount');
    }

    // If setting as default, unset other defaults for the company
    if (dto.isDefault) {
      await this.prisma.tax.updateMany({
        where: {
          companyId: dto.companyId,
          isDefault: true,
        },
        data: {
          isDefault: false,
        },
      });
    }

    return this.prisma.tax.create({
      data: {
        companyId: dto.companyId,
        name: dto.name,
        description: dto.description,
        taxType: dto.taxType,
        percentage: dto.percentage || 0,
        fixedAmount: dto.fixedAmount || 0,
        isDefault: dto.isDefault || false,
        taxCode: dto.taxCode,
        reportingCategory: dto.reportingCategory,
      },
    });
  }

  /**
   * Create Jordan VAT tax configuration
   */
  async createJordanVAT(companyId: string) {
    return this.createTax({
      companyId,
      name: {
        en: 'Jordan VAT',
        ar: 'ضريبة القيمة المضافة الأردنية',
      },
      description: {
        en: 'Jordan Value Added Tax (16%)',
        ar: 'ضريبة القيمة المضافة الأردنية (16%)',
      },
      taxType: TaxType.percentage,
      percentage: 16.0,
      isDefault: true,
      taxCode: 'VAT-JO',
      reportingCategory: 'VAT',
    });
  }

  /**
   * Create common tax presets
   */
  async createTaxPresets(companyId: string) {
    const presets = [
      {
        name: { en: '8% Tax', ar: 'ضريبة 8%' },
        percentage: 8.0,
        taxCode: 'TAX-8',
      },
      {
        name: { en: 'Jordan VAT (16%)', ar: 'ضريبة القيمة المضافة (16%)' },
        percentage: 16.0,
        taxCode: 'VAT-JO',
        isDefault: true,
      },
      {
        name: { en: 'No Tax', ar: 'بدون ضريبة' },
        percentage: 0.0,
        taxCode: 'NO-TAX',
      },
    ];

    const createdTaxes = [];

    for (const preset of presets) {
      const tax = await this.createTax({
        companyId,
        name: preset.name,
        taxType: TaxType.percentage,
        percentage: preset.percentage,
        isDefault: preset.isDefault || false,
        taxCode: preset.taxCode,
      });
      createdTaxes.push(tax);
    }

    return createdTaxes;
  }

  /**
   * Update tax configuration
   */
  async updateTax(taxId: string, dto: UpdateTaxDto) {
    const tax = await this.prisma.tax.findUnique({
      where: { id: taxId },
    });

    if (!tax) {
      throw new NotFoundException('Tax not found');
    }

    // If setting as default, unset other defaults
    if (dto.isDefault && !tax.isDefault) {
      await this.prisma.tax.updateMany({
        where: {
          companyId: tax.companyId,
          isDefault: true,
          id: { not: taxId },
        },
        data: {
          isDefault: false,
        },
      });
    }

    return this.prisma.tax.update({
      where: { id: taxId },
      data: {
        ...dto,
        percentage: dto.percentage ?? tax.percentage,
        fixedAmount: dto.fixedAmount ?? tax.fixedAmount,
      },
    });
  }

  /**
   * Get company taxes
   */
  async getCompanyTaxes(companyId: string) {
    return this.prisma.tax.findMany({
      where: {
        companyId,
        isActive: true,
      },
      orderBy: [
        { isDefault: 'desc' },
        { sortOrder: 'asc' },
        { createdAt: 'asc' },
      ],
    });
  }

  /**
   * Assign tax to product
   */
  async assignTaxToProduct(taxId: string, productId: string) {
    return this.prisma.taxableProduct.create({
      data: {
        taxId,
        productId,
      },
    });
  }

  /**
   * Assign tax to category (applies to all products in category)
   */
  async assignTaxToCategory(taxId: string, categoryId: string) {
    return this.prisma.taxableCategory.create({
      data: {
        taxId,
        categoryId,
      },
    });
  }

  /**
   * Assign tax to modifier
   */
  async assignTaxToModifier(taxId: string, modifierId: string) {
    return this.prisma.taxableModifier.create({
      data: {
        taxId,
        modifierId,
      },
    });
  }

  /**
   * Remove tax assignment
   */
  async removeTaxFromProduct(taxId: string, productId: string) {
    return this.prisma.taxableProduct.deleteMany({
      where: {
        taxId,
        productId,
      },
    });
  }

  async removeTaxFromCategory(taxId: string, categoryId: string) {
    return this.prisma.taxableCategory.deleteMany({
      where: {
        taxId,
        categoryId,
      },
    });
  }

  async removeTaxFromModifier(taxId: string, modifierId: string) {
    return this.prisma.taxableModifier.deleteMany({
      where: {
        taxId,
        modifierId,
      },
    });
  }

  /**
   * Create or update company tax settings
   */
  async upsertCompanyTaxSettings(dto: CreateCompanyTaxSettingDto) {
    return this.prisma.companyTaxSetting.upsert({
      where: {
        companyId: dto.companyId,
      },
      create: {
        companyId: dto.companyId,
        priceDisplayMode: dto.priceDisplayMode || TaxDisplayMode.tax_inclusive,
        taxRoundingMode: dto.taxRoundingMode || TaxRoundingMode.round_half_up,
        decimalPlaces: dto.decimalPlaces || 2,
        showTaxBreakdown: dto.showTaxBreakdown ?? true,
        showTaxInclusiveText: dto.showTaxInclusiveText ?? true,
        taxLineLabel: dto.taxLineLabel || {
          en: 'Tax',
          ar: 'الضريبة',
        },
        vatNumberLabel: dto.vatNumberLabel || {
          en: 'VAT Number',
          ar: 'الرقم الضريبي',
        },
        taxRegistrationNumber: dto.taxRegistrationNumber,
        vatNumber: dto.vatNumber,
        defaultTaxId: dto.defaultTaxId,
        autoApplyDefaultTax: dto.autoApplyDefaultTax ?? false,
      },
      update: {
        priceDisplayMode: dto.priceDisplayMode,
        taxRoundingMode: dto.taxRoundingMode,
        decimalPlaces: dto.decimalPlaces,
        showTaxBreakdown: dto.showTaxBreakdown,
        showTaxInclusiveText: dto.showTaxInclusiveText,
        taxLineLabel: dto.taxLineLabel,
        vatNumberLabel: dto.vatNumberLabel,
        taxRegistrationNumber: dto.taxRegistrationNumber,
        vatNumber: dto.vatNumber,
        defaultTaxId: dto.defaultTaxId,
        autoApplyDefaultTax: dto.autoApplyDefaultTax,
      },
    });
  }

  /**
   * Get company tax settings
   */
  async getCompanyTaxSettings(companyId: string) {
    let settings = await this.prisma.companyTaxSetting.findUnique({
      where: { companyId },
    });

    // Create default settings if none exist
    if (!settings) {
      settings = await this.upsertCompanyTaxSettings({
        companyId,
        priceDisplayMode: TaxDisplayMode.tax_inclusive,
        taxRoundingMode: TaxRoundingMode.round_half_up,
        decimalPlaces: 2,
        showTaxBreakdown: true,
        showTaxInclusiveText: true,
      });
    }

    return settings;
  }

  /**
   * Bulk assign default tax to all products in company
   */
  async assignDefaultTaxToAllProducts(companyId: string) {
    const defaultTax = await this.prisma.tax.findFirst({
      where: {
        companyId,
        isDefault: true,
        isActive: true,
      },
    });

    if (!defaultTax) {
      throw new NotFoundException('No default tax found for company');
    }

    const products = await this.prisma.menuProduct.findMany({
      where: {
        companyId,
        deletedAt: null,
      },
      select: { id: true },
    });

    const assignments = products.map(product => ({
      taxId: defaultTax.id,
      productId: product.id,
    }));

    // Use createMany with skipDuplicates to avoid errors
    return this.prisma.taxableProduct.createMany({
      data: assignments,
      skipDuplicates: true,
    });
  }
}