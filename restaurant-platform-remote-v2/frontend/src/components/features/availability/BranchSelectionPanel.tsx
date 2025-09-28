import React, { useState, useEffect, useMemo } from 'react';
import { 
  BuildingOfficeIcon,
  CheckIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import { 
  CheckCircleIcon as CheckCircleIconSolid
} from '@heroicons/react/24/solid';

interface Branch {
  id: string;
  name: string;
  nameAr?: string;
  isActive: boolean;
  itemCount?: number;
}

interface BranchSelectionPanelProps {
  branches: Branch[];
  selectedBranches: string[];
  onBranchToggle: (branchId: string) => void;
  onSelectAll: () => void;
  onClearAll: () => void;
  loading?: boolean;
  className?: string;
}

export const BranchSelectionPanel: React.FC<BranchSelectionPanelProps> = ({
  branches,
  selectedBranches,
  onBranchToggle,
  onSelectAll,
  onClearAll,
  loading = false,
  className = ''
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showActiveOnly, setShowActiveOnly] = useState(false);

  // Filter branches based on search and active filter
  const filteredBranches = useMemo(() => {
    return branches.filter(branch => {
      const matchesSearch = searchQuery === '' || 
        branch.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (branch.nameAr && branch.nameAr.includes(searchQuery));
      
      const matchesActiveFilter = !showActiveOnly || branch.isActive;
      
      return matchesSearch && matchesActiveFilter;
    });
  }, [branches, searchQuery, showActiveOnly]);

  // Selection statistics
  const selectionStats = useMemo(() => {
    const totalBranches = branches.length;
    const activeBranches = branches.filter(b => b.isActive).length;
    const selectedCount = selectedBranches.length;
    const selectedActive = branches
      .filter(b => selectedBranches.includes(b.id) && b.isActive)
      .length;

    return {
      totalBranches,
      activeBranches,
      selectedCount,
      selectedActive,
      isAllSelected: selectedCount === totalBranches,
      isAllActiveSelected: selectedActive === activeBranches && activeBranches > 0
    };
  }, [branches, selectedBranches]);

  // Generate selected branch names for display
  const selectedBranchNames = useMemo(() => {
    const names = branches
      .filter(b => selectedBranches.includes(b.id))
      .map(b => b.name);
    
    if (names.length === 0) return 'No branches selected';
    if (names.length <= 2) return names.join(', ');
    return `${names.slice(0, 2).join(', ')} and ${names.length - 2} more`;
  }, [branches, selectedBranches]);

  return (
    <div className={`bg-white border-r border-gray-200 flex flex-col ${className}`}>
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <BuildingOfficeIcon className="w-5 h-5 text-gray-600" />
            <h3 className="text-lg font-medium text-gray-900">Branch Selection</h3>
          </div>
          <div className="text-sm text-gray-500">
            {selectionStats.selectedCount}/{selectionStats.totalBranches}
          </div>
        </div>
        
        {/* Quick Actions */}
        <div className="flex space-x-2 mb-4">
          <button
            onClick={onSelectAll}
            disabled={loading || selectionStats.isAllSelected}
            className="flex-1 text-xs text-blue-600 hover:text-blue-800 font-medium py-2 px-3 border border-blue-200 rounded-md hover:bg-blue-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {selectionStats.isAllSelected ? 'All Selected' : 'Select All'}
          </button>
          <button
            onClick={onClearAll}
            disabled={loading || selectionStats.selectedCount === 0}
            className="flex-1 text-xs text-gray-600 hover:text-gray-800 font-medium py-2 px-3 border border-gray-200 rounded-md hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Clear All
          </button>
        </div>

        {/* Search Filter */}
        <div className="mb-4">
          <input
            type="text"
            placeholder="Search branches..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Active Only Filter */}
        <div className="flex items-center space-x-2">
          <label className="flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={showActiveOnly}
              onChange={(e) => setShowActiveOnly(e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <span className="ml-2 text-sm text-gray-600">Active branches only</span>
          </label>
        </div>

        {/* Selection Summary */}
        {selectionStats.selectedCount > 0 && (
          <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-800">
                  {selectionStats.selectedCount} branch{selectionStats.selectedCount !== 1 ? 'es' : ''} selected
                </p>
                <p className="text-xs text-blue-600 mt-1 truncate" title={selectedBranchNames}>
                  {selectedBranchNames}
                </p>
              </div>
              <button
                onClick={onClearAll}
                className="p-1 text-blue-600 hover:text-blue-800 rounded-full hover:bg-blue-100"
                title="Clear selection"
              >
                <XMarkIcon className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
      
      {/* Branch List */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="p-6 text-center">
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              <span className="ml-3 text-sm text-gray-500">Loading branches...</span>
            </div>
          </div>
        ) : filteredBranches.length === 0 ? (
          <div className="p-6 text-center">
            <BuildingOfficeIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-500">
              {searchQuery ? 'No branches match your search' : 'No branches available'}
            </p>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="mt-2 text-xs text-blue-600 hover:text-blue-800"
              >
                Clear search
              </button>
            )}
          </div>
        ) : (
          <div className="p-6">
            <div className="space-y-3">
              {filteredBranches.map((branch) => {
                const isSelected = selectedBranches.includes(branch.id);
                
                return (
                  <div
                    key={branch.id}
                    className={`relative group rounded-lg border-2 transition-all cursor-pointer ${
                      isSelected 
                        ? 'border-blue-500 bg-blue-50' 
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                    onClick={() => onBranchToggle(branch.id)}
                  >
                    <div className="p-4">
                      <div className="flex items-center space-x-3">
                        {/* Custom Checkbox */}
                        <div className={`flex-shrink-0 w-5 h-5 rounded border-2 transition-all ${
                          isSelected 
                            ? 'border-blue-500 bg-blue-500' 
                            : 'border-gray-300 bg-white group-hover:border-blue-400'
                        }`}>
                          {isSelected && (
                            <CheckIcon className="w-3 h-3 text-white m-0.5" />
                          )}
                        </div>

                        {/* Branch Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className={`text-sm font-medium truncate ${
                              isSelected ? 'text-blue-900' : 'text-gray-900'
                            }`}>
                              {branch.name}
                            </p>
                            
                            <div className="flex items-center space-x-2">
                              {/* Item Count */}
                              {branch.itemCount !== undefined && (
                                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                  isSelected 
                                    ? 'bg-blue-100 text-blue-800'
                                    : 'bg-gray-100 text-gray-800'
                                }`}>
                                  {branch.itemCount} items
                                </span>
                              )}

                              {/* Status Badge */}
                              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                branch.isActive 
                                  ? 'bg-green-100 text-green-800' 
                                  : 'bg-gray-100 text-gray-600'
                              }`}>
                                <span className={`w-2 h-2 rounded-full mr-1 ${
                                  branch.isActive ? 'bg-green-400' : 'bg-gray-400'
                                }`}></span>
                                {branch.isActive ? 'Active' : 'Inactive'}
                              </span>
                            </div>
                          </div>
                          
                          {/* Arabic Name */}
                          {branch.nameAr && (
                            <p className={`text-xs mt-1 truncate ${
                              isSelected ? 'text-blue-600' : 'text-gray-500'
                            }`} dir="rtl">
                              {branch.nameAr}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Selection Indicator */}
                    {isSelected && (
                      <div className="absolute top-2 right-2">
                        <CheckCircleIconSolid className="w-4 h-4 text-blue-500" />
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
      <div className="p-6 border-t border-gray-200 bg-gray-50">
        <div className="grid grid-cols-2 gap-4 text-center">
          <div>
            <p className="text-lg font-semibold text-gray-900">{selectionStats.totalBranches}</p>
            <p className="text-xs text-gray-500">Total Branches</p>
          </div>
          <div>
            <p className="text-lg font-semibold text-green-600">{selectionStats.activeBranches}</p>
            <p className="text-xs text-gray-500">Active Branches</p>
          </div>
        </div>
        
        {selectionStats.selectedCount > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="text-center">
              <p className="text-sm font-medium text-blue-600">
                {selectionStats.selectedActive} active branch{selectionStats.selectedActive !== 1 ? 'es' : ''} selected
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BranchSelectionPanel;