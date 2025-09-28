import { Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';

@Injectable()
export class WebhookValidationService {
  private readonly logger = new Logger(WebhookValidationService.name);

  // Validate Careem webhook signature
  async validateCareemWebhook(
    clientId: string,
    headers: any,
    rawBody: Buffer,
  ): Promise<boolean> {
    try {
      const signature = headers['x-careem-signature'];
      if (!signature) {
        this.logger.warn('Missing Careem signature header');
        return false;
      }

      // Get client secret from database
      const clientSecret = await this.getClientSecret(clientId, 'careem');
      if (!clientSecret) {
        this.logger.error(`No secret found for Careem client: ${clientId}`);
        return false;
      }

      // Calculate expected signature
      const expectedSignature = crypto
        .createHmac('sha256', clientSecret)
        .update(rawBody)
        .digest('hex');

      const isValid = signature === expectedSignature;

      if (!isValid) {
        this.logger.warn(`Invalid Careem signature for client: ${clientId}`);
      }

      return isValid;
    } catch (error) {
      this.logger.error('Error validating Careem webhook:', error);
      return false;
    }
  }

  // Validate Talabat webhook
  async validateTalabatWebhook(
    clientId: string,
    headers: any,
    body: any,
  ): Promise<boolean> {
    try {
      const apiKey = headers['x-talabat-api-key'];
      if (!apiKey) {
        this.logger.warn('Missing Talabat API key header');
        return false;
      }

      // Validate API key
      const expectedApiKey = await this.getClientApiKey(clientId, 'talabat');
      if (!expectedApiKey) {
        this.logger.error(`No API key found for Talabat client: ${clientId}`);
        return false;
      }

      const isValid = apiKey === expectedApiKey;

      if (!isValid) {
        this.logger.warn(`Invalid Talabat API key for client: ${clientId}`);
      }

      // Additional validation: Check timestamp to prevent replay attacks
      if (body.timestamp) {
        const webhookTime = new Date(body.timestamp).getTime();
        const currentTime = Date.now();
        const timeDiff = Math.abs(currentTime - webhookTime);

        // Reject if webhook is older than 5 minutes
        if (timeDiff > 5 * 60 * 1000) {
          this.logger.warn(`Talabat webhook timestamp too old for client: ${clientId}`);
          return false;
        }
      }

      return isValid;
    } catch (error) {
      this.logger.error('Error validating Talabat webhook:', error);
      return false;
    }
  }

  // Validate Deliveroo webhook signature
  async validateDeliverooWebhook(
    clientId: string,
    headers: any,
    rawBody: Buffer,
  ): Promise<boolean> {
    try {
      const signature = headers['x-deliveroo-hmac-sha256'];
      if (!signature) {
        this.logger.warn('Missing Deliveroo signature header');
        return false;
      }

      // Get client secret from database
      const clientSecret = await this.getClientSecret(clientId, 'deliveroo');
      if (!clientSecret) {
        this.logger.error(`No secret found for Deliveroo client: ${clientId}`);
        return false;
      }

      // Calculate expected signature
      const expectedSignature = crypto
        .createHmac('sha256', clientSecret)
        .update(rawBody)
        .digest('base64');

      const isValid = signature === expectedSignature;

      if (!isValid) {
        this.logger.warn(`Invalid Deliveroo signature for client: ${clientId}`);
      }

      return isValid;
    } catch (error) {
      this.logger.error('Error validating Deliveroo webhook:', error);
      return false;
    }
  }

  // Validate Jahez webhook
  async validateJahezWebhook(
    clientId: string,
    headers: any,
    body: any,
  ): Promise<boolean> {
    try {
      const token = headers['authorization'];
      if (!token) {
        this.logger.warn('Missing Jahez authorization header');
        return false;
      }

      // Extract bearer token
      const bearerToken = token.replace('Bearer ', '');

      // Validate token
      const expectedToken = await this.getClientToken(clientId, 'jahez');
      if (!expectedToken) {
        this.logger.error(`No token found for Jahez client: ${clientId}`);
        return false;
      }

      const isValid = bearerToken === expectedToken;

      if (!isValid) {
        this.logger.warn(`Invalid Jahez token for client: ${clientId}`);
      }

      // Validate request ID to prevent duplicates
      if (body.requestId) {
        const isDuplicate = await this.checkDuplicateRequest(
          'jahez',
          clientId,
          body.requestId,
        );

        if (isDuplicate) {
          this.logger.warn(`Duplicate Jahez request for client: ${clientId}`);
          return false;
        }
      }

      return isValid;
    } catch (error) {
      this.logger.error('Error validating Jahez webhook:', error);
      return false;
    }
  }

  // Helper methods to get credentials (in production, these would fetch from database)
  private async getClientSecret(
    clientId: string,
    provider: string,
  ): Promise<string> {
    // In production, fetch from database
    const secrets = {
      'careem': 'careem_secret_key_' + clientId,
      'deliveroo': 'deliveroo_secret_key_' + clientId,
    };

    return secrets[provider] || process.env[`${provider.toUpperCase()}_WEBHOOK_SECRET`];
  }

  private async getClientApiKey(
    clientId: string,
    provider: string,
  ): Promise<string> {
    // In production, fetch from database
    return `${provider}_api_key_${clientId}`;
  }

  private async getClientToken(
    clientId: string,
    provider: string,
  ): Promise<string> {
    // In production, fetch from database
    return `${provider}_bearer_token_${clientId}`;
  }

  private async checkDuplicateRequest(
    provider: string,
    clientId: string,
    requestId: string,
  ): Promise<boolean> {
    // In production, check against database or cache
    // For now, return false (not duplicate)
    return false;
  }

  // Validate IP whitelist
  async validateIpAddress(
    clientId: string,
    provider: string,
    ipAddress: string,
  ): Promise<boolean> {
    // In production, check against IP whitelist in database
    const whitelist = {
      'careem': ['52.58.0.0/16', '54.93.0.0/16'],
      'talabat': ['185.48.0.0/16'],
      'deliveroo': ['34.240.0.0/16', '52.209.0.0/16'],
      'jahez': ['212.71.0.0/16'],
    };

    // For now, return true (allow all)
    return true;
  }

  // Rate limiting check
  async checkRateLimit(
    clientId: string,
    provider: string,
  ): Promise<boolean> {
    // In production, implement rate limiting with Redis
    // For now, return true (within limits)
    return true;
  }
}