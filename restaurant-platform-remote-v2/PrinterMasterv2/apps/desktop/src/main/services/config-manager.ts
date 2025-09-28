import Store from 'electron-store';
import { app } from 'electron';
import { AppConfig } from '../../types';
import log from 'electron-log';

const DEFAULT_CONFIG: AppConfig = {
  licenseKey: '',
  branchId: '',
  branchName: '',
  companyId: '',
  companyName: '',
  apiBaseUrl: 'http://localhost:3001',
  qzTrayUrl: 'ws://localhost:8012',
  autoStart: false,
  monitoringInterval: 30000, // 30 seconds
  theme: 'light',
  language: 'en',
};

export class ConfigManager {
  private store: Store<AppConfig>;
  private initialized = false;

  constructor() {
    this.store = new Store<AppConfig>({
      name: 'config',
      defaults: DEFAULT_CONFIG,
      encryptionKey: 'printer-master-v2-config-key',
      cwd: app.getPath('userData'),
    });
  }

  async initialize(): Promise<void> {
    try {
      log.info('Initializing ConfigManager...');
      
      // Validate configuration
      const config = this.store.store;
      this.validateConfig(config);
      
      this.initialized = true;
      log.info('ConfigManager initialized successfully');
    } catch (error) {
      log.error('Failed to initialize ConfigManager:', error);
      throw error;
    }
  }

  async getConfig(): Promise<AppConfig> {
    if (!this.initialized) {
      await this.initialize();
    }
    return this.store.store;
  }

  async updateConfig(updates: Partial<AppConfig>): Promise<AppConfig> {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      // Validate updates
      this.validateConfigUpdates(updates);
      
      // Apply updates
      Object.entries(updates).forEach(([key, value]) => {
        if (value !== undefined) {
          this.store.set(key as keyof AppConfig, value);
        }
      });
      
      const updatedConfig = this.store.store;
      log.info('Configuration updated:', Object.keys(updates));
      
      return updatedConfig;
    } catch (error) {
      log.error('Failed to update configuration:', error);
      throw error;
    }
  }

  async resetConfig(): Promise<AppConfig> {
    try {
      this.store.clear();
      this.store.store = { ...DEFAULT_CONFIG };
      
      log.info('Configuration reset to defaults');
      return this.store.store;
    } catch (error) {
      log.error('Failed to reset configuration:', error);
      throw error;
    }
  }

  async exportConfig(): Promise<string> {
    try {
      const config = await this.getConfig();
      const exportData = {
        version: app.getVersion(),
        timestamp: new Date().toISOString(),
        config: {
          ...config,
          licenseKey: '***REDACTED***', // Don't export sensitive data
        },
      };
      
      return JSON.stringify(exportData, null, 2);
    } catch (error) {
      log.error('Failed to export configuration:', error);
      throw error;
    }
  }

  async importConfig(configJson: string): Promise<AppConfig> {
    try {
      const importData = JSON.parse(configJson);
      
      if (!importData.config) {
        throw new Error('Invalid configuration file format');
      }
      
      // Validate imported config
      this.validateConfig(importData.config);
      
      // Merge with current config (don't overwrite license key)
      const currentConfig = await this.getConfig();
      const mergedConfig = {
        ...importData.config,
        licenseKey: currentConfig.licenseKey, // Keep current license
      };
      
      // Apply imported configuration
      this.store.store = mergedConfig;
      
      log.info('Configuration imported successfully');
      return mergedConfig;
    } catch (error) {
      log.error('Failed to import configuration:', error);
      throw error;
    }
  }

  private validateConfig(config: Partial<AppConfig>): void {
    if (config.apiBaseUrl && !this.isValidUrl(config.apiBaseUrl)) {
      throw new Error('Invalid API base URL');
    }
    
    if (config.qzTrayUrl && !this.isValidWebSocketUrl(config.qzTrayUrl)) {
      throw new Error('Invalid QZ Tray URL');
    }
    
    if (config.monitoringInterval && (config.monitoringInterval < 5000 || config.monitoringInterval > 300000)) {
      throw new Error('Monitoring interval must be between 5 seconds and 5 minutes');
    }
    
    if (config.theme && !['light', 'dark'].includes(config.theme)) {
      throw new Error('Theme must be either "light" or "dark"');
    }
  }

  private validateConfigUpdates(updates: Partial<AppConfig>): void {
    this.validateConfig(updates);
  }

  private isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  private isValidWebSocketUrl(url: string): boolean {
    try {
      const parsed = new URL(url);
      return parsed.protocol === 'ws:' || parsed.protocol === 'wss:';
    } catch {
      return false;
    }
  }
}