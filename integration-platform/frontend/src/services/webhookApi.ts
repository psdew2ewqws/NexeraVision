import {
  WebhookConfig,
  RegisterWebhookDto,
  WebhookTestPayload,
  WebhookLog,
  WebhookStats,
  WebhookFilters,
  RetryQueueItem,
  WebhookMetrics,
  WebhookTestResult
} from '@/types/webhook';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001';

class WebhookApiService {
  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;

    const defaultOptions: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        // Add authorization header if available
        ...(typeof window !== 'undefined' && localStorage.getItem('authToken') && {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }),
      },
      ...options,
    };

    const response = await fetch(url, defaultOptions);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
      throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
  }

  // Webhook configuration management
  async getWebhookConfigs(): Promise<WebhookConfig[]> {
    return this.makeRequest<WebhookConfig[]>('/api/webhooks/configs');
  }

  async getWebhookConfig(id: string): Promise<WebhookConfig> {
    return this.makeRequest<WebhookConfig>(`/api/webhooks/configs/${id}`);
  }

  async createWebhook(data: RegisterWebhookDto): Promise<WebhookConfig> {
    return this.makeRequest<WebhookConfig>('/api/webhooks/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateWebhook(id: string, data: Partial<WebhookConfig>): Promise<WebhookConfig> {
    return this.makeRequest<WebhookConfig>(`/api/webhooks/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteWebhook(id: string): Promise<void> {
    return this.makeRequest<void>(`/api/webhooks/${id}`, {
      method: 'DELETE',
    });
  }

  // Webhook testing
  async testWebhook(id: string, payload: WebhookTestPayload): Promise<WebhookTestResult> {
    return this.makeRequest<WebhookTestResult>(`/api/webhooks/${id}/test`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async testWebhookUrl(url: string, payload: any): Promise<WebhookTestResult> {
    return this.makeRequest<WebhookTestResult>('/api/webhooks/test-url', {
      method: 'POST',
      body: JSON.stringify({ url, payload }),
    });
  }

  // Webhook logs and monitoring
  async getWebhookLogs(filters?: WebhookFilters): Promise<{
    logs: WebhookLog[];
    total: number;
    page: number;
    limit: number;
  }> {
    const queryParams = new URLSearchParams();

    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          queryParams.append(key, value.toString());
        }
      });
    }

    const queryString = queryParams.toString();
    const endpoint = `/api/webhooks/logs${queryString ? `?${queryString}` : ''}`;

    return this.makeRequest(endpoint);
  }

  async getWebhookStats(): Promise<WebhookStats> {
    return this.makeRequest<WebhookStats>('/api/webhooks/stats');
  }

  async getWebhookMetrics(period: '1h' | '24h' | '7d' | '30d'): Promise<WebhookMetrics> {
    return this.makeRequest<WebhookMetrics>(`/api/webhooks/metrics?period=${period}`);
  }

  // Retry queue management
  async getRetryQueue(): Promise<RetryQueueItem[]> {
    return this.makeRequest<RetryQueueItem[]>('/api/webhooks/retry-queue');
  }

  async retryFailedWebhook(id: string): Promise<void> {
    return this.makeRequest<void>(`/api/webhooks/retry/${id}`, {
      method: 'POST',
    });
  }

  async clearRetryQueue(): Promise<void> {
    return this.makeRequest<void>('/api/webhooks/retry-queue', {
      method: 'DELETE',
    });
  }

  // Webhook health and status
  async getWebhookHealth(): Promise<{
    status: 'healthy' | 'degraded' | 'down';
    timestamp: string;
    endpoints: Record<string, 'active' | 'inactive' | 'error'>;
  }> {
    return this.makeRequest('/api/webhooks/health');
  }

  async pingWebhook(id: string): Promise<{
    success: boolean;
    responseTime: number;
    status: number;
  }> {
    return this.makeRequest(`/api/webhooks/${id}/ping`, {
      method: 'POST',
    });
  }

  // Batch operations
  async testAllWebhooks(): Promise<WebhookTestResult[]> {
    return this.makeRequest<WebhookTestResult[]>('/api/webhooks/test-all', {
      method: 'POST',
    });
  }

  async toggleWebhook(id: string, isActive: boolean): Promise<WebhookConfig> {
    return this.makeRequest<WebhookConfig>(`/api/webhooks/${id}/toggle`, {
      method: 'PATCH',
      body: JSON.stringify({ isActive }),
    });
  }

  async duplicateWebhook(id: string): Promise<WebhookConfig> {
    return this.makeRequest<WebhookConfig>(`/api/webhooks/${id}/duplicate`, {
      method: 'POST',
    });
  }

  // Secret management
  async generateWebhookSecret(): Promise<{ secret: string }> {
    return this.makeRequest<{ secret: string }>('/api/webhooks/generate-secret', {
      method: 'POST',
    });
  }

  async rotateWebhookSecret(id: string): Promise<{ secret: string }> {
    return this.makeRequest<{ secret: string }>(`/api/webhooks/${id}/rotate-secret`, {
      method: 'POST',
    });
  }

  // Import/Export configurations
  async exportWebhookConfigs(): Promise<Blob> {
    const response = await fetch(`${API_BASE_URL}/api/webhooks/export`, {
      headers: {
        ...(typeof window !== 'undefined' && localStorage.getItem('authToken') && {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }),
      },
    });

    if (!response.ok) {
      throw new Error('Failed to export webhook configurations');
    }

    return response.blob();
  }

  async importWebhookConfigs(file: File): Promise<{ imported: number; errors: string[] }> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${API_BASE_URL}/api/webhooks/import`, {
      method: 'POST',
      body: formData,
      headers: {
        ...(typeof window !== 'undefined' && localStorage.getItem('authToken') && {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }),
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Import failed' }));
      throw new Error(errorData.message || 'Failed to import webhook configurations');
    }

    return response.json();
  }

  // Provider-specific operations
  async syncProviderEvents(provider: string): Promise<void> {
    return this.makeRequest<void>(`/api/webhooks/providers/${provider}/sync-events`, {
      method: 'POST',
    });
  }

  async getProviderMetadata(provider: string): Promise<any> {
    return this.makeRequest(`/api/webhooks/providers/${provider}/metadata`);
  }

  async validateProviderConfig(provider: string, config: any): Promise<{
    valid: boolean;
    errors: string[];
  }> {
    return this.makeRequest(`/api/webhooks/providers/${provider}/validate`, {
      method: 'POST',
      body: JSON.stringify(config),
    });
  }
}

export const webhookApi = new WebhookApiService();
export default webhookApi;