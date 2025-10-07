import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

export interface BaseEntity {
  id: string;
  deletedAt?: Date | null;
  companyId?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface BaseUser {
  id: string;
  companyId: string;
  role: string;
}

@Injectable()
export abstract class BaseService<T extends BaseEntity> {
  constructor(
    protected prisma: PrismaService,
    protected modelName: string,
  ) {}

  /**
   * Build common where clause for multi-tenant soft delete
   */
  protected buildBaseWhereClause(currentUser?: BaseUser, additionalWhere: any = {}): any {
    const where: any = {
      deletedAt: null,
      ...additionalWhere,
    };

    // Add company filter if user is provided and not super admin
    if (currentUser && currentUser.role !== 'super_admin') {
      where.companyId = currentUser.companyId;
    }

    return where;
  }

  /**
   * Common pagination logic
   */
  protected buildPaginationParams(page: number = 1, limit: number = 10) {
    const pageNum = Number(page) || 1;
    const limitNum = Number(limit) || 10;
    const skip = (pageNum - 1) * limitNum;
    
    return { skip, take: limitNum, pageNum, limitNum };
  }

  /**
   * Common entity not found error
   */
  protected throwNotFound(entityName: string, id: string): never {
    throw new NotFoundException(`${entityName} with ID ${id} not found`);
  }

  /**
   * Common soft delete operation
   */
  protected async softDelete(model: any, id: string, currentUser: { id: string; companyId: string; role: string }): Promise<void> {
    await model.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        updatedBy: currentUser.id,
      },
    });
  }
}