import { registerAs } from '@nestjs/config';

export default registerAs('integration', () => ({
  // NEXARA Integration Platform Configuration
  nexara: {
    baseUrl: process.env.NEXARA_BASE_URL || 'http://localhost:3002',
    timeout: parseInt(process.env.NEXARA_TIMEOUT || '30000'),
    maxRetries: parseInt(process.env.NEXARA_MAX_RETRIES || '3'),
    retryDelay: parseInt(process.env.NEXARA_RETRY_DELAY || '1000'),
  },

  // Restaurant Platform Configuration
  app: {
    baseUrl: process.env.APP_BASE_URL || 'http://localhost:3001',
    webhookPath: '/api/integration/webhook',
  },

  // Provider Configuration
  providers: {
    careem: {
      enabled: process.env.CAREEM_ENABLED === 'true',
      webhookSecret: process.env.CAREEM_WEBHOOK_SECRET,
      apiEndpoint: process.env.CAREEM_API_ENDPOINT,
      timeout: parseInt(process.env.CAREEM_TIMEOUT || '15000'),
    },
    talabat: {
      enabled: process.env.TALABAT_ENABLED === 'true',
      webhookSecret: process.env.TALABAT_WEBHOOK_SECRET,
      apiEndpoint: process.env.TALABAT_API_ENDPOINT,
      timeout: parseInt(process.env.TALABAT_TIMEOUT || '15000'),
    },
    deliveroo: {
      enabled: process.env.DELIVEROO_ENABLED === 'true',
      webhookSecret: process.env.DELIVEROO_WEBHOOK_SECRET,
      apiEndpoint: process.env.DELIVEROO_API_ENDPOINT,
      timeout: parseInt(process.env.DELIVEROO_TIMEOUT || '15000'),
    },
    jahez: {
      enabled: process.env.JAHEZ_ENABLED === 'true',
      webhookSecret: process.env.JAHEZ_WEBHOOK_SECRET,
      apiEndpoint: process.env.JAHEZ_API_ENDPOINT,
      timeout: parseInt(process.env.JAHEZ_TIMEOUT || '15000'),
    },
  },

  // Webhook Processing Configuration
  webhook: {
    validateSignature: process.env.WEBHOOK_VALIDATE_SIGNATURE !== 'false',
    maxPayloadSize: parseInt(process.env.WEBHOOK_MAX_PAYLOAD_SIZE || '1048576'), // 1MB
    timeout: parseInt(process.env.WEBHOOK_TIMEOUT || '10000'),
    retryFailedWebhooks: process.env.WEBHOOK_RETRY_FAILED === 'true',
    retryAttempts: parseInt(process.env.WEBHOOK_RETRY_ATTEMPTS || '3'),
    retryDelay: parseInt(process.env.WEBHOOK_RETRY_DELAY || '5000'),
  },

  // Security Configuration
  security: {
    enableEncryption: process.env.ENABLE_CREDENTIAL_ENCRYPTION !== 'false',
    encryptionKey: process.env.CREDENTIAL_ENCRYPTION_KEY || 'default-key-change-in-production',
    allowedOrigins: process.env.WEBHOOK_ALLOWED_ORIGINS?.split(',') || ['*'],
    rateLimitWindow: parseInt(process.env.WEBHOOK_RATE_LIMIT_WINDOW || '60000'), // 1 minute
    rateLimitMax: parseInt(process.env.WEBHOOK_RATE_LIMIT_MAX || '100'),
  },

  // Logging Configuration
  logging: {
    logWebhooks: process.env.LOG_WEBHOOKS !== 'false',
    logFailures: process.env.LOG_WEBHOOK_FAILURES !== 'false',
    logPayloads: process.env.LOG_WEBHOOK_PAYLOADS === 'true',
    retentionDays: parseInt(process.env.WEBHOOK_LOG_RETENTION_DAYS || '30'),
  },

  // Multi-tenant Configuration
  multiTenant: {
    isolateByCompany: true,
    enforceCompanyMapping: true,
    allowCrossCompanyAccess: false,
    defaultCompanyIdHeader: 'x-company-id',
  },

  // Real-time Configuration
  realtime: {
    enableWebSocket: process.env.ENABLE_WEBSOCKET_UPDATES !== 'false',
    websocketNamespace: '/integration',
    emitOrderUpdates: true,
    emitWebhookEvents: process.env.EMIT_WEBHOOK_EVENTS === 'true',
  },

  // Performance Configuration
  performance: {
    enableCaching: process.env.ENABLE_INTEGRATION_CACHING === 'true',
    cacheTimeout: parseInt(process.env.INTEGRATION_CACHE_TIMEOUT || '300000'), // 5 minutes
    enableBatching: process.env.ENABLE_WEBHOOK_BATCHING === 'true',
    batchSize: parseInt(process.env.WEBHOOK_BATCH_SIZE || '10'),
    batchTimeout: parseInt(process.env.WEBHOOK_BATCH_TIMEOUT || '5000'),
  },
}));