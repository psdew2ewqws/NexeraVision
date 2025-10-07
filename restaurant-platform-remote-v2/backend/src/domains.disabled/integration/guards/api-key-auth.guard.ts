import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { API_KEY_SCOPES_KEY } from '../decorators/api-key-scopes.decorator';
import * as crypto from 'crypto';

@Injectable()
export class ApiKeyAuthGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const apiKey = this.extractApiKey(request);

    if (!apiKey) {
      throw new UnauthorizedException('API key is required');
    }

    // Validate API key format
    if (!apiKey.startsWith('rp_')) {
      throw new UnauthorizedException('Invalid API key format');
    }

    // Hash the API key for lookup
    const hashedKey = crypto
      .createHash('sha256')
      .update(apiKey)
      .digest('hex');

    // TODO: Implement actual API key validation from database
    // For now, this is a stub that will be implemented in the service
    const apiKeyData = await this.validateApiKey(hashedKey);

    if (!apiKeyData) {
      throw new UnauthorizedException('Invalid API key');
    }

    // Check if API key is active
    if (apiKeyData.status !== 'active') {
      throw new UnauthorizedException('API key is not active');
    }

    // Check expiration
    if (apiKeyData.expiresAt && new Date(apiKeyData.expiresAt) < new Date()) {
      throw new UnauthorizedException('API key has expired');
    }

    // Check rate limit
    const isWithinRateLimit = await this.checkRateLimit(apiKeyData);
    if (!isWithinRateLimit) {
      throw new ForbiddenException('Rate limit exceeded');
    }

    // Verify required scopes
    const requiredScopes = this.reflector.get<string[]>(
      API_KEY_SCOPES_KEY,
      context.getHandler(),
    );

    if (requiredScopes && requiredScopes.length > 0) {
      const hasRequiredScopes = requiredScopes.every((scope) =>
        apiKeyData.scopes.includes(scope),
      );

      if (!hasRequiredScopes) {
        throw new ForbiddenException('Insufficient API key permissions');
      }
    }

    // Attach API key data to request
    request.apiKey = apiKeyData;

    // Log API request (async, don't await)
    this.logApiRequest(apiKeyData, request).catch(() => {});

    return true;
  }

  private extractApiKey(request: any): string | null {
    // Check Authorization header (Bearer token)
    const authHeader = request.headers['authorization'];
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }

    // Check X-API-Key header
    const apiKeyHeader = request.headers['x-api-key'];
    if (apiKeyHeader) {
      return apiKeyHeader;
    }

    return null;
  }

  private async validateApiKey(hashedKey: string): Promise<any> {
    // TODO: Implement database lookup
    // This is a stub - actual implementation will query the database
    // Example:
    // return this.prisma.apiKey.findUnique({
    //   where: { hashedKey },
    //   include: { company: true }
    // });

    // Stub response for development
    return {
      id: 'stub-api-key-id',
      companyId: 'stub-company-id',
      scopes: ['orders:read', 'orders:write', 'webhooks:manage'],
      status: 'active',
      rateLimit: 100,
      expiresAt: null,
    };
  }

  private async checkRateLimit(apiKeyData: any): Promise<boolean> {
    // TODO: Implement Redis-based rate limiting
    // This is a stub - actual implementation will use Redis
    // Example:
    // const key = `rate_limit:${apiKeyData.id}`;
    // const current = await this.redis.incr(key);
    // if (current === 1) {
    //   await this.redis.expire(key, 60); // 1 minute window
    // }
    // return current <= apiKeyData.rateLimit;

    return true; // Stub: always allow for development
  }

  private async logApiRequest(apiKeyData: any, request: any): Promise<void> {
    // TODO: Implement request logging
    // This is a stub - actual implementation will log to database
    console.log(`API Request: ${request.method} ${request.path} - Key: ${apiKeyData.id}`);
  }
}
