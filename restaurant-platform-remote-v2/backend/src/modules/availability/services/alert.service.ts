import { Injectable, NotFoundException, Inject, forwardRef, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import {
  CreateAvailabilityAlertDto,
  UpdateAvailabilityAlertDto,
  AlertFiltersDto,
  BulkAlertOperationDto,
  AlertType,
  AlertSeverity,
  ConnectedType
} from '../dto';
import { AvailabilityGateway } from '../availability.gateway';

@Injectable()
export class AlertService {
  private readonly logger = new Logger(AlertService.name);
  
  constructor(
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => AvailabilityGateway))
    private readonly gateway: AvailabilityGateway
  ) {}

  // ========================
  // ALERT CRUD OPERATIONS
  // ========================

  async createAlert(data: CreateAvailabilityAlertDto, companyId: string) {
    const alert = await this.prisma.availabilityAlert.create({
      data: {
        companyId,
        branchId: data.branchId,
        alertType: data.alertType as any,
        severity: data.severity as any,
        title: data.title,
        message: data.message,
        connectedId: data.connectedId,
        connectedType: data.connectedType as ConnectedType,
        channels: data.channels || []
      },
      include: {
        branch: {
          select: { id: true, name: true, nameAr: true }
        }
      }
    });

    // Broadcast real-time alert notification
    await this.broadcastAlert(alert);

    // TODO: Implement actual notification sending based on channels
    await this.sendNotifications(alert);

    return alert;
  }

  async updateAlert(id: string, data: UpdateAvailabilityAlertDto, companyId: string, userId?: string) {
    const existing = await this.prisma.availabilityAlert.findFirst({
      where: { id, companyId }
    });

    if (!existing) {
      throw new NotFoundException('Alert not found');
    }

    const updateData: any = { ...data };
    
    if (data.isResolved && !existing.isResolved) {
      updateData.resolvedAt = new Date();
      updateData.resolvedBy = userId;
    }

    const updated = await this.prisma.availabilityAlert.update({
      where: { id },
      data: updateData
    });

    // Broadcast alert update
    await this.gateway.broadcastAlertUpdate({
      id: updated.id,
      companyId: updated.companyId,
      branchId: updated.branchId,
      isRead: updated.isRead,
      isResolved: updated.isResolved,
      resolvedBy: updated.resolvedBy
    });

    return updated;
  }

  async deleteAlert(id: string, companyId: string) {
    const existing = await this.prisma.availabilityAlert.findFirst({
      where: { id, companyId }
    });

    if (!existing) {
      throw new NotFoundException('Alert not found');
    }

    await this.prisma.availabilityAlert.delete({
      where: { id }
    });

    return { success: true, message: 'Alert deleted successfully' };
  }

  // ========================
  // ALERT QUERYING
  // ========================

  async getAlerts(filters: AlertFiltersDto, companyId: string) {
    const {
      branchId,
      alertType,
      severity,
      isRead,
      isResolved,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = filters;

    const where: any = { companyId };

    if (branchId) where.branchId = branchId;
    if (alertType) where.alertType = alertType;
    if (severity) where.severity = severity;
    if (isRead !== undefined) where.isRead = isRead;
    if (isResolved !== undefined) where.isResolved = isResolved;

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { message: { contains: search, mode: 'insensitive' } }
      ];
    }

    const alerts = await this.prisma.availabilityAlert.findMany({
      where,
      orderBy: { [sortBy]: sortOrder },
      include: {
        branch: {
          select: { id: true, name: true, nameAr: true }
        }
      }
    });

    return {
      alerts,
      total: alerts.length
    };
  }

  async getAlertStats(companyId: string, branchId?: string) {
    const where: any = { companyId };
    if (branchId) where.branchId = branchId;

    const [
      totalAlerts,
      unreadAlerts,
      unresolvedAlerts,
      criticalAlerts,
      alertsByType,
      alertsBySeverity
    ] = await Promise.all([
      this.prisma.availabilityAlert.count({ where }),
      this.prisma.availabilityAlert.count({ where: { ...where, isRead: false } }),
      this.prisma.availabilityAlert.count({ where: { ...where, isResolved: false } }),
      this.prisma.availabilityAlert.count({ 
        where: { ...where, severity: AlertSeverity.CRITICAL, isResolved: false } 
      }),
      this.prisma.availabilityAlert.groupBy({
        by: ['alertType'],
        where: { ...where, isResolved: false },
        _count: { alertType: true }
      }),
      this.prisma.availabilityAlert.groupBy({
        by: ['severity'],
        where: { ...where, isResolved: false },
        _count: { severity: true }
      })
    ]);

    return {
      totals: {
        total: totalAlerts,
        unread: unreadAlerts,
        unresolved: unresolvedAlerts,
        critical: criticalAlerts
      },
      byType: alertsByType.reduce((acc, item) => {
        acc[item.alertType] = item._count.alertType;
        return acc;
      }, {}),
      bySeverity: alertsBySeverity.reduce((acc, item) => {
        acc[item.severity] = item._count.severity;
        return acc;
      }, {})
    };
  }

  // ========================
  // BULK OPERATIONS
  // ========================

  async bulkUpdateAlerts(data: BulkAlertOperationDto, companyId: string, userId?: string) {
    // Validate all alerts belong to the company
    const alerts = await this.prisma.availabilityAlert.findMany({
      where: {
        id: { in: data.alertIds },
        companyId
      }
    });

    if (alerts.length !== data.alertIds.length) {
      throw new NotFoundException('Some alerts not found or access denied');
    }

    let updateData: any = {};
    let deleteOperation = false;

    switch (data.operation) {
      case 'mark_read':
        updateData = { isRead: true };
        break;
      case 'mark_unread':
        updateData = { isRead: false };
        break;
      case 'resolve':
        updateData = { 
          isResolved: true, 
          resolvedAt: new Date(),
          resolvedBy: userId,
          resolutionNotes: data.reason
        };
        break;
      case 'delete':
        deleteOperation = true;
        break;
    }

    if (deleteOperation) {
      await this.prisma.availabilityAlert.deleteMany({
        where: {
          id: { in: data.alertIds },
          companyId
        }
      });
    } else {
      await this.prisma.availabilityAlert.updateMany({
        where: {
          id: { in: data.alertIds },
          companyId
        },
        data: updateData
      });
    }

    return {
      success: true,
      operation: data.operation,
      processedCount: alerts.length,
      message: `Successfully ${data.operation.replace('_', ' ')} ${alerts.length} alerts`
    };
  }

  // ========================
  // ALERT GENERATION
  // ========================

  async generateStockAlerts(companyId: string) {
    // Find all availability records with low stock
    const lowStockItems = await this.prisma.branchAvailability.findMany({
      where: {
        companyId,
        isActive: true,
        stockLevel: { not: null },
        lowStockThreshold: { not: null }
      }
    });

    const alertsToCreate = [];

    for (const item of lowStockItems) {
      if (item.stockLevel <= 0) {
        // Check if similar alert exists in the last 24 hours
        const existingAlert = await this.prisma.availabilityAlert.findFirst({
          where: {
            companyId,
            connectedId: item.connectedId,
            connectedType: item.connectedType as any,
            alertType: AlertType.OUT_OF_STOCK,
            createdAt: {
              gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
            }
          }
        });

        if (!existingAlert) {
          alertsToCreate.push({
            companyId,
            branchId: item.branchId,
            alertType: AlertType.OUT_OF_STOCK,
            severity: AlertSeverity.HIGH,
            title: 'Item Out of Stock',
            message: `Item is currently out of stock and needs restocking`,
            connectedId: item.connectedId,
            connectedType: item.connectedType,
            channels: ['email', 'push']
          });
        }
      } else if (item.stockLevel <= item.lowStockThreshold) {
        // Check if similar alert exists in the last 12 hours
        const existingAlert = await this.prisma.availabilityAlert.findFirst({
          where: {
            companyId,
            connectedId: item.connectedId,
            connectedType: item.connectedType as any,
            alertType: AlertType.LOW_STOCK,
            createdAt: {
              gte: new Date(Date.now() - 12 * 60 * 60 * 1000)
            }
          }
        });

        if (!existingAlert) {
          alertsToCreate.push({
            companyId,
            branchId: item.branchId,
            alertType: AlertType.LOW_STOCK,
            severity: AlertSeverity.MEDIUM,
            title: 'Low Stock Alert',
            message: `Item stock is running low (${item.stockLevel} remaining, threshold: ${item.lowStockThreshold})`,
            connectedId: item.connectedId,
            connectedType: item.connectedType,
            channels: ['email']
          });
        }
      }
    }

    if (alertsToCreate.length > 0) {
      const createdAlerts = await Promise.all(
        alertsToCreate.map(async alert => {
          const createdAlert = await this.prisma.availabilityAlert.create({
            data: {
              ...alert,
              alertType: alert.alertType as any,
              severity: alert.severity as any
            },
            include: {
              branch: {
                select: { id: true, name: true, nameAr: true }
              }
            }
          });

          // Broadcast each alert
          await this.broadcastAlert(createdAlert);
          
          return createdAlert;
        })
      );
    }

    return {
      success: true,
      generatedAlerts: alertsToCreate.length,
      message: `Generated ${alertsToCreate.length} stock alerts`
    };
  }

  // ========================
  // NOTIFICATION HANDLING
  // ========================

  private async sendNotifications(alert: any) {
    // This is where we would integrate with actual notification services
    // For now, we'll just mark when notifications were sent
    
    const notificationPromises = [];

    if (alert.channels.includes('email')) {
      notificationPromises.push(this.sendEmailNotification(alert));
    }

    if (alert.channels.includes('sms')) {
      notificationPromises.push(this.sendSMSNotification(alert));
    }

    if (alert.channels.includes('push')) {
      notificationPromises.push(this.sendPushNotification(alert));
    }

    if (alert.channels.includes('webhook')) {
      notificationPromises.push(this.sendWebhookNotification(alert));
    }

    try {
      await Promise.all(notificationPromises);
      
      // Mark as sent
      await this.prisma.availabilityAlert.update({
        where: { id: alert.id },
        data: { sentAt: new Date() }
      });
    } catch (error) {
      this.logger.error('Failed to send notifications:', error.stack);
    }
  }

  private async sendEmailNotification(alert: any) {
    // TODO: Implement email notification
    this.logger.debug(`Email notification for alert: ${alert.title}`);
  }

  private async sendSMSNotification(alert: any) {
    // TODO: Implement SMS notification
    this.logger.debug(`SMS notification for alert: ${alert.title}`);
  }

  private async sendPushNotification(alert: any) {
    // TODO: Implement push notification
    this.logger.debug(`Push notification for alert: ${alert.title}`);
  }

  private async sendWebhookNotification(alert: any) {
    // TODO: Implement webhook notification
    this.logger.debug(`Webhook notification for alert: ${alert.title}`);
  }

  // ========================
  // ALERT CLEANUP
  // ========================

  async cleanupOldAlerts(companyId: string, daysOld: number = 30) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const deleted = await this.prisma.availabilityAlert.deleteMany({
      where: {
        companyId,
        isResolved: true,
        resolvedAt: {
          lt: cutoffDate
        }
      }
    });

    return {
      success: true,
      deletedCount: deleted.count,
      message: `Cleaned up ${deleted.count} old resolved alerts`
    };
  }

  // ========================
  // REAL-TIME BROADCASTING
  // ========================

  private async broadcastAlert(alert: any) {
    try {
      // Map to the format expected by the gateway
      const alertData = {
        id: alert.id,
        companyId: alert.companyId,
        branchId: alert.branchId || '',
        connectedId: alert.connectedId || '',
        connectedType: alert.connectedType || '',
        alertType: this.mapAlertTypeForBroadcast(alert.alertType),
        message: alert.message,
        priority: this.mapSeverityToPriority(alert.severity),
        currentStock: alert.metadata?.currentStock,
        threshold: alert.metadata?.threshold,
        title: alert.title,
        createdAt: alert.createdAt,
        branch: alert.branch
      };

      await this.gateway.broadcastAlert(alertData);
    } catch (error) {
      console.error('Failed to broadcast alert:', error);
    }
  }

  private mapAlertTypeForBroadcast(alertType: string): 'out_of_stock' | 'low_stock' | 'overstocked' {
    switch (alertType) {
      case AlertType.OUT_OF_STOCK:
        return 'out_of_stock';
      case AlertType.LOW_STOCK:
        return 'low_stock';
      default:
        return 'low_stock';
    }
  }

  private mapSeverityToPriority(severity: string): 'low' | 'medium' | 'high' | 'critical' {
    switch (severity) {
      case AlertSeverity.LOW:
        return 'low';
      case AlertSeverity.MEDIUM:
        return 'medium';
      case AlertSeverity.HIGH:
        return 'high';
      case AlertSeverity.CRITICAL:
        return 'critical';
      default:
        return 'medium';
    }
  }
}