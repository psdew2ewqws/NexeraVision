// Platform Filter - Filter products by platform assignments
import React, { useState, useEffect, useRef } from 'react';
import {
  ChevronDownIcon,
  GlobeAltIcon,
  CheckIcon,
  XMarkIcon,
  FunnelIcon
} from '@heroicons/react/24/outline';
import { SinglePlatformBadge } from './PlatformBadges';
import { getLocalizedText } from '../../../lib/menu-utils';
import { useLanguage } from '../../../contexts/LanguageContext';

interface Platform {
  id: string;
  name: string | object;  // Support both string and JSON object
  description?: string | object;
  platformType: string;
  status: string;
  menuCount?: number;
  isDefault?: boolean;
}

interface PlatformFilterProps {
  platforms: Platform[];
  selectedPlatformIds: string[];
  onPlatformFilterChange: (platformIds: string[]) => void;
  onLoadPlatforms?: () => void;
  loading?: boolean;
  className?: string;
  placeholder?: string;
  showClearAll?: boolean;
}

export const PlatformFilter: React.FC<PlatformFilterProps> = ({
  platforms = [],
  selectedPlatformIds = [],
  onPlatformFilterChange,
  onLoadPlatforms,
  loading = false,
  className = '',
  placeholder = 'Filter by platforms',
  showClearAll = true
}) => {
  const { language } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Load platforms on mount
  useEffect(() => {
    if (platforms.length === 0 && onLoadPlatforms) {
      onLoadPlatforms();
    }
  }, [platforms.length, onLoadPlatforms]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter platforms based on search term
  const filteredPlatforms = platforms.filter(platform => {
    try {
      // Handle platform name (could be string or JSON object)
      let platformName = '';
      if (typeof platform.name === 'string') {
        platformName = platform.name;
      } else if (platform.name && typeof platform.name === 'object') {
        platformName = getLocalizedText(platform.name, language) || '';
      }

      // Ensure we have strings for comparison
      const nameStr = String(platformName || '').toLowerCase();
      const typeStr = String(platform.platformType || '').toLowerCase();
      const searchStr = String(searchTerm || '').toLowerCase();

      return (
        nameStr.includes(searchStr) ||
        typeStr.includes(searchStr)
      );
    } catch (error) {
      console.warn('Error filtering platform:', platform, error);
      return true; // Include platform if filtering fails
    }
  });

  // Active platforms only
  const activePlatforms = filteredPlatforms.filter(p => p.status === 'active');

  // Handle platform selection
  const handlePlatformToggle = (platformId: string) => {
    const newSelection = selectedPlatformIds.includes(platformId)
      ? selectedPlatformIds.filter(id => id !== platformId)
      : [...selectedPlatformIds, platformId];

    onPlatformFilterChange(newSelection);
  };

  // Select all platforms
  const handleSelectAll = () => {
    const allPlatformIds = activePlatforms.map(p => p.id);
    onPlatformFilterChange(allPlatformIds);
  };

  // Clear all selections
  const handleClearAll = () => {
    onPlatformFilterChange([]);
  };

  // Get display text for the filter button
  const getDisplayText = () => {
    if (selectedPlatformIds.length === 0) {
      return placeholder;
    }

    if (selectedPlatformIds.length === 1) {
      const platform = platforms.find(p => p.id === selectedPlatformIds[0]);
      if (platform) {
        const platformName = typeof platform.name === 'string'
          ? platform.name
          : getLocalizedText(platform.name || '', language);
        return platformName;
      }
      return '1 platform';
    }

    if (selectedPlatformIds.length === activePlatforms.length) {
      return 'All platforms';
    }

    return `${selectedPlatformIds.length} platforms`;
  };

  const hasSelection = selectedPlatformIds.length > 0;
  const allSelected = selectedPlatformIds.length === activePlatforms.length && activePlatforms.length > 0;

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* Filter Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between px-3 py-2 text-sm bg-white border rounded-md transition-colors ${
          hasSelection
            ? 'border-blue-300 bg-blue-50 text-blue-700'
            : 'border-gray-300 text-gray-700 hover:bg-gray-50'
        }`}
        disabled={loading}
      >
        <div className="flex items-center min-w-0">
          <GlobeAltIcon className="w-4 h-4 mr-2 text-gray-400 flex-shrink-0" />
          <span className="truncate">{getDisplayText()}</span>
          {hasSelection && (
            <span className="ml-2 inline-flex items-center px-1.5 py-0.5 text-xs font-medium bg-blue-100 text-blue-700 rounded">
              {selectedPlatformIds.length}
            </span>
          )}
        </div>

        <div className="flex items-center ml-2">
          {hasSelection && showClearAll && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleClearAll();
              }}
              className="text-gray-400 hover:text-gray-600 mr-1"
              title="Clear all"
            >
              <XMarkIcon className="w-4 h-4" />
            </button>
          )}
          <ChevronDownIcon
            className={`w-4 h-4 text-gray-400 transition-transform ${
              isOpen ? 'transform rotate-180' : ''
            }`}
          />
        </div>
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg">
          {loading ? (
            <div className="flex items-center justify-center p-4">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600 mr-2"></div>
              <span className="text-sm text-gray-600">Loading platforms...</span>
            </div>
          ) : activePlatforms.length === 0 ? (
            <div className="p-4 text-center">
              <GlobeAltIcon className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-600">No platforms available</p>
            </div>
          ) : (
            <>
              {/* Search Input */}
              {activePlatforms.length > 5 && (
                <div className="p-3 border-b border-gray-200">
                  <input
                    type="text"
                    placeholder="Search platforms..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              )}

              {/* Bulk Actions */}
              <div className="flex items-center justify-between p-3 border-b border-gray-200 bg-gray-50">
                <span className="text-xs font-medium text-gray-600 uppercase tracking-wide">
                  Platform Selection
                </span>
                <div className="flex space-x-2">
                  <button
                    onClick={handleSelectAll}
                    disabled={allSelected}
                    className="text-xs text-blue-600 hover:text-blue-800 disabled:text-gray-400"
                  >
                    Select All
                  </button>
                  {hasSelection && (
                    <button
                      onClick={handleClearAll}
                      className="text-xs text-gray-600 hover:text-gray-800"
                    >
                      Clear All
                    </button>
                  )}
                </div>
              </div>

              {/* Platform List */}
              <div className="max-h-64 overflow-y-auto">
                {activePlatforms.map((platform) => {
                  const isSelected = selectedPlatformIds.includes(platform.id);

                  return (
                    <div
                      key={platform.id}
                      className="flex items-center p-3 hover:bg-gray-50 cursor-pointer"
                      onClick={() => handlePlatformToggle(platform.id)}
                    >
                      {/* Checkbox */}
                      <div className="flex items-center">
                        <div className={`w-4 h-4 rounded border-2 flex items-center justify-center mr-3 transition-all ${
                          isSelected
                            ? 'bg-blue-600 border-blue-600'
                            : 'border-gray-300 hover:border-gray-400'
                        }`}>
                          {isSelected && (
                            <CheckIcon className="w-3 h-3 text-white" />
                          )}
                        </div>

                        {/* Platform Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2 mb-1">
                            <SinglePlatformBadge
                              platform={platform}
                              size="sm"
                              showIcon={true}
                              showTooltip={false}
                            />
                            {platform.isDefault && (
                              <span className="inline-flex items-center px-1.5 py-0.5 text-xs font-medium bg-gray-100 text-gray-600 rounded">
                                Default
                              </span>
                            )}
                          </div>

                          <div className="text-sm font-medium text-gray-900">
                            {getLocalizedText(platform.name || '', language)}
                          </div>

                          {platform.description && (
                            <div className="text-xs text-gray-500 mt-1 line-clamp-1">
                              {getLocalizedText(platform.description || '', language)}
                            </div>
                          )}

                          {/* Platform stats */}
                          <div className="flex items-center space-x-3 mt-1">
                            {platform.menuCount !== undefined && (
                              <span className="text-xs text-gray-500">
                                {platform.menuCount} item{platform.menuCount !== 1 ? 's' : ''}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Filter Summary */}
              {hasSelection && (
                <div className="p-3 border-t border-gray-200 bg-blue-50">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-blue-800">
                      {selectedPlatformIds.length} platform{selectedPlatformIds.length !== 1 ? 's' : ''} selected
                    </span>
                    <button
                      onClick={() => setIsOpen(false)}
                      className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                    >
                      Apply Filter
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};

// Compact Platform Filter for mobile/small spaces
interface CompactPlatformFilterProps {
  selectedCount: number;
  totalPlatforms: number;
  onOpenFilter: () => void;
  className?: string;
}

export const CompactPlatformFilter: React.FC<CompactPlatformFilterProps> = ({
  selectedCount,
  totalPlatforms,
  onOpenFilter,
  className = ''
}) => {
  const getDisplayText = () => {
    if (selectedCount === 0) return 'All platforms';
    if (selectedCount === totalPlatforms) return 'All platforms';
    return `${selectedCount} platforms`;
  };

  return (
    <button
      onClick={onOpenFilter}
      className={`inline-flex items-center px-3 py-2 text-sm bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors ${className}`}
    >
      <FunnelIcon className="w-4 h-4 mr-2 text-gray-400" />
      <span>{getDisplayText()}</span>
      {selectedCount > 0 && selectedCount < totalPlatforms && (
        <span className="ml-2 inline-flex items-center px-1.5 py-0.5 text-xs font-medium bg-blue-100 text-blue-700 rounded">
          {selectedCount}
        </span>
      )}
    </button>
  );
};

export default PlatformFilter;