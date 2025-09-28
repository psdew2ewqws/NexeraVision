/**
 * Phase 3: Discovery Heartbeat Service
 * Manages heartbeat from desktop applications' discovery services
 */

import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';

// You may need to create this entity or use an existing one
interface DiscoveryHeartbeat {
  id: string;
  branchId: string;
  companyId: string;
  deviceId: string;
  appVersion: string;
  discoveryStats: any;
  systemInfo: any;
  timestamp: Date;
  source: string;
  createdAt: Date;
}

@Injectable()
export class DiscoveryHeartbeatService {
  private readonly logger = new Logger(DiscoveryHeartbeatService.name);

  // In-memory storage for heartbeats (replace with database entity if needed)
  private heartbeats: Map<string, DiscoveryHeartbeat> = new Map();

  constructor() {
    // Clean up old heartbeats every 10 minutes
    setInterval(() => {
      this.cleanupOldHeartbeats();
    }, 10 * 60 * 1000);
  }

  /**
   * Process incoming heartbeat from desktop application
   */
  async processHeartbeat(heartbeatData: any): Promise<DiscoveryHeartbeat> {
    try {
      this.logger.log(`Processing heartbeat from branch: ${heartbeatData.branchId}, device: ${heartbeatData.deviceId}`);

      const heartbeat: DiscoveryHeartbeat = {
        id: `${heartbeatData.branchId}-${heartbeatData.deviceId}-${Date.now()}`,
        branchId: heartbeatData.branchId,
        companyId: heartbeatData.companyId,
        deviceId: heartbeatData.deviceId || 'unknown',
        appVersion: heartbeatData.appVersion || 'unknown',
        discoveryStats: {
          isRunning: heartbeatData.discoveryService?.isRunning || false,
          lastDiscovery: heartbeatData.discoveryService?.lastDiscovery,
          cachedPrinters: heartbeatData.discoveryService?.cachedPrinters || 0,
          totalDiscoveries: heartbeatData.discoveryService?.totalDiscoveries || 0,
          errors: heartbeatData.discoveryService?.errors || 0,
          averageDiscoveryTime: heartbeatData.discoveryService?.averageDiscoveryTime || 0
        },
        systemInfo: {
          platform: heartbeatData.systemInfo?.platform,
          hostname: heartbeatData.systemInfo?.hostname,
          uptime: heartbeatData.systemInfo?.uptime,
          memory: heartbeatData.systemInfo?.memory,
          cpus: heartbeatData.systemInfo?.cpus
        },
        timestamp: heartbeatData.timestamp || new Date(),
        source: heartbeatData.source || 'desktop_app',
        createdAt: new Date()
      };

      // Store heartbeat (in production, this should be saved to database)
      const key = `${heartbeat.branchId}-${heartbeat.deviceId}`;
      this.heartbeats.set(key, heartbeat);

      // Log heartbeat statistics
      this.logger.debug(`Heartbeat stats - Branch: ${heartbeat.branchId}, Discovery Running: ${heartbeat.discoveryStats.isRunning}, Cached Printers: ${heartbeat.discoveryStats.cachedPrinters}`);

      return heartbeat;

    } catch (error) {
      this.logger.error(`Failed to process heartbeat: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Get heartbeat history for a branch
   */
  async getHeartbeatHistory(params: {
    branchId: string;
    companyId: string;
    limit: number;
    hours: number;
  }): Promise<DiscoveryHeartbeat[]> {
    try {
      this.logger.log(`Getting heartbeat history for branch: ${params.branchId}`);

      const cutoffTime = new Date(Date.now() - params.hours * 60 * 60 * 1000);

      // Filter heartbeats for the branch and time range
      const branchHeartbeats = Array.from(this.heartbeats.values())
        .filter(hb =>
          hb.branchId === params.branchId &&
          hb.companyId === params.companyId &&
          hb.timestamp > cutoffTime
        )
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
        .slice(0, params.limit);

      return branchHeartbeats;

    } catch (error) {
      this.logger.error(`Failed to get heartbeat history: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get latest heartbeat for a branch
   */
  async getLatestHeartbeat(branchId: string, companyId: string): Promise<DiscoveryHeartbeat | null> {
    try {
      const key = `${branchId}-${companyId}`;
      const keyPattern = new RegExp(`^${branchId}-`);

      // Find the latest heartbeat for this branch
      let latestHeartbeat: DiscoveryHeartbeat | null = null;
      let latestTime = 0;

      for (const [heartbeatKey, heartbeat] of this.heartbeats.entries()) {
        if (heartbeat.branchId === branchId &&
            heartbeat.companyId === companyId &&
            heartbeat.timestamp.getTime() > latestTime) {
          latestHeartbeat = heartbeat;
          latestTime = heartbeat.timestamp.getTime();
        }
      }

      return latestHeartbeat;

    } catch (error) {
      this.logger.error(`Failed to get latest heartbeat: ${error.message}`);
      throw error;
    }
  }

  /**
   * Check if branch discovery service is alive
   */
  async isDiscoveryServiceAlive(branchId: string, companyId: string, thresholdMinutes: number = 2): Promise<boolean> {
    try {
      const latestHeartbeat = await this.getLatestHeartbeat(branchId, companyId);

      if (!latestHeartbeat) {
        return false;
      }

      const thresholdTime = Date.now() - (thresholdMinutes * 60 * 1000);
      return latestHeartbeat.timestamp.getTime() > thresholdTime;

    } catch (error) {
      this.logger.error(`Failed to check discovery service alive status: ${error.message}`);
      return false;
    }
  }

  /**
   * Get heartbeat statistics for company
   */
  async getCompanyHeartbeatStats(companyId: string): Promise<any> {
    try {
      this.logger.log(`Getting heartbeat statistics for company: ${companyId}`);

      const companyHeartbeats = Array.from(this.heartbeats.values())
        .filter(hb => hb.companyId === companyId);

      const now = Date.now();
      const fiveMinutesAgo = now - (5 * 60 * 1000);
      const oneHourAgo = now - (60 * 60 * 1000);

      const activeBranches = new Set();
      const recentBranches = new Set();
      let totalPrinters = 0;
      let runningServices = 0;

      companyHeartbeats.forEach(hb => {
        if (hb.timestamp.getTime() > fiveMinutesAgo) {
          activeBranches.add(hb.branchId);
          totalPrinters += hb.discoveryStats.cachedPrinters || 0;
          if (hb.discoveryStats.isRunning) {
            runningServices++;
          }
        }

        if (hb.timestamp.getTime() > oneHourAgo) {
          recentBranches.add(hb.branchId);
        }
      });

      return {
        companyId,
        activeBranches: activeBranches.size,
        recentBranches: recentBranches.size,
        totalCachedPrinters: totalPrinters,
        runningServices,
        totalHeartbeats: companyHeartbeats.length,
        lastHeartbeat: companyHeartbeats.length > 0 ?
          Math.max(...companyHeartbeats.map(hb => hb.timestamp.getTime())) : null,
        healthStatus: activeBranches.size > 0 ? 'healthy' : 'unhealthy'
      };

    } catch (error) {
      this.logger.error(`Failed to get company heartbeat stats: ${error.message}`);
      throw error;
    }
  }

  /**
   * Clean up old heartbeats to prevent memory leaks
   */
  private cleanupOldHeartbeats(): void {
    try {
      const cutoffTime = Date.now() - (24 * 60 * 60 * 1000); // 24 hours ago
      let removedCount = 0;

      for (const [key, heartbeat] of this.heartbeats.entries()) {
        if (heartbeat.timestamp.getTime() < cutoffTime) {
          this.heartbeats.delete(key);
          removedCount++;
        }
      }

      if (removedCount > 0) {
        this.logger.log(`Cleaned up ${removedCount} old heartbeats. Current count: ${this.heartbeats.size}`);
      }

    } catch (error) {
      this.logger.error(`Failed to cleanup old heartbeats: ${error.message}`);
    }
  }

  /**
   * Get all active branches (with recent heartbeats)
   */
  async getActiveBranches(companyId: string, thresholdMinutes: number = 5): Promise<string[]> {
    try {
      const thresholdTime = Date.now() - (thresholdMinutes * 60 * 1000);
      const activeBranches = new Set<string>();

      Array.from(this.heartbeats.values())
        .filter(hb =>
          hb.companyId === companyId &&
          hb.timestamp.getTime() > thresholdTime
        )
        .forEach(hb => activeBranches.add(hb.branchId));

      return Array.from(activeBranches);

    } catch (error) {
      this.logger.error(`Failed to get active branches: ${error.message}`);
      return [];
    }
  }

  /**
   * Get discovery service status for all branches in company
   */
  async getAllBranchDiscoveryStatus(companyId: string): Promise<Map<string, any>> {
    try {
      this.logger.log(`Getting all branch discovery status for company: ${companyId}`);

      const branchStatus = new Map();
      const recentTime = Date.now() - (5 * 60 * 1000); // 5 minutes ago

      Array.from(this.heartbeats.values())
        .filter(hb => hb.companyId === companyId)
        .forEach(hb => {
          const isRecent = hb.timestamp.getTime() > recentTime;
          const existing = branchStatus.get(hb.branchId);

          if (!existing || hb.timestamp > existing.lastHeartbeat) {
            branchStatus.set(hb.branchId, {
              branchId: hb.branchId,
              deviceId: hb.deviceId,
              isActive: isRecent,
              discoveryRunning: hb.discoveryStats.isRunning,
              cachedPrinters: hb.discoveryStats.cachedPrinters,
              totalDiscoveries: hb.discoveryStats.totalDiscoveries,
              lastHeartbeat: hb.timestamp,
              appVersion: hb.appVersion,
              systemInfo: hb.systemInfo
            });
          }
        });

      return branchStatus;

    } catch (error) {
      this.logger.error(`Failed to get all branch discovery status: ${error.message}`);
      throw error;
    }
  }
}