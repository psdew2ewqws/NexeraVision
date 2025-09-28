import React, { useState, useEffect, useCallback } from 'react';
import { ChevronDownIcon, CheckIcon, BuildingStorefrontIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../../contexts/AuthContext';

interface Branch {
  id: string;
  name: string;
  isActive: boolean;
  address?: string;
  isDefault?: boolean;
}

interface BranchSelectorProps {
  selectedBranchIds: string[];
  onBranchChange: (branchIds: string[]) => void;
  placeholder?: string;
  className?: string;
  required?: boolean;
  disabled?: boolean;
}

export const BranchSelector: React.FC<BranchSelectorProps> = ({
  selectedBranchIds,
  onBranchChange,
  placeholder = "Select branches",
  className = "",
  required = false,
  disabled = false
}) => {
  const { user } = useAuth();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load branches from API
  const loadBranches = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);

      const authToken = localStorage.getItem('auth-token');
      if (!authToken) {
        throw new Error('No authentication token found');
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/branches`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to load branches: ${response.status}`);
      }

      const data = await response.json();
      setBranches(data.branches || []);
    } catch (err) {
      console.error('Error loading branches:', err);
      setError(err instanceof Error ? err.message : 'Failed to load branches');
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Load branches on mount
  useEffect(() => {
    loadBranches();
  }, [loadBranches]);

  // Handle branch selection toggle
  const handleBranchToggle = (branchId: string) => {
    if (disabled) return;

    const isSelected = selectedBranchIds.includes(branchId);
    let newSelection: string[];

    if (isSelected) {
      // Remove from selection
      newSelection = selectedBranchIds.filter(id => id !== branchId);
    } else {
      // Add to selection
      newSelection = [...selectedBranchIds, branchId];
    }

    onBranchChange(newSelection);
  };

  // Handle select all
  const handleSelectAll = () => {
    if (disabled) return;

    const allBranchIds = branches.filter(branch => branch.isActive).map(branch => branch.id);
    const allSelected = allBranchIds.every(id => selectedBranchIds.includes(id));

    if (allSelected) {
      // Deselect all
      onBranchChange([]);
    } else {
      // Select all active branches
      onBranchChange(allBranchIds);
    }
  };

  // Get display text
  const getDisplayText = () => {
    if (selectedBranchIds.length === 0) {
      return placeholder;
    }

    if (selectedBranchIds.length === 1) {
      const branch = branches.find(b => b.id === selectedBranchIds[0]);
      return branch?.name || 'Unknown Branch';
    }

    if (selectedBranchIds.length === branches.filter(b => b.isActive).length) {
      return 'All Branches';
    }

    return `${selectedBranchIds.length} branches selected`;
  };

  const activeBranches = branches.filter(branch => branch.isActive);
  const allSelected = activeBranches.length > 0 && activeBranches.every(branch => selectedBranchIds.includes(branch.id));
  const someSelected = selectedBranchIds.length > 0;

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
          ${required && selectedBranchIds.length === 0 ? 'border-orange-300' : ''}
        `}
      >
        <span className="flex items-center">
          <BuildingStorefrontIcon className="flex-shrink-0 h-5 w-5 text-gray-400 mr-2" />
          <span className={`block truncate ${someSelected ? 'text-gray-900' : 'text-gray-500'}`}>
            {loading ? 'Loading branches...' : getDisplayText()}
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
            <div className="px-3 py-2 text-gray-500 text-center">Loading branches...</div>
          ) : activeBranches.length === 0 ? (
            <div className="px-3 py-2 text-gray-500 text-center">No branches available</div>
          ) : (
            <>
              {/* Select All Option */}
              {activeBranches.length > 1 && (
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

              {/* Individual Branch Options */}
              {activeBranches.map((branch) => {
                const isSelected = selectedBranchIds.includes(branch.id);
                return (
                  <button
                    key={branch.id}
                    type="button"
                    onClick={() => handleBranchToggle(branch.id)}
                    className="w-full text-left px-3 py-2 hover:bg-gray-100 flex items-center justify-between"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center">
                        <span className={`block font-medium ${isSelected ? 'text-blue-600' : 'text-gray-900'}`}>
                          {branch.name}
                        </span>
                        {branch.isDefault && (
                          <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                            Default
                          </span>
                        )}
                      </div>
                      {branch.address && (
                        <span className="block text-sm text-gray-500 truncate">{branch.address}</span>
                      )}
                    </div>
                    <div className={`
                      flex-shrink-0 w-4 h-4 border border-gray-300 rounded flex items-center justify-center ml-2
                      ${isSelected ? 'bg-blue-600 border-blue-600' : 'bg-white'}
                    `}>
                      {isSelected && <CheckIcon className="w-3 h-3 text-white" />}
                    </div>
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

export default BranchSelector;