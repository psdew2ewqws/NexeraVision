import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  UseGuards,
  Request,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { PrismaService } from '../database/prisma.service';

interface BranchConfigRequestDto {
  isActive?: boolean;
  config: {
    webhookSecret?: string;
    autoPrint?: boolean;
    autoAccept?: boolean;
    locationId?: string;
    menuId?: string;
    // Deliveroo specific
    siteId?: string;
    brandId?: string;
    // Jahez specific
    branchId?: string;
    excludeBranches?: string[];
    // Careem specific
    storeId?: string;
    // Talabat specific
    restaurantId?: string;
    // Uber Eats specific
    storeUuid?: string;
  };
}

@Controller('integration/branch-config')
@UseGuards(JwtAuthGuard, RolesGuard)
export class BranchConfigController {
  constructor(private prisma: PrismaService) {}

  @Get(':branchId/providers/:providerId')
  @Roles('super_admin', 'company_owner', 'branch_manager')
  async getBranchConfig(
    @Param('branchId') branchId: string,
    @Param('providerId') providerId: string,
    @Request() req: any,
  ) {
    // Get branch to verify ownership
    const branch = await this.prisma.branch.findUnique({
      where: { id: branchId },
    });

    if (!branch) {
      throw new NotFoundException('Branch not found');
    }

    // Multi-tenant check: Ensure user has access to this branch's company
    if (req.user.role !== 'super_admin' && req.user.companyId !== branch.companyId) {
      throw new ForbiddenException('Access denied to this branch');
    }

    // Find existing configuration
    const config = await this.prisma.branchDeliveryConfig.findFirst({
      where: {
        branchId,
        providerId,
      },
    });

    if (!config) {
      throw new NotFoundException('Branch configuration not found');
    }

    // Transform database format to frontend format
    return {
      id: config.id,
      branchId: config.branchId,
      providerId: config.providerId,
      isActive: config.isActive,
      config: {
        webhookSecret: config.webhookSecret || '',
        autoPrint: config.autoPrintOnReceive,
        autoAccept: config.autoAcceptOrders,
        locationId: config.storeId || config.merchantId || '',
        menuId: '', // Will be in settings JSON
        ...(config.settings as object || {}), // Spread provider-specific fields
      },
      lastSyncAt: config.lastSyncAt,
      createdAt: config.createdAt,
      updatedAt: config.updatedAt,
    };
  }

  @Post(':branchId/providers/:providerId')
  @Roles('super_admin', 'company_owner', 'branch_manager')
  async saveBranchConfig(
    @Param('branchId') branchId: string,
    @Param('providerId') providerId: string,
    @Body() requestDto: BranchConfigRequestDto,
    @Request() req: any,
  ) {
    // Get branch to verify ownership and get companyId
    const branch = await this.prisma.branch.findUnique({
      where: { id: branchId },
    });

    if (!branch) {
      throw new NotFoundException('Branch not found');
    }

    // Multi-tenant check
    if (req.user.role !== 'super_admin' && req.user.companyId !== branch.companyId) {
      throw new ForbiddenException('Access denied to this branch');
    }

    const { isActive, config } = requestDto;

    // Extract provider-specific fields for settings JSON
    const { webhookSecret, autoPrint, autoAccept, locationId, menuId, ...providerSpecificFields } = config;

    // Upsert configuration
    const savedConfig = await this.prisma.branchDeliveryConfig.upsert({
      where: {
        branchId_providerId: {
          branchId,
          providerId,
        },
      },
      update: {
        isActive: isActive ?? true,
        webhookSecret: webhookSecret || null,
        autoPrintOnReceive: autoPrint ?? true,
        autoAcceptOrders: autoAccept ?? false,
        storeId: config.storeId || config.restaurantId || locationId || null,
        merchantId: config.brandId || null,
        settings: providerSpecificFields, // Store provider-specific fields
        updatedBy: req.user.userId,
        updatedAt: new Date(),
      },
      create: {
        branchId,
        providerId,
        companyId: branch.companyId, // Multi-tenant isolation
        isActive: isActive ?? true,
        webhookSecret: webhookSecret || null,
        autoPrintOnReceive: autoPrint ?? true,
        autoAcceptOrders: autoAccept ?? false,
        storeId: config.storeId || config.restaurantId || locationId || null,
        merchantId: config.brandId || null,
        settings: providerSpecificFields,
        createdBy: req.user.userId,
        updatedBy: req.user.userId,
      },
    });

    // Return in frontend format
    return {
      id: savedConfig.id,
      branchId: savedConfig.branchId,
      providerId: savedConfig.providerId,
      isActive: savedConfig.isActive,
      config: {
        webhookSecret: savedConfig.webhookSecret || '',
        autoPrint: savedConfig.autoPrintOnReceive,
        autoAccept: savedConfig.autoAcceptOrders,
        locationId: savedConfig.storeId || savedConfig.merchantId || '',
        menuId: '',
        ...(savedConfig.settings as object || {}),
      },
      lastSyncAt: savedConfig.lastSyncAt,
      createdAt: savedConfig.createdAt,
      updatedAt: savedConfig.updatedAt,
    };
  }

  @Delete(':branchId/providers/:providerId')
  @Roles('super_admin', 'company_owner', 'branch_manager')
  async deleteBranchConfig(
    @Param('branchId') branchId: string,
    @Param('providerId') providerId: string,
    @Request() req: any,
  ) {
    // Get branch to verify ownership
    const branch = await this.prisma.branch.findUnique({
      where: { id: branchId },
    });

    if (!branch) {
      throw new NotFoundException('Branch not found');
    }

    // Multi-tenant check
    if (req.user.role !== 'super_admin' && req.user.companyId !== branch.companyId) {
      throw new ForbiddenException('Access denied to this branch');
    }

    // Find and delete configuration
    const config = await this.prisma.branchDeliveryConfig.findFirst({
      where: {
        branchId,
        providerId,
      },
    });

    if (!config) {
      throw new NotFoundException('Branch configuration not found');
    }

    await this.prisma.branchDeliveryConfig.delete({
      where: {
        id: config.id,
      },
    });

    return { success: true, message: 'Configuration deleted successfully' };
  }
}
