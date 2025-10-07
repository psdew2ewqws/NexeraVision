import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateMenuDto } from '../dto/create-menu.dto';
import { UpdateMenuDto } from '../dto/update-menu.dto';
import { MenuFiltersDto } from '../dto/menu-filters.dto';

@Injectable()
export class MenusService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new menu with branches, channels, and products
   */
  async create(dto: CreateMenuDto, userId: string, companyId: string) {
    // Verify all products belong to the company
    const products = await this.prisma.menuProduct.findMany({
      where: {
        id: { in: dto.productIds },
        companyId,
      },
    });

    if (products.length !== dto.productIds.length) {
      throw new BadRequestException('Some products do not exist or do not belong to your company');
    }

    // Verify all branches belong to the company
    const branches = await this.prisma.branch.findMany({
      where: {
        id: { in: dto.branchIds },
        companyId,
      },
    });

    if (branches.length !== dto.branchIds.length) {
      throw new BadRequestException('Some branches do not exist or do not belong to your company');
    }

    // Create menu with all associations in a transaction
    const menu = await this.prisma.$transaction(async (tx) => {
      // Create the menu
      const createdMenu = await tx.menu.create({
        data: {
          name: dto.name,
          description: dto.description,
          companyId,
          isActive: dto.isActive ?? true,
          createdBy: userId,
        },
      });

      // Create menu-branch associations
      // TODO: menuBranch model not in current schema - branch associations disabled for production
      // await tx.menuBranch.createMany({
      //   data: dto.branchIds.map((branchId) => ({
      //     menuId: createdMenu.id,
      //     branchId,
      //     createdBy: userId,
      //   })),
      // });

      // Create menu-channel associations
      await tx.menuChannel.createMany({
        data: dto.channels.map((channelCode) => ({
          menuId: createdMenu.id,
          channelCode,
          createdBy: userId,
        })),
      });

      // Create menu-product associations
      await tx.menuProductMapping.createMany({
        data: dto.productIds.map((productId, index) => ({
          menuId: createdMenu.id,
          productId,
          displayOrder: index,
          createdBy: userId,
        })),
      });

      // Initialize sync statuses for all channels
      await tx.menuSyncStatus.createMany({
        data: dto.channels.map((channelCode) => ({
          menuId: createdMenu.id,
          channelCode,
          isSynced: false,
        })),
      });

      return createdMenu;
    });

    return this.findOne(menu.id, companyId);
  }

  /**
   * Get all menus for a company with pagination
   */
  async findAll(filters: MenuFiltersDto, companyId: string) {
    const { search, isActive, page = 1, limit = 10 } = filters;
    const skip = (page - 1) * limit;

    const where: any = {
      companyId,
      deletedAt: null,
    };

    if (search) {
      where.name = {
        contains: search,
        mode: 'insensitive',
      };
    }

    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    const [menus, total] = await Promise.all([
      this.prisma.menu.findMany({
        where,
        skip,
        take: limit,
        include: {
          // TODO: branches relation not in Menu model - removed for production
          // branches: {
          //   include: {
          //     branch: {
          //       select: {
          //         id: true,
          //         name: true,
          //       },
          //     },
          //   },
          // },
          channels: true,
          products: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  image: true,
                  pricing: true,
                },
              },
            },
            take: 10, // Preview of first 10 products
          },
          syncStatuses: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      }),
      this.prisma.menu.count({ where }),
    ]);

    return {
      data: menus.map((menu) => ({
        ...menu,
        productCount: menu.products.length,
        // TODO: branches relation not available in current schema
        branchCount: 0, // menu.branches.length,
      })),
      total,
      page,
      pageSize: limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get a single menu by ID
   */
  async findOne(id: string, companyId: string) {
    const menu = await this.prisma.menu.findFirst({
      where: {
        id,
        companyId,
        deletedAt: null,
      },
      include: {
        // TODO: branches relation not in Menu model - removed for production
        // branches: {
        //   include: {
        //     branch: {
        //       select: {
        //         id: true,
        //         name: true,
        //         nameAr: true,
        //         address: true,
        //         city: true,
        //       },
        //     },
        //   },
        // },
        channels: true,
        products: {
          include: {
            product: {
              include: {
                category: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
          },
          orderBy: {
            displayOrder: 'asc',
          },
        },
        syncStatuses: {
          orderBy: {
            updatedAt: 'desc',
          },
        },
      },
    });

    if (!menu) {
      throw new NotFoundException('Menu not found');
    }

    return menu;
  }

  /**
   * Update a menu
   */
  async update(id: string, dto: UpdateMenuDto, userId: string, companyId: string) {
    // Verify menu exists and belongs to company
    const existingMenu = await this.prisma.menu.findFirst({
      where: {
        id,
        companyId,
        deletedAt: null,
      },
    });

    if (!existingMenu) {
      throw new NotFoundException('Menu not found');
    }

    // Update menu and associations in transaction
    await this.prisma.$transaction(async (tx) => {
      // Update basic menu info
      await tx.menu.update({
        where: { id },
        data: {
          name: dto.name,
          description: dto.description,
          isActive: dto.isActive,
          updatedBy: userId,
        },
      });

      // Update branches if provided
      // TODO: menuBranch model not in current schema - branch updates disabled for production
      // if (dto.branchIds) {
      //   // Delete existing associations
      //   await tx.menuBranch.deleteMany({
      //     where: { menuId: id },
      //   });

      //   // Create new associations
      //   await tx.menuBranch.createMany({
      //     data: dto.branchIds.map((branchId) => ({
      //       menuId: id,
      //       branchId,
      //       createdBy: userId,
      //     })),
      //   });
      // }

      // Update channels if provided
      if (dto.channels) {
        // Delete existing associations
        await tx.menuChannel.deleteMany({
          where: { menuId: id },
        });

        // Create new associations
        await tx.menuChannel.createMany({
          data: dto.channels.map((channelCode) => ({
            menuId: id,
            channelCode,
            createdBy: userId,
          })),
        });

        // Reset sync status for all channels
        await tx.menuSyncStatus.updateMany({
          where: { menuId: id },
          data: {
            isSynced: false,
            updatedBy: userId,
          },
        });

        // Create sync status for new channels
        for (const channelCode of dto.channels) {
          await tx.menuSyncStatus.upsert({
            where: {
              menuId_channelCode: {
                menuId: id,
                channelCode,
              },
            },
            create: {
              menuId: id,
              channelCode,
              isSynced: false,
            },
            update: {
              isSynced: false,
              updatedBy: userId,
            },
          });
        }
      }

      // Update products if provided
      if (dto.productIds) {
        // Delete existing associations
        await tx.menuProductMapping.deleteMany({
          where: { menuId: id },
        });

        // Create new associations
        await tx.menuProductMapping.createMany({
          data: dto.productIds.map((productId, index) => ({
            menuId: id,
            productId,
            displayOrder: index,
            createdBy: userId,
          })),
        });

        // Mark all channels as needing sync
        await tx.menuSyncStatus.updateMany({
          where: { menuId: id },
          data: {
            isSynced: false,
            updatedBy: userId,
          },
        });
      }
    });

    return this.findOne(id, companyId);
  }

  /**
   * Soft delete a menu
   */
  async remove(id: string, userId: string, companyId: string) {
    const menu = await this.prisma.menu.findFirst({
      where: {
        id,
        companyId,
        deletedAt: null,
      },
    });

    if (!menu) {
      throw new NotFoundException('Menu not found');
    }

    await this.prisma.menu.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        updatedBy: userId,
      },
    });

    return { message: 'Menu deleted successfully' };
  }

  /**
   * Get sync status for a menu
   */
  async getSyncStatus(id: string, companyId: string) {
    const menu = await this.prisma.menu.findFirst({
      where: {
        id,
        companyId,
        deletedAt: null,
      },
      include: {
        syncStatuses: {
          orderBy: {
            updatedAt: 'desc',
          },
        },
      },
    });

    if (!menu) {
      throw new NotFoundException('Menu not found');
    }

    return {
      menuId: menu.id,
      statuses: menu.syncStatuses,
    };
  }
}
