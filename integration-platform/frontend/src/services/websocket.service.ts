import { io, Socket } from 'socket.io-client';

interface WebhookEvent {
  id: string;
  timestamp: string;
  provider: string;
  type: string;
  status: 'success' | 'failure' | 'pending';
  responseTime?: number;
  payload?: any;
  error?: string;
}

interface SystemMetrics {
  webhookCount: number;
  successRate: number;
  avgResponseTime: number;
  activeConnections: number;
  uptime: string;
  memoryUsage: number;
  cpuUsage: number;
}

interface ProviderStatus {
  provider: string;
  status: 'connected' | 'disconnected' | 'error';
  lastPing: string;
  responseTime: number;
  errorCount: number;
}

interface AlertData {
  id: string;
  level: 'info' | 'warning' | 'error' | 'critical';
  message: string;
  timestamp: string;
  provider?: string;
  resolved: boolean;
}

class WebSocketService {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private messageQueue: Array<{ event: string; data: any }> = [];
  private isConnected = false;
  private listeners: Map<string, Function[]> = new Map();

  constructor() {
    this.connect();
  }

  private connect() {
    try {
      const socketUrl = process.env.NEXT_PUBLIC_WEBSOCKET_URL || 'http://localhost:3001';

      this.socket = io(socketUrl, {
        transports: ['websocket'],
        timeout: 20000,
        reconnection: true,
        reconnectionAttempts: this.maxReconnectAttempts,
        reconnectionDelay: 1000,
        autoConnect: true,
      });

      this.setupEventListeners();
    } catch (error) {
      console.error('Failed to initialize WebSocket connection:', error);
      this.scheduleReconnect();
    }
  }

  private setupEventListeners() {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('WebSocket connected');
      this.isConnected = true;
      this.reconnectAttempts = 0;
      this.processMessageQueue();
      this.notifyListeners('connection', { status: 'connected' });
    });

    this.socket.on('disconnect', (reason) => {
      console.log('WebSocket disconnected:', reason);
      this.isConnected = false;
      this.notifyListeners('connection', { status: 'disconnected', reason });

      if (reason === 'io server disconnect') {
        // Server initiated disconnect, reconnect manually
        this.scheduleReconnect();
      }
    });

    this.socket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error);
      this.isConnected = false;
      this.notifyListeners('connection', { status: 'error', error: error.message });
      this.scheduleReconnect();
    });

    // Monitoring event listeners
    this.socket.on('webhook_event', (data: WebhookEvent) => {
      this.notifyListeners('webhook_event', data);
    });

    this.socket.on('system_metrics', (data: SystemMetrics) => {
      this.notifyListeners('system_metrics', data);
    });

    this.socket.on('provider_status', (data: ProviderStatus) => {
      this.notifyListeners('provider_status', data);
    });

    this.socket.on('alert', (data: AlertData) => {
      this.notifyListeners('alert', data);
    });

    this.socket.on('health_check', (data: any) => {
      this.notifyListeners('health_check', data);
    });
  }

  private scheduleReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      const delay = Math.pow(2, this.reconnectAttempts) * 1000; // Exponential backoff
      this.reconnectAttempts++;

      console.log(`Scheduling reconnect attempt ${this.reconnectAttempts} in ${delay}ms`);

      setTimeout(() => {
        if (!this.isConnected) {
          this.connect();
        }
      }, delay);
    } else {
      console.error('Max reconnection attempts reached');
      this.notifyListeners('connection', { status: 'failed', maxAttemptsReached: true });
    }
  }

  private processMessageQueue() {
    while (this.messageQueue.length > 0 && this.isConnected) {
      const { event, data } = this.messageQueue.shift()!;
      this.emit(event, data);
    }
  }

  private notifyListeners(event: string, data: any) {
    const eventListeners = this.listeners.get(event) || [];
    eventListeners.forEach(listener => {
      try {
        listener(data);
      } catch (error) {
        console.error(`Error in listener for event ${event}:`, error);
      }
    });
  }

  // Public methods
  public on(event: string, listener: Function) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(listener);

    // Return unsubscribe function
    return () => {
      const eventListeners = this.listeners.get(event);
      if (eventListeners) {
        const index = eventListeners.indexOf(listener);
        if (index > -1) {
          eventListeners.splice(index, 1);
        }
      }
    };
  }

  public off(event: string, listener?: Function) {
    if (!listener) {
      this.listeners.delete(event);
    } else {
      const eventListeners = this.listeners.get(event);
      if (eventListeners) {
        const index = eventListeners.indexOf(listener);
        if (index > -1) {
          eventListeners.splice(index, 1);
        }
      }
    }
  }

  public emit(event: string, data?: any) {
    if (this.isConnected && this.socket) {
      this.socket.emit(event, data);
    } else {
      // Queue message if not connected
      this.messageQueue.push({ event, data });
    }
  }

  public getConnectionStatus() {
    return {
      connected: this.isConnected,
      reconnectAttempts: this.reconnectAttempts,
      queueSize: this.messageQueue.length,
    };
  }

  public disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.isConnected = false;
    this.listeners.clear();
    this.messageQueue = [];
  }

  public reconnect() {
    this.disconnect();
    this.reconnectAttempts = 0;
    this.connect();
  }

  // Monitoring specific methods
  public requestSystemMetrics() {
    this.emit('get_system_metrics');
  }

  public requestProviderStatus() {
    this.emit('get_provider_status');
  }

  public requestHealthCheck() {
    this.emit('health_check');
  }

  public subscribeToEvents() {
    this.emit('subscribe_monitoring');
  }

  public unsubscribeFromEvents() {
    this.emit('unsubscribe_monitoring');
  }
}

// Singleton instance
const websocketService = new WebSocketService();

export default websocketService;
export type { WebhookEvent, SystemMetrics, ProviderStatus, AlertData };