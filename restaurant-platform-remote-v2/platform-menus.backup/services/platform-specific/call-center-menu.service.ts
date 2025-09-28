// ================================================
// Call Center Menu Management Service
// Platform-Specific Implementation for Phone Orders
// ================================================

import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import {
  PlatformMenu,
  PlatformMenuItem,
  DeliveryPlatform,
  MenuStatus,
  LocalizedContent,
  PlatformMenuConfig
} from '../../types/platform-menu.types';

export interface CallCenterMenuConfig {
  branchId: string;
  phoneNumbers: string[];
  operatorSettings: {
    maxSimultaneousOrders: number;
    averageCallDuration: number;
    preferredLanguage: 'en' | 'ar' | 'both';
  };
  quickOrderCodes: {
    enabled: boolean;
    codeLength: number;
    includeCategory: boolean;
  };
  promotions: {
    phoneExclusive: boolean;
    timeBasedOffers: boolean;
    repeatCustomerDiscounts: boolean;
  };
  customerManagement: {
    enableCustomerDatabase: boolean;
    saveOrderHistory: boolean;
    suggestPreviousOrders: boolean;
  };
  orderProcessing: {
    confirmationRequired: boolean;
    readBackOrder: boolean;
    estimatedDeliveryTime: number;
    acceptCashOnDelivery: boolean;
    acceptCardPayments: boolean;
  };
}

export interface CallCenterProduct {
  id: string;
  quickCode: string;
  name: string;
  phoneDescription: string;
  categoryCode: string;
  categoryName: string;
  price: number;
  formattedPrice: string;
  isAvailable: boolean;
  preparationTime: number;
  phoneInstructions?: string;
  allergenWarnings?: string[];
  modifiers?: CallCenterModifier[];
  popularityRank?: number;
  lastOrderFrequency?: number;
  tags?: string[];
  alternatives?: string[]; // Alternative product suggestions
}

export interface CallCenterModifier {
  id: string;
  quickCode: string;
  name: string;
  phoneDescription: string;
  price: number;
  formattedPrice: string;
  category: string;
  isRequired: boolean;
  isDefault: boolean;
  maxQuantity: number;
}

export interface CallCenterCategory {
  id: string;
  code: string;
  name: string;
  phoneDescription: string;
  displayOrder: number;
  isVisible: boolean;
  quickAccessCode?: string;
  products: CallCenterProduct[];
  popularProducts?: string[]; // Product IDs ordered by popularity
}

export interface CallCenterMenuResponse {
  success: boolean;
  menuId?: string;
  message?: string;
  errors?: string[];
  warnings?: string[];
  processingTime?: number;
  totalProducts?: number;
  totalCategories?: number;
  quickCodesGenerated?: number;
}

export interface CallCenterQuickReference {
  categories: {
    code: string;
    name: string;
    productCount: number;
  }[];
  popularItems: {
    code: string;
    name: string;
    price: string;
    category: string;
  }[];
  modifierGroups: {
    name: string;
    codes: { code: string; name: string; price: string }[];
  }[];
  phoneScript: {
    greeting: string;
    categoryIntro: string;
    orderConfirmation: string;
    totalCalculation: string;
    deliveryInfo: string;
  };
}

@Injectable()
export class CallCenterMenuService {
  private readonly logger = new Logger(CallCenterMenuService.name);

  constructor(
    private readonly prisma: PrismaService
  ) {}

  // ================================================
  // MENU CREATION & MANAGEMENT
  // ================================================

  /**
   * Create Call Center-specific menu from platform menu
   */
  async createCallCenterMenu(
    platformMenu: PlatformMenu,
    config: CallCenterMenuConfig
  ): Promise<CallCenterMenuResponse> {
    const startTime = Date.now();
    this.logger.log(`Creating Call Center menu for platform menu: ${platformMenu.id}`);

    try {
      // Validate configuration
      this.validateCallCenterConfig(config);

      // Transform platform menu to Call Center format
      const callCenterMenuData = await this.transformToCallCenterFormat(platformMenu, config);

      // Generate quick order codes if enabled
      if (config.quickOrderCodes.enabled) {
        this.generateQuickOrderCodes(callCenterMenuData, config);
      }

      // Create quick reference guide
      const quickReference = this.generateQuickReference(callCenterMenuData, config);

      // Save to database (custom call center tables or JSON storage)
      await this.saveCallCenterMenu(platformMenu.id, callCenterMenuData, quickReference, config);

      // Update platform menu with call center-specific data
      await this.updatePlatformMenuWithCallCenterData(platformMenu.id, config);

      const processingTime = Date.now() - startTime;
      this.logger.log(`Call Center menu created successfully in ${processingTime}ms`);

      return {
        success: true,
        menuId: platformMenu.id,
        message: 'Call Center menu successfully created/updated',
        processingTime,
        totalProducts: callCenterMenuData.categories.reduce((sum: number, cat: any) => sum + cat.products.length, 0),
        totalCategories: callCenterMenuData.categories.length,
        quickCodesGenerated: config.quickOrderCodes.enabled ? this.countQuickCodes(callCenterMenuData) : 0
      };
    } catch (error) {
      this.logger.error(`Failed to create Call Center menu: ${error.message}`, error.stack);
      return {
        success: false,
        message: 'Failed to create Call Center menu',
        errors: [error.message]
      };
    }
  }

  /**
   * Transform platform menu to Call Center-specific format
   */
  private async transformToCallCenterFormat(
    platformMenu: PlatformMenu,
    config: CallCenterMenuConfig
  ): Promise<{ categories: CallCenterCategory[] }> {
    // Get menu items with full product details
    const menuItems = await this.prisma.platformMenuItem.findMany({
      where: {
        platformMenuId: platformMenu.id,
        isAvailable: true,
        deletedAt: null
      },
      include: {
        product: {
          include: {
            category: true,
            modifierCategories: {
              include: {
                modifierCategory: {
                  include: {
                    modifiers: {
                      where: { isActive: true }
                    }
                  }
                }
              }
            }
          }
        }
      },
      orderBy: [{ product: { category: { sortOrder: 'asc' } } }, { displayOrder: 'asc' }]
    });

    // Get order history for popularity ranking
    const popularityData = await this.getProductPopularityData(config.branchId);

    // Group by category and transform
    const categoriesMap = new Map<string, any>();

    menuItems.forEach(item => {
      const category = item.product.category;
      const categoryId = category.id;

      if (!categoriesMap.has(categoryId)) {
        categoriesMap.set(categoryId, {
          id: categoryId,
          code: this.generateCategoryCode(category.name),
          name: this.getLocalizedName(category.name),
          phoneDescription: this.createPhoneDescription(category.name, category.description),
          displayOrder: category.sortOrder || 0,
          isVisible: true,
          products: []
        });
      }

      // Transform product to Call Center format
      const callCenterProduct = this.transformProductToCallCenter(item, config, popularityData);
      categoriesMap.get(categoryId).products.push(callCenterProduct);
    });

    // Convert to array, sort, and add popularity rankings
    const categories = Array.from(categoriesMap.values())
      .sort((a, b) => a.displayOrder - b.displayOrder)
      .map(category => {
        // Sort products by popularity within category
        category.products.sort((a: any, b: any) => {
          if (a.popularityRank && b.popularityRank) {
            return a.popularityRank - b.popularityRank;
          }
          return a.name.localeCompare(b.name);
        });

        // Add popular products list (top 5)
        category.popularProducts = category.products
          .slice(0, 5)
          .map((p: any) => p.id);

        return category;
      });

    return { categories };
  }

  /**
   * Transform individual product to Call Center format
   */
  private transformProductToCallCenter(
    menuItem: any,
    config: CallCenterMenuConfig,
    popularityData: Map<string, number>
  ): CallCenterProduct {
    const product = menuItem.product;
    const price = menuItem.platformPrice || product.basePrice;
    const formattedPrice = this.formatPriceForPhone(price);

    return {
      id: product.id,
      quickCode: '', // Will be generated later if enabled
      name: this.getLocalizedName(product.name),
      phoneDescription: this.createProductPhoneDescription(product),
      categoryCode: this.generateCategoryCode(product.category.name),
      categoryName: this.getLocalizedName(product.category.name),
      price,
      formattedPrice,
      isAvailable: menuItem.isAvailable && product.isAvailable,
      preparationTime: product.preparationTime || config.orderProcessing.estimatedDeliveryTime,
      phoneInstructions: this.generatePhoneInstructions(product),
      allergenWarnings: this.extractAllergenWarnings(product),
      modifiers: this.transformModifiersToCallCenter(product.modifierCategories),
      popularityRank: popularityData.get(product.id) || 999,
      tags: [...(product.tags || []), ...(menuItem.tags || [])],
      alternatives: this.findAlternativeProducts(product, menuItem)
    };
  }

  /**
   * Transform modifiers to Call Center format
   */
  private transformModifiersToCallCenter(modifierCategories: any[]): CallCenterModifier[] {
    const modifiers: CallCenterModifier[] = [];

    modifierCategories.forEach(mc => {
      mc.modifierCategory.modifiers.forEach((mod: any) => {
        modifiers.push({
          id: mod.id,
          quickCode: '', // Will be generated later if enabled
          name: this.getLocalizedName(mod.name),
          phoneDescription: this.createModifierPhoneDescription(mod),
          price: mod.price || 0,
          formattedPrice: this.formatPriceForPhone(mod.price || 0),
          category: this.getLocalizedName(mc.modifierCategory.name),
          isRequired: mc.isRequired,
          isDefault: mod.isDefault || false,
          maxQuantity: mod.maxQuantity || 10
        });
      });
    });

    return modifiers;
  }

  /**
   * Generate quick order codes for products and modifiers
   */
  private generateQuickOrderCodes(
    menuData: { categories: CallCenterCategory[] },
    config: CallCenterMenuConfig
  ): void {
    let codeCounter = 1;
    const codeLength = config.quickOrderCodes.codeLength;
    const includeCategory = config.quickOrderCodes.includeCategory;

    menuData.categories.forEach((category, categoryIndex) => {
      // Generate category quick access code
      category.quickAccessCode = includeCategory ? 
        `C${String(categoryIndex + 1).padStart(2, '0')}` : undefined;

      category.products.forEach((product, productIndex) => {
        // Generate product quick code
        const categoryPrefix = includeCategory ? String(categoryIndex + 1) : '';
        const productCode = String(productIndex + 1).padStart(codeLength - categoryPrefix.length, '0');
        product.quickCode = categoryPrefix + productCode;

        // Generate modifier quick codes
        let modifierCounter = 1;
        product.modifiers?.forEach(modifier => {
          modifier.quickCode = `${product.quickCode}M${String(modifierCounter++).padStart(2, '0')}`;
        });
      });
    });
  }

  /**
   * Generate quick reference guide for operators
   */
  private generateQuickReference(
    menuData: { categories: CallCenterCategory[] },
    config: CallCenterMenuConfig
  ): CallCenterQuickReference {
    // Create categories summary
    const categories = menuData.categories.map(cat => ({
      code: cat.quickAccessCode || cat.code,
      name: cat.name,
      productCount: cat.products.length
    }));

    // Create popular items list (top 10 across all categories)
    const allProducts = menuData.categories.flatMap(cat => cat.products);
    const popularItems = allProducts
      .filter(p => p.popularityRank && p.popularityRank < 999)
      .sort((a, b) => a.popularityRank! - b.popularityRank!)
      .slice(0, 10)
      .map(p => ({
        code: p.quickCode || p.id.substring(0, 4).toUpperCase(),
        name: p.name,
        price: p.formattedPrice,
        category: p.categoryName
      }));

    // Create modifier groups summary
    const modifierGroupsMap = new Map<string, any>();
    allProducts.forEach(product => {
      product.modifiers?.forEach(modifier => {
        if (!modifierGroupsMap.has(modifier.category)) {
          modifierGroupsMap.set(modifier.category, {
            name: modifier.category,
            codes: []
          });
        }
        modifierGroupsMap.get(modifier.category).codes.push({
          code: modifier.quickCode || modifier.id.substring(0, 4).toUpperCase(),
          name: modifier.name,
          price: modifier.formattedPrice
        });
      });
    });

    const modifierGroups = Array.from(modifierGroupsMap.values());

    // Create phone scripts
    const phoneScript = {
      greeting: this.generateGreetingScript(config),
      categoryIntro: this.generateCategoryIntroScript(categories),
      orderConfirmation: this.generateOrderConfirmationScript(),
      totalCalculation: this.generateTotalCalculationScript(),
      deliveryInfo: this.generateDeliveryInfoScript(config)
    };

    return {
      categories,
      popularItems,
      modifierGroups,
      phoneScript
    };
  }

  /**
   * Save Call Center menu to database
   */
  private async saveCallCenterMenu(
    platformMenuId: string,
    menuData: any,
    quickReference: CallCenterQuickReference,
    config: CallCenterMenuConfig
  ): Promise<void> {
    // Save to platform menu's platformConfig
    await this.prisma.platformMenu.update({
      where: { id: platformMenuId },
      data: {
        platformConfig: {
          call_center: {
            menuData,
            quickReference,
            config,
            lastUpdated: new Date(),
            version: '1.0'
          }
        }
      }
    });

    // Optionally save to separate call center tables if they exist
    // This would be for dedicated call center interface
  }

  /**
   * Update platform menu with call center-specific data
   */
  private async updatePlatformMenuWithCallCenterData(
    platformMenuId: string,
    config: CallCenterMenuConfig
  ): Promise<void> {
    await this.prisma.platformMenu.update({
      where: { id: platformMenuId },
      data: {
        lastSyncedAt: new Date(),
        syncStatus: 'completed'
      }
    });
  }

  // ================================================
  // HELPER METHODS
  // ================================================

  private validateCallCenterConfig(config: CallCenterMenuConfig): void {
    if (!config.branchId) {
      throw new BadRequestException('Branch ID is required for Call Center menu');
    }
    if (!config.phoneNumbers || config.phoneNumbers.length === 0) {
      throw new BadRequestException('At least one phone number is required');
    }
    if (config.orderProcessing.estimatedDeliveryTime <= 0) {
      throw new BadRequestException('Estimated delivery time must be greater than 0');
    }
  }

  private async getProductPopularityData(branchId: string): Promise<Map<string, number>> {
    // Query order history to determine product popularity
    const popularityData = await this.prisma.orderItem.groupBy({
      by: ['productId'],
      where: {
        order: {
          branchId,
          createdAt: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
          }
        }
      },
      _sum: {
        quantity: true
      },
      orderBy: {
        _sum: {
          quantity: 'desc'
        }
      }
    });

    const popularityMap = new Map<string, number>();
    popularityData.forEach((item, index) => {
      popularityMap.set(item.productId, index + 1);
    });

    return popularityMap;
  }

  private getLocalizedName(name: any): string {
    if (typeof name === 'string') return name;
    return name?.en || name?.ar || 'Unnamed Item';
  }

  private generateCategoryCode(categoryName: any): string {
    const name = this.getLocalizedName(categoryName);
    return name.substring(0, 3).toUpperCase().replace(/[^A-Z]/g, 'X');
  }

  private createPhoneDescription(name: any, description: any): string {
    const nameStr = this.getLocalizedName(name);
    const descStr = typeof description === 'string' ? description : description?.en || description?.ar || '';
    
    if (descStr) {
      return `${nameStr} - ${descStr.substring(0, 50)}${descStr.length > 50 ? '...' : ''}`;
    }
    return nameStr;
  }

  private createProductPhoneDescription(product: any): string {
    const name = this.getLocalizedName(product.name);
    const desc = typeof product.description === 'string' ? 
      product.description : 
      product.description?.en || product.description?.ar || '';
    
    // Create a concise phone-friendly description
    const parts = [];
    if (desc && desc.length > 0) {
      parts.push(desc.substring(0, 80));
    }
    if (product.preparationTime) {
      parts.push(`Ready in ${product.preparationTime} minutes`);
    }
    
    return parts.join('. ');
  }

  private createModifierPhoneDescription(modifier: any): string {
    const name = this.getLocalizedName(modifier.name);
    const price = modifier.price || 0;
    
    if (price > 0) {
      return `${name} (+${this.formatPriceForPhone(price)})`;
    }
    return name;
  }

  private formatPriceForPhone(price: number): string {
    return new Intl.NumberFormat('en-JO', {
      style: 'currency',
      currency: 'JOD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 3
    }).format(price);
  }

  private generatePhoneInstructions(product: any): string {
    const instructions = [];
    
    if (product.isSpicy) {
      instructions.push('Spicy item');
    }
    if (product.preparationTime > 30) {
      instructions.push('Longer preparation time');
    }
    if (product.tags?.includes('popular')) {
      instructions.push('Customer favorite');
    }
    
    return instructions.join(', ');
  }

  private extractAllergenWarnings(product: any): string[] {
    const allergens = product.allergens || [];
    const tagAllergens = (product.tags || []).filter((tag: string) => 
      ['nuts', 'dairy', 'gluten', 'eggs', 'soy', 'fish', 'shellfish'].includes(tag.toLowerCase())
    );
    
    return [...allergens, ...tagAllergens];
  }

  private findAlternativeProducts(product: any, menuItem: any): string[] {
    // This would be enhanced with ML recommendations
    // For now, return products from same category with similar price range
    return [];
  }

  private countQuickCodes(menuData: { categories: CallCenterCategory[] }): number {
    return menuData.categories.reduce((total, category) => {
      return total + category.products.length + 
        category.products.reduce((modTotal, product) => 
          modTotal + (product.modifiers?.length || 0), 0
        );
    }, 0);
  }

  private generateGreetingScript(config: CallCenterMenuConfig): string {
    return `Thank you for calling! I'll be happy to take your order. We have ${config.orderProcessing.estimatedDeliveryTime} minutes estimated delivery time today.`;
  }

  private generateCategoryIntroScript(categories: any[]): string {
    const categoryNames = categories.map(c => c.name).slice(0, 5).join(', ');
    return `Our menu includes: ${categoryNames}. What would you like to order today?`;
  }

  private generateOrderConfirmationScript(): string {
    return 'Let me confirm your order: [repeat items]. Your total is [amount]. Is this correct?';
  }

  private generateTotalCalculationScript(): string {
    return 'Your subtotal is [subtotal], delivery fee is [delivery], and total is [total].';
  }

  private generateDeliveryInfoScript(config: CallCenterMenuConfig): string {
    return `We'll deliver to your address in approximately ${config.orderProcessing.estimatedDeliveryTime} minutes. ${config.orderProcessing.acceptCashOnDelivery ? 'We accept cash on delivery' : 'Payment by card only'}.`;
  }

  // ================================================
  // PUBLIC API METHODS
  // ================================================

  /**
   * Get Call Center menu templates
   */
  async getCallCenterMenuTemplates(): Promise<any[]> {
    return [
      {
        id: 'call-center-basic',
        name: 'Basic Call Center Setup',
        description: 'Simple phone order system with essential features',
        config: {
          operatorSettings: {
            maxSimultaneousOrders: 3,
            averageCallDuration: 5,
            preferredLanguage: 'both'
          },
          quickOrderCodes: {
            enabled: true,
            codeLength: 3,
            includeCategory: false
          },
          promotions: {
            phoneExclusive: true,
            timeBasedOffers: false,
            repeatCustomerDiscounts: true
          },
          customerManagement: {
            enableCustomerDatabase: true,
            saveOrderHistory: true,
            suggestPreviousOrders: true
          },
          orderProcessing: {
            confirmationRequired: true,
            readBackOrder: true,
            estimatedDeliveryTime: 30,
            acceptCashOnDelivery: true,
            acceptCardPayments: false
          }
        }
      },
      {
        id: 'call-center-advanced',
        name: 'Advanced Call Center System',
        description: 'Full-featured phone order system with advanced capabilities',
        config: {
          operatorSettings: {
            maxSimultaneousOrders: 5,
            averageCallDuration: 7,
            preferredLanguage: 'both'
          },
          quickOrderCodes: {
            enabled: true,
            codeLength: 4,
            includeCategory: true
          },
          promotions: {
            phoneExclusive: true,
            timeBasedOffers: true,
            repeatCustomerDiscounts: true
          },
          customerManagement: {
            enableCustomerDatabase: true,
            saveOrderHistory: true,
            suggestPreviousOrders: true
          },
          orderProcessing: {
            confirmationRequired: true,
            readBackOrder: true,
            estimatedDeliveryTime: 25,
            acceptCashOnDelivery: true,
            acceptCardPayments: true
          }
        }
      }
    ];
  }

  /**
   * Get quick reference guide for operators
   */
  async getQuickReference(platformMenuId: string): Promise<CallCenterQuickReference | null> {
    const menu = await this.prisma.platformMenu.findUnique({
      where: { id: platformMenuId },
      select: { platformConfig: true }
    });

    const callCenterConfig = (menu?.platformConfig as any)?.call_center;
    return callCenterConfig?.quickReference || null;
  }

  /**
   * Search products by quick code or name for operators
   */
  async searchForOperator(
    platformMenuId: string,
    query: string
  ): Promise<{ products: CallCenterProduct[]; suggestions: string[] }> {
    const menu = await this.prisma.platformMenu.findUnique({
      where: { id: platformMenuId },
      select: { platformConfig: true }
    });

    const callCenterData = (menu?.platformConfig as any)?.call_center?.menuData;
    if (!callCenterData) {
      return { products: [], suggestions: [] };
    }

    const allProducts = callCenterData.categories.flatMap((cat: any) => cat.products);
    
    // Search by quick code first, then by name
    const products = allProducts.filter((product: any) => 
      product.quickCode?.toLowerCase().includes(query.toLowerCase()) ||
      product.name.toLowerCase().includes(query.toLowerCase())
    );

    // Generate suggestions for partial matches
    const suggestions = allProducts
      .filter((product: any) => 
        product.name.toLowerCase().includes(query.toLowerCase()) &&
        !products.includes(product)
      )
      .map((product: any) => product.name)
      .slice(0, 5);

    return { products, suggestions };
  }
}