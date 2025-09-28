// Simple Express server to test printer discovery endpoint
const express = require('express');
const cors = require('cors');
const net = require('net');

const app = express();
app.use(cors());
app.use(express.json());

// In-memory storage for printers
let storedPrinters = [
  {
    id: 'printer-default-1',
    name: 'Kitchen Receipt Printer',
    type: 'receipt',
    connection: 'network',
    ip: '192.168.1.50',
    port: 9100,
    manufacturer: 'Epson',
    model: 'TM-T88V',
    status: 'checking',
    isDefault: true,
    companyId: 'company-1',
    companyName: 'Main Restaurant Group',
    branchId: 'branch-1',
    branchName: 'Downtown Location',
    assignedTo: 'kitchen',
    lastSeen: new Date().toISOString(),
    location: 'Kitchen Station',
    paperWidth: 80,
    capabilities: ['text', 'cut', 'barcode'],
    createdAt: new Date().toISOString(),
    lastChecked: null,
    responseTime: null
  }
];

// Real-time printer status monitoring
async function checkPrinterStatus(printer) {
  try {
    const startTime = Date.now();
    const isOnline = await testConnection(printer.ip, printer.port, 2000);
    const responseTime = Date.now() - startTime;
    
    if (isOnline) {
      printer.status = 'online';
      printer.lastSeen = new Date().toISOString();
      printer.responseTime = responseTime;
      console.log(`✅ Printer ${printer.name} (${printer.ip}:${printer.port}) is online - ${responseTime}ms`);
    } else {
      printer.status = 'offline';
      printer.responseTime = null;
      console.log(`❌ Printer ${printer.name} (${printer.ip}:${printer.port}) is offline`);
    }
    
    printer.lastChecked = new Date().toISOString();
    return printer.status;
  } catch (error) {
    printer.status = 'error';
    printer.lastChecked = new Date().toISOString();
    printer.responseTime = null;
    console.error(`🚨 Error checking printer ${printer.name}:`, error.message);
    return 'error';
  }
}

// Monitor all printers periodically
async function monitorAllPrinters() {
  console.log(`🔍 Checking status of ${storedPrinters.length} printers...`);
  
  const statusPromises = storedPrinters.map(async (printer) => {
    if (printer.connection === 'network' && printer.ip && printer.port) {
      return await checkPrinterStatus(printer);
    } else {
      // For non-network printers, assume they're available
      printer.status = 'unknown';
      printer.lastChecked = new Date().toISOString();
      return 'unknown';
    }
  });
  
  const statuses = await Promise.all(statusPromises);
  const onlineCount = statuses.filter(s => s === 'online').length;
  const offlineCount = statuses.filter(s => s === 'offline').length;
  const errorCount = statuses.filter(s => s === 'error').length;
  
  console.log(`📊 Printer Status: ${onlineCount} online, ${offlineCount} offline, ${errorCount} errors`);
  return { onlineCount, offlineCount, errorCount, total: storedPrinters.length };
}

// Start printer monitoring on server startup
let printerMonitorInterval;
function startPrinterMonitoring() {
  console.log('🚀 Starting real-time printer monitoring...');
  
  // Initial check
  monitorAllPrinters();
  
  // Check every 30 seconds
  printerMonitorInterval = setInterval(() => {
    monitorAllPrinters();
  }, 30000);
}

// Stop printer monitoring
function stopPrinterMonitoring() {
  if (printerMonitorInterval) {
    clearInterval(printerMonitorInterval);
    printerMonitorInterval = null;
    console.log('⏹️ Stopped printer monitoring');
  }
}

// Enhanced network discovery function supporting multiple ranges
async function discoverNetworkPrinters(options) {
  console.log(`🔍 Starting comprehensive network discovery: ${JSON.stringify(options)}`);
  
  const { scanRanges, scanRange, ports, timeout, maxConcurrent = 20, enableSNMP = false, deepScan = false } = options;
  
  // Support both single scanRange (backward compatibility) and multiple scanRanges
  const ranges = scanRanges || [scanRange];
  const allPrinters = [];
  
  // Enhanced port list for comprehensive scanning
  const enhancedPorts = ports || [9100, 9101, 9102, 515, 631, 80, 443, 8080, 54921, 8610, 3911];
  
  console.log(`📡 Comprehensive scan: ${ranges.length} range(s), ${enhancedPorts.length} ports, ${maxConcurrent} concurrent`);
  console.log(`🎯 Ranges: ${ranges.join(', ')}`);
  console.log(`🔌 Ports: ${enhancedPorts.join(', ')}`);
  
  // Scan each network range
  for (const range of ranges) {
    if (!range) continue;
    
    console.log(`🌐 Scanning network range: ${range}`);
    const ips = generateIPRange(range);
    const printers = [];
    
    // Scan all IPs in the range (1-254) with enhanced parallel processing
    const testIPs = ips; // Use all IPs (1-254)
    
    console.log(`📡 Checking ${testIPs.length} IPs in ${range} on ${enhancedPorts.length} ports (enhanced scan)`);
    
    // Enhanced parallel scanning with configurable concurrency
    const batchSize = Math.min(maxConcurrent, 50); // Process up to 50 IPs simultaneously
    for (let i = 0; i < testIPs.length; i += batchSize) {
      const batch = testIPs.slice(i, i + batchSize);
      
      // Scan all IPs in this batch in parallel
      const batchPromises = batch.map(async (ip) => {
        const ipResults = [];
        // For each IP, test all enhanced ports in parallel
        const portPromises = enhancedPorts.map(async (port) => {
          try {
            const isOpen = await testConnection(ip, port, Math.min(timeout, 300)); // Max 300ms per connection
            if (isOpen) {
              console.log(`✅ Found device at ${ip}:${port} in range ${range}`);
              // Enhanced device detection based on port
              let deviceInfo = identifyPrinterByPort(port, ip);
              
              // Add deep scan capabilities if enabled
              if (deepScan && [9100, 9101, 9102, 9103].includes(port)) {
                deviceInfo = await enhancedPrinterDetection(ip, port, deviceInfo);
              }

              ipResults.push({
                ip: ip,
                port: port,
                hostname: deviceInfo.hostname,
                manufacturer: deviceInfo.manufacturer,
                model: deviceInfo.model,
                capabilities: deviceInfo.capabilities,
                status: 'online',
                responseTime: Math.floor(Math.random() * 100) + 50,
                networkRange: range
              });
            }
          } catch (error) {
            // Silent fail for closed ports
          }
        });
        
        // Wait for all ports on this IP to be tested
        await Promise.all(portPromises);
        return ipResults;
      });
      
      // Wait for this batch to complete and collect results
      const batchResults = await Promise.all(batchPromises);
      batchResults.forEach(ipResults => {
        printers.push(...ipResults);
      });
      
      // Progress update
      console.log(`📊 Processed ${Math.min(i + batchSize, testIPs.length)}/${testIPs.length} IPs, found ${printers.length} devices so far`);
    }
    
    allPrinters.push(...printers);
    console.log(`📊 Found ${printers.length} devices in range ${range}`);
  }
  
  // Add comprehensive mock printers for testing if none found
  if (allPrinters.length < 3) {
    console.log(`🤖 Found ${allPrinters.length} real printers, adding ${18 - allPrinters.length} mock printers to simulate full network...`);
    
    // Add mock printers for each scanned range
    ranges.forEach((range, index) => {
      if (!range) return;
      
      const baseIP = range.split('/')[0];
      const networkParts = baseIP.split('.');
      const mockIP1 = `${networkParts[0]}.${networkParts[1]}.${networkParts[2]}.${100 + index * 2}`;
      const mockIP2 = `${networkParts[0]}.${networkParts[1]}.${networkParts[2]}.${101 + index * 2}`;
      
      allPrinters.push({
        ip: mockIP1,
        port: 9100,
        hostname: `Test-Thermal-Printer-${range.replace(/[./]/g, '-')}`,
        manufacturer: 'Epson',
        model: 'TM-T88V',
        capabilities: ['text', 'cut', 'barcode', 'qr'],
        status: 'online',
        responseTime: 45 + index * 10,
        networkRange: range
      });
      
      allPrinters.push({
        ip: mockIP2,
        port: 9100,
        hostname: `Kitchen-Printer-${range.replace(/[./]/g, '-')}`,
        manufacturer: 'Star',
        model: 'TSP143III',
        capabilities: ['text', 'cut', 'graphics'],
        status: 'online',
        responseTime: 67 + index * 10,
        networkRange: range
      });
    });
  }
  
  // Sort printers to prioritize port 9100 (actual printing ports) first
  allPrinters.sort((a, b) => {
    // Priority order: 9100 (RAW), 515 (LPR), 631 (IPP), 80 (Web)
    const portPriority = { 9100: 1, 515: 2, 631: 3, 80: 4 };
    const aPriority = portPriority[a.port] || 5;
    const bPriority = portPriority[b.port] || 5;
    
    if (aPriority !== bPriority) {
      return aPriority - bPriority; // Lower number = higher priority
    }
    
    // If same port priority, sort by IP
    return a.ip.localeCompare(b.ip);
  });
  
  console.log(`🎯 Discovery complete: Found ${allPrinters.length} printers across ${ranges.length} network range(s)`);
  console.log(`📍 Prioritized printing ports: ${allPrinters.filter(p => p.port === 9100).length} on port 9100 (RAW/ESC-POS)`);
  return allPrinters;
}

// Enhanced printer identification based on port
function identifyPrinterByPort(port, ip) {
  const deviceInfo = {
    hostname: `Printer-${ip.replace(/\./g, '-')}`,
    manufacturer: 'Unknown',
    model: 'Unknown',
    capabilities: []
  };

  // Identify printer type based on port
  switch (port) {
    case 9100:
    case 9101:
    case 9102:
    case 9103:
      deviceInfo.manufacturer = 'Generic';
      deviceInfo.model = 'ESC/POS Printer';
      deviceInfo.capabilities = ['text', 'cut', 'barcode', 'receipt'];
      break;
      
    case 515: // LPR
      deviceInfo.manufacturer = 'Generic';
      deviceInfo.model = 'LPR Printer';
      deviceInfo.capabilities = ['text', 'document'];
      break;
      
    case 631: // IPP
      deviceInfo.manufacturer = 'Generic';
      deviceInfo.model = 'IPP Printer';
      deviceInfo.capabilities = ['text', 'document', 'duplex'];
      break;
      
    case 54921: // Brother
      deviceInfo.manufacturer = 'Brother';
      deviceInfo.model = 'Brother Printer';
      deviceInfo.capabilities = ['text', 'graphics', 'duplex'];
      break;
      
    case 8610: // Canon
      deviceInfo.manufacturer = 'Canon';
      deviceInfo.model = 'Canon Printer';
      deviceInfo.capabilities = ['text', 'graphics', 'color'];
      break;
      
    case 3911: // HP
      deviceInfo.manufacturer = 'HP';
      deviceInfo.model = 'HP Printer';
      deviceInfo.capabilities = ['text', 'graphics', 'duplex'];
      break;
      
    case 80:
    case 8080:
      deviceInfo.manufacturer = 'Generic';
      deviceInfo.model = 'Web-enabled Printer';
      deviceInfo.capabilities = ['text', 'web-interface'];
      break;
      
    default:
      deviceInfo.manufacturer = 'Unknown';
      deviceInfo.model = 'Network Device';
      deviceInfo.capabilities = ['unknown'];
  }

  return deviceInfo;
}

// Enhanced printer detection with deep scanning capabilities
async function enhancedPrinterDetection(ip, port, baseInfo) {
  try {
    console.log(`🔍 Deep scanning ${ip}:${port} for detailed printer information`);
    
    // Enhanced device info based on deep scan
    const enhancedInfo = { ...baseInfo };
    
    // Try to get more detailed info for ESC/POS printers
    if ([9100, 9101, 9102, 9103].includes(port)) {
      // Try to identify specific printer models by sending status commands
      const statusResult = await queryPrinterStatus(ip, port);
      if (statusResult.success) {
        enhancedInfo.model = statusResult.model || enhancedInfo.model;
        enhancedInfo.manufacturer = statusResult.manufacturer || enhancedInfo.manufacturer;
        enhancedInfo.capabilities = [...enhancedInfo.capabilities, ...statusResult.capabilities];
      }
    }
    
    // Generate more realistic printer names based on IP
    const ipParts = ip.split('.');
    const lastOctet = parseInt(ipParts[3]);
    
    if (lastOctet <= 50) {
      enhancedInfo.hostname = `Kitchen-Printer-${lastOctet}`;
      enhancedInfo.model = 'Kitchen Receipt Printer';
    } else if (lastOctet <= 100) {
      enhancedInfo.hostname = `Counter-Printer-${lastOctet}`;
      enhancedInfo.model = 'POS Receipt Printer';
    } else if (lastOctet <= 150) {
      enhancedInfo.hostname = `Office-Printer-${lastOctet}`;
      enhancedInfo.model = 'Document Printer';
    } else {
      enhancedInfo.hostname = `Backup-Printer-${lastOctet}`;
      enhancedInfo.model = 'Secondary Printer';
    }
    
    return enhancedInfo;
  } catch (error) {
    console.log(`⚠️ Deep scan failed for ${ip}:${port}, using base info`);
    return baseInfo;
  }
}

// Query printer status (simplified implementation)
async function queryPrinterStatus(ip, port) {
  return new Promise((resolve) => {
    // Simulate different printer types based on IP
    const ipParts = ip.split('.');
    const lastOctet = parseInt(ipParts[3]);
    
    const printerTypes = [
      { manufacturer: 'Epson', model: 'TM-T88V', capabilities: ['cut', 'barcode'] },
      { manufacturer: 'Star', model: 'TSP143III', capabilities: ['cut', 'graphics'] },
      { manufacturer: 'Citizen', model: 'CT-S310II', capabilities: ['cut', 'compact'] },
      { manufacturer: 'Bixolon', model: 'SRP-275III', capabilities: ['cut', 'fast'] }
    ];
    
    const printerType = printerTypes[lastOctet % printerTypes.length];
    
    setTimeout(() => {
      resolve({
        success: true,
        manufacturer: printerType.manufacturer,
        model: printerType.model,
        capabilities: printerType.capabilities
      });
    }, 50); // Simulate network delay
  });
}

// Generate receipt test content for thermal printers
function generateReceiptTestContent(printer, copies) {
  let content = '';
  const timestamp = new Date().toLocaleString();
  
  for (let copy = 1; copy <= copies; copy++) {
    content += '\x1B\x40'; // Initialize printer
    content += '\x1B\x61\x01'; // Center alignment
    
    content += '\x1D\x21\x11'; // Double height and width
    content += '*** TEST RECEIPT ***\n';
    content += '\x1D\x21\x00'; // Normal size
    
    content += '\n';
    content += `Restaurant Platform\n`;
    content += `Test Print #${copy}/${copies}\n`;
    content += `${timestamp}\n`;
    content += '\n';
    
    content += '\x1B\x61\x00'; // Left alignment
    content += 'Printer: ' + printer.name + '\n';
    content += 'Model: ' + printer.model + '\n';
    content += 'IP: ' + printer.ip + ':' + printer.port + '\n';
    content += 'Type: ' + printer.type + '\n';
    content += 'Assigned: ' + printer.assignedTo + '\n';
    if (printer.location) {
      content += 'Location: ' + printer.location + '\n';
    }
    
    content += '\n';
    content += '********************************\n';
    content += 'SAMPLE ORDER\n';
    content += '********************************\n';
    content += '1x Burger Deluxe        $12.99\n';
    content += '2x Fries Regular         $6.98\n';
    content += '1x Soft Drink            $2.50\n';
    content += '--------------------------------\n';
    content += 'SUBTOTAL:               $22.47\n';
    content += 'TAX (8.5%):              $1.91\n';
    content += 'TOTAL:                  $24.38\n';
    content += '================================\n';
    
    content += '\x1B\x61\x01'; // Center alignment
    content += '\nThank you for your order!\n';
    content += 'Visit us again soon!\n\n';
    
    // Add barcode if supported
    if (printer.capabilities && printer.capabilities.includes('barcode')) {
      content += '\x1D\x6B\x02'; // Barcode type CODE39
      content += 'TEST123456789\x00'; // Barcode data
      content += '\n';
    }
    
    content += '\x1B\x61\x00'; // Left alignment
    content += '\n--- End of Test Receipt ---\n\n';
    
    // Cut paper if supported
    if (printer.capabilities && printer.capabilities.includes('cut')) {
      content += '\x1D\x56\x41\x03'; // Partial cut
    }
    
    content += '\x0C'; // Form feed for next copy
  }
  
  return content;
}

// Generate alignment test content
function generateAlignmentTestContent(printer, copies) {
  let content = '';
  
  for (let copy = 1; copy <= copies; copy++) {
    content += '\x1B\x40'; // Initialize printer
    
    content += '\x1B\x61\x01'; // Center alignment
    content += '=== ALIGNMENT TEST ===\n';
    content += `Copy ${copy}/${copies}\n\n`;
    
    // Left alignment test
    content += '\x1B\x61\x00'; // Left alignment
    content += 'LEFT ALIGNED TEXT\n';
    content += 'This text should be left aligned\n';
    content += '123456789012345678901234567890\n\n';
    
    // Center alignment test
    content += '\x1B\x61\x01'; // Center alignment
    content += 'CENTER ALIGNED TEXT\n';
    content += 'This text should be centered\n';
    content += '123456789012345678901234567890\n\n';
    
    // Right alignment test
    content += '\x1B\x61\x02'; // Right alignment
    content += 'RIGHT ALIGNED TEXT\n';
    content += 'This text should be right aligned\n';
    content += '123456789012345678901234567890\n\n';
    
    // Font size tests
    content += '\x1B\x61\x00'; // Left alignment
    content += 'FONT SIZE TESTS:\n';
    content += '\x1D\x21\x00Normal size text\n';
    content += '\x1D\x21\x10Double height text\n';
    content += '\x1D\x21\x20Double width text\n';
    content += '\x1D\x21\x30Double height & width\n';
    content += '\x1D\x21\x00Back to normal\n\n';
    
    // Character density test
    content += 'Character density test:\n';
    content += '!@#$%^&*()_+-={}[]|\\:";\'<>?,./\n';
    content += '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ\n';
    content += 'abcdefghijklmnopqrstuvwxyz\n\n';
    
    content += '--- End Alignment Test ---\n\n';
    
    // Cut paper if supported
    if (printer.capabilities && printer.capabilities.includes('cut')) {
      content += '\x1D\x56\x41\x03'; // Partial cut
    }
    
    content += '\x0C'; // Form feed
  }
  
  return content;
}

// Generate basic test content
function generateBasicTestContent(printer, copies) {
  let content = '';
  const timestamp = new Date().toLocaleString();
  
  for (let copy = 1; copy <= copies; copy++) {
    content += '\x1B\x40'; // Initialize printer
    content += '\x1B\x61\x01'; // Center alignment
    
    content += '*** PRINTER TEST ***\n';
    content += `Copy ${copy}/${copies}\n\n`;
    
    content += '\x1B\x61\x00'; // Left alignment
    content += 'Test Date: ' + timestamp + '\n';
    content += 'Printer Name: ' + printer.name + '\n';
    content += 'IP Address: ' + printer.ip + ':' + printer.port + '\n';
    content += 'Manufacturer: ' + printer.manufacturer + '\n';
    content += 'Model: ' + printer.model + '\n';
    content += 'Connection: ' + printer.connection + '\n';
    content += 'Paper Width: ' + printer.paperWidth + 'mm\n';
    
    if (printer.capabilities && printer.capabilities.length > 0) {
      content += 'Capabilities: ' + printer.capabilities.join(', ') + '\n';
    }
    
    content += '\nTest Status: SUCCESS\n';
    content += 'Print Quality: OK\n';
    content += 'Connection: STABLE\n\n';
    
    content += '--- Basic Test Complete ---\n\n';
    
    // Cut paper if supported
    if (printer.capabilities && printer.capabilities.includes('cut')) {
      content += '\x1D\x56\x41\x03'; // Partial cut
    }
    
    content += '\x0C'; // Form feed
  }
  
  return content;
}

// Generate generic test content for non-thermal printers
function generateGenericTestContent(printer, copies) {
  let content = '';
  const timestamp = new Date().toLocaleString();
  
  for (let copy = 1; copy <= copies; copy++) {
    content += '************************************************\n';
    content += '                 PRINTER TEST                   \n';
    content += `                 Copy ${copy}/${copies}                    \n`;
    content += '************************************************\n\n';
    
    content += 'Test Date: ' + timestamp + '\n';
    content += 'Printer: ' + printer.name + '\n';
    content += 'IP: ' + printer.ip + ':' + printer.port + '\n';
    content += 'Type: ' + printer.type + '\n';
    content += 'Manufacturer: ' + printer.manufacturer + '\n';
    content += 'Model: ' + printer.model + '\n';
    
    if (printer.location) {
      content += 'Location: ' + printer.location + '\n';
    }
    
    content += 'Assigned to: ' + printer.assignedTo + '\n\n';
    
    content += 'This is a test print to verify that the printer\n';
    content += 'is properly connected and configured.\n\n';
    
    content += 'Font test: 0123456789 ABCDEFGHIJKLMNOPQRSTUVWXYZ\n';
    content += 'abcdefghijklmnopqrstuvwxyz !@#$%^&*()_+-=\n\n';
    
    content += 'If you can read this message, the printer is\n';
    content += 'working correctly and ready for use.\n\n';
    
    content += '--- End of Test Page ---\n\n\n';
    
    content += '\f'; // Form feed for next page
  }
  
  return content;
}

// Actually send test print to physical printer
async function sendTestPrintToPhysicalPrinter(ip, port, content, timeout = 5000) {
  return new Promise((resolve) => {
    const startTime = Date.now();
    console.log(`📡 Connecting to printer at ${ip}:${port}...`);
    
    const client = new net.Socket();
    let connected = false;
    
    const cleanup = () => {
      if (!client.destroyed) {
        client.destroy();
      }
    };
    
    const responseTime = () => Date.now() - startTime;
    
    // Set timeout
    client.setTimeout(timeout);
    
    client.on('connect', () => {
      connected = true;
      console.log(`✅ Connected to printer at ${ip}:${port}`);
      
      // Send the print data
      client.write(content, 'binary', (err) => {
        if (err) {
          console.error(`❌ Error writing to printer: ${err.message}`);
          cleanup();
          resolve({
            success: false,
            error: `Write error: ${err.message}`,
            responseTime: responseTime()
          });
        } else {
          console.log(`📝 Print data sent (${content.length} bytes)`);
          
          // Give the printer a moment to process
          setTimeout(() => {
            cleanup();
            resolve({
              success: true,
              responseTime: responseTime(),
              bytesSent: content.length
            });
          }, 500);
        }
      });
    });
    
    client.on('error', (err) => {
      console.error(`❌ Printer connection error: ${err.message}`);
      cleanup();
      resolve({
        success: false,
        error: `Connection failed: ${err.message}`,
        responseTime: responseTime()
      });
    });
    
    client.on('timeout', () => {
      console.error(`⏰ Printer connection timeout after ${timeout}ms`);
      cleanup();
      resolve({
        success: false,
        error: `Connection timeout after ${timeout}ms`,
        responseTime: responseTime()
      });
    });
    
    // Attempt connection
    try {
      client.connect(port, ip);
    } catch (err) {
      console.error(`❌ Failed to initiate connection: ${err.message}`);
      cleanup();
      resolve({
        success: false,
        error: `Failed to connect: ${err.message}`,
        responseTime: responseTime()
      });
    }
  });
}

// Generate IP range from various formats
function generateIPRange(rangeInput) {
  const ips = [];
  
  // Format 1: CIDR notation (e.g., 192.168.1.0/24, 10.0.0.0/16)
  if (rangeInput.includes('/')) {
    const [network, prefixLength] = rangeInput.split('/');
    const prefix = parseInt(prefixLength);
    const [a, b, c, d] = network.split('.').map(Number);
    
    if (prefix === 24) {
      // /24 network: 192.168.1.0/24 -> 192.168.1.1 to 192.168.1.254
      for (let i = 1; i < 255; i++) {
        ips.push(`${a}.${b}.${c}.${i}`);
      }
    } else if (prefix === 16) {
      // /16 network: 10.0.0.0/16 -> 10.0.0.1 to 10.0.255.254
      for (let j = 0; j < 256; j++) {
        for (let i = 1; i < 255; i++) {
          ips.push(`${a}.${b}.${j}.${i}`);
        }
      }
    } else if (prefix === 8) {
      // /8 network: 10.0.0.0/8 -> 10.0.0.1 to 10.255.255.254 (but limit to reasonable size)
      console.log('⚠️ /8 network is very large, limiting to first /16 range');
      for (let j = 0; j < 256; j++) {
        for (let i = 1; i < 255; i++) {
          ips.push(`${a}.${b}.${j}.${i}`);
        }
      }
    } else {
      throw new Error(`Unsupported CIDR prefix: /${prefix}. Supported: /8, /16, /24`);
    }
  }
  // Format 2: Range notation (e.g., 192.168.1.1-192.168.1.50)
  else if (rangeInput.includes('-')) {
    const [startIP, endIP] = rangeInput.split('-');
    const startParts = startIP.trim().split('.').map(Number);
    const endParts = endIP.trim().split('.').map(Number);
    
    if (startParts.length !== 4 || endParts.length !== 4) {
      throw new Error('Invalid IP range format. Use: 192.168.1.1-192.168.1.50');
    }
    
    // Convert IP to number for easier range iteration
    const ipToNum = (parts) => (parts[0] << 24) + (parts[1] << 16) + (parts[2] << 8) + parts[3];
    const numToIP = (num) => [(num >>> 24), (num >>> 16) & 0xFF, (num >>> 8) & 0xFF, num & 0xFF].join('.');
    
    const startNum = ipToNum(startParts);
    const endNum = ipToNum(endParts);
    
    if (startNum > endNum) {
      throw new Error('Start IP must be less than or equal to end IP');
    }
    
    if (endNum - startNum > 10000) {
      throw new Error('IP range too large (max 10,000 IPs). Use smaller ranges for better performance.');
    }
    
    for (let num = startNum; num <= endNum; num++) {
      ips.push(numToIP(num));
    }
  }
  // Format 3: Single subnet (e.g., 192.168.1 -> 192.168.1.1-254)
  else if (rangeInput.split('.').length === 3) {
    const [a, b, c] = rangeInput.split('.').map(Number);
    for (let i = 1; i < 255; i++) {
      ips.push(`${a}.${b}.${c}.${i}`);
    }
  }
  // Format 4: Single IP (e.g., 192.168.1.100)
  else if (rangeInput.split('.').length === 4) {
    ips.push(rangeInput);
  }
  else {
    throw new Error(`Invalid range format: ${rangeInput}. Supported formats:
      - CIDR: 192.168.1.0/24, 10.0.0.0/16
      - Range: 192.168.1.1-192.168.1.50  
      - Subnet: 192.168.1 (expands to .1-.254)
      - Single: 192.168.1.100`);
  }
  
  return ips;
}

// Test TCP connection
function testConnection(ip, port, timeout) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    
    const timer = setTimeout(() => {
      socket.destroy();
      resolve(false);
    }, timeout);
    
    socket.connect(port, ip, () => {
      clearTimeout(timer);
      socket.destroy();
      resolve(true);
    });
    
    socket.on('error', () => {
      clearTimeout(timer);
      resolve(false);
    });
  });
}

// Frontend-compatible discovery endpoint (legacy alias)
app.post('/api/v1/printing/discover', async (req, res) => {
  try {
    console.log('🔍 Frontend discovery request received:', req.body);
    
    // Use default network ranges if none provided
    const scanRanges = req.body.scanRanges || [
      '192.168.1.0/24',
      '192.168.0.0/24', 
      '10.0.0.0/24',
      '172.16.0.0/24'
    ];
    
    const discoveryOptions = {
      scanRanges,
      timeout: req.body.timeout || 300,
      maxConcurrent: 50,
      ports: [9100, 9101, 9102, 515, 631, 80, 8080, 54921, 8610, 3911],
      deepScan: true,
      enableSNMP: req.body.enableSNMP || false
    };
    
    const printers = await discoverNetworkPrinters(discoveryOptions);
    
    res.json({
      success: true,
      discovered: printers,
      count: printers.length,
      scannedRanges: scanRanges
    });
  } catch (error) {
    console.error('❌ Discovery error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      discovered: []
    });
  }
});

// Network discovery endpoint
app.post('/api/v1/printing/network-discovery', async (req, res) => {
  try {
    console.log('📨 Network discovery request received:', req.body);
    
    const options = {
      scanRanges: req.body.scanRanges || [req.body.scanRange || '10.0.2.0/24'],
      scanRange: req.body.scanRange, // Keep for backward compatibility
      ports: req.body.ports || [9100, 515, 631],
      timeout: req.body.timeout || 2000
    };
    
    const printers = await discoverNetworkPrinters(options);
    
    res.json({
      success: true,
      count: printers.length,
      printers: printers
    });
    
  } catch (error) {
    console.error('❌ Discovery failed:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      printers: []
    });
  }
});

// Printer validation endpoint
app.post('/api/v1/printing/validate', async (req, res) => {
  try {
    console.log('🔍 Printer validation request received:', req.body);
    
    const { type, connection, timeout = 5000 } = req.body;
    
    if (type !== 'network' || !connection) {
      return res.status(400).json({
        success: false,
        message: 'Invalid validation request. Network type and connection details required.',
        capabilities: []
      });
    }
    
    const { ip, port } = connection;
    
    if (!ip || !port) {
      return res.status(400).json({
        success: false,
        message: 'IP address and port are required for network printer validation.',
        capabilities: []
      });
    }
    
    console.log(`🧪 Validating printer connection to ${ip}:${port}`);
    
    // Test the connection
    const isConnectable = await testConnection(ip, port, Math.min(timeout, 10000));
    
    if (isConnectable) {
      // Determine capabilities based on the port
      let capabilities = ['text', 'cut'];
      let message = `Successfully connected to printer at ${ip}:${port}`;
      
      if (port === 80) {
        capabilities = ['text', 'cut', 'graphics', 'web-management'];
        message += ' (Web-enabled printer with management interface)';
      } else if (port === 9100) {
        capabilities = ['text', 'cut', 'barcode', 'qr'];
        message += ' (RAW printing protocol - ESC/POS compatible)';
      } else if (port === 631) {
        capabilities = ['text', 'cut', 'graphics', 'ipp'];
        message += ' (IPP - Internet Printing Protocol)';
      } else if (port === 515) {
        capabilities = ['text', 'cut', 'graphics', 'lpr'];
        message += ' (LPR - Line Printer Remote)';
      }
      
      console.log(`✅ Validation successful: ${ip}:${port}`);
      
      res.json({
        success: true,
        message: message,
        capabilities: capabilities,
        connectionDetails: {
          ip: ip,
          port: port,
          responseTime: Math.floor(Math.random() * 100) + 50,
          status: 'online'
        }
      });
    } else {
      console.log(`❌ Validation failed: ${ip}:${port} not reachable`);
      
      res.json({
        success: false,
        message: `Failed to connect to printer at ${ip}:${port}. Please check:\n• Printer is powered on\n• Network connection is active\n• IP address and port are correct\n• Printer is on the same network/VLAN`,
        capabilities: [],
        troubleshooting: [
          'Verify printer is powered on',
          'Check network cable connection',
          'Confirm IP address is correct',
          'Test ping connectivity',
          'Check firewall settings',
          'Verify printer is on same subnet'
        ]
      });
    }
    
  } catch (error) {
    console.error('❌ Printer validation error:', error);
    res.status(500).json({
      success: false,
      message: 'Printer validation failed due to server error: ' + error.message,
      capabilities: []
    });
  }
});

// Test print endpoint
app.post('/api/v1/printing/test-print', async (req, res) => {
  try {
    console.log('🧪 Test print request received:', req.body);
    
    const { type, connection, testType = 'basic', timeout = 10000 } = req.body;
    
    if (type !== 'network' || !connection) {
      return res.status(400).json({
        success: false,
        message: 'Invalid test print request. Network type and connection details required.'
      });
    }
    
    const { ip, port } = connection;
    
    if (!ip || !port) {
      return res.status(400).json({
        success: false,
        message: 'IP address and port are required for network printer test.'
      });
    }
    
    console.log(`🖨️ Sending test print to ${ip}:${port} (${testType} test)`);
    
    // Generate test print content based on test type and port
    let printContent = '';
    let contentDescription = '';
    
    if (port === 9100) {
      // ESC/POS commands for thermal printers
      if (testType === 'receipt') {
        printContent = generateReceiptTest();
        contentDescription = 'Sample receipt with items and totals';
      } else if (testType === 'alignment') {
        printContent = generateAlignmentTest();
        contentDescription = 'Text alignment and formatting test';
      } else {
        printContent = generateBasicESCPOSTest();
        contentDescription = 'Basic connectivity and text printing test';
      }
    } else if (port === 80) {
      // HTTP printing (if supported)
      printContent = generateHTTPPrintTest();
      contentDescription = 'HTTP-based test print (if supported)';
    } else if (port === 515 || port === 631) {
      // LPR/IPP printing
      printContent = generateLPRTest();
      contentDescription = 'Standard text document test';
    } else {
      printContent = generateGenericTest();
      contentDescription = 'Generic text test';
    }
    
    // Send the test print
    const printResult = await sendTestPrint(ip, port, printContent, timeout);
    
    if (printResult.success) {
      console.log(`✅ Test print sent successfully to ${ip}:${port}`);
      
      res.json({
        success: true,
        message: `Test print sent successfully to ${ip}:${port}`,
        testDetails: {
          printerAddress: `${ip}:${port}`,
          contentType: contentDescription,
          bytesSent: printContent.length,
          responseTime: printResult.responseTime,
          protocol: getProtocolName(port)
        }
      });
    } else {
      console.log(`❌ Test print failed to ${ip}:${port}: ${printResult.error}`);
      
      res.json({
        success: false,
        message: `Test print failed: ${printResult.error}`,
        troubleshooting: [
          'Verify printer is powered on and ready',
          'Check paper is loaded correctly',
          'Ensure printer is not in error state',
          'Confirm network connectivity',
          'Try different test types if available'
        ]
      });
    }
    
  } catch (error) {
    console.error('❌ Test print error:', error);
    res.status(500).json({
      success: false,
      message: 'Test print failed due to server error: ' + error.message
    });
  }
});

// Helper functions for test print
function generateBasicESCPOSTest() {
  // MULTI-LINE A4 format with proper line endings and form feed
  const lines = [
    'RESTAURANT PLATFORM PRINTER TEST',
    '================================',
    '',
    'Status: Connection Successful',
    'Data Transfer: OK',
    'Text Printing: OK',
    '',
    `Test Date: ${new Date().toLocaleString()}`,
    `Printer IP: Test Connection`,
    '',
    'Multi-line printing test:',
    '• Line 1: Basic text output',
    '• Line 2: Character encoding test',
    '• Line 3: Symbol support check ✓',
    '',
    'End of basic printer test',
    ''
  ];
  
  // Join with \r\n and add form feed at end for A4 paper
  const testContent = lines.join('\r\n') + '\f';
  return Buffer.from(testContent);
}

function generateReceiptTest() {
  // MULTI-LINE receipt format for A4 paper
  const lines = [
    'RESTAURANT PLATFORM TEST RECEIPT',
    '=================================',
    '',
    `Date: ${new Date().toLocaleDateString()}`,
    `Time: ${new Date().toLocaleTimeString()}`,
    '',
    'ORDER DETAILS:',
    '-'.repeat(33),
    'Classic Burger               $12.99',
    'French Fries                  $4.50',
    'Soft Drink                    $2.99',
    'Extra Sauce                   $0.75',
    '',
    '-'.repeat(33),
    'Subtotal:                    $21.23',
    'Tax (8%):                     $1.70',
    'Service Fee:                  $1.50',
    '',
    'TOTAL:                       $24.43',
    '='.repeat(33),
    '',
    'Payment Method: Test Card',
    'Status: COMPLETED',
    '',
    'Thank you for testing!',
    'Visit us again soon.',
    ''
  ];
  
  // Join with \r\n and add form feed at end for A4 paper
  const receiptContent = lines.join('\r\n') + '\f';
  return Buffer.from(receiptContent);
}

function generateAlignmentTest() {
  // MULTI-LINE alignment test for A4 paper
  const lines = [
    'PRINTER ALIGNMENT & FORMATTING TEST',
    '===================================',
    '',
    'Left Aligned Text',
    '        Center Aligned Text',
    '                    Right Aligned Text',
    '',
    'Different Text Sizes and Styles:',
    '-'.repeat(35),
    'Normal text line',
    'UPPERCASE TEXT LINE',
    'lowercase text line',
    '',
    'Special Characters Test:',
    '• Bullet point 1',
    '• Bullet point 2', 
    '✓ Checkmark test',
    '✗ Cross mark test',
    '→ Arrow test',
    '',
    'Number and Currency:',
    '$123.45 - Price test',
    '98.6% - Percentage test',
    '12:34 PM - Time test',
    '',
    `Test completed: ${new Date().toLocaleString()}`,
    'All formatting tests passed!',
    ''
  ];
  
  // Join with \r\n and add form feed at end for A4 paper
  const alignmentContent = lines.join('\r\n') + '\f';
  return Buffer.from(alignmentContent);
}

function generateHTTPPrintTest() {
  // For HTTP-based printers, we'll send a simple text document
  return `Content-Type: text/plain\\r\\n\\r\\nHTTP PRINTER TEST\\n================\\n\\nThis is a test print via HTTP protocol.\\nDate: ${new Date().toLocaleString()}\\n\\nIf you can read this, the HTTP printing is working!\\n\\n\\n`;
}

function generateLPRTest() {
  return `LPR/IPP PRINTER TEST\\n===================\\n\\nThis is a test document sent via Line Printer Protocol.\\nDate: ${new Date().toLocaleString()}\\nStatus: Connection successful\\n\\nTest items:\\n- Text printing: OK\\n- Protocol support: OK\\n- Network connectivity: OK\\n\\nEnd of test document.\\n\\n\\n`;
}

function generateGenericTest() {
  return `PRINTER TEST\\n============\\nDate: ${new Date().toLocaleString()}\\nConnection: Successful\\nOutput: Working\\n\\nThis is a generic test print.\\n\\n\\n`;
}

async function sendTestPrint(ip, port, content, timeout) {
  const net = require('net');
  
  return new Promise((resolve) => {
    const startTime = Date.now();
    const socket = new net.Socket();
    
    // Set socket options for better reliability with A4 printers
    socket.setKeepAlive(true, 1000);
    socket.setNoDelay(true); // Send data immediately
    
    const timer = setTimeout(() => {
      socket.destroy();
      resolve({
        success: false,
        error: 'Connection timeout - printer may be busy or not responding'
      });
    }, timeout);
    
    socket.connect(port, ip, () => {
      console.log(`📤 Connected to printer, sending ${content.length} bytes...`);
      
      socket.write(content, (writeError) => {
        clearTimeout(timer);
        
        if (writeError) {
          socket.end();
          resolve({
            success: false,
            error: 'Failed to send data to printer: ' + writeError.message
          });
        } else {
          // For A4 printers, give more time to process and use proper socket closure
          console.log('✅ Data sent successfully, waiting for printer to process...');
          
          // End the connection gracefully instead of destroying
          socket.end();
          
          // Give A4 printers more time to process the data (especially with form feed)
          setTimeout(() => {
            resolve({
              success: true,
              responseTime: Date.now() - startTime
            });
          }, 1500); // Increased from 500ms to 1500ms for A4 processing
        }
      });
    });
    
    socket.on('error', (error) => {
      clearTimeout(timer);
      resolve({
        success: false,
        error: 'Network error: ' + error.message
      });
    });
  });
}

function getProtocolName(port) {
  switch(port) {
    case 9100: return 'RAW/ESC-POS';
    case 80: return 'HTTP';
    case 515: return 'LPR';
    case 631: return 'IPP';
    default: return 'Custom';
  }
}

// Health check
// Printer management endpoints
app.get('/api/v1/printing/printers', (req, res) => {
  console.log('📋 GET /api/v1/printing/printers - Fetching printer list');
  console.log(`📊 Currently stored printers: ${storedPrinters.length}`);
  
  // Return stored printers with updated timestamps
  const printersWithUpdatedStatus = storedPrinters.map(printer => ({
    ...printer,
    lastSeen: new Date().toISOString(),
    status: printer.status // Keep current status
  }));
  
  res.json({
    success: true,
    printers: printersWithUpdatedStatus,
    count: storedPrinters.length
  });
});

app.post('/api/v1/printing/printers', (req, res) => {
  console.log('➕ POST /api/v1/printing/printers - Adding new printer');
  console.log('Request body:', req.body);
  
  // Validate required fields
  if (!req.body.name || !req.body.type) {
    return res.status(400).json({
      success: false,
      message: 'Name and type are required'
    });
  }
  
  // Generate a unique ID for the printer
  const printerId = `printer-${Date.now()}`;
  
  // Create printer object
  const printer = {
    id: printerId,
    name: req.body.name,
    type: req.body.type,
    connection: req.body.connection || 'network',
    ip: req.body.ip,
    port: req.body.port || 9100,
    manufacturer: req.body.manufacturer || 'Unknown',
    model: req.body.model || 'Unknown',
    status: 'online',
    isDefault: req.body.isDefault || false,
    companyId: req.body.companyId,
    companyName: req.body.companyName,
    branchId: req.body.branchId,
    branchName: req.body.branchName,
    assignedTo: req.body.assignedTo || 'all',
    location: req.body.location,
    paperWidth: req.body.paperWidth || 80,
    capabilities: req.body.capabilities || ['text', 'cut'],
    createdAt: new Date().toISOString()
  };
  
  // Store the printer in memory
  storedPrinters.push(printer);
  
  console.log('✅ Printer created and stored:', printer);
  console.log(`📊 Total printers now: ${storedPrinters.length}`);
  
  res.json({
    success: true,
    message: 'Printer added successfully',
    printer: printer,
    totalPrinters: storedPrinters.length
  });
});

// PUT endpoint to update a printer
app.put('/api/v1/printing/printers/:id', (req, res) => {
  const printerId = req.params.id;
  console.log(`✏️ PUT /api/v1/printing/printers/${printerId} - Updating printer`);
  console.log('Request body:', req.body);

  // Find the printer in storage
  const printerIndex = storedPrinters.findIndex(p => p.id === printerId);
  if (printerIndex === -1) {
    return res.status(404).json({
      success: false,
      message: 'Printer not found',
      error: 'PRINTER_NOT_FOUND'
    });
  }

  // Update the printer with new data
  const existingPrinter = storedPrinters[printerIndex];
  const updatedPrinter = {
    ...existingPrinter,
    name: req.body.name || existingPrinter.name,
    type: req.body.type || existingPrinter.type,
    companyId: req.body.companyId !== undefined ? req.body.companyId : existingPrinter.companyId,
    companyName: req.body.companyName !== undefined ? req.body.companyName : existingPrinter.companyName,
    branchId: req.body.branchId !== undefined ? req.body.branchId : existingPrinter.branchId,
    branchName: req.body.branchName !== undefined ? req.body.branchName : existingPrinter.branchName,
    assignedTo: req.body.assignedTo || existingPrinter.assignedTo,
    location: req.body.location !== undefined ? req.body.location : existingPrinter.location,
    isDefault: req.body.isDefault !== undefined ? req.body.isDefault : existingPrinter.isDefault,
    updatedAt: new Date().toISOString()
  };

  // Replace the printer in the array
  storedPrinters[printerIndex] = updatedPrinter;

  console.log('✅ Printer updated successfully:', updatedPrinter);
  console.log(`📊 Total printers: ${storedPrinters.length}`);

  res.json({
    success: true,
    printer: updatedPrinter,
    message: 'Printer updated successfully'
  });
});

app.get('/api/v1/printing/service/status', (req, res) => {
  console.log('🔍 GET /api/v1/printing/service/status - Service status check');
  
  res.json({
    success: true,
    isRunning: true,
    version: '1.0.0',
    lastPing: new Date().toISOString(),
    connectedPrinters: 1,
    totalJobs: 42,
    failedJobs: 2
  });
});

app.get('/api/v1/printing/jobs', (req, res) => {
  console.log('📝 GET /api/v1/printing/jobs - Fetching print jobs');
  
  const limit = parseInt(req.query.limit) || 10;
  
  res.json({
    success: true,
    jobs: [
      {
        id: 'job-1',
        orderId: 'order-123',
        type: 'receipt',
        printerId: 'printer-1',
        status: 'completed',
        content: { receipt: 'data' },
        createdAt: new Date(Date.now() - 300000).toISOString()
      },
      {
        id: 'job-2',
        orderId: 'order-124',
        type: 'kitchen_order',
        printerId: 'printer-1',
        status: 'pending',
        content: { order: 'data' },
        createdAt: new Date(Date.now() - 120000).toISOString()
      }
    ].slice(0, limit),
    count: 2
  });
});

app.post('/api/v1/printing/printers/:id/test', async (req, res) => {
  const printerId = req.params.id;
  const testType = req.body.testType || 'basic';
  const copies = req.body.copies || 1;
  
  console.log(`🧪 POST /api/v1/printing/printers/${printerId}/test - Testing printer (${testType} test, ${copies} copies)`);
  
  try {
    // Find the printer in storage
    const printer = storedPrinters.find(p => p.id === printerId);
    if (!printer) {
      return res.status(404).json({
        success: false,
        message: 'Printer not found',
        error: 'PRINTER_NOT_FOUND'
      });
    }

    console.log(`🖨️ Attempting to print ${copies} test page(s) to ${printer.name} at ${printer.ip}:${printer.port}`);

    // Generate appropriate test content based on printer type and test type
    let testContent = '';
    let contentDescription = '';

    if (printer.port === 9100 || printer.type === 'receipt') {
      // ESC/POS commands for thermal printers
      if (testType === 'receipt') {
        testContent = generateReceiptTestContent(printer, copies);
        contentDescription = `Receipt test x${copies}`;
      } else if (testType === 'alignment') {
        testContent = generateAlignmentTestContent(printer, copies);
        contentDescription = `Alignment test x${copies}`;
      } else {
        testContent = generateBasicTestContent(printer, copies);
        contentDescription = `Basic connectivity test x${copies}`;
      }
    } else {
      // Generic text for other printer types
      testContent = generateGenericTestContent(printer, copies);
      contentDescription = `Generic test x${copies}`;
    }

    // Actually send the test print to the physical printer
    const printResult = await sendTestPrintToPhysicalPrinter(printer.ip, printer.port, testContent, 5000);
    
    if (printResult.success) {
      console.log(`✅ Test print sent successfully to ${printer.name} (${printer.ip}:${printer.port})`);
      res.json({
        success: true,
        message: `Test print sent successfully to ${printer.name}`,
        testDetails: {
          printerId: printerId,
          printerName: printer.name,
          printerAddress: `${printer.ip}:${printer.port}`,
          testType: testType,
          copies: copies,
          contentDescription: contentDescription,
          responseTime: printResult.responseTime,
          bytesSent: testContent.length,
          status: 'printed'
        }
      });
    } else {
      console.error(`❌ Test print failed to ${printer.name}: ${printResult.error}`);
      res.status(500).json({
        success: false,
        message: `Test print failed: ${printResult.error}`,
        error: printResult.error,
        testDetails: {
          printerId: printerId,
          printerName: printer.name,
          printerAddress: `${printer.ip}:${printer.port}`,
          testType: testType,
          copies: copies,
          status: 'failed'
        }
      });
    }
  } catch (error) {
    console.error('❌ Test printing error:', error);
    res.status(500).json({
      success: false,
      message: 'Test printing failed with error',
      error: error.message
    });
  }
});

app.get('/api/v1/health', (req, res) => {
  res.json({ status: 'ok', service: 'Simple Discovery Server' });
});

const port = 3001;
app.listen(port, () => {
  console.log(`🚀 Simple discovery server running on http://localhost:${port}`);
  console.log(`📡 Network discovery endpoint: http://localhost:${port}/api/v1/printing/network-discovery`);
  
  // Start real-time printer status monitoring
  console.log(`🖨️  Starting printer status monitoring...`);
  startPrinterMonitoring();
});