// Multi-Tenant Manager for PrinterMaster Desktop App
import { EventEmitter } from 'events';
import { app } from 'electron';
import path from 'path';
import { ConfigManager } from './config-manager';
import { LogService } from './log-service';
import { APIService } from './api-service';

interface CompanyInfo {
  id: string;
  name: string;
  slug: string;
  logo?: string;
  businessType: string;
  timezone: string;
  defaultCurrency: string;
  status: 'trial' | 'active' | 'suspended';
  subscriptionPlan?: string;
  subscriptionExpiresAt?: Date;
}

interface BranchInfo {
  id: string;
  companyId: string;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  country?: string;
  timezone: string;
  isDefault: boolean;
  isActive: boolean;
  allowsOnlineOrders: boolean;
  allowsDelivery: boolean;
  allowsPickup: boolean;
}

interface TenantConfiguration {
  companyId: string;
  branchId: string;
  licenseKey: string;
  deviceId: string;
  deviceFingerprint: string;
  lastValidation?: Date;
  features: string[];
  maxPrinters: number;
  isActivated: boolean;
}

interface UserProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  companyId: string;
  branchId?: string;
  permissions: string[];
  isActive: boolean;
}

export class MultiTenantManager extends EventEmitter {
  private currentTenant: TenantConfiguration | null = null;
  private currentCompany: CompanyInfo | null = null;
  private currentBranch: BranchInfo | null = null;
  private currentUser: UserProfile | null = null;
  private availableCompanies: CompanyInfo[] = [];
  private availableBranches: BranchInfo[] = [];
  
  private configManager: ConfigManager;
  private logger: LogService;
  private apiService: APIService;
  
  private readonly CONFIG_KEY = 'multi-tenant-config';
  private readonly COMPANY_KEY = 'current-company';
  private readonly BRANCH_KEY = 'current-branch';
  private readonly USER_KEY = 'current-user';

  constructor(
    configManager: ConfigManager,
    logger: LogService,
    apiService: APIService
  ) {
    super();
    this.configManager = configManager;
    this.logger = logger;
    this.apiService = apiService;
    
    this.loadSavedConfiguration();
  }

  // ================================
  // Initialization & Configuration
  // ================================
  
  private loadSavedConfiguration(): void {
    try {
      const savedTenant = this.configManager.get(this.CONFIG_KEY);
      const savedCompany = this.configManager.get(this.COMPANY_KEY);
      const savedBranch = this.configManager.get(this.BRANCH_KEY);
      const savedUser = this.configManager.get(this.USER_KEY);
      
      if (savedTenant) {
        this.currentTenant = savedTenant;
      }
      
      if (savedCompany) {
        this.currentCompany = savedCompany;
      }
      
      if (savedBranch) {
        this.currentBranch = savedBranch;
      }
      
      if (savedUser) {
        this.currentUser = savedUser;
      }
      
      this.logger.info('[MULTI-TENANT] Configuration loaded from storage');
    } catch (error) {
      this.logger.error('[MULTI-TENANT] Error loading saved configuration:', error);
    }
  }

  private saveTenantConfiguration(): void {
    try {
      this.configManager.set(this.CONFIG_KEY, this.currentTenant);
      this.configManager.set(this.COMPANY_KEY, this.currentCompany);
      this.configManager.set(this.BRANCH_KEY, this.currentBranch);
      this.configManager.set(this.USER_KEY, this.currentUser);
      
      this.logger.info('[MULTI-TENANT] Configuration saved to storage');
    } catch (error) {
      this.logger.error('[MULTI-TENANT] Error saving configuration:', error);
    }
  }

  // ================================
  // Authentication & License Validation
  // ================================
  
  async authenticateWithLicense(licenseKey: string): Promise<{
    success: boolean;
    data?: any;
    error?: string;
  }> {
    try {
      this.logger.info(`[MULTI-TENANT] Authenticating with license: ${licenseKey.substring(0, 8)}...`);
      
      const response = await this.apiService.post('/api/v1/printing/desktop/validate-license', {
        licenseKey,
        deviceId: await this.generateDeviceId(),
        deviceFingerprint: await this.generateDeviceFingerprint(),
        appVersion: app.getVersion(),
        platform: process.platform,
        arch: process.arch
      });
      
      if (response.success && response.data) {
        const { license, company, branch, user } = response.data;
        
        // Set tenant configuration
        this.currentTenant = {
          companyId: company.id,
          branchId: branch.id,
          licenseKey: license.licenseKey,
          deviceId: license.deviceId,
          deviceFingerprint: license.deviceFingerprint,
          lastValidation: new Date(),
          features: license.features || [],
          maxPrinters: license.maxPrinters || 5,
          isActivated: true
        };
        
        this.currentCompany = company;
        this.currentBranch = branch;
        this.currentUser = user;
        
        this.saveTenantConfiguration();
        
        this.emit('tenant-authenticated', {
          tenant: this.currentTenant,
          company: this.currentCompany,
          branch: this.currentBranch,
          user: this.currentUser
        });
        
        this.logger.info(`[MULTI-TENANT] Successfully authenticated for company: ${company.name}`);
        
        return {
          success: true,
          data: {
            tenant: this.currentTenant,
            company: this.currentCompany,
            branch: this.currentBranch,
            user: this.currentUser
          }
        };
      }
      
      return {
        success: false,
        error: response.message || 'License validation failed'
      };
      
    } catch (error) {
      this.logger.error('[MULTI-TENANT] Authentication error:', error);
      return {
        success: false,
        error: error.message || 'Authentication failed'
      };
    }
  }

  async fetchAvailableCompanies(): Promise<CompanyInfo[]> {
    try {
      const response = await this.apiService.get('/api/v1/companies');
      if (response.success && response.data) {
        this.availableCompanies = response.data.companies || [];
        this.emit('companies-loaded', this.availableCompanies);
        return this.availableCompanies;
      }
      return [];
    } catch (error) {
      this.logger.error('[MULTI-TENANT] Error fetching companies:', error);
      return [];
    }
  }

  async fetchBranchesForCompany(companyId: string): Promise<BranchInfo[]> {
    try {
      const response = await this.apiService.get(`/api/v1/companies/${companyId}/branches`);
      if (response.success && response.data) {
        this.availableBranches = response.data.branches || [];
        this.emit('branches-loaded', this.availableBranches);
        return this.availableBranches;
      }
      return [];
    } catch (error) {
      this.logger.error('[MULTI-TENANT] Error fetching branches:', error);
      return [];
    }
  }

  // ================================
  // Tenant Management
  // ================================
  
  async switchTenant(companyId: string, branchId: string): Promise<boolean> {
    try {
      if (!this.currentTenant || !this.currentUser) {
        throw new Error('No active authentication session');
      }
      
      // Validate access to the new tenant
      const hasAccess = await this.validateTenantAccess(companyId, branchId);
      if (!hasAccess) {
        throw new Error('Access denied to the selected tenant');
      }
      
      // Get company and branch info
      const company = this.availableCompanies.find(c => c.id === companyId);
      const branch = this.availableBranches.find(b => b.id === branchId);
      
      if (!company || !branch) {
        throw new Error('Company or branch not found');
      }
      
      // Update current tenant
      this.currentTenant.companyId = companyId;
      this.currentTenant.branchId = branchId;
      this.currentCompany = company;
      this.currentBranch = branch;
      
      this.saveTenantConfiguration();
      
      this.emit('tenant-switched', {
        tenant: this.currentTenant,
        company: this.currentCompany,
        branch: this.currentBranch
      });
      
      this.logger.info(`[MULTI-TENANT] Switched to tenant: ${company.name} - ${branch.name}`);
      
      return true;
    } catch (error) {
      this.logger.error('[MULTI-TENANT] Tenant switch error:', error);
      return false;
    }
  }

  private async validateTenantAccess(companyId: string, branchId: string): Promise<boolean> {
    try {
      const response = await this.apiService.post('/api/v1/printing/desktop/validate-tenant-access', {
        companyId,
        branchId,
        userId: this.currentUser?.id,
        deviceId: this.currentTenant?.deviceId
      });
      
      return response.success;
    } catch (error) {
      this.logger.error('[MULTI-TENANT] Tenant access validation error:', error);
      return false;
    }
  }

  // ================================
  // Device Management
  // ================================
  
  private async generateDeviceId(): Promise<string> {
    // Use a combination of machine ID and app installation path
    const { machineId } = await import('node-machine-id');
    const installPath = app.getPath('userData');
    const crypto = require('crypto');
    
    const deviceString = `${await machineId()}-${installPath}-${app.getVersion()}`;
    return crypto.createHash('sha256').update(deviceString).digest('hex').substring(0, 32);
  }

  private async generateDeviceFingerprint(): Promise<string> {
    const os = require('os');
    const crypto = require('crypto');
    
    const fingerprint = {
      platform: os.platform(),
      arch: os.arch(),
      cpus: os.cpus().length,
      totalMemory: os.totalmem(),
      hostname: os.hostname(),
      userInfo: os.userInfo().username,
      appVersion: app.getVersion()
    };
    
    const fingerprintString = JSON.stringify(fingerprint);
    return crypto.createHash('md5').update(fingerprintString).digest('hex');
  }

  // ================================
  // Getters & Status Methods
  // ================================
  
  getCurrentTenant(): TenantConfiguration | null {
    return this.currentTenant;
  }

  getCurrentCompany(): CompanyInfo | null {
    return this.currentCompany;
  }

  getCurrentBranch(): BranchInfo | null {
    return this.currentBranch;
  }

  getCurrentUser(): UserProfile | null {
    return this.currentUser;
  }

  getAvailableCompanies(): CompanyInfo[] {
    return this.availableCompanies;
  }

  getAvailableBranches(): BranchInfo[] {
    return this.availableBranches;
  }

  isAuthenticated(): boolean {
    return !!(this.currentTenant && this.currentCompany && this.currentBranch);
  }

  hasFeature(feature: string): boolean {
    return this.currentTenant?.features.includes(feature) || false;
  }

  canAddPrinter(): boolean {
    // This would be implemented based on current printer count vs maxPrinters
    return true; // Simplified for now
  }

  getTenantInfo(): {
    company: CompanyInfo | null;
    branch: BranchInfo | null;
    user: UserProfile | null;
    tenant: TenantConfiguration | null;
  } {
    return {
      company: this.currentCompany,
      branch: this.currentBranch,
      user: this.currentUser,
      tenant: this.currentTenant
    };
  }

  // ================================
  // Cleanup
  // ================================
  
  async logout(): Promise<void> {
    try {
      // Notify backend about logout
      if (this.currentTenant) {
        await this.apiService.post('/api/v1/printing/desktop/logout', {
          deviceId: this.currentTenant.deviceId,
          licenseKey: this.currentTenant.licenseKey
        });
      }
      
      // Clear current state
      this.currentTenant = null;
      this.currentCompany = null;
      this.currentBranch = null;
      this.currentUser = null;
      this.availableCompanies = [];
      this.availableBranches = [];
      
      // Clear stored configuration
      this.configManager.delete(this.CONFIG_KEY);
      this.configManager.delete(this.COMPANY_KEY);
      this.configManager.delete(this.BRANCH_KEY);
      this.configManager.delete(this.USER_KEY);
      
      this.emit('tenant-logout');
      
      this.logger.info('[MULTI-TENANT] Logged out and cleared tenant data');
    } catch (error) {
      this.logger.error('[MULTI-TENANT] Logout error:', error);
    }
  }

  destroy(): void {
    this.removeAllListeners();
    this.logger.info('[MULTI-TENANT] Multi-tenant manager destroyed');
  }
}