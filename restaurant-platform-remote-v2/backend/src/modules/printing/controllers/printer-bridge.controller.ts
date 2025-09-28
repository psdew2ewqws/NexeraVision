import { Controller, Post, Body, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Public } from '../../../common/decorators/public.decorator';
import axios from 'axios';

@ApiTags('Printer Bridge')
@Controller('printer-bridge')
@Public()
export class PrinterBridgeController {
  private readonly logger = new Logger(PrinterBridgeController.name);
  private readonly PRINTER_SERVICE_URL = 'http://127.0.0.1:8182';

  @Post('test-print')
  @ApiOperation({
    summary: 'Bridge endpoint to test print via PrinterMaster service',
    description: 'Forwards print test requests directly to PrinterMaster service without WebSocket dependency'
  })
  async testPrint(@Body() printData: {
    printer: string;
    text?: string;
    id?: string;
  }) {
    try {
      this.logger.log(`[BRIDGE] Forwarding print test to PrinterMaster: ${printData.printer}`);

      const response = await axios.post(`${this.PRINTER_SERVICE_URL}/print`, {
        printer: printData.printer,
        text: printData.text || `Dashboard Test Print - ${new Date().toISOString()}`,
        id: printData.id || `bridge-test-${Date.now()}`
      }, {
        timeout: 10000,
        headers: {
          'Content-Type': 'application/json'
        }
      });

      this.logger.log(`[BRIDGE] PrinterMaster response:`, response.data);

      return {
        success: response.data.success,
        message: response.data.success
          ? 'Print job sent successfully via bridge'
          : 'Print job failed',
        data: response.data.data,
        method: 'Direct PrinterMaster Bridge',
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      this.logger.error(`[BRIDGE] Print request failed:`, error.message);

      return {
        success: false,
        message: 'Bridge connection to PrinterMaster failed',
        error: error.message,
        method: 'Direct PrinterMaster Bridge',
        timestamp: new Date().toISOString(),
        suggestion: 'Check if PrinterMaster service is running on port 8182'
      };
    }
  }

  @Post('get-printers')
  @ApiOperation({
    summary: 'Get available printers via PrinterMaster service',
    description: 'Retrieves printer list directly from PrinterMaster service'
  })
  async getPrinters() {
    try {
      this.logger.log(`[BRIDGE] Fetching printers from PrinterMaster`);

      const response = await axios.get(`${this.PRINTER_SERVICE_URL}/printers`, {
        timeout: 5000,
        headers: {
          'Content-Type': 'application/json'
        }
      });

      return {
        success: true,
        data: response.data.data,
        count: response.data.count,
        method: 'Direct PrinterMaster Bridge',
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      this.logger.error(`[BRIDGE] Printer discovery failed:`, error.message);

      return {
        success: false,
        message: 'Failed to retrieve printers from PrinterMaster',
        error: error.message,
        method: 'Direct PrinterMaster Bridge',
        timestamp: new Date().toISOString()
      };
    }
  }

  @Post('health')
  @ApiOperation({
    summary: 'Check PrinterMaster service health',
    description: 'Checks the health status of PrinterMaster service'
  })
  async checkHealth() {
    try {
      const response = await axios.get(`${this.PRINTER_SERVICE_URL}/health`, {
        timeout: 3000,
        headers: {
          'Content-Type': 'application/json'
        }
      });

      return {
        success: true,
        status: response.data.status,
        printerMasterHealthy: response.data.status !== 'failing',
        data: response.data,
        method: 'Direct PrinterMaster Bridge',
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      this.logger.error(`[BRIDGE] Health check failed:`, error.message);

      return {
        success: false,
        status: 'unreachable',
        printerMasterHealthy: false,
        error: error.message,
        method: 'Direct PrinterMaster Bridge',
        timestamp: new Date().toISOString()
      };
    }
  }
}