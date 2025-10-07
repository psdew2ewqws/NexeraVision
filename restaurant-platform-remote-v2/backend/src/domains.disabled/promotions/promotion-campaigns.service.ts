import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../shared/database/prisma.service';
import { CreatePromotionCampaignDto } from './dto/create-promotion-campaign.dto';
import { UpdatePromotionCampaignDto } from './dto/update-promotion-campaign.dto';
import { ValidatePromotionCodeDto } from './dto/validate-promotion-code.dto';
import { PromotionCampaign, PromotionStatus, PromotionCampaignType } from '@prisma/client';

@Injectable()
export class PromotionCampaignsService {
  constructor(private prisma: PrismaService) {}

  async create(createDto: CreatePromotionCampaignDto, userId: string): Promise<PromotionCampaign> {
    // Generate unique slug if needed
    const slug = await this.generateUniqueSlug(createDto.slug);
    
    // Prepare data for campaign creation (exclude fields that are handled separately)
    const { codes, targets, ...campaignData } = createDto;
    
    // Extract companyId to avoid relation conflicts
    const { companyId, ...otherCampaignData } = campaignData;
    
    // Create promotion campaign
    const campaign = await this.prisma.promotionCampaign.create({
      data: {
        ...otherCampaignData,
        companyId, // Set explicitly
        slug,
        createdBy: userId,
        updatedBy: userId,
        // Ensure Json fields are properly formatted
        name: campaignData.name as any,
        description: campaignData.description as any,
        timeRanges: campaignData.timeRanges as any,
      },
      include: {
        codes: true,
        targets: true,
        usage: true,
      },
    });

    // Create promotion codes if provided
    if (createDto.codes && createDto.codes.length > 0) {
      await this.createPromotionCodes(campaign.id, createDto.codes);
    }

    // Create promotion targets if provided
    if (createDto.targets && createDto.targets.length > 0) {
      await this.createPromotionTargets(campaign.id, createDto.targets);
    }

    return this.findOne(campaign.id);
  }

  async findAll(companyId: string, page = 1, limit = 20, status?: PromotionStatus) {
    const skip = (page - 1) * limit;
    
    const where = {
      companyId,
      deletedAt: null,
      ...(status && { status }),
    };

    const [campaigns, total] = await Promise.all([
      this.prisma.promotionCampaign.findMany({
        where,
        skip,
        take: limit,
        orderBy: [
          { priority: 'asc' },
          { createdAt: 'desc' }
        ],
        include: {
          codes: {
            select: {
              id: true,
              code: true,
              isActive: true,
              usageCount: true,
            }
          },
          targets: {
            select: {
              targetType: true,
              targetId: true,
            }
          },
          _count: {
            select: {
              usage: true,
              codes: true,
            }
          }
        },
      }),
      this.prisma.promotionCampaign.count({ where }),
    ]);

    return {
      data: campaigns,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string): Promise<PromotionCampaign> {
    const campaign = await this.prisma.promotionCampaign.findFirst({
      where: { id, deletedAt: null },
      include: {
        codes: true,
        targets: true,
        usage: {
          include: {
            code: {
              select: { code: true }
            }
          },
          orderBy: { usageDate: 'desc' },
          take: 50,
        },
        platformConfigs: true,
        analytics: {
          orderBy: { date: 'desc' },
          take: 30,
        },
        _count: {
          select: {
            usage: true,
            codes: true,
          }
        }
      },
    });

    if (!campaign) {
      throw new NotFoundException('Promotion campaign not found');
    }

    return campaign;
  }

  async update(id: string, updateDto: UpdatePromotionCampaignDto, userId: string): Promise<PromotionCampaign> {
    const existingCampaign = await this.findOne(id);
    
    // Handle slug update
    let slug = updateDto.slug;
    if (slug && slug !== existingCampaign.slug) {
      slug = await this.generateUniqueSlug(slug, id);
    }

    // Prepare data for campaign update (exclude fields that are handled separately)
    const { codes, targets, ...campaignData } = updateDto;

    const updatedCampaign = await this.prisma.promotionCampaign.update({
      where: { id },
      data: {
        ...campaignData,
        ...(slug && { slug }),
        updatedBy: userId,
        updatedAt: new Date(),
        // Ensure Json fields are properly formatted if they exist
        ...(campaignData.name && { name: campaignData.name as any }),
        ...(campaignData.description && { description: campaignData.description as any }),
        ...(campaignData.timeRanges && { timeRanges: campaignData.timeRanges as any }),
      },
    });

    // Update codes if provided
    if (updateDto.codes) {
      await this.updatePromotionCodes(id, updateDto.codes);
    }

    // Update targets if provided
    if (updateDto.targets) {
      await this.updatePromotionTargets(id, updateDto.targets);
    }

    return this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    await this.findOne(id); // Ensure it exists
    
    await this.prisma.promotionCampaign.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async validatePromotionCode(dto: ValidatePromotionCodeDto) {
    // Find active campaign with the code
    const code = await this.prisma.promotionCode.findFirst({
      where: {
        code: dto.code.toUpperCase(),
        isActive: true,
        campaign: {
          status: 'active',
          deletedAt: null,
          // Check time restrictions
          OR: [
            { startsAt: null },
            { startsAt: { lte: new Date() } }
          ],
          AND: [
            {
              OR: [
                { endsAt: null },
                { endsAt: { gte: new Date() } }
              ]
            }
          ]
        }
      },
      include: {
        campaign: {
          include: {
            targets: true,
            usage: {
              where: {
                OR: [
                  { customerId: dto.customerId },
                  { customerEmail: dto.customerEmail },
                  { customerPhone: dto.customerPhone }
                ].filter(Boolean)
              }
            }
          }
        }
      }
    });

    if (!code) {
      return {
        isValid: false,
        error: 'INVALID_CODE',
        message: 'Promotion code is invalid or expired'
      };
    }

    const campaign = code.campaign;

    // Check if campaign has usage limits
    if (campaign.totalUsageLimit && campaign.currentUsageCount >= campaign.totalUsageLimit) {
      return {
        isValid: false,
        error: 'USAGE_LIMIT_EXCEEDED',
        message: 'Promotion has reached its usage limit'
      };
    }

    // Check per-customer limit
    if (campaign.perCustomerLimit && campaign.usage.length >= campaign.perCustomerLimit) {
      return {
        isValid: false,
        error: 'CUSTOMER_LIMIT_EXCEEDED',
        message: 'You have already used this promotion the maximum number of times'
      };
    }

    // Check minimum order requirements
    if (campaign.minimumOrderAmount && dto.orderTotal < Number(campaign.minimumOrderAmount)) {
      return {
        isValid: false,
        error: 'MINIMUM_ORDER_NOT_MET',
        message: `Minimum order amount of ${campaign.minimumOrderAmount} required`,
        minimumRequired: Number(campaign.minimumOrderAmount)
      };
    }

    if (campaign.minimumItemsCount && (dto.itemsCount || 1) < campaign.minimumItemsCount) {
      return {
        isValid: false,
        error: 'MINIMUM_ITEMS_NOT_MET',
        message: `Minimum ${campaign.minimumItemsCount} items required`,
        minimumRequired: campaign.minimumItemsCount
      };
    }

    // Check platform targeting
    if (campaign.targetPlatforms.length > 0 && !campaign.targetPlatforms.includes(dto.platform)) {
      return {
        isValid: false,
        error: 'PLATFORM_NOT_SUPPORTED',
        message: 'This promotion is not available on this platform'
      };
    }

    // Check day of week restrictions
    if (campaign.daysOfWeek.length > 0) {
      const today = new Date().getDay(); // 0 = Sunday, 1 = Monday, etc.
      const todayMondayFirst = today === 0 ? 7 : today; // Convert to Monday = 1 format
      if (!campaign.daysOfWeek.includes(todayMondayFirst)) {
        return {
          isValid: false,
          error: 'DAY_NOT_ALLOWED',
          message: 'This promotion is not available today'
        };
      }
    }

    // Check time restrictions
    if (campaign.timeRanges && Array.isArray(campaign.timeRanges) && campaign.timeRanges.length > 0) {
      const now = new Date();
      const currentTime = now.toTimeString().slice(0, 5); // HH:MM format
      
      const isInTimeRange = campaign.timeRanges.some((range: any) => {
        return currentTime >= range.start && currentTime <= range.end;
      });

      if (!isInTimeRange) {
        return {
          isValid: false,
          error: 'TIME_NOT_ALLOWED',
          message: 'This promotion is not available at this time'
        };
      }
    }

    // Calculate discount
    const discountCalculation = this.calculateDiscount(campaign, dto.orderTotal, dto.itemsCount || 1);

    return {
      isValid: true,
      campaign: {
        id: campaign.id,
        name: campaign.name,
        description: campaign.description,
        type: campaign.type,
        discountValue: Number(campaign.discountValue),
        maxDiscountAmount: campaign.maxDiscountAmount ? Number(campaign.maxDiscountAmount) : null,
      },
      discount: discountCalculation,
      code: {
        id: code.id,
        code: code.code,
      }
    };
  }

  async applyPromotionCode(dto: ValidatePromotionCodeDto & { orderId?: string }) {
    const validation = await this.validatePromotionCode(dto);
    
    if (!validation.isValid) {
      throw new BadRequestException(validation.message);
    }

    // Record usage
    const usage = await this.prisma.promotionUsage.create({
      data: {
        campaignId: validation.campaign.id,
        codeId: validation.code.id,
        customerId: dto.customerId,
        customerEmail: dto.customerEmail,
        customerPhone: dto.customerPhone,
        orderId: dto.orderId,
        discountApplied: validation.discount.amount,
        orderTotal: dto.orderTotal,
        platformUsed: dto.platform,
        branchId: dto.branchId,
        metadata: {
          itemsCount: dto.itemsCount,
          productIds: dto.productIds,
          categoryIds: dto.categoryIds,
        }
      }
    });

    // Update campaign usage count
    await this.prisma.promotionCampaign.update({
      where: { id: validation.campaign.id },
      data: {
        currentUsageCount: { increment: 1 }
      }
    });

    // Update code usage count
    await this.prisma.promotionCode.update({
      where: { id: validation.code.id },
      data: {
        usageCount: { increment: 1 }
      }
    });

    return {
      usage,
      discount: validation.discount,
    };
  }

  private calculateDiscount(campaign: any, orderTotal: number, itemsCount: number) {
    const discountValue = Number(campaign.discountValue) || 0;
    const maxDiscount = campaign.maxDiscountAmount ? Number(campaign.maxDiscountAmount) : null;

    let discountAmount = 0;
    let discountPercentage = 0;

    switch (campaign.type) {
      case PromotionCampaignType.percentage_discount:
        discountPercentage = discountValue;
        discountAmount = (orderTotal * discountValue) / 100;
        if (maxDiscount && discountAmount > maxDiscount) {
          discountAmount = maxDiscount;
        }
        break;

      case PromotionCampaignType.fixed_discount:
        discountAmount = Math.min(discountValue, orderTotal);
        discountPercentage = (discountAmount / orderTotal) * 100;
        break;

      case PromotionCampaignType.buy_x_get_y:
        const buyQty = campaign.buyQuantity || 1;
        const getQty = campaign.getQuantity || 1;
        const getDiscountPerc = Number(campaign.getDiscountPercentage) || 100;
        
        const eligibleSets = Math.floor(itemsCount / buyQty);
        const freeItems = eligibleSets * getQty;
        const avgItemPrice = orderTotal / itemsCount;
        
        discountAmount = freeItems * avgItemPrice * (getDiscountPerc / 100);
        discountPercentage = (discountAmount / orderTotal) * 100;
        break;

      case PromotionCampaignType.free_shipping:
        // This would be handled differently based on shipping logic
        discountAmount = 0; // Placeholder
        break;

      default:
        discountAmount = 0;
    }

    return {
      amount: Math.round(discountAmount * 100) / 100, // Round to 2 decimal places
      percentage: Math.round(discountPercentage * 100) / 100,
      type: campaign.type,
    };
  }

  private async generateUniqueSlug(baseSlug: string, excludeId?: string): Promise<string> {
    let slug = baseSlug.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-');
    let counter = 0;
    
    while (true) {
      const currentSlug = counter === 0 ? slug : `${slug}-${counter}`;
      
      const existing = await this.prisma.promotionCampaign.findFirst({
        where: {
          slug: currentSlug,
          deletedAt: null,
          ...(excludeId && { id: { not: excludeId } })
        }
      });
      
      if (!existing) {
        return currentSlug;
      }
      
      counter++;
    }
  }

  private async createPromotionCodes(campaignId: string, codes: string[]) {
    const codeData = codes.map(code => ({
      campaignId,
      code: code.toUpperCase(),
      isActive: true,
    }));

    await this.prisma.promotionCode.createMany({
      data: codeData,
      skipDuplicates: true,
    });
  }

  private async createPromotionTargets(campaignId: string, targets: any[]) {
    const targetData = targets.map(target => ({
      campaignId,
      targetType: target.targetType,
      targetId: target.targetId,
    }));

    await this.prisma.promotionTarget.createMany({
      data: targetData,
      skipDuplicates: true,
    });
  }

  private async updatePromotionCodes(campaignId: string, codes: string[]) {
    // Delete existing codes
    await this.prisma.promotionCode.deleteMany({
      where: { campaignId }
    });

    // Create new codes
    if (codes.length > 0) {
      await this.createPromotionCodes(campaignId, codes);
    }
  }

  private async updatePromotionTargets(campaignId: string, targets: any[]) {
    // Delete existing targets
    await this.prisma.promotionTarget.deleteMany({
      where: { campaignId }
    });

    // Create new targets
    if (targets.length > 0) {
      await this.createPromotionTargets(campaignId, targets);
    }
  }

  async getAnalytics(campaignId: string, startDate?: Date, endDate?: Date) {
    const campaign = await this.findOne(campaignId);
    
    const dateFilter = {
      ...(startDate && { usageDate: { gte: startDate } }),
      ...(endDate && { usageDate: { lte: endDate } }),
    };

    const [usage, analytics] = await Promise.all([
      this.prisma.promotionUsage.findMany({
        where: {
          campaignId,
          ...dateFilter,
        },
        include: {
          code: { select: { code: true } }
        }
      }),
      this.prisma.promotionAnalytics.findMany({
        where: {
          campaignId,
          ...(startDate && { date: { gte: startDate } }),
          ...(endDate && { date: { lte: endDate } }),
        },
        orderBy: { date: 'desc' }
      })
    ]);

    // Calculate summary metrics
    const totalUsage = usage.length;
    const totalDiscount = usage.reduce((sum, u) => sum + Number(u.discountApplied), 0);
    const totalRevenue = usage.reduce((sum, u) => sum + Number(u.orderTotal || 0), 0);
    const uniqueCustomers = new Set([
      ...usage.filter(u => u.customerId).map(u => u.customerId),
      ...usage.filter(u => u.customerEmail).map(u => u.customerEmail),
      ...usage.filter(u => u.customerPhone).map(u => u.customerPhone),
    ].filter(Boolean)).size;

    const platformBreakdown = usage.reduce((acc, u) => {
      const platform = u.platformUsed || 'unknown';
      acc[platform] = (acc[platform] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      campaign: {
        id: campaign.id,
        name: campaign.name,
        type: campaign.type,
        status: campaign.status,
      },
      summary: {
        totalUsage,
        totalDiscount: Math.round(totalDiscount * 100) / 100,
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        uniqueCustomers,
        averageOrderValue: totalUsage > 0 ? Math.round((totalRevenue / totalUsage) * 100) / 100 : 0,
        averageDiscount: totalUsage > 0 ? Math.round((totalDiscount / totalUsage) * 100) / 100 : 0,
      },
      platformBreakdown,
      dailyAnalytics: analytics,
      recentUsage: usage.slice(0, 20),
    };
  }
}