import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../shared/database/prisma.service';
import { GeographicService } from './geographic.service';
import { CostCalculationService } from './cost-calculation.service';
import { AvailabilityTrackingService } from './availability-tracking.service';
import { PerformanceAnalyticsService } from './performance-analytics.service';

export interface VendorSelectionCriteria {
  companyId: string;
  branchId: string;
  customerLocation: { lat: number; lng: number };
  orderValue: number;
  isUrgent?: boolean;
  maxDeliveryTime?: number;
  maxDeliveryFee?: number;
}

export interface VendorScore {
  providerId: string;
  providerType: string;
  providerName: string;
  totalScore: number;
  scores: {
    proximity: number;
    capacity: number;
    cost: number;
    performance: number;
    priority: number;
  };
  quote: {
    baseFee: number;
    distanceFee: number;
    totalFee: number;
    estimatedTime: number;
    distance: number;
  };
  isRecommended: boolean;
}

export interface VendorSelectionResult {
  selectedProvider: VendorScore;
  alternativeProviders: VendorScore[];
  selectionMetadata: {
    totalProvidersEvaluated: number;
    eliminatedProviders: number;
    selectionTimeMs: number;
  };
}

@Injectable()
export class VendorSelectionService {
  private readonly logger = new Logger(VendorSelectionService.name);

  // Scoring weights (configurable per branch)
  private readonly defaultWeights = {
    proximity: 0.30, // 30% - Geographic distance and service area
    capacity: 0.25, // 25% - Real-time availability and driver count
    cost: 0.20, // 20% - Total delivery cost optimization
    performance: 0.15, // 15% - Historical performance metrics
    priority: 0.10, // 10% - Business partnership priority
  };

  constructor(
    private readonly prisma: PrismaService,
    private readonly geographicService: GeographicService,
    private readonly costCalculationService: CostCalculationService,
    private readonly availabilityService: AvailabilityTrackingService,
    private readonly performanceService: PerformanceAnalyticsService,
  ) {}

  async selectOptimalVendor(
    criteria: VendorSelectionCriteria,
  ): Promise<VendorSelectionResult> {
    const startTime = Date.now();

    try {
      // 1. Get eligible providers for this company/branch
      const eligibleProviders = await this.getEligibleProviders(
        criteria.companyId,
        criteria.branchId,
      );

      if (eligibleProviders.length === 0) {
        throw new Error('No eligible providers found');
      }

      // 2. Score each provider using multi-criteria algorithm
      const scoredProviders: VendorScore[] = [];

      for (const provider of eligibleProviders) {
        try {
          const score = await this.calculateProviderScore(provider, criteria);
          if (score.totalScore > 0) {
            scoredProviders.push(score);
          }
        } catch (error) {
          this.logger.warn(
            `Failed to score provider ${provider.id}: ${error.message}`,
          );
        }
      }

      // 3. Apply viability filters
      const viableProviders = this.applyViabilityFilters(
        scoredProviders,
        criteria,
      );

      if (viableProviders.length === 0) {
        throw new Error('No viable providers found after filtering');
      }

      // 4. Sort by total score and select optimal vendor
      viableProviders.sort((a, b) => b.totalScore - a.totalScore);

      const selectedProvider = viableProviders[0];
      const alternativeProviders = viableProviders.slice(1, 4); // Top 3 alternatives

      // 5. Store selection results for audit
      await this.storeSelectionResults(selectedProvider, criteria);

      const selectionTime = Date.now() - startTime;

      this.logger.log(
        `Vendor selection completed: ${selectedProvider.providerType} selected with score ${selectedProvider.totalScore}`,
      );

      return {
        selectedProvider,
        alternativeProviders,
        selectionMetadata: {
          totalProvidersEvaluated: eligibleProviders.length,
          eliminatedProviders: eligibleProviders.length - viableProviders.length,
          selectionTimeMs: selectionTime,
        },
      };
    } catch (error) {
      this.logger.error(`Vendor selection failed: ${error.message}`);
      throw error;
    }
  }

  private async getEligibleProviders(companyId: string, branchId: string) {
    return this.prisma.deliveryProvider.findMany({
      where: {
        companyId,
        isActive: true,
        deletedAt: null,
      },
      include: {
        company: true,
      },
    });
  }

  private async calculateProviderScore(
    provider: any,
    criteria: VendorSelectionCriteria,
  ): Promise<VendorScore> {
    // Get branch location for distance calculation
    const branch = await this.prisma.branch.findUnique({
      where: { id: criteria.branchId },
    });

    if (!branch?.latitude || !branch?.longitude) {
      throw new Error('Branch location not configured');
    }

    // 1. Calculate proximity score (30% weight)
    const distance = await this.geographicService.calculateDistance(
      { lat: Number(branch.latitude), lng: Number(branch.longitude) },
      criteria.customerLocation,
    );

    const proximityScore = this.calculateProximityScore(
      distance,
      Number(provider.maxDistance),
    );

    // 2. Calculate capacity score (25% weight)
    const availability = await this.availabilityService.getProviderAvailability(
      criteria.companyId,
      provider.name.toLowerCase(),
      criteria.branchId,
    );

    const capacityScore = this.calculateCapacityScore(availability);

    // 3. Calculate cost score (20% weight)
    const costQuote = await this.costCalculationService.calculateDeliveryCost({
      providerType: provider.name.toLowerCase(),
      distance,
      orderValue: criteria.orderValue,
      isUrgent: criteria.isUrgent,
      branchId: criteria.branchId,
      companyId: criteria.companyId,
    });

    const costScore = this.calculateCostScore(costQuote, criteria.orderValue);

    // 4. Calculate performance score (15% weight)
    const performance = await this.performanceService.getProviderPerformance(
      criteria.companyId,
      provider.name.toLowerCase(),
      criteria.branchId,
    );

    const performanceScore = this.calculatePerformanceScore(performance);

    // 5. Calculate priority score (10% weight)
    const priorityScore = this.calculatePriorityScore(
      provider.priority,
      provider.priority,
    );

    // Calculate weighted total score
    const totalScore =
      proximityScore * this.defaultWeights.proximity +
      capacityScore * this.defaultWeights.capacity +
      costScore * this.defaultWeights.cost +
      performanceScore * this.defaultWeights.performance +
      priorityScore * this.defaultWeights.priority;

    return {
      providerId: provider.id,
      providerType: provider.name.toLowerCase(),
      providerName: provider.displayName?.en || provider.name,
      totalScore: Math.round(totalScore * 100) / 100,
      scores: {
        proximity: Math.round(proximityScore * 100) / 100,
        capacity: Math.round(capacityScore * 100) / 100,
        cost: Math.round(costScore * 100) / 100,
        performance: Math.round(performanceScore * 100) / 100,
        priority: Math.round(priorityScore * 100) / 100,
      },
      quote: {
        baseFee: costQuote.baseFee,
        distanceFee: costQuote.distanceFee,
        totalFee: costQuote.totalFee,
        estimatedTime: costQuote.estimatedTime,
        distance,
      },
      isRecommended: totalScore >= 70, // Threshold for recommendation
    };
  }

  private calculateProximityScore(distance: number, maxDistance: number): number {
    if (distance > maxDistance || maxDistance === 0) return 0;

    // Linear decrease from 100 at 0km to 0 at maxDistance
    const score = Math.max(0, 100 - (distance / maxDistance) * 100);
    return Math.round(score * 100) / 100;
  }

  private calculateCapacityScore(availability: any): number {
    if (!availability?.isAvailable || availability.availableDrivers === 0) return 0;

    // Base score from available drivers (0-50 points)
    const driverScore = Math.min(50, (availability.availableDrivers || 0) * 10);

    // Utilization penalty (high utilization reduces score)
    const utilizationPenalty = Math.max(
      0,
      (availability.utilizationRate || 0) - 70,
    ) * 0.5;

    // Response time bonus (faster response = higher score)
    const responseBonus = Math.max(
      0,
      20 - ((availability.avgResponseTime || 300) / 60) * 2,
    );

    return Math.max(0, driverScore - utilizationPenalty + responseBonus);
  }

  private calculateCostScore(costQuote: any, orderValue: number): number {
    if (!costQuote.totalFee || orderValue === 0) return 0;

    // Cost as percentage of order value
    const costRatio = (costQuote.totalFee / orderValue) * 100;

    // Score decreases as cost ratio increases
    let score = 100;
    if (costRatio > 5) score = Math.max(0, 100 - (costRatio - 5) * 4);

    return Math.round(score * 100) / 100;
  }

  private calculatePerformanceScore(performance: any): number {
    const weights = {
      onTime: 0.4, // 40% - on-time delivery rate
      completion: 0.3, // 30% - order completion rate
      rating: 0.3, // 30% - customer satisfaction
    };

    const onTimeScore = performance?.onTimeRate || 85;
    const completionScore = performance?.completionRate || 90;
    const ratingScore = ((performance?.customerRating || 4) / 5) * 100;

    return (
      onTimeScore * weights.onTime +
      completionScore * weights.completion +
      ratingScore * weights.rating
    );
  }

  private calculatePriorityScore(
    branchPriority: number,
    companyPriority: number,
  ): number {
    // Combine branch and company-level priorities
    const combinedPriority = (branchPriority + companyPriority) / 2;

    // Convert priority (1-10) to score (10-100)
    return Math.min(100, combinedPriority * 10);
  }

  private applyViabilityFilters(
    providers: VendorScore[],
    criteria: VendorSelectionCriteria,
  ): VendorScore[] {
    return providers.filter((provider) => {
      // Provider must be online and have capacity
      if (provider.scores.capacity === 0) return false;

      // Customer rating threshold
      if (provider.scores.performance < 60) return false;

      // Must be within service area
      if (provider.scores.proximity < 20) return false;

      // Check delivery time constraint
      if (
        criteria.maxDeliveryTime &&
        provider.quote.estimatedTime > criteria.maxDeliveryTime
      ) {
        return false;
      }

      // Check delivery fee constraint
      if (
        criteria.maxDeliveryFee &&
        provider.quote.totalFee > criteria.maxDeliveryFee
      ) {
        return false;
      }

      return true;
    });
  }

  private async storeSelectionResults(
    selectedProvider: VendorScore,
    criteria: VendorSelectionCriteria,
  ) {
    try {
      await this.prisma.deliveryQuote.create({
        data: {
          companyId: criteria.companyId,
          branchId: criteria.branchId,
          providerType: selectedProvider.providerType,
          quoteReference: `quote_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          customerLat: criteria.customerLocation.lat,
          customerLng: criteria.customerLocation.lng,
          distance: selectedProvider.quote.distance,
          baseFee: selectedProvider.quote.baseFee,
          distanceFee: selectedProvider.quote.distanceFee,
          totalFee: selectedProvider.quote.totalFee,
          estimatedTime: selectedProvider.quote.estimatedTime,
          priorityScore: selectedProvider.scores.priority,
          availabilityScore: selectedProvider.scores.capacity,
          performanceScore: selectedProvider.scores.performance,
          totalScore: selectedProvider.totalScore,
          isSelected: true,
          quoteValidUntil: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes
          providerResponse: {
            selectionCriteria: criteria,
            allScores: selectedProvider.scores,
          },
        },
      });
    } catch (error) {
      this.logger.warn(`Failed to store selection results: ${error.message}`);
    }
  }

  // Additional methods for other endpoints...
  async getCostQuotes(params: any) {
    // Implementation for getting cost quotes from all providers
    return { message: 'Cost quotes implementation' };
  }

  async getProviderAvailability(params: any) {
    return this.availabilityService.getProviderAvailability(
      params.companyId,
      params.providerType,
      params.branchId,
    );
  }

  async getProviderPerformance(params: any) {
    return this.performanceService.getProviderPerformance(
      params.companyId,
      params.providerType,
      params.branchId,
      params.days,
    );
  }

  async reserveProviderCapacity(params: any) {
    return this.availabilityService.reserveCapacity(
      params.companyId,
      params.providerType,
      params.orderId,
      params.branchId,
    );
  }

  async releaseProviderCapacity(params: any) {
    return this.availabilityService.releaseCapacity(
      params.companyId,
      params.providerType,
      params.orderId,
      params.branchId,
    );
  }

  async calculateDeliveryRoute(params: any) {
    return this.geographicService.calculateDeliveryRoute(
      params.branchLocation,
      params.customerLocation,
      {
        considerTraffic: params.considerTraffic,
        weatherConditions: params.weatherConditions,
      },
    );
  }

  async getCostOptimizationSuggestions(params: any) {
    return this.costCalculationService.getCostOptimizationSuggestions(params);
  }

  async compareProviderPerformance(params: any) {
    return this.performanceService.compareProviders(params);
  }

  async getAvailabilityStatistics(params: any) {
    return this.availabilityService.getAvailabilityStatistics(params);
  }

  async predictProviderAvailability(params: any) {
    return this.availabilityService.predictAvailability(params);
  }

  async getProviderMixRecommendations(params: any) {
    return this.performanceService.getProviderMixRecommendations(params);
  }
}