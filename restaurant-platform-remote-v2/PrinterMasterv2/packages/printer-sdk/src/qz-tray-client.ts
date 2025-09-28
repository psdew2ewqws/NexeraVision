/**
 * PrinterMaster v2 - QZ Tray SDK Client
 * Enterprise-grade QZ Tray WebSocket integration
 */

import WebSocket from 'ws';
import { EventEmitter } from 'events';
import crypto from 'crypto';

export interface QZTrayConfig {
  host: string;
  port: number;
  secure: boolean;
  timeout: number;
  retryAttempts: number;
  retryDelay: number;
  keepAlive: boolean;
  keepAliveInterval: number;
}

export interface PrinterInfo {
  name: string;
  driver?: string;
  connection?: string;
  default?: boolean;
  physical?: boolean;
  capabilities?: any;
}

export interface PrintJob {
  printer: string;
  data: string | Uint8Array;
  format?: 'plain' | 'html' | 'image' | 'pdf' | 'raw';
  options?: {
    encoding?: string;
    copies?: number;
    jobName?: string;
    size?: {
      width?: number;
      height?: number;
    };
    margins?: {
      top?: number;
      right?: number;
      bottom?: number;
      left?: number;
    };
    orientation?: 'portrait' | 'landscape';
    colorType?: 'color' | 'grayscale' | 'blackwhite';
    density?: number;
    interpolation?: string;
    rasterize?: boolean;
  };
}

export interface QZTrayResponse {
  uid: string;
  result?: any;
  error?: {
    message: string;
    cause?: string;
  };
}

export interface QZTrayRequest {
  call: string;
  params?: any[];
  uid?: string;
}

/**
 * QZ Tray WebSocket Client with enterprise features
 */
export class QZTrayClient extends EventEmitter {
  private ws: WebSocket | null = null;
  private config: QZTrayConfig;
  private connectionState: 'disconnected' | 'connecting' | 'connected' | 'error' = 'disconnected';
  private reconnectTimer: NodeJS.Timeout | null = null;
  private keepAliveTimer: NodeJS.Timeout | null = null;
  private requestQueue: Map<string, {
    resolve: (value: any) => void;
    reject: (reason: any) => void;
    timeout: NodeJS.Timeout;
  }> = new Map();
  private retryCount = 0;
  private lastError: Error | null = null;

  constructor(config?: Partial<QZTrayConfig>) {
    super();
    
    this.config = {
      host: 'localhost',
      port: 8182,
      secure: false,
      timeout: 30000,
      retryAttempts: 5,
      retryDelay: 5000,
      keepAlive: true,
      keepAliveInterval: 30000,
      ...config,
    };
  }

  /**
   * Connect to QZ Tray WebSocket
   */
  async connect(): Promise<void> {
    if (this.connectionState === 'connected' || this.connectionState === 'connecting') {
      return;
    }

    return new Promise((resolve, reject) => {
      try {
        this.connectionState = 'connecting';
        this.emit('connecting');

        const protocol = this.config.secure ? 'wss' : 'ws';
        const url = `${protocol}://${this.config.host}:${this.config.port}`;

        this.ws = new WebSocket(url, {
          handshakeTimeout: this.config.timeout,
          perMessageDeflate: false,
        });

        this.ws.on('open', () => {
          this.connectionState = 'connected';
          this.retryCount = 0;
          this.lastError = null;
          this.startKeepAlive();
          this.emit('connected');
          resolve();
        });

        this.ws.on('message', (data) => {
          this.handleMessage(data);
        });

        this.ws.on('close', (code, reason) => {
          this.handleDisconnection(code, reason.toString());
        });

        this.ws.on('error', (error) => {
          this.lastError = error;
          this.connectionState = 'error';
          this.emit('error', error);
          
          if (this.connectionState === 'connecting') {
            reject(error);
          }
        });

      } catch (error) {
        this.connectionState = 'error';
        this.lastError = error as Error;
        reject(error);
      }
    });
  }

  /**
   * Disconnect from QZ Tray
   */
  async disconnect(): Promise<void> {
    this.stopReconnection();
    this.stopKeepAlive();
    this.clearRequestQueue();

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this.connectionState = 'disconnected';
    this.emit('disconnected');
  }

  /**
   * Check if connected to QZ Tray
   */
  isConnected(): boolean {
    return this.connectionState === 'connected' && this.ws?.readyState === WebSocket.OPEN;
  }

  /**
   * Get QZ Tray version information
   */
  async getVersion(): Promise<string> {
    const response = await this.sendRequest({ call: 'getVersion' });
    return response.result;
  }

  /**
   * Get list of available printers
   */
  async getPrinters(): Promise<PrinterInfo[]> {
    const response = await this.sendRequest({ call: 'printers.find' });
    return response.result || [];
  }

  /**
   * Get default printer
   */
  async getDefaultPrinter(): Promise<PrinterInfo | null> {
    const response = await this.sendRequest({ call: 'printers.getDefault' });
    return response.result;
  }

  /**
   * Get printer details
   */
  async getPrinterDetails(printerName: string): Promise<PrinterInfo> {
    const response = await this.sendRequest({
      call: 'printers.detail',
      params: [printerName],
    });
    return response.result;
  }

  /**
   * Check printer status
   */
  async getPrinterStatus(printerName: string): Promise<any> {
    const response = await this.sendRequest({
      call: 'printers.status',
      params: [printerName],
    });
    return response.result;
  }

  /**
   * Print job
   */
  async print(job: PrintJob): Promise<boolean> {
    const config = {
      printer: job.printer,
      ...(job.options || {}),
    };

    const data = Array.isArray(job.data) ? job.data : [job.data];

    const response = await this.sendRequest({
      call: 'print',
      params: [config, data],
    });

    return response.result === true;
  }

  /**
   * Print test page
   */
  async printTestPage(printerName: string): Promise<boolean> {
    const testPageContent = this.generateTestPageContent();
    
    return this.print({
      printer: printerName,
      data: testPageContent,
      format: 'plain',
      options: {
        jobName: 'PrinterMaster Test Page',
      },
    });
  }

  /**
   * Test printer connectivity
   */
  async testPrinter(printerName: string): Promise<{
    success: boolean;
    responseTime: number;
    error?: string;
  }> {
    const startTime = Date.now();
    
    try {
      await this.getPrinterStatus(printerName);
      const responseTime = Date.now() - startTime;
      
      return {
        success: true,
        responseTime,
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      
      return {
        success: false,
        responseTime,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Send raw ESC/POS commands
   */
  async sendRawCommands(printerName: string, commands: Uint8Array): Promise<boolean> {
    return this.print({
      printer: printerName,
      data: commands,
      format: 'raw',
    });
  }

  /**
   * Open cash drawer (if supported)
   */
  async openCashDrawer(printerName: string): Promise<boolean> {
    // ESC/POS command to open cash drawer
    const openDrawerCommand = new Uint8Array([0x1B, 0x70, 0x00, 0x19, 0xFA]);
    
    return this.sendRawCommands(printerName, openDrawerCommand);
  }

  /**
   * Send request to QZ Tray with timeout and error handling
   */
  private async sendRequest(request: QZTrayRequest): Promise<QZTrayResponse> {
    if (!this.isConnected()) {
      throw new Error('Not connected to QZ Tray');
    }

    const uid = request.uid || this.generateUID();
    const requestWithUID = { ...request, uid };

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.requestQueue.delete(uid);
        reject(new Error(`Request timeout: ${request.call}`));
      }, this.config.timeout);

      this.requestQueue.set(uid, { resolve, reject, timeout });

      try {
        this.ws!.send(JSON.stringify(requestWithUID));
      } catch (error) {
        this.requestQueue.delete(uid);
        clearTimeout(timeout);
        reject(error);
      }
    });
  }

  /**
   * Handle incoming WebSocket messages
   */
  private handleMessage(data: WebSocket.Data): void {
    try {
      const message = JSON.parse(data.toString());
      
      if (message.uid && this.requestQueue.has(message.uid)) {
        const request = this.requestQueue.get(message.uid)!;
        this.requestQueue.delete(message.uid);
        clearTimeout(request.timeout);

        if (message.error) {
          request.reject(new Error(message.error.message || 'QZ Tray error'));
        } else {
          request.resolve(message);
        }
      } else {
        // Handle unsolicited messages (events, status updates, etc.)
        this.emit('message', message);
      }
    } catch (error) {
      this.emit('error', new Error(`Failed to parse message: ${error}`));
    }
  }

  /**
   * Handle WebSocket disconnection
   */
  private handleDisconnection(code: number, reason: string): void {
    this.connectionState = 'disconnected';
    this.stopKeepAlive();
    this.clearRequestQueue();

    this.emit('disconnected', { code, reason });

    // Auto-reconnect if not intentionally disconnected
    if (code !== 1000 && this.retryCount < this.config.retryAttempts) {
      this.scheduleReconnection();
    }
  }

  /**
   * Schedule reconnection attempt
   */
  private scheduleReconnection(): void {
    if (this.reconnectTimer) {
      return;
    }

    const delay = this.config.retryDelay * Math.pow(2, this.retryCount); // Exponential backoff
    
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.retryCount++;
      
      this.emit('reconnecting', this.retryCount);
      this.connect().catch((error) => {
        this.emit('reconnect-failed', error);
        
        if (this.retryCount < this.config.retryAttempts) {
          this.scheduleReconnection();
        } else {
          this.emit('reconnect-exhausted');
        }
      });
    }, delay);
  }

  /**
   * Stop reconnection attempts
   */
  private stopReconnection(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.retryCount = 0;
  }

  /**
   * Start keep-alive mechanism
   */
  private startKeepAlive(): void {
    if (!this.config.keepAlive) {
      return;
    }

    this.keepAliveTimer = setInterval(() => {
      if (this.isConnected()) {
        this.getVersion().catch(() => {
          // Keep-alive failed, connection might be lost
          this.emit('keep-alive-failed');
        });
      }
    }, this.config.keepAliveInterval);
  }

  /**
   * Stop keep-alive mechanism
   */
  private stopKeepAlive(): void {
    if (this.keepAliveTimer) {
      clearInterval(this.keepAliveTimer);
      this.keepAliveTimer = null;
    }
  }

  /**
   * Clear pending request queue
   */
  private clearRequestQueue(): void {
    for (const [uid, request] of this.requestQueue) {
      clearTimeout(request.timeout);
      request.reject(new Error('Connection closed'));
    }
    this.requestQueue.clear();
  }

  /**
   * Generate unique request ID
   */
  private generateUID(): string {
    return crypto.randomBytes(16).toString('hex');
  }

  /**
   * Generate test page content
   */
  private generateTestPageContent(): string {
    const now = new Date();
    return `
PrinterMaster v2 Test Page
${'-'.repeat(40)}

Timestamp: ${now.toISOString()}
Local Time: ${now.toLocaleString()}

Test Pattern:
ABCDEFGHIJKLMNOPQRSTUVWXYZ
abcdefghijklmnopqrstuvwxyz
0123456789 !@#$%^&*()

Special Characters:
áéíóú àèìòù âêîôû ãñõ
ÁÉÍÓÚ ÀÈÌÒÙ ÂÊÎÔÛ ÃÑÕ

Line Length Test:
${'*'.repeat(32)}
${'*'.repeat(48)}
${'*'.repeat(64)}

${'-'.repeat(40)}
End of Test Page
`;
  }

  /**
   * Get connection status information
   */
  getConnectionInfo(): {
    state: string;
    retryCount: number;
    lastError: string | null;
    config: QZTrayConfig;
  } {
    return {
      state: this.connectionState,
      retryCount: this.retryCount,
      lastError: this.lastError?.message || null,
      config: this.config,
    };
  }
}