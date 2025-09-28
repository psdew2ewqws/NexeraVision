/**
 * Service Configuration Manager
 *
 * Headless configuration manager for the PrinterMaster service
 * that doesn't depend on Electron APIs
 */

const path = require('path');
const fs = require('fs');
const os = require('os');

class ServiceConfig {
  constructor() {
    this.environment = process.env.NODE_ENV || 'production';
    this.config = this.loadConfig();
  }

  loadConfig() {
    const baseConfig = {
      // Application Info
      APP_NAME: 'PrinterMaster Service',
      APP_VERSION: '2.0.0',

      // Service Configuration
      PRINTER_SERVICE_PORT: parseInt(process.env.PRINTER_SERVICE_PORT) || 8182,
      LOG_LEVEL: process.env.LOG_LEVEL || 'info',

      // API Configuration
      API_BASE_URL: process.env.API_BASE_URL || 'http://localhost:3001',
      API_URL: process.env.API_BASE_URL || 'http://localhost:3001',

      // WebSocket Configuration
      WEBSOCKET_URL: process.env.WEBSOCKET_URL || 'http://localhost:3001',
      WEBSOCKET_NAMESPACE: '/printing',
      WEBSOCKET_CONNECTION_TIMEOUT: 10000,

      // Discovery Configuration
      PRINTER_DISCOVERY_TIMEOUT: 5000,
      PRINTER_DISCOVERY_INTERVAL: 30000,
      DISCOVERY_INTERVAL: 30000,

      // USB Configuration
      USB_MONITORING_INTERVAL: parseInt(process.env.USB_MONITORING_INTERVAL) || 5000,
      ENABLE_USB_HOTPLUG: process.env.ENABLE_USB_HOTPLUG === 'true',

      // Health Monitoring
      HEALTH_CHECK_INTERVAL: parseInt(process.env.HEALTH_CHECK_INTERVAL) || 30000,
      MEMORY_WARNING_THRESHOLD: parseInt(process.env.MEMORY_WARNING_THRESHOLD) || 512,
      CPU_WARNING_THRESHOLD: parseInt(process.env.CPU_WARNING_THRESHOLD) || 85,

      // Network Discovery
      ENABLE_NETWORK_DISCOVERY: process.env.ENABLE_NETWORK_DISCOVERY === 'true',
      ENABLE_BLUETOOTH_DISCOVERY: process.env.ENABLE_BLUETOOTH_DISCOVERY === 'true',
      NETWORK_SCAN_RANGE: process.env.NETWORK_SCAN_RANGE || '192.168.1.0/24',

      // Device ID
      DEVICE_ID_SALT: 'printermaster-v2-salt-2024',

      // Auto Updater (disabled in service mode)
      AUTO_UPDATER_ENABLED: false,
      AUTO_UPDATER_AUTO_DOWNLOAD: false,
      AUTO_UPDATER_AUTO_INSTALL: false,
      AUTO_UPDATER_CHECK_INTERVAL: 0,

      // Auto Launch
      AUTO_LAUNCH_NAME: 'PrinterMaster Service'
    };

    // Environment-specific overrides
    if (this.environment === 'development') {
      baseConfig.LOG_LEVEL = 'debug';
      baseConfig.PRINTER_DISCOVERY_INTERVAL = 10000;
      baseConfig.HEALTH_CHECK_INTERVAL = 15000;
    }

    return baseConfig;
  }

  get(key) {
    return this.config[key];
  }

  set(key, value) {
    this.config[key] = value;
  }

  getEnvironment() {
    return this.environment;
  }

  isDevelopment() {
    return this.environment === 'development';
  }

  isProduction() {
    return this.environment === 'production';
  }

  isConfigurationLoaded() {
    return true;
  }

  getLogConfig() {
    return {
      fileLevel: this.get('LOG_LEVEL'),
      consoleLevel: this.get('LOG_LEVEL')
    };
  }

  getConfigSummary() {
    return {
      environment: this.environment,
      port: this.get('PRINTER_SERVICE_PORT'),
      logLevel: this.get('LOG_LEVEL'),
      apiUrl: this.get('API_BASE_URL'),
      discoveryInterval: this.get('PRINTER_DISCOVERY_INTERVAL')
    };
  }

  getWindowConfig() {
    // Return empty config for headless mode
    return {
      width: 1200,
      height: 800,
      minWidth: 800,
      minHeight: 600,
      autoHideMenuBar: true
    };
  }

  getApiConfig() {
    return {
      url: this.get('API_BASE_URL'),
      timeout: 15000,
      userAgent: `${this.get('APP_NAME')}/${this.get('APP_VERSION')}`,
      licenseValidationEndpoint: '/api/v1/printing/license/validate',
      printerRegistrationEndpoint: '/api/v1/printing/printers/bulk'
    };
  }

  getWebSocketConfig() {
    return {
      url: this.get('WEBSOCKET_URL'),
      namespace: this.get('WEBSOCKET_NAMESPACE'),
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
      timeout: this.get('WEBSOCKET_CONNECTION_TIMEOUT')
    };
  }

  // Create a mock app path for service mode
  getAppPath(name) {
    const rootDir = path.join(__dirname, '..');

    switch (name) {
      case 'userData':
        return path.join(os.homedir(), '.printermaster');
      case 'logs':
        return path.join(rootDir, 'logs');
      case 'temp':
        return os.tmpdir();
      default:
        return rootDir;
    }
  }

  // Ensure required directories exist
  ensureDirectories() {
    const directories = [
      this.getAppPath('userData'),
      this.getAppPath('logs'),
      path.join(this.getAppPath('userData'), 'licenses')
    ];

    for (const dir of directories) {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    }
  }
}

// Create singleton instance
const serviceConfig = new ServiceConfig();
serviceConfig.ensureDirectories();

module.exports = serviceConfig;