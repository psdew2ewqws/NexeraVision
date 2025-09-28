/**
 * Thermal Printer Detection Service for Jordan Market
 * Auto-detects and configures thermal printers common in Jordan
 */

import { Injectable, Logger } from '@nestjs/common';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as usb from 'usb';

const execAsync = promisify(exec);

export interface ThermalPrinter {
  id: string;
  name: string;
  brand: string;
  model: string;
  connection: 'USB' | 'Serial' | 'Ethernet' | 'Bluetooth';
  devicePath?: string;
  vendorId?: number;
  productId?: number;
  ipAddress?: string;
  port?: number;
  paperWidth: 58 | 80; // mm
  charactersPerLine: 32 | 48;
  maxPrintSpeed: number; // mm/s
  supportsArabic: boolean;
  escposCommands: {
    initialize: string[];
    cut: string[];
    bold: { start: string; end: string };
    underline: { start: string; end: string };
    centerAlign: string;
    leftAlign: string;
    rightAlign: string;
  };
  status: 'online' | 'offline' | 'error' | 'paper_empty' | 'cover_open';
  capabilities: string[];
}

export interface JordanPrinterProfile {
  vendorId: number;
  productId: number;
  brand: string;
  model: string;
  paperWidth: 58 | 80;
  isCommonInJordan: boolean;
  supportLevel: 'excellent' | 'good' | 'basic';
  notes?: string;
}

@Injectable()
export class ThermalPrinterDetectionService {
  private readonly logger = new Logger(ThermalPrinterDetectionService.name);

  // Common thermal printer profiles in Jordan market
  private readonly jordanPrinterProfiles: JordanPrinterProfile[] = [
    // POS-80 Series (Very common in Jordan)
    { vendorId: 0x0fe6, productId: 0x811e, brand: 'POS', model: 'POS-80C', paperWidth: 80, isCommonInJordan: true, supportLevel: 'excellent' },
    { vendorId: 0x0fe6, productId: 0x811f, brand: 'POS', model: 'POS-58', paperWidth: 58, isCommonInJordan: true, supportLevel: 'excellent' },

    // EPSON (Popular in Jordan restaurants)
    { vendorId: 0x04b8, productId: 0x0202, brand: 'EPSON', model: 'TM-T82', paperWidth: 80, isCommonInJordan: true, supportLevel: 'excellent' },
    { vendorId: 0x04b8, productId: 0x0207, brand: 'EPSON', model: 'TM-T20', paperWidth: 80, isCommonInJordan: true, supportLevel: 'excellent' },
    { vendorId: 0x04b8, productId: 0x0208, brand: 'EPSON', model: 'TM-T20II', paperWidth: 80, isCommonInJordan: true, supportLevel: 'excellent' },
    { vendorId: 0x04b8, productId: 0x0222, brand: 'EPSON', model: 'TM-U220', paperWidth: 80, isCommonInJordan: true, supportLevel: 'good' },

    // Star Micronics (Used in larger establishments)
    { vendorId: 0x0519, productId: 0x0001, brand: 'Star', model: 'TSP100', paperWidth: 80, isCommonInJordan: true, supportLevel: 'excellent' },
    { vendorId: 0x0519, productId: 0x0002, brand: 'Star', model: 'TSP650', paperWidth: 80, isCommonInJordan: true, supportLevel: 'excellent' },
    { vendorId: 0x0519, productId: 0x0003, brand: 'Star', model: 'TSP143', paperWidth: 80, isCommonInJordan: true, supportLevel: 'excellent' },

    // Bixolon (Budget-friendly option in Jordan)
    { vendorId: 0x1504, productId: 0x0006, brand: 'Bixolon', model: 'SRP-350', paperWidth: 80, isCommonInJordan: true, supportLevel: 'good' },
    { vendorId: 0x1504, productId: 0x0011, brand: 'Bixolon', model: 'SRP-330', paperWidth: 80, isCommonInJordan: true, supportLevel: 'good' },

    // Xprinter (Very common Chinese brand in Jordan)
    { vendorId: 0x1659, productId: 0x8965, brand: 'Xprinter', model: 'XP-58IIH', paperWidth: 58, isCommonInJordan: true, supportLevel: 'basic' },
    { vendorId: 0x1659, productId: 0x8966, brand: 'Xprinter', model: 'XP-80IIH', paperWidth: 80, isCommonInJordan: true, supportLevel: 'basic' },

    // Generic ESC/POS printers (Common in small shops)
    { vendorId: 0x0416, productId: 0x5011, brand: 'Generic', model: 'ESC-POS-80', paperWidth: 80, isCommonInJordan: true, supportLevel: 'basic' },
    { vendorId: 0x0525, productId: 0xa700, brand: 'Generic', model: 'ESC-POS-58', paperWidth: 58, isCommonInJordan: true, supportLevel: 'basic' },

    // RONGTA (Popular budget option)
    { vendorId: 0x0dd4, productId: 0x0002, brand: 'RONGTA', model: 'RP58', paperWidth: 58, isCommonInJordan: true, supportLevel: 'basic' },
    { vendorId: 0x0dd4, productId: 0x0003, brand: 'RONGTA', model: 'RP80', paperWidth: 80, isCommonInJordan: true, supportLevel: 'basic' }
  ];

  /**
   * Detect all connected thermal printers
   */
  async detectPrinters(): Promise<ThermalPrinter[]> {
    this.logger.log('Starting thermal printer detection...');
    const detectedPrinters: ThermalPrinter[] = [];

    try {
      // Detect USB printers
      const usbPrinters = await this.detectUSBPrinters();
      detectedPrinters.push(...usbPrinters);

      // Detect serial printers
      const serialPrinters = await this.detectSerialPrinters();
      detectedPrinters.push(...serialPrinters);

      // Detect network printers
      const networkPrinters = await this.detectNetworkPrinters();
      detectedPrinters.push(...networkPrinters);

      this.logger.log(`Detected ${detectedPrinters.length} thermal printers`);
      return detectedPrinters;

    } catch (error) {
      this.logger.error('Error during printer detection:', error);
      return [];
    }
  }

  /**
   * Detect USB thermal printers
   */
  private async detectUSBPrinters(): Promise<ThermalPrinter[]> {
    const printers: ThermalPrinter[] = [];

    try {
      const devices = usb.getDeviceList();

      for (const device of devices) {
        const profile = this.findPrinterProfile(device.deviceDescriptor.idVendor, device.deviceDescriptor.idProduct);

        if (profile) {
          const printer: ThermalPrinter = {
            id: `usb-${device.deviceDescriptor.idVendor}-${device.deviceDescriptor.idProduct}`,
            name: `${profile.brand} ${profile.model}`,
            brand: profile.brand,
            model: profile.model,
            connection: 'USB',
            vendorId: device.deviceDescriptor.idVendor,
            productId: device.deviceDescriptor.idProduct,
            paperWidth: profile.paperWidth,
            charactersPerLine: profile.paperWidth === 80 ? 48 : 32,
            maxPrintSpeed: this.getMaxPrintSpeed(profile.brand),
            supportsArabic: this.checkArabicSupport(profile.brand),
            escposCommands: this.getESCPOSCommands(profile.brand),
            status: 'online',
            capabilities: this.getPrinterCapabilities(profile)
          };

          // Test printer connectivity
          const status = await this.testPrinterStatus(printer);
          printer.status = status;

          printers.push(printer);
          this.logger.log(`Detected USB printer: ${printer.name} (${printer.status})`);
        }
      }
    } catch (error) {
      this.logger.error('Error detecting USB printers:', error);
    }

    return printers;
  }

  /**
   * Detect serial thermal printers
   */
  private async detectSerialPrinters(): Promise<ThermalPrinter[]> {
    const printers: ThermalPrinter[] = [];

    try {
      // Check common serial ports
      const serialPorts = ['/dev/ttyUSB0', '/dev/ttyUSB1', '/dev/ttyS0', '/dev/ttyS1'];

      for (const port of serialPorts) {
        try {
          // Test if port exists and is accessible
          const { stdout } = await execAsync(`ls -la ${port} 2>/dev/null || echo "not found"`);

          if (!stdout.includes('not found')) {
            const printer: ThermalPrinter = {
              id: `serial-${port.replace('/dev/', '')}`,
              name: `Serial Thermal Printer (${port})`,
              brand: 'Generic',
              model: 'Serial ESC/POS',
              connection: 'Serial',
              devicePath: port,
              paperWidth: 80, // Default assumption
              charactersPerLine: 48,
              maxPrintSpeed: 150,
              supportsArabic: true,
              escposCommands: this.getESCPOSCommands('Generic'),
              status: 'online',
              capabilities: ['text', 'graphics', 'barcode']
            };

            printers.push(printer);
            this.logger.log(`Detected serial printer: ${port}`);
          }
        } catch (error) {
          // Port not accessible, skip
        }
      }
    } catch (error) {
      this.logger.error('Error detecting serial printers:', error);
    }

    return printers;
  }

  /**
   * Detect network thermal printers
   */
  private async detectNetworkPrinters(): Promise<ThermalPrinter[]> {
    const printers: ThermalPrinter[] = [];

    try {
      // Common IP ranges for thermal printers in Jordan networks
      const ipRanges = [
        '192.168.1', '192.168.0', '10.0.0', '172.16.0'
      ];

      const commonPorts = [9100, 9101, 515]; // RAW, LPR ports

      for (const range of ipRanges) {
        for (let i = 100; i <= 200; i++) { // Common printer IP range
          const ip = `${range}.${i}`;

          for (const port of commonPorts) {
            try {
              // Quick port scan to detect printers
              const isOpen = await this.testPort(ip, port);

              if (isOpen) {
                const printer: ThermalPrinter = {
                  id: `network-${ip}-${port}`,
                  name: `Network Thermal Printer (${ip}:${port})`,
                  brand: 'Network',
                  model: 'ESC/POS Network',
                  connection: 'Ethernet',
                  ipAddress: ip,
                  port: port,
                  paperWidth: 80,
                  charactersPerLine: 48,
                  maxPrintSpeed: 200,
                  supportsArabic: true,
                  escposCommands: this.getESCPOSCommands('Generic'),
                  status: 'online',
                  capabilities: ['text', 'graphics', 'barcode', 'network']
                };

                printers.push(printer);
                this.logger.log(`Detected network printer: ${ip}:${port}`);
                break; // Found printer on this IP, no need to test other ports
              }
            } catch (error) {
              // Port closed or unreachable
            }
          }
        }
      }
    } catch (error) {
      this.logger.error('Error detecting network printers:', error);
    }

    return printers;
  }

  /**
   * Find printer profile by vendor and product ID
   */
  private findPrinterProfile(vendorId: number, productId: number): JordanPrinterProfile | null {
    return this.jordanPrinterProfiles.find(
      profile => profile.vendorId === vendorId && profile.productId === productId
    ) || null;
  }

  /**
   * Get ESC/POS commands for specific brand
   */
  private getESCPOSCommands(brand: string) {
    const baseCommands = {
      initialize: ['\x1B\x40'], // ESC @
      cut: ['\x1D\x56\x42\x00'], // GS V B
      bold: { start: '\x1B\x45\x01', end: '\x1B\x45\x00' }, // ESC E
      underline: { start: '\x1B\x2D\x01', end: '\x1B\x2D\x00' }, // ESC -
      centerAlign: '\x1B\x61\x01', // ESC a 1
      leftAlign: '\x1B\x61\x00', // ESC a 0
      rightAlign: '\x1B\x61\x02' // ESC a 2
    };

    // Brand-specific optimizations
    switch (brand.toLowerCase()) {
      case 'epson':
        return {
          ...baseCommands,
          cut: ['\x1D\x56\x41\x00'], // EPSON specific cut
          initialize: ['\x1B\x40', '\x1B\x74\x06'] // Include Arabic codepage
        };

      case 'star':
        return {
          ...baseCommands,
          cut: ['\x1B\x64\x02'], // Star specific cut
          centerAlign: '\x1B\x1D\x61\x01'
        };

      case 'pos':
        return {
          ...baseCommands,
          initialize: ['\x1B\x40', '\x1C\x26'], // POS-80 specific init
          cut: ['\x1D\x56\x42\x03'] // Full cut
        };

      default:
        return baseCommands;
    }
  }

  /**
   * Get maximum print speed for brand
   */
  private getMaxPrintSpeed(brand: string): number {
    const speeds = {
      'EPSON': 250,
      'Star': 300,
      'POS': 200,
      'Bixolon': 150,
      'Xprinter': 120,
      'RONGTA': 100,
      'Generic': 150
    };

    return speeds[brand] || 150;
  }

  /**
   * Check if printer supports Arabic text
   */
  private checkArabicSupport(brand: string): boolean {
    // Most modern ESC/POS printers support Arabic
    const arabicSupported = ['EPSON', 'Star', 'POS', 'Bixolon'];
    return arabicSupported.includes(brand) || brand === 'Generic';
  }

  /**
   * Get printer capabilities based on profile
   */
  private getPrinterCapabilities(profile: JordanPrinterProfile): string[] {
    const baseCaps = ['text', 'esc_pos'];

    if (profile.supportLevel === 'excellent') {
      return [...baseCaps, 'graphics', 'barcode', 'qr_code', 'arabic', 'logo'];
    } else if (profile.supportLevel === 'good') {
      return [...baseCaps, 'graphics', 'barcode', 'arabic'];
    } else {
      return [...baseCaps, 'barcode'];
    }
  }

  /**
   * Test printer status
   */
  private async testPrinterStatus(printer: ThermalPrinter): Promise<ThermalPrinter['status']> {
    try {
      // Send status request command
      // This would integrate with actual printer communication
      // For now, return online status
      return 'online';
    } catch (error) {
      this.logger.warn(`Failed to get status for printer ${printer.name}:`, error);
      return 'error';
    }
  }

  /**
   * Test if network port is open
   */
  private async testPort(host: string, port: number, timeout: number = 1000): Promise<boolean> {
    return new Promise((resolve) => {
      const net = require('net');
      const socket = new net.Socket();

      socket.setTimeout(timeout);

      socket.on('connect', () => {
        socket.destroy();
        resolve(true);
      });

      socket.on('timeout', () => {
        socket.destroy();
        resolve(false);
      });

      socket.on('error', () => {
        socket.destroy();
        resolve(false);
      });

      socket.connect(port, host);
    });
  }

  /**
   * Get printer configuration recommendations for Jordan
   */
  getJordanPrinterRecommendations(): {
    recommended: JordanPrinterProfile[];
    budgetFriendly: JordanPrinterProfile[];
    enterprise: JordanPrinterProfile[];
  } {
    const recommended = this.jordanPrinterProfiles.filter(p =>
      p.isCommonInJordan && p.supportLevel === 'excellent'
    );

    const budgetFriendly = this.jordanPrinterProfiles.filter(p =>
      p.isCommonInJordan && ['Xprinter', 'RONGTA', 'Generic'].includes(p.brand)
    );

    const enterprise = this.jordanPrinterProfiles.filter(p =>
      p.isCommonInJordan && ['EPSON', 'Star'].includes(p.brand)
    );

    return { recommended, budgetFriendly, enterprise };
  }
}