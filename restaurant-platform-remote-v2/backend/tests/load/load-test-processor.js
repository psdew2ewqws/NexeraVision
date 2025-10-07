/**
 * Artillery Load Test Processor
 * Custom functions for load testing PrinterMaster WebSocket system
 */

const { v4: uuidv4 } = require('uuid');

// Track correlation IDs to verify uniqueness
const correlationIdSet = new Set();
let totalCorrelationIds = 0;
let duplicateCorrelationIds = 0;

/**
 * Generate random string for test data
 */
function randomString(context, events, done) {
  context.vars.randomString = uuidv4().substring(0, 8);
  return done();
}

/**
 * Generate random number for test data
 */
function randomNumber(context, events, done) {
  const min = context.vars.min || 1;
  const max = context.vars.max || 100;
  context.vars.randomNumber = Math.floor(Math.random() * (max - min + 1)) + min;
  return done();
}

/**
 * Generate current timestamp
 */
function timestamp(context, events, done) {
  context.vars.timestamp = new Date().toISOString();
  return done();
}

/**
 * Validate correlation ID uniqueness
 */
function validateCorrelationId(context, events, done) {
  const correlationId = context.vars.correlationId;

  if (correlationId) {
    totalCorrelationIds++;

    if (correlationIdSet.has(correlationId)) {
      duplicateCorrelationIds++;
      console.error(`[LOAD-TEST] Duplicate correlation ID detected: ${correlationId}`);
    } else {
      correlationIdSet.add(correlationId);
    }

    // Log uniqueness percentage every 100 IDs
    if (totalCorrelationIds % 100 === 0) {
      const uniquenessRate = ((totalCorrelationIds - duplicateCorrelationIds) / totalCorrelationIds * 100).toFixed(2);
      console.log(`[LOAD-TEST] Correlation ID Uniqueness: ${uniquenessRate}% (${totalCorrelationIds} total, ${duplicateCorrelationIds} duplicates)`);
    }
  }

  return done();
}

/**
 * Measure WebSocket connection time
 */
function measureConnectionTime(context, events, done) {
  context.vars.connectionStartTime = Date.now();
  return done();
}

/**
 * Calculate WebSocket connection duration
 */
function calculateConnectionDuration(context, events, done) {
  if (context.vars.connectionStartTime) {
    const duration = Date.now() - context.vars.connectionStartTime;
    context.vars.connectionDuration = duration;

    // Emit custom metric
    events.emit('customStat', {
      stat: 'websocket_connection_time',
      value: duration
    });
  }

  return done();
}

/**
 * Measure print job submission time
 */
function measurePrintJobStart(context, events, done) {
  context.vars.printJobStartTime = Date.now();
  return done();
}

/**
 * Calculate print job completion time
 */
function calculatePrintJobDuration(context, events, done) {
  if (context.vars.printJobStartTime) {
    const duration = Date.now() - context.vars.printJobStartTime;
    context.vars.printJobDuration = duration;

    // Emit custom metric
    events.emit('customStat', {
      stat: 'print_job_completion_time',
      value: duration
    });
  }

  return done();
}

/**
 * Generate realistic order data for print jobs
 */
function generateOrderData(context, events, done) {
  const itemCount = Math.floor(Math.random() * 10) + 1;
  const items = [];

  for (let i = 0; i < itemCount; i++) {
    items.push({
      name: `Item ${i + 1}`,
      quantity: Math.floor(Math.random() * 5) + 1,
      price: (Math.random() * 50 + 5).toFixed(2)
    });
  }

  context.vars.orderData = {
    orderId: `order-${uuidv4()}`,
    items,
    subtotal: items.reduce((sum, item) => sum + (item.quantity * parseFloat(item.price)), 0).toFixed(2),
    tax: 0,
    total: 0
  };

  context.vars.orderData.tax = (context.vars.orderData.subtotal * 0.16).toFixed(2);
  context.vars.orderData.total = (parseFloat(context.vars.orderData.subtotal) + parseFloat(context.vars.orderData.tax)).toFixed(2);

  return done();
}

/**
 * Log test statistics summary
 */
function logTestSummary(context, events, done) {
  console.log('\n[LOAD-TEST] Test Summary:');
  console.log(`Total Correlation IDs: ${totalCorrelationIds}`);
  console.log(`Duplicate Correlation IDs: ${duplicateCorrelationIds}`);
  const uniquenessRate = totalCorrelationIds > 0
    ? ((totalCorrelationIds - duplicateCorrelationIds) / totalCorrelationIds * 100).toFixed(2)
    : 0;
  console.log(`Uniqueness Rate: ${uniquenessRate}%`);

  return done();
}

/**
 * Simulate Desktop App acknowledging print request
 */
function simulateDesktopAppAck(context, events, done) {
  const correlationId = context.vars.correlationId || `test_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

  // Simulate acknowledgment callback
  setTimeout(() => {
    context.vars.ackReceived = true;
    context.vars.ackTimestamp = Date.now();
  }, Math.random() * 100 + 50); // Random delay 50-150ms

  return done();
}

/**
 * Validate health metrics format
 */
function validateHealthMetrics(context, events, done) {
  const healthData = context.vars.healthData;

  if (healthData) {
    // Validate required fields
    const requiredFields = [
      'uptime',
      'reconnectionCount',
      'averageLatency',
      'packetLossRate',
      'connectionQuality',
      'deviceId',
      'branchId'
    ];

    const isValid = requiredFields.every(field => healthData.hasOwnProperty(field));

    if (!isValid) {
      console.error('[LOAD-TEST] Invalid health metrics format');
    }
  }

  return done();
}

/**
 * Generate concurrent print requests batch
 */
function generatePrintRequestBatch(context, events, done) {
  const batchSize = Math.floor(Math.random() * 10) + 5; // 5-15 concurrent requests
  const requests = [];

  for (let i = 0; i < batchSize; i++) {
    requests.push({
      printerId: `printer-${Math.floor(Math.random() * 10) + 1}`,
      correlationId: `batch_${Date.now()}_${i}_${Math.random().toString(36).substring(2, 9)}`,
      timestamp: new Date().toISOString()
    });
  }

  context.vars.printRequestBatch = requests;
  return done();
}

module.exports = {
  randomString,
  randomNumber,
  timestamp,
  validateCorrelationId,
  measureConnectionTime,
  calculateConnectionDuration,
  measurePrintJobStart,
  calculatePrintJobDuration,
  generateOrderData,
  logTestSummary,
  simulateDesktopAppAck,
  validateHealthMetrics,
  generatePrintRequestBatch
};
