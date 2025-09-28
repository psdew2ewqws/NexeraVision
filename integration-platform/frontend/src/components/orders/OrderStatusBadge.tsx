import React from 'react';
import { OrderStatus } from '@/types';
import { cn } from '@/lib/utils';

interface OrderStatusBadgeProps {
  status: OrderStatus;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
}

export const OrderStatusBadge: React.FC<OrderStatusBadgeProps> = ({
  status,
  className,
  size = 'md',
  showIcon = true,
}) => {
  const getStatusConfig = (status: OrderStatus) => {
    const configs = {
      pending: {
        label: 'Pending',
        color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
        icon: '⏳',
        pulse: true,
      },
      confirmed: {
        label: 'Confirmed',
        color: 'bg-blue-100 text-blue-800 border-blue-200',
        icon: '✅',
        pulse: false,
      },
      preparing: {
        label: 'Preparing',
        color: 'bg-orange-100 text-orange-800 border-orange-200',
        icon: '👨‍🍳',
        pulse: true,
      },
      ready: {
        label: 'Ready',
        color: 'bg-purple-100 text-purple-800 border-purple-200',
        icon: '🍽️',
        pulse: true,
      },
      picked_up: {
        label: 'Picked Up',
        color: 'bg-indigo-100 text-indigo-800 border-indigo-200',
        icon: '🚗',
        pulse: false,
      },
      delivered: {
        label: 'Delivered',
        color: 'bg-green-100 text-green-800 border-green-200',
        icon: '✅',
        pulse: false,
      },
      cancelled: {
        label: 'Cancelled',
        color: 'bg-red-100 text-red-800 border-red-200',
        icon: '❌',
        pulse: false,
      },
      failed: {
        label: 'Failed',
        color: 'bg-gray-100 text-gray-800 border-gray-200',
        icon: '💥',
        pulse: false,
      },
    };

    return configs[status] || configs.pending;
  };

  const config = getStatusConfig(status);

  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1 text-sm',
    lg: 'px-4 py-2 text-base',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 font-medium rounded-full border',
        config.color,
        sizeClasses[size],
        config.pulse && 'animate-pulse',
        className
      )}
    >
      {showIcon && (
        <span className="flex-shrink-0" role="img" aria-label={config.label}>
          {config.icon}
        </span>
      )}
      <span>{config.label}</span>
    </span>
  );
};

export default OrderStatusBadge;