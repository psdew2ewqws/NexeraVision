import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { IDeliveryAdapter } from '../interfaces/delivery-adapter.interface';
import {
  DeliveryConnectionConfig,
  DeliveryOrder,
  DeliveryMenuSyncResult,
  DeliveryOrderSyncResult,
  DeliveryProvider,
  OrderStatus,
  DeliveryWebhookEvent,
} from '../types/delivery-adapter.types';
import * as crypto from 'crypto';

@Injectable()
export class CareemAdapter implements IDeliveryAdapter {
  private readonly logger = new Logger(CareemAdapter.name);
  private readonly baseUrl = 'https://api.careem.com/v1';
  private readonly sandboxUrl = 'https://api-sandbox.careem.com/v1';

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  get providerId(): string {
    return 'careem';
  }

  get providerName(): string {
    return 'Careem Now';
  }

  get provider(): DeliveryProvider {
    return {
      id: 'careem',
      name: 'Careem Now',
      type: 'delivery',
      region: 'MENA',
      countries: ['AE', 'SA', 'QA', 'KW', 'BH', 'OM', 'EG', 'JO', 'PK'],
      features: [
        'menu_sync',
        'order_sync',
        'real_time_tracking',
        'webhooks',
        'bulk_operations',
        'inventory_sync',
      ],
      authType: 'api_key',
      webhookSupport: true,
      rateLimits: {
        requestsPerMinute: 1000,
        requestsPerHour: 10000,
        requestsPerDay: 100000,
      },
    };
  }

  async testConnection(config: DeliveryConnectionConfig): Promise<boolean> {
    try {
      const apiUrl = config.environment === 'production' ? this.baseUrl : this.sandboxUrl;

      const response = await firstValueFrom(
        this.httpService.get(`${apiUrl}/restaurants/profile`, {
          headers: {
            'Authorization': `Bearer ${config.apiKey}`,
            'Content-Type': 'application/json',
            'X-Careem-Client-Id': config.clientId,
          },
          timeout: 10000,
        }),
      );

      return response.status === 200 && response.data?.success;
    } catch (error) {
      this.logger.error(`Careem connection test failed:`, error.message);
      return false;
    }
  }

  async syncMenu(config: DeliveryConnectionConfig): Promise<DeliveryMenuSyncResult> {
    try {
      this.logger.log(`Starting Careem menu sync for restaurant: ${config.restaurantId}`);

      const apiUrl = config.environment === 'production' ? this.baseUrl : this.sandboxUrl;

      // Get restaurant menu
      const menuResponse = await firstValueFrom(
        this.httpService.get(`${apiUrl}/restaurants/${config.restaurantId}/menu`, {
          headers: {
            'Authorization': `Bearer ${config.apiKey}`,
            'Content-Type': 'application/json',
            'X-Careem-Client-Id': config.clientId,
          },
        }),
      );

      const menuData = menuResponse.data?.data;
      if (!menuData) {
        throw new Error('No menu data received from Careem');
      }

      // Process categories and items
      const categories = menuData.categories || [];
      const menuItems = [];

      for (const category of categories) {
        for (const item of category.items || []) {
          menuItems.push({
            id: item.id.toString(),
            externalId: item.external_id || item.id.toString(),
            name: item.name,
            description: item.description || '',
            category: category.name,
            price: parseFloat(item.price || '0'),
            currency: item.currency || 'AED',
            imageUrl: item.image_url,
            isAvailable: item.is_available && !item.is_sold_out,
            modifiers: item.modifiers?.map(mod => ({
              id: mod.id.toString(),
              name: mod.name,
              price: parseFloat(mod.price || '0'),
              isRequired: mod.is_required || false,
              options: mod.options?.map(opt => ({
                id: opt.id.toString(),
                name: opt.name,
                price: parseFloat(opt.price || '0'),
              })) || [],
            })) || [],
            allergens: item.allergens || [],
            nutritionalInfo: item.nutritional_info || {},
            metadata: {
              careem_category_id: category.id,
              preparation_time: item.preparation_time,
              tags: item.tags,
              dietary_preferences: item.dietary_preferences,
            },
          });
        }
      }

      this.logger.log(`Careem menu sync completed: ${menuItems.length} items`);

      return {
        success: true,
        itemsCount: menuItems.length,
        items: menuItems,
        lastSyncAt: new Date(),
      };

    } catch (error) {
      this.logger.error(`Careem menu sync failed:`, error);
      return {
        success: false,
        itemsCount: 0,
        items: [],
        error: error.message,
        lastSyncAt: new Date(),
      };
    }
  }

  async syncOrders(config: DeliveryConnectionConfig, since?: Date): Promise<DeliveryOrderSyncResult> {
    try {
      this.logger.log(`Starting Careem order sync for restaurant: ${config.restaurantId}`);

      const apiUrl = config.environment === 'production' ? this.baseUrl : this.sandboxUrl;

      const params: any = {
        restaurant_id: config.restaurantId,
        limit: 100,
        offset: 0,
      };

      if (since) {
        params.created_after = since.toISOString();
      }

      const response = await firstValueFrom(
        this.httpService.get(`${apiUrl}/orders`, {
          headers: {
            'Authorization': `Bearer ${config.apiKey}`,
            'Content-Type': 'application/json',
            'X-Careem-Client-Id': config.clientId,
          },
          params,
        }),
      );

      const ordersData = response.data?.data?.orders || [];

      const orders: DeliveryOrder[] = ordersData.map(order => ({
        id: order.id.toString(),
        externalId: order.id.toString(),
        orderNumber: order.order_number || order.reference,
        status: this.mapOrderStatus(order.status),
        customerInfo: {
          id: order.customer?.id?.toString(),
          name: order.customer?.name,
          phone: order.customer?.phone,
          email: order.customer?.email,
        },
        items: order.items?.map(item => ({
          id: item.id.toString(),
          productId: item.menu_item_id?.toString(),
          name: item.name,
          quantity: item.quantity,
          unitPrice: parseFloat(item.unit_price || '0'),
          totalPrice: parseFloat(item.total_price || '0'),
          modifiers: item.modifiers?.map(mod => ({
            id: mod.id.toString(),
            name: mod.name,
            price: parseFloat(mod.price || '0'),
            quantity: mod.quantity || 1,
          })) || [],
          instructions: item.special_instructions,
        })) || [],
        totalAmount: parseFloat(order.total_amount || '0'),
        currency: order.currency || 'AED',
        paymentStatus: order.payment_status,
        paymentMethod: order.payment_method,
        deliveryInfo: {
          type: 'delivery',
          address: order.delivery_address?.formatted_address,
          coordinates: order.delivery_address?.coordinates ? {
            latitude: order.delivery_address.coordinates.lat,
            longitude: order.delivery_address.coordinates.lng,
          } : undefined,
          instructions: order.delivery_instructions,
          estimatedTime: order.estimated_delivery_time ? new Date(order.estimated_delivery_time) : undefined,
          driverInfo: order.driver ? {
            id: order.driver.id,
            name: order.driver.name,
            phone: order.driver.phone,
            vehicle: order.driver.vehicle_info,
          } : undefined,
        },
        orderedAt: new Date(order.created_at),
        metadata: {
          careem_order_id: order.careem_order_id,
          restaurant_id: order.restaurant_id,
          delivery_fee: order.delivery_fee,
          service_fee: order.service_fee,
          discount: order.discount,
          tax: order.tax,
          tip: order.tip,
          estimated_preparation_time: order.estimated_preparation_time,
        },
      }));

      this.logger.log(`Careem order sync completed: ${orders.length} orders`);

      return {
        success: true,
        ordersCount: orders.length,
        orders,
        lastSyncAt: new Date(),
      };

    } catch (error) {
      this.logger.error(`Careem order sync failed:`, error);
      return {
        success: false,
        ordersCount: 0,
        orders: [],
        error: error.message,
        lastSyncAt: new Date(),
      };
    }
  }

  async updateOrderStatus(
    config: DeliveryConnectionConfig,
    orderId: string,
    status: OrderStatus,
  ): Promise<boolean> {
    try {
      const apiUrl = config.environment === 'production' ? this.baseUrl : this.sandboxUrl;
      const careemStatus = this.mapToCareemStatus(status);

      await firstValueFrom(
        this.httpService.put(
          `${apiUrl}/orders/${orderId}/status`,
          {
            status: careemStatus,
            updated_at: new Date().toISOString(),
          },
          {
            headers: {
              'Authorization': `Bearer ${config.apiKey}`,
              'Content-Type': 'application/json',
              'X-Careem-Client-Id': config.clientId,
            },
          },
        ),
      );

      this.logger.log(`Careem order status updated: ${orderId} -> ${status}`);
      return true;

    } catch (error) {
      this.logger.error(`Careem order status update failed:`, error);
      return false;
    }
  }

  async updateMenuItemAvailability(
    config: DeliveryConnectionConfig,
    itemId: string,
    isAvailable: boolean,
  ): Promise<boolean> {
    try {
      const apiUrl = config.environment === 'production' ? this.baseUrl : this.sandboxUrl;

      await firstValueFrom(
        this.httpService.put(
          `${apiUrl}/restaurants/${config.restaurantId}/menu/items/${itemId}/availability`,
          {
            is_available: isAvailable,
            updated_at: new Date().toISOString(),
          },
          {
            headers: {
              'Authorization': `Bearer ${config.apiKey}`,
              'Content-Type': 'application/json',
              'X-Careem-Client-Id': config.clientId,
            },
          },
        ),
      );

      this.logger.log(`Careem menu item availability updated: ${itemId} -> ${isAvailable}`);
      return true;

    } catch (error) {
      this.logger.error(`Careem menu item availability update failed:`, error);
      return false;
    }
  }

  async handleWebhook(
    payload: any,
    headers: Record<string, string>,
    config: DeliveryConnectionConfig,
  ): Promise<DeliveryWebhookEvent | null> {
    try {
      // Verify webhook signature
      const signature = headers['x-careem-signature'];
      const timestamp = headers['x-careem-timestamp'];

      if (!this.verifyWebhookSignature(
        JSON.stringify(payload),
        signature,
        timestamp,
        config.webhookSecret,
      )) {
        throw new Error('Invalid webhook signature');
      }

      // Process webhook event
      const eventType = payload.event_type;
      const eventData = payload.data;

      let mappedEventType: DeliveryWebhookEvent['type'];
      let processedData: any;

      switch (eventType) {
        case 'order.created':
        case 'order.updated':
          mappedEventType = eventType as DeliveryWebhookEvent['type'];
          processedData = {
            orderId: eventData.order.id,
            orderNumber: eventData.order.order_number,
            status: this.mapOrderStatus(eventData.order.status),
            updatedAt: eventData.order.updated_at,
          };
          break;

        case 'menu.updated':
          mappedEventType = 'menu.updated';
          processedData = {
            restaurantId: eventData.restaurant_id,
            itemsUpdated: eventData.updated_items?.length || 0,
            updatedAt: eventData.updated_at,
          };
          break;

        default:
          this.logger.warn(`Unhandled Careem webhook event type: ${eventType}`);
          return null;
      }

      return {
        type: mappedEventType,
        providerId: this.providerId,
        timestamp: new Date(payload.timestamp),
        data: processedData,
        rawPayload: payload,
      };

    } catch (error) {
      this.logger.error(`Careem webhook processing failed:`, error);
      return null;
    }
  }

  private verifyWebhookSignature(
    payload: string,
    signature: string,
    timestamp: string,
    secret: string,
  ): boolean {
    try {
      const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(`${timestamp}.${payload}`)
        .digest('hex');

      return crypto.timingSafeEqual(
        Buffer.from(signature, 'hex'),
        Buffer.from(expectedSignature, 'hex'),
      );
    } catch (error) {
      this.logger.error('Webhook signature verification failed:', error);
      return false;
    }
  }

  private mapOrderStatus(careemStatus: string): OrderStatus {
    const statusMap: Record<string, OrderStatus> = {
      'pending': 'pending',
      'confirmed': 'confirmed',
      'preparing': 'preparing',
      'ready': 'ready',
      'picked_up': 'picked_up',
      'delivered': 'delivered',
      'cancelled': 'cancelled',
      'rejected': 'rejected',
    };

    return statusMap[careemStatus] || 'unknown';
  }

  private mapToCareemStatus(status: OrderStatus): string {
    const statusMap: Record<OrderStatus, string> = {
      'pending': 'pending',
      'confirmed': 'confirmed',
      'preparing': 'preparing',
      'ready': 'ready',
      'picked_up': 'picked_up',
      'delivered': 'delivered',
      'cancelled': 'cancelled',
      'rejected': 'rejected',
      'unknown': 'pending',
    };

    return statusMap[status] || 'pending';
  }
}