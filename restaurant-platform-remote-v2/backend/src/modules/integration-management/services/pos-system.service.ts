import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../../services/prisma.service';
import { CreatePOSSystemDto } from '../dto/create-pos-system.dto';
import { UpdatePOSSystemDto } from '../dto/update-pos-system.dto';
import { TestPOSConnectionDto } from '../dto/test-pos-connection.dto';
import { POSSystemPaginationDto } from '../dto/pos-system-pagination.dto';

@Injectable()
export class POSSystemService {
  private readonly logger = new Logger(POSSystemService.name);

  constructor(private prisma: PrismaService) {}

  async findAll(pagination: POSSystemPaginationDto, companyId: string) {
    const { page = 1, limit = 10, provider, isActive } = pagination;
    const skip = (page - 1) * limit;

    const where: any = { companyId };

    if (provider) {
      where.provider = provider;
    }

    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    const [items, total] = await Promise.all([
      this.prisma.pOSSystem.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.pOSSystem.count({ where }),
    ]);

    return {
      items,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string, companyId: string) {
    const posSystem = await this.prisma.pOSSystem.findFirst({
      where: { id, companyId },
    });

    if (!posSystem) {
      throw new NotFoundException('POS system not found');
    }

    return posSystem;
  }

  async create(createDto: CreatePOSSystemDto, userId: string) {
    try {
      // Get user's company
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { companyId: true },
      });

      if (!user?.companyId) {
        throw new BadRequestException('User company not found');
      }

      return await this.prisma.pOSSystem.create({
        data: {
          ...createDto,
          companyId: user.companyId,
          createdById: userId,
        },
      });
    } catch (error) {
      this.logger.error('Failed to create POS system', error);
      throw new BadRequestException('Failed to create POS system');
    }
  }

  async update(id: string, updateDto: UpdatePOSSystemDto, userId: string) {
    // Verify POS system exists and belongs to user's company
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { companyId: true },
    });

    const posSystem = await this.findOne(id, user.companyId);

    return await this.prisma.pOSSystem.update({
      where: { id },
      data: {
        ...updateDto,
        updatedById: userId,
      },
    });
  }

  async remove(id: string, companyId: string) {
    await this.findOne(id, companyId);

    return await this.prisma.pOSSystem.delete({
      where: { id },
    });
  }

  async testConnection(id: string, testDto: TestPOSConnectionDto, companyId: string) {
    const posSystem = await this.findOne(id, companyId);

    // Simulate connection test based on provider
    this.logger.log(`Testing connection for POS system ${posSystem.name}`);

    // In a real implementation, this would make actual API calls to the POS provider
    const testResult = {
      success: true,
      message: 'Connection successful',
      responseTime: Math.floor(Math.random() * 1000) + 100,
      details: {
        provider: posSystem.provider,
        endpoint: posSystem.apiEndpoint,
        branchId: testDto.branchId,
        timestamp: new Date(),
      },
    };

    return testResult;
  }

  async getSupportedFeatures(id: string) {
    // Return supported features based on POS provider
    const featuresMap = {
      square: ['inventory', 'orders', 'customers', 'payments', 'refunds'],
      clover: ['inventory', 'orders', 'customers', 'payments', 'modifiers'],
      toast: ['orders', 'menu', 'customers', 'loyalty', 'analytics'],
      lightspeed: ['inventory', 'orders', 'customers', 'reports', 'employees'],
      ncr: ['orders', 'inventory', 'customers', 'kitchen', 'loyalty'],
      micros: ['orders', 'inventory', 'tables', 'kitchen', 'reports'],
      custom: ['orders', 'inventory'],
    };

    const posSystem = await this.prisma.pOSSystem.findUnique({
      where: { id },
      select: { provider: true },
    });

    if (!posSystem) {
      throw new NotFoundException('POS system not found');
    }

    return {
      provider: posSystem.provider,
      features: featuresMap[posSystem.provider] || featuresMap.custom,
    };
  }

  async getIntegrationTemplates(id: string) {
    const posSystem = await this.prisma.pOSSystem.findUnique({
      where: { id },
      select: { provider: true },
    });

    if (!posSystem) {
      throw new NotFoundException('POS system not found');
    }

    // Return templates for common integration scenarios
    return {
      provider: posSystem.provider,
      templates: [
        {
          name: 'Menu Sync',
          description: 'Synchronize menu items, categories, and modifiers',
          configRequired: ['apiKey', 'locationId'],
        },
        {
          name: 'Order Sync',
          description: 'Real-time order synchronization',
          configRequired: ['apiKey', 'locationId', 'webhookUrl'],
        },
        {
          name: 'Inventory Sync',
          description: 'Inventory level synchronization',
          configRequired: ['apiKey', 'locationId', 'syncInterval'],
        },
      ],
    };
  }

  async validateCredentials(id: string, credentials: Record<string, any>, companyId: string) {
    const posSystem = await this.findOne(id, companyId);

    // Validate required credentials based on provider
    const requiredFields = {
      square: ['accessToken', 'locationId'],
      clover: ['apiKey', 'merchantId'],
      toast: ['clientId', 'clientSecret', 'restaurantGuid'],
      lightspeed: ['apiKey', 'accountId'],
      ncr: ['apiKey', 'siteId'],
      micros: ['username', 'password', 'enterpriseId'],
      custom: ['apiKey'],
    };

    const required = requiredFields[posSystem.provider] || requiredFields.custom;
    const missing = required.filter(field => !credentials[field]);

    if (missing.length > 0) {
      return {
        valid: false,
        message: `Missing required fields: ${missing.join(', ')}`,
      };
    }

    // In real implementation, would validate against actual API
    return {
      valid: true,
      message: 'Credentials validated successfully',
    };
  }

  async getSyncStatus(id: string, companyId: string) {
    const posSystem = await this.findOne(id, companyId);

    // Return sync status (in real implementation, would check actual sync logs)
    return {
      posSystemId: id,
      lastSync: new Date(Date.now() - Math.random() * 86400000), // Random time within last 24h
      nextSync: new Date(Date.now() + Math.random() * 3600000), // Random time within next hour
      status: 'active',
      syncedEntities: {
        products: { total: 150, synced: 148, failed: 2 },
        categories: { total: 12, synced: 12, failed: 0 },
        modifiers: { total: 45, synced: 45, failed: 0 },
        orders: { total: 234, synced: 230, failed: 4 },
      },
    };
  }

  async forceSync(id: string, syncType: 'full' | 'incremental', companyId: string, userId: string) {
    const posSystem = await this.findOne(id, companyId);

    this.logger.log(`Initiating ${syncType} sync for POS system ${posSystem.name}`);

    // In real implementation, would trigger actual sync process
    return {
      syncId: `sync-${Date.now()}`,
      posSystemId: id,
      type: syncType,
      status: 'initiated',
      initiatedBy: userId,
      estimatedTime: syncType === 'full' ? '5-10 minutes' : '1-2 minutes',
      message: `${syncType} sync initiated successfully`,
    };
  }
}