import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  HttpStatus,
  HttpCode,
  ValidationPipe,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../shared/common/guards/jwt-auth.guard';
import { RolesGuard } from '../../shared/common/guards/roles.guard';
import { CompanyGuard } from '../../shared/common/guards/company.guard';
import { Roles } from '../../shared/common/decorators/roles.decorator';
import { CurrentUser } from '../../shared/common/decorators/current-user.decorator';
import { OrdersService } from './orders.service';
import { 
  CreateOrderDto, 
  UpdateOrderDto, 
  UpdateOrderStatusDto, 
  OrderFiltersDto, 
  OrderStatsFiltersDto,
  OrderStatus 
} from './dto';

@ApiTags('Orders')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, CompanyGuard)
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @Roles('super_admin', 'company_owner', 'branch_manager', 'call_center', 'cashier')
  @ApiOperation({ summary: 'Create a new order' })
  @ApiResponse({ status: 201, description: 'Order created successfully' })
  @ApiResponse({ status: 400, description: 'Validation failed' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  async create(
    @Body(ValidationPipe) createOrderDto: CreateOrderDto,
    @CurrentUser() user: any,
  ) {
    const order = await this.ordersService.create(createOrderDto, user);
    
    return {
      success: true,
      message: 'Order created successfully',
      data: order,
    };
  }

  @Get()
  @Roles('super_admin', 'company_owner', 'branch_manager', 'call_center', 'cashier')
  @ApiOperation({ summary: 'Get all orders with pagination and filters' })
  @ApiResponse({ status: 200, description: 'Orders retrieved successfully' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, enum: OrderStatus })
  @ApiQuery({ name: 'branchId', required: false, type: String })
  @ApiQuery({ name: 'search', required: false, type: String })
  async findAll(
    @Query(ValidationPipe) filters: OrderFiltersDto,
    @CurrentUser() user: any,
  ) {
    const result = await this.ordersService.findAll(filters, user);
    
    return {
      success: true,
      message: 'Orders retrieved successfully',
      ...result,
    };
  }

  @Get('live')
  @Roles('super_admin', 'company_owner', 'branch_manager', 'call_center', 'cashier')
  @ApiOperation({ summary: 'Get live orders (active/in-progress orders)' })
  @ApiResponse({ status: 200, description: 'Live orders retrieved successfully' })
  @ApiQuery({ name: 'branchId', required: false, type: String })
  async getLiveOrders(
    @Query('branchId') branchId?: string,
    @CurrentUser() user?: any,
  ) {
    const orders = await this.ordersService.getLiveOrders(branchId, user);
    
    return {
      success: true,
      message: 'Live orders retrieved successfully',
      data: orders,
    };
  }

  @Get('stats')
  @Roles('super_admin', 'company_owner', 'branch_manager')
  @ApiOperation({ summary: 'Get order statistics and analytics' })
  @ApiResponse({ status: 200, description: 'Order statistics retrieved successfully' })
  @ApiQuery({ name: 'branchId', required: false, type: String })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
  async getStats(
    @Query(ValidationPipe) filters: OrderStatsFiltersDto,
    @CurrentUser() user: any,
  ) {
    const stats = await this.ordersService.getStats(filters, user);
    
    return {
      success: true,
      message: 'Order statistics retrieved successfully',
      data: stats,
    };
  }

  @Get(':id')
  @Roles('super_admin', 'company_owner', 'branch_manager', 'call_center', 'cashier')
  @ApiOperation({ summary: 'Get a single order by ID' })
  @ApiResponse({ status: 200, description: 'Order retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: any,
  ) {
    const order = await this.ordersService.findOne(id, user);
    
    return {
      success: true,
      message: 'Order retrieved successfully',
      data: order,
    };
  }

  @Patch(':id')
  @Roles('super_admin', 'company_owner', 'branch_manager', 'call_center')
  @ApiOperation({ summary: 'Update an order' })
  @ApiResponse({ status: 200, description: 'Order updated successfully' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  @ApiResponse({ status: 400, description: 'Validation failed' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(ValidationPipe) updateOrderDto: UpdateOrderDto,
    @CurrentUser() user: any,
  ) {
    const order = await this.ordersService.update(id, updateOrderDto, user);
    
    return {
      success: true,
      message: 'Order updated successfully',
      data: order,
    };
  }

  @Patch(':id/status')
  @Roles('super_admin', 'company_owner', 'branch_manager', 'call_center', 'cashier')
  @ApiOperation({ summary: 'Update order status' })
  @ApiResponse({ status: 200, description: 'Order status updated successfully' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  @ApiResponse({ status: 400, description: 'Invalid status transition' })
  @HttpCode(HttpStatus.OK)
  async updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(ValidationPipe) updateStatusDto: UpdateOrderStatusDto,
    @CurrentUser() user: any,
  ) {
    const order = await this.ordersService.updateStatus(id, updateStatusDto, user);
    
    return {
      success: true,
      message: `Order status updated to ${updateStatusDto.status}`,
      data: order,
    };
  }

  @Post(':id/cancel')
  @Roles('super_admin', 'company_owner', 'branch_manager', 'call_center')
  @ApiOperation({ summary: 'Cancel an order' })
  @ApiResponse({ status: 200, description: 'Order cancelled successfully' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  @ApiResponse({ status: 400, description: 'Cannot cancel this order' })
  @HttpCode(HttpStatus.OK)
  async cancel(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('reason') reason: string,
    @CurrentUser() user: any,
  ) {
    const order = await this.ordersService.cancel(id, reason, user);
    
    return {
      success: true,
      message: 'Order cancelled successfully',
      data: order,
    };
  }

  @Delete(':id')
  @Roles('super_admin', 'company_owner')
  @ApiOperation({ summary: 'Delete an order (soft delete)' })
  @ApiResponse({ status: 200, description: 'Order deleted successfully' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: any,
  ) {
    // For orders, we typically don't delete but cancel instead
    // But keeping this for super admin flexibility
    const order = await this.ordersService.cancel(id, 'Deleted by admin', user);
    
    return {
      success: true,
      message: 'Order deleted successfully',
    };
  }

  // Additional utility endpoints

  @Get('branch/:branchId/summary')
  @Roles('super_admin', 'company_owner', 'branch_manager', 'call_center')
  @ApiOperation({ summary: 'Get order summary for a specific branch' })
  @ApiResponse({ status: 200, description: 'Branch order summary retrieved successfully' })
  async getBranchSummary(
    @Param('branchId', ParseUUIDPipe) branchId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @CurrentUser() user?: any,
  ) {
    const filters: OrderStatsFiltersDto = {
      branchId,
      startDate,
      endDate,
    };
    
    const stats = await this.ordersService.getStats(filters, user);
    
    return {
      success: true,
      message: 'Branch order summary retrieved successfully',
      data: {
        branchId,
        period: { startDate, endDate },
        ...stats,
      },
    };
  }

  @Get('customer/:phone/history')
  @Roles('super_admin', 'company_owner', 'branch_manager', 'call_center')
  @ApiOperation({ summary: 'Get order history for a customer by phone number' })
  @ApiResponse({ status: 200, description: 'Customer order history retrieved successfully' })
  async getCustomerHistory(
    @Param('phone') phone: string,
    @Query(ValidationPipe) filters: OrderFiltersDto,
    @CurrentUser() user: any,
  ) {
    const customerFilters = {
      ...filters,
      customerPhone: phone,
    };
    
    const result = await this.ordersService.findAll(customerFilters, user);
    
    return {
      success: true,
      message: 'Customer order history retrieved successfully',
      data: {
        customerPhone: phone,
        ...result,
      },
    };
  }
}