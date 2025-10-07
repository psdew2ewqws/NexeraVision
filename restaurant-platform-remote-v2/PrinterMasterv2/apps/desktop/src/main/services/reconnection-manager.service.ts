import { io, Socket } from 'socket.io-client';

/**
 * Reconnection Strategy Types
 */
enum ReconnectionStrategy {
  IMMEDIATE = 'IMMEDIATE',
  LINEAR_BACKOFF = 'LINEAR_BACKOFF',
  EXPONENTIAL_BACKOFF = 'EXPONENTIAL_BACKOFF',
  FIXED_INTERVAL = 'FIXED_INTERVAL',
}

interface ReconnectionConfig {
  strategy: ReconnectionStrategy;
  maxRetries: number;
  baseDelay: number; // milliseconds
  maxDelay: number; // milliseconds
  jitter: boolean; // Add randomness to prevent thundering herd
}

interface ConnectionMetrics {
  totalConnections: number;
  successfulConnections: number;
  failedConnections: number;
  totalReconnections: number;
  consecutiveFailures: number;
  lastConnectedAt: Date | null;
  lastDisconnectedAt: Date | null;
  currentState: 'connected' | 'disconnected' | 'reconnecting';
  uptime: number; // milliseconds
  averageConnectionDuration: number; // milliseconds
}

/**
 * Automatic Reconnection Manager for Desktop App
 *
 * Implements intelligent reconnection logic with exponential backoff,
 * jitter, and automatic failure recovery
 */
export class ReconnectionManager {
  private socket: Socket | null = null;
  private reconnectionAttempt: number = 0;
  private reconnectionTimer: NodeJS.Timeout | null = null;
  private isManualDisconnect: boolean = false;
  private connectionStartTime: Date | null = null;

  private config: ReconnectionConfig = {
    strategy: ReconnectionStrategy.EXPONENTIAL_BACKOFF,
    maxRetries: -1, // Infinite retries
    baseDelay: 1000, // Start with 1 second
    maxDelay: 60000, // Max 60 seconds
    jitter: true, // Enable jitter to prevent thundering herd
  };

  private metrics: ConnectionMetrics = {
    totalConnections: 0,
    successfulConnections: 0,
    failedConnections: 0,
    totalReconnections: 0,
    consecutiveFailures: 0,
    lastConnectedAt: null,
    lastDisconnectedAt: null,
    currentState: 'disconnected',
    uptime: 0,
    averageConnectionDuration: 0,
  };

  private connectionDurations: number[] = [];

  constructor(
    private serverUrl: string,
    private authData: any,
    private onConnected: (socket: Socket) => void,
    private onDisconnected: (reason: string) => void,
    private onReconnecting: (attempt: number, delay: number) => void,
    private onReconnectionFailed: () => void
  ) {}

  /**
   * Initialize connection
   */
  connect(): void {
    console.log(`🔌 [RECONNECTION] Initializing connection to ${this.serverUrl}`);

    this.isManualDisconnect = false;
    this.attemptConnection();
  }

  /**
   * Attempt connection to server
   */
  private attemptConnection(): void {
    if (this.socket?.connected) {
      console.log(`ℹ️ [RECONNECTION] Already connected, skipping connection attempt`);
      return;
    }

    console.log(`🔄 [RECONNECTION] Connection attempt #${this.reconnectionAttempt + 1}`);

    try {
      this.socket = io(this.serverUrl, {
        auth: this.authData,
        transports: ['websocket', 'polling'],
        reconnection: false, // Disable socket.io's built-in reconnection (we manage it ourselves)
        timeout: 10000,
        forceNew: true, // Force new connection each time
      });

      this.setupSocketListeners();
      this.connectionStartTime = new Date();
      this.metrics.totalConnections++;

    } catch (error) {
      console.error(`❌ [RECONNECTION] Connection attempt failed:`, error);
      this.handleConnectionFailure();
    }
  }

  /**
   * Setup socket event listeners
   */
  private setupSocketListeners(): void {
    if (!this.socket) return;

    // Connection successful
    this.socket.on('connect', () => {
      console.log(`✅ [RECONNECTION] Connected successfully (Socket ID: ${this.socket?.id})`);

      this.reconnectionAttempt = 0;
      this.metrics.successfulConnections++;
      this.metrics.consecutiveFailures = 0;
      this.metrics.lastConnectedAt = new Date();
      this.metrics.currentState = 'connected';

      // Clear any pending reconnection timer
      if (this.reconnectionTimer) {
        clearTimeout(this.reconnectionTimer);
        this.reconnectionTimer = null;
      }

      // Notify application
      this.onConnected(this.socket!);
    });

    // Connection error
    this.socket.on('connect_error', (error) => {
      console.error(`❌ [RECONNECTION] Connection error:`, error.message);
      this.handleConnectionFailure();
    });

    // Disconnected
    this.socket.on('disconnect', (reason) => {
      console.log(`🔌 [RECONNECTION] Disconnected: ${reason}`);

      // Record disconnection time and update metrics
      if (this.metrics.lastConnectedAt && this.connectionStartTime) {
        const duration = Date.now() - this.connectionStartTime.getTime();
        this.connectionDurations.push(duration);

        // Keep only last 100 durations for average calculation
        if (this.connectionDurations.length > 100) {
          this.connectionDurations.shift();
        }

        this.metrics.averageConnectionDuration =
          this.connectionDurations.reduce((a, b) => a + b, 0) / this.connectionDurations.length;

        this.metrics.uptime += duration;
      }

      this.metrics.lastDisconnectedAt = new Date();
      this.metrics.currentState = 'disconnected';

      // Notify application
      this.onDisconnected(reason);

      // Attempt reconnection if not manually disconnected
      if (!this.isManualDisconnect) {
        this.handleDisconnection(reason);
      }
    });

    // Error event
    this.socket.on('error', (error) => {
      console.error(`⚠️ [RECONNECTION] Socket error:`, error);
    });
  }

  /**
   * Handle disconnection and schedule reconnection
   */
  private handleDisconnection(reason: string): void {
    console.log(`🔄 [RECONNECTION] Handling disconnection: ${reason}`);

    // Check if we should attempt reconnection
    if (this.isManualDisconnect) {
      console.log(`ℹ️ [RECONNECTION] Manual disconnect, not reconnecting`);
      return;
    }

    if (this.config.maxRetries > 0 && this.reconnectionAttempt >= this.config.maxRetries) {
      console.error(`❌ [RECONNECTION] Max retries (${this.config.maxRetries}) exceeded`);
      this.onReconnectionFailed();
      return;
    }

    this.scheduleReconnection();
  }

  /**
   * Handle connection failure
   */
  private handleConnectionFailure(): void {
    this.metrics.failedConnections++;
    this.metrics.consecutiveFailures++;

    if (this.config.maxRetries > 0 && this.reconnectionAttempt >= this.config.maxRetries) {
      console.error(`❌ [RECONNECTION] Max retries (${this.config.maxRetries}) exceeded`);
      this.onReconnectionFailed();
      return;
    }

    this.scheduleReconnection();
  }

  /**
   * Schedule reconnection attempt
   */
  private scheduleReconnection(): void {
    if (this.reconnectionTimer) {
      console.log(`ℹ️ [RECONNECTION] Reconnection already scheduled, skipping`);
      return;
    }

    const delay = this.calculateReconnectionDelay();

    console.log(`⏱️ [RECONNECTION] Scheduling reconnection in ${delay}ms (Attempt #${this.reconnectionAttempt + 1})`);

    this.metrics.currentState = 'reconnecting';
    this.metrics.totalReconnections++;

    // Notify application about reconnection attempt
    this.onReconnecting(this.reconnectionAttempt + 1, delay);

    this.reconnectionTimer = setTimeout(() => {
      this.reconnectionTimer = null;
      this.reconnectionAttempt++;
      this.attemptConnection();
    }, delay);
  }

  /**
   * Calculate reconnection delay based on strategy
   */
  private calculateReconnectionDelay(): number {
    let delay: number;

    switch (this.config.strategy) {
      case ReconnectionStrategy.IMMEDIATE:
        delay = 0;
        break;

      case ReconnectionStrategy.LINEAR_BACKOFF:
        delay = Math.min(
          this.config.baseDelay * (this.reconnectionAttempt + 1),
          this.config.maxDelay
        );
        break;

      case ReconnectionStrategy.EXPONENTIAL_BACKOFF:
        delay = Math.min(
          this.config.baseDelay * Math.pow(2, this.reconnectionAttempt),
          this.config.maxDelay
        );
        break;

      case ReconnectionStrategy.FIXED_INTERVAL:
        delay = this.config.baseDelay;
        break;

      default:
        delay = this.config.baseDelay;
    }

    // Add jitter to prevent thundering herd problem
    if (this.config.jitter) {
      const jitterAmount = delay * 0.25; // ±25% jitter
      const jitter = (Math.random() * 2 - 1) * jitterAmount;
      delay = Math.max(0, delay + jitter);
    }

    return Math.floor(delay);
  }

  /**
   * Manual disconnect
   */
  disconnect(): void {
    console.log(`🔌 [RECONNECTION] Manual disconnect requested`);

    this.isManualDisconnect = true;
    this.metrics.currentState = 'disconnected';

    // Clear reconnection timer if exists
    if (this.reconnectionTimer) {
      clearTimeout(this.reconnectionTimer);
      this.reconnectionTimer = null;
    }

    // Disconnect socket
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }

    this.reconnectionAttempt = 0;
  }

  /**
   * Force reconnection
   */
  forceReconnect(): void {
    console.log(`🔄 [RECONNECTION] Force reconnection requested`);

    this.disconnect();

    // Reset reconnection state
    this.isManualDisconnect = false;
    this.reconnectionAttempt = 0;

    // Attempt connection after short delay
    setTimeout(() => {
      this.connect();
    }, 1000);
  }

  /**
   * Get current socket instance
   */
  getSocket(): Socket | null {
    return this.socket;
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  /**
   * Get connection metrics
   */
  getMetrics(): ConnectionMetrics {
    return { ...this.metrics };
  }

  /**
   * Reset metrics
   */
  resetMetrics(): void {
    this.metrics = {
      totalConnections: 0,
      successfulConnections: 0,
      failedConnections: 0,
      totalReconnections: 0,
      consecutiveFailures: 0,
      lastConnectedAt: null,
      lastDisconnectedAt: null,
      currentState: this.isConnected() ? 'connected' : 'disconnected',
      uptime: 0,
      averageConnectionDuration: 0,
    };

    this.connectionDurations = [];
  }

  /**
   * Update reconnection configuration
   */
  updateConfig(config: Partial<ReconnectionConfig>): void {
    this.config = { ...this.config, ...config };
    console.log(`⚙️ [RECONNECTION] Configuration updated:`, this.config);
  }

  /**
   * Get reconnection health score (0-100)
   */
  getHealthScore(): number {
    const successRate =
      this.metrics.totalConnections > 0
        ? (this.metrics.successfulConnections / this.metrics.totalConnections) * 100
        : 100;

    const consecutiveFailurePenalty = Math.min(this.metrics.consecutiveFailures * 10, 50);

    const healthScore = Math.max(0, Math.min(100, successRate - consecutiveFailurePenalty));

    return Math.round(healthScore);
  }
}

/**
 * Singleton instance manager
 */
let reconnectionManagerInstance: ReconnectionManager | null = null;

export function createReconnectionManager(
  serverUrl: string,
  authData: any,
  onConnected: (socket: Socket) => void,
  onDisconnected: (reason: string) => void,
  onReconnecting: (attempt: number, delay: number) => void,
  onReconnectionFailed: () => void
): ReconnectionManager {
  reconnectionManagerInstance = new ReconnectionManager(
    serverUrl,
    authData,
    onConnected,
    onDisconnected,
    onReconnecting,
    onReconnectionFailed
  );

  return reconnectionManagerInstance;
}

export function getReconnectionManager(): ReconnectionManager | null {
  return reconnectionManagerInstance;
}
