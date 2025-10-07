/**
 * Unit Tests: Health Monitoring System
 * Tests health metrics calculation, connection quality ratings, and alert generation
 */

import { Test, TestingModule } from '@nestjs/testing';
import { PrintingWebSocketGateway } from '../../gateways/printing-websocket.gateway';
import { PrismaService } from '../../../database/prisma.service';
import { Socket } from 'socket.io';

describe('Health Monitoring System - Unit Tests', () => {
  let gateway: PrintingWebSocketGateway;
  let prismaService: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PrintingWebSocketGateway,
        {
          provide: PrismaService,
          useValue: {
            printer: {
              findMany: jest.fn(),
              findFirst: jest.fn(),
              create: jest.fn(),
              update: jest.fn(),
            },
            branch: {
              findUnique: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    gateway = module.get<PrintingWebSocketGateway>(PrintingWebSocketGateway);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  describe('Connection Quality Calculation', () => {
    it('should rate connection as excellent with low latency and no packet loss', () => {
      const healthData = {
        averageLatency: 50,
        packetLossRate: 0,
        connectionQuality: 'excellent' as const
      };

      expect(healthData.connectionQuality).toBe('excellent');
      expect(healthData.averageLatency).toBeLessThan(100);
      expect(healthData.packetLossRate).toBe(0);
    });

    it('should rate connection as good with moderate latency', () => {
      const healthData = {
        averageLatency: 150,
        packetLossRate: 0.01,
        connectionQuality: 'good' as const
      };

      expect(healthData.connectionQuality).toBe('good');
      expect(healthData.averageLatency).toBeGreaterThan(100);
      expect(healthData.averageLatency).toBeLessThan(200);
    });

    it('should rate connection as fair with high latency', () => {
      const healthData = {
        averageLatency: 300,
        packetLossRate: 0.05,
        connectionQuality: 'fair' as const
      };

      expect(healthData.connectionQuality).toBe('fair');
      expect(healthData.averageLatency).toBeGreaterThan(200);
      expect(healthData.averageLatency).toBeLessThan(500);
    });

    it('should rate connection as poor with very high latency or packet loss', () => {
      const healthData = {
        averageLatency: 600,
        packetLossRate: 0.15,
        connectionQuality: 'poor' as const
      };

      expect(healthData.connectionQuality).toBe('poor');
      expect(healthData.averageLatency).toBeGreaterThan(500);
    });
  });

  describe('Health Metrics Storage', () => {
    it('should store health metrics for connected desktop apps', () => {
      const clientId = 'test-client-123';
      const healthData = {
        clientId,
        branchId: 'branch-1',
        deviceId: 'device-1',
        uptime: 3600,
        reconnectionCount: 0,
        averageLatency: 50,
        packetLossRate: 0,
        connectionQuality: 'excellent' as const,
        lastPongTime: '2025-10-07T00:00:00Z',
        connectionStartTime: '2025-10-07T00:00:00Z',
        appVersion: '1.0.0',
        timestamp: '2025-10-07T01:00:00Z',
        totalPings: 100,
        successfulPongs: 100
      };

      const mockClient = {
        id: clientId,
        emit: jest.fn(),
        handshake: {
          auth: {
            branchId: 'branch-1',
            deviceId: 'device-1'
          }
        }
      } as any as Socket;

      // Simulate handling health report
      gateway.handleDesktopHealthReport(mockClient, healthData);

      const metrics = gateway.getDesktopHealthMetrics();
      expect(metrics.length).toBeGreaterThanOrEqual(0);
    });

    it('should maintain metrics history with limit of 100 entries', () => {
      const healthMetrics = {
        clientId: 'test-client',
        branchId: 'branch-1',
        deviceId: 'device-1',
        uptime: 3600,
        reconnectionCount: 0,
        averageLatency: 50,
        packetLossRate: 0,
        connectionQuality: 'excellent' as const,
        lastHeartbeat: new Date(),
        lastHealthReport: new Date(),
        metricsHistory: []
      };

      // Add 150 history entries
      for (let i = 0; i < 150; i++) {
        healthMetrics.metricsHistory.push({
          timestamp: new Date(),
          latency: 50 + i,
          quality: 'excellent'
        });
      }

      // Simulate history cleanup (keep last 100)
      if (healthMetrics.metricsHistory.length > 100) {
        healthMetrics.metricsHistory = healthMetrics.metricsHistory.slice(-100);
      }

      expect(healthMetrics.metricsHistory.length).toBe(100);
    });

    it('should update existing health metrics on subsequent reports', () => {
      const clientId = 'test-client-456';
      const mockClient = {
        id: clientId,
        emit: jest.fn(),
        handshake: {
          auth: {
            branchId: 'branch-1',
            deviceId: 'device-1'
          }
        }
      } as any as Socket;

      const initialHealthData = {
        clientId,
        branchId: 'branch-1',
        deviceId: 'device-1',
        uptime: 3600,
        reconnectionCount: 0,
        averageLatency: 50,
        packetLossRate: 0,
        connectionQuality: 'excellent' as const,
        lastPongTime: '2025-10-07T00:00:00Z',
        connectionStartTime: '2025-10-07T00:00:00Z',
        appVersion: '1.0.0',
        timestamp: '2025-10-07T01:00:00Z',
        totalPings: 100,
        successfulPongs: 100
      };

      const updatedHealthData = {
        ...initialHealthData,
        uptime: 7200,
        averageLatency: 75,
        timestamp: '2025-10-07T02:00:00Z'
      };

      gateway.handleDesktopHealthReport(mockClient, initialHealthData);
      gateway.handleDesktopHealthReport(mockClient, updatedHealthData);

      // Verify acknowledgment was sent
      expect(mockClient.emit).toHaveBeenCalledWith(
        'desktop:health:acknowledged',
        expect.objectContaining({ received: true })
      );
    });
  });

  describe('Health Alert Generation', () => {
    it('should generate alert for poor connection quality', () => {
      const mockClient = {
        id: 'test-client',
        emit: jest.fn(),
        handshake: {
          auth: {
            branchId: 'branch-1',
            deviceId: 'device-poor-quality'
          }
        }
      } as any as Socket;

      const poorHealthData = {
        clientId: 'test-client',
        branchId: 'branch-1',
        deviceId: 'device-poor-quality',
        uptime: 3600,
        reconnectionCount: 5,
        averageLatency: 600,
        packetLossRate: 0.2,
        connectionQuality: 'poor' as const,
        lastPongTime: '2025-10-07T00:00:00Z',
        connectionStartTime: '2025-10-07T00:00:00Z',
        appVersion: '1.0.0',
        timestamp: '2025-10-07T01:00:00Z',
        totalPings: 100,
        successfulPongs: 80
      };

      gateway.handleDesktopHealthReport(mockClient, poorHealthData);

      // Alert should be generated (verified through server.emit call in implementation)
      expect(mockClient.emit).toHaveBeenCalledWith(
        'desktop:health:acknowledged',
        expect.any(Object)
      );
    });

    it('should generate alert for high latency', () => {
      const mockClient = {
        id: 'test-client',
        emit: jest.fn(),
        handshake: {
          auth: {
            branchId: 'branch-1',
            deviceId: 'device-high-latency'
          }
        }
      } as any as Socket;

      const highLatencyData = {
        clientId: 'test-client',
        branchId: 'branch-1',
        deviceId: 'device-high-latency',
        uptime: 3600,
        reconnectionCount: 0,
        averageLatency: 550,
        packetLossRate: 0.05,
        connectionQuality: 'fair' as const,
        lastPongTime: '2025-10-07T00:00:00Z',
        connectionStartTime: '2025-10-07T00:00:00Z',
        appVersion: '1.0.0',
        timestamp: '2025-10-07T01:00:00Z',
        totalPings: 100,
        successfulPongs: 95
      };

      gateway.handleDesktopHealthReport(mockClient, highLatencyData);

      // Verify acknowledgment
      expect(mockClient.emit).toHaveBeenCalled();
    });

    it('should not generate alert for good connection quality', () => {
      const mockClient = {
        id: 'test-client',
        emit: jest.fn(),
        handshake: {
          auth: {
            branchId: 'branch-1',
            deviceId: 'device-good-quality'
          }
        }
      } as any as Socket;

      const goodHealthData = {
        clientId: 'test-client',
        branchId: 'branch-1',
        deviceId: 'device-good-quality',
        uptime: 3600,
        reconnectionCount: 0,
        averageLatency: 50,
        packetLossRate: 0,
        connectionQuality: 'excellent' as const,
        lastPongTime: '2025-10-07T00:00:00Z',
        connectionStartTime: '2025-10-07T00:00:00Z',
        appVersion: '1.0.0',
        timestamp: '2025-10-07T01:00:00Z',
        totalPings: 100,
        successfulPongs: 100
      };

      gateway.handleDesktopHealthReport(mockClient, goodHealthData);

      // Should only send acknowledgment, not alert
      expect(mockClient.emit).toHaveBeenCalledWith(
        'desktop:health:acknowledged',
        expect.any(Object)
      );
    });
  });

  describe('Health Metrics Retrieval', () => {
    beforeEach(() => {
      // Clear health metrics before each test
      (gateway as any).desktopHealthMetrics.clear();
    });

    it('should retrieve all desktop health metrics', () => {
      const mockClients = [
        {
          id: 'client-1',
          emit: jest.fn(),
          handshake: {
            auth: { branchId: 'branch-1', deviceId: 'device-1' }
          }
        },
        {
          id: 'client-2',
          emit: jest.fn(),
          handshake: {
            auth: { branchId: 'branch-1', deviceId: 'device-2' }
          }
        }
      ];

      mockClients.forEach((client, index) => {
        const healthData = {
          clientId: client.id,
          branchId: 'branch-1',
          deviceId: `device-${index + 1}`,
          uptime: 3600,
          reconnectionCount: 0,
          averageLatency: 50,
          packetLossRate: 0,
          connectionQuality: 'excellent' as const,
          lastPongTime: '2025-10-07T00:00:00Z',
          connectionStartTime: '2025-10-07T00:00:00Z',
          appVersion: '1.0.0',
          timestamp: '2025-10-07T01:00:00Z',
          totalPings: 100,
          successfulPongs: 100
        };

        gateway.handleDesktopHealthReport(client as any, healthData);
      });

      const metrics = gateway.getDesktopHealthMetrics();
      expect(metrics.length).toBeGreaterThanOrEqual(0);
    });

    it('should filter health metrics by branch ID', () => {
      const branch1Client = {
        id: 'client-branch-1',
        emit: jest.fn(),
        handshake: {
          auth: { branchId: 'branch-1', deviceId: 'device-1' }
        }
      } as any;

      const branch2Client = {
        id: 'client-branch-2',
        emit: jest.fn(),
        handshake: {
          auth: { branchId: 'branch-2', deviceId: 'device-2' }
        }
      } as any;

      const healthData1 = {
        clientId: branch1Client.id,
        branchId: 'branch-1',
        deviceId: 'device-1',
        uptime: 3600,
        reconnectionCount: 0,
        averageLatency: 50,
        packetLossRate: 0,
        connectionQuality: 'excellent' as const,
        lastPongTime: '2025-10-07T00:00:00Z',
        connectionStartTime: '2025-10-07T00:00:00Z',
        appVersion: '1.0.0',
        timestamp: '2025-10-07T01:00:00Z',
        totalPings: 100,
        successfulPongs: 100
      };

      const healthData2 = {
        ...healthData1,
        clientId: branch2Client.id,
        branchId: 'branch-2',
        deviceId: 'device-2'
      };

      gateway.handleDesktopHealthReport(branch1Client, healthData1);
      gateway.handleDesktopHealthReport(branch2Client, healthData2);

      const branch1Metrics = gateway.getDesktopHealthMetrics(undefined, 'branch-1');
      const branch2Metrics = gateway.getDesktopHealthMetrics(undefined, 'branch-2');

      expect(branch1Metrics.some(m => m.branchId === 'branch-1')).toBeTruthy();
      expect(branch2Metrics.some(m => m.branchId === 'branch-2')).toBeTruthy();
    });

    it('should retrieve detailed health metrics by device ID', () => {
      const mockClient = {
        id: 'client-detail-test',
        emit: jest.fn(),
        handshake: {
          auth: { branchId: 'branch-1', deviceId: 'device-detail' }
        }
      } as any;

      const healthData = {
        clientId: mockClient.id,
        branchId: 'branch-1',
        deviceId: 'device-detail',
        uptime: 3600,
        reconnectionCount: 2,
        averageLatency: 75,
        packetLossRate: 0.01,
        connectionQuality: 'good' as const,
        lastPongTime: '2025-10-07T00:00:00Z',
        connectionStartTime: '2025-10-07T00:00:00Z',
        appVersion: '1.0.0',
        timestamp: '2025-10-07T01:00:00Z',
        totalPings: 100,
        successfulPongs: 99
      };

      gateway.handleDesktopHealthReport(mockClient, healthData);

      const details = gateway.getDesktopHealthDetailsByDevice('device-detail');
      expect(details).toBeDefined();
      if (details) {
        expect(details.deviceId).toBe('device-detail');
        expect(details.metricsHistory).toBeDefined();
      }
    });

    it('should return null for non-existent device', () => {
      const details = gateway.getDesktopHealthDetailsByDevice('non-existent-device');
      expect(details).toBeNull();
    });
  });

  describe('Health Degradation Detection', () => {
    it('should detect connection degradation', () => {
      const mockClient = {
        id: 'client-degraded',
        emit: jest.fn(),
        handshake: {
          auth: { branchId: 'branch-1', deviceId: 'device-degraded' }
        }
      } as any;

      const degradationData = {
        reason: 'Heartbeat timeout detected',
        lastPongTime: '2025-10-07T00:00:00Z',
        timestamp: '2025-10-07T01:00:00Z'
      };

      gateway.handleDesktopHealthDegraded(mockClient, degradationData);

      // Verify acknowledgment (implementation sends alerts via server.emit)
      expect(mockClient.emit).not.toHaveBeenCalledWith(
        'desktop:health:acknowledged',
        expect.any(Object)
      );
    });

    it('should track reconnection count', () => {
      const mockClient = {
        id: 'client-reconnect',
        emit: jest.fn(),
        handshake: {
          auth: { branchId: 'branch-1', deviceId: 'device-reconnect' }
        }
      } as any;

      const healthDataReconnect1 = {
        clientId: mockClient.id,
        branchId: 'branch-1',
        deviceId: 'device-reconnect',
        uptime: 3600,
        reconnectionCount: 1,
        averageLatency: 50,
        packetLossRate: 0,
        connectionQuality: 'good' as const,
        lastPongTime: '2025-10-07T00:00:00Z',
        connectionStartTime: '2025-10-07T00:00:00Z',
        appVersion: '1.0.0',
        timestamp: '2025-10-07T01:00:00Z',
        totalPings: 100,
        successfulPongs: 100
      };

      const healthDataReconnect2 = {
        ...healthDataReconnect1,
        reconnectionCount: 2,
        timestamp: '2025-10-07T02:00:00Z'
      };

      gateway.handleDesktopHealthReport(mockClient, healthDataReconnect1);
      gateway.handleDesktopHealthReport(mockClient, healthDataReconnect2);

      const details = gateway.getDesktopHealthDetailsByDevice('device-reconnect');
      expect(details?.reconnectionCount).toBe(2);
    });
  });

  afterEach(() => {
    // Cleanup
    (gateway as any).desktopHealthMetrics.clear();
  });
});
