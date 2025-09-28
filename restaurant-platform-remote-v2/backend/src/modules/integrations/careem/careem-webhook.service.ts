import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../database/prisma.service';
import { CareemService } from './careem.service';
import { OrdersService } from '../../orders/orders.service';
import { PrintingModule } from '../../printing/printing.module';
import { OrderType, PaymentMethod } from '../../orders/dto/create-order.dto';
import * as crypto from 'crypto';

interface WebhookPayload {
  eventType: string;
  payload: any;
  signature: string;
  timestamp: string;
}

@Injectable()
export class CareemWebhookService {
  private readonly logger = new Logger(CareemWebhookService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly careemService: CareemService,
    private readonly ordersService: OrdersService,
  ) {}

  /**
   * Validate webhook signature from Careem
   */
  validateSignature(payload: any, signature: string, timestamp: string): boolean {
    try {
      const webhookSecret = this.configService.get<string>('CAREEM_WEBHOOK_SECRET');
      if (!webhookSecret) {
        this.logger.warn('Careem webhook secret not configured');
        return false;
      }

      // Create signature string
      const signatureString = `${timestamp}.${JSON.stringify(payload)}`;
      const expectedSignature = crypto
        .createHmac('sha256', webhookSecret)
        .update(signatureString)
        .digest('hex');

      const expectedSignatureHeader = `sha256=${expectedSignature}`;

      // Compare signatures securely
      return crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expectedSignatureHeader)
      );
    } catch (error) {
      this.logger.error(`Signature validation failed: ${error.message}`);
      return false;
    }
  }

  /**
   * Process incoming webhook from Careem
   */
  async processWebhook(webhookData: WebhookPayload) {
    const { eventType, payload, signature, timestamp } = webhookData;

    // Log the webhook event
    const webhookEvent = await this.prisma.careemWebhookEvent.create({
      data: {
        eventType,
        eventData: payload,
        signature,
        receivedAt: new Date(),
      },
    });

    try {
      // Process based on event type
      switch (eventType) {
        case 'ORDER_CREATED':
          await this.handleOrderCreated(payload, webhookEvent.id);
          break;
        case 'ORDER_STATUS_UPDATED':
          await this.handleOrderStatusUpdated(payload, webhookEvent.id);
          break;
        case 'ORDER_CANCELLED':
          await this.handleOrderCancelled(payload, webhookEvent.id);
          break;
        default:
          this.logger.warn(`Unknown webhook event type: ${eventType}`);
      }

      // Mark webhook as processed
      await this.prisma.careemWebhookEvent.update({
        where: { id: webhookEvent.id },
        data: {
          processed: true,
          processedAt: new Date(),
        },
      });

      return webhookEvent;
    } catch (error) {
      this.logger.error(`Webhook processing failed: ${error.message}`, error.stack);

      // Mark webhook as failed
      await this.prisma.careemWebhookEvent.update({
        where: { id: webhookEvent.id },
        data: {
          errorMessage: error.message,
          retryCount: { increment: 1 },
        },
      });

      throw error;
    }
  }

  /**
   * Handle new order from Careem
   */
  private async handleOrderCreated(orderData: any, webhookEventId: string) {
    this.logger.log(`Processing new Careem order: ${orderData.id}`);

    try {
      // Find company and branch from Careem branch ID
      const branchMapping = await this.findBranchMapping(orderData.branch.id);
      if (!branchMapping) {
        throw new Error(`Branch mapping not found for Careem branch: ${orderData.branch.id}`);
      }

      // Create or update Careem order record
      const careemOrder = await this.prisma.careemOrder.upsert({
        where: { careemOrderId: orderData.id.toString() },
        update: {
          status: this.mapCareemStatus(orderData.status),
          orderData: orderData,
          customerData: orderData.customer,
          itemsData: orderData.items,
          pricingData: orderData.price,
          careemUpdatedAt: new Date(orderData.updated_at),
        },
        create: {
          careemOrderId: orderData.id.toString(),
          companyId: branchMapping.companyId,
          branchId: branchMapping.id,
          status: this.mapCareemStatus(orderData.status),
          orderData: orderData,
          customerData: orderData.customer,
          itemsData: orderData.items,
          pricingData: orderData.price,
          careemCreatedAt: new Date(orderData.created_at),
          careemUpdatedAt: new Date(orderData.updated_at),
        },
      });

      // Transform to internal order format
      const internalOrder = this.transformCareemOrder(orderData, branchMapping);

      // Create internal order
      const createdOrder = await this.ordersService.create(internalOrder, { role: 'system', companyId: branchMapping.companyId } as any);

      // Update Careem order with internal order ID
      await this.prisma.careemOrder.update({
        where: { id: careemOrder.id },
        data: {
          internalOrderId: createdOrder.id,
          processedAt: new Date(),
        },
      });

      // Auto-accept the order (or based on business logic)
      await this.careemService.acceptOrder(orderData.id.toString());

      // Trigger printing and notifications
      await this.triggerOrderNotifications(createdOrder, orderData);

      this.logger.log(`Successfully processed Careem order: ${orderData.id}`);
    } catch (error) {
      this.logger.error(`Failed to process Careem order ${orderData.id}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Handle order status updates from Careem
   */
  private async handleOrderStatusUpdated(orderData: any, webhookEventId: string) {
    this.logger.log(`Updating Careem order status: ${orderData.id} -> ${orderData.status}`);

    await this.prisma.careemOrder.update({
      where: { careemOrderId: orderData.id.toString() },
      data: {
        status: this.mapCareemStatus(orderData.status),
        orderData: orderData,
        careemUpdatedAt: new Date(orderData.updated_at),
      },
    });

    // Update internal order status if needed
    const careemOrder = await this.prisma.careemOrder.findUnique({
      where: { careemOrderId: orderData.id.toString() },
    });

    if (careemOrder?.internalOrderId) {
      await this.ordersService.updateStatus(
        careemOrder.internalOrderId,
        { status: this.mapToInternalStatus(orderData.status) },
        { role: 'system', companyId: careemOrder.companyId } as any
      );
    }
  }

  /**
   * Handle order cancellation from Careem
   */
  private async handleOrderCancelled(orderData: any, webhookEventId: string) {
    this.logger.log(`Cancelling Careem order: ${orderData.id}`);

    await this.prisma.careemOrder.update({
      where: { careemOrderId: orderData.id.toString() },
      data: {
        status: 'cancelled',
        orderData: orderData,
        careemUpdatedAt: new Date(orderData.updated_at),
      },
    });

    // Cancel internal order
    const careemOrder = await this.prisma.careemOrder.findUnique({
      where: { careemOrderId: orderData.id.toString() },
    });

    if (careemOrder?.internalOrderId) {
      await this.ordersService.cancel(careemOrder.internalOrderId, 'Cancelled by Careem', { role: 'system', companyId: careemOrder.companyId } as any);
    }
  }

  /**
   * Transform Careem order to internal format
   */
  private transformCareemOrder(careemData: any, branch: any) {
    return {
      branchId: branch.id,
      customerName: careemData.customer.name || 'Careem Customer',
      customerPhone: careemData.customer.phone_number?.toString() || '',
      customerEmail: careemData.customer.email || undefined,
      deliveryAddress: this.formatAddressString(careemData.customer.address),
      orderType: OrderType.delivery,
      subtotal: careemData.price.total_taxable_price || 0,
      deliveryFee: careemData.price.delivery_fee || 0,
      taxAmount: 0, // Careem handles tax
      totalAmount: careemData.price.original_total_price || 0,
      paymentMethod: careemData.merchant_pay_type === 'prepaid' ? PaymentMethod.online : PaymentMethod.cash,
      notes: careemData.notes || undefined,
      orderItems: careemData.items.map((item: any) => ({
        productId: item.id, // This should map to your product ID
        quantity: item.quantity,
        unitPrice: item.unit_price,
        totalPrice: item.total_price,
        productName: { en: this.findProductName(item.id, branch.companyId) },
        modifiers: this.transformModifiers(item.groups),
        specialRequests: item.notes,
      })),
    };
  }

  /**
   * Find branch mapping by Careem branch ID
   */
  private async findBranchMapping(careemBranchId: string) {
    // This should look up your branch mapping table
    // For now, we'll search in branch metadata or create a mapping table
    return this.prisma.branch.findFirst({
      where: {
        integrationData: { path: ['careem', 'branchId'], equals: careemBranchId },
      },
    });
  }

  /**
   * Map Careem status to internal status
   */
  private mapCareemStatus(careemStatus: string) {
    const statusMap = {
      'pending': 'pending',
      'accepted': 'accepted',
      'preparing': 'preparing',
      'ready': 'ready',
      'out_for_delivery': 'out_for_delivery',
      'delivered': 'delivered',
      'cancelled': 'cancelled',
      'rejected': 'rejected',
    };
    return statusMap[careemStatus] || 'pending';
  }

  /**
   * Map to internal order status
   */
  private mapToInternalStatus(careemStatus: string) {
    const statusMap = {
      'pending': 'pending',
      'accepted': 'confirmed',
      'preparing': 'preparing',
      'ready': 'ready',
      'out_for_delivery': 'out_for_delivery',
      'delivered': 'completed',
      'cancelled': 'cancelled',
      'rejected': 'cancelled',
    };
    return statusMap[careemStatus] || 'pending';
  }

  /**
   * Format Careem address structure as string for order
   */
  private formatAddressString(address: any): string {
    if (!address) return '';

    const parts = [
      address.building,
      address.street,
      address.area,
      address.city
    ].filter(Boolean);

    let formatted = parts.join(', ');
    if (address.note) {
      formatted += ` (${address.note})`;
    }

    return formatted || 'Careem Delivery Address';
  }

  /**
   * Format customer address as object
   */
  private formatAddress(address: any) {
    if (!address) return null;

    return {
      street: address.street || '',
      area: address.area || '',
      city: address.city || '',
      building: address.building || '',
      note: address.note || '',
      coordinates: address.location ? {
        lat: parseFloat(address.location.lat),
        lng: parseFloat(address.location.lng),
      } : null,
    };
  }

  /**
   * Transform Careem modifiers to internal format
   */
  private transformModifiers(groups: any[]) {
    if (!groups) return [];

    return groups.flatMap(group =>
      group.options?.map((option: any) => ({
        externalId: option.id,
        name: this.findModifierName(option.id),
        quantity: option.quantity,
        price: option.total_price,
      })) || []
    );
  }

  /**
   * Find product name by external ID
   */
  private async findProductName(externalId: string, companyId: string) {
    const product = await this.prisma.menuProduct.findFirst({
      where: {
        companyId,
        // Note: You might want to add externalIds JSON field to MenuProduct for better tracking
        id: externalId, // Fallback to ID matching for now
      },
    });
    return product?.name || `Careem Product ${externalId}`;
  }

  /**
   * Find modifier name by external ID
   */
  private async findModifierName(externalId: string) {
    // Similar logic for modifiers
    return `Careem Modifier ${externalId}`;
  }

  /**
   * Trigger order notifications (printing, kitchen display, etc.)
   */
  private async triggerOrderNotifications(order: any, careemData: any) {
    try {
      // Trigger printing if configured
      // await this.printingService.printOrder(order);

      // Send to kitchen display
      // await this.ordersGateway.notifyNewOrder(order);

      this.logger.log(`Triggered notifications for order: ${order.id}`);
    } catch (error) {
      this.logger.error(`Failed to trigger notifications: ${error.message}`);
      // Don't throw - notifications are not critical
    }
  }

  /**
   * Get webhook events for debugging
   */
  async getWebhookEvents(params: { limit: number; offset: number }) {
    return this.prisma.careemWebhookEvent.findMany({
      take: params.limit,
      skip: params.offset,
      orderBy: { createdAt: 'desc' },
    });
  }
}