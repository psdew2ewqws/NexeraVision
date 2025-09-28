import { EventEmitter } from 'events';
import log from 'electron-log';
import os from 'os';
import { QZTrayService } from './qz-tray-service';
import { APIService } from './api-service';
import { PrinterManager } from './printer-manager';
import { SystemMetrics, HealthStatus, HealthCheck } from '../../types';

export class HealthMonitor extends EventEmitter {
  private qzTrayService: QZTrayService;
  private apiService: APIService;
  private printerManager: PrinterManager;
  private monitoringTimer?: NodeJS.Timeout;
  private metricsHistory: SystemMetrics[] = [];
  private currentHealth: HealthStatus = {
    status: 'healthy',
    timestamp: Date.now(),
    checks: {
      api: { status: 'up' },
      qzTray: { status: 'connected' },
      database: { status: 'connected' },
      license: { status: 'valid' }
    }
  };
  private initialized = false;

  constructor(
    qzTrayService: QZTrayService,
    apiService: APIService,
    printerManager: PrinterManager
  ) {
    super();
    this.qzTrayService = qzTrayService;
    this.apiService = apiService;
    this.printerManager = printerManager;
  }

  async initialize(): Promise<void> {
    try {
      log.info('Initializing HealthMonitor...');
      
      this.startMonitoring();
      
      this.initialized = true;
      log.info('HealthMonitor initialized successfully');
    } catch (error) {
      log.error('Failed to initialize HealthMonitor:', error);
      throw error;
    }
  }

  async shutdown(): Promise<void> {
    log.info('Shutting down HealthMonitor...');
    
    this.stopMonitoring();
    this.removeAllListeners();
    this.initialized = false;
  }

  private startMonitoring(): void {
    // Perform initial health check
    this.performHealthCheck();

    // Schedule periodic health checks every minute
    this.monitoringTimer = setInterval(() => {
      this.performHealthCheck();
    }, 60000);

    log.info('Health monitoring started');
  }

  private stopMonitoring(): void {
    if (this.monitoringTimer) {
      clearInterval(this.monitoringTimer);
      this.monitoringTimer = undefined;
    }
    log.info('Health monitoring stopped');
  }

  async checkHealth(): Promise<HealthStatus> {
    await this.performHealthCheck();
    return this.currentHealth;
  }

  async getSystemMetrics(): Promise<SystemMetrics> {
    const memoryUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    
    return {
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: {
        used: memoryUsage.rss,
        total: os.totalmem(),
        heapUsed: memoryUsage.heapUsed,
        heapTotal: memoryUsage.heapTotal,
        external: memoryUsage.external
      },
      cpu: {
        usage: 0, // Would need to calculate properly
        loadAverage: os.loadavg()
      },
      network: {
        bytesReceived: 0, // Would need to collect from system
        bytesSent: 0
      }
    };
  }

  private async performHealthCheck(): Promise<void> {
    try {
      const startTime = Date.now();
      
      // Collect system metrics
      const metrics = await this.getSystemMetrics();
      this.addMetrics(metrics);

      // Check QZ Tray
      const qzTrayCheck = await this.checkQZTray();
      
      // Check API
      const apiCheck = await this.checkAPI();
      
      // Check printers
      const printerCheck = await this.checkPrinters();

      // Update current health status
      this.currentHealth = {
        status: this.calculateOverallStatus([qzTrayCheck, apiCheck, printerCheck]),
        timestamp: Date.now(),
        checks: {
          api: apiCheck,
          qzTray: qzTrayCheck,
          database: { status: 'connected' }, // Mock
          license: { status: 'valid' } // Mock
        },
        overall: {
          score: this.calculateHealthScore(),
          issues: this.getHealthIssues()
        }
      };

      this.emit('health-updated', this.currentHealth);
      
      const duration = Date.now() - startTime;
      log.debug(`Health check completed in ${duration}ms - Status: ${this.currentHealth.status}`);

    } catch (error) {
      log.error('Health check failed:', error);
      
      this.currentHealth = {
        status: 'unhealthy',
        timestamp: Date.now(),
        checks: {
          api: { status: 'down', error: 'Health check failed' },
          qzTray: { status: 'disconnected', error: 'Health check failed' },
          database: { status: 'disconnected', error: 'Health check failed' },
          license: { status: 'invalid', error: 'Health check failed' }
        }
      };

      this.emit('health-error', error);
    }
  }

  private async checkQZTray(): Promise<HealthCheck> {
    try {
      const startTime = Date.now();
      const isConnected = this.qzTrayService.isConnected();
      const responseTime = Date.now() - startTime;

      return {
        status: isConnected ? 'connected' : 'disconnected',
        responseTime: isConnected ? responseTime : undefined,
        version: isConnected ? this.qzTrayService.getVersion() : undefined,
        error: isConnected ? undefined : 'QZ Tray not connected'
      };
    } catch (error) {
      return {
        status: 'disconnected',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private async checkAPI(): Promise<HealthCheck> {
    try {
      const startTime = Date.now();
      const isConnected = this.apiService.isConnected();
      const responseTime = Date.now() - startTime;

      return {
        status: isConnected ? 'up' : 'down',
        responseTime: isConnected ? responseTime : undefined,
        error: isConnected ? undefined : 'API not connected'
      };
    } catch (error) {
      return {
        status: 'down',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private async checkPrinters(): Promise<HealthCheck> {
    try {
      const totalCount = this.printerManager.getTotalCount();
      const onlineCount = this.printerManager.getOnlineCount();
      const offlineCount = this.printerManager.getOfflineCount();
      const errorCount = this.printerManager.getErrorCount();

      const healthPercentage = totalCount > 0 ? (onlineCount / totalCount) * 100 : 100;

      let status: 'up' | 'down' = 'up';
      if (healthPercentage < 50) {
        status = 'down';
      }

      return {
        status,
        error: status === 'down' ? 'Too many printers offline/error' : undefined
      };
    } catch (error) {
      return {
        status: 'down',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private calculateOverallStatus(checks: HealthCheck[]): 'healthy' | 'degraded' | 'unhealthy' {
    const downChecks = checks.filter(check => 
      check.status === 'down' || check.status === 'disconnected' || check.status === 'invalid'
    ).length;

    if (downChecks === 0) {
      return 'healthy';
    } else if (downChecks <= 1) {
      return 'degraded';
    } else {
      return 'unhealthy';
    }
  }

  private calculateHealthScore(): number {
    let score = 100;
    
    // QZ Tray penalty
    if (!this.qzTrayService.isConnected()) {
      score -= 25;
    }
    
    // API penalty
    if (!this.apiService.isConnected()) {
      score -= 20;
    }
    
    // Printer health penalty
    const totalPrinters = this.printerManager.getTotalCount();
    if (totalPrinters > 0) {
      const onlinePrinters = this.printerManager.getOnlineCount();
      const healthPercentage = (onlinePrinters / totalPrinters) * 100;
      
      if (healthPercentage < 50) {
        score -= 30;
      } else if (healthPercentage < 75) {
        score -= 15;
      }
    }
    
    return Math.max(0, score);
  }

  private getHealthIssues(): string[] {
    const issues: string[] = [];
    
    if (!this.qzTrayService.isConnected()) {
      issues.push('QZ Tray disconnected');
    }
    
    if (!this.apiService.isConnected()) {
      issues.push('API service unavailable');
    }
    
    const totalPrinters = this.printerManager.getTotalCount();
    const offlinePrinters = this.printerManager.getOfflineCount();
    const errorPrinters = this.printerManager.getErrorCount();
    
    if (offlinePrinters > 0) {
      issues.push(`${offlinePrinters} printer(s) offline`);
    }
    
    if (errorPrinters > 0) {
      issues.push(`${errorPrinters} printer(s) with errors`);
    }
    
    return issues;
  }

  private addMetrics(metrics: SystemMetrics): void {
    this.metricsHistory.push(metrics);
    
    // Keep last 24 hours of metrics (assuming 1 minute intervals)
    if (this.metricsHistory.length > 1440) {
      this.metricsHistory = this.metricsHistory.slice(-1440);
    }
  }

  getLatestMetrics(): SystemMetrics | null {
    return this.metricsHistory.length > 0 
      ? this.metricsHistory[this.metricsHistory.length - 1] 
      : null;
  }

  getHealthStatus(): HealthStatus {
    return { ...this.currentHealth };
  }

  isInitialized(): boolean {
    return this.initialized;
  }
}