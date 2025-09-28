import { Controller, Get, Post, Body, Param, UseGuards, Request, Logger } from '@nestjs/common';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { IntegrationService } from '../services/integration.service';

export interface RegisterWebhookDto {
  providers: string[];
  credentials?: Record<string, any>;
}

export interface StoreCredentialsDto {
  provider: string;
  credentials: {
    apiKey?: string;
    apiSecret?: string;
    webhookSecret?: string;
    baseUrl?: string;
    [key: string]: any;
  };
}

/**
 * Integration Controller for NEXARA Platform Management
 *
 * Handles:
 * - Webhook registration with NEXARA
 * - Provider credential management
 * - Integration health monitoring
 * - Multi-tenant configuration
 */
@Controller('api/integration')
@UseGuards(JwtAuthGuard, RolesGuard)
export class IntegrationController {
  private readonly logger = new Logger(IntegrationController.name);

  constructor(private readonly integrationService: IntegrationService) {}

  /**
   * Register webhook endpoints with NEXARA for delivery providers
   * POST /api/integration/register-webhook
   */
  @Post('register-webhook')
  @Roles('super_admin', 'company_owner', 'branch_manager')
  async registerWebhook(
    @Body() registerWebhookDto: RegisterWebhookDto,
    @Request() req: any
  ) {
    const companyId = req.user.companyId;

    this.logger.log(`Registering webhook for company ${companyId} with providers: ${registerWebhookDto.providers.join(', ')}`);

    const result = await this.integrationService.registerWebhookWithNexara(
      companyId,
      registerWebhookDto.providers
    );

    // Store credentials if provided
    if (registerWebhookDto.credentials) {
      for (const [provider, creds] of Object.entries(registerWebhookDto.credentials)) {
        await this.integrationService.storeProviderCredentials(companyId, provider, creds);
      }
    }

    return {
      success: true,
      message: 'Webhook registration completed',
      data: result
    };
  }

  /**
   * Store or update provider API credentials
   * POST /api/integration/credentials/:provider
   */
  @Post('credentials/:provider')
  @Roles('super_admin', 'company_owner', 'branch_manager')
  async storeCredentials(
    @Param('provider') provider: string,
    @Body() storeCredentialsDto: StoreCredentialsDto,
    @Request() req: any
  ) {
    const companyId = req.user.companyId;

    this.logger.log(`Storing credentials for ${provider} - Company: ${companyId}`);

    await this.integrationService.storeProviderCredentials(
      companyId,
      provider,
      storeCredentialsDto.credentials
    );

    return {
      success: true,
      message: `Credentials stored for ${provider}`,
      provider
    };
  }

  /**
   * Get all active integrations for the company
   * GET /api/integration/status
   */
  @Get('status')
  @Roles('super_admin', 'company_owner', 'branch_manager', 'call_center')
  async getIntegrationStatus(@Request() req: any) {
    const companyId = req.user.companyId;

    const integrations = await this.integrationService.getCompanyIntegrations(companyId);

    return {
      success: true,
      data: {
        companyId,
        integrations,
        totalActiveProviders: integrations.length
      }
    };
  }

  /**
   * Health check for NEXARA platform connectivity
   * GET /api/integration/health
   */
  @Get('health')
  @Roles('super_admin', 'company_owner', 'branch_manager')
  async checkHealth() {
    const healthStatus = await this.integrationService.checkNexaraConnectivity();

    return {
      success: true,
      data: healthStatus
    };
  }

  /**
   * Sync order status to NEXARA platform
   * POST /api/integration/sync-order/:orderId
   */
  @Post('sync-order/:orderId')
  @Roles('super_admin', 'company_owner', 'branch_manager', 'call_center')
  async syncOrderStatus(
    @Param('orderId') orderId: string,
    @Body() body: { status: string; providerOrderId?: string },
    @Request() req: any
  ) {
    this.logger.log(`Syncing order ${orderId} status ${body.status} to NEXARA`);

    const result = await this.integrationService.syncOrderStatusToNexara(
      orderId,
      body.status,
      body.providerOrderId
    );

    return {
      success: true,
      message: 'Order status synced to NEXARA',
      data: result
    };
  }

  /**
   * Test integration connectivity for specific provider
   * POST /api/integration/test/:provider
   */
  @Post('test/:provider')
  @Roles('super_admin', 'company_owner', 'branch_manager')
  async testProviderIntegration(
    @Param('provider') provider: string,
    @Request() req: any
  ) {
    const companyId = req.user.companyId;

    this.logger.log(`Testing ${provider} integration for company ${companyId}`);

    // This would implement specific provider connectivity tests
    const testResult = {
      provider,
      companyId,
      status: 'testing_not_implemented',
      timestamp: new Date(),
      message: `${provider} integration test endpoint - implementation needed`
    };

    return {
      success: true,
      data: testResult
    };
  }

  /**
   * Get integration logs and events
   * GET /api/integration/logs
   */
  @Get('logs')
  @Roles('super_admin', 'company_owner', 'branch_manager')
  async getIntegrationLogs(@Request() req: any) {
    const companyId = req.user.companyId;

    // This would fetch webhook logs and integration events
    const logs = {
      companyId,
      message: 'Integration logs endpoint - implementation needed',
      timestamp: new Date()
    };

    return {
      success: true,
      data: logs
    };
  }
}