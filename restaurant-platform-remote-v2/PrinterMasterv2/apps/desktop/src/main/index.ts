import { app, BrowserWindow, ipcMain, shell, Menu, Tray, nativeImage, dialog } from 'electron';
import { join } from 'path';
import { autoUpdater } from 'electron-updater';
import log from 'electron-log';
import AutoLaunch from 'auto-launch';
import { LicenseManager } from './services/license-manager';
import { PrinterManager } from './services/printer-manager';
import { QZTrayService } from './services/qz-tray-service';
import { HealthMonitor } from './services/health-monitor';
import { ConfigManager } from './services/config-manager';
import { APIService } from './services/api-service';
import { LogService } from './services/log-service';
import { SecurityManager } from './services/security-manager';
import { PrinterRegistrationService } from './services/printer-registration.service';
import { AdvancedDiscoveryService } from './services/advanced-discovery-service';
import { NetworkDiscoveryService } from './services/network-discovery-service';
import { EnhancedAutoRegistrationService } from './services/enhanced-auto-registration.service';
import { AppConfig, IPCMessage, IPCResponse } from '../types';

// Configure logging
log.transports.file.level = 'info';
log.transports.console.level = 'debug';

// Global references
let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let isQuitting = false;

// Services
const configManager = new ConfigManager();
const apiService = new APIService();
const licenseManager = new LicenseManager(apiService);
const logService = new LogService();
const securityManager = new SecurityManager();
const qzTrayService = new QZTrayService();
const networkDiscoveryService = new NetworkDiscoveryService();
const advancedDiscoveryService = new AdvancedDiscoveryService(qzTrayService, apiService, networkDiscoveryService);
const enhancedAutoRegistrationService = new EnhancedAutoRegistrationService(advancedDiscoveryService, apiService);
const printerRegistrationService = new PrinterRegistrationService(qzTrayService, apiService);
const printerManager = new PrinterManager(qzTrayService, apiService);
const healthMonitor = new HealthMonitor(qzTrayService, apiService, printerManager);

// Auto launcher setup
const autoLauncher = new AutoLaunch({
  name: 'RestaurantPrint Pro',
  path: app.getPath('exe'),
});

class RestaurantPrintProApp {
  private isDevelopment = process.env.NODE_ENV === 'development';
  private windowConfig = {
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
  };

  constructor() {
    this.initializeApp();
  }

  private async initializeApp(): Promise<void> {
    try {
      // Security setup
      await securityManager.initialize();
      
      // Set security policies
      app.setAsDefaultProtocolClient('restaurant-print-pro');
      
      // Handle app events
      this.setupAppEvents();
      
      // Setup IPC handlers
      this.setupIPCHandlers();
      
      // Setup auto-updater
      this.setupAutoUpdater();
      
      log.info('RestaurantPrint Pro initialized successfully');
    } catch (error) {
      log.error('Failed to initialize app:', error);
      app.quit();
    }
  }

  private setupAppEvents(): void {
    app.whenReady().then(() => {
      this.createMainWindow();
      this.createTray();
      this.startServices();
      
      app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
          this.createMainWindow();
        }
      });
    });

    app.on('before-quit', () => {
      isQuitting = true;
    });

    app.on('window-all-closed', () => {
      if (process.platform !== 'darwin') {
        this.shutdown();
      }
    });

    app.on('web-contents-created', (_, contents) => {
      contents.setWindowOpenHandler(({ url }) => {
        shell.openExternal(url);
        return { action: 'deny' };
      });
    });

    // Handle protocol for deep linking
    app.on('open-url', (event, url) => {
      event.preventDefault();
      this.handleDeepLink(url);
    });
  }

  private createMainWindow(): void {
    mainWindow = new BrowserWindow({
      ...this.windowConfig,
      show: false,
      icon: this.getAppIcon(),
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: join(__dirname, '../preload/index.js'),
        webSecurity: true,
        allowRunningInsecureContent: false,
      },
      titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
      autoHideMenuBar: true,
    });

    // Load the app
    const isDev = process.env.NODE_ENV === 'development';
    if (isDev) {
      mainWindow.loadURL('http://localhost:3002');
      mainWindow.webContents.openDevTools();
    } else {
      mainWindow.loadFile(join(__dirname, '../next-app/index.html'));
    }

    // Window event handlers
    mainWindow.once('ready-to-show', () => {
      mainWindow?.show();
      
      if (this.isDevelopment) {
        mainWindow?.webContents.openDevTools();
      }
    });

    mainWindow.on('close', (event) => {
      if (!isQuitting && process.platform === 'darwin') {
        event.preventDefault();
        mainWindow?.hide();
      }
    });

    mainWindow.on('closed', () => {
      mainWindow = null;
    });

    // Handle external links
    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
      shell.openExternal(url);
      return { action: 'deny' };
    });
  }

  private createTray(): void {
    const trayIcon = this.getAppIcon();
    tray = new Tray(trayIcon);

    const contextMenu = Menu.buildFromTemplate([
      {
        label: 'Show RestaurantPrint Pro',
        click: () => {
          this.showMainWindow();
        }
      },
      { type: 'separator' },
      {
        label: 'Printer Status',
        submenu: [
          {
            label: 'Refresh Printers',
            click: () => printerManager.discoverPrinters()
          },
          {
            label: 'Test All Printers',
            click: () => printerManager.testAllPrinters()
          }
        ]
      },
      {
        label: 'Settings',
        click: () => {
          this.showMainWindow();
          this.sendToRenderer('navigate', '/settings');
        }
      },
      { type: 'separator' },
      {
        label: 'Check for Updates',
        click: () => autoUpdater.checkForUpdatesAndNotify()
      },
      {
        label: 'View Logs',
        click: () => {
          this.showMainWindow();
          this.sendToRenderer('navigate', '/logs');
        }
      },
      { type: 'separator' },
      {
        label: 'Quit',
        click: () => {
          isQuitting = true;
          app.quit();
        }
      }
    ]);

    tray.setContextMenu(contextMenu);
    tray.setToolTip('RestaurantPrint Pro - Enterprise Printer Management');

    tray.on('click', () => {
      this.showMainWindow();
    });

    tray.on('double-click', () => {
      this.showMainWindow();
    });
  }

  private showMainWindow(): void {
    if (mainWindow) {
      if (mainWindow.isMinimized()) {
        mainWindow.restore();
      }
      mainWindow.show();
      mainWindow.focus();
    } else {
      this.createMainWindow();
    }
  }

  private getAppIcon(): Electron.NativeImage {
    const iconPath = this.isDevelopment
      ? join(__dirname, '../../resources/icon.png')
      : join(process.resourcesPath, 'icon.png');
    
    return nativeImage.createFromPath(iconPath);
  }

  private async startServices(): Promise<void> {
    try {
      // Initialize services in order
      await configManager.initialize();
      await logService.initialize();
      
      // Start core services
      await apiService.initialize();
      await qzTrayService.initialize();
      await licenseManager.initialize();
      
      // Initialize advanced discovery services
      await networkDiscoveryService.initialize();
      await advancedDiscoveryService.initialize();
      await enhancedAutoRegistrationService.initialize();
      
      // Initialize printer registration service
      const license = await licenseManager.getCurrentLicense();
      if (license && license.branchId) {
        await printerRegistrationService.initialize(license.branchId);
      }
      
      // Start monitoring services
      await printerManager.initialize();
      await healthMonitor.initialize();
      
      // Setup auto-start if configured
      const config = await configManager.getConfig();
      if (config.autoStart) {
        await this.enableAutoStart();
      }
      
      log.info('All services started successfully');
    } catch (error) {
      log.error('Failed to start services:', error);
      this.showError('Service Initialization Failed', error.message);
    }
  }

  private setupIPCHandlers(): void {
    // License management
    ipcMain.handle('license:validate', async (_, licenseKey: string) => {
      try {
        const result = await licenseManager.validateLicense(licenseKey);
        return this.createIPCResponse(true, result);
      } catch (error: any) {
        return this.createIPCResponse(false, null, error?.message || 'Unknown error');
      }
    });

    ipcMain.handle('license:get', async () => {
      try {
        const license = await licenseManager.getCurrentLicense();
        return this.createIPCResponse(true, license);
      } catch (error: any) {
        return this.createIPCResponse(false, null, error?.message || 'Unknown error');
      }
    });

    // Configuration management
    ipcMain.handle('config:get', async () => {
      try {
        const config = await configManager.getConfig();
        return this.createIPCResponse(true, config);
      } catch (error: any) {
        return this.createIPCResponse(false, null, error?.message || 'Unknown error');
      }
    });

    ipcMain.handle('config:update', async (_, updates: Partial<AppConfig>) => {
      try {
        const config = await configManager.updateConfig(updates);
        return this.createIPCResponse(true, config);
      } catch (error: any) {
        return this.createIPCResponse(false, null, error?.message || 'Unknown error');
      }
    });

    // Printer management
    ipcMain.handle('printers:discover', async () => {
      try {
        const printers = await printerManager.discoverPrinters();
        return this.createIPCResponse(true, printers);
      } catch (error: any) {
        return this.createIPCResponse(false, null, error?.message || 'Unknown error');
      }
    });

    ipcMain.handle('printers:list', async () => {
      try {
        const printers = await printerManager.getPrinters();
        return this.createIPCResponse(true, printers);
      } catch (error: any) {
        return this.createIPCResponse(false, null, error?.message || 'Unknown error');
      }
    });

    ipcMain.handle('printer:test', async (_, printerId: string) => {
      try {
        const result = await printerManager.testPrinter(printerId);
        return this.createIPCResponse(true, result);
      } catch (error: any) {
        return this.createIPCResponse(false, null, error?.message || 'Unknown error');
      }
    });

    ipcMain.handle('printer:status', async (_, printerId: string) => {
      try {
        const status = await printerManager.getPrinterStatus(printerId);
        return this.createIPCResponse(true, status);
      } catch (error: any) {
        return this.createIPCResponse(false, null, error?.message || 'Unknown error');
      }
    });

    // Printer auto-registration
    ipcMain.handle('printers:auto-register', async () => {
      try {
        const result = await printerRegistrationService.performRegistration(false);
        return this.createIPCResponse(true, result);
      } catch (error: any) {
        return this.createIPCResponse(false, null, error?.message || 'Unknown error');
      }
    });

    ipcMain.handle('printers:force-register', async () => {
      try {
        const result = await printerRegistrationService.performRegistration(true);
        return this.createIPCResponse(true, result);
      } catch (error: any) {
        return this.createIPCResponse(false, null, error?.message || 'Unknown error');
      }
    });

    ipcMain.handle('printers:discover-usb', async () => {
      try {
        const usbPrinters = await printerRegistrationService.discoverUSBPrinters();
        return this.createIPCResponse(true, usbPrinters);
      } catch (error: any) {
        return this.createIPCResponse(false, null, error?.message || 'Unknown error');
      }
    });

    ipcMain.handle('printer:detect-capabilities', async (_, printerName: string) => {
      try {
        const capabilities = await printerRegistrationService.detectAndStorePrinterCapabilities(printerName);
        return this.createIPCResponse(true, capabilities);
      } catch (error: any) {
        return this.createIPCResponse(false, null, error?.message || 'Unknown error');
      }
    });

    ipcMain.handle('registration:get-status', async () => {
      try {
        const status = {
          autoRegistrationEnabled: printerRegistrationService.isAutoRegistrationEnabled(),
          lastRegistration: printerRegistrationService.getLastRegistration(),
          branchId: printerRegistrationService.getBranchId(),
          deviceId: printerRegistrationService.getDeviceId()
        };
        return this.createIPCResponse(true, status);
      } catch (error: any) {
        return this.createIPCResponse(false, null, error?.message || 'Unknown error');
      }
    });

    ipcMain.handle('registration:toggle-auto', async (_, enabled: boolean) => {
      try {
        printerRegistrationService.setAutoRegistrationEnabled(enabled);
        return this.createIPCResponse(true, { enabled });
      } catch (error: any) {
        return this.createIPCResponse(false, null, error?.message || 'Unknown error');
      }
    });

    // Advanced Discovery Service
    ipcMain.handle('discovery:advanced-scan', async (_, options) => {
      try {
        const result = await advancedDiscoveryService.performAdvancedDiscovery(options);
        return this.createIPCResponse(true, result);
      } catch (error: any) {
        return this.createIPCResponse(false, null, error?.message || 'Unknown error');
      }
    });

    ipcMain.handle('discovery:get-status', async () => {
      try {
        const status = await advancedDiscoveryService.getDiscoveryStatus();
        return this.createIPCResponse(true, status);
      } catch (error: any) {
        return this.createIPCResponse(false, null, error?.message || 'Unknown error');
      }
    });

    ipcMain.handle('discovery:clear-cache', async () => {
      try {
        await advancedDiscoveryService.clearCache();
        return this.createIPCResponse(true, null);
      } catch (error: any) {
        return this.createIPCResponse(false, null, error?.message || 'Unknown error');
      }
    });

    ipcMain.handle('discovery:get-compatibility-matrix', async () => {
      try {
        const matrix = advancedDiscoveryService.getCompatibilityMatrix();
        const matrixArray = Array.from(matrix.entries()).map(([key, value]) => ({ key, value }));
        return this.createIPCResponse(true, matrixArray);
      } catch (error: any) {
        return this.createIPCResponse(false, null, error?.message || 'Unknown error');
      }
    });

    // Enhanced Auto-Registration Service
    ipcMain.handle('auto-registration:register-with-workflow', async (_, printers, workflowId, options) => {
      try {
        const batch = await enhancedAutoRegistrationService.registerPrintersWithWorkflow(printers, workflowId, options);
        return this.createIPCResponse(true, batch);
      } catch (error: any) {
        return this.createIPCResponse(false, null, error?.message || 'Unknown error');
      }
    });

    ipcMain.handle('auto-registration:get-batch-status', async (_, batchId) => {
      try {
        const batch = await enhancedAutoRegistrationService.getBatchStatus(batchId);
        return this.createIPCResponse(true, batch);
      } catch (error: any) {
        return this.createIPCResponse(false, null, error?.message || 'Unknown error');
      }
    });

    ipcMain.handle('auto-registration:get-workflows', async () => {
      try {
        const workflows = await enhancedAutoRegistrationService.getWorkflows();
        return this.createIPCResponse(true, workflows);
      } catch (error: any) {
        return this.createIPCResponse(false, null, error?.message || 'Unknown error');
      }
    });

    ipcMain.handle('auto-registration:get-statistics', async () => {
      try {
        const stats = await enhancedAutoRegistrationService.getStatistics();
        return this.createIPCResponse(true, stats);
      } catch (error: any) {
        return this.createIPCResponse(false, null, error?.message || 'Unknown error');
      }
    });

    ipcMain.handle('auto-registration:get-history', async (_, limit) => {
      try {
        const history = await enhancedAutoRegistrationService.getRegistrationHistory(limit);
        return this.createIPCResponse(true, history);
      } catch (error: any) {
        return this.createIPCResponse(false, null, error?.message || 'Unknown error');
      }
    });

    ipcMain.handle('auto-registration:rollback-batch', async (_, batchId, checkpointId) => {
      try {
        const success = await enhancedAutoRegistrationService.rollbackBatch(batchId, checkpointId);
        return this.createIPCResponse(true, { success });
      } catch (error: any) {
        return this.createIPCResponse(false, null, error?.message || 'Unknown error');
      }
    });

    // Network Discovery Service
    ipcMain.handle('network:scan-printers', async (_, config) => {
      try {
        const printers = await networkDiscoveryService.scanNetwork(config);
        return this.createIPCResponse(true, printers);
      } catch (error: any) {
        return this.createIPCResponse(false, null, error?.message || 'Unknown error');
      }
    });

    ipcMain.handle('network:discover-devices', async (_, config) => {
      try {
        const devices = await networkDiscoveryService.discoverDevices(config);
        return this.createIPCResponse(true, devices);
      } catch (error: any) {
        return this.createIPCResponse(false, null, error?.message || 'Unknown error');
      }
    });

    ipcMain.handle('network:validate-printer', async (_, ip, port, timeout) => {
      try {
        const isValid = await networkDiscoveryService.validatePrinter(ip, port, timeout);
        return this.createIPCResponse(true, { isValid });
      } catch (error: any) {
        return this.createIPCResponse(false, null, error?.message || 'Unknown error');
      }
    });

    ipcMain.handle('network:get-cached-devices', async () => {
      try {
        const devices = networkDiscoveryService.getCachedDevices();
        return this.createIPCResponse(true, devices);
      } catch (error: any) {
        return this.createIPCResponse(false, null, error?.message || 'Unknown error');
      }
    });

    // QZ Tray management
    ipcMain.handle('qz-tray:status', async () => {
      try {
        const status = await qzTrayService.getStatus();
        return this.createIPCResponse(true, status);
      } catch (error: any) {
        return this.createIPCResponse(false, null, error?.message || 'Unknown error');
      }
    });

    ipcMain.handle('qz-tray:connect', async () => {
      try {
        await qzTrayService.connect();
        return this.createIPCResponse(true, null);
      } catch (error: any) {
        return this.createIPCResponse(false, null, error?.message || 'Unknown error');
      }
    });

    // System management
    ipcMain.handle('system:metrics', async () => {
      try {
        const metrics = await healthMonitor.getSystemMetrics();
        return this.createIPCResponse(true, metrics);
      } catch (error: any) {
        return this.createIPCResponse(false, null, error?.message || 'Unknown error');
      }
    });

    ipcMain.handle('system:health', async () => {
      try {
        const health = await healthMonitor.checkHealth();
        return this.createIPCResponse(true, health);
      } catch (error: any) {
        return this.createIPCResponse(false, null, error?.message || 'Unknown error');
      }
    });

    // Auto-start management
    ipcMain.handle('autostart:enable', async () => {
      try {
        await this.enableAutoStart();
        return this.createIPCResponse(true, null);
      } catch (error: any) {
        return this.createIPCResponse(false, null, error?.message || 'Unknown error');
      }
    });

    ipcMain.handle('autostart:disable', async () => {
      try {
        await this.disableAutoStart();
        return this.createIPCResponse(true, null);
      } catch (error: any) {
        return this.createIPCResponse(false, null, error?.message || 'Unknown error');
      }
    });

    // Application management
    ipcMain.handle('app:version', () => {
      return this.createIPCResponse(true, app.getVersion());
    });

    ipcMain.handle('app:restart', () => {
      app.relaunch();
      app.exit();
    });

    ipcMain.handle('app:quit', () => {
      isQuitting = true;
      app.quit();
    });

    // Window management
    ipcMain.handle('window:minimize', () => {
      mainWindow?.minimize();
    });

    ipcMain.handle('window:close', () => {
      if (process.platform === 'darwin') {
        mainWindow?.hide();
      } else {
        mainWindow?.close();
      }
    });

    // File operations
    ipcMain.handle('dialog:open-file', async (_, options) => {
      const result = await dialog.showOpenDialog(mainWindow!, options);
      return this.createIPCResponse(true, result);
    });

    ipcMain.handle('dialog:save-file', async (_, options) => {
      const result = await dialog.showSaveDialog(mainWindow!, options);
      return this.createIPCResponse(true, result);
    });
  }

  private setupAutoUpdater(): void {
    autoUpdater.checkForUpdatesAndNotify();

    autoUpdater.on('checking-for-update', () => {
      log.info('Checking for update...');
    });

    autoUpdater.on('update-available', (info) => {
      log.info('Update available:', info);
      this.sendToRenderer('update:available', info);
    });

    autoUpdater.on('update-not-available', (info) => {
      log.info('Update not available:', info);
    });

    autoUpdater.on('error', (err) => {
      log.error('Error in auto-updater:', err);
    });

    autoUpdater.on('download-progress', (progressObj) => {
      log.info('Download progress:', progressObj);
      this.sendToRenderer('update:progress', progressObj);
    });

    autoUpdater.on('update-downloaded', (info) => {
      log.info('Update downloaded:', info);
      this.sendToRenderer('update:downloaded', info);
    });

    // Check for updates every 4 hours
    setInterval(() => {
      autoUpdater.checkForUpdatesAndNotify();
    }, 4 * 60 * 60 * 1000);
  }

  private async enableAutoStart(): Promise<void> {
    try {
      const isEnabled = await autoLauncher.isEnabled();
      if (!isEnabled) {
        await autoLauncher.enable();
        log.info('Auto-start enabled');
      }
    } catch (error) {
      log.error('Failed to enable auto-start:', error);
      throw error;
    }
  }

  private async disableAutoStart(): Promise<void> {
    try {
      const isEnabled = await autoLauncher.isEnabled();
      if (isEnabled) {
        await autoLauncher.disable();
        log.info('Auto-start disabled');
      }
    } catch (error) {
      log.error('Failed to disable auto-start:', error);
      throw error;
    }
  }

  private handleDeepLink(url: string): void {
    log.info('Handling deep link:', url);
    
    try {
      const parsed = new URL(url);
      const action = parsed.pathname.replace('/', '');
      const params = Object.fromEntries(parsed.searchParams);
      
      this.showMainWindow();
      this.sendToRenderer('deep-link', { action, params });
    } catch (error) {
      log.error('Failed to handle deep link:', error);
    }
  }

  private sendToRenderer(channel: string, data?: any): void {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send(channel, data);
    }
  }

  private createIPCResponse<T>(success: boolean, data?: T, error?: string): IPCResponse<T> {
    return {
      success,
      data,
      error,
      timestamp: Date.now(),
    };
  }

  private showError(title: string, message: string): void {
    dialog.showErrorBox(title, message);
  }

  private async shutdown(): Promise<void> {
    log.info('Shutting down application...');
    
    try {
      // Stop services gracefully
      await healthMonitor.shutdown();
      await printerManager.shutdown();
      await printerRegistrationService.shutdown();
      await enhancedAutoRegistrationService.shutdown();
      await advancedDiscoveryService.shutdown();
      await networkDiscoveryService.shutdown();
      await qzTrayService.shutdown();
      await apiService.shutdown();
      await logService.shutdown();
      
      log.info('Application shutdown complete');
    } catch (error) {
      log.error('Error during shutdown:', error);
    }
    
    app.quit();
  }
}

// Create and start the application
new RestaurantPrintProApp();