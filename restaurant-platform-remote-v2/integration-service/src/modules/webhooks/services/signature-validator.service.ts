import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, timingSafeEqual } from 'crypto';
import { ProviderConfig } from '../../../config/providers.config';

@Injectable()
export class SignatureValidatorService {
  private readonly logger = new Logger(SignatureValidatorService.name);
  private readonly providers: Map<string, ProviderConfig>;

  constructor(private configService: ConfigService) {
    // Load provider configurations
    this.providers = new Map();
    const providersConfig = this.configService.get('providers');

    Object.keys(providersConfig).forEach((key) => {
      const config = providersConfig[key];
      if (config.enabled) {
        this.providers.set(config.name, config);
      }
    });
  }

  /**
   * Validate webhook signature using timing-safe comparison
   * This prevents timing attacks that were present in Picolinate
   */
  validateSignature(
    provider: string,
    payload: string | Buffer,
    signature: string,
    headers: Record<string, string>,
  ): boolean {
    const providerConfig = this.providers.get(provider);

    if (!providerConfig) {
      this.logger.warn(`No configuration found for provider: ${provider}`);
      return false;
    }

    const signatureHeader = headers[providerConfig.signatureHeader.toLowerCase()];

    if (!signatureHeader) {
      this.logger.warn(`Missing signature header for provider: ${provider}`);
      return false;
    }

    try {
      // Generate expected signature based on provider
      const expectedSignature = this.generateSignature(
        provider,
        payload,
        providerConfig.webhookSecret,
      );

      // CRITICAL: Use timing-safe comparison to prevent timing attacks
      return this.timingSafeCompare(signatureHeader, expectedSignature);
    } catch (error) {
      this.logger.error(`Signature validation error for ${provider}:`, error);
      return false;
    }
  }

  /**
   * Generate HMAC signature for webhook payload
   */
  private generateSignature(
    provider: string,
    payload: string | Buffer,
    secret: string,
  ): string {
    // Convert payload to string if it's a buffer
    const payloadStr = typeof payload === 'string' ? payload : JSON.stringify(payload);

    // Provider-specific signature generation
    switch (provider) {
      case 'careem':
        // Careem uses HMAC-SHA256 with hex encoding
        return createHmac('sha256', secret)
          .update(payloadStr)
          .digest('hex');

      case 'talabat':
        // Talabat uses HMAC-SHA256 with base64 encoding
        return createHmac('sha256', secret)
          .update(payloadStr)
          .digest('base64');

      case 'deliveroo':
        // Deliveroo uses a specific header format
        return createHmac('sha256', secret)
          .update(payloadStr)
          .digest('hex');

      default:
        // Default to HMAC-SHA256 with hex encoding
        return createHmac('sha256', secret)
          .update(payloadStr)
          .digest('hex');
    }
  }

  /**
   * Timing-safe string comparison to prevent timing attacks
   * This is the fix for the critical vulnerability in Picolinate
   */
  private timingSafeCompare(a: string, b: string): boolean {
    if (!a || !b) {
      return false;
    }

    // Convert strings to buffers
    const bufferA = Buffer.from(a);
    const bufferB = Buffer.from(b);

    // Length must match for timing-safe comparison
    if (bufferA.length !== bufferB.length) {
      return false;
    }

    // Use Node.js built-in timing-safe comparison
    return timingSafeEqual(bufferA, bufferB);
  }

  /**
   * Validate IP whitelist if configured
   */
  validateIpWhitelist(provider: string, ipAddress: string): boolean {
    const providerConfig = this.providers.get(provider);

    if (!providerConfig || !providerConfig.ipWhitelist || providerConfig.ipWhitelist.length === 0) {
      // No IP whitelist configured, allow all
      return true;
    }

    const isWhitelisted = providerConfig.ipWhitelist.includes(ipAddress);

    if (!isWhitelisted) {
      this.logger.warn(`IP ${ipAddress} not whitelisted for provider ${provider}`);
    }

    return isWhitelisted;
  }

  /**
   * Get webhook secret for a provider (for testing only, never expose in production)
   */
  getProviderConfig(provider: string): ProviderConfig | undefined {
    return this.providers.get(provider);
  }
}