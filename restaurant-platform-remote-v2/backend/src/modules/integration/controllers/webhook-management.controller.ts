import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  BadRequestException,
  NotFoundException
} from '@nestjs/common';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { WebhookManagementService } from '../services/webhook-management.service';

export interface CreateWebhookDto {
  provider: string;
  webhookUrl: string;
  events: string[];
  authHeaders?: Record<string, string>;
  isActive?: boolean;
}

export interface UpdateWebhookDto {
  webhookUrl?: string;
  events?: string[];
  authHeaders?: Record<string, string>;
  isActive?: boolean;
}

/**
 * Webhook Management Controller
 *
 * Handles CRUD operations for webhook configurations
 * Allows companies to register and manage webhooks for delivery providers
 */
@Controller('api/integration/webhooks')
@UseGuards(JwtAuthGuard, RolesGuard)
export class WebhookManagementController {
  constructor(
    private readonly webhookManagementService: WebhookManagementService
  ) {}

  /**
   * Get all webhooks for a company
   * GET /api/integration/webhooks
   */
  @Get()
  @Roles('super_admin', 'company_owner')
  async getWebhooks(
    @Request() req: any,
    @Query('companyId') queryCompanyId?: string
  ) {
    const user = req.user;

    // Determine company ID based on user role
    let companyId: string;
    if (user.role === 'super_admin' && queryCompanyId) {
      companyId = queryCompanyId;
    } else {
      companyId = user.companyId;
    }

    if (!companyId) {
      throw new BadRequestException('Company ID is required');
    }

    return await this.webhookManagementService.getWebhooks(companyId);
  }

  /**
   * Get available providers and events
   * GET /api/integration/webhooks/config
   */
  @Get('config')
  @Roles('super_admin', 'company_owner')
  async getWebhookConfig() {
    return await this.webhookManagementService.getWebhookConfig();
  }

  /**
   * Create a new webhook
   * POST /api/integration/webhooks
   */
  @Post()
  @Roles('super_admin', 'company_owner')
  async createWebhook(
    @Request() req: any,
    @Body() createWebhookDto: CreateWebhookDto
  ) {
    const user = req.user;

    // Validate required fields
    if (!createWebhookDto.provider || !createWebhookDto.webhookUrl) {
      throw new BadRequestException('Provider and webhook URL are required');
    }

    // Validate URL format
    try {
      new URL(createWebhookDto.webhookUrl);
    } catch {
      throw new BadRequestException('Invalid webhook URL format');
    }

    // Use user's company ID
    const companyId = user.companyId;
    if (!companyId) {
      throw new BadRequestException('User must belong to a company');
    }

    return await this.webhookManagementService.createWebhook(
      companyId,
      createWebhookDto
    );
  }

  /**
   * Update an existing webhook
   * PUT /api/integration/webhooks/:id
   */
  @Put(':id')
  @Roles('super_admin', 'company_owner')
  async updateWebhook(
    @Request() req: any,
    @Param('id') webhookId: string,
    @Body() updateWebhookDto: UpdateWebhookDto
  ) {
    const user = req.user;
    const companyId = user.companyId;

    // Validate URL if provided
    if (updateWebhookDto.webhookUrl) {
      try {
        new URL(updateWebhookDto.webhookUrl);
      } catch {
        throw new BadRequestException('Invalid webhook URL format');
      }
    }

    return await this.webhookManagementService.updateWebhook(
      webhookId,
      companyId,
      updateWebhookDto
    );
  }

  /**
   * Delete a webhook
   * DELETE /api/integration/webhooks/:id
   */
  @Delete(':id')
  @Roles('super_admin', 'company_owner')
  async deleteWebhook(
    @Request() req: any,
    @Param('id') webhookId: string
  ) {
    const user = req.user;
    const companyId = user.companyId;

    return await this.webhookManagementService.deleteWebhook(
      webhookId,
      companyId
    );
  }

  /**
   * Test a webhook configuration
   * POST /api/integration/webhooks/:id/test
   */
  @Post(':id/test')
  @Roles('super_admin', 'company_owner')
  async testWebhook(
    @Request() req: any,
    @Param('id') webhookId: string
  ) {
    const user = req.user;
    const companyId = user.companyId;

    return await this.webhookManagementService.testWebhook(
      webhookId,
      companyId
    );
  }

  /**
   * Get webhook statistics
   * GET /api/integration/webhooks/:id/stats
   */
  @Get(':id/stats')
  @Roles('super_admin', 'company_owner')
  async getWebhookStats(
    @Request() req: any,
    @Param('id') webhookId: string,
    @Query('timeframe') timeframe: string = '24h'
  ) {
    const user = req.user;
    const companyId = user.companyId;

    return await this.webhookManagementService.getWebhookStats(
      webhookId,
      companyId,
      timeframe
    );
  }

  /**
   * Get webhook logs
   * GET /api/integration/webhooks/:id/logs
   */
  @Get(':id/logs')
  @Roles('super_admin', 'company_owner')
  async getWebhookLogs(
    @Request() req: any,
    @Param('id') webhookId: string,
    @Query('limit') limit: string = '50',
    @Query('offset') offset: string = '0'
  ) {
    const user = req.user;
    const companyId = user.companyId;

    return await this.webhookManagementService.getWebhookLogs(
      webhookId,
      companyId,
      parseInt(limit),
      parseInt(offset)
    );
  }
}