# PrinterMaster Configuration Management

## Overview

This document describes the configuration management system implemented for the RestaurantPrint Pro Desktop application. The system provides dynamic configuration loading with environment-specific settings and comprehensive validation.

## Configuration Files

### Environment Files

- `.env.development` - Development environment settings
- `.env.production` - Production environment settings  
- `.env.example` - Template file with all available configuration options

### Configuration Manager

The configuration manager is located at `services/config-manager.js` and provides:

- Dynamic environment detection and loading
- Configuration validation with required key checking
- Type conversion (strings to numbers, booleans, arrays)
- Fallback configuration for error recovery
- Category-based configuration access

## Configuration Categories

### API Configuration
- `API_URL` - Backend server URL
- `API_TIMEOUT` - Request timeout in milliseconds
- `API_USER_AGENT` - HTTP User-Agent string
- `LICENSE_VALIDATION_ENDPOINT` - License validation endpoint
- `PRINTER_REGISTRATION_ENDPOINT` - Printer registration endpoint

### WebSocket Configuration
- `WEBSOCKET_URL` - WebSocket server URL
- `WEBSOCKET_NAMESPACE` - WebSocket namespace path
- `WEBSOCKET_RECONNECTION` - Enable/disable auto-reconnection
- `WEBSOCKET_RECONNECT_ATTEMPTS` - Maximum reconnection attempts
- `WEBSOCKET_RECONNECT_DELAY` - Initial reconnection delay
- `WEBSOCKET_RECONNECT_MAX_DELAY` - Maximum reconnection delay
- `WEBSOCKET_TIMEOUT` - Connection timeout
- `WEBSOCKET_CONNECTION_TIMEOUT` - Initial connection timeout

### Application Configuration
- `APP_NAME` - Application display name
- `APP_VERSION` - Application version
- `APP_DESCRIPTION` - Application description
- `APP_TRAY_TOOLTIP` - System tray tooltip text

### Window Configuration
- `WINDOW_WIDTH` - Default window width
- `WINDOW_HEIGHT` - Default window height
- `WINDOW_MIN_WIDTH` - Minimum window width
- `WINDOW_MIN_HEIGHT` - Minimum window height
- `WINDOW_SHOW_DEV_TOOLS` - Show developer tools on startup
- `WINDOW_AUTO_HIDE_MENU` - Auto-hide menu bar

### Printer Configuration
- `PRINTER_DISCOVERY_METHODS` - Supported discovery methods (usb,network,bluetooth,system)
- `PRINTER_DISCOVERY_INTERVAL` - Discovery polling interval
- `PRINTER_DISCOVERY_TIMEOUT` - Discovery operation timeout
- `PRINTER_HEARTBEAT_INTERVAL` - Printer status check interval
- `PRINTER_TEST_TIMEOUT` - Printer test timeout
- `PRINTER_CONNECTION_TIMEOUT` - Printer connection timeout
- `PRINTER_DEFAULT_TYPE` - Default printer type
- `PRINTER_DEFAULT_CONNECTION` - Default connection type
- `PRINTER_QUEUE_SIZE` - Maximum print queue size

### Logging Configuration
- `LOG_LEVEL` - General logging level
- `LOG_FILE_LEVEL` - File logging level
- `LOG_CONSOLE_LEVEL` - Console logging level
- `LOG_MAX_FILES` - Maximum log file retention
- `LOG_MAX_SIZE` - Maximum log file size

### Auto-Updater Configuration
- `AUTO_UPDATER_ENABLED` - Enable/disable auto-updater
- `AUTO_UPDATER_AUTO_DOWNLOAD` - Auto-download updates
- `AUTO_UPDATER_AUTO_INSTALL` - Auto-install on quit
- `AUTO_UPDATER_CHECK_INTERVAL` - Update check interval
- `UPDATE_SERVER_URL` - Update server URL

### Security Configuration
- `ENCRYPTION_ENABLED` - Enable data encryption
- `LICENSE_STORAGE_ENCRYPTED` - Encrypt license storage
- `DEVICE_ID_SALT` - Salt for device ID generation

### Development Configuration
- `DEV_TOOLS_ENABLED` - Enable developer tools
- `DEV_TOOLS_AUTO_OPEN` - Auto-open dev tools
- `HOT_RELOAD_ENABLED` - Enable hot reloading

## Usage

### Accessing Configuration

```javascript
const config = require('./services/config-manager.js');

// Get single values
const appName = config.get('APP_NAME');
const apiUrl = config.get('API_URL');

// Get with default fallback
const timeout = config.get('CUSTOM_TIMEOUT', 5000);

// Get configuration categories
const apiConfig = config.getApiConfig();
const wsConfig = config.getWebSocketConfig();
const windowConfig = config.getWindowConfig();
const printerConfig = config.getPrinterConfig();
const logConfig = config.getLogConfig();

// Environment checks
if (config.isDevelopment()) {
  // Development-specific code
}

if (config.isProduction()) {
  // Production-specific code
}
```

### Configuration Methods

- `get(key, defaultValue)` - Get single configuration value
- `getAll()` - Get complete configuration object
- `getCategory(prefix)` - Get configuration by prefix
- `getApiConfig()` - Get API-related configuration
- `getWebSocketConfig()` - Get WebSocket configuration
- `getWindowConfig()` - Get window configuration
- `getPrinterConfig()` - Get printer configuration
- `getLogConfig()` - Get logging configuration
- `isConfigurationLoaded()` - Check if config loaded successfully
- `isDevelopment()` - Check if running in development
- `isProduction()` - Check if running in production
- `getEnvironment()` - Get current environment name
- `reload()` - Reload configuration (development only)

## Environment Precedence

Configuration loading follows this precedence order:

1. Environment variables (highest priority)
2. Environment-specific .env file (e.g., .env.development)
3. Default values (lowest priority)

## Validation

The configuration manager validates:

- Required configuration keys are present
- URL formats are valid
- Numeric values are within acceptable ranges
- Boolean values are properly converted
- Array values are correctly parsed

## Error Handling

If configuration loading fails:

1. Log detailed error messages
2. Load fallback configuration with minimal required values
3. Continue application startup with degraded functionality
4. Provide clear error messages to users

## Best Practices

1. Always use the configuration manager instead of hardcoded values
2. Add new configuration keys to the `.env.example` template
3. Document configuration changes in this file
4. Test configuration changes in both development and production modes
5. Use environment variables for sensitive configuration in production
6. Validate configuration values at startup

## Migration Notes

This configuration system replaces all hardcoded values previously found in:

- `main.js` - Window dimensions, API URLs, timeouts
- `websocket-functions.js` - WebSocket URLs, intervals, connection settings
- Various other modules with embedded configuration

All configuration is now centralized and environment-aware.