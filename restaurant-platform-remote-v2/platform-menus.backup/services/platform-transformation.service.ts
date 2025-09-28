// ================================================
// Platform Menu Transformation Engine
// Coordinates all platform-specific menu transformations
// ================================================

import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { TalabatMenuService, TalabatMenuConfig } from './platform-specific/talabat-menu.service';
import { CareemMenuService, CareemMenuConfig } from './platform-specific/careem-menu.service';
import { CallCenterMenuService, CallCenterMenuConfig } from './platform-specific/call-center-menu.service';
import {
  PlatformMenu,
  DeliveryPlatform,
  MenuStatus,
  SyncStatus
} from '../types/platform-menu.types';

export interface PlatformTransformationRequest {
  platformMenuId: string;
  targetPlatforms: DeliveryPlatform[];
  configs: {
    talabat?: TalabatMenuConfig;
    careem?: CareemMenuConfig;
    call_center?: CallCenterMenuConfig;
  };
  options?: {
    skipValidation?: boolean;
    dryRun?: boolean;
    parallel?: boolean;
    stopOnFirstError?: boolean;
  };
}

export interface PlatformTransformationResult {
  success: boolean;
  results: {
    platform: DeliveryPlatform;
    success: boolean;
    message?: string;
    errors?: string[];
    warnings?: string[];
    processingTime?: number;
    itemsProcessed?: number;
  }[];
  totalProcessingTime: number;
  overallStatus: 'completed' | 'partial' | 'failed';
  summary: {
    successful: number;
    failed: number;
    warnings: number;
  };
}

export interface PlatformMenuTemplate {
  id: string;
  name: string;
  description: string;
  platforms: DeliveryPlatform[];
  category: 'fast_food' | 'fine_dining' | 'cafe' | 'delivery_only' | 'custom';
  configs: {
    talabat?: Partial<TalabatMenuConfig>;
    careem?: Partial<CareemMenuConfig>;
    call_center?: Partial<CallCenterMenuConfig>;
  };
  metadata: {
    createdAt: Date;
    updatedAt: Date;
    version: string;
    isPublic: boolean;
    tags: string[];
  };
}

@Injectable()
export class PlatformTransformationService {
  private readonly logger = new Logger(PlatformTransformationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly talabatService: TalabatMenuService,
    private readonly careemService: CareemMenuService,
    private readonly callCenterService: CallCenterMenuService
  ) {}

  // ================================================
  // TRANSFORMATION ORCHESTRATION
  // ================================================

  /**
   * Transform platform menu to multiple platforms
   */
  async transformToPlatforms(
    request: PlatformTransformationRequest
  ): Promise<PlatformTransformationResult> {
    const startTime = Date.now();
    this.logger.log(`Starting platform transformation for menu: ${request.platformMenuId}`);

    try {
      // Get platform menu with full details
      const platformMenu = await this.getPlatformMenuWithDetails(request.platformMenuId);

      // Validate request
      if (!request.options?.skipValidation) {
        await this.validateTransformationRequest(request, platformMenu);
      }

      // Update menu status to syncing
      await this.updateMenuSyncStatus(request.platformMenuId, SyncStatus.IN_PROGRESS);

      // Execute transformations
      const results = await this.executeTransformations(request, platformMenu);

      // Calculate summary
      const summary = this.calculateSummary(results);
      const overallStatus = this.determineOverallStatus(summary);

      // Update final status
      await this.updateMenuSyncStatus(
        request.platformMenuId,
        overallStatus === 'completed' ? SyncStatus.COMPLETED : 
        overallStatus === 'partial' ? SyncStatus.PARTIAL : SyncStatus.FAILED
      );

      const totalProcessingTime = Date.now() - startTime;
      this.logger.log(`Platform transformation completed in ${totalProcessingTime}ms`);

      return {
        success: overallStatus !== 'failed',
        results,
        totalProcessingTime,
        overallStatus,
        summary
      };
    } catch (error) {
      this.logger.error(`Platform transformation failed: ${error.message}`, error.stack);
      
      // Update status to failed
      await this.updateMenuSyncStatus(request.platformMenuId, SyncStatus.FAILED);
      
      return {
        success: false,
        results: [],
        totalProcessingTime: Date.now() - startTime,
        overallStatus: 'failed',
        summary: { successful: 0, failed: request.targetPlatforms.length, warnings: 0 }
      };
    }
  }

  /**
   * Execute transformations for all requested platforms
   */
  private async executeTransformations(
    request: PlatformTransformationRequest,
    platformMenu: PlatformMenu
  ): Promise<any[]> {
    const { targetPlatforms, configs, options } = request;
    const results: any[] = [];

    if (options?.parallel && targetPlatforms.length > 1) {
      // Execute transformations in parallel
      this.logger.log('Executing transformations in parallel');
      
      const promises = targetPlatforms.map(platform => 
        this.transformToPlatform(platform, platformMenu, configs, options)
      );
      
      const parallelResults = await Promise.allSettled(promises);
      
      parallelResults.forEach((result, index) => {
        const platform = targetPlatforms[index];
        if (result.status === 'fulfilled') {
          results.push({ platform, ...result.value });
        } else {
          results.push({
            platform,
            success: false,
            errors: [result.reason?.message || 'Unknown error'],
            processingTime: 0
          });
        }
      });
    } else {
      // Execute transformations sequentially
      this.logger.log('Executing transformations sequentially');
      
      for (const platform of targetPlatforms) {
        try {
          const result = await this.transformToPlatform(platform, platformMenu, configs, options);
          results.push({ platform, ...result });
          
          // Stop on first error if requested
          if (!result.success && options?.stopOnFirstError) {
            this.logger.warn(`Stopping transformation due to error in ${platform}`);
            break;
          }
        } catch (error) {
          results.push({
            platform,
            success: false,
            errors: [error.message],
            processingTime: 0
          });
          
          if (options?.stopOnFirstError) {
            break;
          }
        }
      }
    }

    return results;
  }

  /**
   * Transform to a specific platform
   */
  private async transformToPlatform(
    platform: DeliveryPlatform,
    platformMenu: PlatformMenu,
    configs: any,
    options?: any
  ): Promise<any> {
    const startTime = Date.now();
    this.logger.log(`Transforming to platform: ${platform}`);

    try {
      let result;

      switch (platform) {
        case DeliveryPlatform.TALABAT:
          if (!configs.talabat) {
            throw new BadRequestException('Talabat configuration is required');
          }
          if (options?.dryRun) {
            result = { success: true, message: 'Dry run - Talabat transformation would succeed' };
          } else {
            result = await this.talabatService.createTalabatMenu(platformMenu, configs.talabat);
          }
          break;

        case DeliveryPlatform.CAREEM:
          if (!configs.careem) {
            throw new BadRequestException('Careem configuration is required');
          }
          if (options?.dryRun) {
            result = { success: true, message: 'Dry run - Careem transformation would succeed' };
          } else {
            result = await this.careemService.createCareemMenu(platformMenu, configs.careem);
          }
          break;

        case DeliveryPlatform.CALL_CENTER:
          if (!configs.call_center) {
            throw new BadRequestException('Call Center configuration is required');
          }
          if (options?.dryRun) {
            result = { success: true, message: 'Dry run - Call Center transformation would succeed' };
          } else {
            result = await this.callCenterService.createCallCenterMenu(platformMenu, configs.call_center);
          }
          break;

        case DeliveryPlatform.WEBSITE:
        case DeliveryPlatform.MOBILE_APP:
        case DeliveryPlatform.KIOSK:
          // For internal platforms, just update configuration
          result = await this.handleInternalPlatform(platform, platformMenu, configs);
          break;

        default:
          throw new BadRequestException(`Unsupported platform: ${platform}`);
      }

      const processingTime = Date.now() - startTime;
      this.logger.log(`Platform ${platform} transformation completed in ${processingTime}ms`);
      
      return {
        ...result,
        processingTime
      };
    } catch (error) {
      const processingTime = Date.now() - startTime;
      this.logger.error(`Platform ${platform} transformation failed:`, error);
      
      return {
        success: false,
        errors: [error.message],
        processingTime
      };
    }
  }

  /**
   * Handle internal platforms (website, app, kiosk)
   */
  private async handleInternalPlatform(
    platform: DeliveryPlatform,
    platformMenu: PlatformMenu,
    configs: any
  ): Promise<any> {
    // For internal platforms, we just update the platform configuration
    // These don't require external API calls
    
    const currentConfig = platformMenu.platformConfig || {};
    const newConfig = {
      ...currentConfig,
      [platform]: {
        enabled: true,
        lastUpdated: new Date(),
        ...configs[platform]
      }
    };

    await this.prisma.platformMenu.update({
      where: { id: platformMenu.id },
      data: {
        platformConfig: newConfig,
        lastSyncedAt: new Date()
      }
    });

    return {
      success: true,
      message: `${platform} configuration updated successfully`,
      itemsProcessed: platformMenu.items?.length || 0
    };
  }

  // ================================================
  // TEMPLATE MANAGEMENT
  // ================================================

  /**
   * Get available platform menu templates
   */
  async getAvailableTemplates(
    category?: string,
    platforms?: DeliveryPlatform[]
  ): Promise<PlatformMenuTemplate[]> {
    // Get built-in templates
    const builtInTemplates = await this.getBuiltInTemplates();
    
    // Get custom templates from database
    const customTemplates = await this.getCustomTemplates();
    
    const allTemplates = [...builtInTemplates, ...customTemplates];
    
    // Apply filters
    let filteredTemplates = allTemplates;
    
    if (category) {
      filteredTemplates = filteredTemplates.filter(template => 
        template.category === category
      );
    }
    
    if (platforms && platforms.length > 0) {
      filteredTemplates = filteredTemplates.filter(template => 
        platforms.some(platform => template.platforms.includes(platform))
      );
    }
    
    return filteredTemplates;
  }

  /**
   * Create menu from template
   */
  async createMenuFromTemplate(
    templateId: string,
    platformMenuId: string,
    customizations?: any
  ): Promise<PlatformTransformationResult> {
    const template = await this.getTemplateById(templateId);
    if (!template) {
      throw new BadRequestException(`Template ${templateId} not found`);
    }

    // Apply customizations to template configs
    const configs = this.applyCustomizations(template.configs, customizations);

    // Execute transformation
    return this.transformToPlatforms({
      platformMenuId,
      targetPlatforms: template.platforms,
      configs,
      options: {
        parallel: true,
        stopOnFirstError: false
      }
    });
  }

  /**
   * Save current menu configuration as template
   */
  async saveAsTemplate(
    platformMenuId: string,
    templateName: string,
    description: string,
    isPublic: boolean = false
  ): Promise<PlatformMenuTemplate> {
    const platformMenu = await this.getPlatformMenuWithDetails(platformMenuId);
    
    const template: PlatformMenuTemplate = {
      id: `custom-${Date.now()}`,
      name: templateName,
      description,
      platforms: [platformMenu.platform],
      category: 'custom',
      configs: {
        [platformMenu.platform]: platformMenu.platformConfig
      },
      metadata: {
        createdAt: new Date(),
        updatedAt: new Date(),
        version: '1.0',
        isPublic,
        tags: []
      }
    };

    // Save to database
    await this.prisma.platformMenuTemplate.create({
      data: {
        id: template.id,
        name: template.name,
        description: template.description,
        platforms: template.platforms,
        category: template.category,
        configs: template.configs as any,
        metadata: template.metadata as any,
        isPublic
      }
    });

    return template;
  }

  // ================================================
  // HELPER METHODS
  // ================================================

  private async getPlatformMenuWithDetails(platformMenuId: string): Promise<PlatformMenu> {
    const menu = await this.prisma.platformMenu.findUnique({
      where: { id: platformMenuId },
      include: {
        items: {
          where: { deletedAt: null },
          include: {
            product: {
              include: {
                category: true,
                productImages: true,
                modifierCategories: {
                  include: {
                    modifierCategory: {
                      include: { modifiers: true }
                    }
                  }
                }
              }
            }
          }
        },
        categories: {
          where: { deletedAt: null }
        }
      }
    });

    if (!menu) {
      throw new BadRequestException(`Platform menu ${platformMenuId} not found`);
    }

    return menu as PlatformMenu;
  }

  private async validateTransformationRequest(
    request: PlatformTransformationRequest,
    platformMenu: PlatformMenu
  ): Promise<void> {
    // Validate platform menu is ready for sync
    if (platformMenu.status !== MenuStatus.ACTIVE && platformMenu.status !== MenuStatus.DRAFT) {
      throw new BadRequestException(`Menu status ${platformMenu.status} is not valid for transformation`);
    }

    // Validate required configurations
    for (const platform of request.targetPlatforms) {
      if (platform === DeliveryPlatform.TALABAT && !request.configs.talabat) {
        throw new BadRequestException('Talabat configuration is required');
      }
      if (platform === DeliveryPlatform.CAREEM && !request.configs.careem) {
        throw new BadRequestException('Careem configuration is required');
      }
      if (platform === DeliveryPlatform.CALL_CENTER && !request.configs.call_center) {
        throw new BadRequestException('Call Center configuration is required');
      }
    }

    // Validate menu has items
    if (!platformMenu.items || platformMenu.items.length === 0) {
      throw new BadRequestException('Menu must have at least one item for transformation');
    }
  }

  private async updateMenuSyncStatus(platformMenuId: string, status: SyncStatus): Promise<void> {
    await this.prisma.platformMenu.update({
      where: { id: platformMenuId },
      data: {
        syncStatus: status,
        ...(status === SyncStatus.COMPLETED && { lastSyncedAt: new Date() })
      }
    });
  }

  private calculateSummary(results: any[]): { successful: number; failed: number; warnings: number } {
    return {
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      warnings: results.filter(r => r.warnings && r.warnings.length > 0).length
    };
  }

  private determineOverallStatus(summary: any): 'completed' | 'partial' | 'failed' {
    if (summary.failed === 0) {
      return 'completed';
    } else if (summary.successful > 0) {
      return 'partial';
    } else {
      return 'failed';
    }
  }

  private async getBuiltInTemplates(): Promise<PlatformMenuTemplate[]> {
    return [
      {
        id: 'multi-platform-fast-food',
        name: 'Fast Food Multi-Platform',
        description: 'Optimized for fast food restaurants across all major platforms',
        platforms: [DeliveryPlatform.TALABAT, DeliveryPlatform.CAREEM, DeliveryPlatform.CALL_CENTER],
        category: 'fast_food',
        configs: {
          talabat: {
            currency: 'JOD',
            taxRate: 0.16,
            deliveryZones: ['amman', 'zarqa'],
            operatingHours: {
              monday: { open: '10:00', close: '23:00', available: true },
              tuesday: { open: '10:00', close: '23:00', available: true },
              wednesday: { open: '10:00', close: '23:00', available: true },
              thursday: { open: '10:00', close: '23:00', available: true },
              friday: { open: '10:00', close: '24:00', available: true },
              saturday: { open: '10:00', close: '24:00', available: true },
              sunday: { open: '12:00', close: '23:00', available: true }
            }
          },
          careem: {
            currency: 'JOD',
            serviceArea: {
              city: 'Amman',
              zones: ['Downtown', 'Abdoun', 'Sweifieh'],
              maxDeliveryRadius: 10
            },
            deliverySettings: {
              estimatedDeliveryTime: 25,
              minOrderValue: 5.0,
              deliveryFee: 1.5,
              freeDeliveryThreshold: 15.0
            }
          },
          call_center: {
            operatorSettings: {
              maxSimultaneousOrders: 3,
              averageCallDuration: 5,
              preferredLanguage: 'both'
            },
            quickOrderCodes: {
              enabled: true,
              codeLength: 3,
              includeCategory: false
            }
          }
        },
        metadata: {
          createdAt: new Date(),
          updatedAt: new Date(),
          version: '1.0',
          isPublic: true,
          tags: ['fast-food', 'multi-platform', 'quick-service']
        }
      }
    ];
  }

  private async getCustomTemplates(): Promise<PlatformMenuTemplate[]> {
    const templates = await this.prisma.platformMenuTemplate.findMany({
      where: { isPublic: true }
    });

    return templates.map(t => ({
      id: t.id,
      name: t.name,
      description: t.description,
      platforms: t.platforms as DeliveryPlatform[],
      category: t.category as any,
      configs: t.configs as any,
      metadata: t.metadata as any
    }));
  }

  private async getTemplateById(templateId: string): Promise<PlatformMenuTemplate | null> {
    const builtInTemplates = await this.getBuiltInTemplates();
    const builtInTemplate = builtInTemplates.find(t => t.id === templateId);
    
    if (builtInTemplate) {
      return builtInTemplate;
    }

    const customTemplate = await this.prisma.platformMenuTemplate.findUnique({
      where: { id: templateId }
    });

    if (customTemplate) {
      return {
        id: customTemplate.id,
        name: customTemplate.name,
        description: customTemplate.description,
        platforms: customTemplate.platforms as DeliveryPlatform[],
        category: customTemplate.category as any,
        configs: customTemplate.configs as any,
        metadata: customTemplate.metadata as any
      };
    }

    return null;
  }

  private applyCustomizations(baseConfigs: any, customizations: any): any {
    if (!customizations) {
      return baseConfigs;
    }

    const result = { ...baseConfigs };
    
    // Deep merge customizations
    Object.keys(customizations).forEach(platform => {
      if (result[platform]) {
        result[platform] = {
          ...result[platform],
          ...customizations[platform]
        };
      } else {
        result[platform] = customizations[platform];
      }
    });

    return result;
  }
}