import { Controller, Post, Body, Headers, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { Public } from '../../common/decorators/public.decorator';
import * as crypto from 'crypto';

@Controller('delivery/webhook')
export class CareemWebhookController {
  private readonly logger = new Logger(CareemWebhookController.name);

  constructor(private prisma: PrismaService) {}

  @Public()
  @Post('careem')
  async handleCareemWebhook(
    @Body() payload: any,
    @Headers('x-webhook-signature') signature: string,
    @Headers('x-forwarded-for') forwardedFor: string,
    @Headers() headers: any,
  ) {
    const startTime = Date.now();
    this.logger.log(`Received Careem webhook: ${JSON.stringify(payload).substring(0, 200)}...`);

    try {
      // 1. Log incoming webhook
      const webhookLog = await this.prisma.webhookLog.create({
        data: {
          providerId: await this.getOrCreateProvider('careem'),
          webhookType: 'order_status_update',
          endpoint: '/api/v1/delivery/webhook/careem',
          method: 'POST',
          headers: headers,
          payload: payload,
          signature: signature,
          ipAddress: forwardedFor || 'unknown',
          status: 'received',
        },
      });

      // 2. Validate webhook signature (if configured)
      const webhookSecret = process.env.CAREEM_WEBHOOK_SECRET;
      if (webhookSecret && signature) {
        const isValid = this.validateSignature(payload, signature, webhookSecret);
        if (!isValid) {
          await this.updateWebhookStatus(webhookLog.id, 'failed', 'Invalid signature');
          throw new HttpException('Invalid webhook signature', HttpStatus.UNAUTHORIZED);
        }
      }

      // 3. Update webhook status to processing
      await this.updateWebhookStatus(webhookLog.id, 'processing');

      // 4. Extract order data from Careem payload
      const orderData = this.transformCareemPayload(payload);

      // 5. Find or create customer
      const customer = await this.findOrCreateCustomer(orderData.customer);

      // 6. Create order in database
      const order = await this.prisma.order.create({
        data: {
          orderNumber: `CAREEM-${payload.id || Date.now()}`,
          branchId: orderData.branchId,
          customerId: customer.id,
          customerName: orderData.customer.name,
          customerPhone: orderData.customer.phone,
          customerEmail: orderData.customer.email,
          deliveryAddress: orderData.deliveryAddress,
          orderType: 'delivery',
          status: 'pending',
          subtotal: orderData.subtotal,
          deliveryFee: orderData.deliveryFee || 0,
          taxAmount: orderData.taxAmount || 0,
          totalAmount: orderData.total,
          paymentMethod: orderData.paymentMethod || 'cash',
          paymentStatus: 'pending',
          deliveryProviderId: await this.getOrCreateProvider('careem'),
        },
      });

      // 7. Create order items
      for (const item of orderData.items) {
        // Try to find matching product by external ID, or use placeholder
        let productId: string;
        if (item.productId) {
          const product = await this.prisma.menuProduct.findFirst({
            where: {
              OR: [
                { id: item.productId },
                { externalIds: { path: ['careem'], equals: item.productId } },
              ],
            },
          });
          productId = product?.id || await this.getOrCreatePlaceholderProduct(orderData.branchId);
        } else {
          productId = await this.getOrCreatePlaceholderProduct(orderData.branchId);
        }

        await this.prisma.orderItem.create({
          data: {
            orderId: order.id,
            productId: productId,
            productName: { en: item.name },
            quantity: item.quantity,
            unitPrice: item.price,
            totalPrice: item.total,
            modifiers: item.modifiers || [],
          },
        });
      }

      // 8. Get branch company ID for provider log
      const branch = await this.prisma.branch.findUnique({
        where: { id: orderData.branchId },
        select: { companyId: true },
      });

      // 9. Log provider order
      await this.prisma.providerOrderLog.create({
        data: {
          orderId: order.id,
          providerId: await this.getOrCreateProvider('careem'),
          branchId: orderData.branchId,
          companyId: branch?.companyId || await this.getDefaultCompanyId(),
          externalOrderId: payload.id?.toString() || '',
          providerStatus: payload.status || 'received',
        },
      });

      // 10. Update webhook to completed
      const processingTime = Date.now() - startTime;
      await this.updateWebhookStatus(webhookLog.id, 'completed', null, order.id, processingTime);

      this.logger.log(`Successfully processed Careem order ${order.orderNumber} in ${processingTime}ms`);

      return {
        success: true,
        orderId: order.id,
        orderNumber: order.orderNumber,
        message: 'Order received and processed successfully',
      };

    } catch (error) {
      this.logger.error(`Error processing Careem webhook: ${error.message}`, error.stack);

      // Log error
      if (error['webhookLogId']) {
        await this.updateWebhookStatus(error['webhookLogId'], 'failed', error.message);
      }

      throw new HttpException(
        {
          success: false,
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Validate HMAC-SHA256 signature
   */
  private validateSignature(payload: any, signature: string, secret: string): boolean {
    const payloadString = JSON.stringify(payload);
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(payloadString);
    const calculatedSignature = hmac.digest('hex');

    // Timing-safe comparison
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(calculatedSignature),
    );
  }

  /**
   * Transform Careem payload to internal order format
   */
  private transformCareemPayload(payload: any) {
    return {
      branchId: payload.branch?.id || '',
      companyId: '', // Will be populated from branch lookup
      customer: {
        name: payload.customer?.name || 'Unknown',
        phone: payload.customer?.phone || payload.customer?.phone_number || '',
        email: payload.customer?.email || null,
      },
      deliveryAddress: this.formatAddress(payload.delivery_address || payload.address),
      items: (payload.items || []).map((item: any) => ({
        productId: item.id,
        name: item.name || 'Unknown Item',
        quantity: item.quantity || 1,
        price: parseFloat(item.item_price || item.price || 0),
        total: parseFloat(item.total_price || item.total || 0),
        modifiers: item.modifiers || [],
      })),
      subtotal: parseFloat(payload.subtotal || payload.sub_total || 0),
      deliveryFee: parseFloat(payload.delivery_fee || 0),
      taxAmount: parseFloat(payload.tax || payload.tax_amount || 0),
      total: parseFloat(payload.total || payload.total_amount || 0),
      paymentMethod: payload.payment_method || 'cash',
    };
  }

  /**
   * Format delivery address
   */
  private formatAddress(address: any): string {
    if (!address) return '';

    const parts = [
      address.street,
      address.building,
      address.floor,
      address.apartment,
      address.area,
      address.city,
    ].filter(Boolean);

    return parts.join(', ');
  }

  /**
   * Find or create customer
   */
  private async findOrCreateCustomer(customerData: any) {
    let customer = await this.prisma.customer.findFirst({
      where: {
        phone: customerData.phone,
      },
    });

    if (!customer) {
      customer = await this.prisma.customer.create({
        data: {
          companyId: await this.getDefaultCompanyId(),
          name: customerData.name,
          phone: customerData.phone,
          email: customerData.email,
        },
      });
    }

    return customer;
  }

  /**
   * Get or create delivery provider
   */
  private async getOrCreateProvider(code: string): Promise<string> {
    let provider = await this.prisma.deliveryProvider.findUnique({
      where: { code },
    });

    if (!provider) {
      provider = await this.prisma.deliveryProvider.create({
        data: {
          code,
          name: code.charAt(0).toUpperCase() + code.slice(1),
          isActive: true,
        },
      });
    }

    return provider.id;
  }

  /**
   * Get default company ID (first company in database)
   */
  private async getDefaultCompanyId(): Promise<string> {
    const company = await this.prisma.company.findFirst();
    return company?.id || '';
  }

  /**
   * Get or create placeholder product for unknown delivery provider items
   */
  private async getOrCreatePlaceholderProduct(branchId: string): Promise<string> {
    // Try to find existing placeholder product
    let placeholder = await this.prisma.menuProduct.findFirst({
      where: {
        name: { path: ['en'], equals: 'Unknown Item (Delivery Provider)' },
        branchId: branchId,
      },
    });

    if (!placeholder) {
      // Get branch to find company and category
      const branch = await this.prisma.branch.findUnique({
        where: { id: branchId },
        include: {
          company: true,
        },
      });

      if (!branch) {
        throw new Error(`Branch ${branchId} not found`);
      }

      // Find or create "Other" category
      let category = await this.prisma.menuCategory.findFirst({
        where: {
          name: { path: ['en'], equals: 'Other' },
          companyId: branch.companyId,
        },
      });

      if (!category) {
        category = await this.prisma.menuCategory.create({
          data: {
            companyId: branch.companyId,
            name: { en: 'Other', ar: 'أخرى' },
            displayNumber: 999,
            isActive: true,
          },
        });
      }

      // Create placeholder product
      placeholder = await this.prisma.menuProduct.create({
        data: {
          companyId: branch.companyId,
          branchId: branchId,
          categoryId: category.id,
          name: { en: 'Unknown Item (Delivery Provider)', ar: 'عنصر غير معروف (من مزود التوصيل)' },
          description: { en: 'Placeholder for items from delivery providers that are not in menu', ar: 'بديل للعناصر من مزودي التوصيل غير الموجودة في القائمة' },
          basePrice: 0,
          status: 0, // Inactive status
        },
      });
    }

    return placeholder.id;
  }

  /**
   * Update webhook log status
   */
  private async updateWebhookStatus(
    id: string,
    status: 'received' | 'pending' | 'processing' | 'completed' | 'failed',
    errorMessage?: string,
    orderId?: string,
    processingTime?: number,
  ) {
    return this.prisma.webhookLog.update({
      where: { id },
      data: {
        status,
        errorMessage,
        internalOrderId: orderId,
        processedAt: status === 'completed' || status === 'failed' ? new Date() : undefined,
      },
    });
  }
}
