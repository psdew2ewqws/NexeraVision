import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../database/prisma.service';
import { PrintingWebSocketGateway } from '../gateways/printing-websocket.gateway';
import * as os from 'os';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface ModernPrinter {
  id?: string;
  name: string;
  type: 'thermal' | 'receipt' | 'kitchen' | 'label' | 'barcode' | 'unknown';
  connection: 'network' | 'usb' | 'bluetooth' | 'serial';
  ipAddress?: string;
  port?: number;
  model?: string;
  manufacturer?: string;
  status: 'online' | 'offline' | 'error' | 'busy' | 'low_paper' | 'no_paper' | 'unknown';
  platform: 'windows' | 'macos' | 'linux';
  capabilities?: string[];
  lastSeen: Date;
  isAutoDetected: boolean;
  devicePath?: string;
  uri?: string;
}

@Injectable()
export class ModernPrinterDiscoveryService implements OnModuleInit {
  private readonly logger = new Logger(ModernPrinterDiscoveryService.name);
  private discoveryActive = false;
  private discoveredPrinters = new Map<string, ModernPrinter>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly printingGateway: PrintingWebSocketGateway,
  ) {}

  async onModuleInit() {
    this.logger.log('🔍 [MODERN-DISCOVERY] Initializing 24/7 Global Printer Discovery System');
    
    // Start initial discovery
    await this.performGlobalDiscovery();
    
    this.logger.log('🚀 [MODERN-DISCOVERY] Global discovery system initialized successfully');
  }

  /**
   * Scheduled printer discovery - runs every 2 minutes
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async scheduledDiscovery() {
    if (!this.discoveryActive) {
      this.logger.log('🔄 [SCHEDULED-DISCOVERY] Starting scheduled printer discovery');
      await this.performGlobalDiscovery();
    }
  }

  /**
   * Perform comprehensive printer discovery across all platforms
   */
  async performGlobalDiscovery(): Promise<ModernPrinter[]> {
    this.discoveryActive = true;
    const platform = os.platform();
    
    try {
      this.logger.log(`🔍 [GLOBAL-DISCOVERY] Starting discovery on ${platform} platform`);
      
      const discoveryMethods = [
        this.discoverCupsPrinters(),
        this.discoverWindowsPrinters(),
        this.discoverNetworkPrinters(),
        this.discoverUSBPrinters(),
      ];

      const results = await Promise.allSettled(discoveryMethods);
      const allPrinters: ModernPrinter[] = [];

      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          allPrinters.push(...result.value);
          this.logger.log(`✅ [DISCOVERY-METHOD-${index}] Found ${result.value.length} printers`);
        } else {
          this.logger.warn(`⚠️ [DISCOVERY-METHOD-${index}] Failed: ${result.reason}`);
        }
      });

      // Deduplicate printers by name and IP
      const uniquePrinters = this.deduplicatePrinters(allPrinters);
      
      // Update internal cache
      uniquePrinters.forEach(printer => {
        const key = `${printer.name}-${printer.ipAddress || printer.devicePath}`;
        this.discoveredPrinters.set(key, printer);
      });

      // Broadcast updates via WebSocket
      this.printingGateway.broadcastPrinterDiscovery(uniquePrinters);

      this.logger.log(`🎯 [GLOBAL-DISCOVERY] Completed: Found ${uniquePrinters.length} unique printers`);
      return uniquePrinters;

    } catch (error) {
      this.logger.error(`❌ [GLOBAL-DISCOVERY] Error: ${error.message}`, error.stack);
      return [];
    } finally {
      this.discoveryActive = false;
    }
  }

  /**
   * Discover CUPS printers (Linux/macOS)
   */
  private async discoverCupsPrinters(): Promise<ModernPrinter[]> {
    const platform = os.platform();
    let command: string;

    switch (platform) {
      case 'linux':
      case 'darwin': // macOS
        command = 'lpstat -p 2>/dev/null || echo "No CUPS printers"';
        break;
      case 'win32':
        command = 'wmic printer get name,status /format:csv 2>nul || echo "No Windows printers"';
        break;
      default:
        return [];
    }

    try {
      const { stdout } = await execAsync(command, { timeout: 10000 });
      const printers: ModernPrinter[] = [];

      if (platform === 'win32') {
        // Parse Windows WMIC output
        const lines = stdout.split('\n').filter(line => line.trim() && !line.includes('Node,Name,Status'));
        
        for (const line of lines) {
          const parts = line.split(',');
          if (parts.length >= 2) {
            const name = parts[1]?.trim();
            const status = parts[2]?.trim().toLowerCase();
            
            if (name && name !== 'No Windows printers') {
              printers.push({
                name,
                type: this.determinePrinterType(name),
                connection: 'network', // Assume network for Windows discovery
                status: status === 'ok' ? 'online' : 'offline',
                platform: 'windows',
                manufacturer: 'Unknown',
                lastSeen: new Date(),
                isAutoDetected: true,
                capabilities: ['text', 'graphics']
              });
            }
          }
        }
      } else {
        // Parse CUPS lpstat output
        const lines = stdout.split('\n').filter(line => line.trim());
        
        for (const line of lines) {
          if (line.includes('printer') && !line.includes('No CUPS printers')) {
            const match = line.match(/printer\s+([^\s]+)\s+(.+)/);
            if (match) {
              const name = match[1];
              const description = match[2];
              
              printers.push({
                name,
                type: this.determinePrinterType(description),
                connection: 'network',
                status: 'online',
                platform: platform === 'darwin' ? 'macos' : 'linux',
                manufacturer: this.extractManufacturer(description),
                model: description,
                lastSeen: new Date(),
                isAutoDetected: true,
                capabilities: ['text', 'graphics', 'color']
              });
            }
          }
        }
      }

      this.logger.log(`📱 [CUPS-DISCOVERY] Found ${printers.length} system printers`);
      return printers;

    } catch (error) {
      this.logger.warn(`⚠️ [CUPS-DISCOVERY] Failed: ${error.message}`);
      return [];
    }
  }

  /**
   * Discover Windows printers using PowerShell
   */
  private async discoverWindowsPrinters(): Promise<ModernPrinter[]> {
    if (os.platform() !== 'win32') return [];

    try {
      const command = `powershell -Command "Get-Printer | Select-Object Name, DriverName, PortName, PrinterStatus | ConvertTo-Json"`;
      const { stdout } = await execAsync(command, { timeout: 15000 });
      
      const printers: ModernPrinter[] = [];
      const data = JSON.parse(stdout);
      const printerArray = Array.isArray(data) ? data : [data];

      for (const printer of printerArray) {
        if (printer.Name) {
          printers.push({
            name: printer.Name,
            type: this.determinePrinterType(printer.DriverName || printer.Name),
            connection: 'network',
            status: printer.PrinterStatus === 0 ? 'online' : 'offline',
            platform: 'windows',
            manufacturer: this.extractManufacturer(printer.DriverName),
            model: printer.DriverName,
            lastSeen: new Date(),
            isAutoDetected: true,
            capabilities: ['text', 'graphics'],
            devicePath: printer.PortName
          });
        }
      }

      this.logger.log(`🖨️ [WINDOWS-DISCOVERY] Found ${printers.length} Windows printers`);
      return printers;

    } catch (error) {
      this.logger.warn(`⚠️ [WINDOWS-DISCOVERY] Failed: ${error.message}`);
      return [];
    }
  }

  /**
   * Discover network printers via IP scanning
   */
  private async discoverNetworkPrinters(): Promise<ModernPrinter[]> {
    const printers: ModernPrinter[] = [];
    
    try {
      // Get local network information
      const interfaces = os.networkInterfaces();
      const networkRanges: string[] = [];

      for (const [name, nets] of Object.entries(interfaces)) {
        if (nets) {
          for (const net of nets) {
            if (net.family === 'IPv4' && !net.internal) {
              // Extract network range (e.g., 192.168.1.0/24)
              const ip = net.address;
              const subnet = ip.substring(0, ip.lastIndexOf('.'));
              networkRanges.push(`${subnet}.0/24`);
            }
          }
        }
      }

      // Common printer ports to check
      const printerPorts = [9100, 631, 515, 80, 443];
      const commonPrinterIPs = [
        '192.168.1.100', '192.168.1.101', '192.168.1.102',
        '192.168.0.100', '192.168.0.101', '192.168.0.102',
        '10.0.0.100', '10.0.0.101', '10.0.0.102'
      ];

      // Quick scan of common printer IPs
      for (const ip of commonPrinterIPs) {
        for (const port of printerPorts) {
          try {
            const isReachable = await this.testNetworkConnection(ip, port, 1000);
            if (isReachable) {
              printers.push({
                name: `Network Printer (${ip})`,
                type: 'unknown',
                connection: 'network',
                ipAddress: ip,
                port: port,
                status: 'online',
                platform: os.platform() as any,
                manufacturer: 'Unknown',
                lastSeen: new Date(),
                isAutoDetected: true,
                capabilities: ['text']
              });
            }
          } catch {
            // Ignore connection failures
          }
        }
      }

      this.logger.log(`🌐 [NETWORK-DISCOVERY] Found ${printers.length} network printers`);
      return printers;

    } catch (error) {
      this.logger.warn(`⚠️ [NETWORK-DISCOVERY] Failed: ${error.message}`);
      return [];
    }
  }

  /**
   * Discover USB printers
   */
  private async discoverUSBPrinters(): Promise<ModernPrinter[]> {
    const platform = os.platform();
    const printers: ModernPrinter[] = [];

    try {
      let command: string;
      
      switch (platform) {
        case 'linux':
          command = 'lsusb | grep -i "printer\\|canon\\|hp\\|epson\\|brother"';
          break;
        case 'darwin':
          command = 'system_profiler SPUSBDataType | grep -A 5 -i printer';
          break;
        case 'win32':
          command = 'wmic path win32_pnpentity where "service=\'usbprint\'" get name,deviceid';
          break;
        default:
          return [];
      }

      const { stdout } = await execAsync(command, { timeout: 10000 });
      
      if (stdout && stdout.trim() !== '') {
        const lines = stdout.split('\n').filter(line => line.trim());
        
        for (const line of lines) {
          if (line.toLowerCase().includes('printer') || 
              line.toLowerCase().includes('canon') ||
              line.toLowerCase().includes('hp') ||
              line.toLowerCase().includes('epson') ||
              line.toLowerCase().includes('brother')) {
            
            printers.push({
              name: `USB Printer (${line.split(' ')[0] || 'Unknown'})`,
              type: 'unknown',
              connection: 'usb',
              status: 'online',
              platform: platform as any,
              manufacturer: this.extractManufacturer(line),
              lastSeen: new Date(),
              isAutoDetected: true,
              capabilities: ['text', 'graphics'],
              devicePath: line.trim()
            });
          }
        }
      }

      this.logger.log(`🔌 [USB-DISCOVERY] Found ${printers.length} USB printers`);
      return printers;

    } catch (error) {
      this.logger.warn(`⚠️ [USB-DISCOVERY] Failed: ${error.message}`);
      return [];
    }
  }

  /**
   * Test network connection to a printer
   */
  private async testNetworkConnection(ip: string, port: number, timeout: number): Promise<boolean> {
    return new Promise((resolve) => {
      const net = require('net');
      const socket = new net.Socket();
      
      const timer = setTimeout(() => {
        socket.destroy();
        resolve(false);
      }, timeout);

      socket.connect(port, ip, () => {
        clearTimeout(timer);
        socket.destroy();
        resolve(true);
      });

      socket.on('error', () => {
        clearTimeout(timer);
        resolve(false);
      });
    });
  }

  /**
   * Determine printer type based on name/description
   */
  private determinePrinterType(nameOrDescription: string): ModernPrinter['type'] {
    const desc = nameOrDescription.toLowerCase();
    
    if (desc.includes('thermal') || desc.includes('receipt')) return 'thermal';
    if (desc.includes('kitchen')) return 'kitchen';
    if (desc.includes('label')) return 'label';
    if (desc.includes('barcode')) return 'barcode';
    if (desc.includes('receipt')) return 'receipt';
    
    return 'unknown';
  }

  /**
   * Extract manufacturer from description
   */
  private extractManufacturer(description: string): string {
    const desc = description.toLowerCase();
    
    if (desc.includes('hp') || desc.includes('hewlett')) return 'HP';
    if (desc.includes('canon')) return 'Canon';
    if (desc.includes('epson')) return 'Epson';
    if (desc.includes('brother')) return 'Brother';
    if (desc.includes('samsung')) return 'Samsung';
    if (desc.includes('lexmark')) return 'Lexmark';
    if (desc.includes('zebra')) return 'Zebra';
    if (desc.includes('star')) return 'Star Micronics';
    
    return 'Unknown';
  }

  /**
   * Remove duplicate printers
   */
  private deduplicatePrinters(printers: ModernPrinter[]): ModernPrinter[] {
    const seen = new Set<string>();
    const unique: ModernPrinter[] = [];

    for (const printer of printers) {
      const key = `${printer.name}-${printer.ipAddress || printer.devicePath || 'local'}`;
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(printer);
      }
    }

    return unique;
  }

  /**
   * Get all currently discovered printers
   */
  getDiscoveredPrinters(): ModernPrinter[] {
    return Array.from(this.discoveredPrinters.values());
  }

  /**
   * Force immediate discovery
   */
  async forceDiscovery(): Promise<ModernPrinter[]> {
    this.logger.log('🚀 [FORCE-DISCOVERY] Manual discovery requested');
    return await this.performGlobalDiscovery();
  }
}