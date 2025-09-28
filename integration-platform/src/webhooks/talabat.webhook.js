/**
 * Talabat Webhook Receiver
 * Handles incoming Talabat webhooks and processes orders
 * Based on Picolinate findings and Talabat API structure
 */

const TalabatTransformer = require('../transformers/talabat.transformer');
const Logger = require('../utils/logger');
const ErrorHandler = require('../utils/errorHandler');
const axios = require('axios');

class TalabatWebhookReceiver {
  constructor() {
    this.transformer = new TalabatTransformer();
    this.providerName = 'talabat';
    this.restaurantPlatformUrl = process.env.RESTAURANT_PLATFORM_URL || 'http://localhost:3001';

    // Initialize logging and error handling
    this.logger = new Logger('TalabatWebhook');
    this.errorHandler = new ErrorHandler('TalabatWebhook');

    // Webhook logs storage (if database models exist)
    this.webhookLogs = [];

    // Performance metrics
    this.metrics = {
      totalWebhooks: 0,
      successfulWebhooks: 0,
      failedWebhooks: 0,
      averageProcessingTime: 0,
      lastProcessingTime: 0
    };
  }

  /**
   * Process incoming Talabat webhook
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async processWebhook(req, res) {
    const startTime = Date.now();
    const webhookId = `talabat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Update metrics
    this.metrics.totalWebhooks++;

    try {
      // Check circuit breaker
      if (this.errorHandler.isCircuitBroken('talabat')) {
        const circuitStatus = this.errorHandler.getCircuitBreakerStatus('talabat');
        this.logger.warn('Talabat circuit breaker is open', {
          webhookId,
          circuitStatus
        });

        return res.status(503).json({
          status: 'circuit_breaker_open',
          webhookId,
          message: 'Talabat integration temporarily unavailable',
          circuitStatus,
          timestamp: new Date().toISOString()
        });
      }

      this.logger.info('Talabat webhook received', {
        webhookId,
        contentLength: req.get('Content-Length') || 0,
        userAgent: req.get('User-Agent') || 'unknown'
      });

      // Extract webhook data
      const webhookPayload = req.body;
      const headers = req.headers;

      // Log incoming webhook
      const webhookLog = {
        id: webhookId,
        provider: 'talabat',
        webhookType: this.determineWebhookType(webhookPayload),
        payload: webhookPayload,
        headers: this.sanitizeHeaders(headers),
        receivedAt: new Date().toISOString(),
        status: 'processing'
      };

      // Store webhook log
      await this.storeWebhookLog(webhookLog);

      // Validate webhook payload
      this.validateWebhookPayload(webhookPayload);

      // Transform the webhook data with retry strategy
      let transformedData;
      const transformWithRetry = this.errorHandler.createRetryStrategy(
        this.performTransformation.bind(this),
        2, // Max 2 retries for transformation
        500 // 500ms base delay
      );

      try {
        transformedData = await transformWithRetry(webhookPayload);
        this.logger.transform('talabat', true, {
          webhookId,
          orderNumber: transformedData.orderNumber,
          itemsCount: transformedData.items?.length || 0
        });
      } catch (transformError) {
        const errorInfo = this.errorHandler.handleTransformationError(
          transformError,
          webhookPayload,
          'talabat'
        );
        throw new Error(`Transformation failed: ${errorInfo.message}`);
      }

      // Validate transformed data
      if (transformedData.order || transformedData.orderNumber) {
        this.transformer.validateTransformedOrder(transformedData.order || transformedData);
      }

      // Forward to restaurant platform with retry strategy
      const forwardWithRetry = this.errorHandler.createRetryStrategy(
        this.forwardToRestaurantPlatform.bind(this),
        3, // Max 3 retries for forwarding
        1000 // 1s base delay
      );

      let forwardResponse;
      try {
        forwardResponse = await forwardWithRetry(transformedData, headers);
        this.logger.forward('talabat', forwardResponse.success, {
          webhookId,
          status: forwardResponse.status,
          responseTime: forwardResponse.responseTime
        });
      } catch (forwardError) {
        const errorInfo = this.errorHandler.handleForwardingError(
          forwardError,
          transformedData,
          this.restaurantPlatformUrl,
          'talabat'
        );
        throw new Error(`Forwarding failed: ${errorInfo.message}`);
      }

      // Calculate processing time
      const processingTime = Date.now() - startTime;
      this.updateMetrics(processingTime, true);

      // Update webhook log with success
      webhookLog.status = 'completed';
      webhookLog.forwardedAt = new Date().toISOString();
      webhookLog.forwardResponse = {
        success: forwardResponse.success,
        status: forwardResponse.status,
        responseTime: processingTime
      };
      webhookLog.transformedData = transformedData;

      await this.updateWebhookLog(webhookLog);

      // Log performance
      this.logger.performance('webhook_processing', processingTime, {
        webhookId,
        provider: 'talabat',
        success: true
      });

      // Get transformation summary for logging
      const summary = this.getProcessingSummary(webhookPayload, transformedData, forwardResponse);
      this.logger.info('Talabat webhook processed successfully', summary);

      // Send success response
      res.status(200).json({
        status: 'success',
        webhookId,
        message: 'Talabat webhook processed successfully',
        forwarded: forwardResponse.success,
        processingTime,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      // Calculate processing time for failed request
      const processingTime = Date.now() - startTime;
      this.updateMetrics(processingTime, false);

      // Handle the error with comprehensive error handling
      const errorInfo = this.errorHandler.handleWebhookError(error, req.body, 'talabat');

      this.logger.error(`Talabat webhook processing failed`, error, {
        webhookId,
        errorId: errorInfo.errorId,
        processingTime
      });

      // Update webhook log with error
      const errorLog = {
        id: webhookId,
        provider: 'talabat',
        webhookType: 'error',
        payload: req.body,
        headers: this.sanitizeHeaders(req.headers),
        receivedAt: new Date().toISOString(),
        status: 'failed',
        error: {
          errorId: errorInfo.errorId,
          message: error.message,
          severity: errorInfo.severity,
          timestamp: new Date().toISOString()
        },
        processingTime
      };

      await this.storeWebhookLog(errorLog);

      // Send appropriate error response based on error type
      const statusCode = this.getErrorStatusCode(error);
      res.status(statusCode).json({
        status: 'error',
        webhookId,
        errorId: errorInfo.errorId,
        message: 'Failed to process Talabat webhook',
        error: error.message,
        severity: errorInfo.severity,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Determine webhook type from payload
   */
  determineWebhookType(payload) {
    if (payload.eventType) {
      return payload.eventType;
    }

    if (payload.event_type) {
      return payload.event_type;
    }

    if (payload.order || payload.orderData) {
      return 'order_received';
    }

    if (payload.status || payload.orderStatus) {
      return 'status_update';
    }

    if (payload.type) {
      return payload.type;
    }

    return 'unknown';
  }

  /**
   * Check if webhook contains order data
   */
  isOrderWebhook(payload) {
    return !!(payload.order || payload.orderData || payload.id || payload.orderId);
  }

  /**
   * Check if webhook is a status update
   */
  isStatusUpdateWebhook(payload) {
    return !!(payload.status || payload.orderStatus || payload.eventType === 'status_update');
  }

  /**
   * Validate incoming webhook payload
   */
  validateWebhookPayload(payload) {
    if (!payload || typeof payload !== 'object') {
      throw new Error('Invalid webhook payload: must be a valid JSON object');
    }

    // Check for required fields based on webhook type
    if (this.isOrderWebhook(payload)) {
      const orderId = payload.id || payload.orderId || payload.order?.id;
      if (!orderId) {
        throw new Error('Order webhook missing required field: order ID');
      }
    }

    return true;
  }

  /**
   * Forward transformed data to restaurant platform
   */
  async forwardToRestaurantPlatform(transformedData, originalHeaders) {
    try {
      const forwardUrl = `${this.restaurantPlatformUrl}/api/v1/api/integration/webhook`;

      console.log(`🔄 Forwarding Talabat data to restaurant platform: ${forwardUrl}`);

      const response = await axios.post(forwardUrl, transformedData, {
        headers: {
          'Content-Type': 'application/json',
          'X-Forwarded-From': 'NEXARA-Integration-Platform',
          'X-Original-Provider': 'talabat',
          'X-Event-Type': transformedData.eventType || 'webhook',
          'X-Webhook-Id': `talabat_${Date.now()}`,
          // Forward auth headers if present
          ...(originalHeaders.authorization && { 'Authorization': originalHeaders.authorization }),
          ...(originalHeaders['x-api-key'] && { 'X-API-Key': originalHeaders['x-api-key'] }),
        },
        timeout: 15000, // 15 second timeout for restaurant platform
      });

      console.log(`✅ Successfully forwarded to restaurant platform - Status: ${response.status}`);
      return {
        success: true,
        status: response.status,
        data: response.data,
        responseTime: response.headers['x-response-time'] || 'unknown'
      };

    } catch (error) {
      console.error(`❌ Failed to forward to restaurant platform: ${error.message}`);

      if (error.response) {
        console.error(`Response status: ${error.response.status}, data:`, error.response.data);
      }

      return {
        success: false,
        error: error.message,
        status: error.response?.status || 'network_error',
        details: error.response?.data || null
      };
    }
  }

  /**
   * Store webhook log (if database models exist)
   */
  async storeWebhookLog(webhookLog) {
    try {
      // For now, store in memory array
      // In production, this should use the database if models exist
      this.webhookLogs.push(webhookLog);

      // TODO: Implement database storage if WebhookDeliveryLog model exists
      // const log = await WebhookDeliveryLog.create({
      //   id: webhookLog.id,
      //   providerType: webhookLog.provider,
      //   webhookType: webhookLog.webhookType,
      //   payload: webhookLog.payload,
      //   status: webhookLog.status,
      //   createdAt: webhookLog.receivedAt
      // });

      console.log(`📝 Stored webhook log: ${webhookLog.id}`);
      return webhookLog;

    } catch (error) {
      console.error('Error storing webhook log:', error);
      // Don't throw - webhook processing should continue even if logging fails
    }
  }

  /**
   * Update webhook log with processing results
   */
  async updateWebhookLog(webhookLog) {
    try {
      // Update in memory storage
      const index = this.webhookLogs.findIndex(log => log.id === webhookLog.id);
      if (index !== -1) {
        this.webhookLogs[index] = webhookLog;
      }

      // TODO: Implement database update if models exist
      console.log(`📝 Updated webhook log: ${webhookLog.id} - Status: ${webhookLog.status}`);

    } catch (error) {
      console.error('Error updating webhook log:', error);
      // Don't throw - webhook processing should continue even if logging fails
    }
  }

  /**
   * Get processing summary for logging
   */
  getProcessingSummary(originalPayload, transformedData, forwardResponse) {
    return {
      provider: 'talabat',
      webhookType: this.determineWebhookType(originalPayload),
      orderId: originalPayload.id || originalPayload.orderId,
      orderNumber: transformedData.orderNumber || 'unknown',
      itemsCount: transformedData.items?.length || 0,
      totalAmount: transformedData.total || 0,
      forwardSuccess: forwardResponse.success,
      customer: transformedData.customer?.name || 'unknown',
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Sanitize headers for logging (remove sensitive data)
   */
  sanitizeHeaders(headers) {
    const sanitized = { ...headers };
    delete sanitized.authorization;
    delete sanitized['x-api-key'];
    delete sanitized.cookie;
    delete sanitized['x-forwarded-for'];
    return sanitized;
  }

  /**
   * Get webhook logs (for debugging/monitoring)
   */
  getWebhookLogs(limit = 100) {
    return this.webhookLogs
      .slice(-limit)
      .sort((a, b) => new Date(b.receivedAt) - new Date(a.receivedAt));
  }

  /**
   * Get webhook statistics
   */
  getWebhookStats() {
    const total = this.webhookLogs.length;
    const successful = this.webhookLogs.filter(log => log.status === 'completed').length;
    const failed = this.webhookLogs.filter(log => log.status === 'failed').length;
    const processing = this.webhookLogs.filter(log => log.status === 'processing').length;

    return {
      total,
      successful,
      failed,
      processing,
      successRate: total > 0 ? ((successful / total) * 100).toFixed(2) + '%' : '0%',
      lastProcessed: this.webhookLogs.length > 0 ?
        this.webhookLogs[this.webhookLogs.length - 1].receivedAt : null
    };
  }

  /**
   * Perform transformation (wrapper for retry strategy)
   */
  async performTransformation(webhookPayload) {
    if (this.isOrderWebhook(webhookPayload)) {
      return this.transformer.transformOrder(webhookPayload);
    } else if (this.isStatusUpdateWebhook(webhookPayload)) {
      return this.transformer.transformWebhookEvent(webhookPayload);
    } else {
      return this.transformer.transformWebhookEvent(webhookPayload);
    }
  }

  /**
   * Update performance metrics
   */
  updateMetrics(processingTime, success) {
    this.metrics.lastProcessingTime = processingTime;

    if (success) {
      this.metrics.successfulWebhooks++;
    } else {
      this.metrics.failedWebhooks++;
    }

    // Calculate running average
    const totalProcessed = this.metrics.successfulWebhooks + this.metrics.failedWebhooks;
    this.metrics.averageProcessingTime = Math.round(
      ((this.metrics.averageProcessingTime * (totalProcessed - 1)) + processingTime) / totalProcessed
    );
  }

  /**
   * Get error status code based on error type
   */
  getErrorStatusCode(error) {
    if (error.message.includes('validation') || error.message.includes('required field')) {
      return 400; // Bad Request
    }

    if (error.message.includes('authentication') || error.message.includes('unauthorized')) {
      return 401; // Unauthorized
    }

    if (error.message.includes('timeout') || error.message.includes('ECONNREFUSED')) {
      return 503; // Service Unavailable
    }

    return 500; // Internal Server Error
  }

  /**
   * Health check for Talabat webhook receiver
   */
  healthCheck() {
    const stats = this.getWebhookStats();
    const errorStats = this.errorHandler.getErrorStats();
    const circuitBreakerStatus = this.errorHandler.getCircuitBreakerStatus('talabat');

    const isHealthy = circuitBreakerStatus.status === 'closed' &&
                     errorStats.totalErrors < 50 &&
                     this.metrics.averageProcessingTime < 5000;

    return {
      status: isHealthy ? 'healthy' : 'degraded',
      provider: 'talabat',
      version: this.transformer.version,
      endpoints: {
        webhook: '/api/webhooks/talabat',
        status: 'active'
      },
      statistics: stats,
      metrics: this.metrics,
      errorStats,
      circuitBreaker: circuitBreakerStatus,
      restaurantPlatformUrl: this.restaurantPlatformUrl,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Get detailed webhook statistics including error analysis
   */
  getDetailedStats() {
    const baseStats = this.getWebhookStats();
    const errorStats = this.errorHandler.getErrorStats();

    return {
      ...baseStats,
      performance: this.metrics,
      errorAnalysis: errorStats,
      uptime: process.uptime(),
      timestamp: new Date().toISOString()
    };
  }
}

module.exports = TalabatWebhookReceiver;