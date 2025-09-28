import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { OrderStatus } from '@prisma/client';

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
      // From PENDING
      { from: OrderStatus.PENDING, to: OrderStatus.CONFIRMED, event: 'CONFIRM_ORDER' },
      { from: OrderStatus.PENDING, to: OrderStatus.CANCELLED, event: 'CANCEL_ORDER' },
      { from: OrderStatus.PENDING, to: OrderStatus.FAILED, event: 'FAIL_ORDER' },

      // From CONFIRMED
      { from: OrderStatus.CONFIRMED, to: OrderStatus.PREPARING, event: 'START_PREPARATION' },
      { from: OrderStatus.CONFIRMED, to: OrderStatus.CANCELLED, event: 'CANCEL_ORDER' },
      { from: OrderStatus.CONFIRMED, to: OrderStatus.FAILED, event: 'FAIL_ORDER' },

      // From PREPARING
      { from: OrderStatus.PREPARING, to: OrderStatus.READY, event: 'COMPLETE_PREPARATION' },
      { from: OrderStatus.PREPARING, to: OrderStatus.CANCELLED, event: 'CANCEL_ORDER' },
      { from: OrderStatus.PREPARING, to: OrderStatus.FAILED, event: 'FAIL_ORDER' },

      // From READY
      { from: OrderStatus.READY, to: OrderStatus.PICKED_UP, event: 'PICKUP_ORDER' },
      { from: OrderStatus.READY, to: OrderStatus.CANCELLED, event: 'CANCEL_ORDER' },
      { from: OrderStatus.READY, to: OrderStatus.FAILED, event: 'FAIL_ORDER' },

      // From PICKED_UP
      { from: OrderStatus.PICKED_UP, to: OrderStatus.IN_DELIVERY, event: 'START_DELIVERY' },
      { from: OrderStatus.PICKED_UP, to: OrderStatus.DELIVERED, event: 'DELIVER_ORDER' }, // Direct delivery for small distances
      { from: OrderStatus.PICKED_UP, to: OrderStatus.FAILED, event: 'FAIL_ORDER' },

      // From IN_DELIVERY
      { from: OrderStatus.IN_DELIVERY, to: OrderStatus.DELIVERED, event: 'DELIVER_ORDER' },
      { from: OrderStatus.IN_DELIVERY, to: OrderStatus.FAILED, event: 'FAIL_ORDER' },

      // Emergency transitions (from any non-final state)
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
   * Validates if a state transition is allowed
   */
  canTransition(currentStatus: OrderStatus, newStatus: OrderStatus, event?: string): boolean {
    try {
      // Same state is always allowed (idempotent)
      if (currentStatus === newStatus) {
        return true;
      }

      // Check if transition exists in configuration
      const transition = this.config.transitions.find(
        t => t.from === currentStatus && t.to === newStatus
      );

      if (!transition) {
        this.logger.warn(`Invalid transition: ${currentStatus} -> ${newStatus}`);
        return false;
      }

      // If event is provided, validate it matches
      if (event && transition.event !== event) {
        this.logger.warn(`Event mismatch: expected ${transition.event}, got ${event}`);
        return false;
      }

      return true;
    } catch (error) {
      this.logger.error(`Error validating transition: ${error.message}`, error.stack);
      return false;
    }
  }

  /**
   * Validates state transition and throws error if invalid
   */
  validateTransition(currentStatus: OrderStatus, newStatus: OrderStatus, event?: string): void {
    if (!this.canTransition(currentStatus, newStatus, event)) {
      throw new BadRequestException(
        `Invalid order status transition from ${currentStatus} to ${newStatus}${
          event ? ` with event ${event}` : ''
        }`
      );
    }
  }

  /**
   * Gets all possible next states from current state
   */
  getNextStates(currentStatus: OrderStatus): OrderStatus[] {
    return this.config.transitions
      .filter(t => t.from === currentStatus)
      .map(t => t.to)
      .filter((state, index, self) => self.indexOf(state) === index); // Remove duplicates
  }

  /**
   * Gets all valid events for current state
   */
  getValidEvents(currentStatus: OrderStatus): string[] {
    return this.config.transitions
      .filter(t => t.from === currentStatus)
      .map(t => t.event)
      .filter((event, index, self) => self.indexOf(event) === index); // Remove duplicates
  }

  /**
   * Checks if state is final (no further transitions possible)
   */
  isFinalState(status: OrderStatus): boolean {
    return this.config.finalStates.includes(status);
  }

  /**
   * Gets the initial state for new orders
   */
  getInitialState(): OrderStatus {
    return this.config.initialState;
  }

  /**
   * Gets transition information for a specific state change
   */
  getTransitionInfo(currentStatus: OrderStatus, newStatus: OrderStatus): OrderStateTransition | null {
    return this.config.transitions.find(
      t => t.from === currentStatus && t.to === newStatus
    ) || null;
  }

  /**
   * Gets recommended event for a state transition
   */
  getRecommendedEvent(currentStatus: OrderStatus, newStatus: OrderStatus): string | null {
    const transition = this.getTransitionInfo(currentStatus, newStatus);
    return transition ? transition.event : null;
  }

  /**
   * Checks if order can be cancelled from current state
   */
  canCancel(currentStatus: OrderStatus): boolean {
    return this.canTransition(currentStatus, OrderStatus.CANCELLED);
  }

  /**
   * Checks if order can be marked as failed from current state
   */
  canFail(currentStatus: OrderStatus): boolean {
    return this.canTransition(currentStatus, OrderStatus.FAILED);
  }

  /**
   * Gets all states in the order lifecycle
   */
  getAllStates(): OrderStatus[] {
    return [...this.config.states];
  }

  /**
   * Gets state machine statistics
   */
  getStateMachineInfo(): {
    totalStates: number;
    totalTransitions: number;
    finalStates: OrderStatus[];
    initialState: OrderStatus;
  } {
    return {
      totalStates: this.config.states.length,
      totalTransitions: this.config.transitions.length,
      finalStates: [...this.config.finalStates],
      initialState: this.config.initialState,
    };
  }

  /**
   * Validates an order status value
   */
  isValidState(status: string): status is OrderStatus {
    return this.config.states.includes(status as OrderStatus);
  }

  /**
   * Gets suggested next action for a state
   */
  getSuggestedAction(currentStatus: OrderStatus): string {
    const actions: Record<OrderStatus, string> = {
      [OrderStatus.PENDING]: 'Confirm the order to start processing',
      [OrderStatus.CONFIRMED]: 'Start food preparation',
      [OrderStatus.PREPARING]: 'Complete preparation and mark as ready',
      [OrderStatus.READY]: 'Order is ready for pickup by delivery driver',
      [OrderStatus.PICKED_UP]: 'Driver should start delivery or mark as delivered if close',
      [OrderStatus.IN_DELIVERY]: 'Complete delivery to customer',
      [OrderStatus.DELIVERED]: 'Order completed successfully',
      [OrderStatus.CANCELLED]: 'Order was cancelled',
      [OrderStatus.FAILED]: 'Order failed and requires attention',
    };

    return actions[currentStatus] || 'No specific action required';
  }

  /**
   * Estimates time in state (in minutes)
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