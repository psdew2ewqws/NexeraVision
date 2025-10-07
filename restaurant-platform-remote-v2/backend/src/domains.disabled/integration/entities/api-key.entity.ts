export class ApiKey {
  id: string;
  name: string;
  key: string;
  hashedKey: string;
  companyId: string;
  scopes: string[];
  rateLimit: number;
  status: 'active' | 'revoked' | 'expired';
  expiresAt?: Date;
  lastUsedAt?: Date;
  usageCount: number;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

export interface ApiKeyUsageStats {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  lastUsed: Date;
  averageResponseTime: number;
  requestsByEndpoint: Record<string, number>;
  requestsByDay: Array<{
    date: string;
    count: number;
  }>;
}
