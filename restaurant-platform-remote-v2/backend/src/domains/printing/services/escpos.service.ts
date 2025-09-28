import { Injectable, Logger } from '@nestjs/common';
import * as net from 'net';

interface PrintContent {
  type: 'receipt' | 'kitchen_order' | 'label' | 'test';
  content: Array<{
    type: 'text' | 'barcode' | 'qr' | 'image' | 'cut' | 'drawer';
    value?: string;
    align?: 'left' | 'center' | 'right';
    size?: 'normal' | 'wide' | 'tall' | 'double';
    bold?: boolean;
    underline?: boolean;
    data?: Buffer;
  }>;
}

interface Printer {
  id: string;
  name: string;
  ip?: string;
  port?: number;
  connection: string;
  type: string;
  capabilities?: string;
}

@Injectable()
export class ESCPOSService {
  private readonly logger = new Logger(ESCPOSService.name);

  // ESC/POS Commands
  private readonly ESC = '\x1B';
  private readonly GS = '\x1D';
  private readonly commands = {
    INIT: '\x1B\x40',                    // Initialize printer
    CUT: '\x1D\x56\x00',                // Full cut
    PARTIAL_CUT: '\x1D\x56\x01',        // Partial cut
    DRAWER: '\x1B\x70\x00\x19\xFA',     // Open cash drawer
    
    // Text formatting
    BOLD_ON: '\x1B\x45\x01',
    BOLD_OFF: '\x1B\x45\x00',
    UNDERLINE_ON: '\x1B\x2D\x01',
    UNDERLINE_OFF: '\x1B\x2D\x00',
    
    // Size
    SIZE_NORMAL: '\x1D\x21\x00',
    SIZE_DOUBLE: '\x1D\x21\x11',
    SIZE_WIDE: '\x1D\x21\x10',
    SIZE_TALL: '\x1D\x21\x01',
    
    // Alignment
    ALIGN_LEFT: '\x1B\x61\x00',
    ALIGN_CENTER: '\x1B\x61\x01',
    ALIGN_RIGHT: '\x1B\x61\x02',
    
    // Line feed
    LF: '\x0A',
    FF: '\x0C',
    
    // Barcode
    BARCODE_HEIGHT: '\x1D\x68\x64',     // Set height to 100
    BARCODE_WIDTH: '\x1D\x77\x03',      // Set width
    BARCODE_POSITION: '\x1D\x48\x02',   // Print HRI below barcode
    
    // QR Code
    QR_MODEL: '\x1D\x28\x6B\x04\x00\x31\x41\x32\x00',  // Model 2
    QR_SIZE: '\x1D\x28\x6B\x03\x00\x31\x43\x03',       // Size 3
    QR_ERROR: '\x1D\x28\x6B\x03\x00\x31\x45\x31',      // Error correction level L
  };

  async printContent(printer: Printer, content: PrintContent): Promise<{ success: boolean; error?: string }> {
    if (printer.connection !== 'network' || !printer.ip) {
      return {
        success: false,
        error: 'Only network printers are currently supported'
      };
    }

    try {
      const buffer = this.buildPrintBuffer(content);
      const result = await this.sendToPrinter(printer.ip, printer.port || 9100, buffer);
      
      this.logger.log(`Print job sent to ${printer.name} (${printer.ip}:${printer.port})`);
      
      return { success: result };
    } catch (error) {
      this.logger.error(`Failed to print to ${printer.name}:`, error);
      return {
        success: false,
        error: error.message || 'Print operation failed'
      };
    }
  }

  private buildPrintBuffer(content: PrintContent): Buffer {
    let buffer = Buffer.from(this.commands.INIT); // Initialize printer

    for (const item of content.content) {
      switch (item.type) {
        case 'text':
          buffer = Buffer.concat([
            buffer,
            this.formatText(item.value || '', item)
          ]);
          break;
          
        case 'barcode':
          buffer = Buffer.concat([
            buffer,
            this.generateBarcode(item.value || '')
          ]);
          break;
          
        case 'qr':
          buffer = Buffer.concat([
            buffer,
            this.generateQRCode(item.value || '')
          ]);
          break;
          
        case 'image':
          if (item.data) {
            buffer = Buffer.concat([
              buffer,
              this.processImage(item.data)
            ]);
          }
          break;
          
        case 'cut':
          buffer = Buffer.concat([
            buffer,
            Buffer.from(this.commands.CUT)
          ]);
          break;
          
        case 'drawer':
          buffer = Buffer.concat([
            buffer,
            Buffer.from(this.commands.DRAWER)
          ]);
          break;
      }
    }

    return buffer;
  }

  private formatText(text: string, options: any): Buffer {
    let buffer = Buffer.alloc(0);

    // Set alignment
    if (options.align) {
      switch (options.align) {
        case 'left':
          buffer = Buffer.concat([buffer, Buffer.from(this.commands.ALIGN_LEFT)]);
          break;
        case 'center':
          buffer = Buffer.concat([buffer, Buffer.from(this.commands.ALIGN_CENTER)]);
          break;
        case 'right':
          buffer = Buffer.concat([buffer, Buffer.from(this.commands.ALIGN_RIGHT)]);
          break;
      }
    }

    // Set size
    if (options.size) {
      switch (options.size) {
        case 'normal':
          buffer = Buffer.concat([buffer, Buffer.from(this.commands.SIZE_NORMAL)]);
          break;
        case 'double':
          buffer = Buffer.concat([buffer, Buffer.from(this.commands.SIZE_DOUBLE)]);
          break;
        case 'wide':
          buffer = Buffer.concat([buffer, Buffer.from(this.commands.SIZE_WIDE)]);
          break;
        case 'tall':
          buffer = Buffer.concat([buffer, Buffer.from(this.commands.SIZE_TALL)]);
          break;
      }
    }

    // Set bold
    if (options.bold) {
      buffer = Buffer.concat([buffer, Buffer.from(this.commands.BOLD_ON)]);
    }

    // Set underline
    if (options.underline) {
      buffer = Buffer.concat([buffer, Buffer.from(this.commands.UNDERLINE_ON)]);
    }

    // Add text with line feed
    buffer = Buffer.concat([
      buffer,
      Buffer.from(text + this.commands.LF, 'utf8')
    ]);

    // Reset formatting
    if (options.bold) {
      buffer = Buffer.concat([buffer, Buffer.from(this.commands.BOLD_OFF)]);
    }
    if (options.underline) {
      buffer = Buffer.concat([buffer, Buffer.from(this.commands.UNDERLINE_OFF)]);
    }
    if (options.size !== 'normal') {
      buffer = Buffer.concat([buffer, Buffer.from(this.commands.SIZE_NORMAL)]);
    }
    
    return buffer;
  }

  private generateBarcode(data: string): Buffer {
    let buffer = Buffer.alloc(0);

    // Set barcode parameters
    buffer = Buffer.concat([
      buffer,
      Buffer.from(this.commands.BARCODE_HEIGHT),
      Buffer.from(this.commands.BARCODE_WIDTH),
      Buffer.from(this.commands.BARCODE_POSITION)
    ]);

    // Print Code128 barcode
    const barcodeCommand = `${this.GS}k\x73`;
    const dataBuffer = Buffer.from(data, 'utf8');
    
    buffer = Buffer.concat([
      buffer,
      Buffer.from(barcodeCommand),
      Buffer.from([dataBuffer.length]), // Length byte
      dataBuffer,
      Buffer.from(this.commands.LF)
    ]);

    return buffer;
  }

  private generateQRCode(data: string): Buffer {
    let buffer = Buffer.alloc(0);

    // QR Code setup
    buffer = Buffer.concat([
      buffer,
      Buffer.from(this.commands.QR_MODEL),
      Buffer.from(this.commands.QR_SIZE),
      Buffer.from(this.commands.QR_ERROR)
    ]);

    // Store QR data
    const dataBuffer = Buffer.from(data, 'utf8');
    const storeCommand = Buffer.concat([
      Buffer.from('\x1D\x28\x6B'),
      Buffer.from([(dataBuffer.length + 3) & 0xFF, ((dataBuffer.length + 3) >> 8) & 0xFF]), // Length
      Buffer.from('\x31\x50\x30'), // Store data
      dataBuffer
    ]);

    buffer = Buffer.concat([buffer, storeCommand]);

    // Print QR code
    const printCommand = Buffer.from('\x1D\x28\x6B\x03\x00\x31\x51\x30');
    buffer = Buffer.concat([
      buffer,
      printCommand,
      Buffer.from(this.commands.LF)
    ]);

    return buffer;
  }

  private processImage(imageData: Buffer): Buffer {
    // Basic image processing for thermal printers
    // This is a simplified implementation
    // In a real implementation, you would convert the image to 1-bit monochrome
    // and use ESC/POS raster graphics commands
    
    try {
      // For now, just return empty buffer as image processing is complex
      this.logger.warn('Image printing not fully implemented');
      return Buffer.alloc(0);
    } catch (error) {
      this.logger.error('Image processing failed:', error);
      return Buffer.alloc(0);
    }
  }

  private async sendToPrinter(ip: string, port: number, buffer: Buffer): Promise<boolean> {
    return new Promise((resolve, reject) => {
      const socket = new net.Socket();
      let connected = false;

      const timeout = setTimeout(() => {
        if (!connected) {
          socket.destroy();
          reject(new Error(`Connection timeout to ${ip}:${port}`));
        }
      }, 5000);

      socket.connect(port, ip, () => {
        connected = true;
        clearTimeout(timeout);
        
        socket.write(buffer, (error) => {
          if (error) {
            socket.destroy();
            reject(error);
          } else {
            // Wait a bit for the data to be sent
            setTimeout(() => {
              socket.destroy();
              resolve(true);
            }, 100);
          }
        });
      });

      socket.on('error', (error) => {
        clearTimeout(timeout);
        socket.destroy();
        reject(error);
      });

      socket.on('timeout', () => {
        clearTimeout(timeout);
        socket.destroy();
        reject(new Error(`Socket timeout to ${ip}:${port}`));
      });
    });
  }

  // Helper method to create receipt content
  createReceiptContent(order: any): PrintContent {
    const content = [];
    
    // Header
    content.push({
      type: 'text',
      value: order.restaurantName || 'Restaurant',
      align: 'center',
      size: 'double',
      bold: true
    });
    
    content.push({
      type: 'text',
      value: '================================',
      align: 'center'
    });

    // Order info
    content.push({
      type: 'text',
      value: `Order #${order.id}`,
      bold: true
    });
    
    content.push({
      type: 'text',
      value: `Date: ${new Date().toLocaleString()}`
    });
    
    content.push({
      type: 'text',
      value: `Customer: ${order.customerName || 'Walk-in'}`
    });

    content.push({
      type: 'text',
      value: '--------------------------------'
    });

    // Items
    for (const item of order.items || []) {
      content.push({
        type: 'text',
        value: `${item.quantity}x ${item.name}`,
        bold: true
      });
      
      if (item.price) {
        content.push({
          type: 'text',
          value: `    ${item.price.toFixed(2)} JOD`,
          align: 'right'
        });
      }
      
      // Modifiers
      if (item.modifiers && item.modifiers.length > 0) {
        for (const modifier of item.modifiers) {
          content.push({
            type: 'text',
            value: `  + ${modifier.name}${modifier.price ? ` (+${modifier.price.toFixed(2)})` : ''}`
          });
        }
      }
      
      content.push({ type: 'text', value: '' });
    }

    content.push({
      type: 'text',
      value: '--------------------------------'
    });

    // Totals
    if (order.subtotal) {
      content.push({
        type: 'text',
        value: `Subtotal: ${order.subtotal.toFixed(2)} JOD`,
        align: 'right'
      });
    }
    
    if (order.tax) {
      content.push({
        type: 'text',
        value: `Tax: ${order.tax.toFixed(2)} JOD`,
        align: 'right'
      });
    }
    
    if (order.total) {
      content.push({
        type: 'text',
        value: `TOTAL: ${order.total.toFixed(2)} JOD`,
        align: 'right',
        size: 'double',
        bold: true
      });
    }

    content.push({ type: 'text', value: '' });
    content.push({
      type: 'text',
      value: 'Thank you for your visit!',
      align: 'center'
    });
    
    content.push({ type: 'text', value: '' });
    content.push({ type: 'cut' });

    return {
      type: 'receipt',
      content
    };
  }

  // Helper method to create kitchen order content
  createKitchenOrderContent(order: any): PrintContent {
    const content = [];
    
    // Header
    content.push({
      type: 'text',
      value: 'KITCHEN ORDER',
      align: 'center',
      size: 'double',
      bold: true
    });
    
    content.push({
      type: 'text',
      value: '================================',
      align: 'center'
    });

    content.push({
      type: 'text',
      value: `Order #${order.id}`,
      size: 'wide',
      bold: true
    });
    
    content.push({
      type: 'text',
      value: `Time: ${new Date().toLocaleTimeString()}`,
      bold: true
    });
    
    if (order.orderType) {
      content.push({
        type: 'text',
        value: `Type: ${order.orderType.toUpperCase()}`,
        bold: true
      });
    }

    content.push({
      type: 'text',
      value: '--------------------------------'
    });

    // Items (kitchen items only)
    for (const item of order.items || []) {
      if (item.category !== 'beverage') { // Skip beverages in kitchen
        content.push({
          type: 'text',
          value: `${item.quantity}x ${item.name}`,
          size: 'wide',
          bold: true
        });
        
        // Modifiers
        if (item.modifiers && item.modifiers.length > 0) {
          for (const modifier of item.modifiers) {
            content.push({
              type: 'text',
              value: `  + ${modifier.name}`
            });
          }
        }
        
        // Special instructions
        if (item.notes) {
          content.push({
            type: 'text',
            value: `  Notes: ${item.notes}`,
            underline: true
          });
        }
        
        content.push({ type: 'text', value: '' });
      }
    }

    if (order.specialInstructions) {
      content.push({
        type: 'text',
        value: '*** SPECIAL INSTRUCTIONS ***',
        bold: true,
        align: 'center'
      });
      content.push({
        type: 'text',
        value: order.specialInstructions,
        bold: true
      });
      content.push({ type: 'text', value: '' });
    }

    content.push({ type: 'text', value: '' });
    content.push({ type: 'cut' });

    return {
      type: 'kitchen_order',
      content
    };
  }
}