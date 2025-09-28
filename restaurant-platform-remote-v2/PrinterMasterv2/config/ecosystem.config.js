/**
 * PM2 Enterprise Ecosystem Configuration
 *
 * This configuration provides bulletproof process management for PrinterMaster:
 * - Zero-downtime restarts
 * - Health check URL monitoring
 * - Advanced logging with rotation
 * - Resource limits and monitoring
 * - Exponential backoff restart strategy
 * - Environment-specific configurations
 * - Clustering support
 */

module.exports = {
  apps: [
    {
      // Basic Application Configuration
      name: 'printermaster-service',
      script: './service/service-main.js',
      cwd: '/home/admin/restaurant-platform-remote-v2/PrinterMasterv2',

      // Process Management
      instances: 1, // Single instance for hardware access (USB printers)
      exec_mode: 'fork', // Fork mode for hardware access

      // Auto Restart Configuration
      autorestart: true,
      watch: false, // Disabled for production stability
      max_memory_restart: '1G',
      restart_delay: 4000, // 4 seconds initial delay

      // Advanced Restart Strategy
      min_uptime: '10s', // Minimum uptime before considering started
      max_restarts: 15, // Maximum restarts within restart_window
      restart_window: '15m', // Time window for max_restarts

      // Exponential Backoff
      exp_backoff_restart_delay: 100, // Initial delay in ms

      // Health Check Monitoring
      health_check_url: 'http://localhost:8182/health',
      health_check_grace_period: 3000, // 3 seconds grace period

      // Environment Variables
      env: {
        NODE_ENV: 'production',
        PRINTER_SERVICE_PORT: 8182,
        LOG_LEVEL: 'info',
        PM2_SERVE_PATH: '.',
        PM2_SERVE_PORT: 8183,
        PM2_SERVE_SPA: 'false',
        PM2_SERVE_HOMEPAGE: './service/service-main.js',

        // Service Configuration
        AUTO_RESTART_ON_FAILURE: 'true',
        MAX_RESTART_ATTEMPTS: '10',
        RESTART_DELAY_MS: '5000',

        // USB and Hardware
        USB_MONITORING_INTERVAL: '5000',
        PRINTER_DISCOVERY_INTERVAL: '30000',
        ENABLE_USB_HOTPLUG: 'true',

        // Health Monitoring
        HEALTH_CHECK_INTERVAL: '30000',
        MEMORY_WARNING_THRESHOLD: '512',
        CPU_WARNING_THRESHOLD: '85',

        // Logging
        LOG_MAX_SIZE: '10MB',
        LOG_MAX_FILES: '5',
        LOG_DATE_PATTERN: 'YYYY-MM-DD',

        // Performance
        UV_THREADPOOL_SIZE: '4',
        NODE_OPTIONS: '--max-old-space-size=1024'
      },

      // Development Environment Override
      env_development: {
        NODE_ENV: 'development',
        LOG_LEVEL: 'debug',
        PRINTER_SERVICE_PORT: 8182,
        AUTO_RESTART_ON_FAILURE: 'false',
        HEALTH_CHECK_INTERVAL: '10000'
      },

      // Staging Environment
      env_staging: {
        NODE_ENV: 'staging',
        LOG_LEVEL: 'debug',
        PRINTER_SERVICE_PORT: 8182,
        HEALTH_CHECK_INTERVAL: '15000'
      },

      // Logging Configuration
      log_type: 'json',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',

      // Output Logs
      out_file: './logs/pm2-out.log',
      error_file: './logs/pm2-error.log',
      log_file: './logs/pm2-combined.log',

      // Log Rotation
      max_size: '10M',
      retain: 5,
      compress: true,
      dateFormat: 'YYYY-MM-DD_HH-mm-ss',
      workerInterval: 30,
      rotateModule: true,

      // Process Monitoring
      monitoring: true,
      pmx: true,

      // Advanced PM2 Features
      source_map_support: true,
      instance_var: 'INSTANCE_ID',

      // Kill Timeout
      kill_timeout: 5000,
      listen_timeout: 3000,

      // Graceful Shutdown
      shutdown_with_message: true,
      wait_ready: true,

      // Process Title
      name: 'printermaster-service',

      // Working Directory
      cwd: '/home/admin/restaurant-platform-remote-v2/PrinterMasterv2',

      // Additional Arguments
      args: ['--color'],

      // Node.js Arguments
      node_args: [
        '--max-old-space-size=1024',
        '--enable-source-maps'
      ],

      // Merge Logs
      merge_logs: true,

      // Time Zone
      time: true,

      // Auto Dump
      autorestart: true,
      vizion: true,

      // Process Versioning
      increment_var: 'PORT',

      // Custom Metrics and Monitoring
      custom_metrics: {
        'Printers Connected': function() {
          // This would be populated by the service
          return global.printerCount || 0;
        },
        'Print Jobs Processed': function() {
          return global.printJobCount || 0;
        },
        'Service Uptime': function() {
          return process.uptime();
        }
      }
    },

    // Optional: Separate monitoring service
    {
      name: 'printermaster-monitor',
      script: './service/monitor.js',
      cwd: '/home/admin/restaurant-platform-remote-v2/PrinterMasterv2',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,

      env: {
        NODE_ENV: 'production',
        MONITOR_PORT: 8184,
        TARGET_SERVICE_URL: 'http://localhost:8182',
        MONITOR_INTERVAL: '30000',
        LOG_LEVEL: 'info'
      },

      env_development: {
        NODE_ENV: 'development',
        LOG_LEVEL: 'debug',
        MONITOR_INTERVAL: '10000'
      },

      // Logging
      out_file: './logs/monitor-out.log',
      error_file: './logs/monitor-error.log',
      log_file: './logs/monitor-combined.log',

      // Lower priority than main service
      restart_delay: 2000,
      min_uptime: '5s',
      max_restarts: 10,

      // Depends on main service
      wait_ready: false,
      listen_timeout: 2000
    }
  ],

  // Deployment Configuration
  deploy: {
    production: {
      user: 'admin',
      host: 'localhost',
      ref: 'origin/main',
      repo: 'git@github.com:restaurant-platform/printer-master-v2.git',
      path: '/home/admin/restaurant-platform-remote-v2/PrinterMasterv2',
      'pre-deploy-local': '',
      'post-deploy': 'npm install && pm2 reload ecosystem.config.js --env production',
      'pre-setup': ''
    },

    staging: {
      user: 'admin',
      host: 'localhost',
      ref: 'origin/staging',
      repo: 'git@github.com:restaurant-platform/printer-master-v2.git',
      path: '/home/admin/restaurant-platform-remote-v2/PrinterMasterv2-staging',
      'post-deploy': 'npm install && pm2 reload ecosystem.config.js --env staging'
    }
  },

  // Global PM2 Configuration
  pmx: {
    http: true,
    ignore_routes: ['/health', '/metrics'],
    errors: true,
    custom_probes: true,
    network: true,
    ports: true
  }
};

/**
 * Advanced Configuration Examples:
 *
 * 1. Start with specific environment:
 *    pm2 start ecosystem.config.js --env production
 *
 * 2. Reload with zero downtime:
 *    pm2 reload ecosystem.config.js
 *
 * 3. Monitor in real-time:
 *    pm2 monit
 *
 * 4. View logs:
 *    pm2 logs printermaster-service
 *
 * 5. Restart with graceful shutdown:
 *    pm2 gracefulReload printermaster-service
 *
 * 6. Scale instances (if needed):
 *    pm2 scale printermaster-service 2
 *
 * 7. Stop and delete:
 *    pm2 delete ecosystem.config.js
 *
 * 8. Startup script for auto-start:
 *    pm2 startup
 *    pm2 save
 *
 * 9. Health check monitoring:
 *    pm2 install pm2-auto-pull
 *    pm2 install pm2-logrotate
 *    pm2 install pm2-server-monit
 *
 * 10. Custom monitoring dashboard:
 *     pm2 web
 */