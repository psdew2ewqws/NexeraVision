import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('Health Check')
@Controller('api')
export class SimpleHealthController {
  /**
   * General health check endpoint
   */
  @Get('health')
  @ApiOperation({ summary: 'General health check for the restaurant platform backend' })
  @ApiResponse({ status: 200, description: 'Backend is healthy' })
  async healthCheck() {
    return {
      status: 'ok',
      service: 'restaurant-platform-backend',
      version: '2.0.0',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      platform: process.platform,
      nodeVersion: process.version,
      capabilities: ['printing', 'websocket', 'service-registry', 'api']
    };
  }
}