import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { BaseService, BaseEntity, BaseUser } from '../../../common/services/base.service';
import {
  CreateSavedMenuDto,
  UpdateSavedMenuDto,
  SavedMenuFiltersDto,
  AddProductsToSavedMenuDto,
  RemoveProductsFromSavedMenuDto,
  UpdateSavedMenuItemsDto
} from '../dto';

export interface SavedMenuEntity extends BaseEntity {
  companyId: string;
  name: string;
  status: string;
}

@Injectable()
export class SavedMenusService extends BaseService<SavedMenuEntity> {
  constructor(protected readonly prisma: PrismaService) {
    super(prisma, 'savedMenu');
  }

  // Get paginated saved menus with company isolation
  async getSavedMenus(filters: SavedMenuFiltersDto, userCompanyId?: string, userRole?: string, userId?: string) {
    const {
      search,
      status,
      platformId,
      createdBy,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      page = 1,
      limit = 20,
      companyId
    } = filters;

    const currentUser: BaseUser = {
      id: userId || 'system',
      companyId: userCompanyId || '',
      role: userRole || 'user'
    };

    // Build where clause with company isolation
    const additionalWhere: any = {
      ...(status && { status }),
      ...(platformId && { platformId }),
      ...(createdBy && { createdBy }),
      deletedAt: null // Only show non-deleted menus
    };

    // For super_admin, allow specific company filtering
    if (userRole === 'super_admin' && companyId) {
      additionalWhere.companyId = companyId;
    }

    const where = this.buildBaseWhereClause(currentUser, additionalWhere);

    // Add search functionality
    if (search) {
      where.OR = [
        {
          name: {
            contains: search,
            mode: 'insensitive'
          }
        },
        {
          description: {
            contains: search,
            mode: 'insensitive'
          }
        }
      ];
    }

    // Sorting configuration
    let orderBy: any = {};
    if (sortBy === 'name') {
      orderBy.name = sortOrder;
    } else if (sortBy === 'productCount') {
      orderBy.productCount = sortOrder;
    } else if (sortBy === 'createdAt') {
      orderBy.createdAt = sortOrder;
    } else if (sortBy === 'updatedAt') {
      orderBy.updatedAt = sortOrder;
    }

    // Pagination
    const { skip, take } = this.buildPaginationParams(page, limit);

    const [savedMenus, totalCount] = await Promise.all([
      this.prisma.savedMenu.findMany({
        where,
        include: {
          company: {
            select: { id: true, name: true, slug: true }
          },
          platform: {
            select: { id: true, name: true, platformType: true }
          },
          creator: {
            select: { id: true, name: true, email: true }
          },
          _count: {
            select: { items: true }
          }
        },
        orderBy,
        skip,
        take,
      }),
      this.prisma.savedMenu.count({ where })
    ]);

    const totalPages = Math.ceil(totalCount / limit);
    const hasMore = page < totalPages;

    // Transform the response to match frontend expectations
    const transformedSavedMenus = savedMenus.map(menu => ({
      id: menu.id,
      name: menu.name,
      description: menu.description,
      status: menu.status,
      productCount: menu._count.items, // Use actual count from database
      createdAt: menu.createdAt.toISOString(),
      updatedAt: menu.updatedAt.toISOString(),
      companyId: menu.companyId,
      platformId: menu.platformId,
      company: menu.company,
      platform: menu.platform,
      creator: menu.creator
    }));

    return {
      savedMenus: transformedSavedMenus,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages,
        hasMore
      }
    };
  }

  // Create new saved menu with company isolation
  async createSavedMenu(createSavedMenuDto: CreateSavedMenuDto, userCompanyId?: string, userId?: string) {
    const { companyId, productIds, ...menuData } = createSavedMenuDto;

    // Use provided companyId (super_admin) or user's company (others)
    const effectiveCompanyId = companyId || userCompanyId;

    if (!effectiveCompanyId) {
      throw new ForbiddenException('Company ID is required');
    }

    if (!userId) {
      throw new ForbiddenException('User ID is required');
    }

    // Verify platform belongs to the same company if specified
    if (menuData.platformId) {
      const platform = await this.prisma.platformMenu.findFirst({
        where: {
          id: menuData.platformId,
          companyId: effectiveCompanyId,
          deletedAt: null
        }
      });

      if (!platform) {
        throw new NotFoundException('Platform not found or does not belong to your company');
      }
    }

    // Create the saved menu
    const savedMenu = await this.prisma.savedMenu.create({
      data: {
        ...menuData,
        companyId: effectiveCompanyId,
        createdBy: userId,
        status: menuData.status || 'active'
      },
      include: {
        company: {
          select: { id: true, name: true, slug: true }
        },
        platform: {
          select: { id: true, name: true, platformType: true }
        },
        creator: {
          select: { id: true, name: true, email: true }
        }
      }
    });

    // Add initial products if provided
    if (productIds && productIds.length > 0) {
      await this.addProductsToSavedMenu(savedMenu.id, { productIds }, effectiveCompanyId);
    }

    // Update product count
    await this.updateProductCount(savedMenu.id);

    return savedMenu;
  }

  // Get single saved menu with company isolation
  async getSavedMenu(id: string, userCompanyId?: string) {
    const savedMenu = await this.prisma.savedMenu.findFirst({
      where: {
        id,
        ...(userCompanyId && { companyId: userCompanyId }),
        deletedAt: null
      },
      include: {
        company: {
          select: { id: true, name: true, slug: true }
        },
        platform: {
          select: { id: true, name: true, platformType: true }
        },
        creator: {
          select: { id: true, name: true, email: true }
        },
        items: {
          include: {
            product: {
              include: {
                category: {
                  select: { id: true, name: true }
                }
              }
            }
          },
          orderBy: { displayOrder: 'asc' }
        }
      }
    });

    if (!savedMenu) {
      throw new NotFoundException('Saved menu not found');
    }

    return {
      ...savedMenu,
      productCount: savedMenu.items.length
    };
  }

  // Update saved menu with company isolation
  async updateSavedMenu(id: string, updateSavedMenuDto: UpdateSavedMenuDto, userCompanyId?: string, userId?: string) {
    // Verify saved menu exists and belongs to company
    const existingSavedMenu = await this.getSavedMenu(id, userCompanyId);

    // Verify new platform belongs to same company if changed
    if (updateSavedMenuDto.platformId && updateSavedMenuDto.platformId !== existingSavedMenu.platformId) {
      const platform = await this.prisma.platformMenu.findFirst({
        where: {
          id: updateSavedMenuDto.platformId,
          companyId: existingSavedMenu.companyId,
          deletedAt: null
        }
      });

      if (!platform) {
        throw new NotFoundException('Platform not found or does not belong to your company');
      }
    }

    return this.prisma.savedMenu.update({
      where: { id },
      data: {
        ...updateSavedMenuDto,
        updatedBy: userId
      },
      include: {
        company: {
          select: { id: true, name: true, slug: true }
        },
        platform: {
          select: { id: true, name: true, platformType: true }
        },
        creator: {
          select: { id: true, name: true, email: true }
        }
      }
    });
  }

  // Delete saved menu with company isolation (soft deletion)
  async deleteSavedMenu(id: string, userCompanyId?: string, userId?: string) {
    // Verify saved menu exists and belongs to company
    const savedMenu = await this.getSavedMenu(id, userCompanyId);

    // Soft delete the saved menu
    const deletedSavedMenu = await this.prisma.savedMenu.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        updatedAt: new Date(),
        updatedBy: userId
      },
    });

    // Soft delete all saved menu items (cascade soft deletion)
    await this.prisma.savedMenuItem.updateMany({
      where: {
        savedMenuId: id,
      },
      data: {
        updatedAt: new Date(),
      },
    });

    return { message: 'Saved menu deleted successfully' };
  }

  // Add products to saved menu
  async addProductsToSavedMenu(
    savedMenuId: string,
    addProductsDto: AddProductsToSavedMenuDto,
    userCompanyId?: string
  ) {
    const { productIds } = addProductsDto;

    // Verify saved menu exists and belongs to company
    const savedMenu = await this.getSavedMenu(savedMenuId, userCompanyId);

    // Verify products belong to the same company
    const products = await this.prisma.menuProduct.findMany({
      where: {
        id: { in: productIds },
        companyId: savedMenu.companyId,
        deletedAt: null
      }
    });

    if (products.length !== productIds.length) {
      throw new NotFoundException('One or more products not found or do not belong to your company');
    }

    // Get existing items to avoid duplicates
    const existingItems = await this.prisma.savedMenuItem.findMany({
      where: {
        savedMenuId,
        productId: { in: productIds }
      }
    });

    const existingProductIds = existingItems.map(item => item.productId);
    const newProductIds = productIds.filter(id => !existingProductIds.includes(id));

    if (newProductIds.length === 0) {
      throw new BadRequestException('All products are already in the saved menu');
    }

    // Get the highest display order
    const highestOrder = await this.prisma.savedMenuItem.aggregate({
      where: { savedMenuId },
      _max: { displayOrder: true }
    });

    const startOrder = (highestOrder._max.displayOrder || 0) + 1;

    // Create new saved menu items
    const newItems = newProductIds.map((productId, index) => ({
      savedMenuId,
      productId,
      displayOrder: startOrder + index,
      isActive: true
    }));

    await this.prisma.savedMenuItem.createMany({
      data: newItems
    });

    // Update product count
    await this.updateProductCount(savedMenuId);

    return {
      message: `Added ${newProductIds.length} products to saved menu`,
      addedCount: newProductIds.length,
      skippedCount: existingProductIds.length
    };
  }

  // Remove products from saved menu
  async removeProductsFromSavedMenu(
    savedMenuId: string,
    removeProductsDto: RemoveProductsFromSavedMenuDto,
    userCompanyId?: string
  ) {
    const { productIds } = removeProductsDto;

    // Verify saved menu exists and belongs to company
    await this.getSavedMenu(savedMenuId, userCompanyId);

    // Remove saved menu items
    const result = await this.prisma.savedMenuItem.deleteMany({
      where: {
        savedMenuId,
        productId: { in: productIds }
      }
    });

    // Update product count
    await this.updateProductCount(savedMenuId);

    return {
      message: `Removed ${result.count} products from saved menu`,
      removedCount: result.count
    };
  }

  // Update saved menu items (reorder, update notes, etc.)
  async updateSavedMenuItems(
    savedMenuId: string,
    updateItemsDto: UpdateSavedMenuItemsDto,
    userCompanyId?: string
  ) {
    const { items } = updateItemsDto;

    // Verify saved menu exists and belongs to company
    await this.getSavedMenu(savedMenuId, userCompanyId);

    // Update items in a transaction
    await this.prisma.$transaction(
      items.map(item =>
        this.prisma.savedMenuItem.upsert({
          where: {
            savedMenuId_productId: {
              savedMenuId,
              productId: item.productId
            }
          },
          create: {
            savedMenuId,
            productId: item.productId,
            displayOrder: item.displayOrder || 0,
            notes: item.notes,
            isActive: true
          },
          update: {
            displayOrder: item.displayOrder,
            notes: item.notes,
            updatedAt: new Date()
          }
        })
      )
    );

    return { message: 'Saved menu items updated successfully' };
  }

  // Helper method to update product count
  private async updateProductCount(savedMenuId: string) {
    const count = await this.prisma.savedMenuItem.count({
      where: { savedMenuId }
    });

    await this.prisma.savedMenu.update({
      where: { id: savedMenuId },
      data: { productCount: count }
    });

    return count;
  }

  // Get saved menu statistics
  async getSavedMenuStats(userCompanyId?: string) {
    const where = userCompanyId ? { companyId: userCompanyId, deletedAt: null } : { deletedAt: null };

    const [totalMenus, activeMenus, draftMenus, avgProductCount] = await Promise.all([
      this.prisma.savedMenu.count({ where }),
      this.prisma.savedMenu.count({ where: { ...where, status: 'active' } }),
      this.prisma.savedMenu.count({ where: { ...where, status: 'draft' } }),
      this.prisma.savedMenu.aggregate({
        where,
        _avg: { productCount: true }
      })
    ]);

    return {
      totalMenus,
      activeMenus,
      draftMenus,
      archivedMenus: totalMenus - activeMenus - draftMenus,
      avgProductCount: avgProductCount._avg.productCount || 0
    };
  }
}