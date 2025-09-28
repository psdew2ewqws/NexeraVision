import { Injectable, CanActivate, ExecutionContext, Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  private readonly logger = new Logger(RolesGuard.name);
  
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const method = request.method;
    const url = request.url;
    
    this.logger.debug(`[ROLES-GUARD] ${method} ${url} - Checking role authorization`);
    
    // Check if the route is marked as public (fixed for v2)
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    
    this.logger.debug(`[ROLES-GUARD] ${method} ${url} - Is public: ${isPublic}`);
    
    if (isPublic) {
      this.logger.debug(`[ROLES-GUARD] ${method} ${url} - Public endpoint, bypassing role check`);
      return true;
    }
    
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    
    this.logger.debug(`[ROLES-GUARD] ${method} ${url} - Required roles: ${requiredRoles?.join(', ') || 'None'}`);
    
    if (!requiredRoles) {
      this.logger.debug(`[ROLES-GUARD] ${method} ${url} - No role requirements, allowing access`);
      return true;
    }
    
    const { user } = request;
    const userRole = user?.role;
    const hasPermission = requiredRoles.some((role) => userRole === role);
    
    this.logger.debug(`[ROLES-GUARD] ${method} ${url} - User role: ${userRole}, Has permission: ${hasPermission}`);
    
    return hasPermission;
  }
}