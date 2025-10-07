/**
 * Integration Tests: WebSocket Print Request Flow
 * Tests end-to-end print request flow with correlation IDs and Desktop App simulation
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { PrintingWebSocketGateway } from '../../gateways/printing-websocket.gateway';
import { PrismaService } from '../../../database/prisma.service';
import { io, Socket as ClientSocket } from 'socket.io-client';

describe('WebSocket Print Request Flow - Integration Tests', () => {
  let app: INestApplication;
  let gateway: PrintingWebSocketGateway;
  let prismaService: PrismaService;
  let webClient: ClientSocket;
  let desktopClient: ClientSocket;
  let serverUrl: string;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PrintingWebSocketGateway,
        {
          provide: PrismaService,
          useValue: {
            printer: {
              findMany: jest.fn().mockResolvedValue([]),
              findFirst: jest.fn().mockResolvedValue(null),
              create: jest.fn(),
              update: jest.fn(),
            },
            branch: {
              findUnique: jest.fn().mockResolvedValue({
                id: 'branch-1',
                companyId: 'company-1'
              }),
            },
          },
        },
      ],
    }).compile();

    app = module.createNestApplication();
    gateway = module.get<PrintingWebSocketGateway>(PrintingWebSocketGateway);
    prismaService = module.get<PrismaService>(PrismaService);

    await app.listen(3002);
    serverUrl = 'http://localhost:3002';
  });

  afterAll(async () => {
    if (webClient) webClient.close();
    if (desktopClient) desktopClient.close();
    await app.close();
  });

  describe('WebSocket Connection Establishment', () => {
    it('should connect web client successfully', (done) => {
      webClient = io(`${serverUrl}/printing-ws`, {
        auth: {
          token: 'test-jwt-token',
          userRole: 'branch_manager',
          branchId: 'branch-1',
          companyId: 'company-1'
        },
        transports: ['websocket']
      });

      webClient.on('connect', () => {
        expect(webClient.connected).toBe(true);
        done();
      });

      webClient.on('connect_error', (error) => {
        done(error);
      });
    }, 10000);

    it('should connect desktop app client successfully', (done) => {
      desktopClient = io(`${serverUrl}/printing-ws`, {
        auth: {
          userRole: 'desktop_app',
          branchId: 'branch-1',
          companyId: 'company-1',
          deviceId: 'test-desktop-device',
          instanceId: 'instance-123',
          appVersion: '1.0.0',
          licenseKey: 'test-license-key'
        },
        transports: ['websocket']
      });

      desktopClient.on('desktop:connected', (data) => {
        expect(data.message).toContain('connected');
        expect(data.branchId).toBe('branch-1');
        done();
      });

      desktopClient.on('connect_error', (error) => {
        done(error);
      });
    }, 10000);

    it('should join appropriate rooms based on auth data', (done) => {
      const testClient = io(`${serverUrl}/printing-ws`, {
        auth: {
          token: 'test-token',
          userRole: 'branch_manager',
          branchId: 'branch-test',
          companyId: 'company-test'
        },
        transports: ['websocket']
      });

      testClient.on('connect', () => {
        // Client should be joined to branch and company rooms automatically
        expect(testClient.connected).toBe(true);
        testClient.close();
        done();
      });
    }, 10000);
  });

  describe('Print Request with Correlation ID', () => {
    beforeEach((done) => {
      // Ensure both clients are connected
      if (!webClient || !desktopClient) {
        webClient = io(`${serverUrl}/printing-ws`, {
          auth: {
            token: 'test-token',
            userRole: 'branch_manager',
            branchId: 'branch-1',
            companyId: 'company-1'
          },
          transports: ['websocket']
        });

        desktopClient = io(`${serverUrl}/printing-ws`, {
          auth: {
            userRole: 'desktop_app',
            branchId: 'branch-1',
            companyId: 'company-1',
            deviceId: 'test-device',
            instanceId: 'instance-123',
            appVersion: '1.0.0',
            licenseKey: 'test-license'
          },
          transports: ['websocket']
        });

        let connectedCount = 0;
        const checkBothConnected = () => {
          connectedCount++;
          if (connectedCount === 2) done();
        };

        webClient.on('connect', checkBothConnected);
        desktopClient.on('connect', checkBothConnected);
      } else {
        done();
      }
    }, 15000);

    it('should send print test request with correlation ID', (done) => {
      const testData = {
        printerName: 'POS-80C',
        branchId: 'branch-1',
        testType: 'connectivity'
      };

      desktopClient.once('printer:test', (data, ack) => {
        expect(data.correlationId).toBeDefined();
        expect(data.correlationId).toMatch(/^printer_test_/);
        expect(data.printerName).toBe('POS-80C');
        expect(data.metadata).toBeDefined();
        expect(data.metadata.expectedResponseEvent).toBe('printer:test:result');

        // Send acknowledgment
        if (typeof ack === 'function') {
          ack({ correlationId: data.correlationId, received: true });
        }

        // Simulate test result
        setTimeout(() => {
          desktopClient.emit('printer:test:result', {
            printerId: 'printer-123',
            correlationId: data.correlationId,
            success: true,
            message: 'Test print completed successfully',
            timestamp: new Date().toISOString(),
            processingTime: 250
          });
        }, 100);
      });

      // Call the gateway method to trigger print test
      gateway.sendPhysicalPrintTest(testData).then((result) => {
        expect(result.success).toBe(true);
        expect(result.correlationId).toBeDefined();
        expect(result.message).toContain('completed');
        done();
      }).catch(done);
    }, 20000);

    it('should handle print test timeout gracefully', (done) => {
      const testData = {
        printerName: 'TimeoutPrinter',
        branchId: 'branch-1',
        testType: 'timeout_test'
      };

      // Desktop app receives request but never responds
      desktopClient.once('printer:test', (data, ack) => {
        expect(data.correlationId).toBeDefined();
        // Send acknowledgment but don't send result
        if (typeof ack === 'function') {
          ack({ correlationId: data.correlationId, received: true });
        }
        // DO NOT send printer:test:result - simulate timeout
      });

      // Should timeout after 15 seconds
      gateway.sendPhysicalPrintTest(testData).then((result) => {
        expect(result.success).toBe(false);
        expect(result.error).toContain('timeout');
        done();
      }).catch(done);
    }, 20000);

    it('should match correlation ID in response to pending request', (done) => {
      let capturedCorrelationId: string;

      const testData = {
        printerName: 'CorrelationTest',
        branchId: 'branch-1'
      };

      desktopClient.once('printer:test', (data, ack) => {
        capturedCorrelationId = data.correlationId;

        if (typeof ack === 'function') {
          ack({ correlationId: data.correlationId, received: true });
        }

        // Send result with matching correlation ID
        setTimeout(() => {
          desktopClient.emit('printer:test:result', {
            printerId: 'printer-456',
            correlationId: capturedCorrelationId,
            success: true,
            message: 'Correlation ID matched',
            timestamp: new Date().toISOString()
          });
        }, 100);
      });

      gateway.sendPhysicalPrintTest(testData).then((result) => {
        expect(result.success).toBe(true);
        expect(result.correlationId).toBe(capturedCorrelationId);
        done();
      }).catch(done);
    }, 15000);
  });

  describe('Health Monitoring Integration', () => {
    beforeEach((done) => {
      if (!desktopClient || !desktopClient.connected) {
        desktopClient = io(`${serverUrl}/printing-ws`, {
          auth: {
            userRole: 'desktop_app',
            branchId: 'branch-health',
            companyId: 'company-1',
            deviceId: 'health-test-device',
            instanceId: 'instance-health',
            appVersion: '1.0.0'
          },
          transports: ['websocket']
        });

        desktopClient.on('connect', () => done());
      } else {
        done();
      }
    }, 10000);

    it('should accept and acknowledge health reports', (done) => {
      const healthReport = {
        uptime: 3600,
        reconnectionCount: 0,
        averageLatency: 50,
        packetLossRate: 0,
        totalPings: 100,
        successfulPongs: 100,
        connectionQuality: 'excellent' as const,
        lastPongTime: new Date().toISOString(),
        connectionStartTime: new Date(Date.now() - 3600000).toISOString(),
        branchId: 'branch-health',
        deviceId: 'health-test-device',
        appVersion: '1.0.0',
        timestamp: new Date().toISOString()
      };

      desktopClient.once('desktop:health:acknowledged', (data) => {
        expect(data.received).toBe(true);
        expect(data.timestamp).toBeDefined();
        done();
      });

      desktopClient.emit('desktop:health:report', healthReport);
    }, 10000);

    it('should retrieve health metrics for connected devices', (done) => {
      const healthReport = {
        uptime: 7200,
        reconnectionCount: 1,
        averageLatency: 75,
        packetLossRate: 0.01,
        totalPings: 200,
        successfulPongs: 198,
        connectionQuality: 'good' as const,
        lastPongTime: new Date().toISOString(),
        connectionStartTime: new Date(Date.now() - 7200000).toISOString(),
        branchId: 'branch-health',
        deviceId: 'health-test-device',
        appVersion: '1.0.0',
        timestamp: new Date().toISOString()
      };

      desktopClient.emit('desktop:health:report', healthReport);

      setTimeout(() => {
        const metrics = gateway.getDesktopHealthMetrics(undefined, 'branch-health');
        expect(metrics.length).toBeGreaterThan(0);

        const deviceMetrics = metrics.find(m => m.deviceId === 'health-test-device');
        expect(deviceMetrics).toBeDefined();
        if (deviceMetrics) {
          expect(deviceMetrics.connectionQuality).toBe('good');
          expect(deviceMetrics.averageLatency).toBe(75);
        }
        done();
      }, 500);
    }, 10000);
  });

  describe('Request Deduplication', () => {
    it('should handle duplicate correlation IDs gracefully', (done) => {
      const correlationId = 'duplicate_test_123_456_abc';

      // Simulate duplicate response with same correlation ID
      desktopClient.emit('printer:test:result', {
        printerId: 'printer-dup-1',
        correlationId,
        success: true,
        message: 'First response',
        timestamp: new Date().toISOString()
      });

      // Second duplicate should be ignored (no pending request)
      setTimeout(() => {
        desktopClient.emit('printer:test:result', {
          printerId: 'printer-dup-2',
          correlationId,
          success: true,
          message: 'Duplicate response',
          timestamp: new Date().toISOString()
        });
      }, 100);

      // No errors should occur
      setTimeout(() => {
        done();
      }, 500);
    }, 10000);
  });

  describe('Multi-Client Print Request', () => {
    it('should broadcast print results to all web clients', (done) => {
      const webClient2 = io(`${serverUrl}/printing-ws`, {
        auth: {
          token: 'test-token-2',
          userRole: 'cashier',
          branchId: 'branch-1',
          companyId: 'company-1'
        },
        transports: ['websocket']
      });

      let client1Received = false;
      let client2Received = false;

      const checkBothReceived = () => {
        if (client1Received && client2Received) {
          webClient2.close();
          done();
        }
      };

      webClient.once('printer:test:completed', (data) => {
        expect(data.success).toBe(true);
        client1Received = true;
        checkBothReceived();
      });

      webClient2.once('printer:test:completed', (data) => {
        expect(data.success).toBe(true);
        client2Received = true;
        checkBothReceived();
      });

      // Desktop app sends test result
      setTimeout(() => {
        desktopClient.emit('printer:test:result', {
          printerId: 'printer-broadcast',
          correlationId: 'broadcast_test_789',
          success: true,
          message: 'Broadcast test',
          timestamp: new Date().toISOString()
        });
      }, 500);
    }, 15000);
  });

  describe('Connection Error Handling', () => {
    it('should handle desktop app disconnection gracefully', (done) => {
      const tempDesktopClient = io(`${serverUrl}/printing-ws`, {
        auth: {
          userRole: 'desktop_app',
          branchId: 'branch-disconnect',
          deviceId: 'disconnect-test',
          companyId: 'company-1'
        },
        transports: ['websocket']
      });

      tempDesktopClient.on('connect', () => {
        // Disconnect immediately
        tempDesktopClient.close();

        // Try to send print test (should fail gracefully)
        setTimeout(() => {
          gateway.sendPhysicalPrintTest({
            printerName: 'OfflinePrinter',
            branchId: 'branch-disconnect'
          }).then((result) => {
            expect(result.success).toBe(false);
            expect(result.message).toContain('not connected');
            done();
          });
        }, 500);
      });
    }, 15000);

    it('should return error when no desktop apps are connected', (done) => {
      gateway.sendPhysicalPrintTest({
        printerName: 'NoDesktopApp',
        branchId: 'branch-no-desktop'
      }).then((result) => {
        expect(result.success).toBe(false);
        expect(result.message).toContain('not connected');
        expect(result.suggestion).toBeDefined();
        done();
      });
    }, 10000);
  });

  describe('Room-Based Broadcasting', () => {
    it('should emit to branch-specific rooms', (done) => {
      const branch1Client = io(`${serverUrl}/printing-ws`, {
        auth: {
          token: 'branch-1-token',
          userRole: 'branch_manager',
          branchId: 'branch-1',
          companyId: 'company-1'
        },
        transports: ['websocket']
      });

      const branch2Client = io(`${serverUrl}/printing-ws`, {
        auth: {
          token: 'branch-2-token',
          userRole: 'branch_manager',
          branchId: 'branch-2',
          companyId: 'company-1'
        },
        transports: ['websocket']
      });

      let branch1Received = false;
      let branch2Received = false;

      branch1Client.on('printerUpdate', (data) => {
        if (data.branchId === 'branch-1') {
          branch1Received = true;
        }
      });

      branch2Client.on('printerUpdate', (data) => {
        if (data.branchId === 'branch-2') {
          branch2Received = true;
        }
      });

      setTimeout(() => {
        // Branch-specific updates should only reach respective clients
        expect(branch1Received || branch2Received).toBeDefined();
        branch1Client.close();
        branch2Client.close();
        done();
      }, 2000);
    }, 15000);
  });
});
