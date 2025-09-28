/**
 * Phase 3: Discovery Controller
 * Backend endpoints for background discovery service management
 */

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
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { CompanyGuard } from '../../../common/guards/company.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { PrintingService } from '../printing.service';
import { DiscoveryService } from '../services/discovery.service';
import { DiscoveryHeartbeatService } from '../services/discovery-heartbeat.service';

@ApiTags('Discovery Service')
@Controller('printing/discovery')
@UseGuards(JwtAuthGuard, RolesGuard, CompanyGuard)
@ApiBearerAuth()
export class DiscoveryController {
  constructor(
    private readonly printingService: PrintingService,
    private readonly discoveryService: DiscoveryService,
    private readonly heartbeatService: DiscoveryHeartbeatService,
  ) {}

  @Get('status')
  @ApiOperation({ summary: 'Get discovery service status for all branches' })
  @ApiResponse({ status: 200, description: 'Discovery service status retrieved' })
  @Roles('super_admin', 'company_owner')
  async getDiscoveryStatus(@CurrentUser() user: any) {
    try {
      const status = await this.discoveryService.getOverallStatus(user.companyId);

      return {
        success: true,
        data: {
          ...status,
          timestamp: new Date().toISOString(),
          companyId: user.companyId,
        },
        message: 'Discovery service status retrieved successfully'
      };
    } catch (error) {
      throw new HttpException(
        `Failed to get discovery status: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('status/:branchId')
  @ApiOperation({ summary: 'Get discovery service status for specific branch' })
  @ApiResponse({ status: 200, description: 'Branch discovery service status retrieved' })
  @Roles('super_admin', 'company_owner', 'branch_manager')
  async getBranchDiscoveryStatus(
    @Param('branchId') branchId: string,
    @CurrentUser() user: any
  ) {
    try {
      const status = await this.discoveryService.getBranchStatus(branchId, user.companyId);

      return {
        success: true,
        data: {
          branchId,
          ...status,
          timestamp: new Date().toISOString(),
        },
        message: 'Branch discovery service status retrieved successfully'
      };
    } catch (error) {
      throw new HttpException(
        `Failed to get branch discovery status: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Post('heartbeat')
  @ApiOperation({ summary: 'Receive discovery service heartbeat from desktop app' })
  @ApiResponse({ status: 200, description: 'Heartbeat received and processed' })
  @Roles('super_admin', 'company_owner', 'branch_manager', 'call_center', 'cashier')
  async receiveHeartbeat(@Body() heartbeat: any, @CurrentUser() user: any) {
    try {
      const processedHeartbeat = await this.heartbeatService.processHeartbeat({
        ...heartbeat,
        branchId: user.branchId || heartbeat.branchId,
        companyId: user.companyId,
        timestamp: new Date(),
        source: 'desktop_app'
      });

      return {
        success: true,
        data: {
          heartbeatId: processedHeartbeat.id,
          nextHeartbeatIn: 30000, // 30 seconds
          instructions: {
            discoveryEnabled: true,
            interval: 30000,
            methods: ['system', 'usb', 'network']
          }
        },
        message: 'Discovery heartbeat processed successfully'
      };
    } catch (error) {
      throw new HttpException(
        `Failed to process heartbeat: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('heartbeats/:branchId')
  @ApiOperation({ summary: 'Get heartbeat history for branch' })
  @ApiResponse({ status: 200, description: 'Heartbeat history retrieved' })
  @Roles('super_admin', 'company_owner', 'branch_manager')
  async getHeartbeatHistory(
    @Param('branchId') branchId: string,
    @Query('limit') limit: number = 50,
    @Query('hours') hours: number = 24,
    @CurrentUser() user: any
  ) {
    try {
      const history = await this.heartbeatService.getHeartbeatHistory({
        branchId,
        companyId: user.companyId,
        limit,
        hours
      });

      return {
        success: true,
        data: {
          branchId,
          history,
          summary: {
            total: history.length,
            lastHeartbeat: history[0]?.timestamp,
            healthy: history.length > 0 &&
              (Date.now() - new Date(history[0]?.timestamp).getTime()) < 60000, // 1 minute
          }
        },
        message: 'Heartbeat history retrieved successfully'
      };
    } catch (error) {
      throw new HttpException(
        `Failed to get heartbeat history: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Post('control')
  @ApiOperation({ summary: 'Send control commands to discovery services' })
  @ApiResponse({ status: 200, description: 'Control command sent to discovery services' })
  @Roles('super_admin', 'company_owner')
  async sendControlCommand(@Body() command: any, @CurrentUser() user: any) {
    try {
      const results = await this.discoveryService.sendControlCommand({
        ...command,
        companyId: user.companyId,
        issuedBy: user.id,
        timestamp: new Date()
      });

      return {
        success: true,
        data: {
          command: command.action,
          targetBranches: command.branchIds || 'all',
          results,
          issuedBy: user.email,
          timestamp: new Date().toISOString()
        },
        message: 'Discovery control command sent successfully'
      };
    } catch (error) {
      throw new HttpException(
        `Failed to send control command: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('statistics')
  @ApiOperation({ summary: 'Get discovery service statistics' })
  @ApiResponse({ status: 200, description: 'Discovery service statistics retrieved' })
  @Roles('super_admin', 'company_owner')
  async getDiscoveryStatistics(
    @Query('period') period: string = '24h',
    @CurrentUser() user: any
  ) {
    try {
      const statistics = await this.discoveryService.getStatistics({
        companyId: user.companyId,
        period
      });

      return {
        success: true,
        data: {
          period,
          companyId: user.companyId,
          ...statistics,
          generatedAt: new Date().toISOString()
        },
        message: 'Discovery service statistics retrieved successfully'
      };
    } catch (error) {
      throw new HttpException(
        `Failed to get discovery statistics: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Post('printers/register')
  @ApiOperation({ summary: 'Register discovered printers from desktop app' })
  @ApiResponse({ status: 200, description: 'Discovered printers registered successfully' })
  @Roles('super_admin', 'company_owner', 'branch_manager', 'call_center', 'cashier')
  async registerDiscoveredPrinters(@Body() printers: any[], @CurrentUser() user: any) {
    try {
      // Register printers individually for now (can be optimized later)
      const registrationResults = {
        successful: [],
        skipped: [],
        failed: []
      };

      for (const printer of printers) {
        try {
          // Check if printer already exists to avoid duplicates
          const existingPrinter = await this.printingService.findPrinterByName(printer.name, user.companyId);

          if (existingPrinter) {
            registrationResults.skipped.push({
              ...printer,
              reason: 'Printer already exists'
            });
            continue;
          }

          // Prepare printer data for registration
          const printerData = {
            name: printer.name,
            type: printer.type || 'thermal',
            connection: printer.connection || 'network',
            ip: printer.ip || '127.0.0.1',
            port: printer.port || 9012,
            manufacturer: printer.manufacturer || 'Unknown',
            model: printer.model || 'Unknown',
            assignedTo: printer.assignedTo || 'kitchen',
            status: printer.status || 'online',
            capabilities: printer.capabilities || JSON.stringify(['cut', 'drawer']),
            isDefault: printer.isDefault || false,
            companyId: user.companyId,
            branchId: user.branchId || printer.branchId
          };

          // Actually register the printer in the database using autoRegisterPrinter
          const registeredPrinter = await this.printingService.autoRegisterPrinter(printerData);

          registrationResults.successful.push(registeredPrinter);
        } catch (error) {
          registrationResults.failed.push({
            ...printer,
            error: error.message
          });
        }
      }

      return {
        success: true,
        data: {
          registered: registrationResults.successful,
          skipped: registrationResults.skipped,
          failed: registrationResults.failed,
          summary: {
            total: printers.length,
            successCount: registrationResults.successful.length,
            skipCount: registrationResults.skipped.length,
            failCount: registrationResults.failed.length
          }
        },
        message: `Successfully registered ${registrationResults.successful.length} of ${printers.length} discovered printers`
      };
    } catch (error) {
      throw new HttpException(
        `Failed to register discovered printers: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('printers/discovered')
  @ApiOperation({ summary: 'Get recently discovered printers awaiting registration' })
  @ApiResponse({ status: 200, description: 'Recently discovered printers retrieved' })
  @Roles('super_admin', 'company_owner', 'branch_manager')
  async getDiscoveredPrinters(
    @CurrentUser() user: any,
    @Query('branchId') branchId?: string,
    @Query('hours') hours: number = 24
  ) {
    try {
      const discoveredPrinters = await this.discoveryService.getDiscoveredPrinters({
        companyId: user.companyId,
        branchId: branchId || user.branchId,
        hours
      });

      return {
        success: true,
        data: {
          branchId: branchId || user.branchId,
          printers: discoveredPrinters,
          count: discoveredPrinters.length,
          period: `Last ${hours} hours`
        },
        message: 'Recently discovered printers retrieved successfully'
      };
    } catch (error) {
      throw new HttpException(
        `Failed to get discovered printers: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Put('configuration')
  @ApiOperation({ summary: 'Update discovery service configuration' })
  @ApiResponse({ status: 200, description: 'Discovery service configuration updated' })
  @Roles('super_admin', 'company_owner')
  async updateDiscoveryConfiguration(
    @Body() configuration: any,
    @CurrentUser() user: any
  ) {
    try {
      const updatedConfig = await this.discoveryService.updateConfiguration({
        ...configuration,
        companyId: user.companyId,
        updatedBy: user.id,
        timestamp: new Date()
      });

      return {
        success: true,
        data: {
          configuration: updatedConfig,
          updatedBy: user.email,
          timestamp: new Date().toISOString()
        },
        message: 'Discovery service configuration updated successfully'
      };
    } catch (error) {
      throw new HttpException(
        `Failed to update discovery configuration: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Delete('cache/:branchId')
  @ApiOperation({ summary: 'Clear discovery cache for branch' })
  @ApiResponse({ status: 200, description: 'Discovery cache cleared successfully' })
  @Roles('super_admin', 'company_owner', 'branch_manager')
  async clearDiscoveryCache(
    @Param('branchId') branchId: string,
    @CurrentUser() user: any
  ) {
    try {
      await this.discoveryService.clearBranchCache(branchId, user.companyId);

      return {
        success: true,
        data: {
          branchId,
          clearedBy: user.email,
          timestamp: new Date().toISOString()
        },
        message: 'Discovery cache cleared successfully'
      };
    } catch (error) {
      throw new HttpException(
        `Failed to clear discovery cache: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('health')
  @ApiOperation({ summary: 'Get overall discovery service health' })
  @ApiResponse({ status: 200, description: 'Discovery service health status' })
  @Roles('super_admin', 'company_owner')
  async getDiscoveryHealth(@CurrentUser() user: any) {
    try {
      const health = await this.discoveryService.getHealthStatus(user.companyId);

      return {
        success: true,
        data: {
          overall: health.healthy ? 'healthy' : 'unhealthy',
          companyId: user.companyId,
          ...health,
          checkedAt: new Date().toISOString()
        },
        message: 'Discovery service health status retrieved successfully'
      };
    } catch (error) {
      throw new HttpException(
        `Failed to get discovery health status: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
}