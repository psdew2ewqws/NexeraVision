import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { ESCPOSService } from './escpos.service';
import { CreatePrintJobDto } from '../dto/create-print-job.dto';

@Injectable()
export class PrintJobService {
  private readonly logger = new Logger(PrintJobService.name);

  constructor(
    private prisma: PrismaService,
    private escposService: ESCPOSService,
  ) {}

  async createJob(
    createJobDto: CreatePrintJobDto,
    companyId: string,
    branchId?: string,
    userId?: string
  ) {
    const { printerId, type, content, orderId, priority = 5 } = createJobDto;

    // Verify printer exists and belongs to company
    const printer = await this.prisma.printer.findFirst({
      where: {
        id: printerId,
        companyId
      }
    });

    if (!printer) {
      throw new NotFoundException('Printer not found');
    }

    // Create print job
    const printJob = await this.prisma.printJob.create({
      data: {
        type,
        printerId,
        content: JSON.stringify(content),
        status: 'pending',
        priority,
        orderId,
        companyId,
        branchId,
        userId,
        createdAt: new Date()
      },
      include: {
        printer: true
      }
    });

    this.logger.log(`Created print job ${printJob.id} for printer ${printer.name}`);

    // Process job immediately if printer is online
    if (printer.status === 'online') {
      this.processJobAsync(printJob.id);
    }

    return {
      id: printJob.id,
      status: printJob.status,
      message: 'Print job created successfully'
    };
  }

  async findJobs(options: {
    companyId?: string;
    branchId?: string;
    limit?: number;
    offset?: number;
    status?: string;
  }) {
    const { companyId, branchId, limit = 50, offset = 0, status } = options;

    const where: any = {};
    if (companyId) where.companyId = companyId;
    if (branchId) where.branchId = branchId;
    if (status) where.status = status;

    const [jobs, total] = await Promise.all([
      this.prisma.printJob.findMany({
        where,
        include: {
          printer: {
            select: {
              id: true,
              name: true,
              type: true
            }
          }
        },
        orderBy: [
          { priority: 'asc' },
          { createdAt: 'desc' }
        ],
        take: limit,
        skip: offset
      }),
      this.prisma.printJob.count({ where })
    ]);

    return {
      jobs: jobs.map(job => ({
        ...job,
        content: JSON.parse(job.content)
      })),
      total,
      limit,
      offset
    };
  }

  async findJobById(id: string, companyId?: string) {
    const where: any = { id };
    if (companyId) where.companyId = companyId;

    const job = await this.prisma.printJob.findFirst({
      where,
      include: {
        printer: true
      }
    });

    if (!job) {
      throw new NotFoundException('Print job not found');
    }

    return {
      ...job,
      content: JSON.parse(job.content)
    };
  }

  async retryJob(id: string, companyId?: string) {
    const job = await this.findJobById(id, companyId);

    if (job.status !== 'failed') {
      throw new Error('Can only retry failed print jobs');
    }

    // Reset job status
    await this.prisma.printJob.update({
      where: { id },
      data: {
        status: 'pending',
        error: null,
        attempts: job.attempts + 1,
        updatedAt: new Date()
      }
    });

    // Process job
    this.processJobAsync(id);

    return {
      success: true,
      message: 'Print job retry initiated'
    };
  }

  async processJobAsync(jobId: string) {
    // Process job asynchronously
    setImmediate(async () => {
      try {
        await this.processJob(jobId);
      } catch (error) {
        this.logger.error(`Failed to process job ${jobId}:`, error);
      }
    });
  }

  async processJob(jobId: string) {
    const startTime = Date.now();

    try {
      // Get job with printer info
      const job = await this.prisma.printJob.findFirst({
        where: { id: jobId },
        include: {
          printer: true
        }
      });

      if (!job) {
        this.logger.warn(`Print job ${jobId} not found`);
        return;
      }

      if (job.status !== 'pending') {
        this.logger.debug(`Print job ${jobId} is not pending (status: ${job.status})`);
        return;
      }

      // Update status to printing
      await this.prisma.printJob.update({
        where: { id: jobId },
        data: {
          status: 'printing',
          startedAt: new Date()
        }
      });

      this.logger.log(`Processing print job ${jobId} on printer ${job.printer.name}`);

      // Parse content
      const content = JSON.parse(job.content);

      // Send to printer
      const result = await this.escposService.printContent(job.printer, content);

      const processingTime = Date.now() - startTime;

      if (result.success) {
        // Update job as completed
        await this.prisma.printJob.update({
          where: { id: jobId },
          data: {
            status: 'completed',
            completedAt: new Date(),
            processingTime,
            updatedAt: new Date()
          }
        });

        // Update printer status
        await this.prisma.printer.update({
          where: { id: job.printerId },
          data: {
            status: 'online',
            lastSeen: new Date()
          }
        });

        this.logger.log(`Print job ${jobId} completed successfully in ${processingTime}ms`);
      } else {
        // Update job as failed
        await this.prisma.printJob.update({
          where: { id: jobId },
          data: {
            status: 'failed',
            error: result.error || 'Print job failed',
            failedAt: new Date(),
            processingTime,
            attempts: job.attempts + 1,
            updatedAt: new Date()
          }
        });

        // Update printer status
        await this.prisma.printer.update({
          where: { id: job.printerId },
          data: {
            status: 'error',
            lastSeen: new Date()
          }
        });

        this.logger.error(`Print job ${jobId} failed: ${result.error}`);
      }
    } catch (error) {
      const processingTime = Date.now() - startTime;
      
      // Update job as failed
      await this.prisma.printJob.update({
        where: { id: jobId },
        data: {
          status: 'failed',
          error: error.message || 'Unknown error occurred',
          failedAt: new Date(),
          processingTime,
          updatedAt: new Date()
        }
      });

      this.logger.error(`Print job ${jobId} processing failed:`, error);
      throw error;
    }
  }

  // Process pending jobs for a specific printer
  async processPendingJobs(printerId: string) {
    const pendingJobs = await this.prisma.printJob.findMany({
      where: {
        printerId,
        status: 'pending'
      },
      orderBy: [
        { priority: 'asc' },
        { createdAt: 'asc' }
      ],
      take: 10 // Process up to 10 jobs at a time
    });

    this.logger.log(`Processing ${pendingJobs.length} pending jobs for printer ${printerId}`);

    for (const job of pendingJobs) {
      await this.processJob(job.id);
      
      // Small delay between jobs to prevent overwhelming the printer
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  // Cleanup old completed jobs
  async cleanupOldJobs(olderThanDays: number = 30) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    const deletedCount = await this.prisma.printJob.deleteMany({
      where: {
        status: 'completed',
        completedAt: {
          lt: cutoffDate
        }
      }
    });

    this.logger.log(`Cleaned up ${deletedCount.count} old print jobs`);
    
    return {
      deletedCount: deletedCount.count,
      cutoffDate
    };
  }

  // Get job statistics
  async getJobStatistics(companyId?: string, branchId?: string) {
    const where: any = {};
    if (companyId) where.companyId = companyId;
    if (branchId) where.branchId = branchId;

    const [total, pending, printing, completed, failed] = await Promise.all([
      this.prisma.printJob.count({ where }),
      this.prisma.printJob.count({ where: { ...where, status: 'pending' } }),
      this.prisma.printJob.count({ where: { ...where, status: 'printing' } }),
      this.prisma.printJob.count({ where: { ...where, status: 'completed' } }),
      this.prisma.printJob.count({ where: { ...where, status: 'failed' } })
    ]);

    return {
      total,
      pending,
      printing,
      completed,
      failed,
      successRate: total > 0 ? Math.round((completed / total) * 100) : 0
    };
  }
}