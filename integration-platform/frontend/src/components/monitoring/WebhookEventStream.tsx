import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  ArrowPathIcon,
  PlayIcon,
  PauseIcon,
  TrashIcon
} from '@heroicons/react/24/outline';
import websocketService, { WebhookEvent } from '@/services/websocket.service';

interface WebhookEventStreamProps {
  maxEvents?: number;
  autoScroll?: boolean;
  filters?: {
    provider?: string;
    status?: string;
    type?: string;
  };
}

const WebhookEventStream: React.FC<WebhookEventStreamProps> = ({
  maxEvents = 100,
  autoScroll = true,
  filters
}) => {
  const [events, setEvents] = useState<WebhookEvent[]>([]);
  const [isPaused, setIsPaused] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [filteredEvents, setFilteredEvents] = useState<WebhookEvent[]>([]);

  // Handle new webhook events
  const handleWebhookEvent = useCallback((event: WebhookEvent) => {
    if (isPaused) return;

    setEvents(prevEvents => {
      const newEvents = [event, ...prevEvents];
      // Keep only the max number of events
      return newEvents.slice(0, maxEvents);
    });
  }, [isPaused, maxEvents]);

  // Handle connection status
  const handleConnectionChange = useCallback((data: any) => {
    setIsConnected(data.status === 'connected');
  }, []);

  // Apply filters to events
  useEffect(() => {
    let filtered = events;

    if (filters?.provider) {
      filtered = filtered.filter(event =>
        event.provider.toLowerCase().includes(filters.provider!.toLowerCase())
      );
    }

    if (filters?.status) {
      filtered = filtered.filter(event => event.status === filters.status);
    }

    if (filters?.type) {
      filtered = filtered.filter(event =>
        event.type.toLowerCase().includes(filters.type!.toLowerCase())
      );
    }

    setFilteredEvents(filtered);
  }, [events, filters]);

  // Setup WebSocket listeners
  useEffect(() => {
    const unsubscribeWebhookEvent = websocketService.on('webhook_event', handleWebhookEvent);
    const unsubscribeConnection = websocketService.on('connection', handleConnectionChange);

    // Subscribe to monitoring events
    websocketService.subscribeToEvents();

    // Check initial connection status
    const connectionStatus = websocketService.getConnectionStatus();
    setIsConnected(connectionStatus.connected);

    return () => {
      unsubscribeWebhookEvent();
      unsubscribeConnection();
      websocketService.unsubscribeFromEvents();
    };
  }, [handleWebhookEvent, handleConnectionChange]);

  const getStatusIcon = (status: WebhookEvent['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
      case 'failure':
        return <XCircleIcon className="h-5 w-5 text-red-500" />;
      case 'pending':
        return <ClockIcon className="h-5 w-5 text-yellow-500" />;
      default:
        return <ClockIcon className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusBadgeClass = (status: WebhookEvent['status']) => {
    switch (status) {
      case 'success':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'failure':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  const clearEvents = () => {
    setEvents([]);
  };

  const togglePause = () => {
    setIsPaused(!isPaused);
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <h3 className="text-lg font-medium text-gray-900">Live Event Stream</h3>
            <div className="flex items-center space-x-2">
              <div className={`h-2 w-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
              <span className={`text-sm ${isConnected ? 'text-green-600' : 'text-red-600'}`}>
                {isConnected ? 'Connected' : 'Disconnected'}
              </span>
            </div>
            {isPaused && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                Paused
              </span>
            )}
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={togglePause}
              className="inline-flex items-center px-3 py-1.5 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              {isPaused ? (
                <>
                  <PlayIcon className="h-4 w-4 mr-1" />
                  Resume
                </>
              ) : (
                <>
                  <PauseIcon className="h-4 w-4 mr-1" />
                  Pause
                </>
              )}
            </button>
            <button
              onClick={clearEvents}
              className="inline-flex items-center px-3 py-1.5 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <TrashIcon className="h-4 w-4 mr-1" />
              Clear
            </button>
            <button
              onClick={() => websocketService.reconnect()}
              className="inline-flex items-center px-3 py-1.5 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <ArrowPathIcon className="h-4 w-4 mr-1" />
              Reconnect
            </button>
          </div>
        </div>
        <div className="mt-2 text-sm text-gray-600">
          Showing {filteredEvents.length} of {events.length} events
        </div>
      </div>

      {/* Event List */}
      <div className="max-h-96 overflow-y-auto">
        <AnimatePresence initial={false}>
          {filteredEvents.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <ClockIcon className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>Waiting for webhook events...</p>
              <p className="text-sm mt-1">Events will appear here in real-time</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {filteredEvents.map((event) => (
                <motion.div
                  key={event.id}
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                  className="p-4 hover:bg-gray-50"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3 flex-1">
                      <div className="flex-shrink-0 mt-0.5">
                        {getStatusIcon(event.status)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 mb-1">
                          <span className="font-medium text-gray-900">{event.provider}</span>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${getStatusBadgeClass(event.status)}`}>
                            {event.status}
                          </span>
                          <span className="text-sm text-gray-500">{event.type}</span>
                        </div>
                        <div className="text-sm text-gray-600 mb-1">
                          Event ID: <code className="bg-gray-100 px-1 rounded">{event.id}</code>
                        </div>
                        {event.responseTime && (
                          <div className="text-sm text-gray-500">
                            Response time: {event.responseTime}ms
                          </div>
                        )}
                        {event.error && (
                          <div className="mt-2 text-sm text-red-600 bg-red-50 p-2 rounded">
                            {event.error}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex-shrink-0 ml-4">
                      <div className="text-sm text-gray-500">
                        {formatTimestamp(event.timestamp)}
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default WebhookEventStream;