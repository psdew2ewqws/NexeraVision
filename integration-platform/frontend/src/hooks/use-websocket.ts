'use client';

import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '@/contexts/auth-context';
import toast from 'react-hot-toast';

interface WebSocketData {
  type: string;
  data: any;
  timestamp: string;
}

interface UseWebSocketOptions {
  onMessage?: (data: WebSocketData) => void;
  onOrderUpdate?: (order: any) => void;
  onIntegrationStatusChange?: (integration: any) => void;
  onWebhookEvent?: (webhook: any) => void;
}

export const useWebSocket = (options: UseWebSocketOptions = {}) => {
  const { user, isAuthenticated } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<WebSocketData | null>(null);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!isAuthenticated || !user) {
      return;
    }

    // Create WebSocket connection to integration platform backend (port 3002)
    const socket = io(process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3002', {
      auth: {
        token: localStorage.getItem('auth_token'),
      },
      transports: ['websocket', 'polling'],
    });

    socketRef.current = socket;

    // Connection events
    socket.on('connect', () => {
      setIsConnected(true);
      console.log('WebSocket connected');

      // Join company-specific room for multi-tenancy
      if (user.company_id) {
        socket.emit('join_company', { companyId: user.company_id });
      }
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
      console.log('WebSocket disconnected');
    });

    socket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error);
      setIsConnected(false);
    });

    // Message handling
    socket.on('message', (data: WebSocketData) => {
      setLastMessage(data);
      options.onMessage?.(data);

      // Handle specific message types
      switch (data.type) {
        case 'order_created':
        case 'order_updated':
          options.onOrderUpdate?.(data.data);
          if (data.type === 'order_created') {
            toast.success(`New order received from ${data.data.provider}`);
          }
          break;

        case 'integration_status_changed':
          options.onIntegrationStatusChange?.(data.data);
          toast(`Integration ${data.data.provider} status changed to ${data.data.status}`);
          break;

        case 'webhook_received':
          options.onWebhookEvent?.(data.data);
          break;

        case 'menu_sync_completed':
          toast.success(`Menu sync completed for ${data.data.provider}`);
          break;

        case 'integration_error':
          toast.error(`Integration error: ${data.data.message}`);
          break;

        default:
          console.log('Unhandled WebSocket message:', data);
      }
    });

    // Real-time event listeners
    socket.on('order:created', (order) => {
      options.onOrderUpdate?.(order);
      toast.success(`New order #${order.external_id || order.id.slice(-8)} from ${order.provider}`);
    });

    socket.on('order:updated', (order) => {
      options.onOrderUpdate?.(order);
    });

    socket.on('integration:status_changed', (integration) => {
      options.onIntegrationStatusChange?.(integration);
    });

    socket.on('webhook:received', (webhook) => {
      options.onWebhookEvent?.(webhook);
    });

    // Cleanup on unmount
    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [isAuthenticated, user, options]);

  const sendMessage = (type: string, data: any) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit(type, data);
    } else {
      console.warn('WebSocket not connected, cannot send message');
    }
  };

  const joinRoom = (room: string) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('join_room', { room });
    }
  };

  const leaveRoom = (room: string) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('leave_room', { room });
    }
  };

  return {
    isConnected,
    lastMessage,
    sendMessage,
    joinRoom,
    leaveRoom,
    socket: socketRef.current,
  };
};