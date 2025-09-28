import React, { useState, useCallback, useMemo } from 'react';
import {
  CurrencyDollarIcon,
  CheckCircleIcon,
  XCircleIcon,
  PencilIcon,
  DocumentDuplicateIcon,
  ArrowPathIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline';
import {
  CheckCircleIcon as CheckCircleIconSolid,
  XCircleIcon as XCircleIconSolid
} from '@heroicons/react/24/solid';

interface PlatformConfig {
  id: string;
  name: string;
  displayName: string;
  icon: string;
  color: string;
  bgColor: string;
  borderColor: string;
  isEnabled: boolean;
  commission: number;
}

interface PricingData {
  itemId: string;
  itemName: string;
  itemType: 'product' | 'modifier';
  basePrice: number;
  platforms: {
    [key: string]: {
      price: number;
      isEnabled: boolean;
      margin: number;
      finalPrice: number;
    };
  };
}

interface PlatformPricingMatrixProps {
  items: any[];
  onPriceUpdate?: (itemId: string, platform: string, price: number, enabled: boolean) => void;
  onBulkUpdate?: (itemIds: string[], updates: any) => void;
  loading?: boolean;
  className?: string;
}

const PLATFORM_CONFIGS: PlatformConfig[] = [
  {
    id: 'talabat',
    name: 'talabat',
    displayName: 'Talabat',
    icon: '🛵',
    color: 'text-orange-700',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200',
    isEnabled: true,
    commission: 15
  },
  {
    id: 'careem',
    name: 'careem',
    displayName: 'Careem Now',
    icon: '🚗',
    color: 'text-green-700',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    isEnabled: true,
    commission: 12
  },
  {
    id: 'website',
    name: 'website',
    displayName: 'Website',
    icon: '🌐',
    color: 'text-blue-700',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    isEnabled: true,
    commission: 0
  },
  {
    id: 'call_center',
    name: 'call_center',
    displayName: 'Call Center',
    icon: '📞',
    color: 'text-purple-700',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200',
    isEnabled: true,
    commission: 5
  },
  {
    id: 'uber_eats',
    name: 'uber_eats',
    displayName: 'Uber Eats',
    icon: '🛴',
    color: 'text-gray-700',
    bgColor: 'bg-gray-50',
    borderColor: 'border-gray-200',
    isEnabled: true,
    commission: 18
  },
  {
    id: 'deliveroo',
    name: 'deliveroo',
    displayName: 'Deliveroo',
    icon: '🏍️',
    color: 'text-cyan-700',
    bgColor: 'bg-cyan-50',
    borderColor: 'border-cyan-200',
    isEnabled: true,
    commission: 16
  }
];

export const PlatformPricingMatrix: React.FC<PlatformPricingMatrixProps> = ({
  items,
  onPriceUpdate,
  onBulkUpdate,
  loading = false,
  className = ''
}) => {
  const [editingCell, setEditingCell] = useState<{ itemId: string; platform: string } | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [bulkMode, setBulkMode] = useState(false);
  const [showInactive, setShowInactive] = useState(false);

  // Transform items to pricing data
  const pricingData = useMemo(() => {
    return items.map(item => {
      const platformPricing: any = {};
      
      PLATFORM_CONFIGS.forEach(platform => {
        const price = item.prices?.[platform.name] || item.basePrice || 0;
        const commission = platform.commission / 100;
        const margin = price * commission;
        const finalPrice = price + margin;
        
        platformPricing[platform.id] = {
          price: price,
          isEnabled: price > 0,
          margin: margin,
          finalPrice: finalPrice
        };
      });

      return {
        itemId: item.id,
        itemName: item.connectedItem?.name?.en || item.connectedItem?.name || `${item.connectedType} ${item.connectedId.slice(0, 8)}`,
        itemType: item.connectedType,
        basePrice: item.basePrice || 0,
        platforms: platformPricing
      };
    });
  }, [items]);

  // Filter data based on active/inactive toggle
  const filteredData = useMemo(() => {
    if (showInactive) return pricingData;
    return pricingData.filter(item => 
      Object.values(item.platforms).some((p: any) => p.isEnabled)
    );
  }, [pricingData, showInactive]);

  const handleCellClick = useCallback((itemId: string, platform: string, currentPrice: number) => {
    setEditingCell({ itemId, platform });
    setEditValue(currentPrice.toString());
  }, []);

  const handleCellSave = useCallback(() => {
    if (!editingCell) return;
    
    const newPrice = parseFloat(editValue) || 0;
    const isEnabled = newPrice > 0;
    
    onPriceUpdate?.(editingCell.itemId, editingCell.platform, newPrice, isEnabled);
    setEditingCell(null);
    setEditValue('');
  }, [editingCell, editValue, onPriceUpdate]);

  const handleCellCancel = useCallback(() => {
    setEditingCell(null);
    setEditValue('');
  }, []);

  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleCellSave();
    } else if (e.key === 'Escape') {
      handleCellCancel();
    }
  }, [handleCellSave, handleCellCancel]);

  const handleBulkPriceUpdate = useCallback((percentage: number) => {
    if (selectedItems.length === 0) return;
    
    const updates = selectedItems.reduce((acc, itemId) => {
      const item = pricingData.find(p => p.itemId === itemId);
      if (!item) return acc;
      
      const platformUpdates: any = {};
      PLATFORM_CONFIGS.forEach(platform => {
        const currentPrice = item.platforms[platform.id]?.price || 0;
        const newPrice = currentPrice * (1 + percentage / 100);
        platformUpdates[platform.name] = newPrice;
      });
      
      acc[itemId] = { prices: platformUpdates };
      return acc;
    }, {} as any);
    
    onBulkUpdate?.(selectedItems, updates);
    setSelectedItems([]);
  }, [selectedItems, pricingData, onBulkUpdate]);

  const toggleItemSelection = useCallback((itemId: string) => {
    setSelectedItems(prev => 
      prev.includes(itemId) 
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    );
  }, []);

  const selectAllItems = useCallback(() => {
    setSelectedItems(filteredData.map(item => item.itemId));
  }, [filteredData]);

  const clearSelection = useCallback(() => {
    setSelectedItems([]);
  }, []);

  if (loading) {
    return (
      <div className={`bg-white rounded-lg border border-gray-200 p-8 ${className}`}>
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-sm text-gray-500">Loading pricing matrix...</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg border border-gray-200 ${className}`}>
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <CurrencyDollarIcon className="w-5 h-5 text-gray-600" />
            <h3 className="text-lg font-semibold text-gray-900">Platform Pricing Matrix</h3>
            <div className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
              {filteredData.length} items
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <label className="flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={showInactive}
                onChange={(e) => setShowInactive(e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <span className="ml-2 text-sm text-gray-600">Show inactive items</span>
            </label>
            
            <button
              onClick={() => setBulkMode(!bulkMode)}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                bulkMode
                  ? 'bg-blue-100 text-blue-800 border border-blue-200'
                  : 'bg-gray-100 text-gray-700 border border-gray-200 hover:bg-gray-200'
              }`}
            >
              {bulkMode ? 'Exit Bulk Mode' : 'Bulk Mode'}
            </button>
          </div>
        </div>

        {/* Bulk Actions */}
        {bulkMode && selectedItems.length > 0 && (
          <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-blue-800">
                {selectedItems.length} item{selectedItems.length !== 1 ? 's' : ''} selected
              </span>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handleBulkPriceUpdate(10)}
                  className="px-3 py-1.5 text-xs bg-green-100 text-green-800 rounded-md hover:bg-green-200"
                >
                  +10%
                </button>
                <button
                  onClick={() => handleBulkPriceUpdate(5)}
                  className="px-3 py-1.5 text-xs bg-green-100 text-green-800 rounded-md hover:bg-green-200"
                >
                  +5%
                </button>
                <button
                  onClick={() => handleBulkPriceUpdate(-5)}
                  className="px-3 py-1.5 text-xs bg-red-100 text-red-800 rounded-md hover:bg-red-200"
                >
                  -5%
                </button>
                <button
                  onClick={() => handleBulkPriceUpdate(-10)}
                  className="px-3 py-1.5 text-xs bg-red-100 text-red-800 rounded-md hover:bg-red-200"
                >
                  -10%
                </button>
                <button
                  onClick={clearSelection}
                  className="px-3 py-1.5 text-xs bg-gray-100 text-gray-800 rounded-md hover:bg-gray-200"
                >
                  Clear
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Platform Legend */}
        <div className="mt-4 grid grid-cols-3 gap-4">
          {PLATFORM_CONFIGS.map(platform => (
            <div key={platform.id} className={`flex items-center p-2 rounded-lg ${platform.bgColor} ${platform.borderColor} border`}>
              <span className="text-lg mr-2">{platform.icon}</span>
              <div>
                <div className={`text-sm font-medium ${platform.color}`}>{platform.displayName}</div>
                <div className="text-xs text-gray-500">Commission: {platform.commission}%</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Matrix Table */}
      <div className="overflow-x-auto">
        {filteredData.length === 0 ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <CurrencyDollarIcon className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No pricing data available</p>
            </div>
          </div>
        ) : (
          <table className="min-w-full">
            <thead className="bg-gray-50">
              <tr>
                {bulkMode && (
                  <th className="px-4 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={selectedItems.length === filteredData.length}
                      onChange={selectedItems.length === filteredData.length ? clearSelection : selectAllItems}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                  </th>
                )}
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Item
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Base Price
                </th>
                {PLATFORM_CONFIGS.map(platform => (
                  <th key={platform.id} className={`px-4 py-3 text-center text-xs font-medium uppercase tracking-wider ${platform.color}`}>
                    <div className="flex items-center justify-center">
                      <span className="mr-1">{platform.icon}</span>
                      {platform.displayName}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredData.map((item, index) => (
                <tr key={item.itemId} className={`hover:bg-gray-50 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-25'}`}>
                  {bulkMode && (
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedItems.includes(item.itemId)}
                        onChange={() => toggleItemSelection(item.itemId)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                    </td>
                  )}
                  <td className="px-4 py-3">
                    <div className="flex items-center">
                      <div className={`w-2 h-2 rounded-full mr-2 ${item.itemType === 'product' ? 'bg-blue-400' : 'bg-green-400'}`}></div>
                      <div>
                        <div className="text-sm font-medium text-gray-900">{item.itemName}</div>
                        <div className="text-xs text-gray-500 capitalize">{item.itemType}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="text-sm font-medium text-gray-900">{item.basePrice.toFixed(2)} JOD</div>
                  </td>
                  {PLATFORM_CONFIGS.map(platform => {
                    const platformData = item.platforms[platform.id];
                    const isEditing = editingCell?.itemId === item.itemId && editingCell?.platform === platform.id;
                    
                    return (
                      <td key={platform.id} className="px-4 py-3 text-center">
                        <div className={`inline-flex flex-col items-center p-2 rounded-lg border ${
                          platformData.isEnabled 
                            ? `${platform.bgColor} ${platform.borderColor}` 
                            : 'bg-gray-50 border-gray-200'
                        }`}>
                          {isEditing ? (
                            <input
                              type="number"
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              onBlur={handleCellSave}
                              onKeyDown={handleKeyPress}
                              autoFocus
                              className="w-16 px-1 py-1 text-xs text-center border rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                              step="0.01"
                              min="0"
                            />
                          ) : (
                            <button
                              onClick={() => handleCellClick(item.itemId, platform.id, platformData.price)}
                              className={`text-xs font-medium ${
                                platformData.isEnabled ? platform.color : 'text-gray-400'
                              } hover:underline`}
                            >
                              {platformData.price > 0 ? `${platformData.price.toFixed(2)} JOD` : 'Not set'}
                            </button>
                          )}
                          
                          <div className="flex items-center mt-1 space-x-1">
                            {platformData.isEnabled ? (
                              <CheckCircleIconSolid className="w-3 h-3 text-green-500" />
                            ) : (
                              <XCircleIconSolid className="w-3 h-3 text-gray-300" />
                            )}
                            {platformData.margin > 0 && (
                              <span className="text-xs text-gray-500">
                                +{platformData.margin.toFixed(2)}
                              </span>
                            )}
                          </div>
                          
                          {platformData.isEnabled && platformData.finalPrice !== platformData.price && (
                            <div className="text-xs text-gray-600 font-medium">
                              = {platformData.finalPrice.toFixed(2)} JOD
                            </div>
                          )}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Footer */}
      <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
        <div className="flex items-center justify-between text-sm text-gray-600">
          <div className="flex items-center space-x-4">
            <div className="flex items-center">
              <InformationCircleIcon className="w-4 h-4 mr-1" />
              Click any price to edit
            </div>
            <div className="flex items-center">
              <CheckCircleIconSolid className="w-4 h-4 mr-1 text-green-500" />
              Active
            </div>
            <div className="flex items-center">
              <XCircleIconSolid className="w-4 h-4 mr-1 text-gray-300" />
              Inactive
            </div>
          </div>
          <div className="text-right">
            <div>Showing {filteredData.length} of {pricingData.length} items</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlatformPricingMatrix;