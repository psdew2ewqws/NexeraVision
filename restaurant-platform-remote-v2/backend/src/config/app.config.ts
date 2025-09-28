import { registerAs } from '@nestjs/config';

export const appConfig = registerAs('app', () => ({
  name: process.env.APP_NAME || 'Restaurant Platform API',
  version: process.env.APP_VERSION || '1.0.0',
  environment: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT, 10) || 3002,
  url: process.env.APP_URL || 'http://localhost:3002',
  
  // Security settings (inspired by Picolinate's security config)
  security: {
    bcryptSaltRounds: parseInt(process.env.BCRYPT_SALT_ROUNDS, 10) || 12,
    corsOrigins: process.env.CORS_ORIGINS?.split(',') || [
      'http://localhost:3000',
      'http://localhost:3001',
    ],
    rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX, 10) || 1000,
    rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 900000, // 15 minutes
  },

  // Multi-tenant settings (like Picolinate's company structure)
  multiTenant: {
    enabled: true,
    headerName: 'X-Company-ID',
    branchHeaderName: 'X-Branch-ID',
    isolationLevel: 'company', // company | branch | user
  },

  // Feature flags
  features: {
    swagger: process.env.ENABLE_SWAGGER !== 'false',
    metrics: process.env.ENABLE_METRICS !== 'false',
    debugging: process.env.ENABLE_DEBUG === 'true',
    realtime: process.env.ENABLE_REALTIME !== 'false',
  },

  // External service timeouts
  timeouts: {
    database: parseInt(process.env.DATABASE_TIMEOUT, 10) || 30000,
    external: parseInt(process.env.EXTERNAL_API_TIMEOUT, 10) || 10000,
    cache: parseInt(process.env.CACHE_TIMEOUT, 10) || 5000,
  },
}));