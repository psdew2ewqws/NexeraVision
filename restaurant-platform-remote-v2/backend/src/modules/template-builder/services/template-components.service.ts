import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class TemplateComponentsService {
  constructor(private readonly prisma: PrismaService) {}

  async findByTemplateId(templateId: string) {
    return await this.prisma.templateBuilderComponent.findMany({
      where: { templateId },
      orderBy: [
        { sortOrder: 'asc' },
        { zIndex: 'asc' },
        { createdAt: 'asc' },
      ],
    });
  }

  async updateComponent(id: string, updateData: any) {
    return await this.prisma.templateBuilderComponent.update({
      where: { id },
      data: updateData,
    });
  }

  async deleteComponent(id: string) {
    return await this.prisma.templateBuilderComponent.delete({
      where: { id },
    });
  }
}