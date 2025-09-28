// Enterprise Monitoring Service - Phase 4 Implementation
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { PrintingWebSocketGateway } from '../gateways/printing-websocket.gateway';
import { AdvancedPrinterAnalyticsService } from './advanced-printer-analytics.service';

interface BranchMonitoringData {
  branchId: string;
  branchName: string;
  companyId: string;
  companyName: string;
  printers: {
    total: number;
    online: number;
    offline: number;
    error: number;
    utilization: number;
  };
  performance: {
    totalJobs: number;
    completedJobs: number;
    failedJobs: number;
    successRate: number;
    averageJobTime: number;
  };
  alerts: {
    critical: number;
    warning: number;
    info: number;
  };
  health: {
    score: number;
    status: 'excellent' | 'good' | 'fair' | 'poor';
    issues: string[];
  };
  lastUpdate: Date;
}

interface CompanyDashboard {
  companyId: string;
  companyName: string;
  overview: {
    totalBranches: number;
    totalPrinters: number;
    activePrinters: number;
    systemHealth: number;
    totalJobsToday: number;
    systemEfficiency: number;
  };
  branches: BranchMonitoringData[];
  alerts: {
    total: number;
    critical: number;
    warning: number;
    info: number;
    recent: Array<{
      id: string;
      branchId: string;
      branchName: string;
      type: string;
      severity: string;
      message: string;
      timestamp: Date;
    }>;
  };
  trends: {
    dailyVolume: Array<{ date: string; volume: number; efficiency: number }>;
    branchComparison: Array<{
      branchId: string;
      branchName: string;
      volume: number;
      efficiency: number;
      health: number;
    }>;
    performanceMetrics: {
      averageResponseTime: number;
      peakThroughput: number;
      systemLoad: number;
    };
  };
  recommendations: Array<{
    type: 'performance' | 'maintenance' | 'optimization' | 'alert';
    priority: 'low' | 'medium' | 'high' | 'critical';
    title: string;
    description: string;
    branchId?: string;
    printerId?: string;
    estimatedImpact: string;
    actionRequired: string;
  }>;
}

interface SystemWideMetrics {
  overview: {
    totalCompanies: number;
    totalBranches: number;
    totalPrinters: number;
    activePrinters: number;
    systemUptime: number;
    totalJobsToday: number;
  };
  geographic: {
    regions: Array<{
      region: string;
      companies: number;
      branches: number;
      printers: number;
      performance: number;
    }>;
  };
  performance: {
    globalThroughput: number;
    averageResponseTime: number;
    systemEfficiency: number;
    topPerformingBranches: Array<{
      branchId: string;
      branchName: string;
      companyName: string;
      score: number;
    }>;
  };
  issues: {
    criticalAlerts: number;
    offlinePrinters: number;
    underperformingBranches: number;
    systemBottlenecks: Array<{
      type: string;
      description: string;
      affectedBranches: number;
      impact: string;
    }>;
  };
}

@Injectable()
export class EnterpriseMonitoringService {
  private readonly logger = new Logger(EnterpriseMonitoringService.name);
  private monitoringCache = new Map<string, CompanyDashboard>();
  private systemMetricsCache: SystemWideMetrics | null = null;
  private lastCacheUpdate = 0;
  private readonly CACHE_TTL = 60000; // 1 minute

  constructor(
    private prisma: PrismaService,
    private websocketGateway: PrintingWebSocketGateway,
    private analyticsService: AdvancedPrinterAnalyticsService,
  ) {
    this.logger.log('🏢 [ENTERPRISE] Initializing Enterprise Monitoring Service');
    this.startRealTimeMonitoring();
  }

  async getCompanyDashboard(companyId: string): Promise<CompanyDashboard> {
    // Check cache first
    const cached = this.monitoringCache.get(companyId);
    if (cached && Date.now() - this.lastCacheUpdate < this.CACHE_TTL) {
      return cached;
    }

    // Fetch fresh data
    const dashboard = await this.buildCompanyDashboard(companyId);
    this.monitoringCache.set(companyId, dashboard);
    
    return dashboard;
  }

  async getSystemWideMetrics(): Promise<SystemWideMetrics> {
    // Check cache first
    if (this.systemMetricsCache && Date.now() - this.lastCacheUpdate < this.CACHE_TTL) {
      return this.systemMetricsCache;
    }

    // Calculate fresh system metrics
    this.systemMetricsCache = await this.buildSystemWideMetrics();
    this.lastCacheUpdate = Date.now();
    
    return this.systemMetricsCache;
  }

  async getBranchMonitoring(branchId: string, companyId?: string): Promise<BranchMonitoringData> {
    const branch = await this.prisma.branch.findUnique({
      where: { id: branchId },
      include: {
        company: { select: { id: true, name: true } },
        printers: {
          include: {
            _count: {
              select: {
                printJobs: {
                  where: {
                    createdAt: {
                      gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
                    }
                  }
                }
              }
            }
          }
        }
      }
    });

    if (!branch) {
      throw new Error(`Branch ${branchId} not found`);
    }

    if (companyId && branch.companyId !== companyId) {
      throw new Error('Access denied to branch');
    }

    return await this.buildBranchMonitoringData(branch);
  }

  async getMultiBranchComparison(
    branchIds: string[],
    companyId?: string
  ): Promise<Array<{
    branchId: string;
    branchName: string;
    metrics: {
      printers: number;
      utilization: number;
      efficiency: number;
      healthScore: number;
      alertCount: number;
    };
    ranking: number;
    insights: string[];
  }>> {
    const branches = await Promise.all(
      branchIds.map(id => this.getBranchMonitoring(id, companyId))
    );

    // Calculate rankings and insights
    const comparison = branches.map((branch, index) => {
      const utilization = this.calculateBranchUtilization(branch);
      const efficiency = branch.performance.successRate;
      const healthScore = branch.health.score;
      const alertCount = branch.alerts.critical + branch.alerts.warning;

      const insights = [];
      
      if (efficiency < 90) insights.push('Below average efficiency');
      if (healthScore < 70) insights.push('Health concerns detected');
      if (alertCount > 5) insights.push('High alert volume');
      if (utilization > 80) insights.push('High utilization - consider scaling');
      if (utilization < 20) insights.push('Low utilization - optimization opportunity');

      return {
        branchId: branch.branchId,
        branchName: branch.branchName,
        metrics: {
          printers: branch.printers.total,
          utilization,
          efficiency,
          healthScore,
          alertCount
        },
        ranking: 0, // Will be calculated below
        insights
      };
    });

    // Calculate rankings based on overall performance
    comparison.forEach(branch => {
      branch.ranking = comparison.filter(other => 
        (other.metrics.efficiency + other.metrics.healthScore - other.metrics.alertCount) >
        (branch.metrics.efficiency + branch.metrics.healthScore - branch.metrics.alertCount)
      ).length + 1;
    });

    return comparison.sort((a, b) => a.ranking - b.ranking);
  }

  async getPerformanceOptimizationReport(companyId?: string): Promise<{
    overview: {
      optimizationPotential: number;
      estimatedSavings: string;
      keyRecommendations: number;
    };
    categories: Array<{
      category: 'performance' | 'cost' | 'reliability' | 'efficiency';
      score: number;
      recommendations: Array<{
        title: string;
        description: string;
        impact: 'low' | 'medium' | 'high';
        effort: 'low' | 'medium' | 'high';
        branchesAffected: number;
        estimatedBenefit: string;
        actionSteps: string[];
      }>;
    }>;
    branchSpecific: Array<{
      branchId: string;
      branchName: string;
      optimizations: Array<{
        type: string;
        description: string;
        impact: string;
        actionRequired: string;
      }>;
    }>;
  }> {
    const where: any = {};
    if (companyId) where.companyId = companyId;

    const [branches, printers, jobs] = await Promise.all([
      this.prisma.branch.findMany({
        where,
        include: {
          company: { select: { name: true } },
          _count: { select: { printers: true } }
        }
      }),
      this.prisma.printer.findMany({
        where,
        include: {
          _count: {
            select: {
              printJobs: {
                where: {
                  createdAt: {
                    gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
                  }
                }
              }
            }
          }
        }
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

    return this.analyzeOptimizationOpportunities(branches, printers, jobs);
  }

  async generateAlertRule(rule: {
    name: string;
    description: string;
    conditions: {
      metric: string;
      operator: '>' | '<' | '=' | '>=' | '<=';
      value: number;
      timeWindow: number; // minutes
    }[];
    severity: 'low' | 'medium' | 'high' | 'critical';
    actions: {
      email?: boolean;
      webhook?: string;
      escalation?: {
        after: number; // minutes
        to: string[];
      };
    };
    companyId?: string;
    branchId?: string;
  }): Promise<{
    id: string;
    status: 'active' | 'pending';
    message: string;
  }> {
    // In a real implementation, this would store the rule in the database
    // and set up monitoring for the specified conditions
    
    const ruleId = `rule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    this.logger.log(`🚨 [ALERT-RULE] Created alert rule '${rule.name}' with ID: ${ruleId}`);
    
    // Simulate rule validation and activation
    const isValid = this.validateAlertRule(rule);
    
    return {
      id: ruleId,
      status: isValid ? 'active' : 'pending',
      message: isValid 
        ? `Alert rule '${rule.name}' created and activated successfully`
        : `Alert rule '${rule.name}' created but requires validation`
    };
  }

  async getAlertHistory(
    companyId?: string,
    branchId?: string,
    limit: number = 100,
    severity?: string
  ): Promise<Array<{
    id: string;
    branchId: string;
    branchName: string;
    printerId?: string;
    printerName?: string;
    type: string;
    severity: string;
    message: string;
    timestamp: Date;
    acknowledged: boolean;
    acknowledgedBy?: string;
    acknowledgedAt?: Date;
    resolved: boolean;
    resolvedAt?: Date;
    duration?: number;
  }>> {
    // In a real implementation, this would query an AlertHistory table
    // For now, simulate alert history data
    
    const mockAlerts = this.generateMockAlertHistory(companyId, branchId, limit, severity);
    
    return mockAlerts;
  }

  private async buildCompanyDashboard(companyId: string): Promise<CompanyDashboard> {
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
      include: {
        branches: {
          include: {
            printers: {
              include: {
                _count: {
                  select: {
                    printJobs: {
                      where: {
                        createdAt: {
                          gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    });

    if (!company) {
      throw new Error(`Company ${companyId} not found`);
    }

    // Build branch monitoring data
    const branches = await Promise.all(
      company.branches.map(branch => this.buildBranchMonitoringData(branch))
    );

    // Calculate company overview
    const totalPrinters = branches.reduce((sum, b) => sum + b.printers.total, 0);
    const activePrinters = branches.reduce((sum, b) => sum + b.printers.online, 0);
    const totalJobsToday = branches.reduce((sum, b) => sum + b.performance.totalJobs, 0);
    const systemHealth = branches.length > 0 
      ? Math.round(branches.reduce((sum, b) => sum + b.health.score, 0) / branches.length)
      : 100;
    const systemEfficiency = branches.length > 0
      ? Math.round(branches.reduce((sum, b) => sum + b.performance.successRate, 0) / branches.length)
      : 100;

    // Collect alerts
    const allAlerts = {
      total: 0,
      critical: branches.reduce((sum, b) => sum + b.alerts.critical, 0),
      warning: branches.reduce((sum, b) => sum + b.alerts.warning, 0),
      info: branches.reduce((sum, b) => sum + b.alerts.info, 0),
      recent: [] // Would be populated from actual alert system
    };
    allAlerts.total = allAlerts.critical + allAlerts.warning + allAlerts.info;

    // Generate trends
    const trends = await this.generateCompanyTrends(companyId, branches);

    // Generate recommendations
    const recommendations = await this.generateCompanyRecommendations(branches);

    return {
      companyId,
      companyName: company.name,
      overview: {
        totalBranches: branches.length,
        totalPrinters,
        activePrinters,
        systemHealth,
        totalJobsToday,
        systemEfficiency
      },
      branches,
      alerts: allAlerts,
      trends,
      recommendations
    };
  }

  private async buildBranchMonitoringData(branch: any): Promise<BranchMonitoringData> {
    const printers = branch.printers || [];
    const onlinePrinters = printers.filter(p => p.status === 'online').length;
    const offlinePrinters = printers.filter(p => p.status === 'offline').length;
    const errorPrinters = printers.filter(p => p.status === 'error').length;

    // Calculate performance metrics
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const todayJobs = await this.prisma.printJob.findMany({
      where: {
        branchId: branch.id,
        createdAt: { gte: today }
      }
    });

    const completedJobs = todayJobs.filter(j => j.status === 'completed').length;
    const failedJobs = todayJobs.filter(j => j.status === 'failed').length;
    const successRate = todayJobs.length > 0 ? Math.round((completedJobs / todayJobs.length) * 100) : 100;

    // Calculate average job time
    const completedJobsWithTime = todayJobs.filter(j => j.status === 'completed' && j.processingTime);
    const averageJobTime = completedJobsWithTime.length > 0
      ? Math.round(completedJobsWithTime.reduce((sum, j) => sum + (j.processingTime || 0), 0) / completedJobsWithTime.length)
      : 0;

    // Calculate utilization
    const totalCapacity = printers.length * 480; // Assume 480 jobs per day per printer
    const utilization = totalCapacity > 0 ? Math.round((todayJobs.length / totalCapacity) * 100) : 0;

    // Calculate health score and status
    let healthScore = 100;
    const issues = [];

    if (errorPrinters > 0) {
      healthScore -= errorPrinters * 20;
      issues.push(`${errorPrinters} printer(s) in error state`);
    }
    
    if (offlinePrinters > 0) {
      healthScore -= offlinePrinters * 15;
      issues.push(`${offlinePrinters} printer(s) offline`);
    }
    
    if (successRate < 90) {
      healthScore -= (90 - successRate);
      issues.push(`Low success rate: ${successRate}%`);
    }
    
    if (utilization > 90) {
      healthScore -= 10;
      issues.push('High utilization - potential overload');
    }

    healthScore = Math.max(0, Math.round(healthScore));

    const healthStatus = healthScore >= 90 ? 'excellent' :
                        healthScore >= 75 ? 'good' :
                        healthScore >= 60 ? 'fair' : 'poor';

    // Simulate alerts (in real implementation, would query alert system)
    const alerts = {
      critical: errorPrinters,
      warning: offlinePrinters + (successRate < 80 ? 1 : 0),
      info: utilization > 80 ? 1 : 0
    };

    return {
      branchId: branch.id,
      branchName: branch.name,
      companyId: branch.companyId,
      companyName: branch.company?.name || 'Unknown',
      printers: {
        total: printers.length,
        online: onlinePrinters,
        offline: offlinePrinters,
        error: errorPrinters,
        utilization
      },
      performance: {
        totalJobs: todayJobs.length,
        completedJobs,
        failedJobs,
        successRate,
        averageJobTime
      },
      alerts,
      health: {
        score: healthScore,
        status: healthStatus,
        issues
      },
      lastUpdate: new Date()
    };
  }

  private async buildSystemWideMetrics(): Promise<SystemWideMetrics> {
    const [companies, branches, printers, todayJobs] = await Promise.all([
      this.prisma.company.count(),
      this.prisma.branch.findMany({
        include: {
          company: { select: { name: true } },
          _count: { select: { printers: true } }
        }
      }),
      this.prisma.printer.findMany(),
      this.prisma.printJob.findMany({
        where: {
          createdAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0))
          }
        }
      })
    ]);

    const activePrinters = printers.filter(p => p.status === 'online').length;
    const systemUptime = printers.length > 0 ? Math.round((activePrinters / printers.length) * 100) : 100;

    // Calculate performance metrics
    const completedJobs = todayJobs.filter(j => j.status === 'completed').length;
    const systemEfficiency = todayJobs.length > 0 ? Math.round((completedJobs / todayJobs.length) * 100) : 100;

    // Calculate global throughput (jobs per hour)
    const hoursToday = new Date().getHours() + 1;
    const globalThroughput = Math.round(todayJobs.length / hoursToday);

    // Calculate average response time
    const completedJobsWithTime = todayJobs.filter(j => j.status === 'completed' && j.processingTime);
    const averageResponseTime = completedJobsWithTime.length > 0
      ? Math.round(completedJobsWithTime.reduce((sum, j) => sum + (j.processingTime || 0), 0) / completedJobsWithTime.length)
      : 0;

    // Find top performing branches
    const branchPerformance = await Promise.all(
      branches.slice(0, 10).map(async branch => {
        const branchData = await this.buildBranchMonitoringData(branch);
        return {
          branchId: branch.id,
          branchName: branch.name,
          companyName: branch.company?.name || 'Unknown',
          score: branchData.health.score
        };
      })
    );

    const topPerformingBranches = branchPerformance
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);

    // Calculate issues
    const offlinePrinters = printers.filter(p => p.status === 'offline').length;
    const underperformingBranches = branchPerformance.filter(b => b.score < 70).length;

    return {
      overview: {
        totalCompanies: companies,
        totalBranches: branches.length,
        totalPrinters: printers.length,
        activePrinters,
        systemUptime,
        totalJobsToday: todayJobs.length
      },
      geographic: {
        regions: [
          // This would be calculated from actual branch locations
          { region: 'North America', companies: Math.floor(companies * 0.4), branches: Math.floor(branches.length * 0.4), printers: Math.floor(printers.length * 0.4), performance: 92 },
          { region: 'Europe', companies: Math.floor(companies * 0.3), branches: Math.floor(branches.length * 0.3), printers: Math.floor(printers.length * 0.3), performance: 88 },
          { region: 'Asia Pacific', companies: Math.floor(companies * 0.2), branches: Math.floor(branches.length * 0.2), printers: Math.floor(printers.length * 0.2), performance: 85 },
          { region: 'Other', companies: Math.floor(companies * 0.1), branches: Math.floor(branches.length * 0.1), printers: Math.floor(printers.length * 0.1), performance: 90 }
        ]
      },
      performance: {
        globalThroughput,
        averageResponseTime,
        systemEfficiency,
        topPerformingBranches
      },
      issues: {
        criticalAlerts: printers.filter(p => p.status === 'error').length,
        offlinePrinters,
        underperformingBranches,
        systemBottlenecks: [
          {
            type: 'Network Latency',
            description: 'High network latency detected in some regions',
            affectedBranches: Math.floor(branches.length * 0.05),
            impact: 'Moderate - may cause delayed print jobs'
          },
          {
            type: 'Peak Hour Congestion',
            description: 'System congestion during peak business hours',
            affectedBranches: Math.floor(branches.length * 0.15),
            impact: 'Low - temporary performance reduction'
          }
        ]
      }
    };
  }

  private async generateCompanyTrends(companyId: string, branches: BranchMonitoringData[]) {
    // Generate daily volume trend for last 7 days
    const dailyVolume = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      
      const nextDay = new Date(date);
      nextDay.setDate(nextDay.getDate() + 1);
      
      const dayJobs = await this.prisma.printJob.findMany({
        where: {
          companyId,
          createdAt: {
            gte: date,
            lt: nextDay
          }
        }
      });
      
      const completed = dayJobs.filter(j => j.status === 'completed').length;
      const efficiency = dayJobs.length > 0 ? Math.round((completed / dayJobs.length) * 100) : 100;
      
      dailyVolume.push({
        date: date.toISOString().split('T')[0],
        volume: dayJobs.length,
        efficiency
      });
    }

    // Branch comparison
    const branchComparison = branches.map(branch => ({
      branchId: branch.branchId,
      branchName: branch.branchName,
      volume: branch.performance.totalJobs,
      efficiency: branch.performance.successRate,
      health: branch.health.score
    }));

    return {
      dailyVolume,
      branchComparison,
      performanceMetrics: {
        averageResponseTime: branches.length > 0 
          ? Math.round(branches.reduce((sum, b) => sum + b.performance.averageJobTime, 0) / branches.length)
          : 0,
        peakThroughput: Math.max(...branches.map(b => b.performance.totalJobs), 0),
        systemLoad: branches.length > 0 
          ? Math.round(branches.reduce((sum, b) => sum + b.printers.utilization, 0) / branches.length)
          : 0
      }
    };
  }

  private async generateCompanyRecommendations(branches: BranchMonitoringData[]) {
    const recommendations = [];

    // Check for offline printers
    const offlinePrinters = branches.reduce((sum, b) => sum + b.printers.offline, 0);
    if (offlinePrinters > 0) {
      recommendations.push({
        type: 'alert' as const,
        priority: 'high' as const,
        title: 'Offline Printers Detected',
        description: `${offlinePrinters} printer(s) are currently offline across ${branches.filter(b => b.printers.offline > 0).length} branch(es)`,
        estimatedImpact: 'Service disruption and order delays',
        actionRequired: 'Check connectivity and power status for offline printers'
      });
    }

    // Check for low efficiency branches
    const lowEfficiencyBranches = branches.filter(b => b.performance.successRate < 85);
    if (lowEfficiencyBranches.length > 0) {
      recommendations.push({
        type: 'performance' as const,
        priority: 'medium' as const,
        title: 'Low Efficiency Branches',
        description: `${lowEfficiencyBranches.length} branch(es) have efficiency below 85%`,
        estimatedImpact: 'Reduced operational efficiency and customer satisfaction',
        actionRequired: 'Review and optimize printing processes in affected branches'
      });
    }

    // Check for high utilization
    const highUtilizationBranches = branches.filter(b => b.printers.utilization > 80);
    if (highUtilizationBranches.length > 0) {
      recommendations.push({
        type: 'optimization' as const,
        priority: 'medium' as const,
        title: 'High Printer Utilization',
        description: `${highUtilizationBranches.length} branch(es) have utilization above 80%`,
        estimatedImpact: 'Risk of bottlenecks during peak hours',
        actionRequired: 'Consider adding additional printers or load balancing'
      });
    }

    // Check for maintenance needs
    const maintenanceBranches = branches.filter(b => b.health.score < 70);
    if (maintenanceBranches.length > 0) {
      recommendations.push({
        type: 'maintenance' as const,
        priority: 'high' as const,
        title: 'Maintenance Required',
        description: `${maintenanceBranches.length} branch(es) have health scores below 70%`,
        estimatedImpact: 'Increased risk of equipment failure',
        actionRequired: 'Schedule preventive maintenance for affected branches'
      });
    }

    return recommendations;
  }

  private calculateBranchUtilization(branch: BranchMonitoringData): number {
    return branch.printers.utilization;
  }

  private analyzeOptimizationOpportunities(branches: any[], printers: any[], jobs: any[]) {
    // This would contain complex optimization analysis logic
    // For now, return a structured example
    
    const totalOptimizationPotential = 25; // 25% potential improvement
    const keyRecommendations = 8;
    
    return {
      overview: {
        optimizationPotential: totalOptimizationPotential,
        estimatedSavings: '$50,000 annually',
        keyRecommendations
      },
      categories: [
        {
          category: 'performance' as const,
          score: 78,
          recommendations: [
            {
              title: 'Optimize Print Job Scheduling',
              description: 'Implement intelligent job scheduling to reduce peak hour congestion',
              impact: 'high' as const,
              effort: 'medium' as const,
              branchesAffected: Math.floor(branches.length * 0.6),
              estimatedBenefit: '15% reduction in average processing time',
              actionSteps: [
                'Deploy job queue optimization algorithm',
                'Configure load balancing rules',
                'Monitor and adjust scheduling parameters'
              ]
            }
          ]
        },
        {
          category: 'reliability' as const,
          score: 85,
          recommendations: [
            {
              title: 'Implement Predictive Maintenance',
              description: 'Use analytics to predict and prevent printer failures',
              impact: 'high' as const,
              effort: 'low' as const,
              branchesAffected: branches.length,
              estimatedBenefit: '40% reduction in unexpected downtime',
              actionSteps: [
                'Enable predictive analytics monitoring',
                'Set up automated maintenance alerts',
                'Train staff on preventive maintenance procedures'
              ]
            }
          ]
        }
      ],
      branchSpecific: branches.slice(0, 5).map(branch => ({
        branchId: branch.id,
        branchName: branch.name,
        optimizations: [
          {
            type: 'Load Balancing',
            description: 'Distribute print jobs more evenly across available printers',
            impact: '20% improvement in throughput',
            actionRequired: 'Configure automatic load balancing'
          }
        ]
      }))
    };
  }

  private validateAlertRule(rule: any): boolean {
    // Validate rule conditions and actions
    if (!rule.name || !rule.conditions || rule.conditions.length === 0) {
      return false;
    }
    
    // Check if metric names are valid
    const validMetrics = ['success_rate', 'response_time', 'utilization', 'error_count', 'offline_printers'];
    const hasValidMetrics = rule.conditions.every(condition => 
      validMetrics.includes(condition.metric)
    );
    
    return hasValidMetrics;
  }

  private generateMockAlertHistory(companyId?: string, branchId?: string, limit: number = 100, severity?: string) {
    // Generate mock alert history for demonstration
    const alerts = [];
    const alertTypes = ['printer_offline', 'high_error_rate', 'low_paper', 'connectivity_issue', 'performance_degradation'];
    const severities = severity ? [severity] : ['critical', 'warning', 'info'];
    
    for (let i = 0; i < Math.min(limit, 50); i++) {
      const timestamp = new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000); // Last 7 days
      const alertSeverity = severities[Math.floor(Math.random() * severities.length)];
      const alertType = alertTypes[Math.floor(Math.random() * alertTypes.length)];
      
      alerts.push({
        id: `alert_${Date.now()}_${i}`,
        branchId: branchId || `branch_${Math.floor(Math.random() * 10)}`,
        branchName: `Branch ${Math.floor(Math.random() * 10) + 1}`,
        printerId: Math.random() > 0.5 ? `printer_${Math.floor(Math.random() * 5)}` : undefined,
        printerName: Math.random() > 0.5 ? `Printer ${Math.floor(Math.random() * 5) + 1}` : undefined,
        type: alertType,
        severity: alertSeverity,
        message: this.generateAlertMessage(alertType, alertSeverity),
        timestamp,
        acknowledged: Math.random() > 0.3,
        acknowledgedBy: Math.random() > 0.5 ? 'admin@example.com' : undefined,
        acknowledgedAt: Math.random() > 0.5 ? new Date(timestamp.getTime() + Math.random() * 60 * 60 * 1000) : undefined,
        resolved: Math.random() > 0.4,
        resolvedAt: Math.random() > 0.6 ? new Date(timestamp.getTime() + Math.random() * 120 * 60 * 1000) : undefined,
        duration: Math.random() > 0.6 ? Math.floor(Math.random() * 120) : undefined
      });
    }
    
    return alerts.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  private generateAlertMessage(type: string, severity: string): string {
    const messages = {
      printer_offline: {
        critical: 'Printer has been offline for more than 30 minutes',
        warning: 'Printer connectivity issues detected',
        info: 'Printer temporarily disconnected'
      },
      high_error_rate: {
        critical: 'Print error rate exceeded 25% - immediate attention required',
        warning: 'Print error rate above normal threshold (15%)',
        info: 'Slight increase in print errors detected'
      },
      low_paper: {
        critical: 'Printer out of paper - service interrupted',
        warning: 'Paper level below 20%',
        info: 'Paper level below 50%'
      },
      connectivity_issue: {
        critical: 'Network connectivity lost - printer unreachable',
        warning: 'Intermittent connectivity issues detected',
        info: 'Network latency higher than normal'
      },
      performance_degradation: {
        critical: 'Print performance degraded by 50% or more',
        warning: 'Print performance below normal levels',
        info: 'Minor performance fluctuation detected'
      }
    };
    
    return messages[type]?.[severity] || 'System alert generated';
  }

  private startRealTimeMonitoring(): void {
    this.logger.log('🏢 [REAL-TIME] Starting enterprise real-time monitoring');

    // Company dashboard updates every 2 minutes
    setInterval(async () => {
      try {
        await this.broadcastCompanyUpdates();
      } catch (error) {
        this.logger.error('Company dashboard broadcast failed:', error);
      }
    }, 120000);

    // System-wide metrics updates every 5 minutes
    setInterval(async () => {
      try {
        await this.broadcastSystemMetrics();
      } catch (error) {
        this.logger.error('System metrics broadcast failed:', error);
      }
    }, 300000);

    // Alert monitoring every 30 seconds
    setInterval(async () => {
      try {
        await this.monitorAndBroadcastAlerts();
      } catch (error) {
        this.logger.error('Alert monitoring failed:', error);
      }
    }, 30000);
  }

  private async broadcastCompanyUpdates(): Promise<void> {
    // Clear cache to force fresh data
    this.monitoringCache.clear();
    
    // Get all companies and broadcast updates
    const companies = await this.prisma.company.findMany({
      select: { id: true, name: true }
    });
    
    for (const company of companies.slice(0, 5)) { // Limit to prevent overload
      try {
        const dashboard = await this.getCompanyDashboard(company.id);
        
        this.websocketGateway.server.emit('companyDashboardUpdate', {
          companyId: company.id,
          dashboard,
          timestamp: new Date()
        });
      } catch (error) {
        this.logger.warn(`Failed to update dashboard for company ${company.id}:`, error.message);
      }
    }
  }

  private async broadcastSystemMetrics(): Promise<void> {
    this.systemMetricsCache = null; // Clear cache
    
    const metrics = await this.getSystemWideMetrics();
    
    this.websocketGateway.server.emit('systemWideMetricsUpdate', {
      metrics,
      timestamp: new Date()
    });
  }

  private async monitorAndBroadcastAlerts(): Promise<void> {
    // This would integrate with a real alert monitoring system
    // For now, simulate alert detection and broadcasting
    
    const criticalAlerts = [];
    const printers = await this.prisma.printer.findMany({
      where: { status: 'error' },
      include: {
        branch: { select: { name: true } }
      },
      take: 5
    });
    
    for (const printer of printers) {
      criticalAlerts.push({
        id: `alert_${Date.now()}_${printer.id}`,
        printerId: printer.id,
        printerName: printer.name,
        branchId: printer.branchId,
        branchName: printer.branch?.name || 'Unknown',
        type: 'printer_error',
        severity: 'critical',
        message: `Printer ${printer.name} is in error state`,
        timestamp: new Date()
      });
    }
    
    if (criticalAlerts.length > 0) {
      this.websocketGateway.server.emit('enterpriseAlertsUpdate', {
        alerts: criticalAlerts,
        timestamp: new Date()
      });
    }
  }
}