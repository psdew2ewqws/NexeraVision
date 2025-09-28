/**
 * IPC Handlers for PrinterMaster Desktop App
 * Handles communication between renderer and main processes
 */

import { ipcMain, BrowserWindow } from 'electron';
import { MultiTenantManager } from './services/multi-tenant-manager';
import { ConfigManager } from './services/config-manager';
import { LogService } from './services/log-service';
import { APIService } from './services/api-service';

export class IPCHandlers {
  private multiTenantManager: MultiTenantManager;
  private configManager: ConfigManager;
  private logger: LogService;
  private apiService: APIService;
  private mainWindow: BrowserWindow | null = null;

  constructor(
    multiTenantManager: MultiTenantManager,
    configManager: ConfigManager,
    logger: LogService,
    apiService: APIService
  ) {
    this.multiTenantManager = multiTenantManager;
    this.configManager = configManager;
    this.logger = logger;
    this.apiService = apiService;
    
    this.setupHandlers();
    this.setupEventForwarding();
  }

  setMainWindow(window: BrowserWindow): void {
    this.mainWindow = window;
  }

  private setupHandlers(): void {
    // ================================
    // Multi-Tenant Handlers
    // ================================
    
    ipcMain.handle('multi-tenant:authenticate', async (event, licenseKey: string) => {
      try {
        this.logger.info('[IPC] Multi-tenant authentication requested');
        const result = await this.multiTenantManager.authenticateWithLicense(licenseKey);
        
        if (result.success && this.mainWindow) {
          this.mainWindow.webContents.send('multi-tenant:authenticated', result.data);
        }
        
        return result;
      } catch (error) {
        this.logger.error('[IPC] Multi-tenant authentication error:', error);
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('multi-tenant:get-current', async (event) => {
      try {
        return this.multiTenantManager.getTenantInfo();
      } catch (error) {
        this.logger.error('[IPC] Get current tenant error:', error);
        return null;
      }
    });

    ipcMain.handle('multi-tenant:fetch-companies', async (event) => {
      try {
        const companies = await this.multiTenantManager.fetchAvailableCompanies();
        
        if (companies.length > 0 && this.mainWindow) {
          this.mainWindow.webContents.send('multi-tenant:companies-loaded', companies);
        }
        
        return companies;
      } catch (error) {
        this.logger.error('[IPC] Fetch companies error:', error);
        return [];
      }
    });

    ipcMain.handle('multi-tenant:fetch-branches', async (event, companyId: string) => {
      try {
        const branches = await this.multiTenantManager.fetchBranchesForCompany(companyId);
        
        if (branches.length > 0 && this.mainWindow) {
          this.mainWindow.webContents.send('multi-tenant:branches-loaded', branches);
        }
        
        return branches;
      } catch (error) {
        this.logger.error('[IPC] Fetch branches error:', error);
        return [];
      }
    });

    ipcMain.handle('multi-tenant:switch-tenant', async (event, companyId: string, branchId: string) => {
      try {
        const success = await this.multiTenantManager.switchTenant(companyId, branchId);
        
        if (success && this.mainWindow) {
          const tenantInfo = this.multiTenantManager.getTenantInfo();
          this.mainWindow.webContents.send('multi-tenant:switched', tenantInfo);
        }
        
        return success;
      } catch (error) {
        this.logger.error('[IPC] Switch tenant error:', error);
        return false;
      }
    });

    ipcMain.handle('multi-tenant:logout', async (event) => {
      try {
        await this.multiTenantManager.logout();
        
        if (this.mainWindow) {
          this.mainWindow.webContents.send('multi-tenant:logout');
        }
        
        return true;
      } catch (error) {
        this.logger.error('[IPC] Logout error:', error);
        return false;
      }
    });

    // ================================
    // Printer Management Handlers
    // ================================
    
    ipcMain.handle('printer:get-discovered', async (event) => {
      try {
        // This would integrate with printer discovery service
        // For now, return empty array
        return [];
      } catch (error) {
        this.logger.error('[IPC] Get discovered printers error:', error);
        return [];
      }
    });

    ipcMain.handle('printer:start-discovery', async (event) => {
      try {
        this.logger.info('[IPC] Starting printer discovery');
        // This would start printer discovery process
        // For now, just log
        return true;
      } catch (error) {
        this.logger.error('[IPC] Start printer discovery error:', error);
        return false;
      }
    });

    ipcMain.handle('printer:test', async (event, printerId: string) => {
      try {
        this.logger.info(`[IPC] Testing printer: ${printerId}`);
        // This would test the specific printer
        // For now, return mock result
        return { success: true, message: 'Printer test completed' };
      } catch (error) {
        this.logger.error('[IPC] Test printer error:', error);
        return { success: false, error: error.message };
      }
    });

    // ================================
    // Configuration Handlers
    // ================================
    
    ipcMain.handle('config:get', async (event) => {
      try {
        return this.configManager.getAllConfig();
      } catch (error) {
        this.logger.error('[IPC] Get config error:', error);
        return {};
      }
    });

    ipcMain.handle('config:update', async (event, updates: Record<string, any>) => {
      try {
        Object.entries(updates).forEach(([key, value]) => {
          this.configManager.set(key, value);
        });
        return true;
      } catch (error) {
        this.logger.error('[IPC] Update config error:', error);
        return false;
      }
    });

    // ================================
    // System Handlers
    // ================================
    
    ipcMain.handle('system:health', async (event) => {
      try {
        return {
          status: 'healthy',
          multiTenant: this.multiTenantManager.isAuthenticated(),
          timestamp: new Date().toISOString()
        };
      } catch (error) {
        this.logger.error('[IPC] Get health status error:', error);
        return { status: 'error', error: error.message };
      }
    });

    ipcMain.handle('system:metrics', async (event) => {
      try {
        const os = require('os');
        return {
          deviceId: 'device-id-placeholder',
          platform: os.platform(),
          arch: os.arch(),
          memory: {
            total: os.totalmem(),
            free: os.freemem()
          },
          cpu: os.cpus()[0]?.model || 'Unknown',
          hostname: os.hostname()
        };
      } catch (error) {
        this.logger.error('[IPC] Get system metrics error:', error);
        return { error: error.message };
      }
    });

    // ================================
    // Window Management Handlers
    // ================================
    
    ipcMain.handle('window:minimize', async (event) => {
      if (this.mainWindow) {
        this.mainWindow.minimize();
      }
      return true;
    });

    ipcMain.handle('window:maximize', async (event) => {
      if (this.mainWindow) {
        if (this.mainWindow.isMaximized()) {
          this.mainWindow.unmaximize();
        } else {
          this.mainWindow.maximize();
        }
      }
      return true;
    });

    ipcMain.handle('window:close', async (event) => {
      if (this.mainWindow) {
        this.mainWindow.close();
      }
      return true;
    });

    // ================================
    // Application Handlers
    // ================================
    
    ipcMain.handle('app:restart', async (event) => {
      const { app } = require('electron');
      app.relaunch();
      app.exit(0);
      return true;
    });

    ipcMain.handle('app:quit', async (event) => {
      const { app } = require('electron');
      app.quit();
      return true;
    });

    ipcMain.handle('app:version', async (event) => {
      const { app } = require('electron');
      return {
        version: app.getVersion(),
        name: app.getName(),
        electron: process.versions.electron,
        node: process.versions.node
      };
    });

    // ================================
    // Legacy Handlers (for backward compatibility)
    // ================================
    
    ipcMain.handle('license:validate', async (event, licenseKey: string) => {
      // Delegate to multi-tenant authentication
      return this.multiTenantManager.authenticateWithLicense(licenseKey);
    });

    ipcMain.handle('license:get', async (event) => {
      const tenant = this.multiTenantManager.getCurrentTenant();
      if (tenant) {
        return {
          licenseKey: tenant.licenseKey,
          isValid: tenant.isActivated,
          features: tenant.features,
          maxPrinters: tenant.maxPrinters
        };
      }
      return null;
    });

    ipcMain.handle('discoverPrinters', async (event) => {
      // Legacy printer discovery
      return [];
    });

    ipcMain.handle('testPrinter', async (event, printerId: string) => {
      // Legacy printer test
      return { success: true, message: 'Test completed' };
    });

    ipcMain.handle('printers:list', async (event) => {
      // Legacy printer list
      return [];
    });

    this.logger.info('[IPC] All handlers registered successfully');
  }

  private setupEventForwarding(): void {
    // Forward MultiTenantManager events to renderer
    this.multiTenantManager.on('tenant-authenticated', (data) => {
      if (this.mainWindow) {
        this.mainWindow.webContents.send('multi-tenant:authenticated', data);
      }
    });

    this.multiTenantManager.on('tenant-switched', (data) => {
      if (this.mainWindow) {
        this.mainWindow.webContents.send('multi-tenant:switched', data);
      }
    });

    this.multiTenantManager.on('companies-loaded', (companies) => {
      if (this.mainWindow) {
        this.mainWindow.webContents.send('multi-tenant:companies-loaded', companies);
      }
    });

    this.multiTenantManager.on('branches-loaded', (branches) => {
      if (this.mainWindow) {
        this.mainWindow.webContents.send('multi-tenant:branches-loaded', branches);
      }
    });

    this.multiTenantManager.on('tenant-logout', () => {
      if (this.mainWindow) {
        this.mainWindow.webContents.send('multi-tenant:logout');
      }
    });

    this.logger.info('[IPC] Event forwarding setup completed');
  }

  destroy(): void {
    // Remove all IPC handlers
    ipcMain.removeAllListeners();
    this.logger.info('[IPC] All handlers destroyed');
  }
}