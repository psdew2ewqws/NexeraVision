import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

/**
 * Order Mapping Service for External Provider Integration
 *
 * Maps orders from external delivery providers to internal restaurant platform format:
 * - Careem Now: Maps Careem order structure
 * - Talabat: Maps Talabat order structure
 * - Deliveroo: Maps Deliveroo order structure
 * - Jahez: Maps Jahez order structure
 */
@Injectable()
export class OrderMappingService {
  private readonly logger = new Logger(OrderMappingService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Map external order to internal order format
   */
  async mapExternalOrderToInternal(orderData: any, provider: string, companyId: string) {
    this.logger.log(`Mapping ${provider} order to internal format`);

    switch (provider.toLowerCase()) {
      case 'careem':
        return await this.mapCareemOrder(orderData, companyId);

      case 'talabat':
        return await this.mapTalabatOrder(orderData, companyId);

      case 'deliveroo':
        return await this.mapDeliverooOrder(orderData, companyId);

      case 'jahez':
        return await this.mapJahezOrder(orderData, companyId);

      default:
        return await this.mapGenericOrder(orderData, companyId, provider);
    }
  }

  /**
   * Map Careem Now order structure
   */
  private async mapCareemOrder(careemOrder: any, companyId: string) {
    // Find or create customer
    const customer = await this.findOrCreateCustomer({
      name: careemOrder.customer?.name || 'Careem Customer',
      phone: careemOrder.customer?.phone,
      email: careemOrder.customer?.email,
      address: careemOrder.delivery_address
    }, companyId);

    // Find branch by Careem restaurant ID
    const branch = await this.findBranchByExternalId(
      careemOrder.restaurant_id || careemOrder.store_id,
      companyId
    );

    // Map order items
    const orderItems = await this.mapCareemOrderItems(careemOrder.items || [], companyId);

    return {
      customerId: customer.id,
      branchId: branch.id,
      orderNumber: careemOrder.order_number || careemOrder.id,
      subtotal: parseFloat(careemOrder.subtotal || careemOrder.order_amount || '0'),
      tax: parseFloat(careemOrder.tax_amount || '0'),
      deliveryFee: parseFloat(careemOrder.delivery_fee || '0'),
      total: parseFloat(careemOrder.total_amount || careemOrder.order_amount || '0'),
      currency: careemOrder.currency || 'JOD',
      orderType: 'delivery',
      paymentMethod: careemOrder.payment_method || 'online',
      customerNotes: careemOrder.special_instructions || careemOrder.notes,
      deliveryAddress: careemOrder.delivery_address,
      estimatedDeliveryTime: careemOrder.estimated_delivery_time,
      orderItems: {
        create: orderItems
      }
    };
  }

  /**
   * Map Talabat order structure
   */
  private async mapTalabatOrder(talabatOrder: any, companyId: string) {
    const customer = await this.findOrCreateCustomer({
      name: talabatOrder.customer_name || 'Talabat Customer',
      phone: talabatOrder.customer_phone,
      email: talabatOrder.customer_email,
      address: talabatOrder.customer_address
    }, companyId);

    const branch = await this.findBranchByExternalId(
      talabatOrder.vendor_id || talabatOrder.restaurant_id,
      companyId
    );

    const orderItems = await this.mapTalabatOrderItems(talabatOrder.basket || [], companyId);

    return {
      customerId: customer.id,
      branchId: branch.id,
      orderNumber: talabatOrder.order_id,
      subtotal: parseFloat(talabatOrder.basket_amount || '0'),
      tax: parseFloat(talabatOrder.tax || '0'),
      deliveryFee: parseFloat(talabatOrder.delivery_fee || '0'),
      total: parseFloat(talabatOrder.order_amount || '0'),
      currency: 'JOD',
      orderType: talabatOrder.order_type || 'delivery',
      paymentMethod: talabatOrder.payment_method || 'online',
      customerNotes: talabatOrder.customer_notes,
      deliveryAddress: talabatOrder.customer_address,
      orderItems: {
        create: orderItems
      }
    };
  }

  /**
   * Map Deliveroo order structure
   */
  private async mapDeliverooOrder(deliverooOrder: any, companyId: string) {
    const customer = await this.findOrCreateCustomer({
      name: `${deliverooOrder.customer?.first_name || ''} ${deliverooOrder.customer?.last_name || ''}`.trim() || 'Deliveroo Customer',
      phone: deliverooOrder.customer?.phone_number,
      email: deliverooOrder.customer?.email,
      address: deliverooOrder.delivery_address?.full_address
    }, companyId);

    const branch = await this.findBranchByExternalId(
      deliverooOrder.restaurant?.id,
      companyId
    );

    const orderItems = await this.mapDeliverooOrderItems(deliverooOrder.items || [], companyId);

    return {
      customerId: customer.id,
      branchId: branch.id,
      orderNumber: deliverooOrder.order_id,
      subtotal: parseFloat(deliverooOrder.subtotal || '0'),
      tax: parseFloat(deliverooOrder.tax || '0'),
      deliveryFee: parseFloat(deliverooOrder.delivery_fee || '0'),
      total: parseFloat(deliverooOrder.total || '0'),
      currency: deliverooOrder.currency || 'JOD',
      orderType: 'delivery',
      paymentMethod: 'online',
      customerNotes: deliverooOrder.notes,
      deliveryAddress: deliverooOrder.delivery_address?.full_address,
      orderItems: {
        create: orderItems
      }
    };
  }

  /**
   * Map Jahez order structure
   */
  private async mapJahezOrder(jahezOrder: any, companyId: string) {
    const customer = await this.findOrCreateCustomer({
      name: jahezOrder.customer_name || 'Jahez Customer',
      phone: jahezOrder.customer_mobile,
      email: jahezOrder.customer_email,
      address: jahezOrder.delivery_address
    }, companyId);

    const branch = await this.findBranchByExternalId(
      jahezOrder.restaurant_id,
      companyId
    );

    const orderItems = await this.mapJahezOrderItems(jahezOrder.items || [], companyId);

    return {
      customerId: customer.id,
      branchId: branch.id,
      orderNumber: jahezOrder.order_number,
      subtotal: parseFloat(jahezOrder.subtotal || '0'),
      tax: parseFloat(jahezOrder.tax_amount || '0'),
      deliveryFee: parseFloat(jahezOrder.delivery_fee || '0'),
      total: parseFloat(jahezOrder.total_amount || '0'),
      currency: 'SAR',
      orderType: 'delivery',
      paymentMethod: jahezOrder.payment_method || 'online',
      customerNotes: jahezOrder.special_requests,
      deliveryAddress: jahezOrder.delivery_address,
      orderItems: {
        create: orderItems
      }
    };
  }

  /**
   * Map generic order structure for unknown providers
   */
  private async mapGenericOrder(orderData: any, companyId: string, provider: string) {
    const customer = await this.findOrCreateCustomer({
      name: orderData.customer_name || orderData.customerName || `${provider} Customer`,
      phone: orderData.customer_phone || orderData.phone,
      email: orderData.customer_email || orderData.email,
      address: orderData.delivery_address || orderData.address
    }, companyId);

    const branch = await this.findBranchByExternalId(
      orderData.restaurant_id || orderData.store_id || orderData.vendor_id,
      companyId
    );

    return {
      customerId: customer.id,
      branchId: branch.id,
      orderNumber: orderData.order_id || orderData.id,
      subtotal: parseFloat(orderData.subtotal || orderData.order_amount || '0'),
      tax: parseFloat(orderData.tax || '0'),
      deliveryFee: parseFloat(orderData.delivery_fee || '0'),
      total: parseFloat(orderData.total || orderData.order_amount || '0'),
      currency: orderData.currency || 'JOD',
      orderType: orderData.order_type || 'delivery',
      paymentMethod: orderData.payment_method || 'online',
      customerNotes: orderData.notes || orderData.special_instructions,
      deliveryAddress: orderData.delivery_address || orderData.address,
      orderItems: {
        create: await this.mapGenericOrderItems(orderData.items || [], companyId)
      }
    };
  }

  /**
   * Map external status to internal status
   */
  mapExternalStatusToInternal(externalStatus: string, provider: string): string {
    const statusMappings = {
      careem: {
        'accepted': 'confirmed',
        'preparing': 'preparing',
        'ready': 'ready',
        'picked_up': 'out_for_delivery',
        'delivered': 'delivered',
        'cancelled': 'cancelled',
        'rejected': 'cancelled'
      },
      talabat: {
        'confirmed': 'confirmed',
        'preparing': 'preparing',
        'ready_for_pickup': 'ready',
        'out_for_delivery': 'out_for_delivery',
        'delivered': 'delivered',
        'cancelled': 'cancelled'
      },
      deliveroo: {
        'acknowledged': 'confirmed',
        'prepared': 'ready',
        'dispatched': 'out_for_delivery',
        'delivered': 'delivered',
        'cancelled': 'cancelled'
      },
      jahez: {
        'confirmed': 'confirmed',
        'in_preparation': 'preparing',
        'ready': 'ready',
        'on_the_way': 'out_for_delivery',
        'delivered': 'delivered',
        'cancelled': 'cancelled'
      }
    };

    const mapping = statusMappings[provider.toLowerCase()];
    return mapping?.[externalStatus.toLowerCase()] || 'received';
  }

  /**
   * Helper methods for order item mapping
   */
  private async mapCareemOrderItems(items: any[], companyId: string) {
    return Promise.all(items.map(async (item) => {
      const menuProduct = await this.findMenuProductByName(item.name || item.product_name, companyId);

      return {
        menuProductId: menuProduct?.id,
        name: item.name || item.product_name,
        quantity: parseInt(item.quantity || '1'),
        unitPrice: parseFloat(item.price || item.unit_price || '0'),
        totalPrice: parseFloat(item.total_price || item.price || '0'),
        specialInstructions: item.special_instructions || item.notes
      };
    }));
  }

  private async mapTalabatOrderItems(items: any[], companyId: string) {
    return Promise.all(items.map(async (item) => {
      const menuProduct = await this.findMenuProductByName(item.name, companyId);

      return {
        menuProductId: menuProduct?.id,
        name: item.name,
        quantity: parseInt(item.quantity || '1'),
        unitPrice: parseFloat(item.price || '0'),
        totalPrice: parseFloat(item.total || '0'),
        specialInstructions: item.special_request
      };
    }));
  }

  private async mapDeliverooOrderItems(items: any[], companyId: string) {
    return Promise.all(items.map(async (item) => {
      const menuProduct = await this.findMenuProductByName(item.name, companyId);

      return {
        menuProductId: menuProduct?.id,
        name: item.name,
        quantity: parseInt(item.quantity || '1'),
        unitPrice: parseFloat(item.price || '0'),
        totalPrice: parseFloat(item.total_price || '0'),
        specialInstructions: item.special_instructions
      };
    }));
  }

  private async mapJahezOrderItems(items: any[], companyId: string) {
    return Promise.all(items.map(async (item) => {
      const menuProduct = await this.findMenuProductByName(item.product_name, companyId);

      return {
        menuProductId: menuProduct?.id,
        name: item.product_name,
        quantity: parseInt(item.quantity || '1'),
        unitPrice: parseFloat(item.unit_price || '0'),
        totalPrice: parseFloat(item.total_price || '0'),
        specialInstructions: item.special_requests
      };
    }));
  }

  private async mapGenericOrderItems(items: any[], companyId: string) {
    return Promise.all(items.map(async (item) => {
      const menuProduct = await this.findMenuProductByName(
        item.name || item.product_name || item.title,
        companyId
      );

      return {
        menuProductId: menuProduct?.id,
        name: item.name || item.product_name || item.title,
        quantity: parseInt(item.quantity || '1'),
        unitPrice: parseFloat(item.price || item.unit_price || '0'),
        totalPrice: parseFloat(item.total || item.total_price || '0'),
        specialInstructions: item.notes || item.special_instructions
      };
    }));
  }

  /**
   * Helper methods for data lookup
   */
  private async findOrCreateCustomer(customerData: any, companyId: string) {
    if (!customerData.phone && !customerData.email) {
      // Create anonymous customer
      return await this.prisma.customer.create({
        data: {
          name: customerData.name || 'Guest Customer',
          phone: null,
          email: null,
          companyId,
          isGuest: true
        }
      });
    }

    // Try to find existing customer
    let customer = await this.prisma.customer.findFirst({
      where: {
        companyId,
        OR: [
          { phone: customerData.phone },
          { email: customerData.email }
        ]
      }
    });

    if (!customer) {
      customer = await this.prisma.customer.create({
        data: {
          name: customerData.name,
          phone: customerData.phone,
          email: customerData.email,
          address: customerData.address,
          companyId
        }
      });
    }

    return customer;
  }

  private async findBranchByExternalId(externalId: string, companyId: string) {
    let branch = await this.prisma.branch.findFirst({
      where: {
        companyId,
        externalId
      }
    });

    if (!branch) {
      // Find default branch for company
      branch = await this.prisma.branch.findFirst({
        where: {
          companyId,
          isDefault: true
        }
      });
    }

    if (!branch) {
      // Find any branch for company
      branch = await this.prisma.branch.findFirst({
        where: { companyId }
      });
    }

    return branch;
  }

  private async findMenuProductByName(productName: string, companyId: string) {
    if (!productName) return null;

    return await this.prisma.menuProduct.findFirst({
      where: {
        companyId,
        OR: [
          { name: { contains: productName, mode: 'insensitive' } },
          { nameAr: { contains: productName, mode: 'insensitive' } }
        ]
      }
    });
  }
}