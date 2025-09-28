import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

interface AvailabilityUpdate {
  id: string;
  companyId: string;
  branchId: string;
  connectedId: string;
  connectedType: 'product' | 'modifier' | 'category';
  isActive?: boolean;
  isInStock?: boolean;
  stockLevel?: number;
  prices?: Record<string, number>;
  notes?: string;
  updatedBy: string;
  updatedAt: string;
}

interface StockAlert {
  id: string;
  companyId: string;
  branchId: string;
  connectedId: string;
  connectedType: string;
  alertType: 'out_of_stock' | 'low_stock' | 'overstocked';
  message: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  currentStock?: number;
  threshold?: number;
}

interface SocketStats {
  connected: boolean;
  connecting: boolean;
  error: string | null;
  connectionTime: Date | null;
  lastUpdate: Date | null;
  messagesReceived: number;
}

export interface AvailabilitySocketHook {
  socket: Socket | null;
  stats: SocketStats;
  connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'error';
  joinBranch: (branchId: string) => void;
  leaveBranch: (branchId: string) => void;
  onAvailabilityUpdate: (callback: (update: AvailabilityUpdate) => void) => void;
  onStockAlert: (callback: (alert: StockAlert) => void) => void;
  offAvailabilityUpdate: () => void;
  offStockAlert: () => void;
  ping: () => void;
}

export const useAvailabilitySocket = (): AvailabilitySocketHook => {
  const { user } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [stats, setStats] = useState<SocketStats>({
    connected: false,
    connecting: false,
    error: null,
    connectionTime: null,
    lastUpdate: null,
    messagesReceived: 0
  });

  const availabilityUpdateCallbackRef = useRef<((update: AvailabilityUpdate) => void) | null>(null);
  const stockAlertCallbackRef = useRef<((alert: StockAlert) => void) | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize socket connection
  useEffect(() => {
    if (!user) {
      return;
    }

    const token = localStorage.getItem('auth-token');
    if (!token) {
      setStats(prev => ({ ...prev, error: 'No authentication token' }));
      return;
    }

    setStats(prev => ({ ...prev, connecting: true, error: null }));

    // Create socket connection to availability namespace
    const newSocket = io(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/availability`, {
      auth: {
        token: token
      },
      query: {
        userId: user.id,
        companyId: user.companyId,
        role: user.role
      },
      reconnection: true,
      reconnectionDelay: 2000,
      reconnectionDelayMax: 10000,
      reconnectionAttempts: 10,
      timeout: 20000,
      forceNew: true
    });

    // Connection event handlers
    newSocket.on('connect', () => {
      console.log('🔌 Connected to availability WebSocket');
      setStats(prev => ({
        ...prev,
        connected: true,
        connecting: false,
        error: null,
        connectionTime: new Date()
      }));
      
      toast.success('Real-time updates connected', { 
        duration: 2000,
        icon: '🔄' 
      });
    });

    newSocket.on('disconnect', (reason) => {
      console.log('🔌 Disconnected from availability WebSocket:', reason);
      setStats(prev => ({
        ...prev,
        connected: false,
        connecting: false,
        error: `Disconnected: ${reason}`
      }));

      if (reason === 'io server disconnect' || reason === 'transport close') {
        toast.error('Connection lost - real-time updates disabled', { 
          duration: 3000,
          icon: '⚠️' 
        });
      }
    });

    newSocket.on('connect_error', (error) => {
      console.error('🔌 Connection error:', error);
      setStats(prev => ({
        ...prev,
        connected: false,
        connecting: false,
        error: error.message
      }));

      toast.error('Failed to connect to real-time updates', { 
        duration: 3000,
        icon: '❌' 
      });
    });

    // Availability update handler
    newSocket.on('availabilityUpdate', (data: { type: string; data: AvailabilityUpdate; timestamp: string }) => {
      console.log('📦 Availability update received:', data);
      setStats(prev => ({
        ...prev,
        lastUpdate: new Date(),
        messagesReceived: prev.messagesReceived + 1
      }));

      if (availabilityUpdateCallbackRef.current) {
        availabilityUpdateCallbackRef.current(data.data);
      }

      // Show toast notification for important updates
      if (data.data.isInStock === false) {
        toast(`📦 Item out of stock: ${data.data.connectedType}`, {
          duration: 4000,
          icon: '🚨'
        });
      } else if (data.data.isActive === false) {
        toast(`⏸️ Item disabled: ${data.data.connectedType}`, {
          duration: 3000,
          icon: '⚠️'
        });
      }
    });

    // Stock alert handler
    newSocket.on('stockAlert', (data: { type: string; data: StockAlert; timestamp: string }) => {
      console.log('🚨 Stock alert received:', data);
      setStats(prev => ({
        ...prev,
        lastUpdate: new Date(),
        messagesReceived: prev.messagesReceived + 1
      }));

      if (stockAlertCallbackRef.current) {
        stockAlertCallbackRef.current(data.data);
      }

      // Show toast notification based on priority
      const alertIcon = data.data.priority === 'critical' ? '🚨' : 
                       data.data.priority === 'high' ? '⚠️' : 
                       data.data.priority === 'medium' ? '📢' : 'ℹ️';
      
      toast(data.data.message, {
        duration: data.data.priority === 'critical' ? 8000 : 5000,
        icon: alertIcon
      });
    });

    // Branch-specific updates
    newSocket.on('branchUpdate', (data: { type: string; data: AvailabilityUpdate; timestamp: string }) => {
      console.log('🏢 Branch update received:', data);
      setStats(prev => ({
        ...prev,
        lastUpdate: new Date(),
        messagesReceived: prev.messagesReceived + 1
      }));

      if (availabilityUpdateCallbackRef.current) {
        availabilityUpdateCallbackRef.current(data.data);
      }
    });

    // Bulk updates
    newSocket.on('bulkAvailabilityUpdate', (data: { 
      type: string; 
      data: AvailabilityUpdate[]; 
      count: number;
      timestamp: string;
    }) => {
      console.log(`📦 Bulk availability update received (${data.count} items):`, data);
      setStats(prev => ({
        ...prev,
        lastUpdate: new Date(),
        messagesReceived: prev.messagesReceived + 1
      }));

      toast(`📦 ${data.count} items updated`, {
        duration: 3000,
        icon: '🔄'
      });

      if (availabilityUpdateCallbackRef.current) {
        data.data.forEach(update => {
          availabilityUpdateCallbackRef.current!(update);
        });
      }
    });

    // Error handling
    newSocket.on('error', (error) => {
      console.error('🔌 Socket error:', error);
      setStats(prev => ({ ...prev, error: error.message }));
      toast.error(`Connection error: ${error.message}`, { duration: 3000 });
    });

    // Ping-pong for connection health
    newSocket.on('pong', (data: { timestamp: string; user: string; company: string }) => {
      console.log('🏓 Pong received:', data);
    });

    // New alert events
    newSocket.on('newAlert', (data: any) => {
      console.log('🚨 New alert received:', data);
      setStats(prev => ({
        ...prev,
        lastUpdate: new Date(),
        messagesReceived: prev.messagesReceived + 1
      }));

      // Show toast notification for new alerts
      const alertData = data.data;
      const icon = alertData.severity === 'critical' ? '🚨' : 
                   alertData.severity === 'high' ? '⚠️' : 
                   alertData.severity === 'medium' ? '📢' : 'ℹ️';
      
      toast(`${alertData.title}: ${alertData.message}`, {
        duration: alertData.severity === 'critical' ? 10000 : 6000,
        icon: icon
      });
    });

    newSocket.on('urgentAlert', (data: any) => {
      console.log('🚨 URGENT ALERT received:', data);
      const alertData = data.data;
      
      // Show prominent notification
      toast.error(`URGENT: ${alertData.title}`, {
        duration: 15000,
        icon: '🚨'
      });

      // Browser notification if permitted
      if (Notification.permission === 'granted') {
        new Notification(`Urgent Alert: ${alertData.title}`, {
          body: alertData.message,
          icon: '/favicon.ico',
          requireInteraction: true
        });
      }
    });

    newSocket.on('alertUpdate', (data: any) => {
      console.log('🔄 Alert update received:', data);
      setStats(prev => ({
        ...prev,
        lastUpdate: new Date(),
        messagesReceived: prev.messagesReceived + 1
      }));
    });

    setSocket(newSocket);

    // Cleanup function
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      newSocket.close();
      setSocket(null);
      setStats({
        connected: false,
        connecting: false,
        error: null,
        connectionTime: null,
        lastUpdate: null,
        messagesReceived: 0
      });
    };
  }, [user?.id, user?.companyId, user?.role]);

  // Helper functions
  const joinBranch = (branchId: string) => {
    if (socket && socket.connected) {
      socket.emit('joinBranch', { branchId });
      console.log(`🏢 Joined branch room: ${branchId}`);
    }
  };

  const leaveBranch = (branchId: string) => {
    if (socket && socket.connected) {
      socket.emit('leaveBranch', { branchId });
      console.log(`🏢 Left branch room: ${branchId}`);
    }
  };

  const onAvailabilityUpdate = (callback: (update: AvailabilityUpdate) => void) => {
    availabilityUpdateCallbackRef.current = callback;
  };

  const onStockAlert = (callback: (alert: StockAlert) => void) => {
    stockAlertCallbackRef.current = callback;
  };

  const offAvailabilityUpdate = () => {
    availabilityUpdateCallbackRef.current = null;
  };

  const offStockAlert = () => {
    stockAlertCallbackRef.current = null;
  };

  const ping = () => {
    if (socket && socket.connected) {
      socket.emit('ping');
      console.log('🏓 Ping sent');
    }
  };

  const connectionStatus = stats.connecting ? 'connecting' : 
                          stats.connected ? 'connected' : 
                          stats.error ? 'error' : 'disconnected';

  return {
    socket,
    stats,
    connectionStatus,
    joinBranch,
    leaveBranch,
    onAvailabilityUpdate,
    onStockAlert,
    offAvailabilityUpdate,
    offStockAlert,
    ping
  };
};