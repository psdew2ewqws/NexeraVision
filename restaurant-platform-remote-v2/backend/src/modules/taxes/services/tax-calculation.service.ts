import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { TaxType, TaxDisplayMode, TaxRoundingMode } from '@prisma/client';

export interface TaxCalculationResult {
  originalPrice: number;
  taxAmount: number;
  finalPrice: number;
  taxPercentage: number;
  taxDetails: {
    taxId: string;
    taxName: any;
    taxType: TaxType;
    appliedValue: number;
    calculationMethod: string;
  }[];
}

export interface ProductPricing {
  basePrice: number;
  platformPricing?: Record<string, number>;
  taxIds?: string[];
  companyId: string;
}

@Injectable()
export class TaxCalculationService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Calculate taxes for a product using Picolinate-inspired approach
   * Supports both percentage and fixed tax calculations
   */
  async calculateProductTax(
    productId: string,
    pricing: ProductPricing,
    displayMode: TaxDisplayMode = TaxDisplayMode.tax_inclusive,
  ): Promise<TaxCalculationResult> {
    // Get product with associated taxes
    const product = await this.prisma.menuProduct.findUnique({
      where: { id: productId },
      include: {
        taxableProducts: {
          include: {
            tax: true,
          },
        },
        category: {
          include: {
            taxableCategories: {
              include: {
                tax: true,
              },
            },
          },
        },
      },
    });

    if (!product) {
      throw new Error('Product not found');
    }

    // Get company tax settings
    const companyTaxSettings = await this.prisma.companyTaxSetting.findUnique({
      where: { companyId: pricing.companyId },
    });

    // Collect all applicable taxes
    const applicableTaxes = [
      ...product.taxableProducts.map(tp => tp.tax),
      ...(product.category?.taxableCategories.map(tc => tc.tax) || []),
    ].filter(tax => tax.isActive);

    // If no specific taxes and auto-apply default is enabled, use default tax
    if (applicableTaxes.length === 0 && companyTaxSettings?.autoApplyDefaultTax && companyTaxSettings.defaultTaxId) {
      const defaultTax = await this.prisma.tax.findUnique({
        where: { id: companyTaxSettings.defaultTaxId },
      });
      if (defaultTax && defaultTax.isActive) {
        applicableTaxes.push(defaultTax);
      }
    }

    return this.calculateTaxesForPrice(
      pricing.basePrice,
      applicableTaxes,
      displayMode,
      companyTaxSettings?.taxRoundingMode || TaxRoundingMode.round_half_up,
      companyTaxSettings?.decimalPlaces || 2,
    );
  }

  /**
   * Calculate taxes for order items (products + modifiers)
   */
  async calculateOrderItemTax(
    productId: string,
    modifierIds: string[],
    productPrice: number,
    modifierPrices: Record<string, number>,
    companyId: string,
  ): Promise<TaxCalculationResult> {
    // Get all tax associations for products and modifiers
    const [productTaxes, modifierTaxes, companySettings] = await Promise.all([
      this.getProductTaxes(productId),
      this.getModifierTaxes(modifierIds),
      this.prisma.companyTaxSetting.findUnique({
        where: { companyId },
      }),
    ]);

    // Calculate total base price
    const totalBasePrice = productPrice + Object.values(modifierPrices).reduce((sum, price) => sum + price, 0);

    // Combine all applicable taxes (deduplicate)
    const allTaxes = this.deduplicateTaxes([...productTaxes, ...modifierTaxes]);

    return this.calculateTaxesForPrice(
      totalBasePrice,
      allTaxes,
      companySettings?.priceDisplayMode || TaxDisplayMode.tax_inclusive,
      companySettings?.taxRoundingMode || TaxRoundingMode.round_half_up,
      companySettings?.decimalPlaces || 2,
    );
  }

  /**
   * Core tax calculation logic based on Picolinate patterns
   */
  private calculateTaxesForPrice(
    basePrice: number,
    taxes: any[],
    displayMode: TaxDisplayMode,
    roundingMode: TaxRoundingMode,
    decimalPlaces: number,
  ): TaxCalculationResult {
    let totalTaxAmount = 0;
    const taxDetails = [];

    for (const tax of taxes) {
      let taxAmount = 0;
      let calculationMethod = '';

      if (tax.taxType === TaxType.percentage) {
        if (displayMode === TaxDisplayMode.tax_inclusive) {
          // Price includes tax: itemWithoutTaxPrice = itemSealedPrice / (taxPercentage + 1)
          const taxPercentage = tax.percentage / 100;
          const priceWithoutTax = basePrice / (taxPercentage + 1);
          taxAmount = basePrice - priceWithoutTax;
          calculationMethod = 'tax_inclusive_percentage';
        } else {
          // Price excludes tax: taxAmount = basePrice * (taxPercentage / 100)
          taxAmount = basePrice * (tax.percentage / 100);
          calculationMethod = 'tax_exclusive_percentage';
        }
      } else if (tax.taxType === TaxType.fixed) {
        // Fixed tax amount
        taxAmount = parseFloat(tax.fixedAmount.toString());
        calculationMethod = 'fixed_amount';
      }

      // Apply rounding
      taxAmount = this.roundAmount(taxAmount, roundingMode, decimalPlaces);
      totalTaxAmount += taxAmount;

      taxDetails.push({
        taxId: tax.id,
        taxName: tax.name,
        taxType: tax.taxType,
        appliedValue: tax.taxType === TaxType.percentage ? tax.percentage : parseFloat(tax.fixedAmount.toString()),
        calculationMethod,
      });
    }

    // Calculate final amounts based on display mode
    let originalPrice: number;
    let finalPrice: number;

    if (displayMode === TaxDisplayMode.tax_inclusive) {
      // Price already includes tax
      finalPrice = basePrice;
      originalPrice = basePrice - totalTaxAmount;
    } else {
      // Price excludes tax
      originalPrice = basePrice;
      finalPrice = basePrice + totalTaxAmount;
    }

    // Round final amounts
    originalPrice = this.roundAmount(originalPrice, roundingMode, decimalPlaces);
    finalPrice = this.roundAmount(finalPrice, roundingMode, decimalPlaces);
    totalTaxAmount = this.roundAmount(totalTaxAmount, roundingMode, decimalPlaces);

    return {
      originalPrice,
      taxAmount: totalTaxAmount,
      finalPrice,
      taxPercentage: originalPrice > 0 ? (totalTaxAmount / originalPrice) * 100 : 0,
      taxDetails,
    };
  }

  /**
   * Enhanced pricing JSON with embedded tax percentage (Picolinate pattern)
   */
  async enhancePricingWithTax(
    productId: string,
    basePricing: Record<string, number>,
    companyId: string,
  ): Promise<Record<string, any>> {
    const enhancedPricing = {};

    for (const [platform, price] of Object.entries(basePricing)) {
      const taxResult = await this.calculateProductTax(
        productId,
        { basePrice: price, companyId },
        TaxDisplayMode.tax_inclusive,
      );

      enhancedPricing[platform] = {
        price,
        priceTaxPercentage: taxResult.taxPercentage / 100, // Store as decimal like Picolinate
        taxAmount: taxResult.taxAmount,
        priceExcludingTax: taxResult.originalPrice,
        priceIncludingTax: taxResult.finalPrice,
        taxDetails: taxResult.taxDetails,
      };
    }

    return enhancedPricing;
  }

  /**
   * Jordan VAT compliance calculations (16% VAT)
   */
  async calculateJordanVAT(
    basePrice: number,
    isVATIncluded: boolean = true,
  ): Promise<{
    basePrice: number;
    vatAmount: number;
    totalPrice: number;
    vatPercentage: number;
  }> {
    const VAT_RATE = 0.16; // Jordan VAT rate

    let vatAmount: number;
    let totalPrice: number;
    let priceExcludingVAT: number;

    if (isVATIncluded) {
      // Price includes VAT
      priceExcludingVAT = basePrice / (1 + VAT_RATE);
      vatAmount = basePrice - priceExcludingVAT;
      totalPrice = basePrice;
    } else {
      // Price excludes VAT
      priceExcludingVAT = basePrice;
      vatAmount = basePrice * VAT_RATE;
      totalPrice = basePrice + vatAmount;
    }

    return {
      basePrice: this.roundAmount(priceExcludingVAT, TaxRoundingMode.round_half_up, 2),
      vatAmount: this.roundAmount(vatAmount, TaxRoundingMode.round_half_up, 2),
      totalPrice: this.roundAmount(totalPrice, TaxRoundingMode.round_half_up, 2),
      vatPercentage: 16.0,
    };
  }

  private async getProductTaxes(productId: string) {
    const productWithTaxes = await this.prisma.menuProduct.findUnique({
      where: { id: productId },
      include: {
        taxableProducts: {
          include: { tax: true },
        },
        category: {
          include: {
            taxableCategories: {
              include: { tax: true },
            },
          },
        },
      },
    });

    const taxes = [
      ...productWithTaxes?.taxableProducts.map(tp => tp.tax) || [],
      ...productWithTaxes?.category?.taxableCategories.map(tc => tc.tax) || [],
    ];

    return taxes.filter(tax => tax.isActive);
  }

  private async getModifierTaxes(modifierIds: string[]) {
    if (modifierIds.length === 0) return [];

    const modifiersWithTaxes = await this.prisma.modifier.findMany({
      where: { id: { in: modifierIds } },
      include: {
        taxableModifiers: {
          include: { tax: true },
        },
      },
    });

    const taxes = modifiersWithTaxes.flatMap(
      modifier => modifier.taxableModifiers.map(tm => tm.tax)
    );

    return taxes.filter(tax => tax.isActive);
  }

  private deduplicateTaxes(taxes: any[]): any[] {
    const seen = new Set();
    return taxes.filter(tax => {
      if (seen.has(tax.id)) {
        return false;
      }
      seen.add(tax.id);
      return true;
    });
  }

  private roundAmount(
    amount: number,
    roundingMode: TaxRoundingMode,
    decimalPlaces: number,
  ): number {
    const factor = Math.pow(10, decimalPlaces);

    switch (roundingMode) {
      case TaxRoundingMode.round_up:
        return Math.ceil(amount * factor) / factor;
      case TaxRoundingMode.round_down:
        return Math.floor(amount * factor) / factor;
      case TaxRoundingMode.round_half_up:
        return Math.round(amount * factor) / factor;
      case TaxRoundingMode.round_half_down:
        return Math.floor(amount * factor + 0.5) / factor;
      case TaxRoundingMode.round_nearest:
      default:
        return Math.round(amount * factor) / factor;
    }
  }
}