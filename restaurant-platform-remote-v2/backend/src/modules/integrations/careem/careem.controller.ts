import {
  Controller,
  Post,
  Body,
  Headers,
  HttpCode,
  HttpStatus,
  Logger,
  BadRequestException,
  UnauthorizedException,
  Get,
  Param,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { CareemWebhookService } from './careem-webhook.service';
import { CareemService } from './careem.service';

@ApiTags('Careem Integration')
@Controller('integrations/careem')
export class CareemController {
  private readonly logger = new Logger(CareemController.name);

  constructor(
    private readonly careemWebhookService: CareemWebhookService,
    private readonly careemService: CareemService,
  ) {}

  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Receive Careem webhook events' })
  @ApiResponse({ status: 200, description: 'Webhook processed successfully' })
  @ApiResponse({ status: 400, description: 'Invalid webhook data' })
  @ApiResponse({ status: 401, description: 'Invalid webhook signature' })
  async handleWebhook(
    @Body() payload: any,
    @Headers('x-careem-event-type') eventType: string,
    @Headers('x-careem-signature') signature: string,
    @Headers('x-careem-timestamp') timestamp: string,
  ) {
    try {
      this.logger.log(`Received Careem webhook: ${eventType}`);

      // Validate webhook signature
      if (!this.careemWebhookService.validateSignature(payload, signature, timestamp)) {
        throw new UnauthorizedException('Invalid webhook signature');
      }

      // Process the webhook
      const result = await this.careemWebhookService.processWebhook({
        eventType,
        payload,
        signature,
        timestamp,
      });

      return {
        status: 'success',
        message: 'Webhook processed successfully',
        eventId: result.id,
      };
    } catch (error) {
      this.logger.error(`Webhook processing failed: ${error.message}`, error.stack);
      throw new BadRequestException(`Webhook processing failed: ${error.message}`);
    }
  }

  @Get('orders')
  @ApiOperation({ summary: 'Get Careem orders for a company' })
  async getOrders(
    @Query('companyId') companyId: string,
    @Query('branchId') branchId?: string,
    @Query('status') status?: string,
    @Query('limit') limit = 50,
    @Query('offset') offset = 0,
  ) {
    return this.careemService.getOrders({
      companyId,
      branchId,
      status,
      limit: Number(limit),
      offset: Number(offset),
    });
  }

  @Get('orders/:careemOrderId')
  @ApiOperation({ summary: 'Get specific Careem order details' })
  async getOrder(@Param('careemOrderId') careemOrderId: string) {
    return this.careemService.getOrderDetails(careemOrderId);
  }

  @Post('orders/:careemOrderId/accept')
  @ApiOperation({ summary: 'Accept a Careem order' })
  async acceptOrder(@Param('careemOrderId') careemOrderId: string) {
    return this.careemService.acceptOrder(careemOrderId);
  }

  @Post('orders/:careemOrderId/reject')
  @ApiOperation({ summary: 'Reject a Careem order' })
  async rejectOrder(
    @Param('careemOrderId') careemOrderId: string,
    @Body('reason') reason: string,
  ) {
    return this.careemService.rejectOrder(careemOrderId, reason);
  }

  @Post('orders/:careemOrderId/ready')
  @ApiOperation({ summary: 'Mark Careem order as ready for pickup' })
  async markOrderReady(@Param('careemOrderId') careemOrderId: string) {
    return this.careemService.updateOrderStatus(careemOrderId, 'ready');
  }

  @Get('webhook-events')
  @ApiOperation({ summary: 'Get webhook events for debugging' })
  async getWebhookEvents(
    @Query('limit') limit = 50,
    @Query('offset') offset = 0,
  ) {
    return this.careemWebhookService.getWebhookEvents({
      limit: Number(limit),
      offset: Number(offset),
    });
  }
}