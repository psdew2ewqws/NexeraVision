import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertTriangle,
  CheckCircle,
  Clock,
  MoreVertical,
  Settings,
  TrendingUp,
  XCircle,
} from 'lucide-react';
import { Integration, ProviderMetrics } from '@/types';

interface ProviderCardProps {
  integration: Integration;
  metrics: ProviderMetrics;
  onToggle: (id: string, enabled: boolean) => void;
  onConfigure: (integration: Integration) => void;
  onTest: (integration: Integration) => void;
  onViewDetails: (integration: Integration) => void;
}

const PROVIDER_CONFIGS = {
  careem: { name: 'Careem Now', color: 'bg-green-500', logo: '🚗' },
  talabat: { name: 'Talabat', color: 'bg-orange-500', logo: '🍽️' },
  deliveroo: { name: 'Deliveroo', color: 'bg-teal-500', logo: '🦌' },
  uber_eats: { name: 'Uber Eats', color: 'bg-black', logo: '🚚' },
  jahez: { name: 'Jahez', color: 'bg-red-500', logo: '🥘' },
  hungerstation: { name: 'HungerStation', color: 'bg-yellow-500', logo: '🍕' },
  noon_food: { name: 'Noon Food', color: 'bg-blue-500', logo: '🌙' },
  mrsool: { name: 'Mrsool', color: 'bg-purple-500', logo: '🛵' },
  zomato: { name: 'Zomato', color: 'bg-red-600', logo: '🍴' },
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'active':
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    case 'error':
      return <XCircle className="h-4 w-4 text-red-500" />;
    case 'pending':
      return <Clock className="h-4 w-4 text-yellow-500" />;
    default:
      return <AlertTriangle className="h-4 w-4 text-gray-500" />;
  }
};

const getStatusBadge = (status: string) => {
  const variants = {
    active: 'default',
    error: 'destructive',
    pending: 'secondary',
    inactive: 'outline',
    disabled: 'outline',
  };

  return variants[status as keyof typeof variants] || 'outline';
};

export const ProviderCard: React.FC<ProviderCardProps> = ({
  integration,
  metrics,
  onToggle,
  onConfigure,
  onTest,
  onViewDetails,
}) => {
  const config = PROVIDER_CONFIGS[integration.provider];
  const isActive = integration.status === 'active';

  return (
    <Card className="relative overflow-hidden">
      {/* Provider Color Bar */}
      <div className={`absolute top-0 left-0 right-0 h-1 ${config.color}`} />

      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="text-2xl">{config.logo}</div>
            <div>
              <CardTitle className="text-lg">{config.name}</CardTitle>
              <div className="flex items-center space-x-2 mt-1">
                {getStatusIcon(integration.status)}
                <Badge variant={getStatusBadge(integration.status)}>
                  {integration.status.toUpperCase()}
                </Badge>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              checked={isActive}
              onCheckedChange={(checked) => onToggle(integration.id, checked)}
              disabled={integration.status === 'pending'}
            />

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onConfigure(integration)}>
                  <Settings className="h-4 w-4 mr-2" />
                  Configure
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onTest(integration)}>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Test Connection
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => onViewDetails(integration)}>
                  <TrendingUp className="h-4 w-4 mr-2" />
                  View Details
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="text-sm text-muted-foreground">Today's Orders</div>
            <div className="text-2xl font-bold">{metrics.last_24h_orders}</div>
          </div>

          <div className="space-y-2">
            <div className="text-sm text-muted-foreground">Success Rate</div>
            <div className="text-2xl font-bold">
              {((1 - metrics.error_rate) * 100).toFixed(1)}%
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-sm text-muted-foreground">Response Time</div>
            <div className="text-sm font-medium">
              {metrics.avg_response_time}ms
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-sm text-muted-foreground">Revenue Today</div>
            <div className="text-sm font-medium">
              ${metrics.revenue_today.toFixed(2)}
            </div>
          </div>
        </div>

        {/* Health Indicator */}
        <div className="mt-4 pt-4 border-t">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Health Status</span>
            <div className="flex items-center space-x-2">
              <div
                className={`w-2 h-2 rounded-full ${
                  integration.health.status === 'healthy'
                    ? 'bg-green-500'
                    : integration.health.status === 'warning'
                    ? 'bg-yellow-500'
                    : 'bg-red-500'
                }`}
              />
              <span className="text-sm capitalize">
                {integration.health.status}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};