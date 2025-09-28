import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Filter,
  X,
  Search,
  Calendar,
  RefreshCw,
  Download,
  SlidersHorizontal
} from 'lucide-react';
import { OrderStatus, DeliveryProvider } from '@/types';
import { cn } from '@/lib/utils';
import { OrdersQueryParams } from '@/hooks/useOrders';

interface OrderFiltersProps {
  filters: OrdersQueryParams;
  onFiltersChange: (filters: OrdersQueryParams) => void;
  onExport?: (format: 'csv' | 'xlsx') => void;
  isLoading?: boolean;
  className?: string;
}

export const OrderFilters: React.FC<OrderFiltersProps> = ({
  filters,
  onFiltersChange,
  onExport,
  isLoading = false,
  className,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [searchInput, setSearchInput] = useState(filters.search || '');

  const statusOptions: { value: OrderStatus; label: string; color: string }[] = [
    { value: 'pending', label: 'Pending', color: 'bg-yellow-100 text-yellow-800' },
    { value: 'confirmed', label: 'Confirmed', color: 'bg-blue-100 text-blue-800' },
    { value: 'preparing', label: 'Preparing', color: 'bg-orange-100 text-orange-800' },
    { value: 'ready', label: 'Ready', color: 'bg-purple-100 text-purple-800' },
    { value: 'picked_up', label: 'Picked Up', color: 'bg-indigo-100 text-indigo-800' },
    { value: 'delivered', label: 'Delivered', color: 'bg-green-100 text-green-800' },
    { value: 'cancelled', label: 'Cancelled', color: 'bg-red-100 text-red-800' },
    { value: 'failed', label: 'Failed', color: 'bg-gray-100 text-gray-800' },
  ];

  const providerOptions: { value: DeliveryProvider; label: string; emoji: string }[] = [
    { value: 'careem', label: 'Careem', emoji: '🚗' },
    { value: 'talabat', label: 'Talabat', emoji: '🍔' },
    { value: 'deliveroo', label: 'Deliveroo', emoji: '🚴' },
    { value: 'uber_eats', label: 'Uber Eats', emoji: '🍕' },
    { value: 'jahez', label: 'Jahez', emoji: '🛵' },
    { value: 'hungerstation', label: 'HungerStation', emoji: '🍽️' },
    { value: 'noon_food', label: 'Noon Food', emoji: '🥘' },
    { value: 'mrsool', label: 'Mrsool', emoji: '📦' },
    { value: 'zomato', label: 'Zomato', emoji: '🍛' },
  ];

  const sortOptions = [
    { value: 'created_at', label: 'Created Date' },
    { value: 'updated_at', label: 'Last Updated' },
    { value: 'total', label: 'Order Value' },
  ];

  const handleStatusToggle = (status: OrderStatus) => {
    const currentStatuses = filters.status || [];
    const newStatuses = currentStatuses.includes(status)
      ? currentStatuses.filter(s => s !== status)
      : [...currentStatuses, status];

    onFiltersChange({
      ...filters,
      status: newStatuses.length > 0 ? newStatuses : undefined,
    });
  };

  const handleProviderToggle = (provider: DeliveryProvider) => {
    const currentProviders = filters.provider || [];
    const newProviders = currentProviders.includes(provider)
      ? currentProviders.filter(p => p !== provider)
      : [...currentProviders, provider];

    onFiltersChange({
      ...filters,
      provider: newProviders.length > 0 ? newProviders : undefined,
    });
  };

  const handleSearchSubmit = () => {
    onFiltersChange({
      ...filters,
      search: searchInput.trim() || undefined,
    });
  };

  const handleDateRangeChange = (dateRange: { from?: Date; to?: Date }) => {
    onFiltersChange({
      ...filters,
      date_from: dateRange.from?.toISOString(),
      date_to: dateRange.to?.toISOString(),
    });
  };

  const clearFilters = () => {
    setSearchInput('');
    onFiltersChange({
      page: 1,
      per_page: filters.per_page,
    });
  };

  const getActiveFilterCount = () => {
    let count = 0;
    if (filters.status?.length) count++;
    if (filters.provider?.length) count++;
    if (filters.search) count++;
    if (filters.date_from) count++;
    return count;
  };

  const activeFilterCount = getActiveFilterCount();

  return (
    <div className={cn('space-y-4', className)}>
      {/* Quick Search and Actions Bar */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex-1 min-w-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search orders, customer name, phone, or order ID..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearchSubmit()}
              className="pl-10"
            />
          </div>
        </div>

        <Button onClick={handleSearchSubmit} disabled={isLoading}>
          <Search className="h-4 w-4 mr-2" />
          Search
        </Button>

        <Button
          variant="outline"
          onClick={() => setIsExpanded(!isExpanded)}
          className="relative"
        >
          <SlidersHorizontal className="h-4 w-4 mr-2" />
          Filters
          {activeFilterCount > 0 && (
            <Badge variant="destructive" className="ml-2 h-5 w-5 rounded-full p-0 text-xs">
              {activeFilterCount}
            </Badge>
          )}
        </Button>

        {onExport && (
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-40">
              <div className="space-y-2">
                <Button
                  variant="ghost"
                  className="w-full justify-start"
                  onClick={() => onExport('csv')}
                >
                  Export as CSV
                </Button>
                <Button
                  variant="ghost"
                  className="w-full justify-start"
                  onClick={() => onExport('xlsx')}
                >
                  Export as Excel
                </Button>
              </div>
            </PopoverContent>
          </Popover>
        )}

        <Button
          variant="outline"
          onClick={() => window.location.reload()}
          disabled={isLoading}
        >
          <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
        </Button>
      </div>

      {/* Expanded Filters */}
      {isExpanded && (
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Advanced Filters</CardTitle>
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <X className="h-4 w-4 mr-2" />
                Clear All
              </Button>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Date Range */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Date Range</Label>
              <DateRangePicker
                onChange={handleDateRangeChange}
                value={{
                  from: filters.date_from ? new Date(filters.date_from) : undefined,
                  to: filters.date_to ? new Date(filters.date_to) : undefined,
                }}
              />
            </div>

            <Separator />

            {/* Status Filter */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Order Status</Label>
              <div className="flex flex-wrap gap-2">
                {statusOptions.map((option) => (
                  <Badge
                    key={option.value}
                    variant={filters.status?.includes(option.value) ? "default" : "outline"}
                    className={cn(
                      'cursor-pointer transition-all',
                      filters.status?.includes(option.value) ? option.color : 'hover:bg-gray-100'
                    )}
                    onClick={() => handleStatusToggle(option.value)}
                  >
                    {option.label}
                  </Badge>
                ))}
              </div>
            </div>

            <Separator />

            {/* Provider Filter */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Delivery Provider</Label>
              <div className="flex flex-wrap gap-2">
                {providerOptions.map((option) => (
                  <Badge
                    key={option.value}
                    variant={filters.provider?.includes(option.value) ? "default" : "outline"}
                    className="cursor-pointer transition-all hover:bg-gray-100"
                    onClick={() => handleProviderToggle(option.value)}
                  >
                    <span className="mr-1">{option.emoji}</span>
                    {option.label}
                  </Badge>
                ))}
              </div>
            </div>

            <Separator />

            {/* Sorting */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Sort By</Label>
                <Select
                  value={filters.sort_by || 'created_at'}
                  onValueChange={(value) =>
                    onFiltersChange({
                      ...filters,
                      sort_by: value as 'created_at' | 'updated_at' | 'total',
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {sortOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">Sort Order</Label>
                <Select
                  value={filters.sort_order || 'desc'}
                  onValueChange={(value) =>
                    onFiltersChange({
                      ...filters,
                      sort_order: value as 'asc' | 'desc',
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="desc">Newest First</SelectItem>
                    <SelectItem value="asc">Oldest First</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Active Filters Display */}
      {activeFilterCount > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm text-gray-600">Active filters:</span>

          {filters.status?.map((status) => (
            <Badge
              key={status}
              variant="secondary"
              className="cursor-pointer"
              onClick={() => handleStatusToggle(status)}
            >
              {statusOptions.find(s => s.value === status)?.label}
              <X className="h-3 w-3 ml-1" />
            </Badge>
          ))}

          {filters.provider?.map((provider) => (
            <Badge
              key={provider}
              variant="secondary"
              className="cursor-pointer"
              onClick={() => handleProviderToggle(provider)}
            >
              {providerOptions.find(p => p.value === provider)?.emoji}
              {providerOptions.find(p => p.value === provider)?.label}
              <X className="h-3 w-3 ml-1" />
            </Badge>
          ))}

          {filters.search && (
            <Badge
              variant="secondary"
              className="cursor-pointer"
              onClick={() => {
                setSearchInput('');
                onFiltersChange({ ...filters, search: undefined });
              }}
            >
              Search: {filters.search}
              <X className="h-3 w-3 ml-1" />
            </Badge>
          )}

          {filters.date_from && (
            <Badge
              variant="secondary"
              className="cursor-pointer"
              onClick={() =>
                onFiltersChange({
                  ...filters,
                  date_from: undefined,
                  date_to: undefined,
                })
              }
            >
              <Calendar className="h-3 w-3 mr-1" />
              Date Range
              <X className="h-3 w-3 ml-1" />
            </Badge>
          )}
        </div>
      )}
    </div>
  );
};

export default OrderFilters;