// ================================================
// Platform Adapter Service
// Restaurant Platform v2 - Platform Integration Layer
// ================================================

import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DeliveryPlatform, PlatformMenu, PlatformMenuItem } from '../types/platform-menu.types';

// ================================================
// PLATFORM ADAPTER INTERFACE
// ================================================

export interface IPlatformAdapter {
  platform: DeliveryPlatform;

  // Menu Operations
  syncMenu(menu: PlatformMenu): Promise<PlatformSyncResult>;
  validateMenuStructure(menu: PlatformMenu): Promise<ValidationResult>;
  getMenuStatus(menuId: string): Promise<PlatformMenuStatus>;

  // Item Operations
  syncItems(items: PlatformMenuItem[]): Promise<ItemSyncResult[]>;
  updateItemAvailability(itemId: string, available: boolean): Promise<boolean>;
  updateItemPricing(itemId: string, price: number): Promise<boolean>;

  // Platform-Specific Features
  getSupportedFeatures(): PlatformFeatures;
  getApiLimits(): ApiLimits;
  healthCheck(): Promise<HealthStatus>;
}

export interface PlatformSyncResult {
  success: boolean;
  platformMenuId?: string;
  itemsSynced: number;
  errors: string[];
  warnings: string[];
  syncDuration: number;
  apiCallsUsed: number;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

export interface ValidationWarning {
  field: string;
  message: string;
  suggestion?: string;
}

export interface PlatformMenuStatus {
  isActive: boolean;
  lastUpdated: Date;
  itemCount: number;
  platformSpecificData?: Record<string, any>;
}

export interface ItemSyncResult {
  itemId: string;
  platformItemId?: string;
  success: boolean;
  error?: string;
}

export interface PlatformFeatures {
  supportsCategories: boolean;
  supportsModifiers: boolean;
  supportsImages: boolean;
  supportsScheduling: boolean;
  supportsPromotions: boolean;
  supportsRealTimeUpdates: boolean;
  maxItemsPerMenu: number;
  maxCategoriesPerMenu: number;
}

export interface ApiLimits {
  requestsPerMinute: number;
  requestsPerHour: number;
  maxBatchSize: number;
  timeoutMs: number;
}

export interface HealthStatus {
  isHealthy: boolean;
  responseTime: number;
  lastChecked: Date;
  errors?: string[];
}

// ================================================
// PLATFORM ADAPTER SERVICE
// ================================================

@Injectable()
export class PlatformAdapterService {
  private readonly logger = new Logger(PlatformAdapterService.name);
  private readonly adapters: Map<DeliveryPlatform, IPlatformAdapter> = new Map();

  constructor(private readonly configService: ConfigService) {
    this.initializeAdapters();
  }

  /**
   * Initialize all platform adapters
   */
  private initializeAdapters(): void {
    // Register adapters for each platform
    this.registerAdapter(new CareemAdapter(this.configService));
    this.registerAdapter(new TalabatAdapter(this.configService));
    this.registerAdapter(new WebsiteAdapter(this.configService));
    this.registerAdapter(new CallCenterAdapter(this.configService));
    this.registerAdapter(new InStoreDisplayAdapter(this.configService));
    this.registerAdapter(new KioskAdapter(this.configService));
    this.registerAdapter(new MobileAppAdapter(this.configService));
    this.registerAdapter(new ChatbotAdapter(this.configService));
    this.registerAdapter(new OnlineOrderingAdapter(this.configService));

    this.logger.log(`Initialized ${this.adapters.size} platform adapters`);
  }

  /**
   * Register a platform adapter
   */
  private registerAdapter(adapter: IPlatformAdapter): void {
    this.adapters.set(adapter.platform, adapter);
    this.logger.debug(`Registered adapter for ${adapter.platform}`);
  }

  /**
   * Get adapter for specific platform
   */
  async getAdapter(platform: DeliveryPlatform): Promise<IPlatformAdapter> {
    const adapter = this.adapters.get(platform);
    if (!adapter) {
      throw new NotFoundException(`No adapter found for platform: ${platform}`);
    }
    return adapter;
  }

  /**
   * Get all available adapters
   */
  getAvailableAdapters(): DeliveryPlatform[] {
    return Array.from(this.adapters.keys());
  }

  /**
   * Health check for all adapters
   */
  async healthCheckAll(): Promise<Record<DeliveryPlatform, HealthStatus>> {
    const results: Record<DeliveryPlatform, HealthStatus> = {} as any;

    const healthChecks = Array.from(this.adapters.entries()).map(async ([platform, adapter]) => {
      try {
        const health = await adapter.healthCheck();
        results[platform] = health;
      } catch (error) {
        results[platform] = {
          isHealthy: false,
          responseTime: 0,
          lastChecked: new Date(),
          errors: [error.message]
        };
      }
    });

    await Promise.all(healthChecks);
    return results;
  }
}

// ================================================
// CAREEM ADAPTER IMPLEMENTATION
// ================================================

export class CareemAdapter implements IPlatformAdapter {
  platform = DeliveryPlatform.CAREEM;
  private readonly logger = new Logger(CareemAdapter.name);
  private readonly apiUrl: string;
  private readonly apiKey: string;

  constructor(private readonly configService: ConfigService) {
    this.apiUrl = this.configService.get<string>('CAREEM_API_URL') || 'https://api.careem.com';
    this.apiKey = this.configService.get<string>('CAREEM_API_KEY');
  }

  async syncMenu(menu: PlatformMenu): Promise<PlatformSyncResult> {
    const startTime = Date.now();
    let apiCallsUsed = 0;
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Validate menu first
      const validation = await this.validateMenuStructure(menu);
      if (!validation.isValid) {
        return {
          success: false,
          itemsSynced: 0,
          errors: validation.errors.map(e => e.message),
          warnings: validation.warnings.map(w => w.message),
          syncDuration: Date.now() - startTime,
          apiCallsUsed
        };
      }

      // Sync menu structure
      apiCallsUsed++;
      const menuResponse = await this.syncMenuStructure(menu);

      // Sync items in batches
      const batchSize = this.getApiLimits().maxBatchSize;
      let itemsSynced = 0;

      if (menu.items && menu.items.length > 0) {
        for (let i = 0; i < menu.items.length; i += batchSize) {
          const batch = menu.items.slice(i, i + batchSize);
          apiCallsUsed++;

          const itemResults = await this.syncItems(batch);
          itemsSynced += itemResults.filter(r => r.success).length;

          // Collect errors from failed items
          itemResults.filter(r => !r.success).forEach(r => {
            if (r.error) errors.push(r.error);
          });
        }
      }

      return {
        success: errors.length === 0,
        platformMenuId: menuResponse.platformMenuId,
        itemsSynced,
        errors,
        warnings,
        syncDuration: Date.now() - startTime,
        apiCallsUsed
      };

    } catch (error) {
      this.logger.error(`Careem sync failed for menu ${menu.id}:`, error);
      return {
        success: false,
        itemsSynced: 0,
        errors: [error.message],
        warnings,
        syncDuration: Date.now() - startTime,
        apiCallsUsed
      };
    }
  }

  async validateMenuStructure(menu: PlatformMenu): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Validate menu name
    if (!menu.name?.en) {
      errors.push({
        field: 'name.en',
        message: 'English menu name is required',
        code: 'REQUIRED_FIELD'
      });
    }

    // Validate items count
    const features = this.getSupportedFeatures();
    if (menu.items && menu.items.length > features.maxItemsPerMenu) {
      errors.push({
        field: 'items',
        message: `Menu exceeds maximum items limit (${features.maxItemsPerMenu})`,
        code: 'LIMIT_EXCEEDED'
      });
    }

    // Validate item structure
    if (menu.items) {
      menu.items.forEach((item, index) => {
        if (!item.product) {
          errors.push({
            field: `items[${index}].product`,
            message: 'Product reference is required',
            code: 'REQUIRED_FIELD'
          });
        }

        if (!item.displayName?.en && !item.product?.name?.en) {
          errors.push({
            field: `items[${index}].displayName`,
            message: 'Item must have English display name',
            code: 'REQUIRED_FIELD'
          });
        }

        // Price validation
        const price = item.platformPrice || item.product?.basePrice;
        if (!price || price <= 0) {
          errors.push({
            field: `items[${index}].price`,
            message: 'Valid price is required',
            code: 'INVALID_PRICE'
          });
        }

        // Check for large images
        if (item.displayImage && item.displayImage.length > 500) {
          warnings.push({
            field: `items[${index}].displayImage`,
            message: 'Large image URLs may cause sync delays',
            suggestion: 'Consider optimizing image URLs'
          });
        }
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  async getMenuStatus(menuId: string): Promise<PlatformMenuStatus> {
    // Implementation would call Careem API to get menu status
    return {
      isActive: true,
      lastUpdated: new Date(),
      itemCount: 0,
      platformSpecificData: {}
    };
  }

  async syncItems(items: PlatformMenuItem[]): Promise<ItemSyncResult[]> {
    // Implementation for syncing items to Careem
    return items.map(item => ({
      itemId: item.id,
      platformItemId: `careem_${item.id}`,
      success: true
    }));
  }

  async updateItemAvailability(itemId: string, available: boolean): Promise<boolean> {
    // Implementation for updating item availability
    return true;
  }

  async updateItemPricing(itemId: string, price: number): Promise<boolean> {
    // Implementation for updating item price
    return true;
  }

  getSupportedFeatures(): PlatformFeatures {
    return {
      supportsCategories: true,
      supportsModifiers: true,
      supportsImages: true,
      supportsScheduling: true,
      supportsPromotions: false,
      supportsRealTimeUpdates: true,
      maxItemsPerMenu: 500,
      maxCategoriesPerMenu: 50
    };
  }

  getApiLimits(): ApiLimits {
    return {
      requestsPerMinute: 60,
      requestsPerHour: 1000,
      maxBatchSize: 50,
      timeoutMs: 30000
    };
  }

  async healthCheck(): Promise<HealthStatus> {
    const startTime = Date.now();
    try {
      // Make a simple API call to check health
      // Implementation would ping Careem API
      return {
        isHealthy: true,
        responseTime: Date.now() - startTime,
        lastChecked: new Date()
      };
    } catch (error) {
      return {
        isHealthy: false,
        responseTime: Date.now() - startTime,
        lastChecked: new Date(),
        errors: [error.message]
      };
    }
  }

  private async syncMenuStructure(menu: PlatformMenu): Promise<{ platformMenuId: string }> {
    // Implementation for syncing menu structure to Careem
    return { platformMenuId: `careem_menu_${menu.id}` };
  }
}

// ================================================
// WEBSITE ADAPTER (INTERNAL PLATFORM)
// ================================================

export class WebsiteAdapter implements IPlatformAdapter {
  platform = DeliveryPlatform.WEBSITE;
  private readonly logger = new Logger(WebsiteAdapter.name);

  constructor(private readonly configService: ConfigService) {}

  async syncMenu(menu: PlatformMenu): Promise<PlatformSyncResult> {
    // For internal platforms like website, sync is immediate
    return {
      success: true,
      platformMenuId: menu.id,
      itemsSynced: menu.items?.length || 0,
      errors: [],
      warnings: [],
      syncDuration: 0, // Immediate for internal
      apiCallsUsed: 0
    };
  }

  async validateMenuStructure(menu: PlatformMenu): Promise<ValidationResult> {
    // Website has minimal validation requirements
    return {
      isValid: true,
      errors: [],
      warnings: []
    };
  }

  async getMenuStatus(menuId: string): Promise<PlatformMenuStatus> {
    return {
      isActive: true,
      lastUpdated: new Date(),
      itemCount: 0
    };
  }

  async syncItems(items: PlatformMenuItem[]): Promise<ItemSyncResult[]> {
    return items.map(item => ({
      itemId: item.id,
      success: true
    }));
  }

  async updateItemAvailability(itemId: string, available: boolean): Promise<boolean> {
    return true;
  }

  async updateItemPricing(itemId: string, price: number): Promise<boolean> {
    return true;
  }

  getSupportedFeatures(): PlatformFeatures {
    return {
      supportsCategories: true,
      supportsModifiers: true,
      supportsImages: true,
      supportsScheduling: true,
      supportsPromotions: true,
      supportsRealTimeUpdates: true,
      maxItemsPerMenu: 1000,
      maxCategoriesPerMenu: 100
    };
  }

  getApiLimits(): ApiLimits {
    return {
      requestsPerMinute: 1000,
      requestsPerHour: 10000,
      maxBatchSize: 100,
      timeoutMs: 5000
    };
  }

  async healthCheck(): Promise<HealthStatus> {
    return {
      isHealthy: true,
      responseTime: 0,
      lastChecked: new Date()
    };
  }
}

// ================================================
// TALABAT ADAPTER IMPLEMENTATION
// ================================================

export class TalabatAdapter implements IPlatformAdapter {
  platform = DeliveryPlatform.TALABAT;
  private readonly logger = new Logger(TalabatAdapter.name);
  private readonly apiUrl: string;
  private readonly apiKey: string;

  constructor(private readonly configService: ConfigService) {
    this.apiUrl = this.configService.get<string>('TALABAT_API_URL') || 'https://api.talabat.com';
    this.apiKey = this.configService.get<string>('TALABAT_API_KEY');
  }

  async syncMenu(menu: PlatformMenu): Promise<PlatformSyncResult> {
    const startTime = Date.now();
    let apiCallsUsed = 0;
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Validate menu structure
      const validation = await this.validateMenuStructure(menu);
      if (!validation.isValid) {
        return {
          success: false,
          itemsSynced: 0,
          errors: validation.errors.map(e => e.message),
          warnings: validation.warnings.map(w => w.message),
          syncDuration: Date.now() - startTime,
          apiCallsUsed
        };
      }

      // Sync menu structure with Talabat API
      apiCallsUsed++;
      const menuResponse = await this.syncMenuToTalabat(menu);

      // Sync items in optimized batches (Talabat supports larger batches)
      const batchSize = this.getApiLimits().maxBatchSize;
      let itemsSynced = 0;

      if (menu.items && menu.items.length > 0) {
        // Process items in parallel batches for speed
        const batches = [];
        for (let i = 0; i < menu.items.length; i += batchSize) {
          batches.push(menu.items.slice(i, i + batchSize));
        }

        // Process 3 batches in parallel for maximum speed
        const parallelBatches = [];
        for (let i = 0; i < batches.length; i += 3) {
          const batchGroup = batches.slice(i, i + 3);
          parallelBatches.push(
            Promise.all(batchGroup.map(batch => this.syncItemsBatch(batch)))
          );
        }

        const results = await Promise.all(parallelBatches);
        apiCallsUsed += results.flat().length;

        // Aggregate results
        results.flat().forEach(batchResults => {
          batchResults.forEach(result => {
            if (result.success) {
              itemsSynced++;
            } else {
              errors.push(result.error || 'Unknown sync error');
            }
          });
        });
      }

      return {
        success: errors.length === 0,
        platformMenuId: menuResponse.platformMenuId,
        itemsSynced,
        errors,
        warnings,
        syncDuration: Date.now() - startTime,
        apiCallsUsed
      };

    } catch (error) {
      this.logger.error(`Talabat sync failed for menu ${menu.id}:`, error);
      return {
        success: false,
        itemsSynced: 0,
        errors: [error.message],
        warnings,
        syncDuration: Date.now() - startTime,
        apiCallsUsed
      };
    }
  }

  async validateMenuStructure(menu: PlatformMenu): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Validate required fields for Talabat
    if (!menu.name?.en && !menu.name?.ar) {
      errors.push({
        field: 'name',
        message: 'Menu name in English or Arabic is required',
        code: 'REQUIRED_FIELD'
      });
    }

    // Validate items count against Talabat limits
    const features = this.getSupportedFeatures();
    if (menu.items && menu.items.length > features.maxItemsPerMenu) {
      errors.push({
        field: 'items',
        message: `Menu exceeds Talabat maximum items limit (${features.maxItemsPerMenu})`,
        code: 'LIMIT_EXCEEDED'
      });
    }

    // Validate each item
    if (menu.items) {
      menu.items.forEach((item, index) => {
        // Check for required product
        if (!item.product) {
          errors.push({
            field: `items[${index}].product`,
            message: 'Product reference is required',
            code: 'REQUIRED_FIELD'
          });
        }

        // Validate pricing
        const price = item.platformPrice || item.product?.basePrice;
        if (!price || price <= 0) {
          errors.push({
            field: `items[${index}].price`,
            message: 'Valid price is required for Talabat',
            code: 'INVALID_PRICE'
          });
        }

        // Arabic name requirement for Talabat
        if (!item.displayName?.ar && !item.product?.name?.ar) {
          warnings.push({
            field: `items[${index}].displayName.ar`,
            message: 'Arabic name recommended for better Talabat visibility',
            suggestion: 'Add Arabic translation for menu item'
          });
        }
      });
    }

    return { isValid: errors.length === 0, errors, warnings };
  }

  async getMenuStatus(menuId: string): Promise<PlatformMenuStatus> {
    // Mock implementation - would call Talabat API
    return {
      isActive: true,
      lastUpdated: new Date(),
      itemCount: 0,
      platformSpecificData: { talabatMenuId: `tal_${menuId}` }
    };
  }

  async syncItems(items: PlatformMenuItem[]): Promise<ItemSyncResult[]> {
    return this.syncItemsBatch(items);
  }

  async updateItemAvailability(itemId: string, available: boolean): Promise<boolean> {
    // Implementation for Talabat availability update
    return true;
  }

  async updateItemPricing(itemId: string, price: number): Promise<boolean> {
    // Implementation for Talabat price update
    return true;
  }

  getSupportedFeatures(): PlatformFeatures {
    return {
      supportsCategories: true,
      supportsModifiers: true,
      supportsImages: true,
      supportsScheduling: true,
      supportsPromotions: true,
      supportsRealTimeUpdates: true,
      maxItemsPerMenu: 750, // Talabat has higher limits
      maxCategoriesPerMenu: 75
    };
  }

  getApiLimits(): ApiLimits {
    return {
      requestsPerMinute: 100, // Talabat has good API limits
      requestsPerHour: 2000,
      maxBatchSize: 75, // Larger batch size for speed
      timeoutMs: 25000
    };
  }

  async healthCheck(): Promise<HealthStatus> {
    const startTime = Date.now();
    try {
      // Mock Talabat API health check
      return {
        isHealthy: true,
        responseTime: Date.now() - startTime,
        lastChecked: new Date()
      };
    } catch (error) {
      return {
        isHealthy: false,
        responseTime: Date.now() - startTime,
        lastChecked: new Date(),
        errors: [error.message]
      };
    }
  }

  private async syncMenuToTalabat(menu: PlatformMenu): Promise<{ platformMenuId: string }> {
    // Implementation for syncing menu structure to Talabat
    return { platformMenuId: `talabat_menu_${menu.id}` };
  }

  private async syncItemsBatch(items: PlatformMenuItem[]): Promise<ItemSyncResult[]> {
    // Simulate fast batch sync to Talabat
    return items.map(item => ({
      itemId: item.id,
      platformItemId: `tal_${item.id}`,
      success: true
    }));
  }
}

// ================================================
// CALL CENTER ADAPTER IMPLEMENTATION
// ================================================

export class CallCenterAdapter implements IPlatformAdapter {
  platform = DeliveryPlatform.CALL_CENTER;
  private readonly logger = new Logger(CallCenterAdapter.name);

  constructor(private readonly configService: ConfigService) {}

  async syncMenu(menu: PlatformMenu): Promise<PlatformSyncResult> {
    // Call center is internal - immediate sync
    return {
      success: true,
      platformMenuId: `cc_${menu.id}`,
      itemsSynced: menu.items?.length || 0,
      errors: [],
      warnings: [],
      syncDuration: 1, // Near-instant for internal
      apiCallsUsed: 0
    };
  }

  async validateMenuStructure(menu: PlatformMenu): Promise<ValidationResult> {
    // Call center has minimal validation - just needs basic structure
    return { isValid: true, errors: [], warnings: [] };
  }

  async getMenuStatus(menuId: string): Promise<PlatformMenuStatus> {
    return {
      isActive: true,
      lastUpdated: new Date(),
      itemCount: 0
    };
  }

  async syncItems(items: PlatformMenuItem[]): Promise<ItemSyncResult[]> {
    return items.map(item => ({ itemId: item.id, success: true }));
  }

  async updateItemAvailability(itemId: string, available: boolean): Promise<boolean> {
    return true;
  }

  async updateItemPricing(itemId: string, price: number): Promise<boolean> {
    return true;
  }

  getSupportedFeatures(): PlatformFeatures {
    return {
      supportsCategories: true,
      supportsModifiers: true,
      supportsImages: false, // Call center doesn't need images
      supportsScheduling: false,
      supportsPromotions: true,
      supportsRealTimeUpdates: true,
      maxItemsPerMenu: 2000, // Internal system - higher limits
      maxCategoriesPerMenu: 200
    };
  }

  getApiLimits(): ApiLimits {
    return {
      requestsPerMinute: 10000, // Internal - no limits
      requestsPerHour: 100000,
      maxBatchSize: 500,
      timeoutMs: 1000
    };
  }

  async healthCheck(): Promise<HealthStatus> {
    return {
      isHealthy: true,
      responseTime: 0,
      lastChecked: new Date()
    };
  }
}

export class InStoreDisplayAdapter implements IPlatformAdapter {
  platform = DeliveryPlatform.IN_STORE_DISPLAY;
  private readonly logger = new Logger(InStoreDisplayAdapter.name);

  constructor(private readonly configService: ConfigService) {}

  async syncMenu(menu: PlatformMenu): Promise<PlatformSyncResult> {
    // In-store display is instant - just updates internal cache
    return {
      success: true,
      platformMenuId: `display_${menu.id}`,
      itemsSynced: menu.items?.length || 0,
      errors: [],
      warnings: [],
      syncDuration: 0,
      apiCallsUsed: 0
    };
  }

  async validateMenuStructure(menu: PlatformMenu): Promise<ValidationResult> {
    const warnings: ValidationWarning[] = [];

    // Check for display-friendly content
    if (menu.items) {
      menu.items.forEach((item, index) => {
        if (!item.displayImage && !item.product?.images?.length) {
          warnings.push({
            field: `items[${index}].displayImage`,
            message: 'Images recommended for in-store displays',
            suggestion: 'Add high-quality product images for better customer experience'
          });
        }
      });
    }

    return { isValid: true, errors: [], warnings };
  }

  async getMenuStatus(menuId: string): Promise<PlatformMenuStatus> {
    return {
      isActive: true,
      lastUpdated: new Date(),
      itemCount: 0
    };
  }

  async syncItems(items: PlatformMenuItem[]): Promise<ItemSyncResult[]> {
    return items.map(item => ({ itemId: item.id, success: true }));
  }

  async updateItemAvailability(itemId: string, available: boolean): Promise<boolean> {
    return true;
  }

  async updateItemPricing(itemId: string, price: number): Promise<boolean> {
    return true;
  }

  getSupportedFeatures(): PlatformFeatures {
    return {
      supportsCategories: true,
      supportsModifiers: false,
      supportsImages: true,
      supportsScheduling: true,
      supportsPromotions: true,
      supportsRealTimeUpdates: true,
      maxItemsPerMenu: 100, // Limited for display readability
      maxCategoriesPerMenu: 15
    };
  }

  getApiLimits(): ApiLimits {
    return {
      requestsPerMinute: 10000,
      requestsPerHour: 100000,
      maxBatchSize: 100,
      timeoutMs: 500
    };
  }

  async healthCheck(): Promise<HealthStatus> {
    return {
      isHealthy: true,
      responseTime: 0,
      lastChecked: new Date()
    };
  }
}

export class KioskAdapter implements IPlatformAdapter {
  platform = DeliveryPlatform.KIOSK;
  private readonly logger = new Logger(KioskAdapter.name);

  constructor(private readonly configService: ConfigService) {}

  async syncMenu(menu: PlatformMenu): Promise<PlatformSyncResult> {
    // Kiosk sync is near-instant for internal systems
    return {
      success: true,
      platformMenuId: `kiosk_${menu.id}`,
      itemsSynced: menu.items?.length || 0,
      errors: [],
      warnings: [],
      syncDuration: 1,
      apiCallsUsed: 0
    };
  }

  async validateMenuStructure(menu: PlatformMenu): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Kiosk-specific validations
    if (menu.items) {
      menu.items.forEach((item, index) => {
        // Kiosks need clear pricing
        const price = item.platformPrice || item.product?.basePrice;
        if (!price || price <= 0) {
          errors.push({
            field: `items[${index}].price`,
            message: 'Price is required for kiosk display',
            code: 'REQUIRED_FIELD'
          });
        }

        // Images recommended for kiosks
        if (!item.displayImage) {
          warnings.push({
            field: `items[${index}].image`,
            message: 'Images enhance kiosk user experience',
            suggestion: 'Add product images for better visual appeal'
          });
        }
      });
    }

    return { isValid: errors.length === 0, errors, warnings };
  }

  async getMenuStatus(menuId: string): Promise<PlatformMenuStatus> {
    return {
      isActive: true,
      lastUpdated: new Date(),
      itemCount: 0
    };
  }

  async syncItems(items: PlatformMenuItem[]): Promise<ItemSyncResult[]> {
    return items.map(item => ({ itemId: item.id, success: true }));
  }

  async updateItemAvailability(itemId: string, available: boolean): Promise<boolean> {
    return true;
  }

  async updateItemPricing(itemId: string, price: number): Promise<boolean> {
    return true;
  }

  getSupportedFeatures(): PlatformFeatures {
    return {
      supportsCategories: true,
      supportsModifiers: true,
      supportsImages: true,
      supportsScheduling: false,
      supportsPromotions: true,
      supportsRealTimeUpdates: true,
      maxItemsPerMenu: 500,
      maxCategoriesPerMenu: 50
    };
  }

  getApiLimits(): ApiLimits {
    return {
      requestsPerMinute: 10000,
      requestsPerHour: 100000,
      maxBatchSize: 500,
      timeoutMs: 1000
    };
  }

  async healthCheck(): Promise<HealthStatus> {
    return {
      isHealthy: true,
      responseTime: 0,
      lastChecked: new Date()
    };
  }
}

export class MobileAppAdapter implements IPlatformAdapter {
  platform = DeliveryPlatform.MOBILE_APP;
  private readonly logger = new Logger(MobileAppAdapter.name);

  constructor(private readonly configService: ConfigService) {}

  async syncMenu(menu: PlatformMenu): Promise<PlatformSyncResult> {
    // Mobile app sync is fast for internal platform
    return {
      success: true,
      platformMenuId: `mobile_${menu.id}`,
      itemsSynced: menu.items?.length || 0,
      errors: [],
      warnings: [],
      syncDuration: 2,
      apiCallsUsed: 1
    };
  }

  async validateMenuStructure(menu: PlatformMenu): Promise<ValidationResult> {
    const warnings: ValidationWarning[] = [];

    // Mobile-specific recommendations
    if (menu.items) {
      menu.items.forEach((item, index) => {
        if (!item.displayImage) {
          warnings.push({
            field: `items[${index}].image`,
            message: 'Images crucial for mobile app engagement',
            suggestion: 'Add high-quality mobile-optimized images'
          });
        }

        if (!item.displayDescription?.en && !item.product?.description?.en) {
          warnings.push({
            field: `items[${index}].description`,
            message: 'Descriptions help mobile users make decisions',
            suggestion: 'Add brief, appealing descriptions'
          });
        }
      });
    }

    return { isValid: true, errors: [], warnings };
  }

  async getMenuStatus(menuId: string): Promise<PlatformMenuStatus> {
    return {
      isActive: true,
      lastUpdated: new Date(),
      itemCount: 0
    };
  }

  async syncItems(items: PlatformMenuItem[]): Promise<ItemSyncResult[]> {
    return items.map(item => ({ itemId: item.id, success: true }));
  }

  async updateItemAvailability(itemId: string, available: boolean): Promise<boolean> {
    return true;
  }

  async updateItemPricing(itemId: string, price: number): Promise<boolean> {
    return true;
  }

  getSupportedFeatures(): PlatformFeatures {
    return {
      supportsCategories: true,
      supportsModifiers: true,
      supportsImages: true,
      supportsScheduling: true,
      supportsPromotions: true,
      supportsRealTimeUpdates: true,
      maxItemsPerMenu: 1000,
      maxCategoriesPerMenu: 100
    };
  }

  getApiLimits(): ApiLimits {
    return {
      requestsPerMinute: 5000,
      requestsPerHour: 50000,
      maxBatchSize: 200,
      timeoutMs: 3000
    };
  }

  async healthCheck(): Promise<HealthStatus> {
    return {
      isHealthy: true,
      responseTime: 1,
      lastChecked: new Date()
    };
  }
}

export class ChatbotAdapter implements IPlatformAdapter {
  platform = DeliveryPlatform.CHATBOT;
  private readonly logger = new Logger(ChatbotAdapter.name);

  constructor(private readonly configService: ConfigService) {}

  async syncMenu(menu: PlatformMenu): Promise<PlatformSyncResult> {
    // Chatbot sync optimized for text-based interface
    return {
      success: true,
      platformMenuId: `chatbot_${menu.id}`,
      itemsSynced: menu.items?.length || 0,
      errors: [],
      warnings: [],
      syncDuration: 1,
      apiCallsUsed: 0
    };
  }

  async validateMenuStructure(menu: PlatformMenu): Promise<ValidationResult> {
    const warnings: ValidationWarning[] = [];

    // Chatbot-specific validations
    if (menu.items) {
      menu.items.forEach((item, index) => {
        if (!item.displayName?.en && !item.product?.name?.en) {
          warnings.push({
            field: `items[${index}].name`,
            message: 'Clear English names essential for chatbot interaction',
            suggestion: 'Use simple, clear product names'
          });
        }

        // Check name length for chatbot display
        const displayName = item.displayName?.en || item.product?.name?.en;
        if (displayName && displayName.length > 50) {
          warnings.push({
            field: `items[${index}].name`,
            message: 'Long names may be truncated in chatbot interface',
            suggestion: 'Keep product names under 50 characters'
          });
        }
      });
    }

    return { isValid: true, errors: [], warnings };
  }

  async getMenuStatus(menuId: string): Promise<PlatformMenuStatus> {
    return {
      isActive: true,
      lastUpdated: new Date(),
      itemCount: 0
    };
  }

  async syncItems(items: PlatformMenuItem[]): Promise<ItemSyncResult[]> {
    return items.map(item => ({ itemId: item.id, success: true }));
  }

  async updateItemAvailability(itemId: string, available: boolean): Promise<boolean> {
    return true;
  }

  async updateItemPricing(itemId: string, price: number): Promise<boolean> {
    return true;
  }

  getSupportedFeatures(): PlatformFeatures {
    return {
      supportsCategories: true,
      supportsModifiers: false, // Simplified for text interface
      supportsImages: false,
      supportsScheduling: false,
      supportsPromotions: true,
      supportsRealTimeUpdates: true,
      maxItemsPerMenu: 200, // Limited for chatbot usability
      maxCategoriesPerMenu: 20
    };
  }

  getApiLimits(): ApiLimits {
    return {
      requestsPerMinute: 10000,
      requestsPerHour: 100000,
      maxBatchSize: 200,
      timeoutMs: 500
    };
  }

  async healthCheck(): Promise<HealthStatus> {
    return {
      isHealthy: true,
      responseTime: 0,
      lastChecked: new Date()
    };
  }
}

export class OnlineOrderingAdapter implements IPlatformAdapter {
  platform = DeliveryPlatform.ONLINE_ORDERING;
  private readonly logger = new Logger(OnlineOrderingAdapter.name);

  constructor(private readonly configService: ConfigService) {}

  async syncMenu(menu: PlatformMenu): Promise<PlatformSyncResult> {
    // Online ordering sync is fast for internal platform
    return {
      success: true,
      platformMenuId: `online_${menu.id}`,
      itemsSynced: menu.items?.length || 0,
      errors: [],
      warnings: [],
      syncDuration: 1,
      apiCallsUsed: 1
    };
  }

  async validateMenuStructure(menu: PlatformMenu): Promise<ValidationResult> {
    const warnings: ValidationWarning[] = [];

    // Online ordering recommendations
    if (menu.items) {
      menu.items.forEach((item, index) => {
        if (!item.displayImage) {
          warnings.push({
            field: `items[${index}].image`,
            message: 'Images increase online ordering conversion',
            suggestion: 'Add appetizing product photos'
          });
        }

        if (!item.displayDescription) {
          warnings.push({
            field: `items[${index}].description`,
            message: 'Descriptions help customers choose online',
            suggestion: 'Add detailed product descriptions'
          });
        }
      });
    }

    return { isValid: true, errors: [], warnings };
  }

  async getMenuStatus(menuId: string): Promise<PlatformMenuStatus> {
    return {
      isActive: true,
      lastUpdated: new Date(),
      itemCount: 0
    };
  }

  async syncItems(items: PlatformMenuItem[]): Promise<ItemSyncResult[]> {
    return items.map(item => ({ itemId: item.id, success: true }));
  }

  async updateItemAvailability(itemId: string, available: boolean): Promise<boolean> {
    return true;
  }

  async updateItemPricing(itemId: string, price: number): Promise<boolean> {
    return true;
  }

  getSupportedFeatures(): PlatformFeatures {
    return {
      supportsCategories: true,
      supportsModifiers: true,
      supportsImages: true,
      supportsScheduling: true,
      supportsPromotions: true,
      supportsRealTimeUpdates: true,
      maxItemsPerMenu: 1500,
      maxCategoriesPerMenu: 150
    };
  }

  getApiLimits(): ApiLimits {
    return {
      requestsPerMinute: 5000,
      requestsPerHour: 50000,
      maxBatchSize: 300,
      timeoutMs: 2000
    };
  }

  async healthCheck(): Promise<HealthStatus> {
    return {
      isHealthy: true,
      responseTime: 1,
      lastChecked: new Date()
    };
  }
}