/**
 * Talabat Channel Adapter
 * Implements Talabat-specific integration for menu sync, order management
 * Based on Talabat Restaurant API v2.0
 */

const BaseChannelAdapter = require('./base-channel-adapter');
const crypto = require('crypto');

class TalabatAdapter extends BaseChannelAdapter {
  constructor(config) {
    super({
      ...config,
      channelName: 'Talabat',
      channelType: 'delivery',
      apiBaseUrl: config.apiBaseUrl || 'https://api.talabat.com/v2',
      authType: 'bearer_token',
      supportedFeatures: [
        'menu_sync',
        'order_sync',
        'status_updates',
        'real_time_tracking',
        'availability_sync',
        'pricing_sync'
      ]
    });

    // Talabat-specific configuration
    this.partnerId = config.credentials?.partnerId;
    this.partnerToken = config.credentials?.partnerToken;
    this.restaurantId = config.credentials?.restaurantId;
    this.webhookSecret = config.credentials?.webhookSecret;

    // API endpoints
    this.endpoints = {
      menu: '/partner/restaurants/{restaurantId}/menu',
      orders: '/partner/restaurants/{restaurantId}/orders',
      orderStatus: '/partner/restaurants/{restaurantId}/orders/{orderId}/status',
      availability: '/partner/restaurants/{restaurantId}/menu/items/{itemId}/availability',
      restaurant: '/partner/restaurants/{restaurantId}'
    };

    // Order status mapping
    this.statusMapping = {
      // Internal -> Talabat
      internal_to_talabat: {
        'pending': 'RECEIVED',
        'confirmed': 'CONFIRMED',
        'preparing': 'PREPARING',
        'ready': 'READY_FOR_PICKUP',
        'picked_up': 'PICKED_UP',
        'delivered': 'DELIVERED',
        'cancelled': 'CANCELLED',
        'rejected': 'REJECTED'
      },
      // Talabat -> Internal
      talabat_to_internal: {
        'RECEIVED': 'pending',
        'CONFIRMED': 'confirmed',
        'PREPARING': 'preparing',
        'READY_FOR_PICKUP': 'ready',
        'PICKED_UP': 'picked_up',
        'DELIVERED': 'delivered',
        'CANCELLED': 'cancelled',
        'REJECTED': 'rejected'
      }
    };
  }

  // ================================
  // IMPLEMENTATION OF ABSTRACT METHODS
  // ================================

  async initialize() {
    if (!this.partnerId || !this.partnerToken || !this.restaurantId) {
      throw new Error('Missing required Talabat credentials: partnerId, partnerToken, restaurantId');
    }

    try {
      // Test connection by fetching restaurant details
      const restaurant = await this.makeRequest(
        'GET',
        this._buildUrl(this.endpoints.restaurant)
      );

      console.log(`Talabat adapter initialized for restaurant: ${restaurant.name}`);
      return { success: true, restaurantInfo: restaurant };
    } catch (error) {
      throw new Error(`Failed to initialize Talabat adapter: ${error.message}`);
    }
  }

  async testConnection() {
    try {
      const restaurant = await this.makeRequest(
        'GET',
        this._buildUrl(this.endpoints.restaurant)
      );

      return {
        success: true,
        message: 'Connection successful',
        details: {
          restaurantId: this.restaurantId,
          restaurantName: restaurant.name,
          status: restaurant.status,
          isActive: restaurant.is_active
        }
      };
    } catch (error) {
      return {
        success: false,
        message: `Connection failed: ${error.message}`,
        details: { error: error.message }
      };
    }
  }

  async pushMenu(menuData) {
    try {
      const talabatMenuFormat = this.transformMenuToChannel(menuData);

      const response = await this.makeRequest(
        'POST',
        this._buildUrl(this.endpoints.menu),
        { body: talabatMenuFormat }
      );

      return {
        success: true,
        externalMenuId: response.menu_id,
        syncedItems: response.items_count,
        message: 'Menu pushed successfully to Talabat'
      };
    } catch (error) {
      return {
        success: false,
        errors: [error.message],
        message: 'Failed to push menu to Talabat'
      };
    }
  }

  async updateMenuItems(items) {
    const results = {
      updated: [],
      failed: []
    };

    for (const item of items) {
      try {
        const talabatItem = this._transformItemToTalabat(item);

        await this.makeRequest(
          'PUT',
          this._buildUrl(`/partner/restaurants/${this.restaurantId}/menu/items/${item.externalId}`),
          { body: talabatItem }
        );

        results.updated.push({
          itemId: item.id,
          externalId: item.externalId,
          message: 'Updated successfully'
        });
      } catch (error) {
        results.failed.push({
          itemId: item.id,
          error: error.message
        });
      }
    }

    return {
      success: results.failed.length === 0,
      updated: results.updated,
      failed: results.failed
    };
  }

  async syncAvailability(availabilityUpdates) {
    const results = {
      synced: [],
      failed: []
    };

    for (const update of availabilityUpdates) {
      try {
        await this.makeRequest(
          'PUT',
          this._buildUrl(this.endpoints.availability.replace('{itemId}', update.externalProductId)),
          {
            body: {
              is_available: update.isAvailable,
              reason: update.reason || null
            }
          }
        );

        results.synced.push({
          productId: update.productId,
          externalProductId: update.externalProductId,
          isAvailable: update.isAvailable
        });
      } catch (error) {
        results.failed.push({
          productId: update.productId,
          error: error.message
        });
      }
    }

    return {
      success: results.failed.length === 0,
      synced: results.synced,
      failed: results.failed
    };
  }

  async fetchOrders(options = {}) {
    try {
      const params = new URLSearchParams();

      if (options.since) {
        params.append('since', options.since.toISOString());
      }
      if (options.limit) {
        params.append('limit', options.limit.toString());
      }
      if (options.status) {
        params.append('status', options.status);
      }

      const url = `${this._buildUrl(this.endpoints.orders)}?${params.toString()}`;
      const response = await this.makeRequest('GET', url);

      const orders = response.orders.map(order => this.transformOrderFromChannel(order));

      return {
        success: true,
        orders,
        hasMore: response.has_more || false,
        totalCount: response.total_count || orders.length
      };
    } catch (error) {
      return {
        success: false,
        orders: [],
        hasMore: false,
        error: error.message
      };
    }
  }

  async updateOrderStatus(externalOrderId, status, metadata = {}) {
    try {
      const talabatStatus = this.statusMapping.internal_to_talabat[status];

      if (!talabatStatus) {
        throw new Error(`Invalid status: ${status}`);
      }

      const updateData = {
        status: talabatStatus,
        updated_at: new Date().toISOString(),
        ...metadata
      };

      // Add estimated delivery time if provided
      if (metadata.estimatedDeliveryTime) {
        updateData.estimated_delivery_time = metadata.estimatedDeliveryTime;
      }

      await this.makeRequest(
        'PUT',
        this._buildUrl(this.endpoints.orderStatus
          .replace('{orderId}', externalOrderId)),
        { body: updateData }
      );

      return {
        success: true,
        message: `Order ${externalOrderId} status updated to ${talabatStatus}`
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to update order status: ${error.message}`
      };
    }
  }

  async handleWebhook(payload, headers = {}) {
    try {
      // Verify webhook signature
      const signature = headers['x-talabat-signature'];
      if (signature && this.webhookSecret) {
        const isValid = this.validateTalabatWebhook(
          JSON.stringify(payload),
          signature,
          this.webhookSecret
        );

        if (!isValid) {
          return {
            success: false,
            processed: false,
            response: { error: 'Invalid webhook signature' }
          };
        }
      }

      // Process webhook based on event type
      const { event_type, data } = payload;

      switch (event_type) {
        case 'order.created':
          return await this._handleOrderCreated(data);

        case 'order.updated':
          return await this._handleOrderUpdated(data);

        case 'order.cancelled':
          return await this._handleOrderCancelled(data);

        case 'menu.validation_error':
          return await this._handleMenuValidationError(data);

        default:
          console.warn(`Unhandled Talabat webhook event: ${event_type}`);
          return {
            success: true,
            processed: false,
            response: { message: 'Event type not handled' }
          };
      }
    } catch (error) {
      console.error('Error processing Talabat webhook:', error);
      return {
        success: false,
        processed: false,
        response: { error: error.message }
      };
    }
  }

  // ================================
  // TALABAT-SPECIFIC METHODS
  // ================================

  validateTalabatWebhook(payload, signature, secret) {
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');

    return signature === `sha256=${expectedSignature}`;
  }

  transformMenuToChannel(internalMenu) {
    return {
      restaurant_id: this.restaurantId,
      menu: {
        categories: internalMenu.categories.map(category => ({
          id: category.id,
          name: {
            en: category.name.en,
            ar: category.name.ar
          },
          description: category.description || null,
          display_order: category.displayNumber || 0,
          is_active: category.isActive !== false,
          items: category.items.map(item => this._transformItemToTalabat(item))
        }))
      },
      updated_at: new Date().toISOString()
    };
  }

  transformOrderFromChannel(talabatOrder) {
    return {
      externalOrderId: talabatOrder.id,
      orderNumber: talabatOrder.order_number,
      status: this.statusMapping.talabat_to_internal[talabatOrder.status] || 'pending',
      customerInfo: {
        name: talabatOrder.customer?.name,
        phone: talabatOrder.customer?.phone,
        email: talabatOrder.customer?.email
      },
      deliveryInfo: {
        address: talabatOrder.delivery_address,
        latitude: talabatOrder.delivery_latitude,
        longitude: talabatOrder.delivery_longitude,
        notes: talabatOrder.delivery_notes,
        estimatedTime: talabatOrder.estimated_delivery_time
      },
      items: talabatOrder.items.map(item => ({
        externalId: item.id,
        name: item.name,
        quantity: item.quantity,
        price: item.price,
        modifiers: item.modifiers || []
      })),
      totals: {
        subtotal: talabatOrder.subtotal,
        deliveryFee: talabatOrder.delivery_fee,
        serviceFee: talabatOrder.service_fee,
        tax: talabatOrder.tax,
        total: talabatOrder.total
      },
      paymentMethod: talabatOrder.payment_method,
      createdAt: new Date(talabatOrder.created_at),
      scheduledFor: talabatOrder.scheduled_for ? new Date(talabatOrder.scheduled_for) : null
    };
  }

  // ================================
  // PRIVATE HELPER METHODS
  // ================================

  _buildUrl(endpoint) {
    return `${this.apiBaseUrl}${endpoint.replace('{restaurantId}', this.restaurantId)}`;
  }

  _getAuthHeaders() {
    return {
      'Authorization': `Bearer ${this.partnerToken}`,
      'X-Partner-ID': this.partnerId,
      'Content-Type': 'application/json'
    };
  }

  _transformItemToTalabat(item) {
    return {
      id: item.externalId || item.id,
      name: {
        en: item.name.en,
        ar: item.name.ar
      },
      description: item.description || null,
      price: parseFloat(item.price),
      is_available: item.isAvailable !== false,
      preparation_time: item.preparationTime || 15,
      tags: item.tags || [],
      modifiers: item.modifiers?.map(modifier => ({
        id: modifier.id,
        name: modifier.name,
        price: parseFloat(modifier.price || 0),
        is_required: modifier.isRequired || false
      })) || [],
      nutritional_info: item.nutritionalInfo || null,
      allergens: item.allergens || [],
      image_url: item.imageUrl || null
    };
  }

  async _handleOrderCreated(orderData) {
    // Transform and process new order
    const internalOrder = this.transformOrderFromChannel(orderData);

    // Here you would typically:
    // 1. Save order to database
    // 2. Send to POS system
    // 3. Trigger notifications

    console.log('New Talabat order received:', internalOrder.externalOrderId);

    return {
      success: true,
      processed: true,
      response: {
        order_id: orderData.id,
        status: 'RECEIVED',
        estimated_preparation_time: 20
      }
    };
  }

  async _handleOrderUpdated(orderData) {
    const internalOrder = this.transformOrderFromChannel(orderData);

    console.log('Talabat order updated:', internalOrder.externalOrderId);

    return {
      success: true,
      processed: true,
      response: { order_id: orderData.id }
    };
  }

  async _handleOrderCancelled(orderData) {
    console.log('Talabat order cancelled:', orderData.id);

    return {
      success: true,
      processed: true,
      response: { order_id: orderData.id }
    };
  }

  async _handleMenuValidationError(errorData) {
    console.error('Talabat menu validation error:', errorData);

    return {
      success: true,
      processed: true,
      response: { acknowledged: true }
    };
  }
}

module.exports = TalabatAdapter;