import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

export interface PromotionPricingResult {
  originalPrice: number;
  discountedPrice: number;
  discountAmount: number;
  discountType: 'percentage' | 'fixed';
  campaignId?: string;
  campaignName?: string;
  platformSpecific?: boolean;
  validUntil?: Date;
}

export interface MenuItemWithPromotion {
  id: string;
  name: any;
  description?: any;
  basePrice: number;
  pricing: any;
  image?: string;
  slug?: string;
  status: number;
  priority: number;
  tags: string[];
  category?: {
    id: string;
    name: any;
  };
  promotions?: PromotionPricingResult[];
  bestPromotion?: PromotionPricingResult;
}

export interface ApplyPromotionDto {
  campaignId: string;
  menuItemIds: string[];
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  maxDiscountAmount?: number;
  platforms: string[];
  startDate?: Date;
  endDate?: Date;
}

@Injectable()
export class MenuPromotionIntegrationService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Apply promotion to multiple menu items
   */
  async applyPromotionToMenuItems(data: ApplyPromotionDto, companyId: string) {
    // Verify campaign exists and belongs to company
    const campaign = await this.prisma.promotionCampaign.findFirst({
      where: {
        id: data.campaignId,
        companyId,
        status: { in: ['active', 'scheduled'] }
      }
    });

    if (!campaign) {
      throw new Error('Campaign not found or not available for this company');
    }

    // Verify menu items belong to company
    const menuItems = await this.prisma.menuProduct.findMany({
      where: {
        id: { in: data.menuItemIds },
        companyId,
        status: 1 // active items only
      }
    });

    if (menuItems.length !== data.menuItemIds.length) {
      throw new Error('Some menu items not found or not active');
    }

    // Create promotion-menu item relationships
    const promotionMenuItems = await Promise.all(
      data.menuItemIds.map(menuItemId =>
        this.prisma.promotionMenuItem.upsert({
          where: {
            campaignId_menuItemId: {
              campaignId: data.campaignId,
              menuItemId
            }
          },
          create: {
            campaignId: data.campaignId,
            menuItemId,
            discountValue: data.discountValue,
            discountType: data.discountType,
            maxDiscountAmount: data.maxDiscountAmount,
            platforms: data.platforms,
            startDate: data.startDate,
            endDate: data.endDate,
            isActive: true
          },
          update: {
            discountValue: data.discountValue,
            discountType: data.discountType,
            maxDiscountAmount: data.maxDiscountAmount,
            platforms: data.platforms,
            startDate: data.startDate,
            endDate: data.endDate,
            isActive: true
          }
        })
      )
    );

    return {
      success: true,
      appliedToItems: promotionMenuItems.length,
      promotionMenuItems
    };
  }

  /**
   * Get menu items with active promotions for a specific platform
   */
  async getMenuItemsWithPromotions(
    companyId: string,
    platform: string = 'website',
    categoryId?: string,
    options?: {
      includeInactive?: boolean;
      limit?: number;
      offset?: number;
    }
  ): Promise<MenuItemWithPromotion[]> {
    const where: any = {
      companyId,
      status: options?.includeInactive ? undefined : 1,
      ...(categoryId && { categoryId })
    };

    const menuItems = await this.prisma.menuProduct.findMany({
      where,
      include: {
        category: {
          select: { id: true, name: true }
        },
        promotionMenuItems: {
          where: {
            isActive: true,
            platforms: { has: platform },
            AND: [
              {
                OR: [
                  { startDate: null },
                  { startDate: { lte: new Date() } }
                ]
              },
              {
                OR: [
                  { endDate: null },
                  { endDate: { gte: new Date() } }
                ]
              }
            ]
          },
          include: {
            campaign: {
              select: {
                id: true,
                name: true,
                status: true,
                endsAt: true
              }
            }
          }
        }
      },
      orderBy: [
        { priority: 'asc' },
        { createdAt: 'desc' }
      ],
      ...(options?.limit && { take: options.limit }),
      ...(options?.offset && { skip: options.offset })
    });

    // Process promotions for each menu item
    return menuItems.map(item => {
      const promotions: PromotionPricingResult[] = item.promotionMenuItems
        .filter(pm => pm.campaign.status === 'active')
        .map(pm => this.calculatePromotionPricing(item, pm));

      const bestPromotion = this.getBestPromotion(promotions);

      return {
        id: item.id,
        name: item.name,
        description: item.description,
        basePrice: Number(item.basePrice),
        pricing: item.pricing,
        image: item.image,
        slug: item.slug,
        status: item.status,
        priority: item.priority,
        tags: item.tags,
        category: item.category,
        promotions,
        bestPromotion
      };
    });
  }

  /**
   * Calculate pricing for a specific promotion
   */
  private calculatePromotionPricing(menuItem: any, promotionMenuItem: any): PromotionPricingResult {
    const basePrice = Number(menuItem.basePrice);
    let discountAmount = 0;
    let discountedPrice = basePrice;

    if (promotionMenuItem.discountType === 'percentage') {
      discountAmount = (basePrice * Number(promotionMenuItem.discountValue)) / 100;
      
      // Apply max discount limit if specified
      if (promotionMenuItem.maxDiscountAmount) {
        discountAmount = Math.min(discountAmount, Number(promotionMenuItem.maxDiscountAmount));
      }
    } else {
      // Fixed amount discount
      discountAmount = Math.min(Number(promotionMenuItem.discountValue), basePrice);
    }

    discountedPrice = Math.max(basePrice - discountAmount, 0);

    return {
      originalPrice: basePrice,
      discountedPrice,
      discountAmount,
      discountType: promotionMenuItem.discountType as 'percentage' | 'fixed',
      campaignId: promotionMenuItem.campaignId,
      campaignName: promotionMenuItem.campaign.name,
      platformSpecific: true,
      validUntil: promotionMenuItem.endDate || promotionMenuItem.campaign.endsAt
    };
  }

  /**
   * Get the best promotion (highest discount) from available promotions
   */
  private getBestPromotion(promotions: PromotionPricingResult[]): PromotionPricingResult | undefined {
    if (!promotions.length) return undefined;

    return promotions.reduce((best, current) => 
      current.discountAmount > best.discountAmount ? current : best
    );
  }

  /**
   * Remove promotion from menu items
   */
  async removePromotionFromMenuItems(campaignId: string, menuItemIds: string[], companyId: string) {
    // Verify campaign belongs to company
    const campaign = await this.prisma.promotionCampaign.findFirst({
      where: {
        id: campaignId,
        companyId
      }
    });

    if (!campaign) {
      throw new Error('Campaign not found');
    }

    // Remove promotion-menu item relationships
    await this.prisma.promotionMenuItem.deleteMany({
      where: {
        campaignId,
        menuItemId: { in: menuItemIds }
      }
    });

    return {
      success: true,
      removedFromItems: menuItemIds.length
    };
  }

  /**
   * Get promotion statistics for a campaign
   */
  async getCampaignMenuItemStats(campaignId: string, companyId: string) {
    // Verify campaign belongs to company
    const campaign = await this.prisma.promotionCampaign.findFirst({
      where: {
        id: campaignId,
        companyId
      }
    });

    if (!campaign) {
      throw new Error('Campaign not found');
    }

    const stats = await this.prisma.promotionMenuItem.groupBy({
      by: ['platforms'],
      where: {
        campaignId,
        isActive: true
      },
      _count: {
        menuItemId: true
      }
    });

    const totalItems = await this.prisma.promotionMenuItem.count({
      where: {
        campaignId,
        isActive: true
      }
    });

    const platformStats = stats.reduce((acc, stat) => {
      stat.platforms.forEach(platform => {
        acc[platform] = (acc[platform] || 0) + stat._count.menuItemId;
      });
      return acc;
    }, {} as Record<string, number>);

    return {
      campaignId,
      totalItems,
      platformStats,
      availablePlatforms: Object.keys(platformStats)
    };
  }

  /**
   * Validate promotion application
   */
  async validatePromotionApplication(data: ApplyPromotionDto, companyId: string) {
    const errors: string[] = [];

    // Check campaign
    const campaign = await this.prisma.promotionCampaign.findFirst({
      where: {
        id: data.campaignId,
        companyId
      }
    });

    if (!campaign) {
      errors.push('Campaign not found');
    } else if (campaign.status !== 'active' && campaign.status !== 'scheduled') {
      errors.push('Campaign is not active or scheduled');
    }

    // Check menu items
    const menuItemCount = await this.prisma.menuProduct.count({
      where: {
        id: { in: data.menuItemIds },
        companyId,
        status: 1
      }
    });

    if (menuItemCount !== data.menuItemIds.length) {
      errors.push('Some menu items not found or not active');
    }

    // Validate discount values
    if (data.discountType === 'percentage') {
      if (data.discountValue <= 0 || data.discountValue > 100) {
        errors.push('Percentage discount must be between 1 and 100');
      }
    } else {
      if (data.discountValue <= 0) {
        errors.push('Fixed discount must be greater than 0');
      }
    }

    // Validate platforms
    const validPlatforms = ['talabat', 'careem', 'website', 'call_center'];
    const invalidPlatforms = data.platforms.filter(p => !validPlatforms.includes(p));
    if (invalidPlatforms.length > 0) {
      errors.push(`Invalid platforms: ${invalidPlatforms.join(', ')}`);
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}