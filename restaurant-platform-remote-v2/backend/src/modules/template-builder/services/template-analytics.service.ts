import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class TemplateAnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async logAction(actionData: {
    templateId: string;
    companyId: string;
    branchId?: string;
    userId?: string;
    action: string;
    actionDetails?: any;
    sessionId?: string;
    ipAddress?: string;
    userAgent?: string;
    deviceType?: string;
    processingTimeMs?: number;
    errorMessage?: string;
  }) {
    return await this.prisma.templateBuilderAnalytics.create({
      data: {
        templateId: actionData.templateId,
        companyId: actionData.companyId,
        branchId: actionData.branchId,
        userId: actionData.userId,
        action: actionData.action,
        actionDetails: actionData.actionDetails || {},
        sessionId: actionData.sessionId,
        ipAddress: actionData.ipAddress,
        userAgent: actionData.userAgent,
        deviceType: actionData.deviceType,
        processingTimeMs: actionData.processingTimeMs,
        errorMessage: actionData.errorMessage,
      },
    });
  }

  async getTemplateAnalytics(templateId: string, days = 30) {
    const since = new Date();
    since.setDate(since.getDate() - days);

    const analytics = await this.prisma.templateBuilderAnalytics.groupBy({
      by: ['action'],
      where: {
        templateId,
        createdAt: { gte: since },
      },
      _count: {
        action: true,
      },
    });

    const totalUsage = await this.prisma.templateBuilderAnalytics.count({
      where: {
        templateId,
        createdAt: { gte: since },
      },
    });

    const uniqueUsers = await this.prisma.templateBuilderAnalytics.findMany({
      where: {
        templateId,
        createdAt: { gte: since },
        userId: { not: null },
      },
      select: { userId: true },
      distinct: ['userId'],
    });

    return {
      totalUsage,
      uniqueUsers: uniqueUsers.length,
      actionBreakdown: analytics.reduce((acc, item) => {
        acc[item.action] = item._count.action;
        return acc;
      }, {}),
    };
  }

  async getCompanyAnalytics(companyId: string, days = 30) {
    const since = new Date();
    since.setDate(since.getDate() - days);

    const totalTemplates = await this.prisma.templateBuilderTemplate.count({
      where: { companyId, isActive: true },
    });

    const totalActions = await this.prisma.templateBuilderAnalytics.count({
      where: {
        companyId,
        createdAt: { gte: since },
      },
    });

    const topTemplates = await this.prisma.templateBuilderAnalytics.groupBy({
      by: ['templateId'],
      where: {
        companyId,
        createdAt: { gte: since },
      },
      _count: {
        templateId: true,
      },
      orderBy: {
        _count: {
          templateId: 'desc',
        },
      },
      take: 10,
    });

    const popularActions = await this.prisma.templateBuilderAnalytics.groupBy({
      by: ['action'],
      where: {
        companyId,
        createdAt: { gte: since },
      },
      _count: {
        action: true,
      },
      orderBy: {
        _count: {
          action: 'desc',
        },
      },
    });

    return {
      totalTemplates,
      totalActions,
      topTemplates,
      popularActions,
    };
  }
}