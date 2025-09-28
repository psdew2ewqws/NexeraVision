import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient, Prisma } from '@prisma/client';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class PrismaService
  extends PrismaClient<Prisma.PrismaClientOptions, 'query' | 'info' | 'warn' | 'error'>
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  constructor(private configService: ConfigService) {
    super({
      datasources: {
        db: {
          url: configService.get<string>('DATABASE_URL'),
        },
      },
      log: [
        { level: 'query', emit: 'event' },
        { level: 'info', emit: 'event' },
        { level: 'warn', emit: 'event' },
        { level: 'error', emit: 'event' },
      ],
      errorFormat: 'colorless',
    });
  }

  async onModuleInit() {
    try {
      // Set up logging
      this.$on('query', (e) => {
        if (process.env.NODE_ENV === 'development') {
          this.logger.debug(`Query: ${e.query}`);
          this.logger.debug(`Params: ${e.params}`);
          this.logger.debug(`Duration: ${e.duration}ms`);
        }
      });

      this.$on('info', (e) => {
        this.logger.log(e.message);
      });

      this.$on('warn', (e) => {
        this.logger.warn(e.message);
      });

      this.$on('error', (e) => {
        this.logger.error(e.message);
      });

      // Connect to database
      await this.$connect();
      this.logger.log('✅ Successfully connected to database');

      // Test connection
      await this.$queryRaw`SELECT 1`;
      this.logger.log('✅ Database connection test successful');

    } catch (error) {
      this.logger.error('❌ Failed to connect to database:', error);
      throw error;
    }
  }

  async onModuleDestroy() {
    try {
      await this.$disconnect();
      this.logger.log('✅ Database connection closed');
    } catch (error) {
      this.logger.error('❌ Error closing database connection:', error);
    }
  }

  /**
   * Execute a transaction with automatic retry logic
   */
  async executeTransaction<T>(
    fn: (tx: Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use'>) => Promise<T>,
    maxRetries = 3
  ): Promise<T> {
    let lastError: Error;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await this.$transaction(fn, {
          maxWait: 5000, // 5 seconds
          timeout: 10000, // 10 seconds
          isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
        });
      } catch (error) {
        lastError = error as Error;

        // Retry on serialization failures or connection issues
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          (error.code === 'P2034' || error.code === 'P1001' || error.code === 'P1017')
        ) {
          this.logger.warn(`Transaction attempt ${attempt} failed, retrying...`, error.message);

          if (attempt < maxRetries) {
            // Exponential backoff
            await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 100));
            continue;
          }
        }

        // Don't retry for other errors
        throw error;
      }
    }

    throw lastError;
  }

  /**
   * Soft delete implementation
   */
  async softDelete(model: string, where: any) {
    const modelName = model.charAt(0).toLowerCase() + model.slice(1);
    return this[modelName].update({
      where,
      data: {
        deletedAt: new Date(),
      },
    });
  }

  /**
   * Check if database is healthy
   */
  async isHealthy(): Promise<boolean> {
    try {
      await this.$queryRaw`SELECT 1`;
      return true;
    } catch (error) {
      this.logger.error('Database health check failed:', error);
      return false;
    }
  }

  /**
   * Get database statistics
   */
  async getDatabaseStats() {
    try {
      const [
        organizationsCount,
        usersCount,
        connectionsCount,
        menuItemsCount,
        ordersCount,
      ] = await Promise.all([
        this.organization.count(),
        this.user.count(),
        this.integrationConnection.count(),
        this.menuItem.count(),
        this.order.count(),
      ]);

      return {
        organizations: organizationsCount,
        users: usersCount,
        connections: connectionsCount,
        menuItems: menuItemsCount,
        orders: ordersCount,
      };
    } catch (error) {
      this.logger.error('Failed to get database stats:', error);
      throw error;
    }
  }
}