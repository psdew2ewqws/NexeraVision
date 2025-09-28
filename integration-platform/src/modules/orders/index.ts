// Order Module Exports
export { OrderModule } from './order.module';
export { OrderController } from './order.controller';
export { OrderService } from './order.service';
export { OrderStateMachine } from './order-state.machine';

// DTOs
export { CreateOrderDto } from './dto/create-order.dto';
export { UpdateOrderDto } from './dto/update-order.dto';
export { OrderFiltersDto } from './dto/order-filters.dto';
export { OrderStatusUpdateDto, BulkStatusUpdateDto } from './dto/order-status.dto';

// Types and Interfaces
export type { OrderWithEvents, PaginatedOrderResponse, OrderAnalytics } from './order.service';
export type { OrderStateTransition, OrderStateMachineConfig } from './order-state.machine';