import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('printers')
@Index(['companyId', 'branchId']) // Performance index for tenant queries
@Index(['companyId', 'status']) // Status queries
@Index(['ip', 'port'], { unique: true }) // Prevent IP conflicts
export class Printer {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ 
    type: 'enum', 
    enum: ['thermal', 'receipt', 'kitchen', 'label', 'barcode'],
    default: 'receipt'
  })
  type: string;

  @Column({ 
    type: 'enum', 
    enum: ['network', 'usb', 'bluetooth', 'serial', 'menuhere'],
    default: 'network'
  })
  connection: string;

  @Column({ type: 'varchar', length: 45, nullable: true })
  ip?: string;

  @Column({ type: 'int', nullable: true, default: 9100 })
  port?: number;

  @Column({ type: 'varchar', length: 255, nullable: true })
  model?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  manufacturer?: string;

  @Column({ 
    type: 'enum', 
    enum: ['online', 'offline', 'error', 'unknown'],
    default: 'unknown'
  })
  status: string;

  @Column({ type: 'boolean', default: false })
  isDefault: boolean;

  @Column({ type: 'uuid' })
  companyId: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  companyName?: string;

  @Column({ type: 'uuid', nullable: true })
  branchId?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  branchName?: string;

  @Column({ 
    type: 'enum', 
    enum: ['kitchen', 'cashier', 'bar', 'all', 'management'],
    default: 'all'
  })
  assignedTo: string;

  @Column({ type: 'timestamp', nullable: true })
  lastSeen?: Date;

  @Column({ type: 'varchar', length: 255, nullable: true })
  location?: string;

  @Column({ type: 'int', nullable: true, default: 80 })
  paperWidth?: number; // in mm

  @Column({ type: 'json', nullable: true })
  capabilities?: string[]; // ['cut', 'text', 'graphics', 'barcode', 'qrcode']

  @Column({ type: 'json', nullable: true })
  settings?: {
    baudRate?: number;
    dataBits?: number;
    stopBits?: number;
    parity?: string;
    encoding?: string;
    autoConnect?: boolean;
    retryAttempts?: number;
    timeout?: number;
  };

  @Column({ type: 'json', nullable: true })
  menuHereConfig?: {
    printerName: string; // The name as seen by MenuHere
    isMenuHereManaged: boolean;
    lastMenuHereSync?: Date;
  };

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'varchar', length: 255, nullable: true })
  description?: string;

  @Column({ type: 'json', nullable: true })
  deliveryPlatforms?: {
    dhub?: boolean;
    careem?: boolean;
    talabat?: boolean;
    callCenter?: boolean;
    website?: boolean;
    [key: string]: boolean | undefined;
  };

  @Column({ type: 'varchar', length: 255, nullable: true })
  licenseKey?: string; // Branch ID used as license key for auto-detection

  @Column({ type: 'timestamp', nullable: true })
  lastAutoDetection?: Date;

  @Column({ type: 'varchar', length: 255, nullable: true })
  discoveryMethod?: string; // Method used to discover this printer (system, usb, network, etc.)

  @Column({ type: 'int', default: 0 })
  totalPrintJobs: number;

  @Column({ type: 'int', default: 0 })
  failedPrintJobs: number;

  @Column({ type: 'timestamp', nullable: true })
  lastPrintJob?: Date;

  @Column({ type: 'varchar', length: 255, nullable: true })
  errorMessage?: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Virtual properties for computed values
  get successRate(): number {
    if (this.totalPrintJobs === 0) return 100;
    return Math.round(((this.totalPrintJobs - this.failedPrintJobs) / this.totalPrintJobs) * 100);
  }

  get isNetworkPrinter(): boolean {
    return this.connection === 'network' && !!this.ip;
  }

  get isMenuHerePrinter(): boolean {
    return this.connection === 'menuhere' || this.menuHereConfig?.isMenuHereManaged;
  }

  get connectionString(): string {
    switch (this.connection) {
      case 'network':
        return `${this.ip}:${this.port}`;
      case 'menuhere':
        return this.menuHereConfig?.printerName || this.name;
      case 'usb':
        return `USB: ${this.model}`;
      case 'serial':
        return `Serial: ${this.model}`;
      default:
        return this.name;
    }
  }

  // Helper method to update status
  updateStatus(status: 'online' | 'offline' | 'error', errorMessage?: string) {
    this.status = status;
    this.lastSeen = new Date();
    if (errorMessage) {
      this.errorMessage = errorMessage;
    } else if (status === 'online') {
      this.errorMessage = null;
    }
  }

  // Helper method to increment job counters
  incrementJobCount(success: boolean) {
    this.totalPrintJobs++;
    if (!success) {
      this.failedPrintJobs++;
    }
    this.lastPrintJob = new Date();
  }

  // Helper methods for delivery platform management
  enablePlatform(platform: string) {
    if (!this.deliveryPlatforms) {
      this.deliveryPlatforms = {};
    }
    this.deliveryPlatforms[platform] = true;
  }

  disablePlatform(platform: string) {
    if (!this.deliveryPlatforms) {
      this.deliveryPlatforms = {};
    }
    this.deliveryPlatforms[platform] = false;
  }

  isPlatformEnabled(platform: string): boolean {
    return this.deliveryPlatforms?.[platform] === true;
  }

  getEnabledPlatforms(): string[] {
    if (!this.deliveryPlatforms) return [];
    return Object.keys(this.deliveryPlatforms).filter(platform => 
      this.deliveryPlatforms![platform] === true
    );
  }

  // License key validation
  isValidLicenseKey(licenseKey: string): boolean {
    // In a real implementation, this would validate against the Branch ID
    return licenseKey && licenseKey.length > 0;
  }

  updateAutoDetectionTimestamp() {
    this.lastAutoDetection = new Date();
  }
}