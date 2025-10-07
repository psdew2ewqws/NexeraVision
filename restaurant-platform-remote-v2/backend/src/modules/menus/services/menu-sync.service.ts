import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class MenuSyncService {
  private readonly logger = new Logger(MenuSyncService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Sync menu to a specific channel (Careem, Talabat, CallCenter)
   */
  async syncToChannel(menuId: string, channel: string, userId: string, companyId: string) {
    // Verify menu exists and belongs to company
    const menu = await this.prisma.menu.findFirst({
      where: {
        id: menuId,
        companyId,
        deletedAt: null,
      },
      include: {
        // TODO: branches relation not in Menu model - removed for production
        // branches: {
        //   include: {
        //     branch: true,
        //   },
        // },
        channels: {
          where: {
            channelCode: channel,
          },
        },
        products: {
          include: {
            product: {
              include: {
                category: true,
              },
            },
          },
          where: {
            isAvailable: true,
          },
          orderBy: {
            displayOrder: 'asc',
          },
        },
      },
    });

    if (!menu) {
      throw new NotFoundException('Menu not found');
    }

    if (menu.channels.length === 0) {
      throw new BadRequestException(`Menu is not configured for channel: ${channel}`);
    }

    try {
      // Generate platform-specific payload
      const platformPayload = this.generatePlatformPayload(menu, channel);

      // Call appropriate sync service based on channel
      let syncResult: boolean;
      let errorMessage: string | null = null;

      switch (channel.toLowerCase()) {
        case 'careem':
          syncResult = await this.syncToCareem(platformPayload);
          break;
        case 'talabat':
          syncResult = await this.syncToTalabat(platformPayload);
          break;
        case 'callcenter':
          syncResult = await this.syncToCallCenter(platformPayload);
          break;
        default:
          throw new BadRequestException(`Unsupported channel: ${channel}`);
      }

      // Update sync status
      await this.prisma.menuSyncStatus.upsert({
        where: {
          menuId_channelCode: {
            menuId,
            channelCode: channel,
          },
        },
        create: {
          menuId,
          channelCode: channel,
          isSynced: syncResult,
          lastSyncAt: syncResult ? new Date() : null,
          syncStatus: syncResult ? 'success' : 'failed',
          syncError: errorMessage,
          syncAttempts: 1,
        },
        update: {
          isSynced: syncResult,
          lastSyncAt: syncResult ? new Date() : null,
          syncStatus: syncResult ? 'success' : 'failed',
          syncError: errorMessage,
          syncAttempts: { increment: 1 },
          updatedBy: userId,
        },
      });

      return {
        success: syncResult,
        menuId,
        channel,
        syncedAt: syncResult ? new Date() : null,
        error: errorMessage,
      };
    } catch (error) {
      this.logger.error(`Failed to sync menu ${menuId} to ${channel}:`, error);

      // Update sync status with error
      await this.prisma.menuSyncStatus.upsert({
        where: {
          menuId_channelCode: {
            menuId,
            channelCode: channel,
          },
        },
        create: {
          menuId,
          channelCode: channel,
          isSynced: false,
          syncStatus: 'failed',
          syncError: error.message,
          syncAttempts: 1,
        },
        update: {
          isSynced: false,
          syncStatus: 'failed',
          syncError: error.message,
          syncAttempts: { increment: 1 },
          updatedBy: userId,
        },
      });

      throw error;
    }
  }

  /**
   * Generate platform-specific payload
   */
  private generatePlatformPayload(menu: any, channel: string) {
    const categories = this.groupProductsByCategory(menu.products);

    return {
      menuName: menu.name,
      menuId: menu.id,
      isActive: menu.isActive,
      // TODO: branches relation not in Menu model - returning empty array
      branches: [], // menu.branches?.map((mb) => ({
      //   id: mb.branch.id,
      //   name: mb.branch.name,
      //   code: mb.branch.code,
      // })) || [],
      categories: categories.map((category) => ({
        id: category.id,
        name: this.getLocalizedValue(category.name, 'en'),
        nameAr: this.getLocalizedValue(category.name, 'ar'),
        products: category.products.map((mp) => {
          const product = mp.product;
          const pricing = product.pricing as any;

          return {
            id: product.id,
            name: this.getLocalizedValue(product.name, 'en'),
            nameAr: this.getLocalizedValue(product.name, 'ar'),
            description: this.getLocalizedValue(product.description, 'en'),
            // Use platform-specific pricing
            price: this.resolvePlatformPrice(pricing, channel),
            basePrice: product.basePrice,
            image: product.image,
            isAvailable: mp.isAvailable,
            preparationTime: product.preparationTime,
          };
        }),
      })),
    };
  }

  /**
   * Group products by category
   */
  private groupProductsByCategory(menuProducts: any[]) {
    const categoryMap = new Map();

    for (const mp of menuProducts) {
      const product = mp.product;
      if (!product.category) continue;

      const categoryId = product.category.id;
      if (!categoryMap.has(categoryId)) {
        categoryMap.set(categoryId, {
          id: categoryId,
          name: product.category.name,
          products: [],
        });
      }

      categoryMap.get(categoryId).products.push(mp);
    }

    return Array.from(categoryMap.values());
  }

  /**
   * Resolve platform-specific price
   */
  private resolvePlatformPrice(pricing: any, channel: string): number {
    const channelKey = channel.toLowerCase();

    // Try channel-specific price first
    if (pricing[channelKey] && pricing[channelKey] > 0) {
      return pricing[channelKey];
    }

    // Fallback to default price
    return pricing.default || 0;
  }

  /**
   * Get localized value from JSON field
   */
  private getLocalizedValue(jsonValue: any, locale: string): string {
    if (typeof jsonValue === 'string') return jsonValue;
    return jsonValue?.[locale] || jsonValue?.['en'] || '';
  }

  /**
   * Sync to Careem platform
   */
  private async syncToCareem(payload: any): Promise<boolean> {
    this.logger.log(`Syncing menu ${payload.menuId} to Careem`);

    // TODO: Implement actual Careem API integration
    // For now, simulate success
    return true;
  }

  /**
   * Sync to Talabat platform
   */
  private async syncToTalabat(payload: any): Promise<boolean> {
    this.logger.log(`Syncing menu ${payload.menuId} to Talabat`);

    // TODO: Implement actual Talabat API integration
    // For now, simulate success
    return true;
  }

  /**
   * Sync to CallCenter system
   */
  private async syncToCallCenter(payload: any): Promise<boolean> {
    this.logger.log(`Syncing menu ${payload.menuId} to CallCenter`);

    // CallCenter is internal, just mark as synced
    return true;
  }
}
