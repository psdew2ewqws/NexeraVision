const { EventEmitter } = require('events');
const os = require('os');
const dns = require('dns');
const net = require('net');
const http = require('http');
const axios = require('axios');
const { Bonjour } = require('bonjour-service');

/**
 * Service Discovery Architecture for RestaurantPrint Pro
 * Handles dynamic backend URL discovery, network service discovery,
 * and service registry management with health checks and load balancing.
 */
class ServiceDiscovery extends EventEmitter {
  constructor(config, logger) {
    super();
    this.config = config;
    this.log = logger;
    
    // Service registry and discovery state
    this.discoveredServices = new Map(); // serviceId -> ServiceInfo
    this.activeServices = new Map();      // serviceId -> ActiveService
    this.currentService = null;           // Currently connected service
    this.isDiscovering = false;
    
    // Configuration
    this.discoveryConfig = {
      enabled: config.get('SERVICE_DISCOVERY_ENABLED', true),
      timeout: config.get('SERVICE_DISCOVERY_TIMEOUT', 10000),
      interval: config.get('SERVICE_DISCOVERY_INTERVAL', 30000),
      healthCheckInterval: config.get('SERVICE_HEALTH_CHECK_INTERVAL', 15000),
      maxRetries: config.get('SERVICE_MAX_RETRIES', 3),
      retryDelay: config.get('SERVICE_RETRY_DELAY', 2000),
      loadBalanceStrategy: config.get('SERVICE_LOAD_BALANCE_STRATEGY', 'round-robin'),
      fallbackUrls: this.parseFallbackUrls(config.get('SERVICE_FALLBACK_URLS', ''))
    };
    
    // Bonjour browser for network service discovery
    this.bonjourInstance = null;
    this.bonjourBrowser = null;
    this.healthCheckInterval = null;
    this.discoveryInterval = null;
    
    // Load balancing state
    this.roundRobinIndex = 0;
    
    // Initialize service discovery
    this.initialize();
  }
  
  /**
   * Initialize service discovery system
   */
  async initialize() {
    try {
      this.log.info('Initializing Service Discovery Architecture...');
      
      if (!this.discoveryConfig.enabled) {
        this.log.info('Service discovery disabled, using static configuration');
        await this.setupStaticService();
        return;
      }
      
      // Start network service discovery
      await this.startNetworkDiscovery();
      
      // Start health check monitoring
      this.startHealthChecking();
      
      // Start periodic discovery
      this.startPeriodicDiscovery();
      
      // Add fallback services
      this.addFallbackServices();
      
      this.log.info('Service Discovery Architecture initialized successfully');
      this.emit('initialized');
      
    } catch (error) {
      this.log.error('Failed to initialize service discovery:', error);
      await this.setupStaticService(); // Fallback to static configuration
    }
  }
  
  /**
   * Setup static service from configuration (fallback)
   */
  async setupStaticService() {
    const staticUrl = this.config.get('API_URL', 'http://localhost:3001');
    const serviceInfo = {
      id: 'static-backend',
      name: 'Restaurant Platform Backend (Static)',
      url: staticUrl,
      type: 'restaurant-platform-backend',
      version: 'unknown',
      capabilities: ['printing', 'websocket'],
      priority: 1,
      discoveryMethod: 'static',
      lastSeen: new Date(),
      isHealthy: true,
      responseTime: 0
    };
    
    this.discoveredServices.set(serviceInfo.id, serviceInfo);
    this.activeServices.set(serviceInfo.id, {
      ...serviceInfo,
      connectionCount: 0,
      lastHealthCheck: new Date(),
      consecutiveFailures: 0
    });
    
    // Test the static service
    try {
      const isHealthy = await this.performHealthCheck(serviceInfo);
      if (isHealthy) {
        this.currentService = serviceInfo;
        this.log.info(`Static backend service available at: ${staticUrl}`);
        this.emit('service-available', serviceInfo);
      }
    } catch (error) {
      this.log.error('Static backend service not available:', error);
    }
  }
  
  /**
   * Start network-based service discovery using Bonjour
   */
  async startNetworkDiscovery() {
    try {
      // Create Bonjour instance for restaurant platform services
      this.bonjourInstance = new Bonjour();
      
      this.bonjourBrowser = this.bonjourInstance.find({ type: 'restaurant-platform-backend' }, (service) => {
        this.handleServiceDiscovered(service);
      });
      
      this.bonjourBrowser.on('error', (error) => {
        this.log.error('Bonjour browser error:', error);
      });
      
      this.log.info('Network service discovery started (Bonjour)');
      
    } catch (error) {
      this.log.warn('Failed to start Bonjour discovery:', error);
      // Continue with manual network scanning
      await this.performNetworkScan();
    }
  }
  
  /**
   * Handle discovered service via Bonjour
   */
  async handleServiceDiscovered(service) {
    try {
      const serviceInfo = {
        id: `bonjour-${service.name}-${service.port}`,
        name: service.name,
        url: `http://${service.referer.address}:${service.port}`,
        type: service.type,
        version: service.txt?.version || 'unknown',
        capabilities: (service.txt?.capabilities || 'printing,websocket').split(','),
        priority: parseInt(service.txt?.priority || '10'),
        discoveryMethod: 'bonjour',
        lastSeen: new Date(),
        isHealthy: false,
        responseTime: 0,
        host: service.referer.address,
        port: service.port,
        txtRecord: service.txt || {}
      };
      
      this.log.info(`Discovered service via Bonjour: ${serviceInfo.name} at ${serviceInfo.url}`);
      
      // Perform health check
      const isHealthy = await this.performHealthCheck(serviceInfo);
      serviceInfo.isHealthy = isHealthy;
      
      if (isHealthy) {
        this.discoveredServices.set(serviceInfo.id, serviceInfo);
        this.activeServices.set(serviceInfo.id, {
          ...serviceInfo,
          connectionCount: 0,
          lastHealthCheck: new Date(),
          consecutiveFailures: 0
        });
        
        this.emit('service-discovered', serviceInfo);
        this.log.info(`Service registered: ${serviceInfo.name}`);
        
        // Update current service if this is better
        await this.selectBestService();
      }
      
    } catch (error) {
      this.log.error('Error handling discovered service:', error);
    }
  }
  
  /**
   * Handle service going down
   */
  handleServiceDown(service) {
    const serviceId = `bonjour-${service.name}-${service.port}`;
    
    if (this.discoveredServices.has(serviceId)) {
      this.discoveredServices.delete(serviceId);
      this.activeServices.delete(serviceId);
      
      this.log.info(`Service went down: ${service.name}`);
      this.emit('service-down', serviceId);
      
      // Select new service if current one went down
      if (this.currentService && this.currentService.id === serviceId) {
        this.selectBestService();
      }
    }
  }
  
  /**
   * Perform network scan for services
   */
  async performNetworkScan() {
    this.log.info('Performing network scan for backend services...');
    
    const networkInterfaces = os.networkInterfaces();
    const scanPromises = [];
    
    for (const [name, addresses] of Object.entries(networkInterfaces)) {
      for (const addr of addresses) {
        if (addr.family === 'IPv4' && !addr.internal) {
          // Scan common ports on the same subnet
          const baseIp = addr.address.substring(0, addr.address.lastIndexOf('.'));
          scanPromises.push(this.scanSubnet(baseIp));
        }
      }
    }
    
    try {
      await Promise.all(scanPromises);
      this.log.info('Network scan completed');
    } catch (error) {
      this.log.error('Network scan failed:', error);
    }
  }
  
  /**
   * Scan subnet for restaurant platform services
   */
  async scanSubnet(baseIp) {
    const commonPorts = [3001, 3000, 8000, 8080, 9000];
    const scanPromises = [];
    
    // Scan first 20 IPs in subnet (adjust as needed)
    for (let i = 1; i <= 20; i++) {
      const ip = `${baseIp}.${i}`;
      for (const port of commonPorts) {
        scanPromises.push(this.scanHostPort(ip, port));
      }
    }
    
    const results = await Promise.allSettled(scanPromises);
    const discovered = results.filter(r => r.status === 'fulfilled' && r.value).map(r => r.value);
    
    for (const service of discovered) {
      await this.handleServiceDiscovered(service);
    }
  }
  
  /**
   * Scan specific host and port for service
   */
  async scanHostPort(host, port) {
    return new Promise((resolve) => {
      const socket = new net.Socket();
      const timeout = 2000;
      
      socket.setTimeout(timeout);
      
      socket.on('connect', async () => {
        socket.destroy();
        
        try {
          // Test if it's a restaurant platform backend
          const response = await axios.get(`http://${host}:${port}/api/health`, {
            timeout: 3000,
            validateStatus: () => true
          });
          
          if (response.data && response.data.service === 'restaurant-platform-backend') {
            resolve({
              name: `Backend-${host}:${port}`,
              addresses: [host],
              port: port,
              type: { name: 'restaurant-platform-backend' },
              txtRecord: response.data
            });
            return;
          }
        } catch (error) {
          // Not a restaurant platform service
        }
        
        resolve(null);
      });
      
      socket.on('timeout', () => {
        socket.destroy();
        resolve(null);
      });
      
      socket.on('error', () => {
        resolve(null);
      });
      
      socket.connect(port, host);
    });
  }
  
  /**
   * Perform health check on a service
   */
  async performHealthCheck(serviceInfo) {
    const startTime = Date.now();
    
    try {
      const response = await axios.get(`${serviceInfo.url}/api/health`, {
        timeout: this.discoveryConfig.timeout,
        validateStatus: (status) => status < 500
      });
      
      const responseTime = Date.now() - startTime;
      serviceInfo.responseTime = responseTime;
      serviceInfo.lastSeen = new Date();
      
      const isHealthy = response.status === 200 && 
                       response.data && 
                       response.data.status === 'ok';
      
      if (isHealthy && response.data.version) {
        serviceInfo.version = response.data.version;
      }
      
      return isHealthy;
      
    } catch (error) {
      serviceInfo.responseTime = Date.now() - startTime;
      this.log.debug(`Health check failed for ${serviceInfo.url}:`, error.message);
      return false;
    }
  }
  
  /**
   * Start periodic health checking
   */
  startHealthChecking() {
    this.healthCheckInterval = setInterval(async () => {
      await this.performHealthChecks();
    }, this.discoveryConfig.healthCheckInterval);
    
    this.log.info('Health check monitoring started');
  }
  
  /**
   * Perform health checks on all active services
   */
  async performHealthChecks() {
    const healthChecks = Array.from(this.activeServices.values()).map(async (service) => {
      const isHealthy = await this.performHealthCheck(service);
      
      if (isHealthy) {
        service.consecutiveFailures = 0;
        service.isHealthy = true;
        service.lastHealthCheck = new Date();
      } else {
        service.consecutiveFailures++;
        
        // Remove service after too many failures
        if (service.consecutiveFailures >= this.discoveryConfig.maxRetries) {
          service.isHealthy = false;
          this.log.warn(`Service ${service.name} marked as unhealthy after ${service.consecutiveFailures} failures`);
          
          // Remove from active services
          this.activeServices.delete(service.id);
          this.emit('service-unhealthy', service);
          
          // Select new service if this was current
          if (this.currentService && this.currentService.id === service.id) {
            await this.selectBestService();
          }
        }
      }
    });
    
    await Promise.allSettled(healthChecks);
  }
  
  /**
   * Start periodic discovery
   */
  startPeriodicDiscovery() {
    this.discoveryInterval = setInterval(async () => {
      if (!this.isDiscovering) {
        this.isDiscovering = true;
        try {
          await this.performNetworkScan();
        } catch (error) {
          this.log.error('Periodic discovery failed:', error);
        } finally {
          this.isDiscovering = false;
        }
      }
    }, this.discoveryConfig.interval);
    
    this.log.info('Periodic service discovery started');
  }
  
  /**
   * Add fallback services from configuration
   */
  addFallbackServices() {
    for (const url of this.discoveryConfig.fallbackUrls) {
      const serviceInfo = {
        id: `fallback-${url.replace(/[^\w]/g, '-')}`,
        name: `Fallback Backend (${url})`,
        url: url,
        type: 'restaurant-platform-backend',
        version: 'unknown',
        capabilities: ['printing', 'websocket'],
        priority: 100, // Lower priority
        discoveryMethod: 'fallback',
        lastSeen: new Date(),
        isHealthy: false,
        responseTime: 0
      };
      
      this.discoveredServices.set(serviceInfo.id, serviceInfo);
      
      // Test fallback service
      this.performHealthCheck(serviceInfo).then(isHealthy => {
        if (isHealthy) {
          this.activeServices.set(serviceInfo.id, {
            ...serviceInfo,
            connectionCount: 0,
            lastHealthCheck: new Date(),
            consecutiveFailures: 0
          });
          this.emit('service-discovered', serviceInfo);
        }
      });
    }
  }
  
  /**
   * Select the best available service based on load balancing strategy
   */
  async selectBestService() {
    const healthyServices = Array.from(this.activeServices.values())
      .filter(service => service.isHealthy)
      .sort((a, b) => a.priority - b.priority || a.responseTime - b.responseTime);
    
    if (healthyServices.length === 0) {
      this.log.warn('No healthy services available');
      this.currentService = null;
      this.emit('no-services-available');
      return null;
    }
    
    let selectedService;
    
    switch (this.discoveryConfig.loadBalanceStrategy) {
      case 'priority':
        selectedService = healthyServices[0];
        break;
        
      case 'round-robin':
        selectedService = healthyServices[this.roundRobinIndex % healthyServices.length];
        this.roundRobinIndex++;
        break;
        
      case 'least-connections':
        selectedService = healthyServices.reduce((prev, current) => 
          current.connectionCount < prev.connectionCount ? current : prev);
        break;
        
      case 'fastest':
        selectedService = healthyServices.reduce((prev, current) => 
          current.responseTime < prev.responseTime ? current : prev);
        break;
        
      default:
        selectedService = healthyServices[0];
    }
    
    if (!this.currentService || this.currentService.id !== selectedService.id) {
      const previousService = this.currentService;
      this.currentService = selectedService;
      
      this.log.info(`Selected service: ${selectedService.name} (${selectedService.url})`);
      this.emit('service-selected', selectedService, previousService);
    }
    
    return selectedService;
  }
  
  /**
   * Get the currently selected service
   */
  getCurrentService() {
    return this.currentService;
  }
  
  /**
   * Get all discovered services
   */
  getDiscoveredServices() {
    return Array.from(this.discoveredServices.values());
  }
  
  /**
   * Get all healthy services
   */
  getHealthyServices() {
    return Array.from(this.activeServices.values()).filter(service => service.isHealthy);
  }
  
  /**
   * Get service statistics
   */
  getServiceStats() {
    const discovered = this.discoveredServices.size;
    const healthy = Array.from(this.activeServices.values()).filter(s => s.isHealthy).length;
    const unhealthy = this.activeServices.size - healthy;
    
    return {
      discovered,
      healthy,
      unhealthy,
      current: this.currentService ? this.currentService.name : null,
      discoveryEnabled: this.discoveryConfig.enabled,
      lastDiscovery: new Date().toISOString()
    };
  }
  
  /**
   * Register connection to current service
   */
  registerConnection() {
    if (this.currentService && this.activeServices.has(this.currentService.id)) {
      const service = this.activeServices.get(this.currentService.id);
      service.connectionCount++;
      this.log.debug(`Connection registered to ${service.name} (total: ${service.connectionCount})`);
    }
  }
  
  /**
   * Unregister connection from current service
   */
  unregisterConnection() {
    if (this.currentService && this.activeServices.has(this.currentService.id)) {
      const service = this.activeServices.get(this.currentService.id);
      service.connectionCount = Math.max(0, service.connectionCount - 1);
      this.log.debug(`Connection unregistered from ${service.name} (total: ${service.connectionCount})`);
    }
  }
  
  /**
   * Parse fallback URLs from configuration string
   */
  parseFallbackUrls(urlString) {
    if (!urlString) return [];
    
    return urlString.split(',')
      .map(url => url.trim())
      .filter(url => {
        try {
          new URL(url);
          return true;
        } catch {
          return false;
        }
      });
  }
  
  /**
   * Force refresh of service discovery
   */
  async refresh() {
    this.log.info('Forcing service discovery refresh...');
    
    // Clear current services
    this.discoveredServices.clear();
    this.activeServices.clear();
    this.currentService = null;
    
    // Re-initialize
    await this.initialize();
  }
  
  /**
   * Shutdown service discovery
   */
  async shutdown() {
    this.log.info('Shutting down service discovery...');
    
    // Clear intervals
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
    
    if (this.discoveryInterval) {
      clearInterval(this.discoveryInterval);
      this.discoveryInterval = null;
    }
    
    // Stop Bonjour browser
    if (this.bonjourBrowser) {
      try {
        this.bonjourBrowser.stop();
      } catch (error) {
        this.log.error('Error stopping Bonjour browser:', error);
      }
      this.bonjourBrowser = null;
    }
    
    if (this.bonjourInstance) {
      try {
        this.bonjourInstance.destroy();
      } catch (error) {
        this.log.error('Error destroying Bonjour instance:', error);
      }
      this.bonjourInstance = null;
    }
    
    // Clear services
    this.discoveredServices.clear();
    this.activeServices.clear();
    this.currentService = null;
    
    this.emit('shutdown');
    this.log.info('Service discovery shutdown complete');
  }
}

module.exports = ServiceDiscovery;