import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
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
  ApiBearerAuth,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { BaseUser } from '../../../shared/common/services/base.service';
import {
  CreateWebhookDto,
  UpdateWebhookDto,
  WebhookResponseDto,
  WebhookTestDto,
  WebhookDeliveryResponseDto,
} from '../dto/webhook.dto';
import { WebhooksService } from '../services/webhooks.service';

@ApiTags('Integration - Webhooks')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('integration/v1/webhooks')
export class WebhooksController {
  constructor(private readonly webhooksService: WebhooksService) {}

  @Post('register')
  @Roles('company_owner', 'super_admin')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Register webhook endpoint',
    description: 'Create a new webhook subscription for receiving event notifications',
  })
  @ApiResponse({
    status: 201,
    description: 'Webhook registered successfully',
    type: WebhookResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid webhook configuration' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  async register(
    @Body() createDto: CreateWebhookDto,
    @CurrentUser() user: BaseUser,
  ): Promise<WebhookResponseDto> {
    return this.webhooksService.create(createDto, user);
  }

  @Get()
  @Roles('company_owner', 'super_admin', 'branch_manager')
  @ApiOperation({
    summary: 'List webhooks',
    description: 'Get all registered webhooks for the company',
  })
  @ApiQuery({ name: 'status', required: false, enum: ['active', 'inactive', 'failed'] })
  @ApiQuery({ name: 'event', required: false, description: 'Filter by event type' })
  @ApiResponse({
    status: 200,
    description: 'List of webhooks',
    type: [WebhookResponseDto],
  })
  async findAll(
    @Query('status') status?: string,
    @Query('event') event?: string,
    @CurrentUser() user?: BaseUser,
  ): Promise<WebhookResponseDto[]> {
    return this.webhooksService.findAll(user, { status, event });
  }

  @Get(':id')
  @Roles('company_owner', 'super_admin', 'branch_manager')
  @ApiOperation({ summary: 'Get webhook details' })
  @ApiParam({ name: 'id', description: 'Webhook ID' })
  @ApiResponse({
    status: 200,
    description: 'Webhook details',
    type: WebhookResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Webhook not found' })
  async findOne(
    @Param('id') id: string,
    @CurrentUser() user: BaseUser,
  ): Promise<WebhookResponseDto> {
    return this.webhooksService.findOne(id, user);
  }

  @Put(':id')
  @Roles('company_owner', 'super_admin')
  @ApiOperation({
    summary: 'Update webhook',
    description: 'Update webhook configuration',
  })
  @ApiParam({ name: 'id', description: 'Webhook ID' })
  @ApiResponse({
    status: 200,
    description: 'Webhook updated successfully',
    type: WebhookResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Webhook not found' })
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateWebhookDto,
    @CurrentUser() user: BaseUser,
  ): Promise<WebhookResponseDto> {
    return this.webhooksService.update(id, updateDto, user);
  }

  @Delete(':id')
  @Roles('company_owner', 'super_admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete webhook',
    description: 'Remove webhook subscription',
  })
  @ApiParam({ name: 'id', description: 'Webhook ID' })
  @ApiResponse({ status: 204, description: 'Webhook deleted successfully' })
  @ApiResponse({ status: 404, description: 'Webhook not found' })
  async remove(
    @Param('id') id: string,
    @CurrentUser() user: BaseUser,
  ): Promise<void> {
    return this.webhooksService.remove(id, user);
  }

  @Post(':id/test')
  @Roles('company_owner', 'super_admin')
  @ApiOperation({
    summary: 'Test webhook',
    description: 'Send a test event to verify webhook configuration',
  })
  @ApiParam({ name: 'id', description: 'Webhook ID' })
  @ApiResponse({
    status: 200,
    description: 'Test webhook sent',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        statusCode: { type: 'number' },
        response: { type: 'string' },
        latency: { type: 'number', description: 'Response time in ms' },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Webhook not found' })
  async test(
    @Param('id') id: string,
    @Body() testDto: WebhookTestDto,
    @CurrentUser() user: BaseUser,
  ): Promise<any> {
    return this.webhooksService.test(id, testDto, user);
  }

  @Get(':id/deliveries')
  @Roles('company_owner', 'super_admin', 'branch_manager')
  @ApiOperation({
    summary: 'Get webhook deliveries',
    description: 'Retrieve delivery history and logs for a webhook',
  })
  @ApiParam({ name: 'id', description: 'Webhook ID' })
  @ApiQuery({ name: 'status', required: false, enum: ['pending', 'success', 'failed', 'retrying'] })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({
    status: 200,
    description: 'Webhook delivery logs',
    type: [WebhookDeliveryResponseDto],
  })
  async getDeliveries(
    @Param('id') id: string,
    @Query('status') status?: string,
    @Query('limit') limit?: string,
    @CurrentUser() user?: BaseUser,
  ): Promise<WebhookDeliveryResponseDto[]> {
    const limitNum = parseInt(limit) || 50;
    return this.webhooksService.getDeliveries(id, { status, limit: limitNum }, user);
  }
}
