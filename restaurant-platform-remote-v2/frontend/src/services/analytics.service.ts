import { format, parse, isValid } from 'date-fns';
import { createApiUrl, apiCall } from '../shared/config/api';

export interface DateRange {
  startDate: Date;
  endDate: Date;
}

export interface FilterOptions {
  dateRange: DateRange;
  branches: string[];
  providers: string[];
  orderTypes: string[];
}

export interface OrderVolumeData {
  date: string;
  orders: number;
  revenue: number;
  averageOrderValue: number;
}

export interface RevenueData {
  provider: string;
  revenue: number;
  orders: number;
  percentage: number;
  growth: number;
}

export interface PerformanceMetrics {
  totalOrders: number;
  totalRevenue: number;
  averageOrderValue: number;
  orderGrowth: number;
  revenueGrowth: number;
  topPerformingBranch: string;
  peakHour: string;
  conversionRate: number;
}

export interface ProviderComparisonData {
  provider: string;
  orders: number;
  revenue: number;
  averageDeliveryTime: number;
  customerRating: number;
  commission: number;
  netRevenue: number;
}

export interface HeatmapDataPoint {
  date: string;
  hour: number;
  orders: number;
  intensity: number;
}

export interface AnalyticsData {
  metrics: PerformanceMetrics;
  orderVolume: OrderVolumeData[];
  revenue: RevenueData[];
  providerComparison: ProviderComparisonData[];
  heatmapData: HeatmapDataPoint[];
  peakHours: { hour: number; orders: number }[];
  geographicDistribution: { branch: string; latitude: number; longitude: number; orders: number }[];
}

export interface FilterOptionsData {
  branches: { id: string; name: string }[];
  providers: { id: string; name: string }[];
  orderTypes: { id: string; name: string }[];
}

class AnalyticsService {
  private cache = new Map<string, { data: any; timestamp: number; ttl: number }>();

  private getCacheKey(endpoint: string, params?: any): string {
    return `${endpoint}_${JSON.stringify(params)}`;
  }

  private getFromCache<T>(key: string): T | null {
    const cached = this.cache.get(key);
    if (!cached) return null;

    const now = Date.now();
    if (now > cached.timestamp + cached.ttl) {
      this.cache.delete(key);
      return null;
    }

    return cached.data as T;
  }

  private setCache(key: string, data: any, ttl: number = 5 * 60 * 1000): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }

  private formatDateForApi(date: Date): string {
    return format(date, 'yyyy-MM-dd');
  }

  private sanitizeFilters(filters: FilterOptions) {
    return {
      startDate: this.formatDateForApi(filters.dateRange.startDate),
      endDate: this.formatDateForApi(filters.dateRange.endDate),
      branches: filters.branches.filter(Boolean),
      providers: filters.providers.filter(Boolean),
      orderTypes: filters.orderTypes.filter(Boolean)
    };
  }

  async getAnalyticsData(filters: FilterOptions): Promise<AnalyticsData> {
    const sanitizedFilters = this.sanitizeFilters(filters);
    const cacheKey = this.getCacheKey('analytics_data', sanitizedFilters);

    const cached = this.getFromCache<AnalyticsData>(cacheKey);
    if (cached) return cached;

    try {
      const response = await apiCall('analytics/dashboard', {
        method: 'POST',
        body: JSON.stringify(sanitizedFilters)
      });

      // Process and validate the data
      const processedData = this.processAnalyticsData(response);

      // Cache for 5 minutes
      this.setCache(cacheKey, processedData, 5 * 60 * 1000);

      return processedData;
    } catch (error) {
      console.error('Error fetching analytics data:', error);

      // Return mock data for development/fallback
      return this.getMockAnalyticsData(filters);
    }
  }

  async getFilterOptions(): Promise<FilterOptionsData> {
    const cacheKey = this.getCacheKey('filter_options');

    const cached = this.getFromCache<FilterOptionsData>(cacheKey);
    if (cached) return cached;

    try {
      const response = await apiCall('analytics/filter-options', {
        method: 'GET'
      });

      // Cache for 15 minutes
      this.setCache(cacheKey, response, 15 * 60 * 1000);

      return response;
    } catch (error) {
      console.error('Error fetching filter options:', error);

      // Return mock data for development/fallback
      return {
        branches: [
          { id: '1', name: 'Main Branch' },
          { id: '2', name: 'Downtown Branch' },
          { id: '3', name: 'Mall Branch' }
        ],
        providers: [
          { id: '1', name: 'Careem' },
          { id: '2', name: 'Talabat' },
          { id: '3', name: 'Deliveroo' }
        ],
        orderTypes: [
          { id: '1', name: 'Delivery' },
          { id: '2', name: 'Pickup' },
          { id: '3', name: 'Dine-in' }
        ]
      };
    }
  }

  async exportData(filters: FilterOptions, format: 'csv' | 'pdf'): Promise<Blob> {
    const sanitizedFilters = this.sanitizeFilters(filters);

    try {
      const response = await fetch(createApiUrl(`analytics/export/${format}`), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth-token')}`
        },
        body: JSON.stringify(sanitizedFilters)
      });

      if (!response.ok) {
        throw new Error(`Export failed: ${response.status}`);
      }

      return await response.blob();
    } catch (error) {
      console.error('Error exporting data:', error);

      // Generate mock export for development
      const data = await this.getAnalyticsData(filters);
      return this.generateMockExport(data, format);
    }
  }

  private processAnalyticsData(rawData: any): AnalyticsData {
    // Validate and process order volume data
    const orderVolume: OrderVolumeData[] = (rawData.orderVolume || []).map((item: any) => ({
      date: this.validateDate(item.date),
      orders: Math.max(0, parseInt(item.orders) || 0),
      revenue: Math.max(0, parseFloat(item.revenue) || 0),
      averageOrderValue: Math.max(0, parseFloat(item.averageOrderValue) || 0)
    }));

    // Validate and process revenue data
    const revenue: RevenueData[] = (rawData.revenue || []).map((item: any) => ({
      provider: String(item.provider || 'Unknown'),
      revenue: Math.max(0, parseFloat(item.revenue) || 0),
      orders: Math.max(0, parseInt(item.orders) || 0),
      percentage: Math.min(100, Math.max(0, parseFloat(item.percentage) || 0)),
      growth: parseFloat(item.growth) || 0
    }));

    // Validate and process provider comparison data
    const providerComparison: ProviderComparisonData[] = (rawData.providerComparison || []).map((item: any) => ({
      provider: String(item.provider || 'Unknown'),
      orders: Math.max(0, parseInt(item.orders) || 0),
      revenue: Math.max(0, parseFloat(item.revenue) || 0),
      averageDeliveryTime: Math.max(0, parseInt(item.averageDeliveryTime) || 0),
      customerRating: Math.min(5, Math.max(0, parseFloat(item.customerRating) || 0)),
      commission: Math.max(0, parseFloat(item.commission) || 0),
      netRevenue: Math.max(0, parseFloat(item.netRevenue) || 0)
    }));

    // Validate and process heatmap data
    const heatmapData: HeatmapDataPoint[] = (rawData.heatmapData || []).map((item: any) => ({
      date: this.validateDate(item.date),
      hour: Math.min(23, Math.max(0, parseInt(item.hour) || 0)),
      orders: Math.max(0, parseInt(item.orders) || 0),
      intensity: Math.min(1, Math.max(0, parseFloat(item.intensity) || 0))
    }));

    // Validate metrics
    const metrics: PerformanceMetrics = {
      totalOrders: Math.max(0, parseInt(rawData.metrics?.totalOrders) || 0),
      totalRevenue: Math.max(0, parseFloat(rawData.metrics?.totalRevenue) || 0),
      averageOrderValue: Math.max(0, parseFloat(rawData.metrics?.averageOrderValue) || 0),
      orderGrowth: parseFloat(rawData.metrics?.orderGrowth) || 0,
      revenueGrowth: parseFloat(rawData.metrics?.revenueGrowth) || 0,
      topPerformingBranch: String(rawData.metrics?.topPerformingBranch || 'N/A'),
      peakHour: String(rawData.metrics?.peakHour || 'N/A'),
      conversionRate: Math.min(100, Math.max(0, parseFloat(rawData.metrics?.conversionRate) || 0))
    };

    return {
      metrics,
      orderVolume,
      revenue,
      providerComparison,
      heatmapData,
      peakHours: rawData.peakHours || [],
      geographicDistribution: rawData.geographicDistribution || []
    };
  }

  private validateDate(dateString: any): string {
    if (!dateString) return format(new Date(), 'yyyy-MM-dd');

    const parsed = parse(dateString, 'yyyy-MM-dd', new Date());
    if (isValid(parsed)) {
      return format(parsed, 'yyyy-MM-dd');
    }

    return format(new Date(), 'yyyy-MM-dd');
  }

  private getMockAnalyticsData(filters: FilterOptions): AnalyticsData {
    const now = new Date();
    const days = Math.floor((filters.dateRange.endDate.getTime() - filters.dateRange.startDate.getTime()) / (1000 * 60 * 60 * 24));

    // Generate mock order volume data
    const orderVolume: OrderVolumeData[] = [];
    for (let i = 0; i <= days; i++) {
      const date = new Date(filters.dateRange.startDate.getTime() + i * 24 * 60 * 60 * 1000);
      const orders = Math.floor(Math.random() * 100) + 50;
      const revenue = orders * (Math.random() * 30 + 15);

      orderVolume.push({
        date: format(date, 'yyyy-MM-dd'),
        orders,
        revenue: Math.round(revenue * 100) / 100,
        averageOrderValue: Math.round((revenue / orders) * 100) / 100
      });
    }

    const revenue: RevenueData[] = [
      { provider: 'Careem', revenue: 15000, orders: 500, percentage: 45, growth: 12.5 },
      { provider: 'Talabat', revenue: 12000, orders: 400, percentage: 36, growth: 8.3 },
      { provider: 'Deliveroo', revenue: 6300, orders: 210, percentage: 19, growth: -2.1 }
    ];

    const providerComparison: ProviderComparisonData[] = [
      {
        provider: 'Careem',
        orders: 500,
        revenue: 15000,
        averageDeliveryTime: 28,
        customerRating: 4.2,
        commission: 2250,
        netRevenue: 12750
      },
      {
        provider: 'Talabat',
        orders: 400,
        revenue: 12000,
        averageDeliveryTime: 32,
        customerRating: 4.0,
        commission: 1800,
        netRevenue: 10200
      },
      {
        provider: 'Deliveroo',
        orders: 210,
        revenue: 6300,
        averageDeliveryTime: 25,
        customerRating: 4.5,
        commission: 945,
        netRevenue: 5355
      }
    ];

    // Generate mock heatmap data
    const heatmapData: HeatmapDataPoint[] = [];
    for (let i = 0; i <= days; i++) {
      const date = new Date(filters.dateRange.startDate.getTime() + i * 24 * 60 * 60 * 1000);
      for (let hour = 0; hour < 24; hour++) {
        const orders = Math.floor(Math.random() * 20);
        heatmapData.push({
          date: format(date, 'yyyy-MM-dd'),
          hour,
          orders,
          intensity: orders / 20
        });
      }
    }

    const metrics: PerformanceMetrics = {
      totalOrders: 1110,
      totalRevenue: 33300,
      averageOrderValue: 30.0,
      orderGrowth: 15.2,
      revenueGrowth: 18.7,
      topPerformingBranch: 'Main Branch',
      peakHour: '19:00 - 20:00',
      conversionRate: 85.5
    };

    return {
      metrics,
      orderVolume,
      revenue,
      providerComparison,
      heatmapData,
      peakHours: [
        { hour: 12, orders: 45 },
        { hour: 19, orders: 78 },
        { hour: 20, orders: 65 }
      ],
      geographicDistribution: []
    };
  }

  private async generateMockExport(data: AnalyticsData, format: 'csv' | 'pdf'): Promise<Blob> {
    if (format === 'csv') {
      let csv = 'Date,Orders,Revenue,Average Order Value\n';
      data.orderVolume.forEach(item => {
        csv += `${item.date},${item.orders},${item.revenue},${item.averageOrderValue}\n`;
      });

      return new Blob([csv], { type: 'text/csv' });
    } else {
      // Mock PDF generation
      const pdfContent = `Analytics Report
Generated: ${format(new Date(), 'yyyy-MM-dd HH:mm:ss')}

Performance Metrics:
- Total Orders: ${data.metrics.totalOrders}
- Total Revenue: $${data.metrics.totalRevenue}
- Average Order Value: $${data.metrics.averageOrderValue}
- Order Growth: ${data.metrics.orderGrowth}%
- Revenue Growth: ${data.metrics.revenueGrowth}%

Provider Performance:
${data.providerComparison.map(p =>
  `- ${p.provider}: ${p.orders} orders, $${p.revenue} revenue`
).join('\n')}
`;

      return new Blob([pdfContent], { type: 'application/pdf' });
    }
  }

  // Cache management methods
  clearCache(): void {
    this.cache.clear();
  }

  getCacheSize(): number {
    return this.cache.size;
  }

  // Data aggregation utilities
  aggregateOrdersByPeriod(data: OrderVolumeData[], period: 'day' | 'week' | 'month'): OrderVolumeData[] {
    // Implementation for aggregating data by different time periods
    return data; // Simplified for now
  }

  calculateTrends(data: OrderVolumeData[]): { orderTrend: number; revenueTrend: number } {
    if (data.length < 2) return { orderTrend: 0, revenueTrend: 0 };

    const firstHalf = data.slice(0, Math.floor(data.length / 2));
    const secondHalf = data.slice(Math.floor(data.length / 2));

    const firstHalfAvgOrders = firstHalf.reduce((sum, item) => sum + item.orders, 0) / firstHalf.length;
    const secondHalfAvgOrders = secondHalf.reduce((sum, item) => sum + item.orders, 0) / secondHalf.length;

    const firstHalfAvgRevenue = firstHalf.reduce((sum, item) => sum + item.revenue, 0) / firstHalf.length;
    const secondHalfAvgRevenue = secondHalf.reduce((sum, item) => sum + item.revenue, 0) / secondHalf.length;

    const orderTrend = ((secondHalfAvgOrders - firstHalfAvgOrders) / firstHalfAvgOrders) * 100;
    const revenueTrend = ((secondHalfAvgRevenue - firstHalfAvgRevenue) / firstHalfAvgRevenue) * 100;

    return {
      orderTrend: Math.round(orderTrend * 100) / 100,
      revenueTrend: Math.round(revenueTrend * 100) / 100
    };
  }
}

export const analyticsService = new AnalyticsService();