/**
 * PrinterMaster - Auto-Discovery to Backend Sync Service
 * Bridges the gap between printer discovery and backend registration
 *
 * CRITICAL MISSION: Fix the gap where PrinterMaster discovers printers but doesn't sync them to the web interface
 *
 * Features:
 * - Automatic bulk registration of discovered printers
 * - Real-time sync with backend API and WebSocket
 * - Retry mechanism with exponential backoff
 * - Comprehensive error handling and logging
 * - Multi-tenancy support with proper branch context
 * - Duplicate detection and conflict resolution
 */

import { EventEmitter } from 'events';
import log from 'electron-log';
import axios, { AxiosInstance } from 'axios';

export interface DiscoveredPrinter {
  id: string;
  name: string;
  type: string;
  connection: string;
  status: string;
  branchId: string;
  discoveredBy: string;
  discoveryMethod: string;
  timestamp: string;
  device?: string;
  systemPrinter?: boolean;
  capabilities?: string[];
  manufacturer?: string;
  model?: string;
  portName?: string;
  driverName?: string;
  isDefault?: boolean;
}

export interface SyncResult {
  printerId: string;
  printerName: string;
  status: 'success' | 'failed' | 'duplicate' | 'error';
  backendId?: string;
  error?: string;
  timestamp: Date;
}

export interface SyncBatch {
  id: string;
  printers: DiscoveredPrinter[];
  results: SyncResult[];
  startTime: Date;
  endTime?: Date;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  totalPrinters: number;
  successCount: number;
  failedCount: number;
  duplicateCount: number;
}

export interface SyncConfig {
  enabled: boolean;
  batchSize: number;
  retryAttempts: number;
  retryDelayMs: number;
  backoffMultiplier: number;
  maxRetryDelayMs: number;
  apiTimeout: number;
  bulkSync: boolean;
  duplicateHandling: 'skip' | 'update' | 'merge';
}

export class PrinterSyncService extends EventEmitter {
  private config: SyncConfig;
  private httpClient: AxiosInstance;
  private syncQueue: DiscoveredPrinter[] = [];
  private activeBatches = new Map<string, SyncBatch>();
  private retryQueue = new Map<string, number>(); // printer ID -> retry count
  private isProcessing = false;
  private branchId?: string;
  private companyId?: string;
  private baseUrl?: string;

  constructor() {
    super();

    // Default configuration
    this.config = {
      enabled: true,
      batchSize: 10,
      retryAttempts: 3,
      retryDelayMs: 1000,
      backoffMultiplier: 2,
      maxRetryDelayMs: 30000,
      apiTimeout: 10000,
      bulkSync: true,
      duplicateHandling: 'skip'
    };

    this.httpClient = axios.create({
      timeout: this.config.apiTimeout,
      headers: {
        'Content-Type': 'application/json',
      }
    });

    log.info('[PRINTER-SYNC] Service initialized');
  }

  /**
   * Initialize the sync service with branch context and configuration
   */
  async initialize(options: {
    branchId: string;
    companyId?: string;
    baseUrl: string;
    config?: Partial<SyncConfig>;
  }): Promise<void> {
    try {
      this.branchId = options.branchId;
      this.companyId = options.companyId;
      this.baseUrl = options.baseUrl;

      // Merge configuration
      if (options.config) {
        this.config = { ...this.config, ...options.config };
      }

      // Update HTTP client base URL
      this.httpClient.defaults.baseURL = this.baseUrl;

      log.info('[PRINTER-SYNC] Initialized with config:', {
        branchId: this.branchId,
        companyId: this.companyId,
        baseUrl: this.baseUrl,
        batchSize: this.config.batchSize,
        bulkSync: this.config.bulkSync
      });

      this.emit('initialized', { branchId: this.branchId, config: this.config });
    } catch (error) {
      log.error('[PRINTER-SYNC] Initialization failed:', error);
      throw error;
    }
  }

  /**
   * Queue a discovered printer for sync
   */
  async queuePrinter(printer: DiscoveredPrinter): Promise<void> {
    if (!this.config.enabled) {
      log.debug('[PRINTER-SYNC] Service disabled, skipping printer:', printer.name);
      return;
    }

    if (!this.branchId) {
      log.error('[PRINTER-SYNC] Service not initialized - missing branchId');
      return;
    }

    // Ensure printer has proper branch context
    printer.branchId = printer.branchId || this.branchId;

    log.info('[PRINTER-SYNC] Queuing printer for sync:', {
      name: printer.name,
      type: printer.type,
      connection: printer.connection,
      branchId: printer.branchId
    });

    this.syncQueue.push(printer);
    this.emit('printer-queued', { printer, queueSize: this.syncQueue.length });

    // Start processing if not already running
    if (!this.isProcessing) {
      this.startProcessing();
    }
  }

  /**
   * Queue multiple printers for bulk sync
   */
  async queuePrinters(printers: DiscoveredPrinter[]): Promise<void> {
    if (!this.config.enabled || printers.length === 0) {
      return;
    }

    log.info('[PRINTER-SYNC] Queuing bulk printers for sync:', {
      count: printers.length,
      branchId: this.branchId
    });

    // Ensure all printers have proper branch context
    printers.forEach(printer => {
      printer.branchId = printer.branchId || this.branchId!;
    });

    this.syncQueue.push(...printers);
    this.emit('bulk-printers-queued', { count: printers.length, queueSize: this.syncQueue.length });

    // Start processing if not already running
    if (!this.isProcessing) {
      this.startProcessing();
    }
  }

  /**
   * Start processing the sync queue
   */
  private async startProcessing(): Promise<void> {
    if (this.isProcessing || this.syncQueue.length === 0) {
      return;
    }

    this.isProcessing = true;
    log.info('[PRINTER-SYNC] Starting queue processing');

    try {
      while (this.syncQueue.length > 0) {
        // Create batch
        const batchSize = Math.min(this.config.batchSize, this.syncQueue.length);
        const printers = this.syncQueue.splice(0, batchSize);

        const batch = this.createBatch(printers);
        this.activeBatches.set(batch.id, batch);

        log.info('[PRINTER-SYNC] Processing batch:', {
          batchId: batch.id,
          printerCount: batch.totalPrinters
        });

        // Process batch
        if (this.config.bulkSync && batch.totalPrinters > 1) {
          await this.processBatchBulk(batch);
        } else {
          await this.processBatchIndividual(batch);
        }

        // Update batch status
        batch.endTime = new Date();
        batch.status = batch.failedCount > 0 ? 'failed' : 'completed';

        log.info('[PRINTER-SYNC] Batch completed:', {
          batchId: batch.id,
          success: batch.successCount,
          failed: batch.failedCount,
          duplicates: batch.duplicateCount
        });

        this.emit('batch-completed', batch);

        // Clean up old batches
        this.cleanupBatches();
      }
    } catch (error) {
      log.error('[PRINTER-SYNC] Processing error:', error);
    } finally {
      this.isProcessing = false;
      log.info('[PRINTER-SYNC] Queue processing completed');
    }
  }

  /**
   * Create a new sync batch
   */
  private createBatch(printers: DiscoveredPrinter[]): SyncBatch {
    const batch: SyncBatch = {
      id: `batch_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      printers,
      results: [],
      startTime: new Date(),
      status: 'pending',
      totalPrinters: printers.length,
      successCount: 0,
      failedCount: 0,
      duplicateCount: 0
    };

    return batch;
  }

  /**
   * Process batch using bulk API endpoints
   */
  private async processBatchBulk(batch: SyncBatch): Promise<void> {
    batch.status = 'processing';

    try {
      // Transform printers to API format
      const printersData = batch.printers.map(printer => this.transformPrinterForAPI(printer));

      log.info('[PRINTER-SYNC] Sending bulk registration request:', {
        batchId: batch.id,
        endpoint: '/api/v1/printing/printers/bulk',
        printers: printersData.length
      });

      // Make bulk API request
      const response = await this.httpClient.post('/api/v1/printing/printers/bulk', {
        printers: printersData,
        branchId: this.branchId,
        companyId: this.companyId
      });

      if (response.status === 200 || response.status === 201) {
        const results = response.data.results || [];

        // Process results
        results.forEach((result: any, index: number) => {
          const printer = batch.printers[index];
          if (!printer) return;

          const syncResult: SyncResult = {
            printerId: printer.id,
            printerName: printer.name,
            status: result.success ? 'success' : (result.duplicate ? 'duplicate' : 'failed'),
            backendId: result.id,
            error: result.error,
            timestamp: new Date()
          };

          batch.results.push(syncResult);

          if (syncResult.status === 'success') {
            batch.successCount++;
            this.emit('printer-synced', { printer, result: syncResult });
          } else if (syncResult.status === 'duplicate') {
            batch.duplicateCount++;
            this.emit('printer-duplicate', { printer, result: syncResult });
          } else {
            batch.failedCount++;
            this.emit('printer-sync-failed', { printer, result: syncResult });

            // Queue for retry if applicable
            this.queueForRetry(printer);
          }
        });

        log.info('[PRINTER-SYNC] Bulk sync completed:', {
          batchId: batch.id,
          success: batch.successCount,
          duplicates: batch.duplicateCount,
          failed: batch.failedCount
        });

      } else {
        throw new Error(`API request failed with status: ${response.status}`);
      }

    } catch (error) {
      log.error('[PRINTER-SYNC] Bulk sync failed:', error);

      // Mark all printers as failed
      batch.printers.forEach(printer => {
        const syncResult: SyncResult = {
          printerId: printer.id,
          printerName: printer.name,
          status: 'failed',
          error: error.message,
          timestamp: new Date()
        };

        batch.results.push(syncResult);
        batch.failedCount++;

        this.queueForRetry(printer);
      });
    }
  }

  /**
   * Process batch with individual API calls
   */
  private async processBatchIndividual(batch: SyncBatch): Promise<void> {
    batch.status = 'processing';

    for (const printer of batch.printers) {
      try {
        const result = await this.syncPrinterIndividual(printer);
        batch.results.push(result);

        if (result.status === 'success') {
          batch.successCount++;
          this.emit('printer-synced', { printer, result });
        } else if (result.status === 'duplicate') {
          batch.duplicateCount++;
          this.emit('printer-duplicate', { printer, result });
        } else {
          batch.failedCount++;
          this.emit('printer-sync-failed', { printer, result });
          this.queueForRetry(printer);
        }

        // Small delay between individual requests
        await this.delay(100);

      } catch (error) {
        log.error('[PRINTER-SYNC] Individual sync failed:', { printer: printer.name, error: error.message });

        const syncResult: SyncResult = {
          printerId: printer.id,
          printerName: printer.name,
          status: 'failed',
          error: error.message,
          timestamp: new Date()
        };

        batch.results.push(syncResult);
        batch.failedCount++;
        this.queueForRetry(printer);
      }
    }
  }

  /**
   * Sync individual printer
   */
  private async syncPrinterIndividual(printer: DiscoveredPrinter): Promise<SyncResult> {
    const printerData = this.transformPrinterForAPI(printer);

    log.debug('[PRINTER-SYNC] Syncing individual printer:', {
      name: printer.name,
      branchId: printer.branchId,
      endpoint: '/api/v1/printing/printers'
    });

    try {
      const response = await this.httpClient.post('/api/v1/printing/printers', printerData);

      if (response.status === 200 || response.status === 201) {
        return {
          printerId: printer.id,
          printerName: printer.name,
          status: 'success',
          backendId: response.data.id,
          timestamp: new Date()
        };
      } else {
        return {
          printerId: printer.id,
          printerName: printer.name,
          status: 'failed',
          error: `API returned status: ${response.status}`,
          timestamp: new Date()
        };
      }
    } catch (error) {
      // Check if it's a duplicate error
      if (error.response?.status === 409 || error.message.includes('already exists')) {
        return {
          printerId: printer.id,
          printerName: printer.name,
          status: 'duplicate',
          error: 'Printer already registered',
          timestamp: new Date()
        };
      }

      return {
        printerId: printer.id,
        printerName: printer.name,
        status: 'failed',
        error: error.message,
        timestamp: new Date()
      };
    }
  }

  /**
   * Transform discovered printer to API format
   */
  private transformPrinterForAPI(printer: DiscoveredPrinter): any {
    return {
      name: printer.name,
      type: this.mapPrinterType(printer.type),
      connection: this.mapConnectionType(printer.connection),
      status: printer.status === 'online' ? 'online' : 'offline',
      ip: this.extractIPAddress(printer),
      port: this.extractPort(printer),
      manufacturer: printer.manufacturer || this.extractManufacturer(printer.name),
      model: printer.model || printer.name,
      location: printer.device || 'Desktop Discovery',
      paperWidth: 80, // Default for thermal printers
      assignedTo: this.mapAssignedTo(printer.type),
      isDefault: printer.isDefault || false,
      capabilities: printer.capabilities || this.getDefaultCapabilities(printer.type),
      branchId: printer.branchId,
      companyId: this.companyId,
      discoveryMethod: printer.discoveryMethod,
      discoveredBy: printer.discoveredBy,
      systemPrinter: printer.systemPrinter || false
    };
  }

  /**
   * Map printer types to backend enums
   */
  private mapPrinterType(type: string): string {
    const typeMap: { [key: string]: string } = {
      'thermal': 'thermal',
      'receipt': 'thermal',
      'kitchen': 'kitchen',
      'label': 'label',
      'laser': 'laser',
      'inkjet': 'inkjet'
    };
    return typeMap[type.toLowerCase()] || 'thermal';
  }

  /**
   * Map connection types to backend enums
   */
  private mapConnectionType(connection: string): string {
    const connectionMap: { [key: string]: string } = {
      'usb': 'usb',
      'network': 'network',
      'ethernet': 'network',
      'wifi': 'network',
      'bluetooth': 'bluetooth',
      'serial': 'usb'
    };
    return connectionMap[connection.toLowerCase()] || 'usb';
  }

  /**
   * Extract IP address from printer data
   */
  private extractIPAddress(printer: DiscoveredPrinter): string {
    // Try to extract IP from port name or device info
    if (printer.portName && printer.portName.includes('IP_')) {
      const match = printer.portName.match(/IP_(\d+\.\d+\.\d+\.\d+)/);
      if (match) return match[1];
    }

    return '127.0.0.1'; // Default fallback
  }

  /**
   * Extract port from printer data
   */
  private extractPort(printer: DiscoveredPrinter): number {
    if (printer.connection.toLowerCase().includes('network')) {
      return 9100; // Default network printer port
    }
    return 8182; // Default local service port
  }

  /**
   * Extract manufacturer from printer name
   */
  private extractManufacturer(name: string): string {
    const manufacturers = ['HP', 'Canon', 'Epson', 'Brother', 'Samsung', 'Lexmark', 'Dell', 'Xerox', 'Star', 'Zebra', 'Citizen', 'Bixolon'];
    const nameUpper = name.toUpperCase();

    for (const manufacturer of manufacturers) {
      if (nameUpper.includes(manufacturer.toUpperCase())) {
        return manufacturer;
      }
    }

    return 'Unknown';
  }

  /**
   * Map assigned-to based on printer type
   */
  private mapAssignedTo(type: string): string {
    const assignmentMap: { [key: string]: string } = {
      'thermal': 'cashier',
      'receipt': 'cashier',
      'kitchen': 'kitchen',
      'label': 'cashier'
    };
    return assignmentMap[type.toLowerCase()] || 'kitchen';
  }

  /**
   * Get default capabilities for printer type
   */
  private getDefaultCapabilities(type: string): string[] {
    const capabilityMap: { [key: string]: string[] } = {
      'thermal': ['text', 'cut', 'cash_drawer'],
      'receipt': ['text', 'cut', 'cash_drawer'],
      'kitchen': ['text', 'cut', 'buzzer'],
      'label': ['labels', 'qr_code', 'barcode']
    };
    return capabilityMap[type.toLowerCase()] || ['text'];
  }

  /**
   * Queue printer for retry with exponential backoff
   */
  private queueForRetry(printer: DiscoveredPrinter): void {
    const retryCount = this.retryQueue.get(printer.id) || 0;

    if (retryCount < this.config.retryAttempts) {
      const delay = Math.min(
        this.config.retryDelayMs * Math.pow(this.config.backoffMultiplier, retryCount),
        this.config.maxRetryDelayMs
      );

      this.retryQueue.set(printer.id, retryCount + 1);

      log.info('[PRINTER-SYNC] Queuing printer for retry:', {
        printer: printer.name,
        attempt: retryCount + 1,
        maxAttempts: this.config.retryAttempts,
        delayMs: delay
      });

      setTimeout(() => {
        this.syncQueue.push(printer);
        if (!this.isProcessing) {
          this.startProcessing();
        }
      }, delay);

    } else {
      log.error('[PRINTER-SYNC] Max retry attempts reached for printer:', {
        printer: printer.name,
        attempts: retryCount
      });

      this.retryQueue.delete(printer.id);
      this.emit('printer-sync-abandoned', { printer, retryCount });
    }
  }

  /**
   * Clean up old batches to prevent memory leaks
   */
  private cleanupBatches(): void {
    const maxBatches = 50;
    const batchIds = Array.from(this.activeBatches.keys());

    if (batchIds.length > maxBatches) {
      const batchesToRemove = batchIds.slice(0, batchIds.length - maxBatches);
      batchesToRemove.forEach(id => {
        this.activeBatches.delete(id);
      });

      log.debug('[PRINTER-SYNC] Cleaned up old batches:', batchesToRemove.length);
    }
  }

  /**
   * Utility delay function
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get sync statistics
   */
  getStatistics(): {
    queueSize: number;
    activeBatches: number;
    totalSynced: number;
    totalFailed: number;
    retryQueue: number;
  } {
    const batches = Array.from(this.activeBatches.values());
    const totalSynced = batches.reduce((sum, batch) => sum + batch.successCount, 0);
    const totalFailed = batches.reduce((sum, batch) => sum + batch.failedCount, 0);

    return {
      queueSize: this.syncQueue.length,
      activeBatches: this.activeBatches.size,
      totalSynced,
      totalFailed,
      retryQueue: this.retryQueue.size
    };
  }

  /**
   * Force sync of all queued printers
   */
  async forceSync(): Promise<void> {
    if (this.syncQueue.length === 0) {
      log.info('[PRINTER-SYNC] No printers in queue to sync');
      return;
    }

    log.info('[PRINTER-SYNC] Force syncing queued printers:', this.syncQueue.length);

    if (!this.isProcessing) {
      this.startProcessing();
    }
  }

  /**
   * Clear all queues and reset
   */
  async reset(): Promise<void> {
    log.info('[PRINTER-SYNC] Resetting sync service');

    this.syncQueue.length = 0;
    this.activeBatches.clear();
    this.retryQueue.clear();
    this.isProcessing = false;

    this.emit('reset');
  }

  /**
   * Shutdown the service
   */
  async shutdown(): Promise<void> {
    log.info('[PRINTER-SYNC] Shutting down sync service');

    this.config.enabled = false;
    await this.reset();
    this.removeAllListeners();

    this.emit('shutdown');
  }
}