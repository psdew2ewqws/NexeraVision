import { 
  IsString, 
  IsOptional, 
  IsEnum,
  IsBoolean,
  IsArray,
  MinLength,
  MaxLength
} from 'class-validator';
import { ConnectedType } from './branch-availability.dto';

export enum AlertType {
  LOW_STOCK = 'low_stock',
  OUT_OF_STOCK = 'out_of_stock',
  PRICING_SYNC_FAILED = 'pricing_sync_failed',
  SCHEDULE_CONFLICT = 'schedule_conflict',
  INVENTORY_MISMATCH = 'inventory_mismatch',
  PLATFORM_SYNC_ERROR = 'platform_sync_error'
}

export enum AlertSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

// Create alert DTO
export class CreateAvailabilityAlertDto {
  @IsEnum(AlertType)
  alertType: AlertType;

  @IsEnum(AlertSeverity)
  severity: AlertSeverity;

  @IsString()
  @MinLength(5)
  @MaxLength(200)
  title: string;

  @IsString()
  @MinLength(10)
  @MaxLength(1000)
  message: string;

  @IsOptional()
  @IsString()
  branchId?: string;

  @IsOptional()
  @IsString()
  connectedId?: string;

  @IsOptional()
  @IsEnum(ConnectedType)
  connectedType?: ConnectedType;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  channels?: string[]; // ['email', 'sms', 'push', 'webhook']
}

// Update alert DTO
export class UpdateAvailabilityAlertDto {
  @IsOptional()
  @IsBoolean()
  isRead?: boolean;

  @IsOptional()
  @IsBoolean()
  isResolved?: boolean;

  @IsOptional()
  @IsString()
  resolvedBy?: string;

  @IsOptional()
  @IsString()
  resolutionNotes?: string;
}

// Alert filters DTO
export class AlertFiltersDto {
  @IsOptional()
  @IsString()
  branchId?: string;

  @IsOptional()
  @IsEnum(AlertType)
  alertType?: AlertType;

  @IsOptional()
  @IsEnum(AlertSeverity)
  severity?: AlertSeverity;

  @IsOptional()
  @IsBoolean()
  isRead?: boolean;

  @IsOptional()
  @IsBoolean()
  isResolved?: boolean;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  sortBy?: 'createdAt' | 'severity' | 'alertType';

  @IsOptional()
  @IsEnum(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc';

  @IsOptional()
  @IsString()
  companyId?: string;
}

// Bulk alert operations DTO
export class BulkAlertOperationDto {
  @IsArray()
  @IsString({ each: true })
  alertIds: string[];

  @IsString()
  @IsEnum(['mark_read', 'mark_unread', 'resolve', 'delete'])
  operation: 'mark_read' | 'mark_unread' | 'resolve' | 'delete';

  @IsOptional()
  @IsString()
  reason?: string;
}