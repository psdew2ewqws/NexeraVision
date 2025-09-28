/**
 * Template Access Guard for Multi-Tenant Template Builder
 * Enforces access control based on user roles and company ownership
 */

import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  NotFoundException
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../database/prisma.service';

export enum TemplateAction {
  VIEW = 'view',
  CREATE = 'create',
  EDIT = 'edit',
  DELETE = 'delete',
  SHARE = 'share',
  COPY = 'copy'
}

export interface TemplatePermissions {
  canView: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canShare: boolean;
  canCopy: boolean;
  canViewAll: boolean; // Super admin only
  reason?: string;
}

@Injectable()
export class TemplateAccessGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('Authentication required');
    }

    // Get template ID from params
    const templateId = request.params.id || request.params.templateId;
    const action = this.getActionFromRequest(request);

    // Check permissions
    const permissions = await this.checkTemplateAccess(user, templateId, action);

    if (!this.hasPermission(permissions, action)) {
      throw new ForbiddenException(permissions.reason || 'Access denied');
    }

    return true;
  }

  /**
   * Check template access permissions
   */
  async checkTemplateAccess(
    user: any,
    templateId?: string,
    action: TemplateAction = TemplateAction.VIEW
  ): Promise<TemplatePermissions> {
    // Super admin has full access
    if (user.role === 'super_admin') {
      return {
        canView: true,
        canEdit: true,
        canDelete: true,
        canShare: true,
        canCopy: true,
        canViewAll: true
      };
    }

    // If no template ID (e.g., creating new), check basic permissions
    if (!templateId) {
      return this.getBasicPermissions(user);
    }

    // Get template details
    const template = await this.prisma.templateBuilderTemplate.findUnique({
      where: { id: templateId },
      include: {
        company: true,
        branch: true
      }
    });

    if (!template) {
      throw new NotFoundException('Template not found');
    }

    return this.evaluateTemplatePermissions(user, template);
  }

  /**
   * Evaluate permissions for a specific template
   */
  private evaluateTemplatePermissions(user: any, template: any): TemplatePermissions {
    const isOwner = template.createdBy === user.id;
    const isSameCompany = template.companyId === user.companyId;
    const isSameBranch = template.branchId === user.branchId;

    // Company owner permissions
    if (user.role === 'company_owner' && isSameCompany) {
      return {
        canView: true,
        canEdit: true,
        canDelete: true,
        canShare: true,
        canCopy: true,
        canViewAll: false
      };
    }

    // Branch manager permissions
    if (user.role === 'branch_manager') {
      if (isSameCompany) {
        // Can view all templates in company
        const canEdit = isOwner || isSameBranch || template.isShared;
        return {
          canView: true,
          canEdit,
          canDelete: isOwner,
          canShare: canEdit,
          canCopy: true,
          canViewAll: false
        };
      } else {
        return this.getDeniedPermissions('Not in same company');
      }
    }

    // Call center permissions
    if (user.role === 'call_center') {
      if (isSameCompany) {
        return {
          canView: true,
          canEdit: isOwner,
          canDelete: false,
          canShare: false,
          canCopy: true,
          canViewAll: false
        };
      } else {
        return this.getDeniedPermissions('Not in same company');
      }
    }

    // Cashier permissions (very limited)
    if (user.role === 'cashier') {
      if (isSameCompany && (template.isPublic || isOwner)) {
        return {
          canView: true,
          canEdit: false,
          canDelete: false,
          canShare: false,
          canCopy: false,
          canViewAll: false
        };
      } else {
        return this.getDeniedPermissions('Insufficient permissions');
      }
    }

    return this.getDeniedPermissions('Invalid role');
  }

  /**
   * Get basic permissions for operations without template ID
   */
  private getBasicPermissions(user: any): TemplatePermissions {
    switch (user.role) {
      case 'super_admin':
        return {
          canView: true,
          canEdit: true,
          canDelete: true,
          canShare: true,
          canCopy: true,
          canViewAll: true
        };

      case 'company_owner':
        return {
          canView: true,
          canEdit: true,
          canDelete: true,
          canShare: true,
          canCopy: true,
          canViewAll: false
        };

      case 'branch_manager':
        return {
          canView: true,
          canEdit: true,
          canDelete: true,
          canShare: true,
          canCopy: true,
          canViewAll: false
        };

      case 'call_center':
        return {
          canView: true,
          canEdit: true,
          canDelete: false,
          canShare: false,
          canCopy: true,
          canViewAll: false
        };

      case 'cashier':
        return {
          canView: true,
          canEdit: false,
          canDelete: false,
          canShare: false,
          canCopy: false,
          canViewAll: false
        };

      default:
        return this.getDeniedPermissions('Invalid role');
    }
  }

  /**
   * Get denied permissions with reason
   */
  private getDeniedPermissions(reason: string): TemplatePermissions {
    return {
      canView: false,
      canEdit: false,
      canDelete: false,
      canShare: false,
      canCopy: false,
      canViewAll: false,
      reason
    };
  }

  /**
   * Check if user has specific permission
   */
  private hasPermission(permissions: TemplatePermissions, action: TemplateAction): boolean {
    switch (action) {
      case TemplateAction.VIEW:
        return permissions.canView;
      case TemplateAction.CREATE:
        return permissions.canEdit; // Create requires edit permission
      case TemplateAction.EDIT:
        return permissions.canEdit;
      case TemplateAction.DELETE:
        return permissions.canDelete;
      case TemplateAction.SHARE:
        return permissions.canShare;
      case TemplateAction.COPY:
        return permissions.canCopy;
      default:
        return false;
    }
  }

  /**
   * Determine action from request
   */
  private getActionFromRequest(request: any): TemplateAction {
    const method = request.method.toUpperCase();
    const path = request.url.toLowerCase();

    if (method === 'GET') {
      return TemplateAction.VIEW;
    }

    if (method === 'POST') {
      if (path.includes('copy')) {
        return TemplateAction.COPY;
      }
      if (path.includes('share')) {
        return TemplateAction.SHARE;
      }
      return TemplateAction.CREATE;
    }

    if (method === 'PUT' || method === 'PATCH') {
      return TemplateAction.EDIT;
    }

    if (method === 'DELETE') {
      return TemplateAction.DELETE;
    }

    return TemplateAction.VIEW;
  }

  /**
   * Get templates accessible to user
   */
  async getAccessibleTemplates(
    user: any,
    filters?: {
      companyId?: string;
      branchId?: string;
      isPublic?: boolean;
      createdBy?: string;
    }
  ): Promise<any[]> {
    const whereClause: any = {};

    if (user.role === 'super_admin') {
      // Super admin can see all templates
      if (filters?.companyId) whereClause.companyId = filters.companyId;
      if (filters?.branchId) whereClause.branchId = filters.branchId;
    } else {
      // Regular users can only see templates in their company
      whereClause.companyId = user.companyId;

      if (user.role === 'cashier') {
        // Cashiers can only see public templates or their own
        whereClause.OR = [
          { isPublic: true },
          { createdBy: user.id }
        ];
      } else if (user.role === 'call_center') {
        // Call center can see shared templates or their own
        whereClause.OR = [
          { isShared: true },
          { createdBy: user.id },
          { isPublic: true }
        ];
      } else if (user.role === 'branch_manager') {
        // Branch managers can see templates for their branch or shared ones
        whereClause.OR = [
          { branchId: user.branchId },
          { isShared: true },
          { createdBy: user.id },
          { isPublic: true }
        ];
      }
      // Company owners can see all templates in their company (no additional filters)
    }

    // Apply additional filters
    if (filters?.isPublic !== undefined) {
      whereClause.isPublic = filters.isPublic;
    }
    if (filters?.createdBy) {
      whereClause.createdBy = filters.createdBy;
    }

    return await this.prisma.templateBuilderTemplate.findMany({
      where: whereClause,
      include: {
        company: {
          select: { id: true, name: true }
        },
        branch: {
          select: { id: true, name: true }
        },
      },
      orderBy: {
        updatedAt: 'desc'
      }
    });
  }

  /**
   * Check if user can access company templates
   */
  async canAccessCompanyTemplates(userId: string, companyId: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) return false;

    // Super admin can access any company
    if (user.role === 'super_admin') return true;

    // Others can only access their own company
    return user.companyId === companyId;
  }

  /**
   * Check if user can share templates
   */
  async canShareTemplate(userId: string, templateId: string): Promise<boolean> {
    const permissions = await this.checkTemplateAccess(
      { id: userId },
      templateId,
      TemplateAction.SHARE
    );

    return permissions.canShare;
  }

  /**
   * Get template sharing scope for user
   */
  getSharingScope(user: any): {
    canSharePublic: boolean;
    canShareCompany: boolean;
    canShareBranch: boolean;
  } {
    switch (user.role) {
      case 'super_admin':
      case 'company_owner':
        return {
          canSharePublic: true,
          canShareCompany: true,
          canShareBranch: true
        };

      case 'branch_manager':
        return {
          canSharePublic: false,
          canShareCompany: true,
          canShareBranch: true
        };

      case 'call_center':
        return {
          canSharePublic: false,
          canShareCompany: false,
          canShareBranch: true
        };

      default:
        return {
          canSharePublic: false,
          canShareCompany: false,
          canShareBranch: false
        };
    }
  }
}