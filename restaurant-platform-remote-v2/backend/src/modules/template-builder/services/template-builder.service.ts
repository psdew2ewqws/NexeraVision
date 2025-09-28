import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { BaseService, BaseEntity, BaseUser } from '../../../common/services/base.service';
import {
  CreateTemplateDto,
  UpdateTemplateDto,
  TemplateFilterDto,
  CreateComponentDto,
  UpdateComponentDto
} from '../dto';

export interface TemplateBuilderEntity extends BaseEntity {
  companyId: string;
  name: string;
  isActive: boolean;
}

@Injectable()
export class TemplateBuilderService extends BaseService<TemplateBuilderEntity> {
  constructor(protected readonly prisma: PrismaService) {
    super(prisma, 'templateBuilderTemplate');
  }

  // Get templates with filtering and pagination
  async getTemplates(filters: TemplateFilterDto, userCompanyId?: string, userRole?: string) {
    const {
      search,
      categoryId,
      branchId,
      tags,
      isDefault,
      isPublic,
      isActive,
      sortBy = 'updatedAt',
      sortOrder = 'desc',
      page = 1,
      limit = 20
    } = filters;

    const currentUser: BaseUser = {
      id: 'system',
      companyId: userCompanyId || '',
      role: userRole || 'user'
    };

    // Build where clause
    const additionalWhere: any = {
      ...(categoryId && { categoryId }),
      ...(branchId && { branchId }),
      ...(isDefault !== undefined && { isDefault }),
      ...(isActive !== undefined && { isActive }),
      ...(tags?.length && { tags: { hasEvery: tags } }),
    };

    // Build where clause manually (not using BaseService since TemplateBuilderTemplate doesn't extend BaseEntity)
    const where: any = {
      ...additionalWhere,
    };

    // Super admin can see all, others only their company's templates + public templates
    if (userRole !== 'super_admin') {
      where.OR = [
        { companyId: userCompanyId },
        { isPublic: true }
      ];
    }

    // Add search functionality
    if (search) {
      const searchConditions = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { tags: { has: search } }
      ];

      if (where.OR) {
        where.AND = [
          { OR: where.OR },
          { OR: searchConditions }
        ];
        delete where.OR;
      } else {
        where.OR = searchConditions;
      }
    }

    // Get total count
    const total = await this.prisma.templateBuilderTemplate.count({ where });

    // Get templates with relations
    const templates = await this.prisma.templateBuilderTemplate.findMany({
      where,
      include: {
        category: true,
        company: {
          select: {
            id: true,
            name: true
          }
        },
        components: {
          orderBy: { sortOrder: 'asc' }
        },
        parentTemplate: {
          select: {
            id: true,
            name: true
          }
        },
        _count: {
          select: {
            childTemplates: true,
            printJobs: true
          }
        }
      },
      orderBy: {
        [sortBy]: sortOrder
      },
      skip: (page - 1) * limit,
      take: limit
    });

    return {
      templates,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit)
      }
    };
  }

  // Get single template by ID
  async getTemplate(id: string, userCompanyId?: string, userRole?: string) {
    const template = await this.prisma.templateBuilderTemplate.findUnique({
      where: { id },
      include: {
        category: true,
        company: {
          select: {
            id: true,
            name: true
          }
        },
        components: {
          include: {
            parent: true,
            children: true
          },
          orderBy: { sortOrder: 'asc' }
        },
        parentTemplate: true,
        childTemplates: {
          select: {
            id: true,
            name: true,
            version: true
          }
        },
        versions: {
          orderBy: { version: 'desc' },
          take: 5
        },
        analytics: {
          where: {
            createdAt: {
              gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
            }
          }
        }
      }
    });

    if (!template) {
      throw new NotFoundException('Template not found');
    }

    // Check permissions
    if (userRole !== 'super_admin' && template.companyId !== userCompanyId && !template.isPublic) {
      throw new ForbiddenException('Access denied to this template');
    }

    return template;
  }

  // Create new template
  async createTemplate(createTemplateDto: CreateTemplateDto, userCompanyId: string, userId: string) {
    // Validate category exists
    const category = await this.prisma.templateCategory.findUnique({
      where: { id: createTemplateDto.categoryId }
    });

    if (!category) {
      throw new BadRequestException('Invalid category ID');
    }

    // Set default canvas settings if not provided
    const defaultCanvasSettings = {
      width: 384, // 58mm at 180 DPI
      height: 800,
      paperType: '58mm',
      margins: { top: 8, bottom: 8, left: 8, right: 8 }
    };

    const defaultPrintSettings = {
      density: 'medium',
      encoding: 'utf8',
      autocut: true,
      cashdraw: false,
      copies: 1
    };

    const template = await this.prisma.templateBuilderTemplate.create({
      data: {
        ...createTemplateDto,
        companyId: userCompanyId,
        createdBy: userId,
        canvasSettings: createTemplateDto.canvasSettings as any || defaultCanvasSettings,
        printSettings: createTemplateDto.printSettings as any || defaultPrintSettings,
        designData: createTemplateDto.designData || {}
      },
      include: {
        category: true,
        company: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    return template;
  }

  // Update template
  async updateTemplate(id: string, updateTemplateDto: UpdateTemplateDto, userCompanyId?: string, userRole?: string, userId?: string) {
    const template = await this.getTemplate(id, userCompanyId, userRole);

    // Only company members or super admin can update
    if (userRole !== 'super_admin' && template.companyId !== userCompanyId) {
      throw new ForbiddenException('Cannot update template from different company');
    }

    // Create new version if design data changed
    if (updateTemplateDto.designData && JSON.stringify(updateTemplateDto.designData) !== JSON.stringify(template.designData)) {
      await this.prisma.templateBuilderVersion.create({
        data: {
          templateId: id,
          version: template.version + 1,
          designData: template.designData,
          canvasSettings: template.canvasSettings,
          printSettings: template.printSettings,
          createdBy: userId || template.createdBy
        }
      });

      updateTemplateDto.version = template.version + 1;
    }

    const updatedTemplate = await this.prisma.templateBuilderTemplate.update({
      where: { id },
      data: {
        ...(updateTemplateDto as any),
        updatedBy: userId
      },
      include: {
        category: true,
        company: {
          select: {
            id: true,
            name: true
          }
        },
        components: {
          orderBy: { sortOrder: 'asc' }
        }
      }
    });

    return updatedTemplate;
  }

  // Delete template
  async deleteTemplate(id: string, userCompanyId?: string, userRole?: string) {
    const template = await this.getTemplate(id, userCompanyId, userRole);

    // Only company owner or super admin can delete
    if (userRole !== 'super_admin' && userRole !== 'company_owner' && template.companyId !== userCompanyId) {
      throw new ForbiddenException('Insufficient permissions to delete template');
    }

    await this.prisma.templateBuilderTemplate.delete({
      where: { id }
    });

    return { message: 'Template deleted successfully' };
  }

  // Get template categories
  async getCategories() {
    return this.prisma.templateCategory.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' }
    });
  }

  // Template components CRUD
  async getComponents(templateId: string, userCompanyId?: string, userRole?: string) {
    await this.getTemplate(templateId, userCompanyId, userRole); // Verify access

    return this.prisma.templateBuilderComponent.findMany({
      where: { templateId },
      include: {
        parent: true,
        children: true
      },
      orderBy: { sortOrder: 'asc' }
    });
  }

  async createComponent(createComponentDto: CreateComponentDto, userCompanyId?: string, userRole?: string, userId?: string) {
    await this.getTemplate(createComponentDto.templateId, userCompanyId, userRole);

    return this.prisma.templateBuilderComponent.create({
      data: {
        ...(createComponentDto as any)
      }
    });
  }

  async updateComponent(id: string, updateComponentDto: UpdateComponentDto, userCompanyId?: string, userRole?: string, userId?: string) {
    const component = await this.prisma.templateBuilderComponent.findUnique({
      where: { id },
      include: { template: true }
    });

    if (!component) {
      throw new NotFoundException('Component not found');
    }

    await this.getTemplate(component.templateId, userCompanyId, userRole);

    return this.prisma.templateBuilderComponent.update({
      where: { id },
      data: {
        ...(updateComponentDto as any)
      }
    });
  }

  async deleteComponent(id: string, userCompanyId?: string, userRole?: string) {
    const component = await this.prisma.templateBuilderComponent.findUnique({
      where: { id },
      include: { template: true }
    });

    if (!component) {
      throw new NotFoundException('Component not found');
    }

    await this.getTemplate(component.templateId, userCompanyId, userRole);

    await this.prisma.templateBuilderComponent.delete({
      where: { id }
    });

    return { message: 'Component deleted successfully' };
  }

  // Duplicate template
  async duplicateTemplate(id: string, name: string, userCompanyId?: string, userRole?: string, userId?: string) {
    const originalTemplate = await this.getTemplate(id, userCompanyId, userRole);

    const duplicatedTemplate = await this.prisma.templateBuilderTemplate.create({
      data: {
        name,
        description: originalTemplate.description,
        categoryId: originalTemplate.categoryId,
        branchId: originalTemplate.branchId,
        companyId: userCompanyId || originalTemplate.companyId,
        designData: originalTemplate.designData,
        canvasSettings: originalTemplate.canvasSettings,
        printSettings: originalTemplate.printSettings,
        tags: originalTemplate.tags,
        parentTemplateId: originalTemplate.id,
        createdBy: userId || 'system'
      }
    });

    // Duplicate components
    const components = await this.prisma.templateBuilderComponent.findMany({
      where: { templateId: id }
    });

    for (const component of components) {
      await this.prisma.templateBuilderComponent.create({
        data: {
          templateId: duplicatedTemplate.id,
          type: component.type,
          name: component.name,
          position: component.position,
          properties: component.properties,
          styles: component.styles,
          sortOrder: component.sortOrder,
          dataBinding: component.dataBinding
        } as any
      });
    }

    return this.getTemplate(duplicatedTemplate.id, userCompanyId, userRole);
  }

  // Get template analytics
  async getTemplateAnalytics(templateId: string) {
    const analytics = await this.prisma.templateBuilderAnalytics.findMany({
      where: {
        templateId,
        createdAt: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    const printJobsCount = await this.prisma.templateBuilderPrintJob.count({
      where: {
        templateId,
        createdAt: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        }
      }
    });

    return {
      analytics,
      printJobsCount,
      avgPerDay: Math.round(printJobsCount / 30)
    };
  }
}