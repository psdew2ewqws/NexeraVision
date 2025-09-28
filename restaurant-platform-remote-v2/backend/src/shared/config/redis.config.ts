import { registerAs } from '@nestjs/config';

export const redisConfig = registerAs('redis', () => ({
  // Redis connection (like Picolinate's Redis setup)
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT, 10) || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  database: parseInt(process.env.REDIS_DATABASE, 10) || 0,
  keyPrefix: process.env.REDIS_KEY_PREFIX || 'restaurant:',

  // Connection settings
  connection: {
    connectTimeout: parseInt(process.env.REDIS_CONNECT_TIMEOUT, 10) || 10000,
    lazyConnect: true,
    maxRetriesPerRequest: parseInt(process.env.REDIS_MAX_RETRIES, 10) || 3,
    retryDelayOnFailover: parseInt(process.env.REDIS_RETRY_DELAY, 10) || 100,
    enableReadyCheck: true,
    maxLoadingTimeout: parseInt(process.env.REDIS_LOADING_TIMEOUT, 10) || 5000,
  },

  // Database separation (inspired by Picolinate's Redis structure)
  databases: {
    cache: parseInt(process.env.REDIS_CACHE_DB, 10) || 0,        // General caching
    sessions: parseInt(process.env.REDIS_SESSION_DB, 10) || 1,    // User sessions
    queues: parseInt(process.env.REDIS_QUEUE_DB, 10) || 2,       // Background jobs
    realtime: parseInt(process.env.REDIS_REALTIME_DB, 10) || 3,   // WebSocket pub/sub
    ratelimit: parseInt(process.env.REDIS_RATELIMIT_DB, 10) || 4, // Rate limiting
  },

  // Cache configuration
  cache: {
    ttl: {
      short: parseInt(process.env.CACHE_TTL_SHORT, 10) || 60,        // 1 minute
      medium: parseInt(process.env.CACHE_TTL_MEDIUM, 10) || 300,     // 5 minutes
      long: parseInt(process.env.CACHE_TTL_LONG, 10) || 3600,       // 1 hour
      menu: parseInt(process.env.CACHE_TTL_MENU, 10) || 900,        // 15 minutes
      company: parseInt(process.env.CACHE_TTL_COMPANY, 10) || 3600,  // 1 hour
      user: parseInt(process.env.CACHE_TTL_USER, 10) || 1800,       // 30 minutes
    },
    maxMemoryPolicy: process.env.REDIS_MAX_MEMORY_POLICY || 'allkeys-lru',
    enableCompression: process.env.REDIS_ENABLE_COMPRESSION !== 'false',
  },

  // Pub/Sub for real-time features (order updates, notifications)
  pubsub: {
    channels: {
      orders: 'orders',
      kitchen: 'kitchen',
      notifications: 'notifications',
      analytics: 'analytics',
    },
    enableRetainer: true,
    retainedMessageTtl: parseInt(process.env.PUBSUB_RETAINED_TTL, 10) || 3600,
  },

  // Bull queue configuration
  queue: {
    defaultJobOptions: {
      removeOnComplete: parseInt(process.env.QUEUE_REMOVE_ON_COMPLETE, 10) || 100,
      removeOnFail: parseInt(process.env.QUEUE_REMOVE_ON_FAIL, 10) || 50,
      attempts: parseInt(process.env.QUEUE_DEFAULT_ATTEMPTS, 10) || 3,
      backoff: {
        type: 'exponential',
        delay: parseInt(process.env.QUEUE_BACKOFF_DELAY, 10) || 2000,
      },
    },
    queues: {
      orders: 'orders-processing',
      notifications: 'notifications',
      integrations: 'external-integrations',
      reports: 'report-generation',
      cleanup: 'data-cleanup',
    },
  },

  // Performance monitoring
  monitoring: {
    enableSlowLog: process.env.REDIS_ENABLE_SLOW_LOG !== 'false',
    slowLogMaxLen: parseInt(process.env.REDIS_SLOW_LOG_MAX_LEN, 10) || 128,
    slowLogSlowerThan: parseInt(process.env.REDIS_SLOW_LOG_SLOWER_THAN, 10) || 10000,
    enableMetrics: process.env.REDIS_ENABLE_METRICS !== 'false',
  },

  // Security settings
  security: {
    enableAuth: process.env.REDIS_ENABLE_AUTH !== 'false',
    enableTls: process.env.REDIS_ENABLE_TLS === 'true',
    tlsOptions: {
      rejectUnauthorized: process.env.REDIS_TLS_REJECT_UNAUTHORIZED !== 'false',
    },
  },
}));