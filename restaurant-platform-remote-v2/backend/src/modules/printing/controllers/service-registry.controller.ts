import { 
  Controller, 
  Get, 
  Post, 
  Delete, 
  Body, 
  Param, 
  Query, 
  HttpCode, 
  HttpStatus,
  BadRequestException,
  NotFoundException 
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { ServiceRegistryService, ServiceRegistrationRequest, ServiceHealthStatus } from '../services/service-registry.service';

@ApiTags('Service Registry')
@Controller('api/services')
export class ServiceRegistryController {
  constructor(private readonly serviceRegistry: ServiceRegistryService) {}

  /**
   * Register a new service
   */
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register a new service' })
  @ApiResponse({ status: 201, description: 'Service registered successfully' })
  @ApiResponse({ status: 400, description: 'Invalid service registration data' })
  async registerService(@Body() request: ServiceRegistrationRequest) {
    if (!request.serviceId || !request.serviceName || !request.serviceType || !request.version) {
      throw new BadRequestException('Missing required service registration fields');
    }

    if (!Array.isArray(request.capabilities)) {
      throw new BadRequestException('Capabilities must be an array');
    }

    try {
      const service = await this.serviceRegistry.registerService(request);
      return {
        success: true,
        message: 'Service registered successfully',
        service: {
          id: service.id,
          name: service.name,
          type: service.type,
          host: service.host,
          port: service.port,
          version: service.version,
          capabilities: service.capabilities,
          priority: service.priority,
          registeredAt: service.registeredAt,
          isHealthy: service.isHealthy
        }
      };
    } catch (error) {
      throw new BadRequestException(`Failed to register service: ${error.message}`);
    }
  }

  /**
   * Unregister a service
   */
  @Delete(':serviceId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Unregister a service' })
  @ApiResponse({ status: 204, description: 'Service unregistered successfully' })
  @ApiResponse({ status: 404, description: 'Service not found' })
  async unregisterService(@Param('serviceId') serviceId: string) {
    const success = await this.serviceRegistry.unregisterService(serviceId);
    if (!success) {
      throw new NotFoundException('Service not found');
    }
  }

  /**
   * Update service health status
   */
  @Post(':serviceId/health')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update service health status' })
  @ApiResponse({ status: 200, description: 'Health status updated successfully' })
  @ApiResponse({ status: 404, description: 'Service not found' })
  async updateServiceHealth(
    @Param('serviceId') serviceId: string,
    @Body() status: Omit<ServiceHealthStatus, 'serviceId'>
  ) {
    const healthStatus: ServiceHealthStatus = {
      serviceId,
      ...status,
      lastSeen: new Date()
    };

    const success = await this.serviceRegistry.updateServiceHealth(healthStatus);
    if (!success) {
      throw new NotFoundException('Service not found');
    }

    return {
      success: true,
      message: 'Health status updated successfully'
    };
  }

  /**
   * Record service heartbeat
   */
  @Post(':serviceId/heartbeat')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Record service heartbeat' })
  @ApiResponse({ status: 200, description: 'Heartbeat recorded successfully' })
  @ApiResponse({ status: 404, description: 'Service not found' })
  async recordHeartbeat(
    @Param('serviceId') serviceId: string,
    @Body() metadata?: Record<string, any>
  ) {
    const success = await this.serviceRegistry.recordHeartbeat(serviceId, metadata);
    if (!success) {
      throw new NotFoundException('Service not found');
    }

    return {
      success: true,
      message: 'Heartbeat recorded successfully',
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Get service by ID
   */
  @Get(':serviceId')
  @ApiOperation({ summary: 'Get service by ID' })
  @ApiResponse({ status: 200, description: 'Service found' })
  @ApiResponse({ status: 404, description: 'Service not found' })
  async getService(@Param('serviceId') serviceId: string) {
    const service = this.serviceRegistry.getService(serviceId);
    if (!service) {
      throw new NotFoundException('Service not found');
    }

    return {
      success: true,
      service
    };
  }

  /**
   * Get all services or filter by type
   */
  @Get()
  @ApiOperation({ summary: 'Get all services or filter by type' })
  @ApiQuery({ name: 'type', required: false, description: 'Filter by service type' })
  @ApiQuery({ name: 'healthy', required: false, description: 'Filter by health status' })
  @ApiResponse({ status: 200, description: 'Services retrieved successfully' })
  async getServices(
    @Query('type') serviceType?: string,
    @Query('healthy') healthyOnly?: string
  ) {
    let services;

    if (serviceType) {
      services = healthyOnly === 'true' 
        ? this.serviceRegistry.getHealthyServicesByType(serviceType)
        : this.serviceRegistry.getServicesByType(serviceType);
    } else {
      services = healthyOnly === 'true' 
        ? this.serviceRegistry.getAllHealthyServices()
        : this.serviceRegistry.getAllServices();
    }

    return {
      success: true,
      count: services.length,
      services
    };
  }

  /**
   * Get service registry statistics
   */
  @Get('stats/overview')
  @ApiOperation({ summary: 'Get service registry statistics' })
  @ApiResponse({ status: 200, description: 'Statistics retrieved successfully' })
  async getServiceStats() {
    const stats = this.serviceRegistry.getRegistryStats();
    
    return {
      success: true,
      stats,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Select best service by type
   */
  @Get('select/:serviceType')
  @ApiOperation({ summary: 'Select best service by type using load balancing' })
  @ApiQuery({ 
    name: 'strategy', 
    required: false, 
    enum: ['round-robin', 'least-connections', 'priority'],
    description: 'Load balancing strategy' 
  })
  @ApiResponse({ status: 200, description: 'Best service selected' })
  @ApiResponse({ status: 404, description: 'No healthy services available' })
  async selectBestService(
    @Param('serviceType') serviceType: string,
    @Query('strategy') strategy: 'round-robin' | 'least-connections' | 'priority' = 'priority'
  ) {
    const service = this.serviceRegistry.selectBestService(serviceType, strategy);
    
    if (!service) {
      throw new NotFoundException('No healthy services available for the specified type');
    }

    // Record connection for load balancing
    this.serviceRegistry.recordConnection(service.id);

    return {
      success: true,
      service,
      strategy,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Record service connection
   */
  @Post(':serviceId/connection')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Record service connection for load balancing' })
  @ApiResponse({ status: 200, description: 'Connection recorded successfully' })
  async recordConnection(@Param('serviceId') serviceId: string) {
    this.serviceRegistry.recordConnection(serviceId);
    
    return {
      success: true,
      message: 'Connection recorded successfully'
    };
  }

  /**
   * Record service disconnection
   */
  @Delete(':serviceId/connection')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Record service disconnection' })
  @ApiResponse({ status: 200, description: 'Disconnection recorded successfully' })
  async recordDisconnection(@Param('serviceId') serviceId: string) {
    this.serviceRegistry.recordDisconnection(serviceId);
    
    return {
      success: true,
      message: 'Disconnection recorded successfully'
    };
  }

  /**
   * Health check endpoint for service registry
   */
  @Get('health/check')
  @ApiOperation({ summary: 'Health check for service registry' })
  @ApiResponse({ status: 200, description: 'Service registry is healthy' })
  async healthCheck() {
    const stats = this.serviceRegistry.getRegistryStats();
    
    return {
      status: 'ok',
      service: 'service-registry',
      version: '2.0.0',
      timestamp: new Date().toISOString(),
      stats: {
        totalServices: stats.totalServices,
        healthyServices: stats.healthyServices,
        serviceTypes: Object.keys(stats.servicesByType)
      }
    };
  }

  /**
   * Discovery endpoint for network scanning
   */
  @Get('discover/network')
  @ApiOperation({ summary: 'Network service discovery information' })
  @ApiResponse({ status: 200, description: 'Network discovery information' })
  async getNetworkDiscoveryInfo() {
    const healthyServices = this.serviceRegistry.getAllHealthyServices();
    
    return {
      success: true,
      discovery: {
        mdnsEnabled: true,
        serviceType: 'restaurant-platform-backend',
        capabilities: ['printing', 'websocket', 'service-registry'],
        version: '2.0.0',
        endpoints: {
          api: '/api',
          websocket: '/printing-ws',
          health: '/api/health',
          registry: '/api/services'
        }
      },
      availableServices: healthyServices.map(service => ({
        id: service.id,
        name: service.name,
        type: service.type,
        host: service.host,
        port: service.port,
        capabilities: service.capabilities,
        priority: service.priority,
        isHealthy: service.isHealthy
      }))
    };
  }
}