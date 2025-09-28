import { app } from 'electron';
import log from 'electron-log';
import { join } from 'path';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { EventEmitter } from 'events';

export interface LogEntry {
  timestamp: string;
  level: 'debug' | 'info' | 'warn' | 'error' | 'fatal';
  message: string;
  meta?: any;
  category?: string;
}

export class LogService extends EventEmitter {
  private initialized = false;
  private logDir: string;
  private maxLogFiles = 10;
  private maxLogSize = 10 * 1024 * 1024; // 10MB
  private logBuffer: LogEntry[] = [];
  private maxBufferSize = 1000;

  constructor() {
    super();
    this.logDir = join(app.getPath('userData'), 'logs');
  }

  async initialize(): Promise<void> {
    try {
      log.info('Initializing LogService...');
      
      // Create logs directory
      this.ensureLogDirectory();
      
      // Configure electron-log
      this.configureElectronLog();
      
      // Set up log rotation
      this.setupLogRotation();
      
      this.initialized = true;
      log.info('LogService initialized successfully');
    } catch (error) {
      console.error('Failed to initialize LogService:', error);
      throw error;
    }
  }

  async shutdown(): Promise<void> {
    log.info('Shutting down LogService...');
    
    // Flush any remaining logs
    this.flushLogs();
    
    this.initialized = false;
    this.removeAllListeners();
  }

  debug(message: string, meta?: any, category?: string): void {
    this.log('debug', message, meta, category);
  }

  info(message: string, meta?: any, category?: string): void {
    this.log('info', message, meta, category);
  }

  warn(message: string, meta?: any, category?: string): void {
    this.log('warn', message, meta, category);
  }

  error(message: string, meta?: any, category?: string): void {
    this.log('error', message, meta, category);
  }

  fatal(message: string, meta?: any, category?: string): void {
    this.log('fatal', message, meta, category);
  }

  private log(level: LogEntry['level'], message: string, meta?: any, category?: string): void {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      meta,
      category,
    };

    // Add to buffer
    this.logBuffer.push(entry);
    if (this.logBuffer.length > this.maxBufferSize) {
      this.logBuffer.shift(); // Remove oldest entry
    }

    // Log using electron-log
    const logMessage = category ? `[${category}] ${message}` : message;
    const logMeta = meta ? JSON.stringify(meta) : '';
    const fullMessage = logMeta ? `${logMessage} ${logMeta}` : logMessage;

    switch (level) {
      case 'debug':
        log.debug(fullMessage);
        break;
      case 'info':
        log.info(fullMessage);
        break;
      case 'warn':
        log.warn(fullMessage);
        break;
      case 'error':
        log.error(fullMessage);
        break;
      case 'fatal':
        log.error(`[FATAL] ${fullMessage}`);
        break;
    }

    // Emit log event
    this.emit('log', entry);
  }

  getRecentLogs(limit: number = 100): LogEntry[] {
    return this.logBuffer.slice(-limit);
  }

  getLogsByLevel(level: LogEntry['level'], limit: number = 100): LogEntry[] {
    return this.logBuffer
      .filter(entry => entry.level === level)
      .slice(-limit);
  }

  getLogsByCategory(category: string, limit: number = 100): LogEntry[] {
    return this.logBuffer
      .filter(entry => entry.category === category)
      .slice(-limit);
  }

  async exportLogs(filePath: string): Promise<void> {
    try {
      const logs = this.logBuffer.map(entry => {
        return {
          ...entry,
          meta: entry.meta ? JSON.stringify(entry.meta) : undefined,
        };
      });

      const exportData = {
        exportedAt: new Date().toISOString(),
        appVersion: app.getVersion(),
        platform: process.platform,
        arch: process.arch,
        nodeVersion: process.version,
        electronVersion: process.versions.electron,
        totalEntries: logs.length,
        logs,
      };

      writeFileSync(filePath, JSON.stringify(exportData, null, 2));
      log.info('Logs exported to:', filePath);
    } catch (error) {
      log.error('Failed to export logs:', error);
      throw error;
    }
  }

  async clearLogs(): Promise<void> {
    try {
      this.logBuffer = [];
      log.info('Log buffer cleared');
      this.emit('logs-cleared');
    } catch (error) {
      log.error('Failed to clear logs:', error);
      throw error;
    }
  }

  private ensureLogDirectory(): void {
    if (!existsSync(this.logDir)) {
      mkdirSync(this.logDir, { recursive: true });
    }
  }

  private configureElectronLog(): void {
    // Configure file transport
    log.transports.file.level = 'info';
    log.transports.file.maxSize = this.maxLogSize;
    log.transports.file.format = '{y}-{m}-{d} {h}:{i}:{s}.{ms} [{level}] {text}';
    log.transports.file.resolvePath = () => join(this.logDir, 'main.log');
    
    // Configure console transport
    log.transports.console.level = process.env.NODE_ENV === 'development' ? 'debug' : 'info';
    log.transports.console.format = '{y}-{m}-{d} {h}:{i}:{s}.{ms} [{level}] {text}';
    
    // Add custom transport for our buffer
    log.hooks.push((message, transport) => {
      if (transport === log.transports.console || transport === log.transports.file) {
        return message;
      }
      return false;
    });
  }

  private setupLogRotation(): void {
    // Rotate logs daily
    setInterval(() => {
      this.rotateLogs();
    }, 24 * 60 * 60 * 1000); // 24 hours
  }

  private rotateLogs(): void {
    try {
      const logFile = join(this.logDir, 'main.log');
      
      if (existsSync(logFile)) {
        const stats = require('fs').statSync(logFile);
        
        if (stats.size > this.maxLogSize) {
          const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
          const rotatedFile = join(this.logDir, `main-${timestamp}.log`);
          
          require('fs').renameSync(logFile, rotatedFile);
          log.info('Log file rotated:', rotatedFile);
          
          // Clean up old log files
          this.cleanupOldLogs();
        }
      }
    } catch (error) {
      log.error('Failed to rotate logs:', error);
    }
  }

  private cleanupOldLogs(): void {
    try {
      const fs = require('fs');
      const files = fs.readdirSync(this.logDir)
        .filter((file: string) => file.startsWith('main-') && file.endsWith('.log'))
        .map((file: string) => ({
          name: file,
          path: join(this.logDir, file),
          stats: fs.statSync(join(this.logDir, file)),
        }))
        .sort((a: any, b: any) => b.stats.mtime.getTime() - a.stats.mtime.getTime());

      // Keep only the most recent log files
      if (files.length > this.maxLogFiles) {
        const filesToDelete = files.slice(this.maxLogFiles);
        
        filesToDelete.forEach((file: any) => {
          fs.unlinkSync(file.path);
          log.info('Deleted old log file:', file.name);
        });
      }
    } catch (error) {
      log.error('Failed to cleanup old logs:', error);
    }
  }

  private flushLogs(): void {
    // Force flush any pending logs
    if (this.logBuffer.length > 0) {
      log.info(`Flushing ${this.logBuffer.length} log entries`);
    }
  }

  isInitialized(): boolean {
    return this.initialized;
  }

  getLogDirectory(): string {
    return this.logDir;
  }

  getLogStats(): {
    bufferSize: number;
    maxBufferSize: number;
    logDirectory: string;
    initialized: boolean;
  } {
    return {
      bufferSize: this.logBuffer.length,
      maxBufferSize: this.maxBufferSize,
      logDirectory: this.logDir,
      initialized: this.initialized,
    };
  }
}