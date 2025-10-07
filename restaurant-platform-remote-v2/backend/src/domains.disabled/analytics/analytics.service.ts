import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../shared/database/prisma.service';
import { BaseService, BaseUser } from '../../shared/common/services/base.service';

interface AnalyticsEntity {
  id: string;
  companyId?: string;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date | null;
}

@Injectable()
export class AnalyticsService extends BaseService<AnalyticsEntity> {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(protected prisma: PrismaService) {
    super(prisma, 'analytics');
  }

  /**
   * Get dashboard analytics data
   */
  async getDashboardAnalytics(currentUser: { id: string; companyId: string; role: string }, dateRange?: { startDate: Date; endDate: Date }) {
    try {
      const companyId = currentUser.role === 'super_admin' ? undefined : currentUser.companyId;
      const startDate = dateRange?.startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days ago
      const endDate = dateRange?.endDate || new Date();

      const whereClause = {
        ...(companyId && { branch: { companyId } }),
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      };

      // Get basic counts and metrics
      const [
        totalOrders,
        totalRevenue,
        activeProducts,
        activeBranches,
        recentOrders,
        topProducts,
        ordersByStatus,
        revenueByDay,
      ] = await Promise.all([
        // Total orders count - using mock data for now since Order model isn't available yet
        this.getMockOrderCount(companyId),
        
        // Total revenue - using mock data
        this.getMockRevenue(startDate, endDate, companyId),
        
        // Active products count
        this.prisma.menuProduct.count({
          where: {
            status: 1,
            ...(companyId && { companyId }),
          },
        }),
        
        // Active branches count
        this.prisma.branch.count({
          where: {
            isActive: true,
            ...(companyId && { companyId }),
          },
        }),
        
        // Recent orders - mock for now
        this.getMockRecentOrders(companyId),
        
        // Top performing products
        this.getTopProducts(startDate, endDate, companyId),
        
        // Orders by status - mock for now
        this.getMockOrdersByStatus(startDate, endDate, companyId),
        
        // Revenue by day - mock for now
        this.getMockRevenueByDay(startDate, endDate, companyId),
      ]);

      return {
        overview: {
          totalOrders,
          totalRevenue,
          activeProducts,
          activeBranches,
          averageOrderValue: totalOrders > 0 ? totalRevenue / totalOrders : 0,
        },
        recentOrders,
        topProducts,
        ordersByStatus,
        revenueByDay,
        dateRange: { startDate, endDate },
      };
    } catch (error) {
      this.logger.error(`Failed to get dashboard analytics: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Get sales analytics
   */
  async getSalesAnalytics(currentUser: { id: string; companyId: string; role: string }, filters?: {
    startDate?: Date;
    endDate?: Date;
    branchId?: string;
    groupBy?: 'day' | 'week' | 'month';
  }) {
    try {
      const companyId = currentUser.role === 'super_admin' ? undefined : currentUser.companyId;
      const startDate = filters?.startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const endDate = filters?.endDate || new Date();
      const groupBy = filters?.groupBy || 'day';

      // Mock sales data until Order model is fully implemented
      const salesData = await this.getMockSalesData(companyId, startDate, endDate, groupBy, filters?.branchId);

      return salesData;
    } catch (error) {
      this.logger.error(`Failed to get sales analytics: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Get product performance analytics
   */
  async getProductAnalytics(currentUser: { id: string; companyId: string; role: string }, filters?: {
    startDate?: Date;
    endDate?: Date;
    categoryId?: string;
    branchId?: string;
  }) {
    try {
      const companyId = currentUser.role === 'super_admin' ? undefined : currentUser.companyId;

      const products = await this.prisma.menuProduct.findMany({
        where: {
          ...(companyId && { companyId }),
          ...(filters?.categoryId && { categoryId: filters.categoryId }),
          status: 1,
        },
        include: {
          category: {
            select: { id: true, name: true },
          },
          // TODO: Add order items relation when Order model is available
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: 50,
      });

      // Add mock performance data
      const productsWithPerformance = products.map((product) => ({
        ...product,
        // Mock data until we have real order data
        totalOrders: Math.floor(Math.random() * 100),
        totalRevenue: Math.floor(Math.random() * 1000) + 100,
        averageRating: 4 + Math.random(),
        popularityScore: Math.floor(Math.random() * 100),
      }));

      return {
        products: productsWithPerformance,
        totalProducts: products.length,
      };
    } catch (error) {
      this.logger.error(`Failed to get product analytics: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Get branch performance analytics
   */
  async getBranchAnalytics(currentUser: { id: string; companyId: string; role: string }, branchId?: string) {
    try {
      const companyId = currentUser.role === 'super_admin' ? undefined : currentUser.companyId;

      const branches = await this.prisma.branch.findMany({
        where: {
          ...(companyId && { companyId }),
          ...(branchId && { id: branchId }),
          isActive: true,
        },
        include: {
          company: {
            select: { id: true, name: true },
          },
        },
      });

      // Add mock performance metrics
      const branchesWithMetrics = branches.map((branch) => ({
        ...branch,
        metrics: {
          totalOrders: Math.floor(Math.random() * 200) + 50,
          totalRevenue: Math.floor(Math.random() * 5000) + 1000,
          averageOrderValue: Math.floor(Math.random() * 50) + 20,
          customerSatisfaction: 4 + Math.random(),
          activeProducts: Math.floor(Math.random() * 50) + 10,
        },
      }));

      return {
        branches: branchesWithMetrics,
        totalBranches: branches.length,
      };
    } catch (error) {
      this.logger.error(`Failed to get branch analytics: ${error.message}`, error.stack);
      throw error;
    }
  }

  // Private helper methods for mock data
  private async getMockOrderCount(companyId?: string): Promise<number> {
    // Mock order count based on company size
    const branchCount = await this.prisma.branch.count({
      where: { ...(companyId && { companyId }) },
    });
    return branchCount * Math.floor(Math.random() * 100) + 50;
  }

  private async getMockRevenue(startDate: Date, endDate: Date, companyId?: string): Promise<number> {
    const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const branchCount = await this.prisma.branch.count({
      where: { ...(companyId && { companyId }) },
    });
    return branchCount * days * (Math.random() * 500 + 200);
  }

  private async getMockRecentOrders(companyId?: string) {
    // Mock recent orders
    return Array.from({ length: 10 }, (_, i) => ({
      id: `order-${i + 1}`,
      orderNumber: `ORD-${String(Date.now() + i).slice(-6)}`,
      customerName: `Customer ${i + 1}`,
      totalAmount: Math.floor(Math.random() * 50) + 10,
      status: ['pending', 'confirmed', 'preparing', 'delivered'][Math.floor(Math.random() * 4)],
      createdAt: new Date(Date.now() - Math.random() * 86400000), // Random time in last 24h
    }));
  }

  private async getTopProducts(startDate: Date, endDate: Date, companyId?: string) {
    const products = await this.prisma.menuProduct.findMany({
      where: {
        ...(companyId && { companyId }),
        status: 1,
      },
      take: 10,
      orderBy: { createdAt: 'desc' },
    });

    return products.map((product, i) => ({
      ...product,
      totalSold: Math.floor(Math.random() * 100) + (10 - i) * 5,
      revenue: Math.floor(Math.random() * 1000) + (10 - i) * 50,
    }));
  }

  private async getMockOrdersByStatus(startDate: Date, endDate: Date, companyId?: string) {
    return {
      pending: Math.floor(Math.random() * 20) + 5,
      confirmed: Math.floor(Math.random() * 15) + 3,
      preparing: Math.floor(Math.random() * 10) + 2,
      delivered: Math.floor(Math.random() * 50) + 20,
      cancelled: Math.floor(Math.random() * 5) + 1,
    };
  }

  private async getMockRevenueByDay(startDate: Date, endDate: Date, companyId?: string) {
    const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const data = [];

    for (let i = 0; i < days; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      
      data.push({
        date: date.toISOString().split('T')[0],
        revenue: Math.floor(Math.random() * 500) + 100,
        orders: Math.floor(Math.random() * 20) + 5,
      });
    }

    return data;
  }

  private async getMockSalesData(
    companyId?: string,
    startDate?: Date,
    endDate?: Date,
    groupBy?: string,
    branchId?: string
  ) {
    const days = Math.ceil(((endDate?.getTime() || Date.now()) - (startDate?.getTime() || Date.now() - 30 * 24 * 60 * 60 * 1000)) / (1000 * 60 * 60 * 24));
    
    return {
      totalRevenue: Math.floor(Math.random() * 10000) + 5000,
      totalOrders: Math.floor(Math.random() * 200) + 100,
      averageOrderValue: Math.floor(Math.random() * 50) + 25,
      salesByPeriod: Array.from({ length: Math.min(days, 30) }, (_, i) => ({
        date: new Date(Date.now() - (days - i) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        revenue: Math.floor(Math.random() * 500) + 100,
        orders: Math.floor(Math.random() * 20) + 5,
      })),
      topSellingProducts: Array.from({ length: 5 }, (_, i) => ({
        productName: `Product ${i + 1}`,
        quantity: Math.floor(Math.random() * 50) + 10,
        revenue: Math.floor(Math.random() * 1000) + 200,
      })),
    };
  }
}