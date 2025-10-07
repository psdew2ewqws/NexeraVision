import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';

@Injectable()
export class CompanyGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const { user } = request;
    
    // Skip for super_admin
    if (user?.role === 'super_admin') {
      return true;
    }
    
    // For now, just return true - will implement proper company isolation later
    return true;
  }
}