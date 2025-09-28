import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ArrowsRightLeftIcon,
  CloudArrowUpIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ClockIcon
} from '@heroicons/react/24/outline';

interface Provider {
  id: string;
  name: string;
  status: 'synced' | 'pending' | 'error' | 'disabled';
  lastSync?: string;
  itemCount?: number;
  error?: string;
}

// Remove auth wrapper to prevent infinite loading
function MenuSyncContent() {
  const [providers, setProviders] = useState<Provider[]>([
    {
      id: '1',
      name: 'Careem Now',
      status: 'synced',
      lastSync: '2 hours ago',
      itemCount: 145
    },
    {
      id: '2',
      name: 'Talabat',
      status: 'pending',
      lastSync: '5 hours ago',
      itemCount: 142
    },
    {
      id: '3',
      name: 'Deliveroo',
      status: 'error',
      lastSync: '1 day ago',
      itemCount: 138,
      error: 'Authentication failed'
    },
    {
      id: '4',
      name: 'Jahez',
      status: 'disabled',
      itemCount: 0
    }
  ]);

  const [syncInProgress, setSyncInProgress] = useState(false);

  const handleSync = (providerId: string) => {
    setSyncInProgress(true);
    // Simulate sync
    setTimeout(() => {
      setProviders(prev => prev.map(p =>
        p.id === providerId
          ? { ...p, status: 'synced' as const, lastSync: 'Just now' }
          : p
      ));
      setSyncInProgress(false);
    }, 2000);
  };

  const handleSyncAll = () => {
    setSyncInProgress(true);
    setTimeout(() => {
      setProviders(prev => prev.map(p => ({
        ...p,
        status: p.status === 'disabled' ? 'disabled' : 'synced' as const,
        lastSync: p.status !== 'disabled' ? 'Just now' : undefined
      })));
      setSyncInProgress(false);
    }, 3000);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'synced':
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
      case 'pending':
        return <ClockIcon className="h-5 w-5 text-yellow-500" />;
      case 'error':
        return <ExclamationTriangleIcon className="h-5 w-5 text-red-500" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'synced':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'error':
        return 'bg-red-100 text-red-800';
      case 'disabled':
        return 'bg-gray-100 text-gray-600';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Menu Synchronization</h1>
          <p className="mt-1 text-sm text-gray-500">
            Sync your restaurant menu across all delivery platforms
          </p>
        </div>
        <Button
          onClick={handleSyncAll}
          disabled={syncInProgress}
          className="bg-primary hover:bg-primary/90"
        >
          <ArrowsRightLeftIcon className="h-4 w-4 mr-2" />
          {syncInProgress ? 'Syncing...' : 'Sync All Platforms'}
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Total Menu Items</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">145</div>
            <p className="text-xs text-gray-500 mt-1">Across all platforms</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Active Platforms</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">3</div>
            <p className="text-xs text-gray-500 mt-1">Out of 4 configured</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Last Sync</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">2h ago</div>
            <p className="text-xs text-gray-500 mt-1">All platforms synced</p>
          </CardContent>
        </Card>
      </div>

      {/* Provider Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {providers.map((provider) => (
          <Card key={provider.id} className="relative">
            <CardHeader>
              <div className="flex justify-between items-start">
                <div className="flex items-center space-x-3">
                  <div className="flex-shrink-0">
                    {getStatusIcon(provider.status)}
                  </div>
                  <div>
                    <CardTitle className="text-lg">{provider.name}</CardTitle>
                    <CardDescription>
                      {provider.itemCount ? `${provider.itemCount} items` : 'Not configured'}
                    </CardDescription>
                  </div>
                </div>
                <Badge className={getStatusColor(provider.status)}>
                  {provider.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {provider.lastSync && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Last synchronized</span>
                    <span className="font-medium">{provider.lastSync}</span>
                  </div>
                )}

                {provider.error && (
                  <div className="p-3 bg-red-50 rounded-md">
                    <p className="text-sm text-red-800">{provider.error}</p>
                  </div>
                )}

                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    disabled={provider.status === 'disabled' || syncInProgress}
                    onClick={() => handleSync(provider.id)}
                  >
                    <CloudArrowUpIcon className="h-4 w-4 mr-1" />
                    Sync Now
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                  >
                    View Details
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Sync Activity</CardTitle>
          <CardDescription>Latest synchronization events across platforms</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[
              { platform: 'Careem Now', action: 'Menu synced successfully', time: '2 hours ago', status: 'success' },
              { platform: 'Talabat', action: 'Partial sync completed', time: '5 hours ago', status: 'warning' },
              { platform: 'Deliveroo', action: 'Sync failed - Authentication error', time: '1 day ago', status: 'error' },
              { platform: 'Careem Now', action: 'New items added', time: '2 days ago', status: 'success' },
            ].map((activity, index) => (
              <div key={index} className="flex items-center justify-between py-3 border-b last:border-0">
                <div className="flex items-center space-x-3">
                  <div className={`w-2 h-2 rounded-full ${
                    activity.status === 'success' ? 'bg-green-500' :
                    activity.status === 'warning' ? 'bg-yellow-500' : 'bg-red-500'
                  }`} />
                  <div>
                    <p className="text-sm font-medium text-gray-900">{activity.platform}</p>
                    <p className="text-sm text-gray-500">{activity.action}</p>
                  </div>
                </div>
                <span className="text-sm text-gray-500">{activity.time}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Export without auth wrapper to prevent infinite loading
export default MenuSyncContent;