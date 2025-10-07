import { registerAs } from '@nestjs/config';

export default registerAs('app', () => ({
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT, 10) || 3002,
  serviceName: process.env.SERVICE_NAME || 'integration-service',

  // Backend service configuration
  backend: {
    url: process.env.BACKEND_URL || 'http://localhost:3001',
    apiKey: process.env.BACKEND_API_KEY || 'development-key',
  },

  // Security settings
  security: {
    rateLimit: parseInt(process.env.WEBHOOK_RATE_LIMIT, 10) || 100,
    rateLimitWindow: parseInt(process.env.WEBHOOK_RATE_WINDOW_MS, 10) || 60000,
  },

  // Retry configuration
  retry: {
    maxAttempts: parseInt(process.env.RETRY_MAX_ATTEMPTS, 10) || 10,
    initialDelay: parseInt(process.env.RETRY_INITIAL_DELAY, 10) || 60000,
    maxDelay: parseInt(process.env.RETRY_MAX_DELAY, 10) || 86400000,
    backoffMultiplier: 2,
  },

  // Circuit breaker configuration
  circuitBreaker: {
    timeout: parseInt(process.env.CIRCUIT_BREAKER_TIMEOUT, 10) || 5000,
    errorThresholdPercentage: parseInt(process.env.CIRCUIT_BREAKER_ERROR_THRESHOLD, 10) || 50,
    resetTimeout: parseInt(process.env.CIRCUIT_BREAKER_RESET_TIMEOUT, 10) || 30000,
  },
}));