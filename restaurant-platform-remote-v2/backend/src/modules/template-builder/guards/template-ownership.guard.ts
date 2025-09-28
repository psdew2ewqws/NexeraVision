import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class TemplateOwnershipGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const { user } = request;
    const templateId = request.params.id;

    if (!templateId || !user) {
      return false;
    }

    // Super admin can access all templates
    if (user.role === 'super_admin') {
      return true;
    }

    // Check if template belongs to user's company
    const template = await this.prisma.templateBuilderTemplate.findUnique({
      where: { id: templateId },
      select: { companyId: true, branchId: true },
    });

    if (!template || template.companyId !== user.companyId) {
      return false;
    }

    // Branch-level access control
    if (user.role === 'branch_manager' || user.role === 'cashier') {
      if (template.branchId && template.branchId !== user.branchId) {
        return false;
      }
    }

    return true;
  }
}