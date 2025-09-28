import { Injectable, ExecutionContext, UnauthorizedException, Logger } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  private readonly logger = new Logger(JwtAuthGuard.name);
  
  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest();
    const method = request.method;
    const url = request.url;
    
    this.logger.debug(`[AUTH-GUARD] ${method} ${url} - Checking authentication`);
    
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    
    this.logger.debug(`[AUTH-GUARD] ${method} ${url} - Is public: ${isPublic}`);
    
    if (isPublic) {
      this.logger.debug(`[AUTH-GUARD] ${method} ${url} - Public endpoint, bypassing authentication`);
      return true;
    }
    
    this.logger.debug(`[AUTH-GUARD] ${method} ${url} - Protected endpoint, checking JWT`);
    return super.canActivate(context);
  }

  handleRequest(err: any, user: any, info: any, context: ExecutionContext) {
    const request = context.switchToHttp().getRequest();
    const method = request.method;
    const url = request.url;
    
    if (err || !user) {
      this.logger.error(`[AUTH-GUARD] ${method} ${url} - Authentication failed: ${err?.message || info?.message || 'No user'}`);
      throw err || new UnauthorizedException('Invalid token');
    }
    
    this.logger.debug(`[AUTH-GUARD] ${method} ${url} - Authentication successful for user: ${user.id}`);
    return user;
  }
}