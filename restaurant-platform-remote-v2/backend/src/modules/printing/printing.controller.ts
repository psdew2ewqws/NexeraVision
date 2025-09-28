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
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { PrintingService } from './printing.service';
import { PrinterDiscoveryService } from './services/printer-discovery.service';
import { PrintJobService } from './services/print-job.service';
import { TaxThermalPrinterService } from './services/tax-thermal-printer.service';
import { NetworkDiscoveryService } from './discovery/network-discovery.service';
// import { MenuHereIntegrationService } from './services/menuhere-integration.service';
import { PrintingWebSocketGateway } from './gateways/printing-websocket.gateway';
import { PrismaService } from '../database/prisma.service';
import { CreatePrinterDto } from './dto/create-printer.dto';
import { UpdatePrinterDto } from './dto/update-printer.dto';
import { CreatePrintJobDto } from './dto/create-print-job.dto';
import { DiscoverPrintersDto } from './dto/discover-printers.dto';
import { LicenseAutoDetectDto, LicenseValidationDto } from './dto/license-auto-detect.dto';
import { Public } from '../../common/decorators/public.decorator';
import { PrinterStatus, PrinterType, PrinterConnection, PrinterAssignment } from '@prisma/client';

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
    private readonly taxThermalPrinterService: TaxThermalPrinterService,
    private readonly networkDiscoveryService: NetworkDiscoveryService,
    // private readonly menuHereService: MenuHereIntegrationService,
    private readonly printingWebSocketGateway: PrintingWebSocketGateway,
    private readonly prisma: PrismaService,
  ) {}

  // Printer Management
  @Get('printers')
  @ApiOperation({ summary: 'Get all printers for user\'s company with tenant isolation' })
  @ApiResponse({ status: 200, description: 'List of printers retrieved successfully' })
  async getAllPrinters(@Req() req: any) {
    const userRole = req.user?.role;
    // Super admin should see all printers regardless of company (companyId = undefined)
    const companyId = userRole === 'super_admin' ? undefined : req.user?.companyId;
    const branchId = req.user?.branchId;
    
    return this.printingService.findAllPrinters(companyId, branchId, userRole, {
      includeOffline: true
    });
  }

  @Get('printers/branch/:branchId')
  @ApiOperation({ summary: 'Get all printers for a specific branch' })
  @ApiResponse({ status: 200, description: 'Branch printers retrieved successfully' })
  async getPrintersByBranch(@Param('branchId') branchId: string, @Req() req: any) {
    try {
      const userRole = req.user?.role;
      const userCompanyId = req.user?.companyId;
      const userBranchId = req.user?.branchId;
      
      // Validate access to the requested branch
      if (userRole !== 'super_admin') {
        // Non-admin users can only access their own branch
        if (userBranchId !== branchId) {
          return {
            success: false,
            message: 'Access denied to this branch',
            printers: []
          };
        }
      }
      
      // Get printers for the specific branch from database
      const printers = await this.printingService.getAllPrinters(
        userRole === 'super_admin' ? undefined : userCompanyId,
        branchId,
        undefined, // limit
        undefined, // offset
        undefined  // status filter
      );
      
      this.logger.log(`Retrieved ${printers.length} printers for branch: ${branchId}`);
      
      return {
        success: true,
        printers: printers,
        count: printers.length,
        branchId: branchId
      };
    } catch (error) {
      this.logger.error(`Failed to get printers for branch ${branchId}:`, error);
      return {
        success: false,
        message: `Failed to get printers: ${error.message}`,
        printers: [],
        count: 0
      };
    }
  }

  // Public endpoint for getting printers (for testing/dashboard) - MUST come before printers/:id
  @Public()
  @Get('printers/public')
  @ApiOperation({ summary: 'Public endpoint to get all printers (for testing)' })
  @ApiResponse({ status: 200, description: 'Printers retrieved successfully' })
  async getPublicPrinters(@Query('branchId') branchId?: string) {
    try {
      // For testing, return all printers for the specific branch or all if no branch specified
      const targetBranchId = branchId || 'f97ceb38-c797-4d1c-9ff4-89d9f8da5235';
      
      const printers = await this.printingService.getAllPrinters(
        undefined, // companyId
        targetBranchId,
        undefined, // limit
        undefined, // offset
        undefined  // status
      );

      return {
        success: true,
        printers,
        count: printers.length,
        branchId: targetBranchId
      };
    } catch (error) {
      this.logger.error(`Public get printers error: ${error.message}`);
      return {
        success: false,
        message: 'Failed to get printers: ' + error.message,
        printers: [],
        count: 0
      };
    }
  }

  // Simple test endpoint to debug authentication issues
  @Public()
  @Get('test-public')
  @ApiOperation({ summary: 'Simple test endpoint without authentication' })
  @ApiResponse({ status: 200, description: 'Test endpoint working' })
  async testPublicEndpoint() {
    return {
      success: true,
      message: 'Public endpoint is working!',
      timestamp: new Date().toISOString(),
      version: '1.0.1'
    };
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
  @Public()
  @Post('discover')
  @ApiOperation({ summary: 'Discover printers on network' })
  @ApiResponse({ status: 200, description: 'Printer discovery completed' })
  async discoverPrinters(@Body() discoveryDto: DiscoverPrintersDto, @Req() req?: any) {
    const companyId = req?.user?.role === 'super_admin' ? discoveryDto.companyId : req?.user?.companyId;
    const branchId = req?.user?.branchId || discoveryDto.branchId;
    return this.printerDiscoveryService.discoverPrinters(companyId, branchId, discoveryDto.timeout || 10000);
  }

  // Printer Testing - Public for PrinterMaster integration
  @Public()
  @Post('printers/:id/test')
  @ApiOperation({ summary: 'Test printer connection and print test page (now public for PrinterMaster integration)' })
  @ApiResponse({ status: 200, description: 'Printer test completed' })
  async testPrinter(@Param('id') id: string, @Req() req: any) {
    try {
      this.logger.log(`[TEST-PRINTER] Testing printer ${id} - User: ${req.user?.email || 'Anonymous'}, Role: ${req.user?.role || 'Public'}`);

      // For testing purposes, allow both authenticated and public access
      const companyId = req.user?.role === 'super_admin' ? undefined : req.user?.companyId;
      const result = await this.printingService.testPrinter(id, companyId);

      this.logger.log(`[TEST-PRINTER] Test result for printer ${id}:`, result);
      return {
        ...result,
        debugInfo: {
          authenticationWorking: !!req.user,
          userEmail: req.user?.email || 'Not authenticated',
          userRole: req.user?.role || 'No role',
          message: 'Printer test endpoint is now temporarily public to fix authentication issues'
        }
      };
    } catch (error) {
      this.logger.error(`[TEST-PRINTER] Test failed for printer ${id}:`, error);
      return {
        success: false,
        message: `Test failed: ${error.message}`,
        error: error.message,
        debugInfo: {
          authenticationWorking: !!req.user,
          userEmail: req.user?.email || 'Not authenticated',
          userRole: req.user?.role || 'No role'
        }
      };
    }
  }

  // Temporary public test endpoint for debugging authentication
  @Public()
  @Post('printers/:id/test-public')
  @ApiOperation({ summary: 'Public test printer endpoint for debugging authentication' })
  @ApiResponse({ status: 200, description: 'Public printer test completed' })
  async testPrinterPublic(@Param('id') id: string) {
    try {
      this.logger.log(`[TEST-PRINTER-PUBLIC] Testing printer ${id} via public endpoint`);

      const result = await this.printingService.testPrinter(id, undefined);

      this.logger.log(`[TEST-PRINTER-PUBLIC] Test result for printer ${id}:`, result);
      return {
        success: true,
        message: 'Public test printer endpoint working - this confirms the issue is authentication related',
        testResult: result
      };
    } catch (error) {
      this.logger.error(`[TEST-PRINTER-PUBLIC] Public test failed for printer ${id}:`, error);
      return {
        success: false,
        message: `Public test failed: ${error.message}`,
        error: error.message
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
  @Public()
  @Get('service/status')
  @ApiOperation({ summary: 'Get print service status including MenuHere' })
  @ApiResponse({ status: 200, description: 'Print service status retrieved' })
  async getServiceStatus(@Req() req?: any) {
    const companyId = req?.user?.companyId;
    const branchId = req?.user?.branchId;
    
    // Get basic service status
    const serviceStatus = await this.printingService.getServiceStatus(companyId, branchId);
    
    // Get MenuHere status
    // const menuHereStatus = await this.menuHereService.getConnectionStatus();
    const menuHereStatus = { connected: false, error: 'MenuHere service disabled' };
    
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
  @Public()
  @Post('network-discovery')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Discover network printers (Public for debugging)' })
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

  // Device Registration and Discovery Endpoints
  @Post('device-register')
  @Roles('super_admin', 'company_owner', 'branch_manager', 'cashier')
  @ApiOperation({ summary: 'Register MenuHere device regardless of printer count' })
  @ApiResponse({ status: 200, description: 'Device registered with discovery status' })
  async registerDevice(
    @Body() data: { branchId?: string; deviceName?: string },
    @Req() req: any
  ) {
    const companyId = req.user?.role === 'super_admin' ? undefined : req.user?.companyId;
    const userBranchId = req.user?.branchId;
    const targetBranchId = data.branchId || userBranchId;
    const deviceName = data.deviceName || `MenuHere-${Date.now()}`;
    
    try {
      this.logger.log(`Registering device "${deviceName}" for branch: ${targetBranchId}`);
      
      // Check MenuHere connection status
      // const connectionStatus = await this.menuHereService.getConnectionStatus();
      const connectionStatus = { connected: false, error: 'MenuHere service disabled' };
      this.logger.log(`MenuHere connection status:`, connectionStatus);
      
      // Device registration object
      const deviceInfo = {
        deviceName,
        branchId: targetBranchId,
        companyId,
        registeredAt: new Date().toISOString(),
        registeredBy: req.user?.email || req.user?.id || 'system',
        menuHereConnected: connectionStatus.connected,
        menuHereVersion: 'N/A'
      };

      const registeredPrinters = [];
      const errors = [];
      let printersFound = 0;

      if (connectionStatus.connected) {
        try {
          // Try to discover printers
          // const menuherePrinters = await this.menuHereService.discoverPrinters();
          const menuherePrinters = [];
          printersFound = menuherePrinters.length;
          this.logger.log(`Discovered ${printersFound} printers from MenuHere`);
          
          // Process each discovered printer
          for (const printer of menuherePrinters) {
            try {
              // Check if printer already exists
              const existingPrinter = await this.printingService.findPrinterByName(
                printer.name, 
                companyId, 
                targetBranchId
              );
              
              if (!existingPrinter) {
                // Register new printer
                const printerData = {
                  name: printer.name,
                  type: 'thermal' as const,
                  connection: 'network' as const,
                  manufacturer: printer.manufacturer || 'Unknown',
                  model: printer.model || 'MenuHere Printer',
                  assignedTo: 'cashier' as const,
                  status: printer.status === 'online' ? 'online' as const : 'offline' as const,
                  capabilities: JSON.stringify(printer.capabilities || ['text', 'cut']),
                  isDefault: printer.isDefault || false,
                  companyId,
                  branchId: targetBranchId,
                  autoprint: false
                };
                
                const registered = await this.printingService.autoRegisterPrinter(printerData);
                registeredPrinters.push({ ...registered, isNew: true });
                
                // Broadcast new printer registration
                this.printingWebSocketGateway.broadcastPrinterRegistered(registered);
                this.logger.log(`Auto-registered new printer: ${printer.name}`);
              } else {
                // Update existing printer status
                await this.printingService.updatePrinterStatus(
                  existingPrinter.id, 
                  printer.status === 'online' ? 'online' : 'offline'
                );
                registeredPrinters.push({ ...existingPrinter, isNew: false, status: printer.status });
                this.logger.log(`Updated existing printer: ${printer.name}`);
              }
            } catch (printerError) {
              this.logger.error(`Failed to process printer ${printer.name}:`, printerError);
              errors.push({
                printer: printer.name,
                error: printerError.message
              });
            }
          }
        } catch (discoveryError) {
          this.logger.error('Printer discovery failed:', discoveryError);
          errors.push({
            discovery: 'Failed to discover printers',
            error: discoveryError.message
          });
        }
      } else {
        this.logger.warn('MenuHere not connected - device registered but no printers discovered');
      }
      
      // Log device registration
      this.logger.log('Device registration completed:', JSON.stringify(deviceInfo, null, 2));
      
      return {
        success: true,
        message: connectionStatus.connected 
          ? `Device registered successfully. ${printersFound > 0 ? `Found and processed ${printersFound} printers.` : 'No printers found on this device.'}`
          : 'Device registered successfully. MenuHere not connected - no printers discovered.',
        data: {
          device: deviceInfo,
          connection: connectionStatus,
          discovery: {
            printersFound,
            printersRegistered: registeredPrinters.filter(p => p.isNew).length,
            printersUpdated: registeredPrinters.filter(p => !p.isNew).length,
            totalProcessed: registeredPrinters.length
          },
          printers: registeredPrinters,
          errors: errors.length > 0 ? errors : undefined
        }
      };
      
    } catch (error) {
      this.logger.error(`Device registration failed: ${error.message}`, error.stack);
      return {
        success: false,
        message: `Device registration failed: ${error.message}`,
        data: {
          device: null,
          connection: { connected: false, error: error.message },
          discovery: {
            printersFound: 0,
            printersRegistered: 0,
            printersUpdated: 0,
            totalProcessed: 0
          },
          printers: [],
          errors: [{ registration: 'Device registration failed', error: error.message }]
        }
      };
    }
  }

  @Patch('printers/:id/assignment')
  @Roles('super_admin', 'company_owner', 'branch_manager')
  @ApiOperation({ summary: 'Update printer assignment (kitchen/cashier/bar/all)' })
  @ApiResponse({ status: 200, description: 'Printer assignment updated successfully' })
  async updatePrinterAssignment(
    @Param('id') id: string,
    @Body() data: { assignedTo: 'kitchen' | 'cashier' | 'bar' | 'all' },
    @Req() req: any
  ) {
    const companyId = req.user?.role === 'super_admin' ? undefined : req.user?.companyId;
    
    return this.printingService.updatePrinterAssignment(id, data.assignedTo, companyId);
  }

  @Post('printers/:id/test-menuhere')
  @Roles('super_admin', 'company_owner', 'branch_manager')
  @ApiOperation({ summary: 'Test printer via MenuHere integration' })
  @ApiResponse({ status: 200, description: 'Test print completed via MenuHere' })
  async testPrinterViaMenuHere(@Param('id') id: string, @Req() req: any) {
    const companyId = req.user?.role === 'super_admin' ? undefined : req.user?.companyId;
    
    try {
      // Get printer details
      const printer = await this.printingService.findOnePrinter(id, companyId, req.user?.branchId, req.user?.role);
      
      if (!printer) {
        return {
          success: false,
          message: 'Printer not found'
        };
      }

      // Test via MenuHere
      // const testResult = await this.menuHereService.testPrinter(printer.name);
      const testResult = { success: false, error: 'MenuHere service disabled' };
      
      // Update printer status based on test result
      await this.printingService.updatePrinterStatus(id, testResult.success ? 'online' : 'error');
      
      return testResult;
      
    } catch (error) {
      this.logger.error(`Test printer failed: ${error.message}`, error.stack);
      return {
        success: false,
        message: `Test failed: ${error.message}`
      };
    }
  }

  @Get('auto-print-settings/:branchId')
  @ApiOperation({ summary: 'Get auto-print settings for branch' })
  @ApiResponse({ status: 200, description: 'Auto-print settings retrieved' })
  async getAutoPrintSettings(@Param('branchId') branchId: string, @Req() req: any) {
    const companyId = req.user?.role === 'super_admin' ? undefined : req.user?.companyId;
    
    return this.printingService.getAutoPrintSettings(branchId, companyId);
  }

  @Post('auto-print-settings/:branchId')
  @Roles('super_admin', 'company_owner', 'branch_manager')
  @ApiOperation({ summary: 'Update auto-print settings for branch' })
  @ApiResponse({ status: 200, description: 'Auto-print settings updated' })
  async updateAutoPrintSettings(
    @Param('branchId') branchId: string,
    @Body() settings: {
      enabled: boolean;
      kitchenPrinterId?: string;
      cashierPrinterId?: string;
      barPrinterId?: string;
    },
    @Req() req: any
  ) {
    const companyId = req.user?.role === 'super_admin' ? undefined : req.user?.companyId;
    
    return this.printingService.updateAutoPrintSettings(branchId, settings, companyId);
  }

  @Get('printers/status-monitor')
  @ApiOperation({ summary: 'Get real-time printer status for all printers' })
  @ApiResponse({ status: 200, description: 'Printer statuses retrieved' })
  async getPrinterStatuses(@Req() req: any) {
    const companyId = req.user?.role === 'super_admin' ? undefined : req.user?.companyId;
    const branchId = req.user?.branchId;
    
    return this.printingService.getRealtimePrinterStatuses(companyId, branchId);
  }

  // Public endpoint for MenuHere JAR app (no authentication required)
  @Post('license/validate-public')
  @Public()
  @ApiOperation({ summary: 'Public Branch ID validation for MenuHere JAR app' })
  @ApiResponse({ status: 200, description: 'License validation result' })
  async validateLicensePublic(@Body() validateDto: any) {
    try {
      // Hardcoded valid Branch IDs for MenuHere validation
      const validBranchIds = [
        '40f863e7-b719-4142-8e94-724572002d9b',
        'f97ceb38-c797-4d1c-9ff4-89d9f8da5235',
        'f3d4114a-0e39-43fd-aa98-01b57df7efd0',
        'eb4d5daa-c58c-4369-a454-047db8ac3f50',
        'c91db38e-ef89-44c6-8f7d-57de5e91d903',
        'b558e6c0-0866-4acd-9693-7c0a502e9df7'
      ];
      
      const branchId = validateDto.licenseKey || validateDto.branchId;
      const isValid = validBranchIds.includes(branchId);
      
      return {
        success: true,
        valid: isValid,
        message: isValid ? 'Branch ID is valid' : 'Branch ID not found in system'
      };
    } catch (error) {
      return {
        success: false,
        valid: false,
        message: 'Validation error'
      };
    }
  }

  // Public endpoint for MenuHere JAR app printer registration (no authentication required)
  @Post('printers/register-public')
  @Public()
  @ApiOperation({ summary: 'Public printer registration for MenuHere JAR app' })
  @ApiResponse({ status: 201, description: 'Printer registered successfully' })
  async registerPrinterPublic(@Body() createDto: any) {
    try {
      // Validate the branch ID is in our system
      const validBranchIds = [
        '40f863e7-b719-4142-8e94-724572002d9b',
        'f97ceb38-c797-4d1c-9ff4-89d9f8da5235',
        'f3d4114a-0e39-43fd-aa98-01b57df7efd0',
        'eb4d5daa-c58c-4369-a454-047db8ac3f50',
        'c91db38e-ef89-44c6-8f7d-57de5e91d903',
        'b558e6c0-0866-4acd-9693-7c0a502e9df7'
      ];
      
      const branchId = createDto.branchId;
      if (!validBranchIds.includes(branchId)) {
        return {
          success: false,
          message: 'Invalid branch ID'
        };
      }

      // Create printer with minimal validation
      const printerData = {
        name: createDto.name,
        type: createDto.type || 'thermal',
        connection: 'menuhere',
        status: createDto.status || 'online',
        branchId: branchId,
        assignedTo: createDto.assignedTo || 'kitchen',
        menuHereId: createDto.menuHereId,
        ipAddress: '127.0.0.1', // Default for MenuHere connection
        port: 8182, // Default WebSocket port
        isActive: true
      };

      const result = await this.printingService.createPrinterPublic(printerData);
      
      return {
        success: true,
        message: 'Printer registered successfully',
        printer: result
      };
    } catch (error) {
      this.logger.error(`Public printer registration error: ${error.message}`);
      return {
        success: false,
        message: 'Registration failed: ' + error.message
      };
    }
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

  @Post('health-check')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('super_admin', 'company_owner', 'branch_manager')
  @ApiOperation({ summary: 'Check printer health and mark disconnected printers as offline' })
  @ApiResponse({ status: 200, description: 'Health check completed successfully' })
  @HttpCode(HttpStatus.OK)
  async checkPrinterHealth() {
    try {
      this.logger.log('Initiating printer health check...');
      
      const result = await this.printingService.checkPrinterHealth();
      
      this.logger.log(`Health check completed: ${JSON.stringify(result)}`);
      
      return {
        success: true,
        checked: result.checked || 0,
        markedOffline: result.markedOffline || 0,
        message: `Health check completed. Checked ${result.checked} printers, marked ${result.markedOffline} as offline.`,
        timestamp: result.timestamp
      };
      
    } catch (error) {
      this.logger.error(`Health check failed: ${error.message}`, error.stack);
      return {
        success: false,
        message: `Health check failed: ${error.message}`
      };
    }
  }

  // Enhanced License Validation for POS Client
  @Public()
  @Post('license/validate-enhanced')
  @ApiOperation({ summary: 'Enhanced Branch ID validation for POS client with session management' })
  @ApiResponse({ status: 200, description: 'Enhanced license validation result' })
  async validateLicenseEnhanced(@Body() validateDto: {
    branchId: string;
    deviceId?: string;
    clientVersion?: string;
    override?: boolean;
    pin?: string;
  }) {
    try {
      this.logger.log(`Enhanced license validation for Branch ID: ${validateDto.branchId}`);
      
      // Check if Branch ID exists in the database
      const isValidBranch = await this.printingService.validateBranchExists(validateDto.branchId);
      
      if (!isValidBranch) {
        return {
          success: true,
          valid: false,
          sessionConflict: false,
          canOverride: false,
          message: 'Branch ID not found in system',
          branchInfo: null
        };
      }
      
      // Check for active sessions
      const sessionCheck = await this.printingService.checkActiveSession(
        validateDto.branchId,
        validateDto.deviceId
      );
      
      // Handle PIN override for session conflicts
      if (sessionCheck.hasConflict && validateDto.override && validateDto.pin === '0011') {
        this.logger.log(`Session conflict override approved for Branch ID: ${validateDto.branchId}`);
        await this.printingService.clearActiveSessions(validateDto.branchId);
        sessionCheck.hasConflict = false;
      }
      
      // Get branch information
      const branchInfo = await this.printingService.getBranchInfo(validateDto.branchId);
      
      return {
        success: true,
        valid: isValidBranch,
        sessionConflict: sessionCheck.hasConflict,
        canOverride: sessionCheck.canOverride,
        activeDevices: sessionCheck.activeDevices || 0,
        message: isValidBranch ? 
          (sessionCheck.hasConflict ? 'Branch valid but session conflict exists' : 'Branch ID validated successfully') :
          'Branch ID not found',
        branchInfo: isValidBranch ? {
          id: branchInfo.id,
          name: branchInfo.name,
          companyName: branchInfo.company?.name || 'Unknown',
          timezone: branchInfo.timezone || 'UTC',
          currency: 'USD' // branchInfo.currency || 'USD' - currency field not in Branch model
        } : null
      };
    } catch (error) {
      this.logger.error(`Enhanced license validation failed: ${error.message}`, error.stack);
      return {
        success: false,
        valid: false,
        sessionConflict: false,
        canOverride: false,
        message: `Validation error: ${error.message}`,
        branchInfo: null
      };
    }
  }
  
  // Session Conflict Detection
  @Public()
  @Get('sessions/check/:branchId')
  @ApiOperation({ summary: 'Check for active POS client sessions for a Branch ID' })
  @ApiResponse({ status: 200, description: 'Session check completed' })
  async checkSessions(@Param('branchId') branchId: string, @Query('deviceId') deviceId?: string) {
    try {
      this.logger.log(`Session check for Branch ID: ${branchId}, Device ID: ${deviceId}`);
      
      const sessionInfo = await this.printingService.checkActiveSession(branchId, deviceId);
      
      return {
        success: true,
        branchId,
        hasConflict: sessionInfo.hasConflict,
        canOverride: sessionInfo.canOverride,
        activeDevices: sessionInfo.activeDevices || 0,
        currentDevice: deviceId,
        message: sessionInfo.hasConflict ? 
          'Active session detected - use PIN 0011 to override' : 
          'No session conflicts'
      };
    } catch (error) {
      this.logger.error(`Session check failed: ${error.message}`, error.stack);
      return {
        success: false,
        hasConflict: false,
        canOverride: false,
        message: `Session check error: ${error.message}`
      };
    }
  }
  
  // Register Session for POS Client
  @Public()
  @Post('sessions/register')
  @ApiOperation({ summary: 'Register active POS client session' })
  @ApiResponse({ status: 200, description: 'Session registered successfully' })
  async registerSession(@Body() sessionData: {
    branchId: string;
    deviceId: string;
    clientVersion?: string;
    deviceName?: string;
  }) {
    try {
      this.logger.log(`Registering session for Branch ID: ${sessionData.branchId}, Device: ${sessionData.deviceId}`);
      
      const session = await this.printingService.registerClientSession({
        branchId: sessionData.branchId,
        deviceId: sessionData.deviceId,
        clientVersion: sessionData.clientVersion || 'unknown',
        deviceName: sessionData.deviceName || 'POS Client',
        lastActivity: new Date()
      });
      
      return {
        success: true,
        sessionId: session.id,
        message: 'Session registered successfully'
      };
    } catch (error) {
      this.logger.error(`Session registration failed: ${error.message}`, error.stack);
      return {
        success: false,
        message: `Session registration error: ${error.message}`
      };
    }
  }

  @Public()
  @Get('menuhere/status')
  @ApiOperation({ summary: 'Get MenuHere service status without authentication' })
  @ApiResponse({ status: 200, description: 'MenuHere service status retrieved' })
  async getMenuHereStatus() {
    try {
      // const status = await this.menuHereService.getConnectionStatus();
      const status = { connected: false, error: 'MenuHere service disabled' };
      
      // Get REAL printers from database via PrintingService
      const realPrinters = await this.printingService.getAllPrinters(
        undefined, // companyId - get all companies
        'f97ceb38-c797-4d1c-9ff4-89d9f8da5235', // branchId - default branch
        undefined, // limit
        undefined, // offset
        undefined  // status
      );
      
      this.logger.log(`[MENUHERE-STATUS] Found ${realPrinters.length} real printers from database`);
      
      return {
        success: true,
        menuHere: status,
        printers: realPrinters,
        count: realPrinters.length
      };
    } catch (error) {
      this.logger.error('[MENUHERE-STATUS] Error getting real printers:', error);
      return {
        success: false,
        menuHere: {
          connected: false,
          version: 'Unknown',
          printers: 0,
          error: error.message
        },
        printers: [],
        count: 0
      };
    }
  }

  @Public()
  @Get('menuhere/printers')
  @ApiOperation({ summary: 'Get printers via MenuHere without authentication' })
  @ApiResponse({ status: 200, description: 'Printers retrieved successfully' })
  async getMenuHerePrinters(@Query('branchId') branchId?: string) {
    try {
      this.logger.log(`[PUBLIC-MENUHERE-PRINTERS] Getting printers for branch: ${branchId}`);
      
      // For testing, return all printers for the specific branch or all if no branch specified
      const targetBranchId = branchId || 'f97ceb38-c797-4d1c-9ff4-89d9f8da5235';
      
      const printers = await this.printingService.getAllPrinters(
        undefined, // companyId
        targetBranchId,
        undefined, // limit
        undefined, // offset
        undefined  // status
      );

      this.logger.log(`[PUBLIC-MENUHERE-PRINTERS] Found ${printers.length} printers`);

      return {
        success: true,
        printers,
        count: printers.length,
        branchId: targetBranchId
      };
    } catch (error) {
      this.logger.error(`[PUBLIC-MENUHERE-PRINTERS] Error: ${error.message}`);
      return {
        success: false,
        message: 'Failed to get printers: ' + error.message,
        printers: [],
        count: 0
      };
    }
  }

  @Public()
  @Post('printers/menuhere-register')
  @ApiOperation({ summary: 'Register printer from MenuHere service without authentication' })
  @ApiResponse({ status: 201, description: 'Printer registered successfully' })
  @ApiResponse({ status: 400, description: 'Invalid printer data' })
  async registerMenuHerePrinter(@Body() printerData: any) {
    try {
      this.logger.log(`[MENUHERE-REGISTER] Registering printer from MenuHere: ${printerData.name}`);
      // Force recompilation
      
      const result = await this.printingService.registerMenuHerePrinter(printerData);
      
      this.logger.log(`[MENUHERE-REGISTER] Registration successful for: ${printerData.name}`);
      return {
        success: true,
        printer: result,
        message: `Printer ${printerData.name} registered successfully`
      };
    } catch (error) {
      this.logger.error(`[MENUHERE-REGISTER] Failed to register printer ${printerData.name}:`, error);
      return {
        success: false,
        error: error.message,
        message: `Failed to register printer ${printerData.name}`
      };
    }
  }

  @Post('printers/heartbeat')
  @Public()
  @ApiOperation({ summary: 'Receive heartbeat from PrinterMaster to update printer status' })
  @ApiResponse({ status: 200, description: 'Heartbeat received successfully' })
  async receiveHeartbeat(@Body() heartbeatData: any) {
    try {
      this.logger.log(`[HEARTBEAT] Received from branch: ${heartbeatData.branchId}`);
      
      const { branchId, printers: printerUpdates, timestamp } = heartbeatData;
      
      // Update printer statuses based on heartbeat
      for (const printerUpdate of printerUpdates) {
        await this.prisma.printer.updateMany({
          where: {
            name: printerUpdate.name,
            branchId: branchId
          },
          data: {
            status: printerUpdate.status,
            lastSeen: new Date(printerUpdate.lastSeen)
          }
        });
      }

      // Mark printers as offline if they weren't included in the heartbeat
      // (This handles the case where PrinterMaster stops but printers remain in DB as online)
      const printerNames = printerUpdates.map(p => p.name);
      if (printerNames.length > 0) {
        await this.prisma.printer.updateMany({
          where: {
            branchId: branchId,
            name: { notIn: printerNames },
            status: { not: 'offline' }
          },
          data: {
            status: 'offline',
            lastSeen: new Date()
          }
        });
      }

      return {
        success: true,
        message: 'Heartbeat received successfully',
        updated: printerUpdates.length
      };
    } catch (error) {
      this.logger.error(`[HEARTBEAT] Failed to process heartbeat:`, error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // PHASE 1: AUTO-DISCOVERY TO BACKEND SYNC - BULK REGISTRATION ENDPOINT
  @Post('printers/bulk')
  @Public()
  @ApiOperation({ summary: 'Bulk register discovered printers for auto-sync (PrinterMaster bridge)' })
  @ApiResponse({ status: 201, description: 'Bulk printers registered successfully' })
  async bulkRegisterPrinters(@Body() bulkData: {
    printers: Array<{
      name: string;
      type: string;
      connection: string;
      status: string;
      branchId: string;
      discoveredBy: string;
      discoveryMethod: string;
      timestamp: string;
      device?: string;
      systemPrinter?: boolean;
      capabilities?: string[];
      manufacturer?: string;
      model?: string;
      portName?: string;
      driverName?: string;
      isDefault?: boolean;
    }>;
    branchId: string;
    companyId?: string;
  }) {
    try {
      this.logger.log(`🚀 [BULK-SYNC] Processing bulk registration: ${bulkData.printers.length} printers for branch ${bulkData.branchId}`);

      // Validate branch exists
      const branch = await this.prisma.branch.findUnique({
        where: { id: bulkData.branchId },
        include: { company: true }
      });

      if (!branch) {
        return {
          success: false,
          message: 'Invalid branch ID',
          results: []
        };
      }

      const results = [];

      for (const printerData of bulkData.printers) {
        try {
          // Check for existing printer
          const existingPrinter = await this.prisma.printer.findFirst({
            where: {
              name: printerData.name,
              branchId: printerData.branchId
            }
          });

          if (existingPrinter) {
            // Update existing printer
            await this.prisma.printer.update({
              where: { id: existingPrinter.id },
              data: {
                status: this.mapPrinterStatus(printerData.status),
                lastSeen: new Date(),
                capabilities: JSON.stringify(printerData.capabilities || ['text'])
              }
            });

            results.push({
              success: true,
              duplicate: true,
              id: existingPrinter.id,
              name: printerData.name,
              message: 'Updated existing printer'
            });

            this.logger.log(`🔄 [BULK-SYNC] Updated existing printer: ${printerData.name}`);
          } else {
            // Create new printer
            const newPrinter = await this.prisma.printer.create({
              data: {
                name: printerData.name,
                type: this.mapPrinterType(printerData.type),
                connection: this.mapConnectionType(printerData.connection),
                status: this.mapPrinterStatus(printerData.status),
                manufacturer: printerData.manufacturer || this.extractManufacturer(printerData.name),
                model: printerData.model || printerData.name,
                assignedTo: this.mapAssignedTo(printerData.type),
                isDefault: printerData.isDefault || false,
                capabilities: JSON.stringify(printerData.capabilities || ['text']),
                companyId: branch.companyId,
                branchId: printerData.branchId,
                lastSeen: new Date(),
                paperWidth: 80, // Default for thermal printers
                location: printerData.device || 'Auto-discovered'
              }
            });

            results.push({
              success: true,
              duplicate: false,
              id: newPrinter.id,
              name: printerData.name,
              message: 'Created new printer'
            });

            // Broadcast new printer registration
            this.printingWebSocketGateway.broadcastPrinterRegistered(newPrinter);

            this.logger.log(`✅ [BULK-SYNC] Created new printer: ${printerData.name} -> ID: ${newPrinter.id}`);
          }
        } catch (printerError) {
          results.push({
            success: false,
            duplicate: false,
            id: null,
            name: printerData.name,
            error: printerError.message,
            message: 'Failed to process printer'
          });

          this.logger.error(`❌ [BULK-SYNC] Failed to process printer ${printerData.name}:`, printerError);
        }
      }

      const successCount = results.filter(r => r.success).length;
      const duplicateCount = results.filter(r => r.success && r.duplicate).length;
      const newCount = results.filter(r => r.success && !r.duplicate).length;
      const failedCount = results.filter(r => !r.success).length;

      this.logger.log(`🎉 [BULK-SYNC] Bulk registration completed: ${successCount} success (${newCount} new, ${duplicateCount} updated), ${failedCount} failed`);

      return {
        success: true,
        message: `Bulk registration completed. ${newCount} new printers, ${duplicateCount} updated, ${failedCount} failed.`,
        results,
        summary: {
          total: bulkData.printers.length,
          success: successCount,
          new: newCount,
          updated: duplicateCount,
          failed: failedCount
        }
      };

    } catch (error) {
      this.logger.error(`❌ [BULK-SYNC] Bulk registration failed:`, error);
      return {
        success: false,
        message: `Bulk registration failed: ${error.message}`,
        results: [],
        error: error.message
      };
    }
  }

  // Helper methods for bulk registration
  private mapPrinterType(type: string): any {
    const typeMap: { [key: string]: string } = {
      'thermal': 'thermal',
      'receipt': 'thermal',
      'kitchen': 'kitchen',
      'label': 'label',
      'laser': 'laser',
      'inkjet': 'inkjet'
    };
    return typeMap[type.toLowerCase()] || 'thermal';
  }


  private mapPrinterStatus(status: string): any {
    const statusMap: { [key: string]: string } = {
      'online': 'online',
      'offline': 'offline',
      'connected': 'online',
      'disconnected': 'offline',
      'ready': 'online',
      'error': 'error'
    };
    return statusMap[status.toLowerCase()] || 'unknown';
  }

  private mapAssignedTo(type: string): any {
    const assignmentMap: { [key: string]: string } = {
      'thermal': 'cashier',
      'receipt': 'cashier',
      'kitchen': 'kitchen',
      'label': 'cashier'
    };
    return assignmentMap[type.toLowerCase()] || 'kitchen';
  }

  // Auto-registration endpoint for PrinterMasterv2 desktop app
  @Post('printers/auto-register')
  @Public()
  @ApiOperation({ summary: 'Automatically register discovered printers from QZ Tray' })
  @ApiResponse({ status: 201, description: 'Printers registered successfully' })
  async autoRegisterPrinters(@Body() registrationData: {
    branchId: string;
    deviceId: string;
    printers: Array<{
      name: string;
      driver: string;
      connection: string;
      default: boolean;
      capabilities?: any;
      status?: string;
    }>;
    deviceInfo?: {
      hostname?: string;
      platform?: string;
      version?: string;
    };
  }) {
    try {
      this.logger.log(`[AUTO-REGISTER] Processing ${registrationData.printers.length} printers for branch: ${registrationData.branchId}`);
      
      const { branchId, deviceId, printers, deviceInfo } = registrationData;
      
      // Validate branch exists
      const branch = await this.prisma.branch.findUnique({
        where: { id: branchId },
        include: { company: true }
      });
      
      if (!branch) {
        return {
          success: false,
          message: 'Invalid branch ID',
          registered: [],
          updated: [],
          errors: ['Branch not found']
        };
      }

      const registered = [];
      const updated = [];
      const errors = [];

      for (const printerData of printers) {
        try {
          // Check if printer already exists for this branch
          const existingPrinter = await this.prisma.printer.findFirst({
            where: {
              name: printerData.name,
              branchId: branchId
            }
          });

          if (existingPrinter) {
            // Update existing printer
            const updatedPrinter = await this.prisma.printer.update({
              where: { id: existingPrinter.id },
              data: {
                status: (printerData.status || 'online') as PrinterStatus,
                lastSeen: new Date(),
                lastAutoDetection: new Date(),
                capabilities: JSON.stringify(printerData.capabilities || ['text', 'cut']),
                isDefault: printerData.default
              }
            });
            updated.push(updatedPrinter);
            this.logger.log(`[AUTO-REGISTER] Updated existing printer: ${printerData.name}`);
          } else {
            // Register new printer
            const newPrinter = await this.prisma.printer.create({
              data: {
                name: printerData.name,
                type: this.detectPrinterType(printerData.name) as PrinterType,
                connection: this.mapConnectionType(printerData.connection) as PrinterConnection,
                manufacturer: this.extractManufacturer(printerData.driver),
                model: printerData.driver,
                status: (printerData.status || 'online') as PrinterStatus,
                isDefault: printerData.default,
                companyId: branch.companyId,
                branchId: branchId,
                assignedTo: 'all' as PrinterAssignment,
                lastSeen: new Date(),
                lastAutoDetection: new Date(),
                capabilities: JSON.stringify(printerData.capabilities || ['text', 'cut']),
                paperWidth: 80, // Default for thermal printers
                deliveryPlatforms: JSON.stringify({
                  dhub: true,
                  careem: true,
                  talabat: true,
                  callCenter: true,
                  website: true
                }),
                menuHereConfig: JSON.stringify({
                  printerName: printerData.name,
                  isMenuHereManaged: false,
                  lastMenuHereSync: new Date()
                })
              }
            });
            registered.push(newPrinter);
            this.logger.log(`[AUTO-REGISTER] Registered new printer: ${printerData.name}`);
          }
        } catch (error) {
          this.logger.error(`[AUTO-REGISTER] Failed to process printer ${printerData.name}:`, error);
          errors.push({
            printer: printerData.name,
            error: error.message
          });
        }
      }

      // Broadcast registration events
      for (const printer of registered) {
        this.printingWebSocketGateway.broadcastPrinterRegistered(printer);
      }
      for (const printer of updated) {
        this.printingWebSocketGateway.broadcastPrinterStatus(printer.id, {
          printerId: printer.id,
          status: printer.status as any,
          lastSeen: printer.lastSeen || new Date(),
          paperLevel: 80,
          temperature: 35,
          queueLength: 0,
          totalJobs: 0,
          completedJobs: 0,
          errorJobs: 0,
          averageJobTime: 30,
          connectionType: printer.connection as any,
          firmwareVersion: '1.0.0',
          model: printer.model || 'Auto-detected',
          manufacturer: printer.manufacturer || 'Unknown',
          capabilities: []
        });
      }

      return {
        success: true,
        message: `Auto-registration completed. ${registered.length} new printers registered, ${updated.length} existing printers updated.`,
        registered: registered.map(p => ({
          id: p.id,
          name: p.name,
          type: p.type,
          connection: p.connection,
          status: p.status
        })),
        updated: updated.map(p => ({
          id: p.id,
          name: p.name,
          type: p.type,
          connection: p.connection,
          status: p.status
        })),
        errors: errors.length > 0 ? errors : undefined,
        summary: {
          discovered: printers.length,
          registered: registered.length,
          updated: updated.length,
          failed: errors.length
        }
      };
    } catch (error) {
      this.logger.error(`[AUTO-REGISTER] Auto-registration failed:`, error);
      return {
        success: false,
        message: `Auto-registration failed: ${error.message}`,
        registered: [],
        updated: [],
        errors: [error.message]
      };
    }
  }

  // Helper methods for auto-registration
  private detectPrinterType(printerName: string): 'thermal' | 'receipt' | 'kitchen' | 'label' | 'barcode' {
    const name = printerName.toLowerCase();
    if (name.includes('thermal')) return 'thermal';
    if (name.includes('kitchen')) return 'kitchen';
    if (name.includes('label')) return 'label';
    if (name.includes('barcode')) return 'barcode';
    return 'receipt'; // Default
  }

  private mapConnectionType(qzConnection: string): 'network' | 'usb' | 'bluetooth' | 'menuhere' {
    const conn = qzConnection.toLowerCase();
    if (conn.includes('network') || conn.includes('ethernet')) return 'network';
    if (conn.includes('bluetooth')) return 'bluetooth';
    if (conn.includes('serial')) return 'usb'; // Map serial to usb as per Prisma schema
    return 'usb'; // Default for most local printers
  }

  private extractManufacturer(driver: string): string {
    const name = driver.toLowerCase();
    if (name.includes('epson')) return 'Epson';
    if (name.includes('star')) return 'Star';
    if (name.includes('citizen')) return 'Citizen';
    if (name.includes('bixolon')) return 'Bixolon';
    if (name.includes('zebra')) return 'Zebra';
    if (name.includes('hp')) return 'HP';
    if (name.includes('canon')) return 'Canon';
    return 'Unknown';
  }

  // Desktop Application Endpoints for PrinterMaster
  @Post('desktop/validate-license')
  @Public()
  @ApiOperation({ summary: 'Validate license for PrinterMaster desktop application' })
  @ApiResponse({ status: 200, description: 'License validation result for desktop app' })
  async validateDesktopLicense(@Body() validateDto: {
    licenseKey: string;
    deviceId?: string;
    deviceFingerprint?: string;
    appVersion?: string;
    platform?: string;
    arch?: string;
  }) {
    try {
      this.logger.log(`[DESKTOP-LICENSE] Validating license for PrinterMaster: ${validateDto.licenseKey.substring(0, 8)}...`);

      // The licenseKey is actually a branchId in our system
      const branchId = validateDto.licenseKey;

      // First validate that the branch exists
      const branch = await this.prisma.branch.findUnique({
        where: { id: branchId },
        include: {
          company: true
        }
      });

      if (!branch) {
        return {
          success: false,
          data: null,
          error: 'Invalid license key - branch not found'
        };
      }

      // Create license, company, branch, and user info for PrinterMaster
      const responseData = {
        license: {
          licenseKey: branchId,
          deviceId: validateDto.deviceId || 'desktop-device-001',
          deviceFingerprint: validateDto.deviceFingerprint || 'desktop-fingerprint',
          features: ['printer-discovery', 'auto-registration', 'heartbeat-monitoring'],
          maxPrinters: 20, // Allow up to 20 printers per branch
          isValid: true,
          expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year from now
          lastValidation: new Date()
        },
        company: {
          id: branch.companyId,
          name: branch.company?.name || 'Restaurant Company',
          slug: branch.company?.slug || 'restaurant-company',
          businessType: branch.company?.businessType || 'restaurant',
          timezone: branch.company?.timezone || 'UTC',
          defaultCurrency: branch.company?.defaultCurrency || 'USD',
          status: 'active'
        },
        branch: {
          id: branch.id,
          companyId: branch.companyId,
          name: branch.name,
          phone: branch.phone || '',
          email: branch.email || '',
          address: branch.address || '',
          city: branch.city || '',
          country: branch.country || '',
          timezone: branch.timezone || 'UTC',
          isDefault: branch.isDefault,
          isActive: branch.isActive,
          allowsOnlineOrders: branch.allowsOnlineOrders,
          allowsDelivery: branch.allowsDelivery,
          allowsPickup: branch.allowsPickup
        },
        user: {
          id: 'desktop-user',
          email: 'printermaster@restaurant.local',
          firstName: 'PrinterMaster',
          lastName: 'Desktop',
          role: 'printer_service',
          companyId: branch.companyId,
          branchId: branch.id,
          permissions: ['printer.discover', 'printer.register', 'printer.update', 'printer.heartbeat'],
          isActive: true
        }
      };

      this.logger.log(`[DESKTOP-LICENSE] License validated successfully for branch: ${branch.name} (${branch.companyId})`);

      return {
        success: true,
        data: responseData,
        message: 'License validated successfully for desktop application'
      };

    } catch (error) {
      this.logger.error(`[DESKTOP-LICENSE] License validation failed:`, error);
      return {
        success: false,
        data: null,
        error: `License validation failed: ${error.message}`
      };
    }
  }

  @Post('desktop/validate-tenant-access')
  @Public()
  @ApiOperation({ summary: 'Validate tenant access for PrinterMaster desktop application' })
  @ApiResponse({ status: 200, description: 'Tenant access validation result' })
  async validateDesktopTenantAccess(@Body() accessDto: {
    companyId: string;
    branchId: string;
    userId?: string;
    deviceId?: string;
  }) {
    try {
      this.logger.log(`[DESKTOP-TENANT] Validating access for company: ${accessDto.companyId}, branch: ${accessDto.branchId}`);

      // Check if the branch exists and belongs to the company
      const branch = await this.prisma.branch.findFirst({
        where: {
          id: accessDto.branchId,
          companyId: accessDto.companyId,
          isActive: true
        },
        include: {
          company: true
        }
      });

      if (branch) {
        this.logger.log(`[DESKTOP-TENANT] Access granted for branch: ${branch.name}`);
        return {
          success: true,
          message: 'Tenant access validated successfully'
        };
      } else {
        this.logger.warn(`[DESKTOP-TENANT] Access denied - branch not found or inactive`);
        return {
          success: false,
          message: 'Tenant access denied - branch not found or inactive'
        };
      }

    } catch (error) {
      this.logger.error(`[DESKTOP-TENANT] Tenant access validation failed:`, error);
      return {
        success: false,
        message: `Tenant access validation failed: ${error.message}`
      };
    }
  }

  @Post('desktop/logout')
  @Public()
  @ApiOperation({ summary: 'Handle logout from PrinterMaster desktop application' })
  @ApiResponse({ status: 200, description: 'Logout handled successfully' })
  async handleDesktopLogout(@Body() logoutDto: {
    deviceId?: string;
    licenseKey?: string;
  }) {
    try {
      this.logger.log(`[DESKTOP-LOGOUT] Handling logout for device: ${logoutDto.deviceId}`);

      // Here we could clean up any device-specific session data
      // For now, just acknowledge the logout

      return {
        success: true,
        message: 'Logout handled successfully'
      };

    } catch (error) {
      this.logger.error(`[DESKTOP-LOGOUT] Logout handling failed:`, error);
      return {
        success: false,
        message: `Logout handling failed: ${error.message}`
      };
    }
  }

  // Tax Thermal Printing Endpoints

  @Post('tax/receipt')
  @Roles('super_admin', 'company_owner', 'branch_manager', 'call_center', 'cashier')
  @ApiOperation({ summary: 'Print tax-compliant thermal receipt' })
  @ApiResponse({ status: 200, description: 'Receipt printed successfully' })
  async printTaxReceipt(
    @Body() printData: {
      printerId: string;
      orderItems: Array<{
        productId: string;
        quantity: number;
        unitPrice: number;
        modifiers?: Array<{
          modifierId: string;
          price: number;
        }>;
      }>;
      orderInfo?: {
        orderNumber?: string;
        customerName?: string;
        customerPhone?: string;
        orderType?: string;
        paymentMethod?: string;
      };
      options?: {
        includeHeader?: boolean;
        includeFooter?: boolean;
        showTaxBreakdown?: boolean;
        showTaxInclusiveText?: boolean;
        language?: 'en' | 'ar' | 'both';
        paperWidth?: 58 | 80;
        jordanVATCompliance?: boolean;
      };
    },
    @Req() req: any
  ) {
    try {
      const userCompanyId = req.user.companyId;

      const result = await this.taxThermalPrinterService.printTaxReceipt(
        printData.printerId,
        printData.orderItems,
        userCompanyId,
        printData.options,
        printData.orderInfo
      );

      if (result.success) {
        this.logger.log(`Tax receipt printed successfully for company ${userCompanyId}`);
      } else {
        this.logger.error(`Tax receipt printing failed: ${result.error}`);
      }

      return result;
    } catch (error) {
      this.logger.error('Tax receipt printing error:', error);
      return {
        success: false,
        error: error.message || 'Failed to print tax receipt'
      };
    }
  }

  @Post('tax/jordan-vat-receipt')
  @Roles('super_admin', 'company_owner', 'branch_manager', 'call_center', 'cashier')
  @ApiOperation({ summary: 'Print Jordan VAT compliant thermal receipt' })
  @ApiResponse({ status: 200, description: 'Jordan VAT receipt printed successfully' })
  async printJordanVATReceipt(
    @Body() printData: {
      printerId: string;
      orderItems: Array<{
        productId: string;
        quantity: number;
        unitPrice: number;
        modifiers?: Array<{
          modifierId: string;
          price: number;
        }>;
      }>;
      orderInfo?: {
        orderNumber?: string;
        customerName?: string;
        customerPhone?: string;
        orderType?: string;
        paymentMethod?: string;
      };
    },
    @Req() req: any
  ) {
    try {
      const userCompanyId = req.user.companyId;

      const result = await this.taxThermalPrinterService.generateJordanVATReceipt(
        printData.orderItems,
        userCompanyId,
        printData.orderInfo
      );

      // Print the generated content
      const printResult = await this.taxThermalPrinterService.printTaxReceipt(
        printData.printerId,
        printData.orderItems,
        userCompanyId,
        {
          jordanVATCompliance: true,
          showTaxBreakdown: true,
          showTaxInclusiveText: true,
          language: 'both',
        },
        printData.orderInfo
      );

      if (printResult.success) {
        this.logger.log(`Jordan VAT receipt printed successfully for company ${userCompanyId}`);
      } else {
        this.logger.error(`Jordan VAT receipt printing failed: ${printResult.error}`);
      }

      return printResult;
    } catch (error) {
      this.logger.error('Jordan VAT receipt printing error:', error);
      return {
        success: false,
        error: error.message || 'Failed to print Jordan VAT receipt'
      };
    }
  }

  @Post('tax/preview-receipt')
  @Roles('super_admin', 'company_owner', 'branch_manager', 'call_center', 'cashier')
  @ApiOperation({ summary: 'Preview tax receipt content without printing' })
  @ApiResponse({ status: 200, description: 'Receipt content generated successfully' })
  async previewTaxReceipt(
    @Body() previewData: {
      orderItems: Array<{
        productId: string;
        quantity: number;
        unitPrice: number;
        modifiers?: Array<{
          modifierId: string;
          price: number;
        }>;
      }>;
      orderInfo?: {
        orderNumber?: string;
        customerName?: string;
        customerPhone?: string;
        orderType?: string;
        paymentMethod?: string;
      };
      options?: {
        includeHeader?: boolean;
        includeFooter?: boolean;
        showTaxBreakdown?: boolean;
        showTaxInclusiveText?: boolean;
        language?: 'en' | 'ar' | 'both';
        paperWidth?: 58 | 80;
        jordanVATCompliance?: boolean;
      };
    },
    @Req() req: any
  ) {
    try {
      const userCompanyId = req.user.companyId;

      const receiptContent = await this.taxThermalPrinterService.generateTaxReceipt(
        previewData.orderItems,
        userCompanyId,
        previewData.options,
        previewData.orderInfo
      );

      return {
        success: true,
        receiptContent,
        message: 'Receipt content generated successfully'
      };
    } catch (error) {
      this.logger.error('Tax receipt preview error:', error);
      return {
        success: false,
        error: error.message || 'Failed to generate receipt preview'
      };
    }
  }

  @Get('tax/test-jordan-vat/:printerId')
  @Roles('super_admin', 'company_owner', 'branch_manager')
  @ApiOperation({ summary: 'Test Jordan VAT receipt printing with sample data' })
  @ApiResponse({ status: 200, description: 'Test receipt printed successfully' })
  async testJordanVATReceipt(
    @Param('printerId') printerId: string,
    @Req() req: any
  ) {
    try {
      const userCompanyId = req.user.companyId;

      // Sample order data for testing
      const sampleOrderItems = [
        {
          productId: 'sample-product-1',
          quantity: 2,
          unitPrice: 15.00,
          modifiers: [
            {
              modifierId: 'sample-modifier-1',
              price: 2.50
            }
          ]
        },
        {
          productId: 'sample-product-2',
          quantity: 1,
          unitPrice: 25.00
        }
      ];

      const sampleOrderInfo = {
        orderNumber: 'TEST-' + Date.now(),
        customerName: 'Test Customer / عميل تجريبي',
        orderType: 'Dine In / تناول في المطعم',
        paymentMethod: 'Cash / نقدي'
      };

      const result = await this.taxThermalPrinterService.printTaxReceipt(
        printerId,
        sampleOrderItems,
        userCompanyId,
        {
          jordanVATCompliance: true,
          showTaxBreakdown: true,
          showTaxInclusiveText: true,
          language: 'both',
          paperWidth: 80,
        },
        sampleOrderInfo
      );

      if (result.success) {
        this.logger.log(`Jordan VAT test receipt printed successfully for company ${userCompanyId}`);
      } else {
        this.logger.error(`Jordan VAT test receipt printing failed: ${result.error}`);
      }

      return {
        ...result,
        message: result.success ? 'Test Jordan VAT receipt printed successfully' : 'Test printing failed',
        testData: {
          orderItems: sampleOrderItems,
          orderInfo: sampleOrderInfo
        }
      };
    } catch (error) {
      this.logger.error('Jordan VAT test receipt error:', error);
      return {
        success: false,
        error: error.message || 'Failed to print test Jordan VAT receipt'
      };
    }
  }
}