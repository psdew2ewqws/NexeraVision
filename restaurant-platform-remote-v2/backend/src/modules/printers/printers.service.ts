import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { RegisterPrintersDto, PrinterInfoDto } from './dto/register-printer.dto';
import { PrintingWebSocketGateway } from '../printing/gateways/printing-websocket.gateway';

@Injectable()
export class PrintersService {
  private readonly logger = new Logger(PrintersService.name);

  constructor(
    private prisma: PrismaService,
    private printingGateway: PrintingWebSocketGateway,
  ) {}

  async registerPrinters(registerDto: RegisterPrintersDto) {
    const { branchId, printers, appVersion } = registerDto;

    try {
      // Verify branch exists and is active
      const branch = await this.prisma.branch.findUnique({
        where: { id: branchId },
        include: {
          company: {
            select: { id: true, name: true }
          }
        }
      });

      if (!branch) {
        throw new NotFoundException('Branch not found');
      }

      if (!branch.isActive) {
        throw new BadRequestException('Branch is not active');
      }

      // Process each discovered printer
      const registeredPrinters = [];
      
      for (const printerInfo of printers) {
        try {
          // Check if printer already exists (by name and branch)
          let existingPrinter = await this.prisma.printer.findFirst({
            where: {
              branchId,
              name: printerInfo.name,
            }
          });

          if (existingPrinter) {
            // Update existing printer
            existingPrinter = await this.prisma.printer.update({
              where: { id: existingPrinter.id },
              data: {
                status: printerInfo.status as any,
                connection: printerInfo.connectionType as any,
                ip: printerInfo.ipAddress,
                port: printerInfo.port ? parseInt(printerInfo.port) : undefined,
                model: printerInfo.model,
                manufacturer: printerInfo.manufacturer,
                capabilities: JSON.stringify(printerInfo.capabilities || []),
                lastSeen: new Date(),
                updatedAt: new Date(),
              }
            });
            this.logger.log(`Updated existing printer: ${printerInfo.name} for branch ${branchId}`);
          } else {
            // Create new printer
            existingPrinter = await this.prisma.printer.create({
              data: {
                branchId,
                companyId: branch.companyId,
                name: printerInfo.name,
                type: printerInfo.type as any,
                status: printerInfo.status as any,
                connection: printerInfo.connectionType as any,
                ip: printerInfo.ipAddress,
                port: printerInfo.port ? parseInt(printerInfo.port) : undefined,
                model: printerInfo.model,
                manufacturer: printerInfo.manufacturer,
                capabilities: JSON.stringify(printerInfo.capabilities || []),
                lastSeen: new Date(),
              }
            });
            this.logger.log(`Registered new printer: ${printerInfo.name} for branch ${branchId}`);
          }

          registeredPrinters.push(existingPrinter);

          // Broadcast printer discovery to WebSocket clients
          this.printingGateway.broadcastPrinterUpdate({
            action: existingPrinter.createdAt === existingPrinter.updatedAt ? 'discovered' : 'updated',
            printer: existingPrinter,
            branchId,
            companyId: branch.companyId,
          });

        } catch (error) {
          this.logger.error(`Failed to register printer ${printerInfo.name}:`, error);
          continue; // Continue with other printers
        }
      }

      this.logger.log(`Successfully registered ${registeredPrinters.length} printers for branch ${branchId}`);

      return {
        success: true,
        registeredCount: registeredPrinters.length,
        printers: registeredPrinters,
        branchId,
        companyId: branch.companyId,
        message: `Registered ${registeredPrinters.length} printers successfully`
      };

    } catch (error) {
      this.logger.error('Error registering printers:', error);
      throw error;
    }
  }

  async getBranchPrinters(branchId: string) {
    try {
      // Verify branch access
      const branch = await this.prisma.branch.findUnique({
        where: { id: branchId },
        select: { id: true, companyId: true, isActive: true }
      });

      if (!branch) {
        throw new NotFoundException('Branch not found');
      }

      // Get all printers for the branch
      const printers = await this.prisma.printer.findMany({
        where: {
          branchId,
        },
        orderBy: [
          { lastSeen: 'desc' },
          { createdAt: 'desc' }
        ],
        include: {
          _count: {
            select: { printJobs: true }
          }
        }
      });

      // Add online/offline status based on last seen time
      const printersWithStatus = printers.map(printer => ({
        ...printer,
        isOnline: this.isPrinterOnline(printer.lastSeen),
        jobCount: printer._count?.printJobs || 0,
      }));

      return {
        success: true,
        printers: printersWithStatus,
        count: printersWithStatus.length,
        branchId,
      };

    } catch (error) {
      this.logger.error(`Error fetching printers for branch ${branchId}:`, error);
      throw error;
    }
  }

  async updatePrinterStatus(printerId: string, status: string, branchId?: string) {
    try {
      const printer = await this.prisma.printer.findUnique({
        where: { id: printerId },
        include: { branch: { select: { companyId: true } } }
      });

      if (!printer) {
        throw new NotFoundException('Printer not found');
      }

      // Update printer status
      const updatedPrinter = await this.prisma.printer.update({
        where: { id: printerId },
        data: {
          status: status as any,
          lastSeen: new Date(),
          updatedAt: new Date(),
        }
      });

      // Broadcast status update
      this.printingGateway.broadcastPrinterUpdate({
        action: 'status_updated',
        printer: updatedPrinter,
        branchId: printer.branchId,
        companyId: printer.branch.companyId,
      });

      return {
        success: true,
        printer: updatedPrinter,
        message: 'Printer status updated successfully'
      };

    } catch (error) {
      this.logger.error(`Error updating printer status for ${printerId}:`, error);
      throw error;
    }
  }

  async testPrinter(printerId: string, branchId?: string) {
    try {
      const printer = await this.prisma.printer.findUnique({
        where: { id: printerId },
        include: { branch: { select: { companyId: true, name: true } } }
      });

      if (!printer) {
        throw new NotFoundException('Printer not found');
      }

      // Create test print job
      const testJob = await this.prisma.printJob.create({
        data: {
          printerId,
          branchId: printer.branchId,
          companyId: printer.branch.companyId,
          type: 'test',
          content: JSON.stringify({
            type: 'test_print',
            title: 'RestaurantPrint Pro Test',
            branch: printer.branch.name,
            timestamp: new Date().toISOString(),
            printer: printer.name,
          }),
          status: 'pending',
          priority: 1,
        }
      });

      // Broadcast test job to desktop app (if connected)
      this.printingGateway.broadcastPrintJob({
        action: 'test_print',
        job: testJob,
        printer,
        branchId: printer.branchId,
        companyId: printer.branch.companyId,
      });

      this.logger.log(`Created test print job for printer ${printer.name}`);

      return {
        success: true,
        jobId: testJob.id,
        printer: printer.name,
        message: 'Test print job created successfully'
      };

    } catch (error) {
      this.logger.error(`Error creating test print job for printer ${printerId}:`, error);
      throw error;
    }
  }

  async getCompanyPrinters(companyId: string) {
    try {
      const printers = await this.prisma.printer.findMany({
        where: {
          companyId,
        },
        include: {
          branch: {
            select: { id: true, name: true }
          },
          _count: {
            select: { printJobs: true }
          }
        },
        orderBy: [
          { lastSeen: 'desc' },
          { createdAt: 'desc' }
        ]
      });

      const printersWithStatus = printers.map(printer => ({
        ...printer,
        isOnline: this.isPrinterOnline(printer.lastSeen),
        jobCount: printer._count?.printJobs || 0,
      }));

      return {
        success: true,
        printers: printersWithStatus,
        count: printersWithStatus.length,
        companyId,
      };

    } catch (error) {
      this.logger.error(`Error fetching printers for company ${companyId}:`, error);
      throw error;
    }
  }

  private isPrinterOnline(lastSeen: Date | null): boolean {
    if (!lastSeen) return false;
    const now = new Date();
    const timeDiff = now.getTime() - lastSeen.getTime();
    // Consider printer online if last seen within 5 minutes
    return timeDiff <= 5 * 60 * 1000;
  }
}