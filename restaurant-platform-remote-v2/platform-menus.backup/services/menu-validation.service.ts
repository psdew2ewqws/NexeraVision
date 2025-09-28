// ================================================
// Menu Validation Service
// Restaurant Platform v2 - Validation Logic
// ================================================

import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { DeliveryPlatform, PlatformMenuDetailResponse } from '../types/platform-menu.types';

@Injectable()
export class MenuValidationService {
  private readonly logger = new Logger(MenuValidationService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Validate platform availability for company
   */
  async validatePlatformForCompany(platform: DeliveryPlatform, companyId: string): Promise<void> {
    // Check if company has access to this platform
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
      select: {
        id: true,
        businessType: true,
        subscriptionPlan: true,
        platformAccess: true
      }
    });

    if (!company) {
      throw new BadRequestException('Company not found');
    }

    // For now, all platforms are available
    // Future: implement platform restrictions based on subscription
    this.logger.debug(`Platform ${platform} validated for company ${companyId}`);
  }

  /**
   * Validate menu can be synced
   */
  async validateMenuForSync(menu: PlatformMenuDetailResponse): Promise<void> {
    const errors: string[] = [];

    // Check menu has items
    if (!menu.items || menu.items.length === 0) {
      errors.push('Menu must have at least one item to sync');
    }

    // Check menu is not already syncing
    if (menu.syncStatus === 'in_progress') {
      errors.push('Menu is already being synced');
    }

    // Validate menu name
    if (!menu.name?.en && !menu.name?.ar) {
      errors.push('Menu must have a name in English or Arabic');
    }

    // Check items have valid data
    if (menu.items) {
      menu.items.forEach((item, index) => {
        if (!item.product) {
          errors.push(`Item at position ${index + 1} is missing product reference`);
        }

        const price = item.platformPrice || item.product?.basePrice;
        if (!price || price <= 0) {
          errors.push(`Item "${item.displayName?.en || item.product?.name?.en || 'Unknown'}" has invalid price`);
        }
      });
    }

    if (errors.length > 0) {
      throw new BadRequestException(`Menu validation failed: ${errors.join(', ')}`);
    }

    this.logger.debug(`Menu ${menu.id} validated for sync`);
  }

  /**
   * Validate bulk operation
   */
  async validateBulkOperation(
    menuIds: string[],
    operation: string,
    userCompanyId?: string
  ): Promise<void> {
    if (!menuIds || menuIds.length === 0) {
      throw new BadRequestException('No menus selected for operation');
    }

    if (menuIds.length > 50) {
      throw new BadRequestException('Maximum 50 menus can be processed in bulk operation');
    }

    // Validate all menus exist and belong to company
    const menus = await this.prisma.platformMenu.findMany({
      where: {
        id: { in: menuIds },
        ...(userCompanyId && { companyId: userCompanyId }),
        deletedAt: null
      },
      select: { id: true, syncStatus: true }
    });

    if (menus.length !== menuIds.length) {
      throw new BadRequestException('Some menus not found or not accessible');
    }

    // Check for ongoing syncs if sync operation
    if (operation === 'sync') {
      const syncingMenus = menus.filter(menu => menu.syncStatus === 'in_progress');
      if (syncingMenus.length > 0) {
        throw new BadRequestException(`${syncingMenus.length} menus are already syncing`);
      }
    }

    this.logger.debug(`Bulk operation ${operation} validated for ${menuIds.length} menus`);
  }
}