import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { ApiKeyService } from '../api-key.service';

/**
 * API Key Guard
 *
 * @description Guards routes requiring API key authentication
 * Validates API key from Authorization header
 */
@Injectable()
export class ApiKeyGuard implements CanActivate {
  private readonly logger = new Logger(ApiKeyGuard.name);

  constructor(private readonly apiKeyService: ApiKeyService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const apiKey = this.extractApiKey(request);

    if (!apiKey) {
      this.logger.warn('Missing API key in request');
      throw new UnauthorizedException('API key is required');
    }

    const validation = await this.apiKeyService.validateApiKey(apiKey);

    if (!validation.valid) {
      this.logger.warn('Invalid API key provided');
      throw new UnauthorizedException('Invalid or expired API key');
    }

    // Attach company context to request
    request.companyId = validation.companyId;
    request.keyId = validation.keyId;
    request.permissions = validation.permissions;

    return true;
  }

  /**
   * Extract API key from request headers
   * @private
   */
  private extractApiKey(request: any): string | null {
    const authHeader = request.headers['authorization'];
    if (!authHeader) {
      return null;
    }

    // Support both "Bearer {key}" and "ApiKey {key}" formats
    if (authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }

    if (authHeader.startsWith('ApiKey ')) {
      return authHeader.substring(7);
    }

    // Also check x-api-key header
    return request.headers['x-api-key'] || null;
  }
}
