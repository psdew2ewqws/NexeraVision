/**
 * Channel Adapter Factory
 * Creates and manages channel adapter instances
 * Provides centralized adapter lifecycle management
 */

const TalabatAdapter = require('./talabat-adapter');
const CareemAdapter = require('./careem-adapter');
const DeliverooAdapter = require('./deliveroo-adapter');

class ChannelAdapterFactory {
  constructor() {
    this.adapterInstances = new Map();
    this.adapterClasses = new Map();

    // Register built-in adapters
    this.registerAdapter('talabat', TalabatAdapter);
    this.registerAdapter('careem', CareemAdapter);
    this.registerAdapter('deliveroo', DeliverooAdapter);
  }

  /**
   * Register a new channel adapter class
   * @param {string} channelSlug - Channel identifier
   * @param {Class} AdapterClass - Adapter class to register
   */
  registerAdapter(channelSlug, AdapterClass) {
    this.adapterClasses.set(channelSlug, AdapterClass);
    console.log(`Registered channel adapter: ${channelSlug}`);
  }

  /**
   * Create or get existing adapter instance
   * @param {Object} channelConfig - Channel configuration
   * @returns {BaseChannelAdapter} - Channel adapter instance
   */
  async createAdapter(channelConfig) {
    const { channel, companyChannelAssignment } = channelConfig;
    const instanceKey = this._getInstanceKey(
      companyChannelAssignment.companyId,
      channel.slug
    );

    // Return existing instance if available and healthy
    if (this.adapterInstances.has(instanceKey)) {
      const adapter = this.adapterInstances.get(instanceKey);
      const health = adapter.getHealthStatus();

      if (health.isHealthy) {
        return adapter;
      } else {
        console.warn(`Adapter ${instanceKey} is unhealthy, recreating...`);
        await this.destroyAdapter(instanceKey);
      }
    }

    // Create new adapter instance
    const AdapterClass = this.adapterClasses.get(channel.slug);

    if (!AdapterClass) {
      throw new Error(`No adapter found for channel: ${channel.slug}`);
    }

    const adapterConfig = {
      channelId: channel.id,
      channelName: channel.name,
      channelType: channel.channelType,
      apiBaseUrl: channel.apiBaseUrl,
      webhookUrl: channel.webhookUrl,
      authType: channel.authType,
      rateLimits: channel.rateLimits || {},
      supportedFeatures: channel.supportedFeatures || [],
      credentials: companyChannelAssignment.credentials,
      settings: companyChannelAssignment.channelSettings,
      companyId: companyChannelAssignment.companyId,
      assignmentId: companyChannelAssignment.id
    };

    try {
      const adapter = new AdapterClass(adapterConfig);
      await adapter.initialize();

      this.adapterInstances.set(instanceKey, adapter);
      console.log(`Created and initialized adapter: ${instanceKey}`);

      return adapter;
    } catch (error) {
      console.error(`Failed to create adapter ${instanceKey}:`, error);
      throw error;
    }
  }

  /**
   * Get existing adapter instance
   * @param {string} companyId - Company ID
   * @param {string} channelSlug - Channel slug
   * @returns {BaseChannelAdapter|null} - Adapter instance or null
   */
  getAdapter(companyId, channelSlug) {
    const instanceKey = this._getInstanceKey(companyId, channelSlug);
    return this.adapterInstances.get(instanceKey) || null;
  }

  /**
   * Destroy adapter instance
   * @param {string} instanceKey - Adapter instance key
   */
  async destroyAdapter(instanceKey) {
    if (this.adapterInstances.has(instanceKey)) {
      const adapter = this.adapterInstances.get(instanceKey);

      try {
        await adapter.destroy();
      } catch (error) {
        console.error(`Error destroying adapter ${instanceKey}:`, error);
      }

      this.adapterInstances.delete(instanceKey);
      console.log(`Destroyed adapter: ${instanceKey}`);
    }
  }

  /**
   * Destroy all adapter instances for a company
   * @param {string} companyId - Company ID
   */
  async destroyCompanyAdapters(companyId) {
    const keys = Array.from(this.adapterInstances.keys());
    const companyKeys = keys.filter(key => key.startsWith(`${companyId}:`));

    for (const key of companyKeys) {
      await this.destroyAdapter(key);
    }
  }

  /**
   * Get health status of all adapters
   * @returns {Array} - Array of health status objects
   */
  getAllAdapterHealth() {
    const healthStatuses = [];

    for (const [instanceKey, adapter] of this.adapterInstances) {
      const [companyId, channelSlug] = instanceKey.split(':');
      const health = adapter.getHealthStatus();

      healthStatuses.push({
        instanceKey,
        companyId,
        channelSlug,
        ...health
      });
    }

    return healthStatuses;
  }

  /**
   * Get adapter health for specific company
   * @param {string} companyId - Company ID
   * @returns {Array} - Array of health status objects for company
   */
  getCompanyAdapterHealth(companyId) {
    return this.getAllAdapterHealth().filter(health => health.companyId === companyId);
  }

  /**
   * Test connections for all adapters
   * @returns {Array} - Array of connection test results
   */
  async testAllConnections() {
    const results = [];

    for (const [instanceKey, adapter] of this.adapterInstances) {
      const [companyId, channelSlug] = instanceKey.split(':');

      try {
        const testResult = await adapter.testConnection();
        results.push({
          instanceKey,
          companyId,
          channelSlug,
          ...testResult
        });
      } catch (error) {
        results.push({
          instanceKey,
          companyId,
          channelSlug,
          success: false,
          message: error.message,
          details: { error: error.message }
        });
      }
    }

    return results;
  }

  /**
   * Test connection for specific adapter
   * @param {string} companyId - Company ID
   * @param {string} channelSlug - Channel slug
   * @returns {Object} - Connection test result
   */
  async testAdapterConnection(companyId, channelSlug) {
    const adapter = this.getAdapter(companyId, channelSlug);

    if (!adapter) {
      return {
        success: false,
        message: 'Adapter not found',
        details: { companyId, channelSlug }
      };
    }

    try {
      return await adapter.testConnection();
    } catch (error) {
      return {
        success: false,
        message: error.message,
        details: { error: error.message }
      };
    }
  }

  /**
   * Get list of supported channel types
   * @returns {Array} - Array of supported channel slugs
   */
  getSupportedChannels() {
    return Array.from(this.adapterClasses.keys());
  }

  /**
   * Check if channel is supported
   * @param {string} channelSlug - Channel slug to check
   * @returns {boolean} - true if supported
   */
  isChannelSupported(channelSlug) {
    return this.adapterClasses.has(channelSlug);
  }

  /**
   * Get adapter statistics
   * @returns {Object} - Statistics about adapter instances
   */
  getStatistics() {
    const stats = {
      totalAdapters: this.adapterInstances.size,
      supportedChannels: this.adapterClasses.size,
      adaptersByChannel: {},
      adaptersByCompany: {},
      healthyAdapters: 0,
      unhealthyAdapters: 0
    };

    for (const [instanceKey, adapter] of this.adapterInstances) {
      const [companyId, channelSlug] = instanceKey.split(':');
      const health = adapter.getHealthStatus();

      // Count by channel
      stats.adaptersByChannel[channelSlug] = (stats.adaptersByChannel[channelSlug] || 0) + 1;

      // Count by company
      stats.adaptersByCompany[companyId] = (stats.adaptersByCompany[companyId] || 0) + 1;

      // Count health status
      if (health.isHealthy) {
        stats.healthyAdapters++;
      } else {
        stats.unhealthyAdapters++;
      }
    }

    return stats;
  }

  /**
   * Cleanup unhealthy adapters
   * @returns {number} - Number of adapters cleaned up
   */
  async cleanupUnhealthyAdapters() {
    let cleanedUp = 0;
    const instances = Array.from(this.adapterInstances.entries());

    for (const [instanceKey, adapter] of instances) {
      const health = adapter.getHealthStatus();

      if (!health.isHealthy && health.consecutiveErrors >= 10) {
        console.warn(`Cleaning up unhealthy adapter: ${instanceKey}`);
        await this.destroyAdapter(instanceKey);
        cleanedUp++;
      }
    }

    return cleanedUp;
  }

  /**
   * Graceful shutdown of all adapters
   */
  async shutdown() {
    console.log('Shutting down all channel adapters...');

    const instances = Array.from(this.adapterInstances.keys());
    const promises = instances.map(instanceKey => this.destroyAdapter(instanceKey));

    await Promise.allSettled(promises);

    console.log('All channel adapters shut down');
  }

  /**
   * Generate instance key for adapter
   * @private
   */
  _getInstanceKey(companyId, channelSlug) {
    return `${companyId}:${channelSlug}`;
  }
}

// Create singleton instance
const channelAdapterFactory = new ChannelAdapterFactory();

module.exports = channelAdapterFactory;