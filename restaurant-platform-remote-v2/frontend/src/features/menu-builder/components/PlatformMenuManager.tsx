// Platform Menu Manager - Main interface for platform-specific menu management
import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  PhoneIcon,
  TruckIcon,
  ShoppingBagIcon,
  GlobeAltIcon,
  ComputerDesktopIcon,
  PlusIcon,
  ArrowPathIcon,
  EyeIcon,
  Cog6ToothIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '../../../contexts/AuthContext';
import { useLanguage } from '../../../contexts/LanguageContext';
import { PLATFORMS, Platform, PlatformMenu, MenuBuilderState } from '../../../types/menu-builder';
import { MenuBuilderCanvas } from './MenuBuilderCanvas';
import { MenuItemSelector } from './MenuItemSelector';
import { SyncStatusIndicator } from './SyncStatusIndicator';
import { MenuTemplateGallery } from './MenuTemplateGallery';
import { MenuAnalyticsDashboard } from './MenuAnalyticsDashboard';
import toast from 'react-hot-toast';

interface PlatformMenuManagerProps {
  className?: string;
}

const PLATFORM_ICONS = {
  PhoneIcon,
  TruckIcon,
  ShoppingBagIcon,
  GlobeAltIcon,
  ComputerDesktopIcon
};

export const PlatformMenuManager: React.FC<PlatformMenuManagerProps> = ({
  className = ''
}) => {
  const { user } = useAuth();
  const { language, t } = useLanguage();
  const [activeView, setActiveView] = useState<'builder' | 'templates' | 'analytics'>('builder');
  const [selectedPlatform, setSelectedPlatform] = useState<Platform | null>(null);
  const [platformMenus, setPlatformMenus] = useState<Record<string, PlatformMenu>>({});
  const [builderState, setBuilderState] = useState<MenuBuilderState>({
    availableProducts: [],
    selectedProducts: [],
    previewMode: false,
    syncInProgress: false
  });
  const [loading, setLoading] = useState(false);

  // Initialize with first available platform
  useEffect(() => {
    const platforms = Object.values(PLATFORMS).filter(p => p.isActive);
    if (platforms.length > 0 && !selectedPlatform) {
      setSelectedPlatform(platforms[0]);
    }
  }, [selectedPlatform]);

  // Load platform menu data
  const loadPlatformMenu = useCallback(async (platformId: string) => {
    if (!user) return;

    setLoading(true);
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/menu/platforms/${platformId}/menu`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth-token')}`
        }
      });

      if (response.ok) {
        const menuData = await response.json();
        setPlatformMenus(prev => ({
          ...prev,
          [platformId]: menuData
        }));
      }
    } catch (error) {
      console.error('Failed to load platform menu:', error);
      toast.error('Failed to load menu data');
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Load menu when platform changes
  useEffect(() => {
    if (selectedPlatform) {
      loadPlatformMenu(selectedPlatform.id);
    }
  }, [selectedPlatform, loadPlatformMenu]);

  // Handle platform selection
  const handlePlatformSelect = useCallback((platform: Platform) => {
    setSelectedPlatform(platform);
    setBuilderState(prev => ({
      ...prev,
      selectedPlatform: platform,
      currentMenu: platformMenus[platform.id]
    }));
  }, [platformMenus]);

  // Handle menu sync
  const handleMenuSync = useCallback(async (platformId: string) => {
    setBuilderState(prev => ({ ...prev, syncInProgress: true }));

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/menu/platforms/${platformId}/sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth-token')}`
        }
      });

      if (response.ok) {
        toast.success('Menu sync initiated successfully');
        await loadPlatformMenu(platformId);
      } else {
        throw new Error('Sync failed');
      }
    } catch (error) {
      console.error('Menu sync error:', error);
      toast.error('Failed to sync menu');
    } finally {
      setBuilderState(prev => ({ ...prev, syncInProgress: false }));
    }
  }, [loadPlatformMenu]);

  // Platform sidebar with modern design
  const PlatformSidebar = useMemo(() => (
    <div className="w-80 bg-white border-r border-gray-200 flex flex-col h-full">
      {/* Sidebar Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Platform Menus</h2>
          <button
            onClick={() => setActiveView(activeView === 'templates' ? 'builder' : 'templates')}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            title="Template Gallery"
          >
            <PlusIcon className="w-5 h-5" />
          </button>
        </div>
        <p className="text-sm text-gray-500">
          Manage menus for different platforms and channels
        </p>
      </div>

      {/* Platform List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {Object.values(PLATFORMS).filter(p => p.isActive).map((platform) => {
          const IconComponent = PLATFORM_ICONS[platform.icon as keyof typeof PLATFORM_ICONS];
          const isSelected = selectedPlatform?.id === platform.id;
          const menu = platformMenus[platform.id];

          return (
            <motion.div
              key={platform.id}
              layout
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`relative p-4 rounded-xl border-2 transition-all duration-200 cursor-pointer group ${
                isSelected
                  ? `border-${platform.color}-500 bg-${platform.color}-50 shadow-lg`
                  : 'border-gray-200 hover:border-gray-300 hover:shadow-md'
              }`}
              onClick={() => handlePlatformSelect(platform)}
            >
              {/* Platform Header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    isSelected
                      ? `bg-${platform.color}-500 text-white`
                      : `bg-${platform.color}-100 text-${platform.color}-600`
                  }`}>
                    <IconComponent className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{platform.name}</h3>
                    <p className="text-xs text-gray-500">
                      {menu ? `${menu.metadata.activeProducts} active` : 'Not configured'}
                    </p>
                  </div>
                </div>

                {/* Sync Status */}
                <SyncStatusIndicator
                  status={menu?.syncStatus || 'draft'}
                  lastSync={menu?.lastSyncAt}
                  size="sm"
                />
              </div>

              {/* Platform Description */}
              <p className="text-xs text-gray-600 mb-3 line-clamp-2">
                {platform.description}
              </p>

              {/* Quick Stats */}
              {menu && (
                <div className="grid grid-cols-2 gap-2 mb-3">
                  <div className="text-center p-2 bg-white rounded-lg border border-gray-100">
                    <div className="text-lg font-bold text-gray-900">
                      {menu.metadata.totalProducts}
                    </div>
                    <div className="text-xs text-gray-500">Products</div>
                  </div>
                  <div className="text-center p-2 bg-white rounded-lg border border-gray-100">
                    <div className="text-lg font-bold text-gray-900">
                      {menu.metadata.categoryCount}
                    </div>
                    <div className="text-xs text-gray-500">Categories</div>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-between">
                <div className="flex space-x-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveView('analytics');
                    }}
                    className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-white rounded-lg transition-colors"
                    title="View Analytics"
                  >
                    <ChartBarIcon className="w-4 h-4" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setBuilderState(prev => ({ ...prev, previewMode: !prev.previewMode }));
                    }}
                    className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-white rounded-lg transition-colors"
                    title="Preview Menu"
                  >
                    <EyeIcon className="w-4 h-4" />
                  </button>
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleMenuSync(platform.id);
                  }}
                  disabled={builderState.syncInProgress}
                  className={`p-1.5 text-white rounded-lg transition-all ${
                    builderState.syncInProgress
                      ? 'bg-gray-400 cursor-not-allowed'
                      : `bg-${platform.color}-500 hover:bg-${platform.color}-600`
                  }`}
                  title="Sync Menu"
                >
                  <ArrowPathIcon className={`w-4 h-4 ${builderState.syncInProgress ? 'animate-spin' : ''}`} />
                </button>
              </div>

              {/* Selection Indicator */}
              {isSelected && (
                <motion.div
                  layoutId="selectedPlatform"
                  className="absolute inset-0 rounded-xl border-2 border-blue-500 pointer-events-none"
                  initial={false}
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Sidebar Footer */}
      <div className="p-4 border-t border-gray-200">
        <div className="flex items-center justify-between text-sm text-gray-500">
          <span>{Object.keys(platformMenus).length} platforms configured</span>
          <button className="p-1 hover:bg-gray-100 rounded">
            <Cog6ToothIcon className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  ), [selectedPlatform, platformMenus, activeView, builderState.syncInProgress, builderState.previewMode, handlePlatformSelect, handleMenuSync]);

  return (
    <div className={`platform-menu-manager flex h-full bg-gray-50 ${className}`}>
      {/* Platform Sidebar */}
      {PlatformSidebar}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col">
        {/* Content Header */}
        <div className="bg-white border-b border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {selectedPlatform ? `${selectedPlatform.name} Menu` : 'Select Platform'}
              </h1>
              <p className="text-gray-500 mt-1">
                {selectedPlatform?.description || 'Choose a platform to manage its menu'}
              </p>
            </div>

            {/* View Switcher */}
            <div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
              {[
                { key: 'builder', label: 'Builder', icon: Cog6ToothIcon },
                { key: 'templates', label: 'Templates', icon: PlusIcon },
                { key: 'analytics', label: 'Analytics', icon: ChartBarIcon }
              ].map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  onClick={() => setActiveView(key as any)}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-md transition-all ${
                    activeView === key
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="text-sm font-medium">{label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Dynamic Content */}
        <div className="flex-1 overflow-hidden">
          <AnimatePresence mode="wait">
            {activeView === 'builder' && selectedPlatform && (
              <motion.div
                key="builder"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="h-full flex"
              >
                <MenuItemSelector
                  platform={selectedPlatform}
                  menu={platformMenus[selectedPlatform.id]}
                  builderState={builderState}
                  onStateChange={setBuilderState}
                  className="w-1/3"
                />
                <MenuBuilderCanvas
                  platform={selectedPlatform}
                  menu={platformMenus[selectedPlatform.id]}
                  builderState={builderState}
                  onStateChange={setBuilderState}
                  className="flex-1"
                />
              </motion.div>
            )}

            {activeView === 'templates' && (
              <motion.div
                key="templates"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="h-full"
              >
                <MenuTemplateGallery
                  selectedPlatform={selectedPlatform}
                  onTemplateSelect={(template) => {
                    // Handle template application
                    toast.success(`Template "${template.name}" applied`);
                    setActiveView('builder');
                  }}
                />
              </motion.div>
            )}

            {activeView === 'analytics' && selectedPlatform && (
              <motion.div
                key="analytics"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="h-full"
              >
                <MenuAnalyticsDashboard
                  platform={selectedPlatform}
                  menu={platformMenus[selectedPlatform.id]}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};