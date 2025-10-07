import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiSecurity,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { ApiKeyAuthGuard } from '../guards/api-key-auth.guard';
import { ApiKeyScopes } from '../decorators/api-key-scopes.decorator';
import { CurrentApiKey } from '../decorators/current-api-key.decorator';
import {
  CreateIntegrationOrderDto,
  UpdateOrderStatusDto,
  IntegrationOrderResponseDto,
  OrderEventResponseDto,
} from '../dto/integration-order.dto';
import { IntegrationOrdersService } from '../services/integration-orders.service';

@ApiTags('Integration - Orders')
@ApiSecurity('api-key')
@UseGuards(ApiKeyAuthGuard)
@Controller('integration/v1/orders')
export class IntegrationOrdersController {
  constructor(
    private readonly integrationOrdersService: IntegrationOrdersService,
  ) {}

  @Post()
  @ApiKeyScopes('orders:write')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create order via API',
    description: 'Create a new order from external integration (delivery partners, aggregators, etc.)',
  })
  @ApiResponse({
    status: 201,
    description: 'Order created successfully',
    type: IntegrationOrderResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid order data' })
  @ApiResponse({ status: 401, description: 'Invalid or missing API key' })
  @ApiResponse({ status: 403, description: 'Insufficient API key permissions' })
  @ApiResponse({ status: 429, description: 'Rate limit exceeded' })
  async create(
    @Body() createDto: CreateIntegrationOrderDto,
    @CurrentApiKey() apiKey: any,
  ): Promise<IntegrationOrderResponseDto> {
    return this.integrationOrdersService.create(createDto, apiKey);
  }

  @Get(':id')
  @ApiKeyScopes('orders:read')
  @ApiOperation({
    summary: 'Get order status',
    description: 'Retrieve order details and current status',
  })
  @ApiParam({ name: 'id', description: 'Order ID or external order ID' })
  @ApiResponse({
    status: 200,
    description: 'Order details',
    type: IntegrationOrderResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Order not found' })
  async findOne(
    @Param('id') id: string,
    @CurrentApiKey() apiKey: any,
  ): Promise<IntegrationOrderResponseDto> {
    return this.integrationOrdersService.findOne(id, apiKey);
  }

  @Put(':id/status')
  @ApiKeyScopes('orders:write')
  @ApiOperation({
    summary: 'Update order status',
    description: 'Update the status of an existing order',
  })
  @ApiParam({ name: 'id', description: 'Order ID' })
  @ApiResponse({
    status: 200,
    description: 'Order status updated',
    type: IntegrationOrderResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Order not found' })
  @ApiResponse({ status: 400, description: 'Invalid status transition' })
  async updateStatus(
    @Param('id') id: string,
    @Body() updateDto: UpdateOrderStatusDto,
    @CurrentApiKey() apiKey: any,
  ): Promise<IntegrationOrderResponseDto> {
    return this.integrationOrdersService.updateStatus(id, updateDto, apiKey);
  }

  @Get()
  @ApiKeyScopes('orders:read')
  @ApiOperation({
    summary: 'List orders',
    description: 'Get orders with optional filters',
  })
  @ApiQuery({ name: 'branchId', required: false, description: 'Filter by branch' })
  @ApiQuery({ name: 'status', required: false, description: 'Filter by status' })
  @ApiQuery({ name: 'source', required: false, description: 'Filter by source/provider' })
  @ApiQuery({ name: 'startDate', required: false, description: 'Start date (ISO 8601)' })
  @ApiQuery({ name: 'endDate', required: false, description: 'End date (ISO 8601)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({
    status: 200,
    description: 'List of orders',
    type: [IntegrationOrderResponseDto],
  })
  async findAll(
    @Query('branchId') branchId?: string,
    @Query('status') status?: string,
    @Query('source') source?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @CurrentApiKey() apiKey?: any,
  ): Promise<{
    data: IntegrationOrderResponseDto[];
    total: number;
    page: number;
    limit: number;
  }> {
    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 50;

    return this.integrationOrdersService.findAll(
      {
        branchId,
        status,
        source,
        startDate,
        endDate,
        page: pageNum,
        limit: limitNum,
      },
      apiKey,
    );
  }

  @Get(':id/events')
  @ApiKeyScopes('orders:read')
  @ApiOperation({
    summary: 'Get order events',
    description: 'Retrieve event history for an order (status changes, updates, etc.)',
  })
  @ApiParam({ name: 'id', description: 'Order ID' })
  @ApiResponse({
    status: 200,
    description: 'Order event history',
    type: [OrderEventResponseDto],
  })
  @ApiResponse({ status: 404, description: 'Order not found' })
  async getEvents(
    @Param('id') id: string,
    @CurrentApiKey() apiKey: any,
  ): Promise<OrderEventResponseDto[]> {
    return this.integrationOrdersService.getEvents(id, apiKey);
  }
}
