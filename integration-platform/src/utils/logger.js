/**
 * Enhanced Logging Utility for Talabat Integration
 * Provides structured logging with different levels and categories
 */

class Logger {
  constructor(context = 'NEXARA') {
    this.context = context;
    this.logLevels = {
      ERROR: 0,
      WARN: 1,
      INFO: 2,
      DEBUG: 3
    };
    this.currentLevel = process.env.LOG_LEVEL ?
      this.logLevels[process.env.LOG_LEVEL.toUpperCase()] : this.logLevels.INFO;
  }

  /**
   * Format timestamp for consistent logging
   */
  getTimestamp() {
    return new Date().toISOString();
  }

  /**
   * Format log entry with context and metadata
   */
  formatLog(level, message, metadata = {}) {
    const logEntry = {
      timestamp: this.getTimestamp(),
      level,
      context: this.context,
      message,
      ...(Object.keys(metadata).length > 0 && { metadata })
    };

    return logEntry;
  }

  /**
   * Log error messages
   */
  error(message, error = null, metadata = {}) {
    if (this.currentLevel >= this.logLevels.ERROR) {
      const logData = this.formatLog('ERROR', message, {
        ...metadata,
        ...(error && {
          error: {
            name: error.name,
            message: error.message,
            stack: error.stack
          }
        })
      });

      console.error('❌', JSON.stringify(logData, null, 2));
    }
  }

  /**
   * Log warning messages
   */
  warn(message, metadata = {}) {
    if (this.currentLevel >= this.logLevels.WARN) {
      const logData = this.formatLog('WARN', message, metadata);
      console.warn('⚠️', JSON.stringify(logData, null, 2));
    }
  }

  /**
   * Log info messages
   */
  info(message, metadata = {}) {
    if (this.currentLevel >= this.logLevels.INFO) {
      const logData = this.formatLog('INFO', message, metadata);
      console.log('ℹ️', JSON.stringify(logData, null, 2));
    }
  }

  /**
   * Log debug messages
   */
  debug(message, metadata = {}) {
    if (this.currentLevel >= this.logLevels.DEBUG) {
      const logData = this.formatLog('DEBUG', message, metadata);
      console.log('🐛', JSON.stringify(logData, null, 2));
    }
  }

  /**
   * Log webhook events specifically
   */
  webhook(provider, event, data = {}) {
    this.info(`${provider.toUpperCase()} webhook: ${event}`, {
      provider,
      event,
      data
    });
  }

  /**
   * Log transformation events
   */
  transform(provider, success, data = {}) {
    if (success) {
      this.info(`${provider.toUpperCase()} transformation successful`, {
        provider,
        transformation: 'success',
        data
      });
    } else {
      this.error(`${provider.toUpperCase()} transformation failed`, null, {
        provider,
        transformation: 'failed',
        data
      });
    }
  }

  /**
   * Log forwarding events
   */
  forward(provider, success, responseData = {}) {
    if (success) {
      this.info(`${provider.toUpperCase()} forwarding successful`, {
        provider,
        forwarding: 'success',
        response: responseData
      });
    } else {
      this.error(`${provider.toUpperCase()} forwarding failed`, null, {
        provider,
        forwarding: 'failed',
        response: responseData
      });
    }
  }

  /**
   * Log performance metrics
   */
  performance(operation, duration, metadata = {}) {
    this.info(`Performance: ${operation}`, {
      operation,
      duration: `${duration}ms`,
      performance: true,
      ...metadata
    });
  }

  /**
   * Create child logger with additional context
   */
  child(additionalContext) {
    const childLogger = new Logger(`${this.context}:${additionalContext}`);
    childLogger.currentLevel = this.currentLevel;
    return childLogger;
  }
}

module.exports = Logger;