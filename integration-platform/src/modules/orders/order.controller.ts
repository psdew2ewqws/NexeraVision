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
  UseGuards,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
  ApiBody,
} from '@nestjs/swagger';
import { OrderService, OrderWithEvents, PaginatedOrderResponse, OrderAnalytics } from './order.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { OrderFiltersDto } from './dto/order-filters.dto';
import { OrderStatusUpdateDto, BulkStatusUpdateDto } from './dto/order-status.dto';
import { Order, OrderStatus } from '@prisma/client';

@ApiTags('Orders')
@Controller('orders')
export class OrderController {
  private readonly logger = new Logger(OrderController.name);

  constructor(private readonly orderService: OrderService) {}

  @Post()
  @ApiOperation({
    summary: 'Create a new order',
    description: 'Creates a new order from webhook events or API calls with validation and state machine initialization'
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Order created successfully',
    type: 'Order'
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid order data or validation error'
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Order with external ID already exists'
  })
  @ApiBody({ type: CreateOrderDto })
  async createOrder(@Body() createOrderDto: CreateOrderDto): Promise<Order> {
    this.logger.log(`Creating order: ${createOrderDto.externalOrderId}`);
    return this.orderService.createOrder(createOrderDto);
  }

  @Get()
  @ApiOperation({
    summary: 'Search and filter orders',
    description: 'Advanced order search with pagination, filtering, and sorting capabilities'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Orders retrieved successfully'
  })
  @ApiQuery({ type: OrderFiltersDto })
  async searchOrders(@Query() filters: OrderFiltersDto): Promise<PaginatedOrderResponse> {
    this.logger.log(`Searching orders with filters: ${JSON.stringify(filters)}`);
    return this.orderService.searchOrders(filters);
  }

  @Get('analytics')
  @ApiOperation({
    summary: 'Get order analytics',
    description: 'Retrieve comprehensive order analytics including status distribution, revenue metrics, and performance indicators'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Analytics retrieved successfully'
  })
  @ApiQuery({ name: 'clientId', required: false, description: 'Filter analytics by client ID' })
  @ApiQuery({ name: 'startDate', required: false, description: 'Start date for analytics range (ISO format)' })
  @ApiQuery({ name: 'endDate', required: false, description: 'End date for analytics range (ISO format)' })
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
  @ApiOperation({
    summary: 'Get state machine information',
    description: 'Retrieve order state machine configuration including all states, transitions, and rules'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'State machine info retrieved successfully'
  })
  async getStateMachineInfo() {
    return this.orderService.getStateMachineInfo();
  }

  @Get('external/:externalOrderId')
  @ApiOperation({
    summary: 'Get order by external ID',
    description: 'Retrieve order information using the external order ID from the provider'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Order found and retrieved successfully'
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Order not found'
  })
  @ApiParam({ name: 'externalOrderId', description: 'External order ID from provider' })
  @ApiQuery({ name: 'includeEvents', required: false, description: 'Include order events in response' })
  async getOrderByExternalId(
    @Param('externalOrderId') externalOrderId: string,
    @Query('includeEvents') includeEvents?: string,
  ): Promise<OrderWithEvents> {
    const includeEventsFlag = includeEvents === 'true';
    this.logger.log(`Getting order by external ID: ${externalOrderId}, includeEvents: ${includeEventsFlag}`);
    return this.orderService.getOrderByExternalId(externalOrderId, includeEventsFlag);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get order by ID',
    description: 'Retrieve order information by internal order ID with optional events'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Order found and retrieved successfully'
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Order not found'
  })
  @ApiParam({ name: 'id', description: 'Internal order ID' })
  @ApiQuery({ name: 'includeEvents', required: false, description: 'Include order events in response' })
  async getOrderById(
    @Param('id') id: string,
    @Query('includeEvents') includeEvents?: string,
  ): Promise<OrderWithEvents> {
    const includeEventsFlag = includeEvents === 'true';
    this.logger.log(`Getting order by ID: ${id}, includeEvents: ${includeEventsFlag}`);
    return this.orderService.getOrderById(id, includeEventsFlag);
  }

  @Get(':id/next-states')
  @ApiOperation({
    summary: 'Get valid next states for order',
    description: 'Retrieve valid next states, events, and suggested actions for an order based on state machine'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Next states retrieved successfully'
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Order not found'
  })
  @ApiParam({ name: 'id', description: 'Order ID' })
  async getOrderNextStates(@Param('id') id: string) {
    this.logger.log(`Getting next states for order: ${id}`);
    return this.orderService.getOrderNextStates(id);
  }

  @Put(':id')
  @ApiOperation({
    summary: 'Update order',
    description: 'Update order information with validation and state machine compliance'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Order updated successfully'
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Order not found'
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid update data or state transition'
  })
  @ApiParam({ name: 'id', description: 'Order ID' })
  @ApiBody({ type: UpdateOrderDto })
  async updateOrder(@Param('id') id: string, @Body() updateOrderDto: UpdateOrderDto): Promise<Order> {
    this.logger.log(`Updating order: ${id}`);
    return this.orderService.updateOrder(id, updateOrderDto);
  }

  @Patch(':id/status')
  @ApiOperation({
    summary: 'Update order status',
    description: 'Update order status with state machine validation and event tracking'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Order status updated successfully'
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Order not found'
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid status transition'
  })
  @ApiParam({ name: 'id', description: 'Order ID' })
  @ApiBody({ type: OrderStatusUpdateDto })
  async updateOrderStatus(
    @Param('id') id: string,
    @Body() statusUpdateDto: OrderStatusUpdateDto
  ): Promise<Order> {
    this.logger.log(`Updating order status: ${id} -> ${statusUpdateDto.status}`);
    return this.orderService.updateOrderStatus(id, statusUpdateDto);
  }

  @Patch('bulk/status')
  @ApiOperation({
    summary: 'Bulk update order status',
    description: 'Update status for multiple orders in a single operation'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Bulk status update completed',
    schema: {
      type: 'object',
      properties: {
        updated: { type: 'number', description: 'Number of orders updated successfully' },
        failed: { type: 'array', items: { type: 'string' }, description: 'Array of order IDs that failed to update' }
      }
    }
  })
  @ApiBody({ type: BulkStatusUpdateDto })
  async bulkUpdateStatus(@Body() bulkUpdateDto: BulkStatusUpdateDto): Promise<{ updated: number; failed: string[] }> {
    this.logger.log(`Bulk updating ${bulkUpdateDto.orderIds.length} orders to status: ${bulkUpdateDto.status}`);
    return this.orderService.bulkUpdateStatus(bulkUpdateDto);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Delete order',
    description: 'Delete an order (only allowed for non-final states or failed orders)'
  })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Order deleted successfully'
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Order not found'
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Cannot delete completed or delivered orders'
  })
  @ApiParam({ name: 'id', description: 'Order ID' })
  async deleteOrder(@Param('id') id: string): Promise<void> {
    this.logger.log(`Deleting order: ${id}`);
    return this.orderService.deleteOrder(id);
  }

  // Webhook integration endpoints
  @Post('webhook/:provider')
  @ApiOperation({
    summary: 'Process webhook order',
    description: 'Process incoming order from webhook events (Careem, Talabat, etc.)'
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Webhook order processed successfully'
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid webhook payload'
  })
  @ApiParam({ name: 'provider', description: 'Provider name (careem, talabat, deliveroo, jahez)' })
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
  @ApiOperation({
    summary: 'Get orders by provider',
    description: 'Retrieve orders filtered by specific delivery provider'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Provider orders retrieved successfully'
  })
  @ApiParam({ name: 'provider', description: 'Provider name' })
  @ApiQuery({ type: OrderFiltersDto })
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
  @ApiOperation({
    summary: 'Get orders by status',
    description: 'Retrieve orders filtered by specific status'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Status orders retrieved successfully'
  })
  @ApiParam({ name: 'status', description: 'Order status', enum: OrderStatus })
  @ApiQuery({ type: OrderFiltersDto })
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
   * This would be expanded based on each provider's specific format
   */
  private transformWebhookPayload(provider: string, payload: any): CreateOrderDto {
    // This is a basic transformation - should be customized per provider
    // In a real implementation, you'd have specific transformers for each provider

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

    // Provider-specific transformations
    switch (provider) {
      case 'CAREEM':
        return this.transformCareemPayload(payload, baseTransformation);
      case 'TALABAT':
        return this.transformTalabatPayload(payload, baseTransformation);
      case 'DELIVEROO':
        return this.transformDeliverooPayload(payload, baseTransformation);
      case 'JAHEZ':
        return this.transformJahezPayload(payload, baseTransformation);
      default:
        return baseTransformation as CreateOrderDto;
    }
  }

  private transformCareemPayload(payload: any, base: Partial<CreateOrderDto>): CreateOrderDto {
    return {
      ...base,
      externalOrderId: payload.order_id || base.externalOrderId,
      estimatedDeliveryTime: payload.estimated_delivery_time ? new Date(payload.estimated_delivery_time) : undefined,
    } as CreateOrderDto;
  }

  private transformTalabatPayload(payload: any, base: Partial<CreateOrderDto>): CreateOrderDto {
    return {
      ...base,
      externalOrderId: payload.reference || base.externalOrderId,
      paymentStatus: payload.payment_status,
    } as CreateOrderDto;
  }

  private transformDeliverooPayload(payload: any, base: Partial<CreateOrderDto>): CreateOrderDto {
    return {
      ...base,
      externalOrderId: payload.order_number || base.externalOrderId,
    } as CreateOrderDto;
  }

  private transformJahezPayload(payload: any, base: Partial<CreateOrderDto>): CreateOrderDto {
    return {
      ...base,
      externalOrderId: payload.order_reference || base.externalOrderId,
    } as CreateOrderDto;
  }
}