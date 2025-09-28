import React, { useState, useMemo, useCallback } from 'react';
import { 
  EyeIcon,
  PencilIcon,
  TrashIcon,
  CubeIcon,
  ShoppingBagIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  BanknotesIcon
} from '@heroicons/react/24/outline';
import { 
  CheckCircleIcon as CheckCircleIconSolid,
  ExclamationTriangleIcon as ExclamationTriangleIconSolid
} from '@heroicons/react/24/solid';
import { BranchAvailability, ConnectedType } from '../../../types/menu';

interface AvailabilityDataGridProps {
  items: BranchAvailability[];
  loading?: boolean;
  selectionMode?: boolean;
  selectedItems?: string[];
  onItemSelect?: (itemId: string) => void;
  onItemView?: (item: BranchAvailability) => void;
  onItemEdit?: (item: BranchAvailability) => void;
  onItemDelete?: (itemId: string, itemName?: string) => void;
  className?: string;
}

interface SortConfig {
  key: keyof BranchAvailability | string;
  direction: 'asc' | 'desc';
}

export const AvailabilityDataGrid: React.FC<AvailabilityDataGridProps> = ({
  items,
  loading = false,
  selectionMode = false,
  selectedItems = [],
  onItemSelect,
  onItemView,
  onItemEdit,
  onItemDelete,
  className = ''
}) => {
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'updatedAt', direction: 'desc' });
  const [hoveredRow, setHoveredRow] = useState<string | null>(null);

  // Sort items based on current sort configuration
  const sortedItems = useMemo(() => {
    const sortableItems = [...items];
    
    sortableItems.sort((a, b) => {
      let aValue: any;
      let bValue: any;
      
      switch (sortConfig.key) {
        case 'itemName':
          aValue = (a.connectedItem as any)?.name?.en || 
                   (a.connectedItem as any)?.name || 
                   a.connectedId;
          bValue = (b.connectedItem as any)?.name?.en || 
                   (b.connectedItem as any)?.name || 
                   b.connectedId;
          break;
        case 'branchName':
          aValue = a.branch?.name || '';
          bValue = b.branch?.name || '';
          break;
        case 'status':
          aValue = a.isActive && a.isInStock ? 2 : a.isActive && !a.isInStock ? 1 : 0;
          bValue = b.isActive && b.isInStock ? 2 : b.isActive && !b.isInStock ? 1 : 0;
          break;
        case 'stockLevel':
          aValue = a.stockLevel || 0;
          bValue = b.stockLevel || 0;
          break;
        case 'updatedAt':
          aValue = new Date(a.updatedAt);
          bValue = new Date(b.updatedAt);
          break;
        default:
          aValue = a[sortConfig.key as keyof BranchAvailability];
          bValue = b[sortConfig.key as keyof BranchAvailability];
      }
      
      if (aValue < bValue) {
        return sortConfig.direction === 'asc' ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortConfig.direction === 'asc' ? 1 : -1;
      }
      return 0;
    });
    
    return sortableItems;
  }, [items, sortConfig]);

  // Handle column sorting
  const handleSort = useCallback((key: keyof BranchAvailability | string) => {
    setSortConfig(current => ({
      key,
      direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc'
    }));
  }, []);

  // Render sort indicator
  const renderSortIndicator = (columnKey: string) => {
    if (sortConfig.key !== columnKey) return null;
    return sortConfig.direction === 'asc' ? ' ↑' : ' ↓';
  };

  // Get item display name
  const getItemDisplayName = (item: BranchAvailability) => {
    return (item.connectedItem as any)?.name?.en || 
           (item.connectedItem as any)?.name || 
           `${item.connectedType} ${item.connectedId.slice(0, 8)}`;
  };

  // Get status display
  const getStatusDisplay = (item: BranchAvailability) => {
    if (item.isActive && item.isInStock) {
      return { text: 'Available', color: 'bg-green-100 text-green-800', icon: CheckCircleIconSolid };
    } else if (item.isActive && !item.isInStock) {
      return { text: 'Out of Stock', color: 'bg-yellow-100 text-yellow-800', icon: ExclamationTriangleIconSolid };
    } else {
      return { text: 'Inactive', color: 'bg-gray-100 text-gray-800', icon: XCircleIcon };
    }
  };

  // Get stock level display with warning
  const getStockDisplay = (item: BranchAvailability) => {
    if (item.stockLevel === null) {
      return { display: 'N/A', color: 'text-gray-400', warning: false };
    }
    
    const isLowStock = item.lowStockThreshold && item.stockLevel <= item.lowStockThreshold;
    
    return {
      display: item.stockLevel.toString(),
      color: isLowStock ? 'text-red-600 font-medium' : 'text-gray-900',
      warning: isLowStock,
      threshold: item.lowStockThreshold
    };
  };

  // Render platform pricing summary
  const renderPricingSummary = (item: BranchAvailability) => {
    if (!item.prices || typeof item.prices !== 'object' || Object.keys(item.prices).length === 0) {
      return <span className="text-gray-400">No pricing</span>;
    }

    const prices = Object.entries(item.prices as Record<string, number>).filter(([_, price]) => price !== null && price !== undefined);
    
    if (prices.length === 0) {
      return <span className="text-gray-400">No pricing</span>;
    }

    const visiblePrices = prices.slice(0, 2);
    const hasMore = prices.length > 2;

    return (
      <div className="space-y-1">
        {visiblePrices.map(([platform, price]) => (
          <div key={platform} className="flex justify-between text-xs">
            <span className="text-gray-500 capitalize">
              {platform.replace('_', ' ')}:
            </span>
            <span className="font-medium">{price?.toFixed(2)} JOD</span>
          </div>
        ))}
        {hasMore && (
          <div className="text-xs text-gray-400">
            +{prices.length - 2} more
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className={`bg-white rounded-lg border border-gray-200 overflow-hidden ${className}`}>
        <div className="flex items-center justify-center py-12">
          <div className="flex items-center space-x-3">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="text-sm text-gray-500">Loading availability data...</span>
          </div>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className={`bg-white rounded-lg border border-gray-200 overflow-hidden ${className}`}>
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <CubeIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Availability Data</h3>
            <p className="text-gray-500 mb-4">No availability records found for the selected branches</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg border border-gray-200 overflow-hidden ${className}`}>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {selectionMode && (
                <th scope="col" className="w-12 px-6 py-3 text-left">
                  <input
                    type="checkbox"
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    checked={selectedItems.length === items.length}
                    onChange={() => {
                      if (onItemSelect) {
                        if (selectedItems.length === items.length) {
                          // Deselect all
                          items.forEach(item => {
                            if (selectedItems.includes(item.id)) {
                              onItemSelect(item.id);
                            }
                          });
                        } else {
                          // Select all
                          items.forEach(item => {
                            if (!selectedItems.includes(item.id)) {
                              onItemSelect(item.id);
                            }
                          });
                        }
                      }
                    }}
                  />
                </th>
              )}

              <th 
                scope="col" 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('itemName')}
              >
                Item{renderSortIndicator('itemName')}
              </th>

              <th 
                scope="col" 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('branchName')}
              >
                Branch{renderSortIndicator('branchName')}
              </th>

              <th 
                scope="col" 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('status')}
              >
                Status{renderSortIndicator('status')}
              </th>

              <th 
                scope="col" 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('stockLevel')}
              >
                Stock Level{renderSortIndicator('stockLevel')}
              </th>

              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Platform Pricing
              </th>

              <th 
                scope="col" 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('updatedAt')}
              >
                Last Updated{renderSortIndicator('updatedAt')}
              </th>

              <th scope="col" className="relative px-6 py-3">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>

          <tbody className="bg-white divide-y divide-gray-200">
            {sortedItems.map((item) => {
              const status = getStatusDisplay(item);
              const stock = getStockDisplay(item);
              const isSelected = selectedItems.includes(item.id);
              const isHovered = hoveredRow === item.id;

              return (
                <tr 
                  key={item.id}
                  className={`transition-colors ${
                    isSelected 
                      ? 'bg-blue-50 border-l-4 border-blue-500' 
                      : isHovered 
                      ? 'bg-gray-50' 
                      : 'hover:bg-gray-50'
                  }`}
                  onMouseEnter={() => setHoveredRow(item.id)}
                  onMouseLeave={() => setHoveredRow(null)}
                >
                  {selectionMode && (
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => onItemSelect?.(item.id)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                    </td>
                  )}

                  {/* Item Column */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10">
                        <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${
                          item.connectedType === ConnectedType.PRODUCT 
                            ? 'bg-blue-100' 
                            : 'bg-green-100'
                        }`}>
                          {item.connectedType === ConnectedType.PRODUCT ? (
                            <ShoppingBagIcon className="h-5 w-5 text-blue-600" />
                          ) : (
                            <CubeIcon className="h-5 w-5 text-green-600" />
                          )}
                        </div>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">
                          {getItemDisplayName(item)}
                        </div>
                        <div className="text-sm text-gray-500">
                          {item.connectedType} • ID: {item.connectedId.slice(0, 8)}...
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Branch Column */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{item.branch?.name || 'Unknown'}</div>
                    {item.branch?.nameAr && (
                      <div className="text-sm text-gray-500" dir="rtl">{item.branch.nameAr}</div>
                    )}
                  </td>

                  {/* Status Column */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${status.color}`}>
                        <status.icon className="w-3 h-3 mr-1" />
                        {status.text}
                      </span>
                    </div>
                  </td>

                  {/* Stock Level Column */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm">
                      <div className={`flex items-center ${stock.color}`}>
                        {stock.warning && <ExclamationTriangleIcon className="w-4 h-4 mr-1 text-red-500" />}
                        <span className="font-medium">{stock.display}</span>
                      </div>
                      {stock.threshold && (
                        <div className="text-xs text-gray-500 mt-1">
                          Min: {stock.threshold}
                        </div>
                      )}
                    </div>
                  </td>

                  {/* Platform Pricing Column */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm">
                      {renderPricingSummary(item)}
                    </div>
                  </td>

                  {/* Last Updated Column */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {new Date(item.updatedAt).toLocaleDateString()}
                    </div>
                    <div className="text-xs text-gray-500">
                      {new Date(item.updatedAt).toLocaleTimeString()}
                    </div>
                  </td>

                  {/* Actions Column */}
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center space-x-2 justify-end">
                      {onItemView && (
                        <button 
                          onClick={() => onItemView(item)}
                          className="text-blue-600 hover:text-blue-900 transition-colors"
                          title="View details"
                        >
                          <EyeIcon className="h-4 w-4" />
                        </button>
                      )}
                      {onItemEdit && (
                        <button 
                          onClick={() => onItemEdit(item)}
                          className="text-gray-600 hover:text-gray-900 transition-colors"
                          title="Edit item"
                        >
                          <PencilIcon className="h-4 w-4" />
                        </button>
                      )}
                      {onItemDelete && (
                        <button 
                          onClick={() => onItemDelete(item.id, getItemDisplayName(item))}
                          className="text-red-600 hover:text-red-900 transition-colors"
                          title="Delete item"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination/Loading footer could be added here */}
      <div className="bg-gray-50 px-6 py-3 border-t border-gray-200">
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-500">
            Showing {sortedItems.length} item{sortedItems.length !== 1 ? 's' : ''}
          </div>
          <div className="flex items-center space-x-2 text-xs text-gray-500">
            <ClockIcon className="w-4 h-4" />
            <span>Last updated: {new Date().toLocaleTimeString()}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AvailabilityDataGrid;