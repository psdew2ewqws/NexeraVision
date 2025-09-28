#!/usr/bin/env node

/**
 * PrinterMaster Branch Configuration Script
 *
 * This script helps configure PrinterMaster with the correct branch ID
 * for connecting to the Restaurant Platform backend.
 */

const fs = require('fs');
const path = require('path');

// Configuration for the test environment
const BRANCH_ID = 'f97ceb38-c797-4d1c-9ff4-89d9f8da5235';
const BACKEND_URL = 'http://localhost:3001';

console.log('🔧 PrinterMaster Branch Configuration');
console.log('=====================================');
console.log(`Branch ID: ${BRANCH_ID}`);
console.log(`Backend URL: ${BACKEND_URL}`);
console.log('');

// Path to the configuration file
const configPath = path.join(__dirname, 'apps/desktop/.env.development');

// Read the current configuration
let configContent = '';
try {
    configContent = fs.readFileSync(configPath, 'utf8');
    console.log('✅ Found existing .env.development file');
} catch (error) {
    console.log('⚠️  .env.development file not found, will create it');

    // Read the example file
    const examplePath = path.join(__dirname, 'apps/desktop/.env.example');
    try {
        configContent = fs.readFileSync(examplePath, 'utf8');
        console.log('✅ Using .env.example as template');
    } catch (error) {
        console.error('❌ Could not read .env.example file:', error.message);
        process.exit(1);
    }
}

// Add branch ID configuration
const additionalConfig = `

# Branch Configuration for Restaurant Platform
BRANCH_ID=${BRANCH_ID}
DEVICE_NAME=PrinterMaster-Desktop-001
COMPANY_ID=test-company-001

# Authentication for Desktop App
DEFAULT_BRANCH_ID=${BRANCH_ID}
DESKTOP_DEVICE_ID=printermaster-\${HOSTNAME}-001
AUTO_AUTHENTICATE=true
`;

// Check if branch configuration already exists
if (!configContent.includes('BRANCH_ID=')) {
    configContent += additionalConfig;
    console.log('✅ Added branch configuration to .env.development');
} else {
    // Update existing branch ID
    configContent = configContent.replace(/BRANCH_ID=.*/g, `BRANCH_ID=${BRANCH_ID}`);
    configContent = configContent.replace(/DEFAULT_BRANCH_ID=.*/g, `DEFAULT_BRANCH_ID=${BRANCH_ID}`);
    console.log('✅ Updated existing branch configuration');
}

// Write the updated configuration
try {
    fs.writeFileSync(configPath, configContent);
    console.log('✅ Configuration file updated successfully');
} catch (error) {
    console.error('❌ Failed to write configuration:', error.message);
    process.exit(1);
}

console.log('');
console.log('🚀 CONFIGURATION COMPLETE');
console.log('========================');
console.log('PrinterMaster is now configured with:');
console.log(`  • Branch ID: ${BRANCH_ID}`);
console.log(`  • Backend URL: ${BACKEND_URL}`);
console.log(`  • Device Name: PrinterMaster-Desktop-001`);
console.log('');
console.log('NEXT STEPS:');
console.log('1. Start the backend server (if not running):');
console.log('   cd /home/admin/restaurant-platform-remote-v2/backend && npm run start:dev');
console.log('');
console.log('2. Start PrinterMaster:');
console.log('   cd /home/admin/restaurant-platform-remote-v2/PrinterMasterv2/apps/desktop && npm start');
console.log('');
console.log('3. Check the dashboard:');
console.log('   http://localhost:3000/settings/printing');
console.log('');
console.log('4. Look for printers to appear online and test printing!');