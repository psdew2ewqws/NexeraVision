/**
 * WebSocket Test Mocks and Fixtures
 * Mock implementations for Socket.io server and clients
 */

import { Socket } from 'socket.io';
import { EventEmitter } from 'events';

/**
 * Mock Socket.io Socket for testing
 */
export class MockSocket extends EventEmitter implements Partial<Socket> {
  id: string;
  connected: boolean = true;
  disconnected: boolean = false;
  data: any = {};
  handshake: any;
  rooms: Set<string> = new Set();

  constructor(id: string, auth?: any) {
    super();
    this.id = id;
    this.handshake = {
      auth: auth || {},
      headers: {
        origin: 'http://localhost:3000'
      }
    };
  }

  emit(event: string, ...args: any[]): boolean {
    return super.emit(event, ...args);
  }

  join(room: string): void {
    this.rooms.add(room);
  }

  leave(room: string): void {
    this.rooms.delete(room);
  }

  disconnect(close?: boolean): this {
    this.connected = false;
    this.disconnected = true;
    this.emit('disconnect', 'forced server disconnect');
    return this;
  }

  close(): void {
    this.disconnect(true);
  }
}

/**
 * Mock Socket.io Server for testing
 */
export class MockServer extends EventEmitter {
  private sockets: Map<string, MockSocket> = new Map();

  emit(event: string, ...args: any[]): boolean {
    // Broadcast to all connected sockets
    this.sockets.forEach(socket => {
      socket.emit(event, ...args);
    });
    return true;
  }

  to(room: string) {
    return {
      emit: (event: string, ...args: any[]) => {
        // Emit to sockets in specific room
        this.sockets.forEach(socket => {
          if (socket.rooms.has(room)) {
            socket.emit(event, ...args);
          }
        });
      }
    };
  }

  addSocket(socket: MockSocket): void {
    this.sockets.set(socket.id, socket);
  }

  removeSocket(socketId: string): void {
    this.sockets.delete(socketId);
  }

  getSocketCount(): number {
    return this.sockets.size;
  }
}

/**
 * Test Fixtures: Desktop App Authentication Data
 */
export const mockDesktopAppAuth = {
  userRole: 'desktop_app',
  branchId: 'branch-test-123',
  companyId: 'company-test-456',
  deviceId: 'desktop-device-789',
  instanceId: 'instance-abc-def',
  appVersion: '1.0.0',
  licenseKey: 'test-license-key-xyz'
};

/**
 * Test Fixtures: Web Client Authentication Data
 */
export const mockWebClientAuth = {
  token: 'mock-jwt-token-12345',
  userRole: 'branch_manager',
  branchId: 'branch-test-123',
  companyId: 'company-test-456'
};

/**
 * Test Fixtures: Printer Discovery Data
 */
export const mockPrinterDiscovery = {
  id: 'printer-discovered-001',
  name: 'POS-80C-Test',
  type: 'thermal',
  connection: 'network',
  status: 'online',
  branchId: 'branch-test-123',
  discoveredBy: 'desktop_app',
  discoveryMethod: 'auto',
  timestamp: new Date().toISOString(),
  device: 'desktop-device-789',
  systemPrinter: true,
  capabilities: ['cut', 'graphics', 'barcode', 'qrcode']
};

/**
 * Test Fixtures: Print Test Request Data
 */
export const mockPrintTestRequest = {
  printerName: 'POS-80C-Test',
  branchId: 'branch-test-123',
  testType: 'connectivity',
  content: 'Test Print - System Check'
};

/**
 * Test Fixtures: Print Test Result Data
 */
export const mockPrintTestResult = {
  printerId: 'printer-001',
  correlationId: 'printer_test_1696656000000_12345_abc123',
  success: true,
  message: 'Test print completed successfully',
  timestamp: new Date().toISOString(),
  processingTime: 250
};

/**
 * Test Fixtures: Health Report Data
 */
export const mockHealthReport = {
  uptime: 3600,
  reconnectionCount: 0,
  averageLatency: 50,
  packetLossRate: 0,
  totalPings: 100,
  successfulPongs: 100,
  connectionQuality: 'excellent' as const,
  lastPongTime: new Date().toISOString(),
  connectionStartTime: new Date(Date.now() - 3600000).toISOString(),
  branchId: 'branch-test-123',
  deviceId: 'desktop-device-789',
  appVersion: '1.0.0',
  timestamp: new Date().toISOString()
};

/**
 * Test Fixtures: Poor Quality Health Report
 */
export const mockPoorHealthReport = {
  uptime: 3600,
  reconnectionCount: 5,
  averageLatency: 600,
  packetLossRate: 0.15,
  totalPings: 100,
  successfulPongs: 85,
  connectionQuality: 'poor' as const,
  lastPongTime: new Date().toISOString(),
  connectionStartTime: new Date(Date.now() - 3600000).toISOString(),
  branchId: 'branch-test-123',
  deviceId: 'desktop-device-poor',
  appVersion: '1.0.0',
  timestamp: new Date().toISOString()
};

/**
 * Test Fixtures: Print Job Data
 */
export const mockPrintJob = {
  id: 'job-test-001',
  printerId: 'printer-001',
  orderData: {
    orderId: 'order-12345',
    items: [
      { name: 'Item 1', quantity: 2, price: 10.99 },
      { name: 'Item 2', quantity: 1, price: 15.50 }
    ],
    subtotal: 37.48,
    tax: 6.00,
    total: 43.48
  },
  priority: 1,
  type: 'receipt' as const
};

/**
 * Helper: Create mock socket with custom auth
 */
export function createMockSocket(id: string, auth?: any): MockSocket {
  return new MockSocket(id, auth);
}

/**
 * Helper: Create mock desktop app socket
 */
export function createMockDesktopSocket(id: string = 'desktop-001'): MockSocket {
  return new MockSocket(id, mockDesktopAppAuth);
}

/**
 * Helper: Create mock web client socket
 */
export function createMockWebSocket(id: string = 'web-001'): MockSocket {
  return new MockSocket(id, mockWebClientAuth);
}

/**
 * Helper: Create mock server
 */
export function createMockServer(): MockServer {
  return new MockServer();
}

/**
 * Helper: Generate correlation ID for testing
 */
export function generateTestCorrelationId(type: string = 'test'): string {
  const timestamp = Date.now();
  const counter = Math.floor(Math.random() * 1000000);
  const random = Math.random().toString(36).substring(2, 9);
  return `${type}_${timestamp}_${counter}_${random}`;
}

/**
 * Helper: Wait for async operations
 */
export function wait(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Helper: Create test scenario with multiple clients
 */
export async function createTestScenario(serverSetup?: (server: MockServer) => void) {
  const server = createMockServer();
  const desktopSocket = createMockDesktopSocket('desktop-scenario-1');
  const webSocket1 = createMockWebSocket('web-scenario-1');
  const webSocket2 = createMockWebSocket('web-scenario-2');

  server.addSocket(desktopSocket);
  server.addSocket(webSocket1);
  server.addSocket(webSocket2);

  if (serverSetup) {
    serverSetup(server);
  }

  return {
    server,
    desktopSocket,
    webSocket1,
    webSocket2,
    cleanup: () => {
      server.removeSocket(desktopSocket.id);
      server.removeSocket(webSocket1.id);
      server.removeSocket(webSocket2.id);
      desktopSocket.disconnect();
      webSocket1.disconnect();
      webSocket2.disconnect();
    }
  };
}

/**
 * Mock PrismaService for testing
 */
export const mockPrismaService = {
  printer: {
    findMany: jest.fn().mockResolvedValue([]),
    findFirst: jest.fn().mockResolvedValue(null),
    create: jest.fn().mockResolvedValue({
      id: 'printer-mock-001',
      name: 'Mock Printer',
      type: 'thermal',
      connection: 'network',
      status: 'online'
    }),
    update: jest.fn().mockResolvedValue({
      id: 'printer-mock-001',
      status: 'online',
      lastSeen: new Date()
    })
  },
  branch: {
    findUnique: jest.fn().mockResolvedValue({
      id: 'branch-test-123',
      companyId: 'company-test-456'
    })
  }
};

/**
 * Test Data Generator: Batch of correlation IDs
 */
export function generateCorrelationIdBatch(count: number, type: string = 'test'): string[] {
  const ids: string[] = [];
  for (let i = 0; i < count; i++) {
    ids.push(generateTestCorrelationId(type));
  }
  return ids;
}

/**
 * Test Data Generator: Multiple health reports
 */
export function generateHealthReportBatch(count: number): typeof mockHealthReport[] {
  const reports: typeof mockHealthReport[] = [];
  for (let i = 0; i < count; i++) {
    reports.push({
      ...mockHealthReport,
      deviceId: `device-batch-${i}`,
      averageLatency: 50 + Math.random() * 100,
      timestamp: new Date().toISOString()
    });
  }
  return reports;
}

/**
 * Assertion Helper: Verify correlation ID format
 */
export function assertCorrelationIdFormat(correlationId: string): boolean {
  const pattern = /^[a-z_]+_\d+_[a-z0-9]+$/;
  return pattern.test(correlationId);
}

/**
 * Assertion Helper: Verify health report structure
 */
export function assertHealthReportStructure(healthReport: any): boolean {
  const requiredFields = [
    'uptime',
    'reconnectionCount',
    'averageLatency',
    'packetLossRate',
    'connectionQuality',
    'deviceId',
    'branchId',
    'timestamp'
  ];

  return requiredFields.every(field => healthReport.hasOwnProperty(field));
}
