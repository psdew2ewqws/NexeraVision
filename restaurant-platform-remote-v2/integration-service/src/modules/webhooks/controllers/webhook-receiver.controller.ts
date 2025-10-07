import {
  Controller,
  Post,
  Body,
  Headers,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
  Logger,
  Req,
  BadRequestException,
} from '@nestjs/common';
import { Request } from 'express';
import { ThrottlerGuard } from '@nestjs/throttler';
import { SignatureValidationGuard } from '../guards/signature-validation.guard';
import { WebhookProcessorService } from '../services/webhook-processor.service';

@Controller('webhooks')
@UseGuards(ThrottlerGuard)
export class WebhookReceiverController {
  private readonly logger = new Logger(WebhookReceiverController.name);

  constructor(private readonly webhookProcessor: WebhookProcessorService) {}

  /**
   * Main webhook endpoint for all providers
   * Route: POST /api/webhooks/:provider
   */
  @Post(':provider')
  @UseGuards(SignatureValidationGuard)
  @HttpCode(HttpStatus.OK)
  async handleWebhook(
    @Param('provider') provider: string,
    @Body() payload: any,
    @Headers() headers: Record<string, string>,
    @Req() request: Request,
  ) {
    this.logger.log(`Received webhook from provider: ${provider}`);

    // Validate provider is supported
    const supportedProviders = ['careem', 'talabat', 'deliveroo', 'ubereats'];
    if (!supportedProviders.includes(provider.toLowerCase())) {
      throw new BadRequestException(`Unsupported provider: ${provider}`);
    }

    try {
      // Process the webhook
      const result = await this.webhookProcessor.processWebhook({
        provider: provider.toLowerCase(),
        payload,
        headers,
        ipAddress: request.ip,
        timestamp: new Date(),
      });

      this.logger.log(`Webhook processed successfully for ${provider}: ${result.orderId}`);

      // Return success response (provider-specific format if needed)
      return {
        success: true,
        orderId: result.orderId,
        message: 'Webhook processed successfully',
      };
    } catch (error) {
      this.logger.error(`Failed to process webhook from ${provider}:`, error);

      // Log error to database for retry
      await this.webhookProcessor.logWebhookError({
        provider,
        payload,
        headers,
        error: error.message,
        stackTrace: error.stack,
      });

      // Don't expose internal errors to external providers
      throw new BadRequestException('Webhook processing failed');
    }
  }

  /**
   * Health check endpoint for monitoring
   */
  @Post('health')
  @HttpCode(HttpStatus.OK)
  healthCheck() {
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'integration-service',
    };
  }
}