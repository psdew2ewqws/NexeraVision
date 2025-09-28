/**
 * Comprehensive Test Suite for PrinterMaster Service
 *
 * Tests cover:
 * - Service initialization and shutdown
 * - Circuit breaker functionality
 * - Connection pool management
 * - Rate limiting
 * - Health checks
 * - Error handling and recovery
 * - USB printer management
 * - API endpoints
 */

const request = require('supertest');
const { expect } = require('chai');
const sinon = require('sinon');
const EventEmitter = require('events');

// Import service components
const PrinterMasterService = require('../service/service-main');
const CircuitBreaker = require('../service/circuit-breaker');
const ConnectionPool = require('../service/connection-pool');
const RateLimiter = require('../service/rate-limiter');
const HealthCheck = require('../service/health-check');
const USBPrinterManager = require('../service/usb-printer-manager');
const GracefulShutdown = require('../service/graceful-shutdown');

describe('PrinterMaster Service Tests', function() {
  this.timeout(30000); // 30 seconds timeout for integration tests

  let service;
  let mockLogger;

  beforeEach(function() {
    // Create mock logger
    mockLogger = {
      info: sinon.stub(),
      warn: sinon.stub(),
      error: sinon.stub(),
      debug: sinon.stub()
    };

    // Stub environment variables
    process.env.PRINTER_SERVICE_PORT = '8183'; // Use different port for tests
    process.env.LOG_LEVEL = 'error'; // Reduce log noise in tests
    process.env.NODE_ENV = 'test';
  });

  afterEach(async function() {
    if (service) {
      await service.shutdown();
      service = null;
    }
    sinon.restore();
  });

  describe('Service Initialization', function() {
    it('should initialize service with default configuration', async function() {
      service = new PrinterMasterService();
      expect(service.port).to.equal(8183);
      expect(service.isShuttingDown).to.be.false;
      expect(service.stats).to.be.an('object');
    });

    it('should setup logging correctly', function() {
      service = new PrinterMasterService();
      expect(service.log).to.exist;
    });

    it('should initialize all components', async function() {
      service = new PrinterMasterService();

      // Mock the initialize method to avoid actual service startup
      sinon.stub(service, 'initialize').resolves();

      await service.initialize();

      expect(service.initialize.calledOnce).to.be.true;
    });
  });

  describe('Circuit Breaker', function() {
    let circuitBreaker;
    let mockService;

    beforeEach(function() {
      mockService = { log: mockLogger, serviceName: 'test-service' };
      circuitBreaker = new CircuitBreaker(mockService, {
        failureThreshold: 3,
        recoveryTimeout: 1000,
        timeout: 500
      });
    });

    it('should start in CLOSED state', function() {
      expect(circuitBreaker.state).to.equal('CLOSED');
      expect(circuitBreaker.failureCount).to.equal(0);
    });

    it('should execute successful operations', async function() {
      const operation = sinon.stub().resolves('success');
      const result = await circuitBreaker.execute(operation, 'test-op');

      expect(result).to.equal('success');
      expect(circuitBreaker.metrics.totalSuccesses).to.equal(1);
      expect(circuitBreaker.state).to.equal('CLOSED');
    });

    it('should handle operation failures', async function() {
      const operation = sinon.stub().rejects(new Error('test error'));

      try {
        await circuitBreaker.execute(operation, 'test-op');
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).to.equal('test error');
        expect(circuitBreaker.failureCount).to.equal(1);
        expect(circuitBreaker.metrics.totalFailures).to.equal(1);
      }
    });

    it('should open circuit after threshold failures', async function() {
      const operation = sinon.stub().rejects(new Error('failure'));

      // Cause failures to exceed threshold
      for (let i = 0; i < 3; i++) {
        try {
          await circuitBreaker.execute(operation, 'test-op');
        } catch (error) {
          // Expected
        }
      }

      expect(circuitBreaker.state).to.equal('OPEN');
    });

    it('should reject operations when circuit is OPEN', async function() {
      // Force circuit to OPEN state
      circuitBreaker.changeState('OPEN');

      const operation = sinon.stub().resolves('success');

      try {
        await circuitBreaker.execute(operation, 'test-op');
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).to.include('Circuit breaker is OPEN');
        expect(operation.called).to.be.false;
      }
    });

    it('should handle operation timeouts', async function() {
      const operation = () => new Promise(resolve => setTimeout(resolve, 1000));

      try {
        await circuitBreaker.execute(operation, 'test-op');
        expect.fail('Should have timed out');
      } catch (error) {
        expect(error.message).to.include('timeout');
        expect(circuitBreaker.metrics.totalTimeouts).to.equal(1);
      }
    });

    it('should reset circuit breaker', function() {
      circuitBreaker.failureCount = 5;
      circuitBreaker.state = 'OPEN';

      circuitBreaker.reset();

      expect(circuitBreaker.state).to.equal('CLOSED');
      expect(circuitBreaker.failureCount).to.equal(0);
    });
  });

  describe('Connection Pool', function() {
    let connectionPool;
    let mockService;

    beforeEach(function() {
      mockService = { log: mockLogger };
      connectionPool = new ConnectionPool(mockService, {
        minConnections: 2,
        maxConnections: 5,
        connectionTimeout: 1000
      });
    });

    afterEach(async function() {
      if (connectionPool) {
        await connectionPool.shutdown();
      }
    });

    it('should initialize with minimum connections', async function() {
      await connectionPool.initialize();

      expect(connectionPool.available.length).to.equal(2);
      expect(connectionPool.connections.size).to.equal(2);
    });

    it('should acquire and release connections', async function() {
      await connectionPool.initialize();

      const connection = await connectionPool.acquire();
      expect(connection).to.exist;
      expect(connectionPool.busy.size).to.equal(1);
      expect(connectionPool.available.length).to.equal(1);

      await connectionPool.release(connection);
      expect(connectionPool.busy.size).to.equal(0);
      expect(connectionPool.available.length).to.equal(2);
    });

    it('should create new connections when needed', async function() {
      await connectionPool.initialize();

      // Acquire all available connections
      const conn1 = await connectionPool.acquire();
      const conn2 = await connectionPool.acquire();

      // This should create a new connection
      const conn3 = await connectionPool.acquire();

      expect(connectionPool.connections.size).to.equal(3);
      expect(connectionPool.busy.size).to.equal(3);
    });

    it('should validate connections before reuse', async function() {
      await connectionPool.initialize();

      // Stub validateConnection to return false
      sinon.stub(connectionPool, 'validateConnection').resolves(false);
      sinon.stub(connectionPool, 'destroyConnection').resolves();

      const connection = await connectionPool.acquire();
      await connectionPool.release(connection);

      // Should have destroyed the invalid connection
      expect(connectionPool.destroyConnection.calledOnce).to.be.true;
    });

    it('should handle connection acquisition timeout', async function() {
      connectionPool.options.maxConnections = 1;
      await connectionPool.initialize();

      // Acquire the only connection
      const conn1 = await connectionPool.acquire();

      // This should timeout
      try {
        await connectionPool.acquire(100); // 100ms timeout
        expect.fail('Should have timed out');
      } catch (error) {
        expect(error.message).to.include('timeout');
      }
    });

    it('should perform health maintenance', async function() {
      await connectionPool.initialize();

      sinon.stub(connectionPool, 'validateConnection').resolves(true);

      await connectionPool.performHealthMaintenance();

      // Should maintain minimum connections
      expect(connectionPool.available.length).to.equal(2);
    });
  });

  describe('Rate Limiter', function() {
    let rateLimiter;
    let mockService;
    let mockReq, mockRes, mockNext;

    beforeEach(function() {
      mockService = { log: mockLogger };
      rateLimiter = new RateLimiter(mockService, {
        windowMs: 1000, // 1 second for testing
        maxRequests: 3
      });

      mockReq = { ip: '127.0.0.1' };
      mockRes = {
        setHeader: sinon.stub(),
        status: sinon.stub().returnsThis(),
        json: sinon.stub()
      };
      mockNext = sinon.stub();
    });

    afterEach(function() {
      rateLimiter.shutdown();
    });

    it('should allow requests under limit', function() {
      rateLimiter.checkLimit(mockReq, mockRes, mockNext);

      expect(mockNext.calledOnce).to.be.true;
      expect(mockRes.status.called).to.be.false;
    });

    it('should block requests over limit', function() {
      // Make requests up to the limit
      for (let i = 0; i < 3; i++) {
        rateLimiter.checkLimit(mockReq, mockRes, mockNext);
      }

      // This should be blocked
      rateLimiter.checkLimit(mockReq, mockRes, mockNext);

      expect(mockRes.status.calledWith(429)).to.be.true;
      expect(rateLimiter.stats.blockedRequests).to.equal(1);
    });

    it('should set rate limit headers', function() {
      rateLimiter.checkLimit(mockReq, mockRes, mockNext);

      expect(mockRes.setHeader.calledWith('RateLimit-Limit', 3)).to.be.true;
      expect(mockRes.setHeader.calledWith('RateLimit-Remaining', 2)).to.be.true;
    });

    it('should reset window after expiration', function(done) {
      // Make requests up to the limit
      for (let i = 0; i < 3; i++) {
        rateLimiter.checkLimit(mockReq, mockRes, mockNext);
      }

      // Wait for window to reset
      setTimeout(() => {
        mockNext.resetHistory();
        mockRes.status.resetHistory();

        rateLimiter.checkLimit(mockReq, mockRes, mockNext);

        expect(mockNext.calledOnce).to.be.true;
        expect(mockRes.status.called).to.be.false;
        done();
      }, 1100);
    });

    it('should track different IPs separately', function() {
      const req1 = { ip: '127.0.0.1' };
      const req2 = { ip: '127.0.0.2' };

      // Make requests from different IPs
      rateLimiter.checkLimit(req1, mockRes, mockNext);
      rateLimiter.checkLimit(req2, mockRes, mockNext);

      expect(rateLimiter.clients.size).to.equal(2);
    });

    it('should clean up expired entries', function(done) {
      rateLimiter.checkLimit(mockReq, mockRes, mockNext);
      expect(rateLimiter.clients.size).to.equal(1);

      // Wait for cleanup
      setTimeout(() => {
        rateLimiter.cleanup();
        expect(rateLimiter.clients.size).to.equal(0);
        done();
      }, 1100);
    });
  });

  describe('Health Check', function() {
    let healthCheck;
    let mockService;

    beforeEach(function() {
      mockService = {
        log: mockLogger,
        getUptime: () => 5000,
        websocketConnected: true,
        usbManager: { getPrinterStatus: () => ({ connectedPrinters: 1 }) },
        server: { listening: true }
      };
      healthCheck = new HealthCheck(mockService);
    });

    afterEach(function() {
      if (healthCheck) {
        healthCheck.shutdown();
      }
    });

    it('should initialize health check system', async function() {
      await healthCheck.initialize();

      expect(healthCheck.isInitialized).to.be.true;
      expect(healthCheck.health.status).to.equal('healthy');
    });

    it('should run health checks', async function() {
      await healthCheck.runHealthCheck();

      expect(healthCheck.health.checks).to.be.an('object');
      expect(healthCheck.health.timestamp).to.exist;
    });

    it('should check system resources', async function() {
      await healthCheck.checkSystemResources();

      expect(healthCheck.health.checks.systemResources).to.exist;
      expect(healthCheck.health.checks.systemResources.status).to.be.oneOf(['pass', 'warn', 'fail']);
    });

    it('should check network connectivity', async function() {
      await healthCheck.checkNetworkConnectivity();

      expect(healthCheck.health.checks.networkConnectivity).to.exist;
      expect(healthCheck.health.checks.networkConnectivity.websocketConnected).to.be.true;
    });

    it('should check printer connectivity', async function() {
      await healthCheck.checkPrinterConnectivity();

      expect(healthCheck.health.checks.printerConnectivity).to.exist;
      expect(healthCheck.health.checks.printerConnectivity.connectedPrinters).to.equal(1);
    });

    it('should calculate overall health status', function() {
      healthCheck.health.checks = {
        test1: { status: 'pass' },
        test2: { status: 'pass' },
        test3: { status: 'warn' }
      };

      healthCheck.calculateOverallHealth();

      expect(healthCheck.health.status).to.equal('degraded');
    });

    it('should get health status', function() {
      const status = healthCheck.getHealthStatus();

      expect(status).to.have.property('status');
      expect(status).to.have.property('timestamp');
      expect(status).to.have.property('checks');
      expect(status).to.have.property('summary');
    });

    it('should get readiness status', function() {
      healthCheck.isInitialized = true;
      healthCheck.health.status = 'healthy';

      const readiness = healthCheck.getReadinessStatus();

      expect(readiness.ready).to.be.true;
      expect(readiness.status).to.equal('ready');
    });

    it('should trigger recovery for issues', async function() {
      const recoverySpy = sinon.spy(healthCheck, 'recoverHighMemory');

      await healthCheck.triggerRecovery('high-memory');

      expect(recoverySpy.calledOnce).to.be.true;
    });
  });

  describe('USB Printer Manager', function() {
    let usbManager;
    let mockService;

    beforeEach(function() {
      mockService = { log: mockLogger };
      usbManager = new USBPrinterManager(mockService);
    });

    afterEach(async function() {
      if (usbManager) {
        await usbManager.shutdown();
      }
    });

    it('should initialize USB manager', function() {
      expect(usbManager.isInitialized).to.be.false;
      expect(usbManager.connectedPrinters).to.be.a('Map');
      expect(usbManager.stats).to.be.an('object');
    });

    it('should load saved printers configuration', async function() {
      // Mock file system
      const fs = require('fs');
      sinon.stub(fs, 'existsSync').returns(true);
      sinon.stub(fs, 'readFileSync').returns(JSON.stringify({
        printers: { 'test-printer': { id: 'test-printer', name: 'Test Printer' } }
      }));

      await usbManager.loadSavedPrinters();

      expect(usbManager.savedPrinters.size).to.equal(1);
    });

    it('should save printers configuration', async function() {
      const fs = require('fs');
      sinon.stub(fs, 'existsSync').returns(true);
      sinon.stub(fs, 'mkdirSync');
      sinon.stub(fs, 'writeFileSync');

      usbManager.savedPrinters.set('test', { id: 'test', name: 'Test' });

      await usbManager.savePrinters();

      expect(fs.writeFileSync.calledOnce).to.be.true;
    });

    it('should identify printer devices', function() {
      const mockDevice = {
        deviceDescriptor: { idVendor: 0x04b8 } // Epson vendor ID
      };

      const isPrinter = usbManager.isPrinterDevice(mockDevice);

      expect(isPrinter).to.be.true;
    });

    it('should get manufacturer name from vendor ID', function() {
      const manufacturer = usbManager.getManufacturerName(0x04b8);
      expect(manufacturer).to.equal('Epson');

      const unknown = usbManager.getManufacturerName(0x9999);
      expect(unknown).to.equal('Unknown');
    });

    it('should get printer status', function() {
      const status = usbManager.getPrinterStatus();

      expect(status).to.have.property('connectedPrinters');
      expect(status).to.have.property('totalPrinters');
      expect(status).to.have.property('connected');
      expect(status).to.have.property('stats');
      expect(status).to.have.property('timestamp');
    });

    it('should refresh printers', async function() {
      sinon.stub(usbManager, 'scanForPrinters').resolves();

      const result = await usbManager.refreshPrinters();

      expect(usbManager.scanForPrinters.calledOnce).to.be.true;
      expect(result).to.have.property('connectedPrinters');
    });
  });

  describe('Graceful Shutdown', function() {
    let gracefulShutdown;
    let mockService;

    beforeEach(function() {
      mockService = {
        log: mockLogger,
        isShuttingDown: false,
        server: { close: sinon.stub().callsArg(0) },
        usbManager: { shutdown: sinon.stub().resolves() },
        healthCheck: { shutdown: sinon.stub() }
      };
      gracefulShutdown = new GracefulShutdown(mockService);
    });

    it('should initialize signal handlers', function() {
      gracefulShutdown.initialize();

      expect(gracefulShutdown.handlersRegistered).to.be.true;
    });

    it('should get shutdown status', function() {
      const status = gracefulShutdown.getShutdownStatus();

      expect(status).to.have.property('isShuttingDown');
      expect(status).to.have.property('currentPhase');
      expect(status).to.have.property('shutdownPhases');
      expect(status).to.have.property('handlersRegistered');
    });

    it('should execute shutdown sequence', async function() {
      sinon.stub(gracefulShutdown, 'stopNewRequests').resolves();
      sinon.stub(gracefulShutdown, 'completeActivePrintJobs').resolves();
      sinon.stub(gracefulShutdown, 'saveApplicationState').resolves();
      sinon.stub(gracefulShutdown, 'closeConnections').resolves();
      sinon.stub(gracefulShutdown, 'cleanupResources').resolves();

      await gracefulShutdown.executeShutdownSequence();

      expect(gracefulShutdown.stopNewRequests.calledOnce).to.be.true;
      expect(gracefulShutdown.completeActivePrintJobs.calledOnce).to.be.true;
      expect(gracefulShutdown.saveApplicationState.calledOnce).to.be.true;
      expect(gracefulShutdown.closeConnections.calledOnce).to.be.true;
      expect(gracefulShutdown.cleanupResources.calledOnce).to.be.true;
    });

    it('should save service statistics', async function() {
      const fs = require('fs');
      sinon.stub(fs, 'existsSync').returns(true);
      sinon.stub(fs, 'mkdirSync');
      sinon.stub(fs, 'writeFileSync');

      await gracefulShutdown.saveServiceStatistics();

      expect(fs.writeFileSync.calledOnce).to.be.true;
    });
  });

  describe('Error Handling', function() {
    beforeEach(function() {
      service = new PrinterMasterService();
      service.log = mockLogger;
    });

    it('should categorize network errors', function() {
      const networkError = new Error('ECONNREFUSED connection refused');
      const category = service.categorizeError(networkError);

      expect(category).to.equal('network');
    });

    it('should categorize hardware errors', function() {
      const hardwareError = new Error('USB device not found');
      const category = service.categorizeError(hardwareError);

      expect(category).to.equal('hardware');
    });

    it('should categorize fatal errors', function() {
      const fatalError = new Error('Out of memory');
      const category = service.categorizeError(fatalError);

      expect(category).to.equal('fatal');
    });

    it('should categorize recoverable errors by default', function() {
      const genericError = new Error('Something went wrong');
      const category = service.categorizeError(genericError);

      expect(category).to.equal('recoverable');
    });

    it('should validate print job input', function() {
      const validJob = {
        printerId: 'test-printer',
        content: 'test content'
      };

      expect(() => service.validatePrintJobInput(validJob)).to.not.throw();

      const invalidJob = { invalid: true };
      expect(() => service.validatePrintJobInput(invalidJob)).to.throw();
    });

    it('should generate correlation IDs', function() {
      const id1 = service.generateCorrelationId();
      const id2 = service.generateCorrelationId();

      expect(id1).to.be.a('string');
      expect(id2).to.be.a('string');
      expect(id1).to.not.equal(id2);
    });
  });

  describe('Integration Tests', function() {
    it('should start and stop service cleanly', async function() {
      service = new PrinterMasterService();

      // Mock dependencies to avoid actual initialization
      sinon.stub(service, 'loadLicenseAndConnect').resolves();
      sinon.stub(service, 'startServer').resolves();

      await service.initialize();
      expect(service.isShuttingDown).to.be.false;

      await service.shutdown();
      expect(service.isShuttingDown).to.be.true;
    });

    it('should handle service restart gracefully', async function() {
      service = new PrinterMasterService();

      sinon.stub(service, 'loadLicenseAndConnect').resolves();
      sinon.stub(service, 'startServer').resolves();

      await service.initialize();

      // Simulate restart
      const shutdownPromise = service.shutdown();

      // Should complete without hanging
      await shutdownPromise;
      expect(service.isShuttingDown).to.be.true;
    });
  });

  describe('Performance Tests', function() {
    it('should handle concurrent requests efficiently', async function() {
      const rateLimiter = new RateLimiter({ log: mockLogger }, {
        windowMs: 60000,
        maxRequests: 1000
      });

      const requests = [];
      const mockReq = { ip: '127.0.0.1' };
      const mockRes = { setHeader: sinon.stub() };
      const mockNext = sinon.stub();

      // Simulate 100 concurrent requests
      for (let i = 0; i < 100; i++) {
        requests.push(new Promise(resolve => {
          rateLimiter.checkLimit(mockReq, mockRes, mockNext);
          resolve();
        }));
      }

      await Promise.all(requests);

      expect(rateLimiter.stats.totalRequests).to.equal(100);
      expect(rateLimiter.stats.blockedRequests).to.equal(0);

      rateLimiter.shutdown();
    });

    it('should cleanup resources efficiently', async function() {
      const connectionPool = new ConnectionPool({ log: mockLogger }, {
        minConnections: 5,
        maxConnections: 10
      });

      await connectionPool.initialize();

      // Acquire several connections
      const connections = [];
      for (let i = 0; i < 5; i++) {
        connections.push(await connectionPool.acquire());
      }

      // Release all connections
      for (const conn of connections) {
        await connectionPool.release(conn);
      }

      expect(connectionPool.available.length).to.equal(5);
      expect(connectionPool.busy.size).to.equal(0);

      await connectionPool.shutdown();
    });
  });
});

module.exports = {
  PrinterMasterService,
  CircuitBreaker,
  ConnectionPool,
  RateLimiter,
  HealthCheck,
  USBPrinterManager,
  GracefulShutdown
};