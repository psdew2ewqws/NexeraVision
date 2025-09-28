import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { BaseService, BaseEntity, BaseUser } from '../../common/services/base.service';
import { CreateLicenseDto, UpdateLicenseDto, RenewLicenseDto } from './dto';
import { Cron, CronExpression } from '@nestjs/schedule';
import { addDays, differenceInDays, isBefore, isAfter, startOfDay } from 'date-fns';

export interface LicenseEntity extends BaseEntity {
  companyId: string;
  status: string;
  expiresAt: Date;
}

@Injectable()
export class LicensesService extends BaseService<LicenseEntity> {
  private readonly logger = new Logger(LicensesService.name);

  constructor(protected prisma: PrismaService) {
    super(prisma, 'license');
  }

  /**
   * Override buildBaseWhereClause to exclude deletedAt since License model doesn't support soft delete
   */
  protected buildBaseWhereClause(currentUser?: BaseUser, additionalWhere: any = {}): any {
    const where: any = {
      ...additionalWhere,
    };

    // Add company filter if user is provided and not super admin
    if (currentUser && currentUser.role !== 'super_admin') {
      where.companyId = currentUser.companyId;
    }

    return where;
  }

  /**
   * Create a new license for a company
   */
  async create(createLicenseDto: CreateLicenseDto, userId: string) {
    const { companyId, durationDays = 30, features = [] } = createLicenseDto;

    // Check if company exists
    const company = await this.prisma.company.findUnique({
      where: { id: companyId, deletedAt: null }
    });
    
    if (!company) {
      throw new NotFoundException('Company not found');
    }

    // Check if company already has an active license
    const existingLicense = await this.prisma.license.findFirst({
      where: {
        companyId,
        status: 'active'
      }
    });

    if (existingLicense) {
      throw new BadRequestException('Company already has an active license. Wait for expiry or contact support.');
    }

    const startDate = new Date();
    const expiresAt = addDays(startDate, durationDays);
    const totalDays = durationDays;
    const daysRemaining = differenceInDays(expiresAt, startDate);

    const license = await this.prisma.license.create({
      data: {
        companyId,
        status: 'active',
        startDate,
        expiresAt,
        daysRemaining,
        totalDays,
        features,
        createdBy: userId,
        updatedBy: userId,
        lastChecked: new Date()
      },
      include: {
        company: {
          select: {
            id: true,
            name: true,
            slug: true,
            status: true
          }
        }
      }
    });

    // Only one active license per company is allowed

    this.logger.log(`Created license for company ${company.name} (${durationDays} days)`);
    return license;
  }

  /**
   * Get all licenses with pagination and filtering
   */
  async findAll(page = 1, limit = 10, status?: string, type?: string, search?: string, currentUser?: BaseUser) {
    const { skip, take, pageNum, limitNum } = this.buildPaginationParams(page, limit);
    
    const additionalWhere: any = {};
    
    if (status) additionalWhere.status = status;
    if (type) additionalWhere.type = type;
    if (search) {
      additionalWhere.company = {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { slug: { contains: search, mode: 'insensitive' } }
        ]
      };
    }

    const where = this.buildBaseWhereClause(currentUser, additionalWhere);

    const [licenses, total] = await Promise.all([
      this.prisma.license.findMany({
        where,
        skip,
        take,
        include: {
          company: {
            select: {
              id: true,
              name: true,
              slug: true,
              status: true,
              businessType: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      }),
      this.prisma.license.count({ where })
    ]);

    return {
      licenses,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        pages: Math.ceil(total / limitNum)
      }
    };
  }

  /**
   * Get license by ID
   */
  async findOne(id: string, currentUser?: BaseUser) {
    const where = this.buildBaseWhereClause(currentUser, { id });
    
    const license = await this.prisma.license.findFirst({
      where,
      include: {
        company: {
          select: {
            id: true,
            name: true,
            slug: true,
            status: true,
            businessType: true,
            timezone: true,
            defaultCurrency: true
          }
        }
      }
    });

    if (!license) {
      this.throwNotFound('License', id);
    }

    return license;
  }

  /**
   * Get active license for a company
   */
  async findByCompany(companyId: string, currentUser?: BaseUser) {
    const additionalWhere = {
      companyId,
      status: 'active'
    };
    const where = this.buildBaseWhereClause(currentUser, additionalWhere);
    
    const license = await this.prisma.license.findFirst({
      where,
      include: {
        company: {
          select: {
            id: true,
            name: true,
            slug: true,
            status: true
          }
        }
      },
      orderBy: { expiresAt: 'asc' }
    });

    if (!license) {
      // Return a default expired license info
      return {
        id: null,
        status: 'expired',
        daysRemaining: 0,
        isExpired: true,
        isNearExpiry: false,
        features: ['basic_features'],
        expiresAt: new Date(),
        company: await this.prisma.company.findUnique({
          where: { id: companyId },
          select: { id: true, name: true, slug: true, status: true }
        })
      };
    }

    // Return license with current database values (no recalculation to avoid conflicts with renewal logic)
    const now = new Date();
    const isExpired = isBefore(license.expiresAt, now);
    const isNearExpiry = license.daysRemaining <= 30 && license.daysRemaining > 0;

    return {
      ...license,
      daysRemaining: license.daysRemaining, // Use stored value from database
      isExpired,
      isNearExpiry
    };
  }

  /**
   * Update license
   */
  async update(id: string, updateLicenseDto: UpdateLicenseDto, userId: string) {
    const license = await this.findOne(id);
    
    const updateData: any = {
      ...updateLicenseDto,
      updatedBy: userId
    };

    // If extending the license, recalculate expiry
    if (updateLicenseDto.durationDays) {
      const newExpiryDate = addDays(license.startDate, updateLicenseDto.durationDays);
      updateData.expiresAt = newExpiryDate;
      updateData.totalDays = updateLicenseDto.durationDays;
      updateData.daysRemaining = differenceInDays(newExpiryDate, new Date());
    }

    const updatedLicense = await this.prisma.license.update({
      where: { id },
      data: updateData,
      include: {
        company: {
          select: {
            id: true,
            name: true,
            slug: true,
            status: true
          }
        }
      }
    });

    this.logger.log(`Updated license ${id} for company ${updatedLicense.company.name}`);
    return updatedLicense;
  }

  /**
   * Delete (cancel) license
   */
  async remove(id: string, currentUser: BaseUser) {
    const license = await this.findOne(id, currentUser);
    
    const cancelledLicense = await this.prisma.license.update({
      where: { id },
      data: {
        status: 'cancelled',
        updatedBy: currentUser.id
      },
      include: {
        company: {
          select: {
            id: true,
            name: true,
            slug: true,
            status: true
          }
        }
      }
    });

    this.logger.log(`Cancelled license ${id} for company ${cancelledLicense.company.name}`);
    return cancelledLicense;
  }

  /**
   * Check if company has valid license for specific features
   */
  async hasFeatureAccess(companyId: string, feature: string, currentUser?: BaseUser): Promise<boolean> {
    const additionalWhere = {
      companyId,
      status: 'active',
      expiresAt: { gte: new Date() }
    };
    const where = this.buildBaseWhereClause(currentUser, additionalWhere);
    
    const license = await this.prisma.license.findFirst({
      where
    });

    if (!license) return false;

    const features = Array.isArray(license.features) ? license.features as string[] : [];
    return features.includes(feature) || features.includes('all_features');
  }

  /**
   * Get license statistics
   */
  async getStats() {
    const [
      totalLicenses,
      activeLicenses,
      expiredLicenses,
      trialLicenses,
      activeLicensesOfType,
      expiringLicenses
    ] = await Promise.all([
      this.prisma.license.count(),
      this.prisma.license.count({ where: { status: 'active' } }),
      this.prisma.license.count({ where: { status: 'expired' } }),
      this.prisma.license.count({ 
        where: { 
          status: 'active',
          company: { status: 'trial' }
        }
      }),
      this.prisma.license.count({ 
        where: { 
          status: 'active',
          company: { status: 'active' }
        }
      }),
      this.prisma.license.count({
        where: {
          status: 'active',
          daysRemaining: { lte: 30, gte: 0 }
        }
      })
    ]);

    // Mock revenue calculation - you can implement actual pricing later
    const estimatedMonthlyRevenue = activeLicenses * 99;

    return {
      total: totalLicenses,
      active: activeLicenses,
      expired: expiredLicenses,
      trial: trialLicenses,
      activeType: activeLicensesOfType,
      expiringIn30Days: expiringLicenses,
      estimatedMonthlyRevenue: estimatedMonthlyRevenue
    };
  }

  /**
   * Get licenses expiring in next N days
   */
  async getExpiringLicenses(days = 30) {
    const cutoffDate = addDays(new Date(), days);
    
    return this.prisma.license.findMany({
      where: {
        status: 'active',
        expiresAt: {
          gte: new Date(),
          lte: cutoffDate
        }
      },
      include: {
        company: {
          select: {
            id: true,
            name: true,
            slug: true,
            status: true
          }
        }
      },
      orderBy: { expiresAt: 'asc' }
    });
  }

  /**
   * Update days remaining for a license
   */
  private async updateDaysRemaining(license: any) {
    const now = new Date();
    // Use the same calculation as renewal - Math.ceil to include partial days
    const timeDiffMs = license.expiresAt.getTime() - now.getTime();
    const daysRemaining = Math.max(0, Math.ceil(timeDiffMs / (1000 * 60 * 60 * 24)));
    const isExpired = isBefore(license.expiresAt, now);
    const isNearExpiry = daysRemaining <= 30 && daysRemaining > 0;


    // Update in database if different
    if (license.daysRemaining !== daysRemaining) {
      await this.prisma.license.update({
        where: { id: license.id },
        data: {
          daysRemaining,
          lastChecked: now,
          ...(isExpired && license.status === 'active' ? { status: 'expired' } : {})
        }
      });
    }

    return {
      ...license,
      daysRemaining,
      isExpired,
      isNearExpiry
    };
  }

  /**
   * Cron job to update license statuses daily
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async updateLicenseStatuses() {
    this.logger.log('Running daily license status update...');

    const activeLicenses = await this.prisma.license.findMany({
      where: { status: 'active' }
    });

    for (const license of activeLicenses) {
      await this.updateDaysRemaining(license);
    }

    this.logger.log(`Updated ${activeLicenses.length} license statuses`);
  }

  /**
   * Extend license by X days
   */
  async extendLicense(id: string, extensionDays: number, userId: string) {
    const license = await this.findOne(id);
    
    const newExpiryDate = addDays(license.expiresAt, extensionDays);
    const newTotalDays = license.totalDays + extensionDays;
    const daysRemaining = differenceInDays(newExpiryDate, new Date());

    const updatedLicense = await this.prisma.license.update({
      where: { id },
      data: {
        expiresAt: newExpiryDate,
        totalDays: newTotalDays,
        daysRemaining,
        status: 'active', // Reactivate if was expired
        renewedAt: new Date(),
        updatedBy: userId
      },
      include: {
        company: {
          select: {
            id: true,
            name: true,
            slug: true,
            status: true
          }
        }
      }
    });

    this.logger.log(`Extended license ${id} by ${extensionDays} days for company ${updatedLicense.company.name}`);
    return updatedLicense;
  }

  /**
   * Renew license for a company and generate invoice
   */
  async renewLicense(companyId: string, renewLicenseDto: RenewLicenseDto, userId: string) {
    const { durationDays, amount, currency = 'USD', paymentMetadata } = renewLicenseDto;

    // Get current license
    const currentLicense = await this.prisma.license.findFirst({
      where: {
        companyId,
        status: { in: ['active', 'expired'] }
      },
      include: {
        company: true
      },
      orderBy: { expiresAt: 'asc' } // Get the license that expires soonest (most urgent to renew)
    });

    if (!currentLicense) {
      throw new NotFoundException('No license found for this company');
    }

    const now = new Date();
    // If current license is still active, extend from its expiry date
    // If expired, start from today
    const startDate = currentLicense.expiresAt > now ? currentLicense.expiresAt : now;
    const newExpiryDate = addDays(startDate, durationDays);
    // Calculate days remaining - use Math.ceil to ensure we don't lose partial days
    const timeDiffMs = newExpiryDate.getTime() - now.getTime();
    const daysRemaining = Math.ceil(timeDiffMs / (1000 * 60 * 60 * 24));
    
    this.logger.debug(`Renewal dates: now=${now.toISOString()}, currentExpiry=${currentLicense.expiresAt.toISOString()}, startDate=${startDate.toISOString()}, newExpiry=${newExpiryDate.toISOString()}, durationDays=${durationDays}, calculatedDays=${daysRemaining}`);
    

    // Create new license or update existing
    this.logger.debug(`About to upsert license with id=${currentLicense.id}, newExpiry=${newExpiryDate.toISOString()}, newDaysRemaining=${daysRemaining}`);
    const renewedLicense = await this.prisma.license.upsert({
      where: { id: currentLicense.id },
      create: {
        companyId,
        status: 'active',
        startDate: now,
        expiresAt: newExpiryDate,
        daysRemaining,
        totalDays: durationDays,
        features: currentLicense.features,
        createdBy: userId,
        updatedBy: userId,
        lastChecked: now,
        renewedAt: now
      },
      update: {
        status: 'active',
        expiresAt: newExpiryDate,
        daysRemaining,
        totalDays: currentLicense.totalDays + durationDays,
        updatedBy: userId,
        lastChecked: now,
        renewedAt: now
      },
      include: {
        company: true
      }
    });

    // Generate invoice
    const invoiceNumber = await this.generateInvoiceNumber();
    const invoice = await this.createInvoice({
      companyId,
      licenseId: renewedLicense.id,
      invoiceNumber,
      amount: amount || this.calculateRenewalPrice(durationDays),
      currency,
      durationDays,
      status: 'paid', // Assuming immediate payment for now
      issuedAt: now,
      dueAt: addDays(now, 30), // 30 days payment term
      metadata: {
        renewalType: 'extension',
        originalExpiryDate: currentLicense.expiresAt,
        newExpiryDate,
        ...paymentMetadata
      },
      createdBy: userId
    });

    this.logger.debug(`Upsert completed. Renewed license data: id=${renewedLicense.id}, expiresAt=${renewedLicense.expiresAt.toISOString()}, daysRemaining=${renewedLicense.daysRemaining}, totalDays=${renewedLicense.totalDays}`);
    this.logger.log(`Renewed license for company ${currentLicense.company.name} for ${durationDays} days`);
    
    return {
      license: renewedLicense,
      invoice,
      summary: {
        previousExpiryDate: currentLicense.expiresAt,
        newExpiryDate,
        daysAdded: durationDays,
        totalDaysRemaining: daysRemaining,
        amountPaid: invoice.amount
      }
    };
  }

  /**
   * Get invoices for a company
   */
  async getInvoices(companyId: string) {
    return this.prisma.$queryRaw`
      SELECT 
        i.*,
        l.type as license_type,
        c.name as company_name
      FROM license_invoices i
      LEFT JOIN licenses l ON i.license_id = l.id
      LEFT JOIN companies c ON i.company_id = c.id
      WHERE i.company_id = ${companyId}
      ORDER BY i.issued_at DESC
    `;
  }

  /**
   * Generate invoice PDF
   */
  async generateInvoicePDF(invoiceId: string, companyId: string): Promise<Buffer> {
    const invoice = await this.prisma.$queryRaw`
      SELECT 
        i.*,
        l.type as license_type,
        c.name as company_name,
        c.slug as company_slug
      FROM license_invoices i
      LEFT JOIN licenses l ON i.license_id = l.id
      LEFT JOIN companies c ON i.company_id = c.id
      WHERE i.id = ${invoiceId}
      AND i.company_id = ${companyId}
    `;

    if (!invoice || (Array.isArray(invoice) && invoice.length === 0)) {
      throw new NotFoundException('Invoice not found');
    }

    // For now, return a simple PDF placeholder
    // In production, you'd use a library like puppeteer or pdfkit
    const pdfContent = this.generateInvoiceHTML(invoice[0]);
    return Buffer.from(pdfContent, 'utf8');
  }

  /**
   * Private helper methods
   */
  private async generateInvoiceNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const month = (new Date().getMonth() + 1).toString().padStart(2, '0');
    
    // Get latest invoice number for this month
    const latestInvoice = await this.prisma.$queryRaw<any[]>`
      SELECT invoice_number 
      FROM license_invoices 
      WHERE invoice_number LIKE ${`INV-${year}${month}-%`}
      ORDER BY created_at DESC 
      LIMIT 1
    `;

    let sequence = 1;
    if (latestInvoice.length > 0) {
      const lastNumber = latestInvoice[0].invoice_number;
      const lastSequence = parseInt(lastNumber.split('-').pop() || '0');
      sequence = lastSequence + 1;
    }

    return `INV-${year}${month}-${sequence.toString().padStart(4, '0')}`;
  }

  private calculateRenewalPrice(durationDays: number): number {
    // Simple pricing calculation - you can make this more sophisticated
    const dailyRate = 99 / 30; // $99 per month
    return Math.round(durationDays * dailyRate * 100) / 100;
  }

  private async createInvoice(invoiceData: any) {
    const result = await this.prisma.$queryRaw`
      INSERT INTO license_invoices (
        company_id, license_id, invoice_number, amount, currency,
        duration_days, status, issued_at, due_at, metadata, created_by
      ) VALUES (
        ${invoiceData.companyId},
        ${invoiceData.licenseId},
        ${invoiceData.invoiceNumber},
        ${invoiceData.amount},
        ${invoiceData.currency},
        ${invoiceData.durationDays},
        ${invoiceData.status},
        ${invoiceData.issuedAt},
        ${invoiceData.dueAt},
        ${JSON.stringify(invoiceData.metadata)}::jsonb,
        ${invoiceData.createdBy}
      )
      RETURNING *
    `;
    
    return result[0] || result;
  }

  private generateInvoiceHTML(invoice: any): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Invoice ${invoice.invoice_number}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          .header { text-align: center; margin-bottom: 30px; }
          .invoice-details { margin-bottom: 20px; }
          .amount { font-size: 24px; font-weight: bold; color: #2563eb; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Restaurant Platform</h1>
          <h2>Invoice ${invoice.invoice_number}</h2>
        </div>
        
        <div class="invoice-details">
          <p><strong>Company:</strong> ${invoice.company_name}</p>
          <p><strong>License Type:</strong> ${invoice.license_type}</p>
          <p><strong>Issue Date:</strong> ${new Date(invoice.issued_at).toLocaleDateString()}</p>
          <p><strong>Due Date:</strong> ${new Date(invoice.due_at).toLocaleDateString()}</p>
          <p><strong>Duration:</strong> ${invoice.duration_days} days</p>
        </div>
        
        <div class="amount">
          <p>Amount: $${invoice.amount} ${invoice.currency}</p>
        </div>
        
        <p><em>Thank you for your business!</em></p>
      </body>
      </html>
    `;
  }
}