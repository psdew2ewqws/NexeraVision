import { Injectable, ForbiddenException, NotFoundException, BadRequestException, Inject } from '@nestjs/common';
import { PrismaService } from '../../../shared/database/prisma.service';
import { UserRole } from '@prisma/client';
import { MenuHereIntegrationService } from './menuhere-integration.service';

@Injectable()
export class TenantPrintingService {
  constructor(
    private prisma: PrismaService,
    @Inject(MenuHereIntegrationService) private menuHereService: MenuHereIntegrationService
  ) {}

  /**
   * Enforces strict multi-tenant isolation for printer operations
   */
  async validatePrinterAccess(
    printerId: string,
    userCompanyId: string,
    userBranchId?: string,
    userRole?: UserRole
  ) {
    const printer = await this.prisma.printer.findUnique({
      where: { id: printerId },
      include: {
        company: { select: { id: true, name: true, status: true } },
        branch: { select: { id: true, name: true, companyId: true } }
      }
    });

    if (!printer) {
      throw new NotFoundException('Printer not found');
    }

    // Super admin can access all printers
    if (userRole === 'super_admin') {
      return printer;
    }

    // Company isolation: Users can only access printers from their company
    if (printer.companyId !== userCompanyId) {
      throw new ForbiddenException('Access denied: Printer belongs to different company');
    }

    // Branch isolation: Non-admin users can only access their branch printers
    if (userRole !== 'company_owner' && userBranchId && printer.branchId && printer.branchId !== userBranchId) {
      throw new ForbiddenException('Access denied: Printer belongs to different branch');
    }

    // Company status check
    if (printer.company.status !== 'active') {
      throw new ForbiddenException('Access denied: Company is not active');
    }

    return printer;
  }

  /**
   * Gets printers with strict tenant isolation
   */
  async getTenantPrinters(
    userCompanyId: string,
    userBranchId?: string,
    userRole?: UserRole,
    options?: {
      includeOffline?: boolean;
      assignment?: string;
      type?: string;
      includeCompanyInfo?: boolean;
      includeDeliveryPlatforms?: boolean;
      includeLicenseInfo?: boolean;
    }
  ) {
    // Build where clause with tenant isolation
    const where: any = {};

    if (userRole === 'super_admin') {
      // Super admin can see all printers, but we still apply company filter if provided
      if (userCompanyId && userCompanyId !== 'all') {
        where.companyId = userCompanyId;
      }
    } else {
      // Strict company isolation for all other users
      where.companyId = userCompanyId;
      
      // Branch isolation for branch-level users
      if (userRole !== 'company_owner' && userBranchId) {
        where.OR = [
          { branchId: userBranchId },
          { branchId: null, assignedTo: 'all' } // Global company printers
        ];
      }
    }

    // Additional filters
    if (!options?.includeOffline) {
      where.status = { in: ['online', 'unknown'] };
    }
    
    if (options?.assignment) {
      where.assignedTo = options.assignment;
    }
    
    if (options?.type) {
      where.type = options.type;
    }

    // Include only active companies
    where.company = {
      status: 'active'
    };

    const printers = await this.prisma.printer.findMany({
      where,
      include: {
        company: { select: { id: true, name: true, slug: true } },
        branch: { select: { id: true, name: true } },
        _count: {
          select: {
            printJobs: {
              where: {
                status: { in: ['pending', 'printing'] }
              }
            }
          }
        }
      },
      orderBy: [
        { isDefault: 'desc' },
        { status: 'asc' },
        { name: 'asc' }
      ]
    });

    // Transform results to include enhanced multi-tenant information
    return printers.map(printer => ({
      ...printer,
      // Add company name for super admin view
      companyName: options?.includeCompanyInfo ? printer.company?.name : undefined,
      // Add branch name (always included for location display)
      branchName: printer.branch?.name,
      // Include delivery platforms if requested
      deliveryPlatforms: options?.includeDeliveryPlatforms ? 
        (printer.deliveryPlatforms || {}) : undefined,
      // Include license info if requested
      licenseKey: options?.includeLicenseInfo ? printer.licenseKey : undefined,
      lastAutoDetection: options?.includeLicenseInfo ? printer.lastAutoDetection : undefined
    }));
  }

  /**
   * Creates print job with automatic branch routing
   */
  async createTenantPrintJob(
    printerId: string,
    jobData: {
      type: string;
      content: any;
      priority?: number;
      orderId?: string;
    },
    userCompanyId: string,
    userBranchId?: string,
    userId?: string,
    userRole?: UserRole
  ) {
    // Validate printer access
    const printer = await this.validatePrinterAccess(
      printerId, 
      userCompanyId, 
      userBranchId, 
      userRole
    );

    // Determine target branch for the print job
    let targetBranchId = userBranchId;
    
    // If printer has a specific branch, use that
    if (printer.branchId) {
      targetBranchId = printer.branchId;
      
      // Validate user can print to this branch
      if (userRole !== 'super_admin' && userRole !== 'company_owner' && 
          userBranchId && printer.branchId !== userBranchId) {
        throw new ForbiddenException('Cannot create print job: Printer belongs to different branch');
      }
    }

    // Create the print job with proper tenant isolation
    const printJob = await this.prisma.printJob.create({
      data: {
        type: jobData.type as any,
        content: JSON.stringify(jobData.content),
        priority: jobData.priority || 5,
        orderId: jobData.orderId,
        printerId,
        companyId: printer.companyId,
        branchId: targetBranchId,
        userId,
        status: 'pending'
      },
      include: {
        printer: {
          select: { 
            id: true, 
            name: true, 
            type: true, 
            assignedTo: true,
            branchId: true 
          }
        },
        company: { select: { id: true, name: true } },
        branch: { select: { id: true, name: true } }
      }
    });

    return printJob;
  }

  /**
   * Gets print jobs with tenant isolation and branch filtering
   */
  async getTenantPrintJobs(
    userCompanyId: string,
    userBranchId?: string,
    userRole?: UserRole,
    options?: {
      limit?: number;
      offset?: number;
      status?: string;
      printerId?: string;
      startDate?: Date;
      endDate?: Date;
    }
  ) {
    const where: any = {};

    // Tenant isolation
    if (userRole === 'super_admin') {
      if (userCompanyId && userCompanyId !== 'all') {
        where.companyId = userCompanyId;
      }
    } else {
      where.companyId = userCompanyId;
      
      // Branch filtering for non-owners
      if (userRole !== 'company_owner' && userBranchId) {
        where.OR = [
          { branchId: userBranchId },
          { branchId: null } // Company-wide jobs
        ];
      }
    }

    // Additional filters
    if (options?.status) {
      where.status = options.status;
    }
    
    if (options?.printerId) {
      // Validate printer access first
      await this.validatePrinterAccess(
        options.printerId, 
        userCompanyId, 
        userBranchId, 
        userRole
      );
      where.printerId = options.printerId;
    }

    if (options?.startDate || options?.endDate) {
      where.createdAt = {};
      if (options.startDate) where.createdAt.gte = options.startDate;
      if (options.endDate) where.createdAt.lte = options.endDate;
    }

    const [jobs, total] = await Promise.all([
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
          },
          company: { select: { id: true, name: true } },
          branch: { select: { id: true, name: true } },
          user: { select: { id: true, name: true, role: true } }
        },
        orderBy: { createdAt: 'desc' },
        take: options?.limit || 50,
        skip: options?.offset || 0
      }),
      this.prisma.printJob.count({ where })
    ]);

    return {
      jobs: jobs.map(job => ({
        ...job,
        content: JSON.parse(job.content)
      })),
      total,
      pagination: {
        limit: options?.limit || 50,
        offset: options?.offset || 0,
        hasMore: (options?.offset || 0) + jobs.length < total
      }
    };
  }

  /**
   * Smart printer selection for branch-specific printing
   */
  async selectOptimalPrinter(
    companyId: string,
    branchId?: string,
    criteria?: {
      type?: string;
      assignment?: string;
      preferDefault?: boolean;
    }
  ) {
    const where: any = {
      companyId,
      status: { in: ['online', 'unknown'] }
    };

    // Branch-specific or company-wide printers
    if (branchId) {
      where.OR = [
        { branchId },
        { branchId: null, assignedTo: 'all' }
      ];
    }

    if (criteria?.type) {
      where.type = criteria.type;
    }

    if (criteria?.assignment) {
      where.assignedTo = criteria.assignment;
    }

    // Get available printers with queue info
    const printers = await this.prisma.printer.findMany({
      where,
      include: {
        _count: {
          select: {
            printJobs: {
              where: {
                status: { in: ['pending', 'printing'] }
              }
            }
          }
        }
      },
      orderBy: [
        ...(criteria?.preferDefault ? [{ isDefault: 'desc' as const }] : []),
        { status: 'asc' },
        { name: 'asc' }
      ]
    });

    if (printers.length === 0) {
      throw new NotFoundException('No available printers found');
    }

    // Return printer with smallest queue
    return printers.reduce((optimal, current) => {
      const currentQueueSize = current._count.printJobs;
      const optimalQueueSize = optimal._count.printJobs;
      
      if (currentQueueSize < optimalQueueSize) {
        return current;
      }
      
      // If queue sizes are equal, prefer default or online status
      if (currentQueueSize === optimalQueueSize) {
        if (current.isDefault && !optimal.isDefault) return current;
        if (current.status === 'online' && optimal.status !== 'online') return current;
      }
      
      return optimal;
    });
  }

  /**
   * Gets comprehensive tenant printing statistics
   */
  async getTenantPrintingAnalytics(
    userCompanyId: string,
    userBranchId?: string,
    userRole?: UserRole,
    period: 'today' | 'week' | 'month' = 'today'
  ) {
    let startDate = new Date();
    switch (period) {
      case 'today':
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'week':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(startDate.getMonth() - 1);
        break;
    }

    const where: any = {
      createdAt: { gte: startDate }
    };

    // Apply tenant isolation
    if (userRole === 'super_admin') {
      if (userCompanyId && userCompanyId !== 'all') {
        where.companyId = userCompanyId;
      }
    } else {
      where.companyId = userCompanyId;
      if (userRole !== 'company_owner' && userBranchId) {
        where.OR = [
          { branchId: userBranchId },
          { branchId: null }
        ];
      }
    }

    const [
      totalJobs,
      completedJobs,
      failedJobs,
      pendingJobs,
      jobsByType,
      jobsByPrinter,
      jobsByBranch,
      avgProcessingTime
    ] = await Promise.all([
      this.prisma.printJob.count({ where }),
      this.prisma.printJob.count({ where: { ...where, status: 'completed' } }),
      this.prisma.printJob.count({ where: { ...where, status: 'failed' } }),
      this.prisma.printJob.count({ where: { ...where, status: { in: ['pending', 'printing'] } } }),
      this.prisma.printJob.groupBy({
        by: ['type'],
        where,
        _count: true,
        orderBy: { _count: { type: 'desc' } }
      }),
      this.prisma.printJob.groupBy({
        by: ['printerId'],
        where,
        _count: true,
        orderBy: { _count: { printerId: 'desc' } },
        take: 10
      }),
      this.prisma.printJob.groupBy({
        by: ['branchId'],
        where: { ...where, branchId: { not: null } },
        _count: true,
        orderBy: { _count: { branchId: 'desc' } }
      }),
      this.prisma.printJob.aggregate({
        where: { ...where, status: 'completed', processingTime: { not: null } },
        _avg: { processingTime: true }
      })
    ]);

    // Get printer and branch details for the grouped data
    const [printerDetails, branchDetails] = await Promise.all([
      this.prisma.printer.findMany({
        where: {
          id: { in: jobsByPrinter.map(p => p.printerId) }
        },
        select: { id: true, name: true, type: true }
      }),
      this.prisma.branch.findMany({
        where: {
          id: { in: jobsByBranch.map(b => b.branchId).filter(Boolean) }
        },
        select: { id: true, name: true }
      })
    ]);

    return {
      period,
      summary: {
        totalJobs,
        completedJobs,
        failedJobs,
        pendingJobs,
        successRate: totalJobs > 0 ? Math.round((completedJobs / totalJobs) * 100) : 0,
        avgProcessingTime: Math.round(avgProcessingTime._avg.processingTime || 0)
      },
      breakdown: {
        byType: jobsByType.map(item => ({
          type: item.type,
          count: item._count
        })),
        byPrinter: jobsByPrinter.map(item => {
          const printer = printerDetails.find(p => p.id === item.printerId);
          return {
            printerId: item.printerId,
            printerName: printer?.name || 'Unknown',
            printerType: printer?.type || 'unknown',
            count: item._count
          };
        }),
        byBranch: jobsByBranch.map(item => {
          const branch = branchDetails.find(b => b.id === item.branchId);
          return {
            branchId: item.branchId,
            branchName: branch?.name || 'Unknown',
            count: item._count
          };
        })
      }
    };
  }

  /**
   * Validates and creates a tenant-isolated printer
   */
  async createTenantPrinter(
    printerData: {
      name: string;
      type: string;
      connection: string;
      ip?: string;
      port?: number;
      manufacturer?: string;
      model?: string;
      location?: string;
      paperWidth?: number;
      assignedTo: string;
      isDefault?: boolean;
      capabilities?: string[];
    },
    userCompanyId: string,
    userBranchId?: string,
    userRole?: UserRole
  ) {
    // Validate company access
    const company = await this.prisma.company.findUnique({
      where: { id: userCompanyId },
      select: { id: true, status: true }
    });

    if (!company) {
      throw new NotFoundException('Company not found');
    }

    if (company.status !== 'active') {
      throw new BadRequestException('Cannot create printer: Company is not active');
    }

    // Validate branch access if specified
    if (userBranchId && userRole !== 'super_admin' && userRole !== 'company_owner') {
      const branch = await this.prisma.branch.findFirst({
        where: { 
          id: userBranchId, 
          companyId: userCompanyId 
        }
      });

      if (!branch) {
        throw new ForbiddenException('Access denied: Invalid branch');
      }
    }

    // Check for IP conflicts within the company
    if (printerData.ip) {
      const existingPrinter = await this.prisma.printer.findFirst({
        where: {
          ip: printerData.ip,
          port: printerData.port || 9100,
          companyId: userCompanyId
        }
      });

      if (existingPrinter) {
        throw new BadRequestException(
          `Printer with IP ${printerData.ip}:${printerData.port || 9100} already exists in your company`
        );
      }
    }

    // Check if this is the first printer for the company (auto-default)
    const printerCount = await this.prisma.printer.count({
      where: { companyId: userCompanyId }
    });

    const isFirstPrinter = printerCount === 0;

    // If setting as default or first printer, remove default from other printers
    if (printerData.isDefault || isFirstPrinter) {
      await this.prisma.printer.updateMany({
        where: { companyId: userCompanyId },
        data: { isDefault: false }
      });
    }

    // Create the printer with proper tenant isolation
    return this.prisma.printer.create({
      data: {
        name: printerData.name,
        type: printerData.type as any,
        connection: printerData.connection as any,
        ip: printerData.ip,
        port: printerData.port || 9100,
        manufacturer: printerData.manufacturer,
        model: printerData.model,
        location: printerData.location,
        paperWidth: printerData.paperWidth,
        assignedTo: printerData.assignedTo as any,
        isDefault: printerData.isDefault || isFirstPrinter,
        companyId: userCompanyId,
        branchId: userBranchId,
        capabilities: JSON.stringify(printerData.capabilities || []),
        status: 'unknown',
        lastSeen: new Date()
      },
      include: {
        company: { select: { id: true, name: true, slug: true } },
        branch: { select: { id: true, name: true } }
      }
    });
  }

  /**
   * Provides access to MenuHere integration service for printing service
   */
  getMenuHereService(): MenuHereIntegrationService {
    return this.menuHereService;
  }
}