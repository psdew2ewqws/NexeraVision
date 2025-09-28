import { useState, useEffect, useRef, useCallback } from 'react';

interface WebSocketHookOptions {
  onMessage?: (data: any) => void;
  onOpen?: () => void;
  onClose?: () => void;
  onError?: (error: Event) => void;
  reconnect?: boolean;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
}

interface WebSocketState {
  socket: WebSocket | null;
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
  reconnectAttempts: number;
}

export const useWebSocket = (url: string, options: WebSocketHookOptions = {}) => {
  const {
    onMessage,
    onOpen,
    onClose,
    onError,
    reconnect = true,
    reconnectInterval = 3000,
    maxReconnectAttempts = 5
  } = options;

  const [state, setState] = useState<WebSocketState>({
    socket: null,
    isConnected: false,
    isConnecting: false,
    error: null,
    reconnectAttempts: 0
  });

  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const shouldConnectRef = useRef(true);

  const connect = useCallback(() => {
    if (!shouldConnectRef.current) return;

    setState(prev => ({
      ...prev,
      isConnecting: true,
      error: null
    }));

    try {
      const ws = new WebSocket(url);

      ws.onopen = () => {
        setState(prev => ({
          ...prev,
          socket: ws,
          isConnected: true,
          isConnecting: false,
          error: null,
          reconnectAttempts: 0
        }));
        onOpen?.();
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          onMessage?.(data);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      ws.onclose = () => {
        setState(prev => ({
          ...prev,
          socket: null,
          isConnected: false,
          isConnecting: false
        }));

        onClose?.();

        // Attempt to reconnect if enabled and within limits
        if (reconnect && shouldConnectRef.current && state.reconnectAttempts < maxReconnectAttempts) {
          setState(prev => ({
            ...prev,
            reconnectAttempts: prev.reconnectAttempts + 1
          }));

          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, reconnectInterval);
        }
      };

      ws.onerror = (error) => {
        setState(prev => ({
          ...prev,
          error: 'WebSocket connection error',
          isConnecting: false
        }));
        onError?.(error);
      };

    } catch (error) {
      setState(prev => ({
        ...prev,
        error: 'Failed to create WebSocket connection',
        isConnecting: false
      }));
    }
  }, [url, onMessage, onOpen, onClose, onError, reconnect, reconnectInterval, maxReconnectAttempts, state.reconnectAttempts]);

  const disconnect = useCallback(() => {
    shouldConnectRef.current = false;

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }

    if (state.socket) {
      state.socket.close();
    }

    setState({
      socket: null,
      isConnected: false,
      isConnecting: false,
      error: null,
      reconnectAttempts: 0
    });
  }, [state.socket]);

  const sendMessage = useCallback((message: any) => {
    if (state.socket && state.isConnected) {
      try {
        state.socket.send(JSON.stringify(message));
        return true;
      } catch (error) {
        console.error('Error sending WebSocket message:', error);
        return false;
      }
    }
    return false;
  }, [state.socket, state.isConnected]);

  const reconnectManually = useCallback(() => {
    if (state.reconnectAttempts < maxReconnectAttempts) {
      connect();
    }
  }, [connect, state.reconnectAttempts, maxReconnectAttempts]);

  useEffect(() => {
    connect();

    return () => {
      disconnect();
    };
  }, [url]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      shouldConnectRef.current = false;
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, []);

  return {
    ...state,
    sendMessage,
    disconnect,
    reconnect: reconnectManually,
    canReconnect: state.reconnectAttempts < maxReconnectAttempts
  };
};