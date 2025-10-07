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
 * Careem Adapter Implementation
 * Handles Careem NOW webhook payload transformation
 */
@Injectable()
export class CareemAdapter implements IProviderAdapter {
  private readonly logger = new Logger(CareemAdapter.name);
  readonly providerName = 'careem';

  /**
   * Extract order from Careem webhook payload
   */
  async extractOrder(payload: any): Promise<ProviderOrder> {
    this.logger.log(`Extracting Careem order: ${payload.order_id}`);

    if (!this.validatePayload(payload)) {
      throw new Error('Invalid Careem payload structure');
    }

    const customer = this.extractCustomer(payload);
    const delivery = this.extractDeliveryInfo(payload);
    const items = this.extractOrderItems(payload);
    const payment = this.extractPaymentInfo(payload);
    const totals = this.extractOrderTotals(payload);

    return {
      externalOrderId: payload.order_id || payload.reference_id,
      branchId: this.extractBranchId(payload),
      customer,
      items,
      delivery,
      payment,
      totals,
      notes: payload.special_instructions || payload.notes || '',
      scheduledAt: payload.scheduled_at ? new Date(payload.scheduled_at) : undefined,
      metadata: {
        provider: 'careem',
        rawPayload: payload,
        merchantId: payload.merchant_id,
        storeId: payload.store_id,
        createdAt: payload.created_at,
      },
    };
  }

  /**
   * Map Careem order status to internal status
   */
  mapOrderStatus(careemStatus: string): OrderStatus {
    const statusMap: Record<string, OrderStatus> = {
      'new': OrderStatus.PENDING,
      'confirmed': OrderStatus.ACCEPTED,
      'in_progress': OrderStatus.PREPARING,
      'ready_for_pickup': OrderStatus.READY,
      'picked_up': OrderStatus.OUT_FOR_DELIVERY,
      'delivered': OrderStatus.DELIVERED,
      'cancelled': OrderStatus.CANCELLED,
      'rejected': OrderStatus.REJECTED,
    };

    return statusMap[careemStatus.toLowerCase()] || OrderStatus.PENDING;
  }

  /**
   * Extract customer information from Careem payload
   */
  extractCustomer(payload: any): CustomerInfo {
    const customer = payload.customer || {};

    return {
      name: customer.name || `${customer.first_name || ''} ${customer.last_name || ''}`.trim(),
      phone: customer.phone || customer.mobile || '',
      email: customer.email,
      address: customer.delivery_address ? {
        street: customer.delivery_address.address_line_1 || '',
        building: customer.delivery_address.building_number,
        floor: customer.delivery_address.floor,
        apartment: customer.delivery_address.apartment,
        city: customer.delivery_address.city || 'Amman',
        area: customer.delivery_address.area || customer.delivery_address.district,
        landmark: customer.delivery_address.landmark,
        coordinates: {
          latitude: parseFloat(customer.delivery_address.latitude) || 0,
          longitude: parseFloat(customer.delivery_address.longitude) || 0,
        },
      } : undefined,
    };
  }

  /**
   * Extract delivery information from Careem payload
   */
  extractDeliveryInfo(payload: any): DeliveryInfo {
    const delivery = payload.delivery || {};
    const customer = payload.customer || {};

    return {
      type: payload.order_type === 'pickup' ? 'pickup' : 'delivery',
      address: customer.delivery_address ? {
        street: customer.delivery_address.address_line_1 || '',
        building: customer.delivery_address.building_number,
        floor: customer.delivery_address.floor,
        apartment: customer.delivery_address.apartment,
        city: customer.delivery_address.city || 'Amman',
        area: customer.delivery_address.area,
        landmark: customer.delivery_address.landmark,
        coordinates: {
          latitude: parseFloat(customer.delivery_address.latitude) || 0,
          longitude: parseFloat(customer.delivery_address.longitude) || 0,
        },
      } : undefined,
      fee: parseFloat(delivery.fee || payload.delivery_fee || '0'),
      estimatedTime: delivery.estimated_time || 30,
      driver: delivery.driver ? {
        name: delivery.driver.name,
        phone: delivery.driver.phone,
      } : undefined,
    };
  }

  /**
   * Extract order items from Careem payload
   */
  private extractOrderItems(payload: any): OrderItem[] {
    const items = payload.items || payload.order_items || [];

    return items.map((item: any) => ({
      externalId: item.id || item.item_id || '',
      name: item.name || item.title || '',
      quantity: parseInt(item.quantity) || 1,
      price: parseFloat(item.price || item.unit_price || '0'),
      modifiers: this.extractItemModifiers(item),
      notes: item.special_instructions || item.notes || '',
    }));
  }

  /**
   * Extract item modifiers/options
   */
  private extractItemModifiers(item: any): any[] {
    const modifiers = item.modifiers || item.options || item.add_ons || [];

    return modifiers.map((mod: any) => ({
      name: mod.name || mod.title || '',
      price: parseFloat(mod.price || '0'),
      quantity: parseInt(mod.quantity) || 1,
    }));
  }

  /**
   * Extract payment information from Careem payload
   */
  private extractPaymentInfo(payload: any): PaymentInfo {
    const payment = payload.payment || {};

    return {
      method: this.mapPaymentMethod(payment.method || payload.payment_method),
      status: payment.status === 'paid' ? 'paid' : 'pending',
      transactionId: payment.transaction_id || payment.reference,
      amount: parseFloat(payload.total_amount || payload.grand_total || '0'),
    };
  }

  /**
   * Map Careem payment method to internal format
   */
  private mapPaymentMethod(careemMethod: string): 'cash' | 'card' | 'online' {
    const method = (careemMethod || '').toLowerCase();

    if (method.includes('cash')) return 'cash';
    if (method.includes('card') || method.includes('credit')) return 'card';
    return 'online';
  }

  /**
   * Extract order totals from Careem payload
   */
  private extractOrderTotals(payload: any): OrderTotals {
    return {
      subtotal: parseFloat(payload.subtotal || payload.sub_total || '0'),
      deliveryFee: parseFloat(payload.delivery_fee || payload.delivery_charge || '0'),
      tax: parseFloat(payload.tax || payload.vat || '0'),
      discount: parseFloat(payload.discount || payload.promo_discount || '0'),
      total: parseFloat(payload.total_amount || payload.grand_total || '0'),
    };
  }

  /**
   * Extract branch ID from Careem payload
   * This needs to map Careem store_id to internal branch_id
   */
  private extractBranchId(payload: any): string {
    // TODO: Implement mapping from Careem store_id to internal branch_id
    // This should query the branch_delivery_configs table
    return payload.store_id || payload.branch_id || '';
  }

  /**
   * Validate Careem payload structure
   */
  validatePayload(payload: any): boolean {
    if (!payload) return false;

    // Check required fields
    const requiredFields = ['order_id', 'customer', 'items'];
    for (const field of requiredFields) {
      if (!(field in payload)) {
        this.logger.warn(`Missing required field in Careem payload: ${field}`);
        return false;
      }
    }

    // Validate customer data
    if (!payload.customer.name && !payload.customer.first_name) {
      this.logger.warn('Missing customer name in Careem payload');
      return false;
    }

    // Validate items array
    if (!Array.isArray(payload.items) || payload.items.length === 0) {
      this.logger.warn('Invalid or empty items array in Careem payload');
      return false;
    }

    return true;
  }

  /**
   * Format response for Careem acknowledgment
   */
  formatResponse(success: boolean, orderId?: string, error?: string): any {
    if (success) {
      return {
        status: 'success',
        order_id: orderId,
        message: 'Order received successfully',
        timestamp: new Date().toISOString(),
      };
    } else {
      return {
        status: 'error',
        error: error || 'Order processing failed',
        timestamp: new Date().toISOString(),
      };
    }
  }
}