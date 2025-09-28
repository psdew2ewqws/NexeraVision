// Platform Management Component - Create, Edit, Rename Platforms
import React, { useState, useEffect } from 'react';
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  CheckIcon,
  XMarkIcon,
  BuildingStorefrontIcon,
  TruckIcon,
  PhoneIcon,
  GlobeAltIcon,
  ComputerDesktopIcon,
  DevicePhoneMobileIcon,
  CubeIcon
} from '@heroicons/react/24/outline';
import { getLocalizedText } from '../../../lib/menu-utils';
import { useLanguage } from '../../../contexts/LanguageContext';
import { Platform } from '../../../types/menu';

interface PlatformManagementProps {
  onPlatformSelect?: (platform: Platform) => void;
  selectedPlatform?: Platform | null;
}

const ICON_MAP = {
  'BuildingStorefrontIcon': BuildingStorefrontIcon,
  'TruckIcon': TruckIcon,
  'PhoneIcon': PhoneIcon,
  'GlobeAltIcon': GlobeAltIcon,
  'ComputerDesktopIcon': ComputerDesktopIcon,
  'DevicePhoneMobileIcon': DevicePhoneMobileIcon,
  'CubeIcon': CubeIcon
};

const COLOR_OPTIONS = [
  '#10B981', // Emerald
  '#F59E0B', // Amber
  '#3B82F6', // Blue
  '#8B5CF6', // Purple
  '#06B6D4', // Cyan
  '#EF4444', // Red
  '#F97316', // Orange
  '#6B7280'  // Gray
];

export const PlatformManagement: React.FC<PlatformManagementProps> = ({
  onPlatformSelect,
  selectedPlatform
}) => {
  const { language } = useLanguage();
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingPlatform, setEditingPlatform] = useState<Platform | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    color: COLOR_OPTIONS[0],
    icon: 'CubeIcon'
  });

  // Load platforms from backend
  useEffect(() => {
    loadPlatforms();
  }, []);

  const loadPlatforms = async () => {
    setLoading(true);
    try {
      const authToken = localStorage.getItem('auth-token');
      if (!authToken) return;

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/menu/platforms`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });

      if (response.ok) {
        const data = await response.json();
        setPlatforms(data.platforms || []);
      }
    } catch (error) {
      console.error('Failed to load platforms:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePlatform = async () => {
    try {
      const authToken = localStorage.getItem('auth-token');
      if (!authToken) return;

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/menu/platforms`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        await loadPlatforms();
        setShowCreateForm(false);
        setFormData({ name: '', description: '', color: COLOR_OPTIONS[0], icon: 'CubeIcon' });
      }
    } catch (error) {
      console.error('Failed to create platform:', error);
    }
  };

  const handleUpdatePlatform = async (platformId: string, updateData: any) => {
    try {
      const authToken = localStorage.getItem('auth-token');
      if (!authToken) return;

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/menu/platforms/${platformId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updateData)
      });

      if (response.ok) {
        await loadPlatforms();
        setEditingPlatform(null);
      }
    } catch (error) {
      console.error('Failed to update platform:', error);
    }
  };

  const handleDeletePlatform = async (platformId: string) => {
    if (!confirm('Are you sure you want to delete this platform?')) return;

    try {
      const authToken = localStorage.getItem('auth-token');
      if (!authToken) return;

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/menu/platforms/${platformId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${authToken}` }
      });

      if (response.ok) {
        await loadPlatforms();
      }
    } catch (error) {
      console.error('Failed to delete platform:', error);
    }
  };

  const getIconComponent = (iconName: string) => {
    const IconComponent = ICON_MAP[iconName as keyof typeof ICON_MAP] || CubeIcon;
    return IconComponent;
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Platform Management</h2>
            <p className="text-sm text-gray-500">Create and manage delivery platforms</p>
          </div>
          <button
            onClick={() => setShowCreateForm(true)}
            className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700"
          >
            <PlusIcon className="w-4 h-4 mr-2" />
            Add Platform
          </button>
        </div>
      </div>

      {/* Create Form */}
      {showCreateForm && (
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Platform Name
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                placeholder="e.g., Custom Platform"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <input
                type="text"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                placeholder="Platform description"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Color
              </label>
              <div className="flex space-x-2">
                {COLOR_OPTIONS.map((color) => (
                  <button
                    key={color}
                    onClick={() => setFormData({ ...formData, color })}
                    className={`w-8 h-8 rounded-md border-2 ${
                      formData.color === color ? 'border-gray-900' : 'border-gray-300'
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Icon
              </label>
              <select
                value={formData.icon}
                onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              >
                {Object.keys(ICON_MAP).map((iconName) => (
                  <option key={iconName} value={iconName}>
                    {iconName.replace('Icon', '')}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex justify-end space-x-3 mt-4">
            <button
              onClick={() => setShowCreateForm(false)}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleCreatePlatform}
              disabled={!formData.name}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              Create Platform
            </button>
          </div>
        </div>
      )}

      {/* Platform Grid */}
      <div className="p-6">
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-gray-500 mt-2">Loading platforms...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {platforms.map((platform) => {
              const IconComponent = getIconComponent(platform.icon);
              const isEditing = editingPlatform?.id === platform.id;

              return (
                <div
                  key={platform.id}
                  className={`relative p-4 border rounded-lg hover:shadow-md transition-all cursor-pointer ${
                    selectedPlatform?.id === platform.id
                      ? 'ring-2 ring-blue-500 border-blue-500'
                      : 'border-gray-200'
                  }`}
                  onClick={() => onPlatformSelect?.(platform)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      <div
                        className="p-2 rounded-md"
                        style={{ backgroundColor: platform.color + '20' }}
                      >
                        <IconComponent
                          className="w-6 h-6"
                          style={{ color: platform.color }}
                        />
                      </div>
                      <div>
                        {isEditing ? (
                          <input
                            type="text"
                            defaultValue={platform.name}
                            onBlur={(e) => {
                              if (e.target.value !== platform.name) {
                                handleUpdatePlatform(platform.id, { name: e.target.value });
                              } else {
                                setEditingPlatform(null);
                              }
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.currentTarget.blur();
                              } else if (e.key === 'Escape') {
                                setEditingPlatform(null);
                              }
                            }}
                            className="text-lg font-semibold text-gray-900 bg-white border border-gray-300 rounded px-2 py-1"
                            autoFocus
                          />
                        ) : (
                          <h3 className="text-lg font-semibold text-gray-900">
                            {getLocalizedText(platform.name || '', language)}
                          </h3>
                        )}
                        <p className="text-sm text-gray-600">{getLocalizedText(platform.description || '', language)}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          {platform.menuCount} products • {platform.status}
                        </p>
                      </div>
                    </div>

                    {!platform.isDefault && (
                      <div className="flex items-center space-x-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingPlatform(platform);
                          }}
                          className="p-1 text-gray-400 hover:text-blue-600"
                        >
                          <PencilIcon className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeletePlatform(platform.id);
                          }}
                          className="p-1 text-gray-400 hover:text-red-600"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      </div>
                    )}

                    {platform.isDefault && (
                      <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                        Default
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};