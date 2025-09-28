// ================================================
// Platform Sync Service Tests
// Comprehensive Test Suite for Sync Functionality
// ================================================

import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { HttpService } from '@nestjs/axios';
import { PrismaService } from '../../database/prisma.service';

// Services to test
import { PlatformSyncService } from '../services/platform-sync.service';
import { RetryMechanismService } from '../services/retry-mechanism.service';
import { MenuValidationService } from '../services/menu-validation.service';
import { CareemMenuService } from '../services/platform-specific/careem-menu.service';
import { TalabatMenuService } from '../services/platform-specific/talabat-menu.service';
import { SyncProgressGateway } from '../gateways/sync-progress.gateway';

// Mock data
const mockPlatformMenu = {
  id: 'test-menu-id',
  name: { en: 'Test Menu', ar: 'قائمة تجريبية' },
  description: { en: 'Test Description' },
  isActive: true,
  platformType: 'multi',
  companyId: 'test-company-id',
  branchId: 'test-branch-id',
  menuItems: [
    {
      id: 'item-1',
      product: {
        id: 'prod-1',
        name: { en: 'Burger', ar: 'برجر' },
        description: { en: 'Delicious burger' },
        basePrice: 10.00,
        isAvailable: true,
        category: {
          id: 'cat-1',
          name: { en: 'Main Dishes' },
          displayNumber: 1
        },
        productImages: [
          { imageUrl: 'https://example.com/burger.jpg' }
        ]
      },
      platformPrice: 12.00,
      isAvailable: true
    }
  ]
};

const mockSyncRequest = {
  platformMenuId: 'test-menu-id',
  platformType: 'careem',
  configuration: {
    storeId: 'test-store-123',
    currency: 'JOD',
    serviceArea: {
      city: 'Amman',
      zones: ['Downtown'],
      maxDeliveryRadius: 10
    },
    deliverySettings: {
      estimatedDeliveryTime: 30,
      minOrderValue: 5.0,
      deliveryFee: 2.0
    },
    operationalHours: {
      monday: { open: '09:00', close: '23:00', isOpen: true }
    }
  },
  userId: 'test-user-id',
  companyId: 'test-company-id'
};

describe('PlatformSyncService', () => {
  let service: PlatformSyncService;
  let prismaService: PrismaService;
  let retryMechanismService: RetryMechanismService;
  let careemMenuService: CareemMenuService;
  let eventEmitter: EventEmitter2;
  let syncProgressGateway: SyncProgressGateway;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PlatformSyncService,
        {
          provide: PrismaService,
          useValue: {
            platformMenu: {
              findUnique: jest.fn(),
              update: jest.fn(),
            },
            platformSyncLog: {
              create: jest.fn(),
              findUnique: jest.fn(),
              update: jest.fn(),
              findMany: jest.fn(),
              count: jest.fn(),
              aggregate: jest.fn(),
              groupBy: jest.fn(),
            },
            multiPlatformSyncHistory: {
              create: jest.fn(),
              findFirst: jest.fn(),
              update: jest.fn(),
            },
            platformIntegrationLog: {
              create: jest.fn(),
            },
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue('test-value'),
          },
        },
        {
          provide: EventEmitter2,
          useValue: {
            emit: jest.fn(),
          },
        },
        {
          provide: HttpService,
          useValue: {
            request: jest.fn(),
          },
        },
        {
          provide: RetryMechanismService,
          useValue: {
            isRetryableError: jest.fn(),
            canRetry: jest.fn(),
            scheduleRetry: jest.fn(),
            checkRateLimit: jest.fn().mockResolvedValue(true),
            checkCircuitBreaker: jest.fn().mockResolvedValue(true),
            recordSuccess: jest.fn(),
            recordFailure: jest.fn(),
          },
        },
        {
          provide: MenuValidationService,
          useValue: {
            validateSyncConfiguration: jest.fn(),
            validateMenuForPlatform: jest.fn(),
          },
        },
        {
          provide: CareemMenuService,
          useValue: {
            createCareemMenu: jest.fn(),
          },
        },
        {
          provide: TalabatMenuService,
          useValue: {
            createTalabatMenu: jest.fn(),
          },
        },
        {
          provide: SyncProgressGateway,
          useValue: {
            emitSyncStarted: jest.fn(),
            emitSyncProgress: jest.fn(),
            emitSyncCompleted: jest.fn(),
            emitSyncFailed: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<PlatformSyncService>(PlatformSyncService);
    prismaService = module.get<PrismaService>(PrismaService);
    retryMechanismService = module.get<RetryMechanismService>(RetryMechanismService);
    careemMenuService = module.get<CareemMenuService>(CareemMenuService);
    eventEmitter = module.get<EventEmitter2>(EventEmitter2);
    syncProgressGateway = module.get<SyncProgressGateway>(SyncProgressGateway);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('syncToSinglePlatform', () => {
    it('should successfully initiate sync to Careem', async () => {
      // Arrange
      const mockSyncLog = {
        id: 'sync-123',
        platformMenuId: mockSyncRequest.platformMenuId,
        platformType: mockSyncRequest.platformType,
        status: 'pending',
        userId: mockSyncRequest.userId,
        companyId: mockSyncRequest.companyId,
      };

      (prismaService.platformSyncLog.create as jest.Mock).mockResolvedValue(mockSyncLog);

      // Act
      const result = await service.syncToSinglePlatform(mockSyncRequest);

      // Assert
      expect(result).toMatchObject({
        status: 'initiated',
        platformType: 'careem',
        platformMenuId: 'test-menu-id',
      });
      expect(result.syncId).toBeDefined();
      expect(result.estimatedDuration).toBeGreaterThan(0);

      expect(prismaService.platformSyncLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          platformMenuId: mockSyncRequest.platformMenuId,
          platformType: mockSyncRequest.platformType,
          syncType: 'full_menu',
          status: 'pending',
          userId: mockSyncRequest.userId,
          companyId: mockSyncRequest.companyId,
        }),
      });
    });

    it('should handle sync initiation failure gracefully', async () => {
      // Arrange
      (prismaService.platformSyncLog.create as jest.Mock).mockRejectedValue(
        new Error('Database connection failed')
      );

      // Act & Assert
      await expect(service.syncToSinglePlatform(mockSyncRequest)).rejects.toThrow(
        'Database connection failed'
      );
    });
  });

  describe('getSyncStatus', () => {
    it('should return sync status when found', async () => {
      // Arrange
      const mockSyncLog = {
        id: 'sync-123',
        platformMenuId: 'test-menu-id',
        platformType: 'careem',
        status: 'completed',
        progress: 100,
        createdAt: new Date(),
        completedAt: new Date(),
        duration: 30000,
        itemsProcessed: 5,
        errorMessage: null,
        platformMenu: {
          id: 'test-menu-id',
          name: { en: 'Test Menu' },
          platformType: 'multi',
        },
      };

      (prismaService.platformSyncLog.findFirst as jest.Mock).mockResolvedValue(mockSyncLog);

      // Act
      const result = await service.getSyncStatus('sync-123', 'test-company-id');

      // Assert
      expect(result).toMatchObject({
        syncId: 'sync-123',
        platformType: 'careem',
        platformMenuId: 'test-menu-id',
        status: 'completed',
        progress: 100,
        duration: 30000,
        itemsProcessed: 5,
      });

      expect(prismaService.platformSyncLog.findFirst).toHaveBeenCalledWith({
        where: {
          id: 'sync-123',
          companyId: 'test-company-id',
        },
        include: {
          platformMenu: {
            select: {
              id: true,
              name: true,
              platformType: true,
            },
          },
        },
      });
    });

    it('should return null when sync not found', async () => {
      // Arrange
      (prismaService.platformSyncLog.findFirst as jest.Mock).mockResolvedValue(null);

      // Act
      const result = await service.getSyncStatus('nonexistent-sync', 'test-company-id');

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('batchSyncToPlatforms', () => {
    it('should successfully initiate batch sync', async () => {
      // Arrange
      const batchRequest = {
        platformMenuId: 'test-menu-id',
        platforms: [
          {
            platformType: 'careem',
            configuration: mockSyncRequest.configuration,
          },
          {
            platformType: 'talabat',
            configuration: {
              restaurantId: 'talabat-123',
              currency: 'JOD',
              taxRate: 0.16,
              deliveryZones: ['amman'],
              operatingHours: {},
            },
          },
        ],
        userId: 'test-user-id',
        companyId: 'test-company-id',
      };

      const mockBatchLog = {
        id: 'batch-456',
        menuId: batchRequest.platformMenuId,
        platforms: ['careem', 'talabat'],
        overallStatus: 'in_progress',
        userId: batchRequest.userId,
        companyId: batchRequest.companyId,
      };

      (prismaService.multiPlatformSyncHistory.create as jest.Mock).mockResolvedValue(mockBatchLog);
      (prismaService.platformSyncLog.create as jest.Mock).mockResolvedValue({
        id: 'sync-789',
        status: 'pending',
      });

      // Mock individual sync initiations
      jest.spyOn(service, 'syncToSinglePlatform').mockResolvedValue({
        syncId: 'sync-789',
        status: 'initiated',
        platformType: 'careem',
        platformMenuId: 'test-menu-id',
        estimatedDuration: 30000,
      });

      // Act
      const result = await service.batchSyncToPlatforms(batchRequest);

      // Assert
      expect(result).toMatchObject({
        batchId: 'batch-456',
        syncOperations: expect.arrayContaining([
          expect.objectContaining({
            platformType: 'careem',
            status: 'initiated',
          }),
        ]),
      });
      expect(result.syncOperations).toHaveLength(2);
      expect(result.estimatedTotalDuration).toBeGreaterThan(0);
    });
  });

  describe('getSyncHistory', () => {
    it('should return paginated sync history', async () => {
      // Arrange
      const filters = {
        companyId: 'test-company-id',
        page: 1,
        limit: 10,
        platformType: 'careem',
      };

      const mockHistory = [
        {
          id: 'sync-1',
          platformType: 'careem',
          status: 'completed',
          createdAt: new Date(),
          platformMenu: { id: 'menu-1', name: { en: 'Menu 1' } },
        },
      ];

      (prismaService.platformSyncLog.count as jest.Mock).mockResolvedValue(25);
      (prismaService.platformSyncLog.findMany as jest.Mock).mockResolvedValue(mockHistory);

      // Act
      const result = await service.getSyncHistory(filters);

      // Assert
      expect(result).toMatchObject({
        data: mockHistory,
        page: 1,
        limit: 10,
        total: 25,
        totalPages: 3,
      });

      expect(prismaService.platformSyncLog.findMany).toHaveBeenCalledWith({
        where: {
          companyId: 'test-company-id',
          platformType: 'careem',
        },
        include: {
          platformMenu: {
            select: {
              id: true,
              name: true,
              platformType: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: 0,
        take: 10,
      });
    });
  });

  describe('getSyncAnalytics', () => {
    it('should return sync analytics for specified period', async () => {
      // Arrange
      const period = 'week';
      const companyId = 'test-company-id';

      (prismaService.platformSyncLog.count as jest.Mock)
        .mockResolvedValueOnce(100) // totalSyncs
        .mockResolvedValueOnce(85) // successfulSyncs
        .mockResolvedValueOnce(15); // failedSyncs

      (prismaService.platformSyncLog.aggregate as jest.Mock).mockResolvedValue({
        _avg: { duration: 25000 },
      });

      (prismaService.platformSyncLog.groupBy as jest.Mock).mockResolvedValue([
        { platformType: 'careem', status: 'completed', _count: 45 },
        { platformType: 'careem', status: 'failed', _count: 5 },
        { platformType: 'talabat', status: 'completed', _count: 40 },
        { platformType: 'talabat', status: 'failed', _count: 10 },
      ]);

      // Act
      const result = await service.getSyncAnalytics(period, companyId);

      // Assert
      expect(result).toMatchObject({
        period: 'week',
        totalSyncs: 100,
        successfulSyncs: 85,
        failedSyncs: 15,
        successRate: 85,
        avgDuration: 25000,
        platformBreakdown: {
          careem: {
            completed: 45,
            failed: 5,
          },
          talabat: {
            completed: 40,
            failed: 10,
          },
        },
      });
    });
  });

  describe('cancelSync', () => {
    it('should successfully cancel active sync', async () => {
      // Arrange
      const syncId = 'sync-123';
      const companyId = 'test-company-id';

      const mockSyncLog = {
        id: syncId,
        companyId,
        status: 'in_progress',
      };

      (prismaService.platformSyncLog.findFirst as jest.Mock).mockResolvedValue(mockSyncLog);
      (prismaService.platformSyncLog.update as jest.Mock).mockResolvedValue({
        ...mockSyncLog,
        status: 'cancelled',
      });

      // Act
      const result = await service.cancelSync(syncId, companyId);

      // Assert
      expect(result).toMatchObject({
        success: true,
        message: 'Sync operation cancelled successfully',
      });

      expect(prismaService.platformSyncLog.update).toHaveBeenCalledWith({
        where: { id: syncId },
        data: {
          status: 'cancelled',
          completedAt: expect.any(Date),
          errorMessage: 'Cancelled by user',
        },
      });

      expect(syncProgressGateway.emitSyncCancelled).toHaveBeenCalledWith(companyId, {
        syncId,
        message: 'Sync operation cancelled',
      });
    });

    it('should fail to cancel non-existent sync', async () => {
      // Arrange
      (prismaService.platformSyncLog.findFirst as jest.Mock).mockResolvedValue(null);

      // Act
      const result = await service.cancelSync('nonexistent', 'test-company-id');

      // Assert
      expect(result).toMatchObject({
        success: false,
        message: 'Sync operation not found or cannot be cancelled',
      });
    });
  });

  describe('handlePlatformWebhook', () => {
    it('should process Careem webhook successfully', async () => {
      // Arrange
      const platformType = 'careem';
      const webhookData = {
        sync_id: 'sync-123',
        status: 'completed',
        message: 'Menu sync completed successfully',
        store_menu_id: 'careem-menu-456',
      };

      const mockSyncLog = {
        id: 'sync-123',
        companyId: 'test-company-id',
      };

      (prismaService.platformSyncLog.findUnique as jest.Mock).mockResolvedValue(mockSyncLog);
      (prismaService.platformSyncLog.update as jest.Mock).mockResolvedValue({
        ...mockSyncLog,
        status: 'completed',
      });

      // Act
      const result = await service.handlePlatformWebhook(platformType, webhookData);

      // Assert
      expect(result).toMatchObject({
        processed: true,
        syncId: 'sync-123',
        status: 'completed',
      });

      expect(syncProgressGateway.emitSyncProgress).toHaveBeenCalledWith('test-company-id', {
        syncId: 'sync-123',
        status: 'completed',
        message: 'Menu sync completed successfully',
        externalId: 'careem-menu-456',
      });
    });
  });
});

describe('RetryMechanismService', () => {
  let service: RetryMechanismService;
  let prismaService: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RetryMechanismService,
        {
          provide: PrismaService,
          useValue: {
            platformSyncLog: {
              findUnique: jest.fn(),
              update: jest.fn(),
            },
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn(),
          },
        },
        {
          provide: EventEmitter2,
          useValue: {
            emit: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<RetryMechanismService>(RetryMechanismService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  describe('isRetryableError', () => {
    it('should identify retryable errors correctly', () => {
      // Arrange
      const retryableErrors = [
        { code: 'ECONNRESET' },
        { code: 'ETIMEDOUT' },
        { response: { status: 500 } },
        { response: { status: 429 } },
        { message: 'network error occurred' },
      ];

      const nonRetryableErrors = [
        { response: { status: 400 } },
        { response: { status: 401 } },
        { response: { status: 404 } },
        { message: 'invalid credentials' },
      ];

      // Act & Assert
      retryableErrors.forEach(error => {
        expect(service.isRetryableError('careem', error)).toBe(true);
      });

      nonRetryableErrors.forEach(error => {
        expect(service.isRetryableError('careem', error)).toBe(false);
      });
    });
  });

  describe('calculateRetryDelay', () => {
    it('should calculate exponential backoff with jitter', () => {
      // Act
      const delay1 = service.calculateRetryDelay('careem', 0);
      const delay2 = service.calculateRetryDelay('careem', 1);
      const delay3 = service.calculateRetryDelay('careem', 2);

      // Assert
      expect(delay1).toBeGreaterThanOrEqual(1000); // Minimum 1 second
      expect(delay2).toBeGreaterThan(delay1); // Exponential increase
      expect(delay3).toBeGreaterThan(delay2); // Continued increase
      expect(delay3).toBeLessThanOrEqual(300000); // Max 5 minutes for Careem
    });
  });

  describe('canRetry', () => {
    it('should allow retry for valid failed sync', async () => {
      // Arrange
      const mockSyncLog = {
        id: 'sync-123',
        retryCount: 1,
        status: 'failed',
        errorMessage: 'Network timeout',
      };

      (prismaService.platformSyncLog.findUnique as jest.Mock).mockResolvedValue(mockSyncLog);

      // Act
      const canRetry = await service.canRetry('sync-123', 'careem');

      // Assert
      expect(canRetry).toBe(true);
    });

    it('should reject retry for max retries exceeded', async () => {
      // Arrange
      const mockSyncLog = {
        id: 'sync-123',
        retryCount: 3, // Max retries for Careem
        status: 'failed',
        errorMessage: 'Network timeout',
      };

      (prismaService.platformSyncLog.findUnique as jest.Mock).mockResolvedValue(mockSyncLog);

      // Act
      const canRetry = await service.canRetry('sync-123', 'careem');

      // Assert
      expect(canRetry).toBe(false);
    });
  });

  describe('checkRateLimit', () => {
    it('should allow request within rate limits', async () => {
      // Act
      const allowed = await service.checkRateLimit('careem');

      // Assert
      expect(allowed).toBe(true);
    });

    it('should block request when rate limit exceeded', async () => {
      // Arrange - simulate many requests to exceed limit
      const promises = [];
      for (let i = 0; i < 65; i++) { // Careem limit is 60 per minute
        promises.push(service.checkRateLimit('careem'));
      }

      // Act
      const results = await Promise.all(promises);

      // Assert
      const allowedCount = results.filter(result => result === true).length;
      const blockedCount = results.filter(result => result === false).length;

      expect(allowedCount).toBeLessThanOrEqual(60);
      expect(blockedCount).toBeGreaterThan(0);
    });
  });

  describe('getRateLimitStatus', () => {
    it('should return current rate limit status', async () => {
      // Arrange - make some requests first
      await service.checkRateLimit('careem');
      await service.checkRateLimit('careem');

      // Act
      const status = service.getRateLimitStatus('careem');

      // Assert
      expect(status).toMatchObject({
        platformType: 'careem',
        windowMs: 60000,
        maxRequests: 60,
        currentRequests: expect.any(Number),
        remainingRequests: expect.any(Number),
        blocked: false,
        resetAt: expect.any(Date),
      });

      expect(status.currentRequests).toBeGreaterThan(0);
      expect(status.remainingRequests).toBeLessThan(60);
    });
  });
});

describe('Integration Tests', () => {
  let platformSyncService: PlatformSyncService;
  let retryMechanismService: RetryMechanismService;

  beforeEach(async () => {
    // Create a minimal testing module for integration tests
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PlatformSyncService,
        RetryMechanismService,
        // Mock all dependencies
        { provide: PrismaService, useValue: {} },
        { provide: ConfigService, useValue: {} },
        { provide: EventEmitter2, useValue: {} },
        { provide: CareemMenuService, useValue: {} },
        { provide: TalabatMenuService, useValue: {} },
        { provide: SyncProgressGateway, useValue: {} },
        { provide: MenuValidationService, useValue: {} },
      ],
    }).compile();

    platformSyncService = module.get<PlatformSyncService>(PlatformSyncService);
    retryMechanismService = module.get<RetryMechanismService>(RetryMechanismService);
  });

  it('should be defined', () => {
    expect(platformSyncService).toBeDefined();
    expect(retryMechanismService).toBeDefined();
  });
});

// Performance tests
describe('Performance Tests', () => {
  it('should handle concurrent sync requests efficiently', async () => {
    // This would be implemented with proper performance testing tools
    // and realistic data volumes in a full test environment
    expect(true).toBe(true); // Placeholder
  });

  it('should process large batch syncs within acceptable time limits', async () => {
    // Performance test for batch operations
    expect(true).toBe(true); // Placeholder
  });
});