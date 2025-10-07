import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { ValidationService } from './validation.service';
import { ProviderOrder } from '../../adapters/interfaces/provider-adapter.interface';

/**
 * Order Transformer Service
 * Transforms provider-specific orders to internal format
 */
@Injectable()
export class OrderTransformerService {
  private readonly logger = new Logger(OrderTransformerService.name);

  constructor(
    private prisma: PrismaService,
    private validationService: ValidationService,
  ) {}

  /**
   * Transform provider order to internal format
   */
  async transform(providerOrder: ProviderOrder, provider: string): Promise<any> {
    this.logger.log(`Transforming order from ${provider}: ${providerOrder.externalOrderId}`);

    // Validate provider order
    await this.validationService.validateProviderOrder(providerOrder);

    // Map branch ID from provider to internal
    const branchMapping = await this.mapBranchId(providerOrder.branchId, provider);

    // Get or create customer
    const customer = await this.processCustomer(providerOrder.customer, branchMapping.companyId);

    // Transform order items
    const items = await this.transformOrderItems(
      providerOrder.items,
      branchMapping.branchId,
      branchMapping.companyId,
    );

    // Calculate totals with tax
    const totals = await this.calculateTotals(providerOrder.totals, items);

    // Build internal order structure
    const internalOrder = {
      // Order identification
      externalOrderId: providerOrder.externalOrderId,
      orderSource: provider,
      branchId: branchMapping.branchId,
      companyId: branchMapping.companyId,
      customerId: customer.id,

      // Order details
      orderType: providerOrder.delivery.type,
      status: 'pending',
      notes: providerOrder.notes,
      scheduledAt: providerOrder.scheduledAt,

      // Items and pricing
      items: items,
      subtotal: totals.subtotal,
      deliveryFee: providerOrder.delivery.fee,
      tax: totals.tax,
      discount: providerOrder.totals.discount,
      total: totals.total,

      // Payment information
      paymentMethod: providerOrder.payment.method,
      paymentStatus: providerOrder.payment.status,
      paymentTransactionId: providerOrder.payment.transactionId,

      // Delivery information
      deliveryAddress: providerOrder.delivery.address,
      deliveryEstimatedTime: providerOrder.delivery.estimatedTime,

      // Metadata
      metadata: {
        ...providerOrder.metadata,
        transformedAt: new Date().toISOString(),
      },
    };

    // Validate transformed order
    await this.validationService.validateInternalOrder(internalOrder);

    return internalOrder;
  }

  /**
   * Map provider branch ID to internal branch ID
   */
  private async mapBranchId(
    providerBranchId: string,
    provider: string,
  ): Promise<{ branchId: string; companyId: string }> {
    // Query branch_delivery_configs to find mapping
    const config = await this.prisma.branchDeliveryConfig.findFirst({
      where: {
        providerId: provider,
        merchantId: providerBranchId,
        isActive: true,
      },
      select: {
        branchId: true,
        companyId: true,
      },
    });

    if (!config) {
      // Try to find by branch ID directly (fallback)
      const branch = await this.prisma.branch.findFirst({
        where: {
          OR: [
            { id: providerBranchId },
            { code: providerBranchId },
          ],
        },
        select: {
          id: true,
          companyId: true,
        },
      });

      if (!branch) {
        throw new Error(`No branch mapping found for provider ${provider} branch ${providerBranchId}`);
      }

      return { branchId: branch.id, companyId: branch.companyId };
    }

    return { branchId: config.branchId, companyId: config.companyId };
  }

  /**
   * Process customer information
   */
  private async processCustomer(customerInfo: any, companyId: string) {
    // Check if customer exists
    let customer = await this.prisma.customer.findFirst({
      where: {
        phone: customerInfo.phone,
        companyId: companyId,
      },
    });

    if (!customer) {
      // Create new customer
      customer = await this.prisma.customer.create({
        data: {
          name: customerInfo.name,
          phone: customerInfo.phone,
          email: customerInfo.email,
          companyId: companyId,
          addresses: customerInfo.address ? {
            create: {
              companyId: companyId,
              street: customerInfo.address.street,
              building: customerInfo.address.building,
              floor: customerInfo.address.floor,
              apartment: customerInfo.address.apartment,
              city: customerInfo.address.city,
              area: customerInfo.address.area,
              landmark: customerInfo.address.landmark,
              latitude: customerInfo.address.coordinates?.latitude,
              longitude: customerInfo.address.coordinates?.longitude,
              isDefault: true,
            },
          } : undefined,
        },
      });
    } else if (customerInfo.address) {
      // Update customer address if provided
      await this.updateCustomerAddress(customer.id, companyId, customerInfo.address);
    }

    return customer;
  }

  /**
   * Update customer address
   */
  private async updateCustomerAddress(customerId: string, companyId: string, address: any) {
    // Check if address already exists
    const existingAddress = await this.prisma.customerAddress.findFirst({
      where: {
        customerId: customerId,
        street: address.street,
        building: address.building,
      },
    });

    if (!existingAddress) {
      // Create new address
      await this.prisma.customerAddress.create({
        data: {
          customerId: customerId,
          companyId: companyId,
          street: address.street,
          building: address.building,
          floor: address.floor,
          apartment: address.apartment,
          city: address.city,
          area: address.area,
          landmark: address.landmark,
          latitude: address.coordinates?.latitude,
          longitude: address.coordinates?.longitude,
          isDefault: false,
        },
      });
    }
  }

  /**
   * Transform order items to internal format
   */
  private async transformOrderItems(items: any[], branchId: string, companyId: string) {
    const transformedItems = [];

    for (const item of items) {
      // Try to map to internal product
      const product = await this.findProduct(item, branchId, companyId);

      const transformedItem = {
        productId: product?.id,
        externalProductId: item.externalId,
        name: item.name,
        quantity: item.quantity,
        price: item.price,
        totalPrice: item.price * item.quantity,
        notes: item.notes,
        modifiers: item.modifiers?.map((mod: any) => ({
          name: mod.name,
          price: mod.price,
          quantity: mod.quantity,
          totalPrice: mod.price * mod.quantity,
        })),
      };

      transformedItems.push(transformedItem);
    }

    return transformedItems;
  }

  /**
   * Find internal product by external ID or name
   */
  private async findProduct(item: any, branchId: string, companyId: string) {
    // First try to find by external ID mapping
    let product = await this.prisma.menuProduct.findFirst({
      where: {
        companyId: companyId,
        externalIds: {
          array_contains: [item.externalId],
        },
      },
    });

    if (!product) {
      // Try to find by name - name is Json field, so we need to query all products and filter in memory
      const products = await this.prisma.menuProduct.findMany({
        where: {
          companyId: companyId,
        },
      });

      // Find product by name match (case insensitive)
      product = products.find(p => {
        const productName = typeof p.name === 'string' ? p.name : (p.name as any)?.en || (p.name as any)?.ar || '';
        return productName.toLowerCase().includes(item.name.toLowerCase());
      });
    }

    return product;
  }

  /**
   * Calculate order totals with tax
   */
  private async calculateTotals(providerTotals: any, items: any[]) {
    // Calculate subtotal from items
    let subtotal = 0;
    for (const item of items) {
      subtotal += item.totalPrice;
      if (item.modifiers) {
        for (const mod of item.modifiers) {
          subtotal += mod.totalPrice;
        }
      }
    }

    // Use provider totals if available, otherwise calculate
    const finalSubtotal = providerTotals.subtotal || subtotal;
    const tax = providerTotals.tax || (finalSubtotal * 0.16); // Default 16% VAT for Jordan
    const total = providerTotals.total || (finalSubtotal + tax + providerTotals.deliveryFee - providerTotals.discount);

    return {
      subtotal: finalSubtotal,
      tax: tax,
      total: total,
    };
  }
}