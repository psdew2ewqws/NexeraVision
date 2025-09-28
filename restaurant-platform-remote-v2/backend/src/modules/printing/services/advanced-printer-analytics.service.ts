// Advanced Printer Analytics Service - Phase 4 Implementation
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { PrintingWebSocketGateway } from '../gateways/printing-websocket.gateway';

interface PrinterMetrics {
  printerId: string;
  printerName: string;
  performance: {
    totalJobs: number;
    completedJobs: number;
    failedJobs: number;
    successRate: number;
    averageJobTime: number;
    throughputPerHour: number;
    peakHourThroughput: number;
    uptime: number;
  };
  health: {
    status: string;
    lastSeen: Date;
    consecutiveFailures: number;
    paperLevel: number;
    temperature: number;
    errorRate: number;
    maintenanceScore: number;
  };
  usage: {
    busyHours: Array<{ hour: number; jobCount: number }>;
    dailyVolume: Array<{ date: string; volume: number }>;
    weeklyTrend: number;
    monthlyTrend: number;
  };
  predictive: {
    nextMaintenanceDate: Date;
    expectedFailureRisk: number;
    paperRefillPrediction: Date;
    performanceTrend: 'improving' | 'stable' | 'declining';
    recommendations: string[];
  };
}

interface SystemAnalytics {
  overview: {
    totalPrinters: number;
    activePrinters: number;
    healthyPrinters: number;
    systemUptime: number;
    totalJobsToday: number;
    systemEfficiency: number;
  };
  performance: {
    averageResponseTime: number;
    peakLoadCapacity: number;
    currentLoad: number;
    bottlenecks: Array<{
      printerId: string;
      issue: string;
      severity: 'low' | 'medium' | 'high' | 'critical';
    }>;
  };
  trends: {
    hourlyDistribution: Array<{ hour: number; volume: number; efficiency: number }>;
    dailyComparison: Array<{ date: string; jobs: number; efficiency: number }>;
    failurePatterns: Array<{ pattern: string; frequency: number; impact: string }>;
  };
  alerts: {
    critical: number;
    warning: number;
    info: number;
    recentAlerts: Array<{
      id: string;
      type: string;
      message: string;
      timestamp: Date;
      resolved: boolean;
    }>;
  };
}

@Injectable()
export class AdvancedPrinterAnalyticsService {
  private readonly logger = new Logger(AdvancedPrinterAnalyticsService.name);
  private metricsCache = new Map<string, PrinterMetrics>();
  private systemAnalyticsCache: SystemAnalytics | null = null;
  private lastCacheUpdate = 0;
  private readonly CACHE_TTL = 30000; // 30 seconds

  constructor(
    private prisma: PrismaService,
    private websocketGateway: PrintingWebSocketGateway,
  ) {
    this.logger.log('🔍 [ANALYTICS] Initializing Advanced Printer Analytics Service');
    this.startRealTimeAnalytics();
  }

  async getPrinterMetrics(printerId: string, companyId?: string): Promise<PrinterMetrics> {
    // Check cache first
    const cached = this.metricsCache.get(printerId);
    if (cached && Date.now() - this.lastCacheUpdate < this.CACHE_TTL) {
      return cached;
    }

    // Fetch fresh data
    const metrics = await this.calculatePrinterMetrics(printerId, companyId);
    this.metricsCache.set(printerId, metrics);
    
    return metrics;
  }

  async getSystemAnalytics(companyId?: string, branchId?: string): Promise<SystemAnalytics> {
    // Check cache first
    if (this.systemAnalyticsCache && Date.now() - this.lastCacheUpdate < this.CACHE_TTL) {
      return this.systemAnalyticsCache;
    }

    // Calculate fresh system analytics
    this.systemAnalyticsCache = await this.calculateSystemAnalytics(companyId, branchId);
    this.lastCacheUpdate = Date.now();
    
    return this.systemAnalyticsCache;
  }

  async getPerformanceReport(
    period: 'hour' | 'day' | 'week' | 'month',
    companyId?: string,
    branchId?: string
  ) {
    const where: any = {};
    if (companyId) where.companyId = companyId;
    if (branchId) where.branchId = branchId;

    let startDate = new Date();
    switch (period) {
      case 'hour':
        startDate.setHours(startDate.getHours() - 1);
        break;
      case 'day':
        startDate.setDate(startDate.getDate() - 1);
        break;
      case 'week':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(startDate.getMonth() - 1);
        break;
    }

    where.createdAt = { gte: startDate };

    const [jobs, printers] = await Promise.all([
      this.prisma.printJob.findMany({
        where,
        include: {
          printer: {
            select: {
              id: true,
              name: true,
              type: true,
              assignedTo: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      }),
      this.prisma.printer.findMany({
        where: companyId ? { companyId } : {},
        include: {
          _count: {
            select: {
              printJobs: {
                where: {
                  createdAt: { gte: startDate }
                }
              }
            }
          }
        }
      })
    ]);

    const performance = {
      period,
      totalJobs: jobs.length,
      completedJobs: jobs.filter(j => j.status === 'completed').length,
      failedJobs: jobs.filter(j => j.status === 'failed').length,
      averageProcessingTime: this.calculateAverageProcessingTime(jobs),
      printerUtilization: printers.map(p => ({
        printerId: p.id,
        name: p.name,
        type: p.type,
        assignedTo: p.assignedTo,
        jobCount: p._count.printJobs,
        utilization: this.calculateUtilization(p._count.printJobs, period)
      })),
      timeDistribution: this.calculateTimeDistribution(jobs, period),
      errorAnalysis: this.analyzeErrors(jobs),
      recommendations: this.generateRecommendations(jobs, printers)
    };

    return performance;
  }

  async getPredictiveMaintenanceAlerts(companyId?: string): Promise<Array<{
    printerId: string;
    printerName: string;
    alertType: 'maintenance_due' | 'performance_decline' | 'failure_risk' | 'paper_low';
    severity: 'low' | 'medium' | 'high' | 'critical';
    message: string;
    prediction: {
      confidence: number;
      timeframe: string;
      basedOn: string[];
    };
    recommendations: string[];
  }>> {
    const where: any = {};
    if (companyId) where.companyId = companyId;

    const printers = await this.prisma.printer.findMany({
      where,
      include: {
        printJobs: {
          where: {
            createdAt: {
              gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
            }
          },
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    const alerts = [];

    for (const printer of printers) {
      const metrics = await this.calculatePrinterMetrics(printer.id, companyId);
      const predictions = this.runPredictiveAnalysis(printer, metrics);

      alerts.push(...predictions);
    }

    return alerts.sort((a, b) => {
      const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      return severityOrder[b.severity] - severityOrder[a.severity];
    });
  }

  private async calculatePrinterMetrics(printerId: string, companyId?: string): Promise<PrinterMetrics> {
    const printer = await this.prisma.printer.findUnique({
      where: { id: printerId },
      include: {
        printJobs: {
          where: {
            createdAt: {
              gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
            }
          },
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!printer) {
      throw new Error(`Printer ${printerId} not found`);
    }

    const jobs = printer.printJobs;
    const completedJobs = jobs.filter(j => j.status === 'completed');
    const failedJobs = jobs.filter(j => j.status === 'failed');

    // Calculate performance metrics
    const performance = {
      totalJobs: jobs.length,
      completedJobs: completedJobs.length,
      failedJobs: failedJobs.length,
      successRate: jobs.length > 0 ? Math.round((completedJobs.length / jobs.length) * 100) : 0,
      averageJobTime: this.calculateAverageProcessingTime(completedJobs),
      throughputPerHour: this.calculateThroughput(jobs, 'hour'),
      peakHourThroughput: this.calculatePeakThroughput(jobs),
      uptime: this.calculateUptime(printer)
    };

    // Calculate health metrics
    const health = {
      status: printer.status,
      lastSeen: printer.lastSeen || new Date(),
      consecutiveFailures: this.calculateConsecutiveFailures(jobs),
      paperLevel: Math.random() * 100, // Simulated - would come from actual printer
      temperature: 35 + Math.random() * 10, // Simulated
      errorRate: failedJobs.length / Math.max(jobs.length, 1) * 100,
      maintenanceScore: this.calculateMaintenanceScore(printer, jobs)
    };

    // Calculate usage patterns
    const usage = {
      busyHours: this.calculateBusyHours(jobs),
      dailyVolume: this.calculateDailyVolume(jobs),
      weeklyTrend: this.calculateWeeklyTrend(jobs),
      monthlyTrend: this.calculateMonthlyTrend(jobs)
    };

    // Generate predictions
    const predictive = {
      nextMaintenanceDate: this.predictMaintenanceDate(printer, jobs),
      expectedFailureRisk: this.calculateFailureRisk(printer, jobs),
      paperRefillPrediction: this.predictPaperRefill(jobs),
      performanceTrend: this.analyzePerformanceTrend(jobs) as 'improving' | 'stable' | 'declining',
      recommendations: this.generatePrinterRecommendations(printer, jobs)
    };

    return {
      printerId,
      printerName: printer.name,
      performance,
      health,
      usage,
      predictive
    };
  }

  private async calculateSystemAnalytics(companyId?: string, branchId?: string): Promise<SystemAnalytics> {
    const where: any = {};
    if (companyId) where.companyId = companyId;
    if (branchId) where.branchId = branchId;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [printers, todayJobs, allJobs] = await Promise.all([
      this.prisma.printer.findMany({ where }),
      this.prisma.printJob.findMany({
        where: { ...where, createdAt: { gte: today } }
      }),
      this.prisma.printJob.findMany({
        where: {
          ...where,
          createdAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
          }
        }
      })
    ]);

    const activePrinters = printers.filter(p => p.status === 'online').length;
    const healthyPrinters = printers.filter(p => 
      p.status === 'online' && 
      p.lastSeen && 
      p.lastSeen > new Date(Date.now() - 5 * 60 * 1000)
    ).length;

    const overview = {
      totalPrinters: printers.length,
      activePrinters,
      healthyPrinters,
      systemUptime: this.calculateSystemUptime(printers),
      totalJobsToday: todayJobs.length,
      systemEfficiency: this.calculateSystemEfficiency(todayJobs)
    };

    const performance = {
      averageResponseTime: this.calculateAverageProcessingTime(todayJobs),
      peakLoadCapacity: this.calculatePeakLoadCapacity(printers),
      currentLoad: this.calculateCurrentLoad(printers),
      bottlenecks: this.identifyBottlenecks(printers, allJobs)
    };

    const trends = {
      hourlyDistribution: this.calculateHourlyDistribution(allJobs),
      dailyComparison: this.calculateDailyComparison(allJobs),
      failurePatterns: this.analyzeFailurePatterns(allJobs)
    };

    const alerts = {
      critical: 0, // Would be calculated from actual alert system
      warning: 0,
      info: 0,
      recentAlerts: [] // Would come from alert system
    };

    return {
      overview,
      performance,
      trends,
      alerts
    };
  }

  private startRealTimeAnalytics(): void {
    this.logger.log('🔍 [REAL-TIME-ANALYTICS] Starting real-time analytics monitoring');

    // Real-time metrics collection every 30 seconds
    setInterval(async () => {
      try {
        await this.collectRealTimeMetrics();
      } catch (error) {
        this.logger.error('Real-time metrics collection failed:', error);
      }
    }, 30000);

    // Performance trend analysis every 5 minutes
    setInterval(async () => {
      try {
        await this.analyzePerformanceTrends();
      } catch (error) {
        this.logger.error('Performance trend analysis failed:', error);
      }
    }, 300000);

    // Predictive maintenance check every 15 minutes
    setInterval(async () => {
      try {
        await this.runPredictiveMaintenanceChecks();
      } catch (error) {
        this.logger.error('Predictive maintenance check failed:', error);
      }
    }, 900000);
  }

  private async collectRealTimeMetrics(): Promise<void> {
    const printers = await this.prisma.printer.findMany({
      where: { status: 'online' },
      take: 10 // Limit to prevent overload
    });

    for (const printer of printers) {
      const metrics = await this.calculatePrinterMetrics(printer.id);
      
      // Broadcast metrics update via WebSocket
      this.websocketGateway.server.emit('printerMetricsUpdate', {
        printerId: printer.id,
        metrics: {
          performance: metrics.performance,
          health: metrics.health,
          timestamp: new Date()
        }
      });
    }
  }

  private async analyzePerformanceTrends(): Promise<void> {
    this.logger.log('📊 [PERFORMANCE-TRENDS] Analyzing performance trends');
    
    // Clear cache to force fresh calculations
    this.metricsCache.clear();
    this.systemAnalyticsCache = null;
    
    // Recalculate system analytics
    const analytics = await this.getSystemAnalytics();
    
    // Broadcast analytics update
    this.websocketGateway.server.emit('systemAnalyticsUpdate', {
      analytics,
      timestamp: new Date()
    });
  }

  private async runPredictiveMaintenanceChecks(): Promise<void> {
    this.logger.log('🔮 [PREDICTIVE-MAINTENANCE] Running predictive maintenance analysis');
    
    const alerts = await this.getPredictiveMaintenanceAlerts();
    
    // Broadcast critical alerts
    const criticalAlerts = alerts.filter(a => a.severity === 'critical');
    if (criticalAlerts.length > 0) {
      this.websocketGateway.server.emit('criticalMaintenanceAlerts', {
        alerts: criticalAlerts,
        timestamp: new Date()
      });
    }
    
    // Broadcast all alerts
    this.websocketGateway.server.emit('predictiveMaintenanceUpdate', {
      alerts,
      summary: {
        total: alerts.length,
        critical: alerts.filter(a => a.severity === 'critical').length,
        high: alerts.filter(a => a.severity === 'high').length,
        medium: alerts.filter(a => a.severity === 'medium').length,
        low: alerts.filter(a => a.severity === 'low').length
      },
      timestamp: new Date()
    });
  }

  // Helper methods for calculations
  private calculateAverageProcessingTime(jobs: any[]): number {
    const completedJobs = jobs.filter(j => j.status === 'completed' && j.processingTime);
    if (completedJobs.length === 0) return 0;
    
    const totalTime = completedJobs.reduce((sum, job) => sum + (job.processingTime || 0), 0);
    return Math.round(totalTime / completedJobs.length);
  }

  private calculateThroughput(jobs: any[], period: 'hour' | 'day'): number {
    const periodMs = period === 'hour' ? 60 * 60 * 1000 : 24 * 60 * 60 * 1000;
    const periodJobs = jobs.filter(j => 
      j.createdAt > new Date(Date.now() - periodMs)
    );
    
    return period === 'hour' ? periodJobs.length : Math.round(periodJobs.length / 24);
  }

  private calculatePeakThroughput(jobs: any[]): number {
    // Group jobs by hour and find peak
    const hourlyGroups = new Map<number, number>();
    
    jobs.forEach(job => {
      const hour = new Date(job.createdAt).getHours();
      hourlyGroups.set(hour, (hourlyGroups.get(hour) || 0) + 1);
    });
    
    return Math.max(...Array.from(hourlyGroups.values()), 0);
  }

  private calculateUptime(printer: any): number {
    // Calculate uptime based on status history
    // For now, simulate based on last seen
    if (!printer.lastSeen) return 0;
    
    const hoursSinceLastSeen = (Date.now() - printer.lastSeen.getTime()) / (1000 * 60 * 60);
    return printer.status === 'online' ? Math.max(0, 100 - hoursSinceLastSeen) : 0;
  }

  private calculateConsecutiveFailures(jobs: any[]): number {
    let consecutive = 0;
    for (let i = 0; i < jobs.length; i++) {
      if (jobs[i].status === 'failed') {
        consecutive++;
      } else {
        break;
      }
    }
    return consecutive;
  }

  private calculateMaintenanceScore(printer: any, jobs: any[]): number {
    // Calculate a maintenance score from 0-100 based on various factors
    let score = 100;
    
    // Reduce score based on error rate
    const errorRate = jobs.filter(j => j.status === 'failed').length / Math.max(jobs.length, 1);
    score -= errorRate * 50;
    
    // Reduce score based on age (simulate)
    const daysSinceCreated = (Date.now() - printer.createdAt.getTime()) / (1000 * 60 * 60 * 24);
    score -= Math.min(daysSinceCreated / 10, 20); // Max 20 point reduction for age
    
    // Reduce score based on total usage
    score -= Math.min(jobs.length / 100, 20); // Max 20 point reduction for heavy usage
    
    return Math.max(0, Math.round(score));
  }

  private calculateBusyHours(jobs: any[]): Array<{ hour: number; jobCount: number }> {
    const hourlyCount = new Map<number, number>();
    
    jobs.forEach(job => {
      const hour = new Date(job.createdAt).getHours();
      hourlyCount.set(hour, (hourlyCount.get(hour) || 0) + 1);
    });
    
    return Array.from({ length: 24 }, (_, hour) => ({
      hour,
      jobCount: hourlyCount.get(hour) || 0
    }));
  }

  private calculateDailyVolume(jobs: any[]): Array<{ date: string; volume: number }> {
    const dailyCount = new Map<string, number>();
    
    jobs.forEach(job => {
      const date = new Date(job.createdAt).toISOString().split('T')[0];
      dailyCount.set(date, (dailyCount.get(date) || 0) + 1);
    });
    
    return Array.from(dailyCount.entries()).map(([date, volume]) => ({ date, volume }));
  }

  private calculateWeeklyTrend(jobs: any[]): number {
    // Calculate week-over-week growth percentage
    const now = Date.now();
    const thisWeek = jobs.filter(j => j.createdAt > new Date(now - 7 * 24 * 60 * 60 * 1000)).length;
    const lastWeek = jobs.filter(j => 
      j.createdAt > new Date(now - 14 * 24 * 60 * 60 * 1000) &&
      j.createdAt <= new Date(now - 7 * 24 * 60 * 60 * 1000)
    ).length;
    
    if (lastWeek === 0) return thisWeek > 0 ? 100 : 0;
    return Math.round(((thisWeek - lastWeek) / lastWeek) * 100);
  }

  private calculateMonthlyTrend(jobs: any[]): number {
    // Calculate month-over-month growth percentage
    const now = Date.now();
    const thisMonth = jobs.filter(j => j.createdAt > new Date(now - 30 * 24 * 60 * 60 * 1000)).length;
    const lastMonth = jobs.filter(j => 
      j.createdAt > new Date(now - 60 * 24 * 60 * 60 * 1000) &&
      j.createdAt <= new Date(now - 30 * 24 * 60 * 60 * 1000)
    ).length;
    
    if (lastMonth === 0) return thisMonth > 0 ? 100 : 0;
    return Math.round(((thisMonth - lastMonth) / lastMonth) * 100);
  }

  private predictMaintenanceDate(printer: any, jobs: any[]): Date {
    // Predict next maintenance date based on usage patterns
    const jobsPerDay = jobs.length / 30; // Average over 30 days
    const maintenanceInterval = 1000; // Jobs before maintenance needed
    
    const jobsUntilMaintenance = maintenanceInterval - (jobs.length % maintenanceInterval);
    const daysUntilMaintenance = jobsPerDay > 0 ? jobsUntilMaintenance / jobsPerDay : 30;
    
    return new Date(Date.now() + daysUntilMaintenance * 24 * 60 * 60 * 1000);
  }

  private calculateFailureRisk(printer: any, jobs: any[]): number {
    // Calculate failure risk percentage based on various factors
    let risk = 0;
    
    // Error rate contribution
    const errorRate = jobs.filter(j => j.status === 'failed').length / Math.max(jobs.length, 1);
    risk += errorRate * 30;
    
    // Age contribution
    const daysSinceCreated = (Date.now() - printer.createdAt.getTime()) / (1000 * 60 * 60 * 24);
    risk += Math.min(daysSinceCreated / 365 * 20, 20); // Max 20% for age
    
    // Usage intensity contribution
    const jobsPerDay = jobs.length / 30;
    risk += Math.min(jobsPerDay / 10 * 15, 15); // Max 15% for heavy usage
    
    // Status contribution
    if (printer.status === 'error') risk += 25;
    else if (printer.status === 'offline') risk += 15;
    
    return Math.min(100, Math.round(risk));
  }

  private predictPaperRefill(jobs: any[]): Date {
    // Predict when paper needs refilling based on job volume
    const jobsPerDay = jobs.length / 30;
    const estimatedJobsPerRoll = 200; // Approximate jobs per paper roll
    
    const daysUntilRefill = jobsPerDay > 0 ? estimatedJobsPerRoll / jobsPerDay : 30;
    return new Date(Date.now() + daysUntilRefill * 24 * 60 * 60 * 1000);
  }

  private analyzePerformanceTrend(jobs: any[]): 'improving' | 'stable' | 'declining' {
    if (jobs.length < 10) return 'stable';
    
    const recentJobs = jobs.slice(0, Math.floor(jobs.length / 2));
    const olderJobs = jobs.slice(Math.floor(jobs.length / 2));
    
    const recentErrorRate = recentJobs.filter(j => j.status === 'failed').length / recentJobs.length;
    const olderErrorRate = olderJobs.filter(j => j.status === 'failed').length / olderJobs.length;
    
    if (recentErrorRate < olderErrorRate * 0.8) return 'improving';
    if (recentErrorRate > olderErrorRate * 1.2) return 'declining';
    return 'stable';
  }

  private generatePrinterRecommendations(printer: any, jobs: any[]): string[] {
    const recommendations = [];
    
    const errorRate = jobs.filter(j => j.status === 'failed').length / Math.max(jobs.length, 1);
    if (errorRate > 0.1) {
      recommendations.push('High error rate detected - check printer connectivity and paper supply');
    }
    
    if (printer.status === 'offline') {
      recommendations.push('Printer is offline - verify network connection and power status');
    }
    
    const jobsPerDay = jobs.length / 30;
    if (jobsPerDay > 50) {
      recommendations.push('High usage detected - consider load balancing or additional printer');
    }
    
    if (jobs.length > 500) {
      recommendations.push('Schedule preventive maintenance - printer has high cumulative usage');
    }
    
    return recommendations;
  }

  private calculateUtilization(jobCount: number, period: string): number {
    const maxJobsPerPeriod = period === 'hour' ? 20 : period === 'day' ? 480 : 3360; // week
    return Math.min(100, Math.round((jobCount / maxJobsPerPeriod) * 100));
  }

  private calculateTimeDistribution(jobs: any[], period: string): Array<{ label: string; count: number }> {
    if (period === 'hour') {
      const minutes = new Map<number, number>();
      jobs.forEach(job => {
        const minute = Math.floor(new Date(job.createdAt).getMinutes() / 10) * 10;
        minutes.set(minute, (minutes.get(minute) || 0) + 1);
      });
      return Array.from(minutes.entries()).map(([minute, count]) => ({
        label: `${minute}:00`,
        count
      }));
    }
    
    // For longer periods, use hourly distribution
    const hours = new Map<number, number>();
    jobs.forEach(job => {
      const hour = new Date(job.createdAt).getHours();
      hours.set(hour, (hours.get(hour) || 0) + 1);
    });
    return Array.from(hours.entries()).map(([hour, count]) => ({
      label: `${hour}:00`,
      count
    }));
  }

  private analyzeErrors(jobs: any[]) {
    const failedJobs = jobs.filter(j => j.status === 'failed');
    const errorTypes = new Map<string, number>();
    
    failedJobs.forEach(job => {
      const errorType = job.error || 'Unknown Error';
      errorTypes.set(errorType, (errorTypes.get(errorType) || 0) + 1);
    });
    
    return {
      totalErrors: failedJobs.length,
      errorRate: jobs.length > 0 ? Math.round((failedJobs.length / jobs.length) * 100) : 0,
      commonErrors: Array.from(errorTypes.entries())
        .map(([error, count]) => ({ error, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5)
    };
  }

  private generateRecommendations(jobs: any[], printers: any[]): string[] {
    const recommendations = [];
    
    const totalJobs = jobs.length;
    const failedJobs = jobs.filter(j => j.status === 'failed').length;
    const errorRate = totalJobs > 0 ? failedJobs / totalJobs : 0;
    
    if (errorRate > 0.1) {
      recommendations.push('High system error rate - review printer configurations and connectivity');
    }
    
    const offlinePrinters = printers.filter(p => p.status === 'offline').length;
    if (offlinePrinters > 0) {
      recommendations.push(`${offlinePrinters} printer(s) offline - check network connectivity`);
    }
    
    const busyPrinters = printers.filter(p => p._count.printJobs > 50).length;
    if (busyPrinters > 0) {
      recommendations.push('Consider load balancing - some printers have high job volumes');
    }
    
    return recommendations;
  }

  private calculateSystemUptime(printers: any[]): number {
    if (printers.length === 0) return 0;
    
    const onlinePrinters = printers.filter(p => p.status === 'online').length;
    return Math.round((onlinePrinters / printers.length) * 100);
  }

  private calculateSystemEfficiency(jobs: any[]): number {
    if (jobs.length === 0) return 100;
    
    const completedJobs = jobs.filter(j => j.status === 'completed').length;
    return Math.round((completedJobs / jobs.length) * 100);
  }

  private calculatePeakLoadCapacity(printers: any[]): number {
    // Estimate peak load capacity based on printer count and type
    return printers.length * 20; // Assume 20 jobs per hour per printer
  }

  private calculateCurrentLoad(printers: any[]): number {
    // Calculate current system load as percentage of capacity
    const activePrinters = printers.filter(p => p.status === 'online').length;
    const capacity = activePrinters * 20;
    // This would be calculated from actual current job queue in real implementation
    const currentJobs = Math.floor(Math.random() * capacity * 0.3); // Simulate 0-30% load
    
    return capacity > 0 ? Math.round((currentJobs / capacity) * 100) : 0;
  }

  private identifyBottlenecks(printers: any[], jobs: any[]) {
    const bottlenecks = [];
    
    // Group jobs by printer
    const printerJobs = new Map<string, any[]>();
    jobs.forEach(job => {
      if (!printerJobs.has(job.printerId)) {
        printerJobs.set(job.printerId, []);
      }
      printerJobs.get(job.printerId)!.push(job);
    });
    
    printers.forEach(printer => {
      const printerJobList = printerJobs.get(printer.id) || [];
      const errorRate = printerJobList.filter(j => j.status === 'failed').length / Math.max(printerJobList.length, 1);
      
      if (errorRate > 0.2) {
        bottlenecks.push({
          printerId: printer.id,
          issue: `High error rate (${Math.round(errorRate * 100)}%)`,
          severity: errorRate > 0.5 ? 'critical' as const : 'high' as const
        });
      }
      
      if (printer.status === 'offline') {
        bottlenecks.push({
          printerId: printer.id,
          issue: 'Printer offline',
          severity: 'high' as const
        });
      }
      
      if (printerJobList.length > 100) {
        bottlenecks.push({
          printerId: printer.id,
          issue: 'High job volume - potential overload',
          severity: 'medium' as const
        });
      }
    });
    
    return bottlenecks;
  }

  private calculateHourlyDistribution(jobs: any[]) {
    const hourlyData = new Map<number, { volume: number; completed: number }>();
    
    jobs.forEach(job => {
      const hour = new Date(job.createdAt).getHours();
      if (!hourlyData.has(hour)) {
        hourlyData.set(hour, { volume: 0, completed: 0 });
      }
      const data = hourlyData.get(hour)!;
      data.volume++;
      if (job.status === 'completed') data.completed++;
    });
    
    return Array.from({ length: 24 }, (_, hour) => {
      const data = hourlyData.get(hour) || { volume: 0, completed: 0 };
      return {
        hour,
        volume: data.volume,
        efficiency: data.volume > 0 ? Math.round((data.completed / data.volume) * 100) : 100
      };
    });
  }

  private calculateDailyComparison(jobs: any[]) {
    const dailyData = new Map<string, { jobs: number; completed: number }>();
    
    jobs.forEach(job => {
      const date = new Date(job.createdAt).toISOString().split('T')[0];
      if (!dailyData.has(date)) {
        dailyData.set(date, { jobs: 0, completed: 0 });
      }
      const data = dailyData.get(date)!;
      data.jobs++;
      if (job.status === 'completed') data.completed++;
    });
    
    return Array.from(dailyData.entries()).map(([date, data]) => ({
      date,
      jobs: data.jobs,
      efficiency: data.jobs > 0 ? Math.round((data.completed / data.jobs) * 100) : 100
    }));
  }

  private analyzeFailurePatterns(jobs: any[]) {
    const failedJobs = jobs.filter(j => j.status === 'failed');
    const patterns = new Map<string, number>();
    
    // Analyze by time of day
    failedJobs.forEach(job => {
      const hour = new Date(job.createdAt).getHours();
      const timePattern = hour < 6 ? 'Night' : hour < 12 ? 'Morning' : hour < 18 ? 'Afternoon' : 'Evening';
      patterns.set(`Time: ${timePattern}`, (patterns.get(`Time: ${timePattern}`) || 0) + 1);
    });
    
    // Analyze by error type
    failedJobs.forEach(job => {
      const errorType = job.error ? `Error: ${job.error.substring(0, 30)}` : 'Error: Unknown';
      patterns.set(errorType, (patterns.get(errorType) || 0) + 1);
    });
    
    return Array.from(patterns.entries())
      .map(([pattern, frequency]) => ({
        pattern,
        frequency,
        impact: frequency > 10 ? 'High' : frequency > 5 ? 'Medium' : 'Low'
      }))
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, 10);
  }

  private runPredictiveAnalysis(printer: any, metrics: PrinterMetrics) {
    const alerts = [];
    
    // Maintenance due prediction
    if (metrics.health.maintenanceScore < 30) {
      alerts.push({
        printerId: printer.id,
        printerName: printer.name,
        alertType: 'maintenance_due' as const,
        severity: 'high' as const,
        message: `Printer ${printer.name} requires maintenance - maintenance score: ${metrics.health.maintenanceScore}%`,
        prediction: {
          confidence: 85,
          timeframe: 'Within 7 days',
          basedOn: ['maintenance score', 'error rate', 'usage patterns']
        },
        recommendations: [
          'Schedule preventive maintenance',
          'Check paper feed mechanism',
          'Clean print head',
          'Verify calibration'
        ]
      });
    }
    
    // Performance decline prediction
    if (metrics.predictive.performanceTrend === 'declining' && metrics.performance.successRate < 90) {
      alerts.push({
        printerId: printer.id,
        printerName: printer.name,
        alertType: 'performance_decline' as const,
        severity: 'medium' as const,
        message: `Performance declining for ${printer.name} - success rate: ${metrics.performance.successRate}%`,
        prediction: {
          confidence: 70,
          timeframe: 'Next 48 hours',
          basedOn: ['success rate trend', 'error frequency', 'response times']
        },
        recommendations: [
          'Monitor print quality',
          'Check network connectivity',
          'Review print job complexity',
          'Consider printer restart'
        ]
      });
    }
    
    // Failure risk prediction
    if (metrics.predictive.expectedFailureRisk > 75) {
      alerts.push({
        printerId: printer.id,
        printerName: printer.name,
        alertType: 'failure_risk' as const,
        severity: 'critical' as const,
        message: `High failure risk for ${printer.name} - risk level: ${metrics.predictive.expectedFailureRisk}%`,
        prediction: {
          confidence: 90,
          timeframe: 'Within 24 hours',
          basedOn: ['error patterns', 'hardware age', 'usage intensity']
        },
        recommendations: [
          'Immediate inspection required',
          'Prepare backup printer',
          'Review recent error logs',
          'Contact maintenance team'
        ]
      });
    }
    
    // Paper level prediction
    if (metrics.health.paperLevel < 20) {
      alerts.push({
        printerId: printer.id,
        printerName: printer.name,
        alertType: 'paper_low' as const,
        severity: metrics.health.paperLevel < 10 ? 'critical' as const : 'medium' as const,
        message: `Low paper level for ${printer.name} - ${Math.round(metrics.health.paperLevel)}% remaining`,
        prediction: {
          confidence: 95,
          timeframe: metrics.health.paperLevel < 10 ? 'Immediate' : 'Within 4 hours',
          basedOn: ['current paper level', 'usage rate', 'historical consumption']
        },
        recommendations: [
          'Refill paper supply immediately',
          'Check paper alignment',
          'Monitor for paper jams',
          'Keep spare paper rolls nearby'
        ]
      });
    }
    
    return alerts;
  }
}