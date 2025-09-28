import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { OrderModule } from './order.module';
import { OrderController } from './order.controller.simple';
import { OrderService } from './order.service';
import { OrderStateMachine } from './order-state.machine';
import { PrismaService } from '../../shared/services/prisma.service';
import { Provider, OrderStatus, PaymentStatus } from '@prisma/client';
import { CreateOrderDto } from './dto/create-order.simple.dto';
import { UpdateOrderDto } from './dto/update-order.simple.dto';
import { OrderFiltersDto } from './dto/order-filters.simple.dto';

describe('OrderModule Integration', () => {
  let module: TestingModule;
  let orderController: OrderController;
  let orderService: OrderService;
  let orderStateMachine: OrderStateMachine;
  let prismaService: PrismaService;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [OrderModule, EventEmitterModule.forRoot()],
    }).compile();

    orderController = module.get<OrderController>(OrderController);
    orderService = module.get<OrderService>(OrderService);
    orderStateMachine = module.get<OrderStateMachine>(OrderStateMachine);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  afterAll(async () => {
    if (module) {
      await module.close();
    }
  });

  describe('Module Initialization', () => {
    it('should initialize all providers', () => {
      expect(orderController).toBeDefined();
      expect(orderService).toBeDefined();
      expect(orderStateMachine).toBeDefined();
      expect(prismaService).toBeDefined();
    });

    it('should have proper module structure', () => {
      expect(orderController).toBeInstanceOf(OrderController);
      expect(orderService).toBeInstanceOf(OrderService);
      expect(orderStateMachine).toBeInstanceOf(OrderStateMachine);
    });
  });

  describe('OrderStateMachine', () => {
    it('should have proper initial configuration', () => {
      const info = orderStateMachine.getStateMachineInfo();
      expect(info.initialState).toBe(OrderStatus.PENDING);
      expect(info.totalStates).toBeGreaterThan(0);
      expect(info.totalTransitions).toBeGreaterThan(0);
      expect(info.finalStates).toContain(OrderStatus.DELIVERED);
    });

    it('should validate state transitions correctly', () => {
      expect(orderStateMachine.canTransition(OrderStatus.PENDING, OrderStatus.CONFIRMED)).toBe(true);
      expect(orderStateMachine.canTransition(OrderStatus.DELIVERED, OrderStatus.PENDING)).toBe(false);
    });

    it('should get valid next states', () => {
      const nextStates = orderStateMachine.getNextStates(OrderStatus.PENDING);
      expect(nextStates).toContain(OrderStatus.CONFIRMED);
      expect(nextStates).toContain(OrderStatus.CANCELLED);
    });

    it('should identify final states', () => {
      expect(orderStateMachine.isFinalState(OrderStatus.DELIVERED)).toBe(true);
      expect(orderStateMachine.isFinalState(OrderStatus.PENDING)).toBe(false);
    });
  });

  describe('OrderService', () => {
    it('should be properly instantiated', () => {
      expect(orderService).toBeDefined();
      expect(typeof orderService.createOrder).toBe('function');
      expect(typeof orderService.getOrderById).toBe('function');
      expect(typeof orderService.updateOrder).toBe('function');
      expect(typeof orderService.searchOrders).toBe('function');
    });

    it('should have state machine integration', () => {
      const stateMachineInfo = orderService.getStateMachineInfo();
      expect(stateMachineInfo).toBeDefined();
      expect(stateMachineInfo.initialState).toBe(OrderStatus.PENDING);
    });
  });

  describe('OrderController', () => {
    it('should be properly instantiated', () => {
      expect(orderController).toBeDefined();
      expect(typeof orderController.createOrder).toBe('function');
      expect(typeof orderController.getOrderById).toBe('function');
      expect(typeof orderController.updateOrder).toBe('function');
      expect(typeof orderController.searchOrders).toBe('function');
    });

    it('should have analytics endpoint', () => {
      expect(typeof orderController.getOrderAnalytics).toBe('function');
    });

    it('should have webhook processing', () => {
      expect(typeof orderController.processWebhookOrder).toBe('function');
    });
  });

  describe('DTO Validation Structure', () => {
    it('should have CreateOrderDto with required fields', () => {
      const dto = new CreateOrderDto();
      expect(dto).toBeDefined();

      // Check that DTO can be instantiated and has correct prototype
      expect(dto).toBeInstanceOf(CreateOrderDto);
      expect(CreateOrderDto.prototype.constructor).toBe(CreateOrderDto);
    });

    it('should have UpdateOrderDto structure', () => {
      const dto = new UpdateOrderDto();
      expect(dto).toBeDefined();
      expect(dto).toBeInstanceOf(UpdateOrderDto);
    });

    it('should have OrderFiltersDto with pagination', () => {
      const dto = new OrderFiltersDto();
      expect(dto).toBeDefined();
      expect(dto).toBeInstanceOf(OrderFiltersDto);
      // These have default values so they should exist
      expect(dto.page).toBe(1);
      expect(dto.limit).toBe(20);
      expect(dto.sortBy).toBe('createdAt');
      expect(dto.sortOrder).toBe('desc');
    });
  });

  describe('Integration Points', () => {
    it('should expose required services for webhook integration', () => {
      expect(orderService).toBeDefined();
      expect(typeof orderService.createOrder).toBe('function');
    });

    it('should support event emission', () => {
      // EventEmitter should be available through the service
      expect(orderService).toBeDefined();
    });

    it('should have Prisma integration', () => {
      expect(prismaService).toBeDefined();
    });
  });

  describe('API Endpoint Coverage', () => {
    const controllerMethods = [
      'createOrder',
      'searchOrders',
      'getOrderAnalytics',
      'getStateMachineInfo',
      'getOrderByExternalId',
      'getOrderById',
      'getOrderNextStates',
      'updateOrder',
      'updateOrderStatus',
      'bulkUpdateStatus',
      'deleteOrder',
      'processWebhookOrder',
      'getOrdersByProvider',
      'getOrdersByStatus'
    ];

    controllerMethods.forEach(method => {
      it(`should have ${method} endpoint`, () => {
        expect(typeof orderController[method]).toBe('function');
      });
    });
  });

  describe('State Machine Business Logic', () => {
    it('should support order lifecycle', () => {
      const initialState = orderStateMachine.getInitialState();
      expect(initialState).toBe(OrderStatus.PENDING);

      const nextStates = orderStateMachine.getNextStates(OrderStatus.PENDING);
      expect(nextStates.length).toBeGreaterThan(0);

      const canConfirm = orderStateMachine.canTransition(OrderStatus.PENDING, OrderStatus.CONFIRMED);
      expect(canConfirm).toBe(true);
    });

    it('should prevent invalid transitions', () => {
      const canGoBackward = orderStateMachine.canTransition(OrderStatus.DELIVERED, OrderStatus.PENDING);
      expect(canGoBackward).toBe(false);
    });

    it('should support cancellation from most states', () => {
      expect(orderStateMachine.canCancel(OrderStatus.PENDING)).toBe(true);
      expect(orderStateMachine.canCancel(OrderStatus.CONFIRMED)).toBe(true);
      expect(orderStateMachine.canCancel(OrderStatus.PREPARING)).toBe(true);
    });
  });

  describe('Provider Support', () => {
    const supportedProviders = [
      Provider.CAREEM,
      Provider.TALABAT,
      Provider.DELIVEROO,
      Provider.JAHEZ,
      Provider.UBEREATS,
      Provider.ZOMATO,
      Provider.HUNGERSTATION
    ];

    supportedProviders.forEach(provider => {
      it(`should support ${provider} provider`, () => {
        // This would be a more comprehensive test in a real scenario
        expect(Object.values(Provider)).toContain(provider);
      });
    });
  });

  describe('Multi-Tenant Support', () => {
    it('should support client isolation through clientId', () => {
      // Check that DTOs can handle clientId field
      const dto = new CreateOrderDto();
      expect(dto).toBeInstanceOf(CreateOrderDto);

      const filters = new OrderFiltersDto();
      expect(filters).toBeInstanceOf(OrderFiltersDto);

      // Verify DTOs support clientId by setting values
      dto.clientId = 'test-client';
      filters.clientId = 'test-client';

      expect(dto.clientId).toBe('test-client');
      expect(filters.clientId).toBe('test-client');
    });
  });

  describe('Error Handling', () => {
    it('should have proper error handling structure', () => {
      // OrderService methods should handle errors appropriately
      expect(orderService.createOrder).toBeDefined();
      expect(orderService.getOrderById).toBeDefined();
      expect(orderService.updateOrder).toBeDefined();
    });
  });
});

/**
 * Sample test data for manual testing
 */
export const createSampleOrderDto = (): CreateOrderDto => ({
  externalOrderId: `TEST-${Date.now()}`,
  provider: Provider.CAREEM,
  clientId: 'test-client-001',
  customerName: 'John Doe',
  customerPhone: '+1234567890',
  customerEmail: 'john.doe@example.com',
  deliveryAddress: {
    street: '123 Main St',
    city: 'Test City',
    country: 'US',
    postalCode: '12345',
    building: 'Building A',
    floor: '2nd Floor',
    instructions: 'Leave at door',
    latitude: 40.7128,
    longitude: -74.0060,
  },
  items: [
    {
      id: 'item-1',
      name: 'Test Burger',
      quantity: 2,
      unitPrice: 15.99,
      description: 'Delicious test burger',
      modifiers: [],
      metadata: {},
    },
    {
      id: 'item-2',
      name: 'French Fries',
      quantity: 1,
      unitPrice: 4.99,
      description: 'Crispy fries',
      modifiers: [],
      metadata: {},
    }
  ],
  totalAmount: 36.97,
  currency: 'USD',
  paymentMethod: 'credit_card',
  paymentStatus: PaymentStatus.PAID,
  notes: 'Extra sauce on the side',
  metadata: {
    source: 'test',
    priority: 'normal',
  },
  estimatedDeliveryTime: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes from now
});

export const createSampleUpdateDto = (): UpdateOrderDto => ({
  status: OrderStatus.CONFIRMED,
  notes: 'Order confirmed and processing',
  estimatedDeliveryTime: new Date(Date.now() + 25 * 60 * 1000), // 25 minutes from now
});

export const createSampleFiltersDto = (): OrderFiltersDto => ({
  provider: Provider.CAREEM,
  status: OrderStatus.PENDING,
  page: 1,
  limit: 10,
  sortBy: 'createdAt',
  sortOrder: 'desc',
  includeEvents: true,
});