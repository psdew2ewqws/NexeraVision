import { Injectable, NestMiddleware, BadRequestException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import * as sanitizeHtml from 'sanitize-html';

@Injectable()
export class InputSanitizationMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    // Sanitize request body
    if (req.body && typeof req.body === 'object') {
      req.body = this.sanitizeObject(req.body);
    }

    // Sanitize query parameters
    if (req.query) {
      req.query = this.sanitizeObject(req.query);
    }

    // Validate content length
    const contentLength = parseInt(req.headers['content-length'] || '0');
    if (contentLength > 10 * 1024 * 1024) { // 10MB limit
      throw new BadRequestException('Request payload too large');
    }

    next();
  }

  private sanitizeObject(obj: any): any {
    if (typeof obj === 'string') {
      return this.sanitizeString(obj);
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.sanitizeObject(item));
    }

    if (obj !== null && typeof obj === 'object') {
      const sanitized: any = {};
      for (const [key, value] of Object.entries(obj)) {
        // Sanitize key names
        const cleanKey = this.sanitizeString(key);
        sanitized[cleanKey] = this.sanitizeObject(value);
      }
      return sanitized;
    }

    return obj;
  }

  private sanitizeString(str: string): string {
    // Basic HTML sanitization
    const cleanHtml = sanitizeHtml(str, {
      allowedTags: [], // No HTML tags allowed
      allowedAttributes: {},
    });

    // Remove potential SQL injection patterns
    const sqlPatterns = [
      /(\b(ALTER|CREATE|DELETE|DROP|EXEC(UTE){0,1}|INSERT( +INTO){0,1}|MERGE|SELECT|UPDATE|UNION( +ALL){0,1})\b)/gi,
      /(;|\-\-|\||\/\*|\*\/)/g,
    ];

    let sanitized = cleanHtml;
    sqlPatterns.forEach(pattern => {
      sanitized = sanitized.replace(pattern, '');
    });

    // Trim whitespace and limit length
    return sanitized.trim().substring(0, 10000); // 10KB max per string
  }
}