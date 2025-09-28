import { Injectable, NotFoundException, ForbiddenException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import * as bcrypt from 'bcryptjs';
import { BaseService } from '../../common/services/base.service';

@Injectable()
export class UsersService extends BaseService<any> {
  constructor(prisma: PrismaService) {
    super(prisma, 'User');
  }

  /**
   * Check if current user can perform action on target user based on role hierarchy
   */
  private canManageUser(currentUser: any, targetUser: any, action: 'create' | 'read' | 'update' | 'delete'): boolean {
    // Super admin can manage everyone
    if (currentUser.role === 'super_admin') {
      return true;
    }

    // Users must be in the same company
    if (currentUser.companyId !== targetUser.companyId) {
      return false;
    }

    // Role hierarchy permissions
    const roleHierarchy = {
      'super_admin': 5,
      'company_owner': 4, 
      'branch_manager': 3,
      'call_center': 2,
      'cashier': 1
    };

    const currentUserLevel = roleHierarchy[currentUser.role] || 0;
    const targetUserLevel = roleHierarchy[targetUser.role] || 0;

    // Define what roles each level can manage
    switch (currentUser.role) {
      case 'company_owner':
        // Company owner can manage: branch_manager, call_center, cashier
        return ['branch_manager', 'call_center', 'cashier'].includes(targetUser.role);
      
      case 'branch_manager':
        // Branch manager can manage: call_center, cashier
        return ['call_center', 'cashier'].includes(targetUser.role);
      
      case 'call_center':
      case 'cashier':
        // Call center and cashier cannot manage other users
        return false;
      
      default:
        return false;
    }
  }

  /**
   * Get available roles that current user can assign
   */
  private getManageableRoles(currentUser: any): string[] {
    switch (currentUser.role) {
      case 'super_admin':
        return ['super_admin', 'company_owner', 'branch_manager', 'call_center', 'cashier'];
      case 'company_owner':
        return ['branch_manager', 'call_center', 'cashier'];
      case 'branch_manager':
        return ['call_center', 'cashier'];
      default:
        return [];
    }
  }

  async findAll(currentUser: any, page: number = 1, limit: number = 10) {
    try {
      const { skip, take: limitNum, pageNum } = this.buildPaginationParams(page, limit);
      
      // Build where clause with company filtering and soft delete
      const where = this.buildBaseWhereClause(currentUser);

      // Add role-based filtering - only show users that current user can manage
      if (currentUser.role !== 'super_admin') {
        const manageableRoles = this.getManageableRoles(currentUser);
        if (manageableRoles.length > 0) {
          where.role = { in: manageableRoles };
        } else {
          // If user can't manage anyone, return empty result
          return {
            users: [],
            pagination: {
              total: 0,
              page: pageNum,
              limit: limitNum,
              pages: 0,
            },
          };
        }
      }

      const [users, total] = await Promise.all([
        this.prisma.user.findMany({
          where,
          include: {
            company: {
              select: {
                id: true,
                name: true,
              },
            },
            branch: {
              select: {
                id: true,
                name: true,
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
          skip: skip,
          take: limitNum,
        }),
        this.prisma.user.count({ where }),
      ]);

      // Remove sensitive fields and add isActive field, and add canManage flag
      const sanitizedUsers = users.map(user => {
        const { passwordHash, pin, ...safeUser } = user;
        return {
          ...safeUser,
          isActive: user.status === 'active',
          canManage: this.canManageUser(currentUser, user, 'update'),
          canDelete: this.canManageUser(currentUser, user, 'delete'),
        };
      });

      return {
        users: sanitizedUsers,
        pagination: {
          total,
          page: pageNum,
          limit: limitNum,
          pages: Math.ceil(total / limitNum),
        },
      };
    } catch (error) {
      console.error('Error in findAll users:', error);
      throw error;
    }
  }

  async create(createUserDto: any, currentUser: any) {
    try {
      // Check if current user can create users with the requested role
      const manageableRoles = this.getManageableRoles(currentUser);
      if (!manageableRoles.includes(createUserDto.role)) {
        throw new ForbiddenException(`You cannot create users with role: ${createUserDto.role}`);
      }

      // Check if email already exists
      if (createUserDto.email) {
        const existingUser = await this.prisma.user.findUnique({
          where: { email: createUserDto.email },
        });
        if (existingUser) {
          throw new ConflictException('User with this email already exists');
        }
      }

      // Check if username already exists (if provided)
      if (createUserDto.username) {
        const existingUser = await this.prisma.user.findUnique({
          where: { username: createUserDto.username },
        });
        if (existingUser) {
          throw new ConflictException('User with this username already exists');
        }
      }

      // Hash password from form data
      const password = createUserDto.password || 'password123'; // Fallback to default if not provided
      const hashedPassword = await bcrypt.hash(password, 10);

      // Determine company ID
      let companyId = currentUser.companyId;
      if (currentUser.role === 'super_admin' && createUserDto.companyId) {
        companyId = createUserDto.companyId;
      }

      const userData = {
        name: createUserDto.name || `${createUserDto.firstName || ''} ${createUserDto.lastName || ''}`.trim(),
        firstName: createUserDto.firstName,
        lastName: createUserDto.lastName,
        email: createUserDto.email,
        username: createUserDto.username,
        phone: createUserDto.phone,
        passwordHash: hashedPassword,
        role: createUserDto.role,
        status: createUserDto.status || 'active',
        companyId,
        branchId: createUserDto.branchId || null,
        createdBy: currentUser.id,
      };

      const newUser = await this.prisma.user.create({
        data: userData,
        include: {
          company: {
            select: {
              id: true,
              name: true,
            },
          },
          branch: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      // Remove sensitive fields and add isActive field
      const { passwordHash, pin, ...safeUser } = newUser;
      return { 
        user: {
          ...safeUser,
          isActive: newUser.status === 'active',
        }
      };
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  }

  async findOne(id: string, currentUser?: any) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        company: {
          select: {
            id: true,
            name: true,
          },
        },
        branch: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Check if user has access (same company or self)
    if (currentUser && user.companyId !== currentUser.companyId && user.id !== currentUser.id) {
      throw new ForbiddenException('Access denied');
    }

    // Remove sensitive fields and add isActive field
    const { passwordHash, pin, ...safeUser } = user;
    return { 
      user: {
        ...safeUser,
        isActive: user.status === 'active',
      }
    };
  }

  async update(id: string, updateUserDto: any, currentUser: any) {
    const existingUser = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!existingUser) {
      throw new NotFoundException('User not found');
    }

    // Check if current user can manage this user
    if (!this.canManageUser(currentUser, existingUser, 'update')) {
      throw new ForbiddenException('You do not have permission to update this user');
    }

    // If role is being changed, check if current user can assign the new role
    if (updateUserDto.role && updateUserDto.role !== existingUser.role) {
      const manageableRoles = this.getManageableRoles(currentUser);
      if (!manageableRoles.includes(updateUserDto.role)) {
        throw new ForbiddenException(`You cannot assign role: ${updateUserDto.role}`);
      }
    }

    // If company is being changed, check if current user can do this
    if (updateUserDto.companyId && updateUserDto.companyId !== existingUser.companyId) {
      if (currentUser.role !== 'super_admin') {
        throw new ForbiddenException('Only super admin can change user company');
      }
      // Verify that the new company exists
      const companyExists = await this.prisma.company.findUnique({
        where: { id: updateUserDto.companyId }
      });
      if (!companyExists) {
        throw new NotFoundException('Target company not found');
      }
    }

    // Process the update data like we do in create
    const updateData: any = {
      name: updateUserDto.name || `${updateUserDto.firstName || ''} ${updateUserDto.lastName || ''}`.trim(),
      firstName: updateUserDto.firstName,
      lastName: updateUserDto.lastName,
      phone: updateUserDto.phone,
      role: updateUserDto.role,
      status: updateUserDto.status || 'active',
      updatedBy: currentUser.id,
      updatedAt: new Date(),
    };

    // Handle company change for super_admin
    if (currentUser.role === 'super_admin' && updateUserDto.companyId) {
      updateData.companyId = updateUserDto.companyId;
    }

    // Hash password if provided
    if (updateUserDto.password) {
      const hashedPassword = await bcrypt.hash(updateUserDto.password, 10);
      updateData.passwordHash = hashedPassword;
    }

    const updatedUser = await this.prisma.user.update({
      where: { id },
      data: updateData,
      include: {
        company: {
          select: {
            id: true,
            name: true,
          },
        },
        branch: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // Remove sensitive fields and add isActive field
    const { passwordHash, pin, ...safeUser } = updatedUser;
    return { 
      user: {
        ...safeUser,
        isActive: updatedUser.status === 'active',
      }
    };
  }

  async remove(id: string, currentUser: any) {
    const existingUser = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!existingUser) {
      throw new NotFoundException('User not found');
    }

    // Check if current user can delete this user
    if (!this.canManageUser(currentUser, existingUser, 'delete')) {
      throw new ForbiddenException('You do not have permission to delete this user');
    }

    // Prevent users from deleting themselves
    if (existingUser.id === currentUser.id) {
      throw new ForbiddenException('You cannot delete your own account');
    }

    // Soft delete
    await this.prisma.user.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        updatedBy: currentUser.id,
        updatedAt: new Date(),
      },
    });

    return { message: 'User deleted successfully' };
  }

  /**
   * Get roles that the current user can manage (for frontend dropdown)
   */
  async getAvailableRoles(currentUser: any) {
    const manageableRoles = this.getManageableRoles(currentUser);
    
    const roleLabels = {
      'super_admin': 'Super Admin',
      'company_owner': 'Company Owner', 
      'branch_manager': 'Manager',
      'call_center': 'Call Center',
      'cashier': 'Cashier'
    };

    return manageableRoles.map(role => ({
      value: role,
      label: roleLabels[role] || role
    }));
  }
}