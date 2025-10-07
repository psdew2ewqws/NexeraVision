// Network Printer Discovery Service - 2025 Edition
import { Injectable, Logger } from '@nestjs/common';
import * as dgram from 'dgram';
import * as net from 'net';
import * as dns from 'dns';
import { promisify } from 'util';

interface NetworkPrinter {
  ip: string;
  port: number;
  hostname?: string;
  mac?: string;
  manufacturer?: string;
  model?: string;
  capabilities?: string[];
  status: 'online' | 'offline';
  responseTime: number;
}

interface DiscoveryOptions {
  scanRange: string; // e.g., '192.168.1.0/24'
  ports: number[]; // [9100, 515, 631]
  timeout: number;
  concurrency?: number;
}

@Injectable()
export class NetworkDiscoveryService {
  private readonly logger = new Logger(NetworkDiscoveryService.name);

  // Discover printers on the network
  async discoverPrinters(options: DiscoveryOptions): Promise<NetworkPrinter[]> {
    const { scanRange, ports, timeout, concurrency = 20 } = options;
    
    this.logger.log(`Starting network discovery: ${scanRange}, ports: ${ports.join(',')}`);
    
    const ips = this.generateIPRange(scanRange);
    const printers: NetworkPrinter[] = [];
    
    // Scan IPs in batches for better performance
    for (let i = 0; i < ips.length; i += concurrency) {
      const batch = ips.slice(i, i + concurrency);
      const batchResults = await Promise.allSettled(
        batch.map(ip => this.scanIP(ip, ports, timeout))
      );
      
      batchResults.forEach((result, index) => {
        if (result.status === 'fulfilled' && result.value.length > 0) {
          printers.push(...result.value);
        }
      });
      
      // Progress logging
      if (i % (concurrency * 5) === 0) {
        this.logger.log(`Scanned ${Math.min(i + concurrency, ips.length)}/${ips.length} IPs`);
      }
    }
    
    this.logger.log(`Discovery completed: Found ${printers.length} printers`);
    return printers;
  }

  // Scan a single IP for printer services
  private async scanIP(ip: string, ports: number[], timeout: number): Promise<NetworkPrinter[]> {
    const printers: NetworkPrinter[] = [];
    
    const portScanPromises = ports.map(port => this.scanPort(ip, port, timeout));
    const results = await Promise.allSettled(portScanPromises);
    
    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      if (result.status === 'fulfilled' && result.value) {
        printers.push(result.value);
      }
    }
    
    return printers;
  }

  // Scan a specific port on an IP
  private async scanPort(ip: string, port: number, timeout: number): Promise<NetworkPrinter | null> {
    return new Promise((resolve) => {
      const startTime = Date.now();
      const socket = new net.Socket();
      
      socket.setTimeout(timeout);
      
      socket.on('connect', async () => {
        const responseTime = Date.now() - startTime;
        socket.destroy();
        
        try {
          // Try to get more details about the printer
          const details = await this.getPrinterDetails(ip, port, timeout);
          
          resolve({
            ip,
            port,
            hostname: await this.resolveHostname(ip),
            ...details,
            status: 'online',
            responseTime
          });
        } catch (error) {
          // Basic printer info if details fail
          resolve({
            ip,
            port,
            hostname: await this.resolveHostname(ip),
            status: 'online',
            responseTime,
            capabilities: this.getDefaultCapabilities(port)
          });
        }
      });
      
      socket.on('timeout', () => {
        socket.destroy();
        resolve(null);
      });
      
      socket.on('error', () => {
        socket.destroy();
        resolve(null);
      });
      
      socket.connect(port, ip);
    });
  }

  // Get detailed printer information
  private async getPrinterDetails(ip: string, port: number, timeout: number): Promise<Partial<NetworkPrinter>> {
    const details: Partial<NetworkPrinter> = {};
    
    try {
      if (port === 631) {
        // IPP (Internet Printing Protocol)
        details.capabilities = await this.getIPPCapabilities(ip, port, timeout);
      } else if (port === 9100) {
        // RAW/JetDirect
        details.capabilities = await this.getRawPrinterInfo(ip, port, timeout);
      } else if (port === 515) {
        // LPR/LPD
        details.capabilities = ['text', 'postscript'];
      }
      
      // Try SNMP for additional info
      const snmpInfo = await this.getSNMPInfo(ip, timeout);
      if (snmpInfo) {
        details.manufacturer = snmpInfo.manufacturer;
        details.model = snmpInfo.model;
        details.mac = snmpInfo.mac;
      }
      
    } catch (error) {
      this.logger.warn(`Failed to get details for ${ip}:${port}`, error.message);
    }
    
    return details;
  }

  // Get IPP capabilities
  private async getIPPCapabilities(ip: string, port: number, timeout: number): Promise<string[]> {
    // Simplified IPP query - in production, use a proper IPP library
    return ['text', 'pdf', 'postscript', 'image'];
  }

  // Get RAW printer information
  private async getRawPrinterInfo(ip: string, port: number, timeout: number): Promise<string[]> {
    return new Promise((resolve) => {
      const socket = new net.Socket();
      socket.setTimeout(timeout);
      
      // Send ESC/POS status query
      const statusQuery = Buffer.from([0x10, 0x04, 0x01]); // DLE EOT 1
      
      socket.on('connect', () => {
        socket.write(statusQuery);
      });
      
      socket.on('data', (data) => {
        socket.destroy();
        // Parse response to determine capabilities
        const capabilities = ['text', 'cut'];
        
        // Basic capability detection based on response
        if (data.length > 0) {
          capabilities.push('status_query');
        }
        
        resolve(capabilities);
      });
      
      socket.on('timeout', () => {
        socket.destroy();
        resolve(['text']); // Basic fallback
      });
      
      socket.on('error', () => {
        socket.destroy();
        resolve(['text']); // Basic fallback
      });
      
      socket.connect(port, ip);
    });
  }

  // Get SNMP information (simplified)
  private async getSNMPInfo(ip: string, timeout: number): Promise<{
    manufacturer?: string;
    model?: string;
    mac?: string;
  } | null> {
    // In production, use proper SNMP library like net-snmp
    // This is a placeholder for SNMP queries
    try {
      // Common SNMP OIDs for printers:
      // 1.3.6.1.2.1.25.3.2.1.3.1 - Device description
      // 1.3.6.1.2.1.1.1.0 - System description
      // 1.3.6.1.2.1.2.2.1.6.1 - MAC address
      
      return {
        manufacturer: 'Unknown',
        model: 'Network Printer',
        mac: undefined
      };
    } catch (error) {
      return null;
    }
  }

  // Resolve hostname from IP
  private async resolveHostname(ip: string): Promise<string | undefined> {
    try {
      const lookupAsync = promisify(dns.reverse);
      const hostnames = await lookupAsync(ip);
      return hostnames[0];
    } catch (error) {
      return undefined;
    }
  }

  // Generate IP range from CIDR notation
  private generateIPRange(cidr: string): string[] {
    const [baseIP, maskBits] = cidr.split('/');
    const mask = parseInt(maskBits, 10);
    
    if (mask < 8 || mask > 30) {
      throw new Error('Invalid CIDR mask. Must be between /8 and /30');
    }
    
    const [a, b, c, d] = baseIP.split('.').map(Number);
    const baseNum = (a << 24) + (b << 16) + (c << 8) + d;
    
    const hostBits = 32 - mask;
    const numHosts = Math.pow(2, hostBits) - 2; // Exclude network and broadcast
    const networkBase = baseNum & (0xFFFFFFFF << hostBits);
    
    const ips: string[] = [];
    
    for (let i = 1; i <= numHosts; i++) {
      const hostNum = networkBase + i;
      const ip = [
        (hostNum >>> 24) & 0xFF,
        (hostNum >>> 16) & 0xFF,
        (hostNum >>> 8) & 0xFF,
        hostNum & 0xFF
      ].join('.');
      ips.push(ip);
    }
    
    return ips;
  }

  // Get default capabilities based on port
  private getDefaultCapabilities(port: number): string[] {
    switch (port) {
      case 9100: // RAW/JetDirect
        return ['text', 'cut', 'graphics', 'barcode'];
      case 515: // LPR/LPD
        return ['text', 'postscript'];
      case 631: // IPP
        return ['text', 'pdf', 'postscript', 'image'];
      default:
        return ['text'];
    }
  }

  // Validate specific printer
  async validatePrinter(ip: string, port: number, timeout: number = 5000): Promise<boolean> {
    try {
      const result = await this.scanPort(ip, port, timeout);
      return result !== null;
    } catch (error) {
      this.logger.warn(`Validation failed for ${ip}:${port}`, error.message);
      return false;
    }
  }

  // Get printer capabilities
  async getPrinterCapabilities(ip: string, port: number, timeout: number = 5000): Promise<string[]> {
    try {
      const details = await this.getPrinterDetails(ip, port, timeout);
      return details.capabilities || this.getDefaultCapabilities(port);
    } catch (error) {
      this.logger.warn(`Failed to get capabilities for ${ip}:${port}`, error.message);
      return this.getDefaultCapabilities(port);
    }
  }
}