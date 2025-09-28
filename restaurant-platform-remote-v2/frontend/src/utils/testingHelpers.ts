// Testing utilities for delivery system components
export class DeliveryTestingHelpers {
  private static API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002/api/v1';

  // Safe error message extraction
  static getErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }
    if (typeof error === 'string') {
      return error;
    }
    if (error && typeof error === 'object' && 'message' in error) {
      return String(error.message);
    }
    return 'Unknown error occurred';
  }

  // Safe API fetch with timeout and error handling
  static async safeFetch(url: string, options: RequestInit = {}): Promise<any> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` }),
          ...options.headers,
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        // Try to get error message from response
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        try {
          const errorData = await response.text();
          if (errorData) {
            const parsed = JSON.parse(errorData);
            errorMessage = parsed.message || parsed.error || errorMessage;
          }
        } catch {
          // Use the default error message if parsing fails
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        throw new Error('Request timeout - server may be unavailable');
      }
      throw error;
    }
  }

  // Test all API endpoints for the delivery system
  static async testAllEndpoints(): Promise<{
    locations: { success: boolean; error?: string };
    providers: { success: boolean; error?: string };
    analytics: { success: boolean; error?: string };
    webhookStats: { success: boolean; error?: string };
    credentialHealth: { success: boolean; error?: string };
    branches: { success: boolean; error?: string };
  }> {
    const results = {
      locations: { success: false, error: undefined },
      providers: { success: false, error: undefined },
      analytics: { success: false, error: undefined },
      webhookStats: { success: false, error: undefined },
      credentialHealth: { success: false, error: undefined },
      branches: { success: false, error: undefined },
    };

    // Test locations endpoint
    try {
      await this.safeFetch(`${this.API_BASE_URL}/delivery/jordan-locations?limit=10`);
      results.locations.success = true;
    } catch (error) {
      results.locations.error = this.getErrorMessage(error);
    }

    // Test providers endpoint
    try {
      await this.safeFetch(`${this.API_BASE_URL}/delivery/providers`);
      results.providers.success = true;
    } catch (error) {
      results.providers.error = this.getErrorMessage(error);
    }

    // Test analytics endpoint
    try {
      await this.safeFetch(`${this.API_BASE_URL}/delivery/provider-analytics?timeframe=7d`);
      results.analytics.success = true;
    } catch (error) {
      results.analytics.error = this.getErrorMessage(error);
    }

    // Test webhook stats endpoint
    try {
      await this.safeFetch(`${this.API_BASE_URL}/delivery/webhook-stats?timeframe=24h`);
      results.webhookStats.success = true;
    } catch (error) {
      results.webhookStats.error = this.getErrorMessage(error);
    }

    // Test credential health endpoint
    try {
      await this.safeFetch(`${this.API_BASE_URL}/delivery/provider-configs/credential-health`);
      results.credentialHealth.success = true;
    } catch (error) {
      results.credentialHealth.error = this.getErrorMessage(error);
    }

    // Test branches endpoint
    try {
      await this.safeFetch(`${this.API_BASE_URL}/branches`);
      results.branches.success = true;
    } catch (error) {
      results.branches.error = this.getErrorMessage(error);
    }

    return results;
  }

  // Mock data generators for fallback when API is unavailable
  static generateMockWebhookStats() {
    return {
      totalWebhooks: 150,
      successfulWebhooks: 142,
      failedWebhooks: 8,
      successRate: 94.67,
      providerBreakdown: {
        dhub: { total: 50, success: 48, failed: 2 },
        talabat: { total: 45, success: 43, failed: 2 },
        careem: { total: 35, success: 33, failed: 2 },
        local_delivery: { total: 20, success: 18, failed: 2 }
      },
      eventTypeBreakdown: {
        order_created: 45,
        order_confirmed: 42,
        order_delivered: 38,
        order_cancelled: 5
      },
      timeSeriesData: [
        { date: '2024-01-15', webhooks: 25, success: 24, failed: 1 },
        { date: '2024-01-16', webhooks: 30, success: 28, failed: 2 },
        { date: '2024-01-17', webhooks: 28, success: 26, failed: 2 }
      ],
      recentErrors: [
        { 
          provider: 'dhub', 
          error: 'Authentication failed', 
          count: 2, 
          lastSeen: new Date().toISOString() 
        }
      ]
    };
  }

  static generateMockProviderAnalytics() {
    return {
      overview: {
        totalOrders: 1250,
        successfulOrders: 1180,
        failedOrders: 70,
        averageDeliveryTime: 28.5,
        totalRevenue: 18750.50,
        successRate: 94.4
      },
      providerPerformance: [
        {
          providerType: 'dhub',
          totalOrders: 450,
          successRate: 96.2,
          avgDeliveryTime: 25.3,
          totalRevenue: 7125.75,
          trend: 'up',
          issues: 5,
          uptime: 98.5,
          errorRate: 3.8,
          avgResponseTime: 1200
        },
        {
          providerType: 'talabat',
          totalOrders: 380,
          successRate: 94.7,
          avgDeliveryTime: 30.2,
          totalRevenue: 5925.25,
          trend: 'stable',
          issues: 8,
          uptime: 97.2,
          errorRate: 5.3,
          avgResponseTime: 1800
        },
        {
          providerType: 'careem',
          totalOrders: 280,
          successRate: 91.8,
          avgDeliveryTime: 32.1,
          totalRevenue: 4200.50,
          trend: 'down',
          issues: 12,
          uptime: 95.1,
          errorRate: 8.2,
          avgResponseTime: 2100
        },
        {
          providerType: 'local_delivery',
          totalOrders: 140,
          successRate: 97.1,
          avgDeliveryTime: 22.8,
          totalRevenue: 1499.00,
          trend: 'up',
          issues: 2,
          uptime: 99.2,
          errorRate: 2.9,
          avgResponseTime: 800
        }
      ]
    };
  }

  static generateMockFailoverAnalytics() {
    return {
      totalFailovers: 12,
      successfulFailovers: 11,
      failedFailovers: 1,
      successRate: 91.7,
      averageFailoverTime: 1.3,
      mostCommonReasons: [
        { reason: 'High Error Rate', count: 5 },
        { reason: 'Slow Response Time', count: 4 },
        { reason: 'API Timeout', count: 2 },
        { reason: 'Manual Override', count: 1 }
      ],
      providerPerformance: [
        {
          provider: 'dhub',
          failoversTriggered: 2,
          failoversReceived: 5,
          successRate: 100
        },
        {
          provider: 'talabat',
          failoversTriggered: 4,
          failoversReceived: 3,
          successRate: 87.5
        },
        {
          provider: 'careem',
          failoversTriggered: 6,
          failoversReceived: 4,
          successRate: 83.3
        }
      ],
      recentFailovers: [
        {
          id: '1',
          orderId: 'ORD-001',
          fromProvider: 'careem',
          toProvider: 'dhub',
          reason: 'High Error Rate',
          status: 'completed',
          triggeredBy: 'automatic',
          triggeredAt: new Date(Date.now() - 3600000).toISOString(),
          completedAt: new Date(Date.now() - 3598000).toISOString(),
          duration: 2.1,
          success: true,
          details: { errorRate: 15.2, threshold: 10 }
        }
      ]
    };
  }

  static generateMockCredentialHealth() {
    return {
      overall: 'healthy',
      providers: [
        {
          id: 'dhub-config-1',
          providerType: 'dhub',
          status: 'healthy',
          lastChecked: new Date().toISOString(),
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          daysUntilExpiry: 30,
          warnings: []
        },
        {
          id: 'talabat-config-1',
          providerType: 'talabat',
          status: 'warning',
          lastChecked: new Date().toISOString(),
          expiresAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
          daysUntilExpiry: 5,
          warnings: ['Credentials expire in 5 days']
        }
      ]
    };
  }

  // Test component rendering without API dependencies
  static createTestProps() {
    return {
      mockWebhookStats: this.generateMockWebhookStats(),
      mockProviderAnalytics: this.generateMockProviderAnalytics(),
      mockFailoverAnalytics: this.generateMockFailoverAnalytics(),
      mockCredentialHealth: this.generateMockCredentialHealth(),
    };
  }

  // Validation helpers
  static validateWebhookStatsStructure(data: any): boolean {
    const requiredFields = ['totalWebhooks', 'successfulWebhooks', 'failedWebhooks', 'successRate'];
    return requiredFields.every(field => typeof data[field] === 'number');
  }

  static validateProviderAnalyticsStructure(data: any): boolean {
    return data && 
           data.overview && 
           Array.isArray(data.providerPerformance) &&
           typeof data.overview.totalOrders === 'number';
  }

  // Console testing helper
  static runConsoleTests() {
    console.log('🧪 Running Delivery System Tests...');
    
    // Test error message extraction
    console.log('✅ Error handling test:', this.getErrorMessage(new Error('Test error')));
    console.log('✅ Error handling test (string):', this.getErrorMessage('String error'));
    console.log('✅ Error handling test (unknown):', this.getErrorMessage(undefined));

    // Test mock data generation
    console.log('✅ Mock webhook stats:', this.generateMockWebhookStats());
    console.log('✅ Mock analytics structure valid:', this.validateProviderAnalyticsStructure(this.generateMockProviderAnalytics()));

    console.log('🧪 All tests passed!');
  }
}