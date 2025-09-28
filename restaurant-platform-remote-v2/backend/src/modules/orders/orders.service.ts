import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { BaseService, BaseUser } from '../../common/services/base.service';
import { CreateOrderDto, UpdateOrderDto, UpdateOrderStatusDto, OrderFiltersDto, OrderStatsFiltersDto, OrderStatus, PaymentStatus } from './dto';

interface OrderEntity {
  id: string;
  companyId?: string;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date | null;
}

@Injectable()
export class OrdersService extends BaseService<OrderEntity> {
  private readonly logger = new Logger(OrdersService.name);

  constructor(protected prisma: PrismaService) {
    super(prisma, 'order');
  }

  /**
   * Create a new order with order items
   */
  async create(createOrderDto: CreateOrderDto, currentUser: BaseUser) {
    try {
      // Get branch to validate and get company ID
      const branch = await this.prisma.branch.findUnique({
        where: { id: createOrderDto.branchId },
        select: { id: true, companyId: true }
      });

      if (!branch) {
        throw new BadRequestException('Branch not found');
      }

      // Validate company access
      if (currentUser.role !== 'super_admin' && currentUser.companyId !== branch.companyId) {
        throw new BadRequestException('Access denied to this branch');
      }

      // Generate unique order number
      const orderNumber = await this.generateOrderNumber(branch.companyId);

      // Calculate totals from order items
      const { calculatedSubtotal, calculatedTotal } = await this.calculateOrderTotals(
        createOrderDto.orderItems,
        createOrderDto.deliveryFee || 0,
        createOrderDto.taxAmount || 0
      );

      // Validate provided totals match calculated totals
      if (Math.abs(Number(createOrderDto.subtotal) - calculatedSubtotal) > 0.01) {
        throw new BadRequestException('Provided subtotal does not match calculated subtotal');
      }

      if (Math.abs(Number(createOrderDto.totalAmount) - calculatedTotal) > 0.01) {
        throw new BadRequestException('Provided total amount does not match calculated total');
      }

      // Create order with items in a transaction
      const order = await this.prisma.$transaction(async (prisma) => {
        // Create the order
        const newOrder = await prisma.order.create({
          data: {
            orderNumber,
            branchId: createOrderDto.branchId,
            deliveryZoneId: createOrderDto.deliveryZoneId,
            deliveryProviderId: createOrderDto.deliveryProviderId,
            customerName: createOrderDto.customerName,
            customerPhone: createOrderDto.customerPhone,
            customerEmail: createOrderDto.customerEmail,
            deliveryAddress: createOrderDto.deliveryAddress,
            deliveryLat: createOrderDto.deliveryLat,
            deliveryLng: createOrderDto.deliveryLng,
            orderType: createOrderDto.orderType,
            subtotal: createOrderDto.subtotal,
            deliveryFee: createOrderDto.deliveryFee || 0,
            taxAmount: createOrderDto.taxAmount || 0,
            totalAmount: createOrderDto.totalAmount,
            paymentMethod: createOrderDto.paymentMethod,
            estimatedDeliveryTime: createOrderDto.estimatedDeliveryTime ? new Date(createOrderDto.estimatedDeliveryTime) : null,
            providerOrderId: createOrderDto.providerOrderId,
            providerTrackingUrl: createOrderDto.providerTrackingUrl,
            driverInfo: createOrderDto.driverInfo,
            notes: createOrderDto.notes,
          },
        });

        // Create order items
        const orderItems = await Promise.all(
          createOrderDto.orderItems.map(async (item) => {
            // Validate product exists and get product name
            const product = await prisma.menuProduct.findUnique({
              where: { id: item.productId },
              select: { id: true, name: true, basePrice: true, status: true },
            });

            if (!product) {
              throw new BadRequestException(`Product with ID ${item.productId} not found`);
            }

            if (product.status !== 1) {
              throw new BadRequestException(`Product ${(product.name as any).en || 'Unknown'} is not available`);
            }

            const totalPrice = Number(item.unitPrice) * item.quantity;

            return prisma.orderItem.create({
              data: {
                orderId: newOrder.id,
                productId: item.productId,
                productName: product.name,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                totalPrice,
                modifiers: item.modifiers,
                specialRequests: item.specialRequests,
              },
            });
          })
        );

        return { ...newOrder, orderItems };
      });

      this.logger.log(`Order ${order.orderNumber} created successfully for branch ${createOrderDto.branchId}`);
      
      return this.findOne(order.id, currentUser);
    } catch (error) {
      this.logger.error(`Failed to create order: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Get paginated orders with filters
   */
  async findAll(filters: OrderFiltersDto, currentUser: BaseUser) {
    try {
      const { page, limit, sortBy, sortOrder, ...filterOptions } = filters;
      const { skip, take } = this.buildPaginationParams(page, limit);

      // Build where clause
      const where = this.buildOrderWhereClause(filterOptions, currentUser);

      // Build sort options
      const orderBy = this.buildOrderSortClause(sortBy, sortOrder);

      const [orders, totalCount] = await Promise.all([
        this.prisma.order.findMany({
          where,
          include: {
            branch: {
              select: { id: true, name: true, companyId: true }
            },
            deliveryZone: {
              select: { id: true, zoneName: true }
            },
            deliveryProvider: {
              select: { id: true, name: true }
            },
            orderItems: {
              include: {
                product: {
                  select: { id: true, name: true, image: true }
                }
              }
            }
          },
          orderBy,
          skip,
          take,
        }),
        this.prisma.order.count({ where }),
      ]);

      const totalPages = Math.ceil(totalCount / take);

      return {
        data: orders,
        pagination: {
          page: Number(page),
          limit: take,
          totalCount,
          totalPages,
          hasNextPage: page < totalPages,
          hasPreviousPage: page > 1,
        },
      };
    } catch (error) {
      this.logger.error(`Failed to fetch orders: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Get single order by ID
   */
  async findOne(id: string, currentUser: BaseUser) {
    try {
      const where = this.buildBaseWhereClause(currentUser, { id });

      const order = await this.prisma.order.findFirst({
        where,
        include: {
          branch: {
            select: { id: true, name: true, companyId: true }
          },
          deliveryZone: {
            select: { id: true, zoneName: true, deliveryFee: true }
          },
          deliveryProvider: {
            select: { id: true, name: true }
          },
          orderItems: {
            include: {
              product: {
                select: { id: true, name: true, image: true, basePrice: true }
              }
            },
            orderBy: { createdAt: 'asc' }
          }
        },
      });

      if (!order) {
        this.throwNotFound('Order', id);
      }

      return order;
    } catch (error) {
      this.logger.error(`Failed to fetch order ${id}: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Update order
   */
  async update(id: string, updateOrderDto: UpdateOrderDto, currentUser: BaseUser) {
    try {
      // Check if order exists and user has access
      await this.findOne(id, currentUser);

      // Extract fields that cannot be updated via relation
      const { branchId, orderItems, ...updateData } = updateOrderDto;
      
      const updatedOrder = await this.prisma.order.update({
        where: { id },
        data: {
          ...updateData,
          estimatedDeliveryTime: updateOrderDto.estimatedDeliveryTime ? new Date(updateOrderDto.estimatedDeliveryTime) : undefined,
          actualDeliveryTime: updateOrderDto.actualDeliveryTime ? new Date(updateOrderDto.actualDeliveryTime) : undefined,
          deliveredAt: updateOrderDto.deliveredAt ? new Date(updateOrderDto.deliveredAt) : undefined,
          cancelledAt: updateOrderDto.cancelledAt ? new Date(updateOrderDto.cancelledAt) : undefined,
        },
      });

      this.logger.log(`Order ${id} updated successfully`);
      
      return this.findOne(id, currentUser);
    } catch (error) {
      this.logger.error(`Failed to update order ${id}: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Update order status
   */
  async updateStatus(id: string, updateStatusDto: UpdateOrderStatusDto, currentUser: BaseUser) {
    try {
      // Check if order exists and user has access
      const existingOrder = await this.findOne(id, currentUser);

      const updateData: any = {
        status: updateStatusDto.status,
        notes: updateStatusDto.notes,
        driverInfo: updateStatusDto.driverInfo,
        estimatedDeliveryTime: updateStatusDto.estimatedDeliveryTime ? new Date(updateStatusDto.estimatedDeliveryTime) : undefined,
      };

      // Set timestamps based on status
      const now = new Date();
      switch (updateStatusDto.status) {
        case OrderStatus.delivered:
          updateData.deliveredAt = now;
          updateData.actualDeliveryTime = now;
          updateData.paymentStatus = PaymentStatus.paid;
          break;
        case OrderStatus.cancelled:
          updateData.cancelledAt = now;
          break;
      }

      const updatedOrder = await this.prisma.order.update({
        where: { id },
        data: updateData,
      });

      this.logger.log(`Order ${id} status updated to ${updateStatusDto.status}`);
      
      return this.findOne(id, currentUser);
    } catch (error) {
      this.logger.error(`Failed to update order status ${id}: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Cancel order
   */
  async cancel(id: string, cancellationReason: string, currentUser: BaseUser) {
    try {
      const order = await this.findOne(id, currentUser);

      if (['delivered', 'cancelled', 'refunded'].includes(order.status)) {
        throw new BadRequestException(`Cannot cancel order with status: ${order.status}`);
      }

      const updatedOrder = await this.prisma.order.update({
        where: { id },
        data: {
          status: OrderStatus.cancelled,
          cancelledAt: new Date(),
          cancellationReason,
        },
      });

      this.logger.log(`Order ${id} cancelled: ${cancellationReason}`);
      
      return this.findOne(id, currentUser);
    } catch (error) {
      this.logger.error(`Failed to cancel order ${id}: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Get order statistics
   */
  async getStats(filters: OrderStatsFiltersDto, currentUser: BaseUser) {
    try {
      const where = this.buildStatsWhereClause(filters, currentUser);

      const [
        totalOrders,
        totalRevenue,
        averageOrderValue,
        statusBreakdown,
        paymentMethodBreakdown,
        orderTypeBreakdown,
      ] = await Promise.all([
        this.prisma.order.count({ where }),
        this.prisma.order.aggregate({
          where,
          _sum: { totalAmount: true },
        }),
        this.prisma.order.aggregate({
          where,
          _avg: { totalAmount: true },
        }),
        this.prisma.order.groupBy({
          by: ['status'],
          where,
          _count: { id: true },
        }),
        this.prisma.order.groupBy({
          by: ['paymentMethod'],
          where,
          _count: { id: true },
        }),
        this.prisma.order.groupBy({
          by: ['orderType'],
          where,
          _count: { id: true },
        }),
      ]);

      return {
        totalOrders,
        totalRevenue: totalRevenue._sum.totalAmount || 0,
        averageOrderValue: averageOrderValue._avg.totalAmount || 0,
        statusBreakdown: statusBreakdown.reduce((acc, item) => {
          acc[item.status] = item._count.id;
          return acc;
        }, {}),
        paymentMethodBreakdown: paymentMethodBreakdown.reduce((acc, item) => {
          acc[item.paymentMethod] = item._count.id;
          return acc;
        }, {}),
        orderTypeBreakdown: orderTypeBreakdown.reduce((acc, item) => {
          acc[item.orderType] = item._count.id;
          return acc;
        }, {}),
      };
    } catch (error) {
      this.logger.error(`Failed to get order stats: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Get live orders (orders that are active/in-progress)
   */
  async getLiveOrders(branchId?: string, currentUser?: BaseUser) {
    try {
      const where = this.buildBaseWhereClause(currentUser, {
        status: {
          in: [OrderStatus.pending, OrderStatus.confirmed, OrderStatus.preparing, OrderStatus.ready_for_pickup, OrderStatus.out_for_delivery]
        },
        ...(branchId && { branchId })
      });

      const orders = await this.prisma.order.findMany({
        where,
        include: {
          branch: {
            select: { id: true, name: true }
          },
          deliveryProvider: {
            select: { id: true, name: true }
          },
          orderItems: {
            include: {
              product: {
                select: { id: true, name: true }
              }
            }
          }
        },
        orderBy: { createdAt: 'asc' }
      });

      return orders;
    } catch (error) {
      this.logger.error(`Failed to get live orders: ${error.message}`, error.stack);
      throw error;
    }
  }

  // Private helper methods
  private async generateOrderNumber(companyId: string): Promise<string> {
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const orderCount = await this.prisma.order.count({
      where: {
        createdAt: {
          gte: todayStart,
          lte: todayEnd,
        },
        branch: {
          companyId,
        },
      },
    });

    return `ORD-${today}-${String(orderCount + 1).padStart(4, '0')}`;
  }

  private async calculateOrderTotals(orderItems: any[], deliveryFee: number, taxAmount: number) {
    const calculatedSubtotal = orderItems.reduce((sum, item) => {
      return sum + (Number(item.unitPrice) * item.quantity);
    }, 0);

    const calculatedTotal = calculatedSubtotal + Number(deliveryFee) + Number(taxAmount);

    return {
      calculatedSubtotal: Math.round(calculatedSubtotal * 100) / 100,
      calculatedTotal: Math.round(calculatedTotal * 100) / 100,
    };
  }

  private buildOrderWhereClause(filters: any, currentUser: BaseUser) {
    const where = this.buildBaseWhereClause(currentUser);

    if (filters.branchId) where.branchId = filters.branchId;
    if (filters.status) where.status = filters.status;
    if (filters.orderType) where.orderType = filters.orderType;
    if (filters.paymentMethod) where.paymentMethod = filters.paymentMethod;
    if (filters.paymentStatus) where.paymentStatus = filters.paymentStatus;
    if (filters.deliveryProviderId) where.deliveryProviderId = filters.deliveryProviderId;
    if (filters.customerPhone) where.customerPhone = { contains: filters.customerPhone };
    if (filters.orderNumber) where.orderNumber = { contains: filters.orderNumber };

    if (filters.startDate || filters.endDate) {
      where.createdAt = {};
      if (filters.startDate) where.createdAt.gte = new Date(filters.startDate);
      if (filters.endDate) where.createdAt.lte = new Date(filters.endDate);
    }

    if (filters.search) {
      where.OR = [
        { customerName: { contains: filters.search, mode: 'insensitive' } },
        { customerPhone: { contains: filters.search } },
        { orderNumber: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    return where;
  }

  private buildOrderSortClause(sortBy: string = 'createdAt', sortOrder: 'asc' | 'desc' = 'desc') {
    const validSortFields = ['createdAt', 'totalAmount', 'estimatedDeliveryTime', 'status'];
    const field = validSortFields.includes(sortBy) ? sortBy : 'createdAt';
    
    return { [field]: sortOrder };
  }

  private buildStatsWhereClause(filters: OrderStatsFiltersDto, currentUser: BaseUser) {
    const where = this.buildBaseWhereClause(currentUser);

    if (filters.branchId) where.branchId = filters.branchId;

    if (filters.startDate || filters.endDate) {
      where.createdAt = {};
      if (filters.startDate) where.createdAt.gte = new Date(filters.startDate);
      if (filters.endDate) where.createdAt.lte = new Date(filters.endDate);
    }

    return where;
  }
}