/**
 * Rate Limiter Implementation
 *
 * Provides protection against:
 * - DoS attacks
 * - Resource exhaustion
 * - Excessive API usage
 * - Automated abuse
 */

class RateLimiter {
  constructor(service, options = {}) {
    this.service = service;
    this.log = service.log;

    // Configuration
    this.options = {
      windowMs: options.windowMs || 15 * 60 * 1000, // 15 minutes
      maxRequests: options.maxRequests || 100,
      keyGenerator: options.keyGenerator || this.defaultKeyGenerator,
      skipSuccessfulRequests: options.skipSuccessfulRequests || false,
      skipFailedRequests: options.skipFailedRequests || false,
      message: options.message || 'Too many requests from this IP',
      standardHeaders: options.standardHeaders !== false,
      legacyHeaders: options.legacyHeaders !== false,
      ...options
    };

    // Request tracking
    this.clients = new Map();
    this.cleanupInterval = null;

    // Statistics
    this.stats = {
      totalRequests: 0,
      blockedRequests: 0,
      uniqueIPs: 0,
      resetTime: Date.now() + this.options.windowMs
    };

    // Start cleanup timer
    this.startCleanup();

    this.log.info('🛡️ Rate Limiter initialized');
  }

  checkLimit(req, res, next) {
    this.stats.totalRequests++;

    const key = this.options.keyGenerator(req);
    const now = Date.now();

    // Get or create client record
    let client = this.clients.get(key);
    if (!client) {
      client = {
        count: 0,
        resetTime: now + this.options.windowMs,
        firstRequest: now
      };
      this.clients.set(key, client);
      this.stats.uniqueIPs = this.clients.size;
    }

    // Reset if window expired
    if (now > client.resetTime) {
      client.count = 0;
      client.resetTime = now + this.options.windowMs;
      client.firstRequest = now;
    }

    // Increment request count
    client.count++;

    // Check if limit exceeded
    if (client.count > this.options.maxRequests) {
      this.stats.blockedRequests++;

      this.log.warn(`🚫 Rate limit exceeded for ${key}`, {
        requests: client.count,
        limit: this.options.maxRequests,
        window: this.options.windowMs,
        ip: req.ip,
        userAgent: req.headers['user-agent']
      });

      // Set rate limit headers
      this.setRateLimitHeaders(res, client, true);

      return res.status(429).json({
        success: false,
        error: this.options.message,
        limit: this.options.maxRequests,
        window: this.options.windowMs,
        retryAfter: Math.ceil((client.resetTime - now) / 1000),
        timestamp: new Date().toISOString()
      });
    }

    // Set rate limit headers for successful requests
    this.setRateLimitHeaders(res, client, false);

    next();
  }

  setRateLimitHeaders(res, client, isBlocked) {
    const now = Date.now();
    const remaining = Math.max(0, this.options.maxRequests - client.count);
    const resetTime = Math.ceil(client.resetTime / 1000);
    const retryAfter = Math.ceil((client.resetTime - now) / 1000);

    if (this.options.standardHeaders) {
      res.setHeader('RateLimit-Limit', this.options.maxRequests);
      res.setHeader('RateLimit-Remaining', remaining);
      res.setHeader('RateLimit-Reset', resetTime);

      if (isBlocked) {
        res.setHeader('Retry-After', retryAfter);
      }
    }

    if (this.options.legacyHeaders) {
      res.setHeader('X-RateLimit-Limit', this.options.maxRequests);
      res.setHeader('X-RateLimit-Remaining', remaining);
      res.setHeader('X-RateLimit-Reset', resetTime);

      if (isBlocked) {
        res.setHeader('X-Retry-After', retryAfter);
      }
    }
  }

  defaultKeyGenerator(req) {
    return req.ip || req.connection.remoteAddress || 'unknown';
  }

  startCleanup() {
    // Clean expired entries every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 5 * 60 * 1000);
  }

  cleanup() {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [key, client] of this.clients.entries()) {
      if (now > client.resetTime + this.options.windowMs) {
        this.clients.delete(key);
        cleanedCount++;
      }
    }

    this.stats.uniqueIPs = this.clients.size;

    if (cleanedCount > 0) {
      this.log.debug(`🧹 Rate limiter cleanup: removed ${cleanedCount} expired entries`);
    }
  }

  getStatus() {
    return {
      stats: this.stats,
      activeClients: this.clients.size,
      configuration: {
        windowMs: this.options.windowMs,
        maxRequests: this.options.maxRequests
      },
      topClients: this.getTopClients(10),
      timestamp: new Date().toISOString()
    };
  }

  getTopClients(limit = 10) {
    const clients = Array.from(this.clients.entries())
      .map(([key, client]) => ({
        key: key.substring(0, 15) + '...', // Truncate for privacy
        requests: client.count,
        firstRequest: client.firstRequest,
        resetTime: client.resetTime
      }))
      .sort((a, b) => b.requests - a.requests)
      .slice(0, limit);

    return clients;
  }

  reset() {
    this.clients.clear();
    this.stats = {
      totalRequests: 0,
      blockedRequests: 0,
      uniqueIPs: 0,
      resetTime: Date.now() + this.options.windowMs
    };

    this.log.info('🔄 Rate limiter reset');
  }

  shutdown() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }

    this.clients.clear();
    this.log.info('🛑 Rate limiter shutdown');
  }
}

module.exports = RateLimiter;