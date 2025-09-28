import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { Modifier } from './AddOnManagement';

// Modifier (Sub Add-on) Form Modal with multi-language and platform pricing
interface ModifierFormModalProps {
  modifier: Modifier | null;
  onSave: (modifier: Modifier) => void;
  onCancel: () => void;
  availableLanguages: { code: string; name: string }[];
  categoryPlatformAvailability?: {
    talabat: boolean;
    careem: boolean;
    callCenter: boolean;
    website: boolean;
    [key: string]: boolean;
  };
}

export const ModifierFormModal: React.FC<ModifierFormModalProps> = ({ 
  modifier, 
  onSave, 
  onCancel, 
  availableLanguages,
  categoryPlatformAvailability 
}) => {
  // Get available platforms from category or default to all
  const getAvailablePlatforms = () => {
    if (!categoryPlatformAvailability) {
      return [
        { key: 'talabat', name: 'Talabat' },
        { key: 'careem', name: 'Careem' },
        { key: 'callCenter', name: 'Call Center' },
        { key: 'website', name: 'Website' }
      ];
    }
    
    return Object.entries(categoryPlatformAvailability)
      .filter(([key, available]) => available)
      .map(([key, _]) => ({
        key,
        name: key === 'callCenter' ? 'Call Center' : 
              key.charAt(0).toUpperCase() + key.slice(1)
      }));
  };

  const availablePlatforms = getAvailablePlatforms();
  const [formData, setFormData] = useState({
    name: availableLanguages.reduce((acc, lang) => ({
      ...acc,
      [lang.code]: modifier?.name?.[lang.code] || ''
    }), {}),
    description: availableLanguages.reduce((acc, lang) => ({
      ...acc,
      [lang.code]: modifier?.description?.[lang.code] || ''
    }), {}),
    pricing: {
      talabat: modifier?.pricing?.talabat || 0,
      careem: modifier?.pricing?.careem || 0,
      callCenter: modifier?.pricing?.callCenter || 0,
      website: modifier?.pricing?.website || 0,
      ...modifier?.pricing || {}
    },
    priority: modifier?.priority || 1,
    isActive: modifier?.isActive ?? true,
    platformAvailability: modifier?.platformAvailability || {
      talabat: true,
      careem: true,
      callCenter: true,
      website: true
    }
  });


  const handlePriceChange = (channel: string, price: number) => {
    setFormData(prev => ({
      ...prev,
      pricing: { ...prev.pricing, [channel]: price }
    }));
  };


  const handleSave = () => {
    // Validate required fields
    const englishName = formData.name['en'] || '';
    if (!englishName.trim()) {
      toast.error('English name is required');
      return;
    }

    // Use standard pricing only
    const finalPricing = { ...formData.pricing };

    const newModifier: Modifier = {
      id: modifier?.id || `temp_${Date.now()}`,
      name: formData.name,
      description: formData.description,
      basePrice: 0, // Set to 0 since we're not using it anymore
      pricing: finalPricing,
      priority: formData.priority,
      isActive: formData.isActive,
      platformAvailability: formData.platformAvailability
    };

    onSave(newModifier);
  };

  return (
    <div className="fixed inset-0 z-[60] overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-black bg-opacity-50" onClick={onCancel} />
        <div className="bg-white rounded-lg w-full max-w-3xl relative max-h-[90vh] overflow-y-auto">
          <div className="sticky top-0 bg-white border-b px-6 py-4">
            <h3 className="text-xl font-semibold">
              {modifier ? 'Edit Add-on Item' : 'Add New Add-on Item'}
            </h3>
          </div>

          <div className="p-6 space-y-6">
            {/* Multi-language Names - Same Row Layout */}
            <div className="space-y-4">
              <h4 className="text-lg font-medium">Item Names</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {availableLanguages.map(lang => (
                  <div key={lang.code}>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {lang.name} Name {lang.code === 'en' && '*'}
                    </label>
                    <input
                      type="text"
                      value={formData.name[lang.code] || ''}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        name: { ...prev.name, [lang.code]: e.target.value }
                      }))}
                      placeholder={`Item name in ${lang.name}`}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      dir={lang.code === 'ar' ? 'rtl' : 'ltr'}
                    />
                  </div>
                ))}
              </div>
            </div>


            {/* Priority */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Priority (Display Order)
              </label>
              <input
                type="number"
                min="1"
                value={formData.priority}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  priority: parseInt(e.target.value) || 1
                }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="1"
              />
              <p className="text-xs text-gray-500 mt-1">Lower numbers display first</p>
            </div>

            {/* Visual Separator */}
            <div className="border-t border-gray-200"></div>

            {/* Platform Pricing */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-lg font-medium">Platform Pricing</h4>
              </div>

              {/* Default Price - Auto Fill */}
              <div className="flex items-center space-x-3 bg-gray-50 border border-gray-200 rounded-lg p-3">
                <label className="text-sm font-medium text-gray-900 whitespace-nowrap">
                  Default Price:
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="Auto-fills all platforms"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent bg-white text-sm"
                  onChange={(e) => {
                    const price = parseFloat(e.target.value) || 0;
                    if (price > 0) {
                      const newPricing = { ...formData.pricing };
                      availablePlatforms.forEach(platform => {
                        newPricing[platform.key] = price;
                      });
                      setFormData(prev => ({
                        ...prev,
                        pricing: newPricing
                      }));
                    }
                  }}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Dynamic Platforms based on Category */}
                {availablePlatforms.map((platform) => (
                  <div key={platform.key}>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {platform.name} Price
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.pricing[platform.key] || 0}
                      onChange={(e) => handlePriceChange(platform.key, parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="0.00"
                    />
                  </div>
                ))}
              </div>

            </div>

            {/* Visual Separator */}
            <div className="border-t border-gray-200"></div>

            {/* Platform Availability */}
            <div className="space-y-4">
              <h4 className="text-lg font-medium">Platform Availability</h4>
              <p className="text-sm text-gray-600 mb-3">Select which platforms can see this add-on item</p>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {/* Dynamic Platform Availability based on Category */}
                {availablePlatforms.map((platform) => (
                  <label key={platform.key} className="flex items-center p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                    <input
                      type="checkbox"
                      checked={formData.platformAvailability[platform.key] || false}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        platformAvailability: {
                          ...prev.platformAvailability,
                          [platform.key]: e.target.checked
                        }
                      }))}
                      className="mr-3 h-4 w-4 text-blue-600 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm font-medium">{platform.name}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Visual Separator */}
            <div className="border-t border-gray-200"></div>

            {/* Status */}
            <div className="flex items-center justify-between">
              <h4 className="text-lg font-medium">Item Status</h4>
              <label className="flex items-center p-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors bg-white">
                <input
                  type="checkbox"
                  checked={formData.isActive}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    isActive: e.target.checked
                  }))}
                  className="mr-2 h-4 w-4 text-green-600 rounded focus:ring-green-500"
                />
                <span className="text-sm font-medium text-gray-900">Active</span>
              </label>
            </div>
          </div>

          {/* Footer */}
          <div className="sticky bottom-0 bg-white border-t px-6 py-4 flex justify-end space-x-3">
            <button
              onClick={onCancel}
              className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-md"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
            >
              Save Item
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};