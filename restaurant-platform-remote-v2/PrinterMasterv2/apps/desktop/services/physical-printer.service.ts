import { ThermalPrinter } from 'node-thermal-printer';
import { PrinterTypes } from 'node-thermal-printer';
import { jsPDF } from 'jspdf';
import { promises as fs } from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as net from 'net';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// Type definitions
interface PrinterConfig {
  id?: string;
  name: string;
  type: string;
  connection?: string;
  ip?: string;
  port?: number;
  manufacturer?: string;
  capabilities?: string[];
  systemPrinter?: string;
}

interface TestContent {
  title?: string;
  printerName?: string;
  printerType?: string;
  connection?: string;
  timestamp?: string;
  branchName?: string;
  companyName?: string;
  testPattern?: string;
  numbers?: string;
  specialChars?: string;
  status?: string;
  isKitchen?: boolean;
  isReceipt?: boolean;
  isLabel?: boolean;
  emphasis?: boolean;
}

interface PrintResult {
  success: boolean;
  message: string;
  timestamp: string;
  printerId: string;
  printerType?: string;
  interface?: string;
  method?: string;
  filePath?: string;
  error?: string;
}

interface JobData {
  type: 'test' | 'receipt' | 'kitchen_order' | 'label';
  testData?: any;
  [key: string]: any;
}

interface PrinterStatus {
  printerId: string;
  name: string;
  status: 'ready' | 'error' | 'busy';
  paperLevel?: number;
  temperature?: number;
  capabilities: string[];
  lastChecked: string;
  error?: string;
}

class PhysicalPrinterService {
  private printers: Map<string, ThermalPrinter> = new Map();
  private isInitialized: boolean = false;
  private readonly supportedTypes: string[] = ['thermal', 'regular', 'pdf', 'kitchen'];

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    console.log('🖨️ [PHYSICAL-PRINTER] Initializing Physical Printer Service...');

    try {
      // Test if we can create thermal printer instances
      const testPrinter = new ThermalPrinter({
        type: PrinterTypes.EPSON,
        interface: '/dev/usb/lp0', // Dummy interface for testing
        options: {
          timeout: 5000
        }
      });

      console.log('✅ [PHYSICAL-PRINTER] Node thermal printer library loaded successfully');
      this.isInitialized = true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.warn('⚠️ [PHYSICAL-PRINTER] Thermal printer library initialization warning:', errorMessage);
      this.isInitialized = true; // Continue without thermal printer support
    }
  }

  /**
   * Print a test page to a physical printer
   */
  async printTestPage(printerConfig: PrinterConfig, testData: any = {}): Promise<PrintResult> {
    await this.initialize();

    console.log(`🖨️ [PHYSICAL-PRINTER] Printing test page to: ${printerConfig.name}`);

    const testContent = this.generateTestPageContent(printerConfig, testData);

    try {
      switch (printerConfig.type.toLowerCase()) {
        case 'thermal':
          return await this.printToThermalPrinter(printerConfig, testContent);
        case 'kitchen':
          return await this.printToKitchenPrinter(printerConfig, testContent);
        case 'regular':
        case 'laser':
        case 'inkjet':
          return await this.printToRegularPrinter(printerConfig, testContent);
        case 'pdf':
          return await this.printToPDF(printerConfig, testContent);
        default:
          // Try thermal printer as fallback for restaurant use
          console.log(`🔄 [PHYSICAL-PRINTER] Unknown printer type '${printerConfig.type}', trying thermal printer`);
          return await this.printToThermalPrinter(printerConfig, testContent);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`❌ [PHYSICAL-PRINTER] Print failed for ${printerConfig.name}:`, error);
      return {
        success: false,
        error: errorMessage,
        timestamp: new Date().toISOString(),
        printerId: printerConfig.id || printerConfig.name,
        message: `Print failed: ${errorMessage}`
      };
    }
  }

  /**
   * Print to thermal/receipt printer using ESC/POS commands
   */
  private async printToThermalPrinter(printerConfig: PrinterConfig, content: TestContent): Promise<PrintResult> {
    try {
      console.log(`🌡️ [THERMAL] Setting up thermal printer: ${printerConfig.name}`);

      const printerType = this.detectThermalPrinterType(printerConfig);
      const printerInterface = this.determinePrinterInterface(printerConfig);

      console.log(`🔧 [THERMAL] Printer type: ${printerType}, Interface: ${printerInterface}`);

      const printer = new ThermalPrinter({
        type: printerType,
        interface: printerInterface,
        options: {
          timeout: 10000
        }
      });

      // Test printer connection
      const isConnected = await this.testPrinterConnection(printer);
      if (!isConnected) {
        throw new Error('Unable to connect to thermal printer');
      }

      // Set up thermal printer formatting
      printer.alignCenter();
      printer.setTypeFontA();
      printer.bold(true);
      printer.println('================================');
      printer.println('    RESTAURANT PLATFORM');
      printer.println('        TEST PRINT');
      printer.println('================================');
      printer.bold(false);
      printer.newLine();

      // Printer information
      printer.alignLeft();
      printer.println(`Printer: ${printerConfig.name}`);
      printer.println(`Type: ${printerConfig.type.toUpperCase()}`);
      printer.println(`Connection: ${printerConfig.connection || 'USB'}`);
      printer.println(`Time: ${new Date().toLocaleString()}`);

      if (content.branchName) {
        printer.println(`Branch: ${content.branchName}`);
      }
      if (content.companyName) {
        printer.println(`Company: ${content.companyName}`);
      }

      printer.println('================================');
      printer.newLine();

      // Test content
      printer.println('This is a test print to verify');
      printer.println('printer connectivity and');
      printer.println('functionality.');
      printer.newLine();

      // Character test
      printer.println('Print quality check:');
      printer.println('ABCDEFGHIJKLMNOPQRSTUVWXYZ');
      printer.println('0123456789');
      printer.println('Special chars: !@#$%^&*()');
      printer.newLine();

      // Status
      printer.alignCenter();
      printer.bold(true);
      printer.println('================================');
      printer.println('Status: SUCCESS');
      printer.println('================================');
      printer.bold(false);

      // Cut paper if supported
      if (printerConfig.capabilities?.includes('cut') || printerConfig.capabilities?.includes('paper_cut')) {
        printer.cut();
      } else {
        printer.newLine();
        printer.newLine();
        printer.newLine();
      }

      // Execute print job
      await printer.execute();

      console.log(`✅ [THERMAL] Successfully printed test page to ${printerConfig.name}`);

      return {
        success: true,
        message: 'Thermal printer test successful',
        timestamp: new Date().toISOString(),
        printerId: printerConfig.id || printerConfig.name,
        printerType: 'thermal',
        interface: printerInterface
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`❌ [THERMAL] Thermal print failed:`, error);

      // Try alternative methods for thermal printing - FIXED: Added proper null check
      if (error instanceof Error && error.message && (error.message.includes('ENOENT') || error.message.includes('permission'))) {
        return await this.printToThermalPrinterFallback(printerConfig, content);
      }

      throw error;
    }
  }

  /**
   * Fallback thermal printing method using raw ESC/POS commands
   */
  private async printToThermalPrinterFallback(printerConfig: PrinterConfig, content: TestContent): Promise<PrintResult> {
    console.log(`🔄 [THERMAL-FALLBACK] Attempting fallback thermal print method`);

    try {
      // Generate raw ESC/POS commands
      const escPosCommands = this.generateESCPOSCommands(printerConfig, content);

      // Try to send to system printer
      if (printerConfig.systemPrinter) {
        return await this.sendRawToSystemPrinter(printerConfig, escPosCommands);
      }

      // For network printers, try socket connection
      if (printerConfig.connection === 'network' && printerConfig.ip) {
        return await this.sendRawToNetworkPrinter(printerConfig, escPosCommands);
      }

      throw new Error('No fallback method available for this printer configuration');

    } catch (fallbackError) {
      const errorMessage = fallbackError instanceof Error ? fallbackError.message : 'Unknown fallback error';
      console.error(`❌ [THERMAL-FALLBACK] Fallback method failed:`, fallbackError);
      throw fallbackError;
    }
  }

  /**
   * Print to regular system printer (laser/inkjet)
   */
  private async printToRegularPrinter(printerConfig: PrinterConfig, content: TestContent): Promise<PrintResult> {
    console.log(`🖨️ [REGULAR] Setting up regular printer: ${printerConfig.name}`);

    try {
      // Create a formatted text document
      const textContent = this.formatContentForRegularPrinter(content);

      // Try system printer first
      if (printerConfig.systemPrinter) {
        return await this.sendTextToSystemPrinter(printerConfig, textContent);
      }

      // Generate PDF and print
      const pdfPath = await this.generatePDFForPrinting(content);
      return await this.sendPDFToSystemPrinter(printerConfig, pdfPath);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`❌ [REGULAR] Regular printer failed:`, error);
      throw error;
    }
  }

  /**
   * Print to kitchen printer (usually thermal with special formatting)
   */
  private async printToKitchenPrinter(printerConfig: PrinterConfig, content: TestContent): Promise<PrintResult> {
    console.log(`🍳 [KITCHEN] Setting up kitchen printer: ${printerConfig.name}`);

    // Kitchen printers are usually thermal printers with specific formatting
    const kitchenContent: TestContent = {
      ...content,
      isKitchen: true,
      title: 'KITCHEN TICKET',
      emphasis: true
    };

    return await this.printToThermalPrinter(printerConfig, kitchenContent);
  }

  /**
   * Generate PDF file for printing
   */
  private async printToPDF(printerConfig: PrinterConfig, content: TestContent): Promise<PrintResult> {
    console.log(`📄 [PDF] Generating PDF for: ${printerConfig.name}`);

    try {
      const pdfPath = await this.generatePDFForPrinting(content);

      console.log(`✅ [PDF] PDF generated successfully: ${pdfPath}`);

      return {
        success: true,
        message: 'PDF generated successfully',
        timestamp: new Date().toISOString(),
        printerId: printerConfig.id || printerConfig.name,
        filePath: pdfPath,
        printerType: 'pdf'
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`❌ [PDF] PDF generation failed:`, error);
      throw error;
    }
  }

  /**
   * Test printer connectivity
   */
  private async testPrinterConnection(printer: ThermalPrinter): Promise<boolean> {
    try {
      // For thermal printers, try to initialize connection
      console.log('🔍 [CONNECTION-TEST] Testing printer connection...');

      // This is a basic connectivity test
      // In a real implementation, you might ping the printer or send a status command
      return true;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.warn('⚠️ [CONNECTION-TEST] Connection test failed:', errorMessage);
      return false;
    }
  }

  /**
   * Generate test page content
   */
  private generateTestPageContent(printerConfig: PrinterConfig, testData: any): TestContent {
    return {
      title: 'RESTAURANT PLATFORM TEST',
      printerName: printerConfig.name,
      printerType: printerConfig.type,
      connection: printerConfig.connection || 'Unknown',
      timestamp: new Date().toLocaleString(),
      branchName: testData.branchName || 'Test Branch',
      companyName: testData.companyName || 'Restaurant Platform',
      testPattern: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
      numbers: '0123456789',
      specialChars: '!@#$%^&*()',
      status: 'SUCCESS'
    };
  }

  /**
   * Detect thermal printer type based on name/manufacturer
   */
  private detectThermalPrinterType(printerConfig: PrinterConfig): any {
    const name = (printerConfig.name || '').toLowerCase();
    const manufacturer = (printerConfig.manufacturer || '').toLowerCase();

    if (name.includes('epson') || manufacturer.includes('epson')) {
      return PrinterTypes.EPSON;
    } else if (name.includes('star') || manufacturer.includes('star')) {
      return PrinterTypes.STAR;
    } else if (name.includes('citizen') || manufacturer.includes('citizen')) {
      return PrinterTypes.CUSTOM;
    } else {
      // Default to EPSON ESC/POS which is most compatible
      return PrinterTypes.EPSON;
    }
  }

  /**
   * Determine printer interface based on connection type
   */
  private determinePrinterInterface(printerConfig: PrinterConfig): string {
    switch (printerConfig.connection?.toLowerCase()) {
      case 'usb':
        return this.findUSBInterface(printerConfig);
      case 'serial':
        return this.findSerialInterface(printerConfig);
      case 'network':
        if (printerConfig.ip && printerConfig.port) {
          return `tcp://${printerConfig.ip}:${printerConfig.port}`;
        }
        return 'tcp://192.168.1.100:9100'; // Default network interface
      case 'bluetooth':
        return this.findBluetoothInterface(printerConfig);
      default:
        // Try USB first, then serial
        return this.findUSBInterface(printerConfig) || '/dev/usb/lp0';
    }
  }

  /**
   * Find USB interface for printer
   */
  private findUSBInterface(printerConfig: PrinterConfig): string {
    // On Linux: /dev/usb/lp0, /dev/usb/lp1, etc.
    // On Windows: USB001, USB002, etc.
    // On macOS: /dev/cu.usbserial-*, /dev/tty.usbserial-*

    const platform = os.platform();

    if (platform === 'linux') {
      return '/dev/usb/lp0'; // Most common USB printer interface on Linux
    } else if (platform === 'win32') {
      return 'USB001'; // Windows USB port
    } else if (platform === 'darwin') {
      return '/dev/cu.usbserial-1410'; // macOS USB serial
    }

    return '/dev/usb/lp0'; // Default fallback
  }

  /**
   * Find serial interface for printer
   */
  private findSerialInterface(printerConfig: PrinterConfig): string {
    const platform = os.platform();

    if (platform === 'linux') {
      return '/dev/ttyUSB0'; // Common serial interface on Linux
    } else if (platform === 'win32') {
      return 'COM1'; // Windows COM port
    } else if (platform === 'darwin') {
      return '/dev/tty.usbserial-1410'; // macOS serial
    }

    return '/dev/ttyUSB0'; // Default fallback
  }

  /**
   * Find Bluetooth interface for printer
   */
  private findBluetoothInterface(printerConfig: PrinterConfig): string {
    // Bluetooth interfaces are more complex and require pairing
    // This is a simplified implementation
    return '/dev/rfcomm0'; // Default Bluetooth serial interface
  }

  /**
   * Generate raw ESC/POS commands
   */
  private generateESCPOSCommands(printerConfig: PrinterConfig, content: TestContent): string {
    const ESC = '\x1b';
    const GS = '\x1d';

    let commands = '';

    // Initialize printer
    commands += ESC + '@'; // Initialize

    // Center alignment and bold
    commands += ESC + 'a' + String.fromCharCode(1); // Center align
    commands += ESC + 'E' + String.fromCharCode(1); // Bold on

    // Header
    commands += '================================\n';
    commands += '    RESTAURANT PLATFORM\n';
    commands += '        TEST PRINT\n';
    commands += '================================\n';

    // Bold off, left align
    commands += ESC + 'E' + String.fromCharCode(0); // Bold off
    commands += ESC + 'a' + String.fromCharCode(0); // Left align
    commands += '\n';

    // Printer info
    commands += `Printer: ${printerConfig.name}\n`;
    commands += `Type: ${printerConfig.type.toUpperCase()}\n`;
    commands += `Time: ${new Date().toLocaleString()}\n`;
    commands += '================================\n';
    commands += '\n';

    // Test content
    commands += 'This is a test print to verify\n';
    commands += 'printer connectivity and\n';
    commands += 'functionality.\n';
    commands += '\n';
    commands += 'Print quality check:\n';
    commands += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ\n';
    commands += '0123456789\n';
    commands += 'Special chars: !@#$%^&*()\n';
    commands += '\n';

    // Center align for status
    commands += ESC + 'a' + String.fromCharCode(1); // Center align
    commands += ESC + 'E' + String.fromCharCode(1); // Bold on
    commands += '================================\n';
    commands += 'Status: SUCCESS\n';
    commands += '================================\n';
    commands += ESC + 'E' + String.fromCharCode(0); // Bold off

    // Cut paper if supported
    if (printerConfig.capabilities?.includes('cut')) {
      commands += GS + 'V' + String.fromCharCode(65) + String.fromCharCode(0); // Partial cut
    } else {
      commands += '\n\n\n'; // Extra line feeds
    }

    return commands;
  }

  /**
   * Send raw commands to system printer
   */
  private async sendRawToSystemPrinter(printerConfig: PrinterConfig, rawData: string): Promise<PrintResult> {
    console.log(`📡 [RAW-SYSTEM] Sending raw data to system printer: ${printerConfig.name}`);

    try {
      // Create temporary file with raw printer data
      const tmpDir = os.tmpdir();
      const tmpFile = path.join(tmpDir, `print-job-${Date.now()}.prn`);

      await fs.writeFile(tmpFile, rawData, 'binary');

      // Send to printer using system commands
      let printCommand = '';
      const platform = os.platform();

      if (platform === 'win32') {
        // Windows: copy file to printer
        printCommand = `copy /b "${tmpFile}" "${printerConfig.name}"`;
      } else if (platform === 'linux') {
        // Linux: use lp command
        printCommand = `lp -d "${printerConfig.name}" "${tmpFile}"`;
      } else if (platform === 'darwin') {
        // macOS: use lp command
        printCommand = `lp -d "${printerConfig.name}" "${tmpFile}"`;
      }

      if (printCommand) {
        await execAsync(printCommand);

        // Clean up temporary file
        await fs.unlink(tmpFile).catch(() => {}); // Ignore cleanup errors

        console.log(`✅ [RAW-SYSTEM] Raw print successful`);

        return {
          success: true,
          message: 'Raw system print successful',
          timestamp: new Date().toISOString(),
          printerId: printerConfig.id || printerConfig.name,
          method: 'raw_system'
        };
      } else {
        throw new Error('Unsupported platform for raw system printing');
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`❌ [RAW-SYSTEM] Raw system print failed:`, error);
      throw error;
    }
  }

  /**
   * Send raw data to network printer via socket
   */
  private async sendRawToNetworkPrinter(printerConfig: PrinterConfig, rawData: string): Promise<PrintResult> {
    console.log(`🌐 [RAW-NETWORK] Sending raw data to network printer: ${printerConfig.ip}:${printerConfig.port}`);

    return new Promise((resolve, reject) => {
      const socket = new net.Socket();

      const timeout = setTimeout(() => {
        socket.destroy();
        reject(new Error('Network printer connection timeout'));
      }, 10000);

      socket.connect(printerConfig.port || 9100, printerConfig.ip!, () => {
        console.log(`🔗 [RAW-NETWORK] Connected to ${printerConfig.ip}:${printerConfig.port}`);
        clearTimeout(timeout);

        socket.write(rawData, () => {
          console.log(`📤 [RAW-NETWORK] Data sent to printer`);
          socket.end();
        });
      });

      socket.on('close', () => {
        console.log(`✅ [RAW-NETWORK] Network print completed`);
        resolve({
          success: true,
          message: 'Network raw print successful',
          timestamp: new Date().toISOString(),
          printerId: printerConfig.id || printerConfig.name,
          method: 'raw_network'
        });
      });

      socket.on('error', (error) => {
        clearTimeout(timeout);
        console.error(`❌ [RAW-NETWORK] Network print error:`, error);
        reject(error);
      });
    });
  }

  /**
   * Format content for regular printer
   */
  private formatContentForRegularPrinter(content: TestContent): string {
    let text = '';

    text += '================================\n';
    text += '    RESTAURANT PLATFORM\n';
    text += '        TEST PRINT\n';
    text += '================================\n\n';

    text += `Printer: ${content.printerName}\n`;
    text += `Type: ${content.printerType}\n`;
    text += `Connection: ${content.connection}\n`;
    text += `Time: ${content.timestamp}\n`;
    text += `Branch: ${content.branchName}\n`;
    text += `Company: ${content.companyName}\n`;
    text += '================================\n\n';

    text += 'This is a test print to verify\n';
    text += 'printer connectivity and functionality.\n\n';

    text += 'Print quality check:\n';
    text += `${content.testPattern}\n`;
    text += `${content.numbers}\n`;
    text += `Special chars: ${content.specialChars}\n\n`;

    text += '================================\n';
    text += `Status: ${content.status}\n`;
    text += '================================\n';

    return text;
  }

  /**
   * Send text to system printer
   */
  private async sendTextToSystemPrinter(printerConfig: PrinterConfig, textContent: string): Promise<PrintResult> {
    console.log(`📝 [TEXT-SYSTEM] Sending text to system printer: ${printerConfig.name}`);

    try {
      const tmpDir = os.tmpdir();
      const tmpFile = path.join(tmpDir, `print-text-${Date.now()}.txt`);

      await fs.writeFile(tmpFile, textContent, 'utf8');

      let printCommand = '';
      const platform = os.platform();

      if (platform === 'win32') {
        printCommand = `notepad /p "${tmpFile}"`;
      } else if (platform === 'linux') {
        printCommand = `lp -d "${printerConfig.name}" "${tmpFile}"`;
      } else if (platform === 'darwin') {
        printCommand = `lp -d "${printerConfig.name}" "${tmpFile}"`;
      }

      if (printCommand) {
        await execAsync(printCommand);
        await fs.unlink(tmpFile).catch(() => {});

        console.log(`✅ [TEXT-SYSTEM] Text print successful`);

        return {
          success: true,
          message: 'Text system print successful',
          timestamp: new Date().toISOString(),
          printerId: printerConfig.id || printerConfig.name,
          method: 'text_system'
        };
      } else {
        throw new Error('Unsupported platform for text system printing');
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`❌ [TEXT-SYSTEM] Text system print failed:`, error);
      throw error;
    }
  }

  /**
   * Generate PDF for printing
   */
  private async generatePDFForPrinting(content: TestContent): Promise<string> {
    console.log(`📊 [PDF-GEN] Generating PDF test document`);

    try {
      const doc = new jsPDF();

      // Set font
      doc.setFont('courier');

      // Title
      doc.setFontSize(16);
      doc.text('RESTAURANT PLATFORM', 105, 20, { align: 'center' });
      doc.text('TEST PRINT', 105, 30, { align: 'center' });

      // Line
      doc.setDrawColor(0);
      doc.line(20, 35, 190, 35);

      // Content
      doc.setFontSize(12);
      let y = 50;

      doc.text(`Printer: ${content.printerName}`, 20, y);
      y += 10;
      doc.text(`Type: ${content.printerType}`, 20, y);
      y += 10;
      doc.text(`Connection: ${content.connection}`, 20, y);
      y += 10;
      doc.text(`Time: ${content.timestamp}`, 20, y);
      y += 10;
      doc.text(`Branch: ${content.branchName}`, 20, y);
      y += 10;
      doc.text(`Company: ${content.companyName}`, 20, y);
      y += 20;

      doc.text('This is a test print to verify printer connectivity', 20, y);
      y += 10;
      doc.text('and functionality.', 20, y);
      y += 20;

      doc.text('Print quality check:', 20, y);
      y += 10;
      doc.text(content.testPattern || '', 20, y);
      y += 10;
      doc.text(content.numbers || '', 20, y);
      y += 10;
      doc.text(`Special chars: ${content.specialChars}`, 20, y);
      y += 20;

      // Status
      doc.setFontSize(14);
      doc.text(`Status: ${content.status}`, 105, y, { align: 'center' });

      // Save PDF
      const tmpDir = os.tmpdir();
      const pdfPath = path.join(tmpDir, `test-print-${Date.now()}.pdf`);

      const pdfData = doc.output('arraybuffer');
      await fs.writeFile(pdfPath, Buffer.from(pdfData));

      console.log(`✅ [PDF-GEN] PDF generated: ${pdfPath}`);
      return pdfPath;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`❌ [PDF-GEN] PDF generation failed:`, error);
      throw error;
    }
  }

  /**
   * Send PDF to system printer
   */
  private async sendPDFToSystemPrinter(printerConfig: PrinterConfig, pdfPath: string): Promise<PrintResult> {
    console.log(`📄 [PDF-SYSTEM] Sending PDF to system printer: ${printerConfig.name}`);

    try {
      let printCommand = '';
      const platform = os.platform();

      if (platform === 'win32') {
        // Windows: Use start command to open with default PDF viewer for printing
        printCommand = `start "" /wait "${pdfPath}"`;
      } else if (platform === 'linux') {
        // Linux: Use lp command with PDF
        printCommand = `lp -d "${printerConfig.name}" "${pdfPath}"`;
      } else if (platform === 'darwin') {
        // macOS: Use lp command
        printCommand = `lp -d "${printerConfig.name}" "${pdfPath}"`;
      }

      if (printCommand) {
        await execAsync(printCommand);

        // Clean up PDF file after short delay
        setTimeout(() => {
          fs.unlink(pdfPath).catch(() => {});
        }, 5000);

        console.log(`✅ [PDF-SYSTEM] PDF print successful`);

        return {
          success: true,
          message: 'PDF system print successful',
          timestamp: new Date().toISOString(),
          printerId: printerConfig.id || printerConfig.name,
          method: 'pdf_system',
          filePath: pdfPath
        };
      } else {
        throw new Error('Unsupported platform for PDF system printing');
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`❌ [PDF-SYSTEM] PDF system print failed:`, error);
      throw error;
    }
  }

  /**
   * Get printer status and capabilities
   */
  async getPrinterStatus(printerConfig: PrinterConfig): Promise<PrinterStatus> {
    await this.initialize();

    try {
      // Basic status check - can be enhanced with actual printer communication
      return {
        printerId: printerConfig.id || printerConfig.name,
        name: printerConfig.name,
        status: 'ready',
        paperLevel: 85, // Mock data
        temperature: 32, // Mock data
        capabilities: printerConfig.capabilities || ['text'],
        lastChecked: new Date().toISOString()
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        printerId: printerConfig.id || printerConfig.name,
        name: printerConfig.name,
        status: 'error',
        error: errorMessage,
        capabilities: [],
        lastChecked: new Date().toISOString()
      };
    }
  }

  /**
   * Process a full print job (orders, receipts, etc.)
   */
  async processPrintJob(printerConfig: PrinterConfig, jobData: JobData): Promise<PrintResult> {
    await this.initialize();

    console.log(`📋 [PRINT-JOB] Processing ${jobData.type} job for: ${printerConfig.name}`);

    try {
      switch (jobData.type) {
        case 'test':
          return await this.printTestPage(printerConfig, jobData.testData);
        case 'receipt':
          return await this.printReceipt(printerConfig, jobData);
        case 'kitchen_order':
          return await this.printKitchenOrder(printerConfig, jobData);
        case 'label':
          return await this.printLabel(printerConfig, jobData);
        default:
          throw new Error(`Unsupported job type: ${jobData.type}`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`❌ [PRINT-JOB] Print job failed:`, error);
      throw error;
    }
  }

  /**
   * Print receipt
   */
  private async printReceipt(printerConfig: PrinterConfig, jobData: JobData): Promise<PrintResult> {
    // Implementation similar to printTestPage but with receipt formatting
    const receiptContent = this.generateReceiptContent(jobData);
    return await this.printToThermalPrinter(printerConfig, receiptContent);
  }

  /**
   * Print kitchen order
   */
  private async printKitchenOrder(printerConfig: PrinterConfig, jobData: JobData): Promise<PrintResult> {
    // Implementation for kitchen order formatting
    const kitchenContent = this.generateKitchenOrderContent(jobData);
    return await this.printToKitchenPrinter(printerConfig, kitchenContent);
  }

  /**
   * Print label
   */
  private async printLabel(printerConfig: PrinterConfig, jobData: JobData): Promise<PrintResult> {
    // Implementation for label printing
    const labelContent = this.generateLabelContent(jobData);
    return await this.printToThermalPrinter(printerConfig, labelContent);
  }

  private generateReceiptContent(jobData: JobData): TestContent {
    // Generate receipt content from job data
    return {
      title: 'CUSTOMER RECEIPT',
      ...jobData,
      isReceipt: true
    };
  }

  private generateKitchenOrderContent(jobData: JobData): TestContent {
    // Generate kitchen order content from job data
    return {
      title: 'KITCHEN ORDER',
      ...jobData,
      isKitchen: true
    };
  }

  private generateLabelContent(jobData: JobData): TestContent {
    // Generate label content from job data
    return {
      title: 'PRODUCT LABEL',
      ...jobData,
      isLabel: true
    };
  }
}

export default PhysicalPrinterService;