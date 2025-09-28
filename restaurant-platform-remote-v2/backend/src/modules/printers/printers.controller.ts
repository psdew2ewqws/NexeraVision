import { Controller, Post, Get, Put, Body, Param, HttpStatus, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBearerAuth } from '@nestjs/swagger';
import { PrintersService } from './printers.service';
import { RegisterPrintersDto } from './dto/register-printer.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('Printers')
@Controller('printers')
export class PrintersController {
  constructor(private readonly printersService: PrintersService) {}

  @Post('register')
  @Public() // Allow desktop app to register without authentication
  @ApiOperation({ 
    summary: 'Register discovered printers from desktop app',
    description: 'Called by desktop application to register newly discovered printers'
  })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Printers registered successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        registeredCount: { type: 'number', example: 3 },
        branchId: { type: 'string', example: '40f863e7-b719-4142-8e94-724572002d9b' },
        companyId: { type: 'string', example: 'uuid-company-id' },
        message: { type: 'string', example: 'Registered 3 printers successfully' }
      }
    }
  })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Invalid printer data or branch not found' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Branch not found' })
  async registerPrinters(@Body() registerDto: RegisterPrintersDto) {
    try {
      const result = await this.printersService.registerPrinters(registerDto);
      return result;
    } catch (error) {
      return {
        success: false,
        error: error.message,
        code: error.status || HttpStatus.BAD_REQUEST
      };
    }
  }

  @Get('branch/:branchId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.super_admin, UserRole.company_owner, UserRole.branch_manager, UserRole.cashier, UserRole.call_center)
  @ApiBearerAuth()
  @ApiOperation({ 
    summary: 'Get all printers for a branch',
    description: 'Retrieve all registered printers for a specific branch'
  })
  @ApiParam({ name: 'branchId', description: 'Branch ID', type: 'string' })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Printers retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        printers: { 
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string', example: 'uuid' },
              name: { type: 'string', example: 'Receipt Printer 1' },
              type: { type: 'string', example: 'receipt' },
              status: { type: 'string', example: 'online' },
              isOnline: { type: 'boolean', example: true },
              connectionType: { type: 'string', example: 'usb' },
              lastSeenAt: { type: 'string', example: '2024-09-13T10:00:00Z' },
              jobCount: { type: 'number', example: 5 }
            }
          }
        },
        count: { type: 'number', example: 3 },
        branchId: { type: 'string', example: 'uuid' }
      }
    }
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Branch not found' })
  async getBranchPrinters(@Param('branchId') branchId: string, @Request() req) {
    try {
      // TODO: Add branch access validation based on user role
      const result = await this.printersService.getBranchPrinters(branchId);
      return result;
    } catch (error) {
      return {
        success: false,
        error: error.message,
        code: error.status || HttpStatus.BAD_REQUEST
      };
    }
  }

  @Get('company/:companyId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.super_admin, UserRole.company_owner)
  @ApiBearerAuth()
  @ApiOperation({ 
    summary: 'Get all printers for a company',
    description: 'Retrieve all registered printers across all branches of a company (Admin/Owner only)'
  })
  @ApiParam({ name: 'companyId', description: 'Company ID', type: 'string' })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Company printers retrieved successfully'
  })
  async getCompanyPrinters(@Param('companyId') companyId: string, @Request() req) {
    try {
      const result = await this.printersService.getCompanyPrinters(companyId);
      return result;
    } catch (error) {
      return {
        success: false,
        error: error.message,
        code: error.status || HttpStatus.BAD_REQUEST
      };
    }
  }

  @Put(':printerId/status')
  @Public() // Allow desktop app to update status without authentication
  @ApiOperation({ 
    summary: 'Update printer status',
    description: 'Update the status of a printer (called by desktop app or web dashboard)'
  })
  @ApiParam({ name: 'printerId', description: 'Printer ID', type: 'string' })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Printer status updated successfully'
  })
  async updatePrinterStatus(
    @Param('printerId') printerId: string,
    @Body('status') status: string,
    @Body('branchId') branchId?: string
  ) {
    try {
      const result = await this.printersService.updatePrinterStatus(printerId, status, branchId);
      return result;
    } catch (error) {
      return {
        success: false,
        error: error.message,
        code: error.status || HttpStatus.BAD_REQUEST
      };
    }
  }

  @Post(':printerId/test')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.super_admin, UserRole.company_owner, UserRole.branch_manager, UserRole.cashier)
  @ApiBearerAuth()
  @ApiOperation({ 
    summary: 'Test print to a printer',
    description: 'Send a test print job to a specific printer'
  })
  @ApiParam({ name: 'printerId', description: 'Printer ID', type: 'string' })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Test print job created successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        jobId: { type: 'string', example: 'uuid' },
        printer: { type: 'string', example: 'Receipt Printer 1' },
        message: { type: 'string', example: 'Test print job created successfully' }
      }
    }
  })
  async testPrinter(
    @Param('printerId') printerId: string,
    @Request() req
  ) {
    try {
      const result = await this.printersService.testPrinter(printerId);
      return result;
    } catch (error) {
      return {
        success: false,
        error: error.message,
        code: error.status || HttpStatus.BAD_REQUEST
      };
    }
  }

  @Get(':printerId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.super_admin, UserRole.company_owner, UserRole.branch_manager, UserRole.cashier, UserRole.call_center)
  @ApiBearerAuth()
  @ApiOperation({ 
    summary: 'Get printer details',
    description: 'Get detailed information about a specific printer'
  })
  @ApiParam({ name: 'printerId', description: 'Printer ID', type: 'string' })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Printer details retrieved successfully'
  })
  async getPrinter(@Param('printerId') printerId: string, @Request() req) {
    try {
      // This would be implemented to get single printer details
      return {
        success: true,
        message: 'Get single printer endpoint - to be implemented'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        code: error.status || HttpStatus.BAD_REQUEST
      };
    }
  }
}