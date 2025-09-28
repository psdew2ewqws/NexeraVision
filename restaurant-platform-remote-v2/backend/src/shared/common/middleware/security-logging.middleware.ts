import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class SecurityLoggingMiddleware implements NestMiddleware {
  private readonly logger = new Logger(SecurityLoggingMiddleware.name);

  use(req: Request, res: Response, next: NextFunction) {
    const { method, originalUrl, ip, headers } = req;
    const userAgent = headers['user-agent'] || 'unknown';
    const timestamp = new Date().toISOString();

    // Log suspicious activity patterns
    const suspiciousPatterns = [
      /\/\.\./,                    // Directory traversal
      /script|javascript|vbscript/i, // Script injection
      /union.*select/i,            // SQL injection
      /exec|system|eval/i,         // Command injection
      /<script/i,                  // XSS attempts
      /\bor\b.*\b1=1\b/i,         // SQL injection
    ];

    const isSuspicious = suspiciousPatterns.some(pattern => 
      pattern.test(originalUrl) || pattern.test(JSON.stringify(req.body))
    );

    if (isSuspicious) {
      this.logger.warn(`🚨 SECURITY ALERT: Suspicious request detected`, {
        timestamp,
        ip,
        method,
        url: originalUrl,
        userAgent,
        body: method === 'POST' ? JSON.stringify(req.body) : undefined,
      });
    }

    // Log failed authentication attempts
    if (originalUrl.includes('/auth/') && method === 'POST') {
      res.on('finish', () => {
        if (res.statusCode === 401 || res.statusCode === 403) {
          this.logger.warn(`🔐 AUTH FAILURE: Failed authentication attempt`, {
            timestamp,
            ip,
            method,
            url: originalUrl,
            statusCode: res.statusCode,
            userAgent,
          });
        }
      });
    }

    // Log high-privilege operations
    const privilegedEndpoints = [
      '/companies',
      '/users',
      '/licenses',
      '/analytics',
    ];

    if (privilegedEndpoints.some(endpoint => originalUrl.includes(endpoint))) {
      this.logger.log(`🔑 PRIVILEGED ACCESS: ${method} ${originalUrl}`, {
        timestamp,
        ip,
        userAgent,
      });
    }

    next();
  }
}