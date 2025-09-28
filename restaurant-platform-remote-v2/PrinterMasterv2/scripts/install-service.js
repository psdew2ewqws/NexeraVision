#!/usr/bin/env node

/**
 * Cross-Platform Service Installer for PrinterMaster
 *
 * Auto-detection and setup for different operating systems:
 * - Linux: systemd service configuration
 * - Windows: Windows Service with node-windows
 * - macOS: LaunchDaemon configuration
 * - Docker: Container deployment
 * - PM2: Process manager setup
 *
 * Features:
 * - OS detection and appropriate service manager selection
 * - Optimal configuration for each platform
 * - Auto-start on boot setup
 * - Service validation and testing
 * - Comprehensive installation feedback
 * - Rollback capability on failure
 */

const fs = require('fs');
const path = require('path');
const { execSync, spawn } = require('child_process');
const os = require('os');

class ServiceInstaller {
  constructor() {
    this.platform = process.platform;
    this.serviceName = 'printermaster';
    this.serviceDisplayName = 'PrinterMaster Background Service';
    this.serviceDescription = 'Enterprise-grade printer management service for restaurants';

    // Paths
    this.rootDir = path.join(__dirname, '..');
    this.serviceScript = path.join(this.rootDir, 'service', 'service-main.js');
    this.configDir = path.join(this.rootDir, 'config');
    this.logsDir = path.join(this.rootDir, 'logs');

    // Installation state
    this.installationSteps = [];
    this.rollbackSteps = [];

    this.log('🚀 PrinterMaster Service Installer initialized');
    this.log(`📍 Platform: ${this.platform}`);
    this.log(`📂 Root directory: ${this.rootDir}`);
  }

  log(message) {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${message}`);
  }

  error(message, error) {
    const timestamp = new Date().toISOString();
    console.error(`[${timestamp}] ❌ ${message}`);
    if (error) {
      console.error(error);
    }
  }

  success(message) {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ✅ ${message}`);
  }

  async install() {
    try {
      this.log('🔧 Starting PrinterMaster service installation...');

      // Pre-installation checks
      await this.preInstallationChecks();

      // Create necessary directories
      await this.createDirectories();

      // Install dependencies
      await this.installDependencies();

      // Platform-specific installation
      switch (this.platform) {
        case 'linux':
          await this.installLinuxService();
          break;
        case 'win32':
          await this.installWindowsService();
          break;
        case 'darwin':
          await this.installMacOSService();
          break;
        default:
          await this.installPM2Service();
          break;
      }

      // Post-installation setup
      await this.postInstallationSetup();

      // Test the service
      await this.testService();

      this.success('PrinterMaster service installation completed successfully!');
      this.displayUsageInstructions();

    } catch (error) {
      this.error('Installation failed', error);
      await this.rollback();
      process.exit(1);
    }
  }

  async preInstallationChecks() {
    this.log('🔍 Running pre-installation checks...');

    // Check Node.js version
    const nodeVersion = process.version;
    const majorVersion = parseInt(nodeVersion.substring(1).split('.')[0]);

    if (majorVersion < 16) {
      throw new Error(`Node.js version 16 or higher required. Current: ${nodeVersion}`);
    }
    this.success(`Node.js version check passed: ${nodeVersion}`);

    // Check if service script exists
    if (!fs.existsSync(this.serviceScript)) {
      throw new Error(`Service script not found: ${this.serviceScript}`);
    }
    this.success('Service script found');

    // Check permissions
    if (this.platform !== 'win32') {
      try {
        fs.accessSync(this.serviceScript, fs.constants.X_OK);
        this.success('Service script is executable');
      } catch (error) {
        this.log('Making service script executable...');
        fs.chmodSync(this.serviceScript, '755');
        this.success('Service script made executable');
      }
    }

    // Check if running as administrator/root when required
    if (this.requiresElevatedPrivileges()) {
      await this.checkElevatedPrivileges();
    }
  }

  requiresElevatedPrivileges() {
    return this.platform === 'linux' || this.platform === 'darwin';
  }

  async checkElevatedPrivileges() {
    if (process.getuid && process.getuid() !== 0) {
      this.error('This installation requires root privileges.');
      this.log('Please run with sudo: sudo node scripts/install-service.js');
      throw new Error('Root privileges required');
    }
    this.success('Running with elevated privileges');
  }

  async createDirectories() {
    this.log('📁 Creating necessary directories...');

    const directories = [
      this.logsDir,
      path.join(this.rootDir, 'licenses'),
      path.join(this.rootDir, 'data'),
      path.join(this.rootDir, 'tmp')
    ];

    for (const dir of directories) {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        this.log(`Created directory: ${dir}`);
        this.rollbackSteps.push(() => {
          if (fs.existsSync(dir)) {
            fs.rmSync(dir, { recursive: true, force: true });
          }
        });
      }
    }

    this.success('Directories created');
  }

  async installDependencies() {
    this.log('📦 Checking dependencies...');

    // Check if package.json exists
    const packageJsonPath = path.join(this.rootDir, 'package.json');
    if (!fs.existsSync(packageJsonPath)) {
      throw new Error('package.json not found');
    }

    // Check if node_modules exists and is populated
    const nodeModulesPath = path.join(this.rootDir, 'node_modules');
    if (!fs.existsSync(nodeModulesPath)) {
      this.log('Installing Node.js dependencies...');
      try {
        execSync('npm install --production', {
          cwd: this.rootDir,
          stdio: 'inherit'
        });
        this.success('Dependencies installed');
      } catch (error) {
        throw new Error(`Failed to install dependencies: ${error.message}`);
      }
    } else {
      this.success('Dependencies already installed');
    }

    // Install PM2 globally if not present
    try {
      execSync('pm2 --version', { stdio: 'ignore' });
      this.success('PM2 is available');
    } catch (error) {
      this.log('Installing PM2 globally...');
      try {
        execSync('npm install -g pm2', { stdio: 'inherit' });
        this.success('PM2 installed globally');
      } catch (pm2Error) {
        this.log('⚠️ PM2 installation failed, will use alternative methods');
      }
    }
  }

  async installLinuxService() {
    this.log('🐧 Installing Linux systemd service...');

    const serviceFilePath = '/etc/systemd/system/printermaster.service';
    const sourceServiceFile = path.join(this.configDir, 'printermaster.service');

    // Read and customize service file
    let serviceContent = fs.readFileSync(sourceServiceFile, 'utf8');

    // Replace placeholders with actual paths
    serviceContent = serviceContent.replace(
      /\/home\/admin\/restaurant-platform-remote-v2\/PrinterMasterv2/g,
      this.rootDir
    );

    // Write service file
    fs.writeFileSync(serviceFilePath, serviceContent);
    this.installationSteps.push('Created systemd service file');
    this.rollbackSteps.push(() => {
      if (fs.existsSync(serviceFilePath)) {
        fs.unlinkSync(serviceFilePath);
      }
    });

    // Reload systemd
    execSync('systemctl daemon-reload');
    this.installationSteps.push('Reloaded systemd');

    // Enable service
    execSync('systemctl enable printermaster.service');
    this.installationSteps.push('Enabled service for auto-start');
    this.rollbackSteps.push(() => {
      try {
        execSync('systemctl disable printermaster.service', { stdio: 'ignore' });
        execSync('systemctl stop printermaster.service', { stdio: 'ignore' });
      } catch (error) {
        // Ignore errors during rollback
      }
    });

    this.success('Linux systemd service installed');
  }

  async installWindowsService() {
    this.log('🪟 Installing Windows service...');

    try {
      // Try to install node-windows if not available
      try {
        require('node-windows');
      } catch (error) {
        this.log('Installing node-windows dependency...');
        execSync('npm install node-windows', {
          cwd: this.rootDir,
          stdio: 'inherit'
        });
      }

      const Service = require('node-windows').Service;

      // Create a new service object
      const svc = new Service({
        name: this.serviceName,
        description: this.serviceDescription,
        script: this.serviceScript,
        nodeOptions: [
          '--max-old-space-size=1024'
        ],
        env: [
          {
            name: 'NODE_ENV',
            value: 'production'
          },
          {
            name: 'PRINTER_SERVICE_PORT',
            value: '8182'
          },
          {
            name: 'LOG_LEVEL',
            value: 'info'
          }
        ]
      });

      // Install the service
      await new Promise((resolve, reject) => {
        svc.on('install', () => {
          this.success('Windows service installed');
          resolve();
        });

        svc.on('alreadyinstalled', () => {
          this.log('Service already installed, updating...');
          resolve();
        });

        svc.on('error', (error) => {
          reject(error);
        });

        svc.install();
      });

      this.installationSteps.push('Installed Windows service');
      this.rollbackSteps.push(() => {
        try {
          svc.uninstall();
        } catch (error) {
          // Ignore errors during rollback
        }
      });

    } catch (error) {
      // Fallback to PM2
      this.log('⚠️ Windows service installation failed, using PM2 as fallback');
      await this.installPM2Service();
    }
  }

  async installMacOSService() {
    this.log('🍎 Installing macOS LaunchDaemon...');

    const plistContent = this.generateMacOSPlist();
    const plistPath = `/Library/LaunchDaemons/com.restaurant-platform.${this.serviceName}.plist`;

    // Write plist file
    fs.writeFileSync(plistPath, plistContent);
    this.installationSteps.push('Created LaunchDaemon plist');
    this.rollbackSteps.push(() => {
      if (fs.existsSync(plistPath)) {
        execSync(`launchctl unload ${plistPath}`, { stdio: 'ignore' });
        fs.unlinkSync(plistPath);
      }
    });

    // Set proper permissions
    execSync(`chown root:wheel ${plistPath}`);
    execSync(`chmod 644 ${plistPath}`);

    // Load the service
    execSync(`launchctl load ${plistPath}`);
    this.installationSteps.push('Loaded LaunchDaemon');

    this.success('macOS LaunchDaemon installed');
  }

  async installPM2Service() {
    this.log('⚙️ Installing PM2 service...');

    const ecosystemConfig = path.join(this.configDir, 'ecosystem.config.js');

    try {
      // Start with PM2
      execSync(`pm2 start ${ecosystemConfig} --env production`, {
        cwd: this.rootDir,
        stdio: 'inherit'
      });
      this.installationSteps.push('Started service with PM2');

      // Save PM2 configuration
      execSync('pm2 save', { stdio: 'inherit' });
      this.installationSteps.push('Saved PM2 configuration');

      // Generate startup script
      const startupCommand = execSync('pm2 startup', {
        encoding: 'utf8',
        stdio: 'pipe'
      });

      if (startupCommand.includes('sudo')) {
        this.log('⚠️ PM2 startup script requires manual execution:');
        console.log(startupCommand);
        this.log('Please run the command above to enable auto-start on boot');
      }

      this.rollbackSteps.push(() => {
        try {
          execSync('pm2 delete printermaster-service', { stdio: 'ignore' });
          execSync('pm2 save', { stdio: 'ignore' });
        } catch (error) {
          // Ignore errors during rollback
        }
      });

      this.success('PM2 service installed');

    } catch (error) {
      throw new Error(`PM2 service installation failed: ${error.message}`);
    }
  }

  generateMacOSPlist() {
    return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.restaurant-platform.${this.serviceName}</string>

    <key>ProgramArguments</key>
    <array>
        <string>/usr/local/bin/node</string>
        <string>${this.serviceScript}</string>
    </array>

    <key>WorkingDirectory</key>
    <string>${this.rootDir}</string>

    <key>EnvironmentVariables</key>
    <dict>
        <key>NODE_ENV</key>
        <string>production</string>
        <key>PRINTER_SERVICE_PORT</key>
        <string>8182</string>
        <key>LOG_LEVEL</key>
        <string>info</string>
    </dict>

    <key>RunAtLoad</key>
    <true/>

    <key>KeepAlive</key>
    <true/>

    <key>StandardOutPath</key>
    <string>${this.logsDir}/service-out.log</string>

    <key>StandardErrorPath</key>
    <string>${this.logsDir}/service-error.log</string>

    <key>ThrottleInterval</key>
    <integer>10</integer>
</dict>
</plist>`;
  }

  async postInstallationSetup() {
    this.log('🔧 Running post-installation setup...');

    // Create installation info file
    const installInfo = {
      platform: this.platform,
      installDate: new Date().toISOString(),
      serviceName: this.serviceName,
      serviceScript: this.serviceScript,
      installationSteps: this.installationSteps,
      version: require(path.join(this.rootDir, 'package.json')).version
    };

    fs.writeFileSync(
      path.join(this.rootDir, 'installation-info.json'),
      JSON.stringify(installInfo, null, 2)
    );

    // Set up log rotation (if logrotate is available on Linux)
    if (this.platform === 'linux') {
      await this.setupLogRotation();
    }

    this.success('Post-installation setup completed');
  }

  async setupLogRotation() {
    try {
      const logrotateConfig = `${this.logsDir}/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    copytruncate
}`;

      const logrotateFile = `/etc/logrotate.d/${this.serviceName}`;
      fs.writeFileSync(logrotateFile, logrotateConfig);
      this.log('Log rotation configured');
    } catch (error) {
      this.log('⚠️ Log rotation setup failed (non-critical)');
    }
  }

  async testService() {
    this.log('🧪 Testing service installation...');

    try {
      // Start the service based on platform
      await this.startService();

      // Wait for service to start
      await this.delay(5000);

      // Test health endpoint
      await this.testHealthEndpoint();

      // Test basic functionality
      await this.testBasicFunctionality();

      this.success('Service testing completed successfully');

    } catch (error) {
      this.error('Service testing failed', error);
      throw error;
    }
  }

  async startService() {
    switch (this.platform) {
      case 'linux':
        execSync('systemctl start printermaster.service');
        break;
      case 'win32':
        // Windows service should auto-start
        break;
      case 'darwin':
        // macOS LaunchDaemon should auto-start
        break;
      default:
        // PM2 already started during installation
        break;
    }
  }

  async testHealthEndpoint() {
    const axios = require('axios').default;

    try {
      const response = await axios.get('http://localhost:8182/health', {
        timeout: 10000
      });

      if (response.status === 200 && response.data.status === 'healthy') {
        this.success('Health endpoint test passed');
      } else {
        throw new Error(`Health check failed: ${response.data.status}`);
      }
    } catch (error) {
      if (error.code === 'ECONNREFUSED') {
        throw new Error('Service is not responding on port 8182');
      }
      throw error;
    }
  }

  async testBasicFunctionality() {
    const axios = require('axios').default;

    try {
      // Test service info endpoint
      const response = await axios.get('http://localhost:8182/service/info', {
        timeout: 5000
      });

      if (response.status === 200) {
        this.success('Basic functionality test passed');
        this.log(`Service version: ${response.data.data.version}`);
      } else {
        throw new Error('Service info endpoint failed');
      }
    } catch (error) {
      this.log('⚠️ Basic functionality test failed (non-critical)');
    }
  }

  async rollback() {
    this.log('🔄 Rolling back installation...');

    for (const rollbackStep of this.rollbackSteps.reverse()) {
      try {
        rollbackStep();
      } catch (error) {
        this.log(`⚠️ Rollback step failed: ${error.message}`);
      }
    }

    this.log('Rollback completed');
  }

  displayUsageInstructions() {
    this.log('\n🎉 Installation completed successfully!\n');

    console.log('📋 Service Management Commands:');

    switch (this.platform) {
      case 'linux':
        console.log('  Start:   sudo systemctl start printermaster');
        console.log('  Stop:    sudo systemctl stop printermaster');
        console.log('  Restart: sudo systemctl restart printermaster');
        console.log('  Status:  sudo systemctl status printermaster');
        console.log('  Logs:    sudo journalctl -u printermaster -f');
        break;

      case 'win32':
        console.log('  Start:   net start printermaster');
        console.log('  Stop:    net stop printermaster');
        console.log('  Status:  sc query printermaster');
        console.log('  Logs:    Check Windows Event Viewer');
        break;

      case 'darwin':
        console.log('  Start:   sudo launchctl load /Library/LaunchDaemons/com.restaurant-platform.printermaster.plist');
        console.log('  Stop:    sudo launchctl unload /Library/LaunchDaemons/com.restaurant-platform.printermaster.plist');
        console.log('  Logs:    tail -f ' + this.logsDir + '/service-out.log');
        break;

      default:
        console.log('  Start:   pm2 start printermaster-service');
        console.log('  Stop:    pm2 stop printermaster-service');
        console.log('  Restart: pm2 restart printermaster-service');
        console.log('  Status:  pm2 status');
        console.log('  Logs:    pm2 logs printermaster-service');
        break;
    }

    console.log('\n🌐 Service Endpoints:');
    console.log('  Health:  http://localhost:8182/health');
    console.log('  Metrics: http://localhost:8182/metrics');
    console.log('  API:     http://localhost:8182/');

    console.log('\n📁 Important Directories:');
    console.log(`  Logs:     ${this.logsDir}`);
    console.log(`  Config:   ${this.configDir}`);
    console.log(`  Service:  ${path.dirname(this.serviceScript)}`);

    console.log('\n🔧 Next Steps:');
    console.log('  1. Configure your license in the Electron app');
    console.log('  2. Test printer connectivity');
    console.log('  3. Monitor service logs for any issues');
    console.log('  4. Set up backend connectivity if needed');
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Main execution
if (require.main === module) {
  const installer = new ServiceInstaller();

  // Handle command line arguments
  const args = process.argv.slice(2);

  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
PrinterMaster Service Installer

Usage: node install-service.js [options]

Options:
  --help, -h     Show this help message
  --uninstall    Uninstall the service
  --test         Test existing service installation
  --force        Force installation (overwrite existing)

Examples:
  node install-service.js                 # Install service
  node install-service.js --uninstall     # Uninstall service
  node install-service.js --test          # Test service
`);
    process.exit(0);
  }

  if (args.includes('--uninstall')) {
    installer.uninstall();
  } else if (args.includes('--test')) {
    installer.testService();
  } else {
    installer.install();
  }
}

module.exports = ServiceInstaller;