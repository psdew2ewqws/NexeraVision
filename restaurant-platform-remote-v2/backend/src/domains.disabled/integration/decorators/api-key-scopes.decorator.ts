import { SetMetadata } from '@nestjs/common';

export const API_KEY_SCOPES_KEY = 'api_key_scopes';

/**
 * Decorator to specify required API key scopes for an endpoint
 * @param scopes - Array of required scope strings
 * @example @ApiKeyScopes('orders:read', 'orders:write')
 */
export const ApiKeyScopes = (...scopes: string[]) =>
  SetMetadata(API_KEY_SCOPES_KEY, scopes);
