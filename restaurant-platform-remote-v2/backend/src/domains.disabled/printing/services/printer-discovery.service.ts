import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../shared/database/prisma.service';
import { MenuHereIntegrationService } from './menuhere-integration.service';
import * as net from 'net';
import * as dgram from 'dgram';
import { promisify } from 'util';

interface DiscoveredPrinter {
  ip?: string;
  port?: number;
  name: string;
  manufacturer?: string;
  model?: string;
  type: 'thermal' | 'receipt' | 'kitchen' | 'label';
  connection: 'network' | 'menuhere';
  capabilities: string[];
  menuHereName?: string; // For MenuHere printers
  isDefault?: boolean;
}

@Injectable()
export class PrinterDiscoveryService {
  private readonly logger = new Logger(PrinterDiscoveryService.name);
  
  constructor(
    private prisma: PrismaService,
    private menuHereService: MenuHereIntegrationService
  ) {}

  async discoverPrinters(companyId: string, branchId?: string, timeout: number = 10000): Promise<{
    discovered: DiscoveredPrinter[];
    added: number;
    existing: number;
  }> {
    this.logger.log(`Starting printer discovery with timeout: ${timeout}ms`);
    
    const discoveredPrinters: DiscoveredPrinter[] = [];
    
    try {
      // Parallel discovery methods including MenuHere
      const [networkPrinters, broadcastPrinters, snmpPrinters, menuHerePrinters] = await Promise.allSettled([
        this.discoverNetworkPrinters(timeout),
        this.discoverBroadcastPrinters(timeout),
        this.discoverSNMPPrinters(timeout),
        this.discoverMenuHerePrinters()
      ]);

      // Combine results
      if (networkPrinters.status === 'fulfilled') {
        discoveredPrinters.push(...networkPrinters.value);
      }
      if (broadcastPrinters.status === 'fulfilled') {
        discoveredPrinters.push(...broadcastPrinters.value);
      }
      if (snmpPrinters.status === 'fulfilled') {
        discoveredPrinters.push(...snmpPrinters.value);
      }
      if (menuHerePrinters.status === 'fulfilled') {
        discoveredPrinters.push(...menuHerePrinters.value);
      }

      // Remove duplicates based on IP or MenuHere name
      const uniquePrinters = discoveredPrinters.reduce((acc, printer) => {
        const key = printer.connection === 'menuhere' 
          ? `menuhere:${printer.menuHereName || printer.name}`
          : `${printer.ip}:${printer.port}`;
        if (!acc.has(key)) {
          acc.set(key, printer);
        }
        return acc;
      }, new Map<string, DiscoveredPrinter>());

      const finalDiscovered = Array.from(uniquePrinters.values());
      
      this.logger.log(`Discovered ${finalDiscovered.length} unique printers`);

      // Add new printers to database
      const addResults = await this.addDiscoveredPrinters(finalDiscovered, companyId, branchId);
      
      return {
        discovered: finalDiscovered,
        added: addResults.added,
        existing: addResults.existing
      };
    } catch (error) {
      this.logger.error('Printer discovery failed:', error);
      throw error;
    }
  }

  private async discoverNetworkPrinters(timeout: number): Promise<DiscoveredPrinter[]> {
    const printers: DiscoveredPrinter[] = [];
    const commonPorts = [9100, 515, 631, 3289]; // RAW, LPR, IPP, ENPC
    
    // Get local network range
    const networkRanges = this.getLocalNetworkRanges();
    
    for (const range of networkRanges) {
      const promises = [];
      
      for (let i = 1; i <= 254; i++) {
        const ip = `${range}.${i}`;
        
        for (const port of commonPorts) {
          promises.push(this.testPrinterConnection(ip, port, timeout));
        }
      }
      
      const results = await Promise.allSettled(promises);
      
      for (const result of results) {
        if (result.status === 'fulfilled' && result.value) {
          printers.push(result.value);
        }
      }
    }
    
    return printers;
  }

  private async discoverBroadcastPrinters(timeout: number): Promise<DiscoveredPrinter[]> {
    return new Promise((resolve) => {
      const printers: DiscoveredPrinter[] = [];
      const socket = dgram.createSocket('udp4');
      
      const timer = setTimeout(() => {
        socket.close();
        resolve(printers);
      }, timeout);

      socket.on('message', (msg, rinfo) => {
        try {
          const message = msg.toString();
          // Parse printer response (implementation would depend on specific protocol)
          if (this.isPrinterResponse(message)) {
            const printer = this.parsePrinterResponse(message, rinfo.address, rinfo.port);
            if (printer) {
              printers.push(printer);
            }
          }
        } catch (error) {
          this.logger.debug(`Failed to parse broadcast response from ${rinfo.address}:`, error);
        }
      });

      socket.on('error', (error) => {
        this.logger.debug('Broadcast discovery error:', error);
        clearTimeout(timer);
        socket.close();
        resolve(printers);
      });

      // Send broadcast probe
      const probeMessage = Buffer.from('PRINTER_DISCOVERY_PROBE');
      socket.bind(() => {
        socket.setBroadcast(true);
        socket.send(probeMessage, 0, probeMessage.length, 3289, '255.255.255.255');
      });
    });
  }

  private async discoverSNMPPrinters(timeout: number): Promise<DiscoveredPrinter[]> {
    // SNMP printer discovery implementation
    // This would use an SNMP library to query devices
    // For now, return empty array as SNMP discovery is complex
    return [];
  }

  private async testPrinterConnection(ip: string, port: number, timeout: number): Promise<DiscoveredPrinter | null> {
    return new Promise((resolve) => {
      const socket = new net.Socket();
      
      const timer = setTimeout(() => {
        socket.destroy();
        resolve(null);
      }, timeout);

      socket.connect(port, ip, () => {
        clearTimeout(timer);
        
        // Send printer status query
        const statusQuery = this.getPrinterStatusQuery(port);
        socket.write(statusQuery);
      });

      socket.on('data', (data) => {
        clearTimeout(timer);
        socket.destroy();
        
        const printer = this.parsePrinterData(data, ip, port);
        resolve(printer);
      });

      socket.on('error', () => {
        clearTimeout(timer);
        resolve(null);
      });
    });
  }

  private getLocalNetworkRanges(): string[] {
    // Get local network interfaces and extract network ranges
    const os = require('os');
    const interfaces = os.networkInterfaces();
    const ranges = [];
    
    for (const name in interfaces) {
      const networkInterface = interfaces[name];
      for (const alias of networkInterface) {
        if (alias.family === 'IPv4' && !alias.internal) {
          const ip = alias.address;
          const parts = ip.split('.');
          const networkBase = `${parts[0]}.${parts[1]}.${parts[2]}`;
          if (!ranges.includes(networkBase)) {
            ranges.push(networkBase);
          }
        }
      }
    }
    
    return ranges.length > 0 ? ranges : ['192.168.1', '192.168.0', '10.0.0'];
  }

  private getPrinterStatusQuery(port: number): Buffer {
    switch (port) {
      case 9100: // RAW port
        return Buffer.from('\x10\x04\x01'); // ESC/POS status query
      case 631: // IPP
        return Buffer.from('GET / HTTP/1.1\r\nHost: printer\r\n\r\n');
      case 515: // LPR
        return Buffer.from('\x01default\n');
      default:
        return Buffer.from('\x10\x04\x01');
    }
  }

  private parsePrinterData(data: Buffer, ip: string, port: number): DiscoveredPrinter | null {
    try {
      const response = data.toString();
      
      // Basic printer detection logic
      if (this.containsPrinterKeywords(response)) {
        return {
          ip,
          port,
          name: this.extractPrinterName(response) || `Printer ${ip}`,
          manufacturer: this.extractManufacturer(response),
          model: this.extractModel(response),
          type: this.determinePrinterType(response),
          connection: 'network',
          capabilities: this.extractCapabilities(response)
        };
      }
      
      return null;
    } catch (error) {
      this.logger.debug(`Failed to parse printer data from ${ip}:${port}:`, error);
      return null;
    }
  }

  private containsPrinterKeywords(response: string): boolean {
    const keywords = [
      'printer', 'epson', 'star', 'citizen', 'zebra', 'brother',
      'thermal', 'receipt', 'pos', 'esc/pos', 'tsp', 'tm-'
    ];
    
    const lowerResponse = response.toLowerCase();
    return keywords.some(keyword => lowerResponse.includes(keyword));
  }

  private extractPrinterName(response: string): string | undefined {
    // Extract printer name from response
    const namePatterns = [
      /printer[:\s]+([^\r\n]+)/i,
      /name[:\s]+([^\r\n]+)/i,
      /model[:\s]+([^\r\n]+)/i
    ];
    
    for (const pattern of namePatterns) {
      const match = response.match(pattern);
      if (match && match[1]) {
        return match[1].trim();
      }
    }
    
    return undefined;
  }

  private extractManufacturer(response: string): string | undefined {
    const manufacturers = ['epson', 'star', 'citizen', 'zebra', 'brother', 'hp', 'canon'];
    const lowerResponse = response.toLowerCase();
    
    return manufacturers.find(manufacturer => lowerResponse.includes(manufacturer));
  }

  private extractModel(response: string): string | undefined {
    // Extract model information
    const modelPatterns = [
      /tm-([a-z0-9]+)/i,
      /tsp([a-z0-9]+)/i,
      /ct-([a-z0-9]+)/i
    ];
    
    for (const pattern of modelPatterns) {
      const match = response.match(pattern);
      if (match && match[0]) {
        return match[0].toUpperCase();
      }
    }
    
    return undefined;
  }

  private determinePrinterType(response: string): 'thermal' | 'receipt' | 'kitchen' | 'label' {
    const lowerResponse = response.toLowerCase();
    
    if (lowerResponse.includes('kitchen')) return 'kitchen';
    if (lowerResponse.includes('label')) return 'label';
    if (lowerResponse.includes('thermal') || lowerResponse.includes('receipt')) return 'receipt';
    
    return 'thermal'; // Default
  }

  private extractCapabilities(response: string): string[] {
    const capabilities = [];
    const lowerResponse = response.toLowerCase();
    
    if (lowerResponse.includes('cut')) capabilities.push('auto_cut');
    if (lowerResponse.includes('cash')) capabilities.push('cash_drawer');
    if (lowerResponse.includes('bluetooth')) capabilities.push('bluetooth');
    if (lowerResponse.includes('wifi')) capabilities.push('wifi');
    if (lowerResponse.includes('usb')) capabilities.push('usb');
    if (lowerResponse.includes('ethernet')) capabilities.push('ethernet');
    
    return capabilities;
  }

  private isPrinterResponse(message: string): boolean {
    return this.containsPrinterKeywords(message);
  }

  private parsePrinterResponse(message: string, ip: string, port: number): DiscoveredPrinter | null {
    return this.parsePrinterData(Buffer.from(message), ip, port);
  }

  // MenuHere printer discovery
  private async discoverMenuHerePrinters(): Promise<DiscoveredPrinter[]> {
    try {
      this.logger.log('Discovering printers via MenuHere...');
      const menuHerePrinters = await this.menuHereService.discoverPrinters();
      
      return menuHerePrinters.map(printer => ({
        name: printer.name,
        manufacturer: printer.manufacturer || 'MenuHere',
        model: printer.model || 'Managed Printer',
        type: this.inferPrinterTypeFromName(printer.name),
        connection: 'menuhere' as const,
        capabilities: printer.capabilities,
        menuHereName: printer.name,
        isDefault: printer.isDefault
      }));
    } catch (error) {
      this.logger.warn('MenuHere printer discovery failed:', error.message);
      return [];
    }
  }

  private inferPrinterTypeFromName(name: string): 'thermal' | 'receipt' | 'kitchen' | 'label' {
    const lowerName = name.toLowerCase();
    if (lowerName.includes('kitchen')) return 'kitchen';
    if (lowerName.includes('label')) return 'label';
    if (lowerName.includes('thermal')) return 'thermal';
    return 'receipt'; // Default
  }

  private async addDiscoveredPrinters(
    printers: DiscoveredPrinter[],
    companyId: string,
    branchId?: string
  ): Promise<{ added: number; existing: number }> {
    let added = 0;
    let existing = 0;
    
    for (const printer of printers) {
      try {
        let existingPrinter;

        // Check if printer already exists (different logic for MenuHere vs network printers)
        if (printer.connection === 'menuhere') {
          existingPrinter = await this.prisma.printer.findFirst({
            where: {
              connection: 'menuhere',
              OR: [
                { name: printer.name },
                { 
                  menuHereConfig: {
                    path: ['printerName'],
                    equals: printer.menuHereName
                  }
                }
              ],
              companyId
            }
          });
        } else {
          existingPrinter = await this.prisma.printer.findFirst({
            where: {
              ip: printer.ip,
              port: printer.port,
              companyId
            }
          });
        }
        
        if (existingPrinter) {
          // Update existing printer status
          const updateData: any = {
            status: 'online',
            lastSeen: new Date(),
            manufacturer: printer.manufacturer || existingPrinter.manufacturer,
            model: printer.model || existingPrinter.model,
            capabilities: JSON.stringify(printer.capabilities)
          };

          if (printer.connection === 'menuhere') {
            updateData.menuHereConfig = {
              printerName: printer.menuHereName || printer.name,
              isMenuHereManaged: true,
              lastMenuHereSync: new Date()
            };
            updateData.isDefault = printer.isDefault || existingPrinter.isDefault;
          }

          await this.prisma.printer.update({
            where: { id: existingPrinter.id },
            data: updateData
          });
          existing++;
        } else {
          // Add new printer
          const createData: any = {
            name: printer.name || `${printer.manufacturer || 'Network'} Printer`,
            type: printer.type,
            connection: printer.connection,
            manufacturer: printer.manufacturer,
            model: printer.model,
            status: 'online',
            assignedTo: printer.type === 'kitchen' ? 'kitchen' : 'cashier',
            companyId,
            branchId,
            capabilities: JSON.stringify(printer.capabilities),
            lastSeen: new Date(),
            isDefault: printer.isDefault || false
          };

          if (printer.connection === 'menuhere') {
            createData.menuHereConfig = {
              printerName: printer.menuHereName || printer.name,
              isMenuHereManaged: true,
              lastMenuHereSync: new Date()
            };
          } else {
            createData.ip = printer.ip;
            createData.port = printer.port;
          }

          await this.prisma.printer.create({ data: createData });
          added++;
        }
      } catch (error) {
        this.logger.error(`Failed to add/update printer ${printer.name}:`, error);
      }
    }
    
    return { added, existing };
  }
}