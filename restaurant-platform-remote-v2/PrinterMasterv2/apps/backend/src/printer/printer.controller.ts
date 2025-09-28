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
  HttpStatus,
  HttpException,
  ParseUUIDPipe,
  ValidationPipe,
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
import { PrinterService } from './printer.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import { RegisterPrinterDto } from './dto/register-printer.dto';
import { UpdatePrinterStatusDto } from './dto/update-printer-status.dto';
import { TestPrinterDto } from './dto/test-printer.dto';
import { PrinterResponseDto } from './dto/printer-response.dto';
import { TestPrinterResponseDto } from './dto/test-printer-response.dto';
import { PaginatedResponseDto } from '../common/dto/paginated-response.dto';
import { ApiResponseDto } from '../common/dto/api-response.dto';
import { User } from '../auth/user.interface';

@ApiTags('Printers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('api/v1/printers')
export class PrinterController {
  constructor(private readonly printerService: PrinterService) {}

  @Post('register')
  @ApiOperation({
    summary: 'Register a new printer',
    description: 'Register a newly discovered printer with the system',
  })
  @ApiBody({ type: RegisterPrinterDto })
  @ApiResponse({
    status: 201,
    description: 'Printer successfully registered',
    type: PrinterResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid printer data or printer already exists',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - insufficient permissions',
  })
  async registerPrinter(
    @Body(ValidationPipe) registerPrinterDto: RegisterPrinterDto,
    @CurrentUser() user: User,
  ): Promise<ApiResponseDto<PrinterResponseDto>> {
    try {
      const printer = await this.printerService.registerPrinter(
        registerPrinterDto,
        user.branchId,
        user.companyId,
      );

      return {
        success: true,
        data: PrinterResponseDto.fromEntity(printer),
        timestamp: new Date(),
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          error: {
            code: 'PRINTER_REGISTRATION_FAILED',
            message: error.message,
            timestamp: new Date(),
          },
        },
        error.status || HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Get('branch/:branchId')
  @ApiOperation({
    summary: 'Get printers for a branch',
    description: 'Retrieve all printers registered to a specific branch',
  })
  @ApiParam({
    name: 'branchId',
    description: 'Branch UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiQuery({
    name: 'status',
    description: 'Filter by printer status',
    required: false,
    enum: ['online', 'offline', 'error', 'testing', 'unknown'],
  })
  @ApiQuery({
    name: 'connectionType',
    description: 'Filter by connection type',
    required: false,
    enum: ['USB', 'Network', 'Bluetooth'],
  })
  @ApiQuery({
    name: 'page',
    description: 'Page number for pagination',
    required: false,
    type: Number,
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    description: 'Number of items per page',
    required: false,
    type: Number,
    example: 10,
  })
  @ApiResponse({
    status: 200,
    description: 'List of printers retrieved successfully',
    type: PaginatedResponseDto,
  })
  async getPrintersByBranch(
    @Param('branchId', ParseUUIDPipe) branchId: string,
    @Query('status') status?: string,
    @Query('connectionType') connectionType?: string,
    @Query('page') page = 1,
    @Query('limit') limit = 10,
    @CurrentUser() user: User,
  ): Promise<ApiResponseDto<PaginatedResponseDto<PrinterResponseDto>>> {
    // Ensure user can only access their own branch data
    if (user.role !== 'super_admin' && user.branchId !== branchId) {
      throw new HttpException(
        {
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Access denied to branch data',
            timestamp: new Date(),
          },
        },
        HttpStatus.FORBIDDEN,
      );
    }

    const result = await this.printerService.getPrintersByBranch(
      branchId,
      { status, connectionType },
      { page, limit },
    );

    return {
      success: true,
      data: {
        items: result.items.map(PrinterResponseDto.fromEntity),
        total: result.total,
        page: result.page,
        limit: result.limit,
        hasNext: result.hasNext,
        hasPrev: result.hasPrev,
      },
      timestamp: new Date(),
    };
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get printer details',
    description: 'Retrieve detailed information about a specific printer',
  })
  @ApiParam({
    name: 'id',
    description: 'Printer UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Printer details retrieved successfully',
    type: PrinterResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Printer not found',
  })
  async getPrinter(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ): Promise<ApiResponseDto<PrinterResponseDto>> {
    const printer = await this.printerService.getPrinterById(id);

    if (!printer) {
      throw new HttpException(
        {
          success: false,
          error: {
            code: 'PRINTER_NOT_FOUND',
            message: 'Printer not found',
            timestamp: new Date(),
          },
        },
        HttpStatus.NOT_FOUND,
      );
    }

    // Ensure user can only access their own company's data
    if (user.role !== 'super_admin' && user.companyId !== printer.companyId) {
      throw new HttpException(
        {
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Access denied to printer data',
            timestamp: new Date(),
          },
        },
        HttpStatus.FORBIDDEN,
      );
    }

    return {
      success: true,
      data: PrinterResponseDto.fromEntity(printer),
      timestamp: new Date(),
    };
  }

  @Put(':id/status')
  @ApiOperation({
    summary: 'Update printer status',
    description: 'Update the status of a printer with optional error information',
  })
  @ApiParam({
    name: 'id',
    description: 'Printer UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiBody({ type: UpdatePrinterStatusDto })
  @ApiResponse({
    status: 200,
    description: 'Printer status updated successfully',
    type: PrinterResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Printer not found',
  })
  async updatePrinterStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(ValidationPipe) updateStatusDto: UpdatePrinterStatusDto,
    @CurrentUser() user: User,
  ): Promise<ApiResponseDto<PrinterResponseDto>> {
    const printer = await this.printerService.updatePrinterStatus(
      id,
      updateStatusDto,
      user.deviceId,
    );

    if (!printer) {
      throw new HttpException(
        {
          success: false,
          error: {
            code: 'PRINTER_NOT_FOUND',
            message: 'Printer not found',
            timestamp: new Date(),
          },
        },
        HttpStatus.NOT_FOUND,
      );
    }

    return {
      success: true,
      data: PrinterResponseDto.fromEntity(printer),
      timestamp: new Date(),
    };
  }

  @Post(':id/test')
  @ApiOperation({
    summary: 'Test printer functionality',
    description: 'Execute a test on the specified printer and return results',
  })
  @ApiParam({
    name: 'id',
    description: 'Printer UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiBody({ type: TestPrinterDto })
  @ApiResponse({
    status: 200,
    description: 'Printer test completed successfully',
    type: TestPrinterResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Printer not found',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid test type or printer not available for testing',
  })
  async testPrinter(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(ValidationPipe) testPrinterDto: TestPrinterDto,
    @CurrentUser() user: User,
  ): Promise<ApiResponseDto<TestPrinterResponseDto>> {
    try {
      const testResult = await this.printerService.testPrinter(
        id,
        testPrinterDto,
        user.deviceId,
      );

      return {
        success: true,
        data: testResult,
        timestamp: new Date(),
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          error: {
            code: 'PRINTER_TEST_FAILED',
            message: error.message,
            timestamp: new Date(),
          },
        },
        error.status || HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Get(':id/test-history')
  @ApiOperation({
    summary: 'Get printer test history',
    description: 'Retrieve historical test results for a specific printer',
  })
  @ApiParam({
    name: 'id',
    description: 'Printer UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiQuery({
    name: 'testType',
    description: 'Filter by test type',
    required: false,
    enum: ['status', 'print_test', 'alignment', 'connectivity'],
  })
  @ApiQuery({
    name: 'days',
    description: 'Number of days to look back',
    required: false,
    type: Number,
    example: 7,
  })
  @ApiQuery({
    name: 'limit',
    description: 'Maximum number of results',
    required: false,
    type: Number,
    example: 50,
  })
  @ApiResponse({
    status: 200,
    description: 'Test history retrieved successfully',
  })
  async getPrinterTestHistory(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('testType') testType?: string,
    @Query('days') days = 7,
    @Query('limit') limit = 50,
    @CurrentUser() user: User,
  ): Promise<ApiResponseDto<any[]>> {
    const testResults = await this.printerService.getPrinterTestHistory(
      id,
      { testType, days, limit },
    );

    return {
      success: true,
      data: testResults,
      timestamp: new Date(),
    };
  }

  @Delete(':id')
  @Roles('super_admin', 'company_owner', 'branch_manager')
  @ApiOperation({
    summary: 'Remove printer',
    description: 'Remove a printer from the system (admin only)',
  })
  @ApiParam({
    name: 'id',
    description: 'Printer UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Printer removed successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Printer not found',
  })
  @ApiResponse({
    status: 403,
    description: 'Insufficient permissions',
  })
  async removePrinter(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ): Promise<ApiResponseDto<{ deleted: boolean }>> {
    const deleted = await this.printerService.removePrinter(id, user.companyId);

    if (!deleted) {
      throw new HttpException(
        {
          success: false,
          error: {
            code: 'PRINTER_NOT_FOUND',
            message: 'Printer not found or access denied',
            timestamp: new Date(),
          },
        },
        HttpStatus.NOT_FOUND,
      );
    }

    return {
      success: true,
      data: { deleted: true },
      timestamp: new Date(),
    };
  }

  @Post('batch/status')
  @ApiOperation({
    summary: 'Batch update printer statuses',
    description: 'Update multiple printer statuses in a single request',
  })
  @ApiBody({
    description: 'Array of printer status updates',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          printerId: { type: 'string', format: 'uuid' },
          status: { type: 'string', enum: ['online', 'offline', 'error', 'testing', 'unknown'] },
          errorMessage: { type: 'string' },
          responseTime: { type: 'number' },
          metadata: { type: 'object' },
        },
        required: ['printerId', 'status'],
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Batch status update completed',
  })
  async batchUpdateStatus(
    @Body() updates: Array<{
      printerId: string;
      status: string;
      errorMessage?: string;
      responseTime?: number;
      metadata?: Record<string, any>;
    }>,
    @CurrentUser() user: User,
  ): Promise<ApiResponseDto<{ updated: number; failed: number }>> {
    const result = await this.printerService.batchUpdateStatus(
      updates,
      user.deviceId,
      user.companyId,
    );

    return {
      success: true,
      data: result,
      timestamp: new Date(),
    };
  }

  @Get('company/:companyId/health')
  @Roles('super_admin', 'company_owner')
  @ApiOperation({
    summary: 'Get company printer health summary',
    description: 'Get overall health status of all printers in a company',
  })
  @ApiParam({
    name: 'companyId',
    description: 'Company UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Printer health summary retrieved successfully',
  })
  async getCompanyPrinterHealth(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @CurrentUser() user: User,
  ): Promise<ApiResponseDto<any>> {
    // Ensure user can only access their own company data
    if (user.role !== 'super_admin' && user.companyId !== companyId) {
      throw new HttpException(
        {
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Access denied to company data',
            timestamp: new Date(),
          },
        },
        HttpStatus.FORBIDDEN,
      );
    }

    const healthSummary = await this.printerService.getCompanyPrinterHealth(companyId);

    return {
      success: true,
      data: healthSummary,
      timestamp: new Date(),
    };
  }
}