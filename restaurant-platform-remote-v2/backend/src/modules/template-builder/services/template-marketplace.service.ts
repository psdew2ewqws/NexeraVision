import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class TemplateMarketplaceService {
  constructor(private readonly prisma: PrismaService) {}

  async getFeaturedTemplates(limit = 10) {
    return await this.prisma.templateBuilderMarketplace.findMany({
      where: {
        status: 'published',
        isFeatured: true,
      },
      include: {
        template: {
          select: {
            name: true,
            description: true,
            previewImage: true,
          },
        },
      },
      orderBy: [
        { downloadCount: 'desc' },
        { ratingAverage: 'desc' },
      ],
      take: limit,
    });
  }

  async searchTemplates(query: string, industry?: string, templateType?: string) {
    const where: any = {
      status: 'published',
    };

    if (query) {
      where.OR = [
        { title: { contains: query, mode: 'insensitive' } },
        { description: { contains: query, mode: 'insensitive' } },
        { tags: { hasSome: [query] } },
      ];
    }

    if (industry) {
      where.industry = industry;
    }

    if (templateType) {
      where.templateType = templateType;
    }

    return await this.prisma.templateBuilderMarketplace.findMany({
      where,
      include: {
        template: {
          select: {
            name: true,
            description: true,
            previewImage: true,
          },
        },
      },
      orderBy: [
        { downloadCount: 'desc' },
        { ratingAverage: 'desc' },
      ],
    });
  }
}