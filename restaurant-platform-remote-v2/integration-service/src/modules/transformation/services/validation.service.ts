import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ProviderOrder } from '../../adapters/interfaces/provider-adapter.interface';

/**
 * Validation Service
 * Validates order data at different stages of transformation
 */
@Injectable()
export class ValidationService {
  private readonly logger = new Logger(ValidationService.name);

  /**
   * Validate provider order before transformation
   */
  async validateProviderOrder(order: ProviderOrder): Promise<void> {
    const errors: string[] = [];

    // Validate required fields
    if (!order.externalOrderId) {
      errors.push('External order ID is required');
    }

    if (!order.branchId) {
      errors.push('Branch ID is required');
    }

    // Validate customer
    if (!order.customer) {
      errors.push('Customer information is required');
    } else {
      if (!order.customer.name) {
        errors.push('Customer name is required');
      }
      if (!order.customer.phone) {
        errors.push('Customer phone is required');
      }
      if (order.customer.phone && !this.isValidPhoneNumber(order.customer.phone)) {
        errors.push('Invalid customer phone number format');
      }
    }

    // Validate items
    if (!order.items || order.items.length === 0) {
      errors.push('Order must contain at least one item');
    } else {
      order.items.forEach((item, index) => {
        if (!item.name) {
          errors.push(`Item ${index + 1}: name is required`);
        }
        if (!item.quantity || item.quantity <= 0) {
          errors.push(`Item ${index + 1}: quantity must be greater than 0`);
        }
        if (item.price < 0) {
          errors.push(`Item ${index + 1}: price cannot be negative`);
        }
      });
    }

    // Validate totals
    if (!order.totals) {
      errors.push('Order totals are required');
    } else {
      if (order.totals.total < 0) {
        errors.push('Order total cannot be negative');
      }
      if (order.totals.subtotal < 0) {
        errors.push('Order subtotal cannot be negative');
      }
      if (order.totals.tax < 0) {
        errors.push('Order tax cannot be negative');
      }
      if (order.totals.deliveryFee < 0) {
        errors.push('Delivery fee cannot be negative');
      }
    }

    // Validate payment
    if (!order.payment) {
      errors.push('Payment information is required');
    } else {
      if (!order.payment.method) {
        errors.push('Payment method is required');
      }
      if (!['cash', 'card', 'online'].includes(order.payment.method)) {
        errors.push('Invalid payment method');
      }
      if (!order.payment.status) {
        errors.push('Payment status is required');
      }
    }

    // Validate delivery
    if (!order.delivery) {
      errors.push('Delivery information is required');
    } else {
      if (!order.delivery.type) {
        errors.push('Delivery type is required');
      }
      if (!['delivery', 'pickup'].includes(order.delivery.type)) {
        errors.push('Invalid delivery type');
      }
      if (order.delivery.type === 'delivery' && !order.delivery.address) {
        errors.push('Delivery address is required for delivery orders');
      }
    }

    // If there are validation errors, throw exception
    if (errors.length > 0) {
      this.logger.error(`Provider order validation failed: ${errors.join(', ')}`);
      throw new BadRequestException({
        message: 'Provider order validation failed',
        errors: errors,
      });
    }

    this.logger.log(`Provider order ${order.externalOrderId} validated successfully`);
  }

  /**
   * Validate internal order after transformation
   */
  async validateInternalOrder(order: any): Promise<void> {
    const errors: string[] = [];

    // Validate required fields
    if (!order.externalOrderId) {
      errors.push('External order ID is required');
    }

    if (!order.branchId) {
      errors.push('Branch ID is required');
    }

    if (!order.companyId) {
      errors.push('Company ID is required');
    }

    if (!order.customerId) {
      errors.push('Customer ID is required');
    }

    // Validate order type
    if (!order.orderType || !['delivery', 'pickup'].includes(order.orderType)) {
      errors.push('Invalid order type');
    }

    // Validate items
    if (!order.items || order.items.length === 0) {
      errors.push('Order must contain at least one item');
    }

    // Validate totals
    if (order.total === undefined || order.total === null) {
      errors.push('Order total is required');
    }

    if (order.subtotal === undefined || order.subtotal === null) {
      errors.push('Order subtotal is required');
    }

    // Validate that totals make sense
    const calculatedTotal = order.subtotal + order.deliveryFee + order.tax - order.discount;
    const tolerance = 0.01; // Allow 1 cent difference due to rounding

    if (Math.abs(calculatedTotal - order.total) > tolerance) {
      errors.push(`Total mismatch: calculated ${calculatedTotal}, provided ${order.total}`);
    }

    // Validate payment
    if (!order.paymentMethod) {
      errors.push('Payment method is required');
    }

    if (!order.paymentStatus) {
      errors.push('Payment status is required');
    }

    // If there are validation errors, throw exception
    if (errors.length > 0) {
      this.logger.error(`Internal order validation failed: ${errors.join(', ')}`);
      throw new BadRequestException({
        message: 'Internal order validation failed',
        errors: errors,
      });
    }

    this.logger.log(`Internal order ${order.externalOrderId} validated successfully`);
  }

  /**
   * Validate phone number format (Jordan format)
   */
  private isValidPhoneNumber(phone: string): boolean {
    // Remove spaces, dashes, and country code
    const cleanedPhone = phone.replace(/[\s-]/g, '').replace(/^\+?962/, '');

    // Jordan phone numbers: 07XXXXXXXX or 7XXXXXXXX
    const jordanPhoneRegex = /^(07|7)\d{8}$/;

    return jordanPhoneRegex.test(cleanedPhone);
  }

  /**
   * Validate email format
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Validate coordinates
   */
  private isValidCoordinates(lat: number, lng: number): boolean {
    // Jordan approximate coordinates
    const jordanBounds = {
      minLat: 29.183,
      maxLat: 33.367,
      minLng: 34.883,
      maxLng: 39.317,
    };

    return (
      lat >= jordanBounds.minLat &&
      lat <= jordanBounds.maxLat &&
      lng >= jordanBounds.minLng &&
      lng <= jordanBounds.maxLng
    );
  }
}