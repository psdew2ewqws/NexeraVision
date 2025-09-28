import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class TemplateVersionsService {
  constructor(private readonly prisma: PrismaService) {}

  async createVersion(templateId: string, versionData: any, tx?: any) {
    const prisma = tx || this.prisma;

    return await prisma.templateBuilderVersion.create({
      data: {
        templateId,
        version: versionData.version,
        designData: versionData.designData,
        canvasSettings: versionData.canvasSettings,
        printSettings: versionData.printSettings,
        changes: versionData.changes,
        createdBy: versionData.createdBy,
      },
    });
  }

  async getVersions(templateId: string, limit = 10) {
    return await this.prisma.templateBuilderVersion.findMany({
      where: { templateId },
      orderBy: { version: 'desc' },
      take: limit,
      select: {
        id: true,
        version: true,
        changes: true,
        createdAt: true,
        createdBy: true,
      },
    });
  }

  async restoreVersion(templateId: string, versionId: string, userId: string) {
    const version = await this.prisma.templateBuilderVersion.findUnique({
      where: { id: versionId },
      include: { template: true },
    });

    if (!version || version.templateId !== templateId) {
      throw new Error('Version not found');
    }

    // Create new version for the rollback
    const currentTemplate = await this.prisma.templateBuilderTemplate.findUnique({
      where: { id: templateId },
    });

    if (!currentTemplate) {
      throw new Error('Template not found');
    }

    return await this.prisma.$transaction(async (tx) => {
      // Create version record for current state
      await this.createVersion(templateId, {
        version: currentTemplate.version + 1,
        designData: currentTemplate.designData,
        canvasSettings: currentTemplate.canvasSettings,
        printSettings: currentTemplate.printSettings,
        changes: `Rollback to version ${version.version}`,
        createdBy: userId,
      }, tx);

      // Update template with version data
      const updatedTemplate = await tx.templateBuilderTemplate.update({
        where: { id: templateId },
        data: {
          designData: version.designData,
          canvasSettings: version.canvasSettings,
          printSettings: version.printSettings,
          version: currentTemplate.version + 1,
          updatedBy: userId,
        },
      });

      return updatedTemplate;
    });
  }
}