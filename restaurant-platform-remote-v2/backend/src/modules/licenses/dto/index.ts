export * from './create-license.dto';
export * from './update-license.dto';

// Query DTOs for filtering and pagination
export class LicenseQueryDto {
  page?: number = 1;
  limit?: number = 10;
  status?: string;
  type?: string;
  search?: string;
  companyId?: string;
}

// Response DTOs
export class LicenseStatsDto {
  total: number;
  active: number;
  expired: number;
  trial: number;
  premium: number;
  expiringIn30Days: number;
  estimatedMonthlyRevenue: number;
}

export class LicenseNotificationDto {
  id: string;
  companyId: string;
  licenseId: string;
  type: string;
  title: string;
  message: string;
  severity: 'info' | 'warning' | 'critical';
  isRead: boolean;
  isDismissed: boolean;
  createdAt: Date;
  metadata?: Record<string, any>;
}