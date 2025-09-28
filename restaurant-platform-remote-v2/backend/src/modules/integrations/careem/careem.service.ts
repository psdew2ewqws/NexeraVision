import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../database/prisma.service';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { AxiosResponse } from 'axios';

@Injectable()
export class CareemService {
  private readonly logger = new Logger(CareemService.name);
  private readonly careemApiUrl: string;
  private readonly careemApiKey: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {
    this.careemApiUrl = this.configService.get<string>('CAREEM_API_URL') || 'https://api.careem.com';
    this.careemApiKey = this.configService.get<string>('CAREEM_API_KEY');
  }

  /**
   * Get Careem orders for a company
   */
  async getOrders(params: {
    companyId: string;
    branchId?: string;
    status?: string;
    limit: number;
    offset: number;
  }) {
    const where: any = {
      companyId: params.companyId,
    };

    if (params.branchId) {
      where.branchId = params.branchId;
    }

    if (params.status) {
      where.status = params.status;
    }

    const [orders, total] = await Promise.all([
      this.prisma.careemOrder.findMany({
        where,
        include: {
          company: { select: { name: true } },
          branch: { select: { name: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: params.limit,
        skip: params.offset,
      }),
      this.prisma.careemOrder.count({ where }),
    ]);

    return {
      orders,
      total,
      hasMore: total > params.offset + params.limit,
    };
  }

  /**
   * Get specific Careem order details
   */
  async getOrderDetails(careemOrderId: string) {
    const order = await this.prisma.careemOrder.findUnique({
      where: { careemOrderId },
      include: {
        company: { select: { name: true } },
        branch: { select: { name: true } },
        events: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!order) {
      throw new HttpException('Order not found', HttpStatus.NOT_FOUND);
    }

    return order;
  }

  /**
   * Accept a Careem order
   */
  async acceptOrder(careemOrderId: string) {
    this.logger.log(`Accepting Careem order: ${careemOrderId}`);

    try {
      // Call Careem API to accept order
      const response = await this.callCareemApi('POST', `/orders/${careemOrderId}/accept`, {
        estimated_preparation_time: 15, // minutes
      });

      // Update order status
      await this.prisma.careemOrder.update({
        where: { careemOrderId },
        data: {
          status: 'accepted',
          processedAt: new Date(),
        },
      });

      this.logger.log(`Successfully accepted Careem order: ${careemOrderId}`);
      return { success: true, response };
    } catch (error) {
      this.logger.error(`Failed to accept Careem order ${careemOrderId}: ${error.message}`);
      throw new HttpException(`Failed to accept order: ${error.message}`, HttpStatus.BAD_REQUEST);
    }
  }

  /**
   * Reject a Careem order
   */
  async rejectOrder(careemOrderId: string, reason: string) {
    this.logger.log(`Rejecting Careem order: ${careemOrderId} - ${reason}`);

    try {
      // Call Careem API to reject order
      const response = await this.callCareemApi('POST', `/orders/${careemOrderId}/reject`, {
        reason,
      });

      // Update order status
      await this.prisma.careemOrder.update({
        where: { careemOrderId },
        data: {
          status: 'rejected',
          errorMessage: reason,
        },
      });

      this.logger.log(`Successfully rejected Careem order: ${careemOrderId}`);
      return { success: true, response };
    } catch (error) {
      this.logger.error(`Failed to reject Careem order ${careemOrderId}: ${error.message}`);
      throw new HttpException(`Failed to reject order: ${error.message}`, HttpStatus.BAD_REQUEST);
    }
  }

  /**
   * Update order status in Careem
   */
  async updateOrderStatus(careemOrderId: string, status: string) {
    this.logger.log(`Updating Careem order status: ${careemOrderId} -> ${status}`);

    try {
      // Map internal status to Careem status
      const careemStatus = this.mapToCareemStatus(status);

      // Call Careem API to update status
      const response = await this.callCareemApi('PUT', `/orders/${careemOrderId}/status`, {
        status: careemStatus,
        timestamp: new Date().toISOString(),
      });

      // Update local record
      await this.prisma.careemOrder.update({
        where: { careemOrderId },
        data: { status: careemStatus as any },
      });

      this.logger.log(`Successfully updated Careem order status: ${careemOrderId}`);
      return { success: true, response };
    } catch (error) {
      this.logger.error(`Failed to update Careem order status ${careemOrderId}: ${error.message}`);
      throw new HttpException(`Failed to update status: ${error.message}`, HttpStatus.BAD_REQUEST);
    }
  }

  /**
   * Get Careem branch configuration
   */
  async getBranchConfig(branchId: string) {
    return this.prisma.branch.findUnique({
      where: { id: branchId },
      select: {
        id: true,
        name: true,
        integrationData: true,
      },
    });
  }

  /**
   * Update branch Careem configuration
   */
  async updateBranchConfig(branchId: string, careemConfig: any) {
    return this.prisma.branch.update({
      where: { id: branchId },
      data: {
        integrationData: {
          ...{},
          careem: careemConfig,
        },
      },
    });
  }

  /**
   * Make authenticated API call to Careem
   */
  private async callCareemApi(method: string, endpoint: string, data?: any) {
    try {
      const config = {
        method,
        url: `${this.careemApiUrl}${endpoint}`,
        headers: {
          'Authorization': `Bearer ${this.careemApiKey}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        ...(data && { data }),
      };

      const response: AxiosResponse = await firstValueFrom(this.httpService.request(config));
      return response.data;
    } catch (error) {
      this.logger.error(`Careem API call failed: ${error.message}`, {
        method,
        endpoint,
        status: error.response?.status,
        data: error.response?.data,
      });
      throw error;
    }
  }

  /**
   * Map internal status to Careem status
   */
  private mapToCareemStatus(internalStatus: string): string {
    const statusMap = {
      'pending': 'pending',
      'confirmed': 'accepted',
      'preparing': 'preparing',
      'ready': 'ready',
      'out_for_delivery': 'out_for_delivery',
      'completed': 'delivered',
      'cancelled': 'cancelled',
    };
    return statusMap[internalStatus] || 'pending';
  }

  /**
   * Sync menu with Careem
   */
  async syncMenu(companyId: string, branchId: string) {
    this.logger.log(`Syncing menu with Careem for branch: ${branchId}`);

    try {
      // Get menu data from your system
      const menuData = await this.getMenuForSync(companyId, branchId);

      // Transform to Careem format
      const careemMenu = this.transformMenuToCareemFormat(menuData);

      // Send to Careem API
      const branchConfig = await this.getBranchConfig(branchId);
      const careemBranchId = (branchConfig?.integrationData as any)?.careem?.branchId;

      if (!careemBranchId) {
        throw new Error('Careem branch ID not configured');
      }

      const response = await this.callCareemApi(
        'PUT',
        `/branches/${careemBranchId}/menu`,
        careemMenu
      );

      this.logger.log(`Successfully synced menu with Careem for branch: ${branchId}`);
      return { success: true, response };
    } catch (error) {
      this.logger.error(`Failed to sync menu with Careem: ${error.message}`);
      throw new HttpException(`Menu sync failed: ${error.message}`, HttpStatus.BAD_REQUEST);
    }
  }

  /**
   * Get menu data for synchronization
   */
  private async getMenuForSync(companyId: string, branchId: string) {
    return this.prisma.menuProduct.findMany({
      where: {
        companyId,
        branchId,
        status: 1, // Active status
      },
      include: {
        category: true,
        modifierCategories: {
          include: {
            modifierCategory: {
              include: {
                modifiers: true,
              },
            },
          },
        },
        productImages: true,
      },
    });
  }

  /**
   * Transform menu to Careem format
   */
  private transformMenuToCareemFormat(menuData: any[]) {
    return {
      categories: this.groupByCategory(menuData).map(category => ({
        id: category.id,
        name: category.name,
        description: category.description,
        sort_order: category.sortOrder,
        items: category.products.map(product => ({
          id: product.id,
          name: product.name,
          description: product.description,
          price: product.basePrice,
          image_url: product.images?.[0]?.url,
          availability: product.isAvailable,
          preparation_time: product.preparationTime,
          modifiers: this.transformModifiers(product.modifiers),
        })),
      })),
    };
  }

  /**
   * Group products by category
   */
  private groupByCategory(products: any[]) {
    const categoriesMap = new Map();

    products.forEach(product => {
      const category = product.category;
      if (!categoriesMap.has(category.id)) {
        categoriesMap.set(category.id, {
          ...category,
          products: [],
        });
      }
      categoriesMap.get(category.id).products.push(product);
    });

    return Array.from(categoriesMap.values());
  }

  /**
   * Transform modifiers for Careem
   */
  private transformModifiers(productModifiers: any[]) {
    return productModifiers.map(pm => ({
      id: pm.modifier.id,
      name: pm.modifier.name,
      required: pm.isRequired,
      min_selections: pm.minSelections || 0,
      max_selections: pm.maxSelections || 1,
      options: pm.modifier.options.map((option: any) => ({
        id: option.id,
        name: option.name,
        price: option.price,
        availability: option.isAvailable,
      })),
    }));
  }
}