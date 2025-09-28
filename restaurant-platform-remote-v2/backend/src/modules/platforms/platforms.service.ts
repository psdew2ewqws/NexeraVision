import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { BaseService, BaseEntity, BaseUser } from '../../common/services/base.service';

interface PlatformEntity extends BaseEntity {
  companyId: string;
  name: string;
  status: number;
}

interface PlatformFiltersDto {
  search?: string;
  status?: number;
  platformType?: string;
  companyId?: string;
}

interface CreatePlatformDto {
  name: string;
  displayName: { en: string; ar?: string };
  platformType: string;
  configuration?: any;
  companyId?: string;
}

interface UpdatePlatformDto {
  name?: string;
  displayName?: { en: string; ar?: string };
  platformType?: string;
  configuration?: any;
  status?: number;
}

interface BulkAssignProductsDto {
  productIds: string[];
  platformIds: string[];
  action: 'assign' | 'unassign';
}

@Injectable()
export class PlatformsService extends BaseService<PlatformEntity> {
  constructor(protected readonly prisma: PrismaService) {
    super(prisma, 'platform');
  }

  // Get platforms with proper role-based filtering
  async getPlatforms(user: BaseUser, filters?: PlatformFiltersDto) {
    const whereClause = this.buildSecureWhereClause(user, {
      ...(filters?.status && { status: filters.status }),
      ...(filters?.platformType && { platformType: filters.platformType }),
      ...(filters?.search && {
        OR: [
          {
            name: {
              path: ['en'],
              string_contains: filters.search
            }
          },
          {
            name: {
              path: ['ar'],
              string_contains: filters.search
            }
          }
        ]
      })
    });

    const platforms = await this.prisma.platformMenu.findMany({
      where: {
        ...whereClause,
        deletedAt: null
      },
      include: {
        _count: {
          select: {
            items: {
              where: { isAvailable: true }
            }
          }
        },
        ...(user.role === 'super_admin' && {
          company: {
            select: {
              id: true,
              name: true,
              businessType: true
            }
          }
        })
      },
      orderBy: [
        { priority: 'desc' },
        { createdAt: 'asc' }
      ]
    });

    return {
      platforms,
      totalCount: platforms.length,
      permissions: {
        canCreate: this.canUserCreatePlatforms(user),
        canEdit: this.canUserEditPlatforms(user),
        canDelete: this.canUserDeletePlatforms(user)
      }
    };
  }

  // Create new platform
  async createPlatform(createDto: CreatePlatformDto, user: BaseUser) {
    if (!this.canUserCreatePlatforms(user)) {
      throw new ForbiddenException('Insufficient permissions to create platforms');
    }

    // Determine target company
    const targetCompanyId = user.role === 'super_admin' ?
      (createDto.companyId || user.companyId) : user.companyId;

    if (!targetCompanyId) {
      throw new BadRequestException('Company ID is required');
    }

    // Check for duplicate platform type within company
    const existingPlatform = await this.prisma.platformMenu.findFirst({
      where: {
        companyId: targetCompanyId,
        platformType: createDto.platformType,
        deletedAt: null
      }
    });

    if (existingPlatform) {
      throw new BadRequestException('Platform type already exists in this company');
    }

    const platform = await this.prisma.platformMenu.create({
      data: {
        id: `plat-${Date.now()}`,
        companyId: targetCompanyId,
        platformType: createDto.platformType,
        name: createDto.displayName,
        description: createDto.displayName,
        isActive: true,
        status: 'active',
        createdBy: user.id,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      include: {
        _count: {
          select: {
            items: true
          }
        }
      }
    });

    return platform;
  }

  // Update platform
  async updatePlatform(id: string, updateDto: UpdatePlatformDto, user: BaseUser) {
    const platform = await this.findEntityWithAccess(id, user);

    if (!this.canUserEditPlatforms(user)) {
      throw new ForbiddenException('Insufficient permissions to edit platforms');
    }

    // Check name uniqueness if name is being changed
    if (updateDto.name && JSON.stringify(updateDto.name) !== JSON.stringify(platform.name)) {
      const existingPlatform = await this.prisma.platformMenu.findFirst({
        where: {
          companyId: platform.companyId,
          name: { equals: updateDto.name },
          id: { not: id }
        }
      });

      if (existingPlatform) {
        throw new BadRequestException('Platform name already exists in this company');
      }
    }

    const updatedPlatform = await this.prisma.platformMenu.update({
      where: { id },
      data: {
        ...updateDto,
        ...(updateDto.status !== undefined && { status: updateDto.status.toString() }),
        updatedBy: user.id,
        updatedAt: new Date()
      },
      include: {
        _count: {
          select: {
            items: true
          }
        }
      }
    });

    return updatedPlatform;
  }

  // Delete platform
  async deletePlatform(id: string, user: BaseUser) {
    const platform = await this.findEntityWithAccess(id, user);

    if (!this.canUserDeletePlatforms(user)) {
      throw new ForbiddenException('Insufficient permissions to delete platforms');
    }

    // Check if platform has active assignments
    const assignmentCount = await this.prisma.platformMenuItem.count({
      where: {
        platformMenuId: id,
        isAvailable: true
      }
    });

    if (assignmentCount > 0) {
      throw new BadRequestException('Cannot delete platform with active product assignments');
    }

    await this.prisma.platformMenu.delete({
      where: { id }
    });

    return { success: true, message: 'Platform deleted successfully' };
  }

  // Bulk assign/unassign products to platforms
  async bulkAssignProducts(assignmentDto: BulkAssignProductsDto, user: BaseUser) {
    if (!this.canUserEditPlatforms(user)) {
      throw new ForbiddenException('Insufficient permissions to manage product assignments');
    }

    const { productIds, platformIds, action } = assignmentDto;

    // Verify all platforms belong to user's company (or user is super_admin)
    const platforms = await this.prisma.platformMenu.findMany({
      where: {
        id: { in: platformIds },
        ...(user.role !== 'super_admin' && { companyId: user.companyId }),
        deletedAt: null
      }
    });

    if (platforms.length !== platformIds.length) {
      throw new ForbiddenException('Access denied to one or more platforms');
    }

    // Verify all products belong to user's company (or user is super_admin)
    const products = await this.prisma.menuProduct.findMany({
      where: {
        id: { in: productIds },
        ...(user.role !== 'super_admin' && { companyId: user.companyId }),
        deletedAt: null
      }
    });

    if (products.length !== productIds.length) {
      throw new ForbiddenException('Access denied to one or more products');
    }

    if (action === 'assign') {
      // Create assignments (upsert to handle duplicates)
      const assignments = [];
      for (const productId of productIds) {
        for (const platformId of platformIds) {
          assignments.push({
            id: `pmi-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            platformMenuId: platformId,
            productId: productId,
            isAvailable: true,
            createdBy: user.id,
            createdAt: new Date(),
            updatedAt: new Date()
          });
        }
      }

      await this.prisma.$transaction(
        assignments.map(assignment =>
          this.prisma.platformMenuItem.upsert({
            where: {
              platformMenuId_productId: {
                platformMenuId: assignment.platformMenuId,
                productId: assignment.productId
              }
            },
            create: assignment,
            update: {
              isAvailable: true,
              updatedBy: user.id,
              updatedAt: new Date()
            }
          })
        )
      );

      return {
        success: true,
        message: `Successfully assigned ${productIds.length} products to ${platformIds.length} platforms`,
        assignedCount: productIds.length * platformIds.length
      };

    } else {
      // Remove assignments (soft delete)
      await this.prisma.platformMenuItem.updateMany({
        where: {
          productId: { in: productIds },
          platformMenuId: { in: platformIds }
        },
        data: {
          deletedAt: new Date(),
          updatedBy: user.id,
          updatedAt: new Date()
        }
      });

      return {
        success: true,
        message: `Successfully unassigned ${productIds.length} products from ${platformIds.length} platforms`,
        unassignedCount: productIds.length * platformIds.length
      };
    }
  }

  // Get platforms for user (simplified for dropdowns)
  async getPlatformsForUser(user: BaseUser) {
    const whereClause = this.buildSecureWhereClause(user, {
      status: 'active',
      isActive: true,
      deletedAt: null
    });

    const platforms = await this.prisma.platformMenu.findMany({
      where: whereClause,
      select: {
        id: true,
        name: true,
        description: true,
        platformType: true,
        priority: true
      },
      orderBy: [
        { priority: 'desc' },
        { createdAt: 'asc' }
      ]
    });

    return {
      platforms
    };
  }

  // Get product platform assignments
  async getProductAssignments(productIds: string[], user: BaseUser) {
    const assignments = await this.prisma.platformMenuItem.findMany({
      where: {
        productId: { in: productIds },
        deletedAt: null,
        isAvailable: true,
        platformMenu: {
          ...(user.role !== 'super_admin' && { companyId: user.companyId }),
          deletedAt: null
        }
      },
      include: {
        platformMenu: {
          select: {
            id: true,
            name: true,
            description: true,
            platformType: true
          }
        }
      }
    });

    // Group by product ID
    const assignmentsByProduct = assignments.reduce((acc, assignment) => {
      if (!acc[assignment.productId]) {
        acc[assignment.productId] = [];
      }
      acc[assignment.productId].push(assignment);
      return acc;
    }, {} as Record<string, any[]>);

    return {
      assignments: assignmentsByProduct
    };
  }

  // Helper methods for permission checking
  private canUserCreatePlatforms(user: BaseUser): boolean {
    return ['super_admin', 'company_owner'].includes(user.role);
  }

  private canUserEditPlatforms(user: BaseUser): boolean {
    return ['super_admin', 'company_owner', 'branch_manager'].includes(user.role);
  }

  private canUserDeletePlatforms(user: BaseUser): boolean {
    return ['super_admin', 'company_owner'].includes(user.role);
  }

  private buildSecureWhereClause(user: BaseUser, additionalWhere: any = {}) {
    if (user.role === 'super_admin') {
      // Super admin can see all platforms, optionally filtered by company
      return additionalWhere;
    }

    // All other roles see only their company's platforms
    return {
      companyId: user.companyId,
      ...additionalWhere
    };
  }

  private async findEntityWithAccess(id: string, user: BaseUser) {
    const whereClause = this.buildSecureWhereClause(user, {
      id,
      deletedAt: null
    });

    const platform = await this.prisma.platformMenu.findFirst({
      where: whereClause
    });

    if (!platform) {
      throw new NotFoundException('Platform not found or access denied');
    }

    return platform;
  }

  // Get platform menus with item counts (temporary endpoint for frontend)
  async getPlatformMenus(user: BaseUser) {
    const whereClause = this.buildSecureWhereClause(user, { deletedAt: null });

    const platformMenus = await this.prisma.platformMenu.findMany({
      where: whereClause,
      include: {
        items: {
          where: { deletedAt: null },
          select: { id: true, isAvailable: true }
        },
        _count: {
          select: {
            items: {
              where: { deletedAt: null }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Transform to match frontend expectations
    const platforms = platformMenus.map(menu => ({
      id: menu.id,
      name: menu.name,
      displayName: menu.name,
      platformType: menu.platformType,
      status: menu.isActive ? 1 : 0,
      configuration: menu.settings || {},
      isSystemDefault: false,
      sortOrder: menu.priority || 0,
      companyId: menu.companyId,
      _count: {
        productPlatformAssignments: menu._count.items || 0
      }
    }));

    return {
      platforms,
      totalCount: platforms.length,
      permissions: {
        canCreate: this.canUserCreatePlatforms(user),
        canEdit: this.canUserEditPlatforms(user),
        canDelete: this.canUserDeletePlatforms(user)
      }
    };
  }
}