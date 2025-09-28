'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './auth-context';
import toast from 'react-hot-toast';

interface WebSocketData {
  type: string;
  data: any;
  timestamp: string;
}

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  lastMessage: WebSocketData | null;
  sendMessage: (type: string, data: any) => void;
  joinRoom: (room: string) => void;
  leaveRoom: (room: string) => void;
}

const SocketContext = createContext<SocketContextType | null>(null);

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};

interface SocketProviderProps {
  children: ReactNode;
  onOrderUpdate?: (order: any) => void;
  onIntegrationStatusChange?: (integration: any) => void;
  onWebhookEvent?: (webhook: any) => void;
}

export const SocketProvider = ({
  children,
  onOrderUpdate,
  onIntegrationStatusChange,
  onWebhookEvent
}: SocketProviderProps) => {
  const { user, isAuthenticated } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<WebSocketData | null>(null);

  useEffect(() => {
    if (!isAuthenticated || !user) {
      // Clean up existing connection
      if (socket) {
        socket.disconnect();
        setSocket(null);
        setIsConnected(false);
      }
      return;
    }

    // Create WebSocket connection to integration platform backend (port 3002)
    const newSocket = io(process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3002', {
      auth: {
        token: localStorage.getItem('auth_token'),
        userId: user.id,
        companyId: user.company_id
      },
      transports: ['websocket', 'polling'],
      autoConnect: true
    });

    setSocket(newSocket);

    // Connection events
    newSocket.on('connect', () => {
      setIsConnected(true);
      console.log('WebSocket connected to integration platform');

      // Join company-specific room for multi-tenancy
      if (user.company_id) {
        newSocket.emit('join_company', { companyId: user.company_id });
      }

      // Join user-specific room
      newSocket.emit('join_user', { userId: user.id });
    });

    newSocket.on('disconnect', () => {
      setIsConnected(false);
      console.log('WebSocket disconnected from integration platform');
    });

    newSocket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error);
      setIsConnected(false);
    });

    // Message handling
    newSocket.on('message', (data: WebSocketData) => {
      setLastMessage(data);
      console.log('Received WebSocket message:', data);

      // Handle specific message types
      switch (data.type) {
        case 'order_created':
          onOrderUpdate?.(data.data);
          toast.success(`New order received from ${data.data.provider}`);
          break;

        case 'order_updated':
          onOrderUpdate?.(data.data);
          toast(`Order ${data.data.external_id || data.data.id.slice(-8)} updated`);
          break;

        case 'integration_status_changed':
          onIntegrationStatusChange?.(data.data);
          const statusColor = data.data.status === 'active' ? 'success' : 'error';
          toast[statusColor](`${data.data.provider} integration is now ${data.data.status}`);
          break;

        case 'webhook_received':
          onWebhookEvent?.(data.data);
          break;

        case 'menu_sync_started':
          toast.loading(`Menu sync started for ${data.data.provider}`, { id: `sync-${data.data.provider}` });
          break;

        case 'menu_sync_completed':
          toast.success(`Menu sync completed for ${data.data.provider}`, { id: `sync-${data.data.provider}` });
          break;

        case 'menu_sync_failed':
          toast.error(`Menu sync failed for ${data.data.provider}: ${data.data.error}`, { id: `sync-${data.data.provider}` });
          break;

        case 'integration_error':
          toast.error(`Integration error (${data.data.provider}): ${data.data.message}`);
          break;

        case 'system_notification':
          toast(data.data.message);
          break;

        default:
          console.log('Unhandled WebSocket message type:', data.type);
      }
    });

    // Real-time event listeners for specific events
    newSocket.on('order:created', (order) => {
      onOrderUpdate?.(order);
      toast.success(`New order #${order.external_id || order.id.slice(-8)} from ${order.provider.toUpperCase()}`);
    });

    newSocket.on('order:updated', (order) => {
      onOrderUpdate?.(order);
    });

    newSocket.on('order:status_changed', (order) => {
      onOrderUpdate?.(order);
      toast(`Order ${order.external_id || order.id.slice(-8)} is now ${order.status}`);
    });

    newSocket.on('integration:status_changed', (integration) => {
      onIntegrationStatusChange?.(integration);
    });

    newSocket.on('integration:health_check', (health) => {
      if (health.status === 'critical') {
        toast.error(`${health.provider} integration is experiencing issues`);
      }
    });

    newSocket.on('webhook:received', (webhook) => {
      onWebhookEvent?.(webhook);
    });

    // Cleanup on unmount
    return () => {
      newSocket.disconnect();
      setSocket(null);
      setIsConnected(false);
    };
  }, [isAuthenticated, user, onOrderUpdate, onIntegrationStatusChange, onWebhookEvent]);

  const sendMessage = (type: string, data: any) => {
    if (socket?.connected) {
      socket.emit(type, data);
    } else {
      console.warn('WebSocket not connected, cannot send message:', type);
    }
  };

  const joinRoom = (room: string) => {
    if (socket?.connected) {
      socket.emit('join_room', { room });
      console.log(`Joined room: ${room}`);
    }
  };

  const leaveRoom = (room: string) => {
    if (socket?.connected) {
      socket.emit('leave_room', { room });
      console.log(`Left room: ${room}`);
    }
  };

  const value: SocketContextType = {
    socket,
    isConnected,
    lastMessage,
    sendMessage,
    joinRoom,
    leaveRoom,
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};