import { Controller, Get, Post, Body, Query, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Public } from '../../../common/decorators/public.decorator';
import { ServiceRegistryService } from '../services/service-registry.service';

@ApiTags('Health & Service Registry')
@Controller('health')
export class HealthController {
  private readonly logger = new Logger(HealthController.name);

  constructor(private readonly serviceRegistry: ServiceRegistryService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Health check endpoint' })
  @ApiResponse({ status: 200, description: 'Service is healthy' })
  async getHealth() {
    const stats = this.serviceRegistry.getRegistryStats();

    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'Restaurant Platform Backend',
      version: '2.0.0',
      uptime: process.uptime(),
      registry: {
        totalServices: stats.totalServices,
        healthyServices: stats.healthyServices,
        servicesByType: stats.servicesByType
      }
    };
  }

  @Public()
  @Get('services')
  @ApiOperation({ summary: 'Get registered services' })
  @ApiResponse({ status: 200, description: 'List of registered services' })
  async getServices(@Query('type') type?: string) {
    if (type) {
      const services = this.serviceRegistry.getServicesByType(type);
      return {
        success: true,
        services: services,
        count: services.length
      };
    }

    const allServices = this.serviceRegistry.getAllServices();
    const stats = this.serviceRegistry.getRegistryStats();

    return {
      success: true,
      services: allServices,
      stats: stats
    };
  }

  @Public()
  @Post('services/register')
  @ApiOperation({ summary: 'Register a service' })
  @ApiResponse({ status: 201, description: 'Service registered successfully' })
  async registerService(@Body() registrationData: {
    serviceId: string;
    serviceName: string;
    serviceType: string;
    host?: string;
    port?: number;
    version: string;
    capabilities: string[];
    priority?: number;
    metadata?: Record<string, any>;
  }) {
    try {
      this.logger.log(`Service registration request: ${registrationData.serviceName} (${registrationData.serviceType})`);

      const service = await this.serviceRegistry.registerService(registrationData);

      return {
        success: true,
        service: service,
        message: 'Service registered successfully'
      };
    } catch (error) {
      this.logger.error(`Service registration failed: ${error.message}`, error.stack);
      return {
        success: false,
        error: error.message,
        message: 'Service registration failed'
      };
    }
  }

  @Public()
  @Post('services/heartbeat')
  @ApiOperation({ summary: 'Send service heartbeat' })
  @ApiResponse({ status: 200, description: 'Heartbeat recorded' })
  async sendHeartbeat(@Body() heartbeatData: {
    serviceId: string;
    metadata?: Record<string, any>;
  }) {
    const success = await this.serviceRegistry.recordHeartbeat(
      heartbeatData.serviceId,
      heartbeatData.metadata
    );

    return {
      success: success,
      timestamp: new Date().toISOString()
    };
  }
}