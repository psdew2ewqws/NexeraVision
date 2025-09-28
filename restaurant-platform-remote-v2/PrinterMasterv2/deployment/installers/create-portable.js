#!/usr/bin/env node

/**
 * Create Portable PrinterMaster Distribution
 * Builds a standalone, downloadable version of PrinterMaster
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const projectRoot = path.join(__dirname, '../..');
const serviceRoot = path.join(projectRoot, 'service');
const outputDir = path.join(projectRoot, 'deployment/installers/dist');

console.log('🚀 Creating PrinterMaster Portable Distribution...');

// Create output directory
if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
}

// Copy service files
console.log('📦 Copying service files...');
const serviceDist = path.join(outputDir, 'PrinterMaster-Portable');
if (fs.existsSync(serviceDist)) {
    fs.rmSync(serviceDist, { recursive: true });
}
fs.mkdirSync(serviceDist, { recursive: true });

// Copy essential files
const filesToCopy = [
    'service/',
    'package.json',
    'README.md'
];

filesToCopy.forEach(file => {
    const srcPath = path.join(projectRoot, file);
    const destPath = path.join(serviceDist, file);

    if (fs.existsSync(srcPath)) {
        if (fs.statSync(srcPath).isDirectory()) {
            copyDir(srcPath, destPath);
        } else {
            fs.copyFileSync(srcPath, destPath);
        }
        console.log(`✅ Copied: ${file}`);
    }
});

// Create start scripts
console.log('📝 Creating start scripts...');

// Windows start script
const windowsScript = `@echo off
echo Starting PrinterMaster Service...
cd /d "%~dp0"
if not exist node_modules (
    echo Installing dependencies...
    npm install --production
)
echo PrinterMaster is starting on http://localhost:8182
npm start
pause
`;

fs.writeFileSync(path.join(serviceDist, 'start-windows.bat'), windowsScript);

// Linux/Mac start script
const unixScript = `#!/bin/bash
echo "Starting PrinterMaster Service..."
cd "$(dirname "$0")"
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install --production
fi
echo "PrinterMaster is starting on http://localhost:8182"
npm start
`;

fs.writeFileSync(path.join(serviceDist, 'start-unix.sh'), unixScript);
fs.chmodSync(path.join(serviceDist, 'start-unix.sh'), '755');

// Create README for portable version
const portableReadme = `# PrinterMaster Portable

Enterprise printer management service - Portable distribution

## Quick Start

### Windows
1. Double-click \`start-windows.bat\`
2. Wait for installation to complete
3. Access PrinterMaster at http://localhost:8182

### Linux/Mac
1. Run \`./start-unix.sh\`
2. Wait for installation to complete
3. Access PrinterMaster at http://localhost:8182

## Requirements
- Node.js 16+ installed
- Network access for printer discovery
- USB access for local printers

## API Endpoints
- \`GET /printers\` - Discover available printers
- \`POST /print\` - Send print jobs
- \`GET /health\` - Service health check

## Remote Access
To enable remote access, forward port 8182 or use tunneling:
\`\`\`bash
# Using SSH tunnel
ssh -R 8182:localhost:8182 your-server.com

# Using ngrok
ngrok http 8182
\`\`\`

## Support
For support and documentation: https://github.com/restaurant-platform/printer-master-v2
`;

fs.writeFileSync(path.join(serviceDist, 'README-PORTABLE.md'), portableReadme);

// Create package.json for portable version
const portablePackage = {
    "name": "printermaster-portable",
    "version": "2.1.0",
    "description": "PrinterMaster - Portable printer management service",
    "main": "service/service-main.js",
    "scripts": {
        "start": "node service/service-main.js",
        "install-deps": "npm install --production"
    },
    "dependencies": require(path.join(projectRoot, 'package.json')).dependencies,
    "engines": {
        "node": ">=16.0.0"
    },
    "author": "Restaurant Platform Team",
    "license": "MIT"
};

fs.writeFileSync(path.join(serviceDist, 'package.json'), JSON.stringify(portablePackage, null, 2));

// Create archive
console.log('📦 Creating distribution archive...');
process.chdir(outputDir);

try {
    execSync(`tar -czf PrinterMaster-Portable-v2.1.0.tar.gz PrinterMaster-Portable`, { stdio: 'inherit' });
    console.log('✅ Created: PrinterMaster-Portable-v2.1.0.tar.gz');
} catch (error) {
    console.log('❌ tar not available, creating zip...');
    try {
        execSync(`zip -r PrinterMaster-Portable-v2.1.0.zip PrinterMaster-Portable`, { stdio: 'inherit' });
        console.log('✅ Created: PrinterMaster-Portable-v2.1.0.zip');
    } catch (zipError) {
        console.log('⚠️ Archive creation failed, but folder is ready:', serviceDist);
    }
}

console.log('\n🎉 PrinterMaster Portable Distribution Ready!');
console.log(`📁 Location: ${outputDir}`);
console.log('\n📋 Distribution includes:');
console.log('  • PrinterMaster service');
console.log('  • Start scripts for Windows/Linux/Mac');
console.log('  • Dependencies specification');
console.log('  • Setup instructions');
console.log('\n🚀 Users can run this on any device with Node.js to discover and manage printers!');

// Helper function to copy directories
function copyDir(src, dest) {
    if (!fs.existsSync(dest)) {
        fs.mkdirSync(dest, { recursive: true });
    }

    const files = fs.readdirSync(src);
    files.forEach(file => {
        const srcFile = path.join(src, file);
        const destFile = path.join(dest, file);

        if (fs.statSync(srcFile).isDirectory()) {
            copyDir(srcFile, destFile);
        } else {
            fs.copyFileSync(srcFile, destFile);
        }
    });
}