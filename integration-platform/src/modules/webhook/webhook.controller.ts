import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  Headers,
  HttpCode,
  HttpStatus,
  Query,
  UseGuards,
  RawBodyRequest,
  Req,
  Logger,
} from '@nestjs/common';
import { Request } from 'express';
import { HttpService } from '@nestjs/axios';
import { WebhookService } from './webhook.service';
import { WebhookProcessorService } from './webhook-processor.service';
import { WebhookValidationService } from './webhook-validation.service';
import { RegisterWebhookDto } from './dto/register-webhook.dto';
import { WebhookEventDto } from './dto/webhook-event.dto';
import { ApiKeyGuard } from '../../common/guards/api-key.guard';
import { EventsGateway } from '../../gateways/events.gateway';
import { firstValueFrom } from 'rxjs';

@Controller('webhooks')
export class WebhookController {
  private readonly logger = new Logger(WebhookController.name);
  private readonly restaurantPlatformUrl = 'http://localhost:3001';

  constructor(
    private readonly webhookService: WebhookService,
    private readonly webhookProcessor: WebhookProcessorService,
    private readonly webhookValidation: WebhookValidationService,
    private readonly httpService: HttpService,
    private readonly eventsGateway: EventsGateway,
  ) {}

  // Register a new webhook endpoint
  @Post('register')
  @UseGuards(ApiKeyGuard)
  async registerWebhook(@Body() dto: RegisterWebhookDto) {
    return this.webhookService.registerWebhook(dto);
  }

  // NEXARA-specific event endpoint - Receives and forwards delivery platform events
  @Post('event')
  @HttpCode(HttpStatus.OK)
  async handleDeliveryEvent(
    @Body() eventData: any,
    @Headers() headers: any,
    @Req() req: Request,
  ) {
    try {
      this.logger.log(`📨 Received delivery platform event: ${eventData.eventType || 'unknown'}`);

      // Log the incoming event
      const incomingEvent = {
        eventType: eventData.eventType,
        provider: eventData.provider || 'unknown',
        timestamp: new Date().toISOString(),
        payload: eventData,
        headers: this.sanitizeHeaders(headers),
      };

      // Broadcast to WebSocket clients
      this.eventsGateway.notifyWebhookReceived(incomingEvent);

      // Forward to restaurant platform
      const forwardResponse = await this.forwardToRestaurantPlatform(eventData, headers);

      // Broadcast the forwarding result
      this.eventsGateway.broadcastDeliveryEvent(
        eventData.eventType || 'event_forwarded',
        {
          original: eventData,
          forwardResponse: forwardResponse.success,
          timestamp: new Date().toISOString(),
        }
      );

      this.logger.log(
        `✅ Event forwarded to restaurant platform - Success: ${forwardResponse.success}`
      );

      return {
        status: 'received',
        forwarded: forwardResponse.success,
        timestamp: new Date().toISOString(),
        eventId: eventData.id || 'unknown',
      };

    } catch (error) {
      this.logger.error(`❌ Error handling delivery event: ${error.message}`, error.stack);

      // Still broadcast error to WebSocket clients
      this.eventsGateway.broadcastDeliveryEvent('event_error', {
        error: error.message,
        original: eventData,
        timestamp: new Date().toISOString(),
      });

      return {
        status: 'error',
        message: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }

  // Receive webhooks from Careem
  @Post('careem/:clientId')
  @HttpCode(HttpStatus.OK)
  async handleCareemWebhook(
    @Param('clientId') clientId: string,
    @Headers() headers: any,
    @Body() body: any,
    @Req() req: RawBodyRequest<Request>,
  ) {
    // Validate webhook signature
    const isValid = await this.webhookValidation.validateCareemWebhook(
      clientId,
      headers,
      req.rawBody,
    );

    if (!isValid) {
      return { status: 'unauthorized' };
    }

    // Process the webhook
    await this.webhookProcessor.processWebhook({
      provider: 'careem',
      clientId,
      eventType: body.event_type || 'order_update',
      payload: body,
      headers,
    });

    return { status: 'received' };
  }

  // Receive webhooks from Talabat
  @Post('talabat/:clientId')
  @HttpCode(HttpStatus.OK)
  async handleTalabatWebhook(
    @Param('clientId') clientId: string,
    @Headers() headers: any,
    @Body() body: any,
  ) {
    // Validate webhook
    const isValid = await this.webhookValidation.validateTalabatWebhook(
      clientId,
      headers,
      body,
    );

    if (!isValid) {
      return { status: 'unauthorized' };
    }

    // Process the webhook
    await this.webhookProcessor.processWebhook({
      provider: 'talabat',
      clientId,
      eventType: body.type || 'order_notification',
      payload: body,
      headers,
    });

    return { status: 'success' };
  }

  // Receive webhooks from Deliveroo
  @Post('deliveroo/:clientId')
  @HttpCode(HttpStatus.OK)
  async handleDeliverooWebhook(
    @Param('clientId') clientId: string,
    @Headers() headers: any,
    @Body() body: any,
    @Req() req: RawBodyRequest<Request>,
  ) {
    // Validate webhook signature
    const isValid = await this.webhookValidation.validateDeliverooWebhook(
      clientId,
      headers,
      req.rawBody,
    );

    if (!isValid) {
      return { success: false };
    }

    // Process the webhook
    await this.webhookProcessor.processWebhook({
      provider: 'deliveroo',
      clientId,
      eventType: body.event || 'order_event',
      payload: body,
      headers,
    });

    return { success: true };
  }

  // Receive webhooks from Jahez
  @Post('jahez/:clientId')
  @HttpCode(HttpStatus.OK)
  async handleJahezWebhook(
    @Param('clientId') clientId: string,
    @Headers() headers: any,
    @Body() body: any,
  ) {
    // Validate webhook
    const isValid = await this.webhookValidation.validateJahezWebhook(
      clientId,
      headers,
      body,
    );

    if (!isValid) {
      return { result: 'failed' };
    }

    // Process the webhook
    await this.webhookProcessor.processWebhook({
      provider: 'jahez',
      clientId,
      eventType: body.action || 'order_action',
      payload: body,
      headers,
    });

    return { result: 'ok' };
  }

  // Generic webhook endpoint for testing
  @Post('test/:clientId')
  @HttpCode(HttpStatus.OK)
  async handleTestWebhook(
    @Param('clientId') clientId: string,
    @Headers() headers: any,
    @Body() body: any,
  ) {
    await this.webhookProcessor.processWebhook({
      provider: 'test',
      clientId,
      eventType: body.event || 'test_event',
      payload: body,
      headers,
    });

    return { status: 'received', timestamp: new Date().toISOString() };
  }

  // Get webhook logs
  @Get('logs')
  @UseGuards(ApiKeyGuard)
  async getWebhookLogs(
    @Query('provider') provider?: string,
    @Query('clientId') clientId?: string,
    @Query('status') status?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('limit') limit = 100,
    @Query('offset') offset = 0,
  ) {
    return this.webhookService.getWebhookLogs({
      provider,
      clientId,
      status,
      startDate,
      endDate,
      limit: Number(limit),
      offset: Number(offset),
    });
  }

  // Get webhook statistics
  @Get('stats')
  @UseGuards(ApiKeyGuard)
  async getWebhookStats(
    @Query('provider') provider?: string,
    @Query('clientId') clientId?: string,
    @Query('period') period = '24h',
  ) {
    return this.webhookService.getWebhookStats({
      provider,
      clientId,
      period,
    });
  }

  // Retry failed webhooks
  @Post('retry/:logId')
  @UseGuards(ApiKeyGuard)
  async retryWebhook(@Param('logId') logId: string) {
    return this.webhookService.retryWebhook(logId);
  }

  // Get webhook configuration
  @Get('config/:clientId')
  @UseGuards(ApiKeyGuard)
  async getWebhookConfig(@Param('clientId') clientId: string) {
    return this.webhookService.getWebhookConfig(clientId);
  }

  // Update webhook configuration
  @Post('config/:clientId')
  @UseGuards(ApiKeyGuard)
  async updateWebhookConfig(
    @Param('clientId') clientId: string,
    @Body() config: any,
  ) {
    return this.webhookService.updateWebhookConfig(clientId, config);
  }

  // Delete webhook registration
  @Delete(':webhookId')
  @UseGuards(ApiKeyGuard)
  async deleteWebhook(@Param('webhookId') webhookId: string) {
    return this.webhookService.deleteWebhook(webhookId);
  }

  // Health check for webhook endpoints
  @Get('health')
  async health() {
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      endpoints: {
        careem: 'active',
        talabat: 'active',
        deliveroo: 'active',
        jahez: 'active',
        test: 'active',
        nexara_event: 'active',
      },
    };
  }

  // Private helper methods
  private async forwardToRestaurantPlatform(eventData: any, headers: any) {
    try {
      const forwardUrl = `${this.restaurantPlatformUrl}/api/integration/webhook`;

      this.logger.log(`🔄 Forwarding event to restaurant platform: ${forwardUrl}`);

      const response = await firstValueFrom(
        this.httpService.post(forwardUrl, eventData, {
          headers: {
            'Content-Type': 'application/json',
            'X-Forwarded-From': 'NEXARA-Integration-Platform',
            'X-Original-Provider': eventData.provider || 'unknown',
            'X-Event-Type': eventData.eventType || 'unknown',
            // Forward original authorization if present
            ...(headers.authorization && { 'Authorization': headers.authorization }),
            ...(headers['x-api-key'] && { 'X-API-Key': headers['x-api-key'] }),
          },
          timeout: 10000,
        })
      );

      this.logger.log(`✅ Successfully forwarded to restaurant platform - Status: ${response.status}`);

      return {
        success: true,
        status: response.status,
        data: response.data,
      };

    } catch (error) {
      this.logger.error(`❌ Failed to forward to restaurant platform: ${error.message}`);

      if (error.response) {
        this.logger.error(`Response status: ${error.response.status}, data: ${JSON.stringify(error.response.data)}`);
      }

      return {
        success: false,
        error: error.message,
        status: error.response?.status || 'unknown',
      };
    }
  }

  private sanitizeHeaders(headers: any) {
    // Remove sensitive headers for logging
    const sanitized = { ...headers };
    delete sanitized.authorization;
    delete sanitized['x-api-key'];
    delete sanitized.cookie;
    return sanitized;
  }
}