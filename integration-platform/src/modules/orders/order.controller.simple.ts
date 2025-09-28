import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Patch,
  Body,
  Param,
  Query,
  HttpStatus,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { OrderService, OrderWithEvents, PaginatedOrderResponse, OrderAnalytics } from './order.service';
import { CreateOrderDto } from './dto/create-order.simple.dto';
import { UpdateOrderDto } from './dto/update-order.simple.dto';
import { OrderFiltersDto } from './dto/order-filters.simple.dto';
import { OrderStatusUpdateDto, BulkStatusUpdateDto } from './dto/order-status.simple.dto';
import { Order, OrderStatus } from '@prisma/client';

@Controller('orders')
export class OrderController {
  private readonly logger = new Logger(OrderController.name);

  constructor(private readonly orderService: OrderService) {}

  @Post()
  async createOrder(@Body() createOrderDto: CreateOrderDto): Promise<Order> {
    this.logger.log(`Creating order: ${createOrderDto.externalOrderId}`);
    return this.orderService.createOrder(createOrderDto);
  }

  @Get()
  async searchOrders(@Query() filters: OrderFiltersDto): Promise<PaginatedOrderResponse> {
    this.logger.log(`Searching orders with filters: ${JSON.stringify(filters)}`);
    return this.orderService.searchOrders(filters);
  }

  @Get('analytics')
  async getOrderAnalytics(
    @Query('clientId') clientId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ): Promise<OrderAnalytics> {
    const dateRange = startDate && endDate ? {
      start: new Date(startDate),
      end: new Date(endDate),
    } : undefined;

    this.logger.log(`Getting analytics for client: ${clientId}, range: ${startDate} - ${endDate}`);
    return this.orderService.getOrderAnalytics(clientId, dateRange);
  }

  @Get('state-machine')
  async getStateMachineInfo() {
    return this.orderService.getStateMachineInfo();
  }

  @Get('external/:externalOrderId')
  async getOrderByExternalId(
    @Param('externalOrderId') externalOrderId: string,
    @Query('includeEvents') includeEvents?: string,
  ): Promise<OrderWithEvents> {
    const includeEventsFlag = includeEvents === 'true';
    this.logger.log(`Getting order by external ID: ${externalOrderId}, includeEvents: ${includeEventsFlag}`);
    return this.orderService.getOrderByExternalId(externalOrderId, includeEventsFlag);
  }

  @Get(':id')
  async getOrderById(
    @Param('id') id: string,
    @Query('includeEvents') includeEvents?: string,
  ): Promise<OrderWithEvents> {
    const includeEventsFlag = includeEvents === 'true';
    this.logger.log(`Getting order by ID: ${id}, includeEvents: ${includeEventsFlag}`);
    return this.orderService.getOrderById(id, includeEventsFlag);
  }

  @Get(':id/next-states')
  async getOrderNextStates(@Param('id') id: string) {
    this.logger.log(`Getting next states for order: ${id}`);
    return this.orderService.getOrderNextStates(id);
  }

  @Put(':id')
  async updateOrder(@Param('id') id: string, @Body() updateOrderDto: UpdateOrderDto): Promise<Order> {
    this.logger.log(`Updating order: ${id}`);
    return this.orderService.updateOrder(id, updateOrderDto);
  }

  @Patch(':id/status')
  async updateOrderStatus(
    @Param('id') id: string,
    @Body() statusUpdateDto: OrderStatusUpdateDto
  ): Promise<Order> {
    this.logger.log(`Updating order status: ${id} -> ${statusUpdateDto.status}`);
    return this.orderService.updateOrderStatus(id, statusUpdateDto);
  }

  @Patch('bulk/status')
  async bulkUpdateStatus(@Body() bulkUpdateDto: BulkStatusUpdateDto): Promise<{ updated: number; failed: string[] }> {
    this.logger.log(`Bulk updating ${bulkUpdateDto.orderIds.length} orders to status: ${bulkUpdateDto.status}`);
    return this.orderService.bulkUpdateStatus(bulkUpdateDto);
  }

  @Delete(':id')
  async deleteOrder(@Param('id') id: string): Promise<void> {
    this.logger.log(`Deleting order: ${id}`);
    return this.orderService.deleteOrder(id);
  }

  @Post('webhook/:provider')
  async processWebhookOrder(
    @Param('provider') provider: string,
    @Body() payload: any,
  ): Promise<Order> {
    this.logger.log(`Processing webhook order from provider: ${provider}`);

    // Transform webhook payload to CreateOrderDto
    const createOrderDto = this.transformWebhookPayload(provider.toUpperCase(), payload);

    return this.orderService.createOrder(createOrderDto);
  }

  @Get('provider/:provider')
  async getOrdersByProvider(
    @Param('provider') provider: string,
    @Query() filters: OrderFiltersDto,
  ): Promise<PaginatedOrderResponse> {
    this.logger.log(`Getting orders for provider: ${provider}`);

    // Add provider filter
    const providerFilters = {
      ...filters,
      provider: provider.toUpperCase() as any,
    };

    return this.orderService.searchOrders(providerFilters);
  }

  @Get('status/:status')
  async getOrdersByStatus(
    @Param('status') status: string,
    @Query() filters: OrderFiltersDto,
  ): Promise<PaginatedOrderResponse> {
    this.logger.log(`Getting orders with status: ${status}`);

    // Validate status
    if (!Object.values(OrderStatus).includes(status as OrderStatus)) {
      throw new BadRequestException(`Invalid order status: ${status}`);
    }

    // Add status filter
    const statusFilters = {
      ...filters,
      status: status as OrderStatus,
    };

    return this.orderService.searchOrders(statusFilters);
  }

  /**
   * Transform webhook payload to CreateOrderDto
   */
  private transformWebhookPayload(provider: string, payload: any): CreateOrderDto {
    const baseTransformation: Partial<CreateOrderDto> = {
      provider: provider as any,
      clientId: payload.clientId || 'default-client',
      externalOrderId: payload.orderId || payload.id || `${provider}-${Date.now()}`,
      customerName: payload.customer?.name || payload.customerName,
      customerPhone: payload.customer?.phone || payload.customerPhone,
      customerEmail: payload.customer?.email || payload.customerEmail,
      totalAmount: payload.total || payload.totalAmount || 0,
      currency: payload.currency || 'USD',
      paymentMethod: payload.paymentMethod,
      notes: payload.notes || payload.specialInstructions,
      items: payload.items || [],
      deliveryAddress: payload.deliveryAddress || payload.address,
      metadata: {
        webhookSource: provider,
        originalPayload: payload,
        processedAt: new Date().toISOString(),
      },
    };

    return baseTransformation as CreateOrderDto;
  }
}