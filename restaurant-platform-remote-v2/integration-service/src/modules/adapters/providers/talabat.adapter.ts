import { Injectable, Logger } from '@nestjs/common';
import {
  IProviderAdapter,
  ProviderOrder,
  OrderStatus,
  CustomerInfo,
  DeliveryInfo,
  OrderItem,
  PaymentInfo,
  OrderTotals,
} from '../interfaces/provider-adapter.interface';

/**
 * Talabat Adapter Implementation
 * Handles Talabat webhook payload transformation
 */
@Injectable()
export class TalabatAdapter implements IProviderAdapter {
  private readonly logger = new Logger(TalabatAdapter.name);
  readonly providerName = 'talabat';

  /**
   * Extract order from Talabat webhook payload
   */
  async extractOrder(payload: any): Promise<ProviderOrder> {
    this.logger.log(`Extracting Talabat order: ${payload.orderId}`);

    if (!this.validatePayload(payload)) {
      throw new Error('Invalid Talabat payload structure');
    }

    const customer = this.extractCustomer(payload);
    const delivery = this.extractDeliveryInfo(payload);
    const items = this.extractOrderItems(payload);
    const payment = this.extractPaymentInfo(payload);
    const totals = this.extractOrderTotals(payload);

    return {
      externalOrderId: payload.orderId || payload.orderReference,
      branchId: this.extractBranchId(payload),
      customer,
      items,
      delivery,
      payment,
      totals,
      notes: payload.customerNotes || payload.specialInstructions || '',
      scheduledAt: payload.scheduledDeliveryTime ? new Date(payload.scheduledDeliveryTime) : undefined,
      metadata: {
        provider: 'talabat',
        rawPayload: payload,
        restaurantId: payload.restaurantId,
        branchCode: payload.branchCode,
        orderTime: payload.orderTime,
        source: payload.orderSource || 'talabat_app',
      },
    };
  }

  /**
   * Map Talabat order status to internal status
   */
  mapOrderStatus(talabatStatus: string): OrderStatus {
    const statusMap: Record<string, OrderStatus> = {
      'pending': OrderStatus.PENDING,
      'accepted': OrderStatus.ACCEPTED,
      'preparing': OrderStatus.PREPARING,
      'ready': OrderStatus.READY,
      'dispatched': OrderStatus.OUT_FOR_DELIVERY,
      'completed': OrderStatus.DELIVERED,
      'cancelled': OrderStatus.CANCELLED,
      'declined': OrderStatus.REJECTED,
    };

    return statusMap[talabatStatus.toLowerCase()] || OrderStatus.PENDING;
  }

  /**
   * Extract customer information from Talabat payload
   */
  extractCustomer(payload: any): CustomerInfo {
    const customer = payload.customer || payload.customerInfo || {};

    return {
      name: customer.fullName || customer.name || '',
      phone: customer.phoneNumber || customer.mobile || '',
      email: customer.email,
      address: this.extractAddress(customer),
    };
  }

  /**
   * Extract address from customer object
   */
  private extractAddress(customer: any) {
    const address = customer.address || customer.deliveryAddress || {};

    if (!address || Object.keys(address).length === 0) {
      return undefined;
    }

    return {
      street: address.street || address.streetName || '',
      building: address.buildingNumber || address.building,
      floor: address.floorNumber || address.floor,
      apartment: address.apartmentNumber || address.flat,
      city: address.city || 'Amman',
      area: address.area || address.district || address.neighborhood,
      landmark: address.landmark || address.additionalDirections,
      coordinates: address.location ? {
        latitude: parseFloat(address.location.lat || address.location.latitude) || 0,
        longitude: parseFloat(address.location.lng || address.location.longitude) || 0,
      } : undefined,
    };
  }

  /**
   * Extract delivery information from Talabat payload
   */
  extractDeliveryInfo(payload: any): DeliveryInfo {
    const delivery = payload.delivery || payload.deliveryInfo || {};
    const customer = payload.customer || payload.customerInfo || {};

    return {
      type: payload.orderType === 'PICKUP' ? 'pickup' : 'delivery',
      address: this.extractAddress(customer),
      fee: parseFloat(delivery.charge || payload.deliveryCharge || '0'),
      estimatedTime: delivery.estimatedDeliveryTime || delivery.eta || 45,
      driver: delivery.courier ? {
        name: delivery.courier.name,
        phone: delivery.courier.phoneNumber,
      } : undefined,
    };
  }

  /**
   * Extract order items from Talabat payload
   */
  private extractOrderItems(payload: any): OrderItem[] {
    const items = payload.items || payload.orderItems || [];

    return items.map((item: any) => ({
      externalId: item.itemId || item.id || '',
      name: item.itemName || item.name || '',
      quantity: parseInt(item.quantity) || 1,
      price: parseFloat(item.unitPrice || item.price || '0'),
      modifiers: this.extractItemModifiers(item),
      notes: item.specialRequest || item.notes || '',
    }));
  }

  /**
   * Extract item modifiers/options
   */
  private extractItemModifiers(item: any): any[] {
    const modifiers = item.modifiers || item.addOns || item.options || [];

    return modifiers.map((mod: any) => ({
      name: mod.modifierName || mod.name || '',
      price: parseFloat(mod.price || mod.additionalPrice || '0'),
      quantity: parseInt(mod.quantity) || 1,
    }));
  }

  /**
   * Extract payment information from Talabat payload
   */
  private extractPaymentInfo(payload: any): PaymentInfo {
    const payment = payload.payment || payload.paymentInfo || {};

    return {
      method: this.mapPaymentMethod(payment.type || payload.paymentType),
      status: payment.isPaid || payment.status === 'PAID' ? 'paid' : 'pending',
      transactionId: payment.transactionId || payment.referenceNumber,
      amount: parseFloat(payload.totalAmount || payload.grandTotal || '0'),
    };
  }

  /**
   * Map Talabat payment method to internal format
   */
  private mapPaymentMethod(talabatMethod: string): 'cash' | 'card' | 'online' {
    const method = (talabatMethod || '').toUpperCase();

    if (method === 'CASH' || method === 'COD') return 'cash';
    if (method === 'CARD' || method === 'CREDIT_CARD') return 'card';
    return 'online';
  }

  /**
   * Extract order totals from Talabat payload
   */
  private extractOrderTotals(payload: any): OrderTotals {
    const totals = payload.totals || payload.orderTotals || {};

    return {
      subtotal: parseFloat(totals.subtotal || payload.subtotal || '0'),
      deliveryFee: parseFloat(totals.deliveryCharge || payload.deliveryCharge || '0'),
      tax: parseFloat(totals.tax || payload.tax || payload.vat || '0'),
      discount: parseFloat(totals.discount || payload.discountAmount || '0'),
      total: parseFloat(payload.totalAmount || payload.grandTotal || '0'),
    };
  }

  /**
   * Extract branch ID from Talabat payload
   * This needs to map Talabat branch code to internal branch_id
   */
  private extractBranchId(payload: any): string {
    // TODO: Implement mapping from Talabat branchCode to internal branch_id
    // This should query the branch_delivery_configs table
    return payload.branchCode || payload.branchId || '';
  }

  /**
   * Validate Talabat payload structure
   */
  validatePayload(payload: any): boolean {
    if (!payload) return false;

    // Check required fields
    const requiredFields = ['orderId', 'customer', 'items'];
    for (const field of requiredFields) {
      if (!(field in payload) && !(field + 'Info' in payload)) {
        this.logger.warn(`Missing required field in Talabat payload: ${field}`);
        return false;
      }
    }

    // Validate customer data
    const customer = payload.customer || payload.customerInfo;
    if (!customer || (!customer.fullName && !customer.name)) {
      this.logger.warn('Missing customer name in Talabat payload');
      return false;
    }

    // Validate items array
    const items = payload.items || payload.orderItems;
    if (!Array.isArray(items) || items.length === 0) {
      this.logger.warn('Invalid or empty items array in Talabat payload');
      return false;
    }

    return true;
  }

  /**
   * Format response for Talabat acknowledgment
   */
  formatResponse(success: boolean, orderId?: string, error?: string): any {
    if (success) {
      return {
        success: true,
        orderId: orderId,
        status: 'RECEIVED',
        message: 'Order successfully received',
        timestamp: new Date().toISOString(),
      };
    } else {
      return {
        success: false,
        status: 'FAILED',
        error: {
          code: 'ORDER_PROCESSING_FAILED',
          message: error || 'Failed to process order',
        },
        timestamp: new Date().toISOString(),
      };
    }
  }
}