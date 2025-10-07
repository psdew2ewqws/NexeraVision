import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../shared/database/prisma.service';
import { CreateBranchDto, UpdateBranchDto } from './dto';
import { BaseService } from '../../shared/common/services/base.service';

@Injectable()
export class BranchesService extends BaseService<any> {
  constructor(prisma: PrismaService) {
    super(prisma, 'Branch');
  }

  async create(createBranchDto: CreateBranchDto, user: any) {
    // For company owners, restrict to their company
    let companyId = user.companyId;
    if (user.role === 'super_admin' && createBranchDto.companyId) {
      companyId = createBranchDto.companyId;
    }

    // Check if this will be the first branch (make it default)
    const existingBranches = await this.prisma.branch.count({
      where: this.buildBaseWhereClause(user, { companyId }),
    });

    const isFirstBranch = existingBranches === 0;

    const branch = await this.prisma.branch.create({
      data: {
        name: createBranchDto.name,
        nameAr: createBranchDto.nameAr,
        phone: createBranchDto.phone,
        email: createBranchDto.email,
        address: createBranchDto.address,
        city: createBranchDto.city,
        country: createBranchDto.country || 'Jordan',
        latitude: createBranchDto.latitude,
        longitude: createBranchDto.longitude,
        openTime: createBranchDto.openTime,
        closeTime: createBranchDto.closeTime,
        isDefault: isFirstBranch,
        isActive: createBranchDto.isActive ?? true,
        allowsOnlineOrders: createBranchDto.allowsOnlineOrders ?? true,
        allowsDelivery: createBranchDto.allowsDelivery ?? true,
        allowsPickup: createBranchDto.allowsPickup ?? true,
        timezone: createBranchDto.timezone || 'Asia/Amman',
        companyId: companyId,
        createdBy: user.id,
      },
      include: {
        company: {
          select: { id: true, name: true },
        },
      },
    });

    return branch;
  }

  async findAll(user: any, filters: { companyId?: string } = {}) {
    let whereClause = this.buildBaseWhereClause(user);
    
    // Add company filter for super_admin
    if (user.role === 'super_admin' && filters.companyId) {
      whereClause = {
        ...whereClause,
        companyId: filters.companyId,
      };
    }

    const branches = await this.prisma.branch.findMany({
      where: whereClause,
      select: {
        id: true,
        name: true,
        nameAr: true,
        phone: true,
        email: true,
        address: true,
        city: true,
        country: true,
        latitude: true,
        longitude: true,
        openTime: true,
        closeTime: true,
        isDefault: true,
        isActive: true,
        allowsOnlineOrders: true,
        allowsDelivery: true,
        allowsPickup: true,
        timezone: true,
        createdAt: true,
        updatedAt: true,
        company: {
          select: { id: true, name: true },
        },
      },
      orderBy: [
        { isDefault: 'desc' },
        { createdAt: 'asc' },
      ],
    });

    return branches;
  }

  async findAllPublic(filters: { companyId?: string } = {}) {
    // Public method for delivery zone creation - shows all active branches
    const whereClause: any = {
      isActive: true, // Only show active branches
    };

    // Optional company filter
    if (filters.companyId) {
      whereClause.companyId = filters.companyId;
    }

    const branches = await this.prisma.branch.findMany({
      where: whereClause,
      select: {
        id: true,
        name: true,
        nameAr: true,
        phone: true,
        email: true,
        address: true,
        city: true,
        country: true,
        latitude: true,
        longitude: true,
        openTime: true,
        closeTime: true,
        isDefault: true,
        isActive: true,
        allowsOnlineOrders: true,
        allowsDelivery: true,
        allowsPickup: true,
        timezone: true,
        createdAt: true,
        updatedAt: true,
        company: {
          select: {
            id: true,
            name: true,
            slug: true,
          }
        }
      },
      orderBy: [
        { isDefault: 'desc' }, // Default branches first
        { name: 'asc' }
      ]
    });

    return branches;
  }

  async findOne(id: string, user: any) {
    const whereClause = this.buildBaseWhereClause(user, { id });

    const branch = await this.prisma.branch.findFirst({
      where: whereClause,
      include: {
        company: {
          select: { id: true, name: true },
        },
      },
    });

    if (!branch) {
      this.throwNotFound('Branch', id);
    }

    return branch;
  }

  async findByUser(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        branch: {
          include: {
            company: {
              select: { id: true, name: true },
            },
          },
        },
      },
    });

    return user?.branch || null;
  }

  async update(id: string, updateBranchDto: UpdateBranchDto, user: any) {
    const existingBranch = await this.findOne(id, user);

    const updatedBranch = await this.prisma.branch.update({
      where: { id },
      data: {
        name: updateBranchDto.name,
        nameAr: updateBranchDto.nameAr,
        phone: updateBranchDto.phone,
        email: updateBranchDto.email,
        address: updateBranchDto.address,
        city: updateBranchDto.city,
        country: updateBranchDto.country,
        latitude: updateBranchDto.latitude,
        longitude: updateBranchDto.longitude,
        openTime: updateBranchDto.openTime,
        closeTime: updateBranchDto.closeTime,
        isActive: updateBranchDto.isActive,
        allowsOnlineOrders: updateBranchDto.allowsOnlineOrders,
        allowsDelivery: updateBranchDto.allowsDelivery,
        allowsPickup: updateBranchDto.allowsPickup,
        timezone: updateBranchDto.timezone,
        updatedBy: user.id,
      },
      include: {
        company: {
          select: { id: true, name: true },
        },
      },
    });

    return updatedBranch;
  }

  async remove(id: string, user: any) {
    const existingBranch = await this.findOne(id, user);

    // Prevent deletion if this is the only branch
    const branchCount = await this.prisma.branch.count({
      where: this.buildBaseWhereClause(user, { companyId: existingBranch.companyId }),
    });

    if (branchCount <= 1) {
      throw new ForbiddenException('Cannot delete the last branch');
    }

    // Soft delete using base service
    await this.softDelete(this.prisma.branch, id, user);
  }

  async getStatistics(id: string, user: any) {
    const branch = await this.findOne(id, user);

    // Get basic statistics for the branch
    const [userCount] = await Promise.all([
      this.prisma.user.count({
        where: this.buildBaseWhereClause(user, { 
          branchId: id, 
          status: 'active' 
        }),
      }),
    ]);

    return {
      id: branch.id,
      name: branch.name,
      userCount,
      isActive: branch.isActive,
      allowsOnlineOrders: branch.allowsOnlineOrders,
      allowsDelivery: branch.allowsDelivery,
      allowsPickup: branch.allowsPickup,
      createdAt: branch.createdAt,
    };
  }
}