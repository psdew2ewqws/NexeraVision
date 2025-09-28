import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  AdjustmentsHorizontalIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  PlusIcon,
  MinusIcon,
  CurrencyDollarIcon,
  TagIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon
} from '@heroicons/react/24/outline';
import {
  CheckCircleIcon as CheckCircleIconSolid,
  XCircleIcon as XCircleIconSolid
} from '@heroicons/react/24/solid';

interface ModifierGroup {
  id: string;
  name: string;
  nameAr?: string;
  isRequired: boolean;
  minSelection: number;
  maxSelection: number;
  displayOrder: number;
  isActive: boolean;
  modifiers: ModifierItem[];
}

interface ModifierItem {
  id: string;
  name: string;
  nameAr?: string;
  groupId: string;
  groupName: string;
  basePrice: number;
  availability: {
    id?: string;
    isInStock: boolean;
    isActive: boolean;
    stockLevel?: number;
    lowStockThreshold?: number;
    prices: {
      talabat?: number;
      careem?: number;
      website?: number;
      call_center?: number;
      uber_eats?: number;
      deliveroo?: number;
    };
    lastUpdated: string;
    updatedBy: string;
  };
  preparationTime?: number;
  calories?: number;
  allergens?: string[];
}

interface ModifierAvailabilityPanelProps {
  branchIds: string[];
  companyId: string;
  loading?: boolean;
  onModifierUpdate?: (modifierId: string, updates: Partial<ModifierItem['availability']>) => void;
  onBulkUpdate?: (modifierIds: string[], updates: Partial<ModifierItem['availability']>) => void;
  className?: string;
}

export const ModifierAvailabilityPanel: React.FC<ModifierAvailabilityPanelProps> = ({
  branchIds,
  companyId,
  loading = false,
  onModifierUpdate,
  onBulkUpdate,
  className = ''
}) => {
  const [modifierGroups, setModifierGroups] = useState<ModifierGroup[]>([]);
  const [selectedModifiers, setSelectedModifiers] = useState<string[]>([]);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [filterText, setFilterText] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive' | 'out_of_stock'>('all');
  const [groupFilter, setGroupFilter] = useState<string>('');
  const [sortBy, setSortBy] = useState<'name' | 'group' | 'price' | 'stock'>('group');
  const [bulkMode, setBulkMode] = useState(false);

  // Load modifier data
  const loadModifiers = useCallback(async () => {
    if (!branchIds.length) return;

    try {
      const response = await fetch(`/api/availability/modifiers?branchIds=${branchIds.join(',')}&companyId=${companyId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setModifierGroups(data.groups || []);
        // Auto-expand groups with issues
        const groupsWithIssues = data.groups
          .filter((group: ModifierGroup) => 
            group.modifiers.some(m => !m.availability.isInStock || !m.availability.isActive)
          )
          .map((group: ModifierGroup) => group.id);
        setExpandedGroups(new Set(groupsWithIssues));
      }
    } catch (error) {
      console.error('Error loading modifiers:', error);
    }
  }, [branchIds, companyId]);

  useEffect(() => {
    loadModifiers();
  }, [loadModifiers]);

  // Filter and sort modifiers
  const filteredModifiers = useMemo(() => {
    let allModifiers = modifierGroups.flatMap(group => 
      group.modifiers.map(modifier => ({
        ...modifier,
        groupName: group.name,
        groupIsRequired: group.isRequired,
        groupMinSelection: group.minSelection,
        groupMaxSelection: group.maxSelection
      }))
    );

    // Apply filters
    if (filterText) {
      const query = filterText.toLowerCase();
      allModifiers = allModifiers.filter(modifier =>
        modifier.name.toLowerCase().includes(query) ||
        modifier.nameAr?.includes(query) ||
        modifier.groupName.toLowerCase().includes(query)
      );
    }

    if (statusFilter !== 'all') {
      allModifiers = allModifiers.filter(modifier => {
        switch (statusFilter) {
          case 'active':
            return modifier.availability.isActive && modifier.availability.isInStock;
          case 'inactive':
            return !modifier.availability.isActive;
          case 'out_of_stock':
            return !modifier.availability.isInStock;
          default:
            return true;
        }
      });
    }

    if (groupFilter) {
      allModifiers = allModifiers.filter(modifier => modifier.groupId === groupFilter);
    }

    // Sort modifiers
    allModifiers.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'group':
          return a.groupName.localeCompare(b.groupName) || a.name.localeCompare(b.name);
        case 'price':
          return a.basePrice - b.basePrice;
        case 'stock':
          return (b.availability.stockLevel || 0) - (a.availability.stockLevel || 0);
        default:
          return 0;
      }
    });

    return allModifiers;
  }, [modifierGroups, filterText, statusFilter, groupFilter, sortBy]);

  // Group filtered modifiers back into groups
  const filteredGroups = useMemo(() => {
    const groupMap = new Map<string, ModifierGroup>();
    
    filteredModifiers.forEach(modifier => {
      if (!groupMap.has(modifier.groupId)) {
        const originalGroup = modifierGroups.find(g => g.id === modifier.groupId);
        if (originalGroup) {
          groupMap.set(modifier.groupId, {
            ...originalGroup,
            modifiers: []
          });
        }
      }
      
      groupMap.get(modifier.groupId)?.modifiers.push(modifier);
    });

    return Array.from(groupMap.values()).sort((a, b) => a.displayOrder - b.displayOrder);
  }, [filteredModifiers, modifierGroups]);

  // Statistics
  const stats = useMemo(() => {
    const totalModifiers = modifierGroups.reduce((sum, group) => sum + group.modifiers.length, 0);
    const activeModifiers = modifierGroups.reduce((sum, group) => 
      sum + group.modifiers.filter(m => m.availability.isActive && m.availability.isInStock).length, 0
    );
    const outOfStock = modifierGroups.reduce((sum, group) => 
      sum + group.modifiers.filter(m => !m.availability.isInStock).length, 0
    );
    const lowStock = modifierGroups.reduce((sum, group) => 
      sum + group.modifiers.filter(m => 
        m.availability.isInStock && 
        m.availability.stockLevel !== undefined && 
        m.availability.lowStockThreshold !== undefined &&
        m.availability.stockLevel <= m.availability.lowStockThreshold
      ).length, 0
    );

    return {
      total: totalModifiers,
      active: activeModifiers,
      outOfStock,
      lowStock,
      inactive: totalModifiers - activeModifiers - outOfStock
    };
  }, [modifierGroups]);

  const handleModifierToggle = (modifierId: string) => {
    if (bulkMode) {
      setSelectedModifiers(prev => 
        prev.includes(modifierId) 
          ? prev.filter(id => id !== modifierId)
          : [...prev, modifierId]
      );
    }
  };

  const handleGroupToggle = (groupId: string) => {
    setExpandedGroups(prev => {
      const newSet = new Set(prev);
      if (newSet.has(groupId)) {
        newSet.delete(groupId);
      } else {
        newSet.add(groupId);
      }
      return newSet;
    });
  };

  const handleBulkAction = (action: string, value?: any) => {
    if (selectedModifiers.length === 0) return;

    const updates: Partial<ModifierItem['availability']> = {};
    
    switch (action) {
      case 'activate':
        updates.isActive = true;
        break;
      case 'deactivate':
        updates.isActive = false;
        break;
      case 'in_stock':
        updates.isInStock = true;
        break;
      case 'out_of_stock':
        updates.isInStock = false;
        break;
      case 'set_stock':
        updates.stockLevel = value;
        break;
    }

    onBulkUpdate?.(selectedModifiers, updates);
    setSelectedModifiers([]);
  };

  const getPriceDisplay = (modifier: ModifierItem) => {
    const prices = modifier.availability.prices;
    const nonZeroPrices = Object.entries(prices).filter(([_, price]) => price && price > 0);
    
    if (nonZeroPrices.length === 0) {
      return <span className="text-gray-500">Base: {modifier.basePrice} JOD</span>;
    }
    
    return (
      <div className="text-xs space-y-1">
        <div className="text-gray-600">Base: {modifier.basePrice} JOD</div>
        {nonZeroPrices.slice(0, 2).map(([platform, price]) => (
          <div key={platform} className="text-blue-600">
            {platform}: {price} JOD
          </div>
        ))}
        {nonZeroPrices.length > 2 && (
          <div className="text-gray-500">+{nonZeroPrices.length - 2} more</div>
        )}
      </div>
    );
  };

  const getStockStatus = (modifier: ModifierItem) => {
    if (!modifier.availability.isActive) {
      return { icon: XCircleIconSolid, color: 'text-gray-400', bg: 'bg-gray-100', text: 'Inactive' };
    }
    if (!modifier.availability.isInStock) {
      return { icon: XCircleIconSolid, color: 'text-red-500', bg: 'bg-red-100', text: 'Out of Stock' };
    }
    if (modifier.availability.stockLevel !== undefined && 
        modifier.availability.lowStockThreshold !== undefined &&
        modifier.availability.stockLevel <= modifier.availability.lowStockThreshold) {
      return { icon: ExclamationTriangleIcon, color: 'text-yellow-500', bg: 'bg-yellow-100', text: 'Low Stock' };
    }
    return { icon: CheckCircleIconSolid, color: 'text-green-500', bg: 'bg-green-100', text: 'Available' };
  };

  if (loading) {
    return (
      <div className={`bg-white rounded-lg border border-gray-200 ${className}`}>
        <div className="p-6 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-sm text-gray-500 mt-3">Loading modifiers...</p>
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
            <AdjustmentsHorizontalIcon className="w-5 h-5 text-gray-600" />
            <h3 className="text-lg font-medium text-gray-900">Modifier Availability</h3>
          </div>
          <div className="flex items-center space-x-3">
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

        {/* Statistics */}
        <div className="grid grid-cols-5 gap-4 mb-4">
          <div className="text-center p-3 bg-blue-50 rounded-lg">
            <div className="text-lg font-semibold text-blue-900">{stats.total}</div>
            <div className="text-xs text-blue-600">Total</div>
          </div>
          <div className="text-center p-3 bg-green-50 rounded-lg">
            <div className="text-lg font-semibold text-green-900">{stats.active}</div>
            <div className="text-xs text-green-600">Active</div>
          </div>
          <div className="text-center p-3 bg-red-50 rounded-lg">
            <div className="text-lg font-semibold text-red-900">{stats.outOfStock}</div>
            <div className="text-xs text-red-600">Out of Stock</div>
          </div>
          <div className="text-center p-3 bg-yellow-50 rounded-lg">
            <div className="text-lg font-semibold text-yellow-900">{stats.lowStock}</div>
            <div className="text-xs text-yellow-600">Low Stock</div>
          </div>
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="text-lg font-semibold text-gray-900">{stats.inactive}</div>
            <div className="text-xs text-gray-600">Inactive</div>
          </div>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-4 gap-4">
          <input
            type="text"
            placeholder="Search modifiers..."
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="out_of_stock">Out of Stock</option>
          </select>
          <select
            value={groupFilter}
            onChange={(e) => setGroupFilter(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">All Groups</option>
            {modifierGroups.map(group => (
              <option key={group.id} value={group.id}>{group.name}</option>
            ))}
          </select>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="group">Sort by Group</option>
            <option value="name">Sort by Name</option>
            <option value="price">Sort by Price</option>
            <option value="stock">Sort by Stock</option>
          </select>
        </div>

        {/* Bulk Actions */}
        {bulkMode && selectedModifiers.length > 0 && (
          <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-blue-800">
                {selectedModifiers.length} modifier{selectedModifiers.length !== 1 ? 's' : ''} selected
              </span>
              <div className="flex space-x-2">
                <button
                  onClick={() => handleBulkAction('activate')}
                  className="px-3 py-1.5 text-xs bg-green-100 text-green-800 rounded-md hover:bg-green-200"
                >
                  Activate
                </button>
                <button
                  onClick={() => handleBulkAction('deactivate')}
                  className="px-3 py-1.5 text-xs bg-gray-100 text-gray-800 rounded-md hover:bg-gray-200"
                >
                  Deactivate
                </button>
                <button
                  onClick={() => handleBulkAction('in_stock')}
                  className="px-3 py-1.5 text-xs bg-blue-100 text-blue-800 rounded-md hover:bg-blue-200"
                >
                  In Stock
                </button>
                <button
                  onClick={() => handleBulkAction('out_of_stock')}
                  className="px-3 py-1.5 text-xs bg-red-100 text-red-800 rounded-md hover:bg-red-200"
                >
                  Out of Stock
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="max-h-[600px] overflow-y-auto">
        {filteredGroups.length === 0 ? (
          <div className="p-8 text-center">
            <AdjustmentsHorizontalIcon className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No modifiers found</p>
          </div>
        ) : (
          <div className="space-y-4 p-6">
            {filteredGroups.map(group => (
              <div key={group.id} className="border border-gray-200 rounded-lg">
                {/* Group Header */}
                <div
                  className="p-4 bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors"
                  onClick={() => handleGroupToggle(group.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      {expandedGroups.has(group.id) ? (
                        <ChevronUpIcon className="w-4 h-4 text-gray-500" />
                      ) : (
                        <ChevronDownIcon className="w-4 h-4 text-gray-500" />
                      )}
                      <div>
                        <h4 className="font-medium text-gray-900">{group.name}</h4>
                        {group.nameAr && (
                          <p className="text-sm text-gray-500" dir="rtl">{group.nameAr}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-4 text-sm">
                      <div className="flex items-center space-x-2">
                        {group.isRequired && (
                          <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs font-medium">
                            Required
                          </span>
                        )}
                        <span className="text-gray-500">
                          {group.minSelection}-{group.maxSelection} selections
                        </span>
                      </div>
                      <span className="text-gray-400">
                        {group.modifiers.length} modifier{group.modifiers.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Group Content */}
                {expandedGroups.has(group.id) && (
                  <div className="border-t border-gray-200">
                    <div className="divide-y divide-gray-100">
                      {group.modifiers.map(modifier => {
                        const status = getStockStatus(modifier);
                        const isSelected = selectedModifiers.includes(modifier.id);

                        return (
                          <div
                            key={modifier.id}
                            className={`p-4 hover:bg-gray-50 transition-colors ${
                              bulkMode ? 'cursor-pointer' : ''
                            } ${isSelected ? 'bg-blue-50 border-l-4 border-blue-500' : ''}`}
                            onClick={() => bulkMode && handleModifierToggle(modifier.id)}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-4 flex-1 min-w-0">
                                {bulkMode && (
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={() => handleModifierToggle(modifier.id)}
                                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                  />
                                )}
                                
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center space-x-3">
                                    <div>
                                      <h5 className="font-medium text-gray-900 truncate">{modifier.name}</h5>
                                      {modifier.nameAr && (
                                        <p className="text-sm text-gray-500 truncate" dir="rtl">{modifier.nameAr}</p>
                                      )}
                                    </div>
                                    
                                    <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${status.bg} ${status.color}`}>
                                      <status.icon className="w-3 h-3 mr-1" />
                                      {status.text}
                                    </div>
                                  </div>
                                </div>

                                <div className="flex items-center space-x-6 text-sm">
                                  <div className="text-right min-w-0">
                                    {getPriceDisplay(modifier)}
                                  </div>
                                  
                                  {modifier.availability.stockLevel !== undefined && (
                                    <div className="text-center">
                                      <div className="font-medium text-gray-900">{modifier.availability.stockLevel}</div>
                                      <div className="text-xs text-gray-500">in stock</div>
                                    </div>
                                  )}

                                  {modifier.preparationTime && (
                                    <div className="flex items-center text-gray-500">
                                      <ClockIcon className="w-4 h-4 mr-1" />
                                      <span>{modifier.preparationTime}min</span>
                                    </div>
                                  )}
                                </div>
                              </div>

                              {!bulkMode && (
                                <div className="flex items-center space-x-2 ml-4">
                                  <button
                                    className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md"
                                    title="View Details"
                                  >
                                    <EyeIcon className="w-4 h-4" />
                                  </button>
                                  <button
                                    className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md"
                                    title="Edit Availability"
                                  >
                                    <PencilIcon className="w-4 h-4" />
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ModifierAvailabilityPanel;