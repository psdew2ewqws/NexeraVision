const { app } = require('electron');
const path = require('path');
const fs = require('fs');

/**
 * Configuration Manager for RestaurantPrint Pro Desktop Application
 * Handles dynamic loading of environment-specific configurations
 * with validation and fallback support.
 */
class ConfigManager {
  constructor() {
    this.config = {};
    this.isLoaded = false;
    this.environment = process.env.NODE_ENV || 'development';
    this.configPath = this.resolveConfigPath();
    this.requiredKeys = [
      'API_URL',
      'WEBSOCKET_URL',
      'APP_NAME',
      'APP_VERSION'
    ];
    
    // Load configuration immediately
    this.loadConfiguration();
  }

  /**
   * Resolve the path to the appropriate configuration file
   * @returns {string} Path to the configuration file
   */
  resolveConfigPath() {
    const appPath = app ? app.getAppPath() : process.cwd();
    const envFile = `.env.${this.environment}`;
    const configFile = path.join(appPath, envFile);
    
    // Check if environment-specific config exists
    if (fs.existsSync(configFile)) {
      return configFile;
    }
    
    // Fallback to .env.development
    const fallbackFile = path.join(appPath, '.env.development');
    if (fs.existsSync(fallbackFile)) {
      console.warn(`Config file ${envFile} not found, using .env.development as fallback`);
      return fallbackFile;
    }
    
    // Final fallback - no config file found
    console.warn('No configuration file found, using default values');
    return null;
  }

  /**
   * Load configuration from environment file
   */
  loadConfiguration() {
    try {
      // Start with environment variables
      this.config = { ...process.env };
      
      // Load from .env file if available
      if (this.configPath && fs.existsSync(this.configPath)) {
        const envContent = fs.readFileSync(this.configPath, 'utf8');
        const parsed = this.parseEnvFile(envContent);
        
        // Override with file values (environment variables take precedence)
        Object.keys(parsed).forEach(key => {
          if (!process.env[key]) {
            this.config[key] = parsed[key];
          }
        });
      }
      
      // Apply defaults for missing values
      this.applyDefaults();
      
      // Validate required configuration
      this.validateConfiguration();
      
      // Transform values to appropriate types
      this.transformValues();
      
      this.isLoaded = true;
      console.log(`Configuration loaded successfully from ${this.environment} environment`);
      
    } catch (error) {
      console.error('Failed to load configuration:', error);
      this.loadFallbackConfiguration();
    }
  }

  /**
   * Parse .env file content into key-value pairs
   * @param {string} content - Content of the .env file
   * @returns {object} Parsed configuration object
   */
  parseEnvFile(content) {
    const config = {};
    const lines = content.split('\n');
    
    for (const line of lines) {
      // Skip empty lines and comments
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) {
        continue;
      }
      
      // Parse key=value pairs
      const equalIndex = trimmed.indexOf('=');
      if (equalIndex > 0) {
        const key = trimmed.substring(0, equalIndex).trim();
        let value = trimmed.substring(equalIndex + 1).trim();
        
        // Remove quotes if present
        if ((value.startsWith('"') && value.endsWith('"')) ||
            (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1);
        }
        
        config[key] = value;
      }
    }
    
    return config;
  }

  /**
   * Apply default values for missing configuration keys
   */
  applyDefaults() {
    const defaults = {
      // Environment
      NODE_ENV: 'development',
      
      // API Configuration
      API_URL: 'http://localhost:3001',
      API_TIMEOUT: '10000',
      API_USER_AGENT: 'RestaurantPrint-Pro-Desktop',
      
      // License & Authentication
      LICENSE_MODE: 'development',
      LICENSE_VALIDATION_ENDPOINT: '/api/v1/printer-licenses/validate',
      PRINTER_REGISTRATION_ENDPOINT: '/api/v1/printers/register',
      
      // WebSocket Configuration
      WEBSOCKET_URL: 'http://localhost:3001',
      WEBSOCKET_NAMESPACE: '/printing-ws',
      WEBSOCKET_RECONNECTION: 'true',
      WEBSOCKET_RECONNECT_ATTEMPTS: '10',
      WEBSOCKET_RECONNECT_DELAY: '1000',
      WEBSOCKET_RECONNECT_MAX_DELAY: '30000',
      WEBSOCKET_TIMEOUT: '20000',
      WEBSOCKET_CONNECTION_TIMEOUT: '20000',
      
      // Service Discovery
      SERVICE_DISCOVERY_ENABLED: 'true',
      SERVICE_DISCOVERY_TIMEOUT: '10000',
      SERVICE_DISCOVERY_INTERVAL: '30000',
      SERVICE_HEALTH_CHECK_INTERVAL: '15000',
      SERVICE_MAX_RETRIES: '3',
      SERVICE_RETRY_DELAY: '2000',
      SERVICE_LOAD_BALANCE_STRATEGY: 'priority',
      SERVICE_FALLBACK_URLS: '',
      
      // Printer Discovery
      PRINTER_HEARTBEAT_INTERVAL: '30000',
      PRINTER_DISCOVERY_TIMEOUT: '10000',
      PRINTER_DISCOVERY_METHODS: 'usb,network,bluetooth,system',
      PRINTER_DISCOVERY_INTERVAL: '30000',
      
      // Application Configuration
      APP_NAME: 'RestaurantPrint Pro',
      APP_DESCRIPTION: 'Enterprise Printer Management',
      APP_VERSION: '2.0.0',
      APP_TRAY_TOOLTIP: 'RestaurantPrint Pro - Enterprise Printer Management',
      
      // Window Configuration
      WINDOW_WIDTH: '1400',
      WINDOW_HEIGHT: '900',
      WINDOW_MIN_WIDTH: '1000',
      WINDOW_MIN_HEIGHT: '700',
      WINDOW_SHOW_DEV_TOOLS: 'false',
      WINDOW_AUTO_HIDE_MENU: 'true',
      
      // Auto-updater Configuration
      AUTO_UPDATER_ENABLED: 'true',
      AUTO_UPDATER_AUTO_DOWNLOAD: 'true',
      AUTO_UPDATER_AUTO_INSTALL: 'true',
      AUTO_UPDATER_CHECK_INTERVAL: '14400000',
      
      // Auto-launch Configuration
      AUTO_LAUNCH_ENABLED: 'false',
      AUTO_LAUNCH_NAME: 'RestaurantPrint Pro',
      
      // Logging Configuration
      LOG_LEVEL: 'info',
      LOG_FILE_LEVEL: 'info',
      LOG_CONSOLE_LEVEL: 'debug',
      LOG_MAX_FILES: '7',
      LOG_MAX_SIZE: '10MB',
      
      // Printer Configuration
      PRINTER_TEST_TIMEOUT: '30000',
      PRINTER_CONNECTION_TIMEOUT: '10000',
      PRINTER_DEFAULT_TYPE: 'thermal',
      PRINTER_DEFAULT_CONNECTION: 'usb',
      PRINTER_QUEUE_SIZE: '100',
      
      // Security Configuration
      ENCRYPTION_ENABLED: 'true',
      LICENSE_STORAGE_ENCRYPTED: 'true',
      DEVICE_ID_SALT: 'restaurant-print-pro',
      
      // Development Configuration
      DEV_TOOLS_ENABLED: 'false',
      DEV_TOOLS_AUTO_OPEN: 'false',
      HOT_RELOAD_ENABLED: 'false',
      
      // Network Configuration
      MAX_CONCURRENT_CONNECTIONS: '10',
      CONNECTION_POOL_SIZE: '5',
      REQUEST_RETRY_ATTEMPTS: '3',
      REQUEST_RETRY_DELAY: '1000'
    };
    
    // Apply defaults for missing keys
    Object.keys(defaults).forEach(key => {
      if (this.config[key] === undefined) {
        this.config[key] = defaults[key];
      }
    });
  }

  /**
   * Validate that required configuration keys are present
   * @throws {Error} If required configuration is missing
   */
  validateConfiguration() {
    const missing = [];
    
    for (const key of this.requiredKeys) {
      if (!this.config[key] || this.config[key].trim() === '') {
        missing.push(key);
      }
    }
    
    if (missing.length > 0) {
      throw new Error(`Missing required configuration keys: ${missing.join(', ')}`);
    }
    
    // Validate URL formats
    this.validateUrl('API_URL');
    this.validateUrl('WEBSOCKET_URL');
    
    // Validate numeric values
    this.validateNumeric('API_TIMEOUT', 1000, 60000);
    this.validateNumeric('WINDOW_WIDTH', 800, 3840);
    this.validateNumeric('WINDOW_HEIGHT', 600, 2160);
  }

  /**
   * Validate URL format
   * @param {string} key - Configuration key to validate
   */
  validateUrl(key) {
    try {
      new URL(this.config[key]);
    } catch (error) {
      throw new Error(`Invalid URL format for ${key}: ${this.config[key]}`);
    }
  }

  /**
   * Validate numeric values with ranges
   * @param {string} key - Configuration key to validate
   * @param {number} min - Minimum allowed value
   * @param {number} max - Maximum allowed value
   */
  validateNumeric(key, min, max) {
    const value = parseInt(this.config[key]);
    if (isNaN(value) || value < min || value > max) {
      throw new Error(`Invalid numeric value for ${key}: ${this.config[key]} (must be between ${min} and ${max})`);
    }
  }

  /**
   * Transform string values to appropriate types
   */
  transformValues() {
    // Boolean transformations
    const booleanKeys = [
      'WEBSOCKET_RECONNECTION', 'SERVICE_DISCOVERY_ENABLED', 'AUTO_UPDATER_ENABLED',
      'AUTO_UPDATER_AUTO_DOWNLOAD', 'AUTO_UPDATER_AUTO_INSTALL', 'AUTO_LAUNCH_ENABLED',
      'WINDOW_SHOW_DEV_TOOLS', 'WINDOW_AUTO_HIDE_MENU', 'ENCRYPTION_ENABLED',
      'LICENSE_STORAGE_ENCRYPTED', 'DEV_TOOLS_ENABLED', 'DEV_TOOLS_AUTO_OPEN', 'HOT_RELOAD_ENABLED'
    ];
    
    booleanKeys.forEach(key => {
      if (this.config[key] !== undefined) {
        this.config[key] = this.parseBoolean(this.config[key]);
      }
    });
    
    // Numeric transformations
    const numericKeys = [
      'API_TIMEOUT', 'WEBSOCKET_RECONNECT_ATTEMPTS', 'WEBSOCKET_RECONNECT_DELAY',
      'WEBSOCKET_RECONNECT_MAX_DELAY', 'WEBSOCKET_TIMEOUT', 'WEBSOCKET_CONNECTION_TIMEOUT',
      'SERVICE_DISCOVERY_TIMEOUT', 'SERVICE_DISCOVERY_INTERVAL', 'SERVICE_HEALTH_CHECK_INTERVAL',
      'SERVICE_MAX_RETRIES', 'SERVICE_RETRY_DELAY',
      'PRINTER_HEARTBEAT_INTERVAL', 'PRINTER_DISCOVERY_TIMEOUT', 'PRINTER_DISCOVERY_INTERVAL',
      'WINDOW_WIDTH', 'WINDOW_HEIGHT', 'WINDOW_MIN_WIDTH', 'WINDOW_MIN_HEIGHT',
      'AUTO_UPDATER_CHECK_INTERVAL', 'PRINTER_TEST_TIMEOUT', 'PRINTER_CONNECTION_TIMEOUT',
      'PRINTER_QUEUE_SIZE', 'MAX_CONCURRENT_CONNECTIONS', 'CONNECTION_POOL_SIZE',
      'REQUEST_RETRY_ATTEMPTS', 'REQUEST_RETRY_DELAY'
    ];
    
    numericKeys.forEach(key => {
      if (this.config[key] !== undefined) {
        const value = parseInt(this.config[key]);
        if (!isNaN(value)) {
          this.config[key] = value;
        }
      }
    });
    
    // Handle special case for Infinity
    if (this.config.WEBSOCKET_RECONNECT_ATTEMPTS === 'Infinity') {
      this.config.WEBSOCKET_RECONNECT_ATTEMPTS = Infinity;
    }
    
    // Array transformations
    const arrayKeys = ['PRINTER_DISCOVERY_METHODS'];
    arrayKeys.forEach(key => {
      if (this.config[key] && typeof this.config[key] === 'string') {
        this.config[key] = this.config[key].split(',').map(s => s.trim());
      }
    });
  }

  /**
   * Parse boolean values from strings
   * @param {string|boolean} value - Value to parse
   * @returns {boolean} Parsed boolean value
   */
  parseBoolean(value) {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') {
      return value.toLowerCase() === 'true' || value === '1' || value.toLowerCase() === 'yes';
    }
    return false;
  }

  /**
   * Load fallback configuration when primary loading fails
   */
  loadFallbackConfiguration() {
    console.warn('Loading fallback configuration due to errors');
    
    this.config = {
      NODE_ENV: 'development',
      API_URL: 'http://localhost:3001',
      API_TIMEOUT: 10000,
      WEBSOCKET_URL: 'http://localhost:3001',
      APP_NAME: 'RestaurantPrint Pro',
      APP_VERSION: '2.0.0',
      WINDOW_WIDTH: 1400,
      WINDOW_HEIGHT: 900,
      LOG_LEVEL: 'info'
    };
    
    this.isLoaded = true;
  }

  /**
   * Get configuration value by key
   * @param {string} key - Configuration key
   * @param {*} defaultValue - Default value if key not found
   * @returns {*} Configuration value
   */
  get(key, defaultValue = undefined) {
    return this.config[key] !== undefined ? this.config[key] : defaultValue;
  }

  /**
   * Get all configuration as object
   * @returns {object} Complete configuration object
   */
  getAll() {
    return { ...this.config };
  }

  /**
   * Get configuration for a specific category
   * @param {string} prefix - Configuration key prefix
   * @returns {object} Configuration object for the category
   */
  getCategory(prefix) {
    const category = {};
    Object.keys(this.config).forEach(key => {
      if (key.startsWith(prefix)) {
        const categoryKey = key.replace(prefix, '').toLowerCase();
        category[categoryKey] = this.config[key];
      }
    });
    return category;
  }

  /**
   * Get API configuration
   * @returns {object} API configuration object
   */
  getApiConfig() {
    return {
      url: this.get('API_URL'),
      timeout: this.get('API_TIMEOUT'),
      userAgent: this.get('API_USER_AGENT'),
      licenseValidationEndpoint: this.get('LICENSE_VALIDATION_ENDPOINT'),
      printerRegistrationEndpoint: this.get('PRINTER_REGISTRATION_ENDPOINT'),
      retryAttempts: this.get('REQUEST_RETRY_ATTEMPTS'),
      retryDelay: this.get('REQUEST_RETRY_DELAY')
    };
  }

  /**
   * Get WebSocket configuration
   * @returns {object} WebSocket configuration object
   */
  getWebSocketConfig() {
    return {
      url: this.get('WEBSOCKET_URL'),
      namespace: this.get('WEBSOCKET_NAMESPACE'),
      reconnection: this.get('WEBSOCKET_RECONNECTION'),
      reconnectionAttempts: this.get('WEBSOCKET_RECONNECT_ATTEMPTS'),
      reconnectionDelay: this.get('WEBSOCKET_RECONNECT_DELAY'),
      reconnectionDelayMax: this.get('WEBSOCKET_RECONNECT_MAX_DELAY'),
      timeout: this.get('WEBSOCKET_TIMEOUT'),
      connectionTimeout: this.get('WEBSOCKET_CONNECTION_TIMEOUT')
    };
  }

  /**
   * Get window configuration
   * @returns {object} Window configuration object
   */
  getWindowConfig() {
    return {
      width: this.get('WINDOW_WIDTH'),
      height: this.get('WINDOW_HEIGHT'),
      minWidth: this.get('WINDOW_MIN_WIDTH'),
      minHeight: this.get('WINDOW_MIN_HEIGHT'),
      showDevTools: this.get('WINDOW_SHOW_DEV_TOOLS'),
      autoHideMenuBar: this.get('WINDOW_AUTO_HIDE_MENU')
    };
  }

  /**
   * Get printer configuration
   * @returns {object} Printer configuration object
   */
  getPrinterConfig() {
    return {
      testTimeout: this.get('PRINTER_TEST_TIMEOUT'),
      connectionTimeout: this.get('PRINTER_CONNECTION_TIMEOUT'),
      defaultType: this.get('PRINTER_DEFAULT_TYPE'),
      defaultConnection: this.get('PRINTER_DEFAULT_CONNECTION'),
      queueSize: this.get('PRINTER_QUEUE_SIZE'),
      discoveryMethods: this.get('PRINTER_DISCOVERY_METHODS'),
      discoveryInterval: this.get('PRINTER_DISCOVERY_INTERVAL'),
      discoveryTimeout: this.get('PRINTER_DISCOVERY_TIMEOUT'),
      heartbeatInterval: this.get('PRINTER_HEARTBEAT_INTERVAL')
    };
  }

  /**
   * Get service discovery configuration
   * @returns {object} Service discovery configuration object
   */
  getServiceDiscoveryConfig() {
    return {
      enabled: this.get('SERVICE_DISCOVERY_ENABLED'),
      timeout: this.get('SERVICE_DISCOVERY_TIMEOUT'),
      interval: this.get('SERVICE_DISCOVERY_INTERVAL'),
      healthCheckInterval: this.get('SERVICE_HEALTH_CHECK_INTERVAL'),
      maxRetries: this.get('SERVICE_MAX_RETRIES'),
      retryDelay: this.get('SERVICE_RETRY_DELAY'),
      loadBalanceStrategy: this.get('SERVICE_LOAD_BALANCE_STRATEGY'),
      fallbackUrls: this.get('SERVICE_FALLBACK_URLS')?.split(',').map(s => s.trim()).filter(Boolean) || []
    };
  }

  /**
   * Get logging configuration
   * @returns {object} Logging configuration object
   */
  getLogConfig() {
    return {
      level: this.get('LOG_LEVEL'),
      fileLevel: this.get('LOG_FILE_LEVEL'),
      consoleLevel: this.get('LOG_CONSOLE_LEVEL'),
      maxFiles: this.get('LOG_MAX_FILES'),
      maxSize: this.get('LOG_MAX_SIZE')
    };
  }

  /**
   * Check if configuration is loaded
   * @returns {boolean} True if configuration is loaded
   */
  isConfigurationLoaded() {
    return this.isLoaded;
  }

  /**
   * Reload configuration (useful for development)
   */
  reload() {
    this.isLoaded = false;
    this.config = {};
    this.loadConfiguration();
  }

  /**
   * Get environment name
   * @returns {string} Current environment
   */
  getEnvironment() {
    return this.environment;
  }

  /**
   * Check if running in development mode
   * @returns {boolean} True if in development mode
   */
  isDevelopment() {
    return this.environment === 'development' || this.get('NODE_ENV') === 'development';
  }

  /**
   * Check if running in production mode
   * @returns {boolean} True if in production mode
   */
  isProduction() {
    return this.environment === 'production' || this.get('NODE_ENV') === 'production';
  }

  /**
   * Get configuration summary for debugging
   * @returns {object} Configuration summary
   */
  getConfigSummary() {
    return {
      environment: this.environment,
      configPath: this.configPath,
      isLoaded: this.isLoaded,
      apiUrl: this.get('API_URL'),
      websocketUrl: this.get('WEBSOCKET_URL'),
      appName: this.get('APP_NAME'),
      appVersion: this.get('APP_VERSION'),
      logLevel: this.get('LOG_LEVEL')
    };
  }
}

// Create singleton instance
const configManager = new ConfigManager();

module.exports = configManager;