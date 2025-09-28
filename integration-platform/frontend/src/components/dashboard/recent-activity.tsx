'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Activity } from '@/types';
import { formatRelativeTime } from '@/lib/utils';
import {
  ShoppingCartIcon,
  BuildingStorefrontIcon,
  DocumentTextIcon,
  BoltIcon,
} from '@heroicons/react/24/outline';

interface RecentActivityProps {
  data: Activity[];
  loading: boolean;
}

const getActivityIcon = (type: string) => {
  switch (type) {
    case 'order':
      return ShoppingCartIcon;
    case 'integration':
      return BuildingStorefrontIcon;
    case 'menu':
      return DocumentTextIcon;
    case 'webhook':
      return BoltIcon;
    default:
      return DocumentTextIcon;
  }
};

const getActivityColor = (type: string) => {
  switch (type) {
    case 'order':
      return 'text-blue-600 bg-blue-100';
    case 'integration':
      return 'text-green-600 bg-green-100';
    case 'menu':
      return 'text-purple-600 bg-purple-100';
    case 'webhook':
      return 'text-orange-600 bg-orange-100';
    default:
      return 'text-gray-600 bg-gray-100';
  }
};

export default function RecentActivity({ data, loading }: RecentActivityProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>Latest system events and updates</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="animate-pulse flex items-start space-x-3">
                <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-1"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>Latest system events and updates</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center text-gray-500 py-8">
            No recent activity
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Activity</CardTitle>
        <CardDescription>Latest system events and updates</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {data.slice(0, 10).map((activity) => {
            const Icon = getActivityIcon(activity.type);
            return (
              <div key={activity.id} className="flex items-start space-x-3">
                <div className={`p-2 rounded-full ${getActivityColor(activity.type)}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-gray-900">{activity.message}</div>
                  <div className="flex items-center space-x-2 mt-1">
                    <Badge variant="outline" className="text-xs capitalize">
                      {activity.type}
                    </Badge>
                    <span className="text-xs text-gray-500">
                      {formatRelativeTime(activity.timestamp)}
                    </span>
                    {activity.user && (
                      <span className="text-xs text-gray-500">by {activity.user}</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}