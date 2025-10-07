import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { OrderStateMachine, OrderStatus } from './order-state.machine';

/**
 * Integration Order Service
 *
 * @description Manages orders from external delivery providers
 * Handles order creation, status updates, and state transitions
 */
@Injectable()
export class IntegrationOrderService {
  private readonly logger = new Logger(IntegrationOrderService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
    private readonly stateMachine: OrderStateMachine,
  ) {}

  /**
   * Create order from integration webhook
   */
  async createIntegrationOrder(data: {
    provider: string;
    companyId: string;
    externalOrderId: string;
    orderData: any;
  }) {
    try {
      const order = await this.prisma.integrationOrder.create({
        data: {
          companyId: data.companyId,
          provider: data.provider,
          externalOrderId: data.externalOrderId,
          status: this.stateMachine.getInitialState(),
          orderData: data.orderData,
          metadata: {
            receivedAt: new Date().toISOString(),
            source: 'webhook',
          },
        },
      });

      this.logger.log(
        `Created integration order ${order.id} from ${data.provider}`,
      );

      await this.eventEmitter.emitAsync('integration.order.created', order);

      return order;
    } catch (error) {
      this.logger.error(
        `Failed to create integration order: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Update order status with validation
   */
  async updateOrderStatus(
    orderId: string,
    newStatus: OrderStatus,
    event?: string,
  ) {
    try {
      const order = await this.prisma.integrationOrder.findUnique({
        where: { id: orderId },
      });

      if (!order) {
        throw new NotFoundException(`Order ${orderId} not found`);
      }

      // Validate transition
      this.stateMachine.validateTransition(
        order.status as OrderStatus,
        newStatus,
        event,
      );

      // Update order
      const updated = await this.prisma.integrationOrder.update({
        where: { id: orderId },
        data: {
          status: newStatus,
          statusHistory: {
            push: {
              from: order.status,
              to: newStatus,
              event,
              timestamp: new Date().toISOString(),
            },
          },
        },
      });

      this.logger.log(
        `Updated order ${orderId}: ${order.status} -> ${newStatus}`,
      );

      await this.eventEmitter.emitAsync('integration.order.status_changed', {
        orderId,
        oldStatus: order.status,
        newStatus,
        event,
      });

      return updated;
    } catch (error) {
      this.logger.error(
        `Failed to update order status: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Get order by external ID
   */
  async getOrderByExternalId(provider: string, externalOrderId: string) {
    return this.prisma.integrationOrder.findFirst({
      where: {
        provider,
        externalOrderId,
      },
    });
  }

  /**
   * Get orders for company
   */
  async getOrders(companyId: string, filters?: {
    provider?: string;
    status?: OrderStatus;
    limit?: number;
    offset?: number;
  }) {
    const where: any = { companyId };

    if (filters?.provider) {
      where.provider = filters.provider;
    }

    if (filters?.status) {
      where.status = filters.status;
    }

    const [orders, total] = await Promise.all([
      this.prisma.integrationOrder.findMany({
        where,
        take: filters?.limit || 50,
        skip: filters?.offset || 0,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.integrationOrder.count({ where }),
    ]);

    return {
      orders,
      pagination: {
        total,
        limit: filters?.limit || 50,
        offset: filters?.offset || 0,
      },
    };
  }
}
