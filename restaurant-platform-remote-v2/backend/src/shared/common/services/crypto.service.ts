import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

export interface EncryptedData {
  encryptedData: string;
  iv: string;
  salt: string;
}

@Injectable()
export class CryptoService {
  private readonly algorithm = 'aes-256-gcm';
  private readonly keyLength = 32; // 256 bits
  private readonly ivLength = 16;  // 128 bits
  private readonly saltLength = 64; // 512 bits
  private readonly tagLength = 16;  // 128 bits

  constructor(private readonly configService: ConfigService) {}

  private deriveKey(password: string, salt: Buffer): Buffer {
    return crypto.pbkdf2Sync(password, salt, 100000, this.keyLength, 'sha256');
  }

  private getEncryptionPassword(): string {
    const password = this.configService.get<string>('DELIVERY_ENCRYPTION_KEY');
    if (!password) {
      throw new Error('DELIVERY_ENCRYPTION_KEY environment variable is required');
    }
    return password;
  }

  /**
   * Encrypt sensitive data using AES-256-GCM
   */
  encrypt(data: string): EncryptedData {
    try {
      const password = this.getEncryptionPassword();
      const salt = crypto.randomBytes(this.saltLength);
      const iv = crypto.randomBytes(this.ivLength);
      const key = this.deriveKey(password, salt);

      // Create cipher using AES-256-GCM
      const cipher = crypto.createCipheriv(this.algorithm, key, iv);
      let encrypted = cipher.update(data, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      const authTag = cipher.getAuthTag();
      const encryptedWithTag = encrypted + authTag.toString('hex');

      return {
        encryptedData: encryptedWithTag,
        iv: iv.toString('hex'),
        salt: salt.toString('hex')
      };
    } catch (error) {
      throw new Error(`Encryption failed: ${error.message}`);
    }
  }

  /**
   * Decrypt data encrypted with AES-256-GCM
   */
  decrypt(encryptedData: EncryptedData): string {
    try {
      const password = this.getEncryptionPassword();
      const salt = Buffer.from(encryptedData.salt, 'hex');
      const iv = Buffer.from(encryptedData.iv, 'hex');
      const key = this.deriveKey(password, salt);

      // Extract auth tag from encrypted data
      const encryptedWithTag = encryptedData.encryptedData;
      const encrypted = encryptedWithTag.slice(0, -this.tagLength * 2);
      const authTag = Buffer.from(encryptedWithTag.slice(-this.tagLength * 2), 'hex');

      // Create decipher using AES-256-GCM
      const decipher = crypto.createDecipheriv(this.algorithm, key, iv);
      decipher.setAuthTag(authTag);
      
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (error) {
      throw new Error(`Decryption failed: ${error.message}`);
    }
  }

  /**
   * Encrypt provider credentials safely
   */
  encryptProviderCredentials(credentials: Record<string, any>): EncryptedData {
    const credentialsString = JSON.stringify(credentials);
    return this.encrypt(credentialsString);
  }

  /**
   * Decrypt provider credentials safely
   */
  decryptProviderCredentials(encryptedCredentials: EncryptedData): Record<string, any> {
    const credentialsString = this.decrypt(encryptedCredentials);
    return JSON.parse(credentialsString);
  }

  /**
   * Generate a secure random encryption key for environment setup
   */
  static generateEncryptionKey(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Hash sensitive data for logging/comparison (one-way)
   */
  hashSensitiveData(data: string): string {
    return crypto
      .createHash('sha256')
      .update(data + this.getEncryptionPassword())
      .digest('hex')
      .slice(0, 8); // First 8 characters for reference
  }

  /**
   * Secure comparison to prevent timing attacks
   */
  safeCompare(a: string, b: string): boolean {
    if (a.length !== b.length) {
      return false;
    }
    return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
  }
}