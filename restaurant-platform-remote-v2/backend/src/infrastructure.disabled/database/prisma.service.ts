import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor(private configService: ConfigService) {
    super({
      datasources: {
        db: {
          url: configService.get('database.url'),
        },
      },
      log: [
        {
          emit: 'event',
          level: 'query',
        },
        {
          emit: 'event',
          level: 'error',
        },
        {
          emit: 'event',
          level: 'info',
        },
        {
          emit: 'event',
          level: 'warn',
        },
      ],
    });

    // Database logging disabled for build compatibility
    // Logging is handled by Prisma configuration in schema.prisma
  }

  async onModuleInit() {
    try {
      await this.$connect();
      this.logger.log('Successfully connected to PostgreSQL database');

      // Test the connection
      await this.$queryRaw`SELECT 1`;
      this.logger.log('Database connection verified');

      // Enable row level security for multi-tenancy (inspired by Picolinate)
      if (this.configService.get('database.multiTenant.enableRowLevelSecurity')) {
        await this.enableRowLevelSecurity();
      }
    } catch (error) {
      this.logger.error('Failed to connect to database:', error);
      throw error;
    }
  }

  async onModuleDestroy() {
    try {
      await this.$disconnect();
      this.logger.log('Disconnected from PostgreSQL database');
    } catch (error) {
      this.logger.error('Error disconnecting from database:', error);
    }
  }

  /**
   * Enable row level security for multi-tenant isolation
   * Inspired by Picolinate's company-based data isolation
   */
  private async enableRowLevelSecurity() {
    try {
      // Enable RLS on existing multi-tenant tables only
      const tables = [
        'companies',
        'branches', 
        'users',
      ];

      for (const table of tables) {
        try {
          await this.$executeRawUnsafe(`ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY`);
          this.logger.debug(`Enabled RLS for table: ${table}`);
        } catch (tableError: any) {
          if (tableError.message.includes('does not exist')) {
            this.logger.warn(`Table ${table} does not exist, skipping RLS`);
          } else {
            this.logger.warn(`Failed to enable RLS for table ${table}:`, tableError.message);
          }
        }
      }

      this.logger.log('Row Level Security enabled for existing multi-tenant tables');
    } catch (error) {
      this.logger.error('Failed to enable Row Level Security:', error);
      // Don't throw error as RLS might already be enabled
    }
  }

  /**
   * Health check for the database connection
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.$queryRaw`SELECT 1`;
      return true;
    } catch (error) {
      this.logger.error('Database health check failed:', error);
      return false;
    }
  }

  /**
   * Get database statistics (inspired by Picolinate's monitoring)
   */
  async getStatistics() {
    try {
      const [
        companiesCount,
        branchesCount,
        usersCount,
        ordersCount,
        customersCount,
      ] = await Promise.all([
        this.company.count(),
        this.branch.count(),
        this.user.count(),
        0, // Orders count placeholder
        0, // Customers count placeholder
      ]);

      return {
        companies: companiesCount,
        branches: branchesCount,
        users: usersCount,
        orders: ordersCount,
        customers: customersCount,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error('Failed to get database statistics:', error);
      return null;
    }
  }

  /**
   * Execute raw SQL with logging
   */
  async executeRaw(sql: string, ...values: any[]) {
    this.logger.debug(`Executing raw SQL: ${sql}`);
    return this.$executeRawUnsafe(sql, ...values);
  }

  /**
   * Transaction wrapper with logging
   */
  async transaction<T>(fn: (prisma: PrismaClient) => Promise<T>): Promise<T> {
    this.logger.debug('Starting database transaction');
    const start = Date.now();

    try {
      const result = await this.$transaction(fn);
      const duration = Date.now() - start;
      this.logger.debug(`Transaction completed in ${duration}ms`);
      return result;
    } catch (error) {
      const duration = Date.now() - start;
      this.logger.error(`Transaction failed after ${duration}ms:`, error);
      throw error;
    }
  }
}