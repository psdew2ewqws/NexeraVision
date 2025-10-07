import { registerAs } from '@nestjs/config';

export default registerAs('database', () => ({
  url: process.env.DATABASE_URL || 'postgresql://postgres:E$$athecode006@localhost:5432/postgres',

  // Connection pool configuration (matching Picolinate patterns)
  connection: {
    minPoolSize: 0,
    maxPoolSize: 120,
    idleTimeoutMillis: 180000,
    connectionTimeoutMillis: 10000,
  },

  // Logging configuration
  logging: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
}));