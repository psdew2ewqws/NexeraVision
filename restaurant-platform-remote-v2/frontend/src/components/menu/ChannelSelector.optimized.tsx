import React, { useState, useCallback, useMemo, memo } from 'react';
import { ChevronDownIcon, CheckIcon, WifiIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { LocalizedString, getChannelDisplayName } from '../../types/localization';
import { useQuery } from '@tanstack/react-query';

interface Channel {
  id: string;
  name: LocalizedString;
  displayName: {
    en: string;
    ar?: string;
  };
  platformType: string;
  isActive: boolean;
  configuration?: any;
}

interface ChannelSelectorProps {
  selectedChannelIds: string[];
  onChannelChange: (channelIds: string[]) => void;
  placeholder?: string;
  className?: string;
  required?: boolean;
  disabled?: boolean;
  allowMultiple?: boolean;
}

// Memoized channel item component
const ChannelItem = memo<{
  channel: Channel;
  isSelected: boolean;
  onToggle: (id: string) => void;
  language: 'en' | 'ar';
  allowMultiple: boolean;
  typeBadge: { label: string; color: string };
}>(({ channel, isSelected, onToggle, language, allowMultiple, typeBadge }) => (
  <button
    type="button"
    onClick={() => onToggle(channel.id)}
    className="w-full text-left px-3 py-2 hover:bg-gray-100 flex items-center justify-between"
  >
    <div className="flex-1 min-w-0">
      <div className="flex items-center space-x-2">
        <span className={`block font-medium ${isSelected ? 'text-blue-600' : 'text-gray-900'}`}>
          {getChannelDisplayName(channel, language)}
        </span>
        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${typeBadge.color}`}>
          {typeBadge.label}
        </span>
      </div>
    </div>
    {allowMultiple ? (
      <div className={`
        flex-shrink-0 w-4 h-4 border border-gray-300 rounded flex items-center justify-center ml-2
        ${isSelected ? 'bg-blue-600 border-blue-600' : 'bg-white'}
      `}>
        {isSelected && <CheckIcon className="w-3 h-3 text-white" />}
      </div>
    ) : (
      isSelected && (
        <CheckIcon className="w-4 h-4 text-blue-600 ml-2" />
      )
    )}
  </button>
), (prev, next) => (
  prev.channel.id === next.channel.id &&
  prev.isSelected === next.isSelected &&
  prev.language === next.language &&
  prev.allowMultiple === next.allowMultiple
));

ChannelItem.displayName = 'ChannelItem';

// Static channel data fetch function
const fetchChannels = async (signal?: AbortSignal): Promise<Channel[]> => {
  // Using static data for now - can be replaced with API call
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve([
        {
          id: 'careem',
          name: 'careem',
          displayName: { en: 'Careem', ar: 'كريم' },
          platformType: 'delivery',
          isActive: true,
          configuration: {}
        },
        {
          id: 'talabat',
          name: 'talabat',
          displayName: { en: 'Talabat', ar: 'طلبات' },
          platformType: 'delivery',
          isActive: true,
          configuration: {}
        },
        {
          id: 'callcenter',
          name: 'callcenter',
          displayName: { en: 'Call Center', ar: 'مركز الاتصال' },
          platformType: 'internal',
          isActive: true,
          configuration: {}
        },
        {
          id: 'mobile',
          name: 'mobile',
          displayName: { en: 'Mobile App', ar: 'تطبيق الجوال' },
          platformType: 'internal',
          isActive: true,
          configuration: {}
        },
        {
          id: 'online',
          name: 'online',
          displayName: { en: 'Online Ordering', ar: 'الطلب الإلكتروني' },
          platformType: 'internal',
          isActive: true,
          configuration: {}
        }
      ]);
    }, 100);
  });
};

export const ChannelSelector = memo<ChannelSelectorProps>(({
  selectedChannelIds,
  onChannelChange,
  placeholder = "Select channels",
  className = "",
  required = false,
  disabled = false,
  allowMultiple = true
}) => {
  const { user } = useAuth();
  const { language } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);

  const userId = user?.id;

  // React Query for channels with automatic caching
  const {
    data: channels = [],
    isLoading: loading,
    error
  } = useQuery({
    queryKey: ['channels', userId],
    queryFn: ({ signal }) => fetchChannels(signal),
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
  });

  // Memoized active channels
  const activeChannels = useMemo(
    () => channels.filter(channel => channel.isActive),
    [channels]
  );

  // Memoized selection state
  const allSelected = useMemo(
    () => allowMultiple && activeChannels.length > 0 && activeChannels.every(channel => selectedChannelIds.includes(channel.id)),
    [allowMultiple, activeChannels, selectedChannelIds]
  );

  const someSelected = selectedChannelIds.length > 0;

  // Get channel type badge color - memoized function
  const getChannelTypeBadge = useCallback((platformType: string) => {
    const types: Record<string, { label: string; color: string }> = {
      'delivery': { label: 'Delivery', color: 'bg-blue-100 text-blue-800' },
      'pickup': { label: 'Pickup', color: 'bg-green-100 text-green-800' },
      'dine_in': { label: 'Dine-in', color: 'bg-purple-100 text-purple-800' },
      'call_center': { label: 'Call Center', color: 'bg-orange-100 text-orange-800' },
      'pos': { label: 'POS', color: 'bg-gray-100 text-gray-800' },
      'internal': { label: 'Internal', color: 'bg-gray-100 text-gray-800' }
    };

    return types[platformType] || { label: platformType, color: 'bg-gray-100 text-gray-800' };
  }, []);

  // Handle channel selection
  const handleChannelToggle = useCallback((channelId: string) => {
    if (disabled) return;

    if (!allowMultiple) {
      // Single selection mode
      onChannelChange([channelId]);
      setIsOpen(false);
      return;
    }

    // Multiple selection mode
    const isSelected = selectedChannelIds.includes(channelId);
    const newSelection = isSelected
      ? selectedChannelIds.filter(id => id !== channelId)
      : [...selectedChannelIds, channelId];

    onChannelChange(newSelection);
  }, [disabled, allowMultiple, selectedChannelIds, onChannelChange]);

  // Handle select all (only for multiple selection)
  const handleSelectAll = useCallback(() => {
    if (disabled || !allowMultiple) return;

    const allChannelIds = activeChannels.map(channel => channel.id);
    onChannelChange(allSelected ? [] : allChannelIds);
  }, [disabled, allowMultiple, activeChannels, allSelected, onChannelChange]);

  // Get display text - memoized
  const displayText = useMemo(() => {
    if (selectedChannelIds.length === 0) {
      return placeholder;
    }

    if (selectedChannelIds.length === 1) {
      const channel = channels.find(c => c.id === selectedChannelIds[0]);
      return channel ? getChannelDisplayName(channel, language) : 'Unknown Channel';
    }

    if (allowMultiple) {
      if (selectedChannelIds.length === activeChannels.length) {
        return 'All Channels';
      }
      return `${selectedChannelIds.length} channels selected`;
    }

    return 'Multiple Selected';
  }, [selectedChannelIds, channels, activeChannels, allowMultiple, language, placeholder]);

  return (
    <div className={`relative ${className}`}>
      {/* Main Selector Button */}
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled || loading}
        className={`
          relative w-full bg-white border border-gray-300 rounded-md shadow-sm
          pl-3 pr-10 py-2 text-left cursor-default focus:outline-none focus:ring-1
          focus:ring-blue-500 focus:border-blue-500 sm:text-sm
          ${disabled ? 'bg-gray-50 text-gray-500 cursor-not-allowed' : 'hover:bg-gray-50'}
          ${error ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : ''}
          ${required && selectedChannelIds.length === 0 ? 'border-orange-300' : ''}
        `}
      >
        <span className="flex items-center">
          <WifiIcon className="flex-shrink-0 h-5 w-5 text-gray-400 mr-2" />
          <span className={`block truncate ${someSelected ? 'text-gray-900' : 'text-gray-500'}`}>
            {loading ? 'Loading channels...' : displayText}
          </span>
        </span>
        <span className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
          <ChevronDownIcon className={`h-5 w-5 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </span>
      </button>

      {/* Error Message */}
      {error && (
        <p className="mt-1 text-sm text-red-600">{(error as Error).message}</p>
      )}

      {/* Dropdown Menu */}
      {isOpen && !disabled && (
        <div className="absolute z-10 mt-1 w-full bg-white shadow-lg max-h-60 rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none sm:text-sm">
          {loading ? (
            <div className="px-3 py-2 text-gray-500 text-center">Loading channels...</div>
          ) : activeChannels.length === 0 ? (
            <div className="px-3 py-2 text-gray-500 text-center">No channels available</div>
          ) : (
            <>
              {/* Select All Option (only for multiple selection) */}
              {allowMultiple && activeChannels.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={handleSelectAll}
                    className="w-full text-left px-3 py-2 hover:bg-gray-100 flex items-center justify-between"
                  >
                    <span className="font-medium text-gray-900">
                      {allSelected ? 'Deselect All' : 'Select All'}
                    </span>
                    <div className={`
                      flex-shrink-0 w-4 h-4 border border-gray-300 rounded flex items-center justify-center
                      ${allSelected ? 'bg-blue-600 border-blue-600' : 'bg-white'}
                    `}>
                      {allSelected && <CheckIcon className="w-3 h-3 text-white" />}
                    </div>
                  </button>
                  <div className="border-t border-gray-100 my-1"></div>
                </>
              )}

              {/* Individual Channel Options - Memoized */}
              {activeChannels.map((channel) => (
                <ChannelItem
                  key={channel.id}
                  channel={channel}
                  isSelected={selectedChannelIds.includes(channel.id)}
                  onToggle={handleChannelToggle}
                  language={language}
                  allowMultiple={allowMultiple}
                  typeBadge={getChannelTypeBadge(channel.platformType)}
                />
              ))}
            </>
          )}
        </div>
      )}

      {/* Backdrop to close dropdown */}
      {isOpen && (
        <div
          className="fixed inset-0 z-5 bg-transparent"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
}, (prevProps, nextProps) => (
  prevProps.selectedChannelIds === nextProps.selectedChannelIds &&
  prevProps.disabled === nextProps.disabled &&
  prevProps.required === nextProps.required &&
  prevProps.placeholder === nextProps.placeholder &&
  prevProps.className === nextProps.className &&
  prevProps.allowMultiple === nextProps.allowMultiple
));

ChannelSelector.displayName = 'ChannelSelector';

export default ChannelSelector;
