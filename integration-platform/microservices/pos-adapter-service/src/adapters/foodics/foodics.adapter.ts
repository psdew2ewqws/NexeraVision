import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { IPosAdapter } from '../interfaces/pos-adapter.interface';
import {
  ConnectionConfig,
  MenuSyncResult,
  OrderSyncResult,
  InventoryItem,
  PosMenuItem,
  PosOrder,
} from '../types/pos-adapter.types';

@Injectable()
export class FoodicsAdapter implements IPosAdapter {
  private readonly logger = new Logger(FoodicsAdapter.name);
  private readonly baseUrl = 'https://api.foodics.com/v5';

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  get providerId(): string {
    return 'foodics';
  }

  get providerName(): string {
    return 'Foodics POS';
  }

  async testConnection(config: ConnectionConfig): Promise<boolean> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.baseUrl}/me`, {
          headers: {
            Authorization: `Bearer ${config.apiKey}`,
            'Content-Type': 'application/json',
          },
          timeout: 10000,
        }),
      );

      return response.status === 200 && response.data?.data?.id;
    } catch (error) {
      this.logger.error(`Foodics connection test failed:`, error.message);
      return false;
    }
  }

  async syncMenu(config: ConnectionConfig): Promise<MenuSyncResult> {
    try {
      this.logger.log(`Starting Foodics menu sync for business: ${config.storeId}`);

      const [categories, products] = await Promise.all([
        this.fetchCategories(config),
        this.fetchProducts(config),
      ]);

      const menuItems: PosMenuItem[] = products.map(product => ({
        id: product.id.toString(),
        externalId: product.id.toString(),
        name: product.name,
        description: product.description || '',
        category: categories.find(cat => cat.id === product.category_id)?.name || 'Uncategorized',
        price: parseFloat(product.selling_price || '0'),
        currency: 'SAR',
        imageUrl: product.image,
        isAvailable: product.is_active && product.is_ready,
        modifiers: product.modifiers?.map(mod => ({
          id: mod.id.toString(),
          name: mod.name,
          price: parseFloat(mod.price || '0'),
          isRequired: mod.is_required || false,
        })) || [],
        allergens: product.allergens || [],
        nutritionalInfo: product.nutritional_info || {},
        metadata: {
          barcode: product.barcode,
          sku: product.sku,
          cost_price: product.cost_price,
          category_id: product.category_id,
          tax_id: product.tax_id,
        },
      }));

      this.logger.log(`Foodics menu sync completed: ${menuItems.length} items`);

      return {
        success: true,
        itemsCount: menuItems.length,
        items: menuItems,
        lastSyncAt: new Date(),
      };

    } catch (error) {
      this.logger.error(`Foodics menu sync failed:`, error);
      return {
        success: false,
        itemsCount: 0,
        items: [],
        error: error.message,
        lastSyncAt: new Date(),
      };
    }
  }

  async syncOrders(config: ConnectionConfig, since?: Date): Promise<OrderSyncResult> {
    try {
      this.logger.log(`Starting Foodics order sync for business: ${config.storeId}`);

      const orders = await this.fetchOrders(config, since);

      const posOrders: PosOrder[] = orders.map(order => ({
        id: order.id.toString(),
        externalId: order.id.toString(),
        orderNumber: order.reference || order.id.toString(),
        status: this.mapOrderStatus(order.status),
        customerInfo: {
          id: order.customer?.id?.toString(),
          name: order.customer?.name,
          phone: order.customer?.phone,
          email: order.customer?.email,
        },
        items: order.items?.map(item => ({
          id: item.id.toString(),
          productId: item.product_id?.toString(),
          name: item.product_name,
          quantity: item.quantity,
          unitPrice: parseFloat(item.unit_price || '0'),
          totalPrice: parseFloat(item.total_price || '0'),
          modifiers: item.modifiers || [],
        })) || [],
        totalAmount: parseFloat(order.total || '0'),
        currency: 'SAR',
        paymentStatus: order.payment_status,
        paymentMethod: order.payment_method,
        deliveryInfo: {
          type: order.type, // dine_in, takeaway, delivery
          address: order.delivery_address,
          instructions: order.notes,
        },
        orderedAt: new Date(order.created_at),
        metadata: {
          branch_id: order.branch_id,
          cashier_id: order.cashier_id,
          table_id: order.table_id,
          discount: order.discount,
          tax: order.tax,
        },
      }));

      this.logger.log(`Foodics order sync completed: ${posOrders.length} orders`);

      return {
        success: true,
        ordersCount: posOrders.length,
        orders: posOrders,
        lastSyncAt: new Date(),
      };

    } catch (error) {
      this.logger.error(`Foodics order sync failed:`, error);
      return {
        success: false,
        ordersCount: 0,
        orders: [],
        error: error.message,
        lastSyncAt: new Date(),
      };
    }
  }

  async updateInventory(config: ConnectionConfig, items: InventoryItem[]): Promise<boolean> {
    try {
      this.logger.log(`Updating Foodics inventory for ${items.length} items`);

      const updatePromises = items.map(async (item) => {
        return firstValueFrom(
          this.httpService.put(
            `${this.baseUrl}/products/${item.productId}`,
            {
              quantity: item.quantity,
              is_ready: item.isAvailable,
            },
            {
              headers: {
                Authorization: `Bearer ${config.apiKey}`,
                'Content-Type': 'application/json',
              },
            },
          ),
        );
      });

      await Promise.all(updatePromises);
      this.logger.log(`Foodics inventory updated successfully`);
      return true;

    } catch (error) {
      this.logger.error(`Foodics inventory update failed:`, error);
      return false;
    }
  }

  async createOrder(config: ConnectionConfig, order: PosOrder): Promise<string | null> {
    try {
      this.logger.log(`Creating Foodics order: ${order.orderNumber}`);

      const response = await firstValueFrom(
        this.httpService.post(
          `${this.baseUrl}/orders`,
          {
            reference: order.orderNumber,
            type: order.deliveryInfo.type || 'dine_in',
            branch_id: config.branchId,
            customer: order.customerInfo,
            items: order.items.map(item => ({
              product_id: parseInt(item.productId),
              quantity: item.quantity,
              unit_price: item.unitPrice,
              modifiers: item.modifiers,
            })),
            notes: order.deliveryInfo.instructions,
            payment_method: order.paymentMethod,
          },
          {
            headers: {
              Authorization: `Bearer ${config.apiKey}`,
              'Content-Type': 'application/json',
            },
          },
        ),
      );

      const createdOrderId = response.data?.data?.id?.toString();
      this.logger.log(`Foodics order created: ${createdOrderId}`);
      return createdOrderId;

    } catch (error) {
      this.logger.error(`Foodics order creation failed:`, error);
      return null;
    }
  }

  async updateOrderStatus(config: ConnectionConfig, orderId: string, status: string): Promise<boolean> {
    try {
      const foodicsStatus = this.mapToFoodicsStatus(status);

      await firstValueFrom(
        this.httpService.put(
          `${this.baseUrl}/orders/${orderId}`,
          { status: foodicsStatus },
          {
            headers: {
              Authorization: `Bearer ${config.apiKey}`,
              'Content-Type': 'application/json',
            },
          },
        ),
      );

      this.logger.log(`Foodics order status updated: ${orderId} -> ${status}`);
      return true;

    } catch (error) {
      this.logger.error(`Foodics order status update failed:`, error);
      return false;
    }
  }

  private async fetchCategories(config: ConnectionConfig): Promise<any[]> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.baseUrl}/categories`, {
          headers: {
            Authorization: `Bearer ${config.apiKey}`,
          },
          params: {
            business_id: config.storeId,
            include: 'parent',
          },
        }),
      );

      return response.data?.data || [];
    } catch (error) {
      this.logger.error(`Failed to fetch Foodics categories:`, error);
      return [];
    }
  }

  private async fetchProducts(config: ConnectionConfig): Promise<any[]> {
    try {
      let allProducts = [];
      let page = 1;
      const perPage = 100;

      while (true) {
        const response = await firstValueFrom(
          this.httpService.get(`${this.baseUrl}/products`, {
            headers: {
              Authorization: `Bearer ${config.apiKey}`,
            },
            params: {
              business_id: config.storeId,
              include: 'modifiers,taxes,allergens',
              page,
              per_page: perPage,
            },
          }),
        );

        const products = response.data?.data || [];
        allProducts = [...allProducts, ...products];

        if (products.length < perPage) {
          break;
        }

        page++;
      }

      return allProducts;
    } catch (error) {
      this.logger.error(`Failed to fetch Foodics products:`, error);
      return [];
    }
  }

  private async fetchOrders(config: ConnectionConfig, since?: Date): Promise<any[]> {
    try {
      let allOrders = [];
      let page = 1;
      const perPage = 100;

      while (true) {
        const params: any = {
          business_id: config.storeId,
          include: 'customer,items.product,items.modifiers',
          page,
          per_page: perPage,
        };

        if (since) {
          params.created_at_gte = since.toISOString();
        }

        const response = await firstValueFrom(
          this.httpService.get(`${this.baseUrl}/orders`, {
            headers: {
              Authorization: `Bearer ${config.apiKey}`,
            },
            params,
          }),
        );

        const orders = response.data?.data || [];
        allOrders = [...allOrders, ...orders];

        if (orders.length < perPage) {
          break;
        }

        page++;
      }

      return allOrders;
    } catch (error) {
      this.logger.error(`Failed to fetch Foodics orders:`, error);
      return [];
    }
  }

  private mapOrderStatus(foodicsStatus: string): string {
    const statusMap = {
      'pending': 'pending',
      'preparing': 'preparing',
      'ready': 'ready',
      'delivered': 'completed',
      'cancelled': 'cancelled',
    };

    return statusMap[foodicsStatus] || 'unknown';
  }

  private mapToFoodicsStatus(status: string): string {
    const statusMap = {
      'pending': 'pending',
      'preparing': 'preparing',
      'ready': 'ready',
      'completed': 'delivered',
      'cancelled': 'cancelled',
    };

    return statusMap[status] || 'pending';
  }
}