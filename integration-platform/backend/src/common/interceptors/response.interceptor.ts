import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Request } from 'express';

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  meta?: {
    timestamp: string;
    path: string;
    method: string;
    correlationId?: string;
    page?: number;
    limit?: number;
    total?: number;
  };
}

@Injectable()
export class ResponseInterceptor<T>
  implements NestInterceptor<T, ApiResponse<T>>
{
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<ApiResponse<T>> {
    const request = context.switchToHttp().getRequest<Request>();
    const correlationId = request.headers['x-correlation-id'] as string;

    return next.handle().pipe(
      map((data) => {
        // Handle paginated responses
        if (data && typeof data === 'object' && 'items' in data && 'meta' in data) {
          return {
            success: true,
            data: data.items,
            meta: {
              timestamp: new Date().toISOString(),
              path: request.url,
              method: request.method,
              correlationId,
              ...data.meta,
            },
          };
        }

        // Handle standard responses
        return {
          success: true,
          data,
          meta: {
            timestamp: new Date().toISOString(),
            path: request.url,
            method: request.method,
            correlationId,
          },
        };
      }),
    );
  }
}