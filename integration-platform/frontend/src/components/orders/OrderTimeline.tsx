import React from 'react';
import { OrderTimeline as OrderTimelineType, OrderStatus } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  CheckCircle,
  Clock,
  User,
  AlertCircle,
  Package,
  Truck,
  ChefHat,
  Phone,
  X
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { cn } from '@/lib/utils';

interface OrderTimelineProps {
  timeline: OrderTimelineType[];
  currentStatus: OrderStatus;
  className?: string;
  showRelativeTime?: boolean;
  compact?: boolean;
}

export const OrderTimeline: React.FC<OrderTimelineProps> = ({
  timeline,
  currentStatus,
  className,
  showRelativeTime = true,
  compact = false,
}) => {
  const getStatusConfig = (status: OrderStatus) => {
    const configs = {
      pending: {
        icon: Clock,
        color: 'text-yellow-600',
        bgColor: 'bg-yellow-100',
        borderColor: 'border-yellow-200',
        label: 'Order Pending',
        description: 'Waiting for confirmation'
      },
      confirmed: {
        icon: CheckCircle,
        color: 'text-blue-600',
        bgColor: 'bg-blue-100',
        borderColor: 'border-blue-200',
        label: 'Order Confirmed',
        description: 'Restaurant accepted the order'
      },
      preparing: {
        icon: ChefHat,
        color: 'text-orange-600',
        bgColor: 'bg-orange-100',
        borderColor: 'border-orange-200',
        label: 'Preparing',
        description: 'Kitchen is preparing your order'
      },
      ready: {
        icon: Package,
        color: 'text-purple-600',
        bgColor: 'bg-purple-100',
        borderColor: 'border-purple-200',
        label: 'Ready for Pickup',
        description: 'Order is ready'
      },
      picked_up: {
        icon: Truck,
        color: 'text-indigo-600',
        bgColor: 'bg-indigo-100',
        borderColor: 'border-indigo-200',
        label: 'Out for Delivery',
        description: 'Driver is on the way'
      },
      delivered: {
        icon: CheckCircle,
        color: 'text-green-600',
        bgColor: 'bg-green-100',
        borderColor: 'border-green-200',
        label: 'Delivered',
        description: 'Order delivered successfully'
      },
      cancelled: {
        icon: X,
        color: 'text-red-600',
        bgColor: 'bg-red-100',
        borderColor: 'border-red-200',
        label: 'Cancelled',
        description: 'Order was cancelled'
      },
      failed: {
        icon: AlertCircle,
        color: 'text-gray-600',
        bgColor: 'bg-gray-100',
        borderColor: 'border-gray-200',
        label: 'Failed',
        description: 'Order processing failed'
      },
    };

    return configs[status] || configs.pending;
  };

  const sortedTimeline = [...timeline].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  const isCurrentStatus = (status: OrderStatus) => status === currentStatus;
  const isCompletedStatus = (status: OrderStatus, index: number) => {
    const currentIndex = sortedTimeline.findIndex(item => item.status === currentStatus);
    return index <= currentIndex;
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    if (showRelativeTime) {
      return formatDistanceToNow(date, { addSuffix: true });
    }
    return format(date, 'MMM dd, yyyy HH:mm');
  };

  if (compact) {
    return (
      <div className={cn('space-y-2', className)}>
        <h4 className="font-medium text-gray-900">Order Timeline</h4>
        <div className="space-y-2">
          {sortedTimeline.map((item, index) => {
            const config = getStatusConfig(item.status);
            const Icon = config.icon;
            const isCompleted = isCompletedStatus(item.status, index);
            const isCurrent = isCurrentStatus(item.status);

            return (
              <div key={index} className="flex items-center gap-3">
                <div
                  className={cn(
                    'flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center',
                    isCompleted ? config.bgColor : 'bg-gray-100',
                    isCurrent && 'ring-2 ring-offset-1 ring-blue-500'
                  )}
                >
                  <Icon
                    className={cn(
                      'w-3 h-3',
                      isCompleted ? config.color : 'text-gray-400'
                    )}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className={cn(
                      'text-sm font-medium',
                      isCompleted ? 'text-gray-900' : 'text-gray-500'
                    )}>
                      {config.label}
                    </p>
                    <span className="text-xs text-gray-500">
                      {formatTimestamp(item.timestamp)}
                    </span>
                  </div>
                  {item.note && (
                    <p className="text-xs text-gray-500 mt-1">{item.note}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-4">
        <CardTitle className="text-lg">Order Timeline</CardTitle>
      </CardHeader>

      <CardContent>
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gray-200" />

          <div className="space-y-6">
            {sortedTimeline.map((item, index) => {
              const config = getStatusConfig(item.status);
              const Icon = config.icon;
              const isCompleted = isCompletedStatus(item.status, index);
              const isCurrent = isCurrentStatus(item.status);
              const isLast = index === sortedTimeline.length - 1;

              return (
                <div key={index} className="relative flex items-start gap-4">
                  {/* Timeline dot */}
                  <div
                    className={cn(
                      'relative z-10 flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center border-2',
                      isCompleted
                        ? `${config.bgColor} ${config.borderColor} ${config.color}`
                        : 'bg-gray-100 border-gray-200 text-gray-400',
                      isCurrent && 'ring-4 ring-blue-100 ring-offset-2'
                    )}
                  >
                    <Icon className="w-5 h-5" />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className={cn(
                        'font-medium',
                        isCompleted ? 'text-gray-900' : 'text-gray-500'
                      )}>
                        {config.label}
                      </h4>
                      <Badge
                        variant={isCurrent ? "default" : "outline"}
                        className="text-xs"
                      >
                        {formatTimestamp(item.timestamp)}
                      </Badge>
                    </div>

                    <p className={cn(
                      'text-sm mb-2',
                      isCompleted ? 'text-gray-600' : 'text-gray-400'
                    )}>
                      {config.description}
                    </p>

                    {item.note && (
                      <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 mb-2">
                        <p className="text-sm text-gray-700">{item.note}</p>
                      </div>
                    )}

                    {item.user && (
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <User className="w-3 h-3" />
                        <span>Updated by {item.user}</span>
                      </div>
                    )}

                    {!isLast && <Separator className="mt-4" />}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Future steps preview */}
          {currentStatus !== 'delivered' && currentStatus !== 'cancelled' && currentStatus !== 'failed' && (
            <div className="mt-6 pt-6 border-t border-gray-200">
              <h5 className="text-sm font-medium text-gray-600 mb-3">Next Steps</h5>
              <div className="space-y-2">
                {getNextSteps(currentStatus).map((step, index) => (
                  <div key={index} className="flex items-center gap-3 opacity-60">
                    <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                      <step.icon className="w-4 h-4 text-gray-400" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">{step.label}</p>
                      <p className="text-xs text-gray-500">{step.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

function getNextSteps(currentStatus: OrderStatus) {
  const allSteps = [
    { status: 'pending', icon: Clock, label: 'Pending', description: 'Waiting for confirmation' },
    { status: 'confirmed', icon: CheckCircle, label: 'Confirmed', description: 'Restaurant accepted' },
    { status: 'preparing', icon: ChefHat, label: 'Preparing', description: 'Kitchen preparation' },
    { status: 'ready', icon: Package, label: 'Ready', description: 'Ready for pickup' },
    { status: 'picked_up', icon: Truck, label: 'Out for Delivery', description: 'Driver assigned' },
    { status: 'delivered', icon: CheckCircle, label: 'Delivered', description: 'Successfully delivered' },
  ];

  const currentIndex = allSteps.findIndex(step => step.status === currentStatus);
  return allSteps.slice(currentIndex + 1);
}

export default OrderTimeline;