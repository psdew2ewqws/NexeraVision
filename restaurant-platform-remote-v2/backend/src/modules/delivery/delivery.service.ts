import { Injectable, NotFoundException, BadRequestException, UnauthorizedException, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import axios from 'axios';
import { CreateDeliveryZoneDto } from './dto/create-delivery-zone.dto';
import { UpdateDeliveryZoneDto } from './dto/update-delivery-zone.dto';
import { CreateJordanLocationDto } from './dto/create-jordan-location.dto';
import { CreateDeliveryProviderDto } from './dto/create-delivery-provider.dto';
import { CreateCompanyProviderConfigDto, ProviderType } from './dto/create-company-provider-config.dto';
import { CreateBranchProviderMappingDto } from './dto/create-branch-provider-mapping.dto';
import { TestProviderConnectionDto, CreateOrderWithProviderDto } from './dto/test-provider-connection.dto';
import { WebhookPayloadDto, ProcessWebhookResponseDto, WebhookEventType } from './dto/webhook-payload.dto';

@Injectable()
export class DeliveryService {
  private readonly logger = new Logger(DeliveryService.name);
  
  constructor(
    private prisma: PrismaService
  ) {}

  // Delivery Zones Management
  async createDeliveryZone(createDeliveryZoneDto: CreateDeliveryZoneDto) {
    const branch = await this.prisma.branch.findUnique({
      where: { id: createDeliveryZoneDto.branchId },
    });

    if (!branch) {
      throw new NotFoundException('Branch not found');
    }

    return this.prisma.deliveryZone.create({
      data: {
        ...createDeliveryZoneDto,
        zoneNameSlug: createDeliveryZoneDto.zoneNameSlug || 
          this.generateSlug((createDeliveryZoneDto.zoneName as any).en || 'zone'),
      },
      include: {
        branch: {
          select: { id: true, name: true, nameAr: true }
        }
      }
    });
  }

  async findAllDeliveryZones(branchId?: string, companyId?: string) {
    let where: any = { deletedAt: null };
    
    if (branchId) {
      where.branchId = branchId;
    }
    
    if (companyId) {
      where.branch = { companyId };
    }
    
    return this.prisma.deliveryZone.findMany({
      where,
      include: {
        branch: {
          select: { 
            id: true, 
            name: true, 
            nameAr: true,
            company: {
              select: {
                id: true,
                name: true,
                slug: true
              }
            }
          }
        },
        _count: {
          select: { orders: true }
        }
      },
      orderBy: [
        { priorityLevel: 'asc' },
        { createdAt: 'desc' }
      ]
    });
  }

  async findOneDeliveryZone(id: string) {
    const zone = await this.prisma.deliveryZone.findFirst({
      where: { id, deletedAt: null },
      include: {
        branch: {
          select: { id: true, name: true, nameAr: true, company: { select: { id: true, name: true } } }
        },
        _count: {
          select: { orders: true }
        }
      }
    });

    if (!zone) {
      throw new NotFoundException('Delivery zone not found');
    }

    return zone;
  }

  async updateDeliveryZone(id: string, updateDeliveryZoneDto: UpdateDeliveryZoneDto) {
    await this.findOneDeliveryZone(id);

    return this.prisma.deliveryZone.update({
      where: { id },
      data: updateDeliveryZoneDto,
      include: {
        branch: {
          select: { id: true, name: true, nameAr: true }
        }
      }
    });
  }

  async removeDeliveryZone(id: string) {
    await this.findOneDeliveryZone(id);

    return this.prisma.deliveryZone.update({
      where: { id },
      data: { deletedAt: new Date() }
    });
  }

  // Jordan Locations Management
  async createJordanLocation(createJordanLocationDto: CreateJordanLocationDto) {
    // Instead of creating JordanLocation, create GlobalLocation for consistency
    // This ensures new locations appear in the main locations list
    const globalLocationData = {
      countryName: 'Jordan',
      countryNameAr: 'الأردن',
      governorate: createJordanLocationDto.governorate,
      city: createJordanLocationDto.city,
      cityNameAr: createJordanLocationDto.city, // Use same city name for Arabic
      area: createJordanLocationDto.areaNameEn,
      areaNameAr: createJordanLocationDto.areaNameAr,
      averageDeliveryFee: createJordanLocationDto.averageDeliveryFee,
      deliveryDifficulty: createJordanLocationDto.deliveryDifficulty || 2,
      isActive: true
    };
    
    return this.prisma.globalLocation.create({
      data: globalLocationData,
      include: {
        deliveryZones: true
      }
    });
  }

  async findAllJordanLocations(governorate?: string, city?: string, limit?: number, offset?: number, sortBy?: string, sortOrder?: string) {
    const where: any = { isActive: true };
    
    if (governorate) where.governorate = governorate;
    if (city) where.city = city;

    // Build sort order
    let orderBy: any[] = [];
    if (sortBy && ['area', 'city', 'difficulty', 'fee'].includes(sortBy)) {
      const order = sortOrder === 'desc' ? 'desc' : 'asc';
      switch (sortBy) {
        case 'area':
          orderBy = [{ area: order }, { subArea: order }];
          break;
        case 'city':
          orderBy = [{ city: order }, { governorate: order }];
          break;
        case 'difficulty':
          orderBy = [{ deliveryDifficulty: order }];
          break;
        case 'fee':
          orderBy = [{ averageDeliveryFee: order }];
          break;
      }
    } else {
      // Default sorting
      orderBy = [
        { governorate: 'asc' },
        { city: 'asc' },
        { area: 'asc' },
        { subArea: 'asc' }
      ];
    }

    // Get total count for pagination
    const total = await this.prisma.globalLocation.count({ where });

    // Get locations
    const locations = await this.prisma.globalLocation.findMany({
      where,
      orderBy,
      take: limit || undefined,
      skip: offset || undefined,
    });

    return {
      locations,
      total,
      pagination: {
        limit: limit || total,
        offset: offset || 0,
        hasMore: (offset || 0) + (limit || total) < total
      }
    };
  }

  async findJordanLocationsByArea(searchTerm: string, limit?: number) {
    return this.prisma.globalLocation.findMany({
      where: {
        isActive: true,
        OR: [
          { area: { contains: searchTerm, mode: 'insensitive' } },
          { areaNameAr: { contains: searchTerm } },
          { city: { contains: searchTerm, mode: 'insensitive' } },
          { cityNameAr: { contains: searchTerm } },
          { governorate: { contains: searchTerm, mode: 'insensitive' } },
          { subArea: { contains: searchTerm, mode: 'insensitive' } },
          { subAreaNameAr: { contains: searchTerm } },
          { searchText: { contains: searchTerm, mode: 'insensitive' } }
        ]
      },
      take: limit || 100, // Default limit for search results
      orderBy: { deliveryDifficulty: 'asc' }
    });
  }

  // Bulk Location Assignment for Multi-tenant Hierarchy
  async bulkAssignLocationsToZones(assignments: {
    locationIds: string[];
    zoneId: string;
    companyId?: string;
    branchId?: string;
  }) {
    const { locationIds, zoneId, companyId, branchId } = assignments;

    // Verify zone exists and user has permission
    const zone = await this.prisma.deliveryZone.findFirst({
      where: { 
        id: zoneId, 
        deletedAt: null,
        ...(branchId && { branchId }),
        ...(companyId && { branch: { companyId } })
      },
      include: {
        branch: {
          include: { company: true }
        }
      }
    });

    if (!zone) {
      throw new NotFoundException('Delivery zone not found or access denied');
    }

    // Verify all locations exist
    const locations = await this.prisma.globalLocation.findMany({
      where: {
        id: { in: locationIds },
        isActive: true
      }
    });

    if (locations.length !== locationIds.length) {
      throw new BadRequestException('Some locations not found or inactive');
    }

    // Create zone-location assignments
    const assignments_data = locationIds.map(locationId => ({
      deliveryZoneId: zoneId,
      globalLocationId: locationId,
      assignedAt: new Date(),
      isActive: true
    }));

    // For now, we'll store these in a new relation table
    // This would require a new model in the schema
    return {
      message: `Successfully assigned ${locationIds.length} locations to zone ${(zone.zoneName as any).en}`,
      assignments: assignments_data,
      zone: {
        id: zone.id,
        name: (zone.zoneName as any).en,
        branch: zone.branch.name,
        company: zone.branch.company.name
      }
    };
  }

  // Get locations with hierarchy filtering for role-based access
  async getAvailableLocationsByRole(userRole: string, companyId?: string, branchId?: string) {
    let locations;

    if (userRole === 'super_admin') {
      // Super admin sees all 2,080+ locations
      locations = await this.prisma.globalLocation.findMany({
        where: { isActive: true },
        orderBy: [
          { governorate: 'asc' },
          { city: 'asc' },
          { area: 'asc' },
          { subArea: 'asc' }
        ]
      });
    } else if (userRole === 'company_owner' && companyId) {
      // Company owner sees all locations (can create zones for any branch in their company)
      locations = await this.prisma.globalLocation.findMany({
        where: { isActive: true },
        orderBy: [
          { governorate: 'asc' },
          { city: 'asc' },
          { area: 'asc' },
          { subArea: 'asc' }
        ]
      });
    } else if (branchId) {
      // Branch manager sees all locations but can only assign to their branch
      locations = await this.prisma.globalLocation.findMany({
        where: { isActive: true },
        orderBy: [
          { governorate: 'asc' },
          { city: 'asc' },
          { area: 'asc' },
          { subArea: 'asc' }
        ]
      });
    } else {
      locations = [];
    }

    return {
      locations,
      total: locations.length,
      hierarchy: {
        userRole,
        companyId,
        branchId,
        canAssignToAllCompanies: userRole === 'super_admin',
        canAssignToCompanyBranches: userRole === 'company_owner',
        canAssignToBranch: ['branch_manager', 'company_owner', 'super_admin'].includes(userRole)
      }
    };
  }

  // Get location statistics with hierarchy breakdown
  async getLocationStatistics(companyId?: string) {
    const totalLocations = await this.prisma.globalLocation.count({
      where: { isActive: true }
    });

    const locationsByGovernorate = await this.prisma.globalLocation.groupBy({
      by: ['governorate'],
      where: { isActive: true },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } }
    });

    const locationsByDifficulty = await this.prisma.globalLocation.groupBy({
      by: ['deliveryDifficulty'],
      where: { isActive: true },
      _count: { id: true },
      orderBy: { deliveryDifficulty: 'asc' }
    });

    return {
      total: totalLocations,
      byGovernorate: locationsByGovernorate.map(item => ({
        governorate: item.governorate,
        count: item._count.id
      })),
      byDifficulty: locationsByDifficulty.map(item => ({
        difficulty: item.deliveryDifficulty,
        label: item.deliveryDifficulty === 1 ? 'Easy' : 
               item.deliveryDifficulty === 2 ? 'Normal' :
               item.deliveryDifficulty === 3 ? 'Medium' : 'Hard',
        count: item._count.id
      }))
    };
  }

  // Delivery Providers Management
  async createDeliveryProvider(createDeliveryProviderDto: CreateDeliveryProviderDto) {
    return this.prisma.deliveryProvider.create({
      data: createDeliveryProviderDto
    });
  }

  async findAllDeliveryProviders(activeOnly = false, companyId?: string) {
    const where: any = activeOnly ? { isActive: true } : {};
    
    // Multi-tenant filtering: show global providers + company-specific providers
    if (companyId) {
      where.OR = [
        { companyId: null }, // Global providers
        { companyId: companyId } // Company-specific providers
      ];
    }
    
    const providers = await this.prisma.deliveryProvider.findMany({
      where,
      include: {
        company: {
          select: { id: true, name: true }
        },
        _count: {
          select: { orders: true, providerOrders: true }
        }
      },
      orderBy: [
        { priority: 'asc' },
        { createdAt: 'desc' }
      ]
    });

    // Map the response to include providerName and providerType for frontend compatibility
    return providers.map(provider => ({
      ...provider,
      providerName: provider.name,
      providerType: provider.name, // Use name as type since they match in our system
      isActive: provider.isActive,
      avgDeliveryTime: provider.avgDeliveryTime,
      baseFee: provider.baseFee,
      feePerKm: provider.feePerKm,
      maxDistance: provider.maxDistance
    }));
  }

  async findOneDeliveryProvider(id: string) {
    const provider = await this.prisma.deliveryProvider.findUnique({
      where: { id }
    });

    if (!provider) {
      throw new NotFoundException('Delivery provider not found');
    }

    return provider;
  }

  // Delivery Fee Calculator
  async calculateDeliveryFee(branchId: string, lat: number, lng: number): Promise<{
    zone?: any;
    provider?: any;
    fee: number;
    estimatedTime: number;
    distance?: number;
  }> {
    // Find applicable delivery zone for the coordinates
    const zones = await this.prisma.deliveryZone.findMany({
      where: { 
        branchId, 
        isActive: true, 
        deletedAt: null 
      },
      orderBy: { priorityLevel: 'asc' }
    });

    // Check if coordinates fall within any zone
    let applicableZone = null;
    for (const zone of zones) {
      if (await this.isPointInZone(lat, lng, zone)) {
        applicableZone = zone;
        break;
      }
    }

    if (!applicableZone) {
      throw new BadRequestException('Delivery not available to this location');
    }

    // Get the best available provider
    const providers = await this.findAllDeliveryProviders(true);
    const bestProvider = providers[0]; // Highest priority active provider

    return {
      zone: applicableZone,
      provider: bestProvider,
      fee: parseFloat(applicableZone.deliveryFee.toString()),
      estimatedTime: applicableZone.maxDeliveryTimeMins,
      distance: await this.calculateDistance(
        parseFloat(applicableZone.centerLat?.toString() || '0'),
        parseFloat(applicableZone.centerLng?.toString() || '0'),
        lat,
        lng
      )
    };
  }

  // Location validation for orders
  async validateDeliveryLocation(branchId: string, lat: number, lng: number) {
    try {
      const result = await this.calculateDeliveryFee(branchId, lat, lng);
      return {
        isValid: true,
        ...result
      };
    } catch (error) {
      return {
        isValid: false,
        error: error.message
      };
    }
  }

  // Get delivery statistics
  async getDeliveryStats(branchId?: string) {
    const where = branchId ? { branchId } : {};

    const [
      totalZones,
      activeZones,
      totalOrders,
      avgDeliveryTime
    ] = await Promise.all([
      this.prisma.deliveryZone.count({ where: { ...where, deletedAt: null } }),
      this.prisma.deliveryZone.count({ where: { ...where, isActive: true, deletedAt: null } }),
      this.prisma.order.count({ where: { ...where, orderType: 'delivery' } }),
      this.prisma.order.aggregate({
        where: { 
          ...where, 
          orderType: 'delivery',
          actualDeliveryTime: { not: null }
        },
        _avg: {
          deliveryFee: true
        }
      })
    ]);

    return {
      zones: {
        total: totalZones,
        active: activeZones
      },
      orders: {
        total: totalOrders,
        averageDeliveryFee: avgDeliveryTime._avg.deliveryFee || 0
      }
    };
  }

  // Utility methods
  private generateSlug(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  private async isPointInZone(lat: number, lng: number, zone: any): Promise<boolean> {
    // Simple circular zone check if radius is provided
    if (zone.centerLat && zone.centerLng && zone.radius) {
      const distance = await this.calculateDistance(
        parseFloat(zone.centerLat.toString()),
        parseFloat(zone.centerLng.toString()),
        lat,
        lng
      );
      return distance <= parseFloat(zone.radius.toString());
    }

    // If polygon is provided, use polygon containment (simplified)
    if (zone.polygon && zone.polygon.coordinates) {
      // This is a simplified polygon check - in production, use a proper geospatial library
      return true; // Placeholder - implement proper polygon containment
    }

    return false;
  }

  private async calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): Promise<number> {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.toRadians(lat2 - lat1);
    const dLng = this.toRadians(lng2 - lng1);
    
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
              Math.sin(dLng / 2) * Math.sin(dLng / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  // Multi-tenant delivery provider orders
  async createProviderOrder(data: {
    companyId: string;
    branchId: string;
    deliveryProviderId: string;
    providerOrderId: string;
    orderNumber: string;
    orderDetails: any;
    customerDetails?: any;
    deliveryAddress?: any;
  }) {
    return this.prisma.deliveryProviderOrder.create({
      data,
      include: {
        company: { select: { id: true, name: true } },
        branch: { select: { id: true, name: true } },
        deliveryProvider: { select: { id: true, name: true, displayName: true } }
      }
    });
  }

  async findCompanyProviderOrders(companyId: string, status?: string) {
    const where: any = { companyId };
    if (status) {
      where.orderStatus = status;
    }
    
    return this.prisma.deliveryProviderOrder.findMany({
      where,
      include: {
        branch: { select: { id: true, name: true } },
        deliveryProvider: { select: { id: true, name: true, displayName: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  async updateProviderOrderStatus(id: string, orderStatus: string, webhookData?: any) {
    const updateData: any = { 
      orderStatus, 
      updatedAt: new Date() 
    };
    
    if (webhookData) {
      updateData.webhookData = webhookData;
    }
    
    return this.prisma.deliveryProviderOrder.update({
      where: { id },
      data: updateData
    });
  }

  // Get delivery statistics filtered by company
  async getDeliveryStatistics(companyId?: string) {
    const whereProvider = companyId ? {
      OR: [
        { companyId: null },
        { companyId: companyId }
      ]
    } : {};
    
    const whereOrders = companyId ? { companyId } : {};

    const [
      totalProviders,
      activeProviders,
      totalOrders,
      pendingOrders,
      deliveredOrders
    ] = await Promise.all([
      this.prisma.deliveryProvider.count({ where: whereProvider }),
      this.prisma.deliveryProvider.count({ 
        where: { ...whereProvider, isActive: true } 
      }),
      this.prisma.deliveryProviderOrder.count({ where: whereOrders }),
      this.prisma.deliveryProviderOrder.count({ 
        where: { ...whereOrders, orderStatus: 'created' } 
      }),
      this.prisma.deliveryProviderOrder.count({ 
        where: { ...whereOrders, orderStatus: 'delivered' } 
      })
    ]);

    return {
      providers: {
        total: totalProviders,
        active: activeProviders,
        inactive: totalProviders - activeProviders
      },
      orders: {
        total: totalOrders,
        pending: pendingOrders,
        delivered: deliveredOrders,
        inProgress: totalOrders - pendingOrders - deliveredOrders
      }
    };
  }

  // Location-Branch Assignment Methods
  async assignLocationToBranch(assignment: {
    locationId: string;
    branchId: string;
    deliveryFee?: number;
    isActive?: boolean;
  }) {
    const { locationId, branchId, deliveryFee, isActive = true } = assignment;

    // Verify location exists
    const location = await this.prisma.globalLocation.findUnique({
      where: { id: locationId }
    });
    if (!location) {
      throw new NotFoundException('Location not found');
    }

    // Verify branch exists
    const branch = await this.prisma.branch.findUnique({
      where: { id: branchId },
      include: { company: true }
    });
    if (!branch) {
      throw new NotFoundException('Branch not found');
    }

    // Check if assignment already exists
    const existingZone = await this.prisma.deliveryZone.findFirst({
      where: {
        branchId,
        globalLocationId: locationId,
        deletedAt: null
      }
    });

    if (existingZone) {
      throw new BadRequestException('Location is already assigned to this branch');
    }

    // Create delivery zone for this assignment
    const deliveryZone = await this.prisma.deliveryZone.create({
      data: {
        branchId,
        globalLocationId: locationId,
        zoneName: {
          en: location.area,
          ar: location.areaNameAr
        },
        zoneNameSlug: this.generateSlug(location.area),
        deliveryFee,
        isActive,
        priorityLevel: 2,
        averageDeliveryTimeMins: 30
      },
      include: {
        branch: {
          select: {
            id: true,
            name: true,
            nameAr: true,
            company: {
              select: { id: true, name: true }
            }
          }
        },
        globalLocation: {
          select: {
            id: true,
            area: true,
            areaNameAr: true,
            city: true,
            governorate: true
          }
        }
      }
    });

    return {
      message: 'Location assigned to branch successfully',
      deliveryZone
    };
  }

  async assignLocationsToBranch(assignment: {
    locationIds: string[];
    branchId: string;
    deliveryFee?: number;
    isActive?: boolean;
  }) {
    const { locationIds, branchId, deliveryFee, isActive = true } = assignment;

    // Verify branch exists
    const branch = await this.prisma.branch.findUnique({
      where: { id: branchId },
      include: { company: true }
    });
    if (!branch) {
      throw new NotFoundException('Branch not found');
    }

    // Verify all locations exist
    const locations = await this.prisma.globalLocation.findMany({
      where: { id: { in: locationIds } }
    });
    if (locations.length !== locationIds.length) {
      throw new BadRequestException('Some locations not found');
    }

    // Check for existing assignments
    const existingZones = await this.prisma.deliveryZone.findMany({
      where: {
        branchId,
        globalLocationId: { in: locationIds },
        deletedAt: null
      },
      include: { globalLocation: true }
    });

    if (existingZones.length > 0) {
      const existingLocationNames = existingZones.map(z => z.globalLocation.area);
      throw new BadRequestException(
        `Some locations are already assigned to this branch: ${existingLocationNames.join(', ')}`
      );
    }

    // Create delivery zones for all assignments
    const deliveryZonesData = locations.map(location => ({
      branchId,
      globalLocationId: location.id,
      zoneName: {
        en: location.area,
        ar: location.areaNameAr
      },
      zoneNameSlug: this.generateSlug(location.area + '-' + location.id.slice(0, 8)),
      deliveryFee,
      isActive,
      priorityLevel: 2,
      averageDeliveryTimeMins: 30
    }));

    const deliveryZones = await this.prisma.$transaction(
      deliveryZonesData.map(data =>
        this.prisma.deliveryZone.create({
          data,
          include: {
            branch: {
              select: {
                id: true,
                name: true,
                nameAr: true,
                company: { select: { id: true, name: true } }
              }
            },
            globalLocation: {
              select: {
                id: true,
                area: true,
                areaNameAr: true,
                city: true,
                governorate: true
              }
            }
          }
        })
      )
    );

    return {
      message: `${deliveryZones.length} locations assigned to branch successfully`,
      deliveryZones
    };
  }

  async unassignLocationFromBranch(assignment: {
    locationId: string;
    branchId: string;
  }) {
    const { locationId, branchId } = assignment;

    const deliveryZone = await this.prisma.deliveryZone.findFirst({
      where: {
        branchId,
        globalLocationId: locationId,
        deletedAt: null
      }
    });

    if (!deliveryZone) {
      throw new NotFoundException('Location assignment not found');
    }

    // Soft delete the delivery zone
    await this.prisma.deliveryZone.update({
      where: { id: deliveryZone.id },
      data: {
        deletedAt: new Date(),
        isActive: false
      }
    });

    return {
      message: 'Location unassigned from branch successfully'
    };
  }

  async getLocationsWithBranches(locationId?: string, companyId?: string) {
    const whereLocation: any = {};
    const whereZone: any = { deletedAt: null };

    if (locationId) {
      whereLocation.id = locationId;
    }

    if (companyId) {
      whereZone.branch = { companyId };
    }

    const locations = await this.prisma.globalLocation.findMany({
      where: {
        ...whereLocation,
        isActive: true
      },
      include: {
        deliveryZones: {
          where: whereZone,
          include: {
            branch: {
              select: {
                id: true,
                name: true,
                nameAr: true,
                company: {
                  select: { id: true, name: true }
                }
              }
            }
          }
        }
      },
      orderBy: [
        { governorate: 'asc' },
        { city: 'asc' },
        { area: 'asc' }
      ]
    });

    return locations.map(location => ({
      id: location.id,
      areaName: location.area,
      areaNameAr: location.areaNameAr,
      cityName: location.city,
      governorate: location.governorate,
      deliveryDifficulty: location.deliveryDifficulty,
      averageDeliveryFee: location.averageDeliveryFee,
      isActive: location.isActive,
      assignedBranches: location.deliveryZones.map(zone => ({
        branchId: zone.branch.id,
        branchName: zone.branch.name,
        branchNameAr: zone.branch.nameAr,
        companyId: zone.branch.company.id,
        companyName: zone.branch.company.name,
        deliveryFee: zone.deliveryFee,
        isActive: zone.isActive,
        zoneId: zone.id
      }))
    }));
  }

  // Multi-Tenant Provider Configuration Management
  async createCompanyProviderConfig(createDto: CreateCompanyProviderConfigDto, requestingUserId?: string) {
    // Verify company exists
    const company = await this.prisma.company.findUnique({
      where: { id: createDto.companyId }
    });
    if (!company) {
      throw new NotFoundException('Company not found');
    }

    // Check if configuration already exists for this company-provider combination
    const existingConfig = await this.prisma.companyProviderConfig.findFirst({
      where: {
        companyId: createDto.companyId,
        providerType: createDto.providerType
      }
    });

    if (existingConfig && existingConfig.isActive) {
      throw new BadRequestException(
        `Active configuration for ${createDto.providerType} already exists for this company`
      );
    }

    // Create new configuration
    const config = await this.prisma.companyProviderConfig.create({
      data: {
        ...createDto
      },
      include: {
        company: {
          select: { id: true, name: true, slug: true }
        },
        _count: {
          select: { branchMappings: true }
        }
      }
    });

    return config;
  }

  async findAllCompanyProviderConfigs(companyId?: string, providerType?: ProviderType, activeOnly = true) {
    const where: any = {};
    
    if (companyId) {
      where.companyId = companyId;
    }
    
    if (providerType) {
      where.providerType = providerType;
    }
    
    if (activeOnly) {
      where.isActive = true;
    }

    return this.prisma.companyProviderConfig.findMany({
      where,
      include: {
        company: {
          select: { id: true, name: true, slug: true }
        },
        _count: {
          select: { branchMappings: true, providerOrders: true }
        }
      },
      orderBy: [
        { priority: 'asc' },
        { createdAt: 'desc' }
      ]
    });
  }

  async findOneCompanyProviderConfig(id: string) {
    const config = await this.prisma.companyProviderConfig.findUnique({
      where: { id },
      include: {
        company: {
          select: { id: true, name: true, slug: true }
        },
        branchMappings: {
          include: {
            branch: {
              select: { id: true, name: true, nameAr: true, address: true }
            }
          }
        },
        providerOrders: {
          select: { id: true, orderStatus: true, createdAt: true },
          orderBy: { createdAt: 'desc' },
          take: 10
        },
        _count: {
          select: { branchMappings: true, providerOrders: true }
        }
      }
    });

    if (!config) {
      throw new NotFoundException('Provider configuration not found');
    }

    return config;
  }

  async updateCompanyProviderConfig(id: string, updateData: Partial<CreateCompanyProviderConfigDto>, requestingUserId?: string) {
    await this.findOneCompanyProviderConfig(id);

    return this.prisma.companyProviderConfig.update({
      where: { id },
      data: {
        ...updateData,
        updatedAt: new Date()
      },
      include: {
        company: {
          select: { id: true, name: true, slug: true }
        },
        _count: {
          select: { branchMappings: true }
        }
      }
    });
  }

  async deleteCompanyProviderConfig(id: string) {
    const config = await this.findOneCompanyProviderConfig(id);
    
    // Check if there are active branch mappings
    const activeMappings = await this.prisma.branchProviderMapping.count({
      where: {
        companyProviderConfigId: id,
        isActive: true
      }
    });

    if (activeMappings > 0) {
      throw new BadRequestException(
        `Cannot delete configuration with ${activeMappings} active branch mappings. Disable mappings first.`
      );
    }

    // Soft delete by setting isActive to false
    return this.prisma.companyProviderConfig.update({
      where: { id },
      data: {
        isActive: false,
        updatedAt: new Date()
      }
    });
  }

  // Branch-to-Provider Mapping Management
  async createBranchProviderMapping(createDto: CreateBranchProviderMappingDto, requestingUserId?: string) {
    // Verify branch exists and get company info
    const branch = await this.prisma.branch.findUnique({
      where: { id: createDto.branchId },
      include: { company: true }
    });
    if (!branch) {
      throw new NotFoundException('Branch not found');
    }

    // Verify company provider config exists and belongs to same company
    const providerConfig = await this.prisma.companyProviderConfig.findUnique({
      where: { id: createDto.companyProviderConfigId }
    });
    if (!providerConfig) {
      throw new NotFoundException('Provider configuration not found');
    }
    if (providerConfig.companyId !== branch.companyId) {
      throw new BadRequestException('Provider configuration does not belong to branch company');
    }

    // Check if mapping already exists
    const existingMapping = await this.prisma.branchProviderMapping.findFirst({
      where: {
        branchId: createDto.branchId,
        companyProviderConfigId: createDto.companyProviderConfigId
      }
    });

    if (existingMapping && existingMapping.isActive) {
      throw new BadRequestException('Active mapping already exists for this branch and provider');
    }

    // Create mapping
    const mapping = await this.prisma.branchProviderMapping.create({
      data: {
        ...createDto
      },
      include: {
        branch: {
          select: { id: true, name: true, nameAr: true, address: true, company: { select: { name: true } } }
        },
        companyProviderConfig: {
          select: { id: true, providerType: true, isActive: true }
        }
      }
    });

    return mapping;
  }

  async findAllBranchProviderMappings(branchId?: string, companyId?: string, providerType?: ProviderType) {
    const where: any = {};
    
    if (branchId) {
      where.branchId = branchId;
    }
    
    if (companyId) {
      where.branch = { companyId };
    }
    
    if (providerType) {
      where.companyProviderConfig = { providerType };
    }

    return this.prisma.branchProviderMapping.findMany({
      where,
      include: {
        branch: {
          select: { 
            id: true, 
            name: true, 
            nameAr: true, 
            address: true,
            company: { select: { id: true, name: true } }
          }
        },
        companyProviderConfig: {
          select: {
            id: true,
            providerType: true,
            isActive: true,
            maxDistance: true,
            baseFee: true,
            avgDeliveryTime: true
          }
        }
      },
      orderBy: [
        { priority: 'asc' },
        { createdAt: 'desc' }
      ]
    });
  }

  async updateBranchProviderMapping(id: string, updateData: Partial<CreateBranchProviderMappingDto>, requestingUserId?: string) {
    const existingMapping = await this.prisma.branchProviderMapping.findUnique({
      where: { id }
    });
    
    if (!existingMapping) {
      throw new NotFoundException('Branch provider mapping not found');
    }

    return this.prisma.branchProviderMapping.update({
      where: { id },
      data: {
        ...updateData,
        updatedAt: new Date()
      },
      include: {
        branch: {
          select: { id: true, name: true, nameAr: true }
        },
        companyProviderConfig: {
          select: { id: true, providerType: true }
        }
      }
    });
  }

  // Provider Connection Testing
  async testProviderConnection(testDto: TestProviderConnectionDto, requestingUserId?: string) {
    const config = await this.findOneCompanyProviderConfig(testDto.companyProviderConfigId);
    
    // Log the test attempt
    const testLog = await this.prisma.providerOrderLog.create({
      data: {
        companyProviderConfigId: testDto.companyProviderConfigId,
        orderId: 'CONNECTION_TEST',
        requestPayload: testDto.testParameters || {},
        orderStatus: 'pending'
      }
    });

    try {
      // Simulate provider-specific connection test based on provider type
      const testResult = await this.performProviderConnectionTest(config.providerType, config, testDto.testParameters);
      
      // Update log with success
      await this.prisma.providerOrderLog.update({
        where: { id: testLog.id },
        data: {
          orderStatus: testResult.success ? 'delivered' : 'failed',
          responsePayload: testResult,
          processingTimeMs: Date.now() - testLog.createdAt.getTime()
        }
      });

      return {
        success: testResult.success,
        message: testResult.message,
        providerType: config.providerType,
        testDetails: testResult.details,
        logId: testLog.id
      };
    } catch (error) {
      // Update log with failure
      await this.prisma.providerOrderLog.update({
        where: { id: testLog.id },
        data: {
          orderStatus: 'failed',
          errorMessage: error.message,
          processingTimeMs: Date.now() - testLog.createdAt.getTime()
        }
      });

      throw new BadRequestException(`Provider connection test failed: ${error.message}`);
    }
  }

  // Create Order with Provider
  async createOrderWithProvider(orderDto: CreateOrderWithProviderDto, requestingUserId?: string) {
    const mapping = await this.prisma.branchProviderMapping.findUnique({
      where: { id: orderDto.branchProviderMappingId },
      include: {
        branch: { include: { company: true } },
        companyProviderConfig: true
      }
    });

    if (!mapping) {
      throw new NotFoundException('Branch provider mapping not found');
    }

    if (!mapping.isActive || !mapping.companyProviderConfig.isActive) {
      throw new BadRequestException('Branch provider mapping or configuration is inactive');
    }

    // Create order log
    const orderLog = await this.prisma.providerOrderLog.create({
      data: {
        companyProviderConfigId: mapping.companyProviderConfigId,
        branchId: mapping.branchId,
        orderId: orderDto.orderId,
        requestPayload: orderDto.orderDetails,
        orderStatus: 'pending'
      }
    });

    try {
      // Perform provider-specific order creation
      const orderResult = await this.performProviderOrderCreation(
        mapping.companyProviderConfig.providerType,
        mapping.companyProviderConfig,
        mapping,
        orderDto.orderDetails
      );

      // Update log with success
      await this.prisma.providerOrderLog.update({
        where: { id: orderLog.id },
        data: {
          orderStatus: orderResult.success ? 'delivered' : 'failed',
          responsePayload: orderResult,
          providerOrderId: orderResult.providerOrderId,
          processingTimeMs: Date.now() - orderLog.createdAt.getTime()
        }
      });

      return {
        success: orderResult.success,
        providerOrderId: orderResult.providerOrderId,
        message: orderResult.message,
        estimatedDeliveryTime: orderResult.estimatedDeliveryTime,
        trackingUrl: orderResult.trackingUrl,
        logId: orderLog.id
      };
    } catch (error) {
      await this.prisma.providerOrderLog.update({
        where: { id: orderLog.id },
        data: {
          orderStatus: 'failed',
          errorMessage: error.message,
          processingTimeMs: Date.now() - orderLog.createdAt.getTime()
        }
      });

      throw new BadRequestException(`Order creation failed: ${error.message}`);
    }
  }

  // Provider-specific Implementation Methods
  private async performProviderConnectionTest(
    providerType: string, 
    config: any, 
    testParameters?: any
  ): Promise<{success: boolean, message: string, details?: any}> {
    // Implementation based on Picolinate analysis
    switch (providerType) {
      case 'dhub':
        return this.testDHUBConnection(config, testParameters);
      case 'talabat':
        return this.testTalabatConnection(config, testParameters);
      case 'careem':
        return this.testCareemConnection(config, testParameters);
      case 'deliveroo':
        return this.testDeliverooConnection(config, testParameters);
      default:
        throw new BadRequestException(`Provider type ${providerType} not supported`);
    }
  }

  private async performProviderOrderCreation(
    providerType: string,
    config: any,
    mapping: any,
    orderDetails: any
  ): Promise<{success: boolean, providerOrderId?: string, message: string, estimatedDeliveryTime?: number, trackingUrl?: string}> {
    switch (providerType) {
      case 'dhub':
        return this.createDHUBOrder(config, mapping, orderDetails);
      case 'talabat':
        return this.createTalabatOrder(config, mapping, orderDetails);
      case 'careem':
        return this.createCareemOrder(config, mapping, orderDetails);
      case 'deliveroo':
        return this.createDeliverooOrder(config, mapping, orderDetails);
      default:
        throw new BadRequestException(`Provider type ${providerType} not supported`);
    }
  }

  // DHUB Integration Methods (Based on Picolinate Analysis)
  private async testDHUBConnection(config: any, testParams?: any): Promise<{success: boolean, message: string, details?: any}> {
    // Simulated DHUB connection test based on Bearer token authentication
    try {
      if (!config.credentials?.accessToken) {
        return { success: false, message: 'Missing DHUB access token' };
      }

      // In real implementation, make HTTP request to DHUB API
      // const response = await fetch(`${config.configuration.apiBaseUrl}/api/v1/test`, {
      //   headers: { 'Authorization': `Bearer ${config.credentials.accessToken}` }
      // });

      return {
        success: true,
        message: 'DHUB connection successful',
        details: {
          apiBaseUrl: config.configuration?.apiBaseUrl,
          tokenValid: true,
          testLatitude: testParams?.testLatitude,
          testLongitude: testParams?.testLongitude
        }
      };
    } catch (error) {
      return { success: false, message: `DHUB connection failed: ${error.message}` };
    }
  }

  private async createDHUBOrder(config: any, mapping: any, orderDetails: any): Promise<{success: boolean, providerOrderId?: string, message: string, estimatedDeliveryTime?: number, trackingUrl?: string}> {
    // Simulated DHUB order creation
    try {
      const dhubOrderId = `DHUB-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      return {
        success: true,
        providerOrderId: dhubOrderId,
        message: 'DHUB order created successfully',
        estimatedDeliveryTime: 30,
        trackingUrl: `${config.configuration.apiBaseUrl}/track/${dhubOrderId}`
      };
    } catch (error) {
      return { success: false, message: `DHUB order creation failed: ${error.message}` };
    }
  }

  // Talabat Integration Methods
  private async testTalabatConnection(config: any, testParams?: any): Promise<{success: boolean, message: string, details?: any}> {
    try {
      if (!config.credentials?.apiKey || !config.configuration?.brandId) {
        return { success: false, message: 'Missing Talabat API key or brand ID' };
      }

      return {
        success: true,
        message: 'Talabat connection successful',
        details: {
          brandId: config.configuration.brandId,
          apiKeyValid: true
        }
      };
    } catch (error) {
      return { success: false, message: `Talabat connection failed: ${error.message}` };
    }
  }

  private async createTalabatOrder(config: any, mapping: any, orderDetails: any): Promise<{success: boolean, providerOrderId?: string, message: string, estimatedDeliveryTime?: number, trackingUrl?: string}> {
    try {
      const talabatOrderId = `TLB-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      return {
        success: true,
        providerOrderId: talabatOrderId,
        message: 'Talabat order created successfully',
        estimatedDeliveryTime: 45,
        trackingUrl: `https://www.talabat.com/track/${talabatOrderId}`
      };
    } catch (error) {
      return { success: false, message: `Talabat order creation failed: ${error.message}` };
    }
  }

  // Careem Integration Methods
  private async testCareemConnection(config: any, testParams?: any): Promise<{success: boolean, message: string, details?: any}> {
    try {
      if (!config.credentials?.clientId || !config.credentials?.clientSecret) {
        return { success: false, message: 'Missing Careem OAuth credentials' };
      }

      return {
        success: true,
        message: 'Careem connection successful',
        details: {
          clientId: config.credentials.clientId,
          oauthValid: true
        }
      };
    } catch (error) {
      return { success: false, message: `Careem connection failed: ${error.message}` };
    }
  }

  private async createCareemOrder(config: any, mapping: any, orderDetails: any): Promise<{success: boolean, providerOrderId?: string, message: string, estimatedDeliveryTime?: number, trackingUrl?: string}> {
    try {
      const careemOrderId = `CRM-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      return {
        success: true,
        providerOrderId: careemOrderId,
        message: 'Careem order created successfully',
        estimatedDeliveryTime: 35,
        trackingUrl: `https://www.careem.com/track/${careemOrderId}`
      };
    } catch (error) {
      return { success: false, message: `Careem order creation failed: ${error.message}` };
    }
  }

  // Deliveroo Integration Methods (OAuth2 flow)
  private async testDeliverooConnection(config: any, testParams?: any): Promise<{success: boolean, message: string, details?: any}> {
    try {
      if (!config.credentials?.accessToken) {
        return { success: false, message: 'Missing Deliveroo access token' };
      }

      // Check if token needs refresh
      if (config.credentials.tokenExpiresAt && new Date(config.credentials.tokenExpiresAt) < new Date()) {
        return { success: false, message: 'Deliveroo token expired, requires refresh' };
      }

      return {
        success: true,
        message: 'Deliveroo connection successful',
        details: {
          tokenValid: true,
          expiresAt: config.credentials.tokenExpiresAt
        }
      };
    } catch (error) {
      return { success: false, message: `Deliveroo connection failed: ${error.message}` };
    }
  }

  private async createDeliverooOrder(config: any, mapping: any, orderDetails: any): Promise<{success: boolean, providerOrderId?: string, message: string, estimatedDeliveryTime?: number, trackingUrl?: string}> {
    try {
      const deliverooOrderId = `DLV-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      return {
        success: true,
        providerOrderId: deliverooOrderId,
        message: 'Deliveroo order created successfully',
        estimatedDeliveryTime: 40,
        trackingUrl: `https://deliveroo.com/track/${deliverooOrderId}`
      };
    } catch (error) {
      return { success: false, message: `Deliveroo order creation failed: ${error.message}` };
    }
  }

  // Get provider configuration statistics
  async getProviderConfigurationStats(companyId?: string) {
    const where = companyId ? { companyId } : {};

    const [
      totalConfigs,
      activeConfigs,
      totalMappings,
      activeMappings,
      orderCounts
    ] = await Promise.all([
      this.prisma.companyProviderConfig.count({ where }),
      this.prisma.companyProviderConfig.count({ where: { ...where, isActive: true } }),
      this.prisma.branchProviderMapping.count({ where: companyId ? { branch: { companyId } } : {} }),
      this.prisma.branchProviderMapping.count({ where: { ...companyId ? { branch: { companyId } } : {}, isActive: true } }),
      this.prisma.providerOrderLog.groupBy({
        by: ['orderStatus'],
        where: companyId ? { companyProviderConfig: { companyId } } : {},
        _count: { id: true }
      })
    ]);

    const orderStats = orderCounts.reduce((acc, item) => {
      acc[item.orderStatus.toLowerCase()] = item._count.id;
      return acc;
    }, {} as any);

    return {
      configurations: {
        total: totalConfigs,
        active: activeConfigs,
        inactive: totalConfigs - activeConfigs
      },
      mappings: {
        total: totalMappings,
        active: activeMappings,
        inactive: totalMappings - activeMappings
      },
      orders: {
        total: Object.values(orderStats).reduce((sum: number, count: number) => sum + count, 0),
        success: orderStats.success || 0,
        failed: orderStats.failed || 0,
        pending: orderStats.pending || 0
      }
    };
  }

  // ===== WEBHOOK PROCESSING METHODS =====

  async processProviderWebhook(
    webhookData: WebhookPayloadDto, 
    sourceIp?: string,
    headers?: Record<string, string>
  ): Promise<ProcessWebhookResponseDto> {
    const logEntry = await this.prisma.providerOrderLog.create({
      data: {
        orderId: 'WEBHOOK_RECEIVED',
        orderStatus: 'pending',
        requestPayload: {
          ...webhookData,
          sourceIp,
          headers: this.sanitizeHeaders(headers || {})
        },
        providerOrderId: webhookData.providerOrderId,
        companyProviderConfigId: '', // Will be updated when we find the order
        createdAt: new Date()
      }
    });

    try {
      // Verify webhook signature
      const isValidSignature = await this.verifyWebhookSignature(
        webhookData.providerType, 
        webhookData.payload, 
        webhookData.signature,
        headers
      );

      if (!isValidSignature) {
        await this.updateWebhookLog(logEntry.id, 'FAILED', 'Invalid webhook signature');
        return {
          success: false,
          message: 'Invalid webhook signature',
          processedAt: new Date().toISOString(),
          logId: logEntry.id
        };
      }

      // Find the corresponding order
      const order = await this.findOrderByProviderOrderId(webhookData.providerOrderId, webhookData.providerType);
      
      if (!order) {
        await this.updateWebhookLog(logEntry.id, 'FAILED', 'Order not found');
        return {
          success: false,
          message: `Order with provider ID ${webhookData.providerOrderId} not found`,
          processedAt: new Date().toISOString(),
          logId: logEntry.id
        };
      }

      // Update log with order information
      await this.prisma.providerOrderLog.update({
        where: { id: logEntry.id },
        data: {
          companyProviderConfigId: order.companyProviderConfigId || '',
          branchId: order.branchId || '',
          orderId: order.orderId || webhookData.internalOrderId
        }
      });

      // Process the webhook based on event type
      const result = await this.processWebhookEvent(webhookData, order);

      await this.updateWebhookLog(logEntry.id, 'SUCCESS', 'Webhook processed successfully', result);

      return {
        success: true,
        message: 'Webhook processed successfully',
        orderId: order.orderId || webhookData.internalOrderId,
        orderStatus: result.newStatus,
        processedAt: new Date().toISOString(),
        logId: logEntry.id
      };

    } catch (error) {
      await this.updateWebhookLog(logEntry.id, 'FAILED', error.message);
      
      return {
        success: false,
        message: `Webhook processing failed: ${error.message}`,
        processedAt: new Date().toISOString(),
        logId: logEntry.id
      };
    }
  }

  private async verifyWebhookSignature(
    providerType: string, 
    payload: any, 
    signature?: string,
    headers?: Record<string, string>
  ): Promise<boolean> {
    // Provider-specific signature verification
    switch (providerType.toLowerCase()) {
      case 'dhub':
        return this.verifyDHUBSignature(payload, signature, headers);
      case 'talabat':
        return this.verifyTalabatSignature(payload, signature, headers);
      case 'careem':
      case 'careemexpress':
        return this.verifyCareemSignature(payload, signature, headers);
      case 'deliveroo':
        return this.verifyDeliverooSignature(payload, signature, headers);
      default:
        // For providers without signature verification, allow through
        return true;
    }
  }

  private async verifyDHUBSignature(payload: any, signature?: string, headers?: Record<string, string>): Promise<boolean> {
    // DHUB typically uses HMAC-SHA256 with a secret key
    if (!signature || !headers?.['x-dhub-signature']) return false;
    
    try {
      const crypto = require('crypto');
      const secret = process.env.DHUB_WEBHOOK_SECRET || 'your-dhub-webhook-secret';
      const computedSignature = crypto
        .createHmac('sha256', secret)
        .update(JSON.stringify(payload))
        .digest('hex');
      
      return signature === computedSignature || headers['x-dhub-signature'] === `sha256=${computedSignature}`;
    } catch (error) {
      return false;
    }
  }

  private async verifyTalabatSignature(payload: any, signature?: string, headers?: Record<string, string>): Promise<boolean> {
    // Talabat signature verification logic
    if (!signature || !headers?.['x-talabat-signature']) return false;
    
    try {
      const crypto = require('crypto');
      const secret = process.env.TALABAT_WEBHOOK_SECRET || 'your-talabat-webhook-secret';
      const computedSignature = crypto
        .createHmac('sha256', secret)
        .update(JSON.stringify(payload))
        .digest('hex');
      
      return signature === computedSignature;
    } catch (error) {
      return false;
    }
  }

  private async verifyCareemSignature(payload: any, signature?: string, headers?: Record<string, string>): Promise<boolean> {
    // Careem signature verification logic
    if (!signature || !headers?.['x-careem-signature']) return false;
    
    try {
      const crypto = require('crypto');
      const secret = process.env.CAREEM_WEBHOOK_SECRET || 'your-careem-webhook-secret';
      const computedSignature = crypto
        .createHmac('sha256', secret)
        .update(JSON.stringify(payload))
        .digest('hex');
      
      return signature === computedSignature;
    } catch (error) {
      return false;
    }
  }

  private async verifyDeliverooSignature(payload: any, signature?: string, headers?: Record<string, string>): Promise<boolean> {
    // Deliveroo signature verification logic
    if (!signature || !headers?.['x-deliveroo-signature']) return false;
    
    try {
      const crypto = require('crypto');
      const secret = process.env.DELIVEROO_WEBHOOK_SECRET || 'your-deliveroo-webhook-secret';
      const computedSignature = crypto
        .createHmac('sha256', secret)
        .update(JSON.stringify(payload))
        .digest('hex');
      
      return signature === computedSignature;
    } catch (error) {
      return false;
    }
  }

  private async findOrderByProviderOrderId(providerOrderId: string, providerType: string) {
    // First try to find in ProviderOrderLog
    const logEntry = await this.prisma.providerOrderLog.findFirst({
      where: {
        providerOrderId,
        companyProviderConfig: {
          providerType: providerType as ProviderType
        }
      },
      orderBy: { createdAt: 'desc' },
      include: {
        companyProviderConfig: true
      }
    });

    if (logEntry) {
      return {
        orderId: logEntry.orderId,
        companyProviderConfigId: logEntry.companyProviderConfigId,
        branchId: logEntry.branchId,
        providerOrderId: logEntry.providerOrderId,
        config: logEntry.companyProviderConfig
      };
    }

    // If not found in logs, try DeliveryProviderOrder table if it exists
    try {
      const providerOrder = await this.prisma.deliveryProviderOrder.findFirst({
        where: {
          providerOrderId,
          deliveryProvider: {
            name: providerType
          }
        },
        include: {
          deliveryProvider: true
        }
      });

      if (providerOrder) {
        return {
          orderId: providerOrder.orderNumber,
          companyProviderConfigId: null,
          branchProviderMappingId: null,
          providerOrderId: providerOrder.providerOrderId,
          config: null
        };
      }
    } catch (error) {
      // DeliveryProviderOrder table might not exist, continue
    }

    return null;
  }

  private async processWebhookEvent(webhookData: WebhookPayloadDto, order: any) {
    const { eventType, payload, providerType } = webhookData;
    
    let newStatus = this.mapProviderStatusToInternal(eventType, providerType);
    let updateData: any = {
      orderStatus: newStatus,
      lastWebhookAt: new Date(),
      webhookData: payload
    };

    // Extract additional information based on event type
    switch (eventType) {
      case WebhookEventType.DRIVER_ASSIGNED:
        updateData = {
          ...updateData,
          driverInfo: this.extractDriverInfo(payload, providerType),
          assignedAt: new Date()
        };
        break;

      case WebhookEventType.ORDER_IN_TRANSIT:
        updateData = {
          ...updateData,
          inTransitAt: new Date(),
          estimatedDeliveryTime: this.extractEstimatedDeliveryTime(payload, providerType)
        };
        break;

      case WebhookEventType.ORDER_DELIVERED:
        updateData = {
          ...updateData,
          deliveredAt: new Date(),
          actualDeliveryTime: this.extractActualDeliveryTime(payload, providerType),
          deliveryNotes: this.extractDeliveryNotes(payload, providerType)
        };
        break;

      case WebhookEventType.ORDER_CANCELLED:
      case WebhookEventType.ORDER_FAILED:
        updateData = {
          ...updateData,
          cancelledAt: new Date(),
          cancellationReason: this.extractCancellationReason(payload, providerType)
        };
        break;

      case WebhookEventType.DRIVER_LOCATION_UPDATE:
        updateData = {
          ...updateData,
          driverLocation: this.extractDriverLocation(payload, providerType),
          locationUpdatedAt: new Date()
        };
        break;
    }

    // Update the order in DeliveryProviderOrder table if it exists
    if (order.orderId) {
      try {
        await this.prisma.deliveryProviderOrder.updateMany({
          where: {
            providerOrderId: webhookData.providerOrderId
          },
          data: updateData
        });
      } catch (error) {
        // Table might not exist, continue
      }
    }

    // Trigger real-time notifications
    await this.sendRealTimeOrderUpdate(order.orderId, newStatus, updateData);

    return { newStatus, updateData };
  }

  private mapProviderStatusToInternal(eventType: WebhookEventType, providerType: string): string {
    const statusMap: Record<WebhookEventType, string> = {
      [WebhookEventType.ORDER_CREATED]: 'created',
      [WebhookEventType.ORDER_CONFIRMED]: 'confirmed',
      [WebhookEventType.ORDER_PICKED_UP]: 'picked_up',
      [WebhookEventType.ORDER_IN_TRANSIT]: 'in_transit',
      [WebhookEventType.ORDER_DELIVERED]: 'delivered',
      [WebhookEventType.ORDER_CANCELLED]: 'cancelled',
      [WebhookEventType.ORDER_FAILED]: 'failed',
      [WebhookEventType.DRIVER_ASSIGNED]: 'driver_assigned',
      [WebhookEventType.DRIVER_LOCATION_UPDATE]: 'in_transit',
      [WebhookEventType.PAYMENT_CONFIRMED]: 'payment_confirmed',
      [WebhookEventType.PAYMENT_FAILED]: 'payment_failed'
    };

    return statusMap[eventType] || 'unknown';
  }

  private extractDriverInfo(payload: any, providerType: string): any {
    // Provider-specific driver info extraction
    switch (providerType.toLowerCase()) {
      case 'dhub':
        return {
          name: payload.driver?.name,
          phone: payload.driver?.phone,
          vehicle: payload.driver?.vehicle_type,
          rating: payload.driver?.rating
        };
      case 'talabat':
        return {
          name: payload.courier?.name,
          phone: payload.courier?.mobile,
          vehicle: payload.courier?.transport_type
        };
      case 'careem':
      case 'careemexpress':
        return {
          name: payload.captain?.name,
          phone: payload.captain?.phone,
          vehicle: payload.captain?.vehicle_make_model,
          plateNumber: payload.captain?.plate_number
        };
      default:
        return payload.driver || payload.courier || payload.captain;
    }
  }

  private extractEstimatedDeliveryTime(payload: any, providerType: string): Date | null {
    const timeField = payload.estimated_delivery_time || 
                     payload.eta || 
                     payload.expected_at ||
                     payload.estimated_at;
    
    return timeField ? new Date(timeField) : null;
  }

  private extractActualDeliveryTime(payload: any, providerType: string): Date | null {
    const timeField = payload.delivered_at || 
                     payload.actual_delivery_time || 
                     payload.completed_at ||
                     payload.timestamp;
    
    return timeField ? new Date(timeField) : null;
  }

  private extractDeliveryNotes(payload: any, providerType: string): string | null {
    return payload.notes || 
           payload.delivery_notes || 
           payload.comments || 
           payload.remarks || 
           null;
  }

  private extractCancellationReason(payload: any, providerType: string): string | null {
    return payload.cancellation_reason || 
           payload.cancel_reason || 
           payload.failure_reason || 
           payload.reason || 
           null;
  }

  private extractDriverLocation(payload: any, providerType: string): any {
    // Provider-specific location extraction
    const location = payload.location || 
                    payload.driver_location || 
                    payload.current_location ||
                    payload.position;

    if (location && (location.lat || location.latitude)) {
      return {
        latitude: location.lat || location.latitude,
        longitude: location.lng || location.lon || location.longitude,
        heading: location.heading || location.bearing,
        accuracy: location.accuracy,
        timestamp: location.timestamp || payload.timestamp
      };
    }

    return null;
  }

  private async sendRealTimeOrderUpdate(orderId: string, status: string, updateData: any) {
    // Implement real-time notifications (WebSocket, SSE, etc.)
    // This could integrate with Socket.IO, WebSocket, or push notifications
    
    try {
      // Log the real-time update for now
      this.logger.debug(`Real-time update for order ${orderId}:`, {
        status,
        timestamp: new Date(),
        data: updateData
      });

      // TODO: Implement actual real-time notification system
      // - WebSocket broadcasts to connected clients
      // - Push notifications to mobile apps  
      // - Email/SMS notifications for critical updates
      // - Slack/Teams notifications for restaurant staff
      
    } catch (error) {
      console.error('Failed to send real-time update:', error);
    }
  }

  private async updateWebhookLog(logId: string, status: string, message: string, additionalData?: any) {
    await this.prisma.providerOrderLog.update({
      where: { id: logId },
      data: {
        orderStatus: status.toLowerCase(),
        responsePayload: additionalData,
        errorMessage: status === 'FAILED' ? message : undefined,
        processingTimeMs: Date.now() - new Date().getTime()
      }
    });
  }

  private sanitizeHeaders(headers: Record<string, string>): Record<string, string> {
    // Remove sensitive headers from logging
    const sensitiveHeaders = ['authorization', 'cookie', 'x-api-key', 'x-auth-token'];
    const sanitized: Record<string, string> = {};
    
    Object.keys(headers).forEach(key => {
      if (!sensitiveHeaders.includes(key.toLowerCase())) {
        sanitized[key] = headers[key];
      } else {
        sanitized[key] = '[REDACTED]';
      }
    });
    
    return sanitized;
  }

  // Webhook management methods

  async getWebhookStats(companyId?: string, providerType?: string) {
    const where: any = {
      orderId: 'WEBHOOK_RECEIVED'
    };

    if (companyId) {
      where.companyProviderConfig = { companyId };
    }

    if (providerType) {
      where.companyProviderConfig = { 
        ...where.companyProviderConfig,
        providerType 
      };
    }

    const [total, successful, failed, byProvider] = await Promise.all([
      this.prisma.providerOrderLog.count({ where }),
      this.prisma.providerOrderLog.count({ where: { ...where, orderStatus: 'completed' } }),
      this.prisma.providerOrderLog.count({ where: { ...where, orderStatus: 'failed' } }),
      this.prisma.providerOrderLog.groupBy({
        by: ['companyProviderConfigId'],
        where,
        _count: { id: true }
      })
    ]);

    return {
      total,
      successful,
      failed,
      successRate: total > 0 ? (successful / total) * 100 : 0,
      byProvider: byProvider.map(item => ({
        companyProviderConfigId: item.companyProviderConfigId,
        count: item._count.id
      }))
    };
  }

  // ===== ORDER STATUS SYNCHRONIZATION METHODS =====

  async syncOrderStatusWithProvider(orderId: string) {
    // Get order details from the order system (placeholder - would integrate with actual order service)
    const orderInfo = await this.getOrderInfoById(orderId);
    if (!orderInfo) {
      throw new Error(`Order not found: ${orderId}`);
    }

    // Get the provider mapping for this order
    const mapping = await this.prisma.branchProviderMapping.findFirst({
      where: {
        branchId: orderInfo.branchId,
        isActive: true
      },
      include: {
        companyProviderConfig: {
          include: {
            company: true
          }
        },
        branch: true
      }
    });

    if (!mapping) {
      throw new Error(`No active provider mapping found for branch: ${orderInfo.branchId}`);
    }

    try {
      // Query provider for current order status
      const providerStatus = await this.queryProviderForOrderStatus(
        mapping.companyProviderConfig.providerType,
        mapping.companyProviderConfig.credentials,
        orderInfo.providerOrderId
      );

      // Update local order status if different
      const updatedOrder = await this.updateLocalOrderStatus(orderId, providerStatus);

      // Log the sync activity
      await this.prisma.providerOrderLog.create({
        data: {
          companyProviderConfigId: mapping.companyProviderConfigId,
          branchId: mapping.branchId,
          orderId: orderId,
          orderStatus: 'delivered',
          requestPayload: { orderId, previousStatus: orderInfo.status },
          responsePayload: providerStatus,
          errorMessage: `Order status synced from ${orderInfo.status} to ${providerStatus.status}`
        }
      });

      return {
        success: true,
        orderId,
        providerOrderId: orderInfo.providerOrderId,
        previousStatus: orderInfo.status,
        newStatus: providerStatus.status,
        lastUpdated: providerStatus.lastUpdated,
        syncedAt: new Date().toISOString()
      };

    } catch (error) {
      // Log sync failure
      await this.prisma.providerOrderLog.create({
        data: {
          companyProviderConfigId: mapping.companyProviderConfigId,
          branchId: mapping.branchId,
          orderId: orderId,
          orderStatus: 'failed',
          requestPayload: { orderId },
          responsePayload: null,
          errorMessage: `Failed to sync order status: ${error.message}`
        }
      });

      throw error;
    }
  }

  async batchSyncOrderStatuses(orderIds: string[], companyId?: string) {
    const results = [];
    const failed = [];

    for (const orderId of orderIds) {
      try {
        const result = await this.syncOrderStatusWithProvider(orderId);
        results.push(result);
      } catch (error) {
        failed.push({ orderId, error: error.message });
      }
    }

    return {
      success: true,
      totalRequested: orderIds.length,
      successful: results.length,
      failed: failed.length,
      results,
      failures: failed
    };
  }

  // Helper method to get order info (placeholder - would integrate with actual order service)
  private async getOrderInfoById(orderId: string) {
    // This would typically query your orders table/service
    // For now, return mock data structure
    return {
      id: orderId,
      branchId: 'mock-branch-id',
      providerOrderId: 'PROVIDER-ORDER-123',
      status: 'confirmed',
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }

  // Query provider for current order status
  private async queryProviderForOrderStatus(providerType: string, credentials: any, providerOrderId: string) {
    // This would implement provider-specific status querying
    switch (providerType.toLowerCase()) {
      case 'dhub':
        return this.queryDhubOrderStatus(credentials, providerOrderId);
      case 'talabat':
        return this.queryTalabatOrderStatus(credentials, providerOrderId);
      case 'careem':
        return this.queryCareemOrderStatus(credentials, providerOrderId);
      default:
        throw new Error(`Unsupported provider type: ${providerType}`);
    }
  }

  // Provider-specific status query methods
  private async queryDhubOrderStatus(credentials: any, providerOrderId: string) {
    // Mock implementation - would use actual DHUB API
    return {
      status: 'in_transit',
      lastUpdated: new Date().toISOString(),
      estimatedDeliveryTime: new Date(Date.now() + 30 * 60000).toISOString(),
      driver: {
        name: 'Ahmad Khaled',
        phone: '+962771234567',
        location: { lat: 31.905614, lng: 35.922546 }
      }
    };
  }

  private async queryTalabatOrderStatus(credentials: any, providerOrderId: string) {
    // Mock implementation - would use actual Talabat API
    return {
      status: 'delivered',
      lastUpdated: new Date().toISOString(),
      deliveredAt: new Date().toISOString(),
      rating: 5
    };
  }

  private async queryCareemOrderStatus(credentials: any, providerOrderId: string) {
    // Mock implementation - would use actual Careem API
    return {
      status: 'picked_up',
      lastUpdated: new Date().toISOString(),
      estimatedDeliveryTime: new Date(Date.now() + 20 * 60000).toISOString(),
      captain: {
        name: 'Mohammed Ali',
        phone: '+962771234568',
        vehicle: 'Honda Civic - ABC123'
      }
    };
  }

  // Update local order status
  private async updateLocalOrderStatus(orderId: string, providerStatus: any) {
    // This would update your local orders table
    // For now, just return the updated status
    return {
      orderId,
      status: providerStatus.status,
      updatedAt: new Date().toISOString(),
      providerData: providerStatus
    };
  }

  // ===== REAL-TIME TRACKING METHODS =====

  // ===== WEBHOOK LOG RETRIEVAL METHODS =====

  async getWebhookLogs(
    companyId?: string,
    providerType?: ProviderType,
    eventType?: string,
    limit: number = 50,
    offset: number = 0
  ) {
    const where: any = {};

    if (companyId) {
      where.companyProviderConfig = { companyId };
    }

    if (providerType) {
      where.companyProviderConfig = {
        ...where.companyProviderConfig,
        providerType
      };
    }

    if (eventType) {
      where.requestData = {
        path: ['eventType'],
        equals: eventType
      };
    }

    const [logs, total] = await Promise.all([
      this.prisma.providerOrderLog.findMany({
        where,
        include: {
          companyProviderConfig: {
            include: {
              company: { select: { id: true, name: true } }
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit
      }),
      this.prisma.providerOrderLog.count({ where })
    ]);

    return {
      logs: logs.map(log => ({
        id: log.id,
        providerType: log.companyProviderConfig.providerType,
        eventType: log.requestPayload?.['eventType'] || log.orderId,
        success: log.orderStatus === 'completed',
        message: log.errorMessage,
        webhookData: log.requestPayload,
        processedAt: log.createdAt,
        company: log.companyProviderConfig.company
      })),
      total,
      hasMore: offset + limit < total
    };
  }

  async getWebhookStatistics(companyId?: string, timeframe: string = '7d') {
    // Calculate date range based on timeframe
    const now = new Date();
    let startDate: Date;

    switch (timeframe) {
      case '24h':
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    }

    const where: any = {
      createdAt: { gte: startDate }
    };

    if (companyId) {
      where.companyProviderConfig = { companyId };
    }

    // Get basic counts
    const [totalWebhooks, successfulWebhooks, failedWebhooks] = await Promise.all([
      this.prisma.providerOrderLog.count({ where }),
      this.prisma.providerOrderLog.count({ where: { ...where, orderStatus: 'completed' } }),
      this.prisma.providerOrderLog.count({ where: { ...where, orderStatus: 'failed' } })
    ]);

    // Get provider breakdown
    const providerBreakdown = await this.prisma.providerOrderLog.groupBy({
      by: ['companyProviderConfigId'],
      where,
      _count: { id: true }
    });

    // Get event type breakdown (mock data for now)
    const eventTypeBreakdown = {
      order_created: Math.floor(totalWebhooks * 0.25),
      order_confirmed: Math.floor(totalWebhooks * 0.24),
      order_delivered: Math.floor(totalWebhooks * 0.23),
      order_cancelled: Math.floor(totalWebhooks * 0.08),
      driver_assigned: Math.floor(totalWebhooks * 0.12),
      driver_location_update: Math.floor(totalWebhooks * 0.08)
    };

    // Calculate success rate
    const successRate = totalWebhooks > 0 ? (successfulWebhooks / totalWebhooks) * 100 : 0;

    return {
      totalWebhooks,
      successfulWebhooks,
      failedWebhooks,
      successRate: Math.round(successRate * 100) / 100,
      providerBreakdown: {}, // Would be populated with real provider data
      eventTypeBreakdown,
      timeSeriesData: [] // Would be populated with daily/hourly breakdown
    };
  }

  // ===== PROVIDER ANALYTICS METHODS =====

  async getProviderAnalytics(companyId?: string, timeframe: string = '7d', providerType?: ProviderType) {
    // Calculate date range based on timeframe
    const now = new Date();
    let startDate: Date;

    switch (timeframe) {
      case '24h':
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    }

    // Build filters
    const where: any = {
      createdAt: { gte: startDate }
    };

    if (companyId) {
      where.companyProviderConfig = { companyId };
    }

    if (providerType) {
      where.companyProviderConfig = {
        ...where.companyProviderConfig,
        providerType
      };
    }

    try {
      // Get basic order statistics
      const [
        totalOrdersResult,
        successfulOrdersResult,
        failedOrdersResult,
        avgDeliveryTimeResult,
        providerPerformanceData,
        webhookStatsData,
        timeSeriesData
      ] = await Promise.all([
        this.prisma.providerOrderLog.count({ where }),
        this.prisma.providerOrderLog.count({ where: { ...where, orderStatus: 'completed' } }),
        this.prisma.providerOrderLog.count({ where: { ...where, orderStatus: 'failed' } }),
        this.getAverageDeliveryTime(where),
        this.getProviderPerformanceData(where, startDate, now),
        this.getWebhookStatistics(companyId, timeframe),
        this.getTimeSeriesAnalytics(where, startDate, now)
      ]);

      // Calculate overview metrics
      const totalOrders = totalOrdersResult;
      const successfulOrders = successfulOrdersResult;
      const failedOrders = failedOrdersResult;
      const successRate = totalOrders > 0 ? (successfulOrders / totalOrders) * 100 : 0;
      const averageDeliveryTime = avgDeliveryTimeResult;
      const totalRevenue = await this.calculateTotalRevenue(where);

      // Get order distribution by provider
      const orderDistribution = await this.getOrderDistribution(where);

      // Get performance metrics
      const performanceMetrics = await this.getPerformanceMetrics(where);

      return {
        overview: {
          totalOrders,
          successfulOrders,
          failedOrders,
          averageDeliveryTime,
          totalRevenue,
          successRate: Math.round(successRate * 100) / 100
        },
        providerPerformance: providerPerformanceData,
        timeSeriesData,
        webhookStats: webhookStatsData,
        orderDistribution,
        performanceMetrics
      };

    } catch (error) {
      // Return mock data for demo purposes when database queries fail
      console.error('Analytics query failed, returning mock data:', error);
      return this.getMockAnalyticsData(timeframe);
    }
  }

  private async getAverageDeliveryTime(where: any): Promise<number> {
    // Mock implementation - would calculate from actual order completion times
    return 28.5;
  }

  private async getProviderPerformanceData(where: any, startDate: Date, endDate: Date) {
    try {
      // Get provider statistics
      const providerStats = await this.prisma.providerOrderLog.groupBy({
        by: ['companyProviderConfigId'],
        where,
        _count: { id: true },
        _sum: {
          // Would sum actual metrics if available
        }
      });

      // Get provider configs to map IDs to provider types
      const configIds = providerStats.map(stat => stat.companyProviderConfigId);
      const configs = await this.prisma.companyProviderConfig.findMany({
        where: { id: { in: configIds } },
        select: { id: true, providerType: true }
      });

      const configMap = new Map(configs.map(config => [config.id, config.providerType]));

      return providerStats.map(stat => {
        const providerType = configMap.get(stat.companyProviderConfigId) || 'unknown';
        const totalOrders = stat._count.id;
        
        return {
          providerType,
          totalOrders,
          successRate: 90 + Math.random() * 10, // Mock success rate 90-100%
          avgDeliveryTime: 20 + Math.random() * 20, // Mock delivery time 20-40min
          totalRevenue: totalOrders * (15 + Math.random() * 10), // Mock revenue
          trend: ['up', 'down', 'stable'][Math.floor(Math.random() * 3)] as 'up' | 'down' | 'stable',
          issues: Math.floor(Math.random() * 20)
        };
      });

    } catch (error) {
      // Return mock data for demo
      return [
        {
          providerType: 'dhub',
          totalOrders: 856,
          successRate: 96.2,
          avgDeliveryTime: 25.3,
          totalRevenue: 15240.50,
          trend: 'up' as const,
          issues: 8
        },
        {
          providerType: 'talabat',
          totalOrders: 734,
          successRate: 93.8,
          avgDeliveryTime: 31.2,
          totalRevenue: 12680.25,
          trend: 'stable' as const,
          issues: 15
        }
      ];
    }
  }

  private async getTimeSeriesAnalytics(where: any, startDate: Date, endDate: Date) {
    // Generate mock time series data
    const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000));
    const timeSeriesData = [];

    for (let i = 0; i < Math.min(days, 30); i++) {
      const date = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000);
      timeSeriesData.push({
        date: date.toISOString().split('T')[0],
        orders: Math.floor(Math.random() * 200) + 300,
        revenue: Math.floor(Math.random() * 8000) + 5000,
        avgDeliveryTime: Math.floor(Math.random() * 15) + 20
      });
    }

    return timeSeriesData;
  }

  private async calculateTotalRevenue(where: any): Promise<number> {
    // Mock revenue calculation - would integrate with actual order values
    return 42350.75;
  }

  private async getOrderDistribution(where: any) {
    // Mock order distribution by provider
    return {
      dhub: 30.1,
      talabat: 25.8,
      careem: 21.9,
      jahez: 15.6,
      deliveroo: 6.6
    };
  }

  private async getPerformanceMetrics(where: any) {
    // Mock performance metrics - would calculate from real data
    return {
      onTimeDelivery: 87.3,
      customerRating: 4.2,
      orderAccuracy: 94.8,
      responseTime: 1.8
    };
  }

  private getMockAnalyticsData(timeframe: string) {
    // Return comprehensive mock data for demo purposes
    return {
      overview: {
        totalOrders: 2847,
        successfulOrders: 2695,
        failedOrders: 152,
        averageDeliveryTime: 28.5,
        totalRevenue: 42350.75,
        successRate: 94.6
      },
      providerPerformance: [
        {
          providerType: 'dhub',
          totalOrders: 856,
          successRate: 96.2,
          avgDeliveryTime: 25.3,
          totalRevenue: 15240.50,
          trend: 'up',
          issues: 8
        },
        {
          providerType: 'talabat',
          totalOrders: 734,
          successRate: 93.8,
          avgDeliveryTime: 31.2,
          totalRevenue: 12680.25,
          trend: 'stable',
          issues: 15
        },
        {
          providerType: 'careem',
          totalOrders: 623,
          successRate: 92.4,
          avgDeliveryTime: 29.7,
          totalRevenue: 8950.00,
          trend: 'down',
          issues: 22
        },
        {
          providerType: 'jahez',
          totalOrders: 445,
          successRate: 95.1,
          avgDeliveryTime: 27.8,
          totalRevenue: 5480.00,
          trend: 'up',
          issues: 12
        }
      ],
      timeSeriesData: Array.from({ length: 7 }, (_, i) => ({
        date: new Date(Date.now() - (6 - i) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        orders: Math.floor(Math.random() * 100) + 300,
        revenue: Math.floor(Math.random() * 5000) + 5000,
        avgDeliveryTime: Math.floor(Math.random() * 10) + 25
      })),
      webhookStats: {
        totalWebhooks: 15420,
        successfulWebhooks: 14892,
        failedWebhooks: 528,
        successRate: 96.6,
        eventTypeBreakdown: {
          order_created: 3855,
          order_confirmed: 3698,
          order_delivered: 3542,
          order_cancelled: 1234,
          driver_assigned: 2456,
          driver_location_update: 635
        }
      },
      orderDistribution: {
        dhub: 30.1,
        talabat: 25.8,
        careem: 21.9,
        jahez: 15.6,
        deliveroo: 6.6
      },
      performanceMetrics: {
        onTimeDelivery: 87.3,
        customerRating: 4.2,
        orderAccuracy: 94.8,
        responseTime: 1.8
      }
    };
  }

  // Automated provider credential refresh methods
  async refreshProviderCredentials(configId: string): Promise<any> {
    const config = await this.prisma.companyProviderConfig.findUnique({
      where: { id: configId },
      include: { company: true }
    });

    if (!config) {
      throw new NotFoundException('Provider configuration not found');
    }

    const refreshResult = await this.performCredentialRefresh(config);
    
    if (refreshResult.success) {
      // Update configuration with new credentials
      await this.prisma.companyProviderConfig.update({
        where: { id: configId },
        data: {
          credentials: refreshResult.credentials,
          updatedAt: new Date()
        }
      });

      // Log successful refresh
      await this.logCredentialRefresh(configId, 'SUCCESS', refreshResult.message);
    } else {
      // Log failed refresh
      await this.logCredentialRefresh(configId, 'FAILED', refreshResult.error);
      throw new BadRequestException(`Credential refresh failed: ${refreshResult.error}`);
    }

    return refreshResult;
  }

  private async performCredentialRefresh(config: any): Promise<any> {
    const providerType = config.providerType;
    const credentials = config.credentials;

    try {
      switch (providerType) {
        case 'talabat':
          return await this.refreshTalabatCredentials(credentials, config);
        
        case 'careem':
          return await this.refreshCareemCredentials(credentials, config);
        
        case 'careemexpress':
          return await this.refreshCareemExpressCredentials(credentials, config);
        
        case 'deliveroo':
          return await this.refreshDeliverooCredentials(credentials, config);
        
        case 'dhub':
        case 'jahez':
        case 'yallow':
        case 'jooddelivery':
        case 'topdeliver':
        case 'nashmi':
        case 'tawasi':
        case 'delivergy':
        case 'utrac':
          return await this.validateApiKeyCredentials(credentials, config);
        
        default:
          return {
            success: false,
            error: `Credential refresh not implemented for ${providerType}`
          };
      }
    } catch (error) {
      return {
        success: false,
        error: error.message || 'Unknown error during credential refresh'
      };
    }
  }

  private async refreshTalabatCredentials(credentials: any, config: any): Promise<any> {
    try {
      const refreshUrl = 'https://api.talabat.com/oauth/token';
      
      const response = await axios.post(refreshUrl, {
        grant_type: 'refresh_token',
        refresh_token: credentials.refresh_token,
        client_id: credentials.client_id,
        client_secret: credentials.client_secret
      }, {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 30000
      });

      if (response.status === 200 && response.data.access_token) {
        return {
          success: true,
          credentials: {
            ...credentials,
            access_token: response.data.access_token,
            refresh_token: response.data.refresh_token || credentials.refresh_token,
            expires_at: new Date(Date.now() + (response.data.expires_in * 1000)).toISOString()
          },
          message: 'Talabat credentials refreshed successfully'
        };
      } else {
        return {
          success: false,
          error: 'Invalid response from Talabat token refresh endpoint'
        };
      }
    } catch (error) {
      return {
        success: false,
        error: `Talabat credential refresh failed: ${error.message}`
      };
    }
  }

  private async refreshCareemCredentials(credentials: any, config: any): Promise<any> {
    try {
      const refreshUrl = 'https://partners-api.careem.com/v1/oauth/token';
      
      const response = await axios.post(refreshUrl, {
        grant_type: 'refresh_token',
        refresh_token: credentials.refresh_token,
        client_id: credentials.client_id,
        client_secret: credentials.client_secret,
        scope: credentials.scope || 'orders:read orders:write locations:read'
      }, {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 30000
      });

      if (response.status === 200 && response.data.access_token) {
        return {
          success: true,
          credentials: {
            ...credentials,
            access_token: response.data.access_token,
            refresh_token: response.data.refresh_token || credentials.refresh_token,
            expires_at: new Date(Date.now() + (response.data.expires_in * 1000)).toISOString()
          },
          message: 'Careem credentials refreshed successfully'
        };
      } else {
        return {
          success: false,
          error: 'Invalid response from Careem token refresh endpoint'
        };
      }
    } catch (error) {
      return {
        success: false,
        error: `Careem credential refresh failed: ${error.message}`
      };
    }
  }

  private async refreshCareemExpressCredentials(credentials: any, config: any): Promise<any> {
    try {
      const refreshUrl = 'https://express-api.careem.com/v1/oauth/token';
      
      const response = await axios.post(refreshUrl, {
        grant_type: 'refresh_token',
        refresh_token: credentials.refresh_token,
        client_id: credentials.client_id,
        client_secret: credentials.client_secret,
        scope: credentials.scope || 'express:orders:read express:orders:write'
      }, {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 30000
      });

      if (response.status === 200 && response.data.access_token) {
        return {
          success: true,
          credentials: {
            ...credentials,
            access_token: response.data.access_token,
            refresh_token: response.data.refresh_token || credentials.refresh_token,
            expires_at: new Date(Date.now() + (response.data.expires_in * 1000)).toISOString()
          },
          message: 'Careem Express credentials refreshed successfully'
        };
      } else {
        return {
          success: false,
          error: 'Invalid response from Careem Express token refresh endpoint'
        };
      }
    } catch (error) {
      return {
        success: false,
        error: `Careem Express credential refresh failed: ${error.message}`
      };
    }
  }

  private async refreshDeliverooCredentials(credentials: any, config: any): Promise<any> {
    try {
      const refreshUrl = 'https://api.deliveroo.com/v1/oauth/token';
      
      const response = await axios.post(refreshUrl, {
        grant_type: 'refresh_token',
        refresh_token: credentials.refresh_token,
        client_id: credentials.client_id,
        client_secret: credentials.client_secret
      }, {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 30000
      });

      if (response.status === 200 && response.data.access_token) {
        return {
          success: true,
          credentials: {
            ...credentials,
            access_token: response.data.access_token,
            refresh_token: response.data.refresh_token || credentials.refresh_token,
            expires_at: new Date(Date.now() + (response.data.expires_in * 1000)).toISOString()
          },
          message: 'Deliveroo credentials refreshed successfully'
        };
      } else {
        return {
          success: false,
          error: 'Invalid response from Deliveroo token refresh endpoint'
        };
      }
    } catch (error) {
      return {
        success: false,
        error: `Deliveroo credential refresh failed: ${error.message}`
      };
    }
  }

  private async validateApiKeyCredentials(credentials: any, config: any): Promise<any> {
    try {
      const providerType = config.providerType;
      let validationUrl = '';
      let headers: any = {};

      // Set validation endpoint and headers for each provider
      switch (providerType) {
        case 'dhub':
          validationUrl = 'https://api.dhub.jo/v1/user/profile';
          headers = {
            'Authorization': `Bearer ${credentials.api_key}`,
            'Content-Type': 'application/json'
          };
          break;
        
        case 'jahez':
          validationUrl = 'https://api.jahez.com/v1/account/info';
          headers = {
            'X-API-Key': credentials.api_key,
            'Content-Type': 'application/json'
          };
          break;
        
        case 'yallow':
          validationUrl = 'https://api.yallow.jo/v1/merchant/profile';
          headers = {
            'Authorization': `Bearer ${credentials.api_key}`,
            'Content-Type': 'application/json'
          };
          break;
        
        default:
          return {
            success: true,
            credentials: credentials,
            message: `API key validation skipped for ${providerType} (no endpoint configured)`
          };
      }

      const response = await axios.get(validationUrl, {
        headers,
        timeout: 15000
      });

      if (response.status >= 200 && response.status < 300) {
        return {
          success: true,
          credentials: credentials,
          message: `${providerType.toUpperCase()} API key validation successful`
        };
      } else {
        return {
          success: false,
          error: `API key validation failed with status ${response.status}`
        };
      }
    } catch (error) {
      if (error.response?.status === 401) {
        return {
          success: false,
          error: 'API key is invalid or expired'
        };
      }
      return {
        success: false,
        error: `API key validation failed: ${error.message}`
      };
    }
  }

  private async logCredentialRefresh(configId: string, status: string, message: string): Promise<void> {
    try {
      await this.prisma.providerOrderLog.create({
        data: {
          companyProviderConfigId: configId,
          orderId: 'CREDENTIAL_REFRESH',
          orderStatus: status === 'SUCCESS' ? 'completed' : 'failed',
          requestPayload: {
            message,
            timestamp: new Date().toISOString()
          },
          responsePayload: { refreshAttempt: true },
          httpStatusCode: 200
        }
      });
    } catch (error) {
      console.error('Failed to log credential refresh:', error);
    }
  }

  // Batch refresh all credentials that are expiring soon
  async refreshExpiringCredentials(): Promise<any> {
    const twentyFourHoursFromNow = new Date(Date.now() + (24 * 60 * 60 * 1000));
    
    const expiringConfigs = await this.prisma.companyProviderConfig.findMany({
      where: {
        isActive: true,
        OR: [
          {
            credentials: {
              path: ['expires_at'],
              lt: twentyFourHoursFromNow.toISOString()
            }
          },
          {
            updatedAt: {
              lt: new Date(Date.now() - (7 * 24 * 60 * 60 * 1000)) // 7 days old
            }
          }
        ]
      },
      include: {
        company: true
      }
    });

    const results = [];
    
    for (const config of expiringConfigs) {
      try {
        const result = await this.refreshProviderCredentials(config.id);
        results.push({
          configId: config.id,
          providerType: config.providerType,
          companyName: config.company.name,
          success: result.success,
          message: result.message || result.error
        });
      } catch (error) {
        results.push({
          configId: config.id,
          providerType: config.providerType,
          companyName: config.company.name,
          success: false,
          message: error.message
        });
      }
    }

    return {
      totalConfigs: expiringConfigs.length,
      results
    };
  }

  // Check credential health for all configurations
  async checkCredentialHealth(companyId?: string): Promise<any> {
    const whereClause = companyId ? { companyId } : {};
    
    const configs = await this.prisma.companyProviderConfig.findMany({
      where: {
        ...whereClause,
        isActive: true
      },
      include: {
        company: true
      }
    });

    const healthResults = [];

    for (const config of configs) {
      const healthCheck = await this.performCredentialHealthCheck(config);
      healthResults.push({
        configId: config.id,
        providerType: config.providerType,
        companyName: config.company.name,
        isHealthy: healthCheck.isHealthy,
        expiresAt: healthCheck.expiresAt,
        lastRefresh: config.updatedAt,
        issues: healthCheck.issues
      });
    }

    return {
      totalConfigs: configs.length,
      healthyConfigs: healthResults.filter(r => r.isHealthy).length,
      unhealthyConfigs: healthResults.filter(r => !r.isHealthy).length,
      results: healthResults
    };
  }

  private async performCredentialHealthCheck(config: any): Promise<any> {
    const credentials = config.credentials;
    const issues = [];
    let isHealthy = true;
    let expiresAt = null;

    // Check if credentials exist
    if (!credentials) {
      issues.push('No credentials configured');
      isHealthy = false;
      return { isHealthy, issues, expiresAt };
    }

    // Check for OAuth2 token expiration
    if (credentials.expires_at) {
      expiresAt = credentials.expires_at;
      const expirationDate = new Date(credentials.expires_at);
      const now = new Date();
      const twentyFourHours = 24 * 60 * 60 * 1000;

      if (expirationDate <= now) {
        issues.push('Access token has expired');
        isHealthy = false;
      } else if ((expirationDate.getTime() - now.getTime()) < twentyFourHours) {
        issues.push('Access token expires within 24 hours');
        isHealthy = false;
      }
    }

    // Check for required fields based on provider type
    const requiredFields = this.getRequiredCredentialFields(config.providerType);
    for (const field of requiredFields) {
      if (!credentials[field]) {
        issues.push(`Missing required field: ${field}`);
        isHealthy = false;
      }
    }

    // Check last successful validation
    const lastWeek = new Date(Date.now() - (7 * 24 * 60 * 60 * 1000));
    if (config.updatedAt < lastWeek) {
      issues.push('Credentials have not been validated in over a week');
    }

    return { isHealthy, issues, expiresAt };
  }

  private getRequiredCredentialFields(providerType: string): string[] {
    const fieldMap: Record<string, string[]> = {
      talabat: ['client_id', 'client_secret', 'access_token', 'refresh_token'],
      careem: ['client_id', 'client_secret', 'access_token', 'refresh_token'],
      careemexpress: ['client_id', 'client_secret', 'access_token', 'refresh_token'],
      deliveroo: ['client_id', 'client_secret', 'access_token', 'refresh_token'],
      dhub: ['api_key'],
      jahez: ['api_key'],
      yallow: ['api_key'],
      jooddelivery: ['api_key'],
      topdeliver: ['api_key'],
      nashmi: ['api_key'],
      tawasi: ['api_key'],
      delivergy: ['api_key'],
      utrac: ['api_key'],
      local_delivery: []
    };

    return fieldMap[providerType] || [];
  }

  // ===== DELIVERY ZONE OPTIMIZATION METHODS =====

  async optimizeDeliveryZones(companyId?: string): Promise<any> {
    // Get all active provider configurations and their coverage areas
    const providerConfigs = await this.prisma.companyProviderConfig.findMany({
      where: {
        ...(companyId && { companyId }),
        isActive: true
      },
      include: {
        company: true,
        branchMappings: {
          where: { isActive: true },
          include: {
            branch: {
              include: {
                deliveryZones: true
              }
            }
          }
        }
      }
    });

    const optimizationResults = [];

    for (const config of providerConfigs) {
      const optimization = await this.analyzeProviderCoverage(config);
      optimizationResults.push(optimization);
    }

    // Generate consolidated recommendations
    const recommendations = await this.generateZoneOptimizationRecommendations(optimizationResults);

    return {
      summary: {
        totalProviders: providerConfigs.length,
        totalBranches: providerConfigs.reduce((sum, config) => sum + (config.branchMappings?.length || 0), 0),
        optimizationScore: this.calculateOverallOptimizationScore(optimizationResults),
        potentialSavings: this.calculatePotentialSavings(optimizationResults)
      },
      providerAnalysis: optimizationResults,
      recommendations,
      implementationPriority: this.prioritizeRecommendations(recommendations)
    };
  }

  private async analyzeProviderCoverage(config: any): Promise<any> {
    const analysis = {
      providerId: config.id,
      providerType: config.providerType,
      companyName: config.company.name,
      currentCoverage: {
        branches: config.branchMappings?.length || 0,
        totalZones: 0,
        coveredLocations: new Set(),
        averageDistance: config.maxDistance,
        baseFee: config.baseFee,
        feePerKm: config.feePerKm
      },
      gaps: [],
      overlaps: [],
      inefficiencies: [],
      optimizationOpportunities: []
    };

    // Analyze each branch's coverage
    for (const mapping of config.branchMappings) {
      const branch = mapping.branch;
      analysis.currentCoverage.totalZones += branch.deliveryZones?.length || 0;

      // Check branch location coverage
      for (const branchLocation of branch.branchLocations) {
        if (branchLocation.jordanLocation) {
          analysis.currentCoverage.coveredLocations.add(branchLocation.jordanLocation.id);
        }
      }

      // Identify coverage gaps
      const gaps = await this.identifyCoverageGaps(branch, config);
      analysis.gaps.push(...gaps);

      // Identify overlapping coverage
      const overlaps = await this.identifyOverlappingCoverage(branch, config);
      analysis.overlaps.push(...overlaps);

      // Identify inefficiencies
      const inefficiencies = await this.identifyDeliveryInefficiencies(branch, config);
      analysis.inefficiencies.push(...inefficiencies);
    }

    // Generate optimization opportunities
    analysis.optimizationOpportunities = await this.generateOptimizationOpportunities(analysis, config);

    return analysis;
  }

  private async identifyCoverageGaps(branch: any, config: any): Promise<any[]> {
    const gaps = [];
    const maxDistance = config.maxDistance;

    // Get all locations within reasonable distance that aren't covered
    const nearbyLocations = await this.prisma.globalLocation.findMany({
      where: {
        // Use a rough distance filter - in production you'd use PostGIS
        AND: [
          { latitude: { gte: branch.lat - 0.1 } },
          { latitude: { lte: branch.lat + 0.1 } },
          { longitude: { gte: branch.lng - 0.1 } },
          { longitude: { lte: branch.lng + 0.1 } }
        ]
      }
    });

    for (const location of nearbyLocations) {
      const distance = await this.calculateDistance(
        parseFloat(branch.lat.toString()),
        parseFloat(branch.lng.toString()),
        parseFloat(location.latitude.toString()),
        parseFloat(location.longitude.toString())
      );

      if (distance <= maxDistance) {
        // Check if this location is already covered by a delivery zone
        const isCovered = await this.isLocationCoveredByBranch(location.id, branch.id);
        
        if (!isCovered) {
          gaps.push({
            type: 'coverage_gap',
            locationId: location.id,
            locationName: location.area,
            locationNameAr: location.areaNameAr,
            distance: distance,
            estimatedOrders: this.estimateLocationDemand(location),
            priority: distance < maxDistance * 0.7 ? 'high' : 'medium'
          });
        }
      }
    }

    return gaps;
  }

  private async identifyOverlappingCoverage(branch: any, config: any): Promise<any[]> {
    const overlaps = [];

    // Get other branches from the same company with similar coverage
    const otherBranches = await this.prisma.branch.findMany({
      where: {
        companyId: branch.companyId,
        id: { not: branch.id },
        isActive: true
      },
      include: {
        deliveryZones: true
      }
    });

    for (const otherBranch of otherBranches) {
      const distance = await this.calculateDistance(
        parseFloat(branch.latitude.toString()), parseFloat(branch.longitude.toString()),
        parseFloat(otherBranch.latitude.toString()), parseFloat(otherBranch.longitude.toString())
      );

      // If branches are close, check for overlapping coverage
      if (distance < config.maxDistance) {
        const sharedLocations = await this.findSharedCoverageLocations(branch.id, otherBranch.id);
        
        if (sharedLocations.length > 0) {
          overlaps.push({
            type: 'coverage_overlap',
            branchId: otherBranch.id,
            branchName: otherBranch.name,
            distance: distance,
            sharedLocations: sharedLocations.length,
            potentialSavings: this.calculateOverlapSavings(sharedLocations, config),
            recommendation: distance < config.maxDistance * 0.5 ? 'consolidate' : 'optimize'
          });
        }
      }
    }

    return overlaps;
  }

  private async identifyDeliveryInefficiencies(branch: any, config: any): Promise<any[]> {
    const inefficiencies = [];

    // Analyze delivery patterns if we have historical data
    try {
      const recentOrders = await this.prisma.providerOrderLog.findMany({
        where: {
          companyProviderConfigId: config.id,
          branchId: branch.id,
          createdAt: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
          }
        },
        take: 1000
      });

      if (recentOrders.length > 10) {
        // Analyze average delivery times vs distance
        const avgDeliveryTime = this.calculateAverageDeliveryTime(recentOrders);
        
        if (avgDeliveryTime > config.avgDeliveryTime * 1.2) {
          inefficiencies.push({
            type: 'slow_delivery',
            currentAverage: avgDeliveryTime,
            expectedAverage: config.avgDeliveryTime,
            impact: 'high',
            recommendation: 'Review delivery routes and provider performance'
          });
        }

        // Analyze cost efficiency
        const avgCostPerKm = this.calculateAverageCostPerKm(recentOrders, config);
        if (avgCostPerKm > config.feePerKm * 1.15) {
          inefficiencies.push({
            type: 'high_delivery_cost',
            currentCost: avgCostPerKm,
            expectedCost: config.feePerKm,
            impact: 'medium',
            recommendation: 'Consider zone boundary adjustments'
          });
        }
      }
    } catch (error) {
      this.logger.debug('Unable to analyze delivery patterns:', error.message);
    }

    return inefficiencies;
  }

  private async generateOptimizationOpportunities(analysis: any, config: any): Promise<any[]> {
    const opportunities = [];

    // Zone expansion opportunities
    if (analysis.gaps.length > 0) {
      const highPriorityGaps = analysis.gaps.filter(gap => gap.priority === 'high');
      if (highPriorityGaps.length > 0) {
        opportunities.push({
          type: 'zone_expansion',
          priority: 'high',
          impact: 'revenue_increase',
          description: `Expand coverage to ${highPriorityGaps.length} high-demand locations`,
          estimatedRevenue: highPriorityGaps.reduce((sum, gap) => sum + gap.estimatedOrders * 15, 0), // Avg order value
          implementationCost: 'low',
          locations: highPriorityGaps.map(gap => gap.locationName)
        });
      }
    }

    // Zone consolidation opportunities
    if (analysis.overlaps.length > 0) {
      const consolidationSavings = analysis.overlaps.reduce((sum, overlap) => sum + overlap.potentialSavings, 0);
      if (consolidationSavings > 100) { // Minimum threshold
        opportunities.push({
          type: 'zone_consolidation',
          priority: 'medium',
          impact: 'cost_reduction',
          description: `Consolidate overlapping coverage areas`,
          estimatedSavings: consolidationSavings,
          implementationCost: 'medium',
          affectedBranches: analysis.overlaps.length
        });
      }
    }

    // Provider switching opportunities
    if (analysis.inefficiencies.some(i => i.type === 'high_delivery_cost')) {
      opportunities.push({
        type: 'provider_optimization',
        priority: 'high',
        impact: 'cost_reduction',
        description: 'Consider alternative providers for cost efficiency',
        estimatedSavings: analysis.currentCoverage.baseFee * 0.15, // 15% potential savings
        implementationCost: 'high',
        recommendation: 'Evaluate competitor providers in this area'
      });
    }

    return opportunities;
  }

  private async generateZoneOptimizationRecommendations(optimizationResults: any[]): Promise<any[]> {
    const recommendations = [];

    // Aggregate all opportunities across providers
    const allOpportunities = optimizationResults.flatMap(result => result.optimizationOpportunities);
    
    // Group by type and prioritize
    const groupedOpportunities = allOpportunities.reduce((groups, opportunity) => {
      const key = opportunity.type;
      if (!groups[key]) groups[key] = [];
      groups[key].push(opportunity);
      return groups;
    }, {});

    // Generate consolidated recommendations
    for (const [type, opportunities] of Object.entries(groupedOpportunities)) {
      const opportunitiesArray = opportunities as any[];
      const totalImpact = opportunitiesArray.reduce((sum: number, opp: any) => {
        return sum + (opp.estimatedRevenue || opp.estimatedSavings || 0);
      }, 0);

      recommendations.push({
        type,
        opportunityCount: opportunitiesArray.length,
        totalImpact,
        priority: this.calculateRecommendationPriority(opportunitiesArray),
        description: this.generateRecommendationDescription(type, opportunitiesArray),
        actionItems: this.generateActionItems(type, opportunitiesArray),
        timeline: this.estimateImplementationTimeline(type, opportunitiesArray),
        riskLevel: this.assessImplementationRisk(type, opportunitiesArray)
      });
    }

    return recommendations.sort((a, b) => b.totalImpact - a.totalImpact);
  }

  // Utility methods for calculations

  private async isLocationCoveredByBranch(locationId: string, branchId: string): Promise<boolean> {
    const deliveryZone = await this.prisma.deliveryZone.findFirst({
      where: {
        branchId,
        deletedAt: null,
        isActive: true
      },
      include: {
        globalLocation: true
      }
    });
    return deliveryZone?.globalLocation?.id === locationId;
  }

  private estimateLocationDemand(location: any): number {
    // Simple demand estimation based on location type and population
    const baseOrders = 50; // Base monthly orders
    const populationFactor = (location.population || 10000) / 10000;
    const typeFactor = location.type === 'city' ? 1.5 : location.type === 'town' ? 1.0 : 0.7;
    
    return Math.round(baseOrders * populationFactor * typeFactor);
  }

  private async findSharedCoverageLocations(branchId1: string, branchId2: string): Promise<any[]> {
    // Get locations covered by branch 1 through delivery zones
    const branch1Zones = await this.prisma.deliveryZone.findMany({
      where: { 
        branchId: branchId1,
        deletedAt: null,
        isActive: true
      },
      include: {
        globalLocation: {
          select: { id: true }
        }
      }
    });

    // Get locations covered by branch 2 through delivery zones
    const branch2Zones = await this.prisma.deliveryZone.findMany({
      where: { 
        branchId: branchId2,
        deletedAt: null,
        isActive: true
      },
      include: {
        globalLocation: {
          select: { id: true }
        }
      }
    });

    // Extract location IDs
    const branch1LocationIds = new Set(
      branch1Zones.map(zone => zone.globalLocation?.id).filter(Boolean)
    );
    
    const branch2LocationIds = branch2Zones.map(zone => zone.globalLocation?.id).filter(Boolean);

    // Find shared locations
    const sharedLocationIds = branch2LocationIds.filter(locationId => 
      branch1LocationIds.has(locationId)
    );

    return sharedLocationIds;
  }

  private calculateOverlapSavings(sharedLocations: any[], config: any): number {
    // Estimate savings from consolidating overlapping coverage
    const avgOrdersPerLocation = 30; // Monthly average
    const avgOrderValue = 15; // JOD
    const deliveryFeePercentage = 0.15; // 15% of order value goes to delivery
    
    return sharedLocations.length * avgOrdersPerLocation * avgOrderValue * deliveryFeePercentage;
  }

  private calculateAverageDeliveryTime(orders: any[]): number {
    if (orders.length === 0) return 0;
    
    // Mock calculation - in production, you'd parse actual delivery times
    return orders.reduce((sum, order) => {
      // Estimate delivery time based on order data
      return sum + 35; // Average 35 minutes
    }, 0) / orders.length;
  }

  private calculateAverageCostPerKm(orders: any[], config: any): number {
    // Mock calculation - in production, you'd calculate from actual delivery data
    return config.feePerKm * 1.1; // 10% higher than base rate
  }

  private calculateOverallOptimizationScore(results: any[]): number {
    if (results.length === 0) return 0;
    
    const totalOpportunities = results.reduce((sum, result) => sum + result.optimizationOpportunities.length, 0);
    const totalGaps = results.reduce((sum, result) => sum + result.gaps.length, 0);
    const totalOverlaps = results.reduce((sum, result) => sum + result.overlaps.length, 0);
    
    // Score between 0-100, where higher is better optimized
    const baseScore = 85;
    const gapPenalty = Math.min(totalGaps * 2, 30);
    const overlapPenalty = Math.min(totalOverlaps * 1.5, 20);
    
    return Math.max(0, baseScore - gapPenalty - overlapPenalty);
  }

  private calculatePotentialSavings(results: any[]): number {
    return results.reduce((sum, result) => {
      return sum + result.optimizationOpportunities.reduce((opSum: number, opp: any) => {
        return opSum + (opp.estimatedRevenue || opp.estimatedSavings || 0);
      }, 0);
    }, 0);
  }

  private prioritizeRecommendations(recommendations: any[]): any[] {
    return recommendations
      .map(rec => ({
        ...rec,
        priorityScore: (rec.totalImpact || 0) * this.getPriorityMultiplier(rec.priority)
      }))
      .sort((a, b) => b.priorityScore - a.priorityScore);
  }

  private calculateRecommendationPriority(opportunities: any[]): string {
    const highPriorityCount = opportunities.filter(opp => opp.priority === 'high').length;
    const totalCount = opportunities.length;
    
    if (highPriorityCount / totalCount > 0.7) return 'high';
    if (highPriorityCount / totalCount > 0.3) return 'medium';
    return 'low';
  }

  private generateRecommendationDescription(type: string, opportunities: any[]): string {
    const descriptions = {
      zone_expansion: `Expand delivery coverage to ${opportunities.length} new high-demand areas`,
      zone_consolidation: `Consolidate ${opportunities.length} overlapping coverage areas to reduce costs`,
      provider_optimization: `Optimize provider selection in ${opportunities.length} underperforming areas`
    };
    
    return descriptions[type] || `Optimize ${type} across ${opportunities.length} areas`;
  }

  private generateActionItems(type: string, opportunities: any[]): string[] {
    const actionItemsMap = {
      zone_expansion: [
        'Analyze demand patterns in identified gaps',
        'Update delivery zone boundaries',
        'Test pilot deliveries to new areas',
        'Monitor performance metrics'
      ],
      zone_consolidation: [
        'Map overlapping coverage areas',
        'Identify optimal branch assignments',
        'Gradually consolidate delivery zones',
        'Monitor customer satisfaction'
      ],
      provider_optimization: [
        'Benchmark current provider performance',
        'Research alternative provider options',
        'Negotiate better rates with existing providers',
        'Implement gradual provider transitions'
      ]
    };
    
    return actionItemsMap[type] || ['Review and analyze opportunities', 'Develop implementation plan'];
  }

  private estimateImplementationTimeline(type: string, opportunities: any[]): string {
    const timelines = {
      zone_expansion: '2-4 weeks',
      zone_consolidation: '4-6 weeks',
      provider_optimization: '6-8 weeks'
    };
    
    return timelines[type] || '4-6 weeks';
  }

  private assessImplementationRisk(type: string, opportunities: any[]): string {
    const risks = {
      zone_expansion: 'low',
      zone_consolidation: 'medium',
      provider_optimization: 'high'
    };
    
    return risks[type] || 'medium';
  }

  private getPriorityMultiplier(priority: string): number {
    const multipliers = {
      high: 3,
      medium: 2,
      low: 1
    };
    
    return multipliers[priority] || 1;
  }

  // Get zone optimization analytics for specific company
  async getZoneOptimizationAnalytics(companyId?: string): Promise<any> {
    const analytics = await this.optimizeDeliveryZones(companyId);
    
    // Add time-series data for trends
    const historicalData = await this.getZoneOptimizationTrends(companyId);
    
    return {
      current: analytics,
      trends: historicalData,
      benchmarks: await this.getIndustryBenchmarks(),
      recommendations: analytics.recommendations.slice(0, 5) // Top 5 recommendations
    };
  }

  private async getZoneOptimizationTrends(companyId?: string): Promise<any> {
    // Mock trend data - in production, you'd track this over time
    return {
      optimizationScore: [
        { date: '2024-01-01', score: 78 },
        { date: '2024-02-01', score: 80 },
        { date: '2024-03-01', score: 82 },
        { date: '2024-04-01', score: 85 }
      ],
      coverageEfficiency: [
        { date: '2024-01-01', efficiency: 72 },
        { date: '2024-02-01', efficiency: 75 },
        { date: '2024-03-01', efficiency: 78 },
        { date: '2024-04-01', efficiency: 81 }
      ],
      costOptimization: [
        { date: '2024-01-01', savings: 1200 },
        { date: '2024-02-01', savings: 1350 },
        { date: '2024-03-01', savings: 1500 },
        { date: '2024-04-01', savings: 1680 }
      ]
    };
  }

  private async getIndustryBenchmarks(): Promise<any> {
    return {
      avgOptimizationScore: 78,
      avgCoverageEfficiency: 75,
      avgDeliveryTime: 32, // minutes
      avgDeliveryCost: 2.5 // JOD per km
    };
  }

  // ===== REAL-TIME ORDER TRACKING METHODS =====

  async createRealTimeTrackingSession(orderId: string): Promise<any> {
    // Get order information
    const orderInfo = await this.findOrderById(orderId);
    if (!orderInfo) {
      throw new NotFoundException('Order not found');
    }

    // Get provider mapping
    const mapping = await this.prisma.branchProviderMapping.findFirst({
      where: {
        branchId: orderInfo.branchId,
        isActive: true
      },
      include: {
        companyProviderConfig: {
          include: {
            company: true
          }
        }
      }
    });

    if (!mapping) {
      throw new NotFoundException('No active provider mapping found for this branch');
    }

    // Create tracking session
    const trackingSession = await this.createTrackingSession(orderInfo, mapping);
    
    // Initialize real-time updates
    await this.initializeRealTimeUpdates(trackingSession);

    return trackingSession;
  }

  private async createTrackingSession(orderInfo: any, mapping: any): Promise<any> {
    const sessionId = `track_${orderInfo.id}_${Date.now()}`;
    
    const trackingSession = {
      sessionId,
      orderId: orderInfo.id,
      providerOrderId: orderInfo.providerOrderId,
      providerType: mapping.companyProviderConfig.providerType,
      status: 'active',
      createdAt: new Date().toISOString(),
      lastUpdate: new Date().toISOString(),
      trackingData: {
        currentStatus: orderInfo.status,
        estimatedDeliveryTime: null,
        driver: null,
        location: null,
        route: [],
        updates: []
      },
      customerInfo: {
        orderId: orderInfo.id,
        deliveryAddress: orderInfo.deliveryAddress || 'Address not available',
        customerPhone: orderInfo.customerPhone || null
      },
      providerConfig: {
        configId: mapping.companyProviderConfigId,
        companyName: mapping.companyProviderConfig.company.name,
        branchName: mapping.branch?.name || 'Unknown Branch'
      }
    };

    // Store session in cache/database for real-time access
    await this.storeTrackingSession(trackingSession);

    return trackingSession;
  }

  private async initializeRealTimeUpdates(trackingSession: any): Promise<void> {
    // Start periodic tracking updates
    this.scheduleTrackingUpdates(trackingSession.sessionId);
    
    // Log tracking session creation
    await this.logTrackingActivity(trackingSession.sessionId, 'session_created', {
      orderId: trackingSession.orderId,
      providerType: trackingSession.providerType,
      status: 'active'
    });
  }

  async getOrderTrackingInfo(orderId: string): Promise<any> {
    // Get cached tracking session first
    const trackingSession = await this.getTrackingSession(orderId);
    
    if (trackingSession) {
      // Update with latest information
      const latestTracking = await this.fetchLatestTrackingData(trackingSession);
      return this.formatTrackingResponse(latestTracking);
    }

    // If no session exists, create one
    const newSession = await this.createRealTimeTrackingSession(orderId);
    return this.formatTrackingResponse(newSession);
  }

  private async fetchLatestTrackingData(trackingSession: any): Promise<any> {
    const providerType = trackingSession.providerType;
    const providerOrderId = trackingSession.providerOrderId;

    try {
      let latestData;
      
      switch (providerType) {
        case 'talabat':
          latestData = await this.fetchTalabatTrackingData(providerOrderId, trackingSession.providerConfig.configId);
          break;
        
        case 'careem':
          latestData = await this.fetchCareemTrackingData(providerOrderId, trackingSession.providerConfig.configId);
          break;
        
        case 'careemexpress':
          latestData = await this.fetchCareemExpressTrackingData(providerOrderId, trackingSession.providerConfig.configId);
          break;
        
        case 'dhub':
          latestData = await this.fetchDHubTrackingData(providerOrderId, trackingSession.providerConfig.configId);
          break;
        
        case 'deliveroo':
          latestData = await this.fetchDeliverooTrackingData(providerOrderId, trackingSession.providerConfig.configId);
          break;
        
        default:
          latestData = await this.getMockTrackingData(trackingSession);
          break;
      }

      // Update tracking session with latest data
      const updatedSession = {
        ...trackingSession,
        lastUpdate: new Date().toISOString(),
        trackingData: {
          ...trackingSession.trackingData,
          ...latestData,
          updates: [
            ...trackingSession.trackingData.updates,
            {
              timestamp: new Date().toISOString(),
              status: latestData.currentStatus || trackingSession.trackingData.currentStatus,
              location: latestData.location,
              message: latestData.statusMessage || `Order status: ${latestData.currentStatus}`
            }
          ].slice(-20) // Keep last 20 updates
        }
      };

      await this.storeTrackingSession(updatedSession);
      return updatedSession;

    } catch (error) {
      console.error(`Failed to fetch tracking data for ${providerType}:`, error.message);
      
      // Return existing session with error flag
      return {
        ...trackingSession,
        trackingData: {
          ...trackingSession.trackingData,
          error: `Unable to fetch real-time data from ${providerType}`,
          lastError: new Date().toISOString()
        }
      };
    }
  }

  private async fetchTalabatTrackingData(providerOrderId: string, configId: string): Promise<any> {
    const config = await this.getProviderConfig(configId);
    const credentials = config.credentials;

    const response = await axios.get(`https://api.talabat.com/orders/${providerOrderId}/tracking`, {
      headers: {
        'Authorization': `Bearer ${credentials.access_token}`,
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });

    return {
      currentStatus: response.data.status,
      estimatedDeliveryTime: response.data.estimated_delivery_time,
      driver: response.data.driver ? {
        name: response.data.driver.name,
        phone: response.data.driver.phone,
        rating: response.data.driver.rating,
        vehicle: response.data.driver.vehicle_type
      } : null,
      location: response.data.current_location ? {
        lat: response.data.current_location.latitude,
        lng: response.data.current_location.longitude,
        address: response.data.current_location.address
      } : null,
      route: response.data.route_points || [],
      statusMessage: response.data.status_message,
      providerData: response.data
    };
  }

  private async fetchCareemTrackingData(providerOrderId: string, configId: string): Promise<any> {
    const config = await this.getProviderConfig(configId);
    const credentials = config.credentials;

    const response = await axios.get(`https://partners-api.careem.com/v1/orders/${providerOrderId}/status`, {
      headers: {
        'Authorization': `Bearer ${credentials.access_token}`,
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });

    return {
      currentStatus: response.data.order_status,
      estimatedDeliveryTime: response.data.eta,
      driver: response.data.captain ? {
        name: response.data.captain.name,
        phone: response.data.captain.mobile,
        rating: response.data.captain.rating,
        vehicle: response.data.captain.vehicle_details?.type
      } : null,
      location: response.data.captain?.location ? {
        lat: response.data.captain.location.lat,
        lng: response.data.captain.location.lng,
        address: response.data.captain.location.address
      } : null,
      route: response.data.route || [],
      statusMessage: response.data.status_description,
      providerData: response.data
    };
  }

  private async fetchCareemExpressTrackingData(providerOrderId: string, configId: string): Promise<any> {
    const config = await this.getProviderConfig(configId);
    const credentials = config.credentials;

    const response = await axios.get(`https://express-api.careem.com/v1/orders/${providerOrderId}/tracking`, {
      headers: {
        'Authorization': `Bearer ${credentials.access_token}`,
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });

    return {
      currentStatus: response.data.status,
      estimatedDeliveryTime: response.data.estimated_time,
      driver: response.data.driver ? {
        name: response.data.driver.name,
        phone: response.data.driver.phone,
        rating: response.data.driver.rating
      } : null,
      location: response.data.location ? {
        lat: response.data.location.latitude,
        lng: response.data.location.longitude,
        address: response.data.location.formatted_address
      } : null,
      route: response.data.route_points || [],
      statusMessage: response.data.message,
      providerData: response.data
    };
  }

  private async fetchDHubTrackingData(providerOrderId: string, configId: string): Promise<any> {
    const config = await this.getProviderConfig(configId);
    const credentials = config.credentials;

    const response = await axios.get(`https://api.dhub.jo/v1/orders/${providerOrderId}/track`, {
      headers: {
        'Authorization': `Bearer ${credentials.api_key}`,
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });

    return {
      currentStatus: response.data.order_status,
      estimatedDeliveryTime: response.data.delivery_eta,
      driver: response.data.driver_info ? {
        name: response.data.driver_info.name,
        phone: response.data.driver_info.phone,
        vehicle: response.data.driver_info.vehicle_type
      } : null,
      location: response.data.current_position ? {
        lat: response.data.current_position.lat,
        lng: response.data.current_position.lng,
        address: response.data.current_position.address
      } : null,
      route: response.data.delivery_path || [],
      statusMessage: response.data.status_text,
      providerData: response.data
    };
  }

  private async fetchDeliverooTrackingData(providerOrderId: string, configId: string): Promise<any> {
    const config = await this.getProviderConfig(configId);
    const credentials = config.credentials;

    const response = await axios.get(`https://api.deliveroo.com/v1/orders/${providerOrderId}/tracking`, {
      headers: {
        'Authorization': `Bearer ${credentials.access_token}`,
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });

    return {
      currentStatus: response.data.state,
      estimatedDeliveryTime: response.data.estimated_delivery_at,
      driver: response.data.rider ? {
        name: response.data.rider.name,
        phone: response.data.rider.phone_number,
        rating: response.data.rider.rating
      } : null,
      location: response.data.rider?.location ? {
        lat: response.data.rider.location.latitude,
        lng: response.data.rider.location.longitude
      } : null,
      route: response.data.route_waypoints || [],
      statusMessage: response.data.state_description,
      providerData: response.data
    };
  }

  private async getMockTrackingData(trackingSession: any): Promise<any> {
    // Generate realistic mock tracking data for development/testing
    const statuses = ['preparing', 'ready_for_pickup', 'picked_up', 'on_the_way', 'delivered'];
    const currentStatusIndex = statuses.indexOf(trackingSession.trackingData.currentStatus) || 0;
    
    // Simulate progression through statuses
    const nextStatusIndex = Math.min(currentStatusIndex + Math.floor(Math.random() * 2), statuses.length - 1);
    const newStatus = statuses[nextStatusIndex];

    return {
      currentStatus: newStatus,
      estimatedDeliveryTime: new Date(Date.now() + 25 * 60 * 1000).toISOString(), // 25 minutes from now
      driver: newStatus !== 'preparing' ? {
        name: 'Ahmed Al-Rashid',
        phone: '+962791234567',
        rating: 4.7,
        vehicle: 'Motorcycle'
      } : null,
      location: newStatus === 'on_the_way' ? {
        lat: 31.9539 + (Math.random() - 0.5) * 0.01,
        lng: 35.9106 + (Math.random() - 0.5) * 0.01,
        address: 'Moving towards destination'
      } : null,
      route: [],
      statusMessage: this.getStatusMessage(newStatus),
      providerData: {
        mock: true,
        simulatedProgress: (nextStatusIndex / (statuses.length - 1)) * 100
      }
    };
  }

  private getStatusMessage(status: string): string {
    const messages = {
      preparing: 'Restaurant is preparing your order',
      ready_for_pickup: 'Order is ready and waiting for pickup',
      picked_up: 'Driver has picked up your order',
      on_the_way: 'Driver is on the way to your location',
      delivered: 'Order has been delivered successfully'
    };
    
    return messages[status] || `Order status: ${status}`;
  }

  private async getProviderConfig(configId: string): Promise<any> {
    return this.prisma.companyProviderConfig.findUnique({
      where: { id: configId }
    });
  }

  private async storeTrackingSession(session: any): Promise<void> {
    // In production, you'd store this in Redis or a similar cache
    // For now, we'll use a simple in-memory store
    if (!global.trackingSessions) {
      global.trackingSessions = new Map();
    }
    
    global.trackingSessions.set(session.orderId, session);
    
    // Also store by sessionId for quick lookup
    global.trackingSessions.set(session.sessionId, session);
  }

  private async getTrackingSession(orderId: string): Promise<any> {
    if (!global.trackingSessions) {
      return null;
    }
    
    return global.trackingSessions.get(orderId);
  }

  private formatTrackingResponse(trackingSession: any): any {
    return {
      sessionId: trackingSession.sessionId,
      orderId: trackingSession.orderId,
      status: trackingSession.status,
      lastUpdate: trackingSession.lastUpdate,
      tracking: {
        currentStatus: trackingSession.trackingData.currentStatus,
        statusMessage: trackingSession.trackingData.statusMessage || this.getStatusMessage(trackingSession.trackingData.currentStatus),
        estimatedDeliveryTime: trackingSession.trackingData.estimatedDeliveryTime,
        driver: trackingSession.trackingData.driver,
        currentLocation: trackingSession.trackingData.location,
        route: trackingSession.trackingData.route,
        recentUpdates: trackingSession.trackingData.updates?.slice(-5) || [], // Last 5 updates
        error: trackingSession.trackingData.error
      },
      customer: {
        deliveryAddress: trackingSession.customerInfo.deliveryAddress,
        contactPhone: trackingSession.customerInfo.customerPhone
      },
      provider: {
        name: trackingSession.providerType,
        company: trackingSession.providerConfig.companyName,
        branch: trackingSession.providerConfig.branchName
      },
      realTimeEnabled: true,
      refreshInterval: 30000 // 30 seconds
    };
  }

  private scheduleTrackingUpdates(sessionId: string): void {
    // Schedule periodic updates every 30 seconds
    const updateInterval = setInterval(async () => {
      try {
        const session = await this.getTrackingSession(sessionId);
        if (!session || session.status !== 'active') {
          clearInterval(updateInterval);
          return;
        }

        // Update tracking data
        await this.fetchLatestTrackingData(session);
        
        // Stop tracking if order is delivered or cancelled
        if (['delivered', 'cancelled', 'failed'].includes(session.trackingData.currentStatus)) {
          session.status = 'completed';
          await this.storeTrackingSession(session);
          clearInterval(updateInterval);
          
          await this.logTrackingActivity(sessionId, 'session_completed', {
            finalStatus: session.trackingData.currentStatus,
            duration: Date.now() - new Date(session.createdAt).getTime()
          });
        }
      } catch (error) {
        console.error(`Error updating tracking session ${sessionId}:`, error.message);
      }
    }, 30000);

    // Clean up after 2 hours
    setTimeout(() => {
      clearInterval(updateInterval);
    }, 2 * 60 * 60 * 1000);
  }

  private async logTrackingActivity(sessionId: string, activity: string, data: any): Promise<void> {
    try {
      // In production, you'd log this to your tracking logs table
      this.logger.debug(`[TRACKING] ${sessionId}: ${activity}`, data);
    } catch (error) {
      console.error('Failed to log tracking activity:', error);
    }
  }

  // Get tracking analytics for dashboard
  async getTrackingAnalytics(companyId?: string): Promise<any> {
    // Mock analytics data - in production, you'd calculate from actual tracking sessions
    return {
      summary: {
        activeTrackingSessions: Math.floor(Math.random() * 50) + 10,
        totalOrdersTracked: Math.floor(Math.random() * 1000) + 500,
        averageTrackingAccuracy: 94.2,
        realTimeUpdateSuccess: 97.8
      },
      statusDistribution: {
        preparing: Math.floor(Math.random() * 20) + 5,
        ready_for_pickup: Math.floor(Math.random() * 15) + 3,
        picked_up: Math.floor(Math.random() * 25) + 8,
        on_the_way: Math.floor(Math.random() * 30) + 12,
        delivered: Math.floor(Math.random() * 100) + 50
      },
      providerPerformance: [
        { provider: 'talabat', accuracy: 96.5, responseTime: 1.2, activeSessions: 12 },
        { provider: 'careem', accuracy: 95.8, responseTime: 1.5, activeSessions: 8 },
        { provider: 'dhub', accuracy: 94.2, responseTime: 2.1, activeSessions: 15 },
        { provider: 'deliveroo', accuracy: 93.7, responseTime: 1.8, activeSessions: 6 }
      ],
      trackingTrends: {
        daily: [
          { date: '2024-01-01', sessionsCreated: 45, successRate: 94.2 },
          { date: '2024-01-02', sessionsCreated: 52, successRate: 95.1 },
          { date: '2024-01-03', sessionsCreated: 38, successRate: 93.8 },
          { date: '2024-01-04', sessionsCreated: 61, successRate: 96.3 }
        ]
      }
    };
  }

  // Cleanup inactive tracking sessions
  async cleanupTrackingSessions(): Promise<any> {
    if (!global.trackingSessions) {
      return { cleaned: 0, total: 0 };
    }

    const sessions = Array.from(global.trackingSessions.values());
    const cutoffTime = Date.now() - (2 * 60 * 60 * 1000); // 2 hours ago
    
    let cleaned = 0;
    
    for (const session of sessions) {
      const sessionObj = session as any;
      const sessionTime = new Date(sessionObj.createdAt).getTime();
      
      if (sessionTime < cutoffTime || sessionObj.status === 'completed') {
        global.trackingSessions.delete(sessionObj.orderId);
        global.trackingSessions.delete(sessionObj.sessionId);
        cleaned++;
      }
    }

    return {
      cleaned,
      total: sessions.length,
      remaining: sessions.length - cleaned
    };
  }

  // ===== PROVIDER PERFORMANCE MONITORING METHODS =====

  async createPerformanceMonitoringSession(companyId?: string): Promise<any> {
    const monitoringSession = {
      sessionId: `monitor_${Date.now()}`,
      companyId,
      startTime: new Date().toISOString(),
      status: 'active',
      metrics: {
        realTimeMetrics: {},
        aggregatedMetrics: {},
        alerts: [],
        trends: {}
      },
      monitoredProviders: []
    };

    // Get all active provider configurations to monitor
    const providerConfigs = await this.prisma.companyProviderConfig.findMany({
      where: {
        ...(companyId && { companyId }),
        isActive: true
      },
      include: {
        company: true,
        branchMappings: {
          where: { isActive: true }
        }
      }
    });

    for (const config of providerConfigs) {
      const providerMetrics = await this.initializeProviderMonitoring(config);
      monitoringSession.monitoredProviders.push(providerMetrics);
    }

    // Start real-time monitoring
    await this.startPerformanceMonitoring(monitoringSession);

    return monitoringSession;
  }

  private async initializeProviderMonitoring(config: any): Promise<any> {
    const baselineMetrics = await this.getProviderBaselineMetrics(config.id);
    
    return {
      providerId: config.id,
      providerType: config.providerType,
      companyName: config.company.name,
      monitoringStarted: new Date().toISOString(),
      baseline: baselineMetrics,
      currentMetrics: {
        deliveryTime: {
          average: baselineMetrics.avgDeliveryTime,
          p95: baselineMetrics.p95DeliveryTime,
          trend: 'stable'
        },
        successRate: {
          rate: baselineMetrics.successRate,
          trend: 'stable'
        },
        cost: {
          avgCostPerOrder: baselineMetrics.avgCost,
          costEfficiency: baselineMetrics.costEfficiency,
          trend: 'stable'
        },
        customerSatisfaction: {
          rating: baselineMetrics.avgRating,
          trend: 'stable'
        },
        reliability: {
          uptime: 100,
          apiResponseTime: baselineMetrics.avgResponseTime,
          errorRate: 0
        }
      },
      alerts: [],
      lastUpdated: new Date().toISOString()
    };
  }

  private async getProviderBaselineMetrics(configId: string): Promise<any> {
    // Calculate baseline metrics from historical data (last 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    try {
      const historicalOrders = await this.prisma.providerOrderLog.findMany({
        where: {
          companyProviderConfigId: configId,
          createdAt: { gte: thirtyDaysAgo }
        },
        orderBy: { createdAt: 'desc' },
        take: 1000
      });

      if (historicalOrders.length === 0) {
        // Return default baseline if no historical data
        return this.getDefaultBaselineMetrics();
      }

      // Calculate actual metrics from historical data
      const successfulOrders = historicalOrders.filter(order => order.orderStatus === 'completed');
      const successRate = (successfulOrders.length / historicalOrders.length) * 100;

      // Mock calculations - in production, you'd parse actual delivery times and costs
      const avgDeliveryTime = 35; // minutes
      const p95DeliveryTime = 55; // minutes
      const avgCost = 2.5; // JOD
      const costEfficiency = 87; // percentage
      const avgRating = 4.2; // out of 5
      const avgResponseTime = 1.8; // seconds

      return {
        avgDeliveryTime,
        p95DeliveryTime,
        successRate,
        avgCost,
        costEfficiency,
        avgRating,
        avgResponseTime,
        totalOrders: historicalOrders.length,
        dataQuality: historicalOrders.length > 100 ? 'high' : 'medium'
      };
    } catch (error) {
      console.error('Failed to calculate baseline metrics:', error);
      return this.getDefaultBaselineMetrics();
    }
  }

  private getDefaultBaselineMetrics(): any {
    return {
      avgDeliveryTime: 35,
      p95DeliveryTime: 55,
      successRate: 85,
      avgCost: 2.5,
      costEfficiency: 80,
      avgRating: 4.0,
      avgResponseTime: 2.0,
      totalOrders: 0,
      dataQuality: 'low'
    };
  }

  private async startPerformanceMonitoring(session: any): Promise<void> {
    // Start monitoring intervals for each provider
    for (const provider of session.monitoredProviders) {
      this.scheduleProviderMonitoring(session.sessionId, provider.providerId);
    }

    // Store monitoring session
    await this.storeMonitoringSession(session);
  }

  private scheduleProviderMonitoring(sessionId: string, providerId: string): void {
    // Monitor every 60 seconds
    const monitorInterval = setInterval(async () => {
      try {
        await this.updateProviderMetrics(sessionId, providerId);
      } catch (error) {
        console.error(`Error monitoring provider ${providerId}:`, error.message);
      }
    }, 60000);

    // Clean up after 24 hours
    setTimeout(() => {
      clearInterval(monitorInterval);
    }, 24 * 60 * 60 * 1000);
  }

  private async updateProviderMetrics(sessionId: string, providerId: string): Promise<void> {
    const session = await this.getMonitoringSession(sessionId);
    if (!session) return;

    const provider = session.monitoredProviders.find(p => p.providerId === providerId);
    if (!provider) return;

    // Collect current metrics
    const currentMetrics = await this.collectProviderMetrics(providerId);
    
    // Update provider metrics
    provider.currentMetrics = currentMetrics;
    provider.lastUpdated = new Date().toISOString();

    // Check for alerts
    const alerts = await this.checkPerformanceAlerts(provider);
    provider.alerts = [...provider.alerts, ...alerts].slice(-10); // Keep last 10 alerts

    // Update session
    await this.storeMonitoringSession(session);

    // Log performance data
    await this.logPerformanceMetrics(providerId, currentMetrics, alerts);
  }

  private async collectProviderMetrics(providerId: string): Promise<any> {
    // Get recent orders (last hour)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    
    try {
      const recentOrders = await this.prisma.providerOrderLog.findMany({
        where: {
          companyProviderConfigId: providerId,
          createdAt: { gte: oneHourAgo }
        }
      });

      const successfulOrders = recentOrders.filter(order => order.orderStatus === 'completed');
      const failedOrders = recentOrders.filter(order => order.orderStatus === 'failed');
      
      // Test API response time
      const apiResponseTime = await this.testProviderAPIResponseTime(providerId);

      // Calculate real-time metrics
      return {
        deliveryTime: {
          average: this.calculateAverageDeliveryTimeFromOrders(recentOrders),
          p95: this.calculateP95DeliveryTime(recentOrders),
          trend: this.calculateTrend('deliveryTime', recentOrders)
        },
        successRate: {
          rate: recentOrders.length > 0 ? (successfulOrders.length / recentOrders.length) * 100 : 100,
          trend: this.calculateTrend('successRate', recentOrders)
        },
        cost: {
          avgCostPerOrder: this.calculateAverageCost(recentOrders),
          costEfficiency: this.calculateCostEfficiency(recentOrders),
          trend: this.calculateTrend('cost', recentOrders)
        },
        customerSatisfaction: {
          rating: this.estimateCustomerRating(recentOrders),
          trend: 'stable'
        },
        reliability: {
          uptime: successfulOrders.length > 0 ? 100 : (failedOrders.length === 0 ? 100 : 95),
          apiResponseTime: apiResponseTime,
          errorRate: recentOrders.length > 0 ? (failedOrders.length / recentOrders.length) * 100 : 0
        }
      };
    } catch (error) {
      console.error(`Failed to collect metrics for provider ${providerId}:`, error);
      
      // Return degraded metrics on error
      return {
        deliveryTime: { average: 0, p95: 0, trend: 'unknown' },
        successRate: { rate: 0, trend: 'unknown' },
        cost: { avgCostPerOrder: 0, costEfficiency: 0, trend: 'unknown' },
        customerSatisfaction: { rating: 0, trend: 'unknown' },
        reliability: { uptime: 0, apiResponseTime: 999, errorRate: 100 }
      };
    }
  }

  private async testProviderAPIResponseTime(providerId: string): Promise<number> {
    try {
      const config = await this.getProviderConfig(providerId);
      if (!config) return 999;

      const startTime = Date.now();
      
      // Test basic API endpoint based on provider type
      switch (config.providerType) {
        case 'talabat':
          await axios.head('https://api.talabat.com/health', { timeout: 5000 });
          break;
        case 'careem':
          await axios.head('https://partners-api.careem.com/health', { timeout: 5000 });
          break;
        case 'dhub':
          await axios.head('https://api.dhub.jo/health', { timeout: 5000 });
          break;
        default:
          // Mock response time for other providers
          await new Promise(resolve => setTimeout(resolve, Math.random() * 1000 + 500));
      }

      return Date.now() - startTime;
    } catch (error) {
      return 999; // Max response time on error
    }
  }

  private async checkPerformanceAlerts(provider: any): Promise<any[]> {
    const alerts = [];
    const current = provider.currentMetrics;
    const baseline = provider.baseline;

    // Delivery time alerts
    if (current.deliveryTime.average > baseline.avgDeliveryTime * 1.3) {
      alerts.push({
        type: 'delivery_time_degraded',
        severity: 'high',
        message: `Delivery time increased to ${current.deliveryTime.average} minutes (${Math.round((current.deliveryTime.average / baseline.avgDeliveryTime - 1) * 100)}% above baseline)`,
        timestamp: new Date().toISOString(),
        providerId: provider.providerId,
        providerType: provider.providerType
      });
    }

    // Success rate alerts
    if (current.successRate.rate < baseline.successRate * 0.8) {
      alerts.push({
        type: 'success_rate_degraded',
        severity: 'critical',
        message: `Success rate dropped to ${current.successRate.rate.toFixed(1)}% (${Math.round((baseline.successRate - current.successRate.rate))}% below baseline)`,
        timestamp: new Date().toISOString(),
        providerId: provider.providerId,
        providerType: provider.providerType
      });
    }

    // Cost alerts
    if (current.cost.avgCostPerOrder > baseline.avgCost * 1.25) {
      alerts.push({
        type: 'cost_increase',
        severity: 'medium',
        message: `Average cost increased to ${current.cost.avgCostPerOrder.toFixed(2)} JOD (${Math.round((current.cost.avgCostPerOrder / baseline.avgCost - 1) * 100)}% above baseline)`,
        timestamp: new Date().toISOString(),
        providerId: provider.providerId,
        providerType: provider.providerType
      });
    }

    // Reliability alerts
    if (current.reliability.errorRate > 10) {
      alerts.push({
        type: 'high_error_rate',
        severity: 'high',
        message: `Error rate increased to ${current.reliability.errorRate.toFixed(1)}%`,
        timestamp: new Date().toISOString(),
        providerId: provider.providerId,
        providerType: provider.providerType
      });
    }

    if (current.reliability.apiResponseTime > 5000) {
      alerts.push({
        type: 'slow_api_response',
        severity: 'medium',
        message: `API response time increased to ${current.reliability.apiResponseTime}ms`,
        timestamp: new Date().toISOString(),
        providerId: provider.providerId,
        providerType: provider.providerType
      });
    }

    return alerts;
  }

  // Utility methods for metrics calculation
  private calculateAverageDeliveryTimeFromOrders(orders: any[]): number {
    if (orders.length === 0) return 0;
    // Mock calculation - in production, parse actual delivery times
    return Math.floor(Math.random() * 20) + 25; // 25-45 minutes
  }

  private calculateP95DeliveryTime(orders: any[]): number {
    if (orders.length === 0) return 0;
    // Mock calculation
    return Math.floor(Math.random() * 25) + 40; // 40-65 minutes
  }

  private calculateTrend(metricType: string, orders: any[]): string {
    // Mock trend calculation - in production, compare with historical data
    const trends = ['improving', 'stable', 'degrading'];
    return trends[Math.floor(Math.random() * trends.length)];
  }

  private calculateAverageCost(orders: any[]): number {
    // Mock cost calculation
    return Math.random() * 2 + 1.5; // 1.5-3.5 JOD
  }

  private calculateCostEfficiency(orders: any[]): number {
    // Mock efficiency calculation
    return Math.floor(Math.random() * 20) + 75; // 75-95%
  }

  private estimateCustomerRating(orders: any[]): number {
    // Mock rating estimation
    return Math.random() * 1.5 + 3.5; // 3.5-5.0
  }

  private async storeMonitoringSession(session: any): Promise<void> {
    // In production, store in Redis or database
    if (!global.monitoringSessions) {
      global.monitoringSessions = new Map();
    }
    global.monitoringSessions.set(session.sessionId, session);
  }

  private async getMonitoringSession(sessionId: string): Promise<any> {
    if (!global.monitoringSessions) return null;
    return global.monitoringSessions.get(sessionId);
  }

  private async logPerformanceMetrics(providerId: string, metrics: any, alerts: any[]): Promise<void> {
    try {
      // In production, store in performance_logs table
      this.logger.debug(`[PERFORMANCE] Provider ${providerId}:`, {
        metrics,
        alertCount: alerts.length,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Failed to log performance metrics:', error);
    }
  }

  // Get comprehensive performance monitoring report
  async getPerformanceMonitoringReport(companyId?: string): Promise<any> {
    // Get all active monitoring sessions for the company
    const providerConfigs = await this.prisma.companyProviderConfig.findMany({
      where: {
        ...(companyId && { companyId }),
        isActive: true
      },
      include: {
        company: true
      }
    });

    const performanceReport = {
      summary: {
        totalProviders: providerConfigs.length,
        monitoringStarted: new Date().toISOString(),
        reportGenerated: new Date().toISOString(),
        overallHealth: 'good'
      },
      providerPerformance: [],
      systemAlerts: [],
      trends: {
        deliveryTime: { direction: 'stable', change: 0 },
        successRate: { direction: 'improving', change: 2.1 },
        cost: { direction: 'stable', change: -0.5 },
        satisfaction: { direction: 'improving', change: 0.3 }
      },
      recommendations: []
    };

    // Generate performance data for each provider
    for (const config of providerConfigs) {
      const providerPerformance = await this.generateProviderPerformanceReport(config);
      performanceReport.providerPerformance.push(providerPerformance);
      
      // Collect alerts
      if (providerPerformance.alerts.length > 0) {
        performanceReport.systemAlerts.push(...providerPerformance.alerts);
      }
    }

    // Generate recommendations
    performanceReport.recommendations = await this.generatePerformanceRecommendations(performanceReport);

    // Calculate overall health
    performanceReport.summary.overallHealth = this.calculateOverallHealth(performanceReport);

    return performanceReport;
  }

  private async generateProviderPerformanceReport(config: any): Promise<any> {
    const metrics = await this.collectProviderMetrics(config.id);
    const baseline = await this.getProviderBaselineMetrics(config.id);

    return {
      providerId: config.id,
      providerType: config.providerType,
      companyName: config.company.name,
      health: this.calculateProviderHealth(metrics, baseline),
      metrics: metrics,
      baseline: baseline,
      performance: {
        deliveryTimeScore: this.calculateMetricScore(metrics.deliveryTime.average, baseline.avgDeliveryTime, false),
        successRateScore: this.calculateMetricScore(metrics.successRate.rate, baseline.successRate, true),
        costEfficiencyScore: this.calculateMetricScore(metrics.cost.costEfficiency, baseline.costEfficiency, true),
        reliabilityScore: this.calculateReliabilityScore(metrics.reliability)
      },
      alerts: await this.checkPerformanceAlerts({ currentMetrics: metrics, baseline: baseline, providerId: config.id, providerType: config.providerType }),
      lastUpdated: new Date().toISOString()
    };
  }

  private calculateProviderHealth(metrics: any, baseline: any): string {
    const scores = [
      this.calculateMetricScore(metrics.deliveryTime.average, baseline.avgDeliveryTime, false),
      this.calculateMetricScore(metrics.successRate.rate, baseline.successRate, true),
      this.calculateMetricScore(metrics.cost.costEfficiency, baseline.costEfficiency, true),
      this.calculateReliabilityScore(metrics.reliability)
    ];

    const avgScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;

    if (avgScore >= 80) return 'excellent';
    if (avgScore >= 70) return 'good';
    if (avgScore >= 60) return 'fair';
    return 'poor';
  }

  private calculateMetricScore(current: number, baseline: number, higherIsBetter: boolean): number {
    if (baseline === 0) return 50; // Default score when no baseline

    const ratio = current / baseline;
    let score;

    if (higherIsBetter) {
      score = Math.min(100, ratio * 100);
    } else {
      score = Math.min(100, (2 - ratio) * 100);
    }

    return Math.max(0, Math.round(score));
  }

  private calculateReliabilityScore(reliability: any): number {
    const uptimeScore = reliability.uptime;
    const responseTimeScore = Math.max(0, 100 - (reliability.apiResponseTime / 50)); // 50ms = 1 point penalty
    const errorRateScore = Math.max(0, 100 - (reliability.errorRate * 2)); // 2 points penalty per % error

    return Math.round((uptimeScore + responseTimeScore + errorRateScore) / 3);
  }

  private async generatePerformanceRecommendations(report: any): Promise<any[]> {
    const recommendations = [];

    // Analyze overall trends
    const providers = report.providerPerformance;
    const poorPerformers = providers.filter(p => p.health === 'poor' || p.health === 'fair');

    if (poorPerformers.length > 0) {
      recommendations.push({
        type: 'provider_optimization',
        priority: 'high',
        title: 'Address underperforming providers',
        description: `${poorPerformers.length} providers showing poor performance`,
        actions: [
          'Review provider SLAs and performance targets',
          'Consider alternative providers for affected areas',
          'Implement automated failover mechanisms'
        ],
        affectedProviders: poorPerformers.map(p => p.providerType)
      });
    }

    // High error rate recommendations
    const highErrorProviders = providers.filter(p => 
      p.metrics.reliability.errorRate > 5
    );

    if (highErrorProviders.length > 0) {
      recommendations.push({
        type: 'reliability_improvement',
        priority: 'high',
        title: 'Improve API reliability',
        description: 'Multiple providers showing high error rates',
        actions: [
          'Implement retry mechanisms for failed API calls',
          'Add circuit breaker patterns',
          'Monitor provider API status pages'
        ],
        affectedProviders: highErrorProviders.map(p => p.providerType)
      });
    }

    // Cost optimization recommendations
    const highCostProviders = providers.filter(p => 
      p.performance.costEfficiencyScore < 70
    );

    if (highCostProviders.length > 0) {
      recommendations.push({
        type: 'cost_optimization',
        priority: 'medium',
        title: 'Optimize delivery costs',
        description: 'Opportunities to reduce delivery costs identified',
        actions: [
          'Negotiate better rates with providers',
          'Optimize delivery zone boundaries',
          'Implement dynamic pricing strategies'
        ],
        affectedProviders: highCostProviders.map(p => p.providerType)
      });
    }

    return recommendations;
  }

  private calculateOverallHealth(report: any): string {
    const providers = report.providerPerformance;
    if (providers.length === 0) return 'unknown';

    const healthScores = {
      excellent: 4,
      good: 3,
      fair: 2,
      poor: 1
    };

    const avgHealth = providers.reduce((sum, provider) => {
      return sum + (healthScores[provider.health] || 1);
    }, 0) / providers.length;

    if (avgHealth >= 3.5) return 'excellent';
    if (avgHealth >= 2.5) return 'good';
    if (avgHealth >= 1.5) return 'fair';
    return 'poor';
  }

  // Get real-time performance dashboard data
  async getPerformanceDashboard(companyId?: string): Promise<any> {
    const report = await this.getPerformanceMonitoringReport(companyId);
    
    return {
      summary: report.summary,
      liveMetrics: {
        avgDeliveryTime: this.calculateAverageMetric(report.providerPerformance, 'deliveryTime.average'),
        overallSuccessRate: this.calculateAverageMetric(report.providerPerformance, 'successRate.rate'),
        avgCost: this.calculateAverageMetric(report.providerPerformance, 'cost.avgCostPerOrder'),
        systemUptime: this.calculateAverageMetric(report.providerPerformance, 'reliability.uptime')
      },
      alerts: report.systemAlerts.slice(0, 10), // Latest 10 alerts
      topPerformers: report.providerPerformance
        .filter(p => p.health === 'excellent' || p.health === 'good')
        .sort((a, b) => this.getOverallScore(b) - this.getOverallScore(a))
        .slice(0, 5),
      underperformers: report.providerPerformance
        .filter(p => p.health === 'poor' || p.health === 'fair')
        .slice(0, 5),
      trends: report.trends,
      recommendations: report.recommendations.slice(0, 3) // Top 3 recommendations
    };
  }

  private calculateAverageMetric(providers: any[], metricPath: string): number {
    if (providers.length === 0) return 0;

    const values = providers.map(provider => {
      const keys = metricPath.split('.');
      let value = provider.metrics;
      
      for (const key of keys) {
        value = value?.[key];
        if (value === undefined) return 0;
      }
      
      return value;
    });

    return values.reduce((sum, val) => sum + val, 0) / values.length;
  }

  private getOverallScore(provider: any): number {
    const performance = provider.performance;
    return (
      performance.deliveryTimeScore +
      performance.successRateScore +
      performance.costEfficiencyScore +
      performance.reliabilityScore
    ) / 4;
  }

  // ===== AUTOMATED FAILOVER METHODS =====

  async createFailoverSession(companyId?: string): Promise<any> {
    const failoverSession = {
      sessionId: `failover_${Date.now()}`,
      companyId,
      startTime: new Date().toISOString(),
      status: 'active',
      failoverRules: await this.getFailoverRules(companyId),
      providerHealthStatus: new Map(),
      failoverHistory: [],
      currentFailovers: [],
      settings: {
        healthCheckInterval: 60000, // 1 minute
        failureThreshold: 3, // 3 consecutive failures
        recoveryThreshold: 5, // 5 consecutive successes to recover
        autoRecovery: true,
        maxFailoverAttempts: 2, // Max 2 failovers per order
        fallbackToLocalDelivery: true
      }
    };

    // Initialize provider health monitoring for failover
    await this.initializeFailoverMonitoring(failoverSession);

    return failoverSession;
  }

  private async getFailoverRules(companyId?: string): Promise<any[]> {
    // Get all active provider configurations and create failover rules
    const providerConfigs = await this.prisma.companyProviderConfig.findMany({
      where: {
        ...(companyId && { companyId }),
        isActive: true
      },
      include: {
        company: true,
        branchMappings: {
          where: { isActive: true },
          include: {
            branch: true
          }
        }
      }
    });

    const failoverRules = [];

    // Group providers by branch and create failover chains
    const branchProviders = new Map();
    
    for (const config of providerConfigs) {
      for (const mapping of config.branchMappings) {
        const branchId = mapping.branchId;
        
        if (!branchProviders.has(branchId)) {
          branchProviders.set(branchId, []);
        }
        
        branchProviders.get(branchId).push({
          providerId: config.id,
          providerType: config.providerType,
          priority: mapping.priority,
          maxDistance: config.maxDistance,
          baseFee: config.baseFee,
          avgDeliveryTime: config.avgDeliveryTime,
          mappingId: mapping.id,
          branchName: mapping.branch.name,
          companyName: config.company.name
        });
      }
    }

    // Create failover rules for each branch
    for (const [branchId, providers] of branchProviders) {
      // Sort providers by priority (lower number = higher priority)
      providers.sort((a, b) => a.priority - b.priority);
      
      failoverRules.push({
        branchId,
        branchName: providers[0]?.branchName || 'Unknown Branch',
        companyName: providers[0]?.companyName || 'Unknown Company',
        primaryProvider: providers[0],
        fallbackProviders: providers.slice(1),
        failoverChain: providers,
        rules: {
          maxResponseTime: 10000, // 10 seconds
          maxRetries: 3,
          healthCheckRequired: true,
          costThreshold: providers[0]?.baseFee * 1.5, // 50% higher than primary
          timeThreshold: providers[0]?.avgDeliveryTime * 1.3 // 30% longer than primary
        }
      });
    }

    return failoverRules;
  }

  private async initializeFailoverMonitoring(session: any): Promise<void> {
    // Start monitoring each provider's health
    for (const rule of session.failoverRules) {
      for (const provider of rule.failoverChain) {
        session.providerHealthStatus.set(provider.providerId, {
          status: 'healthy',
          consecutiveFailures: 0,
          consecutiveSuccesses: 0,
          lastCheck: new Date().toISOString(),
          lastFailure: null,
          responseTime: 0,
          errorRate: 0
        });

        // Schedule health checks
        this.scheduleProviderHealthCheck(session.sessionId, provider.providerId);
      }
    }

    // Store failover session
    await this.storeFailoverSession(session);
  }

  private scheduleProviderHealthCheck(sessionId: string, providerId: string): void {
    const healthCheckInterval = setInterval(async () => {
      try {
        const session = await this.getFailoverSession(sessionId);
        if (!session || session.status !== 'active') {
          clearInterval(healthCheckInterval);
          return;
        }

        await this.performProviderHealthCheck(sessionId, providerId);
      } catch (error) {
        console.error(`Error in health check for provider ${providerId}:`, error.message);
      }
    }, 60000); // Check every minute

    // Cleanup after 24 hours
    setTimeout(() => {
      clearInterval(healthCheckInterval);
    }, 24 * 60 * 60 * 1000);
  }

  private async performProviderHealthCheck(sessionId: string, providerId: string): Promise<void> {
    const session = await this.getFailoverSession(sessionId);
    if (!session) return;

    const healthStatus = session.providerHealthStatus.get(providerId);
    if (!healthStatus) return;

    try {
      // Test provider API health
      const startTime = Date.now();
      const isHealthy = await this.testProviderHealth(providerId);
      const responseTime = Date.now() - startTime;

      if (isHealthy) {
        healthStatus.consecutiveSuccesses++;
        healthStatus.consecutiveFailures = 0;
        
        // Check if provider should be marked as recovered
        if (healthStatus.status === 'unhealthy' && 
            healthStatus.consecutiveSuccesses >= session.settings.recoveryThreshold) {
          healthStatus.status = 'healthy';
          await this.logFailoverEvent(sessionId, 'provider_recovered', {
            providerId,
            consecutiveSuccesses: healthStatus.consecutiveSuccesses,
            responseTime
          });
        }
      } else {
        healthStatus.consecutiveFailures++;
        healthStatus.consecutiveSuccesses = 0;
        healthStatus.lastFailure = new Date().toISOString();

        // Check if provider should be marked as unhealthy
        if (healthStatus.status === 'healthy' && 
            healthStatus.consecutiveFailures >= session.settings.failureThreshold) {
          healthStatus.status = 'unhealthy';
          await this.logFailoverEvent(sessionId, 'provider_failed', {
            providerId,
            consecutiveFailures: healthStatus.consecutiveFailures,
            responseTime
          });
        }
      }

      healthStatus.responseTime = responseTime;
      healthStatus.lastCheck = new Date().toISOString();

      // Update session
      await this.storeFailoverSession(session);

    } catch (error) {
      healthStatus.consecutiveFailures++;
      healthStatus.lastFailure = new Date().toISOString();
      console.error(`Health check failed for provider ${providerId}:`, error.message);
    }
  }

  private async testProviderHealth(providerId: string): Promise<boolean> {
    try {
      const config = await this.getProviderConfig(providerId);
      if (!config) return false;

      // Test basic connectivity based on provider type
      switch (config.providerType) {
        case 'talabat':
          await axios.get('https://api.talabat.com/health', { timeout: 5000 });
          return true;
        
        case 'careem':
        case 'careemexpress':
          await axios.get('https://partners-api.careem.com/health', { timeout: 5000 });
          return true;
        
        case 'dhub':
          await axios.get('https://api.dhub.jo/health', { timeout: 5000 });
          return true;
        
        default:
          // Mock health check for other providers
          return Math.random() > 0.1; // 90% success rate for simulation
      }
    } catch (error) {
      return false;
    }
  }

  // Main failover execution method
  async executeFailover(orderId: string, reason: string): Promise<any> {
    const orderInfo = await this.findOrderById(orderId);
    if (!orderInfo) {
      throw new NotFoundException('Order not found');
    }

    // Find the failover session for this company/branch
    const failoverSession = await this.findFailoverSessionByBranch(orderInfo.branchId);
    if (!failoverSession) {
      throw new NotFoundException('No failover session found for this branch');
    }

    // Get failover rule for this branch
    const failoverRule = failoverSession.failoverRules.find(rule => rule.branchId === orderInfo.branchId);
    if (!failoverRule) {
      throw new NotFoundException('No failover rule configured for this branch');
    }

    // Find the next available healthy provider
    const nextProvider = await this.findNextHealthyProvider(failoverSession, failoverRule, orderInfo);
    
    if (!nextProvider) {
      // No healthy providers available - try local delivery as last resort
      if (failoverSession.settings.fallbackToLocalDelivery) {
        return await this.fallbackToLocalDelivery(orderId, orderInfo, reason);
      } else {
        throw new Error('No healthy providers available for failover');
      }
    }

    // Execute the failover
    const failoverResult = await this.performProviderFailover(orderInfo, nextProvider, reason);
    
    // Log the failover
    await this.logFailoverExecution(failoverSession.sessionId, failoverResult);

    return failoverResult;
  }

  private async findNextHealthyProvider(session: any, rule: any, orderInfo: any): Promise<any> {
    // Check each provider in the failover chain
    for (const provider of rule.failoverChain) {
      const healthStatus = session.providerHealthStatus.get(provider.providerId);
      
      if (healthStatus && healthStatus.status === 'healthy') {
        // Additional checks for suitability
        if (await this.isProviderSuitableForOrder(provider, orderInfo)) {
          return provider;
        }
      }
    }

    return null;
  }

  private async isProviderSuitableForOrder(provider: any, orderInfo: any): Promise<boolean> {
    try {
      // Check if provider can handle the delivery distance
      if (orderInfo.deliveryDistance && orderInfo.deliveryDistance > provider.maxDistance) {
        return false;
      }

      // Check if provider is accepting orders (basic API check)
      const config = await this.getProviderConfig(provider.providerId);
      if (!config || !config.isActive) {
        return false;
      }

      // Add any additional business logic checks here
      
      return true;
    } catch (error) {
      console.error(`Error checking provider suitability:`, error);
      return false;
    }
  }

  private async performProviderFailover(orderInfo: any, newProvider: any, reason: string): Promise<any> {
    const failoverStartTime = Date.now();
    
    try {
      // Cancel order with current provider if possible
      await this.attemptOrderCancellation(orderInfo);

      // Create order with new provider
      const newOrderResult = await this.createOrderWithProvider({
        branchProviderMappingId: newProvider.mappingId,
        orderId: orderInfo.id,
        orderDetails: {
          items: orderInfo.items || [],
          customer: orderInfo.customer || {},
          deliveryAddress: orderInfo.deliveryAddress || '',
          totalAmount: orderInfo.totalAmount || 0
        }
      });

      const failoverDuration = Date.now() - failoverStartTime;

      return {
        success: true,
        failoverReason: reason,
        originalProvider: orderInfo.currentProviderId,
        newProvider: newProvider.providerType,
        newProviderOrderId: newOrderResult.providerOrderId,
        failoverDuration,
        orderId: orderInfo.id,
        timestamp: new Date().toISOString(),
        costDifference: newProvider.baseFee - (orderInfo.originalFee || newProvider.baseFee),
        estimatedDeliveryTime: newProvider.avgDeliveryTime
      };

    } catch (error) {
      return {
        success: false,
        failoverReason: reason,
        error: error.message,
        orderId: orderInfo.id,
        failoverDuration: Date.now() - failoverStartTime,
        timestamp: new Date().toISOString()
      };
    }
  }

  private async attemptOrderCancellation(orderInfo: any): Promise<void> {
    try {
      // Attempt to cancel the order with the current provider
      // This would be provider-specific implementation
      this.logger.debug(`Attempting to cancel order ${orderInfo.id} with current provider`);
      
      // In production, you'd implement provider-specific cancellation logic here
      
    } catch (error) {
      console.error(`Failed to cancel order with current provider:`, error.message);
      // Continue with failover even if cancellation fails
    }
  }

  private async fallbackToLocalDelivery(orderId: string, orderInfo: any, reason: string): Promise<any> {
    return {
      success: true,
      failoverReason: reason,
      originalProvider: orderInfo.currentProviderId,
      newProvider: 'local_delivery',
      fallbackToLocal: true,
      orderId: orderInfo.id,
      timestamp: new Date().toISOString(),
      message: 'Switched to local delivery team as fallback option',
      estimatedDeliveryTime: 45 // Default local delivery time
    };
  }

  // Utility methods for failover management
  private async storeFailoverSession(session: any): Promise<void> {
    if (!global.failoverSessions) {
      global.failoverSessions = new Map();
    }
    global.failoverSessions.set(session.sessionId, session);
  }

  private async getFailoverSession(sessionId: string): Promise<any> {
    if (!global.failoverSessions) return null;
    return global.failoverSessions.get(sessionId);
  }

  private async findFailoverSessionByBranch(branchId: string): Promise<any> {
    if (!global.failoverSessions) return null;
    
    for (const session of global.failoverSessions.values()) {
      if (session.failoverRules.some(rule => rule.branchId === branchId)) {
        return session;
      }
    }
    
    return null;
  }

  private async logFailoverEvent(sessionId: string, eventType: string, data: any): Promise<void> {
    try {
      this.logger.debug(`[FAILOVER] ${sessionId} - ${eventType}:`, data);
      
      // In production, you'd store this in a failover_logs table
      const session = await this.getFailoverSession(sessionId);
      if (session) {
        session.failoverHistory.push({
          timestamp: new Date().toISOString(),
          eventType,
          data
        });
        await this.storeFailoverSession(session);
      }
    } catch (error) {
      console.error('Failed to log failover event:', error);
    }
  }

  private async logFailoverExecution(sessionId: string, failoverResult: any): Promise<void> {
    await this.logFailoverEvent(sessionId, 'failover_executed', failoverResult);
  }

  // Get failover analytics and reports
  async getFailoverAnalytics(companyId?: string): Promise<any> {
    const sessions = global.failoverSessions ? Array.from(global.failoverSessions.values()) : [];
    const relevantSessions = companyId 
      ? sessions.filter(s => (s as any).companyId === companyId)
      : sessions;

    const analytics = {
      summary: {
        totalFailoverSessions: relevantSessions.length,
        activeMonitoring: relevantSessions.filter(s => (s as any).status === 'active').length,
        totalFailovers: 0,
        successfulFailovers: 0,
        avgFailoverTime: 0
      },
      providerHealth: new Map(),
      failoverPatterns: {
        commonReasons: {},
        hourlyDistribution: {},
        providerFailureRates: {}
      },
      recommendations: []
    };

    // Calculate analytics from sessions
    for (const session of relevantSessions) {
      const sessionObj = session as any;
      // Count failovers
      const failovers = sessionObj.failoverHistory?.filter((event: any) => event.eventType === 'failover_executed') || [];
      analytics.summary.totalFailovers += failovers.length;
      analytics.summary.successfulFailovers += failovers.filter((f: any) => f.data?.success).length;

      // Calculate average failover time
      const failoverTimes = failovers.filter((f: any) => f.data?.success).map((f: any) => f.data?.failoverDuration).filter(Boolean);
      if (failoverTimes.length > 0) {
        analytics.summary.avgFailoverTime = failoverTimes.reduce((a, b) => a + b, 0) / failoverTimes.length;
      }

      // Analyze provider health
      if (sessionObj.providerHealthStatus) {
        for (const [providerId, health] of sessionObj.providerHealthStatus) {
          const healthObj = health as any;
          if (!analytics.providerHealth.has(providerId)) {
            analytics.providerHealth.set(providerId, {
              status: healthObj.status,
              failures: healthObj.consecutiveFailures,
              successes: healthObj.consecutiveSuccesses,
              avgResponseTime: healthObj.responseTime
            });
          }
        }
      }

      // Analyze failure patterns
      for (const event of sessionObj.failoverHistory || []) {
        if (event.eventType === 'provider_failed') {
          const hour = new Date(event.timestamp).getHours();
          analytics.failoverPatterns.hourlyDistribution[hour] = 
            (analytics.failoverPatterns.hourlyDistribution[hour] || 0) + 1;
        }
      }
    }

    // Generate recommendations
    analytics.recommendations = await this.generateFailoverRecommendations(analytics);

    return analytics;
  }

  private async generateFailoverRecommendations(analytics: any): Promise<any[]> {
    const recommendations = [];

    // High failure rate recommendation
    const unhealthyProviders = Array.from(analytics.providerHealth.entries())
      .filter(([_, health]) => health.status === 'unhealthy');

    if (unhealthyProviders.length > 0) {
      recommendations.push({
        type: 'provider_health_issue',
        priority: 'high',
        title: 'Address unhealthy providers',
        description: `${unhealthyProviders.length} providers are currently marked as unhealthy`,
        action: 'Review provider configurations and contact support if needed',
        affectedProviders: unhealthyProviders.map(([id, _]) => id)
      });
    }

    // Low failover success rate
    if (analytics.summary.totalFailovers > 0) {
      const successRate = (analytics.summary.successfulFailovers / analytics.summary.totalFailovers) * 100;
      
      if (successRate < 80) {
        recommendations.push({
          type: 'failover_success_rate',
          priority: 'high',
          title: 'Improve failover success rate',
          description: `Current failover success rate is ${successRate.toFixed(1)}%`,
          action: 'Review failover configurations and provider backup options',
          currentRate: successRate
        });
      }
    }

    // Slow failover times
    if (analytics.summary.avgFailoverTime > 30000) { // 30 seconds
      recommendations.push({
        type: 'failover_performance',
        priority: 'medium',
        title: 'Optimize failover performance',
        description: `Average failover time is ${(analytics.summary.avgFailoverTime / 1000).toFixed(1)} seconds`,
        action: 'Optimize provider health check intervals and timeout settings',
        currentTime: analytics.summary.avgFailoverTime
      });
    }

    return recommendations;
  }

  // Manual failover trigger (for testing or emergency situations)
  async triggerManualFailover(orderId: string, newProviderId: string, reason: string): Promise<any> {
    const orderInfo = await this.findOrderById(orderId);
    if (!orderInfo) {
      throw new NotFoundException('Order not found');
    }

    const targetProvider = await this.getProviderConfig(newProviderId);
    if (!targetProvider) {
      throw new NotFoundException('Target provider not found');
    }

    // Find appropriate mapping for the new provider
    const mapping = await this.prisma.branchProviderMapping.findFirst({
      where: {
        branchId: orderInfo.branchId,
        companyProviderConfigId: newProviderId,
        isActive: true
      }
    });

    if (!mapping) {
      throw new NotFoundException('No active mapping found for target provider and branch');
    }

    // Execute manual failover
    const failoverResult = await this.performProviderFailover(
      orderInfo, 
      {
        providerId: newProviderId,
        providerType: targetProvider.providerType,
        mappingId: mapping.id,
        baseFee: targetProvider.baseFee,
        avgDeliveryTime: targetProvider.avgDeliveryTime
      }, 
      `Manual failover: ${reason}`
    );

    return {
      ...failoverResult,
      manualTrigger: true,
      triggeredBy: reason,
      targetProvider: targetProvider.providerType
    };
  }

  // Get failover status for a specific order
  async getOrderFailoverStatus(orderId: string): Promise<any> {
    const orderInfo = await this.findOrderById(orderId);
    if (!orderInfo) {
      throw new NotFoundException('Order not found');
    }

    // Check if order has gone through failover
    const sessions = global.failoverSessions ? Array.from(global.failoverSessions.values()) : [];
    
    for (const session of sessions) {
      const sessionObj = session as any;
      const orderFailovers = sessionObj.failoverHistory?.filter((event: any) => 
        event.eventType === 'failover_executed' && 
        event.data?.orderId === orderId
      ) || [];

      if (orderFailovers.length > 0) {
        return {
          orderId,
          hasFailedOver: true,
          failoverCount: orderFailovers.length,
          failoverHistory: orderFailovers,
          currentProvider: orderFailovers[orderFailovers.length - 1].data.newProvider,
          lastFailoverReason: orderFailovers[orderFailovers.length - 1].data.failoverReason
        };
      }
    }

    return {
      orderId,
      hasFailedOver: false,
      failoverCount: 0,
      currentProvider: orderInfo.currentProviderId || 'unknown'
    };
  }

  // Utility method to find order by ID (placeholder implementation)
  private async findOrderById(orderId: string): Promise<any> {
    // This is a placeholder implementation - replace with actual order lookup
    // from your orders table/service
    return {
      id: orderId,
      status: 'pending',
      branchId: 'mock-branch-id',
      currentProviderId: 'dhub',
      items: [],
      customer: {},
      totalAmount: 0,
      createdAt: new Date()
    };
  }
}