import { Controller, Post, Body, Get, Param, Put, Query, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import { PrinterLicensesService } from './printer-licenses.service';
import { ValidateLicenseDto, CreatePrinterLicenseDto } from './dto';
import { PrinterLicenseStatus } from '@prisma/client';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('Printer Licenses')
@Controller('printer-licenses')
export class PrinterLicensesController {
  constructor(private readonly printerLicensesService: PrinterLicensesService) {}

  @Post('validate')
  @Public()
  @ApiOperation({ 
    summary: 'Validate branch license',
    description: 'Validates a branch ID (used as license key) and returns branch/license information for desktop app. License key should be a valid branch UUID.'
  })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Branch license validated successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            id: { type: 'string', example: '40f863e7-b719-4142-8e94-724572002d9b' },
            licenseKey: { type: 'string', example: '40f863e7-b719-4142-8e94-724572002d9b' },
            status: { type: 'string', example: 'active' },
            branchId: { type: 'string', example: '40f863e7-b719-4142-8e94-724572002d9b' },
            branchName: { type: 'string', example: 'Main Office' },
            companyId: { type: 'string', example: 'uuid-company-id' },
            companyName: { type: 'string', example: 'Restaurant Chain' },
            deviceId: { type: 'string', example: 'device-fingerprint' },
            expiresAt: { type: 'string', example: null },
            features: { type: 'array', items: { type: 'string' }, example: ['printer_management', 'receipt_printing', 'order_processing'] },
            maxPrinters: { type: 'number', example: 10 },
            validatedAt: { type: 'string', example: '2024-09-13T10:00:00.000Z' }
          }
        }
      }
    }
  })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Invalid license key or expired' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'License key not found' })
  @ApiResponse({ status: HttpStatus.CONFLICT, description: 'License already bound to another device' })
  async validateLicense(@Body() validateLicenseDto: ValidateLicenseDto) {
    try {
      const licenseData = await this.printerLicensesService.validateLicense(validateLicenseDto);
      return {
        success: true,
        data: licenseData,
        message: 'License validated successfully'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        code: error.status || HttpStatus.BAD_REQUEST
      };
    }
  }

  @Post()
  @Roles(UserRole.super_admin)
  @ApiOperation({ 
    summary: 'Create new printer license',
    description: 'Creates a new printer license for a branch (Super Admin only)'
  })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'License created successfully' })
  @ApiResponse({ status: HttpStatus.CONFLICT, description: 'License key already exists' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Branch not found' })
  async createLicense(@Body() createLicenseDto: CreatePrinterLicenseDto) {
    try {
      const license = await this.printerLicensesService.createLicense(createLicenseDto);
      return {
        success: true,
        data: license,
        message: 'License created successfully'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        code: error.status || HttpStatus.BAD_REQUEST
      };
    }
  }

  @Get('branch/:branchId')
  @Roles(UserRole.super_admin, UserRole.company_owner, UserRole.branch_manager)
  @ApiOperation({ 
    summary: 'Get licenses for a branch',
    description: 'Retrieves all printer licenses for a specific branch'
  })
  @ApiParam({ name: 'branchId', description: 'Branch ID', type: 'string' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Licenses retrieved successfully' })
  async getLicensesByBranch(@Param('branchId') branchId: string) {
    try {
      const licenses = await this.printerLicensesService.getLicensesByBranch(branchId);
      return {
        success: true,
        data: licenses,
        count: licenses.length
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  @Put(':licenseId/status')
  @Roles(UserRole.super_admin, UserRole.company_owner)
  @ApiOperation({ 
    summary: 'Update license status',
    description: 'Updates the status of a printer license'
  })
  @ApiParam({ name: 'licenseId', description: 'License ID', type: 'string' })
  @ApiResponse({ status: HttpStatus.OK, description: 'License status updated successfully' })
  async updateLicenseStatus(
    @Param('licenseId') licenseId: string,
    @Body('status') status: PrinterLicenseStatus
  ) {
    try {
      const license = await this.printerLicensesService.updateLicenseStatus(licenseId, status);
      return {
        success: true,
        data: license,
        message: 'License status updated successfully'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  @Put(':licenseId/extend')
  @Roles(UserRole.super_admin, UserRole.company_owner)
  @ApiOperation({ 
    summary: 'Extend license expiry',
    description: 'Extends the expiry date of a printer license'
  })
  @ApiParam({ name: 'licenseId', description: 'License ID', type: 'string' })
  @ApiResponse({ status: HttpStatus.OK, description: 'License extended successfully' })
  async extendLicense(
    @Param('licenseId') licenseId: string,
    @Body('expiresAt') expiresAt: string
  ) {
    try {
      const license = await this.printerLicensesService.extendLicense(
        licenseId, 
        new Date(expiresAt)
      );
      return {
        success: true,
        data: license,
        message: 'License extended successfully'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  @Get('sessions/active')
  @Roles(UserRole.super_admin, UserRole.company_owner)
  @ApiOperation({ 
    summary: 'Get active printer sessions',
    description: 'Retrieves all currently active printer sessions'
  })
  @ApiResponse({ status: HttpStatus.OK, description: 'Active sessions retrieved successfully' })
  async getActiveSessions() {
    try {
      const sessions = await this.printerLicensesService.getActiveSessions();
      return {
        success: true,
        data: sessions,
        count: sessions.length
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  @Post('sessions/:sessionId/heartbeat')
  @ApiOperation({ 
    summary: 'Update session heartbeat',
    description: 'Updates the heartbeat timestamp for a printer session'
  })
  @ApiParam({ name: 'sessionId', description: 'Session ID', type: 'string' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Heartbeat updated successfully' })
  async updateSessionHeartbeat(@Param('sessionId') sessionId: string) {
    try {
      const session = await this.printerLicensesService.updateSessionHeartbeat(sessionId);
      return {
        success: true,
        data: session,
        message: 'Heartbeat updated successfully'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
}