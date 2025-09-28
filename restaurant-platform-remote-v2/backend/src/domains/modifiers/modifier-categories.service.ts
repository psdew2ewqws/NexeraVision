import { Injectable, Logger, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../shared/database/prisma.service';
import { ModifierCategory, Prisma } from '@prisma/client';
import { CreateModifierCategoryDto } from './dto/create-modifier-category.dto';
import { UpdateModifierCategoryDto } from './dto/update-modifier-category.dto';

@Injectable()
export class ModifierCategoriesService {
  private readonly logger = new Logger(ModifierCategoriesService.name);

  constructor(private prisma: PrismaService) {}

  async create(createDto: CreateModifierCategoryDto, userCompanyId?: string): Promise<ModifierCategory> {
    try {
      const companyId = createDto.companyId || userCompanyId;

      if (!companyId) {
        throw new BadRequestException('Company ID is required');
      }

      // Validate selection type logic
      if (createDto.selectionType === 'single' && createDto.maxSelections > 1) {
        throw new BadRequestException('Single selection type cannot have maxSelections > 1');
      }

      if (createDto.minSelections > createDto.maxSelections) {
        throw new BadRequestException('minSelections cannot be greater than maxSelections');
      }

      const category = await this.prisma.modifierCategory.create({
        data: {
          companyId,
          name: createDto.name,
          description: createDto.description,
          selectionType: createDto.selectionType,
          isRequired: createDto.isRequired,
          minSelections: createDto.minSelections,
          maxSelections: createDto.maxSelections,
          displayNumber: createDto.displayNumber || 0,
          image: createDto.image,
        },
        include: {
          modifiers: {
            where: { deletedAt: null },
            orderBy: { displayNumber: 'asc' }
          },
          _count: {
            select: { modifiers: { where: { deletedAt: null } } }
          }
        }
      });

      this.logger.log(`Created modifier category: ${JSON.stringify(category.name)} for company ${companyId}`);
      return category;
    } catch (error) {
      this.logger.error(`Failed to create modifier category: ${error.message}`);
      throw error;
    }
  }

  async findAll(params: {
    companyId?: string;
    skip?: number;
    take?: number;
    search?: string;
  }) {
    const { companyId, skip, take = 50, search } = params;

    const where: Prisma.ModifierCategoryWhereInput = {
      deletedAt: null,
      ...(companyId && { companyId }),
      ...(search && {
        OR: [
          { name: { path: ['en'], string_contains: search } },
          { name: { path: ['ar'], string_contains: search } },
          { description: { path: ['en'], string_contains: search } },
          { description: { path: ['ar'], string_contains: search } },
        ]
      })
    };

    return this.prisma.modifierCategory.findMany({
      where,
      skip,
      take,
      orderBy: { displayNumber: 'asc' },
      include: {
        modifiers: {
          where: { deletedAt: null, status: 1 },
          orderBy: { displayNumber: 'asc' },
          take: 20
        },
        _count: {
          select: { 
            modifiers: { where: { deletedAt: null } },
            productCategories: true
          }
        }
      }
    });
  }

  async findOne(id: string, companyId?: string): Promise<ModifierCategory> {
    const category = await this.prisma.modifierCategory.findFirst({
      where: {
        id,
        deletedAt: null,
        ...(companyId && { companyId })
      },
      include: {
        modifiers: {
          where: { deletedAt: null },
          orderBy: { displayNumber: 'asc' }
        },
        productCategories: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                basePrice: true
              }
            }
          }
        },
        _count: {
          select: { modifiers: { where: { deletedAt: null } } }
        }
      }
    });

    if (!category) {
      throw new NotFoundException(`Modifier category with ID ${id} not found`);
    }

    return category;
  }

  async update(id: string, updateDto: UpdateModifierCategoryDto, companyId?: string): Promise<ModifierCategory> {
    try {
      // Validate selection type logic if provided
      if (updateDto.selectionType === 'single' && updateDto.maxSelections && updateDto.maxSelections > 1) {
        throw new BadRequestException('Single selection type cannot have maxSelections > 1');
      }

      if (updateDto.minSelections && updateDto.maxSelections && updateDto.minSelections > updateDto.maxSelections) {
        throw new BadRequestException('minSelections cannot be greater than maxSelections');
      }

      const category = await this.prisma.modifierCategory.update({
        where: { 
          id,
          deletedAt: null,
          ...(companyId && { companyId })
        },
        data: {
          ...updateDto,
          updatedAt: new Date()
        },
        include: {
          modifiers: {
            where: { deletedAt: null },
            orderBy: { displayNumber: 'asc' }
          },
          _count: {
            select: { modifiers: { where: { deletedAt: null } } }
          }
        }
      });

      this.logger.log(`Updated modifier category: ${id}`);
      return category;
    } catch (error) {
      if (error.code === 'P2025') {
        throw new NotFoundException(`Modifier category with ID ${id} not found`);
      }
      this.logger.error(`Failed to update modifier category ${id}: ${error.message}`);
      throw error;
    }
  }

  async remove(id: string, companyId?: string): Promise<ModifierCategory> {
    try {
      // Check if category is used by products
      const usage = await this.prisma.productModifierCategory.count({
        where: { modifierCategoryId: id }
      });

      if (usage > 0) {
        throw new ConflictException(`Cannot delete modifier category. It is used by ${usage} product(s)`);
      }

      const category = await this.prisma.modifierCategory.update({
        where: { 
          id,
          deletedAt: null,
          ...(companyId && { companyId })
        },
        data: {
          deletedAt: new Date(),
          updatedAt: new Date()
        }
      });

      this.logger.log(`Soft deleted modifier category: ${id}`);
      return category;
    } catch (error) {
      if (error.code === 'P2025') {
        throw new NotFoundException(`Modifier category with ID ${id} not found`);
      }
      this.logger.error(`Failed to delete modifier category ${id}: ${error.message}`);
      throw error;
    }
  }

  async getStatistics(companyId?: string) {
    const where = {
      deletedAt: null,
      ...(companyId && { companyId })
    };

    const [
      totalCategories,
      activeCategories,
      requiredCategories,
      categoriesWithModifiers
    ] = await Promise.all([
      this.prisma.modifierCategory.count({ where }),
      this.prisma.modifierCategory.count({ where: { ...where } }),
      this.prisma.modifierCategory.count({ where: { ...where, isRequired: true } }),
      this.prisma.modifierCategory.count({
        where: {
          ...where,
          modifiers: { some: { deletedAt: null } }
        }
      })
    ]);

    return {
      total: totalCategories,
      active: activeCategories,
      required: requiredCategories,
      withModifiers: categoriesWithModifiers,
      empty: totalCategories - categoriesWithModifiers
    };
  }
}