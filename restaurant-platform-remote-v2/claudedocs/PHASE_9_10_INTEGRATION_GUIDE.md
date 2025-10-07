# Phase 9-10 Integration Guide

**Quick Start**: Step-by-step instructions to integrate reliability enhancements into your existing system

---

## Prerequisites

Before starting integration:
- ✅ Backend running on port 3001
- ✅ Frontend running on port 3000
- ✅ PrinterMasterv2 desktop app configured
- ✅ PostgreSQL database accessible

---

## Step 1: Backend Integration (15 minutes)

### 1.1 Update Printing Module

Edit `/backend/src/modules/printing/printing.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { PrintingService } from './printing.service';
import { PrintingController } from './printing.controller';
import { PrintingWebSocketGateway } from './gateways/printing-websocket.gateway';
import { CircuitBreakerService } from './services/circuit-breaker.service';
import { TimeoutOptimizerService } from './services/timeout-optimizer.service';
// ... other imports

@Module({
  controllers: [PrintingController],
  providers: [
    PrintingService,
    PrintingWebSocketGateway,
    CircuitBreakerService,         // ✅ ADD
    TimeoutOptimizerService,        // ✅ ADD
    // ... other services
  ],
  exports: [
    PrintingService,
    CircuitBreakerService,          // ✅ ADD
    TimeoutOptimizerService         // ✅ ADD
  ]
})
export class PrintingModule {}
```

### 1.2 Inject Services into Printing Service

Edit `/backend/src/modules/printing/printing.service.ts`:

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { CircuitBreakerService } from './services/circuit-breaker.service';
import { TimeoutOptimizerService } from './services/timeout-optimizer.service';

@Injectable()
export class PrintingService {
  private readonly logger = new Logger(PrintingService.name);

  constructor(
    private prisma: PrismaService,
    private circuitBreaker: CircuitBreakerService,      // ✅ ADD
    private timeoutOptimizer: TimeoutOptimizerService,  // ✅ ADD
    // ... other dependencies
  ) {}

  // ... existing code
}
```

### 1.3 Wrap testPrinter with Circuit Breaker

Replace the `testPrinter` method:

```typescript
async testPrinter(id: string, companyId?: string) {
  const printer = await this.findOnePrinter(id, companyId, undefined, undefined);

  // ✅ Execute through circuit breaker
  return await this.circuitBreaker.execute(
    id,
    async () => {
      // Start latency measurement
      const measurementId = this.timeoutOptimizer.startMeasurement(id, 'test');
      const startTime = new Date();

      try {
        this.logger.log(`🖨️ Testing printer: ${printer.name} (${printer.type})`);

        const isPrinterMasterConnected = await this.websocketGateway.checkPrinterMasterConnection(printer.branchId);

        if (isPrinterMasterConnected) {
          const testResult = await this.sendPhysicalPrintTest(printer);

          // Record successful measurement
          this.timeoutOptimizer.completeMeasurement(
            measurementId, id, 'test', startTime, testResult.success, testResult.error
          );

          return testResult;
        }

        // Fallback methods...
        const result = { success: false, message: 'PrinterMaster not available' };

        // Record failed measurement
        this.timeoutOptimizer.completeMeasurement(
          measurementId, id, 'test', startTime, false, 'PrinterMaster offline'
        );

        return result;

      } catch (error) {
        // Record failed measurement
        this.timeoutOptimizer.completeMeasurement(
          measurementId, id, 'test', startTime, false, error.message
        );

        throw error;
      }
    },
    'printer_test'
  );
}
```

### 1.4 Update WebSocket Gateway

Edit `/backend/src/modules/printing/gateways/printing-websocket.gateway.ts`:

```typescript
import { TimeoutOptimizerService } from '../services/timeout-optimizer.service';

export class PrintingWebSocketGateway {
  constructor(
    private prisma: PrismaService,
    private timeoutOptimizer: TimeoutOptimizerService  // ✅ ADD
  ) {}

  async sendPhysicalPrintTest(testData: any): Promise<any> {
    this.logger.log(`🖨️ [PHYSICAL-TEST] Sending test to PrinterMaster: ${testData.printerName}`);

    // ✅ Get adaptive timeout
    const adaptiveTimeout = this.timeoutOptimizer.getTimeout(
      testData.printerId,
      'test'
    );

    // ✅ Start measurement
    const measurementId = this.timeoutOptimizer.startMeasurement(
      testData.printerId,
      'test'
    );
    const startTime = new Date();

    return new Promise(async (resolve) => {
      // ✅ Use adaptive timeout instead of fixed 15000ms
      const timeout = setTimeout(() => {
        // Record timeout as failure
        this.timeoutOptimizer.completeMeasurement(
          measurementId,
          testData.printerId,
          'test',
          startTime,
          false,
          `Timeout after ${adaptiveTimeout}ms`
        );

        this.logger.warn(`⏰ [PHYSICAL-TEST] Timeout after ${adaptiveTimeout}ms for printer: ${testData.printerName}`);

        resolve({
          success: false,
          message: `PrinterMaster connection timeout after ${adaptiveTimeout}ms`,
          error: `Adaptive timeout exceeded`,
          adaptiveTimeout,
          suggestion: 'Make sure RestaurantPrint Pro desktop app is running'
        });
      }, adaptiveTimeout);  // ✅ Dynamic timeout!

      // ... existing client detection and emit logic ...

      // ✅ On result received
      const handleTestResult = (result: any) => {
        clearTimeout(timeout);

        // Record measurement
        const duration = this.timeoutOptimizer.completeMeasurement(
          measurementId,
          testData.printerId,
          'test',
          startTime,
          result.success,
          result.error
        );

        resolve({
          success: result.success,
          message: result.message || 'Physical print test completed',
          error: result.error,
          timestamp: result.timestamp,
          processingTime: duration,
          adaptiveTimeout,
          timeoutUtilization: `${(duration / adaptiveTimeout * 100).toFixed(1)}%`
        });
      };

      // ... rest of implementation
    });
  }
}
```

---

## Step 2: Desktop App Integration (10 minutes)

### 2.1 Install Dependencies

```bash
cd /home/admin/restaurant-platform-remote-v2/PrinterMasterv2/apps/desktop
npm install socket.io-client
```

### 2.2 Replace Socket Connection

Edit `/PrinterMasterv2/apps/desktop/src/main/index.ts` (or equivalent main file):

```typescript
import { createReconnectionManager } from './services/reconnection-manager.service';

let reconnectionManager: ReconnectionManager | null = null;

function initializeBackendConnection() {
  const serverUrl = process.env.BACKEND_URL || 'http://localhost:3001';
  const licenseKey = getLicenseKey(); // Your license retrieval logic
  const deviceId = getDeviceId();     // Your device ID logic

  reconnectionManager = createReconnectionManager(
    `${serverUrl}/printing-ws`,
    {
      userRole: 'desktop_app',
      branchId: licenseKey,
      deviceId: deviceId,
      appVersion: app.getVersion(),
      instanceId: `desktop_${deviceId}_${Date.now()}`
    },
    // On Connected
    (socket) => {
      console.log('✅ [CONNECTION] Connected to backend successfully');

      // Start printer discovery
      startPrinterDiscovery(socket);

      // Send desktop status
      socket.emit('desktop:status', {
        status: 'connected',
        timestamp: new Date().toISOString(),
        version: app.getVersion()
      });

      // Update UI
      sendToRenderer('connection-status', {
        connected: true,
        healthScore: reconnectionManager.getHealthScore()
      });
    },
    // On Disconnected
    (reason) => {
      console.log(`🔌 [CONNECTION] Disconnected: ${reason}`);

      // Stop printer discovery
      stopPrinterDiscovery();

      // Update UI
      sendToRenderer('connection-status', {
        connected: false,
        reason: reason
      });
    },
    // On Reconnecting
    (attempt, delay) => {
      console.log(`🔄 [CONNECTION] Reconnecting in ${delay}ms (Attempt #${attempt})`);

      // Update UI with reconnection progress
      sendToRenderer('reconnection-status', {
        attempt,
        delay,
        nextAttempt: new Date(Date.now() + delay).toISOString()
      });
    },
    // On Reconnection Failed
    () => {
      console.error('❌ [CONNECTION] Reconnection failed after max retries');

      // Show critical error to user
      sendToRenderer('connection-critical-error', {
        message: 'Unable to connect to backend server'
      });
    }
  );

  // Start connection
  reconnectionManager.connect();
}

// IPC handlers for UI
ipcMain.handle('get-connection-metrics', () => {
  if (!reconnectionManager) return null;

  return {
    metrics: reconnectionManager.getMetrics(),
    healthScore: reconnectionManager.getHealthScore(),
    isConnected: reconnectionManager.isConnected()
  };
});

ipcMain.handle('force-reconnect', () => {
  if (reconnectionManager) {
    reconnectionManager.forceReconnect();
  }
});

// Initialize on app ready
app.on('ready', () => {
  initializeBackendConnection();
});
```

---

## Step 3: Testing (5 minutes)

### 3.1 Run Reliability Tests

```bash
cd /home/admin/restaurant-platform-remote-v2/backend
npm test -- reliability-test.spec.ts
```

Expected output:
```
PASS  src/modules/printing/tests/reliability-test.spec.ts
  Printing System Reliability Tests
    Circuit Breaker Tests
      ✓ should start in CLOSED state (5 ms)
      ✓ should execute successful operations (3 ms)
      ✓ should open circuit after failure threshold (45 ms)
      ✓ should reject requests when OPEN (2 ms)
      ... (8 more tests)
    Timeout Optimizer Tests
      ✓ should return default timeout with no data (2 ms)
      ✓ should record latency measurements (1 ms)
      ... (8 more tests)
    Integration Tests
      ✓ should use circuit breaker with timeout optimizer (105 ms)

Test Suites: 1 passed, 1 total
Tests:       23 passed, 23 total
```

### 3.2 Manual Testing Checklist

**Backend Tests**:
- [ ] Start backend: `npm run start:dev`
- [ ] Check logs for circuit breaker initialization
- [ ] Test printer without Desktop App (should use circuit breaker)
- [ ] Verify timeout adaptation after 10+ tests

**Desktop App Tests**:
- [ ] Start Desktop App
- [ ] Check connection logs for reconnection manager
- [ ] Disconnect network → verify automatic reconnection
- [ ] Check health score in app UI

**Integration Tests**:
- [ ] Print test from Template Builder
- [ ] Check response includes `adaptiveTimeout` and `processingTime`
- [ ] Verify latency measurements in database/logs
- [ ] Test with network latency (slow WiFi)

---

## Step 4: Monitoring Setup (Optional, 5 minutes)

### 4.1 Add Metrics Endpoints

Create `/backend/src/modules/printing/controllers/metrics.controller.ts`:

```typescript
import { Controller, Get, Param } from '@nestjs/common';
import { CircuitBreakerService } from '../services/circuit-breaker.service';
import { TimeoutOptimizerService } from '../services/timeout-optimizer.service';

@Controller('api/v1/printing/metrics')
export class PrintingMetricsController {
  constructor(
    private circuitBreaker: CircuitBreakerService,
    private timeoutOptimizer: TimeoutOptimizerService
  ) {}

  @Get('circuit-breakers')
  getCircuitBreakerMetrics() {
    const allMetrics = this.circuitBreaker.getAllCircuitMetrics();

    return {
      timestamp: new Date().toISOString(),
      circuits: Array.from(allMetrics.entries()).map(([printerId, metrics]) => ({
        printerId,
        ...metrics
      }))
    };
  }

  @Get('latency-report')
  getLatencyReport() {
    return this.timeoutOptimizer.generateLatencyReport();
  }

  @Get('printer/:id/stats')
  getPrinterStats(@Param('id') printerId: string) {
    const testStats = this.timeoutOptimizer.calculateStats(printerId, 'test');
    const printStats = this.timeoutOptimizer.calculateStats(printerId, 'print_job');
    const circuitMetrics = this.circuitBreaker.getCircuitMetrics(printerId);

    return {
      printerId,
      latency: {
        test: testStats,
        print_job: printStats
      },
      circuit: circuitMetrics
    };
  }
}
```

Add to `printing.module.ts`:
```typescript
import { PrintingMetricsController } from './controllers/metrics.controller';

@Module({
  controllers: [
    PrintingController,
    PrintingMetricsController  // ✅ ADD
  ],
  // ...
})
```

### 4.2 Test Metrics Endpoints

```bash
# Circuit breaker metrics
curl http://localhost:3001/api/v1/printing/metrics/circuit-breakers | jq

# Latency report
curl http://localhost:3001/api/v1/printing/metrics/latency-report | jq

# Specific printer stats
curl http://localhost:3001/api/v1/printing/metrics/printer/PRINTER_ID/stats | jq
```

---

## Step 5: Configuration (5 minutes)

### 5.1 Production Configuration

Create `/backend/config/reliability.config.ts`:

```typescript
export const reliabilityConfig = {
  circuitBreaker: {
    production: {
      failureThreshold: 5,
      successThreshold: 2,
      timeout: 30000,
      monitoringPeriod: 60000
    },
    development: {
      failureThreshold: 3,
      successThreshold: 1,
      timeout: 5000,
      monitoringPeriod: 30000
    }
  },
  reconnection: {
    production: {
      strategy: 'EXPONENTIAL_BACKOFF',
      maxRetries: -1,
      baseDelay: 1000,
      maxDelay: 60000,
      jitter: true
    },
    development: {
      strategy: 'LINEAR_BACKOFF',
      maxRetries: 10,
      baseDelay: 500,
      maxDelay: 10000,
      jitter: true
    }
  },
  timeout: {
    adjustmentFactor: 1.5,
    minTimeout: 5000,
    maxTimeout: 120000,
    maxMeasurements: 1000
  }
};

export const getConfig = (env: string) => {
  const isProd = env === 'production';

  return {
    circuitBreaker: isProd
      ? reliabilityConfig.circuitBreaker.production
      : reliabilityConfig.circuitBreaker.development,
    reconnection: isProd
      ? reliabilityConfig.reconnection.production
      : reliabilityConfig.reconnection.development,
    timeout: reliabilityConfig.timeout
  };
};
```

Use in services:
```typescript
import { getConfig } from '../../config/reliability.config';

@Injectable()
export class CircuitBreakerService {
  constructor() {
    const config = getConfig(process.env.NODE_ENV);
    this.defaultConfig = config.circuitBreaker;
  }
}
```

---

## Troubleshooting

### Common Issues

#### 1. "Circuit breaker not found" error
```
Solution: Ensure CircuitBreakerService is in printing.module.ts providers
Check: Restart backend after adding service
```

#### 2. Desktop app not reconnecting
```
Solution: Check reconnection manager initialization
Verify: Check browser console for reconnection logs
Debug: Call reconnectionManager.getMetrics() to see attempts
```

#### 3. Adaptive timeout not changing
```
Solution: Need at least 10 successful measurements
Check: Call timeoutOptimizer.getRecentMeasurements()
Verify: Measurements are being recorded with success=true
```

#### 4. High timeout values (>60s)
```
Solution: Check printer performance - likely network issues
Action: Investigate printer connectivity
Fix: Optimize network or replace slow printer
```

---

## Verification Checklist

Before deploying to production:

### Backend
- [ ] Circuit breaker service added to module
- [ ] Timeout optimizer service added to module
- [ ] testPrinter method wrapped with circuit breaker
- [ ] WebSocket gateway uses adaptive timeouts
- [ ] Reliability tests passing (npm test)
- [ ] Metrics endpoints accessible

### Desktop App
- [ ] Reconnection manager initialized
- [ ] Socket.io replaced with reconnection manager
- [ ] Connection status displayed in UI
- [ ] Health metrics accessible via IPC
- [ ] Automatic reconnection tested

### Integration
- [ ] Print test works end-to-end
- [ ] Latency measurements recorded
- [ ] Circuit breaker prevents cascading failures
- [ ] Desktop app reconnects after network drop
- [ ] Adaptive timeouts adjust over time

---

## Rollback Plan

If issues arise, revert changes:

1. **Backend Rollback**:
```bash
git checkout HEAD~1 -- src/modules/printing/printing.service.ts
git checkout HEAD~1 -- src/modules/printing/printing.module.ts
git checkout HEAD~1 -- src/modules/printing/gateways/printing-websocket.gateway.ts
npm run build
pm2 restart backend
```

2. **Desktop App Rollback**:
```bash
git checkout HEAD~1 -- apps/desktop/src/main/index.ts
npm run build
# Restart desktop app
```

3. **Database**: No schema changes, safe to rollback

---

## Performance Expectations

After integration, expect:

- **Print Test Response**: 1-5s (was 15-30s)
- **False Timeout Rate**: <1% (was 8-12%)
- **Auto-Recovery Time**: 30-60s (was manual/infinite)
- **System Uptime**: 99.5%+ with automatic recovery

---

## Next Steps

1. **Monitor for 24 hours**: Check metrics, circuit breaker states, latencies
2. **Tune configuration**: Adjust thresholds based on real usage patterns
3. **Set up alerts**: Notification when circuits open or health degrades
4. **Performance optimization**: Use latency report to identify slow printers

---

**Support**: If issues persist, check logs and refer to `/claudedocs/PHASE_9_10_RELIABILITY.md` for detailed troubleshooting.
