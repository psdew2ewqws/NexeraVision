import { Injectable, ExecutionContext } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

@Injectable()
export class RateLimitGuard extends ThrottlerGuard {
  protected async getTracker(context: ExecutionContext): Promise<string> {
    const request = context.switchToHttp().getRequest();
    const provider = request.params.provider;
    const ip = request.ip;

    // Rate limit per provider + IP combination
    return `${provider}:${ip}`;
  }

  protected errorMessage = 'Rate limit exceeded for webhook requests';
}