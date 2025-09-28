import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Company, CompanyStatus } from '../entities/company.entity';
import { License } from '../entities/license.entity';
import { CreateCompanyDto } from '../dto/create-company.dto';
import { UpdateCompanyDto } from '../dto/update-company.dto';
import { CompanyCreatedEvent } from '../events/company-created.event';
import { CompanyStatusChangedEvent } from '../events/company-status-changed.event';
import { EventBus } from '@nestjs/cqrs';
import { UserRole } from '../../user-management/entities/user.entity';

@Injectable()
export class CompanyService {
  constructor(
    @InjectRepository(Company)
    private readonly companyRepository: Repository<Company>,
    @InjectRepository(License)
    private readonly licenseRepository: Repository<License>,
    private readonly eventBus: EventBus
  ) {}

  async create(createCompanyDto: CreateCompanyDto, createdBy: string, userRole: UserRole): Promise<Company> {
    // Only super admins can create companies
    if (userRole !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenException('Only super admins can create companies');
    }

    // Check for slug uniqueness
    const existingCompany = await this.companyRepository.findOne({
      where: { slug: createCompanyDto.slug }
    });

    if (existingCompany) {
      throw new BadRequestException('Company slug already exists');
    }

    // Create company
    const company = this.companyRepository.create({
      ...createCompanyDto,
      createdBy,
      updatedBy: createdBy,
      status: CompanyStatus.TRIAL
    });

    const savedCompany = await this.companyRepository.save(company);

    // Create initial license
    const license = this.licenseRepository.create({
      companyId: savedCompany.id,
      status: 'active',
      expiresAt: new Date(Date.now() + (30 * 24 * 60 * 60 * 1000)), // 30 days trial
      features: {
        maxBranches: 1,
        maxUsers: 5,
        enablePromotions: true,
        enableAnalytics: false,
        enableDeliveryIntegration: true
      },
      createdBy,
      updatedBy: createdBy,
      totalDays: 30
    });

    await this.licenseRepository.save(license);

    // Publish domain event
    this.eventBus.publish(new CompanyCreatedEvent(savedCompany.id, savedCompany.name));

    return savedCompany;
  }

  async findAll(
    page: number = 1,
    limit: number = 20,
    status?: CompanyStatus,
    businessType?: string
  ) {
    const skip = (page - 1) * limit;
    
    const queryBuilder = this.companyRepository.createQueryBuilder('company')
      .leftJoinAndSelect('company.licenses', 'license', 'license.status = :licenseStatus', { licenseStatus: 'active' })
      .where('company.deletedAt IS NULL');

    if (status) {
      queryBuilder.andWhere('company.status = :status', { status });
    }

    if (businessType) {
      queryBuilder.andWhere('company.businessType = :businessType', { businessType });
    }

    const [companies, total] = await queryBuilder
      .orderBy('company.createdAt', 'DESC')
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    return {
      data: companies,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  async findOne(id: string, includeRelations: boolean = false): Promise<Company> {
    const queryBuilder = this.companyRepository.createQueryBuilder('company')
      .where('company.id = :id', { id })
      .andWhere('company.deletedAt IS NULL');

    if (includeRelations) {
      queryBuilder
        .leftJoinAndSelect('company.branches', 'branch', 'branch.deletedAt IS NULL')
        .leftJoinAndSelect('company.users', 'user', 'user.deletedAt IS NULL')
        .leftJoinAndSelect('company.licenses', 'license')
        .loadRelationCountAndMap('company.branchCount', 'company.branches')
        .loadRelationCountAndMap('company.userCount', 'company.users');
    }

    const company = await queryBuilder.getOne();

    if (!company) {
      throw new NotFoundException('Company not found');
    }

    return company;
  }

  async update(id: string, updateCompanyDto: UpdateCompanyDto, updatedBy: string): Promise<Company> {
    const company = await this.findOne(id);

    // Check for slug uniqueness if updating slug
    if (updateCompanyDto.slug && updateCompanyDto.slug !== company.slug) {
      const existingCompany = await this.companyRepository.findOne({
        where: { slug: updateCompanyDto.slug }
      });

      if (existingCompany) {
        throw new BadRequestException('Company slug already exists');
      }
    }

    // Track status changes
    const oldStatus = company.status;
    const newStatus = updateCompanyDto.status;

    Object.assign(company, updateCompanyDto);
    company.updatedBy = updatedBy;
    company.updatedAt = new Date();

    const updatedCompany = await this.companyRepository.save(company);

    // Publish status change event if status changed
    if (newStatus && newStatus !== oldStatus) {
      this.eventBus.publish(new CompanyStatusChangedEvent(
        company.id,
        oldStatus,
        newStatus,
        updatedBy
      ));
    }

    return updatedCompany;
  }

  async updateStatus(id: string, status: CompanyStatus, updatedBy: string): Promise<Company> {
    const company = await this.findOne(id);
    const oldStatus = company.status;

    company.updateStatus(status, updatedBy);
    const updatedCompany = await this.companyRepository.save(company);

    // Publish domain event
    this.eventBus.publish(new CompanyStatusChangedEvent(
      company.id,
      oldStatus,
      status,
      updatedBy
    ));

    return updatedCompany;
  }

  async softDelete(id: string, deletedBy: string): Promise<void> {
    const company = await this.findOne(id);
    
    // Soft delete company
    company.deletedAt = new Date();
    company.updatedBy = deletedBy;
    
    await this.companyRepository.save(company);

    // TODO: Archive related data (branches, users, etc.)
    // This should be handled by domain events
  }

  async getCompanyStats(companyId: string) {
    const company = await this.companyRepository
      .createQueryBuilder('company')
      .leftJoinAndSelect('company.branches', 'branch', 'branch.deletedAt IS NULL')
      .leftJoinAndSelect('company.users', 'user', 'user.deletedAt IS NULL')
      .leftJoinAndSelect('company.licenses', 'license')
      .loadRelationCountAndMap('company.branchCount', 'company.branches')
      .loadRelationCountAndMap('company.userCount', 'company.users')
      .where('company.id = :companyId', { companyId })
      .andWhere('company.deletedAt IS NULL')
      .getOne();

    if (!company) {
      throw new NotFoundException('Company not found');
    }

    const activeLicense = company.licenses?.find(l => l.status === 'active');

    return {
      id: company.id,
      name: company.name,
      status: company.status,
      branchCount: (company as any).branchCount || 0,
      userCount: (company as any).userCount || 0,
      daysUntilExpiry: company.getDaysUntilExpiry(),
      isTrialExpired: company.isTrialExpired(),
      subscriptionPlan: company.subscriptionPlan,
      businessType: company.businessType,
      license: activeLicense ? {
        status: activeLicense.status,
        expiresAt: activeLicense.expiresAt,
        features: activeLicense.features,
        daysRemaining: activeLicense.daysRemaining
      } : null
    };
  }

  async extendTrial(companyId: string, additionalDays: number, extendedBy: string): Promise<Company> {
    const company = await this.findOne(companyId);
    
    company.extendSubscription(additionalDays);
    company.updatedBy = extendedBy;
    
    return this.companyRepository.save(company);
  }

  async validateCompanyAccess(companyId: string, userCompanyId: string, userRole: UserRole): Promise<boolean> {
    // Super admins can access any company
    if (userRole === UserRole.SUPER_ADMIN) {
      return true;
    }

    // Other users can only access their own company
    return companyId === userCompanyId;
  }

  async getActiveCompaniesCount(): Promise<number> {
    return this.companyRepository.count({
      where: {
        status: CompanyStatus.ACTIVE,
        deletedAt: null
      }
    });
  }

  async getTrialCompaniesExpiringSoon(days: number = 7): Promise<Company[]> {
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + days);

    return this.companyRepository
      .createQueryBuilder('company')
      .where('company.status = :status', { status: CompanyStatus.TRIAL })
      .andWhere('company.subscriptionExpiresAt <= :expiryDate', { expiryDate })
      .andWhere('company.subscriptionExpiresAt > :now', { now: new Date() })
      .andWhere('company.deletedAt IS NULL')
      .getMany();
  }
}