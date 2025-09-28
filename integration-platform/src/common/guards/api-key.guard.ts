import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Logger,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { PrismaService } from '../../shared/services/prisma.service';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

export interface AuthenticatedRequest extends Request {
  apiKey?: string;
  clientId?: string;
  organization?: any;
  apiKeyRecord?: any;
}

export const REQUIRE_API_KEY = 'require-api-key';
export const API_KEY_SCOPES = 'api-key-scopes';

// Decorator to require API key authentication
export const RequireApiKey = (scopes?: string[]) => {
  return (target: any, propertyKey?: string, descriptor?: PropertyDescriptor) => {
    const reflector = new Reflector();
    if (descriptor) {
      // Method decorator
      reflector.set(REQUIRE_API_KEY, true, descriptor.value);
      if (scopes) {
        reflector.set(API_KEY_SCOPES, scopes, descriptor.value);
      }
    } else {
      // Class decorator
      reflector.set(REQUIRE_API_KEY, true, target);
      if (scopes) {
        reflector.set(API_KEY_SCOPES, scopes, target);
      }
    }
  };
};

@Injectable()
export class ApiKeyGuard implements CanActivate {
  private readonly logger = new Logger(ApiKeyGuard.name);

  constructor(
    private reflector: Reflector,
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isApiKeyRequired = this.reflector.getAllAndOverride<boolean>(
      REQUIRE_API_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!isApiKeyRequired) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const apiKey = this.extractApiKey(request);

    if (!apiKey) {
      this.logger.warn('API key missing from request', {
        ip: request.ip,
        userAgent: request.headers['user-agent'],
        url: request.url,
      });
      throw new UnauthorizedException('API key is required');
    }

    try {
      // Validate API key format
      if (!this.isValidApiKeyFormat(apiKey)) {
        this.logger.warn('Invalid API key format', {
          keyPrefix: apiKey.substring(0, 8) + '...',
          ip: request.ip,
        });
        throw new UnauthorizedException('Invalid API key format');
      }

      // Check against environment variable for system API keys
      const systemApiKey = this.configService.get<string>('SYSTEM_API_KEY');
      if (systemApiKey && apiKey === systemApiKey) {
        request.apiKey = apiKey;
        request.clientId = 'system';
        return true;
      }

      // Hash the API key for database lookup
      const hashedApiKey = this.hashApiKey(apiKey);

      // Find API key in database
      const apiKeyRecord = await this.prisma.apiKey.findUnique({
        where: {
          keyHash: hashedApiKey,
        },
        include: {
          organization: true,
        },
      });

      if (!apiKeyRecord) {
        this.logger.warn('API key not found in database', {
          keyPrefix: apiKey.substring(0, 8) + '...',
          hashedPrefix: hashedApiKey.substring(0, 8) + '...',
          ip: request.ip,
        });
        throw new UnauthorizedException('Invalid API key');
      }

      // Check if API key is active
      if (!apiKeyRecord.isActive) {
        this.logger.warn('Inactive API key used', {
          keyId: apiKeyRecord.id,
          organizationId: apiKeyRecord.organizationId,
          ip: request.ip,
        });
        throw new UnauthorizedException('API key is inactive');
      }

      // Check if API key is expired
      if (apiKeyRecord.expiresAt && apiKeyRecord.expiresAt < new Date()) {
        this.logger.warn('Expired API key used', {
          keyId: apiKeyRecord.id,
          expiresAt: apiKeyRecord.expiresAt,
          organizationId: apiKeyRecord.organizationId,
          ip: request.ip,
        });
        throw new UnauthorizedException('API key has expired');
      }

      // Check rate limits
      if (!(await this.checkRateLimit(apiKeyRecord, request))) {
        this.logger.warn('API key rate limit exceeded', {
          keyId: apiKeyRecord.id,
          organizationId: apiKeyRecord.organizationId,
          ip: request.ip,
        });
        throw new ForbiddenException('Rate limit exceeded');
      }

      // Check required scopes
      const requiredScopes = this.reflector.getAllAndOverride<string[]>(
        API_KEY_SCOPES,
        [context.getHandler(), context.getClass()],
      );

      if (requiredScopes && requiredScopes.length > 0) {
        const hasRequiredScopes = requiredScopes.every(scope =>
          apiKeyRecord.scopes.includes(scope)
        );

        if (!hasRequiredScopes) {
          this.logger.warn('API key missing required scopes', {
            keyId: apiKeyRecord.id,
            requiredScopes,
            availableScopes: apiKeyRecord.scopes,
            ip: request.ip,
          });
          throw new ForbiddenException('Insufficient permissions');
        }
      }

      // Update last used timestamp
      await this.updateLastUsed(apiKeyRecord.id, request);

      // Attach API key information to request
      request.apiKey = apiKey;
      request.clientId = apiKeyRecord.organizationId;
      request.organization = apiKeyRecord.organization;
      request.apiKeyRecord = apiKeyRecord;

      this.logger.debug('API key validation successful', {
        keyId: apiKeyRecord.id,
        organizationId: apiKeyRecord.organizationId,
        scopes: apiKeyRecord.scopes,
      });

      return true;

    } catch (error) {
      if (error instanceof UnauthorizedException || error instanceof ForbiddenException) {
        throw error;
      }

      this.logger.error('API key validation failed', {
        error: error.message,
        stack: error.stack,
        ip: request.ip,
      });

      throw new UnauthorizedException('API key validation failed');
    }
  }

  private extractApiKey(request: Request): string | null {
    // Check x-api-key header (primary)
    const headerApiKey = request.headers['x-api-key'] as string;
    if (headerApiKey) {
      return headerApiKey.trim();
    }

    // Check authorization header with Bearer token
    const authHeader = request.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7).trim();
    }

    // Check query parameter (not recommended for production)
    const queryApiKey = request.query.api_key as string;
    if (queryApiKey) {
      this.logger.warn('API key passed in query parameter - not recommended', {
        ip: request.ip,
      });
      return queryApiKey.trim();
    }

    return null;
  }

  private isValidApiKeyFormat(apiKey: string): boolean {
    // API key should be at least 32 characters and contain only alphanumeric characters and underscores
    const apiKeyRegex = /^[a-zA-Z0-9_-]{32,}$/;
    return apiKeyRegex.test(apiKey);
  }

  private hashApiKey(apiKey: string): string {
    // Use SHA-256 to hash the API key for secure storage lookup
    return crypto.createHash('sha256').update(apiKey).digest('hex');
  }

  private async checkRateLimit(apiKeyRecord: any, request: Request): Promise<boolean> {
    try {
      // If no rate limit is set, allow the request
      if (!apiKeyRecord.rateLimit) {
        return true;
      }

      const now = new Date();
      const windowStart = new Date(now.getTime() - (apiKeyRecord.rateLimitWindow || 60000));

      // Count requests in the current time window
      const requestCount = await this.prisma.apiKeyUsage.count({
        where: {
          apiKeyId: apiKeyRecord.id,
          createdAt: {
            gte: windowStart,
          },
        },
      });

      return requestCount < apiKeyRecord.rateLimit;

    } catch (error) {
      this.logger.error('Rate limit check failed', {
        error: error.message,
        apiKeyId: apiKeyRecord.id,
      });
      // On error, allow the request but log the issue
      return true;
    }
  }

  private async updateLastUsed(apiKeyId: string, request: Request): Promise<void> {
    try {
      const updatePromises = [
        // Update API key last used timestamp
        this.prisma.apiKey.update({
          where: { id: apiKeyId },
          data: {
            lastUsedAt: new Date(),
            usageCount: {
              increment: 1,
            },
          },
        }),

        // Record usage for rate limiting and analytics
        this.prisma.apiKeyUsage.create({
          data: {
            apiKeyId,
            endpoint: request.path,
            method: request.method,
            ipAddress: request.ip,
            userAgent: request.headers['user-agent'] || '',
            createdAt: new Date(),
          },
        }),
      ];

      await Promise.all(updatePromises);

    } catch (error) {
      // Don't fail the request if usage tracking fails
      this.logger.error('Failed to update API key usage', {
        error: error.message,
        apiKeyId,
      });
    }
  }
}

// Helper decorator for common scopes
export const RequireWebhookScope = () => RequireApiKey(['webhook:read', 'webhook:write']);
export const RequireReadScope = () => RequireApiKey(['webhook:read']);
export const RequireWriteScope = () => RequireApiKey(['webhook:write']);
export const RequireAdminScope = () => RequireApiKey(['admin']);

// Type guard for authenticated requests
export function isAuthenticatedRequest(request: any): request is AuthenticatedRequest {
  return request && typeof request.apiKey === 'string' && typeof request.clientId === 'string';
}