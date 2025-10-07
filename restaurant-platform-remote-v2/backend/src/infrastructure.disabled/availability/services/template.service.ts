import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import {
  CreateAvailabilityTemplateDto,
  UpdateAvailabilityTemplateDto,
  ApplyTemplateDto,
  TemplateFiltersDto,
  TemplateType,
  AvailabilityChangeType
} from '../dto';

@Injectable()
export class TemplateService {
  constructor(private readonly prisma: PrismaService) {}

  // ========================
  // TEMPLATE CRUD OPERATIONS
  // ========================

  async createTemplate(data: CreateAvailabilityTemplateDto, companyId: string, userId?: string) {
    const template = await this.prisma.availabilityTemplate.create({
      data: {
        ...data,
        companyId,
        templateType: data.templateType as any,
        configuration: data.configuration,
        createdBy: userId
      }
    });

    return template;
  }

  async updateTemplate(id: string, data: UpdateAvailabilityTemplateDto, companyId: string) {
    const existing = await this.prisma.availabilityTemplate.findFirst({
      where: { id, companyId }
    });

    if (!existing) {
      throw new NotFoundException('Template not found');
    }

    const updated = await this.prisma.availabilityTemplate.update({
      where: { id },
      data: {
        ...data,
        templateType: data.templateType ? data.templateType as any : existing.templateType,
        configuration: data.configuration || existing.configuration
      }
    });

    return updated;
  }

  async deleteTemplate(id: string, companyId: string) {
    const existing = await this.prisma.availabilityTemplate.findFirst({
      where: { id, companyId }
    });

    if (!existing) {
      throw new NotFoundException('Template not found');
    }

    await this.prisma.availabilityTemplate.delete({
      where: { id }
    });

    return { success: true, message: 'Template deleted successfully' };
  }

  async getTemplates(filters: TemplateFiltersDto, companyId: string) {
    const {
      search,
      templateType,
      isActive,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = filters;

    const where: any = { companyId };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } }
      ];
    }

    if (templateType) where.templateType = templateType;
    if (isActive !== undefined) where.isActive = isActive;

    const templates = await this.prisma.availabilityTemplate.findMany({
      where,
      orderBy: { [sortBy]: sortOrder }
    });

    return {
      templates,
      total: templates.length
    };
  }

  async getTemplate(id: string, companyId: string) {
    const template = await this.prisma.availabilityTemplate.findFirst({
      where: { id, companyId }
    });

    if (!template) {
      throw new NotFoundException('Template not found');
    }

    return template;
  }

  // ========================
  // TEMPLATE APPLICATION
  // ========================

  async applyTemplate(data: ApplyTemplateDto, companyId: string, userId?: string) {
    const template = await this.getTemplate(data.templateId, companyId);
    
    if (!template.isActive) {
      throw new BadRequestException('Cannot apply inactive template');
    }

    const config = template.configuration as any;
    const batchId = `template_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    if (data.previewOnly) {
      return this.previewTemplateApplication(data, template, companyId);
    }

    let appliedCount = 0;
    let skippedCount = 0;
    const results = [];

    // Apply template to all combinations of connected items and branches
    for (const connectedId of data.connectedIds) {
      for (const branchId of data.branchIds) {
        try {
          // Check if availability already exists
          const existing = await this.prisma.branchAvailability.findFirst({
            where: {
              connectedId,
              branchId,
              companyId
            }
          });

          if (existing && !data.overrideExisting) {
            skippedCount++;
            results.push({
              connectedId,
              branchId,
              status: 'skipped',
              reason: 'Already exists'
            });
            continue;
          }

          const availabilityData = {
            connectedId,
            branchId,
            companyId,
            connectedType: 'product' as any, // We'll need to determine this properly
            isInStock: config.isInStock ?? true,
            isActive: config.isActive ?? true,
            stockLevel: config.stockLevel,
            lowStockThreshold: config.lowStockThreshold,
            prices: config.prices || {},
            taxes: config.taxes || {},
            availableFrom: config.availableFrom,
            availableTo: config.availableTo,
            availableDays: config.availableDays || [],
            notes: `Applied from template: ${template.name}`,
            priority: config.priority || 0,
            createdBy: userId,
            updatedBy: userId
          };

          if (existing) {
            // Update existing
            await this.prisma.branchAvailability.update({
              where: { id: existing.id },
              data: availabilityData
            });

            // Create audit log
            await this.prisma.availabilityAuditLog.create({
              data: {
                branchAvailabilityId: existing.id,
                companyId,
                changeType: AvailabilityChangeType.TEMPLATE_APPLIED as any,
                oldValue: existing,
                newValue: availabilityData,
                changeReason: data.reason || `Template applied: ${template.name}`,
                userId,
                batchOperation: true,
                batchId
              }
            });

            appliedCount++;
            results.push({
              connectedId,
              branchId,
              status: 'updated',
              availabilityId: existing.id
            });
          } else {
            // Create new
            const newAvailability = await this.prisma.branchAvailability.create({
              data: availabilityData
            });

            // Create audit log
            await this.prisma.availabilityAuditLog.create({
              data: {
                branchAvailabilityId: newAvailability.id,
                companyId,
                changeType: AvailabilityChangeType.TEMPLATE_APPLIED as any,
                newValue: availabilityData,
                changeReason: data.reason || `Template applied: ${template.name}`,
                userId,
                batchOperation: true,
                batchId
              }
            });

            appliedCount++;
            results.push({
              connectedId,
              branchId,
              status: 'created',
              availabilityId: newAvailability.id
            });
          }
        } catch (error) {
          results.push({
            connectedId,
            branchId,
            status: 'error',
            error: error.message
          });
        }
      }
    }

    // Update template usage statistics
    await this.prisma.availabilityTemplate.update({
      where: { id: data.templateId },
      data: {
        lastAppliedAt: new Date(),
        appliedCount: { increment: appliedCount }
      }
    });

    return {
      success: true,
      template: template.name,
      appliedCount,
      skippedCount,
      totalRequested: data.connectedIds.length * data.branchIds.length,
      batchId,
      results,
      message: `Template applied successfully. ${appliedCount} records processed, ${skippedCount} skipped.`
    };
  }

  private async previewTemplateApplication(data: ApplyTemplateDto, template: any, companyId: string) {
    const config = template.configuration as any;
    const preview = [];

    for (const connectedId of data.connectedIds) {
      for (const branchId of data.branchIds) {
        const existing = await this.prisma.branchAvailability.findFirst({
          where: {
            connectedId,
            branchId,
            companyId
          }
        });

        preview.push({
          connectedId,
          branchId,
          currentStatus: existing ? {
            isInStock: existing.isInStock,
            isActive: existing.isActive,
            stockLevel: existing.stockLevel
          } : null,
          proposedStatus: {
            isInStock: config.isInStock ?? true,
            isActive: config.isActive ?? true,
            stockLevel: config.stockLevel
          },
          action: existing ? (data.overrideExisting ? 'update' : 'skip') : 'create'
        });
      }
    }

    return {
      template: template.name,
      preview,
      totalItems: preview.length,
      summary: {
        toCreate: preview.filter(p => p.action === 'create').length,
        toUpdate: preview.filter(p => p.action === 'update').length,
        toSkip: preview.filter(p => p.action === 'skip').length
      }
    };
  }

  // ========================
  // TEMPLATE SUGGESTIONS
  // ========================

  async suggestTemplates(connectedType: string, companyId: string) {
    // Get most commonly used templates for this type
    const templates = await this.prisma.availabilityTemplate.findMany({
      where: {
        companyId,
        isActive: true
      },
      orderBy: {
        appliedCount: 'desc'
      },
      take: 5
    });

    return {
      suggested: templates,
      message: 'Templates ordered by usage frequency'
    };
  }

  // ========================
  // PREDEFINED TEMPLATES
  // ========================

  async createPredefinedTemplates(companyId: string, userId?: string) {
    const predefinedTemplates = [
      {
        name: 'Standard Business Hours',
        description: 'Available during standard business hours (9 AM - 9 PM)',
        templateType: TemplateType.DAILY,
        configuration: {
          isActive: true,
          isInStock: true,
          availableFrom: '09:00',
          availableTo: '21:00',
          availableDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
        }
      },
      {
        name: 'Weekend Only',
        description: 'Available only on weekends',
        templateType: TemplateType.WEEKLY,
        configuration: {
          isActive: true,
          isInStock: true,
          availableDays: ['friday', 'saturday', 'sunday']
        }
      },
      {
        name: 'Limited Stock',
        description: 'Low stock template with alerts',
        templateType: TemplateType.DAILY,
        configuration: {
          isActive: true,
          isInStock: true,
          stockLevel: 10,
          lowStockThreshold: 3
        }
      },
      {
        name: 'Seasonal Item',
        description: 'Seasonal availability template',
        templateType: TemplateType.SEASONAL,
        configuration: {
          isActive: true,
          isInStock: true,
          priority: 1
        }
      }
    ];

    const results = [];
    for (const template of predefinedTemplates) {
      // Check if template with same name already exists
      const existing = await this.prisma.availabilityTemplate.findFirst({
        where: {
          name: template.name,
          companyId
        }
      });

      if (!existing) {
        const created = await this.prisma.availabilityTemplate.create({
          data: {
            ...template,
            companyId,
            templateType: template.templateType as any,
            createdBy: userId
          }
        });
        results.push(created);
      }
    }

    return {
      success: true,
      createdTemplates: results,
      message: `Created ${results.length} predefined templates`
    };
  }
}