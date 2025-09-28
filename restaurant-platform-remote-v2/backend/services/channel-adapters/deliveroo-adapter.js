/**
 * Deliveroo Channel Adapter
 * Implements Deliveroo-specific integration for menu sync, order management
 * Based on Deliveroo Partner API v2.0
 */

const BaseChannelAdapter = require('./base-channel-adapter');
const crypto = require('crypto');

class DeliverooAdapter extends BaseChannelAdapter {
  constructor(config) {
    super({
      ...config,
      channelName: 'Deliveroo',
      channelType: 'delivery',
      apiBaseUrl: config.apiBaseUrl || 'https://api.deliveroo.com/v2',
      authType: 'api_key',
      supportedFeatures: [
        'menu_sync',
        'order_sync',
        'status_updates',
        'real_time_tracking',
        'availability_sync',
        'pricing_sync',
        'modifier_sync',
        'category_ordering'
      ]
    });

    // Deliveroo-specific configuration
    this.apiKey = config.credentials?.apiKey;
    this.restaurantId = config.credentials?.restaurantId;
    this.posId = config.credentials?.posId;
    this.webhookSecret = config.credentials?.webhookSecret;

    // API endpoints
    this.endpoints = {
      restaurant: '/restaurants/{restaurantId}',
      menu: '/restaurants/{restaurantId}/menu',
      menuCategories: '/restaurants/{restaurantId}/menu/categories',
      menuItems: '/restaurants/{restaurantId}/menu/items',
      orders: '/restaurants/{restaurantId}/orders',
      orderActions: '/restaurants/{restaurantId}/orders/{orderId}/actions',
      availability: '/restaurants/{restaurantId}/availability',
      modifiers: '/restaurants/{restaurantId}/menu/modifier-groups'
    };

    // Order status mapping
    this.statusMapping = {
      // Internal -> Deliveroo
      internal_to_deliveroo: {
        'pending': 'pending',
        'confirmed': 'acknowledged',
        'preparing': 'preparing',
        'ready': 'ready_for_collection',
        'picked_up': 'collected',
        'delivered': 'delivered',
        'cancelled': 'cancelled',
        'rejected': 'rejected'
      },
      // Deliveroo -> Internal
      deliveroo_to_internal: {
        'pending': 'pending',
        'acknowledged': 'confirmed',
        'preparing': 'preparing',
        'ready_for_collection': 'ready',
        'collected': 'picked_up',
        'delivered': 'delivered',
        'cancelled': 'cancelled',
        'rejected': 'rejected'
      }
    };

    // Deliveroo action types
    this.orderActions = {
      acknowledge: 'acknowledge',
      reject: 'reject',
      delay: 'delay',
      cancel: 'cancel',
      ready: 'ready_for_collection'
    };
  }

  // ================================
  // IMPLEMENTATION OF ABSTRACT METHODS
  // ================================

  async initialize() {
    if (!this.apiKey || !this.restaurantId) {
      throw new Error('Missing required Deliveroo credentials: apiKey, restaurantId');
    }

    try {
      // Test connection by fetching restaurant details
      const restaurant = await this.makeRequest(
        'GET',
        this._buildUrl(this.endpoints.restaurant)
      );

      console.log(`Deliveroo adapter initialized for restaurant: ${restaurant.name}`);
      return { success: true, restaurantInfo: restaurant };
    } catch (error) {
      throw new Error(`Failed to initialize Deliveroo adapter: ${error.message}`);
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
          isActive: restaurant.active,
          cuisineType: restaurant.cuisine_type,
          averagePreparationTime: restaurant.average_preparation_time
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
      const deliverooMenuFormat = this.transformMenuToChannel(menuData);

      // Deliveroo requires separate API calls for categories and items
      const results = {
        categoriesCreated: 0,
        itemsCreated: 0,
        errors: []
      };

      // First, create/update categories
      for (const category of deliverooMenuFormat.categories) {
        try {
          await this.makeRequest(
            'PUT',
            this._buildUrl(`${this.endpoints.menuCategories}/${category.id}`),
            { body: category }
          );
          results.categoriesCreated++;
        } catch (error) {
          results.errors.push(`Category ${category.name}: ${error.message}`);
        }
      }

      // Then, create/update items
      for (const category of deliverooMenuFormat.categories) {
        for (const item of category.items) {
          try {
            await this.makeRequest(
              'PUT',
              this._buildUrl(`${this.endpoints.menuItems}/${item.id}`),
              { body: item }
            );
            results.itemsCreated++;
          } catch (error) {
            results.errors.push(`Item ${item.name}: ${error.message}`);
          }
        }
      }

      return {
        success: results.errors.length === 0,
        externalMenuId: `menu_${Date.now()}`,
        syncedCategories: results.categoriesCreated,
        syncedItems: results.itemsCreated,
        errors: results.errors,
        message: results.errors.length === 0 ?
          'Menu pushed successfully to Deliveroo' :
          'Menu push completed with some errors'
      };
    } catch (error) {
      return {
        success: false,
        errors: [error.message],
        message: 'Failed to push menu to Deliveroo'
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
        const deliverooItem = this._transformItemToDeliveroo(item);

        await this.makeRequest(
          'PUT',
          this._buildUrl(`${this.endpoints.menuItems}/${item.externalId || item.id}`),
          { body: deliverooItem }
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

    try {
      // Deliveroo supports bulk availability updates
      const availabilityData = {
        items: availabilityUpdates.map(update => ({
          item_id: update.externalProductId,
          available: update.isAvailable,
          unavailable_reason: update.reason || null
        }))
      };

      const response = await this.makeRequest(
        'POST',
        this._buildUrl(this.endpoints.availability),
        { body: availabilityData }
      );

      // Process response
      availabilityUpdates.forEach((update, index) => {
        const responseItem = response.items && response.items[index];
        if (responseItem && responseItem.success !== false) {
          results.synced.push({
            productId: update.productId,
            externalProductId: update.externalProductId,
            isAvailable: update.isAvailable
          });
        } else {
          results.failed.push({
            productId: update.productId,
            error: responseItem?.error || 'Unknown error'
          });
        }
      });

    } catch (error) {
      // If bulk update fails, try individual updates
      for (const update of availabilityUpdates) {
        try {
          await this.makeRequest(
            'PATCH',
            this._buildUrl(`${this.endpoints.menuItems}/${update.externalProductId}`),
            {
              body: {
                available: update.isAvailable,
                unavailable_reason: update.reason || null
              }
            }
          );

          results.synced.push({
            productId: update.productId,
            externalProductId: update.externalProductId,
            isAvailable: update.isAvailable
          });
        } catch (itemError) {
          results.failed.push({
            productId: update.productId,
            error: itemError.message
          });
        }
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
      const deliverooAction = this._getDeliverooAction(status);

      if (!deliverooAction) {
        throw new Error(`Invalid status: ${status}`);
      }

      const actionData = {
        action: deliverooAction,
        timestamp: new Date().toISOString()
      };

      // Add delay time for delay action
      if (deliverooAction === 'delay' && metadata.delayMinutes) {
        actionData.delay_minutes = metadata.delayMinutes;
      }

      // Add rejection reason for reject action
      if (deliverooAction === 'reject' && metadata.rejectionReason) {
        actionData.rejection_reason = metadata.rejectionReason;
      }

      await this.makeRequest(
        'POST',
        this._buildUrl(this.endpoints.orderActions
          .replace('{orderId}', externalOrderId)),
        { body: actionData }
      );

      return {
        success: true,
        message: `Order ${externalOrderId} ${deliverooAction} action completed`
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
      const signature = headers['x-deliveroo-signature'];
      if (signature && this.webhookSecret) {
        const isValid = this.validateDeliverooWebhook(
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

        case 'order.status_changed':
          return await this._handleOrderStatusChanged(data);

        case 'order.cancelled':
          return await this._handleOrderCancelled(data);

        case 'menu.validation_error':
          return await this._handleMenuValidationError(data);

        case 'restaurant.status_changed':
          return await this._handleRestaurantStatusChanged(data);

        default:
          console.warn(`Unhandled Deliveroo webhook event: ${event_type}`);
          return {
            success: true,
            processed: false,
            response: { message: 'Event type not handled' }
          };
      }
    } catch (error) {
      console.error('Error processing Deliveroo webhook:', error);
      return {
        success: false,
        processed: false,
        response: { error: error.message }
      };
    }
  }

  // ================================
  // DELIVEROO-SPECIFIC METHODS
  // ================================

  validateDeliverooWebhook(payload, signature, secret) {
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');

    return signature === expectedSignature;
  }

  transformMenuToChannel(internalMenu) {
    return {
      restaurant_id: this.restaurantId,
      categories: internalMenu.categories.map(category => ({
        id: category.id,
        name: category.name,
        description: category.description || '',
        sort_position: category.displayNumber || 0,
        active: category.isActive !== false,
        items: category.items.map(item => this._transformItemToDeliveroo(item))
      }))
    };
  }

  transformOrderFromChannel(deliverooOrder) {
    return {
      externalOrderId: deliverooOrder.id,
      orderNumber: deliverooOrder.reference,
      status: this.statusMapping.deliveroo_to_internal[deliverooOrder.status] || 'pending',
      customerInfo: {
        name: deliverooOrder.customer?.name,
        phone: deliverooOrder.customer?.phone_number,
        email: deliverooOrder.customer?.email
      },
      deliveryInfo: {
        address: deliverooOrder.delivery_address,
        latitude: deliverooOrder.delivery_latitude,
        longitude: deliverooOrder.delivery_longitude,
        instructions: deliverooOrder.delivery_instructions,
        estimatedTime: deliverooOrder.delivery_time_estimate,
        riderInfo: deliverooOrder.rider ? {
          name: deliverooOrder.rider.name,
          phone: deliverooOrder.rider.phone_number,
          location: deliverooOrder.rider.location
        } : null
      },
      items: deliverooOrder.items.map(item => ({
        externalId: item.id,
        name: item.name,
        quantity: item.quantity,
        price: item.unit_price,
        totalPrice: item.total_price,
        modifiers: item.modifiers?.map(mod => ({
          name: mod.name,
          price: mod.price,
          quantity: mod.quantity || 1
        })) || [],
        specialInstructions: item.instructions
      })),
      totals: {
        subtotal: deliverooOrder.subtotal,
        deliveryFee: deliverooOrder.delivery_fee,
        serviceFee: deliverooOrder.service_charge,
        discount: deliverooOrder.discount_amount,
        tip: deliverooOrder.tip_amount,
        total: deliverooOrder.total_amount
      },
      paymentMethod: deliverooOrder.payment_method,
      orderType: deliverooOrder.fulfillment_method, // 'delivery' or 'collection'
      createdAt: new Date(deliverooOrder.created_at),
      requestedDeliveryTime: deliverooOrder.requested_delivery_time ?
        new Date(deliverooOrder.requested_delivery_time) : null,
      specialInstructions: deliverooOrder.instructions
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
      'Authorization': `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
      'X-Restaurant-ID': this.restaurantId
    };
  }

  _transformItemToDeliveroo(item) {
    return {
      id: item.externalId || item.id,
      name: item.name,
      description: item.description || '',
      price: Math.round(parseFloat(item.price) * 100), // Convert to pence
      available: item.isAvailable !== false,
      preparation_time_minutes: item.preparationTime || 15,
      category_id: item.categoryId,
      modifier_groups: item.modifierGroups?.map(group => ({
        id: group.id,
        name: group.name,
        required: group.required || false,
        min_selections: group.minSelections || 0,
        max_selections: group.maxSelections || 1,
        modifiers: group.modifiers?.map(modifier => ({
          id: modifier.id,
          name: modifier.name,
          price: Math.round(parseFloat(modifier.price || 0) * 100)
        })) || []
      })) || [],
      allergens: item.allergens || [],
      calories: item.calories || null,
      image_url: item.imageUrl || null,
      popular: item.isPopular || false
    };
  }

  _getDeliverooAction(internalStatus) {
    const actionMapping = {
      'confirmed': 'acknowledge',
      'rejected': 'reject',
      'preparing': 'acknowledge',
      'ready': 'ready_for_collection',
      'cancelled': 'cancel'
    };
    return actionMapping[internalStatus];
  }

  async _handleOrderCreated(orderData) {
    const internalOrder = this.transformOrderFromChannel(orderData);

    console.log('New Deliveroo order received:', internalOrder.externalOrderId);

    return {
      success: true,
      processed: true,
      response: {
        order_id: orderData.id,
        acknowledgement_time: new Date().toISOString(),
        estimated_preparation_time: 20
      }
    };
  }

  async _handleOrderStatusChanged(orderData) {
    const internalOrder = this.transformOrderFromChannel(orderData);

    console.log('Deliveroo order status changed:',
      internalOrder.externalOrderId, 'to', internalOrder.status);

    return {
      success: true,
      processed: true,
      response: { order_id: orderData.id }
    };
  }

  async _handleOrderCancelled(orderData) {
    console.log('Deliveroo order cancelled:', orderData.id,
      'Reason:', orderData.cancellation_reason);

    return {
      success: true,
      processed: true,
      response: { order_id: orderData.id }
    };
  }

  async _handleMenuValidationError(errorData) {
    console.error('Deliveroo menu validation error:', errorData);

    return {
      success: true,
      processed: true,
      response: { acknowledged: true }
    };
  }

  async _handleRestaurantStatusChanged(statusData) {
    console.log('Deliveroo restaurant status changed:', statusData.status);

    return {
      success: true,
      processed: true,
      response: { acknowledged: true }
    };
  }
}

module.exports = DeliverooAdapter;