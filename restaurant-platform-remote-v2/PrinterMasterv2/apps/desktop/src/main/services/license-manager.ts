import { EventEmitter } from 'events';
import { safeStorage } from 'electron';
import log from 'electron-log';
import { License } from '../../types';
import { APIService } from './api-service';

export class LicenseManager extends EventEmitter {
  private currentLicense: License | null = null;
  private validationTimer?: NodeJS.Timeout;
  private initialized = false;
  private apiService: APIService;

  constructor(apiService: APIService) {
    super();
    this.apiService = apiService;
  }

  async initialize(): Promise<void> {
    try {
      log.info('Initializing LicenseManager...');
      
      // Load stored license if any
      await this.loadStoredLicense();
      
      this.initialized = true;
      log.info('LicenseManager initialized successfully');
    } catch (error) {
      log.error('Failed to initialize LicenseManager:', error);
      throw error;
    }
  }

  async shutdown(): Promise<void> {
    log.info('Shutting down LicenseManager...');
    
    if (this.validationTimer) {
      clearInterval(this.validationTimer);
    }
    
    this.removeAllListeners();
    this.initialized = false;
  }

  async validateLicense(licenseKey: string): Promise<License> {
    try {
      log.info('Validating license key...');
      
      // Validate license format first
      if (!this.isValidLicenseFormat(licenseKey)) {
        throw new Error('Invalid license key format');
      }
      
      // Get device info for validation
      const deviceInfo = await this.getDeviceInfo();
      
      // Call the backend API to validate license
      const response = await this.apiService.validateLicense(licenseKey, deviceInfo);
      
      if (!response.success || !response.data) {
        throw new Error(response.error || 'License validation failed');
      }
      
      const validatedLicense = response.data;
      this.currentLicense = validatedLicense;
      await this.storeLicense(validatedLicense);
      
      this.emit('license-validated', validatedLicense);
      log.info('License validated successfully');
      
      return validatedLicense;
    } catch (error) {
      log.error('License validation failed:', error);
      this.emit('license-invalid', error.message);
      throw error;
    }
  }

  async getCurrentLicense(): Promise<License | null> {
    return this.currentLicense;
  }

  async refreshLicense(): Promise<License> {
    if (!this.currentLicense) {
      throw new Error('No license to refresh');
    }
    
    return this.validateLicense(this.currentLicense.licenseKey);
  }

  isLicenseValid(): boolean {
    if (!this.currentLicense) {
      return false;
    }
    
    // Check if expired
    if (this.currentLicense.expiresAt) {
      const expiryDate = new Date(this.currentLicense.expiresAt);
      if (expiryDate < new Date()) {
        return false;
      }
    }
    
    return this.currentLicense.status === 'active';
  }

  clearLicense(): void {
    this.currentLicense = null;
    this.clearStoredLicense();
    this.emit('license-cleared');
    log.info('License cleared');
  }

  private async loadStoredLicense(): Promise<void> {
    try {
      // In a real implementation, this would load from secure storage
      // For now, we'll just set it to null
      this.currentLicense = null;
      log.info('No stored license found');
    } catch (error) {
      log.error('Failed to load stored license:', error);
    }
  }

  private async storeLicense(license: License): Promise<void> {
    try {
      // In a real implementation, this would store to secure storage
      // For now, we'll just keep it in memory
      log.info('License stored successfully');
    } catch (error) {
      log.error('Failed to store license:', error);
    }
  }

  private clearStoredLicense(): void {
    try {
      // In a real implementation, this would clear from secure storage
      log.info('Stored license cleared');
    } catch (error) {
      log.error('Failed to clear stored license:', error);
    }
  }

  private isValidLicenseFormat(licenseKey: string): boolean {
    // Expected format: UUID (branch ID)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(licenseKey);
  }

  isInitialized(): boolean {
    return this.initialized;
  }

  private async getDeviceInfo(): Promise<any> {
    const os = require('os');
    const crypto = require('crypto');
    
    // Generate a unique device identifier
    const hostname = os.hostname();
    const platform = os.platform();
    const arch = os.arch();
    const totalmem = os.totalmem();
    
    // Create a device fingerprint
    const deviceId = crypto
      .createHash('sha256')
      .update(`${hostname}-${platform}-${arch}-${totalmem}`)
      .digest('hex');
    
    return {
      deviceId,
      hostname,
      platform,
      arch,
      totalmem,
      timestamp: new Date().toISOString(),
    };
  }
}