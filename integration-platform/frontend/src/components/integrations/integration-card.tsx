'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Integration } from '@/types';
import { formatDateTime, getStatusColor, capitalize } from '@/lib/utils';
import {
  PlayIcon,
  PauseIcon,
  Cog6ToothIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';

interface IntegrationCardProps {
  integration: Integration;
  onToggle: (id: string, status: 'active' | 'inactive') => void;
  onConfigure: (integration: Integration) => void;
  onTest: (id: string) => void;
}

export default function IntegrationCard({ integration, onToggle, onConfigure, onTest }: IntegrationCardProps) {
  const getHealthIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
      case 'warning':
        return <ExclamationTriangleIcon className="h-5 w-5 text-yellow-500" />;
      case 'critical':
        return <ExclamationTriangleIcon className="h-5 w-5 text-red-500" />;
      default:
        return null;
    }
  };

  const getProviderLogo = (provider: string) => {
    // In a real app, you'd have actual logos
    return (
      <div className={`w-12 h-12 rounded-lg flex items-center justify-center text-white font-bold ${getStatusColor(provider)}`}>
        {provider.charAt(0).toUpperCase()}
      </div>
    );
  };

  const isActive = integration.status === 'active';

  return (
    <Card className="h-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {getProviderLogo(integration.provider)}
            <div>
              <CardTitle className="text-lg">{capitalize(integration.provider)}</CardTitle>
              <CardDescription>
                {integration.config.store_id && `Store ID: ${integration.config.store_id}`}
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {getHealthIcon(integration.health.status)}
            <Badge variant={isActive ? 'success' : 'secondary'}>
              {integration.status}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Health Metrics */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-gray-500">Success Rate</div>
              <div className="font-medium text-lg">
                {integration.health.success_rate.toFixed(1)}%
              </div>
            </div>
            <div>
              <div className="text-gray-500">Response Time</div>
              <div className="font-medium text-lg">
                {integration.health.response_time}ms
              </div>
            </div>
            <div>
              <div className="text-gray-500">Error Count</div>
              <div className="font-medium text-lg text-red-600">
                {integration.health.error_count}
              </div>
            </div>
            <div>
              <div className="text-gray-500">Last Ping</div>
              <div className="font-medium text-sm">
                {formatDateTime(integration.health.last_ping)}
              </div>
            </div>
          </div>

          {/* Configuration Status */}
          <div className="space-y-2">
            <div className="text-sm font-medium text-gray-700">Configuration</div>
            <div className="flex flex-wrap gap-1">
              <Badge variant="outline" className="text-xs">
                API: {integration.config.api_key ? 'Set' : 'Missing'}
              </Badge>
              {integration.config.auto_accept_orders && (
                <Badge variant="outline" className="text-xs">Auto Accept</Badge>
              )}
              {integration.config.sync_menu && (
                <Badge variant="outline" className="text-xs">Menu Sync</Badge>
              )}
              {integration.config.sync_inventory && (
                <Badge variant="outline" className="text-xs">Inventory Sync</Badge>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-4 border-t">
            <div className="flex items-center space-x-2">
              <Button
                size="sm"
                variant={isActive ? 'destructive' : 'default'}
                onClick={() => onToggle(integration.id, isActive ? 'inactive' : 'active')}
              >
                {isActive ? (
                  <>
                    <PauseIcon className="h-4 w-4 mr-1" />
                    Disable
                  </>
                ) : (
                  <>
                    <PlayIcon className="h-4 w-4 mr-1" />
                    Enable
                  </>
                )}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => onTest(integration.id)}
              >
                Test
              </Button>
            </div>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onConfigure(integration)}
            >
              <Cog6ToothIcon className="h-4 w-4 mr-1" />
              Configure
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}