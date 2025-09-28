import { Injectable, Logger, OnModuleInit, OnModuleDestroy, Inject, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import * as os from 'os';

export interface RegisteredService {
  id: string;
  name: string;
  type: string;
  host: string;
  port: number;
  version: string;
  capabilities: string[];
  priority: number;
  registeredAt: Date;
  lastSeen: Date;
  isHealthy: boolean;
  metadata: Record<string, any>;
  heartbeatInterval?: NodeJS.Timeout;
  connectionCount: number;
  requestCount: number;
}

export interface ServiceRegistrationRequest {
  serviceId: string;
  serviceName: string;
  serviceType: string;
  host?: string;
  port?: number;
  version: string;
  capabilities: string[];
  priority?: number;
  metadata?: Record<string, any>;
}

export interface ServiceHealthStatus {
  serviceId: string;
  isHealthy: boolean;
  lastSeen: Date;
  responseTime?: number;
  status: 'online' | 'offline' | 'degraded';
  metadata?: Record<string, any>;
}

/**
 * Service Registry for Restaurant Platform Backend
 * Manages registration, discovery, and health monitoring of services
 * including PrinterMaster desktop applications and other backend services.
 */
@Injectable()
export class ServiceRegistryService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ServiceRegistryService.name);
  
  // Service registry state
  private readonly registeredServices = new Map<string, RegisteredService>();
  private readonly servicesByType = new Map<string, Set<string>>();
  private readonly healthCheckIntervals = new Map<string, NodeJS.Timeout>();
  
  // Bonjour service for network discovery
  private bonjourInstance: any = null;
  private bonjourAdvertisement: any = null;
  private isAdvertising = false;
  
  // Configuration
  private readonly registryConfig = {
    serviceName: 'Restaurant Platform Backend',
    serviceType: 'restaurant-platform-backend',
    mdnsEnabled: true,
    mdnsPort: parseInt(process.env.PORT || '3001'),
    heartbeatInterval: parseInt(process.env.SERVICE_HEARTBEAT_INTERVAL || '30000'),
    healthCheckInterval: parseInt(process.env.SERVICE_HEALTH_CHECK_INTERVAL || '15000'),
    maxMissedHeartbeats: parseInt(process.env.SERVICE_MAX_MISSED_HEARTBEATS || '3'),
    cleanupInterval: parseInt(process.env.SERVICE_CLEANUP_INTERVAL || '60000'),
    enableAutoCleanup: process.env.SERVICE_AUTO_CLEANUP !== 'false'
  };

  constructor(
    private readonly configService: ConfigService,
    @Optional() private readonly eventEmitter?: EventEmitter2,
  ) {}

  async onModuleInit() {
    this.logger.log('Initializing Service Registry...');
    
    // Start Bonjour advertisement
    if (this.registryConfig.mdnsEnabled) {
      await this.startBonjourAdvertisement();
    }
    
    // Start periodic cleanup
    if (this.registryConfig.enableAutoCleanup) {
      this.startPeriodicCleanup();
    }
    
    // Register self as a service
    await this.registerSelf();
    
    this.logger.log('Service Registry initialized successfully');
  }

  async onModuleDestroy() {
    this.logger.log('Shutting down Service Registry...');
    
    // Stop Bonjour advertisement
    if (this.bonjourAdvertisement) {
      try {
        this.bonjourAdvertisement.stop();
        this.isAdvertising = false;
      } catch (error) {
        this.logger.error('Error stopping Bonjour advertisement:', error);
      }
    }
    
    if (this.bonjourInstance) {
      try {
        this.bonjourInstance.destroy();
        this.bonjourInstance = null;
      } catch (error) {
        this.logger.error('Error destroying Bonjour instance:', error);
      }
    }
    
    // Clear all intervals
    for (const interval of this.healthCheckIntervals.values()) {
      clearInterval(interval);
    }
    this.healthCheckIntervals.clear();
    
    // Clear services
    this.registeredServices.clear();
    this.servicesByType.clear();
    
    this.logger.log('Service Registry shutdown complete');
  }

  /**
   * Register a new service
   */
  async registerService(request: ServiceRegistrationRequest): Promise<RegisteredService> {
    const serviceId = request.serviceId;
    const now = new Date();
    
    // Create or update service registration
    const existingService = this.registeredServices.get(serviceId);
    
    const service: RegisteredService = {
      id: serviceId,
      name: request.serviceName,
      type: request.serviceType,
      host: request.host || this.getLocalHost(),
      port: request.port || this.registryConfig.mdnsPort,
      version: request.version,
      capabilities: request.capabilities,
      priority: request.priority || 10,
      registeredAt: existingService?.registeredAt || now,
      lastSeen: now,
      isHealthy: true,
      metadata: request.metadata || {},
      connectionCount: existingService?.connectionCount || 0,
      requestCount: existingService?.requestCount || 0
    };
    
    // Store service
    this.registeredServices.set(serviceId, service);
    
    // Update type index
    if (!this.servicesByType.has(service.type)) {
      this.servicesByType.set(service.type, new Set());
    }
    this.servicesByType.get(service.type)!.add(serviceId);
    
    // Setup heartbeat monitoring
    this.setupHeartbeatMonitoring(service);
    
    // Emit registration event
    this.eventEmitter?.emit('service.registered', service);
    
    this.logger.log(`Service registered: ${service.name} (${serviceId}) - Type: ${service.type}`);
    
    return service;
  }

  /**
   * Unregister a service
   */
  async unregisterService(serviceId: string): Promise<boolean> {
    const service = this.registeredServices.get(serviceId);
    if (!service) {
      return false;
    }
    
    // Clear heartbeat monitoring
    const interval = this.healthCheckIntervals.get(serviceId);
    if (interval) {
      clearInterval(interval);
      this.healthCheckIntervals.delete(serviceId);
    }
    
    // Remove from type index
    const typeSet = this.servicesByType.get(service.type);
    if (typeSet) {
      typeSet.delete(serviceId);
      if (typeSet.size === 0) {
        this.servicesByType.delete(service.type);
      }
    }
    
    // Remove from registry
    this.registeredServices.delete(serviceId);
    
    // Emit unregistration event
    this.eventEmitter?.emit('service.unregistered', service);
    
    this.logger.log(`Service unregistered: ${service.name} (${serviceId})`);
    
    return true;
  }

  /**
   * Update service health status
   */
  async updateServiceHealth(status: ServiceHealthStatus): Promise<boolean> {
    const service = this.registeredServices.get(status.serviceId);
    if (!service) {
      return false;
    }
    
    const wasHealthy = service.isHealthy;
    service.isHealthy = status.isHealthy;
    service.lastSeen = status.lastSeen;
    
    if (status.metadata) {
      service.metadata = { ...service.metadata, ...status.metadata };
    }
    
    // Emit health change event if status changed
    if (wasHealthy !== service.isHealthy) {
      this.eventEmitter?.emit('service.health_changed', {
        service,
        previousHealth: wasHealthy,
        currentHealth: service.isHealthy
      });
      
      this.logger.log(`Service health changed: ${service.name} - ${wasHealthy ? 'healthy' : 'unhealthy'} -> ${service.isHealthy ? 'healthy' : 'unhealthy'}`);
    }
    
    return true;
  }

  /**
   * Record service heartbeat
   */
  async recordHeartbeat(serviceId: string, metadata?: Record<string, any>): Promise<boolean> {
    const service = this.registeredServices.get(serviceId);
    if (!service) {
      return false;
    }
    
    service.lastSeen = new Date();
    service.isHealthy = true;
    
    if (metadata) {
      service.metadata = { ...service.metadata, ...metadata };
    }
    
    return true;
  }

  /**
   * Get service by ID
   */
  getService(serviceId: string): RegisteredService | undefined {
    return this.registeredServices.get(serviceId);
  }

  /**
   * Get services by type
   */
  getServicesByType(serviceType: string): RegisteredService[] {
    const serviceIds = this.servicesByType.get(serviceType);
    if (!serviceIds) {
      return [];
    }
    
    return Array.from(serviceIds)
      .map(id => this.registeredServices.get(id))
      .filter(Boolean) as RegisteredService[];
  }

  /**
   * Get all healthy services by type
   */
  getHealthyServicesByType(serviceType: string): RegisteredService[] {
    return this.getServicesByType(serviceType)
      .filter(service => service.isHealthy)
      .sort((a, b) => a.priority - b.priority);
  }

  /**
   * Get all registered services
   */
  getAllServices(): RegisteredService[] {
    return Array.from(this.registeredServices.values());
  }

  /**
   * Get all healthy services
   */
  getAllHealthyServices(): RegisteredService[] {
    return this.getAllServices().filter(service => service.isHealthy);
  }

  /**
   * Get service registry statistics
   */
  getRegistryStats(): {
    totalServices: number;
    healthyServices: number;
    unhealthyServices: number;
    servicesByType: Record<string, number>;
    averageConnectionCount: number;
    totalRequests: number;
  } {
    const services = this.getAllServices();
    const healthy = services.filter(s => s.isHealthy);
    
    const servicesByType: Record<string, number> = {};
    for (const [type, serviceIds] of this.servicesByType.entries()) {
      servicesByType[type] = serviceIds.size;
    }
    
    const totalConnections = services.reduce((sum, s) => sum + s.connectionCount, 0);
    const totalRequests = services.reduce((sum, s) => sum + s.requestCount, 0);
    
    return {
      totalServices: services.length,
      healthyServices: healthy.length,
      unhealthyServices: services.length - healthy.length,
      servicesByType,
      averageConnectionCount: services.length > 0 ? totalConnections / services.length : 0,
      totalRequests
    };
  }

  /**
   * Select best service by type using load balancing
   */
  selectBestService(serviceType: string, strategy: 'round-robin' | 'least-connections' | 'priority' = 'priority'): RegisteredService | undefined {
    const healthyServices = this.getHealthyServicesByType(serviceType);
    
    if (healthyServices.length === 0) {
      return undefined;
    }
    
    switch (strategy) {
      case 'priority':
        return healthyServices[0]; // Already sorted by priority
        
      case 'least-connections':
        return healthyServices.reduce((prev, current) => 
          current.connectionCount < prev.connectionCount ? current : prev);
        
      case 'round-robin':
        // Simple round-robin based on current time
        const index = Date.now() % healthyServices.length;
        return healthyServices[index];
        
      default:
        return healthyServices[0];
    }
  }

  /**
   * Record service connection
   */
  recordConnection(serviceId: string): void {
    const service = this.registeredServices.get(serviceId);
    if (service) {
      service.connectionCount++;
    }
  }

  /**
   * Record service disconnection
   */
  recordDisconnection(serviceId: string): void {
    const service = this.registeredServices.get(serviceId);
    if (service) {
      service.connectionCount = Math.max(0, service.connectionCount - 1);
    }
  }

  /**
   * Record service request
   */
  recordRequest(serviceId: string): void {
    const service = this.registeredServices.get(serviceId);
    if (service) {
      service.requestCount++;
      service.lastSeen = new Date();
    }
  }

  /**
   * Start Bonjour advertisement for network discovery
   */
  private async startBonjourAdvertisement() {
    try {
      // Dynamic import to handle potential missing dependency
      const { Bonjour } = await import('bonjour-service');
      this.bonjourInstance = new Bonjour();
      
      const advertisementOptions = {
        name: this.registryConfig.serviceName,
        type: this.registryConfig.serviceType,
        port: this.registryConfig.mdnsPort,
        txt: {
          version: '2.0.0',
          capabilities: 'printing,websocket,service-registry',
          priority: '1',
          api: '/api',
          websocket: '/printing-ws',
          health: '/api/health'
        }
      };
      
      this.bonjourAdvertisement = this.bonjourInstance.publish(advertisementOptions);
      this.isAdvertising = true;
      
      this.logger.log(`Bonjour advertisement started on port ${this.registryConfig.mdnsPort}`);
      
    } catch (error) {
      this.logger.warn('Failed to start Bonjour advertisement (this is optional):', error.message);
      this.isAdvertising = false;
    }
  }

  /**
   * Setup heartbeat monitoring for a service
   */
  private setupHeartbeatMonitoring(service: RegisteredService) {
    // Clear existing interval if any
    const existingInterval = this.healthCheckIntervals.get(service.id);
    if (existingInterval) {
      clearInterval(existingInterval);
    }
    
    // Setup new heartbeat monitoring
    const interval = setInterval(() => {
      this.checkServiceHeartbeat(service.id);
    }, this.registryConfig.healthCheckInterval);
    
    this.healthCheckIntervals.set(service.id, interval);
  }

  /**
   * Check service heartbeat and mark as unhealthy if missed
   */
  private checkServiceHeartbeat(serviceId: string) {
    const service = this.registeredServices.get(serviceId);
    if (!service) {
      return;
    }
    
    const now = new Date();
    const timeSinceLastSeen = now.getTime() - service.lastSeen.getTime();
    const maxMissedTime = this.registryConfig.heartbeatInterval * this.registryConfig.maxMissedHeartbeats;
    
    if (timeSinceLastSeen > maxMissedTime && service.isHealthy) {
      service.isHealthy = false;
      
      this.eventEmitter?.emit('service.health_changed', {
        service,
        previousHealth: true,
        currentHealth: false
      });
      
      this.logger.warn(`Service marked as unhealthy due to missed heartbeat: ${service.name} (${serviceId})`);
    }
  }

  /**
   * Start periodic cleanup of stale services
   */
  private startPeriodicCleanup() {
    setInterval(() => {
      this.cleanupStaleServices();
    }, this.registryConfig.cleanupInterval);
    
    this.logger.log('Periodic service cleanup started');
  }

  /**
   * Cleanup stale services that haven't been seen for a long time
   */
  private cleanupStaleServices() {
    const now = new Date();
    const maxStaleTime = this.registryConfig.cleanupInterval * 5; // 5 cleanup intervals
    const staleServices: string[] = [];
    
    for (const [serviceId, service] of this.registeredServices.entries()) {
      const timeSinceLastSeen = now.getTime() - service.lastSeen.getTime();
      
      if (timeSinceLastSeen > maxStaleTime && !service.isHealthy) {
        staleServices.push(serviceId);
      }
    }
    
    // Remove stale services
    for (const serviceId of staleServices) {
      this.unregisterService(serviceId);
      this.logger.log(`Cleaned up stale service: ${serviceId}`);
    }
    
    if (staleServices.length > 0) {
      this.logger.log(`Cleaned up ${staleServices.length} stale services`);
    }
  }

  /**
   * Register self as a service
   */
  private async registerSelf() {
    const selfServiceRequest: ServiceRegistrationRequest = {
      serviceId: `backend-${this.getLocalHost()}-${this.registryConfig.mdnsPort}`,
      serviceName: this.registryConfig.serviceName,
      serviceType: this.registryConfig.serviceType,
      host: this.getLocalHost(),
      port: this.registryConfig.mdnsPort,
      version: '2.0.0',
      capabilities: ['printing', 'websocket', 'service-registry', 'api'],
      priority: 1,
      metadata: {
        nodeVersion: process.version,
        platform: process.platform,
        uptime: process.uptime(),
        pid: process.pid,
        endpoints: {
          api: '/api',
          websocket: '/printing-ws',
          health: '/api/health',
          registry: '/api/services'
        }
      }
    };
    
    await this.registerService(selfServiceRequest);
  }

  /**
   * Get local host IP address
   */
  private getLocalHost(): string {
    const networkInterfaces = os.networkInterfaces();
    
    for (const [name, addresses] of Object.entries(networkInterfaces)) {
      if (addresses) {
        for (const addr of addresses) {
          if (addr.family === 'IPv4' && !addr.internal) {
            return addr.address;
          }
        }
      }
    }
    
    return 'localhost';
  }
}