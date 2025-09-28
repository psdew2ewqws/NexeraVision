import { Injectable, Logger } from '@nestjs/common';

interface EnvironmentConfig {
  // Core
  NODE_ENV: string;
  PORT: number;
  APP_URL: string;
  
  // Database
  DATABASE_URL: string;
  
  // JWT
  JWT_SECRET: string;
  JWT_EXPIRES_IN: string;
  JWT_REFRESH_SECRET: string;
  JWT_REFRESH_EXPIRES_IN: string;
  
  // Redis (optional for basic functionality)
  REDIS_HOST?: string;
  REDIS_PORT?: number;
  REDIS_DATABASE?: number;
  
  // Security
  BCRYPT_SALT_ROUNDS: number;
  CORS_ORIGINS: string;
  RATE_LIMIT_MAX: number;
  RATE_LIMIT_WINDOW_MS: number;
  
  // Features
  ENABLE_SWAGGER: boolean;
  ENABLE_METRICS: boolean;
  ENABLE_DEBUG: boolean;
  ENABLE_REALTIME: boolean;
  
  // Cache TTL
  CACHE_TTL_SHORT: number;
  CACHE_TTL_MEDIUM: number;
  CACHE_TTL_LONG: number;
  CACHE_TTL_MENU: number;
  CACHE_TTL_COMPANY: number;
  CACHE_TTL_USER: number;
  
  // Performance
  DATABASE_TIMEOUT: number;
  EXTERNAL_API_TIMEOUT: number;
  CACHE_TIMEOUT: number;
  
  // Multi-tenant
  ENABLE_ROW_LEVEL_SECURITY: boolean;
  
  // Logging
  DB_LOG_QUERIES: boolean;
  DB_LOG_LEVEL: string;
}

@Injectable()
export class EnvValidationService {
  private readonly logger = new Logger(EnvValidationService.name);
  private config: EnvironmentConfig;

  constructor() {
    this.validateEnvironment();
  }

  private validateEnvironment(): void {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Required variables
    const requiredVars = {
      NODE_ENV: process.env.NODE_ENV,
      PORT: process.env.PORT,
      APP_URL: process.env.APP_URL,
      DATABASE_URL: process.env.DATABASE_URL,
      JWT_SECRET: process.env.JWT_SECRET,
      JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN,
      JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET,
      JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN,
      CORS_ORIGINS: process.env.CORS_ORIGINS,
    };

    // Check required variables
    Object.entries(requiredVars).forEach(([key, value]) => {
      if (!value || value.trim() === '') {
        errors.push(`Missing required environment variable: ${key}`);
      }
    });

    // Validate specific formats
    if (process.env.PORT && isNaN(Number(process.env.PORT))) {
      errors.push('PORT must be a valid number');
    }

    if (process.env.DATABASE_URL && !process.env.DATABASE_URL.startsWith('postgresql://')) {
      errors.push('DATABASE_URL must be a valid PostgreSQL connection string');
    }

    if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
      warnings.push('JWT_SECRET should be at least 32 characters long for security');
    }

    if (process.env.JWT_REFRESH_SECRET && process.env.JWT_REFRESH_SECRET.length < 32) {
      warnings.push('JWT_REFRESH_SECRET should be at least 32 characters long for security');
    }

    // Validate production-specific settings
    if (process.env.NODE_ENV === 'production') {
      if (process.env.JWT_SECRET === 'your-super-secret-jwt-key-change-in-production-2024') {
        errors.push('JWT_SECRET must be changed from default value in production');
      }
      if (process.env.JWT_REFRESH_SECRET === 'your-refresh-secret-key') {
        errors.push('JWT_REFRESH_SECRET must be changed from default value in production');
      }
      if (!process.env.ENABLE_DEBUG || process.env.ENABLE_DEBUG === 'true') {
        warnings.push('ENABLE_DEBUG should be false in production');
      }
      if (!process.env.ENABLE_SWAGGER || process.env.ENABLE_SWAGGER === 'true') {
        warnings.push('ENABLE_SWAGGER should be false in production for security');
      }
    }

    // Build configuration object with defaults
    this.config = {
      // Core
      NODE_ENV: process.env.NODE_ENV || 'development',
      PORT: Number(process.env.PORT) || 3002,
      APP_URL: process.env.APP_URL || 'http://localhost:3002',
      
      // Database
      DATABASE_URL: process.env.DATABASE_URL || '',
      
      // JWT
      JWT_SECRET: process.env.JWT_SECRET || '',
      JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '30d',
      JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || '',
      JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || '365d',
      
      // Redis
      REDIS_HOST: process.env.REDIS_HOST,
      REDIS_PORT: process.env.REDIS_PORT ? Number(process.env.REDIS_PORT) : undefined,
      REDIS_DATABASE: process.env.REDIS_DATABASE ? Number(process.env.REDIS_DATABASE) : undefined,
      
      // Security
      BCRYPT_SALT_ROUNDS: Number(process.env.BCRYPT_SALT_ROUNDS) || 12,
      CORS_ORIGINS: process.env.CORS_ORIGINS || 'http://localhost:3001',
      RATE_LIMIT_MAX: Number(process.env.RATE_LIMIT_MAX) || 1000,
      RATE_LIMIT_WINDOW_MS: Number(process.env.RATE_LIMIT_WINDOW_MS) || 900000,
      
      // Features
      ENABLE_SWAGGER: process.env.ENABLE_SWAGGER !== 'false',
      ENABLE_METRICS: process.env.ENABLE_METRICS !== 'false',
      ENABLE_DEBUG: process.env.ENABLE_DEBUG !== 'false',
      ENABLE_REALTIME: process.env.ENABLE_REALTIME !== 'false',
      
      // Cache TTL
      CACHE_TTL_SHORT: Number(process.env.CACHE_TTL_SHORT) || 60,
      CACHE_TTL_MEDIUM: Number(process.env.CACHE_TTL_MEDIUM) || 300,
      CACHE_TTL_LONG: Number(process.env.CACHE_TTL_LONG) || 3600,
      CACHE_TTL_MENU: Number(process.env.CACHE_TTL_MENU) || 900,
      CACHE_TTL_COMPANY: Number(process.env.CACHE_TTL_COMPANY) || 3600,
      CACHE_TTL_USER: Number(process.env.CACHE_TTL_USER) || 1800,
      
      // Performance
      DATABASE_TIMEOUT: Number(process.env.DATABASE_TIMEOUT) || 30000,
      EXTERNAL_API_TIMEOUT: Number(process.env.EXTERNAL_API_TIMEOUT) || 10000,
      CACHE_TIMEOUT: Number(process.env.CACHE_TIMEOUT) || 5000,
      
      // Multi-tenant
      ENABLE_ROW_LEVEL_SECURITY: process.env.ENABLE_ROW_LEVEL_SECURITY !== 'false',
      
      // Logging
      DB_LOG_QUERIES: process.env.DB_LOG_QUERIES === 'true',
      DB_LOG_LEVEL: process.env.DB_LOG_LEVEL || 'info',
    };

    // Log results
    if (errors.length > 0) {
      this.logger.error('❌ Environment validation failed:');
      errors.forEach(error => this.logger.error(`  - ${error}`));
      throw new Error(`Environment validation failed: ${errors.join(', ')}`);
    }

    if (warnings.length > 0) {
      this.logger.warn('⚠️ Environment validation warnings:');
      warnings.forEach(warning => this.logger.warn(`  - ${warning}`));
    }

    this.logger.log('✅ Environment validation passed');
    this.logger.log(`🚀 Starting server in ${this.config.NODE_ENV} mode on port ${this.config.PORT}`);
  }

  getConfig(): EnvironmentConfig {
    return this.config;
  }

  get(key: keyof EnvironmentConfig): any {
    return this.config[key];
  }

  isDevelopment(): boolean {
    return this.config.NODE_ENV === 'development';
  }

  isProduction(): boolean {
    return this.config.NODE_ENV === 'production';
  }

  isTest(): boolean {
    return this.config.NODE_ENV === 'test';
  }
}