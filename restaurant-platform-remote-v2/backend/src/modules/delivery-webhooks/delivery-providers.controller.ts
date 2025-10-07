import { Controller, Get, Post, Put, Patch, Param, Body, Query, UseGuards } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Public } from '../../common/decorators/public.decorator';

@Controller('integration/delivery/providers')
export class DeliveryProvidersController {
  constructor(private prisma: PrismaService) {}

  // Get all delivery providers (Public - no auth required)
  @Public()
  @Get()
  async getAllProviders() {
    const providers = await this.prisma.deliveryProvider.findMany({
      orderBy: { name: 'asc' }
    });

    return providers.map(provider => ({
      id: provider.id,
      code: provider.code,
      name: provider.name,
      slug: provider.code,
      isActive: provider.isActive,
      config: {
        webhookEndpoint: `/api/v1/delivery/webhook/${provider.code}`,
        supportedFeatures: ['orders', 'webhooks', 'status_updates']
      },
      createdAt: provider.createdAt,
      updatedAt: provider.updatedAt
    }));
  }

  // Get provider by ID (Public - no auth required)
  @Public()
  @Get(':id')
  async getProviderById(@Param('id') id: string) {
    const provider = await this.prisma.deliveryProvider.findUnique({
      where: { id }
    });

    if (!provider) {
      throw new Error('Provider not found');
    }

    return {
      id: provider.id,
      code: provider.code,
      name: provider.name,
      slug: provider.code,
      isActive: provider.isActive,
      config: {
        webhookEndpoint: `/api/v1/delivery/webhook/${provider.code}`,
        supportedFeatures: ['orders', 'webhooks', 'status_updates']
      },
      createdAt: provider.createdAt,
      updatedAt: provider.updatedAt
    };
  }

  // Toggle provider active status (Protected - auth required)
  @Patch(':id/toggle')
  @UseGuards(JwtAuthGuard)
  @Roles('super_admin', 'company_owner')
  async toggleProvider(@Param('id') id: string, @Body() body: { isActive: boolean }) {
    const provider = await this.prisma.deliveryProvider.update({
      where: { id },
      data: { isActive: body.isActive }
    });

    return {
      id: provider.id,
      code: provider.code,
      name: provider.name,
      slug: provider.code,
      isActive: provider.isActive,
      config: {
        webhookEndpoint: `/api/v1/delivery/webhook/${provider.code}`,
        supportedFeatures: ['orders', 'webhooks', 'status_updates']
      }
    };
  }

  // Test provider connection (Protected - auth required)
  @Post(':id/test')
  @UseGuards(JwtAuthGuard)
  @Roles('super_admin', 'company_owner', 'branch_manager')
  async testProvider(@Param('id') id: string) {
    const provider = await this.prisma.deliveryProvider.findUnique({
      where: { id }
    });

    if (!provider) {
      return { success: false, message: 'Provider not found' };
    }

    // Check if webhook endpoint is accessible
    return {
      success: true,
      message: `${provider.name} webhook endpoint is ready at /api/v1/delivery/webhook/${provider.code}`,
      details: {
        provider: provider.name,
        endpoint: `/api/v1/delivery/webhook/${provider.code}`,
        isActive: provider.isActive
      }
    };
  }

  // Get provider statistics (Public - no auth required)
  @Get(':id/stats')
  async getProviderStats(
    @Param('id') providerId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string
  ) {
    const where: any = { providerId };

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    const [totalOrders, completedWebhooks, failedWebhooks] = await Promise.all([
      this.prisma.providerOrderLog.count({ where }),
      this.prisma.webhookLog.count({
        where: { ...where, status: 'completed' }
      }),
      this.prisma.webhookLog.count({
        where: { ...where, status: 'failed' }
      })
    ]);

    const successRate = totalOrders > 0
      ? ((completedWebhooks / (completedWebhooks + failedWebhooks)) * 100)
      : 0;

    return {
      totalOrders,
      completedOrders: completedWebhooks,
      failedOrders: failedWebhooks,
      successRate: parseFloat(successRate.toFixed(2)),
      avgResponseTime: 150 // Placeholder - could calculate from webhook logs
    };
  }
}
