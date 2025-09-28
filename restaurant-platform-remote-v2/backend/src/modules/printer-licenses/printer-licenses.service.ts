import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { ValidateLicenseDto, CreatePrinterLicenseDto } from './dto';
import { PrinterLicenseStatus } from '@prisma/client';
import * as crypto from 'crypto';

@Injectable()
export class PrinterLicensesService {
  constructor(private prisma: PrismaService) {}

  async validateLicense(validateLicenseDto: ValidateLicenseDto) {
    const { licenseKey, deviceInfo } = validateLicenseDto;

    try {
      // License key is now the branch ID directly
      const branchId = licenseKey;
      
      // Find the branch in the database (branch ID = license key)
      const branch = await this.prisma.branch.findUnique({
        where: { id: branchId },
        include: {
          company: {
            select: { id: true, name: true, status: true }
          }
        }
      });

      if (!branch) {
        throw new NotFoundException('Branch ID (license key) not found');
      }

      // Check if branch is active
      if (!branch.isActive) {
        throw new BadRequestException('Branch is not active');
      }

      // Check company status
      if (branch.company.status === 'suspended') {
        throw new BadRequestException('Company account is suspended');
      }

      // Generate device fingerprint
      const deviceFingerprint = this.generateDeviceFingerprint(deviceInfo);

      // Check for existing printer session to prevent multiple devices
      const existingSession = await this.prisma.printerSession.findFirst({
        where: {
          branchId: branchId,
          status: 'active',
          lastHeartbeat: {
            gte: new Date(Date.now() - 10 * 60 * 1000) // Within last 10 minutes
          },
          deviceId: { not: deviceInfo.deviceId } // Different device
        }
      });

      if (existingSession) {
        throw new ConflictException('Branch license is already active on another device');
      }

      // Create/Update printer session for this branch
      await this.createBranchPrinterSession(branchId, deviceInfo);

      // Return license data for desktop app (using branch as license info)
      return {
        id: branch.id,
        licenseKey: branch.id, // Branch ID is the license key
        status: 'active', // Active since branch is active
        branchId: branch.id,
        branchName: branch.name,
        companyId: branch.companyId,
        companyName: branch.company.name,
        deviceId: deviceInfo.deviceId,
        expiresAt: null, // Branches don't expire
        features: ['printer_management', 'receipt_printing', 'order_processing'], // Default features
        maxPrinters: 10, // Default max printers per branch
        validatedAt: new Date(),
        deviceInfo: deviceInfo,
      };
    } catch (error) {
      if (error instanceof NotFoundException ||
          error instanceof BadRequestException ||
          error instanceof ConflictException) {
        throw error;
      }

      console.error('License validation error:', error);
      throw new BadRequestException('License validation failed');
    }
  }

  async createLicense(createLicenseDto: CreatePrinterLicenseDto) {
    // Check if license key already exists
    const existingLicense = await this.prisma.printerLicense.findUnique({
      where: { licenseKey: createLicenseDto.licenseKey }
    });

    if (existingLicense) {
      throw new ConflictException('License key already exists');
    }

    // Verify branch exists
    const branch = await this.prisma.branch.findUnique({
      where: { id: createLicenseDto.branchId }
    });

    if (!branch) {
      throw new NotFoundException('Branch not found');
    }

    // Create the license
    const license = await this.prisma.printerLicense.create({
      data: {
        licenseKey: createLicenseDto.licenseKey,
        branchId: createLicenseDto.branchId,
        status: createLicenseDto.status || PrinterLicenseStatus.active,
        expiresAt: createLicenseDto.expiresAt ? new Date(createLicenseDto.expiresAt) : null,
        features: createLicenseDto.features || [],
        maxPrinters: createLicenseDto.maxPrinters || 5,
      },
      include: {
        branch: {
          include: {
            company: {
              select: { id: true, name: true }
            }
          }
        }
      }
    });

    return license;
  }

  async getLicensesByBranch(branchId: string) {
    // Return branch-based "license" info instead of separate printer licenses
    const branch = await this.prisma.branch.findUnique({
      where: { id: branchId },
      include: {
        company: {
          select: { id: true, name: true, status: true }
        },
        printers: {
          select: { id: true, name: true, status: true }
        },
        printerSessions: {
          where: { status: 'active' },
          select: { id: true, deviceId: true, lastHeartbeat: true, deviceFingerprint: true }
        }
      }
    });

    if (!branch) {
      return [];
    }

    // Return the branch as a "license" object
    return [{
      id: branch.id,
      licenseKey: branch.id, // Branch ID is the license key
      branchId: branch.id,
      branchName: branch.name,
      companyId: branch.companyId,
      companyName: branch.company.name,
      status: branch.isActive ? 'active' : 'inactive',
      features: ['printer_management', 'receipt_printing', 'order_processing'],
      maxPrinters: 10,
      expiresAt: null, // Branches don't expire
      createdAt: branch.createdAt,
      printers: branch.printers,
      printerSessions: branch.printerSessions,
    }];
  }

  async updateLicenseStatus(licenseId: string, status: PrinterLicenseStatus) {
    const license = await this.prisma.printerLicense.findUnique({
      where: { id: licenseId }
    });

    if (!license) {
      throw new NotFoundException('License not found');
    }

    return this.prisma.printerLicense.update({
      where: { id: licenseId },
      data: { status }
    });
  }

  async extendLicense(licenseId: string, expiresAt: Date) {
    const license = await this.prisma.printerLicense.findUnique({
      where: { id: licenseId }
    });

    if (!license) {
      throw new NotFoundException('License not found');
    }

    return this.prisma.printerLicense.update({
      where: { id: licenseId },
      data: { expiresAt }
    });
  }

  private generateDeviceFingerprint(deviceInfo: any): string {
    const fingerprintData = `${deviceInfo.deviceId}-${deviceInfo.hostname}-${deviceInfo.platform}-${deviceInfo.arch}`;
    return crypto
      .createHash('sha256')
      .update(fingerprintData)
      .digest('hex');
  }

  private async createBranchPrinterSession(branchId: string, deviceInfo: any) {
    // End any existing sessions for this branch/device
    await this.prisma.printerSession.updateMany({
      where: {
        branchId,
        deviceId: deviceInfo.deviceId,
        status: 'active'
      },
      data: {
        status: 'ended',
        endedAt: new Date()
      }
    });

    // Create new session for branch (not tied to license anymore)
    return this.prisma.printerSession.create({
      data: {
        branchId, // Use branchId instead of licenseId
        deviceId: deviceInfo.deviceId,
        sessionToken: crypto.randomUUID(),
        status: 'active',
        lastHeartbeat: new Date(),
        appVersion: '2.0.0', // This should come from the request
        deviceFingerprint: this.generateDeviceFingerprint(deviceInfo),
      }
    });
  }

  async updateSessionHeartbeat(sessionId: string) {
    return this.prisma.printerSession.update({
      where: { id: sessionId },
      data: { lastHeartbeat: new Date() }
    });
  }

  async getActiveSessions() {
    return this.prisma.printerSession.findMany({
      where: { 
        status: 'active',
        lastHeartbeat: {
          gte: new Date(Date.now() - 10 * 60 * 1000) // Within last 10 minutes
        }
      },
      include: {
        // Include both license (for backward compatibility) and branch (new approach)
        license: {
          include: {
            branch: {
              select: { id: true, name: true }
            }
          }
        },
        branch: {
          select: { id: true, name: true, company: { select: { id: true, name: true } } }
        }
      },
      orderBy: { lastHeartbeat: 'desc' }
    });
  }
}