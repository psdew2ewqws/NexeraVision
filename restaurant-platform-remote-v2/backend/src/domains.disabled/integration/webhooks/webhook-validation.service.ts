import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import * as crypto from 'crypto';

/**
 * Webhook Validation Service
 *
 * @description Validates incoming webhooks from delivery providers
 * Handles signature verification, API key validation, and security checks
 */
@Injectable()
export class WebhookValidationService {
  private readonly logger = new Logger(WebhookValidationService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Validate webhook based on provider type
   */
  async validateWebhook(
    provider: string,
    clientId: string,
    headers: any,
    rawBody: Buffer | string,
  ): Promise<boolean> {
    switch (provider.toLowerCase()) {
      case 'careem':
        return this.validateCareemWebhook(clientId, headers, rawBody);
      case 'talabat':
        return this.validateTalabatWebhook(clientId, headers);
      case 'deliveroo':
        return this.validateDeliverooWebhook(clientId, headers, rawBody);
      case 'jahez':
        return this.validateJahezWebhook(clientId, headers);
      case 'hungerstatiton':
        return this.validateHungerStationWebhook(clientId, headers, rawBody);
      default:
        this.logger.warn(`Unknown provider for validation: ${provider}`);
        return false;
    }
  }

  /**
   * Validate Careem webhook signature
   */
  private async validateCareemWebhook(
    clientId: string,
    headers: any,
    rawBody: Buffer | string,
  ): Promise<boolean> {
    try {
      const signature = headers['x-careem-signature'];
      if (!signature) {
        this.logger.warn('Missing Careem signature header');
        return false;
      }

      const clientSecret = await this.getClientSecret(clientId, 'careem');
      if (!clientSecret) {
        this.logger.error(`No secret found for Careem client: ${clientId}`);
        return false;
      }

      const expectedSignature = crypto
        .createHmac('sha256', clientSecret)
        .update(typeof rawBody === 'string' ? rawBody : rawBody.toString())
        .digest('hex');

      return signature === expectedSignature;
    } catch (error) {
      this.logger.error('Error validating Careem webhook:', error);
      return false;
    }
  }

  /**
   * Validate Talabat webhook
   */
  private async validateTalabatWebhook(
    clientId: string,
    headers: any,
  ): Promise<boolean> {
    try {
      const apiKey = headers['x-talabat-api-key'];
      if (!apiKey) {
        return false;
      }

      const expectedApiKey = await this.getClientApiKey(clientId, 'talabat');
      return apiKey === expectedApiKey;
    } catch (error) {
      this.logger.error('Error validating Talabat webhook:', error);
      return false;
    }
  }

  /**
   * Validate Deliveroo webhook signature
   */
  private async validateDeliverooWebhook(
    clientId: string,
    headers: any,
    rawBody: Buffer | string,
  ): Promise<boolean> {
    try {
      const signature = headers['x-deliveroo-hmac-sha256'];
      if (!signature) {
        return false;
      }

      const clientSecret = await this.getClientSecret(clientId, 'deliveroo');
      if (!clientSecret) {
        return false;
      }

      const expectedSignature = crypto
        .createHmac('sha256', clientSecret)
        .update(typeof rawBody === 'string' ? rawBody : rawBody.toString())
        .digest('base64');

      return signature === expectedSignature;
    } catch (error) {
      this.logger.error('Error validating Deliveroo webhook:', error);
      return false;
    }
  }

  /**
   * Validate Jahez webhook
   */
  private async validateJahezWebhook(
    clientId: string,
    headers: any,
  ): Promise<boolean> {
    try {
      const token = headers['authorization'];
      if (!token) {
        return false;
      }

      const bearerToken = token.replace('Bearer ', '');
      const expectedToken = await this.getClientToken(clientId, 'jahez');

      return bearerToken === expectedToken;
    } catch (error) {
      this.logger.error('Error validating Jahez webhook:', error);
      return false;
    }
  }

  /**
   * Validate HungerStation webhook
   */
  private async validateHungerStationWebhook(
    clientId: string,
    headers: any,
    rawBody: Buffer | string,
  ): Promise<boolean> {
    try {
      const signature = headers['x-hungerstation-signature'];
      if (!signature) {
        return false;
      }

      const clientSecret = await this.getClientSecret(clientId, 'hungerstatiton');
      if (!clientSecret) {
        return false;
      }

      const expectedSignature = crypto
        .createHmac('sha256', clientSecret)
        .update(typeof rawBody === 'string' ? rawBody : rawBody.toString())
        .digest('hex');

      return signature === expectedSignature;
    } catch (error) {
      this.logger.error('Error validating HungerStation webhook:', error);
      return false;
    }
  }

  /**
   * Get client secret from database
   * @private
   */
  private async getClientSecret(
    clientId: string,
    provider: string,
  ): Promise<string | null> {
    try {
      const config = await this.prisma.webhookConfiguration.findFirst({
        where: {
          clientId,
          provider,
          isActive: true,
        },
        select: {
          secretKey: true,
        },
      });

      return config?.secretKey || null;
    } catch (error) {
      this.logger.error(
        `Failed to get secret for ${provider} client ${clientId}:`,
        error,
      );
      return null;
    }
  }

  /**
   * Get client API key from database
   * @private
   */
  private async getClientApiKey(
    clientId: string,
    provider: string,
  ): Promise<string | null> {
    try {
      const config = await this.prisma.integrationCredentials.findFirst({
        where: {
          clientId,
          provider,
          credentialType: 'API_KEY',
        },
        select: {
          credentialValue: true,
        },
      });

      return config?.credentialValue || null;
    } catch (error) {
      this.logger.error(
        `Failed to get API key for ${provider} client ${clientId}:`,
        error,
      );
      return null;
    }
  }

  /**
   * Get client token from database
   * @private
   */
  private async getClientToken(
    clientId: string,
    provider: string,
  ): Promise<string | null> {
    try {
      const config = await this.prisma.integrationCredentials.findFirst({
        where: {
          clientId,
          provider,
          credentialType: 'BEARER_TOKEN',
        },
        select: {
          credentialValue: true,
        },
      });

      return config?.credentialValue || null;
    } catch (error) {
      this.logger.error(
        `Failed to get token for ${provider} client ${clientId}:`,
        error,
      );
      return null;
    }
  }
}
