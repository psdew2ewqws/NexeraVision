import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * Decorator to extract API key data from request
 * Populated by ApiKeyAuthGuard
 */
export const CurrentApiKey = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.apiKey;
  },
);
