import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Prisma } from '@prisma/client';

@Injectable()
export class ErrorsInterceptor implements NestInterceptor {
  private readonly logger = new Logger(ErrorsInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      catchError((error) => {
        // Handle Prisma errors
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
          return throwError(() => this.handlePrismaError(error));
        }

        if (error instanceof Prisma.PrismaClientUnknownRequestError) {
          this.logger.error('Unknown Prisma error:', error);
          return throwError(() =>
            new HttpException(
              'Database operation failed',
              HttpStatus.INTERNAL_SERVER_ERROR
            )
          );
        }

        if (error instanceof Prisma.PrismaClientValidationError) {
          this.logger.error('Prisma validation error:', error);
          return throwError(() =>
            new HttpException(
              'Invalid data provided',
              HttpStatus.BAD_REQUEST
            )
          );
        }

        // Handle other known errors
        if (error instanceof HttpException) {
          return throwError(() => error);
        }

        // Log unknown errors
        this.logger.error('Unhandled error:', error);

        return throwError(() =>
          new HttpException(
            'Internal server error',
            HttpStatus.INTERNAL_SERVER_ERROR
          )
        );
      })
    );
  }

  private handlePrismaError(error: Prisma.PrismaClientKnownRequestError): HttpException {
    switch (error.code) {
      case 'P2002':
        // Unique constraint violation
        const field = error.meta?.target as string[] | undefined;
        const fieldName = field?.[0] || 'field';
        return new HttpException(
          `${fieldName} already exists`,
          HttpStatus.CONFLICT
        );

      case 'P2025':
        // Record not found
        return new HttpException(
          'Record not found',
          HttpStatus.NOT_FOUND
        );

      case 'P2003':
        // Foreign key constraint violation
        return new HttpException(
          'Referenced record does not exist',
          HttpStatus.BAD_REQUEST
        );

      case 'P2014':
        // Required relation violation
        return new HttpException(
          'Required relation is missing',
          HttpStatus.BAD_REQUEST
        );

      case 'P2021':
        // Table does not exist
        this.logger.error('Database table missing:', error);
        return new HttpException(
          'Database configuration error',
          HttpStatus.INTERNAL_SERVER_ERROR
        );

      case 'P2034':
        // Transaction conflict
        return new HttpException(
          'Request conflict, please retry',
          HttpStatus.CONFLICT
        );

      default:
        this.logger.error('Unhandled Prisma error:', error);
        return new HttpException(
          'Database operation failed',
          HttpStatus.INTERNAL_SERVER_ERROR
        );
    }
  }
}