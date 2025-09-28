import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request, Response } from 'express';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(LoggingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();

    const { method, url, headers, body, params, query } = request;
    const userAgent = headers['user-agent'] || '';
    const correlationId = headers['x-correlation-id'] || this.generateCorrelationId();
    const organizationId = headers['x-organization-id'] || '';

    // Set correlation ID in response headers
    response.setHeader('x-correlation-id', correlationId);

    const startTime = Date.now();

    // Log request
    this.logger.log(
      JSON.stringify({
        type: 'REQUEST',
        correlationId,
        organizationId,
        method,
        url,
        userAgent,
        params: Object.keys(params).length > 0 ? params : undefined,
        query: Object.keys(query).length > 0 ? query : undefined,
        bodySize: body ? JSON.stringify(body).length : 0,
        timestamp: new Date().toISOString(),
      })
    );

    return next.handle().pipe(
      tap({
        next: (data) => {
          const duration = Date.now() - startTime;
          const responseSize = data ? JSON.stringify(data).length : 0;

          this.logger.log(
            JSON.stringify({
              type: 'RESPONSE',
              correlationId,
              organizationId,
              method,
              url,
              statusCode: response.statusCode,
              duration,
              responseSize,
              timestamp: new Date().toISOString(),
            })
          );
        },
        error: (error) => {
          const duration = Date.now() - startTime;

          this.logger.error(
            JSON.stringify({
              type: 'ERROR',
              correlationId,
              organizationId,
              method,
              url,
              statusCode: response.statusCode,
              duration,
              error: {
                message: error.message,
                stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
                name: error.constructor.name,
              },
              timestamp: new Date().toISOString(),
            })
          );
        },
      })
    );
  }

  private generateCorrelationId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}