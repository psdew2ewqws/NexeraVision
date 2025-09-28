// ================================================
// Talabat Menu Management Service
// Platform-Specific Implementation for Talabat
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

export interface TalabatMenuConfig {
  restaurantId: string;
  menuId?: string;
  currency: string;
  taxRate: number;
  deliveryZones: string[];
  operatingHours: {
    [day: string]: { open: string; close: string; available: boolean };
  };
  specialOffers: {
    enabled: boolean;
    types: ('discount' | 'buy_one_get_one' | 'free_delivery')[];
  };
  menuDisplay: {
    showNutrition: boolean;
    showCalories: boolean;
    showAllergens: boolean;
    groupByCategory: boolean;
  };
}

export interface TalabatProduct {
  id: string;
  name: string;
  description: string;
  price: number;
  originalPrice?: number;
  currency: string;
  categoryId: string;
  imageUrl?: string;
  isAvailable: boolean;
  preparationTime: number;
  nutritionalInfo?: {
    calories?: number;
    fat?: number;
    protein?: number;
    carbs?: number;
  };
  allergens?: string[];
  modifiers?: TalabatModifier[];
  tags?: string[];
}

export interface TalabatModifier {
  id: string;
  name: string;
  type: 'single' | 'multiple';
  required: boolean;
  minSelections: number;
  maxSelections: number;
  options: {
    id: string;
    name: string;
    price: number;
    isDefault?: boolean;
  }[];
}

export interface TalabatCategory {
  id: string;
  name: string;
  description?: string;
  displayOrder: number;
  isVisible: boolean;
  imageUrl?: string;
  products: TalabatProduct[];
}

export interface TalabatMenuResponse {
  success: boolean;
  menuId?: string;
  message?: string;
  errors?: string[];
  syncDuration?: number;
}

@Injectable()
export class TalabatMenuService {
  private readonly logger = new Logger(TalabatMenuService.name);
  private readonly talabatApiUrl: string;
  private readonly talabatApiKey: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
    private readonly eventEmitter: EventEmitter2,
    private readonly retryMechanismService: RetryMechanismService
  ) {
    this.talabatApiUrl = this.configService.get<string>('TALABAT_API_URL') || 'https://api.talabat.com';
    this.talabatApiKey = this.configService.get<string>('TALABAT_API_KEY');
  }

  // ================================================
  // MENU CREATION & MANAGEMENT
  // ================================================

  /**
   * Create Talabat-specific menu from platform menu
   */
  async createTalabatMenu(
    platformMenu: PlatformMenu,
    talabatConfig: TalabatMenuConfig
  ): Promise<TalabatMenuResponse> {
    const startTime = Date.now();
    this.logger.log(`Creating Talabat menu for platform menu: ${platformMenu.id}`);

    try {
      // Validate configuration
      this.validateTalabatConfig(talabatConfig);

      // Transform platform menu to Talabat format
      const talabatMenuData = await this.transformToTalabatFormat(platformMenu, talabatConfig);

      // Create or update menu in Talabat
      const response = await this.syncWithTalabatAPI(talabatMenuData, talabatConfig);

      // Update platform menu with Talabat-specific data
      await this.updatePlatformMenuWithTalabatData(platformMenu.id, response, talabatConfig);

      const syncDuration = Date.now() - startTime;
      this.logger.log(`Talabat menu created successfully in ${syncDuration}ms`);

      return {
        success: true,
        menuId: response.menuId,
        message: 'Menu successfully created/updated in Talabat',
        syncDuration
      };
    } catch (error) {
      this.logger.error(`Failed to create Talabat menu: ${error.message}`, error.stack);
      return {
        success: false,
        message: 'Failed to create Talabat menu',
        errors: [error.message]
      };
    }
  }

  /**
   * Transform platform menu to Talabat-specific format
   */
  private async transformToTalabatFormat(
    platformMenu: PlatformMenu,
    config: TalabatMenuConfig
  ): Promise<any> {
    // Get menu items with product details
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
            productImages: true,
            modifierCategories: {
              include: {
                modifierCategory: {
                  include: {
                    modifiers: true
                  }
                }
              }
            }
          }
        }
      },
      orderBy: { displayOrder: 'asc' }
    });

    // Group items by category
    const categoriesMap = new Map<string, any>();

    menuItems.forEach(item => {
      const category = item.product.category;
      const categoryId = category.id;

      if (!categoriesMap.has(categoryId)) {
        categoriesMap.set(categoryId, {
          id: categoryId,
          name: this.getLocalizedName(category.name),
          description: this.getLocalizedDescription(category.description),
          displayOrder: category.displayNumber || 0,
          isVisible: true,
          imageUrl: category.image,
          products: []
        });
      }

      // Transform product to Talabat format
      const talabatProduct = this.transformProductToTalabat(item, config);
      categoriesMap.get(categoryId).products.push(talabatProduct);
    });

    // Convert to array and sort
    const categories = Array.from(categoriesMap.values())
      .sort((a, b) => a.displayOrder - b.displayOrder);

    return {
      restaurant_id: config.restaurantId,
      menu: {
        id: platformMenu.id,
        name: this.getLocalizedName(platformMenu.name),
        description: this.getLocalizedDescription(platformMenu.description),
        currency: config.currency,
        tax_rate: config.taxRate,
        operating_hours: config.operatingHours,
        delivery_zones: config.deliveryZones,
        categories
      },
      settings: {
        auto_accept_orders: false,
        preparation_time: 20,
        max_orders_per_hour: 30,
        ...config.menuDisplay
      }
    };
  }

  /**
   * Transform individual product to Talabat format
   */
  private transformProductToTalabat(menuItem: any, config: TalabatMenuConfig): TalabatProduct {
    const product = menuItem.product;
    const price = menuItem.platformPrice || product.basePrice;

    return {
      id: product.id,
      name: this.getLocalizedName(product.name),
      description: this.getLocalizedDescription(product.description),
      price: Math.round(price * 100) / 100, // Ensure 2 decimal places
      currency: config.currency,
      categoryId: product.categoryId,
      imageUrl: product.productImages?.[0]?.imageUrl,
      isAvailable: menuItem.isAvailable && product.isAvailable,
      preparationTime: product.preparationTime || 15,
      nutritionalInfo: this.extractNutritionalInfo(product),
      allergens: this.extractAllergens(product),
      modifiers: this.transformModifiers(product.modifierCategories),
      tags: [...(product.tags || []), ...(menuItem.tags || [])]
    };
  }

  /**
   * Transform modifiers to Talabat format
   */
  private transformModifiers(modifierCategories: any[]): TalabatModifier[] {
    return modifierCategories.map(mc => ({
      id: mc.modifierCategory.id,
      name: this.getLocalizedName(mc.modifierCategory.name),
      type: mc.maxSelections === 1 ? 'single' : 'multiple',
      required: mc.isRequired,
      minSelections: mc.minSelections || 0,
      maxSelections: mc.maxSelections || 1,
      options: mc.modifierCategory.modifiers.map((mod: any) => ({
        id: mod.id,
        name: this.getLocalizedName(mod.name),
        price: mod.price || 0,
        isDefault: mod.isDefault || false
      }))
    }));
  }

  /**
   * Sync menu data with Talabat API
   */
  private async syncWithTalabatAPI(menuData: any, config: TalabatMenuConfig): Promise<any> {
    try {
      const endpoint = config.menuId ? 
        `/restaurants/${config.restaurantId}/menus/${config.menuId}` :
        `/restaurants/${config.restaurantId}/menus`;
      
      const method = config.menuId ? 'PUT' : 'POST';
      
      const response = await this.callTalabatAPI(method, endpoint, menuData);
      
      return {
        menuId: response.menu_id || config.menuId,
        status: response.status,
        updatedAt: response.updated_at
      };
    } catch (error) {
      this.logger.error('Talabat API sync failed:', error);
      throw new BadRequestException(`Talabat API sync failed: ${error.message}`);
    }
  }

  /**
   * Update platform menu with Talabat-specific data
   */
  private async updatePlatformMenuWithTalabatData(
    platformMenuId: string,
    talabatResponse: any,
    config: TalabatMenuConfig
  ): Promise<void> {
    await this.prisma.platformMenu.update({
      where: { id: platformMenuId },
      data: {
        platformConfig: {
          talabat: {
            menuId: talabatResponse.menuId,
            restaurantId: config.restaurantId,
            lastSyncedAt: new Date(),
            syncStatus: 'completed'
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
   * Update specific items in Talabat menu
   */
  async updateTalabatMenuItems(
    platformMenuId: string,
    itemIds: string[],
    config: TalabatMenuConfig
  ): Promise<TalabatMenuResponse> {
    const startTime = Date.now();
    
    try {
      // Get updated items
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

      // Transform to Talabat format
      const talabatProducts = items.map(item => this.transformProductToTalabat(item, config));

      // Update in Talabat
      await this.callTalabatAPI(
        'PATCH',
        `/restaurants/${config.restaurantId}/menus/${config.menuId}/items`,
        { products: talabatProducts }
      );

      const syncDuration = Date.now() - startTime;
      return {
        success: true,
        message: `Updated ${items.length} items in Talabat`,
        syncDuration
      };
    } catch (error) {
      this.logger.error('Failed to update Talabat menu items:', error);
      return {
        success: false,
        message: 'Failed to update Talabat menu items',
        errors: [error.message]
      };
    }
  }

  /**
   * Get menu templates for Talabat
   */
  async getTalabatMenuTemplates(): Promise<any[]> {
    return [
      {
        id: 'talabat-fast-food',
        name: 'Fast Food Restaurant',
        description: 'Optimized for fast food delivery with quick preparation times',
        config: {
          currency: 'JOD',
          taxRate: 0.16,
          deliveryZones: ['amman', 'zarqa'],
          operatingHours: {
            monday: { open: '10:00', close: '23:00', available: true },
            tuesday: { open: '10:00', close: '23:00', available: true },
            wednesday: { open: '10:00', close: '23:00', available: true },
            thursday: { open: '10:00', close: '23:00', available: true },
            friday: { open: '10:00', close: '24:00', available: true },
            saturday: { open: '10:00', close: '24:00', available: true },
            sunday: { open: '12:00', close: '23:00', available: true }
          },
          specialOffers: {
            enabled: true,
            types: ['discount', 'free_delivery']
          },
          menuDisplay: {
            showNutrition: false,
            showCalories: true,
            showAllergens: true,
            groupByCategory: true
          }
        }
      },
      {
        id: 'talabat-fine-dining',
        name: 'Fine Dining Restaurant',
        description: 'Perfect for upscale restaurants with detailed menu presentation',
        config: {
          currency: 'JOD',
          taxRate: 0.16,
          deliveryZones: ['amman'],
          operatingHours: {
            monday: { open: '17:00', close: '23:00', available: true },
            tuesday: { open: '17:00', close: '23:00', available: true },
            wednesday: { open: '17:00', close: '23:00', available: true },
            thursday: { open: '17:00', close: '23:00', available: true },
            friday: { open: '17:00', close: '24:00', available: true },
            saturday: { open: '17:00', close: '24:00', available: true },
            sunday: { open: '17:00', close: '22:00', available: true }
          },
          specialOffers: {
            enabled: false,
            types: []
          },
          menuDisplay: {
            showNutrition: true,
            showCalories: true,
            showAllergens: true,
            groupByCategory: true
          }
        }
      }
    ];
  }

  // ================================================
  // HELPER METHODS
  // ================================================

  private validateTalabatConfig(config: TalabatMenuConfig): void {
    if (!config.restaurantId) {
      throw new BadRequestException('Talabat restaurant ID is required');
    }
    if (!config.currency) {
      throw new BadRequestException('Currency is required for Talabat menu');
    }
    if (config.taxRate < 0 || config.taxRate > 1) {
      throw new BadRequestException('Tax rate must be between 0 and 1');
    }
  }

  private getLocalizedName(name: any): string {
    if (typeof name === 'string') return name;
    return name?.en || name?.ar || 'Unnamed Item';
  }

  private getLocalizedDescription(description: any): string {
    if (typeof description === 'string') return description;
    return description?.en || description?.ar || '';
  }

  private extractNutritionalInfo(product: any): any {
    // Extract from product metadata or nutritional data
    return product.nutritionalInfo || {
      calories: product.calories || null,
      fat: product.fat || null,
      protein: product.protein || null,
      carbs: product.carbs || null
    };
  }

  private extractAllergens(product: any): string[] {
    // Extract allergen information from product
    return product.allergens || product.tags?.filter((tag: string) => 
      ['nuts', 'dairy', 'gluten', 'eggs', 'soy', 'fish', 'shellfish'].includes(tag.toLowerCase())
    ) || [];
  }

  private async callTalabatAPI(method: string, endpoint: string, data?: any, syncId?: string): Promise<any> {
    try {
      // Check circuit breaker and rate limits
      if (!(await this.retryMechanismService.checkCircuitBreaker('talabat'))) {
        throw new Error('Talabat service temporarily unavailable (circuit breaker open)');
      }

      if (!(await this.retryMechanismService.checkRateLimit('talabat'))) {
        throw new Error('Talabat rate limit exceeded');
      }

      const config = {
        method,
        url: `${this.talabatApiUrl}${endpoint}`,
        headers: {
          'Authorization': `Bearer ${this.talabatApiKey}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-Platform': 'restaurant-platform-v2',
          'X-API-Version': '1.0',
          ...(syncId && { 'X-Sync-ID': syncId })
        },
        timeout: 25000, // 25 second timeout
        ...(data && { data })
      };

      this.logger.debug(`Talabat API call: ${method} ${endpoint}`, { syncId });

      const response = await firstValueFrom(this.httpService.request(config));

      // Record success for circuit breaker
      this.retryMechanismService.recordSuccess('talabat');

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
      this.retryMechanismService.recordFailure('talabat');

      // Log integration error
      if (syncId) {
        await this.logIntegrationActivity(syncId, 'api_call_failed', {
          method,
          endpoint,
          error: error.message,
          status: error.response?.status,
          retryable: this.retryMechanismService.isRetryableError('talabat', error)
        });
      }

      this.logger.error('Talabat API call failed:', {
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
        throw new Error(`Talabat server error: ${error.response.status}`);
      } else if (error.code === 'ECONNABORTED') {
        throw new Error('Request timeout - Talabat API did not respond in time');
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
          platformType: 'talabat',
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