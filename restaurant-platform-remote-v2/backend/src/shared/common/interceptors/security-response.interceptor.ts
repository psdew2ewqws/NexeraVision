import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable()
export class SecurityResponseInterceptor implements NestInterceptor {
  private readonly logger = new Logger(SecurityResponseInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();

    // Add security headers
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('X-Frame-Options', 'DENY');
    response.setHeader('X-XSS-Protection', '1; mode=block');
    response.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    response.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

    return next.handle().pipe(
      map(data => {
        // Remove sensitive fields from responses
        return this.sanitizeResponseData(data);
      }),
    );
  }

  private sanitizeResponseData(data: any): any {
    if (!data || typeof data !== 'object') {
      return data;
    }

    // Fields that should never be exposed
    const sensitiveFields = [
      'passwordHash',
      'password',
      'refreshToken',
      'tokenHash',
      'refreshTokenHash',
      'pinHash',
      'secretKey',
      'privateKey',
      'internalId',
      'dbCredentials',
    ];

    if (Array.isArray(data)) {
      return data.map(item => this.sanitizeResponseData(item));
    }

    const sanitized = { ...data };

    // Remove sensitive fields
    sensitiveFields.forEach(field => {
      if (field in sanitized) {
        delete sanitized[field];
      }
    });

    // Recursively sanitize nested objects
    Object.keys(sanitized).forEach(key => {
      if (sanitized[key] && typeof sanitized[key] === 'object') {
        sanitized[key] = this.sanitizeResponseData(sanitized[key]);
      }
    });

    return sanitized;
  }
}