import React, { useState, useEffect } from 'react';
import {
  PlusIcon,
  DocumentDuplicateIcon,
  PencilIcon,
  TrashIcon,
  CalendarIcon,
  CheckIcon,
  EyeIcon
} from '@heroicons/react/24/outline';
import { Platform } from '../../../types/menu';

interface SavedMenu {
  id: string;
  name: string;
  description?: string;
  productCount: number;
  createdAt: string;
  updatedAt: string;
  status: 'active' | 'draft' | 'archived';
}

interface MenuListManagerProps {
  platform?: Platform;
}

export const MenuListManager: React.FC<MenuListManagerProps> = ({ platform }) => {
  const [savedMenus, setSavedMenus] = useState<SavedMenu[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newMenuName, setNewMenuName] = useState('');
  const [newMenuDescription, setNewMenuDescription] = useState('');

  useEffect(() => {
    if (platform) {
      loadSavedMenus();
    }
  }, [platform]);

  const loadSavedMenus = async () => {
    try {
      setLoading(true);

      // Mock data for now - replace with actual API call
      const mockMenus: SavedMenu[] = [
        {
          id: '1',
          name: 'Main Menu',
          description: 'Primary restaurant menu with all categories',
          productCount: 25,
          createdAt: '2024-01-15T10:00:00Z',
          updatedAt: '2024-01-20T14:30:00Z',
          status: 'active'
        },
        {
          id: '2',
          name: 'Lunch Special',
          description: 'Limited lunch menu for quick service',
          productCount: 12,
          createdAt: '2024-01-10T09:00:00Z',
          updatedAt: '2024-01-18T11:00:00Z',
          status: 'active'
        },
        {
          id: '3',
          name: 'Weekend Brunch',
          description: 'Weekend brunch menu with specialty items',
          productCount: 18,
          createdAt: '2024-01-08T08:00:00Z',
          updatedAt: '2024-01-15T16:00:00Z',
          status: 'draft'
        }
      ];

      setSavedMenus(mockMenus);
    } catch (error) {
      console.error('Failed to load saved menus:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateMenu = async () => {
    if (!newMenuName.trim()) return;

    try {
      // For now, just add to local state - replace with actual API call
      const newMenu: SavedMenu = {
        id: Date.now().toString(),
        name: newMenuName,
        description: newMenuDescription,
        productCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        status: 'draft'
      };

      setSavedMenus(prev => [newMenu, ...prev]);
      setShowCreateModal(false);
      setNewMenuName('');
      setNewMenuDescription('');
    } catch (error) {
      console.error('Failed to create menu:', error);
    }
  };

  const handleDeleteMenu = async (menuId: string) => {
    if (!confirm('Are you sure you want to delete this menu?')) return;

    try {
      setSavedMenus(prev => prev.filter(menu => menu.id !== menuId));
    } catch (error) {
      console.error('Failed to delete menu:', error);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (status: string) => {
    const statusStyles = {
      active: 'bg-green-100 text-green-800',
      draft: 'bg-yellow-100 text-yellow-800',
      archived: 'bg-gray-100 text-gray-800'
    };

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusStyles[status] || statusStyles.draft}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  if (!platform) {
    return (
      <div className="text-center py-12">
        <DocumentDuplicateIcon className="w-12 h-12 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Platform Selected</h3>
        <p className="text-gray-500">Select a platform to manage menus.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Saved Menus</h2>
          <p className="text-sm text-gray-600">Manage and organize your platform menus</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          <PlusIcon className="w-4 h-4 mr-2" />
          Create Menu
        </button>
      </div>

      {/* Menu List */}
      {loading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-gray-500 mt-2">Loading menus...</p>
        </div>
      ) : savedMenus.length === 0 ? (
        <div className="text-center py-12">
          <DocumentDuplicateIcon className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Menus Found</h3>
          <p className="text-gray-500 mb-4">Create your first menu to get started.</p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700"
          >
            <PlusIcon className="w-4 h-4 mr-2" />
            Create Menu
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {savedMenus.map((menu) => (
            <div key={menu.id} className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-lg font-medium text-gray-900 mb-1">{menu.name}</h3>
                  {menu.description && (
                    <p className="text-sm text-gray-600 mb-2">{menu.description}</p>
                  )}
                  <div className="flex items-center space-x-4 text-sm text-gray-500">
                    <span>{menu.productCount} items</span>
                    <span>•</span>
                    <span className="flex items-center">
                      <CalendarIcon className="w-4 h-4 mr-1" />
                      {formatDate(menu.updatedAt)}
                    </span>
                  </div>
                </div>
                <div className="ml-4">
                  {getStatusBadge(menu.status)}
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                <div className="flex items-center space-x-2">
                  <button
                    className="inline-flex items-center px-2 py-1 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded"
                    title="View Menu"
                  >
                    <EyeIcon className="w-3 h-3 mr-1" />
                    View
                  </button>
                  <button
                    className="inline-flex items-center px-2 py-1 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded"
                    title="Edit Menu"
                  >
                    <PencilIcon className="w-3 h-3 mr-1" />
                    Edit
                  </button>
                </div>
                <button
                  onClick={() => handleDeleteMenu(menu.id)}
                  className="inline-flex items-center px-2 py-1 text-xs font-medium text-red-700 bg-red-100 hover:bg-red-200 rounded"
                  title="Delete Menu"
                >
                  <TrashIcon className="w-3 h-3 mr-1" />
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Menu Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Create New Menu</h3>

            <div className="space-y-4">
              <div>
                <label htmlFor="menuName" className="block text-sm font-medium text-gray-700 mb-1">
                  Menu Name *
                </label>
                <input
                  id="menuName"
                  type="text"
                  value={newMenuName}
                  onChange={(e) => setNewMenuName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter menu name"
                />
              </div>

              <div>
                <label htmlFor="menuDescription" className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  id="menuDescription"
                  value={newMenuDescription}
                  onChange={(e) => setNewMenuDescription(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter menu description (optional)"
                />
              </div>
            </div>

            <div className="flex items-center justify-end space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setNewMenuName('');
                  setNewMenuDescription('');
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateMenu}
                disabled={!newMenuName.trim()}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed rounded-md"
              >
                Create Menu
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};