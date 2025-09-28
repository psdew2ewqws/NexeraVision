/**
 * Careem Now Channel Adapter
 * Implements Careem-specific integration for menu sync, order management
 * Based on Careem Partner API v1.0
 */

const BaseChannelAdapter = require('./base-channel-adapter');
const crypto = require('crypto');

class CareemAdapter extends BaseChannelAdapter {
  constructor(config) {
    super({
      ...config,
      channelName: 'Careem Now',
      channelType: 'delivery',
      apiBaseUrl: config.apiBaseUrl || 'https://partners-api.careem.com/v1',
      authType: 'oauth2',
      supportedFeatures: [
        'menu_sync',
        'order_sync',
        'status_updates',
        'inventory_sync',
        'real_time_tracking',
        'batch_operations'
      ]
    });

    // Careem-specific configuration
    this.clientId = config.credentials?.clientId;
    this.clientSecret = config.credentials?.clientSecret;
    this.storeId = config.credentials?.storeId;
    this.accessToken = config.credentials?.accessToken;
    this.refreshToken = config.credentials?.refreshToken;
    this.webhookSecret = config.credentials?.webhookSecret;

    // API endpoints
    this.endpoints = {
      auth: '/oauth/token',
      store: '/stores/{storeId}',
      menu: '/stores/{storeId}/menu',
      menuItems: '/stores/{storeId}/menu/items',
      orders: '/stores/{storeId}/orders',
      orderStatus: '/stores/{storeId}/orders/{orderId}/status',
      inventory: '/stores/{storeId}/inventory',
      analytics: '/stores/{storeId}/analytics'
    };

    // Order status mapping
    this.statusMapping = {
      // Internal -> Careem
      internal_to_careem: {
        'pending': 'PENDING',
        'confirmed': 'ACCEPTED',
        'preparing': 'PREPARING',
        'ready': 'READY',
        'picked_up': 'DISPATCHED',
        'delivered': 'DELIVERED',
        'cancelled': 'CANCELLED',
        'rejected': 'REJECTED'
      },
      // Careem -> Internal
      careem_to_internal: {
        'PENDING': 'pending',
        'ACCEPTED': 'confirmed',
        'PREPARING': 'preparing',
        'READY': 'ready',
        'DISPATCHED': 'picked_up',
        'DELIVERED': 'delivered',
        'CANCELLED': 'cancelled',
        'REJECTED': 'rejected'
      }
    };

    // Token refresh interval (50 minutes)
    this.tokenRefreshInterval = 50 * 60 * 1000;
    this.lastTokenRefresh = null;
  }

  // ================================
  // IMPLEMENTATION OF ABSTRACT METHODS
  // ================================

  async initialize() {
    if (!this.clientId || !this.clientSecret || !this.storeId) {
      throw new Error('Missing required Careem credentials: clientId, clientSecret, storeId');
    }

    try {
      // Refresh access token if needed
      await this._ensureValidToken();

      // Test connection by fetching store details
      const store = await this.makeRequest(
        'GET',
        this._buildUrl(this.endpoints.store)
      );

      console.log(`Careem adapter initialized for store: ${store.name}`);
      return { success: true, storeInfo: store };
    } catch (error) {
      throw new Error(`Failed to initialize Careem adapter: ${error.message}`);
    }
  }

  async testConnection() {
    try {
      await this._ensureValidToken();

      const store = await this.makeRequest(
        'GET',
        this._buildUrl(this.endpoints.store)
      );

      return {
        success: true,
        message: 'Connection successful',
        details: {
          storeId: this.storeId,
          storeName: store.name,
          status: store.status,
          isActive: store.is_active,
          cuisineTypes: store.cuisine_types
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
      await this._ensureValidToken();

      const careemMenuFormat = this.transformMenuToChannel(menuData);

      const response = await this.makeRequest(
        'PUT',
        this._buildUrl(this.endpoints.menu),
        { body: careemMenuFormat }
      );

      return {
        success: true,
        externalMenuId: response.menu_version,
        syncedItems: response.items_synced,
        syncedCategories: response.categories_synced,
        message: 'Menu pushed successfully to Careem'
      };
    } catch (error) {
      return {
        success: false,
        errors: [error.message],
        message: 'Failed to push menu to Careem'
      };
    }
  }

  async updateMenuItems(items) {
    await this._ensureValidToken();

    const results = {
      updated: [],
      failed: []
    };

    // Careem supports batch updates
    const batchSize = 50;
    const batches = this._chunkArray(items, batchSize);

    for (const batch of batches) {
      try {
        const careemItems = batch.map(item => this._transformItemToCareem(item));

        const response = await this.makeRequest(
          'PATCH',
          this._buildUrl(this.endpoints.menuItems),
          { body: { items: careemItems } }
        );

        // Process batch response
        response.results.forEach((result, index) => {
          const originalItem = batch[index];
          if (result.success) {
            results.updated.push({
              itemId: originalItem.id,
              externalId: originalItem.externalId,
              message: 'Updated successfully'
            });
          } else {
            results.failed.push({
              itemId: originalItem.id,
              error: result.error || 'Unknown error'
            });
          }
        });
      } catch (error) {
        // Mark entire batch as failed
        batch.forEach(item => {
          results.failed.push({
            itemId: item.id,
            error: error.message
          });
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
    await this._ensureValidToken();

    const results = {
      synced: [],
      failed: []
    };

    try {
      // Careem supports batch inventory updates
      const inventoryUpdates = availabilityUpdates.map(update => ({
        item_id: update.externalProductId,
        is_available: update.isAvailable,
        quantity: update.quantity || (update.isAvailable ? 999 : 0),
        reason: update.reason || null
      }));

      const response = await this.makeRequest(
        'PATCH',
        this._buildUrl(this.endpoints.inventory),
        { body: { updates: inventoryUpdates } }
      );

      response.results.forEach((result, index) => {
        const originalUpdate = availabilityUpdates[index];
        if (result.success) {
          results.synced.push({
            productId: originalUpdate.productId,
            externalProductId: originalUpdate.externalProductId,
            isAvailable: originalUpdate.isAvailable
          });
        } else {
          results.failed.push({
            productId: originalUpdate.productId,
            error: result.error || 'Unknown error'
          });
        }
      });
    } catch (error) {
      // Mark all as failed if batch request fails
      availabilityUpdates.forEach(update => {
        results.failed.push({
          productId: update.productId,
          error: error.message
        });
      });
    }

    return {
      success: results.failed.length === 0,
      synced: results.synced,
      failed: results.failed
    };
  }

  async fetchOrders(options = {}) {
    try {
      await this._ensureValidToken();

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
      params.append('include_details', 'true');

      const url = `${this._buildUrl(this.endpoints.orders)}?${params.toString()}`;
      const response = await this.makeRequest('GET', url);

      const orders = response.orders.map(order => this.transformOrderFromChannel(order));

      return {
        success: true,
        orders,
        hasMore: response.pagination?.has_next || false,
        totalCount: response.pagination?.total || orders.length
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
      await this._ensureValidToken();

      const careemStatus = this.statusMapping.internal_to_careem[status];

      if (!careemStatus) {
        throw new Error(`Invalid status: ${status}`);
      }

      const updateData = {
        status: careemStatus,
        timestamp: new Date().toISOString(),
        ...metadata
      };

      // Add tracking info if provided
      if (metadata.trackingId) {
        updateData.tracking_id = metadata.trackingId;
      }

      // Add estimated time if provided
      if (metadata.estimatedTime) {
        updateData.estimated_time = metadata.estimatedTime;
      }

      await this.makeRequest(
        'PATCH',
        this._buildUrl(this.endpoints.orderStatus
          .replace('{orderId}', externalOrderId)),
        { body: updateData }
      );

      return {
        success: true,
        message: `Order ${externalOrderId} status updated to ${careemStatus}`
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
      const signature = headers['x-careem-signature'];
      if (signature && this.webhookSecret) {
        const isValid = this.validateCareemWebhook(
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
      const { event, data } = payload;

      switch (event) {
        case 'order.created':
          return await this._handleOrderCreated(data);

        case 'order.updated':
          return await this._handleOrderUpdated(data);

        case 'order.cancelled':
          return await this._handleOrderCancelled(data);

        case 'store.status_changed':
          return await this._handleStoreStatusChanged(data);

        case 'menu.validation_failed':
          return await this._handleMenuValidationFailed(data);

        default:
          console.warn(`Unhandled Careem webhook event: ${event}`);
          return {
            success: true,
            processed: false,
            response: { message: 'Event type not handled' }
          };
      }
    } catch (error) {
      console.error('Error processing Careem webhook:', error);
      return {
        success: false,
        processed: false,
        response: { error: error.message }
      };
    }
  }

  // ================================
  // CAREEM-SPECIFIC METHODS
  // ================================

  validateCareemWebhook(payload, signature, secret) {
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('base64');

    return signature === expectedSignature;
  }

  transformMenuToChannel(internalMenu) {
    return {
      store_id: this.storeId,
      version: Date.now().toString(),
      categories: internalMenu.categories.map(category => ({
        id: category.id,
        name: category.name,
        description: category.description || '',
        sort_order: category.displayNumber || 0,
        is_enabled: category.isActive !== false,
        items: category.items.map(item => this._transformItemToCareem(item))
      })),
      last_updated: new Date().toISOString()
    };
  }

  transformOrderFromChannel(careemOrder) {
    return {
      externalOrderId: careemOrder.id,
      orderNumber: careemOrder.order_number,
      status: this.statusMapping.careem_to_internal[careemOrder.status] || 'pending',
      customerInfo: {
        name: careemOrder.customer?.name,
        phone: careemOrder.customer?.phone,
        email: careemOrder.customer?.email
      },
      deliveryInfo: {
        address: careemOrder.delivery_address?.formatted_address,
        latitude: careemOrder.delivery_address?.latitude,
        longitude: careemOrder.delivery_address?.longitude,
        instructions: careemOrder.delivery_instructions,
        estimatedTime: careemOrder.estimated_delivery_time,
        captainInfo: careemOrder.captain ? {
          name: careemOrder.captain.name,
          phone: careemOrder.captain.phone,
          location: careemOrder.captain.location
        } : null
      },
      items: careemOrder.items.map(item => ({
        externalId: item.id,
        name: item.name,
        quantity: item.quantity,
        price: item.unit_price,
        totalPrice: item.total_price,
        modifiers: item.modifiers?.map(mod => ({
          name: mod.name,
          price: mod.price,
          quantity: mod.quantity
        })) || []
      })),
      totals: {
        subtotal: careemOrder.subtotal,
        deliveryFee: careemOrder.delivery_fee,
        serviceFee: careemOrder.service_fee,
        discount: careemOrder.discount_amount,
        tax: careemOrder.tax_amount,
        total: careemOrder.total_amount
      },
      paymentMethod: careemOrder.payment_method?.type,
      paymentStatus: careemOrder.payment_status,
      createdAt: new Date(careemOrder.created_at),
      scheduledFor: careemOrder.scheduled_delivery_time ?
        new Date(careemOrder.scheduled_delivery_time) : null,
      specialInstructions: careemOrder.special_instructions
    };
  }

  // ================================
  // PRIVATE HELPER METHODS
  // ================================

  _buildUrl(endpoint) {
    return `${this.apiBaseUrl}${endpoint.replace('{storeId}', this.storeId)}`;
  }

  async _getAuthHeaders() {
    await this._ensureValidToken();
    return {
      'Authorization': `Bearer ${this.accessToken}`,
      'Content-Type': 'application/json',
      'X-Client-ID': this.clientId
    };
  }

  async _ensureValidToken() {
    const now = Date.now();

    // Check if token needs refresh
    if (!this.accessToken ||
        !this.lastTokenRefresh ||
        (now - this.lastTokenRefresh) > this.tokenRefreshInterval) {
      await this._refreshAccessToken();
    }
  }

  async _refreshAccessToken() {
    try {
      const tokenData = {
        grant_type: 'refresh_token',
        refresh_token: this.refreshToken,
        client_id: this.clientId,
        client_secret: this.clientSecret
      };

      const response = await this._performRequest('POST', `${this.apiBaseUrl}${this.endpoints.auth}`, {
        body: tokenData,
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

      this.accessToken = response.access_token;
      this.refreshToken = response.refresh_token || this.refreshToken;
      this.lastTokenRefresh = Date.now();

      console.log('Careem access token refreshed successfully');
    } catch (error) {
      throw new Error(`Failed to refresh Careem access token: ${error.message}`);
    }
  }

  _transformItemToCareem(item) {
    return {
      id: item.externalId || item.id,
      name: item.name,
      description: item.description || '',
      price: parseFloat(item.price),
      is_available: item.isAvailable !== false,
      preparation_time_minutes: item.preparationTime || 15,
      category_id: item.categoryId,
      tags: item.tags || [],
      modifiers: item.modifiers?.map(modifier => ({
        id: modifier.id,
        name: modifier.name,
        price: parseFloat(modifier.price || 0),
        is_required: modifier.isRequired || false,
        min_quantity: modifier.minQuantity || 0,
        max_quantity: modifier.maxQuantity || 1
      })) || [],
      nutrition: item.nutritionalInfo || null,
      allergens: item.allergens || [],
      image_url: item.imageUrl || null,
      is_popular: item.isPopular || false
    };
  }

  _chunkArray(array, chunkSize) {
    const chunks = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }

  async _handleOrderCreated(orderData) {
    const internalOrder = this.transformOrderFromChannel(orderData);

    console.log('New Careem order received:', internalOrder.externalOrderId);

    return {
      success: true,
      processed: true,
      response: {
        order_id: orderData.id,
        status: 'ACCEPTED',
        estimated_preparation_time: 25
      }
    };
  }

  async _handleOrderUpdated(orderData) {
    const internalOrder = this.transformOrderFromChannel(orderData);

    console.log('Careem order updated:', internalOrder.externalOrderId);

    return {
      success: true,
      processed: true,
      response: { order_id: orderData.id }
    };
  }

  async _handleOrderCancelled(orderData) {
    console.log('Careem order cancelled:', orderData.id, 'Reason:', orderData.cancellation_reason);

    return {
      success: true,
      processed: true,
      response: { order_id: orderData.id }
    };
  }

  async _handleStoreStatusChanged(storeData) {
    console.log('Careem store status changed:', storeData.status);

    return {
      success: true,
      processed: true,
      response: { acknowledged: true }
    };
  }

  async _handleMenuValidationFailed(errorData) {
    console.error('Careem menu validation failed:', errorData);

    return {
      success: true,
      processed: true,
      response: { acknowledged: true }
    };
  }
}

module.exports = CareemAdapter;