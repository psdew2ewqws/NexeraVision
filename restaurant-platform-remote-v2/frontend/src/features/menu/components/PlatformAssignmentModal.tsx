// Platform Assignment Modal - Bulk assignment of products to platforms
import React, { useState, useEffect, useMemo } from 'react';
import {
  XMarkIcon,
  CheckIcon,
  GlobeAltIcon,
  TruckIcon,
  BuildingStorefrontIcon,
  PhoneIcon,
  DevicePhoneMobileIcon,
  ComputerDesktopIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  ArrowRightIcon,
  PlusIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '../../../contexts/AuthContext';
import { useLanguage } from '../../../contexts/LanguageContext';
import { SinglePlatformBadge } from './PlatformBadges';
import { getLocalizedText } from '../../../lib/menu-utils';
import toast from 'react-hot-toast';

interface Platform {
  id: string;
  name: string;
  description?: string;
  platformType: string;
  status: string;
  menuCount?: number;
  isDefault?: boolean;
  config?: any;
  createdAt?: string;
  updatedAt?: string;
}

interface MenuProduct {
  id: string;
  name: any; // Localized text object
  category?: {
    name: any;
  };
  platforms?: Platform[];
}

interface PlatformAssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedProducts: string[];
  products: MenuProduct[];
  onAssignmentComplete: () => void;
  className?: string;
}

interface AssignmentAction {
  platformId: string;
  action: 'assign' | 'remove';
}

export const PlatformAssignmentModal: React.FC<PlatformAssignmentModalProps> = ({
  isOpen,
  onClose,
  selectedProducts,
  products = [],
  onAssignmentComplete,
  className = ''
}) => {
  const { user } = useAuth();
  const { language, t } = useLanguage();
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [loading, setLoading] = useState(false);
  const [platformsLoading, setPlatformsLoading] = useState(false);
  const [assignments, setAssignments] = useState<Record<string, AssignmentAction>>({});
  const [showPreview, setShowPreview] = useState(false);

  // Get current assignments for selected products
  const selectedProductsData = useMemo(() => {
    return products.filter(p => selectedProducts.includes(p.id));
  }, [products, selectedProducts]);

  // Calculate platform statistics for selected products
  const platformStats = useMemo(() => {
    const stats: Record<string, { assigned: number; total: number; partial: boolean }> = {};

    platforms.forEach(platform => {
      let assignedCount = 0;
      selectedProductsData.forEach(product => {
        if (product.platforms?.some(p => p.id === platform.id)) {
          assignedCount++;
        }
      });

      stats[platform.id] = {
        assigned: assignedCount,
        total: selectedProductsData.length,
        partial: assignedCount > 0 && assignedCount < selectedProductsData.length
      };
    });

    return stats;
  }, [platforms, selectedProductsData]);

  // Load available platforms
  useEffect(() => {
    if (isOpen && user) {
      loadPlatforms();
    }
  }, [isOpen, user]);

  const loadPlatforms = async () => {
    try {
      setPlatformsLoading(true);
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/menu/platforms`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth-token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setPlatforms(data.platforms || []);
      } else {
        throw new Error('Failed to load platforms');
      }
    } catch (error) {
      console.error('Failed to load platforms:', error);
      toast.error('Failed to load platforms');
    } finally {
      setPlatformsLoading(false);
    }
  };

  // Handle platform assignment toggle
  const handlePlatformToggle = (platformId: string) => {
    const stats = platformStats[platformId];
    if (!stats) return;

    // Determine the action based on current state
    let action: 'assign' | 'remove';

    if (stats.assigned === 0) {
      // No products assigned, so we assign
      action = 'assign';
    } else if (stats.assigned === stats.total) {
      // All products assigned, so we remove
      action = 'remove';
    } else {
      // Partial assignment, default to assign to complete the set
      action = 'assign';
    }

    setAssignments(prev => ({
      ...prev,
      [platformId]: { platformId, action }
    }));
  };

  // Handle explicit assignment action
  const handleExplicitAction = (platformId: string, action: 'assign' | 'remove') => {
    setAssignments(prev => ({
      ...prev,
      [platformId]: { platformId, action }
    }));
  };

  // Calculate effective state after assignments
  const getEffectiveState = (platformId: string) => {
    const currentStats = platformStats[platformId];
    const assignment = assignments[platformId];

    if (!currentStats) return { assigned: 0, total: 0 };

    if (!assignment) {
      return currentStats;
    }

    if (assignment.action === 'assign') {
      return { assigned: currentStats.total, total: currentStats.total };
    } else {
      return { assigned: 0, total: currentStats.total };
    }
  };

  // Execute platform assignments
  const handleApplyAssignments = async () => {
    if (Object.keys(assignments).length === 0) {
      toast.info('No changes to apply');
      return;
    }

    try {
      setLoading(true);

      // Group assignments by action
      const assignActions = Object.values(assignments).filter(a => a.action === 'assign');
      const removeActions = Object.values(assignments).filter(a => a.action === 'remove');

      const promises: Promise<any>[] = [];

      // Execute assign actions
      for (const assignment of assignActions) {
        promises.push(
          fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/menu/platforms/${assignment.platformId}/products`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('auth-token')}`
            },
            body: JSON.stringify({
              productIds: selectedProducts
            })
          })
        );
      }

      // Execute remove actions
      for (const assignment of removeActions) {
        promises.push(
          fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/menu/platforms/${assignment.platformId}/products`, {
            method: 'DELETE',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('auth-token')}`
            },
            body: JSON.stringify({
              productIds: selectedProducts
            })
          })
        );
      }

      // Wait for all operations to complete
      const results = await Promise.allSettled(promises);

      // Check results
      const failures = results.filter(r => r.status === 'rejected').length;
      const successes = results.filter(r => r.status === 'fulfilled').length;

      if (failures === 0) {
        toast.success(`Platform assignments updated successfully`);
        onAssignmentComplete();
        onClose();
      } else if (successes > 0) {
        toast.warning(`${successes} operations succeeded, ${failures} failed`);
        onAssignmentComplete();
      } else {
        toast.error('Failed to update platform assignments');
      }

    } catch (error) {
      console.error('Failed to apply assignments:', error);
      toast.error('Failed to update platform assignments');
    } finally {
      setLoading(false);
    }
  };

  // Reset assignments
  const handleReset = () => {
    setAssignments({});
  };

  const hasChanges = Object.keys(assignments).length > 0;
  const changeCount = Object.keys(assignments).length;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className={`bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden ${className}`}>
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center">
            <GlobeAltIcon className="w-6 h-6 text-blue-600 mr-3" />
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                Platform Assignment
              </h2>
              <p className="text-sm text-gray-600">
                Assign {selectedProducts.length} product{selectedProducts.length !== 1 ? 's' : ''} to platforms
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {platformsLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mr-3"></div>
              <span className="text-gray-600">Loading platforms...</span>
            </div>
          ) : platforms.length === 0 ? (
            <div className="text-center py-12">
              <GlobeAltIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Platforms Available</h3>
              <p className="text-gray-600 mb-4">Create platforms to assign products to different channels.</p>
              <button className="inline-flex items-center px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors">
                <PlusIcon className="w-4 h-4 mr-2" />
                Create Platform
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Assignment Preview */}
              {hasChanges && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <InformationCircleIcon className="w-5 h-5 text-blue-600 mr-2" />
                      <span className="text-sm font-medium text-blue-800">
                        {changeCount} platform assignment{changeCount !== 1 ? 's' : ''} pending
                      </span>
                    </div>
                    <button
                      onClick={handleReset}
                      className="text-xs text-blue-600 hover:text-blue-800 hover:underline"
                    >
                      Reset all
                    </button>
                  </div>
                </div>
              )}

              {/* Platform Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {platforms.map((platform) => {
                  const currentStats = platformStats[platform.id];
                  const effectiveStats = getEffectiveState(platform.id);
                  const assignment = assignments[platform.id];
                  const hasAssignment = !!assignment;

                  const isFullyAssigned = effectiveStats.assigned === effectiveStats.total && effectiveStats.total > 0;
                  const isPartiallyAssigned = effectiveStats.assigned > 0 && effectiveStats.assigned < effectiveStats.total;
                  const isNotAssigned = effectiveStats.assigned === 0;

                  return (
                    <div
                      key={platform.id}
                      className={`border rounded-lg p-4 transition-all ${
                        hasAssignment
                          ? 'border-blue-300 bg-blue-50'
                          : isFullyAssigned
                          ? 'border-green-300 bg-green-50'
                          : isPartiallyAssigned
                          ? 'border-yellow-300 bg-yellow-50'
                          : 'border-gray-200 bg-white hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center mb-2">
                            <SinglePlatformBadge
                              platform={platform}
                              size="md"
                              showIcon={true}
                              showTooltip={false}
                              className="mr-2"
                            />
                            {platform.isDefault && (
                              <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-600 rounded">
                                Default
                              </span>
                            )}
                          </div>

                          <h3 className="font-medium text-gray-900">{getLocalizedText(platform.name || '', language)}</h3>
                          {platform.description && (
                            <p className="text-sm text-gray-600 mt-1">{getLocalizedText(platform.description || '', language)}</p>
                          )}
                        </div>
                      </div>

                      {/* Current Status */}
                      <div className="mb-3">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-600">Current assignment:</span>
                          <span className={`font-medium ${
                            currentStats?.assigned === currentStats?.total && currentStats?.total > 0
                              ? 'text-green-600'
                              : currentStats?.assigned > 0
                              ? 'text-yellow-600'
                              : 'text-gray-500'
                          }`}>
                            {currentStats?.assigned || 0} of {currentStats?.total || 0} products
                          </span>
                        </div>

                        {/* Progress bar */}
                        <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                          <div
                            className={`h-2 rounded-full transition-all ${
                              currentStats?.assigned === currentStats?.total && currentStats?.total > 0
                                ? 'bg-green-500'
                                : currentStats?.assigned > 0
                                ? 'bg-yellow-500'
                                : 'bg-gray-300'
                            }`}
                            style={{
                              width: currentStats?.total > 0
                                ? `${(currentStats.assigned / currentStats.total) * 100}%`
                                : '0%'
                            }}
                          ></div>
                        </div>
                      </div>

                      {/* Assignment Preview */}
                      {hasAssignment && (
                        <div className="mb-3 p-2 bg-blue-100 rounded text-sm">
                          <div className="flex items-center justify-between">
                            <span className="text-blue-800">
                              After changes:
                            </span>
                            <span className="font-medium text-blue-900">
                              {effectiveStats.assigned} of {effectiveStats.total} products
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Action Buttons */}
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleExplicitAction(platform.id, 'assign')}
                          disabled={loading}
                          className={`flex-1 inline-flex items-center justify-center px-3 py-2 text-xs font-medium rounded-md transition-colors disabled:opacity-50 ${
                            assignment?.action === 'assign'
                              ? 'bg-blue-600 text-white'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          <CheckIcon className="w-4 h-4 mr-1" />
                          Assign All
                        </button>

                        <button
                          onClick={() => handleExplicitAction(platform.id, 'remove')}
                          disabled={loading}
                          className={`flex-1 inline-flex items-center justify-center px-3 py-2 text-xs font-medium rounded-md transition-colors disabled:opacity-50 ${
                            assignment?.action === 'remove'
                              ? 'bg-red-600 text-white'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          <XMarkIcon className="w-4 h-4 mr-1" />
                          Remove All
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
          <div className="text-sm text-gray-600">
            {selectedProducts.length} product{selectedProducts.length !== 1 ? 's' : ''} • {platforms.length} platform{platforms.length !== 1 ? 's' : ''}
          </div>

          <div className="flex space-x-3">
            <button
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              onClick={handleApplyAssignments}
              disabled={loading || !hasChanges}
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Applying...
                </>
              ) : (
                <>
                  <ArrowRightIcon className="w-4 h-4 mr-2" />
                  Apply Changes {hasChanges && `(${changeCount})`}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlatformAssignmentModal;