import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { PrismaService } from '../../database/prisma.service';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

/**
 * Core Integration Service for NEXARA Platform Communication
 *
 * Handles:
 * - Registration with NEXARA webhook system
 * - Provider credential management
 * - Health checks and connectivity monitoring
 * - Multi-tenant configuration
 */
@Injectable()
export class IntegrationService {
  private readonly logger = new Logger(IntegrationService.name);
  private readonly nexaraBaseUrl: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly httpService: HttpService,
    private readonly configService: ConfigService
  ) {
    this.nexaraBaseUrl = this.configService.get<string>('NEXARA_BASE_URL', 'http://localhost:3002');
  }

  /**
   * Register webhook endpoints with NEXARA integration platform
   */
  async registerWebhookWithNexara(companyId: string, providers: string[]) {
    try {
      const company = await this.prisma.company.findUnique({
        where: { id: companyId }
      });

      if (!company) {
        throw new BadRequestException('Company not found');
      }

      const webhookUrl = `${this.configService.get('APP_BASE_URL', 'http://localhost:3001')}/api/integration/webhook`;

      for (const provider of providers) {
        const registrationPayload = {
          clientId: companyId,
          provider: provider.toLowerCase(),
          url: webhookUrl,
          events: [
            'order.created',
            'order.updated',
            'order.cancelled',
            'order.delivered',
            'order.status_changed'
          ]
        };

        const response = await firstValueFrom(
          this.httpService.post(`${this.nexaraBaseUrl}/api/webhook/register`, registrationPayload)
        );

        // Store webhook configuration in database
        await this.prisma.integrationWebhook.upsert({
          where: {
            companyId_provider: {
              companyId,
              provider: provider.toLowerCase()
            }
          },
          update: {
            webhookId: response.data.webhookId,
            webhookUrl: response.data.url,
            secretKey: response.data.secretKey,
            isActive: true,
            updatedAt: new Date()
          },
          create: {
            companyId,
            provider: provider.toLowerCase(),
            webhookId: response.data.webhookId,
            webhookUrl: response.data.url,
            secretKey: response.data.secretKey,
            isActive: true,
            registeredAt: new Date()
          }
        });

        this.logger.log(`Registered webhook for ${provider} - Company: ${company.name}`);
      }

      return {
        success: true,
        registeredProviders: providers,
        companyId
      };

    } catch (error) {
      this.logger.error(`Failed to register webhook for company ${companyId}:`, error.message);
      throw new BadRequestException(`Webhook registration failed: ${error.message}`);
    }
  }

  /**
   * Store provider API credentials securely
   */
  async storeProviderCredentials(companyId: string, provider: string, credentials: any) {
    try {
      await this.prisma.providerCredentials.upsert({
        where: {
          companyId_provider: {
            companyId,
            provider: provider.toLowerCase()
          }
        },
        update: {
          credentials: this.encryptCredentials(credentials),
          isActive: true,
          updatedAt: new Date()
        },
        create: {
          companyId,
          provider: provider.toLowerCase(),
          credentials: this.encryptCredentials(credentials),
          isActive: true
        }
      });

      this.logger.log(`Stored credentials for ${provider} - Company: ${companyId}`);
      return { success: true };

    } catch (error) {
      this.logger.error(`Failed to store credentials:`, error.message);
      throw new BadRequestException('Failed to store provider credentials');
    }
  }

  /**
   * Get active integration configurations for a company
   */
  async getCompanyIntegrations(companyId: string) {
    const integrations = await this.prisma.integrationWebhook.findMany({
      where: {
        companyId,
        isActive: true
      },
      include: {
        company: {
          select: { name: true, slug: true }
        }
      }
    });

    return integrations.map(integration => ({
      provider: integration.provider,
      webhookId: integration.webhookId,
      isActive: integration.isActive,
      registeredAt: integration.registeredAt,
      lastEventAt: integration.lastEventAt
    }));
  }

  /**
   * Health check with NEXARA platform
   */
  async checkNexaraConnectivity() {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.nexaraBaseUrl}/api/health`)
      );

      return {
        status: 'healthy',
        nexaraResponse: response.data,
        timestamp: new Date()
      };
    } catch (error) {
      this.logger.error('NEXARA connectivity check failed:', error.message);
      return {
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date()
      };
    }
  }

  /**
   * Sync order status to NEXARA platform
   */
  async syncOrderStatusToNexara(orderId: string, status: string, providerOrderId?: string) {
    try {
      const order = await this.prisma.order.findUnique({
        where: { id: orderId },
        include: {
          branch: {
            include: { company: true }
          }
        }
      });

      if (!order) {
        throw new BadRequestException('Order not found');
      }

      const syncPayload = {
        orderId: order.id,
        externalOrderId: providerOrderId || order.externalOrderId,
        status,
        timestamp: new Date(),
        companyId: order.branch.companyId
      };

      await firstValueFrom(
        this.httpService.post(`${this.nexaraBaseUrl}/api/orders/sync`, syncPayload)
      );

      this.logger.log(`Synced order ${orderId} status ${status} to NEXARA`);
      return { success: true };

    } catch (error) {
      this.logger.error(`Failed to sync order status:`, error.message);
      throw new BadRequestException('Order status sync failed');
    }
  }

  /**
   * Simple credential encryption (in production, use proper encryption)
   */
  private encryptCredentials(credentials: any): string {
    // TODO: Implement proper encryption with a secret key
    return Buffer.from(JSON.stringify(credentials)).toString('base64');
  }

  /**
   * Decrypt credentials
   */
  private decryptCredentials(encrypted: string): any {
    try {
      return JSON.parse(Buffer.from(encrypted, 'base64').toString());
    } catch (error) {
      this.logger.error('Failed to decrypt credentials:', error.message);
      return null;
    }
  }
}