import { Injectable, BadRequestException, Logger } from '@nestjs/common';

/**
 * Order status enum - matches Prisma schema
 */
export enum OrderStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  PREPARING = 'PREPARING',
  READY = 'READY',
  PICKED_UP = 'PICKED_UP',
  IN_DELIVERY = 'IN_DELIVERY',
  DELIVERED = 'DELIVERED',
  CANCELLED = 'CANCELLED',
  FAILED = 'FAILED',
}

export interface OrderStateTransition {
  from: OrderStatus;
  to: OrderStatus;
  event: string;
  conditions?: string[];
  sideEffects?: string[];
}

export interface OrderStateMachineConfig {
  initialState: OrderStatus;
  states: OrderStatus[];
  transitions: OrderStateTransition[];
  finalStates: OrderStatus[];
}

/**
 * Order State Machine
 *
 * @description Manages order state transitions with validation
 * Refactored from integration-platform with enhanced validation and events
 *
 * @responsibilities
 * - Validate state transitions
 * - Enforce business rules for order lifecycle
 * - Provide state transition metadata
 * - Support emergency transitions
 *
 * @example
 * ```typescript
 * const canTransition = stateMachine.canTransition(
 *   OrderStatus.PENDING,
 *   OrderStatus.CONFIRMED
 * );
 *
 * if (canTransition) {
 *   stateMachine.validateTransition(
 *     OrderStatus.PENDING,
 *     OrderStatus.CONFIRMED,
 *     'CONFIRM_ORDER'
 *   );
 * }
 * ```
 */
@Injectable()
export class OrderStateMachine {
  private readonly logger = new Logger(OrderStateMachine.name);

  private readonly config: OrderStateMachineConfig = {
    initialState: OrderStatus.PENDING,
    states: [
      OrderStatus.PENDING,
      OrderStatus.CONFIRMED,
      OrderStatus.PREPARING,
      OrderStatus.READY,
      OrderStatus.PICKED_UP,
      OrderStatus.IN_DELIVERY,
      OrderStatus.DELIVERED,
      OrderStatus.CANCELLED,
      OrderStatus.FAILED,
    ],
    transitions: [
      // PENDING transitions
      { from: OrderStatus.PENDING, to: OrderStatus.CONFIRMED, event: 'CONFIRM_ORDER' },
      { from: OrderStatus.PENDING, to: OrderStatus.CANCELLED, event: 'CANCEL_ORDER' },
      { from: OrderStatus.PENDING, to: OrderStatus.FAILED, event: 'FAIL_ORDER' },

      // CONFIRMED transitions
      { from: OrderStatus.CONFIRMED, to: OrderStatus.PREPARING, event: 'START_PREPARATION' },
      { from: OrderStatus.CONFIRMED, to: OrderStatus.CANCELLED, event: 'CANCEL_ORDER' },
      { from: OrderStatus.CONFIRMED, to: OrderStatus.FAILED, event: 'FAIL_ORDER' },

      // PREPARING transitions
      { from: OrderStatus.PREPARING, to: OrderStatus.READY, event: 'COMPLETE_PREPARATION' },
      { from: OrderStatus.PREPARING, to: OrderStatus.CANCELLED, event: 'CANCEL_ORDER' },
      { from: OrderStatus.PREPARING, to: OrderStatus.FAILED, event: 'FAIL_ORDER' },

      // READY transitions
      { from: OrderStatus.READY, to: OrderStatus.PICKED_UP, event: 'PICKUP_ORDER' },
      { from: OrderStatus.READY, to: OrderStatus.CANCELLED, event: 'CANCEL_ORDER' },
      { from: OrderStatus.READY, to: OrderStatus.FAILED, event: 'FAIL_ORDER' },

      // PICKED_UP transitions
      { from: OrderStatus.PICKED_UP, to: OrderStatus.IN_DELIVERY, event: 'START_DELIVERY' },
      { from: OrderStatus.PICKED_UP, to: OrderStatus.DELIVERED, event: 'DELIVER_ORDER' },
      { from: OrderStatus.PICKED_UP, to: OrderStatus.FAILED, event: 'FAIL_ORDER' },

      // IN_DELIVERY transitions
      { from: OrderStatus.IN_DELIVERY, to: OrderStatus.DELIVERED, event: 'DELIVER_ORDER' },
      { from: OrderStatus.IN_DELIVERY, to: OrderStatus.FAILED, event: 'FAIL_ORDER' },

      // Emergency transitions
      { from: OrderStatus.PENDING, to: OrderStatus.DELIVERED, event: 'FORCE_COMPLETE' },
      { from: OrderStatus.CONFIRMED, to: OrderStatus.DELIVERED, event: 'FORCE_COMPLETE' },
      { from: OrderStatus.PREPARING, to: OrderStatus.DELIVERED, event: 'FORCE_COMPLETE' },
      { from: OrderStatus.READY, to: OrderStatus.DELIVERED, event: 'FORCE_COMPLETE' },
      { from: OrderStatus.PICKED_UP, to: OrderStatus.DELIVERED, event: 'FORCE_COMPLETE' },
      { from: OrderStatus.IN_DELIVERY, to: OrderStatus.DELIVERED, event: 'FORCE_COMPLETE' },
    ],
    finalStates: [OrderStatus.DELIVERED, OrderStatus.CANCELLED, OrderStatus.FAILED],
  };

  /**
   * Check if state transition is allowed
   */
  canTransition(currentStatus: OrderStatus, newStatus: OrderStatus, event?: string): boolean {
    if (currentStatus === newStatus) {
      return true; // Idempotent
    }

    const transition = this.config.transitions.find(
      (t) => t.from === currentStatus && t.to === newStatus,
    );

    if (!transition) {
      return false;
    }

    if (event && transition.event !== event) {
      return false;
    }

    return true;
  }

  /**
   * Validate transition and throw if invalid
   */
  validateTransition(currentStatus: OrderStatus, newStatus: OrderStatus, event?: string): void {
    if (!this.canTransition(currentStatus, newStatus, event)) {
      throw new BadRequestException(
        `Invalid order status transition from ${currentStatus} to ${newStatus}${
          event ? ` with event ${event}` : ''
        }`,
      );
    }
  }

  /**
   * Get all possible next states from current state
   */
  getNextStates(currentStatus: OrderStatus): OrderStatus[] {
    return this.config.transitions
      .filter((t) => t.from === currentStatus)
      .map((t) => t.to)
      .filter((state, index, self) => self.indexOf(state) === index);
  }

  /**
   * Get valid events for current state
   */
  getValidEvents(currentStatus: OrderStatus): string[] {
    return this.config.transitions
      .filter((t) => t.from === currentStatus)
      .map((t) => t.event)
      .filter((event, index, self) => self.indexOf(event) === index);
  }

  /**
   * Check if state is final
   */
  isFinalState(status: OrderStatus): boolean {
    return this.config.finalStates.includes(status);
  }

  /**
   * Get initial state
   */
  getInitialState(): OrderStatus {
    return this.config.initialState;
  }

  /**
   * Get transition information
   */
  getTransitionInfo(currentStatus: OrderStatus, newStatus: OrderStatus): OrderStateTransition | null {
    return (
      this.config.transitions.find((t) => t.from === currentStatus && t.to === newStatus) || null
    );
  }

  /**
   * Check if order can be cancelled
   */
  canCancel(currentStatus: OrderStatus): boolean {
    return this.canTransition(currentStatus, OrderStatus.CANCELLED);
  }

  /**
   * Check if order can be marked as failed
   */
  canFail(currentStatus: OrderStatus): boolean {
    return this.canTransition(currentStatus, OrderStatus.FAILED);
  }

  /**
   * Get all states
   */
  getAllStates(): OrderStatus[] {
    return [...this.config.states];
  }

  /**
   * Get state machine statistics
   */
  getStateMachineInfo() {
    return {
      totalStates: this.config.states.length,
      totalTransitions: this.config.transitions.length,
      finalStates: [...this.config.finalStates],
      initialState: this.config.initialState,
    };
  }

  /**
   * Validate order status value
   */
  isValidState(status: string): status is OrderStatus {
    return this.config.states.includes(status as OrderStatus);
  }

  /**
   * Get suggested action for state
   */
  getSuggestedAction(currentStatus: OrderStatus): string {
    const actions: Record<OrderStatus, string> = {
      [OrderStatus.PENDING]: 'Confirm the order to start processing',
      [OrderStatus.CONFIRMED]: 'Start food preparation',
      [OrderStatus.PREPARING]: 'Complete preparation and mark as ready',
      [OrderStatus.READY]: 'Order is ready for pickup by delivery driver',
      [OrderStatus.PICKED_UP]: 'Driver should start delivery',
      [OrderStatus.IN_DELIVERY]: 'Complete delivery to customer',
      [OrderStatus.DELIVERED]: 'Order completed successfully',
      [OrderStatus.CANCELLED]: 'Order was cancelled',
      [OrderStatus.FAILED]: 'Order failed and requires attention',
    };

    return actions[currentStatus] || 'No specific action required';
  }

  /**
   * Get estimated time in state (minutes)
   */
  getEstimatedTimeInState(status: OrderStatus): number {
    const estimatedTimes: Record<OrderStatus, number> = {
      [OrderStatus.PENDING]: 5,
      [OrderStatus.CONFIRMED]: 2,
      [OrderStatus.PREPARING]: 20,
      [OrderStatus.READY]: 10,
      [OrderStatus.PICKED_UP]: 5,
      [OrderStatus.IN_DELIVERY]: 25,
      [OrderStatus.DELIVERED]: 0,
      [OrderStatus.CANCELLED]: 0,
      [OrderStatus.FAILED]: 0,
    };

    return estimatedTimes[status] || 0;
  }
}
