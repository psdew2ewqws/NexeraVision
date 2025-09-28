import * as Joi from 'joi';

export const validationSchema = Joi.object({
  // Application
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),
  API_PORT: Joi.number().default(4000),
  API_PREFIX: Joi.string().default('api/v1'),

  // Database
  DATABASE_URL: Joi.string().required(),
  DB_HOST: Joi.string().default('localhost'),
  DB_PORT: Joi.number().default(5433),
  DB_USER: Joi.string().default('postgres'),
  DB_PASSWORD: Joi.string().required(),
  DB_NAME: Joi.string().default('integration_platform'),

  // Redis
  REDIS_URL: Joi.string().optional(),
  REDIS_HOST: Joi.string().default('localhost'),
  REDIS_PORT: Joi.number().default(6379),

  // Authentication
  JWT_SECRET: Joi.string().min(32).required(),
  JWT_EXPIRES_IN: Joi.string().default('7d'),
  REFRESH_TOKEN_EXPIRES_IN: Joi.string().default('30d'),

  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: Joi.number().default(900000),
  RATE_LIMIT_MAX_REQUESTS: Joi.number().default(100),

  // Webhooks
  WEBHOOK_TIMEOUT_MS: Joi.number().default(30000),

  // External API Keys
  FOODICS_CLIENT_ID: Joi.string().optional(),
  FOODICS_CLIENT_SECRET: Joi.string().optional(),
  MICROS_API_KEY: Joi.string().optional(),
  TABSENSE_API_KEY: Joi.string().optional(),
  ORACLE_SIMPHONY_KEY: Joi.string().optional(),
  SQUARE_APPLICATION_ID: Joi.string().optional(),
  SQUARE_ACCESS_TOKEN: Joi.string().optional(),
  TOAST_CLIENT_ID: Joi.string().optional(),
  TOAST_CLIENT_SECRET: Joi.string().optional(),

  CAREEM_API_KEY: Joi.string().optional(),
  CAREEM_SECRET: Joi.string().optional(),
  TALABAT_API_KEY: Joi.string().optional(),
  TALABAT_SECRET: Joi.string().optional(),
  JAHEZ_API_KEY: Joi.string().optional(),
  DELIVEROO_API_KEY: Joi.string().optional(),
  UBER_EATS_CLIENT_ID: Joi.string().optional(),
  UBER_EATS_CLIENT_SECRET: Joi.string().optional(),

  // Logging
  LOG_LEVEL: Joi.string()
    .valid('error', 'warn', 'info', 'http', 'verbose', 'debug', 'silly')
    .default('info'),

  // Security
  ENCRYPTION_KEY: Joi.string().length(32).optional(),
  SESSION_SECRET: Joi.string().min(32).optional(),

  // File Upload
  UPLOAD_PATH: Joi.string().default('./uploads'),
  MAX_FILE_SIZE: Joi.number().default(10485760), // 10MB
});