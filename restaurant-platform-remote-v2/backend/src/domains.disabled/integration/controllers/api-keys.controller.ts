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
  CreateApiKeyDto,
  UpdateApiKeyDto,
  ApiKeyResponseDto,
  ApiKeyUsageResponseDto,
} from '../dto/api-key.dto';
import { ApiKeysService } from '../services/api-keys.service';

@ApiTags('Integration - API Keys')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('integration/v1/api-keys')
export class ApiKeysController {
  constructor(private readonly apiKeysService: ApiKeysService) {}

  @Post()
  @Roles('company_owner', 'super_admin')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create new API key',
    description: 'Generate a new API key for integration access. The key is only shown once.',
  })
  @ApiResponse({
    status: 201,
    description: 'API key created successfully',
    type: ApiKeyResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  async create(
    @Body() createDto: CreateApiKeyDto,
    @CurrentUser() user: BaseUser,
  ): Promise<ApiKeyResponseDto> {
    return this.apiKeysService.create(createDto, user);
  }

  @Get()
  @Roles('company_owner', 'super_admin', 'branch_manager')
  @ApiOperation({
    summary: 'List all API keys',
    description: 'Get all API keys for the authenticated company',
  })
  @ApiQuery({ name: 'status', required: false, enum: ['active', 'revoked', 'expired'] })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({
    status: 200,
    description: 'List of API keys',
    type: [ApiKeyResponseDto],
  })
  async findAll(
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @CurrentUser() user?: BaseUser,
  ): Promise<{ data: ApiKeyResponseDto[]; total: number; page: number; limit: number }> {
    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 20;

    return this.apiKeysService.findAll(user, {
      status,
      page: pageNum,
      limit: limitNum,
    });
  }

  @Get(':id')
  @Roles('company_owner', 'super_admin', 'branch_manager')
  @ApiOperation({ summary: 'Get API key details' })
  @ApiParam({ name: 'id', description: 'API key ID' })
  @ApiResponse({
    status: 200,
    description: 'API key details',
    type: ApiKeyResponseDto,
  })
  @ApiResponse({ status: 404, description: 'API key not found' })
  async findOne(
    @Param('id') id: string,
    @CurrentUser() user: BaseUser,
  ): Promise<ApiKeyResponseDto> {
    return this.apiKeysService.findOne(id, user);
  }

  @Put(':id')
  @Roles('company_owner', 'super_admin')
  @ApiOperation({
    summary: 'Update API key',
    description: 'Update API key settings or rotate the key',
  })
  @ApiParam({ name: 'id', description: 'API key ID' })
  @ApiResponse({
    status: 200,
    description: 'API key updated successfully',
    type: ApiKeyResponseDto,
  })
  @ApiResponse({ status: 404, description: 'API key not found' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateApiKeyDto,
    @CurrentUser() user: BaseUser,
  ): Promise<ApiKeyResponseDto> {
    return this.apiKeysService.update(id, updateDto, user);
  }

  @Delete(':id')
  @Roles('company_owner', 'super_admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Revoke API key',
    description: 'Permanently revoke an API key',
  })
  @ApiParam({ name: 'id', description: 'API key ID' })
  @ApiResponse({ status: 204, description: 'API key revoked successfully' })
  @ApiResponse({ status: 404, description: 'API key not found' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  async remove(
    @Param('id') id: string,
    @CurrentUser() user: BaseUser,
  ): Promise<void> {
    return this.apiKeysService.revoke(id, user);
  }

  @Get(':id/usage')
  @Roles('company_owner', 'super_admin', 'branch_manager')
  @ApiOperation({
    summary: 'Get API key usage statistics',
    description: 'Retrieve usage metrics and statistics for an API key',
  })
  @ApiParam({ name: 'id', description: 'API key ID' })
  @ApiQuery({ name: 'days', required: false, description: 'Number of days to include', type: Number })
  @ApiResponse({
    status: 200,
    description: 'API key usage statistics',
    type: ApiKeyUsageResponseDto,
  })
  @ApiResponse({ status: 404, description: 'API key not found' })
  async getUsage(
    @Param('id') id: string,
    @Query('days') days?: string,
    @CurrentUser() user?: BaseUser,
  ): Promise<ApiKeyUsageResponseDto> {
    const daysNum = parseInt(days) || 30;
    return this.apiKeysService.getUsageStats(id, daysNum, user);
  }
}
