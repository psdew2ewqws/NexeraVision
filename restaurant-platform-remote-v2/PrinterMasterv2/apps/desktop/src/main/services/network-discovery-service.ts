import { EventEmitter } from 'events';
import log from 'electron-log';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as net from 'net';
import * as os from 'os';

const execAsync = promisify(exec);

export interface NetworkPrinter {
  ip: string;
  port: number;
  hostname?: string;
  macAddress?: string;
  manufacturer?: string;
  model?: string;
  status: 'online' | 'offline' | 'unknown';
  responseTime: number;
  capabilities?: string[];
  snmpInfo?: any;
}

export interface NetworkDevice {
  id: string;
  type: 'pos' | 'kiosk' | 'desktop' | 'server';
  ip: string;
  hostname: string;
  port: number;
  status: 'online' | 'offline' | 'discovering';
  services: DeviceService[];
  metadata: {
    os?: string;
    version?: string;
    lastSeen: Date;
    responseTime: number;
  };
}

export interface DeviceService {
  name: string;
  port: number;
  protocol: string;
  version?: string;
}

export interface NetworkScanConfig {
  ipRange?: string;
  ports?: number[];
  timeout?: number;
  maxConcurrent?: number;
  includeSNMP?: boolean;
  includeHostnames?: boolean;
  enableDeviceDiscovery?: boolean;
  enableServiceDiscovery?: boolean;
  retryAttempts?: number;
}

export class NetworkDiscoveryService extends EventEmitter {
  private isScanning = false;
  private defaultPorts = [9100, 9101, 9102, 631, 515, 721, 35]; // Common printer ports
  private deviceCache = new Map<string, NetworkDevice>();
  private printerCache = new Map<string, NetworkPrinter>();
  private initialized = false;

  constructor() {
    super();
  }

  async initialize(): Promise<void> {
    try {
      log.info('[NETWORK-DISCOVERY] Initializing network discovery service...');
      
      // Setup cache cleanup
      this.setupCacheCleanup();
      
      this.initialized = true;
      log.info('[NETWORK-DISCOVERY] Network discovery service initialized');
    } catch (error) {
      log.error('[NETWORK-DISCOVERY] Failed to initialize:', error);
      throw error;
    }
  }

  async shutdown(): Promise<void> {
    try {
      log.info('[NETWORK-DISCOVERY] Shutting down network discovery service...');
      
      this.isScanning = false;
      this.deviceCache.clear();
      this.printerCache.clear();
      this.removeAllListeners();
      
      this.initialized = false;
      log.info('[NETWORK-DISCOVERY] Network discovery service shut down');
    } catch (error) {
      log.error('[NETWORK-DISCOVERY] Error during shutdown:', error);
    }
  }

  async discoverDevices(config: { timeout?: number; maxRetries?: number } = {}): Promise<NetworkDevice[]> {
    const scanConfig: NetworkScanConfig = {
      enableDeviceDiscovery: true,
      enableServiceDiscovery: true,
      timeout: config.timeout || 5000,
      retryAttempts: config.maxRetries || 2
    };
    
    const printers = await this.scanNetwork(scanConfig);
    
    // Convert printers to devices for compatibility
    const devices: NetworkDevice[] = [];
    const deviceMap = new Map<string, NetworkDevice>();
    
    for (const printer of printers) {
      if (!deviceMap.has(printer.ip)) {
        const device: NetworkDevice = {
          id: this.generateDeviceId(printer.ip),
          type: 'desktop', // Default type
          ip: printer.ip,
          hostname: printer.hostname || printer.ip,
          port: printer.port,
          status: printer.status as 'online' | 'offline',
          services: [{
            name: 'printer',
            port: printer.port,
            protocol: 'raw',
            version: undefined
          }],
          metadata: {
            lastSeen: new Date(),
            responseTime: printer.responseTime
          }
        };
        
        deviceMap.set(printer.ip, device);
        devices.push(device);
      }
    }
    
    return devices;
  }

  async scanNetwork(config: NetworkScanConfig = {}): Promise<NetworkPrinter[]> {
    if (this.isScanning) {
      throw new Error('Network scan already in progress');
    }

    this.isScanning = true;
    log.info('[NETWORK-DISCOVERY] Starting network printer discovery...');

    try {
      const {
        ipRange = await this.getLocalNetworkRange(),
        ports = this.defaultPorts,
        timeout = 3000,
        maxConcurrent = 20,
        includeSNMP = false,
        includeHostnames = true
      } = config;

      log.info(`Scanning network: ${ipRange} on ports: ${ports.join(', ')}`);

      const discoveredPrinters: NetworkPrinter[] = [];
      const ipAddresses = this.generateIPRange(ipRange);
      
      // Scan in batches to avoid overwhelming the network
      const batchSize = maxConcurrent;
      for (let i = 0; i < ipAddresses.length; i += batchSize) {
        const batch = ipAddresses.slice(i, i + batchSize);
        const batchResults = await this.scanIPBatch(batch, ports, timeout, {
          includeSNMP,
          includeHostnames
        });
        
        discoveredPrinters.push(...batchResults);
        
        // Emit progress
        this.emit('scan-progress', {
          current: Math.min(i + batchSize, ipAddresses.length),
          total: ipAddresses.length,
          found: discoveredPrinters.length
        });
      }

      log.info(`Network scan completed. Found ${discoveredPrinters.length} potential printers`);
      this.emit('scan-completed', discoveredPrinters);
      
      return discoveredPrinters;

    } catch (error) {
      log.error('Network scan failed:', error);
      this.emit('scan-error', error);
      throw error;
    } finally {
      this.isScanning = false;
    }
  }

  private async scanIPBatch(
    ips: string[], 
    ports: number[], 
    timeout: number,
    options: { includeSNMP: boolean; includeHostnames: boolean }
  ): Promise<NetworkPrinter[]> {
    const promises = ips.map(ip => this.scanIPAddress(ip, ports, timeout, options));
    const results = await Promise.allSettled(promises);
    
    return results
      .filter((result): result is PromiseFulfilledResult<NetworkPrinter | null> => 
        result.status === 'fulfilled' && result.value !== null)
      .map(result => result.value);
  }

  private async scanIPAddress(
    ip: string, 
    ports: number[], 
    timeout: number,
    options: { includeSNMP: boolean; includeHostnames: boolean }
  ): Promise<NetworkPrinter | null> {
    try {
      // Test each port
      for (const port of ports) {
        const isOpen = await this.testPort(ip, port, timeout);
        if (isOpen) {
          const startTime = Date.now();
          const printer: NetworkPrinter = {
            ip,
            port,
            status: 'online',
            responseTime: Date.now() - startTime,
            capabilities: await this.detectCapabilities(ip, port, timeout)
          };

          // Get hostname if requested
          if (options.includeHostnames) {
            printer.hostname = await this.getHostname(ip);
          }

          // Get SNMP info if requested and port 161 is available
          if (options.includeSNMP) {
            printer.snmpInfo = await this.getSNMPInfo(ip);
            if (printer.snmpInfo) {
              printer.manufacturer = printer.snmpInfo.manufacturer;
              printer.model = printer.snmpInfo.model;
            }
          }

          // Try to get manufacturer/model from other methods
          if (!printer.manufacturer || !printer.model) {
            const deviceInfo = await this.getDeviceInfo(ip, port);
            printer.manufacturer = printer.manufacturer || deviceInfo.manufacturer;
            printer.model = printer.model || deviceInfo.model;
          }

          log.debug(`Found printer at ${ip}:${port}`);
          return printer;
        }
      }
      
      return null;
    } catch (error) {
      log.debug(`Failed to scan ${ip}:`, error);
      return null;
    }
  }

  private async testPort(ip: string, port: number, timeout: number): Promise<boolean> {
    return new Promise((resolve) => {
      const socket = new net.Socket();
      let isConnected = false;

      const onConnect = () => {
        isConnected = true;
        socket.destroy();
        resolve(true);
      };

      const onError = () => {
        socket.destroy();
        if (!isConnected) resolve(false);
      };

      const onTimeout = () => {
        socket.destroy();
        if (!isConnected) resolve(false);
      };

      socket.setTimeout(timeout);
      socket.once('connect', onConnect);
      socket.once('error', onError);
      socket.once('timeout', onTimeout);

      socket.connect(port, ip);
    });
  }

  private async detectCapabilities(ip: string, port: number, timeout: number): Promise<string[]> {
    const capabilities: string[] = [];
    
    try {
      // Try to determine printer type based on port
      switch (port) {
        case 9100:
        case 9101:
        case 9102:
          capabilities.push('raw', 'text', 'esc/pos');
          break;
        case 631:
          capabilities.push('ipp', 'http');
          break;
        case 515:
          capabilities.push('lpd', 'line-printer');
          break;
        case 721:
          capabilities.push('jetdirect');
          break;
      }

      // Try to send a status request to get more info
      const statusInfo = await this.getStatusInfo(ip, port, timeout);
      if (statusInfo) {
        if (statusInfo.includes('PCL')) capabilities.push('pcl');
        if (statusInfo.includes('PostScript')) capabilities.push('postscript');
        if (statusInfo.includes('PDF')) capabilities.push('pdf');
      }

    } catch (error) {
      log.debug(`Failed to detect capabilities for ${ip}:${port}:`, error);
    }
    
    return capabilities;
  }

  private async getStatusInfo(ip: string, port: number, timeout: number): Promise<string | null> {
    return new Promise((resolve) => {
      const socket = new net.Socket();
      let data = '';

      socket.setTimeout(timeout);
      
      socket.on('connect', () => {
        // Send a simple status request (varies by printer)
        socket.write('\x1D(0\x02\x00\x01\x04'); // Some printers respond to this
      });

      socket.on('data', (chunk) => {
        data += chunk.toString();
      });

      socket.on('error', () => {
        resolve(null);
      });

      socket.on('timeout', () => {
        socket.destroy();
        resolve(data || null);
      });

      socket.on('close', () => {
        resolve(data || null);
      });

      socket.connect(port, ip);
    });
  }

  private async getHostname(ip: string): Promise<string | undefined> {
    try {
      if (process.platform === 'win32') {
        const { stdout } = await execAsync(`nslookup ${ip}`);
        const match = stdout.match(/Name:\s+(.+)/);
        return match ? match[1].trim() : undefined;
      } else {
        const { stdout } = await execAsync(`host ${ip}`);
        const match = stdout.match(/pointer (.+)\./);
        return match ? match[1] : undefined;
      }
    } catch (error) {
      log.debug(`Failed to get hostname for ${ip}:`, error);
      return undefined;
    }
  }

  private async getSNMPInfo(ip: string): Promise<any> {
    try {
      // SNMP implementation would require additional dependencies
      // For now, return null - this could be implemented with node-snmp library
      return null;
    } catch (error) {
      log.debug(`Failed to get SNMP info for ${ip}:`, error);
      return null;
    }
  }

  private async getDeviceInfo(ip: string, port: number): Promise<{
    manufacturer?: string;
    model?: string;
  }> {
    try {
      // Try to get device info through various printer protocols
      return {};
    } catch (error) {
      log.debug(`Failed to get device info for ${ip}:${port}:`, error);
      return {};
    }
  }

  private async getLocalNetworkRange(): Promise<string> {
    try {
      const networkInterfaces = os.networkInterfaces();
      
      for (const [name, interfaces] of Object.entries(networkInterfaces)) {
        if (!interfaces) continue;
        
        for (const iface of interfaces) {
          if (iface.family === 'IPv4' && !iface.internal) {
            // Calculate network range from IP and netmask
            const ip = iface.address;
            const netmask = iface.netmask;
            
            if (ip.startsWith('192.168.') || ip.startsWith('10.') || 
                (ip.startsWith('172.') && parseInt(ip.split('.')[1]) >= 16 && parseInt(ip.split('.')[1]) <= 31)) {
              
              // For common private networks, use /24 subnet
              const networkBase = ip.split('.').slice(0, 3).join('.');
              return `${networkBase}.1-254`;
            }
          }
        }
      }
      
      // Default to common ranges if auto-detection fails
      return '192.168.1.1-254';
    } catch (error) {
      log.error('Failed to detect local network range:', error);
      return '192.168.1.1-254';
    }
  }

  private generateIPRange(range: string): string[] {
    const ips: string[] = [];
    
    if (range.includes('-')) {
      const [start, end] = range.split('-');
      const startParts = start.split('.');
      const endParts = end.split('.');
      
      if (startParts.length === 4 && endParts.length === 1) {
        // Format: 192.168.1.1-254
        const baseIP = startParts.slice(0, 3).join('.');
        const startOctet = parseInt(startParts[3]);
        const endOctet = parseInt(endParts[0]);
        
        for (let i = startOctet; i <= endOctet; i++) {
          ips.push(`${baseIP}.${i}`);
        }
      }
    } else if (range.includes('/')) {
      // CIDR notation - would need more complex implementation
      throw new Error('CIDR notation not yet implemented');
    } else {
      // Single IP
      ips.push(range);
    }
    
    return ips;
  }

  async validatePrinter(ip: string, port: number, timeout: number = 5000): Promise<boolean> {
    try {
      return await this.testPort(ip, port, timeout);
    } catch (error) {
      log.error(`Failed to validate printer ${ip}:${port}:`, error);
      return false;
    }
  }

  async getPrinterCapabilities(ip: string, port: number, timeout: number = 5000): Promise<string[]> {
    try {
      return await this.detectCapabilities(ip, port, timeout);
    } catch (error) {
      log.error(`Failed to get capabilities for ${ip}:${port}:`, error);
      return ['text']; // Default capability
    }
  }

  isScanning(): boolean {
    return this.isScanning;
  }

  stopScan(): void {
    this.isScanning = false;
    this.emit('scan-stopped');
    log.info('[NETWORK-DISCOVERY] Network scan stopped');
  }

  private setupCacheCleanup(): void {
    // Clean up cache every 10 minutes
    setInterval(() => {
      const cutoff = Date.now() - (10 * 60 * 1000); // 10 minutes
      
      for (const [key, device] of this.deviceCache.entries()) {
        if (device.metadata.lastSeen.getTime() < cutoff) {
          this.deviceCache.delete(key);
        }
      }
      
      for (const [key, printer] of this.printerCache.entries()) {
        // Simple timestamp check - would need to add timestamp to NetworkPrinter interface
        this.printerCache.delete(key);
      }
    }, 10 * 60 * 1000); // 10 minutes
  }

  private generateDeviceId(ip: string): string {
    return `device-${ip.replace(/\./g, '-')}`;
  }

  // Enhanced network discovery with retries and error recovery
  async discoverWithRetry(config: NetworkScanConfig = {}): Promise<NetworkPrinter[]> {
    const maxRetries = config.retryAttempts || 3;
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        log.info(`[NETWORK-DISCOVERY] Discovery attempt ${attempt}/${maxRetries}`);
        const result = await this.scanNetwork(config);
        
        if (result.length > 0 || attempt === maxRetries) {
          return result;
        }
      } catch (error) {
        lastError = error as Error;
        log.warn(`[NETWORK-DISCOVERY] Attempt ${attempt} failed:`, error);
        
        if (attempt < maxRetries) {
          // Exponential backoff
          const delay = Math.pow(2, attempt - 1) * 1000;
          log.info(`[NETWORK-DISCOVERY] Retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    if (lastError) {
      throw lastError;
    }
    
    return [];
  }

  // Get cached devices
  getCachedDevices(): NetworkDevice[] {
    return Array.from(this.deviceCache.values());
  }

  // Get cached printers
  getCachedPrinters(): NetworkPrinter[] {
    return Array.from(this.printerCache.values());
  }

  // Check if service is initialized
  isInitialized(): boolean {
    return this.initialized;
  }

  // Advanced ping with multiple protocols
  async advancedPing(ip: string, timeout: number = 3000): Promise<{
    reachable: boolean;
    responseTime: number;
    method: 'tcp' | 'icmp' | 'http';
  }> {
    const startTime = Date.now();

    // Try TCP ping first (port 80)
    try {
      const tcpResult = await this.testPort(ip, 80, timeout);
      if (tcpResult) {
        return {
          reachable: true,
          responseTime: Date.now() - startTime,
          method: 'tcp'
        };
      }
    } catch (error) {
      log.debug(`[NETWORK-DISCOVERY] TCP ping failed for ${ip}:`, error);
    }

    // Try system ping as fallback
    try {
      const { stdout } = await execAsync(
        process.platform === 'win32' 
          ? `ping -n 1 -w ${timeout} ${ip}`
          : `ping -c 1 -W ${Math.ceil(timeout/1000)} ${ip}`,
        { timeout }
      );
      
      if (stdout.includes('TTL=') || stdout.includes('ttl=')) {
        return {
          reachable: true,
          responseTime: Date.now() - startTime,
          method: 'icmp'
        };
      }
    } catch (error) {
      log.debug(`[NETWORK-DISCOVERY] ICMP ping failed for ${ip}:`, error);
    }

    return {
      reachable: false,
      responseTime: Date.now() - startTime,
      method: 'tcp'
    };
  }
}