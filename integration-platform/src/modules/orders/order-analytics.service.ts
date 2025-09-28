import { Injectable, Logger } from '@nestjs/common';
import { Cache } from 'cache-manager';
import { Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { PrismaService } from '../../shared/services/prisma.service';
import { Provider, OrderStatus, PaymentStatus } from '@prisma/client';

export interface OrderVolumeMetrics {
  provider: Provider;
  totalOrders: number;
  period: string;
  orders: Array<{
    date: string;
    count: number;
    revenue: number;
  }>;
}

export interface RevenueMetrics {
  totalRevenue: number;
  currency: string;
  period: string;
  byProvider: Array<{
    provider: Provider;
    revenue: number;
    orderCount: number;
    averageOrderValue: number;
  }>;
  trends: Array<{
    date: string;
    revenue: number;
    orderCount: number;
  }>;
}

export interface ProviderPerformanceMetrics {
  provider: Provider;
  totalOrders: number;
  completedOrders: number;
  completionRate: number;
  averageOrderValue: number;
  totalRevenue: number;
  averageDeliveryTime: number; // in minutes
  cancelledOrders: number;
  cancellationRate: number;
  peakOrderTimes: Array<{
    hour: number;
    orderCount: number;
  }>;
}

export interface GeographicDistribution {
  location: string;
  orderCount: number;
  revenue: number;
  averageOrderValue: number;
  customers: number;
}

export interface CustomerBehaviorMetrics {
  totalCustomers: number;
  returningCustomers: number;
  newCustomers: number;
  averageOrdersPerCustomer: number;
  averageCustomerValue: number;
  topCustomers: Array<{
    customerId: string;
    orderCount: number;
    totalSpent: number;
  }>;
}

export interface PeakOrderTimes {
  hourlyDistribution: Array<{
    hour: number;
    orderCount: number;
    revenue: number;
  }>;
  dailyDistribution: Array<{
    dayOfWeek: number;
    orderCount: number;
    revenue: number;
  }>;
  peakHours: number[];
  peakDays: number[];
}

@Injectable()
export class OrderAnalyticsService {
  private readonly logger = new Logger(OrderAnalyticsService.name);
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  constructor(
    private readonly prisma: PrismaService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  /**
   * Get order volume metrics by provider and time period
   */
  async getOrderVolumeByProvider(
    provider?: Provider,
    startDate?: Date,
    endDate?: Date,
    groupBy: 'hour' | 'day' | 'week' | 'month' = 'day',
  ): Promise<OrderVolumeMetrics[]> {
    const cacheKey = `order_volume_${provider || 'all'}_${startDate?.toISOString()}_${endDate?.toISOString()}_${groupBy}`;

    try {
      const cached = await this.cacheManager.get<OrderVolumeMetrics[]>(cacheKey);
      if (cached) {
        this.logger.debug(`Cache hit for order volume metrics: ${cacheKey}`);
        return cached;
      }

      const whereClause: any = {};
      if (provider) whereClause.provider = provider;
      if (startDate && endDate) {
        whereClause.createdAt = {
          gte: startDate,
          lte: endDate,
        };
      }

      // Build SQL-like aggregation based on groupBy
      const dateFormat = this.getDateFormat(groupBy);

      const orders = await this.prisma.order.groupBy({
        by: ['provider'],
        where: whereClause,
        _count: {
          id: true,
        },
        _sum: {
          totalAmount: true,
        },
      });

      // Get detailed breakdown by date
      const detailedOrders = await this.prisma.order.findMany({
        where: whereClause,
        select: {
          provider: true,
          totalAmount: true,
          createdAt: true,
        },
        orderBy: {
          createdAt: 'asc',
        },
      });

      const result = orders.map(order => {
        const providerOrders = detailedOrders.filter(o => o.provider === order.provider);
        const ordersGrouped = this.groupOrdersByDate(providerOrders, groupBy);

        return {
          provider: order.provider,
          totalOrders: order._count.id,
          period: `${startDate?.toISOString().split('T')[0]} to ${endDate?.toISOString().split('T')[0]}`,
          orders: ordersGrouped,
        };
      });

      await this.cacheManager.set(cacheKey, result, this.CACHE_TTL);
      this.logger.log(`Order volume metrics calculated for ${result.length} providers`);

      return result;
    } catch (error) {
      this.logger.error(`Failed to get order volume metrics: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Get comprehensive revenue metrics
   */
  async getRevenueMetrics(
    startDate?: Date,
    endDate?: Date,
    currency: string = 'USD',
  ): Promise<RevenueMetrics> {
    const cacheKey = `revenue_metrics_${startDate?.toISOString()}_${endDate?.toISOString()}_${currency}`;

    try {
      const cached = await this.cacheManager.get<RevenueMetrics>(cacheKey);
      if (cached) return cached;

      const whereClause: any = {
        paymentStatus: PaymentStatus.PAID,
        currency: currency,
      };

      if (startDate && endDate) {
        whereClause.createdAt = {
          gte: startDate,
          lte: endDate,
        };
      }

      // Total revenue
      const totalRevenueResult = await this.prisma.order.aggregate({
        where: whereClause,
        _sum: {
          totalAmount: true,
        },
        _count: {
          id: true,
        },
      });

      // Revenue by provider
      const revenueByProvider = await this.prisma.order.groupBy({
        by: ['provider'],
        where: whereClause,
        _sum: {
          totalAmount: true,
        },
        _count: {
          id: true,
        },
        _avg: {
          totalAmount: true,
        },
      });

      // Revenue trends
      const orders = await this.prisma.order.findMany({
        where: whereClause,
        select: {
          totalAmount: true,
          createdAt: true,
        },
        orderBy: {
          createdAt: 'asc',
        },
      });

      const trends = this.groupOrdersByDate(orders, 'day');

      const result: RevenueMetrics = {
        totalRevenue: totalRevenueResult._sum.totalAmount || 0,
        currency,
        period: `${startDate?.toISOString().split('T')[0]} to ${endDate?.toISOString().split('T')[0]}`,
        byProvider: revenueByProvider.map(provider => ({
          provider: provider.provider,
          revenue: provider._sum.totalAmount || 0,
          orderCount: provider._count.id,
          averageOrderValue: provider._avg.totalAmount || 0,
        })),
        trends,
      };

      await this.cacheManager.set(cacheKey, result, this.CACHE_TTL);
      this.logger.log(`Revenue metrics calculated: ${result.totalRevenue} ${currency}`);

      return result;
    } catch (error) {
      this.logger.error(`Failed to get revenue metrics: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Get average order value by provider
   */
  async getAverageOrderValue(provider?: Provider, startDate?: Date, endDate?: Date): Promise<number> {
    const cacheKey = `aov_${provider || 'all'}_${startDate?.toISOString()}_${endDate?.toISOString()}`;

    try {
      const cached = await this.cacheManager.get<number>(cacheKey);
      if (cached !== undefined) return cached;

      const whereClause: any = {
        paymentStatus: PaymentStatus.PAID,
      };

      if (provider) whereClause.provider = provider;
      if (startDate && endDate) {
        whereClause.createdAt = {
          gte: startDate,
          lte: endDate,
        };
      }

      const result = await this.prisma.order.aggregate({
        where: whereClause,
        _avg: {
          totalAmount: true,
        },
      });

      const aov = result._avg.totalAmount || 0;
      await this.cacheManager.set(cacheKey, aov, this.CACHE_TTL);

      return aov;
    } catch (error) {
      this.logger.error(`Failed to get average order value: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Get order completion rates by provider
   */
  async getCompletionRates(provider?: Provider, startDate?: Date, endDate?: Date): Promise<number> {
    const cacheKey = `completion_rate_${provider || 'all'}_${startDate?.toISOString()}_${endDate?.toISOString()}`;

    try {
      const cached = await this.cacheManager.get<number>(cacheKey);
      if (cached !== undefined) return cached;

      const whereClause: any = {};
      if (provider) whereClause.provider = provider;
      if (startDate && endDate) {
        whereClause.createdAt = {
          gte: startDate,
          lte: endDate,
        };
      }

      const [totalOrders, completedOrders] = await Promise.all([
        this.prisma.order.count({ where: whereClause }),
        this.prisma.order.count({
          where: {
            ...whereClause,
            status: OrderStatus.DELIVERED,
          },
        }),
      ]);

      const completionRate = totalOrders > 0 ? (completedOrders / totalOrders) * 100 : 0;
      await this.cacheManager.set(cacheKey, completionRate, this.CACHE_TTL);

      return completionRate;
    } catch (error) {
      this.logger.error(`Failed to get completion rates: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Get peak ordering times analysis
   */
  async getPeakOrderTimes(
    provider?: Provider,
    startDate?: Date,
    endDate?: Date,
  ): Promise<PeakOrderTimes> {
    const cacheKey = `peak_times_${provider || 'all'}_${startDate?.toISOString()}_${endDate?.toISOString()}`;

    try {
      const cached = await this.cacheManager.get<PeakOrderTimes>(cacheKey);
      if (cached) return cached;

      const whereClause: any = {};
      if (provider) whereClause.provider = provider;
      if (startDate && endDate) {
        whereClause.createdAt = {
          gte: startDate,
          lte: endDate,
        };
      }

      const orders = await this.prisma.order.findMany({
        where: whereClause,
        select: {
          createdAt: true,
          totalAmount: true,
        },
      });

      const hourlyDistribution = Array.from({ length: 24 }, (_, hour) => ({
        hour,
        orderCount: 0,
        revenue: 0,
      }));

      const dailyDistribution = Array.from({ length: 7 }, (_, day) => ({
        dayOfWeek: day,
        orderCount: 0,
        revenue: 0,
      }));

      orders.forEach(order => {
        const hour = order.createdAt.getHours();
        const dayOfWeek = order.createdAt.getDay();

        hourlyDistribution[hour].orderCount++;
        hourlyDistribution[hour].revenue += order.totalAmount;

        dailyDistribution[dayOfWeek].orderCount++;
        dailyDistribution[dayOfWeek].revenue += order.totalAmount;
      });

      // Find peak hours (top 25%)
      const sortedHours = [...hourlyDistribution].sort((a, b) => b.orderCount - a.orderCount);
      const peakHours = sortedHours.slice(0, 6).map(h => h.hour);

      // Find peak days (top 25%)
      const sortedDays = [...dailyDistribution].sort((a, b) => b.orderCount - a.orderCount);
      const peakDays = sortedDays.slice(0, 2).map(d => d.dayOfWeek);

      const result: PeakOrderTimes = {
        hourlyDistribution,
        dailyDistribution,
        peakHours,
        peakDays,
      };

      await this.cacheManager.set(cacheKey, result, this.CACHE_TTL);
      this.logger.log(`Peak order times calculated for ${orders.length} orders`);

      return result;
    } catch (error) {
      this.logger.error(`Failed to get peak order times: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Get comprehensive provider performance metrics
   */
  async getProviderPerformance(
    provider: Provider,
    startDate?: Date,
    endDate?: Date,
  ): Promise<ProviderPerformanceMetrics> {
    const cacheKey = `provider_performance_${provider}_${startDate?.toISOString()}_${endDate?.toISOString()}`;

    try {
      const cached = await this.cacheManager.get<ProviderPerformanceMetrics>(cacheKey);
      if (cached) return cached;

      const whereClause: any = { provider };
      if (startDate && endDate) {
        whereClause.createdAt = {
          gte: startDate,
          lte: endDate,
        };
      }

      const [
        totalOrders,
        completedOrders,
        cancelledOrders,
        revenueData,
        deliveryTimes,
        peakTimes,
      ] = await Promise.all([
        this.prisma.order.count({ where: whereClause }),
        this.prisma.order.count({
          where: { ...whereClause, status: OrderStatus.DELIVERED },
        }),
        this.prisma.order.count({
          where: { ...whereClause, status: OrderStatus.CANCELLED },
        }),
        this.prisma.order.aggregate({
          where: { ...whereClause, paymentStatus: PaymentStatus.PAID },
          _sum: { totalAmount: true },
          _avg: { totalAmount: true },
        }),
        this.prisma.order.findMany({
          where: {
            ...whereClause,
            status: OrderStatus.DELIVERED,
            estimatedDeliveryTime: { not: null },
            actualDeliveryTime: { not: null },
          },
          select: {
            estimatedDeliveryTime: true,
            actualDeliveryTime: true,
          },
        }),
        this.getPeakOrderTimes(provider, startDate, endDate),
      ]);

      // Calculate average delivery time
      const avgDeliveryTime = deliveryTimes.length > 0
        ? deliveryTimes.reduce((sum, order) => {
            const diff = order.actualDeliveryTime!.getTime() - order.estimatedDeliveryTime!.getTime();
            return sum + (diff / (1000 * 60)); // Convert to minutes
          }, 0) / deliveryTimes.length
        : 0;

      const result: ProviderPerformanceMetrics = {
        provider,
        totalOrders,
        completedOrders,
        completionRate: totalOrders > 0 ? (completedOrders / totalOrders) * 100 : 0,
        averageOrderValue: revenueData._avg.totalAmount || 0,
        totalRevenue: revenueData._sum.totalAmount || 0,
        averageDeliveryTime: avgDeliveryTime,
        cancelledOrders,
        cancellationRate: totalOrders > 0 ? (cancelledOrders / totalOrders) * 100 : 0,
        peakOrderTimes: peakTimes.hourlyDistribution,
      };

      await this.cacheManager.set(cacheKey, result, this.CACHE_TTL);
      this.logger.log(`Provider performance metrics calculated for ${provider}`);

      return result;
    } catch (error) {
      this.logger.error(`Failed to get provider performance: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Get geographic distribution of orders
   */
  async getGeographicDistribution(
    provider?: Provider,
    startDate?: Date,
    endDate?: Date,
  ): Promise<GeographicDistribution[]> {
    const cacheKey = `geo_distribution_${provider || 'all'}_${startDate?.toISOString()}_${endDate?.toISOString()}`;

    try {
      const cached = await this.cacheManager.get<GeographicDistribution[]>(cacheKey);
      if (cached) return cached;

      const whereClause: any = {};
      if (provider) whereClause.provider = provider;
      if (startDate && endDate) {
        whereClause.createdAt = {
          gte: startDate,
          lte: endDate,
        };
      }

      // This is a simplified implementation - in reality, you'd parse deliveryAddress JSON
      const orders = await this.prisma.order.findMany({
        where: whereClause,
        select: {
          deliveryAddress: true,
          totalAmount: true,
          customerPhone: true,
        },
      });

      const locationMap = new Map<string, {
        orderCount: number;
        revenue: number;
        customers: Set<string>;
      }>();

      orders.forEach(order => {
        let location = 'Unknown';

        // Extract location from deliveryAddress JSON
        if (order.deliveryAddress && typeof order.deliveryAddress === 'object') {
          const addr = order.deliveryAddress as any;
          location = addr.city || addr.area || addr.district || 'Unknown';
        }

        if (!locationMap.has(location)) {
          locationMap.set(location, {
            orderCount: 0,
            revenue: 0,
            customers: new Set(),
          });
        }

        const locationData = locationMap.get(location)!;
        locationData.orderCount++;
        locationData.revenue += order.totalAmount;
        if (order.customerPhone) {
          locationData.customers.add(order.customerPhone);
        }
      });

      const result = Array.from(locationMap.entries()).map(([location, data]) => ({
        location,
        orderCount: data.orderCount,
        revenue: data.revenue,
        averageOrderValue: data.orderCount > 0 ? data.revenue / data.orderCount : 0,
        customers: data.customers.size,
      }));

      await this.cacheManager.set(cacheKey, result, this.CACHE_TTL);
      this.logger.log(`Geographic distribution calculated for ${result.length} locations`);

      return result;
    } catch (error) {
      this.logger.error(`Failed to get geographic distribution: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Get customer behavior metrics
   */
  async getCustomerBehaviorMetrics(
    provider?: Provider,
    startDate?: Date,
    endDate?: Date,
  ): Promise<CustomerBehaviorMetrics> {
    const cacheKey = `customer_behavior_${provider || 'all'}_${startDate?.toISOString()}_${endDate?.toISOString()}`;

    try {
      const cached = await this.cacheManager.get<CustomerBehaviorMetrics>(cacheKey);
      if (cached) return cached;

      const whereClause: any = {
        customerPhone: { not: null },
      };
      if (provider) whereClause.provider = provider;
      if (startDate && endDate) {
        whereClause.createdAt = {
          gte: startDate,
          lte: endDate,
        };
      }

      const orders = await this.prisma.order.findMany({
        where: whereClause,
        select: {
          customerPhone: true,
          totalAmount: true,
          createdAt: true,
        },
      });

      const customerMap = new Map<string, {
        orderCount: number;
        totalSpent: number;
        firstOrderDate: Date;
      }>();

      orders.forEach(order => {
        const customerId = order.customerPhone!;

        if (!customerMap.has(customerId)) {
          customerMap.set(customerId, {
            orderCount: 0,
            totalSpent: 0,
            firstOrderDate: order.createdAt,
          });
        }

        const customerData = customerMap.get(customerId)!;
        customerData.orderCount++;
        customerData.totalSpent += order.totalAmount;

        if (order.createdAt < customerData.firstOrderDate) {
          customerData.firstOrderDate = order.createdAt;
        }
      });

      const totalCustomers = customerMap.size;
      const returningCustomers = Array.from(customerMap.values())
        .filter(customer => customer.orderCount > 1).length;
      const newCustomers = totalCustomers - returningCustomers;

      const totalOrders = Array.from(customerMap.values())
        .reduce((sum, customer) => sum + customer.orderCount, 0);
      const totalRevenue = Array.from(customerMap.values())
        .reduce((sum, customer) => sum + customer.totalSpent, 0);

      const topCustomers = Array.from(customerMap.entries())
        .map(([customerId, data]) => ({
          customerId,
          orderCount: data.orderCount,
          totalSpent: data.totalSpent,
        }))
        .sort((a, b) => b.totalSpent - a.totalSpent)
        .slice(0, 10);

      const result: CustomerBehaviorMetrics = {
        totalCustomers,
        returningCustomers,
        newCustomers,
        averageOrdersPerCustomer: totalCustomers > 0 ? totalOrders / totalCustomers : 0,
        averageCustomerValue: totalCustomers > 0 ? totalRevenue / totalCustomers : 0,
        topCustomers,
      };

      await this.cacheManager.set(cacheKey, result, this.CACHE_TTL);
      this.logger.log(`Customer behavior metrics calculated for ${totalCustomers} customers`);

      return result;
    } catch (error) {
      this.logger.error(`Failed to get customer behavior metrics: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Clear analytics cache
   */
  async clearCache(pattern?: string): Promise<void> {
    try {
      if (pattern) {
        // Note: This is a simplified implementation
        // In production, you might use Redis with pattern-based deletion
        this.logger.log(`Cache pattern clearing not fully implemented for: ${pattern}`);
      } else {
        await this.cacheManager.reset();
        this.logger.log('Analytics cache cleared successfully');
      }
    } catch (error) {
      this.logger.error(`Failed to clear cache: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Helper method to get appropriate date format for grouping
   */
  private getDateFormat(groupBy: 'hour' | 'day' | 'week' | 'month'): string {
    switch (groupBy) {
      case 'hour':
        return '%Y-%m-%d %H:00:00';
      case 'day':
        return '%Y-%m-%d';
      case 'week':
        return '%Y-%u';
      case 'month':
        return '%Y-%m';
      default:
        return '%Y-%m-%d';
    }
  }

  /**
   * Helper method to group orders by date
   */
  private groupOrdersByDate(
    orders: Array<{ createdAt: Date; totalAmount: number }>,
    groupBy: 'hour' | 'day' | 'week' | 'month',
  ): Array<{ date: string; count: number; revenue: number }> {
    const groups = new Map<string, { count: number; revenue: number }>();

    orders.forEach(order => {
      let key: string;
      const date = order.createdAt;

      switch (groupBy) {
        case 'hour':
          key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:00`;
          break;
        case 'day':
          key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
          break;
        case 'week':
          const weekStart = new Date(date);
          weekStart.setDate(date.getDate() - date.getDay());
          key = `${weekStart.getFullYear()}-W${String(Math.ceil((weekStart.getDate()) / 7)).padStart(2, '0')}`;
          break;
        case 'month':
          key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          break;
        default:
          key = date.toISOString().split('T')[0];
      }

      if (!groups.has(key)) {
        groups.set(key, { count: 0, revenue: 0 });
      }

      const group = groups.get(key)!;
      group.count++;
      group.revenue += order.totalAmount;
    });

    return Array.from(groups.entries())
      .map(([date, data]) => ({
        date,
        count: data.count,
        revenue: data.revenue,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }
}