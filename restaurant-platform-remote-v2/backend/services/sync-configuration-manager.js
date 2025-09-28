/**
 * Sync Configuration Manager
 * Manages channel-specific sync configurations, business rules, and field mappings
 * Provides flexible configuration for different delivery channels
 */

class SyncConfigurationManager {
  constructor(prisma) {
    this.prisma = prisma;
    this.defaultConfigurations = this._loadDefaultConfigurations();
    this.businessRuleTemplates = this._loadBusinessRuleTemplates();
    this.fieldMappingTemplates = this._loadFieldMappingTemplates();
  }

  // ================================
  // CONFIGURATION MANAGEMENT
  // ================================

  /**
   * Get sync configuration for assignment
   * @param {string} assignmentId - Company channel assignment ID
   * @returns {Promise<Object>} - Complete sync configuration
   */
  async getSyncConfiguration(assignmentId) {
    const config = await this.prisma.syncConfiguration.findUnique({
      where: { assignmentId },
      include: {
        assignment: {
          include: {
            channel: {
              select: {
                id: true,
                name: true,
                slug: true,
                supportedFeatures: true,
                rateLimits: true
              }
            }
          }
        }
      }
    });

    if (!config) {
      // Return default configuration for the channel
      const assignment = await this.prisma.companyChannelAssignment.findUnique({
        where: { id: assignmentId },
        include: {
          channel: {
            select: {
              id: true,
              name: true,
              slug: true,
              supportedFeatures: true,
              rateLimits: true
            }
          }
        }
      });

      if (!assignment) {
        throw new Error('Assignment not found');
      }

      return this._getDefaultConfiguration(assignment);
    }

    return this._enrichConfiguration(config);
  }

  /**
   * Create or update sync configuration
   * @param {string} assignmentId - Company channel assignment ID
   * @param {Object} configData - Configuration data
   * @returns {Promise<Object>} - Updated configuration
   */
  async updateSyncConfiguration(assignmentId, configData) {
    const assignment = await this.prisma.companyChannelAssignment.findUnique({
      where: { id: assignmentId },
      include: { channel: true }
    });

    if (!assignment) {
      throw new Error('Assignment not found');
    }

    // Validate configuration against channel capabilities
    const validatedConfig = this._validateConfiguration(configData, assignment.channel);

    const config = await this.prisma.syncConfiguration.upsert({
      where: { assignmentId },
      create: {
        assignmentId,
        companyId: assignment.companyId,
        ...validatedConfig
      },
      update: validatedConfig,
      include: {
        assignment: {
          include: {
            channel: {
              select: {
                id: true,
                name: true,
                slug: true,
                supportedFeatures: true
              }
            }
          }
        }
      }
    });

    return this._enrichConfiguration(config);
  }

  /**
   * Get configuration templates for channel type
   * @param {string} channelSlug - Channel slug (talabat, careem, deliveroo)
   * @returns {Object} - Available templates
   */
  getConfigurationTemplates(channelSlug) {
    const defaultConfig = this.defaultConfigurations[channelSlug] || this.defaultConfigurations.generic;

    return {
      channelSlug,
      syncOptions: {
        autoSyncEnabled: {
          type: 'boolean',
          default: defaultConfig.autoSyncEnabled,
          description: 'Enable automatic synchronization'
        },
        syncInterval: {
          type: 'number',
          default: defaultConfig.syncInterval,
          min: 5,
          max: 1440,
          description: 'Auto-sync interval in minutes'
        },
        fullSyncFrequency: {
          type: 'select',
          options: ['hourly', 'daily', 'weekly', 'manual'],
          default: defaultConfig.fullSyncFrequency,
          description: 'Full menu sync frequency'
        },
        incrementalSyncEnabled: {
          type: 'boolean',
          default: defaultConfig.incrementalSyncEnabled,
          description: 'Enable incremental sync for faster updates'
        }
      },
      performanceSettings: {
        batchSize: {
          type: 'number',
          default: defaultConfig.batchSize,
          min: 10,
          max: 200,
          description: 'Number of items to process per batch'
        },
        maxConcurrentJobs: {
          type: 'number',
          default: defaultConfig.maxConcurrentJobs,
          min: 1,
          max: 10,
          description: 'Maximum concurrent sync jobs'
        },
        retryAttempts: {
          type: 'number',
          default: defaultConfig.retryAttempts,
          min: 0,
          max: 10,
          description: 'Number of retry attempts for failed operations'
        }
      },
      businessRules: this.businessRuleTemplates[channelSlug] || this.businessRuleTemplates.generic,
      fieldMappings: this.fieldMappingTemplates[channelSlug] || this.fieldMappingTemplates.generic,
      notifications: {
        notifyOnSuccess: {
          type: 'boolean',
          default: false,
          description: 'Send notifications on successful sync'
        },
        notifyOnFailure: {
          type: 'boolean',
          default: true,
          description: 'Send notifications on sync failures'
        },
        notificationEmails: {
          type: 'array',
          itemType: 'email',
          default: [],
          description: 'Email addresses for notifications'
        }
      }
    };
  }

  // ================================
  // BUSINESS RULES MANAGEMENT
  // ================================

  /**
   * Apply business rules to menu data before sync
   * @param {Object} menuData - Menu data to transform
   * @param {string} assignmentId - Assignment ID for configuration
   * @returns {Promise<Object>} - Transformed menu data
   */
  async applyBusinessRules(menuData, assignmentId) {
    const config = await this.getSyncConfiguration(assignmentId);
    const businessRules = config.businessRules || {};

    let transformedData = { ...menuData };

    // Apply pricing rules
    if (businessRules.pricing) {
      transformedData = this._applyPricingRules(transformedData, businessRules.pricing);
    }

    // Apply availability rules
    if (businessRules.availability) {
      transformedData = this._applyAvailabilityRules(transformedData, businessRules.availability);
    }

    // Apply category rules
    if (businessRules.categories) {
      transformedData = this._applyCategoryRules(transformedData, businessRules.categories);
    }

    // Apply product rules
    if (businessRules.products) {
      transformedData = this._applyProductRules(transformedData, businessRules.products);
    }

    return transformedData;
  }

  /**
   * Apply field mappings for channel-specific data format
   * @param {Object} internalData - Internal menu format
   * @param {string} assignmentId - Assignment ID for configuration
   * @returns {Promise<Object>} - Channel-formatted data
   */
  async applyFieldMappings(internalData, assignmentId) {
    const config = await this.getSyncConfiguration(assignmentId);
    const fieldMappings = config.fieldMappings || {};

    return this._transformWithMappings(internalData, fieldMappings);
  }

  // ================================
  // VALIDATION AND HELPERS
  // ================================

  /**
   * Validate sync configuration against channel capabilities
   * @private
   */
  _validateConfiguration(configData, channel) {
    const supportedFeatures = channel.supportedFeatures || [];
    const validatedConfig = { ...configData };

    // Validate sync features against channel capabilities
    if (configData.incrementalSyncEnabled && !supportedFeatures.includes('incremental_sync')) {
      console.warn(`Channel ${channel.name} does not support incremental sync, disabling`);
      validatedConfig.incrementalSyncEnabled = false;
    }

    if (configData.priceOnlySync && !supportedFeatures.includes('pricing_sync')) {
      console.warn(`Channel ${channel.name} does not support price-only sync, disabling`);
      validatedConfig.priceOnlySync = false;
    }

    // Validate batch size against rate limits
    const rateLimits = channel.rateLimits || {};
    if (rateLimits.maxRequestsPerMinute && configData.batchSize) {
      const maxSafeBatchSize = Math.floor(rateLimits.maxRequestsPerMinute / 2);
      if (configData.batchSize > maxSafeBatchSize) {
        console.warn(`Reducing batch size to ${maxSafeBatchSize} due to rate limits`);
        validatedConfig.batchSize = maxSafeBatchSize;
      }
    }

    return validatedConfig;
  }

  /**
   * Enrich configuration with computed values
   * @private
   */
  _enrichConfiguration(config) {
    const enriched = {
      ...config,
      computed: {
        estimatedSyncTime: this._calculateEstimatedSyncTime(config),
        riskLevel: this._calculateRiskLevel(config),
        optimizationSuggestions: this._getOptimizationSuggestions(config)
      }
    };

    return enriched;
  }

  /**
   * Get default configuration for channel
   * @private
   */
  _getDefaultConfiguration(assignment) {
    const channelSlug = assignment.channel.slug;
    const defaultConfig = this.defaultConfigurations[channelSlug] || this.defaultConfigurations.generic;

    return {
      assignmentId: assignment.id,
      companyId: assignment.companyId,
      assignment,
      ...defaultConfig,
      computed: {
        estimatedSyncTime: this._calculateEstimatedSyncTime(defaultConfig),
        riskLevel: 'low',
        optimizationSuggestions: []
      }
    };
  }

  /**
   * Apply pricing business rules
   * @private
   */
  _applyPricingRules(menuData, pricingRules) {
    if (!pricingRules || !menuData.categories) return menuData;

    const transformedCategories = menuData.categories.map(category => {
      const transformedItems = category.items.map(item => {
        let price = parseFloat(item.price);

        // Apply markup
        if (pricingRules.markup) {
          if (pricingRules.markup.type === 'percentage') {
            price *= (1 + pricingRules.markup.value / 100);
          } else if (pricingRules.markup.type === 'fixed') {
            price += pricingRules.markup.value;
          }
        }

        // Apply minimum price
        if (pricingRules.minimumPrice && price < pricingRules.minimumPrice) {
          price = pricingRules.minimumPrice;
        }

        // Apply maximum price
        if (pricingRules.maximumPrice && price > pricingRules.maximumPrice) {
          price = pricingRules.maximumPrice;
        }

        // Round to specific precision
        if (pricingRules.roundTo) {
          price = Math.round(price / pricingRules.roundTo) * pricingRules.roundTo;
        }

        return {
          ...item,
          price: price.toFixed(2)
        };
      });

      return {
        ...category,
        items: transformedItems
      };
    });

    return {
      ...menuData,
      categories: transformedCategories
    };
  }

  /**
   * Apply availability business rules
   * @private
   */
  _applyAvailabilityRules(menuData, availabilityRules) {
    if (!availabilityRules || !menuData.categories) return menuData;

    const currentTime = new Date();
    const currentHour = currentTime.getHours();

    const transformedCategories = menuData.categories.map(category => {
      let categoryAvailable = category.isActive !== false;

      // Apply category time restrictions
      if (availabilityRules.categoryTimeRestrictions) {
        const restrictions = availabilityRules.categoryTimeRestrictions[category.id];
        if (restrictions) {
          const { startHour, endHour } = restrictions;
          categoryAvailable = categoryAvailable &&
            currentHour >= startHour && currentHour < endHour;
        }
      }

      const transformedItems = category.items.map(item => {
        let itemAvailable = item.isAvailable !== false && categoryAvailable;

        // Apply global availability rules
        if (availabilityRules.globalRules) {
          // Hide out of stock items
          if (availabilityRules.globalRules.hideOutOfStock && item.stock === 0) {
            itemAvailable = false;
          }

          // Hide items above price threshold
          if (availabilityRules.globalRules.maxPrice &&
              parseFloat(item.price) > availabilityRules.globalRules.maxPrice) {
            itemAvailable = false;
          }
        }

        return {
          ...item,
          isAvailable: itemAvailable
        };
      });

      return {
        ...category,
        isActive: categoryAvailable,
        items: transformedItems
      };
    });

    return {
      ...menuData,
      categories: transformedCategories
    };
  }

  /**
   * Apply category business rules
   * @private
   */
  _applyCategoryRules(menuData, categoryRules) {
    if (!categoryRules || !menuData.categories) return menuData;

    let transformedCategories = [...menuData.categories];

    // Apply category ordering
    if (categoryRules.customOrder) {
      transformedCategories.sort((a, b) => {
        const orderA = categoryRules.customOrder[a.id] || 999;
        const orderB = categoryRules.customOrder[b.id] || 999;
        return orderA - orderB;
      });
    }

    // Apply category filtering
    if (categoryRules.excludeCategories) {
      transformedCategories = transformedCategories.filter(
        category => !categoryRules.excludeCategories.includes(category.id)
      );
    }

    // Apply category renaming
    if (categoryRules.categoryNameMappings) {
      transformedCategories = transformedCategories.map(category => ({
        ...category,
        name: categoryRules.categoryNameMappings[category.id] || category.name
      }));
    }

    return {
      ...menuData,
      categories: transformedCategories
    };
  }

  /**
   * Apply product business rules
   * @private
   */
  _applyProductRules(menuData, productRules) {
    if (!productRules || !menuData.categories) return menuData;

    const transformedCategories = menuData.categories.map(category => {
      let transformedItems = [...category.items];

      // Apply product filtering
      if (productRules.excludeProducts) {
        transformedItems = transformedItems.filter(
          item => !productRules.excludeProducts.includes(item.id)
        );
      }

      // Apply name transformations
      if (productRules.nameTransformations) {
        transformedItems = transformedItems.map(item => {
          let name = item.name;

          // Apply regex replacements
          if (productRules.nameTransformations.regexReplacements) {
            productRules.nameTransformations.regexReplacements.forEach(replacement => {
              const regex = new RegExp(replacement.pattern, replacement.flags || 'g');
              name = name.replace(regex, replacement.replacement);
            });
          }

          // Apply specific mappings
          if (productRules.nameTransformations.specificMappings) {
            name = productRules.nameTransformations.specificMappings[item.id] || name;
          }

          return {
            ...item,
            name
          };
        });
      }

      return {
        ...category,
        items: transformedItems
      };
    });

    return {
      ...menuData,
      categories: transformedCategories
    };
  }

  /**
   * Transform data with field mappings
   * @private
   */
  _transformWithMappings(data, mappings) {
    if (!mappings || typeof mappings !== 'object') return data;

    const transformed = {};

    for (const [internalField, mapping] of Object.entries(mappings)) {
      if (typeof mapping === 'string') {
        // Simple field mapping
        transformed[mapping] = data[internalField];
      } else if (typeof mapping === 'object' && mapping.field) {
        // Complex field mapping with transformation
        let value = data[internalField];

        if (mapping.transform) {
          value = this._applyFieldTransformation(value, mapping.transform);
        }

        if (mapping.default !== undefined && (value === null || value === undefined)) {
          value = mapping.default;
        }

        transformed[mapping.field] = value;
      }
    }

    // Copy unmapped fields if preserveUnmapped is true
    if (mappings._preserveUnmapped !== false) {
      for (const [key, value] of Object.entries(data)) {
        if (!mappings[key] && !transformed[key]) {
          transformed[key] = value;
        }
      }
    }

    return transformed;
  }

  /**
   * Apply field transformation
   * @private
   */
  _applyFieldTransformation(value, transform) {
    switch (transform.type) {
      case 'uppercase':
        return typeof value === 'string' ? value.toUpperCase() : value;
      case 'lowercase':
        return typeof value === 'string' ? value.toLowerCase() : value;
      case 'number':
        return parseFloat(value) || 0;
      case 'boolean':
        return Boolean(value);
      case 'array':
        return Array.isArray(value) ? value : [value];
      case 'currency':
        return typeof value === 'number' ? value.toFixed(2) : value;
      case 'regex':
        if (typeof value === 'string' && transform.pattern && transform.replacement) {
          const regex = new RegExp(transform.pattern, transform.flags || 'g');
          return value.replace(regex, transform.replacement);
        }
        return value;
      default:
        return value;
    }
  }

  /**
   * Calculate estimated sync time
   * @private
   */
  _calculateEstimatedSyncTime(config) {
    const batchSize = config.batchSize || 50;
    const estimatedItemsPerCategory = 20;
    const estimatedCategories = 10;
    const totalItems = estimatedCategories * estimatedItemsPerCategory;
    const batches = Math.ceil(totalItems / batchSize);
    const timePerBatch = 2; // seconds

    return {
      estimatedMinutes: Math.ceil(batches * timePerBatch / 60),
      factors: {
        batchSize,
        estimatedItems: totalItems,
        batches,
        timePerBatchSeconds: timePerBatch
      }
    };
  }

  /**
   * Calculate configuration risk level
   * @private
   */
  _calculateRiskLevel(config) {
    let riskScore = 0;

    // High batch size increases risk
    if (config.batchSize > 100) riskScore += 2;
    else if (config.batchSize > 50) riskScore += 1;

    // Low retry attempts increase risk
    if (config.retryAttempts < 2) riskScore += 2;
    else if (config.retryAttempts < 3) riskScore += 1;

    // Short sync intervals increase risk
    if (config.syncInterval < 10) riskScore += 2;
    else if (config.syncInterval < 15) riskScore += 1;

    if (riskScore >= 4) return 'high';
    if (riskScore >= 2) return 'medium';
    return 'low';
  }

  /**
   * Get optimization suggestions
   * @private
   */
  _getOptimizationSuggestions(config) {
    const suggestions = [];

    if (config.batchSize > 100) {
      suggestions.push({
        type: 'performance',
        message: 'Consider reducing batch size to improve reliability',
        recommendation: 'Set batch size to 50-100 for optimal balance'
      });
    }

    if (config.syncInterval < 15) {
      suggestions.push({
        type: 'efficiency',
        message: 'Frequent syncs may impact performance',
        recommendation: 'Consider 15-30 minute intervals for most use cases'
      });
    }

    if (config.retryAttempts > 5) {
      suggestions.push({
        type: 'reliability',
        message: 'High retry count may delay error detection',
        recommendation: 'Use 3-5 retry attempts for most channels'
      });
    }

    return suggestions;
  }

  /**
   * Load default configurations for each channel
   * @private
   */
  _loadDefaultConfigurations() {
    return {
      talabat: {
        autoSyncEnabled: true,
        syncInterval: 20,
        fullSyncFrequency: 'daily',
        incrementalSyncEnabled: true,
        priceOnlySync: false,
        availabilityOnlySync: false,
        batchSize: 50,
        maxConcurrentJobs: 3,
        retryAttempts: 3,
        retryDelay: 5000,
        notifyOnSuccess: false,
        notifyOnFailure: true,
        notificationEmails: []
      },
      careem: {
        autoSyncEnabled: true,
        syncInterval: 15,
        fullSyncFrequency: 'daily',
        incrementalSyncEnabled: true,
        priceOnlySync: true,
        availabilityOnlySync: true,
        batchSize: 75,
        maxConcurrentJobs: 2,
        retryAttempts: 4,
        retryDelay: 3000,
        notifyOnSuccess: false,
        notifyOnFailure: true,
        notificationEmails: []
      },
      deliveroo: {
        autoSyncEnabled: true,
        syncInterval: 25,
        fullSyncFrequency: 'daily',
        incrementalSyncEnabled: false,
        priceOnlySync: false,
        availabilityOnlySync: true,
        batchSize: 30,
        maxConcurrentJobs: 2,
        retryAttempts: 5,
        retryDelay: 7000,
        notifyOnSuccess: false,
        notifyOnFailure: true,
        notificationEmails: []
      },
      generic: {
        autoSyncEnabled: true,
        syncInterval: 30,
        fullSyncFrequency: 'daily',
        incrementalSyncEnabled: false,
        priceOnlySync: false,
        availabilityOnlySync: false,
        batchSize: 50,
        maxConcurrentJobs: 3,
        retryAttempts: 3,
        retryDelay: 5000,
        notifyOnSuccess: false,
        notifyOnFailure: true,
        notificationEmails: []
      }
    };
  }

  /**
   * Load business rule templates
   * @private
   */
  _loadBusinessRuleTemplates() {
    return {
      talabat: {
        pricing: {
          markup: { type: 'percentage', value: 5 },
          roundTo: 0.05
        },
        availability: {
          globalRules: {
            hideOutOfStock: true
          }
        }
      },
      careem: {
        pricing: {
          markup: { type: 'percentage', value: 3 },
          roundTo: 0.01
        },
        availability: {
          globalRules: {
            hideOutOfStock: false
          }
        }
      },
      deliveroo: {
        pricing: {
          markup: { type: 'percentage', value: 7 },
          roundTo: 0.01
        },
        availability: {
          globalRules: {
            hideOutOfStock: true
          }
        }
      },
      generic: {
        pricing: {},
        availability: {}
      }
    };
  }

  /**
   * Load field mapping templates
   * @private
   */
  _loadFieldMappingTemplates() {
    return {
      talabat: {
        name: { field: 'title', transform: { type: 'string' } },
        description: { field: 'desc', transform: { type: 'string' } },
        price: { field: 'price_cents', transform: { type: 'currency_cents' } },
        isAvailable: { field: 'available', transform: { type: 'boolean' } }
      },
      careem: {
        name: { field: 'item_name', transform: { type: 'string' } },
        description: { field: 'description', transform: { type: 'string' } },
        price: { field: 'unit_price', transform: { type: 'number' } },
        isAvailable: { field: 'is_available', transform: { type: 'boolean' } }
      },
      deliveroo: {
        name: { field: 'name', transform: { type: 'string' } },
        description: { field: 'description', transform: { type: 'string' } },
        price: { field: 'price', transform: { type: 'currency_cents' } },
        isAvailable: { field: 'available', transform: { type: 'boolean' } }
      },
      generic: {}
    };
  }
}

module.exports = SyncConfigurationManager;