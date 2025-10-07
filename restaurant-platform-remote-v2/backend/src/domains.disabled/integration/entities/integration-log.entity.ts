export class IntegrationLog {
  id: string;
  companyId: string;
  apiKeyId?: string;
  type: 'request' | 'webhook' | 'error';
  method?: string;
  endpoint?: string;
  statusCode?: number;
  requestBody?: any;
  responseBody?: any;
  error?: string;
  duration: number;
  metadata?: Record<string, any>;
  createdAt: Date;
}

export interface IntegrationMetrics {
  totalRequests: number;
  successRate: number;
  averageResponseTime: number;
  errorRate: number;
  requestsByEndpoint: Array<{
    endpoint: string;
    count: number;
    avgResponseTime: number;
  }>;
  topErrors: Array<{
    error: string;
    count: number;
  }>;
  webhookDeliveryRate: number;
}
