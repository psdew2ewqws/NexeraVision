/**
 * Base Channel Adapter
 * Abstract base class for all delivery channel integrations
 * Defines the interface and common functionality for channel adapters
 */

class BaseChannelAdapter {
  constructor(config = {}) {
    this.channelId = config.channelId;
    this.channelName = config.channelName;
    this.channelType = config.channelType;
    this.credentials = config.credentials || {};
    this.settings = config.settings || {};
    this.apiBaseUrl = config.apiBaseUrl;
    this.webhookUrl = config.webhookUrl;
    this.authType = config.authType;
    this.rateLimits = config.rateLimits || {};
    this.supportedFeatures = config.supportedFeatures || [];

    // Rate limiting
    this.requestCount = 0;
    this.lastResetTime = Date.now();

    // Error tracking
    this.errorCount = 0;
    this.consecutiveErrors = 0;
    this.lastSuccessTime = null;
    this.lastErrorTime = null;

    // Circuit breaker state
    this.circuitState = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
    this.circuitOpenTime = null;
    this.circuitFailureThreshold = 5;
    this.circuitTimeout = 60000; // 1 minute

    if (this.constructor === BaseChannelAdapter) {
      throw new Error('BaseChannelAdapter is abstract and cannot be instantiated directly');
    }
  }

  // ================================
  // ABSTRACT METHODS - Must be implemented by subclasses
  // ================================

  /**
   * Initialize the channel adapter
   * Set up authentication, validate credentials, etc.
   */
  async initialize() {
    throw new Error('initialize() must be implemented by subclass');
  }

  /**
   * Test connection to the channel
   * @returns {Promise<{success: boolean, message: string, details?: any}>}
   */
  async testConnection() {
    throw new Error('testConnection() must be implemented by subclass');
  }

  /**
   * Push menu data to the channel
   * @param {Object} menuData - Menu structure and products
   * @returns {Promise<{success: boolean, externalMenuId?: string, errors?: Array}>}
   */
  async pushMenu(menuData) {
    throw new Error('pushMenu() must be implemented by subclass');
  }

  /**
   * Update specific menu items in the channel
   * @param {Array} items - Array of menu items to update
   * @returns {Promise<{success: boolean, updated: Array, failed: Array}>}
   */
  async updateMenuItems(items) {
    throw new Error('updateMenuItems() must be implemented by subclass');
  }

  /**
   * Sync product availability status
   * @param {Array} availabilityUpdates - Array of {productId, isAvailable, reason}
   * @returns {Promise<{success: boolean, synced: Array, failed: Array}>}
   */
  async syncAvailability(availabilityUpdates) {
    throw new Error('syncAvailability() must be implemented by subclass');
  }

  /**
   * Fetch orders from the channel
   * @param {Object} options - {since: Date, limit: number, status: string}
   * @returns {Promise<{success: boolean, orders: Array, hasMore: boolean}>}
   */
  async fetchOrders(options = {}) {
    throw new Error('fetchOrders() must be implemented by subclass');
  }

  /**
   * Update order status in the channel
   * @param {string} externalOrderId - Order ID in the external system
   * @param {string} status - New order status
   * @param {Object} metadata - Additional status metadata
   * @returns {Promise<{success: boolean, message?: string}>}
   */
  async updateOrderStatus(externalOrderId, status, metadata = {}) {
    throw new Error('updateOrderStatus() must be implemented by subclass');
  }

  /**
   * Handle incoming webhook from the channel
   * @param {Object} payload - Webhook payload
   * @param {Object} headers - Request headers
   * @returns {Promise<{success: boolean, processed: boolean, response?: any}>}
   */
  async handleWebhook(payload, headers = {}) {
    throw new Error('handleWebhook() must be implemented by subclass');
  }

  // ================================
  // COMMON FUNCTIONALITY
  // ================================

  /**
   * Check if adapter supports a specific feature
   * @param {string} feature - Feature name to check
   * @returns {boolean}
   */
  supportsFeature(feature) {
    return this.supportedFeatures.includes(feature);
  }

  /**
   * Rate limiting check
   * @returns {boolean} - true if request is allowed
   */
  checkRateLimit() {
    const now = Date.now();
    const timeWindow = this.rateLimits.window || 60000; // 1 minute default
    const maxRequests = this.rateLimits.maxRequests || 100;

    // Reset counter if time window has passed
    if (now - this.lastResetTime > timeWindow) {
      this.requestCount = 0;
      this.lastResetTime = now;
    }

    // Check if we're within limits
    if (this.requestCount >= maxRequests) {
      return false;
    }

    this.requestCount++;
    return true;
  }

  /**
   * Circuit breaker check
   * @returns {boolean} - true if circuit is closed (allow requests)
   */
  checkCircuitBreaker() {
    const now = Date.now();

    switch (this.circuitState) {
      case 'CLOSED':
        return true;

      case 'OPEN':
        // Check if timeout has passed
        if (now - this.circuitOpenTime > this.circuitTimeout) {
          this.circuitState = 'HALF_OPEN';
          return true;
        }
        return false;

      case 'HALF_OPEN':
        return true;

      default:
        return false;
    }
  }

  /**
   * Record successful operation
   */
  recordSuccess() {
    this.lastSuccessTime = Date.now();
    this.consecutiveErrors = 0;

    if (this.circuitState === 'HALF_OPEN') {
      this.circuitState = 'CLOSED';
    }
  }

  /**
   * Record failed operation
   * @param {Error} error - The error that occurred
   */
  recordError(error) {
    this.errorCount++;
    this.consecutiveErrors++;
    this.lastErrorTime = Date.now();

    // Open circuit breaker if threshold is reached
    if (this.consecutiveErrors >= this.circuitFailureThreshold) {
      this.circuitState = 'OPEN';
      this.circuitOpenTime = Date.now();
    }

    console.error(`Channel ${this.channelName} error:`, error);
  }

  /**
   * Make HTTP request with error handling and circuit breaker
   * @param {string} method - HTTP method
   * @param {string} url - Request URL
   * @param {Object} options - Request options
   * @returns {Promise<Response>}
   */
  async makeRequest(method, url, options = {}) {
    // Check rate limiting
    if (!this.checkRateLimit()) {
      throw new Error('Rate limit exceeded');
    }

    // Check circuit breaker
    if (!this.checkCircuitBreaker()) {
      throw new Error('Circuit breaker is open');
    }

    try {
      const response = await this._performRequest(method, url, options);
      this.recordSuccess();
      return response;
    } catch (error) {
      this.recordError(error);
      throw error;
    }
  }

  /**
   * Perform the actual HTTP request
   * Override this method for custom HTTP handling
   * @private
   */
  async _performRequest(method, url, options = {}) {
    const fetch = (await import('node-fetch')).default;

    const requestOptions = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Restaurant-Platform/1.0',
        ...this._getAuthHeaders(),
        ...options.headers
      },
      ...options
    };

    if (options.body && typeof options.body === 'object') {
      requestOptions.body = JSON.stringify(options.body);
    }

    const response = await fetch(url, requestOptions);

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorBody}`);
    }

    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      return await response.json();
    }

    return await response.text();
  }

  /**
   * Get authentication headers for requests
   * Override this method for channel-specific authentication
   * @private
   */
  _getAuthHeaders() {
    switch (this.authType) {
      case 'bearer_token':
        return {
          'Authorization': `Bearer ${this.credentials.token}`
        };

      case 'api_key':
        return {
          'X-API-Key': this.credentials.apiKey
        };

      case 'oauth2':
        return {
          'Authorization': `Bearer ${this.credentials.accessToken}`
        };

      default:
        return {};
    }
  }

  /**
   * Validate webhook signature
   * @param {string} payload - Raw webhook payload
   * @param {string} signature - Webhook signature
   * @param {string} secret - Webhook secret
   * @returns {boolean}
   */
  validateWebhookSignature(payload, signature, secret) {
    const crypto = require('crypto');
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');

    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  }

  /**
   * Transform internal menu format to channel-specific format
   * Override this method for channel-specific transformations
   * @param {Object} internalMenu - Internal menu structure
   * @returns {Object} - Channel-specific menu format
   */
  transformMenuToChannel(internalMenu) {
    return internalMenu; // Default: no transformation
  }

  /**
   * Transform channel order format to internal format
   * Override this method for channel-specific transformations
   * @param {Object} channelOrder - Channel-specific order structure
   * @returns {Object} - Internal order format
   */
  transformOrderFromChannel(channelOrder) {
    return channelOrder; // Default: no transformation
  }

  /**
   * Get adapter health status
   * @returns {Object} - Health status information
   */
  getHealthStatus() {
    const now = Date.now();
    const last24Hours = 24 * 60 * 60 * 1000;

    return {
      channelId: this.channelId,
      channelName: this.channelName,
      isHealthy: this.circuitState === 'CLOSED',
      circuitState: this.circuitState,
      consecutiveErrors: this.consecutiveErrors,
      totalErrors: this.errorCount,
      lastSuccessTime: this.lastSuccessTime,
      lastErrorTime: this.lastErrorTime,
      uptimePercentage: this._calculateUptimePercentage(last24Hours),
      rateLimitStatus: {
        requestCount: this.requestCount,
        maxRequests: this.rateLimits.maxRequests || 100,
        windowMs: this.rateLimits.window || 60000
      },
      supportedFeatures: this.supportedFeatures
    };
  }

  /**
   * Calculate uptime percentage for a given time period
   * @private
   */
  _calculateUptimePercentage(timePeriodMs) {
    if (!this.lastSuccessTime || !this.lastErrorTime) {
      return this.lastSuccessTime ? 100 : 0;
    }

    const now = Date.now();
    const periodStart = now - timePeriodMs;

    // Simple calculation - can be enhanced with more sophisticated tracking
    if (this.lastSuccessTime > this.lastErrorTime) {
      return Math.max(90, 100 - this.consecutiveErrors * 10);
    } else {
      return Math.max(0, 100 - this.consecutiveErrors * 20);
    }
  }

  /**
   * Cleanup resources when adapter is destroyed
   */
  async destroy() {
    // Override in subclasses if cleanup is needed
    console.log(`Destroying channel adapter: ${this.channelName}`);
  }
}

module.exports = BaseChannelAdapter;