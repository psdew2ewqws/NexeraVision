import React, { useState, useEffect, useCallback } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import {
  ChevronRightIcon,
  HomeIcon,
  DocumentDuplicateIcon,
  ExclamationTriangleIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  XCircleIcon,
  EyeIcon,
  ClockIcon,
  ArrowLeftIcon,
  Cog6ToothIcon
} from '@heroicons/react/24/outline';
import { ProtectedRoute } from '../../src/components/shared/ProtectedRoute';
import { useAuth } from '../../src/contexts/AuthContext';
import toast from 'react-hot-toast';

interface SavedMenu {
  id: string;
  name: string;
  description?: string;
  status: 'active' | 'draft' | 'inactive';
  productCount: number;
  platform?: {
    id: string;
    name: string;
    displayName: any;
    platformType: string;
  };
  items: Array<{
    id: string;
    product: {
      id: string;
      name: string;
      description?: string;
      basePrice: number;
      imageUrl?: string;
      category?: {
        id: string;
        name: string;
      };
    };
    displayOrder: number;
    notes?: string;
  }>;
  createdAt: string;
  updatedAt: string;
  lastSync?: string;
  createdBy?: {
    id: string;
    name: string;
  };
}

interface Platform {
  id: string;
  name: string;
  displayName: any;
  platformType: string;
  status: number;
  isConnected?: boolean;
}

export default function MenuListPage() {
  const { user, isLoading: authLoading, isAuthenticated, isHydrated } = useAuth();
  const router = useRouter();
  const [savedMenus, setSavedMenus] = useState<SavedMenu[]>([]);
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMenus, setSelectedMenus] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [syncingMenus, setSyncingMenus] = useState<Set<string>>(new Set());
  const [expandedMenus, setExpandedMenus] = useState<Set<string>>(new Set());
  const [deletingMenus, setDeletingMenus] = useState<Set<string>>(new Set());

  // Wait for auth to hydrate before showing content
  useEffect(() => {
    if (!isHydrated) return;

    // Redirect to login if not authenticated after hydration is complete
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
      return;
    }
  }, [isHydrated, authLoading, isAuthenticated, router]);

  // Load saved menus
  const loadSavedMenus = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      const authToken = localStorage.getItem('auth-token');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/menu/saved-menus`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });

      if (response.ok) {
        const data = await response.json();
        setSavedMenus(data.menus || []);
      } else {
        throw new Error('Failed to load saved menus');
      }
    } catch (error) {
      console.error('Failed to load saved menus:', error);
      toast.error('Failed to load saved menus');
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Load platforms
  const loadPlatforms = useCallback(async () => {
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
          isConnected: p.status === 1
        }));
        setPlatforms(connectedPlatforms);
      }
    } catch (error) {
      console.error('Failed to load platforms:', error);
    }
  }, [user]);

  // Load data on mount
  useEffect(() => {
    if (isAuthenticated) {
      loadSavedMenus();
      loadPlatforms();
    }
  }, [isAuthenticated, loadSavedMenus, loadPlatforms]);

  // Handle menu sync to platform
  const handleMenuSync = async (menuId: string, platformId: string) => {
    setSyncingMenus(prev => new Set(prev).add(menuId));

    try {
      const authToken = localStorage.getItem('auth-token');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/platforms/${platformId}/sync-menu`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ menuId })
      });

      if (response.ok) {
        const platform = platforms.find(p => p.id === platformId);
        const platformName = typeof platform?.displayName === 'string'
          ? platform.displayName
          : platform?.displayName?.en || platform?.name || 'Platform';

        toast.success(`Menu synced to ${platformName} successfully!`);

        // Update menu with last sync time
        setSavedMenus(prev => prev.map(menu =>
          menu.id === menuId
            ? { ...menu, lastSync: new Date().toISOString() }
            : menu
        ));
      } else {
        throw new Error('Sync failed');
      }
    } catch (error) {
      console.error('Menu sync error:', error);
      toast.error('Failed to sync menu');
    } finally {
      setSyncingMenus(prev => {
        const newSet = new Set(prev);
        newSet.delete(menuId);
        return newSet;
      });
    }
  };

  // Handle menu deletion
  const handleDeleteMenu = async (menuId: string) => {
    if (!confirm('Are you sure you want to delete this menu? This action cannot be undone.')) {
      return;
    }

    setDeletingMenus(prev => new Set(prev).add(menuId));

    try {
      const authToken = localStorage.getItem('auth-token');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/menu/saved-menus/${menuId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${authToken}` }
      });

      if (response.ok) {
        setSavedMenus(prev => prev.filter(menu => menu.id !== menuId));
        toast.success('Menu deleted successfully');
      } else {
        throw new Error('Failed to delete menu');
      }
    } catch (error) {
      console.error('Delete menu error:', error);
      toast.error('Failed to delete menu');
    } finally {
      setDeletingMenus(prev => {
        const newSet = new Set(prev);
        newSet.delete(menuId);
        return newSet;
      });
    }
  };

  // Toggle menu expansion
  const toggleMenuExpansion = (menuId: string) => {
    setExpandedMenus(prev => {
      const newSet = new Set(prev);
      if (newSet.has(menuId)) {
        newSet.delete(menuId);
      } else {
        newSet.add(menuId);
      }
      return newSet;
    });
  };

  // Filter menus based on search and status
  const filteredMenus = savedMenus.filter(menu => {
    const matchesSearch = menu.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         menu.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         false;
    const matchesStatus = statusFilter === 'all' || menu.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Format time ago
  const formatTimeAgo = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'draft': return 'bg-yellow-100 text-yellow-800';
      case 'inactive': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Show loading during auth hydration
  if (!isHydrated || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading authentication...</p>
        </div>
      </div>
    );
  }

  // Show login redirect if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <ExclamationTriangleIcon className="w-12 h-12 text-amber-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Authentication Required</h1>
          <p className="text-gray-600 mb-6">Please log in to access the menu management system.</p>
          <button
            onClick={() => router.push('/login')}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <ProtectedRoute>
      <Head>
        <title>Menu List Management - Restaurant Platform</title>
        <meta name="description" content="Manage and organize your restaurant menu lists across different platforms" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <div className="min-h-screen bg-gray-50">
        {/* Header with breadcrumb navigation */}
        <div className="bg-white shadow-sm border-b border-gray-200">
          <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8">
            {/* Breadcrumb */}
            <nav className="flex items-center space-x-2 text-sm text-gray-500 py-3">
              <Link href="/dashboard" className="hover:text-gray-700 transition-colors">
                <HomeIcon className="w-4 h-4" />
              </Link>
              <ChevronRightIcon className="w-4 h-4" />
              <span>Menu Management</span>
              <ChevronRightIcon className="w-4 h-4" />
              <span className="text-gray-900 font-medium">Menu Lists</span>
            </nav>

            {/* Page Header */}
            <div className="flex items-center justify-between py-6">
              <div className="flex items-center space-x-4">
                <Link href="/dashboard" className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors">
                  <ArrowLeftIcon className="w-4 h-4 mr-2" />
                  Back to Dashboard
                </Link>
                <div className="h-6 w-px bg-gray-300"></div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Menu Lists</h1>
                  <p className="mt-1 text-sm text-gray-600">
                    Manage and organize your saved menu configurations for different platforms
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center space-x-3">
                <Link
                  href="/menu/builder"
                  className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
                >
                  <PlusIcon className="w-4 h-4 mr-2" />
                  Create New Menu
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Filters and Search */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
            <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
              <div className="flex flex-col sm:flex-row gap-4 flex-1">
                {/* Search */}
                <div className="flex-1 max-w-md">
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search menus..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                {/* Status Filter */}
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="all">All Status</option>
                  <option value="active">Active</option>
                  <option value="draft">Draft</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>

              {/* Stats */}
              <div className="flex items-center space-x-6 text-sm text-gray-600">
                <div className="flex items-center space-x-1">
                  <DocumentDuplicateIcon className="w-4 h-4" />
                  <span>{filteredMenus.length} menus</span>
                </div>
                <div className="flex items-center space-x-1">
                  <CheckCircleIcon className="w-4 h-4 text-green-500" />
                  <span>{filteredMenus.filter(m => m.status === 'active').length} active</span>
                </div>
              </div>
            </div>
          </div>

          {/* Menu List */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <span className="ml-3 text-gray-600">Loading menus...</span>
              </div>
            ) : filteredMenus.length === 0 ? (
              <div className="text-center py-12">
                <DocumentDuplicateIcon className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No menus found</h3>
                <p className="text-gray-500 mb-6">Get started by creating your first menu configuration.</p>
                <Link
                  href="/menu/builder"
                  className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700"
                >
                  <PlusIcon className="w-4 h-4 mr-2" />
                  Create First Menu
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {filteredMenus.map((menu) => {
                  const isExpanded = expandedMenus.has(menu.id);
                  const isSyncing = syncingMenus.has(menu.id);
                  const isDeleting = deletingMenus.has(menu.id);

                  return (
                    <div key={menu.id} className="hover:bg-gray-50 transition-colors">
                      {/* Menu Header */}
                      <div className="p-6">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4 flex-1">
                            <button
                              onClick={() => toggleMenuExpansion(menu.id)}
                              className="flex-shrink-0 p-1 rounded-md hover:bg-gray-100 transition-colors"
                            >
                              <ChevronRightIcon className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                            </button>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center space-x-3">
                                <h3 className="text-lg font-semibold text-gray-900 truncate">{menu.name}</h3>
                                <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(menu.status)}`}>
                                  {menu.status}
                                </span>
                              </div>
                              {menu.description && (
                                <p className="mt-1 text-sm text-gray-600 truncate">{menu.description}</p>
                              )}
                              <div className="mt-2 flex items-center space-x-4 text-xs text-gray-500">
                                <span>{menu.productCount} products</span>
                                <span>•</span>
                                <span>Created {formatTimeAgo(menu.createdAt)}</span>
                                {menu.lastSync && (
                                  <>
                                    <span>•</span>
                                    <span className="flex items-center space-x-1">
                                      <CheckCircleIcon className="w-3 h-3 text-green-500" />
                                      <span>Synced {formatTimeAgo(menu.lastSync)}</span>
                                    </span>
                                  </>
                                )}
                                {menu.createdBy && (
                                  <>
                                    <span>•</span>
                                    <span>by {menu.createdBy.name}</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex items-center space-x-2">
                            {/* Platform Sync Buttons */}
                            {platforms.filter(p => p.isConnected).map(platform => {
                              const platformName = typeof platform.displayName === 'string'
                                ? platform.displayName
                                : platform.displayName?.en || platform.name;

                              return (
                                <button
                                  key={platform.id}
                                  onClick={() => handleMenuSync(menu.id, platform.id)}
                                  disabled={isSyncing}
                                  className={`text-xs px-3 py-1 rounded-md font-medium transition-colors ${
                                    platform.platformType === 'delivery' ? 'bg-blue-100 text-blue-700 hover:bg-blue-200' :
                                    platform.platformType === 'website' ? 'bg-green-100 text-green-700 hover:bg-green-200' :
                                    'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                                  title={`Sync to ${platformName}`}
                                >
                                  {isSyncing ? (
                                    <div className="flex items-center space-x-1">
                                      <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-current"></div>
                                      <span>Syncing...</span>
                                    </div>
                                  ) : (
                                    <div className="flex items-center space-x-1">
                                      <ArrowPathIcon className="w-3 h-3" />
                                      <span>{platformName}</span>
                                    </div>
                                  )}
                                </button>
                              );
                            })}

                            {/* Edit Button */}
                            <Link
                              href={`/menu/builder?edit=${menu.id}`}
                              className="inline-flex items-center px-3 py-1 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
                            >
                              <PencilIcon className="w-4 h-4 mr-1" />
                              Edit
                            </Link>

                            {/* Delete Button */}
                            <button
                              onClick={() => handleDeleteMenu(menu.id)}
                              disabled={isDeleting}
                              className="inline-flex items-center px-3 py-1 text-sm font-medium text-red-700 bg-red-50 border border-red-200 rounded-md hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {isDeleting ? (
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600 mr-1"></div>
                              ) : (
                                <TrashIcon className="w-4 h-4 mr-1" />
                              )}
                              Delete
                            </button>
                          </div>
                        </div>

                        {/* Expanded Menu Items */}
                        {isExpanded && menu.items && menu.items.length > 0 && (
                          <div className="mt-6 border-t border-gray-200 pt-6">
                            <h4 className="text-sm font-medium text-gray-900 mb-4">Menu Items ({menu.items.length})</h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                              {menu.items.slice(0, 12).map((item) => (
                                <div key={item.id} className="border border-gray-200 rounded-lg p-3 hover:border-gray-300 transition-colors">
                                  <div className="flex items-start space-x-3">
                                    {item.product.imageUrl ? (
                                      <img
                                        src={item.product.imageUrl}
                                        alt={item.product.name}
                                        className="w-12 h-12 rounded-lg object-cover flex-shrink-0"
                                      />
                                    ) : (
                                      <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                        <DocumentDuplicateIcon className="w-6 h-6 text-gray-400" />
                                      </div>
                                    )}
                                    <div className="flex-1 min-w-0">
                                      <h5 className="text-sm font-medium text-gray-900 truncate">{item.product.name}</h5>
                                      <p className="text-xs text-gray-500 truncate">{item.product.category?.name}</p>
                                      <p className="text-sm font-medium text-gray-900 mt-1">${item.product.basePrice.toFixed(2)}</p>
                                    </div>
                                  </div>
                                </div>
                              ))}
                              {menu.items.length > 12 && (
                                <div className="border border-gray-200 rounded-lg p-3 flex items-center justify-center bg-gray-50">
                                  <span className="text-sm text-gray-600">+{menu.items.length - 12} more items</span>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Help Section */}
          <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h3 className="text-lg font-medium text-blue-900 mb-2">Menu Management Tips</h3>
            <div className="text-sm text-blue-800 space-y-2">
              <p>
                Effectively manage your restaurant menus across different platforms and scenarios:
              </p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>Use the <strong>Sync buttons</strong> to push menu changes to connected delivery platforms instantly</li>
                <li>Click <strong>Edit</strong> to modify menu configurations in the Menu Builder</li>
                <li>Expand menus to preview items and verify product selections</li>
                <li>Monitor sync status to ensure all platforms have the latest menu updates</li>
                <li>Use different menu statuses: <em>Active</em> for live menus, <em>Draft</em> for work in progress</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}