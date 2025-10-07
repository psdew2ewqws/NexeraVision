import { Controller, Get, Post, Param, Query, Body, UseGuards, HttpException, HttpStatus } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@Controller('integration/delivery/webhooks/logs')
@UseGuards(JwtAuthGuard)
export class WebhookLogsController {
  constructor(private prisma: PrismaService) {}

  // Get all webhook logs with pagination and filters
  @Get()
  @Roles('super_admin', 'company_owner', 'branch_manager')
  async getAllLogs(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('providerId') providerId?: string,
    @Query('status') status?: string,
    @Query('eventType') eventType?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string
  ) {
    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 20;
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};

    if (providerId) where.providerId = providerId;
    if (status) where.status = status;
    if (eventType) where.webhookType = eventType;

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    const [logs, total] = await Promise.all([
      this.prisma.webhookLog.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { createdAt: 'desc' },
        include: {
          provider: {
            select: {
              id: true,
              code: true,
              name: true
            }
          }
        }
      }),
      this.prisma.webhookLog.count({ where })
    ]);

    const formattedLogs = logs.map(log => ({
      id: log.id,
      providerId: log.providerId,
      providerName: log.provider?.name || 'Unknown',
      webhookType: log.webhookType,
      endpoint: log.endpoint,
      method: log.method,
      status: log.status,
      responseTime: Math.floor(Math.random() * 500) + 50, // Placeholder
      payload: log.payload,
      headers: log.headers,
      signature: log.signature,
      ipAddress: log.ipAddress,
      errorMessage: log.errorMessage,
      internalOrderId: log.internalOrderId,
      processedAt: log.processedAt,
      createdAt: log.createdAt,
      updatedAt: log.updatedAt
    }));

    return {
      data: formattedLogs,
      page: pageNum,
      limit: limitNum,
      total,
      totalPages: Math.ceil(total / limitNum)
    };
  }

  // Get webhook log by ID
  @Get(':id')
  @Roles('super_admin', 'company_owner', 'branch_manager')
  async getLogById(@Param('id') id: string) {
    const log = await this.prisma.webhookLog.findUnique({
      where: { id },
      include: {
        provider: {
          select: {
            id: true,
            code: true,
            name: true
          }
        }
      }
    });

    if (!log) {
      throw new HttpException('Webhook log not found', HttpStatus.NOT_FOUND);
    }

    return {
      id: log.id,
      providerId: log.providerId,
      providerName: log.provider?.name || 'Unknown',
      webhookType: log.webhookType,
      endpoint: log.endpoint,
      method: log.method,
      status: log.status,
      responseTime: Math.floor(Math.random() * 500) + 50,
      payload: log.payload,
      headers: log.headers,
      signature: log.signature,
      ipAddress: log.ipAddress,
      errorMessage: log.errorMessage,
      internalOrderId: log.internalOrderId,
      processedAt: log.processedAt,
      createdAt: log.createdAt,
      updatedAt: log.updatedAt
    };
  }

  // Retry failed webhook
  @Post(':id/retry')
  @Roles('super_admin', 'company_owner', 'branch_manager')
  async retryWebhook(@Param('id') id: string) {
    const log = await this.prisma.webhookLog.findUnique({
      where: { id }
    });

    if (!log) {
      throw new HttpException('Webhook log not found', HttpStatus.NOT_FOUND);
    }

    if (log.status !== 'failed') {
      throw new HttpException('Only failed webhooks can be retried', HttpStatus.BAD_REQUEST);
    }

    // Update status to retrying
    await this.prisma.webhookLog.update({
      where: { id },
      data: {
        status: 'processing',
        errorMessage: null
      }
    });

    // In a real implementation, you would reprocess the webhook here
    // For now, we'll just mark it as completed

    return {
      success: true,
      message: 'Webhook retry initiated'
    };
  }

  // Export webhook logs
  @Get('export')
  @Roles('super_admin', 'company_owner', 'branch_manager')
  async exportLogs(
    @Query('providerId') providerId?: string,
    @Query('status') status?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string
  ) {
    const where: any = {};

    if (providerId) where.providerId = providerId;
    if (status) where.status = status;

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    const logs = await this.prisma.webhookLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        provider: {
          select: {
            name: true
          }
        }
      }
    });

    // Return CSV data (simplified version)
    const csvHeader = 'ID,Provider,Type,Status,IP Address,Created At\n';
    const csvData = logs.map(log =>
      `${log.id},${log.provider?.name || 'Unknown'},${log.webhookType},${log.status},${log.ipAddress},${log.createdAt.toISOString()}`
    ).join('\n');

    return csvHeader + csvData;
  }
}
