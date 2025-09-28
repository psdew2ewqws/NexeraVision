import React from 'react';
import { Order, DeliveryProvider } from '@/types';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { OrderStatusBadge } from './OrderStatusBadge';
import {
  Clock,
  MapPin,
  Phone,
  User,
  DollarSign,
  Package,
  ExternalLink,
  MoreVertical
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

interface OrderCardProps {
  order: Order;
  onClick?: (order: Order) => void;
  showActions?: boolean;
  onStatusChange?: (orderId: string, status: string) => void;
  onViewDetails?: (orderId: string) => void;
  className?: string;
}

export const OrderCard: React.FC<OrderCardProps> = ({
  order,
  onClick,
  showActions = true,
  onStatusChange,
  onViewDetails,
  className,
}) => {
  const getProviderConfig = (provider: DeliveryProvider) => {
    const configs = {
      careem: { name: 'Careem', color: 'bg-green-600', logo: '🚗' },
      talabat: { name: 'Talabat', color: 'bg-orange-600', logo: '🍔' },
      deliveroo: { name: 'Deliveroo', color: 'bg-teal-600', logo: '🚴' },
      uber_eats: { name: 'Uber Eats', color: 'bg-black', logo: '🍕' },
      jahez: { name: 'Jahez', color: 'bg-red-600', logo: '🛵' },
      hungerstation: { name: 'HungerStation', color: 'bg-purple-600', logo: '🍽️' },
      noon_food: { name: 'Noon Food', color: 'bg-blue-600', logo: '🥘' },
      mrsool: { name: 'Mrsool', color: 'bg-indigo-600', logo: '📦' },
      zomato: { name: 'Zomato', color: 'bg-red-500', logo: '🍛' },
    };

    return configs[provider] || { name: provider, color: 'bg-gray-600', logo: '🍕' };
  };

  const providerConfig = getProviderConfig(order.provider);
  const timeAgo = formatDistanceToNow(new Date(order.created_at), { addSuffix: true });

  const handleCardClick = () => {
    if (onClick) {
      onClick(order);
    } else if (onViewDetails) {
      onViewDetails(order.id);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-AE', {
      style: 'currency',
      currency: 'AED',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  return (
    <Card
      className={cn(
        'transition-all duration-200 hover:shadow-md border border-gray-200',
        onClick && 'cursor-pointer hover:border-blue-300',
        className
      )}
      onClick={handleCardClick}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={cn('p-2 rounded-lg text-white text-lg', providerConfig.color)}>
              {providerConfig.logo}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-gray-900">#{order.external_id}</h3>
                <Badge variant="outline" className="text-xs">
                  {providerConfig.name}
                </Badge>
              </div>
              <p className="text-sm text-gray-500 flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {timeAgo}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <OrderStatusBadge status={order.status} size="sm" />
            {showActions && (
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <MoreVertical className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        <div className="space-y-3">
          {/* Customer Info */}
          <div className="flex items-start gap-3">
            <User className="h-4 w-4 text-gray-400 mt-0.5" />
            <div className="min-w-0 flex-1">
              <p className="font-medium text-gray-900">{order.customer.name}</p>
              <p className="text-sm text-gray-500 flex items-center gap-1">
                <Phone className="h-3 w-3" />
                {order.customer.phone}
              </p>
            </div>
          </div>

          {/* Delivery Address */}
          <div className="flex items-start gap-3">
            <MapPin className="h-4 w-4 text-gray-400 mt-0.5" />
            <div className="min-w-0 flex-1">
              <p className="text-sm text-gray-700 line-clamp-2">
                {order.customer.address.street}, {order.customer.address.area}
              </p>
              {order.customer.address.notes && (
                <p className="text-xs text-gray-500 mt-1">
                  Note: {order.customer.address.notes}
                </p>
              )}
            </div>
          </div>

          <Separator />

          {/* Order Items */}
          <div className="flex items-start gap-3">
            <Package className="h-4 w-4 text-gray-400 mt-0.5" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-gray-900">
                {order.items.length} item{order.items.length !== 1 ? 's' : ''}
              </p>
              <div className="text-sm text-gray-600 space-y-1">
                {order.items.slice(0, 2).map((item, index) => (
                  <div key={index} className="flex justify-between">
                    <span className="truncate">
                      {item.quantity}x {item.name}
                    </span>
                    <span className="font-medium ml-2">
                      {formatCurrency(item.price * item.quantity)}
                    </span>
                  </div>
                ))}
                {order.items.length > 2 && (
                  <p className="text-xs text-gray-500">
                    +{order.items.length - 2} more items
                  </p>
                )}
              </div>
            </div>
          </div>

          <Separator />

          {/* Order Total */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-gray-400" />
              <span className="text-sm text-gray-600">Total</span>
            </div>
            <span className="text-lg font-bold text-gray-900">
              {formatCurrency(order.totals.total)}
            </span>
          </div>

          {/* Delivery Info */}
          {order.delivery_info.type === 'delivery' && order.delivery_info.scheduled_time && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-xs font-medium text-blue-900">
                Scheduled Delivery
              </p>
              <p className="text-sm text-blue-700">
                {new Date(order.delivery_info.scheduled_time).toLocaleString()}
              </p>
            </div>
          )}

          {/* Special Instructions */}
          {order.items.some(item => item.special_instructions) && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <p className="text-xs font-medium text-yellow-900 mb-1">
                Special Instructions
              </p>
              {order.items
                .filter(item => item.special_instructions)
                .map((item, index) => (
                  <p key={index} className="text-sm text-yellow-800">
                    {item.name}: {item.special_instructions}
                  </p>
                ))}
            </div>
          )}

          {/* Quick Actions */}
          {showActions && (
            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={(e) => {
                  e.stopPropagation();
                  if (onViewDetails) onViewDetails(order.id);
                }}
              >
                <ExternalLink className="h-3 w-3 mr-1" />
                View Details
              </Button>

              {order.status === 'pending' && (
                <Button
                  size="sm"
                  className="flex-1"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onStatusChange) onStatusChange(order.id, 'confirmed');
                  }}
                >
                  Confirm
                </Button>
              )}

              {order.status === 'confirmed' && (
                <Button
                  size="sm"
                  className="flex-1"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onStatusChange) onStatusChange(order.id, 'preparing');
                  }}
                >
                  Start Preparing
                </Button>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default OrderCard;