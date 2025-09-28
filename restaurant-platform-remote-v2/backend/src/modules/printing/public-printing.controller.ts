import {
  Controller,
  Get,
  Query,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { PrintingService } from './printing.service';

@ApiTags('Public Printing')
@Controller('public-printing')
export class PublicPrintingController {
  private readonly logger = new Logger(PublicPrintingController.name);

  constructor(
    private readonly printingService: PrintingService,
  ) {}

  // Test endpoint with no authentication
  @Get('test')
  @ApiOperation({ summary: 'Simple test endpoint without authentication' })
  @ApiResponse({ status: 200, description: 'Test endpoint working' })
  async testPublicEndpoint() {
    this.logger.log('[PUBLIC-TEST] Test endpoint called successfully');
    return {
      success: true,
      message: 'Public endpoint is working!',
      timestamp: new Date().toISOString(),
      version: '1.0.1'
    };
  }

  // Public endpoint for getting printers (no authentication)
  @Get('printers')
  @ApiOperation({ summary: 'Public endpoint to get all printers (for testing)' })
  @ApiResponse({ status: 200, description: 'Printers retrieved successfully' })
  @ApiQuery({ name: 'branchId', required: false, description: 'Branch ID filter' })
  async getPublicPrinters(@Query('branchId') branchId?: string) {
    try {
      this.logger.log(`[PUBLIC-PRINTERS] Getting printers for branch: ${branchId}`);
      
      // For testing, return all printers for the specific branch or all if no branch specified
      const targetBranchId = branchId || '40f863e7-b719-4142-8e94-724572002d9b';
      
      const printers = await this.printingService.getAllPrinters(
        undefined, // companyId
        targetBranchId,
        undefined, // limit
        undefined, // offset
        undefined  // status
      );

      this.logger.log(`[PUBLIC-PRINTERS] Found ${printers.length} printers`);

      return {
        success: true,
        printers,
        count: printers.length,
        branchId: targetBranchId
      };
    } catch (error) {
      this.logger.error(`[PUBLIC-PRINTERS] Error: ${error.message}`);
      return {
        success: false,
        message: 'Failed to get printers: ' + error.message,
        printers: [],
        count: 0
      };
    }
  }
}