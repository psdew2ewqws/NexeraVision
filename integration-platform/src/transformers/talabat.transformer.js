/**
 * Talabat Order Transformer
 * Transforms Talabat order format to restaurant platform format
 * Based on Picolinate findings and Talabat API structure
 */

class TalabatTransformer {
  constructor() {
    this.providerName = 'talabat';
    this.version = '1.0.0';
  }

  /**
   * Transform Talabat order to restaurant platform format
   * @param {Object} talabatOrder - Raw Talabat order data
   * @returns {Object} - Transformed order for restaurant platform
   */
  transformOrder(talabatOrder) {
    try {
      // Extract order basics
      const orderId = talabatOrder.id || talabatOrder.orderId || talabatOrder.order_id;
      const talabatOrderNumber = talabatOrder.orderNumber || talabatOrder.order_number || orderId;

      if (!orderId) {
        throw new Error('Missing required field: order ID');
      }

      // Transform customer information
      const customer = this.transformCustomer(talabatOrder.customer || talabatOrder.Customer || {});

      // Transform order items
      const items = this.transformOrderItems(talabatOrder.items || talabatOrder.orderItems || talabatOrder.Items || []);

      // Transform delivery information
      const delivery = this.transformDeliveryInfo(talabatOrder.delivery || talabatOrder.deliveryInfo || {});

      // Calculate totals
      const totals = this.calculateTotals(talabatOrder, items);

      // Transform the complete order
      const transformedOrder = {
        // Order identification
        providerOrderId: orderId,
        orderNumber: `TLB-${talabatOrderNumber}`,
        provider: 'talabat',
        originalProvider: 'talabat',

        // Order metadata
        orderType: talabatOrder.orderType || 'delivery',
        status: this.mapOrderStatus(talabatOrder.status || talabatOrder.orderStatus),
        platformOrderId: talabatOrderNumber,

        // Timestamps
        createdAt: this.parseDateTime(talabatOrder.createdAt || talabatOrder.created_at || talabatOrder.orderDate),
        updatedAt: this.parseDateTime(talabatOrder.updatedAt || talabatOrder.updated_at) || new Date().toISOString(),

        // Customer information
        customer,

        // Order items
        items,

        // Delivery information
        delivery,

        // Financial information
        ...totals,

        // Payment information
        payment: this.transformPaymentInfo(talabatOrder.payment || {}),

        // Additional metadata
        metadata: {
          talabatOrderId: orderId,
          talabatOrderNumber: talabatOrderNumber,
          branchId: talabatOrder.branchId || talabatOrder.restaurantId,
          estimatedDeliveryTime: talabatOrder.estimatedDeliveryTime || talabatOrder.estimated_delivery_time,
          specialInstructions: talabatOrder.notes || talabatOrder.specialInstructions || '',
          channelId: this.getTalabatChannelId(),
          originalOrderData: talabatOrder // Keep original for debugging
        },

        // Webhook metadata
        eventType: 'order_received',
        timestamp: new Date().toISOString(),
        source: 'talabat_webhook'
      };

      return transformedOrder;

    } catch (error) {
      console.error('Error transforming Talabat order:', error);
      throw new Error(`Talabat order transformation failed: ${error.message}`);
    }
  }

  /**
   * Transform customer information
   */
  transformCustomer(customer) {
    return {
      name: customer.name || customer.customerName || customer.firstName + ' ' + (customer.lastName || ''),
      phone: customer.phone || customer.phoneNumber || customer.mobile,
      email: customer.email || '',
      address: {
        street: customer.address?.street || customer.address || '',
        building: customer.address?.building || customer.buildingNumber || '',
        floor: customer.address?.floor || customer.floorNumber || '',
        apartment: customer.address?.apartment || customer.apartmentNumber || '',
        area: customer.address?.area || customer.district || '',
        city: customer.address?.city || '',
        coordinates: {
          lat: customer.address?.latitude || customer.latitude || null,
          lng: customer.address?.longitude || customer.longitude || null
        },
        notes: customer.address?.notes || customer.deliveryNotes || ''
      }
    };
  }

  /**
   * Transform order items
   */
  transformOrderItems(items) {
    if (!Array.isArray(items)) {
      console.warn('Invalid items array, defaulting to empty');
      return [];
    }

    return items.map((item, index) => {
      const transformedItem = {
        id: item.id || item.itemId || `item_${index}`,
        name: item.name || item.itemName || item.productName,
        sku: item.sku || item.productId || item.id,
        quantity: parseInt(item.quantity || 1),
        unitPrice: parseFloat(item.price || item.unitPrice || 0),
        totalPrice: parseFloat(item.totalPrice || (item.price * item.quantity) || 0),
        category: item.category || item.categoryName || 'general',

        // Modifiers/Add-ons
        modifiers: this.transformModifiers(item.modifiers || item.addons || item.extras || []),

        // Special instructions
        notes: item.notes || item.specialInstructions || '',

        // Original item data
        originalItemData: item
      };

      return transformedItem;
    });
  }

  /**
   * Transform item modifiers/add-ons
   */
  transformModifiers(modifiers) {
    if (!Array.isArray(modifiers)) {
      return [];
    }

    return modifiers.map(modifier => ({
      id: modifier.id || modifier.modifierId,
      name: modifier.name || modifier.modifierName,
      price: parseFloat(modifier.price || 0),
      quantity: parseInt(modifier.quantity || 1),
      category: modifier.category || 'addon'
    }));
  }

  /**
   * Transform delivery information
   */
  transformDeliveryInfo(delivery) {
    return {
      type: delivery.type || 'delivery',
      fee: parseFloat(delivery.fee || delivery.deliveryFee || 0),
      estimatedTime: delivery.estimatedTime || delivery.estimatedDeliveryTime,
      instructions: delivery.instructions || delivery.notes || '',
      address: delivery.address || null,
      coordinates: {
        lat: delivery.latitude || delivery.lat || null,
        lng: delivery.longitude || delivery.lng || null
      }
    };
  }

  /**
   * Transform payment information
   */
  transformPaymentInfo(payment) {
    return {
      method: payment.method || payment.paymentMethod || 'cash',
      status: payment.status || 'pending',
      amount: parseFloat(payment.amount || 0),
      currency: payment.currency || 'KWD',
      transactionId: payment.transactionId || payment.transaction_id || null
    };
  }

  /**
   * Calculate order totals
   */
  calculateTotals(originalOrder, items) {
    const subtotal = items.reduce((sum, item) => sum + item.totalPrice, 0);
    const deliveryFee = parseFloat(originalOrder.deliveryFee || originalOrder.delivery?.fee || 0);
    const tax = parseFloat(originalOrder.tax || originalOrder.taxAmount || 0);
    const discount = parseFloat(originalOrder.discount || originalOrder.discountAmount || 0);
    const serviceCharge = parseFloat(originalOrder.serviceCharge || originalOrder.serviceFee || 0);

    const total = subtotal + deliveryFee + tax + serviceCharge - discount;

    return {
      subtotal: parseFloat(subtotal.toFixed(2)),
      deliveryFee: parseFloat(deliveryFee.toFixed(2)),
      tax: parseFloat(tax.toFixed(2)),
      discount: parseFloat(discount.toFixed(2)),
      serviceCharge: parseFloat(serviceCharge.toFixed(2)),
      total: parseFloat(total.toFixed(2)),
      currency: originalOrder.currency || 'KWD'
    };
  }

  /**
   * Map Talabat order status to standard status
   */
  mapOrderStatus(talabatStatus) {
    const statusMap = {
      'new': 'pending',
      'pending': 'pending',
      'accepted': 'confirmed',
      'confirmed': 'confirmed',
      'preparing': 'preparing',
      'ready': 'ready',
      'picked_up': 'out_for_delivery',
      'out_for_delivery': 'out_for_delivery',
      'delivered': 'delivered',
      'cancelled': 'cancelled',
      'rejected': 'cancelled'
    };

    return statusMap[talabatStatus?.toLowerCase()] || 'pending';
  }

  /**
   * Parse datetime strings
   */
  parseDateTime(dateString) {
    if (!dateString) return null;

    try {
      const date = new Date(dateString);
      return date.toISOString();
    } catch (error) {
      console.warn('Invalid date format:', dateString);
      return null;
    }
  }

  /**
   * Get Talabat channel ID from discovered channel IDs
   */
  getTalabatChannelId() {
    // Based on discovered channel IDs in TEST_CREDENTIALS.md
    // This should match your restaurant platform's channel configuration
    return '79401a8a-0d53-4988-a08d-31d1b3514919'; // Example Talabat channel ID
  }

  /**
   * Transform webhook event data
   */
  transformWebhookEvent(webhookPayload) {
    try {
      const eventType = webhookPayload.eventType || webhookPayload.event_type || 'order_update';
      const orderId = webhookPayload.orderId || webhookPayload.order_id;

      const transformedEvent = {
        eventType,
        provider: 'talabat',
        orderId,
        timestamp: new Date().toISOString(),
        data: webhookPayload,

        // Transform order if present
        ...(webhookPayload.order && {
          order: this.transformOrder(webhookPayload.order)
        }),

        // Status update specific fields
        ...(eventType === 'status_update' && {
          oldStatus: this.mapOrderStatus(webhookPayload.oldStatus),
          newStatus: this.mapOrderStatus(webhookPayload.newStatus || webhookPayload.status),
          statusReason: webhookPayload.reason || webhookPayload.statusReason
        })
      };

      return transformedEvent;

    } catch (error) {
      console.error('Error transforming Talabat webhook event:', error);
      throw new Error(`Talabat webhook transformation failed: ${error.message}`);
    }
  }

  /**
   * Validate transformed order
   */
  validateTransformedOrder(transformedOrder) {
    const requiredFields = ['providerOrderId', 'orderNumber', 'customer', 'items'];
    const missingFields = [];

    for (const field of requiredFields) {
      if (!transformedOrder[field]) {
        missingFields.push(field);
      }
    }

    if (missingFields.length > 0) {
      throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
    }

    // Validate customer phone (required for delivery)
    if (!transformedOrder.customer.phone) {
      throw new Error('Customer phone number is required');
    }

    // Validate items
    if (!Array.isArray(transformedOrder.items) || transformedOrder.items.length === 0) {
      throw new Error('Order must contain at least one item');
    }

    return true;
  }

  /**
   * Get transformation summary for logging
   */
  getTransformationSummary(originalOrder, transformedOrder) {
    return {
      provider: 'talabat',
      originalOrderId: originalOrder.id || originalOrder.orderId,
      transformedOrderNumber: transformedOrder.orderNumber,
      itemsCount: transformedOrder.items.length,
      totalAmount: transformedOrder.total,
      customer: transformedOrder.customer.name,
      transformedAt: new Date().toISOString()
    };
  }
}

module.exports = TalabatTransformer;