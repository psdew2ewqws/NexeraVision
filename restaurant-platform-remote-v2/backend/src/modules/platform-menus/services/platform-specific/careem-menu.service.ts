// ================================================
// Careem Menu Management Service
// Platform-Specific Implementation for Careem Now
// ================================================

import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { firstValueFrom } from 'rxjs';
import { RetryMechanismService } from '../retry-mechanism.service';
import {
  PlatformMenu,
  PlatformMenuItem,
  DeliveryPlatform,
  MenuStatus,
  LocalizedContent,
  PlatformMenuConfig
} from '../../types/platform-menu.types';

export interface CareemMenuConfig {
  storeId: string;
  menuId?: string;
  currency: string;
  serviceArea: {
    city: string;
    zones: string[];
    maxDeliveryRadius: number;
  };
  deliverySettings: {
    estimatedDeliveryTime: number;
    minOrderValue: number;
    deliveryFee: number;
    freeDeliveryThreshold?: number;
  };
  operationalHours: {
    [day: string]: { open: string; close: string; isOpen: boolean };
  };
  promotions: {
    enabled: boolean;
    types: ('percentage' | 'fixed_amount' | 'buy_x_get_y')[];
    autoApply: boolean;
  };
  display: {
    showPreparationTime: boolean;
    showIngredients: boolean;
    showNutritionalFacts: boolean;
    enableItemCustomization: boolean;
  };
}

export interface CareemProduct {
  id: string;
  storeId: string;
  name: string;
  description: string;
  categoryId: string;
  price: number;
  compareAtPrice?: number;
  currency: string;
  images: string[];
  isAvailable: boolean;
  preparationTime: number;
  ingredients?: string[];
  nutritionalFacts?: {
    calories: number;
    protein: number;
    fat: number;
    carbohydrates: number;
    fiber?: number;
    sugar?: number;
  };
  allergens?: string[];
  dietaryInfo?: ('vegetarian' | 'vegan' | 'gluten-free' | 'halal')[];
  modifierGroups?: CareemModifierGroup[];
  tags?: string[];
  isSpicy?: boolean;
  isPopular?: boolean;
  isFeatured?: boolean;
}

export interface CareemModifierGroup {
  id: string;
  name: string;
  description?: string;
  selectionType: 'single' | 'multiple';
  isRequired: boolean;
  minSelections: number;
  maxSelections: number;
  displayOrder: number;
  modifiers: CareemModifier[];
}

export interface CareemModifier {
  id: string;
  name: string;
  description?: string;
  price: number;
  isDefault: boolean;
  isAvailable: boolean;
  maxQuantity?: number;
}

export interface CareemCategory {
  id: string;
  storeId: string;
  name: string;
  description?: string;
  imageUrl?: string;
  isVisible: boolean;
  displayOrder: number;
  availabilitySchedule?: {
    [day: string]: { start: string; end: string };
  };
  products: CareemProduct[];
}

export interface CareemMenuResponse {
  success: boolean;
  storeMenuId?: string;
  message?: string;
  errors?: string[];
  warnings?: string[];
  syncDuration?: number;
  itemsProcessed?: number;
}

@Injectable()
export class CareemMenuService {
  private readonly logger = new Logger(CareemMenuService.name);
  private readonly careemApiUrl: string;
  private readonly careemApiKey: string;
  private readonly careemStoreSecret: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
    private readonly eventEmitter: EventEmitter2,
    private readonly retryMechanismService: RetryMechanismService
  ) {
    this.careemApiUrl = this.configService.get<string>('CAREEM_API_URL') || 'https://api.careem.com';
    this.careemApiKey = this.configService.get<string>('CAREEM_API_KEY');
    this.careemStoreSecret = this.configService.get<string>('CAREEM_STORE_SECRET');
  }

  // ================================================
  // MENU CREATION & MANAGEMENT
  // ================================================

  /**
   * Create Careem-specific menu from platform menu
   */
  async createCareemMenu(
    platformMenu: PlatformMenu,
    careemConfig: CareemMenuConfig
  ): Promise<CareemMenuResponse> {
    const startTime = Date.now();
    this.logger.log(`Creating Careem menu for platform menu: ${platformMenu.id}`);

    try {
      // Validate configuration
      this.validateCareemConfig(careemConfig);

      // Transform platform menu to Careem format
      const careemMenuData = await this.transformToCareemFormat(platformMenu, careemConfig);

      // Validate menu data before sync
      const validation = this.validateMenuData(careemMenuData);
      if (!validation.isValid) {
        return {
          success: false,
          message: 'Menu validation failed',
          errors: validation.errors
        };
      }

      // Sync with Careem API
      const response = await this.syncWithCareemAPI(careemMenuData, careemConfig);

      // Update platform menu with Careem-specific data
      await this.updatePlatformMenuWithCareemData(platformMenu.id, response, careemConfig);

      const syncDuration = Date.now() - startTime;
      this.logger.log(`Careem menu created successfully in ${syncDuration}ms`);

      return {
        success: true,
        storeMenuId: response.storeMenuId,
        message: 'Menu successfully created/updated in Careem',
        syncDuration,
        itemsProcessed: careemMenuData.categories.reduce((sum: number, cat: any) => sum + cat.products.length, 0)
      };
    } catch (error) {
      this.logger.error(`Failed to create Careem menu: ${error.message}`, error.stack);
      return {
        success: false,
        message: 'Failed to create Careem menu',
        errors: [error.message]
      };
    }
  }

  /**
   * Transform platform menu to Careem-specific format
   */
  private async transformToCareemFormat(
    platformMenu: PlatformMenu,
    config: CareemMenuConfig
  ): Promise<any> {
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
            productImages: {
              orderBy: { id: 'asc' }
            },
            modifierCategories: {
              include: {
                modifierCategory: {
                  include: {
                    modifiers: {
                      where: { status: 1 }
                    }
                  }
                }
              }
            }
          }
        }
      },
      orderBy: { displayOrder: 'asc' }
    });

    // Group by category and transform
    const categoriesMap = new Map<string, any>();

    menuItems.forEach(item => {
      const category = item.product.category;
      const categoryId = category.id;

      if (!categoriesMap.has(categoryId)) {
        categoriesMap.set(categoryId, {
          id: categoryId,
          storeId: config.storeId,
          name: this.getLocalizedName(category.name),
          description: this.getLocalizedDescription(category.description),
          imageUrl: category.image,
          isVisible: true,
          displayOrder: category.displayNumber || 0,
          availabilitySchedule: this.buildAvailabilitySchedule(config.operationalHours),
          products: []
        });
      }

      // Transform product to Careem format
      const careemProduct = this.transformProductToCareem(item, config);
      categoriesMap.get(categoryId).products.push(careemProduct);
    });

    const categories = Array.from(categoriesMap.values())
      .sort((a, b) => a.displayOrder - b.displayOrder);

    return {
      storeId: config.storeId,
      menu: {
        id: platformMenu.id,
        name: this.getLocalizedName(platformMenu.name),
        description: this.getLocalizedDescription(platformMenu.description),
        isActive: platformMenu.isActive,
        currency: config.currency,
        serviceArea: config.serviceArea,
        deliverySettings: config.deliverySettings,
        operationalHours: config.operationalHours,
        lastUpdated: new Date().toISOString()
      },
      categories,
      settings: {
        autoAcceptOrders: false,
        orderProcessingTime: 5,
        maxOrdersPerHour: 25,
        enablePromotions: config.promotions.enabled,
        displaySettings: config.display
      }
    };
  }

  /**
   * Transform individual product to Careem format
   */
  private transformProductToCareem(menuItem: any, config: CareemMenuConfig): CareemProduct {
    const product = menuItem.product;
    const price = menuItem.platformPrice || product.basePrice;
    const compareAtPrice = product.originalPrice && product.originalPrice > price ? product.originalPrice : undefined;

    return {
      id: product.id,
      storeId: config.storeId,
      name: this.getLocalizedName(product.name),
      description: this.getLocalizedDescription(product.description),
      categoryId: product.categoryId,
      price: Math.round(price * 100) / 100,
      compareAtPrice,
      currency: config.currency,
      images: this.extractProductImages(product),
      isAvailable: menuItem.isAvailable && product.isAvailable,
      preparationTime: product.preparationTime || config.deliverySettings.estimatedDeliveryTime,
      ingredients: this.extractIngredients(product),
      nutritionalFacts: this.extractNutritionalFacts(product),
      allergens: this.extractAllergens(product),
      dietaryInfo: this.extractDietaryInfo(product) as any,
      modifierGroups: this.transformModifierGroups(product.modifierCategories),
      tags: [...(product.tags || []), ...(menuItem.tags || [])],
      isSpicy: this.isSpicyProduct(product),
      isPopular: menuItem.isFeatured || product.isPopular,
      isFeatured: menuItem.isFeatured
    };
  }

  /**
   * Transform modifier categories to Careem modifier groups
   */
  private transformModifierGroups(modifierCategories: any[]): CareemModifierGroup[] {
    return modifierCategories.map((mc, index) => ({
      id: mc.modifierCategory.id,
      name: this.getLocalizedName(mc.modifierCategory.name),
      description: this.getLocalizedDescription(mc.modifierCategory.description),
      selectionType: mc.maxSelections === 1 ? 'single' : 'multiple',
      isRequired: mc.isRequired,
      minSelections: mc.minSelections || 0,
      maxSelections: mc.maxSelections || 1,
      displayOrder: index,
      modifiers: mc.modifierCategory.modifiers.map((mod: any) => ({
        id: mod.id,
        name: this.getLocalizedName(mod.name),
        description: this.getLocalizedDescription(mod.description),
        price: mod.price || 0,
        isDefault: mod.isDefault || false,
        isAvailable: mod.isActive,
        maxQuantity: mod.maxQuantity || 10
      }))
    }));
  }

  /**
   * Sync menu data with Careem API
   */
  private async syncWithCareemAPI(menuData: any, config: CareemMenuConfig): Promise<any> {
    try {
      // First, create or update the main menu
      const menuEndpoint = config.menuId ?
        `/store/${config.storeId}/menu/${config.menuId}` :
        `/store/${config.storeId}/menu`;
      
      const menuMethod = config.menuId ? 'PUT' : 'POST';
      
      const menuResponse = await this.callCareemAPI(menuMethod, menuEndpoint, {
        menu: menuData.menu,
        settings: menuData.settings
      });

      // Then, update categories and products
      const storeMenuId = menuResponse.storeMenuId || config.menuId;
      
      // Update categories in batches
      for (const category of menuData.categories) {
        await this.syncCategoryWithProducts(storeMenuId, category, config);
      }

      return {
        storeMenuId,
        status: 'active',
        syncedAt: new Date().toISOString()
      };
    } catch (error) {
      this.logger.error('Careem API sync failed:', error);
      throw new BadRequestException(`Careem API sync failed: ${error.message}`);
    }
  }

  /**
   * Sync category with its products
   */
  private async syncCategoryWithProducts(
    storeMenuId: string,
    category: CareemCategory,
    config: CareemMenuConfig
  ): Promise<void> {
    // Create or update category
    await this.callCareemAPI(
      'PUT',
      `/store/${config.storeId}/menu/${storeMenuId}/category/${category.id}`,
      {
        id: category.id,
        name: category.name,
        description: category.description,
        imageUrl: category.imageUrl,
        isVisible: category.isVisible,
        displayOrder: category.displayOrder,
        availabilitySchedule: category.availabilitySchedule
      }
    );

    // Update products in batches of 10
    const batchSize = 10;
    for (let i = 0; i < category.products.length; i += batchSize) {
      const batch = category.products.slice(i, i + batchSize);
      
      await this.callCareemAPI(
        'PUT',
        `/store/${config.storeId}/menu/${storeMenuId}/category/${category.id}/products`,
        { products: batch }
      );
    }
  }

  /**
   * Update platform menu with Careem-specific data
   */
  private async updatePlatformMenuWithCareemData(
    platformMenuId: string,
    careemResponse: any,
    config: CareemMenuConfig
  ): Promise<void> {
    const currentConfig = await this.prisma.platformMenu.findUnique({
      where: { id: platformMenuId },
      select: { platformConfig: true }
    });

    await this.prisma.platformMenu.update({
      where: { id: platformMenuId },
      data: {
        platformConfig: {
          ...(currentConfig?.platformConfig as object || {}),
          careem: {
            storeMenuId: careemResponse.storeMenuId,
            storeId: config.storeId,
            lastSyncedAt: new Date(),
            syncStatus: 'completed',
            serviceArea: config.serviceArea,
            deliverySettings: config.deliverySettings
          }
        },
        lastSyncedAt: new Date(),
        syncStatus: 'completed'
      }
    });
  }

  // ================================================
  // MENU UPDATES & SYNC
  // ================================================

  /**
   * Update specific items in Careem menu
   */
  async updateCareemMenuItems(
    platformMenuId: string,
    itemIds: string[],
    config: CareemMenuConfig
  ): Promise<CareemMenuResponse> {
    const startTime = Date.now();
    
    try {
      const items = await this.prisma.platformMenuItem.findMany({
        where: {
          id: { in: itemIds },
          platformMenuId,
          deletedAt: null
        },
        include: {
          product: {
            include: {
              category: true,
              productImages: true,
              modifierCategories: {
                include: {
                  modifierCategory: {
                    include: { modifiers: true }
                  }
                }
              }
            }
          }
        }
      });

      // Group by category
      const categoriesMap = new Map();
      items.forEach(item => {
        const categoryId = item.product.categoryId;
        if (!categoriesMap.has(categoryId)) {
          categoriesMap.set(categoryId, []);
        }
        categoriesMap.get(categoryId).push(this.transformProductToCareem(item, config));
      });

      // Update each category's products
      const storeMenuId = config.menuId;
      for (const [categoryId, products] of categoriesMap) {
        await this.callCareemAPI(
          'PATCH',
          `/store/${config.storeId}/menu/${storeMenuId}/category/${categoryId}/products`,
          { products }
        );
      }

      const syncDuration = Date.now() - startTime;
      return {
        success: true,
        message: `Updated ${items.length} items in Careem`,
        syncDuration,
        itemsProcessed: items.length
      };
    } catch (error) {
      this.logger.error('Failed to update Careem menu items:', error);
      return {
        success: false,
        message: 'Failed to update Careem menu items',
        errors: [error.message]
      };
    }
  }

  /**
   * Get menu templates for Careem
   */
  async getCareemMenuTemplates(): Promise<any[]> {
    return [
      {
        id: 'careem-quick-service',
        name: 'Quick Service Restaurant',
        description: 'Optimized for fast casual dining with quick delivery',
        config: {
          currency: 'JOD',
          serviceArea: {
            city: 'Amman',
            zones: ['Downtown', 'Abdoun', 'Sweifieh'],
            maxDeliveryRadius: 10
          },
          deliverySettings: {
            estimatedDeliveryTime: 25,
            minOrderValue: 5.0,
            deliveryFee: 1.5,
            freeDeliveryThreshold: 15.0
          },
          operationalHours: {
            monday: { open: '09:00', close: '23:00', isOpen: true },
            tuesday: { open: '09:00', close: '23:00', isOpen: true },
            wednesday: { open: '09:00', close: '23:00', isOpen: true },
            thursday: { open: '09:00', close: '23:00', isOpen: true },
            friday: { open: '09:00', close: '24:00', isOpen: true },
            saturday: { open: '09:00', close: '24:00', isOpen: true },
            sunday: { open: '10:00', close: '22:00', isOpen: true }
          },
          promotions: {
            enabled: true,
            types: ['percentage', 'fixed_amount'],
            autoApply: true
          },
          display: {
            showPreparationTime: true,
            showIngredients: false,
            showNutritionalFacts: false,
            enableItemCustomization: true
          }
        }
      },
      {
        id: 'careem-premium-restaurant',
        name: 'Premium Restaurant',
        description: 'For high-end restaurants with detailed menu presentation',
        config: {
          currency: 'JOD',
          serviceArea: {
            city: 'Amman',
            zones: ['Abdoun', 'Sweifieh', 'Rainbow Street'],
            maxDeliveryRadius: 8
          },
          deliverySettings: {
            estimatedDeliveryTime: 45,
            minOrderValue: 15.0,
            deliveryFee: 3.0,
            freeDeliveryThreshold: 30.0
          },
          operationalHours: {
            monday: { open: '16:00', close: '23:00', isOpen: true },
            tuesday: { open: '16:00', close: '23:00', isOpen: true },
            wednesday: { open: '16:00', close: '23:00', isOpen: true },
            thursday: { open: '16:00', close: '23:00', isOpen: true },
            friday: { open: '16:00', close: '24:00', isOpen: true },
            saturday: { open: '16:00', close: '24:00', isOpen: true },
            sunday: { open: '16:00', close: '22:00', isOpen: true }
          },
          promotions: {
            enabled: false,
            types: [],
            autoApply: false
          },
          display: {
            showPreparationTime: true,
            showIngredients: true,
            showNutritionalFacts: true,
            enableItemCustomization: true
          }
        }
      }
    ];
  }

  // ================================================
  // HELPER METHODS
  // ================================================

  private validateCareemConfig(config: CareemMenuConfig): void {
    if (!config.storeId) {
      throw new BadRequestException('Careem store ID is required');
    }
    if (!config.currency) {
      throw new BadRequestException('Currency is required for Careem menu');
    }
    if (!config.serviceArea?.city) {
      throw new BadRequestException('Service area city is required');
    }
    if (config.deliverySettings.minOrderValue < 0) {
      throw new BadRequestException('Minimum order value cannot be negative');
    }
  }

  private validateMenuData(menuData: any): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!menuData.categories || menuData.categories.length === 0) {
      errors.push('Menu must have at least one category');
    }

    for (const category of menuData.categories || []) {
      if (!category.products || category.products.length === 0) {
        errors.push(`Category '${category.name}' must have at least one product`);
      }

      for (const product of category.products || []) {
        if (!product.name || product.name.trim() === '') {
          errors.push(`Product in category '${category.name}' must have a name`);
        }
        if (product.price <= 0) {
          errors.push(`Product '${product.name}' must have a price greater than 0`);
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  private getLocalizedName(name: any): string {
    if (typeof name === 'string') return name;
    return name?.en || name?.ar || 'Unnamed Item';
  }

  private getLocalizedDescription(description: any): string {
    if (typeof description === 'string') return description;
    return description?.en || description?.ar || '';
  }

  private extractProductImages(product: any): string[] {
    return product.productImages?.map((img: any) => img.imageUrl).filter(Boolean) || [];
  }

  private extractIngredients(product: any): string[] {
    return product.ingredients || [];
  }

  private extractNutritionalFacts(product: any): any {
    return product.nutritionalInfo || {
      calories: product.calories || 0,
      protein: product.protein || 0,
      fat: product.fat || 0,
      carbohydrates: product.carbs || 0
    };
  }

  private extractAllergens(product: any): string[] {
    return product.allergens || [];
  }

  private extractDietaryInfo(product: any): string[] {
    const dietary: string[] = [];
    if (product.isVegetarian) dietary.push('vegetarian');
    if (product.isVegan) dietary.push('vegan');
    if (product.isGlutenFree) dietary.push('gluten-free');
    if (product.isHalal) dietary.push('halal');
    return dietary;
  }

  private isSpicyProduct(product: any): boolean {
    return product.isSpicy || product.tags?.includes('spicy') || false;
  }

  private buildAvailabilitySchedule(operationalHours: any): any {
    const schedule: any = {};
    Object.keys(operationalHours).forEach(day => {
      const hours = operationalHours[day];
      if (hours.isOpen) {
        schedule[day] = {
          start: hours.open,
          end: hours.close
        };
      }
    });
    return schedule;
  }

  private async callCareemAPI(method: string, endpoint: string, data?: any, syncId?: string): Promise<any> {
    try {
      // Check circuit breaker and rate limits
      if (!(await this.retryMechanismService.checkCircuitBreaker('careem'))) {
        throw new Error('Careem service temporarily unavailable (circuit breaker open)');
      }

      if (!(await this.retryMechanismService.checkRateLimit('careem'))) {
        throw new Error('Careem rate limit exceeded');
      }

      const config = {
        method,
        url: `${this.careemApiUrl}${endpoint}`,
        headers: {
          'Authorization': `Bearer ${this.careemApiKey}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-Store-Secret': this.careemStoreSecret,
          'X-Platform': 'restaurant-platform-v2',
          'X-API-Version': '2.0',
          ...(syncId && { 'X-Sync-ID': syncId })
        },
        timeout: 30000, // 30 second timeout
        ...(data && { data })
      };

      this.logger.debug(`Careem API call: ${method} ${endpoint}`, { syncId });

      const response = await firstValueFrom(this.httpService.request(config));

      // Record success for circuit breaker
      this.retryMechanismService.recordSuccess('careem');

      // Log integration activity
      if (syncId) {
        await this.logIntegrationActivity(syncId, 'api_call_success', {
          method,
          endpoint,
          status: response.status,
          responseTime: Date.now()
        });
      }

      return response.data;
    } catch (error) {
      // Record failure for circuit breaker
      this.retryMechanismService.recordFailure('careem');

      // Log integration error
      if (syncId) {
        await this.logIntegrationActivity(syncId, 'api_call_failed', {
          method,
          endpoint,
          error: error.message,
          status: error.response?.status,
          retryable: this.retryMechanismService.isRetryableError('careem', error)
        });
      }

      this.logger.error('Careem API call failed:', {
        method,
        endpoint,
        status: error.response?.status,
        message: error.response?.data?.message || error.message,
        syncId
      });

      // Enhanced error information
      if (error.response?.status === 429) {
        throw new Error('Rate limit exceeded - please retry later');
      } else if (error.response?.status >= 500) {
        throw new Error(`Careem server error: ${error.response.status}`);
      } else if (error.code === 'ECONNABORTED') {
        throw new Error('Request timeout - Careem API did not respond in time');
      }

      throw error;
    }
  }

  /**
   * Log integration activity for audit trail
   */
  private async logIntegrationActivity(syncId: string, activityType: string, metadata: any): Promise<void> {
    try {
      await this.prisma.platformIntegrationLog.create({
        data: {
          syncId,
          platformType: 'careem',
          syncType: 'menu_sync',
          entityType: 'api_call',
          status: activityType.includes('success') ? 'completed' : 'failed',
          requestPayload: metadata,
          responsePayload: activityType.includes('success') ? { success: true } : { error: metadata.error },
          duration: metadata.responseTime ? metadata.responseTime - Date.now() : null,
          companyId: '', // Will be set by the calling service
          correlationId: syncId
        }
      });
    } catch (error) {
      this.logger.error('Failed to log integration activity:', error);
    }
  }
}