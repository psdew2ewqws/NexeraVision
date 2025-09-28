/**
 * Phase 3: Discovery Service
 * Backend service for managing printer discovery operations
 */

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { PrintingWebSocketGateway } from '../gateways/printing-websocket.gateway';

@Injectable()
export class DiscoveryService {
  private readonly logger = new Logger(DiscoveryService.name);

  constructor(
    private readonly prismaService: PrismaService,
    private readonly websocketGateway: PrintingWebSocketGateway,
  ) {}

  /**
   * Get overall discovery status for company
   */
  async getOverallStatus(companyId: string) {
    try {
      this.logger.log(`Getting overall discovery status for company: ${companyId}`);

      // Get all printers for the company
      const printers = await this.prismaService.printer.findMany({
        where: { companyId }
      });

      // Group printers by branch
      const branchesStatus = new Map();
      printers.forEach(printer => {
        const branchId = printer.branchId || 'unknown';
        if (!branchesStatus.has(branchId)) {
          branchesStatus.set(branchId, {
            branchId,
            branchName: 'Unknown Branch',
            printerCount: 0,
            onlinePrinters: 0,
            lastDiscovery: null,
            discoveryActive: false
          });
        }

        const branchStatus = branchesStatus.get(branchId);
        branchStatus.printerCount++;
        if (printer.status === 'online') {
          branchStatus.onlinePrinters++;
        }

        // Update last discovery time
        const lastSeen = new Date(printer.lastSeen || printer.updatedAt);
        if (!branchStatus.lastDiscovery || lastSeen > branchStatus.lastDiscovery) {
          branchStatus.lastDiscovery = lastSeen;
        }

        // Check if discovery is considered active (heartbeat within last 2 minutes)
        const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);
        if (lastSeen > twoMinutesAgo) {
          branchStatus.discoveryActive = true;
        }
      });

      const branches = Array.from(branchesStatus.values());

      return {
        companyId,
        totalBranches: branches.length,
        activeBranches: branches.filter(b => b.discoveryActive).length,
        totalPrinters: printers.length,
        onlinePrinters: branches.reduce((sum, b) => sum + b.onlinePrinters, 0),
        branches,
        lastUpdate: new Date().toISOString()
      };

    } catch (error) {
      this.logger.error(`Failed to get overall discovery status: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get discovery status for specific branch
   */
  async getBranchStatus(branchId: string, companyId: string) {
    try {
      this.logger.log(`Getting discovery status for branch: ${branchId}`);

      const printers = await this.prismaService.printer.findMany({
        where: { branchId, companyId },
        orderBy: { lastSeen: 'desc' }
      });

      const now = new Date();
      const oneMinuteAgo = new Date(now.getTime() - 60 * 1000);
      const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);

      const status = {
        branchId,
        companyId,
        printerCount: printers.length,
        onlinePrinters: printers.filter(p => p.status === 'online').length,
        offlinePrinters: printers.filter(p => p.status === 'offline').length,
        recentlyDiscovered: printers.filter(p => new Date(p.lastSeen || p.createdAt) > fiveMinutesAgo).length,
        lastDiscovery: printers.length > 0 ? printers[0].lastSeen || printers[0].updatedAt : null,
        discoveryActive: printers.some(p => new Date(p.lastSeen || p.updatedAt) > oneMinuteAgo),
        printers: printers.map(p => ({
          id: p.id,
          name: p.name,
          type: p.type,
          status: p.status,
          connection: p.connection,
          lastSeen: p.lastSeen,
          discoveryMethod: 'system_detection'
        }))
      };

      return status;

    } catch (error) {
      this.logger.error(`Failed to get branch discovery status: ${error.message}`);
      throw error;
    }
  }

  /**
   * Send control command to discovery services via WebSocket
   */
  async sendControlCommand(command: any) {
    try {
      this.logger.log(`Sending discovery control command: ${command.action}`);

      const results = [];

      // For now, log the command - WebSocket broadcasting will be implemented later
      this.logger.log(`Discovery control command: ${command.action} for company: ${command.companyId}`);

      if (command.branchIds && Array.isArray(command.branchIds)) {
        // Log specific branch commands
        for (const branchId of command.branchIds) {
          this.logger.log(`Command ${command.action} queued for branch: ${branchId}`);
          results.push({
            branchId,
            status: 'queued',
            message: 'Command queued for delivery (WebSocket broadcast to be implemented)'
          });
        }
      } else {
        // Log company-wide command
        this.logger.log(`Command ${command.action} queued for all branches in company: ${command.companyId}`);
        results.push({
          target: 'all_branches',
          status: 'queued',
          message: 'Command queued for company-wide broadcast (to be implemented)'
        });
      }

      return results;

    } catch (error) {
      this.logger.error(`Failed to send discovery control command: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get discovery service statistics
   */
  async getStatistics(params: { companyId: string; period: string }) {
    try {
      this.logger.log(`Getting discovery statistics for company: ${params.companyId}, period: ${params.period}`);

      // Calculate time range based on period
      let startDate: Date;
      switch (params.period) {
        case '1h':
          startDate = new Date(Date.now() - 60 * 60 * 1000);
          break;
        case '6h':
          startDate = new Date(Date.now() - 6 * 60 * 60 * 1000);
          break;
        case '24h':
        default:
          startDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
          break;
        case '7d':
          startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
          break;
      }

      // Get printers with recent activity
      const recentPrinters = await this.prismaService.printer.findMany({
        where: {
          companyId: params.companyId,
          lastSeen: { gt: startDate }
        },
        orderBy: { lastSeen: 'desc' }
      });

      // Group by discovery method
      const discoveryMethods = new Map();
      recentPrinters.forEach(printer => {
        const method = 'system_detection'; // Fixed discovery method
        if (!discoveryMethods.has(method)) {
          discoveryMethods.set(method, 0);
        }
        discoveryMethods.set(method, discoveryMethods.get(method) + 1);
      });

      // Group by connection type
      const connectionTypes = new Map();
      recentPrinters.forEach(printer => {
        const type = printer.connection || 'unknown';
        if (!connectionTypes.has(type)) {
          connectionTypes.set(type, 0);
        }
        connectionTypes.set(type, connectionTypes.get(type) + 1);
      });

      // Calculate discovery frequency (printers discovered per hour)
      const periodHours = (Date.now() - startDate.getTime()) / (60 * 60 * 1000);
      const discoveryRate = recentPrinters.length / periodHours;

      return {
        period: params.period,
        periodStart: startDate.toISOString(),
        periodEnd: new Date().toISOString(),
        totalDiscoveredPrinters: recentPrinters.length,
        discoveryRate: Math.round(discoveryRate * 100) / 100,
        discoveryMethods: Object.fromEntries(discoveryMethods),
        connectionTypes: Object.fromEntries(connectionTypes),
        statusDistribution: {
          online: recentPrinters.filter(p => p.status === 'online').length,
          offline: recentPrinters.filter(p => p.status === 'offline').length,
          error: recentPrinters.filter(p => p.status === 'error').length,
          unknown: recentPrinters.filter(p => !p.status || p.status === 'unknown').length
        },
        uniqueBranches: new Set(recentPrinters.map(p => p.branchId)).size,
        lastDiscovery: recentPrinters.length > 0 ? recentPrinters[0].lastSeen : null
      };

    } catch (error) {
      this.logger.error(`Failed to get discovery statistics: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get recently discovered printers
   */
  async getDiscoveredPrinters(params: {
    companyId: string;
    branchId?: string;
    hours: number;
  }) {
    try {
      this.logger.log(`Getting discovered printers for company: ${params.companyId}`);

      const startTime = new Date(Date.now() - params.hours * 60 * 60 * 1000);

      const whereConditions: any = {
        companyId: params.companyId,
        lastSeen: { gt: startTime }
      };

      if (params.branchId) {
        whereConditions.branchId = params.branchId;
      }

      const discoveredPrinters = await this.prismaService.printer.findMany({
        where: whereConditions,
        orderBy: { lastSeen: 'desc' }
      });

      return discoveredPrinters.map(printer => ({
        id: printer.id,
        name: printer.name,
        type: printer.type,
        connectionType: printer.connection,
        status: printer.status,
        branchId: printer.branchId,
        discoveredAt: printer.createdAt,
        lastSeen: printer.lastSeen,
        discoveryMethod: 'system_detection',
        manufacturer: printer.manufacturer,
        model: printer.model,
        ipAddress: printer.ip,
        capabilities: printer.capabilities || []
      }));

    } catch (error) {
      this.logger.error(`Failed to get discovered printers: ${error.message}`);
      throw error;
    }
  }

  /**
   * Update discovery service configuration
   */
  async updateConfiguration(config: any) {
    try {
      this.logger.log(`Updating discovery configuration for company: ${config.companyId}`);

      // Log configuration update - WebSocket broadcasting will be implemented later
      this.logger.log(`Discovery configuration update for company: ${config.companyId}`, config);

      // Here you might want to store the configuration in a database table
      // For now, we'll just return the config as confirmation
      return {
        companyId: config.companyId,
        discoveryInterval: config.discoveryInterval || 30000,
        enableUSB: config.enableUSB !== false,
        enableSystem: config.enableSystem !== false,
        enableNetwork: config.enableNetwork || false,
        enableBluetooth: config.enableBluetooth || false,
        networkScanRange: config.networkScanRange || '192.168.1.0/24',
        updatedBy: config.updatedBy,
        updatedAt: config.timestamp
      };

    } catch (error) {
      this.logger.error(`Failed to update discovery configuration: ${error.message}`);
      throw error;
    }
  }

  /**
   * Clear discovery cache for branch
   */
  async clearBranchCache(branchId: string, companyId: string) {
    try {
      this.logger.log(`Clearing discovery cache for branch: ${branchId}`);

      // Log cache clear command - WebSocket broadcasting will be implemented later
      this.logger.log(`Discovery cache clear command for branch: ${branchId}`);

      this.logger.log(`Discovery cache clear command sent to branch: ${branchId}`);

    } catch (error) {
      this.logger.error(`Failed to clear discovery cache: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get discovery service health status
   */
  async getHealthStatus(companyId: string) {
    try {
      this.logger.log(`Getting discovery health status for company: ${companyId}`);

      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

      // Get recent printer activity
      const recentActivity = await this.prismaService.printer.findMany({
        where: {
          companyId,
          lastSeen: { gt: fiveMinutesAgo }
        }
      });

      const hourlyActivity = await this.prismaService.printer.findMany({
        where: {
          companyId,
          lastSeen: { gt: oneHourAgo }
        }
      });

      const totalPrinters = await this.prismaService.printer.count({
        where: { companyId }
      });

      const activeBranches = new Set(recentActivity.map(p => p.branchId)).size;
      const totalBranches = new Set(hourlyActivity.map(p => p.branchId)).size;

      const healthStatus = {
        healthy: recentActivity.length > 0 && activeBranches > 0,
        score: this.calculateHealthScore(recentActivity.length, totalPrinters, activeBranches, totalBranches),
        metrics: {
          recentPrinterActivity: recentActivity.length,
          totalPrinters,
          activeBranches,
          totalBranches,
          discoveryRate: (recentActivity.length / 5) * 60, // per hour
        },
        issues: this.identifyHealthIssues(recentActivity, totalPrinters, activeBranches),
        lastActivity: recentActivity.length > 0 ?
          Math.max(...recentActivity.map(p => new Date(p.lastSeen || p.updatedAt).getTime())) : null
      };

      return healthStatus;

    } catch (error) {
      this.logger.error(`Failed to get discovery health status: ${error.message}`);
      throw error;
    }
  }

  private calculateHealthScore(recentActivity: number, totalPrinters: number, activeBranches: number, totalBranches: number): number {
    let score = 0;

    // Recent activity score (40%)
    if (recentActivity > 0) {
      score += Math.min(40, (recentActivity / Math.max(1, totalPrinters / 10)) * 40);
    }

    // Branch coverage score (30%)
    if (totalBranches > 0) {
      score += (activeBranches / totalBranches) * 30;
    } else {
      score += 30; // If no branches, assume good
    }

    // Consistency score (30%)
    if (recentActivity > 0 && activeBranches > 0) {
      score += 30;
    }

    return Math.round(score);
  }

  private identifyHealthIssues(recentActivity: any[], totalPrinters: number, activeBranches: number): string[] {
    const issues = [];

    if (recentActivity.length === 0) {
      issues.push('No recent discovery activity detected');
    }

    if (activeBranches === 0) {
      issues.push('No active discovery services from any branch');
    }

    if (totalPrinters > 0 && recentActivity.length / totalPrinters < 0.1) {
      issues.push('Low discovery activity compared to total printers');
    }

    if (issues.length === 0) {
      issues.push('All systems operational');
    }

    return issues;
  }
}