import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { WebhookService } from './webhook.service';
import { WebhookProcessorService } from './webhook-processor.service';
import { WebhookValidationService } from './webhook-validation.service';
import { RegisterWebhookDto, WebhookLogFiltersDto, WebhookStatsDto } from './dto/register-webhook.dto';

/**
 * Webhook Controller
 *
 * @description Handles webhook management and processing endpoints
 */
@ApiTags('Integration - Webhooks')
@Controller('api/v1/integrations/webhooks')
export class WebhookController {
  constructor(
    private readonly webhookService: WebhookService,
    private readonly webhookProcessor: WebhookProcessorService,
    private readonly webhookValidation: WebhookValidationService,
  ) {}

  /**
   * Register new webhook endpoint
   */
  @Post('register')
  @ApiOperation({ summary: 'Register a new webhook endpoint' })
  @ApiResponse({ status: 201, description: 'Webhook registered successfully' })
  async registerWebhook(@Body() dto: RegisterWebhookDto) {
    return this.webhookService.registerWebhook(dto);
  }

  /**
   * Receive webhook from provider
   */
  @Post(':provider/:companyId/:clientId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Receive webhook from delivery provider' })
  async receiveWebhook(
    @Param('provider') provider: string,
    @Param('companyId') companyId: string,
    @Param('clientId') clientId: string,
    @Body() payload: any,
  ) {
    // Process webhook
    const result = await this.webhookProcessor.processWebhook({
      provider,
      companyId,
      clientId,
      eventType: payload.event || payload.eventType || 'unknown',
      payload,
      headers: {},
    });

    return {
      received: true,
      logId: result.logId,
      processingTime: result.processingTime,
    };
  }

  /**
   * Get webhook logs with filtering
   */
  @Get('logs')
  @ApiOperation({ summary: 'Get webhook logs' })
  async getWebhookLogs(
    @Query() filters: WebhookLogFiltersDto,
    @Query('companyId') companyId: string,
  ) {
    return this.webhookService.getWebhookLogs({
      companyId,
      ...filters,
    });
  }

  /**
   * Get webhook statistics
   */
  @Get('stats')
  @ApiOperation({ summary: 'Get webhook statistics' })
  async getWebhookStats(
    @Query() params: WebhookStatsDto,
    @Query('companyId') companyId: string,
  ) {
    return this.webhookService.getWebhookStats({
      companyId,
      ...params,
    });
  }

  /**
   * Get webhook configuration for company
   */
  @Get('config/:companyId')
  @ApiOperation({ summary: 'Get webhook configuration' })
  async getWebhookConfig(@Param('companyId') companyId: string) {
    return this.webhookService.getWebhookConfig(companyId);
  }

  /**
   * Retry failed webhook
   */
  @Post('retry/:logId')
  @ApiOperation({ summary: 'Retry a failed webhook' })
  async retryWebhook(@Param('logId') logId: string) {
    return this.webhookService.retryWebhook(logId);
  }
}
