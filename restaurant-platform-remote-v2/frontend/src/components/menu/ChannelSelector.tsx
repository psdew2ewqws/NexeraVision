import React, { useState, useEffect, useCallback } from 'react';
import { ChevronDownIcon, CheckIcon, WifiIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../../contexts/AuthContext';

interface Channel {
  id: string;
  name: string;
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

export const ChannelSelector: React.FC<ChannelSelectorProps> = ({
  selectedChannelIds,
  onChannelChange,
  placeholder = "Select channels",
  className = "",
  required = false,
  disabled = false,
  allowMultiple = true
}) => {
  const { user } = useAuth();
  const [channels, setChannels] = useState<Channel[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load channels from platforms API
  const loadChannels = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);

      const authToken = localStorage.getItem('auth-token');
      if (!authToken) {
        throw new Error('No authentication token found');
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/platforms`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to load channels: ${response.status}`);
      }

      const data = await response.json();

      // Map platforms to channels
      const channelData = (data.platforms || []).map((platform: any) => ({
        id: platform.id,
        name: platform.name,
        displayName: platform.displayName || { en: platform.name },
        platformType: platform.platformType || 'delivery',
        isActive: platform.status === 1,
        configuration: platform.configuration
      }));

      setChannels(channelData);
    } catch (err) {
      console.error('Error loading channels:', err);
      setError(err instanceof Error ? err.message : 'Failed to load channels');
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Load channels on mount
  useEffect(() => {
    loadChannels();
  }, [loadChannels]);

  // Handle channel selection
  const handleChannelToggle = (channelId: string) => {
    if (disabled) return;

    if (!allowMultiple) {
      // Single selection mode
      onChannelChange([channelId]);
      setIsOpen(false);
      return;
    }

    // Multiple selection mode
    const isSelected = selectedChannelIds.includes(channelId);
    let newSelection: string[];

    if (isSelected) {
      // Remove from selection
      newSelection = selectedChannelIds.filter(id => id !== channelId);
    } else {
      // Add to selection
      newSelection = [...selectedChannelIds, channelId];
    }

    onChannelChange(newSelection);
  };

  // Handle select all (only for multiple selection)
  const handleSelectAll = () => {
    if (disabled || !allowMultiple) return;

    const allChannelIds = channels.filter(channel => channel.isActive).map(channel => channel.id);
    const allSelected = allChannelIds.every(id => selectedChannelIds.includes(id));

    if (allSelected) {
      // Deselect all
      onChannelChange([]);
    } else {
      // Select all active channels
      onChannelChange(allChannelIds);
    }
  };

  // Get display text
  const getDisplayText = () => {
    if (selectedChannelIds.length === 0) {
      return placeholder;
    }

    if (selectedChannelIds.length === 1) {
      const channel = channels.find(c => c.id === selectedChannelIds[0]);
      return channel?.displayName.en || channel?.name || 'Unknown Channel';
    }

    if (allowMultiple) {
      if (selectedChannelIds.length === channels.filter(c => c.isActive).length) {
        return 'All Channels';
      }
      return `${selectedChannelIds.length} channels selected`;
    }

    return 'Multiple Selected';
  };

  // Get channel type badge color
  const getChannelTypeBadge = (platformType: string) => {
    const types: Record<string, { label: string; color: string }> = {
      'delivery': { label: 'Delivery', color: 'bg-blue-100 text-blue-800' },
      'pickup': { label: 'Pickup', color: 'bg-green-100 text-green-800' },
      'dine_in': { label: 'Dine-in', color: 'bg-purple-100 text-purple-800' },
      'call_center': { label: 'Call Center', color: 'bg-orange-100 text-orange-800' },
      'pos': { label: 'POS', color: 'bg-gray-100 text-gray-800' }
    };

    return types[platformType] || { label: platformType, color: 'bg-gray-100 text-gray-800' };
  };

  const activeChannels = channels.filter(channel => channel.isActive);
  const allSelected = allowMultiple && activeChannels.length > 0 && activeChannels.every(channel => selectedChannelIds.includes(channel.id));
  const someSelected = selectedChannelIds.length > 0;

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
            {loading ? 'Loading channels...' : getDisplayText()}
          </span>
        </span>
        <span className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
          <ChevronDownIcon className={`h-5 w-5 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </span>
      </button>

      {/* Error Message */}
      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
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

              {/* Individual Channel Options */}
              {activeChannels.map((channel) => {
                const isSelected = selectedChannelIds.includes(channel.id);
                const typeBadge = getChannelTypeBadge(channel.platformType);

                return (
                  <button
                    key={channel.id}
                    type="button"
                    onClick={() => handleChannelToggle(channel.id)}
                    className="w-full text-left px-3 py-2 hover:bg-gray-100 flex items-center justify-between"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <span className={`block font-medium ${isSelected ? 'text-blue-600' : 'text-gray-900'}`}>
                          {channel.displayName.en}
                        </span>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${typeBadge.color}`}>
                          {typeBadge.label}
                        </span>
                      </div>
                      {channel.name !== channel.displayName.en && (
                        <span className="block text-sm text-gray-500">{channel.name}</span>
                      )}
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
                );
              })}
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
};

export default ChannelSelector;