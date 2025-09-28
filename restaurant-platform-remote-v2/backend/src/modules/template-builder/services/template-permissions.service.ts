import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class TemplatePermissionsService {
  constructor(private readonly prisma: PrismaService) {}

  async hasPermission(templateId: string, userRole: string, action: string): Promise<boolean> {
    // Super admin has all permissions
    if (userRole === 'super_admin') return true;

    const permission = await this.prisma.templateBuilderPermission.findUnique({
      where: {
        templateId_role: {
          templateId,
          role: userRole,
        },
      },
    });

    if (!permission) {
      return this.getDefaultPermission(userRole, action);
    }

    return (permission.permissions as any)[action] === true;
  }

  async canSetDefault(userRole: string, companyId: string, branchId?: string): Promise<boolean> {
    // Only company owners and super admins can set company-wide defaults
    if (!branchId) {
      return userRole === 'super_admin' || userRole === 'company_owner';
    }

    // Branch managers can set branch-specific defaults
    return ['super_admin', 'company_owner', 'branch_manager'].includes(userRole);
  }

  async setupDefaultPermissions(templateId: string, tx?: any) {
    const prisma = tx || this.prisma;

    const defaultPermissions = [
      {
        templateId,
        role: 'super_admin',
        permissions: {
          read: true,
          write: true,
          delete: true,
          test_print: true,
          export: true,
          share: true,
          duplicate: true,
          publish: true,
        },
      },
      {
        templateId,
        role: 'company_owner',
        permissions: {
          read: true,
          write: true,
          delete: true,
          test_print: true,
          export: true,
          share: true,
          duplicate: true,
          publish: false,
        },
      },
      {
        templateId,
        role: 'branch_manager',
        permissions: {
          read: true,
          write: true,
          delete: false,
          test_print: true,
          export: false,
          share: false,
          duplicate: true,
          publish: false,
        },
      },
      {
        templateId,
        role: 'cashier',
        permissions: {
          read: true,
          write: false,
          delete: false,
          test_print: true,
          export: false,
          share: false,
          duplicate: false,
          publish: false,
        },
      },
      {
        templateId,
        role: 'call_center',
        permissions: {
          read: true,
          write: false,
          delete: false,
          test_print: true,
          export: false,
          share: false,
          duplicate: false,
          publish: false,
        },
      },
    ];

    await prisma.templateBuilderPermission.createMany({
      data: defaultPermissions,
      skipDuplicates: true,
    });
  }

  private getDefaultPermission(userRole: string, action: string): boolean {
    const defaultPermissions = {
      super_admin: ['read', 'write', 'delete', 'test_print', 'export', 'share', 'duplicate', 'publish'],
      company_owner: ['read', 'write', 'delete', 'test_print', 'export', 'share', 'duplicate'],
      branch_manager: ['read', 'write', 'test_print', 'duplicate'],
      cashier: ['read', 'test_print'],
      call_center: ['read', 'test_print'],
    };

    return defaultPermissions[userRole]?.includes(action) || false;
  }
}