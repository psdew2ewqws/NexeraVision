import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../modules/database/prisma.service';
import { Request } from 'express';

interface FailedAttempt {
  ip: string;
  email?: string;
  attempts: number;
  lastAttempt: Date;
  lockedUntil?: Date;
}

@Injectable()
export class BruteForceProtectionGuard implements CanActivate {
  private readonly logger = new Logger(BruteForceProtectionGuard.name);
  private failedAttempts = new Map<string, FailedAttempt>();
  
  // Configuration
  private readonly MAX_ATTEMPTS = 5;
  private readonly LOCKOUT_DURATION_MS = 30 * 60 * 1000; // 30 minutes
  private readonly WINDOW_MS = 15 * 60 * 1000; // 15 minutes

  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse();
    const ip = this.getClientIP(request);
    
    // Only apply to authentication endpoints
    if (!request.url.includes('/auth/login')) {
      return true;
    }

    const email = request.body?.emailOrUsername || request.body?.email;
    const key = `${ip}:${email || 'unknown'}`;
    
    const attempt = this.failedAttempts.get(key);
    
    if (attempt) {
      const now = new Date();
      
      // Check if still locked out
      if (attempt.lockedUntil && now < attempt.lockedUntil) {
        const remainingMs = attempt.lockedUntil.getTime() - now.getTime();
        const remainingMinutes = Math.ceil(remainingMs / (60 * 1000));
        
        this.logger.warn(`🚫 BRUTE FORCE: IP ${ip} still locked out for ${remainingMinutes} minutes`, {
          ip,
          email,
          attempts: attempt.attempts,
          lockedUntil: attempt.lockedUntil,
        });
        
        throw new HttpException(
          {
            message: `Account temporarily locked due to too many failed attempts. Try again in ${remainingMinutes} minutes.`,
            code: 'ACCOUNT_LOCKED',
            retryAfter: remainingMs,
          },
          HttpStatus.TOO_MANY_REQUESTS
        );
      }
      
      // Reset if outside the window
      if (now.getTime() - attempt.lastAttempt.getTime() > this.WINDOW_MS) {
        this.failedAttempts.delete(key);
      }
    }

    // Monitor response to track failed attempts
    response.on('finish', () => {
      if (response.statusCode === 401 || response.statusCode === 403) {
        this.recordFailedAttempt(ip, email);
      } else if (response.statusCode === 200 || response.statusCode === 201) {
        // Success - clear any failed attempts
        this.failedAttempts.delete(key);
      }
    });

    return true;
  }

  private recordFailedAttempt(ip: string, email?: string): void {
    const key = `${ip}:${email || 'unknown'}`;
    const now = new Date();
    
    let attempt = this.failedAttempts.get(key);
    
    if (!attempt) {
      attempt = {
        ip,
        email,
        attempts: 0,
        lastAttempt: now,
      };
    }
    
    attempt.attempts += 1;
    attempt.lastAttempt = now;
    
    // Lock account if max attempts reached
    if (attempt.attempts >= this.MAX_ATTEMPTS) {
      attempt.lockedUntil = new Date(now.getTime() + this.LOCKOUT_DURATION_MS);
      
      this.logger.error(`🔒 BRUTE FORCE DETECTED: Locking ${key} for ${this.LOCKOUT_DURATION_MS / (60 * 1000)} minutes`, {
        ip,
        email,
        attempts: attempt.attempts,
        lockedUntil: attempt.lockedUntil,
      });
      
      // Update database if user exists
      if (email) {
        this.updateUserLockout(email, attempt.lockedUntil).catch(error => {
          this.logger.error('Failed to update user lockout in database', error);
        });
      }
    }
    
    this.failedAttempts.set(key, attempt);
  }

  private async updateUserLockout(email: string, lockedUntil: Date): Promise<void> {
    try {
      await this.prisma.user.updateMany({
        where: { 
          OR: [
            { email: email },
            { username: email }
          ]
        },
        data: {
          failedLoginAttempts: this.MAX_ATTEMPTS,
          lockedUntil: lockedUntil,
        },
      });
    } catch (error) {
      this.logger.error('Failed to update user lockout status', error);
    }
  }

  private getClientIP(request: Request): string {
    return (
      request.headers['cf-connecting-ip'] ||
      request.headers['x-real-ip'] ||
      request.headers['x-forwarded-for'] ||
      request.connection?.remoteAddress ||
      request.socket?.remoteAddress ||
      'unknown'
    ) as string;
  }
}