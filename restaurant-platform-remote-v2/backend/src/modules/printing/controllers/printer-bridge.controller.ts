import { Controller, Post, Body, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Public } from '../../../common/decorators/public.decorator';
import { PrintingWebSocketGateway } from '../gateways/printing-websocket.gateway';
import axios from 'axios';

@ApiTags('Printer Bridge')
@Controller('printer-bridge')
@Public()
export class PrinterBridgeController {
  private readonly logger = new Logger(PrinterBridgeController.name);
  private readonly PRINTER_SERVICE_URL = 'http://127.0.0.1:8182';

  constructor(
    private readonly printingGateway: PrintingWebSocketGateway
  ) {}

  @Post('test-print')
  @ApiOperation({
    summary: 'Bridge endpoint to test print via WebSocket to remote PrinterMaster',
    description: 'Forwards print test requests via WebSocket to PrinterMaster Desktop App running in Jordan'
  })
  async testPrint(@Body() printData: {
    printer: string;
    text?: string;
    id?: string;
  }) {
    try {
      this.logger.log(`[BRIDGE] Forwarding print test via WebSocket to remote PrinterMaster: ${printData.printer}`);

      // Use WebSocket gateway to send test to remote PrinterMaster in Jordan
      const result = await this.printingGateway.sendPhysicalPrintTest({
        printerId: printData.printer,
        printerName: printData.printer,
        text: printData.text || `Web UI Test Print - ${new Date().toISOString()}`,
        id: printData.id || `bridge-test-${Date.now()}`
      });

      this.logger.log(`[BRIDGE] WebSocket response:`, result);

      return {
        success: result.success,
        message: result.message || (result.success
          ? 'Print job sent successfully via WebSocket'
          : 'Print job failed'),
        error: result.error,
        data: result,
        method: 'WebSocket to Remote PrinterMaster (Jordan)',
        timestamp: new Date().toISOString(),
        clientsAvailable: result.clientsAvailable
      };

    } catch (error) {
      this.logger.error(`[BRIDGE] WebSocket print request failed:`, error.message);

      return {
        success: false,
        message: 'Failed to send print job via WebSocket',
        error: error.message,
        method: 'WebSocket to Remote PrinterMaster (Jordan)',
        timestamp: new Date().toISOString(),
        suggestion: 'Check if PrinterMaster Desktop App is running and connected via WebSocket'
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