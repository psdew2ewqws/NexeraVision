/**
 * Dual Authentication Strategy
 * Supports both JWT (for business users) and API Keys (for integration developers)
 */

import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-custom';
import { Request } from 'express';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../database/prisma.service';
import * as bcrypt from 'bcryptjs';

export interface AuthenticatedUser {
  id: string;
  type: 'user' | 'integration';
  companyId: string;
  branchId?: string;
  email?: string;
  name: string;
  roles?: string[];
  scopes?: string[];
}

@Injectable()
export class DualAuthStrategy extends PassportStrategy(Strategy, 'dual-auth') {
  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
  ) {
    super();
  }

  async validate(req: Request): Promise<AuthenticatedUser> {
    // Check for API Key authentication
    const apiKey = req.headers['x-api-key'] as string;
    if (apiKey) {
      return this.validateAPIKey(apiKey);
    }

    // Check for JWT authentication
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      return this.validateJWT(token);
    }

    throw new UnauthorizedException('No valid authentication credentials provided');
  }

  /**
   * Validate JWT token for business users
   */
  private async validateJWT(token: string): Promise<AuthenticatedUser> {
    try {
      const payload = this.jwtService.verify(token);

      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
        include: {
          company: true,
          branch: true,
        },
      });

      if (!user || !user.isActive) {
        throw new UnauthorizedException('Invalid user');
      }

      return {
        id: user.id,
        type: 'user',
        companyId: user.companyId,
        branchId: user.branchId,
        email: user.email,
        name: user.fullName,
        roles: [user.role],
      };
    } catch (error) {
      throw new UnauthorizedException('Invalid JWT token');
    }
  }

  /**
   * Validate API key for integration developers
   */
  private async validateAPIKey(apiKey: string): Promise<AuthenticatedUser> {
    // Extract key prefix for faster lookup
    const keyPrefix = apiKey.substring(0, 10);

    const apiKeyRecord = await this.prisma.apiKey.findFirst({
      where: {
        keyPrefix,
        isActive: true,
      },
      include: {
        company: true,
      },
    });

    if (!apiKeyRecord) {
      throw new UnauthorizedException('Invalid API key');
    }

    // Verify the full key
    const isValid = await bcrypt.compare(apiKey, apiKeyRecord.keyHash);
    if (!isValid) {
      throw new UnauthorizedException('Invalid API key');
    }

    // Check expiration
    if (apiKeyRecord.expiresAt && apiKeyRecord.expiresAt < new Date()) {
      throw new UnauthorizedException('API key expired');
    }

    // Update last used timestamp
    await this.prisma.apiKey.update({
      where: { id: apiKeyRecord.id },
      data: { lastUsedAt: new Date() },
    });

    // Get associated integration
    const integration = await this.prisma.integration.findFirst({
      where: {
        companyId: apiKeyRecord.companyId,
        status: 'ACTIVE',
      },
    });

    return {
      id: integration?.id || apiKeyRecord.id,
      type: 'integration',
      companyId: apiKeyRecord.companyId,
      name: apiKeyRecord.name,
      scopes: apiKeyRecord.scopes as string[],
    };
  }
}

/**
 * Guard to protect routes with dual authentication
 */
@Injectable()
export class DualAuthGuard {
  canActivate(context: any): boolean {
    const request = context.switchToHttp().getRequest();
    return request.user && (request.user.type === 'user' || request.user.type === 'integration');
  }
}

/**
 * Guard for business users only
 */
@Injectable()
export class BusinessAuthGuard {
  canActivate(context: any): boolean {
    const request = context.switchToHttp().getRequest();
    return request.user && request.user.type === 'user';
  }
}

/**
 * Guard for integration developers only
 */
@Injectable()
export class IntegrationAuthGuard {
  canActivate(context: any): boolean {
    const request = context.switchToHttp().getRequest();
    return request.user && request.user.type === 'integration';
  }
}