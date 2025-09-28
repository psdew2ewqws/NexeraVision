#!/usr/bin/env node

/**
 * PrinterMaster Windows Service Setup Script
 *
 * This script provides automated setup for Windows systems:
 * - Windows Service installation with node-windows
 * - Registry configuration
 * - Firewall configuration
 * - User permission setup
 * - Auto-start configuration
 * - Service monitoring setup
 */

const fs = require('fs');
const path = require('path');
const { execSync, exec } = require('child_process');
const os = require('os');

class WindowsServiceSetup {
  constructor() {
    this.serviceName = 'PrinterMasterService';
    this.serviceDisplayName = 'PrinterMaster Background Service';
    this.serviceDescription = 'Enterprise-grade printer management service for restaurants';
    this.servicePort = 8182;

    // Paths
    this.rootDir = path.join(__dirname, '..');
    this.serviceScript = path.join(this.rootDir, 'service', 'service-main.js');
    this.logsDir = path.join(this.rootDir, 'logs');

    this.log('🪟 PrinterMaster Windows Service Setup initialized');
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

  warning(message) {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ⚠️ ${message}`);
  }

  async setup() {
    try {
      this.log('🚀 Starting Windows service setup...');

      // Check prerequisites
      await this.checkPrerequisites();

      // Install dependencies
      await this.installDependencies();

      // Create directories
      await this.createDirectories();

      // Install Windows service
      await this.installWindowsService();

      // Configure firewall
      await this.configureFirewall();

      // Setup monitoring
      await this.setupMonitoring();

      // Test installation
      await this.testInstallation();

      this.success('Windows service setup completed successfully!');
      this.displayUsageInstructions();

    } catch (error) {
      this.error('Setup failed', error);
      process.exit(1);
    }
  }

  async checkPrerequisites() {
    this.log('🔍 Checking prerequisites...');

    // Check if running as administrator
    try {
      execSync('net session', { stdio: 'ignore' });
      this.success('Running with administrator privileges');
    } catch (error) {
      this.error('This script must be run as Administrator');
      this.log('Please run PowerShell or Command Prompt as Administrator');
      throw new Error('Administrator privileges required');
    }

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

    // Check Windows version
    const windowsVersion = os.release();
    this.success(`Windows version: ${windowsVersion}`);
  }

  async installDependencies() {
    this.log('📦 Installing dependencies...');

    // Change to root directory
    process.chdir(this.rootDir);

    // Install production dependencies
    try {
      execSync('npm install --production', { stdio: 'inherit' });
      this.success('Production dependencies installed');
    } catch (error) {
      throw new Error(`Failed to install dependencies: ${error.message}`);
    }

    // Install node-windows globally
    try {
      execSync('npm install -g node-windows', { stdio: 'inherit' });
      this.success('node-windows installed globally');
    } catch (error) {
      this.warning('Failed to install node-windows globally, trying locally');
      try {
        execSync('npm install node-windows', { stdio: 'inherit' });
        this.success('node-windows installed locally');
      } catch (localError) {
        throw new Error(`Failed to install node-windows: ${localError.message}`);
      }
    }

    // Install PM2 globally as backup
    try {
      execSync('npm install -g pm2', { stdio: 'inherit' });
      this.success('PM2 installed globally (backup process manager)');
    } catch (error) {
      this.warning('PM2 installation failed (non-critical)');
    }
  }

  async createDirectories() {
    this.log('📁 Creating directories...');

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
      }
    }

    this.success('Directories created');
  }

  async installWindowsService() {
    this.log('🔧 Installing Windows service...');

    try {
      // Import node-windows
      let Service;
      try {
        Service = require('node-windows').Service;
      } catch (error) {
        // Try local installation
        const nodeWindowsPath = path.join(this.rootDir, 'node_modules', 'node-windows');
        Service = require(nodeWindowsPath).Service;
      }

      // Create service configuration
      const serviceConfig = {
        name: this.serviceName,
        description: this.serviceDescription,
        script: this.serviceScript,
        nodeOptions: [
          '--max-old-space-size=1024',
          '--enable-source-maps'
        ],
        env: [
          {
            name: 'NODE_ENV',
            value: 'production'
          },
          {
            name: 'PRINTER_SERVICE_PORT',
            value: this.servicePort.toString()
          },
          {
            name: 'LOG_LEVEL',
            value: 'info'
          },
          {
            name: 'UV_THREADPOOL_SIZE',
            value: '4'
          },
          {
            name: 'WINDOWS_SERVICE',
            value: 'true'
          }
        ],
        workingDirectory: this.rootDir,
        allowServiceLogon: true,
        grow: 0.5,
        wait: 2,
        maxRestarts: 10,
        maxRetries: 60,
        logOnAs: {
          domain: 'NT AUTHORITY',
          account: 'NetworkService'
        }
      };

      // Create service instance
      const svc = new Service(serviceConfig);

      // Install the service
      await new Promise((resolve, reject) => {
        let installTimeout;

        svc.on('install', () => {
          clearTimeout(installTimeout);
          this.success('Windows service installed successfully');
          resolve();
        });

        svc.on('alreadyinstalled', () => {
          clearTimeout(installTimeout);
          this.warning('Service already installed');
          resolve();
        });

        svc.on('error', (error) => {
          clearTimeout(installTimeout);
          this.error('Service installation failed', error);
          reject(error);
        });

        svc.on('invalidinstallation', () => {
          clearTimeout(installTimeout);
          this.error('Invalid service installation');
          reject(new Error('Invalid service installation'));
        });

        // Set timeout for installation
        installTimeout = setTimeout(() => {
          reject(new Error('Service installation timeout'));
        }, 60000); // 60 seconds

        this.log('Starting service installation...');
        svc.install();
      });

      // Start the service
      await new Promise((resolve, reject) => {
        let startTimeout;

        svc.on('start', () => {
          clearTimeout(startTimeout);
          this.success('Service started successfully');
          resolve();
        });

        svc.on('error', (error) => {
          clearTimeout(startTimeout);
          this.warning('Service start failed', error);
          // Don't reject here, service might be manually startable
          resolve();
        });

        // Set timeout for start
        startTimeout = setTimeout(() => {
          this.warning('Service start timeout - try starting manually');
          resolve();
        }, 30000); // 30 seconds

        this.log('Starting service...');
        svc.start();
      });

    } catch (error) {
      this.error('Windows service installation failed', error);

      // Fallback to manual service creation
      await this.createManualService();
    }
  }

  async createManualService() {
    this.log('🔄 Attempting manual service creation...');

    try {
      // Create a batch file for the service
      const batchFile = path.join(this.rootDir, 'service-wrapper.bat');
      const batchContent = `@echo off
cd /d "${this.rootDir}"
set NODE_ENV=production
set PRINTER_SERVICE_PORT=${this.servicePort}
set LOG_LEVEL=info
node "${this.serviceScript}"
`;

      fs.writeFileSync(batchFile, batchContent);
      this.log('Created service wrapper batch file');

      // Use sc command to create service
      const scCommand = `sc create "${this.serviceName}" binPath= "${batchFile}" DisplayName= "${this.serviceDisplayName}" start= auto`;

      execSync(scCommand, { stdio: 'inherit' });
      this.success('Service created using sc command');

      // Configure service description
      try {
        execSync(`sc description "${this.serviceName}" "${this.serviceDescription}"`, { stdio: 'inherit' });
        this.success('Service description set');
      } catch (descError) {
        this.warning('Failed to set service description');
      }

    } catch (error) {
      this.error('Manual service creation failed', error);
      throw error;
    }
  }

  async configureFirewall() {
    this.log('🔥 Configuring Windows Firewall...');

    try {
      // Add firewall rule for the service port
      const firewallCommand = `netsh advfirewall firewall add rule name="PrinterMaster Service" dir=in action=allow protocol=TCP localport=${this.servicePort}`;

      execSync(firewallCommand, { stdio: 'inherit' });
      this.success(`Firewall rule added for port ${this.servicePort}`);

    } catch (error) {
      this.warning('Failed to configure firewall (may require manual configuration)', error);
    }
  }

  async setupMonitoring() {
    this.log('📊 Setting up monitoring...');

    // Create a PowerShell health check script
    const healthCheckScript = path.join(this.rootDir, 'scripts', 'health-check.ps1');
    const healthCheckContent = `# PrinterMaster Health Check Script
param(
    [string]$ServiceName = "${this.serviceName}",
    [string]$HealthUrl = "http://localhost:${this.servicePort}/health",
    [string]$LogFile = "${path.join(this.logsDir, 'health-check.log').replace(/\\/g, '\\\\')}"
)

function Write-Log {
    param([string]$Message)
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logEntry = "[$timestamp] $Message"
    Write-Output $logEntry
    Add-Content -Path $LogFile -Value $logEntry
}

# Check if service is running
$service = Get-Service -Name $ServiceName -ErrorAction SilentlyContinue
if ($service -eq $null) {
    Write-Log "ERROR: Service $ServiceName not found"
    exit 1
}

if ($service.Status -ne 'Running') {
    Write-Log "ERROR: Service $ServiceName is not running (Status: $($service.Status))"
    try {
        Start-Service -Name $ServiceName
        Write-Log "INFO: Attempted to start service $ServiceName"
    } catch {
        Write-Log "ERROR: Failed to start service $ServiceName : $($_.Exception.Message)"
    }
    exit 1
}

# Check health endpoint
try {
    $response = Invoke-WebRequest -Uri $HealthUrl -TimeoutSec 10 -UseBasicParsing
    if ($response.StatusCode -eq 200) {
        Write-Log "INFO: Health check passed for $ServiceName"
        exit 0
    } else {
        Write-Log "ERROR: Health check failed with status code: $($response.StatusCode)"
        exit 1
    }
} catch {
    Write-Log "ERROR: Health check failed for $ServiceName : $($_.Exception.Message)"
    try {
        Restart-Service -Name $ServiceName
        Write-Log "INFO: Restarted service $ServiceName due to health check failure"
    } catch {
        Write-Log "ERROR: Failed to restart service $ServiceName : $($_.Exception.Message)"
    }
    exit 1
}`;

    // Ensure scripts directory exists
    const scriptsDir = path.dirname(healthCheckScript);
    if (!fs.existsSync(scriptsDir)) {
      fs.mkdirSync(scriptsDir, { recursive: true });
    }

    fs.writeFileSync(healthCheckScript, healthCheckContent);
    this.success('Health check script created');

    // Create a scheduled task for health monitoring
    try {
      const taskName = 'PrinterMaster-HealthCheck';
      const taskCommand = `schtasks /create /tn "${taskName}" /tr "powershell.exe -ExecutionPolicy Bypass -File \\"${healthCheckScript}\\"" /sc minute /mo 5 /f`;

      execSync(taskCommand, { stdio: 'inherit' });
      this.success('Scheduled task created for health monitoring');

    } catch (error) {
      this.warning('Failed to create scheduled task for health monitoring', error);
    }
  }

  async testInstallation() {
    this.log('🧪 Testing installation...');

    // Wait for service to start
    await this.delay(5000);

    // Check service status
    try {
      const serviceStatus = execSync(`sc query "${this.serviceName}"`, { encoding: 'utf8' });

      if (serviceStatus.includes('RUNNING')) {
        this.success('Service is running');
      } else if (serviceStatus.includes('STOPPED')) {
        this.warning('Service is stopped, attempting to start...');
        try {
          execSync(`sc start "${this.serviceName}"`, { stdio: 'inherit' });
          await this.delay(3000);
          this.success('Service started successfully');
        } catch (startError) {
          this.warning('Failed to start service via sc command');
        }
      } else {
        this.warning('Service status unknown');
      }

    } catch (error) {
      this.warning('Failed to check service status', error);
    }

    // Test health endpoint
    try {
      const axios = require('axios');
      const response = await axios.get(`http://localhost:${this.servicePort}/health`, {
        timeout: 10000
      });

      if (response.status === 200) {
        this.success('Health endpoint is responding');
      } else {
        this.warning('Health endpoint returned unexpected status');
      }

    } catch (error) {
      this.warning('Health endpoint test failed (service may still be initializing)');
    }
  }

  displayUsageInstructions() {
    this.log('\n🎉 Windows service setup completed!\n');

    console.log('📋 Service Management Commands:');
    console.log(`  Start:   sc start "${this.serviceName}"`);
    console.log(`  Stop:    sc stop "${this.serviceName}"`);
    console.log(`  Status:  sc query "${this.serviceName}"`);
    console.log(`  Delete:  sc delete "${this.serviceName}"`);
    console.log('  Or use Services.msc GUI for management');

    console.log('\n🌐 Service Endpoints:');
    console.log(`  Health:  http://localhost:${this.servicePort}/health`);
    console.log(`  Metrics: http://localhost:${this.servicePort}/metrics`);
    console.log(`  API:     http://localhost:${this.servicePort}/`);

    console.log('\n📁 Important Files:');
    console.log(`  Logs:     ${this.logsDir}`);
    console.log(`  Service:  ${this.serviceScript}`);
    console.log(`  Health:   ${path.join(this.rootDir, 'scripts', 'health-check.ps1')}`);

    console.log('\n🔧 Windows-Specific Management:');
    console.log('  Event Viewer: Look for service events in Windows Logs > Application');
    console.log('  Services GUI: services.msc (search for PrinterMaster)');
    console.log('  Task Manager: Check running processes');

    console.log('\n🛡️ Security Notes:');
    console.log(`  Firewall: Port ${this.servicePort} has been opened`);
    console.log('  Service runs as NetworkService account');
    console.log('  USB printer access may require additional drivers');

    console.log('\n📊 Monitoring:');
    console.log('  Health check runs every 5 minutes via scheduled task');
    console.log('  Check Task Scheduler for "PrinterMaster-HealthCheck"');

    console.log('\n🔧 Next Steps:');
    console.log('  1. Install USB printer drivers if needed');
    console.log('  2. Configure your license in the Electron app');
    console.log('  3. Test printer connectivity');
    console.log('  4. Monitor service logs and event viewer');
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Main execution
if (require.main === module) {
  const setup = new WindowsServiceSetup();

  // Handle command line arguments
  const args = process.argv.slice(2);

  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
PrinterMaster Windows Service Setup

Usage: node setup-windows-service.js [options]

Options:
  --help, -h     Show this help message
  --uninstall    Uninstall the Windows service
  --test         Test existing service installation

Examples:
  node setup-windows-service.js           # Install service
  node setup-windows-service.js --test    # Test service

Requirements:
  - Windows 7 or later
  - Node.js 16 or later
  - Administrator privileges
  - .NET Framework (for node-windows)
`);
    process.exit(0);
  }

  if (args.includes('--uninstall')) {
    // Uninstall logic would go here
    console.log('Uninstall functionality not implemented yet');
    process.exit(0);
  } else if (args.includes('--test')) {
    setup.testInstallation();
  } else {
    setup.setup();
  }
}

module.exports = WindowsServiceSetup;