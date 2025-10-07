import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { Request } from 'express';
import { SignatureValidatorService } from '../services/signature-validator.service';

@Injectable()
export class SignatureValidationGuard implements CanActivate {
  private readonly logger = new Logger(SignatureValidationGuard.name);

  constructor(private signatureValidator: SignatureValidatorService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const provider = request.params.provider;

    if (!provider) {
      this.logger.warn('No provider specified in webhook request');
      throw new UnauthorizedException('Provider not specified');
    }

    // Extract raw body for signature validation
    const rawBody = request.body ? JSON.stringify(request.body) : '';
    const headers = request.headers as Record<string, string>;

    // Validate IP whitelist first (if configured)
    const ipAddress = request.ip || request.connection.remoteAddress || '';
    if (!this.signatureValidator.validateIpWhitelist(provider, ipAddress)) {
      this.logger.warn(`IP ${ipAddress} not whitelisted for provider ${provider}`);
      throw new UnauthorizedException('IP not whitelisted');
    }

    // Validate webhook signature
    const isValid = this.signatureValidator.validateSignature(
      provider,
      rawBody,
      '', // Signature will be extracted from headers
      headers,
    );

    if (!isValid) {
      this.logger.warn(`Invalid signature for webhook from ${provider}`);
      throw new UnauthorizedException('Invalid webhook signature');
    }

    this.logger.log(`Webhook signature validated for provider: ${provider}`);
    return true;
  }
}