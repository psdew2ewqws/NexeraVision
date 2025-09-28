// Advanced WebSocket Gateway for Real-time Printer Monitoring - 2025 Edition
import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  WebSocketServer,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, UseGuards, Inject } from '@nestjs/common';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { PrismaService } from '../../database/prisma.service';

interface PrinterStatus {
  printerId: string;
  status: 'online' | 'offline' | 'busy' | 'error' | 'low_paper' | 'no_paper';
  paperLevel: number; // 0-100
  temperature: number;
  lastSeen: Date;
  queueLength: number;
  totalJobs: number;
  completedJobs: number;
  errorJobs: number;
  averageJobTime: number;
  connectionType: 'network' | 'usb' | 'bluetooth' | 'serial';
  firmwareVersion?: string;
  model?: string;
  manufacturer?: string;
  capabilities: string[];
}

interface RealTimePrintJob {
  id: string;
  printerId: string;
  status: 'queued' | 'printing' | 'completed' | 'failed' | 'cancelled';
  progress: number; // 0-100
  startTime?: Date;
  endTime?: Date;
  error?: string;
  orderData?: any;
  estimatedTime?: number;
  actualTime?: number;
}

interface PrinterAlert {
  id: string;
  printerId: string;
  type: 'low_paper' | 'no_paper' | 'error' | 'offline' | 'high_temperature' | 'maintenance_due';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  timestamp: Date;
  acknowledged: boolean;
}

@WebSocketGateway({
  cors: {
    origin: ['http://localhost:3000', 'http://localhost:3001'],
    credentials: true,
  },
  namespace: '/printing-ws',
})
export class PrintingWebSocketGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private logger: Logger = new Logger('PrintingWebSocketGateway');
  private connectedClients = new Map<string, Socket>();
  private printerStatuses = new Map<string, PrinterStatus>();
  private activePrintJobs = new Map<string, RealTimePrintJob>();
  private printerAlerts = new Map<string, PrinterAlert[]>();

  constructor(private prisma: PrismaService) {}

  // ================================
  // Physical Printing Methods
  // ================================

  /**
   * Send physical print test to PrinterMaster
   */
  async sendPhysicalPrintTest(testData: any): Promise<any> {
    this.logger.log(`🖨️ [PHYSICAL-TEST] Sending test to PrinterMaster: ${testData.printerName}`);

    return new Promise((resolve) => {
      // Set up temporary listener for test results with cleanup
      const cleanupListeners: (() => void)[] = [];

      // Reduced timeout from 30s to 15s for faster user feedback
      const timeout = setTimeout(() => {
        // Clean up listeners on timeout
        cleanupListeners.forEach(cleanup => cleanup());
        this.logger.warn(`⏰ [PHYSICAL-TEST] Timeout after 15 seconds for printer: ${testData.printerName}`);
        resolve({
          success: false,
          message: 'PrinterMaster connection timeout - please check if desktop app is running',
          error: 'Timeout after 15 seconds',
          suggestion: 'Make sure RestaurantPrint Pro desktop app is running and connected'
        });
      }, 15000); // Reduced from 30000

      // Emit to all connected PrinterMaster clients
      const printerMasterClients = Array.from(this.connectedClients.values())
        .filter(client => client.handshake.auth?.userRole === 'desktop_app');

      this.logger.log(`🔍 [PHYSICAL-TEST] Found ${printerMasterClients.length} PrinterMaster clients`);

      if (printerMasterClients.length === 0) {
        clearTimeout(timeout);
        this.logger.warn(`❌ [PHYSICAL-TEST] No PrinterMaster clients connected`);
        resolve({
          success: false,
          message: 'RestaurantPrint Pro desktop app is not connected',
          error: 'PrinterMaster offline',
          suggestion: 'Please start the RestaurantPrint Pro desktop application'
        });
        return;
      }

      let responseReceived = false;
      const clientCount = printerMasterClients.length;

      // Listen for test result from any PrinterMaster client
      const handleTestResult = (result: any) => {
        if (!responseReceived && result.printerId === testData.printerId) {
          responseReceived = true;
          clearTimeout(timeout);
          // Clean up listeners on successful response
          cleanupListeners.forEach(cleanup => cleanup());
          this.logger.log(`✅ [PHYSICAL-TEST] Received response for printer: ${testData.printerName}, success: ${result.success}`);
          resolve({
            success: result.success,
            message: result.message || (result.success ? 'Physical print test completed successfully' : 'Physical print test failed'),
            error: result.error,
            timestamp: result.timestamp,
            clientsAvailable: clientCount
          });
        }
      };

      // Set up temporary listener for test results
      printerMasterClients.forEach(client => {
        client.once('printer:test:result', handleTestResult);
        cleanupListeners.push(() => client.removeListener('printer:test:result', handleTestResult));
      });

      // Send test request to all PrinterMaster clients
      printerMasterClients.forEach(client => {
        try {
          client.emit('printer:test', testData);
          this.logger.log(`📤 [PHYSICAL-TEST] Test request sent to client: ${client.id}`);
        } catch (error) {
          this.logger.error(`❌ [PHYSICAL-TEST] Failed to send to client ${client.id}:`, error);
        }
      });

      this.logger.log(`📤 [PHYSICAL-TEST] Test request sent to ${printerMasterClients.length} PrinterMaster clients`);
    });
  }

  /**
   * Send physical print job to PrinterMaster
   */
  async sendPhysicalPrintJob(printJob: any): Promise<any> {
    this.logger.log(`🖨️ [PHYSICAL-JOB] Sending job to PrinterMaster: ${printJob.id}`);

    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        resolve({
          success: false,
          message: 'PrinterMaster connection timeout',
          error: 'Timeout after 60 seconds'
        });
      }, 60000);

      // Emit to all connected PrinterMaster clients
      const printerMasterClients = Array.from(this.connectedClients.values())
        .filter(client => client.handshake.auth?.userRole === 'desktop_app');

      if (printerMasterClients.length === 0) {
        clearTimeout(timeout);
        resolve({
          success: false,
          message: 'No PrinterMaster clients connected',
          error: 'PrinterMaster offline'
        });
        return;
      }

      let responseReceived = false;

      // Listen for job result from any PrinterMaster client
      const handleJobResult = (result: any) => {
        if (!responseReceived && result.jobId === printJob.id) {
          responseReceived = true;
          clearTimeout(timeout);
          resolve({
            success: result.success,
            message: result.message || 'Physical print job completed',
            error: result.error,
            timestamp: result.timestamp
          });
        }
      };

      // Set up temporary listener for job results
      printerMasterClients.forEach(client => {
        client.once('print:physical:result', handleJobResult);
      });

      // Send job request to all PrinterMaster clients
      printerMasterClients.forEach(client => {
        client.emit('print:physical', printJob);
      });

      this.logger.log(`📤 [PHYSICAL-JOB] Job request sent to ${printerMasterClients.length} PrinterMaster clients`);
    });
  }

  /**
   * Send raw print data to PrinterMaster
   */
  async sendRawPrintData(rawPrintData: any): Promise<any> {
    this.logger.log(`🔧 [RAW-PRINT] Sending raw data to PrinterMaster: ${rawPrintData.printerName}`);

    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        resolve({
          success: false,
          message: 'PrinterMaster connection timeout',
          error: 'Timeout after 30 seconds'
        });
      }, 30000);

      // Emit to all connected PrinterMaster clients
      const printerMasterClients = Array.from(this.connectedClients.values())
        .filter(client => client.handshake.auth?.userRole === 'desktop_app');

      if (printerMasterClients.length === 0) {
        clearTimeout(timeout);
        resolve({
          success: false,
          message: 'No PrinterMaster clients connected',
          error: 'PrinterMaster offline'
        });
        return;
      }

      let responseReceived = false;

      // Listen for raw print result from any PrinterMaster client
      const handleRawResult = (result: any) => {
        if (!responseReceived && result.printerName === rawPrintData.printerName) {
          responseReceived = true;
          clearTimeout(timeout);
          resolve({
            success: result.success,
            message: result.message || 'Raw print completed',
            error: result.error,
            timestamp: result.timestamp
          });
        }
      };

      // Set up temporary listener for raw print results
      printerMasterClients.forEach(client => {
        client.once('print:raw:result', handleRawResult);
      });

      // Send raw print request to all PrinterMaster clients
      printerMasterClients.forEach(client => {
        client.emit('print:raw', rawPrintData);
      });

      this.logger.log(`📤 [RAW-PRINT] Raw print request sent to ${printerMasterClients.length} PrinterMaster clients`);
    });
  }

  afterInit(server: Server) {
    this.logger.log('Advanced Printing WebSocket Gateway initialized (2025)');
    this.startPrinterMonitoring();
    this.startJobProcessing();
    this.startAlertSystem();
  }

  handleConnection(client: Socket, ...args: any[]) {
    this.logger.log(`Client connected: ${client.id}`);

    // Extract authentication data from handshake
    const auth = client.handshake.auth || {};
    const {
      token,
      licenseKey,
      branchId,
      companyId,
      deviceId,
      instanceId,
      userRole,
      appVersion
    } = auth;

    // Store client auth info
    client.data.auth = auth;
    client.data.userRole = userRole;
    client.data.branchId = branchId;
    client.data.companyId = companyId;

    // Log connection details
    if (userRole === 'desktop_app') {
      this.logger.log(`🖥️ [DESKTOP] Connected: Device ${deviceId} (${appVersion}) - Branch: ${branchId}`);
    } else {
      this.logger.log(`🌐 [WEB] Connected: ${userRole} - Branch: ${branchId}`);
    }

    // Join appropriate rooms
    if (branchId) {
      client.join(`branch_${branchId}`);
      this.logger.log(`👥 [ROOMS] Auto-joined branch room: ${branchId}`);
    }

    if (companyId) {
      client.join(`company_${companyId}`);
      this.logger.log(`👥 [ROOMS] Auto-joined company room: ${companyId}`);
    }

    this.connectedClients.set(client.id, client);

    // Send welcome message based on client type
    if (userRole === 'desktop_app') {
      client.emit('desktop:connected', {
        message: 'Desktop app connected successfully',
        timestamp: new Date().toISOString(),
        branchId,
        deviceId
      });

      // Request immediate printer status update from desktop app
      setTimeout(() => {
        client.emit('printer:status:request', {
          action: 'status_update',
          timestamp: new Date().toISOString(),
          branchId: branchId
        });
      }, 2000);
    } else {
      // For web clients, load real printer data from database and send current status
      this.loadAndSendRealPrinterData(client, branchId, companyId, userRole);

      // Send active print jobs
      const activeJobs = Array.from(this.activePrintJobs.values());
      client.emit('printJobsBulk', activeJobs);

      // Send current alerts
      const allAlerts = Array.from(this.printerAlerts.values()).flat();
      client.emit('printerAlertsBulk', allAlerts);
    }
  }

  // Load real printer data from database and send to web client
  private async loadAndSendRealPrinterData(client: Socket, branchId?: string, companyId?: string, userRole?: string) {
    try {
      // Build database query based on user role and access
      const where: any = {};

      if (userRole !== 'super_admin') {
        if (companyId) where.companyId = companyId;
        if (branchId) where.branchId = branchId;
      }

      // Get real printers from database
      const realPrinters = await this.prisma.printer.findMany({
        where,
        include: {
          company: { select: { id: true, name: true } },
          branch: { select: { id: true, name: true } }
        },
        orderBy: { name: 'asc' }
      });

      this.logger.log(`📊 [DB-SYNC] Loaded ${realPrinters.length} real printers from database for client ${client.id}`);

      // Convert database printers to PrinterStatus format for real-time tracking
      const printerStatuses: PrinterStatus[] = realPrinters.map(printer => ({
        printerId: printer.id,
        status: printer.status as any || 'online',
        paperLevel: 85,
        temperature: 35,
        lastSeen: printer.lastSeen || new Date(),
        queueLength: 0,
        totalJobs: 0,
        completedJobs: 0,
        errorJobs: 0,
        averageJobTime: 30,
        connectionType: printer.connection as any || 'network',
        firmwareVersion: '1.0.0',
        model: printer.model || printer.name,
        manufacturer: printer.manufacturer || 'Auto-detected',
        capabilities: printer.capabilities ? printer.capabilities.split(',') : []
      }));

      // Update internal status tracking
      printerStatuses.forEach(status => {
        this.printerStatuses.set(status.printerId, status);
      });

      // Send real printer statuses to web client
      client.emit('printerStatusBulk', printerStatuses);

      this.logger.log(`✅ [REAL-TIME] Sent ${printerStatuses.length} real printer statuses to web client`);

    } catch (error) {
      this.logger.error(`❌ [DB-SYNC] Failed to load real printer data:`, error);

      // Send empty array as fallback
      client.emit('printerStatusBulk', []);
    }
  }


  // Advanced printer status monitoring with AI predictions
  private startPrinterMonitoring(): void {
    setInterval(async () => {
      try {
        // Simulate advanced printer monitoring
        // In production, this would query actual printers
        await this.updatePrinterStatuses();
        
        // Broadcast status updates to all clients
        this.server.emit('printerStatusUpdate', Array.from(this.printerStatuses.values()));
        
        // Check for predictive maintenance needs
        await this.checkPredictiveMaintenance();
        
      } catch (error) {
        this.logger.error('Error in printer monitoring:', error);
      }
    }, 5000); // Every 5 seconds
  }

  // Advanced job processing with queue optimization
  private startJobProcessing(): void {
    setInterval(async () => {
      try {
        // Process print job queue with AI optimization
        await this.processJobQueue();
        
        // Update job statuses
        this.server.emit('printJobsUpdate', Array.from(this.activePrintJobs.values()));
        
      } catch (error) {
        this.logger.error('Error in job processing:', error);
      }
    }, 2000); // Every 2 seconds
  }

  // Advanced alert system with predictive warnings
  private startAlertSystem(): void {
    setInterval(async () => {
      try {
        // Check for printer alerts
        await this.checkPrinterAlerts();
        
        // Broadcast new alerts
        const allAlerts = Array.from(this.printerAlerts.values()).flat()
          .filter(alert => !alert.acknowledged);
        
        if (allAlerts.length > 0) {
          this.server.emit('printerAlerts', allAlerts);
        }
        
      } catch (error) {
        this.logger.error('Error in alert system:', error);
      }
    }, 10000); // Every 10 seconds
  }

  // Update printer statuses with advanced monitoring
  private async updatePrinterStatuses(): Promise<void> {
    // Only update existing printer statuses that have been discovered by real desktop apps
    // No more mock printers - only real discovered printers will be tracked
    
    for (const [printerId, status] of this.printerStatuses) {
      // Update timestamp for existing printers
      status.lastSeen = new Date();
      
      // You could add real status polling logic here in the future
      // For now, we just maintain the statuses of real discovered printers
    }
    
    this.logger.debug(`Updated ${this.printerStatuses.size} real printer statuses`);
  }

  // Predictive maintenance checking with AI
  private async checkPredictiveMaintenance(): Promise<void> {
    for (const [printerId, status] of this.printerStatuses) {
      // AI-powered predictive maintenance logic
      const maintenanceDue = this.calculateMaintenanceNeeds(status);
      
      if (maintenanceDue) {
        const alert: PrinterAlert = {
          id: `maint-${printerId}-${Date.now()}`,
          printerId,
          type: 'maintenance_due',
          severity: 'medium',
          message: `Printer ${printerId} is due for maintenance based on usage patterns`,
          timestamp: new Date(),
          acknowledged: false
        };
        
        this.addAlert(printerId, alert);
      }
    }
  }

  // Calculate maintenance needs using AI patterns
  private calculateMaintenanceNeeds(status: PrinterStatus): boolean {
    // Advanced AI logic would go here
    // For now, simple heuristics
    return (
      status.totalJobs > 1000 ||
      status.temperature > 50 ||
      status.errorJobs / Math.max(status.totalJobs, 1) > 0.1
    );
  }

  // Process job queue with AI optimization
  private async processJobQueue(): Promise<void> {
    // AI-powered job scheduling and optimization
    for (const [jobId, job] of this.activePrintJobs) {
      if (job.status === 'queued') {
        // Check if printer is available
        const printerStatus = this.printerStatuses.get(job.printerId);
        
        if (printerStatus?.status === 'online' && printerStatus.queueLength < 3) {
          // Start printing
          job.status = 'printing';
          job.startTime = new Date();
          job.progress = 0;
          
          // Simulate printing progress
          this.simulatePrintingProgress(job);
        }
      }
    }
  }

  // Simulate printing progress
  private simulatePrintingProgress(job: RealTimePrintJob): void {
    const progressInterval = setInterval(() => {
      job.progress += Math.random() * 20;
      
      if (job.progress >= 100) {
        job.progress = 100;
        job.status = 'completed';
        job.endTime = new Date();
        job.actualTime = job.endTime.getTime() - (job.startTime?.getTime() || 0);
        
        // Update printer stats
        const printerStatus = this.printerStatuses.get(job.printerId);
        if (printerStatus) {
          printerStatus.completedJobs++;
          printerStatus.queueLength = Math.max(0, printerStatus.queueLength - 1);
        }
        
        clearInterval(progressInterval);
        
        // Remove completed job after 30 seconds
        setTimeout(() => {
          this.activePrintJobs.delete(job.id);
        }, 30000);
      }
      
      // Broadcast job update
      this.server.emit('printJobUpdate', job);
    }, 1000);
  }

  // Check for printer alerts
  private async checkPrinterAlerts(): Promise<void> {
    for (const [printerId, status] of this.printerStatuses) {
      const alerts: PrinterAlert[] = [];
      
      // Paper level alerts
      if (status.paperLevel < 10) {
        alerts.push({
          id: `paper-${printerId}-${Date.now()}`,
          printerId,
          type: 'no_paper',
          severity: 'critical',
          message: `Printer ${printerId} is out of paper`,
          timestamp: new Date(),
          acknowledged: false
        });
      } else if (status.paperLevel < 25) {
        alerts.push({
          id: `paper-low-${printerId}-${Date.now()}`,
          printerId,
          type: 'low_paper',
          severity: 'medium',
          message: `Printer ${printerId} is low on paper (${Math.round(status.paperLevel)}%)`,
          timestamp: new Date(),
          acknowledged: false
        });
      }
      
      // Temperature alerts
      if (status.temperature > 55) {
        alerts.push({
          id: `temp-${printerId}-${Date.now()}`,
          printerId,
          type: 'high_temperature',
          severity: 'high',
          message: `Printer ${printerId} temperature is high (${Math.round(status.temperature)}°C)`,
          timestamp: new Date(),
          acknowledged: false
        });
      }
      
      // Offline alerts
      if (status.status === 'offline') {
        alerts.push({
          id: `offline-${printerId}-${Date.now()}`,
          printerId,
          type: 'offline',
          severity: 'high',
          message: `Printer ${printerId} is offline`,
          timestamp: new Date(),
          acknowledged: false
        });
      }
      
      // Add new alerts
      for (const alert of alerts) {
        this.addAlert(printerId, alert);
      }
    }
  }

  // Add alert to system
  private addAlert(printerId: string, alert: PrinterAlert): void {
    if (!this.printerAlerts.has(printerId)) {
      this.printerAlerts.set(printerId, []);
    }
    
    const printerAlerts = this.printerAlerts.get(printerId)!;
    
    // Check if similar alert already exists
    const existingAlert = printerAlerts.find(a => a.type === alert.type && !a.acknowledged);
    
    if (!existingAlert) {
      printerAlerts.push(alert);
      
      // Keep only last 50 alerts per printer
      if (printerAlerts.length > 50) {
        printerAlerts.splice(0, printerAlerts.length - 50);
      }
    }
  }

  // WebSocket message handlers
  @SubscribeMessage('requestPrinterStatus')
  @UseGuards(JwtAuthGuard)
  handlePrinterStatusRequest(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { printerId?: string }
  ) {
    if (data.printerId) {
      const status = this.printerStatuses.get(data.printerId);
      client.emit('printerStatus', status);
    } else {
      const allStatuses = Array.from(this.printerStatuses.values());
      client.emit('printerStatusBulk', allStatuses);
    }
  }

  @SubscribeMessage('submitPrintJob')
  @UseGuards(JwtAuthGuard)
  handlePrintJobSubmission(
    @ConnectedSocket() client: Socket,
    @MessageBody() jobData: {
      printerId: string;
      orderData: any;
      priority?: number;
      type: 'receipt' | 'kitchen' | 'label';
    }
  ) {
    const job: RealTimePrintJob = {
      id: `job-${Date.now()}-${Math.random()}`,
      printerId: jobData.printerId,
      status: 'queued',
      progress: 0,
      orderData: jobData.orderData,
      estimatedTime: this.estimateJobTime(jobData.orderData, jobData.type)
    };
    
    this.activePrintJobs.set(job.id, job);
    
    // Update printer queue length
    const printerStatus = this.printerStatuses.get(jobData.printerId);
    if (printerStatus) {
      printerStatus.queueLength++;
      printerStatus.totalJobs++;
    }
    
    client.emit('printJobSubmitted', { jobId: job.id });
    this.server.emit('printJobUpdate', job);
  }

  @SubscribeMessage('acknowledgeAlert')
  @UseGuards(JwtAuthGuard)
  handleAlertAcknowledgment(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { alertId: string }
  ) {
    // Find and acknowledge alert
    for (const [printerId, alerts] of this.printerAlerts) {
      const alert = alerts.find(a => a.id === data.alertId);
      if (alert) {
        alert.acknowledged = true;
        client.emit('alertAcknowledged', { alertId: data.alertId });
        break;
      }
    }
  }

  @SubscribeMessage('testPrinter')
  @UseGuards(JwtAuthGuard)
  handlePrinterTest(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { printerId: string }
  ) {
    // Submit test print job
    const testJob: RealTimePrintJob = {
      id: `test-${Date.now()}`,
      printerId: data.printerId,
      status: 'queued',
      progress: 0,
      orderData: {
        type: 'test',
        content: 'Test Print - System Check'
      },
      estimatedTime: 10
    };
    
    this.activePrintJobs.set(testJob.id, testJob);
    client.emit('testPrintSubmitted', { jobId: testJob.id });
  }

  // Estimate job printing time based on content
  private estimateJobTime(orderData: any, type: string): number {
    let baseTime = 15; // Base 15 seconds
    
    if (orderData.items) {
      baseTime += orderData.items.length * 3; // 3 seconds per item
    }
    
    if (type === 'kitchen') {
      baseTime += 5; // Kitchen orders take longer
    }
    
    if (orderData.qrCode) {
      baseTime += 8; // QR codes add time
    }
    
    return baseTime;
  }

  // Public methods for external services to call
  public broadcastPrinterStatus(printerId: string, status: PrinterStatus): void {
    this.printerStatuses.set(printerId, status);
    this.server.emit('printerStatusUpdate', [status]);
  }

  public broadcastPrintJobUpdate(job: RealTimePrintJob): void {
    this.activePrintJobs.set(job.id, job);
    this.server.emit('printJobUpdate', job);
  }

  public broadcastAlert(alert: PrinterAlert): void {
    this.addAlert(alert.printerId, alert);
    this.server.emit('printerAlerts', [alert]);
  }

  public broadcastPrinterRegistered(printer: any): void {
    this.server.emit('printerRegistered', printer);
    this.logger.log(`Broadcasted printer registration: ${printer.name}`);
  }

  public broadcastPrinterDiscovery(discoveredPrinters: any[]): void {
    this.server.emit('printerDiscovery', {
      timestamp: new Date(),
      discovered: discoveredPrinters.length,
      printers: discoveredPrinters
    });
    this.logger.log(`🔍 [WEBSOCKET] Broadcasted discovery of ${discoveredPrinters.length} printers`);
  }

  public broadcastPrinterUpdate(updateData: {
    action: 'discovered' | 'updated' | 'status_updated';
    printer: any;
    branchId: string;
    companyId: string;
  }): void {
    this.server.emit('printerUpdate', {
      ...updateData,
      timestamp: new Date(),
    });
    this.logger.log(`📡 [WEBSOCKET] Broadcasted printer ${updateData.action}: ${updateData.printer.name}`);
  }

  public broadcastPrintJob(jobData: {
    action: 'test_print' | 'print_job';
    job: any;
    printer: any;
    branchId: string;
    companyId: string;
  }): void {
    this.server.emit('printJobBroadcast', {
      ...jobData,
      timestamp: new Date(),
    });
    this.logger.log(`🖨️ [WEBSOCKET] Broadcasted ${jobData.action} for printer: ${jobData.printer.name}`);
  }

  // Phase 4 Enhanced Real-time Broadcasting Methods
  public broadcastSystemAnalytics(analytics: any): void {
    this.server.emit('systemAnalyticsUpdate', {
      analytics,
      timestamp: new Date()
    });
    this.logger.log(`📊 [PHASE4] Broadcasted system analytics update`);
  }

  public broadcastCompanyDashboard(companyId: string, dashboard: any): void {
    this.server.emit('companyDashboardUpdate', {
      companyId,
      dashboard,
      timestamp: new Date()
    });
    this.logger.log(`🏢 [PHASE4] Broadcasted company dashboard update for ${companyId}`);
  }

  public broadcastTestProgress(testProgress: {
    reportId: string;
    printerId: string;
    testName: string;
    progress: number;
    status: string;
  }): void {
    this.server.emit('printerTestProgress', {
      ...testProgress,
      timestamp: new Date()
    });
    this.logger.log(`🧪 [PHASE4] Test progress: ${testProgress.testName} - ${testProgress.progress}%`);
  }

  public broadcastPredictiveAlert(alert: {
    printerId: string;
    printerName: string;
    alertType: string;
    severity: string;
    message: string;
    prediction: any;
  }): void {
    this.server.emit('predictiveMaintenanceAlert', {
      ...alert,
      timestamp: new Date()
    });
    this.logger.log(`🔮 [PHASE4] Predictive alert: ${alert.alertType} for ${alert.printerName}`);
  }

  public broadcastPerformanceMetrics(metrics: {
    printerId?: string;
    branchId?: string;
    companyId?: string;
    metrics: any;
  }): void {
    this.server.emit('performanceMetricsUpdate', {
      ...metrics,
      timestamp: new Date()
    });
    this.logger.log(`⚡ [PHASE4] Performance metrics update`);
  }

  public broadcastNetworkLatencyResults(results: {
    printerId: string;
    printerName: string;
    latency: number;
    throughput: number;
    packetLoss: number;
    stability: number;
  }): void {
    this.server.emit('networkLatencyTestCompleted', {
      ...results,
      timestamp: new Date()
    });
    this.logger.log(`🌐 [PHASE4] Network test completed for ${results.printerName}: ${results.latency}ms`);
  }

  public broadcastEnterpriseAlert(alert: {
    level: 'company' | 'branch' | 'system';
    severity: 'low' | 'medium' | 'high' | 'critical';
    type: string;
    message: string;
    affectedEntities: string[];
    actionRequired?: string;
  }): void {
    this.server.emit('enterpriseAlert', {
      ...alert,
      id: `ea_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      timestamp: new Date()
    });
    this.logger.log(`🚨 [PHASE4] Enterprise ${alert.severity} alert: ${alert.type}`);
  }

  public broadcastOptimizationRecommendation(recommendation: {
    type: 'performance' | 'cost' | 'maintenance' | 'efficiency';
    priority: 'low' | 'medium' | 'high' | 'critical';
    title: string;
    description: string;
    estimatedImpact: string;
    affectedPrinters: string[];
    actionSteps: string[];
  }): void {
    this.server.emit('optimizationRecommendation', {
      ...recommendation,
      id: `opt_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      timestamp: new Date()
    });
    this.logger.log(`💡 [PHASE4] Optimization recommendation: ${recommendation.title}`);
  }

  // Desktop App Event Handlers
  @SubscribeMessage('printer:discovered')
  async handlePrinterDiscovered(
    @ConnectedSocket() client: Socket,
    @MessageBody() printerData: {
      id: string;
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
    }
  ) {
    try {
      this.logger.log(`🔍 [DISCOVERY] Printer discovered: ${printerData.name} (${printerData.type})`);
      
      // Get branch information to extract companyId
      const branch = await this.prisma.branch.findUnique({
        where: { id: printerData.branchId },
        select: { id: true, companyId: true }
      });
      
      if (!branch) {
        this.logger.error(`Branch not found: ${printerData.branchId}`);
        client.emit('printer:discovery:error', {
          error: 'Branch not found',
          printerId: printerData.id
        });
        return;
      }

      // Check if printer already exists, if not create it
      let printer = await this.prisma.printer.findFirst({
        where: {
          OR: [
            { id: printerData.id },
            { 
              AND: [
                { name: printerData.name },
                { branchId: printerData.branchId }
              ]
            }
          ]
        }
      });

      if (!printer) {
        // Create new printer record
        printer = await this.prisma.printer.create({
          data: {
            id: printerData.id,
            name: printerData.name,
            type: this.mapPrinterType(printerData.type),
            connection: this.mapConnectionType(printerData.connection),
            status: this.mapPrinterStatus(printerData.status),
            capabilities: printerData.capabilities?.join(','),
            companyId: branch.companyId,
            branchId: printerData.branchId,
            lastSeen: new Date()
          }
        });
        
        this.logger.log(`✅ [DATABASE] Created printer record: ${printer.name} (${printer.id})`);
      } else {
        // Update existing printer
        await this.prisma.printer.update({
          where: { id: printer.id },
          data: {
            status: this.mapPrinterStatus(printerData.status),
            lastSeen: new Date(),
            capabilities: printerData.capabilities?.join(',')
          }
        });
        
        this.logger.log(`🔄 [DATABASE] Updated printer record: ${printer.name} (${printer.id})`);
      }

      // Now create the printer discovery event record (after printer exists)
      const discoveryEvent = await this.prisma.printerDiscoveryEvent.create({
        data: {
          printerId: printer.id,  // Now this printer definitely exists
          printerName: printerData.name,
          printerType: printerData.type,
          connectionType: printerData.connection,
          discoveryMethod: this.mapDiscoveryMethod(printerData.discoveryMethod),
          discoveryStatus: 'registered',
          branchId: printerData.branchId,
          companyId: branch.companyId,
          discoveredBy: printerData.discoveredBy,
          deviceId: printerData.device,
          capabilities: printerData.capabilities || [],
          printerDetails: {
            systemPrinter: printerData.systemPrinter,
            originalStatus: printerData.status,
            discoveryTimestamp: printerData.timestamp
          },
          lastSeen: new Date(),
          firstDiscovered: new Date()
        }
      });

      this.logger.log(`📝 [DATABASE] Created discovery event: ${discoveryEvent.id}`);
      
      // Broadcast to all clients in the same branch
      this.server.to(`branch_${printerData.branchId}`).emit('printer:added', {
        printer: {
          ...printerData,
          id: printer.id,
          dbId: printer.id
        },
        timestamp: new Date().toISOString()
      });
      
      // Also broadcast to all connected clients
      this.server.emit('printerUpdate', {
        action: 'discovered',
        printer: {
          ...printerData,
          id: printer.id,
          dbId: printer.id
        },
        branchId: printerData.branchId,
        companyId: branch.companyId,
        timestamp: new Date().toISOString()
      });
      
      // Update local printer status
      const status: PrinterStatus = {
        printerId: printer.id,
        status: printerData.status as any || 'online',
        paperLevel: 100,
        temperature: 25,
        lastSeen: new Date(),
        queueLength: 0,
        totalJobs: 0,
        completedJobs: 0,
        errorJobs: 0,
        averageJobTime: 30,
        connectionType: printerData.connection as any || 'network',
        firmwareVersion: '1.0.0',
        model: printerData.name,
        manufacturer: 'Unknown',
        capabilities: printerData.capabilities || []
      };
      this.printerStatuses.set(printer.id, status);
      
      client.emit('printer:discovery:acknowledged', {
        printerId: printer.id,
        status: 'saved',
        timestamp: new Date().toISOString()
      });
      
      this.logger.log(`🎉 [SUCCESS] Printer discovery completed: ${printer.name} -> Frontend`);
      
    } catch (error) {
      this.logger.error(`❌ [ERROR] Failed to handle printer discovery:`, error);
      client.emit('printer:discovery:error', {
        error: error.message,
        printerId: printerData.id
      });
    }
  }

  // Helper methods for mapping enum values
  private mapDiscoveryMethod(method: string): any {
    const methodMap: any = {
      'auto': 'auto_network_scan',
      'usb': 'usb_detection',
      'manual': 'manual_add',
      'system': 'system_printer',
      'cups': 'cups_discovery',
      'websocket': 'websocket_broadcast'
    };
    return methodMap[method] || 'auto_network_scan';
  }

  private mapPrinterType(type: string): any {
    const typeMap: any = {
      'receipt': 'thermal',
      'thermal': 'thermal',
      'label': 'label',
      'inkjet': 'inkjet',
      'laser': 'laser'
    };
    return typeMap[type] || 'thermal';
  }

  private mapConnectionType(connection: string): any {
    const connectionMap: any = {
      'network': 'network',
      'ethernet': 'network', 
      'wifi': 'network',
      'usb': 'usb',
      'bluetooth': 'bluetooth',
      'serial': 'usb',  // Map serial to USB as fallback
      'menuhere': 'menuhere'
    };
    return connectionMap[connection] || 'network';
  }

  private mapPrinterStatus(status: string): any {
    const statusMap: any = {
      'online': 'online',
      'offline': 'offline',
      'connected': 'online',
      'disconnected': 'offline',
      'ready': 'online',
      'error': 'error'
    };
    return statusMap[status.toLowerCase()] || 'unknown';
  }

  @SubscribeMessage('desktop:status')
  handleDesktopStatus(
    @ConnectedSocket() client: Socket,
    @MessageBody() statusData: {
      status: string;
      timestamp: string;
      version: string;
    }
  ) {
    this.logger.log(`📱 [DESKTOP] Status update: ${statusData.status} (v${statusData.version})`);
    client.emit('desktop:status:acknowledged', {
      status: 'received',
      timestamp: new Date().toISOString()
    });

    // If desktop is connecting, request printer status updates
    if (statusData.status === 'connected' && client.handshake.auth?.branchId) {
      setTimeout(() => {
        this.requestPrinterStatusUpdate(client.handshake.auth.branchId);
      }, 2000); // Give desktop app time to fully initialize
    }
  }

  @SubscribeMessage('join:branch')
  handleJoinBranch(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { branchId: string }
  ) {
    client.join(`branch_${data.branchId}`);
    this.logger.log(`👥 [ROOMS] Client ${client.id} joined branch room: ${data.branchId}`);
    client.emit('branch:joined', {
      branchId: data.branchId,
      timestamp: new Date().toISOString()
    });
  }

  @SubscribeMessage('print:job:started')
  handlePrintJobStarted(
    @ConnectedSocket() client: Socket,
    @MessageBody() jobData: {
      jobId: string;
      printerId: string;
      timestamp: string;
    }
  ) {
    this.logger.log(`🖨️ [JOB] Print job started: ${jobData.jobId} on ${jobData.printerId}`);
    this.server.emit('print:job:status', {
      ...jobData,
      status: 'started'
    });
  }

  @SubscribeMessage('print:job:completed')
  handlePrintJobCompleted(
    @ConnectedSocket() client: Socket,
    @MessageBody() jobData: {
      jobId: string;
      printerId: string;
      success: boolean;
      timestamp: string;
    }
  ) {
    this.logger.log(`✅ [JOB] Print job completed: ${jobData.jobId} - Success: ${jobData.success}`);
    this.server.emit('print:job:status', {
      ...jobData,
      status: jobData.success ? 'completed' : 'failed'
    });
    
    // Update printer stats
    const printerStatus = this.printerStatuses.get(jobData.printerId);
    if (printerStatus) {
      if (jobData.success) {
        printerStatus.completedJobs++;
      } else {
        printerStatus.errorJobs++;
      }
      printerStatus.queueLength = Math.max(0, printerStatus.queueLength - 1);
    }
  }

  @SubscribeMessage('print:job:failed')
  handlePrintJobFailed(
    @ConnectedSocket() client: Socket,
    @MessageBody() jobData: {
      jobId: string;
      error: string;
      timestamp: string;
    }
  ) {
    this.logger.log(`❌ [JOB] Print job failed: ${jobData.jobId} - ${jobData.error}`);
    this.server.emit('print:job:status', {
      ...jobData,
      status: 'failed'
    });
  }

  @SubscribeMessage('printer:test:result')
  handlePrinterTestResult(
    @ConnectedSocket() client: Socket,
    @MessageBody() testData: {
      printerId: string;
      success: boolean;
      error?: string;
      timestamp: string;
    }
  ) {
    this.logger.log(`🧪 [TEST] Printer test result: ${testData.printerId} - Success: ${testData.success}`);
    this.server.emit('printer:test:completed', testData);
  }

  @SubscribeMessage('printer:status:update')
  handlePrinterStatusUpdate(
    @ConnectedSocket() client: Socket,
    @MessageBody() statusData: {
      printerIds: {
        id: string;
        name: string;
        status: string;
        lastSeen: string;
        capabilities?: string[];
      }[];
      branchId: string;
      timestamp: string;
    }
  ) {
    this.logger.log(`📊 [STATUS-UPDATE] Received status update for ${statusData.printerIds.length} printers from branch ${statusData.branchId}`);

    // Update local printer statuses and broadcast to web clients
    for (const printerUpdate of statusData.printerIds) {
      const status: PrinterStatus = {
        printerId: printerUpdate.id,
        status: printerUpdate.status as any || 'online',
        lastSeen: new Date(printerUpdate.lastSeen),
        paperLevel: 85,
        temperature: 35,
        queueLength: 0,
        totalJobs: 0,
        completedJobs: 0,
        errorJobs: 0,
        averageJobTime: 30,
        connectionType: 'network' as any,
        firmwareVersion: '1.0.0',
        model: printerUpdate.name,
        manufacturer: 'PrinterMaster',
        capabilities: printerUpdate.capabilities || []
      };

      this.printerStatuses.set(printerUpdate.id, status);

      // Broadcast to all web clients
      this.server.emit('printerStatusUpdate', [status]);
    }

    // Confirm status update received
    client.emit('printer:status:acknowledged', {
      printerCount: statusData.printerIds.length,
      branchId: statusData.branchId,
      timestamp: new Date().toISOString()
    });
  }

  // PHASE 1: AUTO-DISCOVERY TO BACKEND SYNC - ENHANCED WEBSOCKET EVENTS
  @SubscribeMessage('printer:sync:success')
  handlePrinterSyncSuccess(
    @ConnectedSocket() client: Socket,
    @MessageBody() syncData: {
      printer: any;
      backendId: string;
      timestamp: string;
    }
  ) {
    this.logger.log(`✅ [AUTO-SYNC] Printer synced successfully: ${syncData.printer.name} -> Backend ID: ${syncData.backendId}`);

    // Broadcast to all clients that a printer has been synced and is now available
    this.server.emit('printer:synced', {
      printer: syncData.printer,
      backendId: syncData.backendId,
      status: 'synced',
      timestamp: syncData.timestamp
    });

    // Also update the printer status map for real-time monitoring
    const status: PrinterStatus = {
      printerId: syncData.backendId,
      status: 'online',
      paperLevel: 100,
      temperature: 25,
      lastSeen: new Date(),
      queueLength: 0,
      totalJobs: 0,
      completedJobs: 0,
      errorJobs: 0,
      averageJobTime: 30,
      connectionType: syncData.printer.connection as any || 'network',
      firmwareVersion: '1.0.0',
      model: syncData.printer.name,
      manufacturer: syncData.printer.manufacturer || 'Auto-detected',
      capabilities: syncData.printer.capabilities || []
    };
    this.printerStatuses.set(syncData.backendId, status);
  }

  @SubscribeMessage('printer:sync:failed')
  handlePrinterSyncFailed(
    @ConnectedSocket() client: Socket,
    @MessageBody() failData: {
      printer: any;
      error: string;
      timestamp: string;
    }
  ) {
    this.logger.log(`❌ [AUTO-SYNC] Printer sync failed: ${failData.printer.name} - ${failData.error}`);

    // Broadcast sync failure to frontend
    this.server.emit('printer:sync:failed', {
      printer: failData.printer,
      error: failData.error,
      status: 'sync_failed',
      timestamp: failData.timestamp
    });
  }

  @SubscribeMessage('printer:sync:batch-completed')
  handlePrinterSyncBatchCompleted(
    @ConnectedSocket() client: Socket,
    @MessageBody() batchData: {
      batchId: string;
      results: {
        success: number;
        failed: number;
        duplicates: number;
        total: number;
      };
      timestamp: string;
    }
  ) {
    this.logger.log(`🎉 [AUTO-SYNC] Batch sync completed: ${batchData.batchId} - ${batchData.results.success}/${batchData.results.total} success`);

    // Broadcast batch completion statistics to frontend
    this.server.emit('printer:bulk-sync:completed', {
      batchId: batchData.batchId,
      results: batchData.results,
      message: `Bulk sync completed: ${batchData.results.success} success, ${batchData.results.failed} failed, ${batchData.results.duplicates} updated`,
      timestamp: batchData.timestamp
    });

    // Refresh printer list on frontend
    this.server.emit('printer:refresh-required', {
      reason: 'bulk_sync_completed',
      timestamp: batchData.timestamp
    });
  }

  // Enhanced WebSocket event handlers for Phase 4
  @SubscribeMessage('subscribeToCompanyUpdates')
  @UseGuards(JwtAuthGuard)
  handleCompanySubscription(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { companyId: string }
  ) {
    // Join company-specific room for targeted updates
    client.join(`company_${data.companyId}`);
    client.emit('subscriptionConfirmed', {
      type: 'company',
      id: data.companyId,
      message: 'Subscribed to company updates'
    });
    this.logger.log(`Client ${client.id} subscribed to company ${data.companyId} updates`);
  }

  @SubscribeMessage('subscribeToBranchUpdates')
  @UseGuards(JwtAuthGuard)
  handleBranchSubscription(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { branchId: string }
  ) {
    // Join branch-specific room for targeted updates
    client.join(`branch_${data.branchId}`);
    client.emit('subscriptionConfirmed', {
      type: 'branch',
      id: data.branchId,
      message: 'Subscribed to branch updates'
    });
    this.logger.log(`Client ${client.id} subscribed to branch ${data.branchId} updates`);
  }

  @SubscribeMessage('requestRealTimeMetrics')
  @UseGuards(JwtAuthGuard)
  handleRealTimeMetricsRequest(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { 
      type: 'printer' | 'branch' | 'company' | 'system';
      id?: string;
      interval?: number; // seconds
    }
  ) {
    const interval = Math.max(data.interval || 30, 10); // Minimum 10 seconds
    
    // Set up periodic metrics updates for this client
    const intervalId = setInterval(() => {
      // This would fetch real-time metrics based on type and id
      const metrics = this.generateRealTimeMetrics(data.type, data.id);
      client.emit('realTimeMetrics', {
        type: data.type,
        id: data.id,
        metrics,
        timestamp: new Date()
      });
    }, interval * 1000);
    
    // Store interval ID to clean up on disconnect
    client.data.metricsInterval = intervalId;
    
    client.emit('realTimeMetricsStarted', {
      type: data.type,
      id: data.id,
      interval,
      message: 'Real-time metrics streaming started'
    });
    
    this.logger.log(`Started real-time metrics for client ${client.id}: ${data.type}${data.id ? ` (${data.id})` : ''}`);
  }

  @SubscribeMessage('stopRealTimeMetrics')
  @UseGuards(JwtAuthGuard)
  handleStopRealTimeMetrics(@ConnectedSocket() client: Socket) {
    if (client.data.metricsInterval) {
      clearInterval(client.data.metricsInterval);
      delete client.data.metricsInterval;
      
      client.emit('realTimeMetricsStopped', {
        message: 'Real-time metrics streaming stopped'
      });
      
      this.logger.log(`Stopped real-time metrics for client ${client.id}`);
    }
  }

  // Helper method to generate real-time metrics
  private generateRealTimeMetrics(type: string, id?: string): any {
    // This would integrate with the analytics service to get actual metrics
    const baseMetrics = {
      timestamp: new Date(),
      type,
      id
    };
    
    switch (type) {
      case 'printer':
        return {
          ...baseMetrics,
          status: 'online',
          jobsInQueue: Math.floor(Math.random() * 5),
          responseTime: 50 + Math.random() * 100,
          temperature: 35 + Math.random() * 10,
          paperLevel: 50 + Math.random() * 50
        };
      case 'branch':
        return {
          ...baseMetrics,
          totalPrinters: 5,
          onlinePrinters: 4,
          totalJobs: Math.floor(Math.random() * 100),
          successRate: 90 + Math.random() * 10,
          averageResponseTime: 75 + Math.random() * 50
        };
      case 'company':
        return {
          ...baseMetrics,
          totalBranches: 10,
          totalPrinters: 50,
          activePrinters: 45,
          systemHealth: 90 + Math.random() * 10,
          totalJobsToday: Math.floor(Math.random() * 1000)
        };
      case 'system':
        return {
          ...baseMetrics,
          globalThroughput: 500 + Math.random() * 200,
          systemEfficiency: 85 + Math.random() * 15,
          activeConnections: this.connectedClients.size,
          systemLoad: Math.random() * 30
        };
      default:
        return baseMetrics;
    }
  }

  // Enhanced disconnect handling
  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);

    // Clean up real-time metrics intervals
    if (client.data.metricsInterval) {
      clearInterval(client.data.metricsInterval);
    }

    this.connectedClients.delete(client.id);
  }

  /**
   * Check if PrinterMaster desktop app is connected for a specific branch
   */
  public async checkPrinterMasterConnection(branchId: string): Promise<boolean> {
    const printerMasterClients = Array.from(this.connectedClients.values())
      .filter(client =>
        client.handshake.auth?.userRole === 'desktop_app' &&
        client.handshake.auth?.branchId === branchId
      );

    return printerMasterClients.length > 0;
  }

  /**
   * Send heartbeat to PrinterMaster clients to keep printers alive
   */
  public async sendPrinterHeartbeat(branchId: string, printerIds: string[]): Promise<void> {
    const printerMasterClients = Array.from(this.connectedClients.values())
      .filter(client =>
        client.handshake.auth?.userRole === 'desktop_app' &&
        client.handshake.auth?.branchId === branchId
      );

    if (printerMasterClients.length > 0) {
      const heartbeatData = {
        action: 'heartbeat',
        printerIds: printerIds,
        timestamp: new Date().toISOString(),
        branchId: branchId
      };

      printerMasterClients.forEach(client => {
        client.emit('printer:heartbeat', heartbeatData);
      });

      this.logger.debug(`💓 [HEARTBEAT] Sent to ${printerMasterClients.length} PrinterMaster clients for branch ${branchId}`);
    }
  }

  /**
   * Request printer status update from PrinterMaster
   */
  public async requestPrinterStatusUpdate(branchId: string, printerIds?: string[]): Promise<void> {
    const printerMasterClients = Array.from(this.connectedClients.values())
      .filter(client =>
        client.handshake.auth?.userRole === 'desktop_app' &&
        client.handshake.auth?.branchId === branchId
      );

    if (printerMasterClients.length > 0) {
      const statusRequest = {
        action: 'status_update',
        printerIds: printerIds || [],
        timestamp: new Date().toISOString(),
        branchId: branchId
      };

      printerMasterClients.forEach(client => {
        client.emit('printer:status:request', statusRequest);
      });

      this.logger.log(`🔄 [STATUS-REQUEST] Requested status update from ${printerMasterClients.length} PrinterMaster clients`);
    }
  }
}