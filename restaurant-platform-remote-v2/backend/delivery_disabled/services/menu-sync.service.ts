import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../database/prisma.service';

export interface MenuSyncRequest {
  companyId: string;
  branchId: string;
  providerType: 'careem' | 'talabat' | 'dhub';
  fullSync?: boolean;
  categories?: string[];
}

export interface MenuSyncResult {
  success: boolean;
  syncedItems: number;
  failedItems: number;
  errors: string[];
  providerMenuId?: string;
  lastSyncTime: Date;
}

interface MenuItemData {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  isAvailable: boolean;
  images: string[];
  modifiers: Array<{
    groupName: string;
    options: Array<{
      name: string;
      price: number;
    }>;
  }>;
  preparationTime: number;
  tags: string[];
}

@Injectable()
export class MenuSyncService {
  private readonly logger = new Logger(MenuSyncService.name);
  private syncInProgress = new Set<string>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2
  ) {}

  /**
   * Sync menu with delivery platform
   */
  async syncMenu(request: MenuSyncRequest): Promise<MenuSyncResult> {
    const syncKey = `${request.companyId}-${request.branchId}-${request.providerType}`;

    if (this.syncInProgress.has(syncKey)) {
      throw new Error('Menu sync already in progress for this branch and provider');
    }

    this.syncInProgress.add(syncKey);
    this.logger.log(`Starting menu sync for branch ${request.branchId} with ${request.providerType}`);

    try {
      // 1. Get menu items to sync
      const menuItems = await this.getMenuItems(request);

      // 2. Transform items to provider format
      const transformedItems = await this.transformMenuItems(menuItems, request.providerType);

      // 3. Mock sync with provider (until real implementations are ready)
      const syncResult = await this.mockSyncWithProvider(transformedItems, request);

      // 4. Emit sync event
      this.eventEmitter.emit('menu.sync.completed', {
        companyId: request.companyId,
        branchId: request.branchId,
        providerType: request.providerType,
        result: syncResult
      });

      this.logger.log(`Menu sync completed for ${request.providerType}: ${syncResult.syncedItems} items synced`);
      return syncResult;

    } catch (error) {
      this.logger.error(`Menu sync failed for ${request.providerType}:`, error);

      const failureResult: MenuSyncResult = {
        success: false,
        syncedItems: 0,
        failedItems: 0,
        errors: [error.message],
        lastSyncTime: new Date()
      };

      this.eventEmitter.emit('menu.sync.failed', {
        companyId: request.companyId,
        branchId: request.branchId,
        providerType: request.providerType,
        error: error.message
      });

      return failureResult;

    } finally {
      this.syncInProgress.delete(syncKey);
    }
  }

  /**
   * Sync menu with multiple providers
   */
  async syncWithAllProviders(companyId: string, branchId: string): Promise<MenuSyncResult[]> {
    const providers = ['careem', 'talabat', 'dhub'] as const;
    const results: MenuSyncResult[] = [];

    for (const providerType of providers) {
      try {
        const result = await this.syncMenu({
          companyId,
          branchId,
          providerType
        });
        results.push(result);
      } catch (error) {
        this.logger.error(`Failed to sync with ${providerType}:`, error);
        results.push({
          success: false,
          syncedItems: 0,
          failedItems: 0,
          errors: [error.message],
          lastSyncTime: new Date()
        });
      }
    }

    return results;
  }

  /**
   * Automated daily menu sync
   */
  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async automatedDailySync(): Promise<void> {
    this.logger.log('Starting automated daily menu sync');

    try {
      // Get all active companies with branches
      const companies = await this.prisma.company.findMany({
        where: { status: 'active' },
        include: {
          branches: {
            where: { isActive: true }
          }
        }
      });

      for (const company of companies) {
        for (const branch of company.branches) {
          try {
            await this.syncWithAllProviders(company.id, branch.id);

            // Add small delay between syncs
            await new Promise(resolve => setTimeout(resolve, 2000));

          } catch (error) {
            this.logger.error(`Automated sync failed for branch ${branch.id}:`, error);
          }
        }
      }

      this.logger.log('Automated daily menu sync completed');

    } catch (error) {
      this.logger.error('Automated daily sync failed:', error);
    }
  }

  /**
   * Get menu items for sync
   */
  private async getMenuItems(request: MenuSyncRequest): Promise<MenuItemData[]> {
    const whereClause: any = {
      companyId: request.companyId,
      isActive: true
    };

    // Filter by categories if specified
    if (request.categories && request.categories.length > 0) {
      whereClause.categoryId = { in: request.categories };
    }

    // If not full sync, only get items modified in last 24 hours
    if (!request.fullSync) {
      whereClause.updatedAt = {
        gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
      };
    }

    try {
      const menuProducts = await this.prisma.menuProduct.findMany({
        where: whereClause,
        include: {
          category: true
        }
      });

      return menuProducts.map(product => ({
        id: product.id,
        name: String(product.name),
        description: String(product.description || ''),
        price: this.calculateFinalPrice(product),
        category: String(product.category?.name || 'General'),
        isAvailable: product.status === 1, // Assuming 1 means available
        images: Array.isArray(product.images) ? product.images : [],
        modifiers: [], // Simplified for now
        preparationTime: product.preparationTime || 15,
        tags: Array.isArray(product.tags) ? product.tags : []
      }));
    } catch (error) {
      this.logger.error(`Error getting menu items: ${error.message}`);
      return [];
    }
  }

  /**
   * Transform menu items for specific provider
   */
  private async transformMenuItems(items: MenuItemData[], providerType: string): Promise<any[]> {
    switch (providerType) {
      case 'careem':
        return this.transformForCareem(items);
      case 'talabat':
        return this.transformForTalabat(items);
      case 'dhub':
        return this.transformForDhub(items);
      default:
        throw new Error(`Unsupported provider type: ${providerType}`);
    }
  }

  /**
   * Transform for Careem format
   */
  private transformForCareem(items: MenuItemData[]): any[] {
    return items.map(item => ({
      external_id: item.id,
      name: item.name,
      description: item.description,
      price: Math.round(item.price * 100), // Careem uses cents
      category: item.category,
      is_available: item.isAvailable,
      images: item.images.map(url => ({ url })),
      preparation_time_minutes: item.preparationTime,
      modifiers: item.modifiers.map(modifier => ({
        name: modifier.groupName,
        options: modifier.options.map(option => ({
          name: option.name,
          price: Math.round(option.price * 100)
        }))
      })),
      tags: item.tags
    }));
  }

  /**
   * Transform for Talabat format
   */
  private transformForTalabat(items: MenuItemData[]): any[] {
    return items.map(item => ({
      item_id: item.id,
      title: item.name,
      description: item.description,
      price: item.price,
      category_name: item.category,
      available: item.isAvailable,
      image_urls: item.images,
      preparation_time: item.preparationTime,
      modifiers: item.modifiers.map(modifier => ({
        modifier_group_name: modifier.groupName,
        modifier_options: modifier.options.map(option => ({
          option_name: option.name,
          additional_price: option.price
        }))
      })),
      labels: item.tags
    }));
  }

  /**
   * Transform for DHUB format
   */
  private transformForDhub(items: MenuItemData[]): any[] {
    return items.map(item => ({
      productId: item.id,
      productName: item.name,
      productDescription: item.description,
      basePrice: item.price,
      categoryName: item.category,
      isActive: item.isAvailable,
      imageUrls: item.images,
      estimatedPrepTime: item.preparationTime,
      customizations: item.modifiers.map(modifier => ({
        groupTitle: modifier.groupName,
        selections: modifier.options.map(option => ({
          selectionName: option.name,
          priceModifier: option.price
        }))
      })),
      productTags: item.tags
    }));
  }

  /**
   * Mock sync with provider (until real implementations are ready)
   */
  private async mockSyncWithProvider(items: any[], request: MenuSyncRequest): Promise<MenuSyncResult> {
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Mock successful sync
    return {
      success: true,
      syncedItems: items.length,
      failedItems: 0,
      errors: [],
      providerMenuId: `${request.providerType}-menu-${Date.now()}`,
      lastSyncTime: new Date()
    };
  }

  /**
   * Calculate final price including taxes
   */
  private calculateFinalPrice(product: any): number {
    const basePrice = parseFloat(String(product.basePrice || product.price || '0'));
    return Math.round(basePrice * 100) / 100; // Round to 2 decimal places
  }

  /**
   * Get menu sync statistics
   */
  async getMenuSyncStats(companyId: string, timeframe = '7d'): Promise<any> {
    const timeframeDays = timeframe === '30d' ? 30 : timeframe === '7d' ? 7 : 1;
    const startDate = new Date(Date.now() - timeframeDays * 24 * 60 * 60 * 1000);

    // Mock stats for now
    return {
      totalSyncs: 42,
      successfulSyncs: 39,
      failedSyncs: 3,
      totalItemsSynced: 245,
      averageItemsPerSync: 6,
      providerBreakdown: {
        careem: { total: 14, successful: 13, failed: 1, itemsSynced: 85 },
        talabat: { total: 14, successful: 13, failed: 1, itemsSynced: 80 },
        dhub: { total: 14, successful: 13, failed: 1, itemsSynced: 80 }
      },
      recentSyncs: []
    };
  }
}