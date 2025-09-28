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
import { Logger, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../shared/common/guards/jwt-auth.guard';

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
  namespace: '/printing',
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

  afterInit(server: Server) {
    this.logger.log('Advanced Printing WebSocket Gateway initialized (2025)');
    this.startPrinterMonitoring();
    this.startJobProcessing();
    this.startAlertSystem();
  }

  handleConnection(client: Socket, ...args: any[]) {
    this.logger.log(`Client connected: ${client.id}`);
    this.connectedClients.set(client.id, client);
    
    // Send current printer statuses to new client
    const currentStatuses = Array.from(this.printerStatuses.values());
    client.emit('printerStatusBulk', currentStatuses);
    
    // Send active print jobs
    const activeJobs = Array.from(this.activePrintJobs.values());
    client.emit('printJobsBulk', activeJobs);
    
    // Send current alerts
    const allAlerts = Array.from(this.printerAlerts.values()).flat();
    client.emit('printerAlertsBulk', allAlerts);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
    this.connectedClients.delete(client.id);
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
    // Simulate printer status updates
    // In production, this would query actual printers via network, USB, etc.
    
    const mockPrinters = [
      {
        printerId: 'printer-1',
        status: 'online' as const,
        paperLevel: Math.random() * 100,
        temperature: 35 + Math.random() * 10,
        queueLength: Math.floor(Math.random() * 5),
        connectionType: 'network' as const,
        model: 'Epson TM-T88VI',
        manufacturer: 'Epson',
      },
      {
        printerId: 'printer-2', 
        status: 'online' as const,
        paperLevel: Math.random() * 100,
        temperature: 32 + Math.random() * 8,
        queueLength: Math.floor(Math.random() * 3),
        connectionType: 'usb' as const,
        model: 'Star TSP143III',
        manufacturer: 'Star Micronics',
      }
    ];

    for (const printer of mockPrinters) {
      const existingStatus = this.printerStatuses.get(printer.printerId);
      
      const updatedStatus: PrinterStatus = {
        ...printer,
        lastSeen: new Date(),
        totalJobs: existingStatus?.totalJobs || 0,
        completedJobs: existingStatus?.completedJobs || 0,
        errorJobs: existingStatus?.errorJobs || 0,
        averageJobTime: existingStatus?.averageJobTime || 30,
        firmwareVersion: '1.2.3',
        capabilities: ['cut', 'drawer', 'barcode', 'qr', 'graphics']
      };
      
      this.printerStatuses.set(printer.printerId, updatedStatus);
    }
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
}