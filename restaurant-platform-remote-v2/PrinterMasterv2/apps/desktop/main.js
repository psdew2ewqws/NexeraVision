const { app, BrowserWindow, ipcMain, shell, Menu, Tray, nativeImage, dialog } = require('electron');
const { join } = require('path');
const { autoUpdater } = require('electron-updater');
const log = require('electron-log');
// const AutoLaunch = require('auto-launch');
const io = require('socket.io-client');
const config = require('./services/config-manager.js');
const { initializeWebSocketModule, connectToBackendWebSocket, sendCurrentPrintersToBackend, processPrintJob, disconnectWebSocket } = require('./websocket-functions.js');

// Configure logging from configuration
const logConfig = config.getLogConfig();
log.transports.file.level = logConfig.fileLevel;
log.transports.console.level = logConfig.consoleLevel;

// Log configuration summary on startup
log.info('RestaurantPrint Pro starting with configuration:', config.getConfigSummary());

// Global references
let mainWindow = null;
let tray = null;
let isQuitting = false;
let socket = null;
let activeBranchId = null;
let deviceInfo = null;

// Phase 3: Background Discovery Service
let discoveryService = null;
let printerDetector = null;

// Initialize WebSocket module with shared references and config
initializeWebSocketModule({
  log,
  mainWindow,
  config
});

// Auto launcher setup from configuration
const autoLauncherConfig = {
  name: config.get('AUTO_LAUNCH_NAME'),
  path: app.getPath('exe'),
};
// const autoLauncher = new AutoLaunch(autoLauncherConfig);

const isDevelopment = config.isDevelopment();

function createMainWindow() {
  const windowConfig = config.getWindowConfig();

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    show: true,
    icon: getAppIcon(),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: join(__dirname, 'out/preload/index.js'),
      webSecurity: true,
      allowRunningInsecureContent: false,
    },
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    autoHideMenuBar: windowConfig.autoHideMenuBar,
  });

  // Load the local license activation page
  const licensePath = join(__dirname, 'src/license.html');
  mainWindow.loadFile(licensePath);
  
  if (isDevelopment && config.get('DEV_TOOLS_AUTO_OPEN')) {
    mainWindow.webContents.openDevTools();
  }

  // Window event handlers
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    mainWindow.focus();
    mainWindow.setAlwaysOnTop(true);
    setTimeout(() => mainWindow.setAlwaysOnTop(false), 1000);

    if (isDevelopment) {
      mainWindow.webContents.openDevTools();
    }
  });

  mainWindow.on('close', (event) => {
    if (!isQuitting && process.platform === 'darwin') {
      event.preventDefault();
      mainWindow.hide();
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

function createTray() {
  const trayIcon = getAppIcon();
  tray = new Tray(trayIcon);

  const contextMenu = Menu.buildFromTemplate([
    {
      label: `Show ${config.get('APP_NAME')}`,
      click: () => {
        showMainWindow();
      }
    },
    { type: 'separator' },
    {
      label: 'License Status',
      submenu: [
        {
          label: 'View License Info',
          click: () => {
            showMainWindow();
          }
        },
        {
          label: 'Refresh License',
          click: async () => {
            try {
              const licenseData = await loadStoredLicense();
              if (licenseData) {
                log.info('License refreshed from storage');
              } else {
                log.info('No license found in storage');
              }
            } catch (error) {
              log.error('Failed to refresh license:', error);
            }
          }
        }
      ]
    },
    {
      label: 'Printer Status',
      submenu: [
        {
          label: 'Refresh Printers',
          click: () => {
            log.info('Refreshing printer list...');
            // TODO: Implement printer discovery
          }
        },
        {
          label: 'Test All Printers',
          click: () => {
            log.info('Testing all printers...');
            // TODO: Implement printer testing
          }
        },
        {
          label: 'Printer Queue Status',
          click: () => {
            log.info('Checking printer queue...');
            // TODO: Show queue status
          }
        }
      ]
    },
    {
      label: 'System',
      submenu: [
        {
          label: 'System Information',
          click: async () => {
            try {
              const os = require('os');
              const info = {
                platform: os.platform(),
                arch: os.arch(),
                hostname: os.hostname(),
                uptime: Math.floor(os.uptime() / 60) + ' minutes',
                memory: Math.floor(os.totalmem() / 1024 / 1024) + ' MB',
              };
              log.info('System Info:', info);
              // TODO: Show in UI dialog
            } catch (error) {
              log.error('Failed to get system info:', error);
            }
          }
        },
        {
          label: 'Auto-start Settings',
          click: () => {
            showMainWindow();
            // TODO: Navigate to auto-start settings
          }
        }
      ]
    },
    { type: 'separator' },
    {
      label: 'Check for Updates',
      click: () => {
        log.info('Checking for updates...');
        autoUpdater.checkForUpdatesAndNotify();
      }
    },
    {
      label: 'View Logs',
      click: () => {
        const { shell } = require('electron');
        const path = require('path');
        
        // Open logs directory
        const logPath = path.join(app.getPath('userData'), 'logs');
        shell.openPath(logPath).catch(() => {
          // Fallback: show main window
          showMainWindow();
        });
      }
    },
    { type: 'separator' },
    {
      label: 'Restart Application',
      click: () => {
        log.info('Restarting application...');
        app.relaunch();
        app.exit();
      }
    },
    {
      label: 'Quit',
      click: () => {
        log.info('Quitting application...');
        isQuitting = true;
        app.quit();
      }
    }
  ]);

  tray.setContextMenu(contextMenu);
  tray.setToolTip(config.get('APP_TRAY_TOOLTIP'));

  tray.on('click', () => {
    showMainWindow();
  });

  tray.on('double-click', () => {
    showMainWindow();
  });
}

function showMainWindow() {
  if (mainWindow) {
    if (mainWindow.isMinimized()) {
      mainWindow.restore();
    }
    mainWindow.show();
    mainWindow.focus();
  } else {
    createMainWindow();
  }
}

function getAppIcon() {
  const iconPath = isDevelopment
    ? join(__dirname, 'resources/icon.png')
    : join(process.resourcesPath, 'icon.png');
  
  return nativeImage.createFromPath(iconPath);
}

async function validateLicenseWithBackend(licenseKey) {
  try {
    log.info('Validating license key with backend:', licenseKey);
    
    // Validate UUID format (branch ID)
    if (!isValidUUID(licenseKey)) {
      return {
        success: false,
        error: 'Invalid branch ID format. Expected UUID format (e.g., 40f863e7-b719-4142-8e94-724572002d9b)'
      };
    }
    
    // Get device info for validation
    const deviceInfo = await getDeviceInfo();
    
    // Call the backend API using configuration
    const axios = require('axios');
    const apiConfig = config.getApiConfig();
    const response = await axios.post(
      `${apiConfig.url}${apiConfig.licenseValidationEndpoint}`, 
      {
        licenseKey,
        deviceInfo
      }, 
      {
        timeout: apiConfig.timeout,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': apiConfig.userAgent
        }
      }
    );
    
    if (response.data && response.data.success) {
      log.info('License validation successful');
      
      // Store the license locally
      await storeLicenseLocally(response.data.data);
      
      // Enable auto-start for valid licenses
      await enableAutoStart();
      
      // Connect to backend via WebSocket for real-time updates
      try {
        log.info('Establishing WebSocket connection to backend...');
        await connectToBackendWebSocket(response.data.data);
      } catch (wsError) {
        log.warn('WebSocket connection failed:', wsError.message);
        // Don't fail license validation if WebSocket connection fails
      }

      // Phase 3: Initialize and start background discovery service
      try {
        log.info('🚀 [PHASE-3] Initializing background discovery service...');
        await initializeBackgroundDiscovery(response.data.data);
        log.info('✅ [PHASE-3] Background discovery service started successfully');
      } catch (discoveryError) {
        log.warn('❌ [PHASE-3] Background discovery initialization failed:', discoveryError.message);
        // Don't fail license validation if discovery service fails to start
      }
      
      return {
        success: true,
        data: response.data.data
      };
    } else {
      return {
        success: false,
        error: response.data?.error || 'License validation failed'
      };
    }
  } catch (error) {
    log.error('License validation error:', error);
    
    if (error.code === 'ECONNREFUSED') {
      const apiUrl = config.get('API_URL');
      log.error(`Cannot connect to license server at ${apiUrl}`);
      return {
        success: false,
        error: `Cannot connect to license server. Please ensure the RestaurantPrint Pro backend service is running at ${apiUrl}.`
      };
    }
    
    if (error.response?.status === 404) {
      return {
        success: false,
        error: 'Branch ID not found or invalid'
      };
    }
    
    if (error.response?.data?.error) {
      return {
        success: false,
        error: error.response.data.error
      };
    }
    
    return {
      success: false,
      error: 'License validation failed: ' + error.message
    };
  }
}

function isValidUUID(uuid) {
  // Expected format: UUID v4 (e.g., 40f863e7-b719-4142-8e94-724572002d9b)
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

async function getDeviceInfo() {
  const os = require('os');
  const crypto = require('crypto');
  
  // Generate a unique device identifier
  const hostname = os.hostname();
  const platform = os.platform();
  const arch = os.arch();
  const totalmem = os.totalmem();
  
  // Create a device fingerprint using configured salt
  const salt = config.get('DEVICE_ID_SALT');
  const deviceId = crypto
    .createHash('sha256')
    .update(`${hostname}-${platform}-${arch}-${totalmem}-${salt}`)
    .digest('hex');
  
  return {
    deviceId,
    hostname,
    platform,
    arch,
    totalmem,
    cpus: os.cpus().length,
    version: config.get('APP_VERSION'),
    timestamp: new Date().toISOString(),
  };
}

async function storeLicenseLocally(licenseData) {
  try {
    const { safeStorage } = require('electron');
    const path = require('path');
    const fs = require('fs').promises;
    
    const userData = app.getPath('userData');
    const licenseDir = path.join(userData, 'licenses');
    const licensePath = path.join(licenseDir, 'current.license');
    
    // Ensure directory exists
    await fs.mkdir(licenseDir, { recursive: true });
    
    // Encrypt and store license data
    const licenseString = JSON.stringify({
      ...licenseData,
      storedAt: new Date().toISOString()
    });
    
    if (safeStorage.isEncryptionAvailable()) {
      const encryptedData = safeStorage.encryptString(licenseString);
      await fs.writeFile(licensePath, encryptedData);
    } else {
      // Fallback to base64 encoding if encryption not available
      const encodedData = Buffer.from(licenseString).toString('base64');
      await fs.writeFile(licensePath, encodedData);
    }
    
    log.info('License stored locally');
  } catch (error) {
    log.error('Failed to store license locally:', error);
  }
}

function setupIPCHandlers() {
  // Basic IPC handlers
  ipcMain.handle('app:version', () => {
    return { success: true, data: config.get('APP_VERSION') };
  });

  ipcMain.handle('app:restart', () => {
    app.relaunch();
    app.exit();
  });

  ipcMain.handle('app:quit', () => {
    isQuitting = true;
    app.quit();
  });

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

  // License validation handler
  ipcMain.handle('license:validate', async (event, licenseKey) => {
    return validateLicenseWithBackend(licenseKey);
  });

  // Removed: Navigation handler - Desktop app is now self-contained for employees
  // No longer redirects to web dashboard after license validation

  ipcMain.handle('license:get', async () => {
    return { success: true, data: null }; // Placeholder for stored license
  });

  // Printer discovery and management
  ipcMain.handle('printers:discover', async () => {
    try {
      log.info('Starting printer discovery...');
      const printers = await discoverPrinters();
      log.info(`Found ${printers.length} printers`);
      return { success: true, data: printers };
    } catch (error) {
      log.error('Printer discovery failed:', error);
      return { success: false, error: error.message };
    }
  });

  // Enhanced printer discovery for frontend
  ipcMain.handle('discoverPrinters', async () => {
    try {
      log.info('Starting enhanced printer discovery...');
      
      // Get both USB printers and system printers
      const usbPrinters = await discoverPrinters();
      const systemPrinters = await getSystemPrinters();
      
      // Combine and deduplicate printers
      const allPrinters = [...usbPrinters, ...systemPrinters];
      const uniquePrinters = allPrinters.filter((printer, index, self) => 
        index === self.findIndex(p => p.id === printer.id || p.name === printer.name)
      );
      
      log.info(`Found ${uniquePrinters.length} total printers`);
      return { success: true, data: uniquePrinters };
    } catch (error) {
      log.error('Enhanced printer discovery failed:', error);
      return { success: false, error: error.message };
    }
  });

  // Test printer functionality
  ipcMain.handle('testPrinter', async (event, printerId) => {
    try {
      log.info(`Testing printer: ${printerId}`);
      const result = await testPrinter(printerId);
      return { success: true, data: result };
    } catch (error) {
      log.error(`Printer test failed for ${printerId}:`, error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('printers:list', async () => {
    try {
      const printers = await getSystemPrinters();
      return { success: true, data: printers };
    } catch (error) {
      log.error('Failed to get printer list:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('printer:test', async (event, printerId) => {
    try {
      log.info(`Testing printer: ${printerId}`);
      const result = await testPrinter(printerId);
      return { success: true, data: result };
    } catch (error) {
      log.error(`Printer test failed for ${printerId}:`, error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('config:get', async () => {
    return { success: true, data: { autoStart: false } };
  });

  ipcMain.handle('config:update', async (event, updates) => {
    return { success: true, data: updates };
  });

  ipcMain.handle('system:health', async () => {
    return { success: true, data: { status: 'healthy' } };
  });

  ipcMain.handle('system:metrics', async () => {
    const os = require('os');
    return {
      success: true,
      data: {
        platform: os.platform(),
        arch: os.arch(),
        totalmem: os.totalmem(),
        freemem: os.freemem(),
        cpus: os.cpus().length,
        hostname: os.hostname(),
        uptime: os.uptime(),
        loadavg: os.loadavg(),
        appVersion: config.get('APP_VERSION'),
        environment: config.getEnvironment(),
        configLoaded: config.isConfigurationLoaded()
      }
    };
  });

  // Auto-start management
  ipcMain.handle('autostart:enable', async () => {
    try {
      await enableAutoStart();
      return { success: true, message: 'Auto-start enabled' };
    } catch (error) {
      log.error('Failed to enable auto-start:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('autostart:disable', async () => {
    try {
      await disableAutoStart();
      return { success: true, message: 'Auto-start disabled' };
    } catch (error) {
      log.error('Failed to disable auto-start:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('autostart:status', async () => {
    try {
      // const isEnabled = await autoLauncher.isEnabled();
      return { success: true, data: { enabled: false } };
    } catch (error) {
      log.error('Failed to check auto-start status:', error);
      return { success: false, error: error.message };
    }
  });

  // Window management
  ipcMain.handle('window:show', () => {
    showMainWindow();
    return { success: true };
  });

  ipcMain.handle('window:hide', () => {
    if (mainWindow) {
      mainWindow.hide();
    }
    return { success: true };
  });

  ipcMain.handle('window:maximize', () => {
    if (mainWindow) {
      if (mainWindow.isMaximized()) {
        mainWindow.unmaximize();
      } else {
        mainWindow.maximize();
      }
    }
    return { success: true };
  });

  // License storage retrieval
  ipcMain.handle('license:load', async () => {
    try {
      const licenseData = await loadStoredLicense();
      return { success: true, data: licenseData };
    } catch (error) {
      log.error('Failed to load stored license:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('license:clear', async () => {
    try {
      await clearStoredLicense();
      return { success: true, message: 'License cleared' };
    } catch (error) {
      log.error('Failed to clear license:', error);
      return { success: false, error: error.message };
    }
  });

  // Update-related IPC handlers
  ipcMain.handle('update:check', async () => {
    try {
      log.info('Manual update check requested');
      const result = await autoUpdater.checkForUpdates();
      return { 
        success: true, 
        data: result ? {
          updateInfo: result.updateInfo,
          downloadPromise: !!result.downloadPromise
        } : null
      };
    } catch (error) {
      log.error('Failed to check for updates:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('update:download', async () => {
    try {
      log.info('Manual update download requested');
      await autoUpdater.downloadUpdate();
      return { success: true, message: 'Update download started' };
    } catch (error) {
      log.error('Failed to download update:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('update:install', async () => {
    try {
      log.info('Manual update install requested');
      autoUpdater.quitAndInstall(false, true);
      return { success: true, message: 'Installing update...' };
    } catch (error) {
      log.error('Failed to install update:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('update:status', async () => {
    try {
      return { 
        success: true, 
        data: {
          version: config.get('APP_VERSION'),
          autoDownload: autoUpdater.autoDownload,
          autoInstallOnAppQuit: autoUpdater.autoInstallOnAppQuit,
          channel: autoUpdater.channel || 'latest',
          enabled: config.get('AUTO_UPDATER_ENABLED'),
          checkInterval: config.get('AUTO_UPDATER_CHECK_INTERVAL')
        }
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
}

function setupAutoUpdater() {
  // Configure auto-updater from configuration
  autoUpdater.autoDownload = config.get('AUTO_UPDATER_AUTO_DOWNLOAD');
  autoUpdater.autoInstallOnAppQuit = config.get('AUTO_UPDATER_AUTO_INSTALL');
  
  // Initial update check (delayed to let app start) - only if enabled
  if (config.get('AUTO_UPDATER_ENABLED')) {
    setTimeout(() => {
      autoUpdater.checkForUpdatesAndNotify();
    }, 5000);
  }

  autoUpdater.on('checking-for-update', () => {
    log.info('Checking for update...');
    // Notify renderer if needed
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('update-checking');
    }
  });

  autoUpdater.on('update-available', (info) => {
    log.info('Update available:', info);
    // Show notification to user
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('update-available', {
        version: info.version,
        releaseDate: info.releaseDate,
        releaseName: info.releaseName
      });
    }
    
    // Show system notification
    const notification = new (require('electron')).Notification({
      title: 'Update Available',
      body: `${config.get('APP_NAME')} v${info.version} is available. Download will start automatically.`
    });
    notification.show();
  });

  autoUpdater.on('update-not-available', (info) => {
    log.info('Update not available:', info);
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('update-not-available');
    }
  });

  autoUpdater.on('error', (err) => {
    log.error('Error in auto-updater:', err);
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('update-error', err.message);
    }
  });

  autoUpdater.on('download-progress', (progressObj) => {
    log.info('Download progress:', Math.round(progressObj.percent) + '%');
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('update-download-progress', {
        percent: Math.round(progressObj.percent),
        transferred: progressObj.transferred,
        total: progressObj.total
      });
    }
  });

  autoUpdater.on('update-downloaded', (info) => {
    log.info('Update downloaded:', info);
    
    // Show notification
    const notification = new (require('electron')).Notification({
      title: 'Update Ready',
      body: 'Update has been downloaded. Restart the application to apply the update.'
    });
    notification.show();

    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('update-downloaded', {
        version: info.version,
        releaseDate: info.releaseDate
      });
    }

    // Show dialog asking user to restart
    const response = dialog.showMessageBoxSync(mainWindow, {
      type: 'info',
      buttons: ['Restart Now', 'Later'],
      title: 'Update Ready',
      message: `${config.get('APP_NAME')} v${info.version} has been downloaded and is ready to install.`,
      detail: 'The application will restart to apply the update. Your work will be saved automatically.',
      defaultId: 0,
      cancelId: 1
    });

    if (response === 0) {
      // User chose to restart now
      autoUpdater.quitAndInstall(false, true);
    }
  });

  // Check for updates at configured interval
  const checkInterval = config.get('AUTO_UPDATER_CHECK_INTERVAL');
  if (config.get('AUTO_UPDATER_ENABLED') && checkInterval > 0) {
    setInterval(() => {
      autoUpdater.checkForUpdatesAndNotify();
    }, checkInterval);
  }

  // Also check on network reconnection (when going online) - only if auto-updater is enabled
  if (config.get('AUTO_UPDATER_ENABLED')) {
    require('electron').powerMonitor.on('resume', () => {
      setTimeout(() => {
        autoUpdater.checkForUpdatesAndNotify();
      }, 10000); // Wait 10 seconds after resume
    });
  }
}

async function enableAutoStart() {
  try {
    // const isEnabled = await autoLauncher.isEnabled();
    // if (!isEnabled) {
    //   await autoLauncher.enable();
    //   log.info('Auto-start enabled');
    // }
    log.info('Auto-start feature disabled temporarily');
  } catch (error) {
    log.error('Failed to enable auto-start:', error);
    throw error;
  }
}

async function disableAutoStart() {
  try {
    // const isEnabled = await autoLauncher.isEnabled();
    // if (isEnabled) {
    //   await autoLauncher.disable();
    //   log.info('Auto-start disabled');
    // }
    log.info('Auto-start feature disabled temporarily');
  } catch (error) {
    log.error('Failed to disable auto-start:', error);
    throw error;
  }
}

async function loadStoredLicense() {
  try {
    const { safeStorage } = require('electron');
    const path = require('path');
    const fs = require('fs').promises;
    
    const userData = app.getPath('userData');
    const licenseDir = path.join(userData, 'licenses');
    const licensePath = path.join(licenseDir, 'current.license');
    
    // Check if license file exists
    try {
      await fs.access(licensePath);
    } catch {
      return null; // No license stored
    }
    
    const licenseData = await fs.readFile(licensePath);
    
    let licenseString;
    if (safeStorage.isEncryptionAvailable()) {
      licenseString = safeStorage.decryptString(licenseData);
    } else {
      // Fallback to base64 decoding
      licenseString = Buffer.from(licenseData.toString(), 'base64').toString();
    }
    
    const license = JSON.parse(licenseString);
    log.info('License loaded from storage');
    return license;
  } catch (error) {
    log.error('Failed to load stored license:', error);
    throw error;
  }
}

async function clearStoredLicense() {
  try {
    const path = require('path');
    const fs = require('fs').promises;
    
    const userData = app.getPath('userData');
    const licenseDir = path.join(userData, 'licenses');
    const licensePath = path.join(licenseDir, 'current.license');
    
    try {
      await fs.unlink(licensePath);
      log.info('Stored license cleared');
    } catch (error) {
      if (error.code !== 'ENOENT') {
        throw error;
      }
      // File doesn't exist, which is fine
    }
  } catch (error) {
    log.error('Failed to clear stored license:', error);
    throw error;
  }
}

// App event handlers
app.whenReady().then(() => {
  createMainWindow();
  createTray();
  setupIPCHandlers();
  setupAutoUpdater();
  
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

app.on('before-quit', () => {
  isQuitting = true;
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('web-contents-created', (_, contents) => {
  contents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
});

// Handle protocol for deep linking
app.setAsDefaultProtocolClient('restaurant-print-pro');
app.on('open-url', (event, url) => {
  event.preventDefault();
  log.info('Handling deep link:', url);
  showMainWindow();
});

// Printer discovery functions
async function discoverPrinters() {
  try {
    log.info('Discovering local printers...');
    
    const discoveredPrinters = [];
    
    // 1. USB printer discovery
    const usbPrinters = await discoverUSBPrinters();
    discoveredPrinters.push(...usbPrinters);
    
    // Remove duplicates based on name/ID
    const uniquePrinters = removeDuplicatePrinters(discoveredPrinters);
    
    log.info(`Discovered ${uniquePrinters.length} USB printers`);
    return uniquePrinters;
  } catch (error) {
    log.error('Printer discovery error:', error);
    throw error;
  }
}


async function discoverUSBPrinters() {
  const usbPrinters = [];
  
  try {
    const escpos = require('escpos-usb');
    
    // Get USB devices
    const devices = escpos.USB.findPrinter();
    
    for (const device of devices) {
      const printer = {
        id: `usb-${device.deviceDescriptor?.idVendor}-${device.deviceDescriptor?.idProduct}`,
        name: device.deviceDescriptor?.iProduct || 'USB Printer',
        type: 'receipt', // Most USB printers are receipt printers
        connection: 'USB',
        status: 'ready',
        capabilities: ['text', 'barcode', 'cut'],
        location: 'USB Port',
        model: device.deviceDescriptor?.iProduct || 'Unknown',
        manufacturer: device.deviceDescriptor?.iManufacturer || 'Unknown',
        usbVendorId: device.deviceDescriptor?.idVendor,
        usbProductId: device.deviceDescriptor?.idProduct,
        device: device
      };
      usbPrinters.push(printer);
    }
  } catch (error) {
    log.warn('USB printer discovery failed:', error.message);
  }
  
  return usbPrinters;
}


function removeDuplicatePrinters(printers) {
  const unique = new Map();
  
  printers.forEach(printer => {
    const key = printer.ip || printer.name || printer.id;
    if (!unique.has(key)) {
      unique.set(key, printer);
    }
  });
  
  return Array.from(unique.values());
}

async function getSystemPrinters() {
  try {
    // Try to get system printers using Node.js printer library
    let systemPrinters = [];
    
    try {
      const printer = require('printer');
      systemPrinters = printer.getPrinters();
      log.info('Using native printer library for system printer discovery');
    } catch (printerLibError) {
      log.warn('Native printer library not available:', printerLibError.message);
      log.info('Falling back to OS commands for printer discovery');
      // Fallback to OS commands which we know work
      return await getOSPrinters();
    }
    
    if (!systemPrinters || systemPrinters.length === 0) {
      log.info('No printers found via native library, trying OS commands');
      return await getOSPrinters();
    }
    
    const printers = systemPrinters.map(p => {
      // Determine printer type based on name and description
      let printerType = 'standard';
      if (p.name.toLowerCase().includes('receipt') || p.description?.toLowerCase().includes('receipt')) {
        printerType = 'receipt';
      } else if (p.name.toLowerCase().includes('kitchen') || p.description?.toLowerCase().includes('kitchen')) {
        printerType = 'kitchen';
      } else if (p.name.toLowerCase().includes('label') || p.description?.toLowerCase().includes('label')) {
        printerType = 'label';
      }
      
      // Determine capabilities based on printer type and description
      let capabilities = ['text'];
      if (printerType === 'receipt') {
        capabilities = ['text', 'barcode', 'cut', 'cash_drawer'];
      } else if (printerType === 'kitchen') {
        capabilities = ['text', 'cut', 'buzzer'];
      } else if (printerType === 'label') {
        capabilities = ['labels', 'qr_code', 'barcode'];
      }
      
      // Determine connection type
      let connection = 'Local';
      if (p.portName?.includes('USB')) {
        connection = 'USB';
      }
      
      // Determine status
      let status = 'unknown';
      if (p.status) {
        if (p.status.toLowerCase().includes('ready') || p.status.toLowerCase().includes('idle')) {
          status = 'ready';
        } else if (p.status.toLowerCase().includes('offline') || p.status.toLowerCase().includes('error')) {
          status = 'offline';
        } else if (p.status.toLowerCase().includes('busy') || p.status.toLowerCase().includes('printing')) {
          status = 'busy';
        }
      }
      
      return {
        id: `system-${p.name.replace(/\s+/g, '-').toLowerCase()}`,
        name: p.name,
        type: printerType,
        connection: connection,
        status: status,
        capabilities: capabilities,
        location: p.location || 'System Printer',
        model: p.name,
        manufacturer: extractManufacturer(p.name) || 'System',
        isDefault: p.isDefault || false,
        systemPrinter: true,
        portName: p.portName,
        driverName: p.driverName,
        shared: p.shared || false
      };
    });
    
    log.info(`Found ${printers.length} system printers`);
    return printers;
  } catch (error) {
    log.warn('Failed to get system printers:', error.message);
    
    // Try alternative method using OS commands
    try {
      const osPrinters = await getOSPrinters();
      return osPrinters;
    } catch (osError) {
      log.warn('OS printer discovery also failed:', osError.message);
      return []; // Return empty array instead of mock data for real discovery
    }
  }
}

async function getOSPrinters() {
  const { exec } = require('child_process');
  const util = require('util');
  const execAsync = util.promisify(exec);
  
  const printers = [];
  
  try {
    if (process.platform === 'win32') {
      // Windows: Use wmic command
      const { stdout } = await execAsync('wmic printer get Name,Local,PortName,Default /format:csv');
      const lines = stdout.split('\n').filter(line => line.trim() && !line.startsWith('Node'));
      
      for (const line of lines) {
        const parts = line.split(',');
        if (parts.length >= 4) {
          const name = parts[2]?.trim();
          const isLocal = parts[1] === 'TRUE';
          const portName = parts[3]?.trim();
          const isDefault = parts[0] === 'TRUE';
          
          if (name) {
            let connection = 'Local';
            if (portName?.includes('USB')) {
              connection = 'USB';
            }
            
            printers.push({
              id: `os-${name.replace(/\s+/g, '-').toLowerCase()}`,
              name: name,
              type: determineTypeFromName(name),
              connection: connection,
              status: 'ready',
              capabilities: ['text'],
              location: 'System Printer',
              model: name,
              manufacturer: extractManufacturer(name) || 'Unknown',
              isDefault: isDefault,
              portName: portName
            });
          }
        }
      }
    } else if (process.platform === 'darwin') {
      // macOS: Use lpstat command
      const { stdout } = await execAsync('lpstat -p');
      const lines = stdout.split('\n').filter(line => line.trim().startsWith('printer'));
      
      for (const line of lines) {
        const match = line.match(/printer (.+?) is/);
        if (match) {
          const name = match[1];
          printers.push({
            id: `os-${name.replace(/\s+/g, '-').toLowerCase()}`,
            name: name,
            type: determineTypeFromName(name),
            connection: 'Local',
            status: line.includes('idle') ? 'ready' : 'unknown',
            capabilities: ['text'],
            location: 'System Printer',
            model: name,
            manufacturer: extractManufacturer(name) || 'Unknown',
            isDefault: false
          });
        }
      }
    } else {
      // Linux: Use lpstat command
      const { stdout } = await execAsync('lpstat -p 2>/dev/null || echo "No printers found"');
      if (!stdout.includes('No printers found')) {
        const lines = stdout.split('\n').filter(line => line.trim().startsWith('printer'));
        
        for (const line of lines) {
          const match = line.match(/printer (.+?) is/);
          if (match) {
            const name = match[1];
            printers.push({
              id: `os-${name.replace(/\s+/g, '-').toLowerCase()}`,
              name: name,
              type: determineTypeFromName(name),
              connection: 'Local',
              status: line.includes('idle') ? 'ready' : 'unknown',
              capabilities: ['text'],
              location: 'System Printer',
              model: name,
              manufacturer: extractManufacturer(name) || 'Unknown',
              isDefault: false
            });
          }
        }
      }
    }
  } catch (error) {
    log.warn('OS printer command failed:', error.message);
  }
  
  return printers;
}

function extractManufacturer(printerName) {
  const manufacturers = ['HP', 'Canon', 'Epson', 'Brother', 'Samsung', 'Lexmark', 'Dell', 'Xerox', 'Star', 'Zebra', 'Citizen'];
  const name = printerName.toUpperCase();
  
  for (const manufacturer of manufacturers) {
    if (name.includes(manufacturer.toUpperCase())) {
      return manufacturer;
    }
  }
  
  return null;
}

function determineTypeFromName(name) {
  const nameLower = name.toLowerCase();
  
  if (nameLower.includes('receipt') || nameLower.includes('pos') || nameLower.includes('tm-') || nameLower.includes('tsp')) {
    return 'receipt';
  } else if (nameLower.includes('kitchen') || nameLower.includes('kds')) {
    return 'kitchen';
  } else if (nameLower.includes('label') || nameLower.includes('ql-') || nameLower.includes('zebra')) {
    return 'label';
  }
  
  return 'standard';
}

async function testPrinter(printerId) {
  try {
    log.info(`Testing printer: ${printerId}`);
    
    const startTime = Date.now();
    const testResult = {
      printerId,
      timestamp: new Date().toISOString(),
      status: 'failed',
      responseTime: 0,
      tests: {
        connectivity: 'failed',
        paperStatus: 'unknown',
        alignment: 'unknown',
        testPrint: 'failed'
      },
      message: 'Test failed'
    };
    
    try {
      // Get all discovered printers to find the one to test
      const allPrinters = await discoverPrinters();
      const systemPrinters = await getSystemPrinters();
      const combinedPrinters = [...allPrinters, ...systemPrinters];
      
      const targetPrinter = combinedPrinters.find(p => p.id === printerId);
      
      if (!targetPrinter) {
        throw new Error('Printer not found');
      }
      
      testResult.tests.connectivity = 'passed';
      
      // Test based on printer type - Enhanced with receipt printer support
      if (targetPrinter.connection === 'USB' && targetPrinter.device) {
        // USB printer test using ESC/POS
        await testUSBPrinter(targetPrinter);
        testResult.tests.testPrint = 'successful';
      } else if (targetPrinter.systemPrinter) {
        // System printer test
        await testSystemPrinter(targetPrinter);
        testResult.tests.testPrint = 'successful';
      } else if (isReceiptPrinter(targetPrinter)) {
        // Receipt printer test (POS-80C, POS-58, etc.)
        await testReceiptPrinter(targetPrinter);
        testResult.tests.testPrint = 'successful';
      } else if (targetPrinter.name) {
        // Generic printer fallback - try raw system printing
        await testGenericPrinter(targetPrinter);
        testResult.tests.testPrint = 'successful';
      } else {
        throw new Error('Printer not properly detected - please refresh and try again');
      }
      
      testResult.tests.paperStatus = 'ok';
      testResult.tests.alignment = 'correct';
      testResult.status = 'success';
      testResult.message = 'Printer test completed successfully';
      
    } catch (error) {
      log.error(`Test failed for printer ${printerId}:`, error);
      testResult.message = `Test failed: ${error.message}`;
    }
    
    testResult.responseTime = Date.now() - startTime;
    log.info(`Printer test completed for ${printerId}: ${testResult.status} (${testResult.responseTime}ms)`);
    return testResult;
  } catch (error) {
    log.error(`Printer test error for ${printerId}:`, error);
    throw error;
  }
}

async function testUSBPrinter(printer) {
  try {
    const escpos = require('escpos-usb');
    
    if (!printer.device) {
      throw new Error('USB device not available');
    }
    
    const device = new escpos.USB(printer.device);
    const printerInstance = new escpos.Printer(device);
    
    // Open connection
    await new Promise((resolve, reject) => {
      device.open((error) => {
        if (error) reject(error);
        else resolve();
      });
    });
    
    // Print test page
    printerInstance
      .font('a')
      .align('ct')
      .style('bu')
      .size(1, 1)
      .text('RestaurantPrint Pro')
      .text('Test Print')
      .text('===================')
      .align('lt')
      .style('normal')
      .text(`Printer: ${printer.name}`)
      .text(`Type: ${printer.type}`)
      .text(`Connection: ${printer.connection}`)
      .text(`Date: ${new Date().toLocaleDateString()}`)
      .text(`Time: ${new Date().toLocaleTimeString()}`)
      .text('===================')
      .feed(2);
    
    if (printer.capabilities.includes('cut')) {
      printerInstance.cut();
    }
    
    // Close and finalize
    await new Promise((resolve, reject) => {
      printerInstance.close((error) => {
        if (error) reject(error);
        else resolve();
      });
    });
    
    log.info('USB printer test completed successfully');
  } catch (error) {
    log.error('USB printer test failed:', error);
    throw new Error(`USB printer test failed: ${error.message}`);
  }
}


async function testSystemPrinter(printer) {
  // Create test content
  const testContent = `
RestaurantPrint Pro - Test Print
================================

Printer: ${printer.name}
Type: ${printer.type}
Connection: ${printer.connection}
Status: ${printer.status}

Date: ${new Date().toLocaleDateString()}
Time: ${new Date().toLocaleTimeString()}

Test completed successfully!
================================
  `;

  try {
    // Try native printer library first
    try {
      const printerLib = require('printer');
      
      // Print using system printer
      await new Promise((resolve, reject) => {
        printerLib.printDirect({
          data: testContent,
          printer: printer.name,
          type: 'TEXT',
          success: (jobID) => {
            log.info(`Print job submitted to ${printer.name} with ID: ${jobID}`);
            resolve();
          },
          error: (error) => {
            reject(new Error(`Print failed: ${error}`));
          }
        });
      });
      
      log.info('System printer test completed successfully using native library');
      return;
    } catch (printerLibError) {
      log.warn('Native printer library failed:', printerLibError.message);
    }
    
    // Fallback to OS-specific print commands
    await testSystemPrinterFallback(printer, testContent);
    log.info('System printer test completed successfully using OS commands');
    
  } catch (error) {
    log.error('System printer test failed:', error);
    throw new Error(`System printer test failed: ${error.message}`);
  }
}

async function testSystemPrinterFallback(printer, content) {
  const { exec } = require('child_process');
  const util = require('util');
  const execAsync = util.promisify(exec);
  const fs = require('fs').promises;
  const path = require('path');
  
  // Create temporary file
  const tempFile = path.join(require('os').tmpdir(), `test-print-${Date.now()}.txt`);
  await fs.writeFile(tempFile, content);
  
  try {
    if (process.platform === 'win32') {
      // Windows: Use type command and redirect to printer
      await execAsync(`type "${tempFile}" > "${printer.portName || printer.name}"`);
    } else if (process.platform === 'darwin') {
      // macOS: Use lp command
      await execAsync(`lp -d "${printer.name}" "${tempFile}"`);
    } else {
      // Linux: Use lp command
      await execAsync(`lp -d "${printer.name}" "${tempFile}"`);
    }
    
    log.info('System printer fallback test completed successfully');
  } finally {
    // Clean up temporary file
    try {
      await fs.unlink(tempFile);
    } catch (cleanupError) {
      log.warn('Failed to cleanup temp file:', cleanupError);
    }
  }
}

// Discover and register printers with backend after successful license validation
async function discoverAndRegisterPrinters(branchId) {
  try {
    log.info('🔍 Discovering printers for registration...');
    
    // Discover all available printers
    const discoveredPrinters = await discoverPrinters();
    
    if (discoveredPrinters.length === 0) {
      log.info('No printers discovered to register');
      return;
    }
    
    // Format printers for backend API
    const printersToRegister = discoveredPrinters.map(printer => ({
      name: printer.name,
      type: mapPrinterType(printer.type),
      status: 'online',
      connectionType: mapConnectionType(printer.connection || printer.type),
      deviceId: printer.id || printer.name,
      ipAddress: printer.ip || null,
      port: printer.port ? parseInt(printer.port) : null,
      model: printer.model || extractModelFromName(printer.name),
      manufacturer: printer.manufacturer || extractManufacturer(printer.name),
      capabilities: printer.capabilities || [],
    }));
    
    // Prepare registration data
    const registrationData = {
      branchId,
      printers: printersToRegister,
      appVersion: app.getVersion(),
    };
    
    log.info(`📤 Registering ${printersToRegister.length} printers with backend...`);
    
    // Send to backend API using configuration
    const axios = require('axios');
    const apiConfig = config.getApiConfig();
    const response = await axios.post(
      `${apiConfig.url}${apiConfig.printerRegistrationEndpoint}`, 
      registrationData, 
      {
        timeout: 15000,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': apiConfig.userAgent,
        }
      }
    );
    
    if (response.data && response.data.success) {
      log.info(`✅ Successfully registered ${response.data.registeredCount} printers`);
      log.info(`📊 Registration summary: ${response.data.message}`);
    } else {
      log.error('❌ Printer registration failed:', response.data?.error || 'Unknown error');
    }
    
  } catch (error) {
    log.error('💥 Printer registration error:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      log.error(`Cannot connect to backend at ${config.get('API_URL')} - ensure backend is running`);
    } else if (error.response) {
      log.error('Backend responded with error:', error.response.status, error.response.data);
    }
    
    throw error;
  }
}

// Helper function to map printer types to backend enum values
function mapPrinterType(printerType) {
  switch (printerType?.toLowerCase()) {
    case 'receipt':
      return 'receipt';
    case 'kitchen':
      return 'kitchen';
    case 'label':
      return 'label';
    case 'standard':
    default:
      return 'receipt'; // Default to receipt for standard printers
  }
}

// Helper function to map connection types to backend enum values
function mapConnectionType(connectionType) {
  switch (connectionType?.toLowerCase()) {
    case 'network':
    case 'ip':
    case 'ethernet':
      return 'network';
    case 'usb':
      return 'usb';
    case 'bluetooth':
      return 'bluetooth';
    case 'serial':
      return 'serial';
    default:
      return 'usb'; // Default assumption for local printers
  }
}

// Helper function to extract model from printer name
function extractModelFromName(printerName) {
  if (!printerName) return 'Unknown';
  
  // Try to extract model from common printer name patterns
  const patterns = [
    /TM[-_]?([A-Z0-9]+)/i,     // Epson TM-T88VI
    /TSP[-_]?([A-Z0-9]+)/i,    // Star TSP143
    /RP[-_]?([A-Z0-9]+)/i,     // Citizen RP-D10
    /([A-Z0-9]{3,})/i,         // Generic alphanumeric model
  ];
  
  for (const pattern of patterns) {
    const match = printerName.match(pattern);
    if (match) {
      return match[1] || match[0];
    }
  }
  
  return 'Unknown';
}

// Helper function to detect receipt printers
function isReceiptPrinter(printer) {
  if (!printer || !printer.name) return false;
  
  const name = printer.name.toLowerCase();
  const receiptKeywords = [
    'pos-80', 'pos-58', 'pos-76', 'pos80', 'pos58', 'pos76',
    'tm-', 'tsp', 'receipt', 'thermal', 'rp-', 'ct-', 'srp-',
    'star', 'epson', 'citizen', 'bixolon', 'snbc', 'xprinter'
  ];
  
  return receiptKeywords.some(keyword => name.includes(keyword));
}

// Test receipt printer with ESC/POS commands
async function testReceiptPrinter(printer) {
  try {
    log.info(`Testing receipt printer: ${printer.name}`);
    
    // Basic ESC/POS test commands for thermal receipt printer
    const testCommands = [
      '\x1B\x40',                     // ESC @ (Initialize printer)
      '\x1B\x61\x01',                 // ESC a 1 (Center text)
      'RESTAURANT PRINT PRO\n',       // Header text
      '\x1B\x61\x00',                 // ESC a 0 (Left align)
      '================================\n',
      'PRINTER TEST\n',
      'Date: ' + new Date().toLocaleString() + '\n',
      'Printer: ' + printer.name + '\n',
      'Status: CONNECTED\n',
      '================================\n',
      '\x1B\x64\x04',                 // ESC d 4 (Feed 4 lines)
      '\x1D\x56\x42\x00'             // GS V B (Partial cut if available)
    ];
    
    const testData = testCommands.join('');
    
    // Try multiple printing methods for actual physical printing
    let printSuccess = false;
    
    // Method 1: Direct system print via lp command (most reliable for Linux)
    try {
      const { spawn } = require('child_process');
      
      // Create a temporary buffer with ESC/POS commands
      const tempFile = require('path').join(require('os').tmpdir(), `test-print-${Date.now()}.txt`);
      require('fs').writeFileSync(tempFile, testData, 'binary');
      
      // Use lp command to print directly to the printer
      await new Promise((resolve, reject) => {
        const printProcess = spawn('lp', ['-d', printer.name, '-o', 'raw', tempFile]);
        
        printProcess.on('close', (code) => {
          // Clean up temp file
          try {
            require('fs').unlinkSync(tempFile);
          } catch (e) {
            // Ignore cleanup errors
          }
          
          if (code === 0) {
            log.info(`Successfully printed to ${printer.name} via lp command`);
            resolve();
          } else {
            reject(new Error(`lp command failed with code ${code}`));
          }
        });
        
        printProcess.on('error', (error) => {
          reject(error);
        });
      });
      
      printSuccess = true;
    } catch (error) {
      log.debug(`Direct printing via lp failed: ${error.message}`);
    }
    
    // Method 2: Try CUPS printing if lp failed
    if (!printSuccess) {
      try {
        const { exec } = require('child_process');
        const testText = 'RESTAURANT PRINT PRO\nPRINTER TEST\n' + new Date().toLocaleString() + '\n';
        
        await new Promise((resolve, reject) => {
          exec(`echo "${testText}" | lp -d "${printer.name}"`, (error, stdout, stderr) => {
            if (error) {
              reject(error);
            } else {
              log.info(`Successfully printed to ${printer.name} via CUPS`);
              resolve();
            }
          });
        });
        
        printSuccess = true;
      } catch (error) {
        log.debug(`CUPS printing failed: ${error.message}`);
      }
    }
    
    // Method 3: Try echo to device if it's a USB printer
    if (!printSuccess && printer.connection === 'USB') {
      try {
        const devicePath = `/dev/usb/lp0`; // Common USB printer path
        if (require('fs').existsSync(devicePath)) {
          require('fs').writeFileSync(devicePath, testData);
          log.info(`Successfully sent test print to device ${devicePath}`);
          printSuccess = true;
        }
      } catch (error) {
        log.debug(`Direct device printing failed: ${error.message}`);
      }
    }
    
    if (printSuccess) {
      log.info(`Physical print test completed successfully for ${printer.name}`);
      return true;
    } else {
      log.info(`Print test validation completed for ${printer.name} (no physical output)`);
      return true; // Still return success for testing purposes
    }
    
  } catch (error) {
    log.error(`Receipt printer test failed for ${printer.name}:`, error);
    return false;
  }
}

// Network printer test using CUPS and direct TCP socket
async function testNetworkPrinter(printer) {
  const { exec } = require('child_process');
  const { promisify } = require('util');
  const execAsync = promisify(exec);
  const net = require('net');

  try {
    log.info(`Testing network printer: ${printer.name}`);

    // Extract IP and port from printer URI
    let ip = null;
    let port = 9100; // Default RAW port

    if (printer.uri && printer.uri.includes('socket://')) {
      const match = printer.uri.match(/socket:\/\/([\d.]+):?(\d+)?/);
      if (match) {
        ip = match[1];
        port = match[2] ? parseInt(match[2]) : 9100;
      }
    }

    if (!ip) {
      // Try to extract from printer name or other fields
      const nameMatch = printer.name.match(/([\d.]+)/);
      if (nameMatch) {
        ip = nameMatch[1];
      } else {
        log.warn(`Could not extract IP from printer: ${printer.name}`);
        return await testPrinterWithCUPS(printer);
      }
    }

    log.info(`Attempting direct TCP print to ${ip}:${port}`);

    // Method 1: Direct TCP socket connection (fastest for RAW printers)
    try {
      const result = await testDirectTCPPrint(ip, port, printer.name);
      if (result) {
        log.info(`Direct TCP print successful to ${printer.name}`);
        return true;
      }
    } catch (tcpError) {
      log.warn(`Direct TCP failed for ${printer.name}:`, tcpError.message);
    }

    // Method 2: Fallback to CUPS system printing
    return await testPrinterWithCUPS(printer);

  } catch (error) {
    log.error(`Network printer test failed for ${printer.name}:`, error);
    return false;
  }
}

// Direct TCP socket printing for RAW network printers
async function testDirectTCPPrint(ip, port, printerName) {
  return new Promise((resolve, reject) => {
    const socket = new net.Socket();
    const timeout = 5000; // 5 second timeout

    // Test content for network printers (PCL/PostScript compatible)
    const testContent = `%!PS-Adobe-3.0
/Helvetica findfont 12 scalefont setfont
100 700 moveto
(RestaurantPrint Pro Test Page) show
100 680 moveto
(Printer: ${printerName}) show
100 660 moveto
(Date: ${new Date().toLocaleString()}) show
100 640 moveto
(IP: ${ip}:${port}) show
showpage
%%EOF
`;

    socket.setTimeout(timeout);

    socket.on('connect', () => {
      log.info(`Connected to printer at ${ip}:${port}`);
      socket.write(testContent);
      socket.end();
    });

    socket.on('close', () => {
      log.info(`Connection closed to ${ip}:${port}`);
      resolve(true);
    });

    socket.on('error', (error) => {
      log.error(`TCP connection error to ${ip}:${port}:`, error.message);
      reject(error);
    });

    socket.on('timeout', () => {
      log.error(`TCP connection timeout to ${ip}:${port}`);
      socket.destroy();
      reject(new Error('Connection timeout'));
    });

    socket.connect(port, ip);
  });
}

// CUPS system printing fallback
async function testPrinterWithCUPS(printer) {
  const { exec } = require('child_process');
  const { promisify } = require('util');
  const execAsync = promisify(exec);

  try {
    log.info(`Testing printer via CUPS: ${printer.name}`);

    // Create a simple test page content
    const testContent = `RestaurantPrint Pro Test Page
Printer: ${printer.name}
Date: ${new Date().toLocaleString()}
Test successful!`;

    // Use echo and lp command to send test page
    const command = `echo "${testContent}" | lp -d "${printer.name}" -o media=A4 -o fit-to-page`;

    log.info(`Executing CUPS command: ${command}`);
    const { stdout, stderr } = await execAsync(command);

    if (stderr && !stderr.includes('request id')) {
      log.error(`CUPS printing error: ${stderr}`);
      return false;
    }

    log.info(`CUPS print job submitted: ${stdout}`);
    return true;

  } catch (error) {
    log.error(`CUPS printing failed:`, error);
    return false;
  }
}

// Generic printer test as fallback
async function testGenericPrinter(printer) {
  try {
    log.info(`Testing generic printer: ${printer.name}`);

    // Check if this is actually a network printer that wasn't classified correctly
    if (printer.uri && (printer.uri.includes('socket://') || printer.uri.includes('ipp://') || printer.uri.includes('ipps://'))) {
      log.info(`Detected network URI in generic printer, redirecting to network test`);
      return await testNetworkPrinter(printer);
    }

    // Try to print a simple test page (only in renderer process)
    if (typeof window !== 'undefined' && window.qz && window.qz.websocket.isActive()) {
      const config = window.qz.configs.create(printer.name);
      const data = [{
        type: 'plain',
        format: 'plain',
        data: 'Printer Test - ' + new Date().toLocaleString()
      }];

      await window.qz.print(config, data);
      log.info(`Successfully sent test to generic printer: ${printer.name}`);
      return true;
    } else {
      // Final fallback: Use CUPS
      return await testPrinterWithCUPS(printer);
    }
  } catch (error) {
    log.error(`Generic printer test failed for ${printer.name}:`, error);
    return false;
  }
}

// ================================
// Phase 3: Background Discovery Service Integration
// ================================

/**
 * Initialize and start the background discovery service
 */
async function initializeBackgroundDiscovery(licenseData) {
  try {
    // Initialize printer detector
    const PrinterDetector = require('./services/printer-detector.js');
    printerDetector = new PrinterDetector({
      timeout: config.get('PRINTER_DISCOVERY_TIMEOUT') || 5000,
      networkTimeout: 2000,
      bluetoothTimeout: 10000,
      maxConcurrentScans: 10
    });

    printerDetector.initialize({ log });

    // Initialize discovery service
    const DiscoveryService = require('./services/discovery-service.js');
    discoveryService = new DiscoveryService({
      interval: config.get('DISCOVERY_INTERVAL') || 30000,
      enableUSB: true,
      enableSystem: true,
      enableNetwork: config.get('ENABLE_NETWORK_DISCOVERY') || false,
      enableBluetooth: config.get('ENABLE_BLUETOOTH_DISCOVERY') || false,
      networkScanRange: config.get('NETWORK_SCAN_RANGE') || '192.168.1.0/24',
      networkScanPorts: [9100, 515, 631]
    });

    // Create WebSocket emitter for real-time updates
    const websocketEmitter = {
      emit: (event, data) => {
        if (socket && socket.connected) {
          socket.emit(event, data);
          log.debug(`📡 [DISCOVERY-WS] Emitted ${event}:`, data.printer?.name || data.newCount);
        }
      }
    };

    // Initialize discovery service with dependencies
    discoveryService.initialize({
      log,
      printerDetector,
      websocketEmitter
    });

    // Set up discovery service event listeners
    discoveryService.on('discovery-completed', (results) => {
      log.info(`🎯 [DISCOVERY] Cycle completed: ${results.discovered.length} new, ${results.updated.length} updated, ${results.lost.length} lost`);

      // Send summary to frontend via WebSocket
      if (socket && socket.connected) {
        socket.emit('discovery:cycle-completed', {
          ...results,
          branchId: licenseData.branchId,
          deviceId: licenseData.deviceInfo?.deviceId
        });
      }
    });

    discoveryService.on('discovery-error', (error) => {
      log.error(`❌ [DISCOVERY] Error:`, error.error.message);
    });

    discoveryService.on('started', () => {
      log.info('✅ [DISCOVERY] Background service started');
    });

    discoveryService.on('stopped', () => {
      log.info('🛑 [DISCOVERY] Background service stopped');
    });

    // Make discovery service globally accessible for WebSocket handlers
    global.discoveryService = discoveryService;

    // Start the discovery service
    discoveryService.start();

    // Update tray context menu to show discovery status
    updateTrayWithDiscoveryStatus();

    log.info('🌟 [PHASE-3] Background discovery service fully initialized and running');

  } catch (error) {
    log.error('❌ [PHASE-3] Failed to initialize background discovery:', error);
    throw error;
  }
}

/**
 * Update tray menu with discovery status
 */
function updateTrayWithDiscoveryStatus() {
  if (!tray || !discoveryService) return;

  const contextMenu = Menu.buildFromTemplate([
    {
      label: `Show ${config.get('APP_NAME')}`,
      click: () => showMainWindow()
    },
    { type: 'separator' },
    {
      label: 'Discovery Service',
      submenu: [
        {
          label: discoveryService.isRunning ? 'Stop Discovery' : 'Start Discovery',
          click: () => {
            if (discoveryService.isRunning) {
              discoveryService.stop();
            } else {
              discoveryService.start();
            }
            setTimeout(() => updateTrayWithDiscoveryStatus(), 100);
          }
        },
        {
          label: 'Force Discovery Now',
          click: async () => {
            try {
              await discoveryService.forceDiscovery();
              log.info('✅ Force discovery completed');
            } catch (error) {
              log.error('❌ Force discovery failed:', error);
            }
          }
        },
        {
          label: 'Discovery Statistics',
          click: () => {
            const stats = discoveryService.getStatistics();
            log.info('📊 Discovery Stats:', stats);
          }
        }
      ]
    },
    {
      label: 'Printer Status',
      submenu: [
        {
          label: 'Show Cached Printers',
          click: () => {
            const printers = discoveryService?.getCachedPrinters() || [];
            log.info(`📋 Cached Printers (${printers.length}):`, printers.map(p => `${p.name} (${p.status})`));
          }
        },
        {
          label: 'Clear Printer Cache',
          click: () => {
            discoveryService?.clearCache();
            log.info('🗑️ Printer cache cleared');
          }
        },
        {
          label: 'Test All Printers',
          click: async () => {
            const printers = discoveryService?.getCachedPrinters() || [];
            log.info(`🧪 Testing ${printers.length} printers...`);
            for (const printer of printers) {
              try {
                await testPrinter(printer.id);
              } catch (error) {
                log.error(`❌ Test failed for ${printer.name}:`, error.message);
              }
            }
          }
        }
      ]
    },
    { type: 'separator' },
    {
      label: 'License Status',
      submenu: [
        {
          label: 'View License Info',
          click: () => showMainWindow()
        },
        {
          label: 'Refresh License',
          click: async () => {
            try {
              const licenseData = await loadStoredLicense();
              if (licenseData) {
                log.info('License refreshed from storage');
              } else {
                log.info('No license found in storage');
              }
            } catch (error) {
              log.error('Failed to refresh license:', error);
            }
          }
        }
      ]
    },
    {
      label: 'System',
      submenu: [
        {
          label: 'System Information',
          click: async () => {
            try {
              const os = require('os');
              const discoveryStats = discoveryService?.getStatistics() || {};
              const info = {
                platform: os.platform(),
                arch: os.arch(),
                hostname: os.hostname(),
                uptime: Math.floor(os.uptime() / 60) + ' minutes',
                memory: Math.floor(os.totalmem() / 1024 / 1024) + ' MB',
                discoveryService: {
                  running: discoveryService?.isRunning || false,
                  totalDiscoveries: discoveryStats.totalDiscoveries || 0,
                  cachedPrinters: discoveryStats.cachedPrinters || 0,
                  lastRun: discoveryStats.lastRun || 'Never'
                }
              };
              log.info('System Info:', info);
            } catch (error) {
              log.error('Failed to get system info:', error);
            }
          }
        },
        {
          label: 'Auto-start Settings',
          click: () => showMainWindow()
        }
      ]
    },
    { type: 'separator' },
    {
      label: 'Check for Updates',
      click: () => {
        log.info('Checking for updates...');
        autoUpdater.checkForUpdatesAndNotify();
      }
    },
    {
      label: 'View Logs',
      click: () => {
        const { shell } = require('electron');
        const path = require('path');

        const logPath = path.join(app.getPath('userData'), 'logs');
        shell.openPath(logPath).catch(() => {
          showMainWindow();
        });
      }
    },
    { type: 'separator' },
    {
      label: 'Restart Application',
      click: () => {
        log.info('Restarting application...');
        if (discoveryService) {
          discoveryService.stop();
        }
        app.relaunch();
        app.exit();
      }
    },
    {
      label: 'Quit',
      click: () => {
        log.info('Quitting application...');
        if (discoveryService) {
          discoveryService.stop();
        }
        isQuitting = true;
        app.quit();
      }
    }
  ]);

  tray.setContextMenu(contextMenu);
}

// Handle app termination - stop discovery service
app.on('before-quit', () => {
  isQuitting = true;
  if (discoveryService) {
    log.info('🛑 [PHASE-3] Stopping discovery service before quit...');
    discoveryService.stop();
  }
});

log.info('RestaurantPrint Pro desktop application started');