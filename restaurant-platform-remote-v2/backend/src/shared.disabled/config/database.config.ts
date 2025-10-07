import { registerAs } from '@nestjs/config';

export const databaseConfig = registerAs('database', () => ({
  // PostgreSQL connection (matching frontend's database)
  url: process.env.DATABASE_URL || 
       'postgresql://postgres:E%24%24athecode006@localhost:5432/restaurant_dashboard_dev',
  
  // Connection pool settings (optimized for restaurant operations)
  pool: {
    min: parseInt(process.env.DB_POOL_MIN, 10) || 2,
    max: parseInt(process.env.DB_POOL_MAX, 10) || 20,
    acquireTimeoutMillis: parseInt(process.env.DB_ACQUIRE_TIMEOUT, 10) || 60000,
    createTimeoutMillis: parseInt(process.env.DB_CREATE_TIMEOUT, 10) || 30000,
    destroyTimeoutMillis: parseInt(process.env.DB_DESTROY_TIMEOUT, 10) || 5000,
    idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT, 10) || 10000,
    reapIntervalMillis: parseInt(process.env.DB_REAP_INTERVAL, 10) || 1000,
  },

  // Query optimization
  query: {
    timeout: parseInt(process.env.DB_QUERY_TIMEOUT, 10) || 30000,
    logQueries: process.env.DB_LOG_QUERIES === 'true',
    logLevel: process.env.DB_LOG_LEVEL || 'info',
  },

  // Migration settings
  migrations: {
    directory: './prisma/migrations',
    autoRun: process.env.DB_AUTO_MIGRATE === 'true',
  },

  // Multi-tenant configuration (inspired by Picolinate's structure)
  multiTenant: {
    strategy: 'shared-database', // shared-database | separate-database
    tenantIdColumn: 'company_id',
    enableRowLevelSecurity: true,
  },

  // Performance settings
  performance: {
    enableQueryCache: process.env.DB_ENABLE_QUERY_CACHE !== 'false',
    cacheSize: parseInt(process.env.DB_CACHE_SIZE, 10) || 100,
    enableStatistics: process.env.DB_ENABLE_STATISTICS !== 'false',
  },

  // Backup and maintenance
  maintenance: {
    enableAutoBackup: process.env.DB_ENABLE_AUTO_BACKUP === 'true',
    backupSchedule: process.env.DB_BACKUP_SCHEDULE || '0 2 * * *', // 2 AM daily
    retentionDays: parseInt(process.env.DB_BACKUP_RETENTION_DAYS, 10) || 30,
  },
}));