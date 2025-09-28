import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { ArrowLeftIcon, CogIcon, ArrowPathIcon, CheckCircleIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { ProtectedRoute } from '../../src/components/shared/ProtectedRoute';
import MenuBuilder from '../../src/components/menu/MenuBuilder';
import toast from 'react-hot-toast';
import { useAuth } from '../../src/contexts/AuthContext';

interface Platform {
  id: string;
  name: string;
  displayName: string | { ar?: string; en?: string } | any;
  platformType: string;
  status: number;
  isConnected?: boolean;
  lastSync?: string;
}

export default function MenuBuilderPage() {
  const { user } = useAuth();
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [platformsLoading, setPlatformsLoading] = useState(true);
  const [syncingPlatforms, setSyncingPlatforms] = useState<Set<string>>(new Set());
  const [lastSyncTimes, setLastSyncTimes] = useState<Record<string, string>>({});

  // Load connected platforms
  useEffect(() => {
    const loadPlatforms = async () => {
      if (!user) return;

      try {
        const authToken = localStorage.getItem('auth-token');
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/platforms`, {
          headers: { 'Authorization': `Bearer ${authToken}` }
        });

        if (response.ok) {
          const data = await response.json();
          const connectedPlatforms = (data.platforms || []).map((p: any) => ({
            ...p,
            isConnected: p.status === 1,
            lastSync: p.lastSync || null
          }));
          setPlatforms(connectedPlatforms);

          // Initialize last sync times
          const syncTimes: Record<string, string> = {};
          connectedPlatforms.forEach((p: Platform) => {
            if (p.lastSync) {
              syncTimes[p.id] = p.lastSync;
            }
          });
          setLastSyncTimes(syncTimes);
        }
      } catch (error) {
        console.error('Failed to load platforms:', error);
      } finally {
        setPlatformsLoading(false);
      }
    };

    loadPlatforms();
  }, [user]);

  const handleSaveMenu = async (menuData: any) => {
    try {
      const authToken = localStorage.getItem('auth-token');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/menu/saved-menus`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: menuData.name,
          description: `Menu with ${menuData.productIds.length} products for branches and channels`,
          status: 'active',
          productIds: menuData.productIds
        })
      });

      if (response.ok) {
        toast.success(`Menu "${menuData.name}" saved successfully!`);
        // Could redirect to menu list
        // router.push('/menu/list');
      } else {
        throw new Error('Failed to save menu');
      }
    } catch (error) {
      console.error('Save menu error:', error);
      toast.error('Failed to save menu');
    }
  };

  const handlePlatformSync = async (platformId: string, menuName?: string) => {
    if (!menuName) {
      toast.error('Please save the menu first before syncing to platforms');
      return;
    }

    setSyncingPlatforms(prev => new Set(prev).add(platformId));

    try {
      const authToken = localStorage.getItem('auth-token');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/platforms/${platformId}/sync`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ menuName })
      });

      if (response.ok) {
        const platform = platforms.find(p => p.id === platformId);
        const platformName = typeof platform?.displayName === 'string'
          ? platform.displayName
          : (platform?.displayName && typeof platform.displayName === 'object')
            ? platform.displayName.en || platform.displayName.ar || platform.name
            : platform?.name || 'Platform';

        toast.success(`Menu synced to ${platformName} successfully!`);
        setLastSyncTimes(prev => ({
          ...prev,
          [platformId]: new Date().toISOString()
        }));
      } else {
        throw new Error('Sync failed');
      }
    } catch (error) {
      console.error('Platform sync error:', error);
      const platform = platforms.find(p => p.id === platformId);
      const platformName = typeof platform?.displayName === 'string'
        ? platform.displayName
        : (platform?.displayName && typeof platform.displayName === 'object')
          ? platform.displayName.en || platform.displayName.ar || platform.name
          : platform?.name || 'Platform';
      toast.error(`Failed to sync to ${platformName}`);
    } finally {
      setSyncingPlatforms(prev => {
        const newSet = new Set(prev);
        newSet.delete(platformId);
        return newSet;
      });
    }
  };

  const formatLastSync = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  return (
    <ProtectedRoute>
      <Head>
        <title>Menu Builder - Restaurant Management</title>
        <meta name="description" content="Create and customize menus for branches and channels" />
      </Head>

      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              {/* Navigation with Back Button */}
              <div className="flex items-center space-x-4">
                <Link href="/menu/list" className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors">
                  <ArrowLeftIcon className="w-4 h-4 mr-2" />
                  Menu List
                </Link>
                <div className="h-6 w-px bg-gray-300"></div>
                <div className="flex items-center space-x-2">
                  <CogIcon className="w-5 h-5 text-gray-600" />
                  <div>
                    <h1 className="text-lg font-semibold text-gray-900">Menu Builder</h1>
                    <p className="text-sm text-gray-500">Create custom menus for branches and channels</p>
                  </div>
                </div>
              </div>

              {/* Right Side Actions */}
              <div className="flex items-center space-x-3">
                <Link
                  href="/menu/list"
                  className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
                >
                  View Saved Menus
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Platform Sync Status Bar */}
        {!platformsLoading && platforms.length > 0 && (
          <div className="bg-blue-50 border-b border-blue-200">
            <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <ArrowPathIcon className="w-5 h-5 text-blue-600" />
                  <h3 className="text-sm font-medium text-blue-900">Platform Sync Status</h3>
                </div>
                <div className="flex items-center space-x-4">
                  {platforms.filter(p => p.isConnected).map(platform => {
                    const platformName = typeof platform.displayName === 'string'
                      ? platform.displayName
                      : (platform.displayName && typeof platform.displayName === 'object')
                        ? platform.displayName.en || platform.displayName.ar || platform.name
                        : platform.name || 'Platform';
                    const issyncing = syncingPlatforms.has(platform.id);
                    const lastSync = lastSyncTimes[platform.id];

                    return (
                      <div key={platform.id} className="flex items-center space-x-2">
                        <div className={`w-2 h-2 rounded-full ${
                          issyncing ? 'bg-yellow-400 animate-pulse' :
                          lastSync ? 'bg-green-500' : 'bg-gray-400'
                        }`} />
                        <span className="text-xs font-medium text-blue-900">{platformName}</span>
                        {lastSync && (
                          <span className="text-xs text-blue-700">({formatLastSync(lastSync)})</span>
                        )}
                        <button
                          onClick={() => handlePlatformSync(platform.id, 'Current Menu')}
                          disabled={issyncing}
                          className="text-xs px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          {issyncing ? 'Syncing...' : 'Push'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Main Content */}
        <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Introduction */}
          <div className="mb-8">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <div className="flex">
                <div className="flex-shrink-0">
                  <CogIcon className="h-5 w-5 text-blue-400" />
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-blue-800">
                    Welcome to Menu Builder
                  </h3>
                  <div className="mt-2 text-sm text-blue-700">
                    <p>Create customized menus by:</p>
                    <ul className="list-disc list-inside mt-1 space-y-1">
                      <li>Giving your menu a descriptive name</li>
                      <li>Selecting target branches (5B Mall, Al-Wehdeh, Abdoun, etc.)</li>
                      <li>Choosing available channels (Delivery, Pickup, Dine-in, etc.)</li>
                      <li>Selecting products to include in this menu</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Menu Builder Component */}
          <MenuBuilder
            onSave={handleSaveMenu}
            className="mb-8"
          />

          {/* Platform Sync Section */}
          {!platformsLoading && platforms.length > 0 && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-8">
              <div className="border-b border-gray-200 px-6 py-4">
                <div className="flex items-center space-x-2">
                  <ArrowPathIcon className="h-5 w-5 text-gray-600" />
                  <h3 className="text-lg font-semibold text-gray-900">Platform Sync</h3>
                </div>
                <p className="text-sm text-gray-500 mt-1">Push your menu changes to connected delivery platforms</p>
              </div>

              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {platforms.filter(p => p.isConnected).map(platform => {
                    const platformName = typeof platform.displayName === 'string'
                      ? platform.displayName
                      : (platform.displayName && typeof platform.displayName === 'object')
                        ? platform.displayName.en || platform.displayName.ar || platform.name
                        : platform.name || 'Platform';
                    const issyncing = syncingPlatforms.has(platform.id);
                    const lastSync = lastSyncTimes[platform.id];

                    return (
                      <div key={platform.id} className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center space-x-2">
                            <div className={`w-3 h-3 rounded-full ${
                              issyncing ? 'bg-yellow-400 animate-pulse' :
                              lastSync ? 'bg-green-500' : 'bg-gray-400'
                            }`} />
                            <h4 className="font-medium text-gray-900">{platformName}</h4>
                          </div>
                          <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                            platform.platformType === 'delivery' ? 'bg-blue-100 text-blue-700' :
                            platform.platformType === 'website' ? 'bg-green-100 text-green-700' :
                            'bg-gray-100 text-gray-700'
                          }`}>
                            {platform.platformType}
                          </span>
                        </div>

                        <div className="text-xs text-gray-600 mb-3">
                          {lastSync ? (
                            <div className="flex items-center space-x-1">
                              <CheckCircleIcon className="w-3 h-3 text-green-500" />
                              <span>Last sync: {formatLastSync(lastSync)}</span>
                            </div>
                          ) : (
                            <div className="flex items-center space-x-1">
                              <ExclamationTriangleIcon className="w-3 h-3 text-gray-400" />
                              <span>Never synced</span>
                            </div>
                          )}
                        </div>

                        <button
                          onClick={() => handlePlatformSync(platform.id, 'Current Menu')}
                          disabled={issyncing}
                          className={`w-full text-sm px-3 py-2 rounded-md font-medium transition-colors ${
                            issyncing
                              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                              : 'bg-blue-600 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2'
                          }`}
                        >
                          {issyncing ? (
                            <div className="flex items-center justify-center">
                              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-gray-400 mr-2"></div>
                              Syncing...
                            </div>
                          ) : (
                            'Push to Platform'
                          )}
                        </button>
                      </div>
                    );
                  })}
                </div>

                {platforms.filter(p => p.isConnected).length === 0 && (
                  <div className="text-center py-8">
                    <ExclamationTriangleIcon className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <h4 className="text-lg font-medium text-gray-900 mb-2">No Connected Platforms</h4>
                    <p className="text-gray-500 mb-4">Connect to delivery platforms to sync your menus automatically.</p>
                    <Link
                      href="/settings/delivery"
                      className="inline-flex items-center px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-700"
                    >
                      Configure Platforms
                    </Link>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Tips and Best Practices */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
            <h3 className="text-sm font-medium text-gray-900 mb-3">💡 Best Practices</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Menu Organization</h4>
                <ul className="space-y-1">
                  <li>• Use descriptive menu names (e.g., "Weekend Brunch Menu")</li>
                  <li>• Group similar products together</li>
                  <li>• Consider seasonal availability</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Channel Strategy</h4>
                <ul className="space-y-1">
                  <li>• Different channels may have different product sets</li>
                  <li>• Consider delivery packaging for delivery channels</li>
                  <li>• Verify all products are available at selected branches</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}