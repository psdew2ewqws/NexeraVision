import React, { useState } from 'react';
import { UseFormReturn, Controller } from 'react-hook-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Search, Zap, Package, Truck, Bell, AlertTriangle, CheckCircle2, X } from 'lucide-react';

import { WebhookEventType } from '@/types/webhook';

interface WebhookEventSelectorProps {
  form: UseFormReturn<any>;
}

interface EventCategory {
  name: string;
  icon: React.ReactNode;
  description: string;
  events: WebhookEventType[];
  color: string;
}

const EVENT_CATEGORIES: EventCategory[] = [
  {
    name: 'Order Events',
    icon: <Package className="w-4 h-4" />,
    description: 'Events related to order lifecycle management',
    color: 'bg-blue-100 text-blue-800',
    events: [
      WebhookEventType.ORDER_CREATED,
      WebhookEventType.ORDER_UPDATED,
      WebhookEventType.ORDER_CONFIRMED,
      WebhookEventType.ORDER_PREPARED,
      WebhookEventType.ORDER_PICKED_UP,
      WebhookEventType.ORDER_DELIVERED,
      WebhookEventType.ORDER_CANCELLED,
    ]
  },
  {
    name: 'Menu Events',
    icon: <Bell className="w-4 h-4" />,
    description: 'Events for menu and item availability changes',
    color: 'bg-green-100 text-green-800',
    events: [
      WebhookEventType.MENU_UPDATED,
      WebhookEventType.ITEM_AVAILABILITY_CHANGED,
    ]
  },
  {
    name: 'System Events',
    icon: <AlertTriangle className="w-4 h-4" />,
    description: 'System-level events and alerts',
    color: 'bg-orange-100 text-orange-800',
    events: [
      WebhookEventType.CONNECTION_TEST,
      WebhookEventType.SYSTEM_ALERT,
    ]
  },
  {
    name: 'Provider-Specific Events',
    icon: <Truck className="w-4 h-4" />,
    description: 'Events specific to delivery platform providers',
    color: 'bg-purple-100 text-purple-800',
    events: [
      WebhookEventType.CAREEM_ORDER_NOTIFICATION,
      WebhookEventType.TALABAT_STATUS_UPDATE,
      WebhookEventType.DELIVEROO_ORDER_EVENT,
      WebhookEventType.JAHEZ_ORDER_ACTION,
    ]
  },
];

const EVENT_DESCRIPTIONS: Record<WebhookEventType, string> = {
  [WebhookEventType.ORDER_CREATED]: 'Triggered when a new order is created by a customer',
  [WebhookEventType.ORDER_UPDATED]: 'Triggered when order details are modified',
  [WebhookEventType.ORDER_CONFIRMED]: 'Triggered when the restaurant confirms the order',
  [WebhookEventType.ORDER_PREPARED]: 'Triggered when the order is ready for pickup',
  [WebhookEventType.ORDER_PICKED_UP]: 'Triggered when the delivery driver picks up the order',
  [WebhookEventType.ORDER_DELIVERED]: 'Triggered when the order is delivered to the customer',
  [WebhookEventType.ORDER_CANCELLED]: 'Triggered when an order is cancelled',
  [WebhookEventType.MENU_UPDATED]: 'Triggered when menu items or categories are updated',
  [WebhookEventType.ITEM_AVAILABILITY_CHANGED]: 'Triggered when item availability status changes',
  [WebhookEventType.CONNECTION_TEST]: 'Test event to verify webhook connectivity',
  [WebhookEventType.SYSTEM_ALERT]: 'Triggered for system-level alerts and notifications',
  [WebhookEventType.CAREEM_ORDER_NOTIFICATION]: 'Careem-specific order notification events',
  [WebhookEventType.TALABAT_STATUS_UPDATE]: 'Talabat-specific order status updates',
  [WebhookEventType.DELIVEROO_ORDER_EVENT]: 'Deliveroo-specific order lifecycle events',
  [WebhookEventType.JAHEZ_ORDER_ACTION]: 'Jahez-specific order action events',
};

const CRITICAL_EVENTS = [
  WebhookEventType.ORDER_CREATED,
  WebhookEventType.ORDER_CANCELLED,
  WebhookEventType.SYSTEM_ALERT,
];

const WebhookEventSelector: React.FC<WebhookEventSelectorProps> = ({ form }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const selectedEvents = form.watch('events') || [];

  const handleEventToggle = (eventType: WebhookEventType, checked: boolean) => {
    const currentEvents = form.getValues('events') || [];

    if (checked) {
      form.setValue('events', [...currentEvents, eventType]);
    } else {
      form.setValue('events', currentEvents.filter((e: WebhookEventType) => e !== eventType));
    }
  };

  const handleCategoryToggle = (category: EventCategory, checked: boolean) => {
    const currentEvents = form.getValues('events') || [];

    if (checked) {
      // Add all events from this category
      const newEvents = [...new Set([...currentEvents, ...category.events])];
      form.setValue('events', newEvents);
    } else {
      // Remove all events from this category
      const filteredEvents = currentEvents.filter((e: WebhookEventType) => !category.events.includes(e));
      form.setValue('events', filteredEvents);
    }
  };

  const selectAllEvents = () => {
    form.setValue('events', Object.values(WebhookEventType));
  };

  const selectCriticalEvents = () => {
    form.setValue('events', CRITICAL_EVENTS);
  };

  const clearAllEvents = () => {
    form.setValue('events', []);
  };

  const filteredCategories = EVENT_CATEGORIES.map(category => ({
    ...category,
    events: category.events.filter(event =>
      event.toLowerCase().includes(searchTerm.toLowerCase()) ||
      EVENT_DESCRIPTIONS[event].toLowerCase().includes(searchTerm.toLowerCase())
    )
  })).filter(category =>
    selectedCategory ? category.name === selectedCategory : true
  ).filter(category =>
    category.events.length > 0
  );

  const isCategoryFullySelected = (category: EventCategory) => {
    return category.events.every(event => selectedEvents.includes(event));
  };

  const isCategoryPartiallySelected = (category: EventCategory) => {
    return category.events.some(event => selectedEvents.includes(event)) && !isCategoryFullySelected(category);
  };

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="space-y-1">
          <h3 className="text-lg font-medium">Event Selection</h3>
          <p className="text-sm text-muted-foreground">
            Choose which events should trigger your webhook endpoint
          </p>
        </div>

        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={selectCriticalEvents}
          >
            Critical Only
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={selectAllEvents}
          >
            Select All
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={clearAllEvents}
          >
            Clear All
          </Button>
        </div>
      </div>

      {/* Selection Summary */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-4">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-blue-600" />
            <span className="text-sm font-medium text-blue-900">
              {selectedEvents.length} event{selectedEvents.length !== 1 ? 's' : ''} selected
            </span>
          </div>
          {selectedEvents.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {selectedEvents.slice(0, 5).map((event: WebhookEventType) => (
                <Badge key={event} variant="secondary" className="text-xs">
                  {event}
                </Badge>
              ))}
              {selectedEvents.length > 5 && (
                <Badge variant="secondary" className="text-xs">
                  +{selectedEvents.length - 5} more
                </Badge>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Search and Filter */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search events by name or description..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="flex gap-2 flex-wrap">
          <Button
            type="button"
            variant={selectedCategory === null ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedCategory(null)}
          >
            All Categories
          </Button>
          {EVENT_CATEGORIES.map((category) => (
            <Button
              key={category.name}
              type="button"
              variant={selectedCategory === category.name ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedCategory(
                selectedCategory === category.name ? null : category.name
              )}
              className="flex items-center gap-1"
            >
              {category.icon}
              {category.name}
            </Button>
          ))}
        </div>
      </div>

      {/* Event Categories */}
      <ScrollArea className="h-[400px]">
        <div className="space-y-4">
          {filteredCategories.map((category) => (
            <Card key={category.name}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        checked={isCategoryFullySelected(category)}
                        onCheckedChange={(checked) => handleCategoryToggle(category, checked as boolean)}
                        ref={(el) => {
                          if (el && isCategoryPartiallySelected(category)) {
                            el.indeterminate = true;
                          }
                        }}
                      />
                      <CardTitle className="flex items-center gap-2 text-base">
                        {category.icon}
                        {category.name}
                      </CardTitle>
                    </div>
                    <Badge className={category.color}>
                      {category.events.length} events
                    </Badge>
                  </div>
                </div>
                <CardDescription>{category.description}</CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-3">
                  {category.events.map((eventType) => (
                    <div
                      key={eventType}
                      className="flex items-start gap-3 p-3 rounded-lg border hover:bg-gray-50 transition-colors"
                    >
                      <Checkbox
                        checked={selectedEvents.includes(eventType)}
                        onCheckedChange={(checked) => handleEventToggle(eventType, checked as boolean)}
                        className="mt-0.5"
                      />
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <Label className="text-sm font-medium cursor-pointer">
                            {eventType}
                          </Label>
                          {CRITICAL_EVENTS.includes(eventType) && (
                            <Badge variant="destructive" className="text-xs">
                              Critical
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {EVENT_DESCRIPTIONS[eventType]}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </ScrollArea>

      {/* Validation Message */}
      {form.formState.errors.events && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
          <AlertTriangle className="w-4 h-4 text-red-600" />
          <span className="text-sm text-red-800">
            {form.formState.errors.events.message}
          </span>
        </div>
      )}

      {/* Recommendations */}
      {selectedEvents.length === 0 && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="pt-4">
            <div className="flex items-start gap-3">
              <Zap className="w-5 h-5 text-yellow-600 mt-0.5" />
              <div className="space-y-2">
                <h4 className="font-medium text-yellow-900">Recommended Events</h4>
                <p className="text-sm text-yellow-800">
                  For a typical restaurant integration, we recommend starting with these critical events:
                </p>
                <div className="flex flex-wrap gap-1 mt-2">
                  {CRITICAL_EVENTS.map((event) => (
                    <Badge key={event} variant="outline" className="text-xs border-yellow-300">
                      {event}
                    </Badge>
                  ))}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={selectCriticalEvents}
                  className="mt-2 border-yellow-300 text-yellow-800 hover:bg-yellow-100"
                >
                  Select Recommended Events
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default WebhookEventSelector;