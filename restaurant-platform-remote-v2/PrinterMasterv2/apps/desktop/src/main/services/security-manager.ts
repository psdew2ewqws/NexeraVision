import { app, safeStorage } from 'electron';
import { randomBytes, createHash, timingSafeEqual } from 'crypto';
import log from 'electron-log';

export class SecurityManager {
  private initialized = false;
  private encryptionKey?: Buffer;
  private readonly saltLength = 32;
  private readonly keyLength = 32;

  async initialize(): Promise<void> {
    try {
      log.info('Initializing SecurityManager...');
      
      // Generate or load encryption key
      await this.initializeEncryption();
      
      // Set up security policies
      this.setupSecurityPolicies();
      
      this.initialized = true;
      log.info('SecurityManager initialized successfully');
    } catch (error) {
      log.error('Failed to initialize SecurityManager:', error);
      throw error;
    }
  }

  encryptData(data: string): string {
    if (!this.initialized) {
      throw new Error('SecurityManager not initialized');
    }
    
    try {
      if (safeStorage.isEncryptionAvailable()) {
        const encrypted = safeStorage.encryptString(data);
        return encrypted.toString('base64');
      } else {
        // Fallback encryption method
        return this.fallbackEncrypt(data);
      }
    } catch (error) {
      log.error('Failed to encrypt data:', error);
      throw error;
    }
  }

  decryptData(encryptedData: string): string {
    if (!this.initialized) {
      throw new Error('SecurityManager not initialized');
    }
    
    try {
      if (safeStorage.isEncryptionAvailable()) {
        const buffer = Buffer.from(encryptedData, 'base64');
        return safeStorage.decryptString(buffer);
      } else {
        // Fallback decryption method
        return this.fallbackDecrypt(encryptedData);
      }
    } catch (error) {
      log.error('Failed to decrypt data:', error);
      throw error;
    }
  }

  hashPassword(password: string, salt?: string): { hash: string; salt: string } {
    const actualSalt = salt || randomBytes(this.saltLength).toString('hex');
    const hash = createHash('sha256')
      .update(password + actualSalt)
      .digest('hex');
    
    return { hash, salt: actualSalt };
  }

  verifyPassword(password: string, hash: string, salt: string): boolean {
    const { hash: computedHash } = this.hashPassword(password, salt);
    
    // Use timing-safe comparison
    return timingSafeEqual(
      Buffer.from(hash, 'hex'),
      Buffer.from(computedHash, 'hex')
    );
  }

  generateSecureToken(length: number = 32): string {
    return randomBytes(length).toString('hex');
  }

  validateInput(input: string, allowedPattern: RegExp): boolean {
    return allowedPattern.test(input);
  }

  sanitizeInput(input: string): string {
    // Remove potentially dangerous characters
    return input
      .replace(/[<>"'&]/g, '') // Remove HTML/XML characters
      .replace(/[\x00-\x1F\x7F]/g, '') // Remove control characters
      .trim();
  }

  isValidUrl(url: string): boolean {
    try {
      const parsed = new URL(url);
      return ['http:', 'https:', 'ws:', 'wss:'].includes(parsed.protocol);
    } catch {
      return false;
    }
  }

  isValidLicenseKey(licenseKey: string): boolean {
    // License key format: XXXX-XXXX-XXXX-XXXX (alphanumeric)
    const pattern = /^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/;
    return pattern.test(licenseKey.toUpperCase());
  }

  private async initializeEncryption(): Promise<void> {
    try {
      // Check if system encryption is available
      if (safeStorage.isEncryptionAvailable()) {
        log.info('System encryption is available');
      } else {
        log.warn('System encryption not available, using fallback');
        // Generate a key for fallback encryption
        this.encryptionKey = randomBytes(this.keyLength);
      }
    } catch (error) {
      log.error('Failed to initialize encryption:', error);
      throw error;
    }
  }

  private setupSecurityPolicies(): void {
    // Set app security policies
    app.commandLine.appendSwitch('disable-web-security', 'false');
    app.commandLine.appendSwitch('disable-features', 'VizDisplayCompositor');
    
    // Disable node integration in renderer processes by default
    app.on('web-contents-created', (_, contents) => {
      contents.on('new-window', (event, navigationUrl) => {
        // Prevent new window creation unless explicitly allowed
        event.preventDefault();
        log.warn('Blocked new window creation:', navigationUrl);
      });
      
      contents.on('will-navigate', (event, navigationUrl) => {
        // Allow navigation only to allowed URLs
        if (!this.isAllowedNavigation(navigationUrl)) {
          event.preventDefault();
          log.warn('Blocked navigation to:', navigationUrl);
        }
      });
    });
  }

  private isAllowedNavigation(url: string): boolean {
    try {
      const parsed = new URL(url);
      
      // Allow localhost for development
      if (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1') {
        return true;
      }
      
      // Allow file:// for local app files
      if (parsed.protocol === 'file:') {
        return true;
      }
      
      // Add other allowed domains here
      const allowedDomains = [
        'your-api-domain.com',
        'update-server.com',
      ];
      
      return allowedDomains.includes(parsed.hostname);
    } catch {
      return false;
    }
  }

  private fallbackEncrypt(data: string): string {
    if (!this.encryptionKey) {
      throw new Error('Encryption key not available');
    }
    
    // Simple XOR encryption (not recommended for production)
    const buffer = Buffer.from(data, 'utf8');
    const encrypted = Buffer.alloc(buffer.length);
    
    for (let i = 0; i < buffer.length; i++) {
      encrypted[i] = buffer[i] ^ this.encryptionKey[i % this.encryptionKey.length];
    }
    
    return encrypted.toString('base64');
  }

  private fallbackDecrypt(encryptedData: string): string {
    if (!this.encryptionKey) {
      throw new Error('Encryption key not available');
    }
    
    const encrypted = Buffer.from(encryptedData, 'base64');
    const decrypted = Buffer.alloc(encrypted.length);
    
    for (let i = 0; i < encrypted.length; i++) {
      decrypted[i] = encrypted[i] ^ this.encryptionKey[i % this.encryptionKey.length];
    }
    
    return decrypted.toString('utf8');
  }

  isInitialized(): boolean {
    return this.initialized;
  }
}