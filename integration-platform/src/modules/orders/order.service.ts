import { Injectable, Logger, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../shared/services/prisma.service';
import { OrderStateMachine } from './order-state.machine';
import { CreateOrderDto } from './dto/create-order.simple.dto';
import { UpdateOrderDto } from './dto/update-order.simple.dto';
import { OrderFiltersDto } from './dto/order-filters.simple.dto';
import { OrderStatusUpdateDto, BulkStatusUpdateDto } from './dto/order-status.simple.dto';
import { Order, OrderEvent, OrderStatus, Prisma } from '@prisma/client';

export interface OrderWithEvents extends Order {
  events?: OrderEvent[];
}

export interface PaginatedOrderResponse {
  data: OrderWithEvents[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

export interface OrderAnalytics {
  totalOrders: number;
  ordersByStatus: Record<string, number>;
  ordersByProvider: Record<string, number>;
  totalRevenue: number;
  averageOrderValue: number;
  recentOrders: number;
  completionRate: number;
  averageProcessingTime: number;
}

@Injectable()
export class OrderService {
  private readonly logger = new Logger(OrderService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly stateMachine: OrderStateMachine,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Creates a new order from webhook events or API calls
   */
  async createOrder(createOrderDto: CreateOrderDto): Promise<Order> {
    try {
      this.logger.log(`Creating order: ${createOrderDto.externalOrderId} for provider: ${createOrderDto.provider}`);

      // Check for duplicate external order ID
      const existingOrder = await this.prisma.order.findUnique({
        where: { externalOrderId: createOrderDto.externalOrderId },
      });

      if (existingOrder) {
        throw new ConflictException(`Order with external ID ${createOrderDto.externalOrderId} already exists`);
      }

      // Validate order data
      this.validateOrderData(createOrderDto);

      // Create order with initial state
      const order = await this.prisma.order.create({
        data: {
          ...createOrderDto,
          status: this.stateMachine.getInitialState(),
          deliveryAddress: createOrderDto.deliveryAddress as any || undefined,
          items: createOrderDto.items as any || [],
          metadata: createOrderDto.metadata as any || {},
        },
      });

      // Create initial order event
      await this.createOrderEvent(order.id, 'ORDER_CREATED', OrderStatus.PENDING, {
        source: 'order_service',
        externalOrderId: order.externalOrderId,
        provider: order.provider,
      });

      // Emit order created event
      this.eventEmitter.emit('order.created', order);

      this.logger.log(`Order created successfully: ${order.id}`);
      return order;

    } catch (error) {
      this.logger.error(`Failed to create order: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Retrieves order by ID with optional events
   */
  async getOrderById(id: string, includeEvents = false): Promise<OrderWithEvents> {
    try {
      const order = await this.prisma.order.findUnique({
        where: { id },
        include: {
          events: includeEvents ? {
            orderBy: { createdAt: 'desc' },
            take: 50, // Limit events to prevent large payloads
          } : false,
        },
      });

      if (!order) {
        throw new NotFoundException(`Order with ID ${id} not found`);
      }

      return order;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Failed to get order by ID: ${error.message}`, error.stack);
      throw new BadRequestException('Failed to retrieve order');
    }
  }

  /**
   * Retrieves order by external ID
   */
  async getOrderByExternalId(externalOrderId: string, includeEvents = false): Promise<OrderWithEvents> {
    try {
      const order = await this.prisma.order.findUnique({
        where: { externalOrderId },
        include: {
          events: includeEvents ? {
            orderBy: { createdAt: 'desc' },
            take: 50,
          } : false,
        },
      });

      if (!order) {
        throw new NotFoundException(`Order with external ID ${externalOrderId} not found`);
      }

      return order;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Failed to get order by external ID: ${error.message}`, error.stack);
      throw new BadRequestException('Failed to retrieve order');
    }
  }

  /**
   * Updates order with validation and state machine checks
   */
  async updateOrder(id: string, updateOrderDto: UpdateOrderDto): Promise<Order> {
    try {
      const existingOrder = await this.getOrderById(id);

      // If status is being updated, validate transition
      if (updateOrderDto.status && updateOrderDto.status !== existingOrder.status) {
        this.stateMachine.validateTransition(existingOrder.status, updateOrderDto.status);
      }

      const updatedOrder = await this.prisma.order.update({
        where: { id },
        data: {
          ...updateOrderDto,
          deliveryAddress: updateOrderDto.deliveryAddress as any || undefined,
          items: updateOrderDto.items as any || undefined,
          metadata: updateOrderDto.metadata as any || undefined,
        },
      });

      // Create event for status change
      if (updateOrderDto.status && updateOrderDto.status !== existingOrder.status) {
        await this.createOrderEvent(id, 'STATUS_CHANGED', updateOrderDto.status, {
          previousStatus: existingOrder.status,
          newStatus: updateOrderDto.status,
          updatedFields: Object.keys(updateOrderDto),
        });

        // Emit status change event
        this.eventEmitter.emit('order.status_changed', {
          order: updatedOrder,
          previousStatus: existingOrder.status,
          newStatus: updateOrderDto.status,
        });
      }

      this.logger.log(`Order updated: ${id}`);
      return updatedOrder;

    } catch (error) {
      this.logger.error(`Failed to update order: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Updates order status with state machine validation
   */
  async updateOrderStatus(id: string, statusUpdateDto: OrderStatusUpdateDto): Promise<Order> {
    try {
      const existingOrder = await this.getOrderById(id);

      // Validate state transition
      this.stateMachine.validateTransition(existingOrder.status, statusUpdateDto.status);

      const updatedOrder = await this.prisma.order.update({
        where: { id },
        data: { status: statusUpdateDto.status },
      });

      // Create order event
      await this.createOrderEvent(
        id,
        statusUpdateDto.eventType || 'STATUS_CHANGED',
        statusUpdateDto.status,
        {
          previousStatus: existingOrder.status,
          newStatus: statusUpdateDto.status,
          notes: statusUpdateDto.notes,
          ...statusUpdateDto.eventData,
        }
      );

      // Emit status change event
      this.eventEmitter.emit('order.status_changed', {
        order: updatedOrder,
        previousStatus: existingOrder.status,
        newStatus: statusUpdateDto.status,
      });

      this.logger.log(`Order status updated: ${id} -> ${statusUpdateDto.status}`);
      return updatedOrder;

    } catch (error) {
      this.logger.error(`Failed to update order status: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Bulk status update for multiple orders
   */
  async bulkUpdateStatus(bulkUpdateDto: BulkStatusUpdateDto): Promise<{ updated: number; failed: string[] }> {
    const results = { updated: 0, failed: [] as string[] };

    for (const orderId of bulkUpdateDto.orderIds) {
      try {
        await this.updateOrderStatus(orderId, {
          status: bulkUpdateDto.status,
          eventType: bulkUpdateDto.eventType || 'BULK_STATUS_CHANGE',
          notes: bulkUpdateDto.notes,
        });
        results.updated++;
      } catch (error) {
        this.logger.warn(`Failed to update order ${orderId}: ${error.message}`);
        results.failed.push(orderId);
      }
    }

    this.logger.log(`Bulk update completed: ${results.updated} updated, ${results.failed.length} failed`);
    return results;
  }

  /**
   * Advanced order search with filters and pagination
   */
  async searchOrders(filters: OrderFiltersDto): Promise<PaginatedOrderResponse> {
    try {
      const { page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'desc', includeEvents = false, ...searchFilters } = filters;

      // Build where clause
      const where: Prisma.OrderWhereInput = this.buildWhereClause(searchFilters);

      // Build order clause
      const orderBy: Prisma.OrderOrderByWithRelationInput = {
        [sortBy]: sortOrder,
      };

      // Get total count
      const total = await this.prisma.order.count({ where });

      // Get orders
      const orders = await this.prisma.order.findMany({
        where,
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
        include: {
          events: includeEvents ? {
            orderBy: { createdAt: 'desc' },
            take: 10, // Limit events per order in list view
          } : false,
        },
      });

      const totalPages = Math.ceil(total / limit);

      return {
        data: orders,
        meta: {
          total,
          page,
          limit,
          totalPages,
          hasNextPage: page < totalPages,
          hasPreviousPage: page > 1,
        },
      };

    } catch (error) {
      this.logger.error(`Failed to search orders: ${error.message}`, error.stack);
      throw new BadRequestException('Failed to search orders');
    }
  }

  /**
   * Gets order analytics and statistics
   */
  async getOrderAnalytics(clientId?: string, dateRange?: { start: Date; end: Date }): Promise<OrderAnalytics> {
    try {
      const where: Prisma.OrderWhereInput = {};

      if (clientId) {
        where.clientId = clientId;
      }

      if (dateRange) {
        where.createdAt = {
          gte: dateRange.start,
          lte: dateRange.end,
        };
      }

      // Get basic counts
      const [totalOrders, ordersByStatus, ordersByProvider, revenueData] = await Promise.all([
        this.prisma.order.count({ where }),
        this.prisma.order.groupBy({
          by: ['status'],
          where,
          _count: { id: true },
        }),
        this.prisma.order.groupBy({
          by: ['provider'],
          where,
          _count: { id: true },
        }),
        this.prisma.order.aggregate({
          where,
          _sum: { totalAmount: true },
          _avg: { totalAmount: true },
        }),
      ]);

      // Calculate completion rate
      const completedOrders = ordersByStatus.find(s => s.status === OrderStatus.DELIVERED)?._count.id || 0;
      const completionRate = totalOrders > 0 ? (completedOrders / totalOrders) * 100 : 0;

      // Get recent orders (last 24 hours)
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const recentOrders = await this.prisma.order.count({
        where: {
          ...where,
          createdAt: { gte: yesterday },
        },
      });

      return {
        totalOrders,
        ordersByStatus: Object.fromEntries(
          ordersByStatus.map(item => [item.status, item._count.id])
        ),
        ordersByProvider: Object.fromEntries(
          ordersByProvider.map(item => [item.provider, item._count.id])
        ),
        totalRevenue: revenueData._sum.totalAmount || 0,
        averageOrderValue: revenueData._avg.totalAmount || 0,
        recentOrders,
        completionRate,
        averageProcessingTime: 0, // TODO: Calculate from events
      };

    } catch (error) {
      this.logger.error(`Failed to get order analytics: ${error.message}`, error.stack);
      throw new BadRequestException('Failed to retrieve analytics');
    }
  }

  /**
   * Creates an order event for tracking
   */
  private async createOrderEvent(
    orderId: string,
    eventType: string,
    status?: string,
    data?: Record<string, any>
  ): Promise<OrderEvent> {
    return this.prisma.orderEvent.create({
      data: {
        orderId,
        eventType,
        status: status || undefined,
        data: data || {},
      },
    });
  }

  /**
   * Validates order data before creation
   */
  private validateOrderData(orderData: CreateOrderDto): void {
    // Validate items array
    if (!orderData.items || orderData.items.length === 0) {
      throw new BadRequestException('Order must contain at least one item');
    }

    // Validate total amount matches items
    const calculatedTotal = orderData.items.reduce(
      (sum, item) => sum + (item.unitPrice * item.quantity),
      0
    );

    // Allow small tolerance for rounding differences
    const tolerance = 0.01;
    if (Math.abs(calculatedTotal - orderData.totalAmount) > tolerance) {
      this.logger.warn(
        `Total amount mismatch: calculated ${calculatedTotal}, provided ${orderData.totalAmount}`
      );
    }

    // Validate required customer information
    if (!orderData.customerName && !orderData.customerPhone && !orderData.customerEmail) {
      throw new BadRequestException('At least one customer contact method is required');
    }
  }

  /**
   * Builds Prisma where clause from filters
   */
  private buildWhereClause(filters: Partial<OrderFiltersDto>): Prisma.OrderWhereInput {
    const where: Prisma.OrderWhereInput = {};

    // Simple equality filters
    if (filters.provider) where.provider = filters.provider;
    if (filters.status) where.status = filters.status;
    if (filters.paymentStatus) where.paymentStatus = filters.paymentStatus;
    if (filters.clientId) where.clientId = filters.clientId;
    if (filters.customerPhone) where.customerPhone = filters.customerPhone;
    if (filters.customerEmail) where.customerEmail = filters.customerEmail;
    if (filters.externalOrderId) where.externalOrderId = { contains: filters.externalOrderId, mode: 'insensitive' };

    // Customer name search
    if (filters.customerName) {
      where.customerName = { contains: filters.customerName, mode: 'insensitive' };
    }

    // Amount range filters
    if (filters.minAmount || filters.maxAmount) {
      where.totalAmount = {};
      if (filters.minAmount) where.totalAmount.gte = filters.minAmount;
      if (filters.maxAmount) where.totalAmount.lte = filters.maxAmount;
    }

    // Date range filters
    if (filters.createdAfter || filters.createdBefore) {
      where.createdAt = {};
      if (filters.createdAfter) where.createdAt.gte = new Date(filters.createdAfter);
      if (filters.createdBefore) where.createdAt.lte = new Date(filters.createdBefore);
    }

    // Delivery date filters
    if (filters.deliveryAfter || filters.deliveryBefore) {
      where.estimatedDeliveryTime = {};
      if (filters.deliveryAfter) where.estimatedDeliveryTime.gte = new Date(filters.deliveryAfter);
      if (filters.deliveryBefore) where.estimatedDeliveryTime.lte = new Date(filters.deliveryBefore);
    }

    // General text search
    if (filters.search) {
      where.OR = [
        { customerName: { contains: filters.search, mode: 'insensitive' } },
        { customerPhone: { contains: filters.search, mode: 'insensitive' } },
        { notes: { contains: filters.search, mode: 'insensitive' } },
        { externalOrderId: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    return where;
  }

  /**
   * Deletes an order (soft delete)
   */
  async deleteOrder(id: string): Promise<void> {
    try {
      const order = await this.getOrderById(id);

      // Only allow deletion of non-final states or failed orders
      if (this.stateMachine.isFinalState(order.status) && order.status !== OrderStatus.FAILED) {
        throw new BadRequestException('Cannot delete completed or delivered orders');
      }

      await this.prisma.order.delete({
        where: { id },
      });

      this.eventEmitter.emit('order.deleted', { orderId: id, order });
      this.logger.log(`Order deleted: ${id}`);

    } catch (error) {
      this.logger.error(`Failed to delete order: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Gets order state machine information
   */
  getStateMachineInfo() {
    return this.stateMachine.getStateMachineInfo();
  }

  /**
   * Gets valid next states for an order
   */
  async getOrderNextStates(id: string): Promise<{
    currentStatus: OrderStatus;
    nextStates: OrderStatus[];
    validEvents: string[];
    suggestedAction: string;
  }> {
    const order = await this.getOrderById(id);

    return {
      currentStatus: order.status,
      nextStates: this.stateMachine.getNextStates(order.status),
      validEvents: this.stateMachine.getValidEvents(order.status),
      suggestedAction: this.stateMachine.getSuggestedAction(order.status),
    };
  }
}