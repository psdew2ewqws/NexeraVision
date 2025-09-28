import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { TemplatePermissionsService } from '../services/template-permissions.service';

@Injectable()
export class TemplatePermissionGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private permissionsService: TemplatePermissionsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermission = this.reflector.get<string>('template-permission', context.getHandler());
    if (!requiredPermission) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const { user } = request;
    const templateId = request.params.id || request.body.templateId;

    if (!templateId || !user) {
      return false;
    }

    return await this.permissionsService.hasPermission(templateId, user.role, requiredPermission);
  }
}