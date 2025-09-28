import React, { useState, useMemo } from 'react';
import {
  WifiIcon,
  CheckIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import {
  CheckCircleIcon as CheckCircleIconSolid
} from '@heroicons/react/24/solid';

interface MenuChannel {
  id: string;
  name: string;
  nameAr?: string;
  type: 'delivery' | 'pickup' | 'dine_in' | 'call_center' | 'pos';
  isActive: boolean;
  description?: string;
}

interface MenuChannelSelectorProps {
  channels: MenuChannel[];
  selectedChannels: string[];
  onChannelToggle: (channelId: string) => void;
  onSelectAll: () => void;
  onClearAll: () => void;
  loading?: boolean;
  className?: string;
  multiSelect?: boolean;
}

const channelTypeConfig = {
  delivery: {
    label: 'Delivery',
    labelAr: 'توصيل',
    color: 'bg-blue-100 text-blue-800',
    icon: '🚚'
  },
  pickup: {
    label: 'Pickup',
    labelAr: 'استلام',
    color: 'bg-green-100 text-green-800',
    icon: '🛍️'
  },
  dine_in: {
    label: 'Dine-in',
    labelAr: 'تناول في المطعم',
    color: 'bg-purple-100 text-purple-800',
    icon: '🍽️'
  },
  call_center: {
    label: 'Call Center',
    labelAr: 'مركز الاتصال',
    color: 'bg-orange-100 text-orange-800',
    icon: '📞'
  },
  pos: {
    label: 'POS System',
    labelAr: 'نظام نقاط البيع',
    color: 'bg-gray-100 text-gray-800',
    icon: '💳'
  }
};

export const MenuChannelSelector: React.FC<MenuChannelSelectorProps> = ({
  channels,
  selectedChannels,
  onChannelToggle,
  onSelectAll,
  onClearAll,
  loading = false,
  className = '',
  multiSelect = true
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterByType, setFilterByType] = useState<string>('all');
  const [showActiveOnly, setShowActiveOnly] = useState(false);

  // Filter channels based on search and filters
  const filteredChannels = useMemo(() => {
    return channels.filter(channel => {
      const matchesSearch = searchQuery === '' ||
        channel.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (channel.nameAr && channel.nameAr.includes(searchQuery)) ||
        (channel.description && channel.description.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesType = filterByType === 'all' || channel.type === filterByType;
      const matchesActiveFilter = !showActiveOnly || channel.isActive;

      return matchesSearch && matchesType && matchesActiveFilter;
    });
  }, [channels, searchQuery, filterByType, showActiveOnly]);

  // Selection statistics
  const selectionStats = useMemo(() => {
    const totalChannels = channels.length;
    const activeChannels = channels.filter(c => c.isActive).length;
    const selectedCount = selectedChannels.length;
    const selectedActive = channels
      .filter(c => selectedChannels.includes(c.id) && c.isActive)
      .length;

    return {
      totalChannels,
      activeChannels,
      selectedCount,
      selectedActive,
      isAllSelected: selectedCount === totalChannels,
      isAllActiveSelected: selectedActive === activeChannels && activeChannels > 0
    };
  }, [channels, selectedChannels]);

  // Generate selected channel names for display
  const selectedChannelNames = useMemo(() => {
    const names = channels
      .filter(c => selectedChannels.includes(c.id))
      .map(c => c.name);

    if (names.length === 0) return 'No channels selected';
    if (names.length <= 2) return names.join(', ');
    return `${names.slice(0, 2).join(', ')} and ${names.length - 2} more`;
  }, [channels, selectedChannels]);

  // Handle channel selection
  const handleChannelToggle = (channelId: string) => {
    if (!multiSelect) {
      // Single select mode - clear others and select this one
      onChannelToggle(channelId);
    } else {
      // Multi select mode
      onChannelToggle(channelId);
    }
  };

  // Get unique channel types for filter
  const channelTypes = useMemo(() => {
    const types = [...new Set(channels.map(c => c.type))];
    return types.map(type => ({
      value: type,
      label: channelTypeConfig[type]?.label || type,
      count: channels.filter(c => c.type === type).length
    }));
  }, [channels]);

  return (
    <div className={`bg-white border border-gray-200 rounded-lg ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <WifiIcon className="w-5 h-5 text-gray-600" />
            <h3 className="text-sm font-medium text-gray-900">
              {multiSelect ? 'Select Channels' : 'Select Channel'}
            </h3>
          </div>
          <div className="text-xs text-gray-500">
            {selectionStats.selectedCount}/{selectionStats.totalChannels}
          </div>
        </div>

        {/* Quick Actions - Only show for multi-select */}
        {multiSelect && (
          <div className="flex space-x-2 mb-3">
            <button
              onClick={onSelectAll}
              disabled={loading || selectionStats.isAllSelected}
              className="flex-1 text-xs text-blue-600 hover:text-blue-800 font-medium py-1.5 px-2 border border-blue-200 rounded hover:bg-blue-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {selectionStats.isAllSelected ? 'All Selected' : 'Select All'}
            </button>
            <button
              onClick={onClearAll}
              disabled={loading || selectionStats.selectedCount === 0}
              className="flex-1 text-xs text-gray-600 hover:text-gray-800 font-medium py-1.5 px-2 border border-gray-200 rounded hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Clear All
            </button>
          </div>
        )}

        {/* Search Filter */}
        <div className="mb-3">
          <input
            type="text"
            placeholder="Search channels..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Filters */}
        <div className="grid grid-cols-2 gap-3 mb-3">
          {/* Type Filter */}
          <div>
            <select
              value={filterByType}
              onChange={(e) => setFilterByType(e.target.value)}
              className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Types</option>
              {channelTypes.map(type => (
                <option key={type.value} value={type.value}>
                  {type.label} ({type.count})
                </option>
              ))}
            </select>
          </div>

          {/* Active Only Filter */}
          <div className="flex items-center">
            <label className="flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={showActiveOnly}
                onChange={(e) => setShowActiveOnly(e.target.checked)}
                className="h-3 w-3 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <span className="ml-1.5 text-xs text-gray-600">Active only</span>
            </label>
          </div>
        </div>

        {/* Selection Summary */}
        {selectionStats.selectedCount > 0 && multiSelect && (
          <div className="mt-3 p-2 bg-blue-50 rounded border border-blue-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-blue-800">
                  {selectionStats.selectedCount} channel{selectionStats.selectedCount !== 1 ? 's' : ''} selected
                </p>
                <p className="text-xs text-blue-600 mt-0.5 truncate" title={selectedChannelNames}>
                  {selectedChannelNames}
                </p>
              </div>
              <button
                onClick={onClearAll}
                className="p-1 text-blue-600 hover:text-blue-800 rounded-full hover:bg-blue-100"
                title="Clear selection"
              >
                <XMarkIcon className="w-3 h-3" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Channel List */}
      <div className="max-h-64 overflow-y-auto">
        {loading ? (
          <div className="p-4 text-center">
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
              <span className="ml-2 text-xs text-gray-500">Loading channels...</span>
            </div>
          </div>
        ) : filteredChannels.length === 0 ? (
          <div className="p-4 text-center">
            <WifiIcon className="w-8 h-8 text-gray-300 mx-auto mb-2" />
            <p className="text-xs text-gray-500">
              {searchQuery || filterByType !== 'all' ? 'No channels match your filters' : 'No channels available'}
            </p>
            {(searchQuery || filterByType !== 'all') && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setFilterByType('all');
                }}
                className="mt-1 text-xs text-blue-600 hover:text-blue-800"
              >
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <div className="p-3">
            <div className="space-y-2">
              {filteredChannels.map((channel) => {
                const isSelected = selectedChannels.includes(channel.id);
                const typeConfig = channelTypeConfig[channel.type];

                return (
                  <div
                    key={channel.id}
                    className={`relative group rounded border transition-all cursor-pointer ${
                      isSelected
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                    onClick={() => handleChannelToggle(channel.id)}
                  >
                    <div className="p-3">
                      <div className="flex items-center space-x-2">
                        {/* Custom Checkbox/Radio */}
                        {multiSelect ? (
                          <div className={`flex-shrink-0 w-4 h-4 rounded border transition-all ${
                            isSelected
                              ? 'border-blue-500 bg-blue-500'
                              : 'border-gray-300 bg-white group-hover:border-blue-400'
                          }`}>
                            {isSelected && (
                              <CheckIcon className="w-2.5 h-2.5 text-white m-0.5" />
                            )}
                          </div>
                        ) : (
                          <div className={`flex-shrink-0 w-4 h-4 rounded-full border transition-all ${
                            isSelected
                              ? 'border-blue-500 bg-blue-500'
                              : 'border-gray-300 bg-white group-hover:border-blue-400'
                          }`}>
                            {isSelected && (
                              <div className="w-1.5 h-1.5 bg-white rounded-full m-1"></div>
                            )}
                          </div>
                        )}

                        {/* Channel Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-1.5">
                              <span className="text-sm">{typeConfig?.icon}</span>
                              <p className={`text-sm font-medium truncate ${
                                isSelected ? 'text-blue-900' : 'text-gray-900'
                              }`}>
                                {channel.name}
                              </p>
                            </div>

                            <div className="flex items-center space-x-1">
                              {/* Type Badge */}
                              <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${
                                isSelected
                                  ? 'bg-blue-100 text-blue-800'
                                  : typeConfig?.color || 'bg-gray-100 text-gray-800'
                              }`}>
                                {typeConfig?.label || channel.type}
                              </span>

                              {/* Status Badge */}
                              <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${
                                channel.isActive
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-gray-100 text-gray-600'
                              }`}>
                                <span className={`w-1.5 h-1.5 rounded-full mr-1 ${
                                  channel.isActive ? 'bg-green-400' : 'bg-gray-400'
                                }`}></span>
                                {channel.isActive ? 'Active' : 'Inactive'}
                              </span>
                            </div>
                          </div>

                          {/* Description or Arabic Name */}
                          {(channel.description || channel.nameAr) && (
                            <p className={`text-xs mt-0.5 truncate ${
                              isSelected ? 'text-blue-600' : 'text-gray-500'
                            }`} dir={channel.nameAr ? "rtl" : "ltr"}>
                              {channel.description || channel.nameAr}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Selection Indicator */}
                    {isSelected && (
                      <div className="absolute top-1 right-1">
                        <CheckCircleIconSolid className="w-3 h-3 text-blue-500" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Footer Stats */}
      <div className="p-3 border-t border-gray-200 bg-gray-50">
        <div className="grid grid-cols-3 gap-2 text-center">
          <div>
            <p className="text-sm font-semibold text-gray-900">{selectionStats.totalChannels}</p>
            <p className="text-xs text-gray-500">Total</p>
          </div>
          <div>
            <p className="text-sm font-semibold text-green-600">{selectionStats.activeChannels}</p>
            <p className="text-xs text-gray-500">Active</p>
          </div>
          <div>
            <p className="text-sm font-semibold text-blue-600">{selectionStats.selectedCount}</p>
            <p className="text-xs text-gray-500">Selected</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MenuChannelSelector;