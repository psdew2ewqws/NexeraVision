const fs = require('fs/promises');
const path = require('path');
const os = require('os');

/**
 * Comprehensive Print Logger Service
 * Provides detailed logging with multiple levels, file rotation, and debugging capabilities
 */
class PrintLoggerService {
  constructor() {
    this.logLevels = {
      ERROR: 0,
      WARN: 1,
      INFO: 2,
      DEBUG: 3,
      TRACE: 4
    };

    this.currentLevel = this.logLevels.INFO;
    this.logDir = path.join(os.homedir(), '.printermaster', 'logs');
    this.maxLogSize = 10 * 1024 * 1024; // 10MB
    this.maxLogFiles = 5;
    this.sessionId = this.generateSessionId();
    this.isInitialized = false;
  }

  /**
   * Initialize the logger
   */
  async initialize(logLevel = 'INFO') {
    try {
      // Create log directory if it doesn't exist
      await fs.mkdir(this.logDir, { recursive: true });

      // Set log level
      this.currentLevel = this.logLevels[logLevel.toUpperCase()] || this.logLevels.INFO;

      // Clean up old log files
      await this.rotateLogFiles();

      this.isInitialized = true;

      await this.info('🚀 [LOGGER] Print logger service initialized', {
        sessionId: this.sessionId,
        logLevel: logLevel,
        logDir: this.logDir
      });

    } catch (error) {
      console.error('Failed to initialize print logger:', error);
    }
  }

  /**
   * Generate unique session ID
   */
  generateSessionId() {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 6);
    return `session_${timestamp}_${random}`;
  }

  /**
   * Log error message
   */
  async error(message, context = {}) {
    return this.log('ERROR', message, context);
  }

  /**
   * Log warning message
   */
  async warn(message, context = {}) {
    return this.log('WARN', message, context);
  }

  /**
   * Log info message
   */
  async info(message, context = {}) {
    return this.log('INFO', message, context);
  }

  /**
   * Log debug message
   */
  async debug(message, context = {}) {
    return this.log('DEBUG', message, context);
  }

  /**
   * Log trace message (most verbose)
   */
  async trace(message, context = {}) {
    return this.log('TRACE', message, context);
  }

  /**
   * Log printer-specific events
   */
  async logPrinterEvent(eventType, printerId, message, context = {}) {
    return this.log('INFO', `[PRINTER-EVENT] ${eventType}: ${message}`, {
      eventType,
      printerId,
      ...context
    });
  }

  /**
   * Log print job events
   */
  async logJobEvent(jobId, jobType, status, message, context = {}) {
    return this.log('INFO', `[JOB-EVENT] ${jobType}/${status}: ${message}`, {
      jobId,
      jobType,
      status,
      ...context
    });
  }

  /**
   * Log WebSocket events
   */
  async logWebSocketEvent(eventType, message, context = {}) {
    return this.log('DEBUG', `[WS-EVENT] ${eventType}: ${message}`, {
      eventType,
      ...context
    });
  }

  /**
   * Log performance metrics
   */
  async logPerformance(operation, duration, context = {}) {
    const level = duration > 5000 ? 'WARN' : 'DEBUG'; // Warn if operation takes more than 5 seconds
    return this.log(level, `[PERFORMANCE] ${operation} completed in ${duration}ms`, {
      operation,
      duration,
      ...context
    });
  }

  /**
   * Main logging method
   */
  async log(level, message, context = {}) {
    if (!this.shouldLog(level)) {
      return;
    }

    const logEntry = this.createLogEntry(level, message, context);

    // Console output
    this.outputToConsole(logEntry);

    // File output (if initialized)
    if (this.isInitialized) {
      await this.outputToFile(logEntry);
    }

    return logEntry;
  }

  /**
   * Check if message should be logged based on current level
   */
  shouldLog(level) {
    return this.logLevels[level] <= this.currentLevel;
  }

  /**
   * Create structured log entry
   */
  createLogEntry(level, message, context) {
    return {
      timestamp: new Date().toISOString(),
      level,
      message,
      sessionId: this.sessionId,
      pid: process.pid,
      context: {
        ...context,
        memoryUsage: process.memoryUsage(),
        platform: os.platform(),
        arch: os.arch()
      }
    };
  }

  /**
   * Output log entry to console with colors
   */
  outputToConsole(logEntry) {
    const colors = {
      ERROR: '\x1b[31m', // Red
      WARN: '\x1b[33m',  // Yellow
      INFO: '\x1b[36m',  // Cyan
      DEBUG: '\x1b[35m', // Magenta
      TRACE: '\x1b[37m'  // White
    };

    const reset = '\x1b[0m';
    const color = colors[logEntry.level] || colors.INFO;

    const timestamp = new Date(logEntry.timestamp).toLocaleTimeString();
    const contextStr = Object.keys(logEntry.context).length > 0 ?
      ` | ${JSON.stringify(logEntry.context, null, 0)}` : '';

    console.log(
      `${color}[${timestamp}] ${logEntry.level}${reset} ${logEntry.message}${contextStr}`
    );
  }

  /**
   * Output log entry to file
   */
  async outputToFile(logEntry) {
    try {
      const logFile = path.join(this.logDir, 'printermaster.log');
      const logLine = JSON.stringify(logEntry) + '\n';

      await fs.appendFile(logFile, logLine, 'utf8');

      // Check if log rotation is needed
      const stats = await fs.stat(logFile);
      if (stats.size > this.maxLogSize) {
        await this.rotateLogFiles();
      }

    } catch (error) {
      console.error('Failed to write to log file:', error);
    }
  }

  /**
   * Rotate log files when they get too large
   */
  async rotateLogFiles() {
    try {
      const currentLogFile = path.join(this.logDir, 'printermaster.log');

      // Check if current log file exists and needs rotation
      try {
        const stats = await fs.stat(currentLogFile);
        if (stats.size < this.maxLogSize) {
          return; // No rotation needed
        }
      } catch (error) {
        // File doesn't exist, no rotation needed
        return;
      }

      // Rotate existing log files
      for (let i = this.maxLogFiles - 1; i >= 1; i--) {
        const oldFile = path.join(this.logDir, `printermaster.log.${i}`);
        const newFile = path.join(this.logDir, `printermaster.log.${i + 1}`);

        try {
          await fs.rename(oldFile, newFile);
        } catch (error) {
          // File doesn't exist, continue
        }
      }

      // Move current log to .1
      const firstRotatedFile = path.join(this.logDir, 'printermaster.log.1');
      await fs.rename(currentLogFile, firstRotatedFile);

      // Clean up old files beyond max count
      const oldFile = path.join(this.logDir, `printermaster.log.${this.maxLogFiles + 1}`);
      try {
        await fs.unlink(oldFile);
      } catch (error) {
        // File doesn't exist, ignore
      }

    } catch (error) {
      console.error('Failed to rotate log files:', error);
    }
  }

  /**
   * Set log level
   */
  setLogLevel(level) {
    const newLevel = this.logLevels[level.toUpperCase()];
    if (newLevel !== undefined) {
      this.currentLevel = newLevel;
      this.info(`Log level changed to: ${level}`);
    } else {
      this.warn(`Invalid log level: ${level}. Valid levels: ${Object.keys(this.logLevels).join(', ')}`);
    }
  }

  /**
   * Get current log level
   */
  getLogLevel() {
    for (const [level, value] of Object.entries(this.logLevels)) {
      if (value === this.currentLevel) {
        return level;
      }
    }
    return 'INFO';
  }

  /**
   * Create context logger for specific component
   */
  createComponentLogger(component) {
    return {
      error: (message, context = {}) => this.error(`[${component}] ${message}`, context),
      warn: (message, context = {}) => this.warn(`[${component}] ${message}`, context),
      info: (message, context = {}) => this.info(`[${component}] ${message}`, context),
      debug: (message, context = {}) => this.debug(`[${component}] ${message}`, context),
      trace: (message, context = {}) => this.trace(`[${component}] ${message}`, context),
      logPrinterEvent: (eventType, printerId, message, context = {}) =>
        this.logPrinterEvent(eventType, printerId, message, { component, ...context }),
      logJobEvent: (jobId, jobType, status, message, context = {}) =>
        this.logJobEvent(jobId, jobType, status, message, { component, ...context }),
      logWebSocketEvent: (eventType, message, context = {}) =>
        this.logWebSocketEvent(eventType, message, { component, ...context }),
      logPerformance: (operation, duration, context = {}) =>
        this.logPerformance(operation, duration, { component, ...context })
    };
  }

  /**
   * Get recent log entries
   */
  async getRecentLogs(count = 100, level = null) {
    try {
      const logFile = path.join(this.logDir, 'printermaster.log');
      const data = await fs.readFile(logFile, 'utf8');

      const lines = data.trim().split('\n').slice(-count);
      const logs = [];

      for (const line of lines) {
        try {
          const logEntry = JSON.parse(line);
          if (!level || logEntry.level === level) {
            logs.push(logEntry);
          }
        } catch (error) {
          // Skip invalid log lines
        }
      }

      return logs;

    } catch (error) {
      this.error('Failed to read recent logs:', { error: error.message });
      return [];
    }
  }

  /**
   * Export logs for debugging
   */
  async exportLogs() {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const exportFile = path.join(this.logDir, `debug-export-${timestamp}.json`);

      const logs = await this.getRecentLogs(1000); // Last 1000 entries
      const systemInfo = {
        platform: os.platform(),
        arch: os.arch(),
        nodeVersion: process.version,
        memoryUsage: process.memoryUsage(),
        uptime: process.uptime(),
        sessionId: this.sessionId,
        exportTime: new Date().toISOString()
      };

      const exportData = {
        systemInfo,
        logs,
        logCount: logs.length
      };

      await fs.writeFile(exportFile, JSON.stringify(exportData, null, 2), 'utf8');

      await this.info('Debug logs exported', { exportFile, logCount: logs.length });
      return exportFile;

    } catch (error) {
      await this.error('Failed to export logs:', { error: error.message });
      throw error;
    }
  }

  /**
   * Get log statistics
   */
  async getLogStatistics() {
    try {
      const logs = await this.getRecentLogs(1000);

      const stats = {
        total: logs.length,
        byLevel: {},
        timeRange: {
          start: logs.length > 0 ? logs[0].timestamp : null,
          end: logs.length > 0 ? logs[logs.length - 1].timestamp : null
        },
        recentErrors: logs.filter(log => log.level === 'ERROR').slice(-10),
        sessionId: this.sessionId,
        currentLevel: this.getLogLevel()
      };

      // Count by level
      for (const level of Object.keys(this.logLevels)) {
        stats.byLevel[level] = logs.filter(log => log.level === level).length;
      }

      return stats;

    } catch (error) {
      await this.error('Failed to get log statistics:', { error: error.message });
      return {
        total: 0,
        byLevel: {},
        timeRange: { start: null, end: null },
        recentErrors: [],
        sessionId: this.sessionId,
        currentLevel: this.getLogLevel(),
        error: error.message
      };
    }
  }

  /**
   * Clear old logs
   */
  async clearLogs(olderThanDays = 7) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

      const files = await fs.readdir(this.logDir);
      let deletedCount = 0;

      for (const file of files) {
        if (file.startsWith('printermaster.log.') || file.startsWith('debug-export-')) {
          const filePath = path.join(this.logDir, file);
          const stats = await fs.stat(filePath);

          if (stats.mtime < cutoffDate) {
            await fs.unlink(filePath);
            deletedCount++;
          }
        }
      }

      await this.info(`Cleared ${deletedCount} old log files older than ${olderThanDays} days`);
      return deletedCount;

    } catch (error) {
      await this.error('Failed to clear old logs:', { error: error.message });
      return 0;
    }
  }
}

module.exports = PrintLoggerService;