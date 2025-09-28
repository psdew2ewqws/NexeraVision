import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { TaxCalculationService } from './services/tax-calculation.service';
import { TaxConfigurationService } from './services/tax-configuration.service';

@Injectable()
export class TaxesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly taxCalculationService: TaxCalculationService,
    private readonly taxConfigurationService: TaxConfigurationService,
  ) {}

  // Expose calculation service methods
  async calculateProductTax(...args: Parameters<TaxCalculationService['calculateProductTax']>) {
    return this.taxCalculationService.calculateProductTax(...args);
  }

  async calculateOrderItemTax(...args: Parameters<TaxCalculationService['calculateOrderItemTax']>) {
    return this.taxCalculationService.calculateOrderItemTax(...args);
  }

  async enhancePricingWithTax(...args: Parameters<TaxCalculationService['enhancePricingWithTax']>) {
    return this.taxCalculationService.enhancePricingWithTax(...args);
  }

  async calculateJordanVAT(...args: Parameters<TaxCalculationService['calculateJordanVAT']>) {
    return this.taxCalculationService.calculateJordanVAT(...args);
  }

  // Expose configuration service methods
  async createTax(...args: Parameters<TaxConfigurationService['createTax']>) {
    return this.taxConfigurationService.createTax(...args);
  }

  async createJordanVAT(...args: Parameters<TaxConfigurationService['createJordanVAT']>) {
    return this.taxConfigurationService.createJordanVAT(...args);
  }

  async createTaxPresets(...args: Parameters<TaxConfigurationService['createTaxPresets']>) {
    return this.taxConfigurationService.createTaxPresets(...args);
  }

  async updateTax(...args: Parameters<TaxConfigurationService['updateTax']>) {
    return this.taxConfigurationService.updateTax(...args);
  }

  async getCompanyTaxes(...args: Parameters<TaxConfigurationService['getCompanyTaxes']>) {
    return this.taxConfigurationService.getCompanyTaxes(...args);
  }

  async assignTaxToProduct(...args: Parameters<TaxConfigurationService['assignTaxToProduct']>) {
    return this.taxConfigurationService.assignTaxToProduct(...args);
  }

  async assignTaxToCategory(...args: Parameters<TaxConfigurationService['assignTaxToCategory']>) {
    return this.taxConfigurationService.assignTaxToCategory(...args);
  }

  async assignTaxToModifier(...args: Parameters<TaxConfigurationService['assignTaxToModifier']>) {
    return this.taxConfigurationService.assignTaxToModifier(...args);
  }

  async upsertCompanyTaxSettings(...args: Parameters<TaxConfigurationService['upsertCompanyTaxSettings']>) {
    return this.taxConfigurationService.upsertCompanyTaxSettings(...args);
  }

  async getCompanyTaxSettings(...args: Parameters<TaxConfigurationService['getCompanyTaxSettings']>) {
    return this.taxConfigurationService.getCompanyTaxSettings(...args);
  }

  async assignDefaultTaxToAllProducts(...args: Parameters<TaxConfigurationService['assignDefaultTaxToAllProducts']>) {
    return this.taxConfigurationService.assignDefaultTaxToAllProducts(...args);
  }

  /**
   * Initialize tax system for a new company with Jordan VAT
   */
  async initializeCompanyTaxSystem(companyId: string) {
    // Create tax presets
    const taxes = await this.createTaxPresets(companyId);
    const jordanVAT = taxes.find(tax => tax.percentage === 16.0);

    // Create company tax settings with Jordan VAT as default
    const settings = await this.upsertCompanyTaxSettings({
      companyId,
      defaultTaxId: jordanVAT?.id,
      autoApplyDefaultTax: true,
      showTaxBreakdown: true,
      showTaxInclusiveText: true,
      taxRegistrationNumber: null, // To be filled by company
      vatNumber: null, // To be filled by company
    });

    return {
      taxes,
      settings,
      message: 'Tax system initialized with Jordan VAT (16%) as default',
    };
  }

  /**
   * Get comprehensive tax overview for a company
   */
  async getCompanyTaxOverview(companyId: string) {
    const [taxes, settings, productsWithTax, categoriesWithTax] = await Promise.all([
      this.getCompanyTaxes(companyId),
      this.getCompanyTaxSettings(companyId),
      this.prisma.taxableProduct.count({
        where: {
          tax: { companyId },
        },
      }),
      this.prisma.taxableCategory.count({
        where: {
          tax: { companyId },
        },
      }),
    ]);

    return {
      taxes,
      settings,
      statistics: {
        totalTaxes: taxes.length,
        activeTaxes: taxes.filter(tax => tax.isActive).length,
        defaultTax: taxes.find(tax => tax.isDefault),
        productsWithTax,
        categoriesWithTax,
      },
    };
  }

  /**
   * Generate receipt tax summary
   */
  async generateReceiptTaxSummary(
    orderItems: Array<{
      productId: string;
      quantity: number;
      unitPrice: number;
      modifiers?: Array<{
        modifierId: string;
        price: number;
      }>;
    }>,
    companyId: string,
  ) {
    const settings = await this.getCompanyTaxSettings(companyId);
    const taxSummary = {
      subtotal: 0,
      totalTax: 0,
      total: 0,
      taxBreakdown: [],
      taxableItems: [],
    };

    for (const item of orderItems) {
      const modifierIds = item.modifiers?.map(m => m.modifierId) || [];
      const modifierPrices = item.modifiers?.reduce((acc, m) => {
        acc[m.modifierId] = m.price;
        return acc;
      }, {}) || {};

      const taxResult = await this.calculateOrderItemTax(
        item.productId,
        modifierIds,
        item.unitPrice,
        modifierPrices,
        companyId,
      );

      const itemTotal = taxResult.finalPrice * item.quantity;
      const itemTax = taxResult.taxAmount * item.quantity;

      taxSummary.subtotal += taxResult.originalPrice * item.quantity;
      taxSummary.totalTax += itemTax;
      taxSummary.total += itemTotal;

      taxSummary.taxableItems.push({
        productId: item.productId,
        quantity: item.quantity,
        unitPriceExcludingTax: taxResult.originalPrice,
        unitPriceIncludingTax: taxResult.finalPrice,
        unitTaxAmount: taxResult.taxAmount,
        totalPriceExcludingTax: taxResult.originalPrice * item.quantity,
        totalPriceIncludingTax: itemTotal,
        totalTaxAmount: itemTax,
        taxDetails: taxResult.taxDetails,
      });

      // Aggregate tax breakdown
      for (const taxDetail of taxResult.taxDetails) {
        const existingTax = taxSummary.taxBreakdown.find(t => t.taxId === taxDetail.taxId);
        if (existingTax) {
          existingTax.amount += (taxResult.taxAmount * item.quantity) / taxResult.taxDetails.length;
        } else {
          taxSummary.taxBreakdown.push({
            taxId: taxDetail.taxId,
            taxName: taxDetail.taxName,
            taxType: taxDetail.taxType,
            rate: taxDetail.appliedValue,
            amount: (taxResult.taxAmount * item.quantity) / taxResult.taxDetails.length,
          });
        }
      }
    }

    return {
      summary: taxSummary,
      settings,
      displayOptions: {
        showTaxBreakdown: settings.showTaxBreakdown,
        showTaxInclusiveText: settings.showTaxInclusiveText,
        taxLineLabel: settings.taxLineLabel,
        vatNumberLabel: settings.vatNumberLabel,
        vatNumber: settings.vatNumber,
        taxRegistrationNumber: settings.taxRegistrationNumber,
      },
    };
  }
}