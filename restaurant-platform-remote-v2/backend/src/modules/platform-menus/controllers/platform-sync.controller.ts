// ================================================
// Platform Sync Controller
// Comprehensive Platform Synchronization API
// ================================================

import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Logger,
  BadRequestException,
  NotFoundException,
  HttpStatus
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { User } from '@prisma/client';

// Services
import { PlatformSyncService } from '../services/platform-sync.service';
import { MenuValidationService } from '../services/menu-validation.service';
import { SyncProgressGateway } from '../gateways/sync-progress.gateway';

// DTOs
import { CreatePlatformSyncDto } from '../dto/create-platform-sync.dto';
import { BatchSyncDto } from '../dto/batch-sync.dto';
import { SyncConfigurationDto } from '../dto/sync-configuration.dto';
import { SyncFiltersDto } from '../dto/sync-filters.dto';
import { RetryFailedSyncDto } from '../dto/retry-failed-sync.dto';

@ApiTags('Platform Sync')
@ApiBearerAuth()
@Controller('platform-sync')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PlatformSyncController {
  private readonly logger = new Logger(PlatformSyncController.name);

  constructor(
    private readonly platformSyncService: PlatformSyncService,
    private readonly menuValidationService: MenuValidationService,
    private readonly syncProgressGateway: SyncProgressGateway
  ) {}

  // ================================================
  // SINGLE PLATFORM SYNC OPERATIONS
  // ================================================

  @Post('single')
  @Roles('super_admin', 'company_owner', 'branch_manager')
  @ApiOperation({ summary: 'Sync menu to single platform' })
  @ApiResponse({ status: 201, description: 'Sync initiated successfully' })
  @ApiResponse({ status: 400, description: 'Invalid sync configuration' })
  async syncToSinglePlatform(
    @Body() syncDto: CreatePlatformSyncDto,
    @CurrentUser() user: User
  ) {
    this.logger.log(`Initiating single platform sync: ${syncDto.platformType} for user: ${user.id}`);

    try {
      // Validate sync configuration
      const validationResult = await this.menuValidationService.validateSyncConfiguration(
        syncDto.platformMenuId,
        syncDto.platformType,
        syncDto.configuration
      );

      if (!validationResult.isValid) {
        throw new BadRequestException({
          message: 'Sync configuration validation failed',
          errors: validationResult.errors,
          warnings: validationResult.warnings
        });
      }

      // Initiate sync
      const syncResult = await this.platformSyncService.syncToSinglePlatform({
        ...syncDto,
        userId: user.id,
        companyId: user.companyId
      });

      // Emit real-time progress update
      this.syncProgressGateway.emitSyncStarted(user.companyId, {
        syncId: syncResult.syncId,
        platformType: syncDto.platformType,
        platformMenuId: syncDto.platformMenuId,
        status: 'initiated'
      });

      return {
        success: true,
        syncId: syncResult.syncId,
        estimatedDuration: syncResult.estimatedDuration,
        message: 'Platform sync initiated successfully',
        validation: validationResult
      };
    } catch (error) {
      this.logger.error(`Single platform sync failed: ${error.message}`, error.stack);
      throw error;
    }
  }

  @Get('status/:syncId')
  @Roles('super_admin', 'company_owner', 'branch_manager', 'call_center')
  @ApiOperation({ summary: 'Get sync status by ID' })
  @ApiParam({ name: 'syncId', description: 'Sync operation ID' })
  async getSyncStatus(
    @Param('syncId') syncId: string,
    @CurrentUser() user: User
  ) {
    const syncStatus = await this.platformSyncService.getSyncStatus(syncId, user.companyId);

    if (!syncStatus) {
      throw new NotFoundException('Sync operation not found');
    }

    return {
      success: true,
      data: syncStatus
    };
  }

  // ================================================
  // BATCH SYNC OPERATIONS
  // ================================================

  @Post('batch')
  @Roles('super_admin', 'company_owner', 'branch_manager')
  @ApiOperation({ summary: 'Sync menu to multiple platforms simultaneously' })
  @ApiResponse({ status: 201, description: 'Batch sync initiated successfully' })
  async batchSyncToPlatforms(
    @Body() batchSyncDto: BatchSyncDto,
    @CurrentUser() user: User
  ) {
    this.logger.log(`Initiating batch sync for ${batchSyncDto.platforms.length} platforms`);

    try {
      // Validate all platform configurations
      const validationResults = await Promise.all(
        batchSyncDto.platforms.map(platform =>
          this.menuValidationService.validateSyncConfiguration(
            batchSyncDto.platformMenuId,
            platform.platformType,
            platform.configuration
          )
        )
      );

      // Check if any validations failed
      const failedValidations = validationResults.filter(v => !v.isValid);
      if (failedValidations.length > 0) {
        throw new BadRequestException({
          message: 'Some platform configurations are invalid',
          failedPlatforms: failedValidations
        });
      }

      // Initiate batch sync
      const batchResult = await this.platformSyncService.batchSyncToPlatforms({
        ...batchSyncDto,
        userId: user.id,
        companyId: user.companyId
      });

      // Emit real-time progress update
      this.syncProgressGateway.emitBatchSyncStarted(user.companyId, {
        batchId: batchResult.batchId,
        platforms: batchSyncDto.platforms.map(p => p.platformType),
        platformMenuId: batchSyncDto.platformMenuId,
        totalOperations: batchSyncDto.platforms.length
      });

      return {
        success: true,
        batchId: batchResult.batchId,
        syncOperations: batchResult.syncOperations,
        estimatedTotalDuration: batchResult.estimatedTotalDuration,
        message: 'Batch sync initiated successfully'
      };
    } catch (error) {
      this.logger.error(`Batch sync failed: ${error.message}`, error.stack);
      throw error;
    }
  }

  @Get('batch/:batchId/status')
  @Roles('super_admin', 'company_owner', 'branch_manager', 'call_center')
  @ApiOperation({ summary: 'Get batch sync status' })
  @ApiParam({ name: 'batchId', description: 'Batch sync operation ID' })
  async getBatchSyncStatus(
    @Param('batchId') batchId: string,
    @CurrentUser() user: User
  ) {
    const batchStatus = await this.platformSyncService.getBatchSyncStatus(batchId, user.companyId);

    if (!batchStatus) {
      throw new NotFoundException('Batch sync operation not found');
    }

    return {
      success: true,
      data: batchStatus
    };
  }

  // ================================================
  // SYNC HISTORY & LOGGING
  // ================================================

  @Get('history')
  @Roles('super_admin', 'company_owner', 'branch_manager', 'call_center')
  @ApiOperation({ summary: 'Get sync history with filters' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number' })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page' })
  @ApiQuery({ name: 'platformType', required: false, description: 'Filter by platform type' })
  @ApiQuery({ name: 'status', required: false, description: 'Filter by sync status' })
  @ApiQuery({ name: 'dateFrom', required: false, description: 'Start date filter' })
  @ApiQuery({ name: 'dateTo', required: false, description: 'End date filter' })
  async getSyncHistory(
    @Query() filters: SyncFiltersDto,
    @CurrentUser() user: User
  ) {
    const history = await this.platformSyncService.getSyncHistory({
      ...filters,
      companyId: user.companyId
    });

    return {
      success: true,
      data: history.data,
      pagination: {
        page: history.page,
        limit: history.limit,
        total: history.total,
        totalPages: history.totalPages
      }
    };
  }

  @Get('history/:syncId/details')
  @Roles('super_admin', 'company_owner', 'branch_manager', 'call_center')
  @ApiOperation({ summary: 'Get detailed sync history for specific operation' })
  @ApiParam({ name: 'syncId', description: 'Sync operation ID' })
  async getSyncHistoryDetails(
    @Param('syncId') syncId: string,
    @CurrentUser() user: User
  ) {
    const details = await this.platformSyncService.getSyncHistoryDetails(syncId, user.companyId);

    if (!details) {
      throw new NotFoundException('Sync history not found');
    }

    return {
      success: true,
      data: details
    };
  }

  // ================================================
  // RETRY & ERROR HANDLING
  // ================================================

  @Post('retry')
  @Roles('super_admin', 'company_owner', 'branch_manager')
  @ApiOperation({ summary: 'Retry failed sync operations' })
  @ApiResponse({ status: 201, description: 'Retry initiated successfully' })
  async retryFailedSync(
    @Body() retryDto: RetryFailedSyncDto,
    @CurrentUser() user: User
  ) {
    this.logger.log(`Retrying failed sync operations: ${retryDto.syncIds.join(', ')}`);

    try {
      const retryResult = await this.platformSyncService.retryFailedSyncs({
        ...retryDto,
        userId: user.id,
        companyId: user.companyId
      });

      return {
        success: true,
        retriedOperations: retryResult.retriedOperations,
        skippedOperations: retryResult.skippedOperations,
        message: `Retry initiated for ${retryResult.retriedOperations.length} operations`
      };
    } catch (error) {
      this.logger.error(`Retry failed sync failed: ${error.message}`, error.stack);
      throw error;
    }
  }

  @Delete('cancel/:syncId')
  @Roles('super_admin', 'company_owner', 'branch_manager')
  @ApiOperation({ summary: 'Cancel ongoing sync operation' })
  @ApiParam({ name: 'syncId', description: 'Sync operation ID to cancel' })
  async cancelSync(
    @Param('syncId') syncId: string,
    @CurrentUser() user: User
  ) {
    const cancelResult = await this.platformSyncService.cancelSync(syncId, user.companyId);

    if (!cancelResult.success) {
      throw new BadRequestException(cancelResult.message);
    }

    return {
      success: true,
      message: 'Sync operation cancelled successfully'
    };
  }

  // ================================================
  // SYNC CONFIGURATION MANAGEMENT
  // ================================================

  @Get('configurations/:platformMenuId')
  @Roles('super_admin', 'company_owner', 'branch_manager', 'call_center')
  @ApiOperation({ summary: 'Get platform sync configurations for menu' })
  @ApiParam({ name: 'platformMenuId', description: 'Platform menu ID' })
  async getSyncConfigurations(
    @Param('platformMenuId') platformMenuId: string,
    @CurrentUser() user: User
  ) {
    const configurations = await this.platformSyncService.getSyncConfigurations(
      platformMenuId,
      user.companyId
    );

    return {
      success: true,
      data: configurations
    };
  }

  @Put('configurations/:platformMenuId/:platformType')
  @Roles('super_admin', 'company_owner', 'branch_manager')
  @ApiOperation({ summary: 'Update sync configuration for platform' })
  @ApiParam({ name: 'platformMenuId', description: 'Platform menu ID' })
  @ApiParam({ name: 'platformType', description: 'Platform type (careem, talabat)' })
  async updateSyncConfiguration(
    @Param('platformMenuId') platformMenuId: string,
    @Param('platformType') platformType: string,
    @Body() configDto: SyncConfigurationDto,
    @CurrentUser() user: User
  ) {
    // Validate configuration
    const validationResult = await this.menuValidationService.validateSyncConfiguration(
      platformMenuId,
      platformType,
      configDto.configuration
    );

    if (!validationResult.isValid) {
      throw new BadRequestException({
        message: 'Configuration validation failed',
        errors: validationResult.errors
      });
    }

    const updatedConfig = await this.platformSyncService.updateSyncConfiguration(
      platformMenuId,
      platformType,
      configDto,
      user.companyId
    );

    return {
      success: true,
      data: updatedConfig,
      message: 'Sync configuration updated successfully'
    };
  }

  // ================================================
  // ANALYTICS & MONITORING
  // ================================================

  @Get('analytics/summary')
  @Roles('super_admin', 'company_owner', 'branch_manager')
  @ApiOperation({ summary: 'Get sync analytics summary' })
  @ApiQuery({ name: 'period', required: false, description: 'Analytics period (day, week, month)' })
  async getSyncAnalytics(
    @Query('period') period: string = 'week',
    @CurrentUser() user: User
  ) {
    const analytics = await this.platformSyncService.getSyncAnalytics(period, user.companyId);

    return {
      success: true,
      data: analytics
    };
  }

  @Get('health')
  @Roles('super_admin', 'company_owner', 'branch_manager', 'call_center')
  @ApiOperation({ summary: 'Get platform sync health status' })
  async getSyncHealthStatus(@CurrentUser() user: User) {
    const healthStatus = await this.platformSyncService.getSyncHealthStatus(user.companyId);

    return {
      success: true,
      data: healthStatus
    };
  }

  // ================================================
  // WEBHOOK HANDLERS
  // ================================================

  @Post('webhook/:platformType')
  @ApiOperation({ summary: 'Handle platform webhook for sync status updates' })
  @ApiParam({ name: 'platformType', description: 'Platform type (careem, talabat)' })
  async handlePlatformWebhook(
    @Param('platformType') platformType: string,
    @Body() webhookData: any
  ) {
    this.logger.log(`Received webhook from ${platformType}:`, webhookData);

    try {
      const result = await this.platformSyncService.handlePlatformWebhook(
        platformType,
        webhookData
      );

      return {
        success: true,
        processed: result.processed,
        message: 'Webhook processed successfully'
      };
    } catch (error) {
      this.logger.error(`Webhook processing failed: ${error.message}`, error.stack);
      throw error;
    }
  }
}