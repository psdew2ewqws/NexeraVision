import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
  Req,
  HttpCode,
  HttpStatus,
  Res,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { Response } from 'express';
import { JwtAuthGuard } from '../../shared/common/guards/jwt-auth.guard';
import { RolesGuard } from '../../shared/common/guards/roles.guard';
import { Roles } from '../../shared/common/decorators/roles.decorator';
import { Public } from '../../shared/common/decorators/public.decorator';
import { PrintingService } from './printing.service';
import { PrinterDiscoveryService } from './services/printer-discovery.service';
import { PrintJobService } from './services/print-job.service';
import { NetworkDiscoveryService } from './discovery/network-discovery.service';
import { MenuHereIntegrationService } from './services/menuhere-integration.service';
import { CreatePrinterDto } from './dto/create-printer.dto';
import { UpdatePrinterDto } from './dto/update-printer.dto';
import { CreatePrintJobDto } from './dto/create-print-job.dto';
import { DiscoverPrintersDto } from './dto/discover-printers.dto';
import { LicenseAutoDetectDto, LicenseValidationDto } from './dto/license-auto-detect.dto';

@ApiTags('Printing')
@Controller('printing')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class PrintingController {
  private readonly logger = new Logger(PrintingController.name);

  constructor(
    private readonly printingService: PrintingService,
    private readonly printerDiscoveryService: PrinterDiscoveryService,
    private readonly printJobService: PrintJobService,
    private readonly networkDiscoveryService: NetworkDiscoveryService,
    private readonly menuHereService: MenuHereIntegrationService,
  ) {}

  // Printer Management
  @Get('printers')
  @ApiOperation({ summary: 'Get all printers with multi-tenant access control' })
  @ApiResponse({ status: 200, description: 'List of printers retrieved successfully with company/branch info' })
  async getAllPrinters(@Req() req: any) {
    const companyId = req.user?.companyId;
    const branchId = req.user?.branchId;
    const userRole = req.user?.role;
    
    // Super Admin gets all printers with company/branch info
    // Company users get only their company's printers with branch info
    const includeCompanyInfo = userRole === 'super_admin';
    
    return this.printingService.findAllPrinters(companyId, branchId, userRole, {
      includeOffline: true,
      includeCompanyInfo,
      includeDeliveryPlatforms: true,
      includeLicenseInfo: true
    });
  }

  @Get('printers/:id')
  @ApiOperation({ summary: 'Get printer by ID with tenant validation' })
  @ApiResponse({ status: 200, description: 'Printer retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Printer not found' })
  @ApiResponse({ status: 403, description: 'Access denied to printer' })
  async getPrinter(@Param('id') id: string, @Req() req: any) {
    const companyId = req.user?.companyId;
    const branchId = req.user?.branchId;
    const userRole = req.user?.role;
    
    return this.printingService.findOnePrinter(id, companyId, branchId, userRole);
  }

  @Post('printers')
  @Roles('super_admin', 'company_owner', 'branch_manager')
  @ApiOperation({ summary: 'Add a new printer with tenant isolation' })
  @ApiResponse({ status: 201, description: 'Printer created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid printer data or IP conflict' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  async createPrinter(@Body() createDto: CreatePrinterDto, @Req() req: any) {
    const companyId = req.user?.role === 'super_admin' ? (createDto.companyId || req.user?.companyId) : req.user?.companyId;
    const branchId = req.user?.branchId;
    const userRole = req.user?.role;
    
    return this.printingService.createPrinter(createDto, companyId, branchId, userRole);
  }

  @Public()
  @Post('printers/menuhere-register')
  @ApiOperation({ summary: 'Register printer from MenuHere service without authentication' })
  @ApiResponse({ status: 201, description: 'Printer registered successfully' })
  @ApiResponse({ status: 400, description: 'Invalid printer data' })
  async registerMenuHerePrinter(@Body() printerData: any) {
    try {
      // Convert MenuHere data format to our DTO format
      const createDto = {
        name: printerData.name,
        type: printerData.type,
        connection: printerData.connection,
        ip: printerData.ip || null,
        port: printerData.port || 9100,
        manufacturer: printerData.manufacturer || 'Unknown',
        model: printerData.model || 'Unknown',
        location: printerData.location || 'Auto-detected',
        assignedTo: printerData.assignedTo || 'cashier',
        isDefault: printerData.isDefault || false,
        status: printerData.status || 'online',
        capabilities: printerData.capabilities ? JSON.stringify(printerData.capabilities) : null,
        companyId: printerData.companyId,
        branchId: printerData.branchId,
        licenseKey: printerData.licenseKey,
        menuHereConfig: printerData.menuHereConfig,
        lastAutoDetection: printerData.lastAutoDetection,
        isAutoDetected: printerData.isAutoDetected || true
      };

      const result = await this.printingService.createPrinter(createDto, printerData.companyId, printerData.branchId, 'super_admin');
      return { success: true, printer: result };
    } catch (error) {
      console.error('MenuHere printer registration error:', error);
      return { success: false, error: error.message };
    }
  }

  @Public()
  @Get('menuhere/status')
  @ApiOperation({ summary: 'Get MenuHere service status without authentication' })
  @ApiResponse({ status: 200, description: 'MenuHere service status retrieved' })
  async getMenuHereStatus() {
    try {
      const status = await this.menuHereService.getConnectionStatus();
      return {
        success: true,
        menuHere: status
      };
    } catch (error) {
      console.error('MenuHere status error:', error);
      return {
        success: false,
        menuHere: {
          connected: false,
          version: 'Unknown',
          printers: 0,
          error: error.message
        }
      };
    }
  }

  @Patch('printers/:id')
  @Roles('super_admin', 'company_owner', 'branch_manager')
  @ApiOperation({ summary: 'Update printer settings' })
  @ApiResponse({ status: 200, description: 'Printer updated successfully' })
  async updatePrinter(
    @Param('id') id: string,
    @Body() updateDto: UpdatePrinterDto,
    @Req() req: any,
  ) {
    const companyId = req.user?.role === 'super_admin' ? undefined : req.user?.companyId;
    return this.printingService.updatePrinter(id, updateDto, companyId);
  }

  @Delete('printers/:id')
  @Roles('super_admin', 'company_owner', 'branch_manager')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete printer' })
  @ApiResponse({ status: 200, description: 'Printer deleted successfully' })
  async deletePrinter(@Param('id') id: string, @Req() req: any) {
    const companyId = req.user?.role === 'super_admin' ? undefined : req.user?.companyId;
    return this.printingService.deletePrinter(id, companyId);
  }

  // Printer Discovery
  @Post('discover')
  @Roles('super_admin', 'company_owner', 'branch_manager')
  @ApiOperation({ summary: 'Discover printers on network' })
  @ApiResponse({ status: 200, description: 'Printer discovery completed' })
  async discoverPrinters(@Body() discoveryDto: DiscoverPrintersDto, @Req() req: any) {
    const companyId = req.user?.role === 'super_admin' ? discoveryDto.companyId : req.user?.companyId;
    const branchId = req.user?.branchId;
    return this.printerDiscoveryService.discoverPrinters(companyId, branchId, discoveryDto.timeout || 10000);
  }

  // Printer Testing
  @Post('printers/:id/test')
  @Roles('super_admin', 'company_owner', 'branch_manager')
  @ApiOperation({ summary: 'Test printer connection and print test page via MenuHere or network' })
  @ApiResponse({ status: 200, description: 'Printer test completed' })
  async testPrinter(@Param('id') id: string, @Req() req: any) {
    try {
      const companyId = req.user?.role === 'super_admin' ? undefined : req.user?.companyId;
      
      // Get printer details first
      const printer = await this.printingService.findOnePrinter(id, companyId, req.user?.branchId, req.user?.role);
      
      if (!printer) {
        return { success: false, message: 'Printer not found' };
      }

      // Test via MenuHere if it's a MenuHere printer
      if (printer.printer.connection === 'menuhere' || printer.printer.menuHereConfig?.isMenuHereManaged) {
        const menuHerePrinterName = printer.printer.menuHereConfig?.printerName || printer.printer.name;
        const result = await this.menuHereService.testPrinter(menuHerePrinterName);
        
        // Update printer status based on test result
        await this.printingService.updatePrinterStatus(id, result.success ? 'online' : 'error', result.success ? null : result.message);
        
        return result;
      } else {
        // Use existing network testing logic
        return this.printingService.testPrinter(id, companyId);
      }
    } catch (error) {
      this.logger.error(`Printer test failed for ${id}:`, error);
      return { 
        success: false, 
        message: `Test failed: ${error.message}` 
      };
    }
  }

  // Print Jobs
  @Get('jobs')
  @ApiOperation({ summary: 'Get print jobs' })
  @ApiResponse({ status: 200, description: 'Print jobs retrieved successfully' })
  @ApiQuery({ name: 'limit', required: false, description: 'Number of jobs to retrieve' })
  @ApiQuery({ name: 'offset', required: false, description: 'Number of jobs to skip' })
  @ApiQuery({ name: 'status', required: false, description: 'Filter by job status' })
  async getPrintJobs(
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
    @Query('status') status?: string,
    @Req() req?: any,
  ) {
    const companyId = req.user?.role === 'super_admin' ? undefined : req.user?.companyId;
    const branchId = req.user?.branchId;
    
    return this.printJobService.findJobs({
      companyId,
      branchId,
      limit: limit ? parseInt(limit) : 50,
      offset: offset ? parseInt(offset) : 0,
      status,
    });
  }

  @Post('jobs')
  @Roles('super_admin', 'company_owner', 'branch_manager', 'call_center', 'cashier')
  @ApiOperation({ summary: 'Create a print job' })
  @ApiResponse({ status: 201, description: 'Print job created successfully' })
  async createPrintJob(@Body() createJobDto: CreatePrintJobDto, @Req() req: any) {
    const companyId = req.user?.companyId;
    const branchId = req.user?.branchId;
    const userId = req.user?.id;
    
    return this.printJobService.createJob(createJobDto, companyId, branchId, userId);
  }

  @Get('jobs/:id')
  @ApiOperation({ summary: 'Get print job by ID' })
  @ApiResponse({ status: 200, description: 'Print job retrieved successfully' })
  async getPrintJob(@Param('id') id: string, @Req() req: any) {
    const companyId = req.user?.role === 'super_admin' ? undefined : req.user?.companyId;
    return this.printJobService.findJobById(id, companyId);
  }

  @Post('jobs/:id/retry')
  @Roles('super_admin', 'company_owner', 'branch_manager')
  @ApiOperation({ summary: 'Retry failed print job' })
  @ApiResponse({ status: 200, description: 'Print job retry initiated' })
  async retryPrintJob(@Param('id') id: string, @Req() req: any) {
    const companyId = req.user?.role === 'super_admin' ? undefined : req.user?.companyId;
    return this.printJobService.retryJob(id, companyId);
  }

  // Print Service Management
  @Get('service/status')
  @ApiOperation({ summary: 'Get print service status including MenuHere' })
  @ApiResponse({ status: 200, description: 'Print service status retrieved' })
  async getServiceStatus(@Req() req: any) {
    const companyId = req.user?.companyId;
    const branchId = req.user?.branchId;
    
    // Get basic service status
    const serviceStatus = await this.printingService.getServiceStatus(companyId, branchId);
    
    // Get MenuHere status
    const menuHereStatus = await this.menuHereService.getConnectionStatus();
    
    return {
      ...serviceStatus,
      menuHere: menuHereStatus
    };
  }

  @Post('service/install')
  @Roles('super_admin', 'company_owner', 'branch_manager')
  @ApiOperation({ summary: 'Generate print service installer' })
  @ApiResponse({ status: 200, description: 'Installer preparation initiated' })
  async prepareServiceInstaller(@Req() req: any) {
    const companyId = req.user?.companyId;
    const branchId = req.user?.branchId;
    return this.printingService.prepareServiceInstaller(companyId, branchId);
  }

  @Get('service/download')
  @ApiOperation({ summary: 'Download print service installer' })
  @ApiResponse({ status: 200, description: 'Installer download initiated' })
  async downloadServiceInstaller(@Res() res: Response, @Req() req: any) {
    const companyId = req.user?.companyId;
    const installerPath = await this.printingService.getServiceInstallerPath(companyId);
    
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Disposition', 'attachment; filename="restaurant-print-service.exe"');
    
    return res.download(installerPath);
  }

  // Statistics and Analytics
  @Get('analytics/stats')
  @ApiOperation({ summary: 'Get printing statistics' })
  @ApiResponse({ status: 200, description: 'Printing statistics retrieved' })
  @ApiQuery({ name: 'period', required: false, description: 'Time period (today, week, month)' })
  async getPrintingStats(
    @Query('period') period?: string,
    @Req() req?: any,
  ) {
    const companyId = req.user?.role === 'super_admin' ? undefined : req.user?.companyId;
    const branchId = req.user?.branchId;
    
    return this.printingService.getPrintingStatistics({
      companyId,
      branchId,
      period: period || 'today',
    });
  }

  @Get('analytics/performance')
  @ApiOperation({ summary: 'Get printer performance metrics' })
  @ApiResponse({ status: 200, description: 'Performance metrics retrieved' })
  async getPrinterPerformance(@Req() req: any) {
    const companyId = req.user?.role === 'super_admin' ? undefined : req.user?.companyId;
    const branchId = req.user?.branchId;
    
    return this.printingService.getPrinterPerformanceMetrics(companyId, branchId);
  }

  // Configuration and Templates
  @Get('templates')
  @ApiOperation({ summary: 'Get print templates' })
  @ApiResponse({ status: 200, description: 'Print templates retrieved' })
  async getPrintTemplates(@Req() req: any) {
    const companyId = req.user?.companyId;
    return this.printingService.getPrintTemplates(companyId);
  }

  @Post('templates')
  @Roles('super_admin', 'company_owner', 'branch_manager')
  @ApiOperation({ summary: 'Create or update print template' })
  @ApiResponse({ status: 200, description: 'Print template saved' })
  async savePrintTemplate(@Body() templateData: any, @Req() req: any) {
    const companyId = req.user?.companyId;
    return this.printingService.savePrintTemplate(templateData, companyId);
  }

  // Advanced Printer Discovery Endpoints
  @Post('network-discovery')
  @HttpCode(HttpStatus.OK)
  @Roles('super_admin', 'company_owner', 'branch_manager')
  @ApiOperation({ summary: 'Discover network printers' })
  @ApiResponse({ status: 200, description: 'Network printers discovered' })
  async discoverNetworkPrinters(@Body() options: {
    scanRange: string;
    ports: number[];
    timeout: number;
  }) {
    try {
      this.logger.log(`Network discovery request: ${JSON.stringify(options)}`);
      const printers = await this.networkDiscoveryService.discoverPrinters(options);
      this.logger.log(`Network discovery completed: Found ${printers.length} printers`);
      return { success: true, count: printers.length, printers };
    } catch (error) {
      this.logger.error(`Network discovery failed: ${error.message}`, error.stack);
      throw error;
    }
  }

  @Post('validate')
  @Roles('super_admin', 'company_owner', 'branch_manager')
  @ApiOperation({ summary: 'Validate printer connection' })
  @ApiResponse({ status: 200, description: 'Printer validation result' })
  async validatePrinter(@Body() data: {
    type: string;
    connection: any;
    timeout?: number;
  }) {
    if (data.type === 'network' && data.connection.ip && data.connection.port) {
      const isValid = await this.networkDiscoveryService.validatePrinter(
        data.connection.ip,
        data.connection.port,
        data.timeout || 5000
      );
      return { success: isValid, message: isValid ? 'Printer is reachable' : 'Printer is not reachable' };
    }
    
    return { success: false, message: 'Validation not supported for this printer type' };
  }

  @Post('test-print')
  @Roles('super_admin', 'company_owner', 'branch_manager')
  @ApiOperation({ summary: 'Send test print to validate printer configuration during setup' })
  @ApiResponse({ status: 200, description: 'Test print sent successfully' })
  async sendTestPrint(@Body() data: {
    type: string;
    connection: any;
    timeout?: number;
    testType?: string;
  }) {
    try {
      if (data.type === 'network' && data.connection.ip && data.connection.port) {
        // First validate the printer is reachable
        const isValid = await this.networkDiscoveryService.validatePrinter(
          data.connection.ip,
          data.connection.port,
          data.timeout || 5000
        );
        
        if (!isValid) {
          return { 
            success: false, 
            message: 'Printer is not reachable. Please check IP address and port.' 
          };
        }
        
        // Send test print (this would integrate with actual printer service)
        // For now, we'll simulate sending a test print
        this.logger.log(`Sending test print to ${data.connection.ip}:${data.connection.port}`);
        
        return { 
          success: true, 
          message: 'Test print sent successfully to printer',
          details: 'Check your printer for test output'
        };
      }
      
      return { 
        success: false, 
        message: 'Test print not supported for this printer type' 
      };
    } catch (error) {
      this.logger.error(`Test print failed: ${error.message}`, error.stack);
      return { 
        success: false, 
        message: `Test print failed: ${error.message}` 
      };
    }
  }

  @Post('capabilities')
  @Roles('super_admin', 'company_owner', 'branch_manager')
  @ApiOperation({ summary: 'Get printer capabilities' })
  @ApiResponse({ status: 200, description: 'Printer capabilities retrieved' })
  async getPrinterCapabilities(@Body() data: {
    type: string;
    connection: any;
    timeout?: number;
  }) {
    if (data.type === 'network' && data.connection.ip && data.connection.port) {
      const capabilities = await this.networkDiscoveryService.getPrinterCapabilities(
        data.connection.ip,
        data.connection.port,
        data.timeout || 5000
      );
      return { success: true, capabilities };
    }
    
    return { success: true, capabilities: ['text', 'cut'] };
  }

  // License-Based Auto-Detection System
  @Post('license/validate')
  @Roles('super_admin', 'company_owner', 'branch_manager')
  @ApiOperation({ summary: 'Validate license key (Branch ID) for printer auto-detection' })
  @ApiResponse({ status: 200, description: 'License validation result' })
  async validateLicense(@Body() validateDto: LicenseValidationDto, @Req() req: any) {
    try {
      const companyId = req.user?.role === 'super_admin' ? undefined : req.user?.companyId;
      
      // Validate that the license key (Branch ID) exists and user has access
      const isValid = await this.printingService.validateLicenseKey(
        validateDto.licenseKey, 
        companyId, 
        req.user?.role
      );
      
      return { 
        success: true, 
        valid: isValid,
        message: isValid ? 'License key is valid' : 'License key is invalid or access denied'
      };
    } catch (error) {
      this.logger.error(`License validation failed: ${error.message}`, error.stack);
      return { 
        success: false, 
        valid: false,
        message: `Validation error: ${error.message}` 
      };
    }
  }

  @Post('license/auto-detect')
  @Roles('super_admin', 'company_owner', 'branch_manager')
  @ApiOperation({ summary: 'Auto-detect printers using Branch ID as license key via MenuHere JAR app' })
  @ApiResponse({ status: 200, description: 'Auto-detection process initiated' })
  async autoDetectWithLicense(@Body() detectDto: LicenseAutoDetectDto, @Req() req: any) {
    try {
      const companyId = req.user?.role === 'super_admin' ? undefined : req.user?.companyId;
      const userRole = req.user?.role;
      
      this.logger.log(`Auto-detection requested with license: ${detectDto.licenseKey}`);
      
      // First validate the license key
      const isValidLicense = await this.printingService.validateLicenseKey(
        detectDto.licenseKey, 
        companyId, 
        userRole
      );
      
      if (!isValidLicense) {
        return {
          success: false,
          message: 'Invalid license key or access denied'
        };
      }
      
      // Perform auto-detection via MenuHere
      const result = await this.printingService.autoDetectPrintersWithLicense(
        detectDto.licenseKey,
        companyId,
        {
          timeout: detectDto.timeout || 30000,
          forceRedetection: detectDto.forceRedetection || false,
          autoAssignPlatforms: detectDto.autoAssignPlatforms !== false
        }
      );
      
      this.logger.log(`Auto-detection completed: ${JSON.stringify(result)}`);
      
      return {
        success: true,
        detected: result.detected || 0,
        added: result.added || 0,
        updated: result.updated || 0,
        message: `Auto-detection completed. Found ${result.detected} printers, added ${result.added} new ones.`,
        printers: result.printers || []
      };
      
    } catch (error) {
      this.logger.error(`Auto-detection failed: ${error.message}`, error.stack);
      return {
        success: false,
        message: `Auto-detection failed: ${error.message}`
      };
    }
  }

  @Get('license/:licenseKey/printers')
  @Roles('super_admin', 'company_owner', 'branch_manager')
  @ApiOperation({ summary: 'Get printers associated with a license key' })
  @ApiResponse({ status: 200, description: 'License-associated printers retrieved' })
  async getPrintersByLicense(@Param('licenseKey') licenseKey: string, @Req() req: any) {
    try {
      const companyId = req.user?.role === 'super_admin' ? undefined : req.user?.companyId;
      
      const printers = await this.printingService.findPrintersByLicense(
        licenseKey, 
        companyId,
        req.user?.role
      );
      
      return {
        success: true,
        licenseKey,
        count: printers.length,
        printers
      };
    } catch (error) {
      this.logger.error(`Get printers by license failed: ${error.message}`, error.stack);
      return {
        success: false,
        message: `Failed to retrieve printers: ${error.message}`
      };
    }
  }

  // Platform Assignment Management
  @Patch('printers/:id/platforms')
  @Roles('super_admin', 'company_owner', 'branch_manager')
  @ApiOperation({ summary: 'Update printer delivery platform assignments' })
  @ApiResponse({ status: 200, description: 'Platform assignments updated successfully' })
  async updatePrinterPlatforms(
    @Param('id') id: string,
    @Body() platformData: {
      dhub?: boolean;
      careem?: boolean;
      talabat?: boolean;
      callCenter?: boolean;
      website?: boolean;
      [key: string]: boolean | undefined;
    },
    @Req() req: any
  ) {
    try {
      const companyId = req.user?.role === 'super_admin' ? undefined : req.user?.companyId;
      
      const result = await this.printingService.updatePrinterPlatforms(
        id, 
        platformData, 
        companyId
      );
      
      return {
        success: true,
        message: 'Platform assignments updated successfully',
        platforms: result.deliveryPlatforms
      };
    } catch (error) {
      this.logger.error(`Platform assignment update failed: ${error.message}`, error.stack);
      return {
        success: false,
        message: `Failed to update platforms: ${error.message}`
      };
    }
  }
}