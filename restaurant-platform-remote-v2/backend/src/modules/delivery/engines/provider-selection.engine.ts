import { Injectable, Logger } from '@nestjs/common';
import { 
  DeliveryProviderInterface, 
  StandardOrderFormat, 
  DeliveryFeeRequest, 
  ProviderConfig,
  ProviderCapabilities 
} from '../interfaces/delivery-provider.interface';
import { DeliveryProviderFactory } from '../factory/delivery-provider.factory';

// Selection criteria interfaces
export interface SelectionCriteria {
  costWeight: number; // 0-1 (1 = cost is most important)
  speedWeight: number; // 0-1 (1 = speed is most important)
  reliabilityWeight: number; // 0-1 (1 = reliability is most important)
  customerPreferenceWeight: number; // 0-1 (1 = customer preference is most important)
  businessRulesWeight: number; // 0-1 (1 = business rules are most important)
  
  // Constraints
  maxDeliveryTime?: number; // in minutes
  maxDeliveryCost?: number;
  preferredProviders?: string[]; // Provider types in order of preference
  excludedProviders?: string[]; // Provider types to exclude
  requireCapabilities?: string[]; // Required capabilities
}

export interface ProviderScore {
  providerId: string;
  providerType: string;
  totalScore: number;
  breakdown: {
    costScore: number;
    speedScore: number;
    reliabilityScore: number;
    customerPreferenceScore: number;
    businessRulesScore: number;
    capabilityScore: number;
  };
  estimatedCost: number;
  estimatedTime: number;
  provider: DeliveryProviderInterface;
  reasons: string[];
  warnings: string[];
}

export interface SelectionResult {
  selectedProvider: ProviderScore | null;
  allProviderScores: ProviderScore[];
  selectionReasons: string[];
  warnings: string[];
  fallbackRecommendations: ProviderScore[];
}

// Historical performance data interface
export interface ProviderPerformanceData {
  providerId: string;
  successRate: number; // 0-1
  averageDeliveryTime: number; // in minutes
  onTimeRate: number; // 0-1
  customerRating: number; // 1-5
  lastFailureTime?: Date;
  totalOrders: number;
  totalFailures: number;
}

// Business rules interface
export interface BusinessRule {
  id: string;
  name: string;
  priority: number; // Higher = more important
  conditions: {
    orderValue?: { min?: number; max?: number };
    deliveryDistance?: { max?: number };
    timeOfDay?: { start: string; end: string };
    dayOfWeek?: number[]; // 0-6 (Sunday-Saturday)
    customerType?: string[];
    paymentMethod?: string[];
    area?: string[];
  };
  actions: {
    preferProviders?: string[];
    excludeProviders?: string[];
    addServiceFee?: number;
    modifyCostWeight?: number;
    modifySpeedWeight?: number;
  };
}

@Injectable()
export class ProviderSelectionEngine {
  private readonly logger = new Logger(ProviderSelectionEngine.name);
  
  // Cache for provider performance data
  private performanceCache = new Map<string, ProviderPerformanceData>();
  private cacheExpiry = new Map<string, Date>();
  private readonly CACHE_DURATION = 30 * 60 * 1000; // 30 minutes

  constructor(
    private readonly providerFactory: DeliveryProviderFactory
  ) {}

  /**
   * Select the best provider for an order based on multiple criteria
   */
  async selectProvider(
    order: StandardOrderFormat,
    availableConfigs: ProviderConfig[],
    criteria: SelectionCriteria,
    businessRules: BusinessRule[] = []
  ): Promise<SelectionResult> {
    try {
      this.logger.log(`Selecting provider for order ${order.orderId} with ${availableConfigs.length} available providers`);

      // Apply business rules to modify selection criteria and filter providers
      const { modifiedCriteria, filteredConfigs } = this.applyBusinessRules(
        order, 
        availableConfigs, 
        criteria, 
        businessRules
      );

      if (filteredConfigs.length === 0) {
        return {
          selectedProvider: null,
          allProviderScores: [],
          selectionReasons: ['No providers available after applying business rules'],
          warnings: ['All providers were filtered out by business rules'],
          fallbackRecommendations: []
        };
      }

      // Calculate scores for all available providers
      const providerScores = await this.calculateProviderScores(
        order,
        filteredConfigs,
        modifiedCriteria
      );

      // Sort by total score (highest first)
      const sortedScores = providerScores.sort((a, b) => b.totalScore - a.totalScore);

      // Select the best provider
      const selectedProvider = sortedScores.length > 0 ? sortedScores[0] : null;

      // Generate selection reasons
      const selectionReasons = this.generateSelectionReasons(selectedProvider, modifiedCriteria);

      // Generate warnings
      const warnings = this.generateWarnings(sortedScores, order);

      // Generate fallback recommendations
      const fallbackRecommendations = sortedScores.slice(1, 4); // Top 3 alternatives

      return {
        selectedProvider,
        allProviderScores: sortedScores,
        selectionReasons,
        warnings,
        fallbackRecommendations
      };

    } catch (error) {
      this.logger.error('Provider selection failed:', error.message);
      return {
        selectedProvider: null,
        allProviderScores: [],
        selectionReasons: [`Provider selection failed: ${error.message}`],
        warnings: ['Provider selection engine encountered an error'],
        fallbackRecommendations: []
      };
    }
  }

  /**
   * Calculate comprehensive scores for all providers
   */
  private async calculateProviderScores(
    order: StandardOrderFormat,
    configs: ProviderConfig[],
    criteria: SelectionCriteria
  ): Promise<ProviderScore[]> {
    const scores: ProviderScore[] = [];

    for (const config of configs) {
      try {
        const provider = await this.providerFactory.createProvider(config);
        const score = await this.calculateSingleProviderScore(order, provider, config, criteria);
        scores.push(score);
      } catch (error) {
        this.logger.warn(`Failed to calculate score for provider ${config.providerType}:`, error.message);
        
        // Add a minimal score entry for failed providers
        scores.push({
          providerId: config.providerId,
          providerType: config.providerType,
          totalScore: 0,
          breakdown: {
            costScore: 0,
            speedScore: 0,
            reliabilityScore: 0,
            customerPreferenceScore: 0,
            businessRulesScore: 0,
            capabilityScore: 0
          },
          estimatedCost: 0,
          estimatedTime: 0,
          provider: null,
          reasons: [`Provider unavailable: ${error.message}`],
          warnings: [`Failed to connect to ${config.providerType}`]
        });
      }
    }

    return scores;
  }

  /**
   * Calculate score for a single provider
   */
  private async calculateSingleProviderScore(
    order: StandardOrderFormat,
    provider: DeliveryProviderInterface,
    config: ProviderConfig,
    criteria: SelectionCriteria
  ): Promise<ProviderScore> {
    const reasons: string[] = [];
    const warnings: string[] = [];

    // 1. Calculate cost score
    let estimatedCost = 0;
    let costScore = 0;
    try {
      const feeRequest: DeliveryFeeRequest = {
        pickupAddress: order.deliveryAddress, // Restaurant address would be from branch
        deliveryAddress: order.deliveryAddress,
        orderValue: order.total,
        urgency: order.priority === 'urgent' ? 'express' : 'normal'
      };

      const feeResponse = await provider.calculateDeliveryFee(feeRequest);
      estimatedCost = feeResponse.totalFee;
      
      // Normalize cost score (lower cost = higher score)
      const maxExpectedCost = 50; // Configurable baseline
      costScore = Math.max(0, 1 - (estimatedCost / maxExpectedCost));
      
      reasons.push(`Estimated cost: ${estimatedCost} (score: ${(costScore * 100).toFixed(1)}%)`);
    } catch (error) {
      warnings.push(`Cost calculation failed: ${error.message}`);
      costScore = 0;
    }

    // 2. Calculate speed score
    let estimatedTime = 0;
    let speedScore = 0;
    try {
      // Use provider's average delivery time or estimate
      estimatedTime = provider.capabilities.averageDeliveryTime;
      
      // Add preparation time
      estimatedTime += order.estimatedPreparationTime;
      
      // Normalize speed score (lower time = higher score)
      const maxExpectedTime = 60; // 60 minutes baseline
      speedScore = Math.max(0, 1 - (estimatedTime / maxExpectedTime));
      
      reasons.push(`Estimated time: ${estimatedTime} min (score: ${(speedScore * 100).toFixed(1)}%)`);
    } catch (error) {
      warnings.push(`Time estimation failed: ${error.message}`);
      speedScore = 0;
    }

    // 3. Calculate reliability score
    const reliabilityScore = await this.calculateReliabilityScore(config.providerId, provider);
    reasons.push(`Reliability score: ${(reliabilityScore * 100).toFixed(1)}%`);

    // 4. Calculate customer preference score
    const customerPreferenceScore = this.calculateCustomerPreferenceScore(
      provider.providerType,
      criteria.preferredProviders || []
    );
    if (customerPreferenceScore > 0) {
      reasons.push(`Customer preference bonus: ${(customerPreferenceScore * 100).toFixed(1)}%`);
    }

    // 5. Calculate business rules score
    const businessRulesScore = this.calculateBusinessRulesScore(provider, config, order);
    if (businessRulesScore !== 1) {
      reasons.push(`Business rules adjustment: ${(businessRulesScore * 100).toFixed(1)}%`);
    }

    // 6. Calculate capability score
    const capabilityScore = this.calculateCapabilityScore(
      provider.capabilities,
      criteria.requireCapabilities || []
    );
    if (capabilityScore < 1) {
      warnings.push(`Missing required capabilities`);
    }

    // Calculate weighted total score
    const totalScore = 
      (costScore * criteria.costWeight) +
      (speedScore * criteria.speedWeight) +
      (reliabilityScore * criteria.reliabilityWeight) +
      (customerPreferenceScore * criteria.customerPreferenceWeight) +
      (businessRulesScore * criteria.businessRulesWeight) +
      (capabilityScore * 0.1); // Capability is a base requirement

    return {
      providerId: config.providerId,
      providerType: provider.providerType,
      totalScore,
      breakdown: {
        costScore,
        speedScore,
        reliabilityScore,
        customerPreferenceScore,
        businessRulesScore,
        capabilityScore
      },
      estimatedCost,
      estimatedTime,
      provider,
      reasons,
      warnings
    };
  }

  /**
   * Calculate reliability score based on historical performance
   */
  private async calculateReliabilityScore(providerId: string, provider: DeliveryProviderInterface): Promise<number> {
    try {
      // Check cache first
      if (this.performanceCache.has(providerId)) {
        const cachedData = this.performanceCache.get(providerId);
        const cacheExpiry = this.cacheExpiry.get(providerId);
        
        if (cacheExpiry && cacheExpiry > new Date()) {
          return this.calculateReliabilityFromData(cachedData);
        }
      }

      // Get fresh performance data
      const metrics = await provider.getProviderMetrics?.();
      const healthCheck = await provider.healthCheck();

      const performanceData: ProviderPerformanceData = {
        providerId,
        successRate: metrics ? metrics.successRate / 100 : 0.9, // Default 90%
        averageDeliveryTime: provider.capabilities.averageDeliveryTime,
        onTimeRate: 0.85, // Default 85% - would be calculated from historical data
        customerRating: 4.2, // Default - would come from customer feedback
        totalOrders: metrics ? metrics.totalOrders : 0,
        totalFailures: 0
      };

      // Cache the data
      this.performanceCache.set(providerId, performanceData);
      this.cacheExpiry.set(providerId, new Date(Date.now() + this.CACHE_DURATION));

      return this.calculateReliabilityFromData(performanceData);

    } catch (error) {
      this.logger.warn(`Could not get performance data for ${providerId}:`, error.message);
      return 0.7; // Default reliability score
    }
  }

  private calculateReliabilityFromData(data: ProviderPerformanceData): number {
    // Weighted reliability calculation
    const successWeight = 0.4;
    const onTimeWeight = 0.3;
    const ratingWeight = 0.3;

    const reliability = 
      (data.successRate * successWeight) +
      (data.onTimeRate * onTimeWeight) +
      ((data.customerRating / 5) * ratingWeight);

    return Math.min(1, Math.max(0, reliability));
  }

  /**
   * Calculate customer preference score
   */
  private calculateCustomerPreferenceScore(providerType: string, preferredProviders: string[]): number {
    if (preferredProviders.length === 0) return 0;

    const index = preferredProviders.indexOf(providerType);
    if (index === -1) return 0;

    // Higher score for providers higher in the preference list
    return (preferredProviders.length - index) / preferredProviders.length;
  }

  /**
   * Calculate business rules score
   */
  private calculateBusinessRulesScore(
    provider: DeliveryProviderInterface, 
    config: ProviderConfig, 
    order: StandardOrderFormat
  ): number {
    // Business rules would modify the base score
    let score = 1.0;

    // Apply markup/discount based on business rules
    if (config.businessRules.markupPercentage) {
      score *= (1 - config.businessRules.markupPercentage / 100);
    }

    // Provider priority adjustment
    score *= (config.priority / 10); // Assuming priority is 1-10

    return Math.min(1, Math.max(0, score));
  }

  /**
   * Calculate capability score
   */
  private calculateCapabilityScore(capabilities: ProviderCapabilities, requiredCapabilities: string[]): number {
    if (requiredCapabilities.length === 0) return 1;

    let metRequirements = 0;

    for (const requirement of requiredCapabilities) {
      switch (requirement) {
        case 'bulk_orders':
          if (capabilities.supportsBulkOrders) metRequirements++;
          break;
        case 'scheduled_delivery':
          if (capabilities.supportsScheduledDelivery) metRequirements++;
          break;
        case 'real_time_tracking':
          if (capabilities.supportsRealTimeTracking) metRequirements++;
          break;
        case 'driver_assignment':
          if (capabilities.supportsDriverAssignment) metRequirements++;
          break;
        case 'address_validation':
          if (capabilities.supportsAddressValidation) metRequirements++;
          break;
        case 'cancellation':
          if (capabilities.supportsCancellation) metRequirements++;
          break;
        case 'refunds':
          if (capabilities.supportsRefunds) metRequirements++;
          break;
      }
    }

    return metRequirements / requiredCapabilities.length;
  }

  /**
   * Apply business rules to filter providers and modify criteria
   */
  private applyBusinessRules(
    order: StandardOrderFormat,
    configs: ProviderConfig[],
    criteria: SelectionCriteria,
    businessRules: BusinessRule[]
  ): { modifiedCriteria: SelectionCriteria; filteredConfigs: ProviderConfig[] } {
    let modifiedCriteria = { ...criteria };
    let filteredConfigs = [...configs];

    // Sort business rules by priority (higher first)
    const sortedRules = businessRules.sort((a, b) => b.priority - a.priority);

    for (const rule of sortedRules) {
      if (this.ruleMatches(order, rule)) {
        this.logger.log(`Applying business rule: ${rule.name}`);

        // Apply filters
        if (rule.actions.excludeProviders) {
          filteredConfigs = filteredConfigs.filter(
            config => !rule.actions.excludeProviders.includes(config.providerType)
          );
        }

        if (rule.actions.preferProviders) {
          // Move preferred providers to the front
          const preferred = filteredConfigs.filter(
            config => rule.actions.preferProviders.includes(config.providerType)
          );
          const others = filteredConfigs.filter(
            config => !rule.actions.preferProviders.includes(config.providerType)
          );
          filteredConfigs = [...preferred, ...others];
        }

        // Modify criteria weights
        if (rule.actions.modifyCostWeight !== undefined) {
          modifiedCriteria.costWeight = Math.min(1, Math.max(0, rule.actions.modifyCostWeight));
        }

        if (rule.actions.modifySpeedWeight !== undefined) {
          modifiedCriteria.speedWeight = Math.min(1, Math.max(0, rule.actions.modifySpeedWeight));
        }
      }
    }

    return { modifiedCriteria, filteredConfigs };
  }

  /**
   * Check if a business rule matches the current order
   */
  private ruleMatches(order: StandardOrderFormat, rule: BusinessRule): boolean {
    const conditions = rule.conditions;

    // Check order value
    if (conditions.orderValue) {
      if (conditions.orderValue.min && order.total < conditions.orderValue.min) return false;
      if (conditions.orderValue.max && order.total > conditions.orderValue.max) return false;
    }

    // Check time of day
    if (conditions.timeOfDay) {
      const now = new Date();
      const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
      if (currentTime < conditions.timeOfDay.start || currentTime > conditions.timeOfDay.end) return false;
    }

    // Check day of week
    if (conditions.dayOfWeek) {
      const currentDay = new Date().getDay();
      if (!conditions.dayOfWeek.includes(currentDay)) return false;
    }

    // Check payment method
    if (conditions.paymentMethod) {
      if (!conditions.paymentMethod.includes(order.paymentMethod)) return false;
    }

    // Check area
    if (conditions.area) {
      if (!conditions.area.includes(order.deliveryAddress.area)) return false;
    }

    return true;
  }

  /**
   * Generate human-readable selection reasons
   */
  private generateSelectionReasons(selectedProvider: ProviderScore | null, criteria: SelectionCriteria): string[] {
    if (!selectedProvider) {
      return ['No suitable provider found'];
    }

    const reasons: string[] = [];
    reasons.push(`Selected ${selectedProvider.providerType} (total score: ${(selectedProvider.totalScore * 100).toFixed(1)}%)`);

    // Identify the top contributing factors
    const breakdown = selectedProvider.breakdown;
    const factors = [
      { name: 'cost', score: breakdown.costScore * criteria.costWeight, weight: criteria.costWeight },
      { name: 'speed', score: breakdown.speedScore * criteria.speedWeight, weight: criteria.speedWeight },
      { name: 'reliability', score: breakdown.reliabilityScore * criteria.reliabilityWeight, weight: criteria.reliabilityWeight }
    ];

    const topFactor = factors.reduce((max, current) => current.score > max.score ? current : max);
    reasons.push(`Primary factor: ${topFactor.name} (weighted score: ${(topFactor.score * 100).toFixed(1)}%)`);

    return reasons;
  }

  /**
   * Generate warnings for the selection
   */
  private generateWarnings(scores: ProviderScore[], order: StandardOrderFormat): string[] {
    const warnings: string[] = [];

    if (scores.length === 0) {
      warnings.push('No providers available');
      return warnings;
    }

    const selectedProvider = scores[0];

    // Check if estimated time is too long
    if (selectedProvider.estimatedTime > 45) {
      warnings.push(`Long estimated delivery time: ${selectedProvider.estimatedTime} minutes`);
    }

    // Check if cost is unusually high
    if (selectedProvider.estimatedCost > order.total * 0.3) {
      warnings.push(`High delivery cost: ${selectedProvider.estimatedCost} (${((selectedProvider.estimatedCost / order.total) * 100).toFixed(1)}% of order value)`);
    }

    // Check if reliability is low
    if (selectedProvider.breakdown.reliabilityScore < 0.7) {
      warnings.push('Selected provider has below-average reliability');
    }

    // Check if there are provider-specific warnings
    warnings.push(...selectedProvider.warnings);

    return warnings;
  }

  /**
   * Get default selection criteria optimized for restaurants
   */
  getDefaultCriteria(): SelectionCriteria {
    return {
      costWeight: 0.3,
      speedWeight: 0.4,
      reliabilityWeight: 0.25,
      customerPreferenceWeight: 0.05,
      businessRulesWeight: 0.1,
      maxDeliveryTime: 60, // 60 minutes max
      maxDeliveryCost: 100 // Reasonable maximum
    };
  }

  /**
   * Get cost-optimized criteria (for budget-conscious customers)
   */
  getCostOptimizedCriteria(): SelectionCriteria {
    return {
      costWeight: 0.6,
      speedWeight: 0.2,
      reliabilityWeight: 0.15,
      customerPreferenceWeight: 0.05,
      businessRulesWeight: 0.1,
      maxDeliveryTime: 90,
      maxDeliveryCost: 50
    };
  }

  /**
   * Get speed-optimized criteria (for urgent orders)
   */
  getSpeedOptimizedCriteria(): SelectionCriteria {
    return {
      costWeight: 0.1,
      speedWeight: 0.6,
      reliabilityWeight: 0.25,
      customerPreferenceWeight: 0.05,
      businessRulesWeight: 0.1,
      maxDeliveryTime: 30,
      requireCapabilities: ['real_time_tracking', 'driver_assignment']
    };
  }

  /**
   * Clear performance cache
   */
  clearPerformanceCache(): void {
    this.performanceCache.clear();
    this.cacheExpiry.clear();
    this.logger.log('Performance cache cleared');
  }
}