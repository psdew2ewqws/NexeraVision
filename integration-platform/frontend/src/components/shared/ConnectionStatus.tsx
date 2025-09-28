import React, { useState } from 'react';
import { useWebSocketContext } from '@/contexts/WebSocketContext';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Wifi,
  WifiOff,
  AlertTriangle,
  RefreshCw,
  Activity,
  Clock,
} from 'lucide-react';

export function ConnectionStatus() {
  const {
    isConnected,
    connectionError,
    lastMessage,
    connect,
    disconnect,
  } = useWebSocketContext();
  const [showDetails, setShowDetails] = useState(false);

  const getStatusIcon = () => {
    if (isConnected) {
      return <Wifi className="h-4 w-4 text-green-500" />;
    } else if (connectionError) {
      return <WifiOff className="h-4 w-4 text-red-500" />;
    } else {
      return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getStatusText = () => {
    if (isConnected) {
      return 'Real-time updates active';
    } else if (connectionError) {
      return 'Connection error';
    } else {
      return 'Connecting...';
    }
  };

  const getStatusVariant = () => {
    if (isConnected) {
      return 'default';
    } else if (connectionError) {
      return 'destructive';
    } else {
      return 'secondary';
    }
  };

  const formatLastMessageTime = () => {
    if (!lastMessage) return 'No messages';

    const time = new Date(lastMessage.timestamp);
    const now = new Date();
    const diff = now.getTime() - time.getTime();

    if (diff < 60000) { // Less than 1 minute
      return 'Just now';
    } else if (diff < 3600000) { // Less than 1 hour
      return `${Math.floor(diff / 60000)} min ago`;
    } else {
      return time.toLocaleTimeString();
    }
  };

  return (
    <Popover open={showDetails} onOpenChange={setShowDetails}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="gap-2 text-xs"
        >
          {getStatusIcon()}
          <span className="hidden sm:inline">Live</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="end">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              {getStatusIcon()}
              <span className="font-medium">Real-time Connection</span>
            </div>
            <Badge variant={getStatusVariant()}>
              {isConnected ? 'CONNECTED' : connectionError ? 'ERROR' : 'CONNECTING'}
            </Badge>
          </div>

          <div className="text-sm text-muted-foreground">
            {getStatusText()}
          </div>

          {connectionError && (
            <div className="p-2 bg-red-50 rounded text-sm text-red-600">
              <strong>Error:</strong> {connectionError}
            </div>
          )}

          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Last activity:</span>
              <div className="flex items-center space-x-1">
                <Activity className="h-3 w-3" />
                <span>{formatLastMessageTime()}</span>
              </div>
            </div>

            {lastMessage && (
              <div className="p-2 bg-gray-50 rounded text-xs">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium">Latest Event:</span>
                  <Badge variant="outline" className="text-xs">
                    {lastMessage.type.replace('_', ' ').toUpperCase()}
                  </Badge>
                </div>
                <div className="text-muted-foreground">
                  {lastMessage.type === 'order_update' && lastMessage.data && (
                    <span>Order #{lastMessage.data.external_id} → {lastMessage.data.status}</span>
                  )}
                  {lastMessage.type === 'provider_status' && lastMessage.data && (
                    <span>{lastMessage.data.provider} → {lastMessage.data.status}</span>
                  )}
                  {lastMessage.type === 'system_alert' && lastMessage.data && (
                    <span>{lastMessage.data.message}</span>
                  )}
                  {lastMessage.type === 'metrics_update' && (
                    <span>Performance metrics updated</span>
                  )}
                </div>
                <div className="flex items-center space-x-1 mt-1 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  <span>{new Date(lastMessage.timestamp).toLocaleTimeString()}</span>
                </div>
              </div>
            )}
          </div>

          <div className="flex space-x-2">
            {isConnected ? (
              <Button
                variant="outline"
                size="sm"
                onClick={disconnect}
                className="flex-1"
              >
                <WifiOff className="h-3 w-3 mr-1" />
                Disconnect
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={connect}
                className="flex-1"
              >
                <RefreshCw className="h-3 w-3 mr-1" />
                Reconnect
              </Button>
            )}
          </div>

          <div className="pt-2 border-t text-xs text-muted-foreground">
            <div className="space-y-1">
              <div>• Order status updates in real-time</div>
              <div>• Provider connection monitoring</div>
              <div>• System alerts and notifications</div>
              <div>• Performance metrics updates</div>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}