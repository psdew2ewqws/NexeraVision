import { Controller, Get, Post, Body, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Public } from './common/decorators/public.decorator';

@ApiTags('Health')
@Controller()
export class AppController {
  private readonly logger = new Logger(AppController.name);
  @Public()
  @Get('health')
  @ApiOperation({ summary: 'Health check endpoint' })
  @ApiResponse({ 
    status: 200, 
    description: 'Service is healthy',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'ok' },
        timestamp: { type: 'string', example: '2025-09-05T04:00:00.000Z' },
        service: { type: 'string', example: 'restaurant-platform-backend' },
        version: { type: 'string', example: '1.0.0' },
      }
    }
  })
  getHealth() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'restaurant-platform-backend',
      version: '1.0.0',
    };
  }

  @Public()
  @Get()
  @ApiOperation({ summary: 'Root endpoint - API information' })
  @ApiResponse({ 
    status: 200, 
    description: 'API information',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Restaurant Platform API v1.0' },
        documentation: { type: 'string', example: '/api/docs' },
        status: { type: 'string', example: 'running' },
      }
    }
  })
  getRoot() {
    return {
      message: 'Restaurant Platform API v1.0',
      documentation: '/api/docs',
      status: 'running',
    };
  }

  @Public()
  @Post('api/integration/webhook')
  @ApiOperation({ summary: 'NEXARA webhook receiver' })
  @ApiResponse({
    status: 200,
    description: 'Webhook received successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'Webhook received and logged' },
        timestamp: { type: 'string', example: '2025-09-27T21:35:00.000Z' },
      }
    }
  })
  receiveWebhook(@Body() payload: any) {
    this.logger.log(`✅ NEXARA WEBHOOK RECEIVED: ${JSON.stringify(payload, null, 2)}`);

    return {
      success: true,
      message: 'Webhook received and logged',
      timestamp: new Date().toISOString(),
      eventType: payload.eventType || 'unknown',
      provider: payload.provider || 'unknown',
      orderId: payload.orderId || 'unknown'
    };
  }
}