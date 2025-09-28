import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  OneToMany,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { PrinterStatusLog } from './printer-status-log.entity';
import { PrinterTestResult } from './printer-test-result.entity';

export type ConnectionType = 'USB' | 'Network' | 'Bluetooth';
export type PrinterStatus = 'online' | 'offline' | 'error' | 'testing' | 'unknown';

export interface PrinterCapabilities {
  maxWidth?: number;
  maxHeight?: number;
  dpi?: number;
  colorSupport?: boolean;
  paperSizes?: string[];
  features?: string[];
}

export interface PrinterSettings {
  density?: number;
  speed?: number;
  paperSize?: string;
  orientation?: 'portrait' | 'landscape';
  margins?: {
    top: number;
    bottom: number;
    left: number;
    right: number;
  };
}

@Entity('printers')
@Index(['branchId', 'status'])
@Index(['companyId', 'status'])
@Index(['branchId', 'printerId'], { unique: true })
@Index(['connectionType', 'status'])
@Index(['lastSeen'], { where: 'status IN (\'online\', \'offline\')' })
export class Printer {
  @ApiProperty({
    description: 'Unique printer identifier',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({
    description: 'Branch ID this printer belongs to',
    example: '123e4567-e89b-12d3-a456-426614174001',
  })
  @Column({ name: 'branch_id', type: 'uuid' })
  @Index()
  branchId: string;

  @ApiProperty({
    description: 'Company ID this printer belongs to',
    example: '123e4567-e89b-12d3-a456-426614174002',
  })
  @Column({ name: 'company_id', type: 'uuid' })
  @Index()
  companyId: string;

  @ApiProperty({
    description: 'Human-readable printer name',
    example: 'Kitchen Receipt Printer',
    maxLength: 255,
  })
  @Column({ type: 'varchar', length: 255 })
  name: string;

  @ApiProperty({
    description: 'QZ Tray printer identifier',
    example: 'HP_LaserJet_Pro_M404n',
    maxLength: 255,
  })
  @Column({ name: 'printer_id', type: 'varchar', length: 255 })
  @Index()
  printerId: string;

  @ApiProperty({
    description: 'Printer driver name',
    example: 'HP Universal Printing PCL 6',
    maxLength: 255,
    required: false,
  })
  @Column({ name: 'driver_name', type: 'varchar', length: 255, nullable: true })
  driverName?: string;

  @ApiProperty({
    description: 'Connection type',
    enum: ['USB', 'Network', 'Bluetooth'],
    example: 'Network',
  })
  @Column({ name: 'connection_type', type: 'varchar', length: 50 })
  @Index()
  connectionType: ConnectionType;

  @ApiProperty({
    description: 'IP address for network printers',
    example: '192.168.1.100',
    required: false,
  })
  @Column({ name: 'ip_address', type: 'inet', nullable: true })
  @Index()
  ipAddress?: string;

  @ApiProperty({
    description: 'Port number for network printers',
    example: 9100,
    minimum: 1,
    maximum: 65535,
    required: false,
  })
  @Column({ type: 'integer', nullable: true })
  port?: number;

  @ApiProperty({
    description: 'MAC address for network/bluetooth printers',
    example: '00:1B:63:84:45:E6',
    pattern: '^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$',
    required: false,
  })
  @Column({ name: 'mac_address', type: 'varchar', length: 17, nullable: true })
  macAddress?: string;

  @ApiProperty({
    description: 'Current printer status',
    enum: ['online', 'offline', 'error', 'testing', 'unknown'],
    example: 'online',
  })
  @Column({ type: 'varchar', length: 50, default: 'unknown' })
  @Index()
  status: PrinterStatus;

  @ApiProperty({
    description: 'Last time printer was seen/responded',
    example: '2024-09-13T10:30:00.000Z',
    required: false,
  })
  @Column({ name: 'last_seen', type: 'timestamptz', nullable: true })
  @Index()
  lastSeen?: Date;

  @ApiProperty({
    description: 'Printer capabilities information',
    example: {
      maxWidth: 384,
      maxHeight: 0,
      dpi: 203,
      colorSupport: false,
      paperSizes: ['58mm', '80mm'],
      features: ['cut', 'drawer']
    },
    required: false,
  })
  @Column({ type: 'jsonb', default: '{}' })
  capabilities?: PrinterCapabilities;

  @ApiProperty({
    description: 'Printer-specific settings',
    example: {
      density: 8,
      speed: 3,
      paperSize: '80mm',
      orientation: 'portrait'
    },
    required: false,
  })
  @Column({ type: 'jsonb', default: '{}' })
  settings?: PrinterSettings;

  @ApiProperty({
    description: 'Record creation timestamp',
    example: '2024-09-13T10:00:00.000Z',
  })
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @ApiProperty({
    description: 'Record last update timestamp',
    example: '2024-09-13T10:30:00.000Z',
  })
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  // Relationships
  @OneToMany(() => PrinterStatusLog, statusLog => statusLog.printer)
  statusLogs: PrinterStatusLog[];

  @OneToMany(() => PrinterTestResult, testResult => testResult.printer)
  testResults: PrinterTestResult[];

  // Computed properties
  get isOnline(): boolean {
    return this.status === 'online';
  }

  get isHealthy(): boolean {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    return this.status === 'online' && 
           this.lastSeen && 
           this.lastSeen > fiveMinutesAgo;
  }

  get healthStatus(): 'healthy' | 'warning' | 'critical' {
    if (!this.lastSeen) return 'critical';
    
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    
    if (this.status === 'online' && this.lastSeen > fiveMinutesAgo) {
      return 'healthy';
    } else if (this.lastSeen > oneHourAgo) {
      return 'warning';
    } else {
      return 'critical';
    }
  }

  // Helper methods
  updateStatus(status: PrinterStatus, errorMessage?: string): void {
    this.status = status;
    this.lastSeen = new Date();
  }

  updateCapabilities(capabilities: PrinterCapabilities): void {
    this.capabilities = { ...this.capabilities, ...capabilities };
  }

  updateSettings(settings: PrinterSettings): void {
    this.settings = { ...this.settings, ...settings };
  }

  toJSON() {
    return {
      ...this,
      isOnline: this.isOnline,
      isHealthy: this.isHealthy,
      healthStatus: this.healthStatus,
    };
  }
}