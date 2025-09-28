import { Injectable, NotFoundException, ForbiddenException, BadRequestException, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import {
  CreateBranchAvailabilityDto,
  UpdateBranchAvailabilityDto,
  BulkAvailabilityUpdateDto,
  BulkCreateAvailabilityDto,
  AvailabilityFiltersDto,
  QuickFiltersDto,
  CreateAvailabilityTemplateDto,
  UpdateAvailabilityTemplateDto,
  ApplyTemplateDto,
  CreateAvailabilityAlertDto,
  UpdateAvailabilityAlertDto,
  AlertFiltersDto,
  ConnectedType,
  AvailabilityChangeType
} from './dto';
import { AvailabilityGateway } from './availability.gateway';

@Injectable()
export class AvailabilityService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => AvailabilityGateway))
    private readonly availabilityGateway: AvailabilityGateway
  ) {}

  // ========================
  // BRANCH AVAILABILITY CRUD
  // ========================

  async createBranchAvailability(data: CreateBranchAvailabilityDto, companyId: string, userId?: string) {
    // Validate the connected item exists and belongs to the company
    await this.validateConnectedItem(data.connectedId, data.connectedType, companyId);

    // Check if availability already exists for this item/branch combination
    const existing = await this.prisma.branchAvailability.findFirst({
      where: {
        connectedId: data.connectedId,
        connectedType: data.connectedType as any,
        branchId: data.branchId,
        companyId
      }
    });

    if (existing) {
      throw new BadRequestException('Availability already exists for this item and branch');
    }

    const availability = await this.prisma.branchAvailability.create({
      data: {
        ...data,
        companyId,
        connectedType: data.connectedType as any,
        prices: data.prices || {},
        createdBy: userId
      },
      include: {
        branch: { select: { id: true, name: true, nameAr: true } }
      }
    });

    // Create audit log
    await this.createAuditLog({
      branchAvailabilityId: availability.id,
      companyId,
      changeType: AvailabilityChangeType.STATUS_CHANGE,
      newValue: { created: true },
      userId,
      changeReason: 'Initial availability creation'
    });

    // Broadcast real-time update
    if (this.availabilityGateway) {
      await this.availabilityGateway.broadcastAvailabilityUpdate({
        id: availability.id,
        companyId,
        branchId: data.branchId,
        connectedId: data.connectedId,
        connectedType: data.connectedType,
        isActive: data.isActive ?? true,
        isInStock: data.isInStock ?? true,
        stockLevel: data.stockLevel,
        prices: data.prices || {},
        notes: data.notes,
        updatedBy: userId || 'system',
        updatedAt: new Date()
      });
    }

    return availability;
  }

  async updateBranchAvailability(
    id: string, 
    data: UpdateBranchAvailabilityDto, 
    companyId: string, 
    userId?: string
  ) {
    const existing = await this.prisma.branchAvailability.findFirst({
      where: { id, companyId }
    });

    if (!existing) {
      throw new NotFoundException('Branch availability not found');
    }

    // Store old values for audit
    const oldValue = {
      isInStock: existing.isInStock,
      isActive: existing.isActive,
      stockLevel: existing.stockLevel,
      prices: existing.prices
    };

    const updated = await this.prisma.branchAvailability.update({
      where: { id },
      data: {
        ...data,
        prices: data.prices ? { ...existing.prices as any, ...data.prices } : existing.prices,
        updatedBy: userId,
        lastStockUpdate: data.stockLevel !== undefined ? new Date() : existing.lastStockUpdate
      },
      include: {
        branch: { select: { id: true, name: true, nameAr: true } }
      }
    });

    // Create audit log
    await this.createAuditLog({
      branchAvailabilityId: id,
      companyId,
      changeType: this.determineChangeType(data),
      oldValue,
      newValue: data,
      userId,
      changeReason: data.changeReason || 'Manual update'
    });

    // Check for low stock alerts
    if (data.stockLevel !== undefined) {
      await this.checkStockAlerts(updated);
    }

    // Broadcast real-time update
    if (this.availabilityGateway) {
      await this.availabilityGateway.broadcastAvailabilityUpdate({
        id: updated.id,
        companyId,
        branchId: updated.branchId,
        connectedId: updated.connectedId,
        connectedType: updated.connectedType as any,
        isActive: updated.isActive,
        isInStock: updated.isInStock,
        stockLevel: updated.stockLevel,
        prices: updated.prices as any,
        notes: updated.notes,
        updatedBy: userId || 'system',
        updatedAt: new Date()
      });
    }

    return updated;
  }

  async deleteBranchAvailability(id: string, companyId: string, userId?: string) {
    const existing = await this.prisma.branchAvailability.findFirst({
      where: { id, companyId }
    });

    if (!existing) {
      throw new NotFoundException('Branch availability not found');
    }

    await this.prisma.branchAvailability.delete({
      where: { id }
    });

    // Create audit log
    await this.createAuditLog({
      branchAvailabilityId: id,
      companyId,
      changeType: AvailabilityChangeType.STATUS_CHANGE,
      oldValue: existing,
      newValue: { deleted: true },
      userId,
      changeReason: 'Availability deleted'
    });

    return { success: true, message: 'Branch availability deleted successfully' };
  }

  // ========================
  // BULK OPERATIONS
  // ========================

  async bulkUpdateAvailability(
    data: BulkAvailabilityUpdateDto, 
    companyId: string, 
    userId?: string
  ) {
    const batchId = `bulk_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const results = [];

    // Validate all availability records belong to the company
    const availabilities = await this.prisma.branchAvailability.findMany({
      where: {
        id: { in: data.availabilityIds },
        companyId
      }
    });

    if (availabilities.length !== data.availabilityIds.length) {
      throw new BadRequestException('Some availability records not found or access denied');
    }

    // Perform bulk update
    const updateData: any = {};
    if (data.isInStock !== undefined) updateData.isInStock = data.isInStock;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;
    if (data.stockLevel !== undefined) {
      updateData.stockLevel = data.stockLevel;
      updateData.lastStockUpdate = new Date();
    }
    if (data.prices) updateData.prices = data.prices;
    if (data.availableFrom) updateData.availableFrom = data.availableFrom;
    if (data.availableTo) updateData.availableTo = data.availableTo;
    if (data.availableDays) updateData.availableDays = data.availableDays;
    if (data.priority !== undefined) updateData.priority = data.priority;

    updateData.updatedBy = userId;

    await this.prisma.branchAvailability.updateMany({
      where: {
        id: { in: data.availabilityIds },
        companyId
      },
      data: updateData
    });

    // Create audit logs for all updated items
    for (const availability of availabilities) {
      await this.createAuditLog({
        branchAvailabilityId: availability.id,
        companyId,
        changeType: AvailabilityChangeType.BULK_OPERATION,
        oldValue: { 
          isInStock: availability.isInStock,
          isActive: availability.isActive,
          stockLevel: availability.stockLevel
        },
        newValue: updateData,
        userId,
        changeReason: data.changeReason || 'Bulk update operation',
        batchOperation: true,
        batchId
      });
    }

    // Broadcast bulk update via WebSocket
    if (this.availabilityGateway) {
      const updatedRecords = await this.prisma.branchAvailability.findMany({
        where: {
          id: { in: data.availabilityIds },
          companyId
        }
      });

      const updates = updatedRecords.map(record => ({
        id: record.id,
        companyId,
        branchId: record.branchId,
        connectedId: record.connectedId,
        connectedType: record.connectedType as any,
        isActive: record.isActive,
        isInStock: record.isInStock,
        stockLevel: record.stockLevel,
        prices: record.prices as any,
        notes: record.notes,
        updatedBy: userId || 'system',
        updatedAt: new Date()
      }));

      await this.availabilityGateway.broadcastBulkAvailabilityUpdate(updates);
    }

    return {
      success: true,
      updatedCount: availabilities.length,
      batchId,
      message: `Successfully updated ${availabilities.length} availability records`
    };
  }

  async bulkCreateAvailability(
    data: BulkCreateAvailabilityDto, 
    companyId: string, 
    userId?: string
  ) {
    const batchId = `bulk_create_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Validate all connected items exist
    for (const connectedId of data.connectedIds) {
      await this.validateConnectedItem(connectedId, data.connectedType, companyId);
    }

    // Create availability records for all combinations
    const availabilityData = [];
    for (const connectedId of data.connectedIds) {
      for (const branchId of data.branchIds) {
        // Check if already exists
        const existing = await this.prisma.branchAvailability.findFirst({
          where: {
            connectedId,
            connectedType: data.connectedType as any,
            branchId,
            companyId
          }
        });

        if (!existing) {
          availabilityData.push({
            connectedId,
            connectedType: data.connectedType as any,
            branchId,
            companyId,
            isInStock: data.isInStock ?? true,
            isActive: data.isActive ?? true,
            stockLevel: data.stockLevel,
            prices: data.prices || {},
            availableFrom: data.availableFrom,
            availableTo: data.availableTo,
            availableDays: data.availableDays || [],
            notes: data.notes,
            createdBy: userId
          });
        }
      }
    }

    const created = await this.prisma.branchAvailability.createMany({
      data: availabilityData,
      skipDuplicates: true
    });

    // Broadcast bulk create via WebSocket
    if (this.availabilityGateway && created.count > 0) {
      const updates = availabilityData.map(record => ({
        id: `bulk-${batchId}-${record.connectedId}-${record.branchId}`, // Temporary ID for new records
        companyId,
        branchId: record.branchId,
        connectedId: record.connectedId,
        connectedType: record.connectedType as any,
        isActive: record.isActive,
        isInStock: record.isInStock,
        stockLevel: record.stockLevel,
        prices: record.prices as any,
        notes: record.notes,
        updatedBy: userId || 'system',
        updatedAt: new Date()
      }));

      await this.availabilityGateway.broadcastBulkAvailabilityUpdate(updates);
    }

    return {
      success: true,
      createdCount: created.count,
      batchId,
      message: `Successfully created ${created.count} availability records`
    };
  }

  // Enhanced bulk operations
  async bulkDeleteAvailability(
    availabilityIds: string[],
    companyId: string,
    userId?: string
  ) {
    const batchId = `bulk_delete_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Validate all availability records belong to the company
    const availabilities = await this.prisma.branchAvailability.findMany({
      where: {
        id: { in: availabilityIds },
        companyId
      }
    });

    if (availabilities.length !== availabilityIds.length) {
      throw new BadRequestException('Some availability records not found or access denied');
    }

    // Create audit logs before deletion
    for (const availability of availabilities) {
      await this.createAuditLog({
        branchAvailabilityId: availability.id,
        companyId,
        changeType: AvailabilityChangeType.STATUS_CHANGE,
        oldValue: { deleted: false },
        newValue: { deleted: true },
        userId,
        changeReason: 'Bulk delete operation',
        batchOperation: true,
        batchId
      });
    }

    // Delete records
    const deleted = await this.prisma.branchAvailability.deleteMany({
      where: {
        id: { in: availabilityIds },
        companyId
      }
    });

    // Broadcast bulk delete via WebSocket
    if (this.availabilityGateway) {
      const updates = availabilities.map(record => ({
        id: record.id,
        companyId,
        branchId: record.branchId,
        connectedId: record.connectedId,
        connectedType: record.connectedType as any,
        isActive: false, // Mark as inactive for real-time updates
        isInStock: false,
        stockLevel: 0,
        prices: {},
        notes: 'Deleted',
        updatedBy: userId || 'system',
        updatedAt: new Date()
      }));

      await this.availabilityGateway.broadcastBulkAvailabilityUpdate(updates);
    }

    return {
      success: true,
      deletedCount: deleted.count,
      batchId,
      message: `Successfully deleted ${deleted.count} availability records`
    };
  }

  async bulkStatusChange(
    availabilityIds: string[],
    isActive: boolean,
    companyId: string,
    userId?: string,
    changeReason?: string
  ) {
    const batchId = `bulk_status_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Validate all availability records belong to the company
    const availabilities = await this.prisma.branchAvailability.findMany({
      where: {
        id: { in: availabilityIds },
        companyId
      }
    });

    if (availabilities.length !== availabilityIds.length) {
      throw new BadRequestException('Some availability records not found or access denied');
    }

    // Update status
    const updated = await this.prisma.branchAvailability.updateMany({
      where: {
        id: { in: availabilityIds },
        companyId
      },
      data: {
        isActive,
        updatedBy: userId,
        updatedAt: new Date()
      }
    });

    // Create audit logs
    for (const availability of availabilities) {
      await this.createAuditLog({
        branchAvailabilityId: availability.id,
        companyId,
        changeType: AvailabilityChangeType.STATUS_CHANGE,
        oldValue: { isActive: availability.isActive },
        newValue: { isActive },
        userId,
        changeReason: changeReason || `Bulk ${isActive ? 'activation' : 'deactivation'} operation`,
        batchOperation: true,
        batchId
      });
    }

    // Broadcast bulk status change via WebSocket
    if (this.availabilityGateway) {
      const updatedRecords = await this.prisma.branchAvailability.findMany({
        where: {
          id: { in: availabilityIds },
          companyId
        }
      });

      const updates = updatedRecords.map(record => ({
        id: record.id,
        companyId,
        branchId: record.branchId,
        connectedId: record.connectedId,
        connectedType: record.connectedType as any,
        isActive: record.isActive,
        isInStock: record.isInStock,
        stockLevel: record.stockLevel,
        prices: record.prices as any,
        notes: record.notes,
        updatedBy: userId || 'system',
        updatedAt: new Date()
      }));

      await this.availabilityGateway.broadcastBulkAvailabilityUpdate(updates);
    }

    return {
      success: true,
      updatedCount: updated.count,
      batchId,
      status: isActive ? 'activated' : 'deactivated',
      message: `Successfully ${isActive ? 'activated' : 'deactivated'} ${updated.count} availability records`
    };
  }

  async bulkStockUpdate(
    availabilityIds: string[],
    stockLevel: number,
    companyId: string,
    userId?: string,
    changeReason?: string
  ) {
    const batchId = `bulk_stock_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Validate all availability records belong to the company
    const availabilities = await this.prisma.branchAvailability.findMany({
      where: {
        id: { in: availabilityIds },
        companyId
      }
    });

    if (availabilities.length !== availabilityIds.length) {
      throw new BadRequestException('Some availability records not found or access denied');
    }

    // Update stock levels
    const updated = await this.prisma.branchAvailability.updateMany({
      where: {
        id: { in: availabilityIds },
        companyId
      },
      data: {
        stockLevel,
        lastStockUpdate: new Date(),
        isInStock: stockLevel > 0,
        updatedBy: userId,
        updatedAt: new Date()
      }
    });

    // Create audit logs and check for stock alerts
    for (const availability of availabilities) {
      await this.createAuditLog({
        branchAvailabilityId: availability.id,
        companyId,
        changeType: AvailabilityChangeType.STOCK_UPDATE,
        oldValue: { stockLevel: availability.stockLevel },
        newValue: { stockLevel },
        userId,
        changeReason: changeReason || 'Bulk stock update operation',
        batchOperation: true,
        batchId
      });

      // Check for stock alerts
      if (availability.lowStockThreshold && stockLevel <= availability.lowStockThreshold) {
        // Generate stock alert via gateway
        if (this.availabilityGateway) {
          await this.availabilityGateway.broadcastStockAlert({
            id: `alert-${availability.id}-${Date.now()}`,
            companyId,
            branchId: availability.branchId,
            connectedId: availability.connectedId,
            connectedType: availability.connectedType,
            alertType: stockLevel === 0 ? 'out_of_stock' : 'low_stock',
            message: stockLevel === 0 
              ? `${availability.connectedType} is out of stock` 
              : `${availability.connectedType} stock is low (${stockLevel} remaining)`,
            priority: stockLevel === 0 ? 'critical' : 'high',
            currentStock: stockLevel,
            threshold: availability.lowStockThreshold
          });
        }
      }
    }

    // Broadcast bulk stock update via WebSocket
    if (this.availabilityGateway) {
      const updatedRecords = await this.prisma.branchAvailability.findMany({
        where: {
          id: { in: availabilityIds },
          companyId
        }
      });

      const updates = updatedRecords.map(record => ({
        id: record.id,
        companyId,
        branchId: record.branchId,
        connectedId: record.connectedId,
        connectedType: record.connectedType as any,
        isActive: record.isActive,
        isInStock: record.isInStock,
        stockLevel: record.stockLevel,
        prices: record.prices as any,
        notes: record.notes,
        updatedBy: userId || 'system',
        updatedAt: new Date()
      }));

      await this.availabilityGateway.broadcastBulkAvailabilityUpdate(updates);
    }

    return {
      success: true,
      updatedCount: updated.count,
      batchId,
      newStockLevel: stockLevel,
      message: `Successfully updated stock level to ${stockLevel} for ${updated.count} availability records`
    };
  }

  // ========================
  // SEARCH AND FILTERING
  // ========================

  async getAvailabilityWithFilters(filters: AvailabilityFiltersDto, companyId: string) {
    const {
      search,
      branchId,
      branchIds,
      connectedType,
      categoryId,
      isInStock,
      isActive,
      hasLowStock,
      minStockLevel,
      maxStockLevel,
      platforms,
      sortBy = 'updated_at',
      sortOrder = 'desc',
      page = 1,
      limit = 20
    } = filters;

    const where: any = { companyId };

    // Basic filters
    if (branchId) where.branchId = branchId;
    if (branchIds?.length) where.branchId = { in: branchIds };
    if (connectedType) where.connectedType = connectedType;
    if (isInStock !== undefined) where.isInStock = isInStock;
    if (isActive !== undefined) where.isActive = isActive;

    // Stock level filters
    if (minStockLevel !== undefined || maxStockLevel !== undefined) {
      where.stockLevel = {};
      if (minStockLevel !== undefined) where.stockLevel.gte = minStockLevel;
      if (maxStockLevel !== undefined) where.stockLevel.lte = maxStockLevel;
    }

    // Low stock filter
    if (hasLowStock) {
      where.AND = [
        { stockLevel: { not: null } },
        { lowStockThreshold: { not: null } },
        { stockLevel: { lte: this.prisma.branchAvailability.fields.lowStockThreshold } }
      ];
    }

    // Platform pricing filter
    if (platforms?.length) {
      where.OR = platforms.map(platform => ({
        prices: {
          path: [platform],
          not: null
        }
      }));
    }

    // Calculate offset
    const skip = (page - 1) * limit;

    // Execute query with relations
    const [items, total] = await Promise.all([
      this.prisma.branchAvailability.findMany({
        where,
        skip,
        take: limit,
        orderBy: this.buildOrderBy(sortBy, sortOrder),
        include: {
          branch: {
            select: { id: true, name: true, nameAr: true, isActive: true }
          }
        }
      }),
      this.prisma.branchAvailability.count({ where })
    ]);

    // Enrich with product/modifier information
    const enrichedItems = await this.enrichWithConnectedItems(items);

    return {
      items: enrichedItems,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
        hasMore: skip + items.length < total
      }
    };
  }

  async getQuickFilters(filters: QuickFiltersDto, companyId: string) {
    const baseWhere = { companyId };
    
    const results = await Promise.all([
      // Out of stock items
      filters.outOfStock ? this.prisma.branchAvailability.count({
        where: { ...baseWhere, isInStock: false }
      }) : 0,
      
      // Low stock items
      filters.lowStock ? this.prisma.branchAvailability.count({
        where: {
          ...baseWhere,
          AND: [
            { stockLevel: { not: null } },
            { lowStockThreshold: { not: null } },
            { stockLevel: { lte: this.prisma.branchAvailability.fields.lowStockThreshold } }
          ]
        }
      }) : 0,
      
      // Inactive items
      filters.inactive ? this.prisma.branchAvailability.count({
        where: { ...baseWhere, isActive: false }
      }) : 0,
      
      // Items without pricing
      filters.noPricing ? this.prisma.branchAvailability.count({
        where: { ...baseWhere, prices: {} }
      }) : 0
    ]);

    return {
      outOfStock: results[0],
      lowStock: results[1],
      inactive: results[2],
      noPricing: results[3]
    };
  }

  // ========================
  // PRIVATE HELPER METHODS
  // ========================

  private async validateConnectedItem(connectedId: string, connectedType: ConnectedType, companyId: string) {
    let exists = false;
    
    switch (connectedType) {
      case ConnectedType.PRODUCT:
        exists = !!(await this.prisma.menuProduct.findFirst({
          where: { id: connectedId, companyId }
        }));
        break;
      case ConnectedType.MODIFIER:
        exists = !!(await this.prisma.modifier.findFirst({
          where: { id: connectedId, companyId }
        }));
        break;
      case ConnectedType.CATEGORY:
        exists = !!(await this.prisma.menuCategory.findFirst({
          where: { id: connectedId, companyId }
        }));
        break;
    }

    if (!exists) {
      throw new NotFoundException(`${connectedType} with ID ${connectedId} not found`);
    }
  }

  private determineChangeType(data: UpdateBranchAvailabilityDto): AvailabilityChangeType {
    if (data.stockLevel !== undefined) return AvailabilityChangeType.STOCK_UPDATE;
    if (data.prices !== undefined) return AvailabilityChangeType.PRICE_CHANGE;
    if (data.availableFrom !== undefined || data.availableTo !== undefined || data.availableDays !== undefined) {
      return AvailabilityChangeType.SCHEDULE_UPDATE;
    }
    return AvailabilityChangeType.STATUS_CHANGE;
  }

  private buildOrderBy(sortBy: string, sortOrder: string) {
    const orderDirection = sortOrder === 'desc' ? 'desc' as const : 'asc' as const;
    
    switch (sortBy) {
      case 'stock_level':
        return { stockLevel: orderDirection };
      case 'priority':
        return { priority: orderDirection };
      case 'created_at':
        return { createdAt: orderDirection };
      case 'updated_at':
      default:
        return { updatedAt: orderDirection };
    }
  }

  private async enrichWithConnectedItems(items: any[]) {
    const productIds = items.filter(item => item.connectedType === 'product').map(item => item.connectedId);
    const modifierIds = items.filter(item => item.connectedType === 'modifier').map(item => item.connectedId);

    const [products, modifiers] = await Promise.all([
      productIds.length ? this.prisma.menuProduct.findMany({
        where: { id: { in: productIds } },
        select: { id: true, name: true, status: true, basePrice: true }
      }) : [],
      modifierIds.length ? this.prisma.modifier.findMany({
        where: { id: { in: modifierIds } },
        select: { id: true, name: true, status: true, basePrice: true }
      }) : []
    ]);

    return items.map(item => {
      let connectedItem = null;
      
      if (item.connectedType === 'product') {
        connectedItem = products.find(p => p.id === item.connectedId);
      } else if (item.connectedType === 'modifier') {
        connectedItem = modifiers.find(m => m.id === item.connectedId);
      }

      return {
        ...item,
        connectedItem
      };
    });
  }

  private async createAuditLog(data: {
    branchAvailabilityId: string;
    companyId: string;
    changeType: AvailabilityChangeType;
    oldValue?: any;
    newValue?: any;
    userId?: string;
    changeReason?: string;
    batchOperation?: boolean;
    batchId?: string;
  }) {
    await this.prisma.availabilityAuditLog.create({
      data: {
        branchAvailabilityId: data.branchAvailabilityId,
        companyId: data.companyId,
        changeType: data.changeType as any,
        oldValue: data.oldValue,
        newValue: data.newValue,
        changeReason: data.changeReason,
        userId: data.userId,
        batchOperation: data.batchOperation || false,
        batchId: data.batchId
      }
    });
  }

  private async checkStockAlerts(availability: any) {
    if (availability.stockLevel !== null && availability.lowStockThreshold !== null) {
      if (availability.stockLevel === 0) {
        await this.createAlert({
          companyId: availability.companyId,
          branchId: availability.branchId,
          alertType: 'OUT_OF_STOCK',
          severity: 'HIGH',
          title: 'Item Out of Stock',
          message: `Item is now out of stock in branch`,
          connectedId: availability.connectedId,
          connectedType: availability.connectedType
        });
      } else if (availability.stockLevel <= availability.lowStockThreshold) {
        await this.createAlert({
          companyId: availability.companyId,
          branchId: availability.branchId,
          alertType: 'LOW_STOCK',
          severity: 'MEDIUM',
          title: 'Low Stock Alert',
          message: `Item stock is running low (${availability.stockLevel} remaining)`,
          connectedId: availability.connectedId,
          connectedType: availability.connectedType
        });
      }
    }
  }

  private async createAlert(data: any) {
    // Check if similar alert exists recently (within last hour)
    const existingAlert = await this.prisma.availabilityAlert.findFirst({
      where: {
        companyId: data.companyId,
        connectedId: data.connectedId,
        connectedType: data.connectedType,
        alertType: data.alertType as any,
        createdAt: {
          gte: new Date(Date.now() - 60 * 60 * 1000) // 1 hour ago
        }
      }
    });

    if (!existingAlert) {
      await this.prisma.availabilityAlert.create({
        data: {
          ...data,
          alertType: data.alertType as any,
          severity: data.severity as any
        }
      });
    }
  }

  // ========================
  // ANALYTICS METHODS
  // ========================

  async getAvailabilityAnalytics(companyId: string, branchId?: string, days: number = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Base query conditions
    const whereConditions: any = {
      companyId,
      createdAt: { gte: startDate }
    };
    
    if (branchId) {
      whereConditions.branchId = branchId;
    }

    // Get overview stats
    const [totalItems, activeItems, outOfStock, lowStock] = await Promise.all([
      this.prisma.branchAvailability.count({
        where: { ...whereConditions, createdAt: undefined }
      }),
      this.prisma.branchAvailability.count({
        where: { ...whereConditions, isActive: true, createdAt: undefined }
      }),
      this.prisma.branchAvailability.count({
        where: { ...whereConditions, stockLevel: 0, createdAt: undefined }
      }),
      this.prisma.branchAvailability.count({
        where: {
          ...whereConditions,
          stockLevel: { gt: 0, lte: { lowStockThreshold: true } },
          createdAt: undefined
        }
      })
    ]);

    // Get stock trend data (daily aggregations)
    const stockTrend = await this.prisma.availabilityAuditLog.groupBy({
      by: ['changeType'],
      where: {
        companyId,
        changeType: 'stock_update',
        timestamp: { gte: startDate },
        ...(branchId && { branchAvailability: { branchId } })
      },
      _count: { changeType: true }
    });

    // Get platform pricing insights
    const pricingAnalytics = await this.prisma.branchAvailability.findMany({
      where: { ...whereConditions, createdAt: undefined },
      select: {
        connectedType: true,
        prices: true,
        isActive: true
      }
    });

    // Calculate platform-specific metrics
    const platformMetrics = this.calculatePlatformMetrics(pricingAnalytics);

    // Get branch performance comparison
    const branchComparison = await this.getBranchComparison(companyId, days);

    // Get recent alerts
    const recentAlerts = await this.prisma.availabilityAlert.findMany({
      where: {
        companyId,
        ...(branchId && { branchId }),
        createdAt: { gte: startDate }
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: {
        branch: { select: { name: true } }
      }
    });

    return {
      overview: {
        totalItems,
        activeItems,
        outOfStock,
        lowStock,
        inactiveItems: totalItems - activeItems,
        availabilityRate: totalItems > 0 ? (activeItems / totalItems) * 100 : 0
      },
      stockTrend: stockTrend.map(item => ({
        type: item.changeType,
        count: item._count.changeType
      })),
      platformMetrics,
      branchComparison,
      recentAlerts: recentAlerts.map(alert => ({
        ...alert,
        branchName: alert.branch?.name
      })),
      dateRange: {
        from: startDate.toISOString(),
        to: new Date().toISOString(),
        days
      }
    };
  }

  private calculatePlatformMetrics(availabilityData: any[]) {
    const platforms = ['talabat', 'careem', 'website', 'call_center'];
    const metrics: Record<string, any> = {};

    platforms.forEach(platform => {
      const activeOnPlatform = availabilityData.filter(item => 
        item.isActive && item.prices && item.prices[platform]
      ).length;
      
      const totalWithPlatformPricing = availabilityData.filter(item => 
        item.prices && item.prices[platform]
      ).length;

      metrics[platform] = {
        activeItems: activeOnPlatform,
        totalItems: totalWithPlatformPricing,
        availabilityRate: totalWithPlatformPricing > 0 ? 
          (activeOnPlatform / totalWithPlatformPricing) * 100 : 0
      };
    });

    return metrics;
  }

  private async getBranchComparison(companyId: string, days: number) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Get all branches for the company
    const branches = await this.prisma.branch.findMany({
      where: { companyId },
      select: { id: true, name: true }
    });

    const branchStats = await Promise.all(
      branches.map(async (branch) => {
        const [totalItems, activeItems, outOfStock, avgStockLevel] = await Promise.all([
          this.prisma.branchAvailability.count({
            where: { companyId, branchId: branch.id }
          }),
          this.prisma.branchAvailability.count({
            where: { companyId, branchId: branch.id, isActive: true }
          }),
          this.prisma.branchAvailability.count({
            where: { companyId, branchId: branch.id, stockLevel: 0 }
          }),
          this.prisma.branchAvailability.aggregate({
            where: { 
              companyId, 
              branchId: branch.id,
              stockLevel: { not: null }
            },
            _avg: { stockLevel: true }
          })
        ]);

        return {
          branchId: branch.id,
          branchName: branch.name,
          totalItems,
          activeItems,
          outOfStock,
          availabilityRate: totalItems > 0 ? (activeItems / totalItems) * 100 : 0,
          avgStockLevel: avgStockLevel._avg.stockLevel || 0
        };
      })
    );

    return branchStats;
  }

  async getStockTrendData(companyId: string, branchId?: string, days: number = 7) {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Generate daily buckets
    const dailyData = [];
    for (let i = 0; i < days; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      
      const dayStart = new Date(date);
      dayStart.setHours(0, 0, 0, 0);
      
      const dayEnd = new Date(date);
      dayEnd.setHours(23, 59, 59, 999);

      // Get stock updates for this day
      const stockUpdates = await this.prisma.availabilityAuditLog.count({
        where: {
          companyId,
          changeType: 'stock_update',
          timestamp: { gte: dayStart, lte: dayEnd },
          ...(branchId && { branchAvailability: { branchId } })
        }
      });

      // Get out of stock count for this day
      const outOfStockCount = await this.prisma.branchAvailability.count({
        where: {
          companyId,
          stockLevel: 0,
          updatedAt: { lte: dayEnd },
          ...(branchId && { branchId })
        }
      });

      dailyData.push({
        date: date.toISOString().split('T')[0],
        stockUpdates,
        outOfStockCount,
        timestamp: date.getTime()
      });
    }

    return dailyData;
  }

  async getTopPerformingItems(companyId: string, branchId?: string, limit: number = 10) {
    const whereConditions: any = { 
      companyId,
      isActive: true
    };
    
    if (branchId) {
      whereConditions.branchId = branchId;
    }

    // Get items with highest availability rates and stock levels
    const topItems = await this.prisma.branchAvailability.findMany({
      where: whereConditions,
      orderBy: [
        { stockLevel: 'desc' },
        { priority: 'asc' }
      ],
      take: limit,
      include: {
        branch: { select: { name: true } }
      }
    });

    // Enrich with connected item details
    const enrichedItems = await this.enrichWithConnectedItems(topItems);

    return enrichedItems.map(item => ({
      ...item,
      branchName: item.branch?.name,
      performanceScore: this.calculatePerformanceScore(item)
    }));
  }

  private calculatePerformanceScore(item: any): number {
    let score = 0;
    
    // Stock level contribution (0-40 points)
    if (item.stockLevel !== null) {
      score += Math.min(item.stockLevel, 40);
    }
    
    // Active status (20 points)
    if (item.isActive) {
      score += 20;
    }
    
    // Priority contribution (0-20 points, lower priority = higher score)
    if (item.priority !== null) {
      score += Math.max(0, 20 - item.priority);
    }
    
    // Platform availability (0-20 points)
    if (item.prices) {
      const platformCount = Object.keys(item.prices).length;
      score += Math.min(platformCount * 5, 20);
    }
    
    return Math.min(score, 100);
  }
}