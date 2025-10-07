import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import * as crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';

/**
 * API Key Service
 *
 * @description Manages API keys for integration authentication
 * Handles generation, validation, and rotation of API keys
 */
@Injectable()
export class ApiKeyService {
  private readonly logger = new Logger(ApiKeyService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Generate new API key for company
   */
  async generateApiKey(
    companyId: string,
    name: string,
    permissions: string[] = [],
  ) {
    try {
      const keyId = uuidv4();
      const apiKey = this.generateKey();
      const hashedKey = this.hashKey(apiKey);

      const created = await this.prisma.apiKey.create({
        data: {
          id: keyId,
          companyId,
          name,
          keyHash: hashedKey,
          permissions,
          isActive: true,
          expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
          metadata: {
            createdBy: 'system',
            ipWhitelist: [],
          },
        },
      });

      this.logger.log(`Generated API key for company ${companyId}: ${name}`);

      return {
        keyId: created.id,
        apiKey, // Return plain key only once
        name: created.name,
        permissions: created.permissions,
        expiresAt: created.expiresAt,
        createdAt: created.createdAt,
      };
    } catch (error) {
      this.logger.error(`Failed to generate API key: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Validate API key
   */
  async validateApiKey(apiKey: string): Promise<{
    valid: boolean;
    companyId?: string;
    keyId?: string;
    permissions?: string[];
  }> {
    try {
      const hashedKey = this.hashKey(apiKey);

      const key = await this.prisma.apiKey.findFirst({
        where: {
          keyHash: hashedKey,
          isActive: true,
          expiresAt: {
            gt: new Date(),
          },
        },
        select: {
          id: true,
          companyId: true,
          permissions: true,
          lastUsedAt: true,
        },
      });

      if (!key) {
        return { valid: false };
      }

      // Update last used timestamp
      await this.prisma.apiKey.update({
        where: { id: key.id },
        data: { lastUsedAt: new Date() },
      });

      return {
        valid: true,
        companyId: key.companyId,
        keyId: key.id,
        permissions: key.permissions as string[],
      };
    } catch (error) {
      this.logger.error(`API key validation error: ${error.message}`);
      return { valid: false };
    }
  }

  /**
   * Revoke API key
   */
  async revokeApiKey(keyId: string): Promise<void> {
    await this.prisma.apiKey.update({
      where: { id: keyId },
      data: {
        isActive: false,
        revokedAt: new Date(),
      },
    });

    this.logger.log(`Revoked API key: ${keyId}`);
  }

  /**
   * List API keys for company
   */
  async listApiKeys(companyId: string) {
    return this.prisma.apiKey.findMany({
      where: {
        companyId,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        permissions: true,
        lastUsedAt: true,
        expiresAt: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  /**
   * Generate random API key
   * @private
   */
  private generateKey(): string {
    return `ik_${crypto.randomBytes(32).toString('hex')}`;
  }

  /**
   * Hash API key for storage
   * @private
   */
  private hashKey(apiKey: string): string {
    return crypto.createHash('sha256').update(apiKey).digest('hex');
  }
}
