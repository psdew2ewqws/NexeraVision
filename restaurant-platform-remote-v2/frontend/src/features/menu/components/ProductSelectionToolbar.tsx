// Product Selection Toolbar - Bulk operations when products are selected
import React, { useState } from 'react';
import {
  CheckCircleIcon,
  XCircleIcon,
  TrashIcon,
  GlobeAltIcon,
  XMarkIcon,
  TagIcon,
  ArrowRightIcon
} from '@heroicons/react/24/outline';
import { useLanguage } from '../../../contexts/LanguageContext';
import { getLocalizedText } from '../../../lib/menu-utils';

interface Platform {
  id: string;
  name: string;
  platformType: string;
  status: string;
}

interface ProductSelectionToolbarProps {
  selectedCount: number;
  totalProducts: number;
  canEdit: boolean;
  canDelete: boolean;
  onBulkStatusChange: (status: number) => void;
  onBulkDelete: () => void;
  onPlatformAssignment: () => void;
  onClearSelection: () => void;
  onSelectAll: () => void;
  loading?: boolean;
  platforms?: Platform[];
  className?: string;
}

export const ProductSelectionToolbar: React.FC<ProductSelectionToolbarProps> = ({
  selectedCount,
  totalProducts,
  canEdit,
  canDelete,
  onBulkStatusChange,
  onBulkDelete,
  onPlatformAssignment,
  onClearSelection,
  onSelectAll,
  loading = false,
  platforms = [],
  className = ''
}) => {
  const { t } = useLanguage();
  const [showPlatformPreview, setShowPlatformPreview] = useState(false);

  if (selectedCount === 0) {
    return null;
  }

  const isAllSelected = selectedCount === totalProducts;
  const activePlatforms = platforms.filter(p => p.status === 'active');

  return (
    <div className={`bg-blue-50 border border-blue-200 rounded-lg p-4 ${className}`}>
      <div className="flex items-center justify-between">
        {/* Selection Info */}
        <div className="flex items-center space-x-4">
          <div className="flex items-center">
            <div className="w-5 h-5 bg-blue-600 rounded border-2 border-blue-600 flex items-center justify-center mr-3">
              <CheckCircleIcon className="w-3 h-3 text-white" />
            </div>
            <div>
              <span className="text-sm font-medium text-blue-800">
                {selectedCount} product{selectedCount !== 1 ? 's' : ''} selected
              </span>
              <div className="text-xs text-blue-600">
                {isAllSelected ? (
                  'All products selected'
                ) : (
                  <button
                    onClick={onSelectAll}
                    className="hover:underline"
                    disabled={loading}
                  >
                    Select all {totalProducts} products
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Platform Assignment Preview */}
          {activePlatforms.length > 0 && (
            <div className="hidden md:flex items-center space-x-2">
              <GlobeAltIcon className="w-4 h-4 text-blue-600" />
              <span className="text-xs text-blue-600">
                {activePlatforms.length} platform{activePlatforms.length !== 1 ? 's' : ''} available
              </span>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center space-x-2">
          {/* Platform Assignment */}
          <button
            onClick={onPlatformAssignment}
            disabled={loading}
            className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-100 hover:bg-blue-200 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="Assign selected products to platforms"
          >
            <GlobeAltIcon className="w-4 h-4 mr-1" />
            <span className="hidden sm:inline">Assign to</span> Platforms
            <ArrowRightIcon className="w-3 h-3 ml-1" />
          </button>

          {/* Status Actions */}
          {canEdit && (
            <>
              <button
                onClick={() => onBulkStatusChange(1)}
                disabled={loading}
                className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-green-700 bg-green-100 hover:bg-green-200 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="Activate selected products"
              >
                <CheckCircleIcon className="w-4 h-4 mr-1" />
                <span className="hidden sm:inline">Activate</span>
              </button>
              <button
                onClick={() => onBulkStatusChange(0)}
                disabled={loading}
                className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-yellow-700 bg-yellow-100 hover:bg-yellow-200 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="Deactivate selected products"
              >
                <XCircleIcon className="w-4 h-4 mr-1" />
                <span className="hidden sm:inline">Deactivate</span>
              </button>
            </>
          )}

          {/* Delete Action */}
          {canDelete && (
            <button
              onClick={onBulkDelete}
              disabled={loading}
              className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-red-700 bg-red-100 hover:bg-red-200 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Delete selected products"
            >
              <TrashIcon className="w-4 h-4 mr-1" />
              <span className="hidden sm:inline">Delete</span>
            </button>
          )}

          {/* Clear Selection */}
          <button
            onClick={onClearSelection}
            disabled={loading}
            className="inline-flex items-center px-2 py-1.5 text-xs font-medium text-gray-600 bg-white hover:bg-gray-50 border border-gray-300 rounded-md transition-colors disabled:opacity-50"
            title="Clear selection"
          >
            <XMarkIcon className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Quick Platform Assignment Info */}
      {activePlatforms.length > 0 && (
        <div className="mt-3 pt-3 border-t border-blue-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <span className="text-xs text-blue-600">Quick assign to:</span>
              <div className="flex items-center space-x-2">
                {activePlatforms.slice(0, 4).map((platform) => (
                  <button
                    key={platform.id}
                    onClick={() => {
                      // Quick assignment to single platform
                      onPlatformAssignment();
                    }}
                    disabled={loading}
                    className="inline-flex items-center px-2 py-1 text-xs font-medium text-gray-700 bg-white hover:bg-gray-50 border border-gray-300 rounded transition-colors disabled:opacity-50"
                    title={`Assign to ${getLocalizedText(platform.name || '', language)}`}
                  >
                    {getLocalizedText(platform.name || '', language)}
                  </button>
                ))}
                {activePlatforms.length > 4 && (
                  <span className="text-xs text-gray-500">
                    +{activePlatforms.length - 4} more
                  </span>
                )}
              </div>
            </div>

            <button
              onClick={onPlatformAssignment}
              disabled={loading}
              className="text-xs text-blue-600 hover:text-blue-800 hover:underline disabled:opacity-50"
            >
              Advanced assignment
            </button>
          </div>
        </div>
      )}

      {/* Loading Indicator */}
      {loading && (
        <div className="mt-3 pt-3 border-t border-blue-200">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
            <span className="text-xs text-blue-600">Processing selected products...</span>
          </div>
        </div>
      )}
    </div>
  );
};

// Compact version for mobile/small screens
interface CompactProductSelectionToolbarProps {
  selectedCount: number;
  onPlatformAssignment: () => void;
  onClearSelection: () => void;
  loading?: boolean;
}

export const CompactProductSelectionToolbar: React.FC<CompactProductSelectionToolbarProps> = ({
  selectedCount,
  onPlatformAssignment,
  onClearSelection,
  loading = false
}) => {
  if (selectedCount === 0) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 bg-blue-600 text-white rounded-lg shadow-lg p-3 z-50 md:hidden">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">
          {selectedCount} selected
        </span>

        <div className="flex items-center space-x-2">
          <button
            onClick={onPlatformAssignment}
            disabled={loading}
            className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-blue-600 bg-white rounded-md hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            <GlobeAltIcon className="w-4 h-4 mr-1" />
            Platforms
          </button>

          <button
            onClick={onClearSelection}
            disabled={loading}
            className="inline-flex items-center px-2 py-1.5 text-xs font-medium text-white hover:bg-blue-700 rounded-md transition-colors disabled:opacity-50"
          >
            <XMarkIcon className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProductSelectionToolbar;