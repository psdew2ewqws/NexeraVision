import { apiClient } from './api-client';
import {
  WebhookConfig,
  RegisterWebhookDto,
  WebhookLog,
  WebhookStats,
  WebhookFilters,
  WebhookTestPayload,
  RetryQueueItem,
  WebhookMetrics,
  WebhookHealthStatus,
  SupportedProvider
} from '../types/webhook';

export class WebhookApi {
  // Register a new webhook
  static async registerWebhook(data: RegisterWebhookDto): Promise<WebhookConfig> {
    const response = await apiClient.post<WebhookConfig>('/webhooks/register', data);
    return response.data;
  }

  // Get all webhook configurations
  static async getWebhooks(clientId?: string): Promise<WebhookConfig[]> {
    const params = clientId ? { clientId } : {};
    const response = await apiClient.get<WebhookConfig[]>('/webhooks/config', { params });
    return response.data;
  }

  // Get specific webhook configuration
  static async getWebhookConfig(clientId: string): Promise<WebhookConfig> {
    const response = await apiClient.get<WebhookConfig>(`/webhooks/config/${clientId}`);
    return response.data;
  }

  // Update webhook configuration
  static async updateWebhookConfig(clientId: string, config: Partial<WebhookConfig>): Promise<WebhookConfig> {
    const response = await apiClient.post<WebhookConfig>(`/webhooks/config/${clientId}`, config);
    return response.data;
  }

  // Delete webhook
  static async deleteWebhook(webhookId: string): Promise<void> {
    await apiClient.delete(`/webhooks/${webhookId}`);
  }

  // Get webhook logs with filters
  static async getWebhookLogs(filters: WebhookFilters = {}): Promise<{
    logs: WebhookLog[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const response = await apiClient.get('/webhooks/logs', { params: filters });
    return response.data;
  }

  // Get webhook statistics
  static async getWebhookStats(filters: {
    provider?: SupportedProvider;
    clientId?: string;
    period?: '1h' | '24h' | '7d' | '30d';
  } = {}): Promise<WebhookStats> {
    const response = await apiClient.get<WebhookStats>('/webhooks/stats', { params: filters });
    return response.data;
  }

  // Get webhook metrics for charts
  static async getWebhookMetrics(filters: {
    provider?: SupportedProvider;
    clientId?: string;
    period?: '1h' | '24h' | '7d' | '30d';
  } = {}): Promise<WebhookMetrics> {
    const response = await apiClient.get<WebhookMetrics>('/webhooks/metrics', { params: filters });
    return response.data;
  }

  // Retry failed webhook
  static async retryWebhook(logId: string): Promise<void> {
    await apiClient.post(`/webhooks/retry/${logId}`);
  }

  // Get retry queue
  static async getRetryQueue(filters: {
    provider?: SupportedProvider;
    clientId?: string;
    status?: 'pending' | 'processing' | 'failed' | 'abandoned';
    limit?: number;
    offset?: number;
  } = {}): Promise<{
    items: RetryQueueItem[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const response = await apiClient.get('/webhooks/retry-queue', { params: filters });
    return response.data;
  }

  // Test webhook
  static async testWebhook(payload: WebhookTestPayload): Promise<{
    success: boolean;
    responseTime: number;
    status: number;
    response?: any;
    error?: string;
  }> {
    const response = await apiClient.post('/webhooks/test', payload);
    return response.data;
  }

  // Get webhook health status
  static async getHealthStatus(): Promise<WebhookHealthStatus> {
    const response = await apiClient.get<WebhookHealthStatus>('/webhooks/health');
    return response.data;
  }

  // Get real-time webhook events (for SSE)
  static subscribeToEvents(callback: (event: WebhookLog) => void): EventSource {
    const eventSource = new EventSource(`${process.env.NEXT_PUBLIC_API_URL}/webhooks/events`);

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        callback(data);
      } catch (error) {
        console.error('Error parsing webhook event:', error);
      }
    };

    eventSource.onerror = (error) => {
      console.error('Webhook events connection error:', error);
    };

    return eventSource;
  }

  // Bulk retry webhooks
  static async bulkRetryWebhooks(logIds: string[]): Promise<{
    success: number;
    failed: number;
    errors: string[];
  }> {
    const response = await apiClient.post('/webhooks/bulk-retry', { logIds });
    return response.data;
  }

  // Get webhook templates for different providers
  static async getWebhookTemplates(provider: SupportedProvider): Promise<{
    events: string[];
    samplePayloads: Record<string, any>;
    headers: Record<string, string>;
  }> {
    const response = await apiClient.get(`/webhooks/templates/${provider}`);
    return response.data;
  }

  // Validate webhook URL
  static async validateWebhookUrl(url: string): Promise<{
    valid: boolean;
    reachable: boolean;
    responseTime?: number;
    error?: string;
  }> {
    const response = await apiClient.post('/webhooks/validate-url', { url });
    return response.data;
  }

  // Get webhook security recommendations
  static async getSecurityRecommendations(clientId: string): Promise<{
    recommendations: {
      type: 'warning' | 'error' | 'info';
      message: string;
      action?: string;
    }[];
    securityScore: number;
  }> {
    const response = await apiClient.get(`/webhooks/security/${clientId}`);
    return response.data;
  }
}