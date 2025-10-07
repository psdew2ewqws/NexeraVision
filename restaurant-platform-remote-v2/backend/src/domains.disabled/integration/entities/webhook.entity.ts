export class Webhook {
  id: string;
  companyId: string;
  name: string;
  url: string;
  events: string[];
  secret: string;
  status: 'active' | 'inactive' | 'failed';
  retryPolicy: {
    maxRetries: number;
    retryDelay: number;
    backoffMultiplier: number;
  };
  headers?: Record<string, string>;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
  lastTriggeredAt?: Date;
  failureCount: number;
}

export class WebhookDelivery {
  id: string;
  webhookId: string;
  event: string;
  payload: any;
  response?: {
    statusCode: number;
    body: string;
    headers: Record<string, string>;
  };
  status: 'pending' | 'success' | 'failed' | 'retrying';
  attempt: number;
  error?: string;
  createdAt: Date;
  deliveredAt?: Date;
  nextRetryAt?: Date;
}
