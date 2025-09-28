import React, { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { ModifierFormModal } from './ModifierFormModal';

// Types based on the Prisma schema with multi-language support and platform availability
export interface ModifierCategory {
  id: string;
  name: { [key: string]: string }; // Multi-language: {en: "Size", ar: "الحجم"}
  description?: { [key: string]: string };
  selectionType: 'single' | 'multiple' | 'counter';
  isRequired: boolean;
  minSelections: number;
  maxSelections: number;
  priority: number; // Display order priority (lower = higher priority)
  isActive: boolean;
  platformAvailability: {
    talabat: boolean;
    careem: boolean;
    callCenter: boolean;
    website: boolean;
    [key: string]: boolean; // Custom channels
  };
  modifiers: Modifier[];
}

export interface Modifier {
  id: string;
  name: { [key: string]: string }; // Multi-language: {en: "Large", ar: "كبير"}
  description?: { [key: string]: string };
  basePrice: number;
  pricing: {
    talabat: number;
    careem: number;
    callCenter: number;
    website: number;
    [key: string]: number; // Custom channels
  };
  priority: number; // Display order priority (lower = higher priority)
  isActive: boolean;
  platformAvailability: {
    talabat: boolean;
    careem: boolean;
    callCenter: boolean;
    website: boolean;
    [key: string]: boolean; // Custom channels
  };
  image?: string;
}

interface AddOnManagementProps {
  productId?: string;
  onSave?: (categories: ModifierCategory[]) => void;
  onBack?: () => void;
  className?: string;
}

export const AddOnManagement: React.FC<AddOnManagementProps> = ({
  productId,
  onSave,
  onBack,
  className = ""
}) => {
  const [categories, setCategories] = useState<ModifierCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState<ModifierCategory | null>(null);

  // Get available languages from the parent product context
  // For now, we'll use English and Arabic as default
  const availableLanguages = [
    { code: 'en', name: 'English' },
    { code: 'ar', name: 'العربية' }
  ];

  // Load existing categories and modifiers
  useEffect(() => {
    if (productId) {
      loadProductAddOns();
    }
  }, [productId]);

  const loadProductAddOns = async () => {
    if (!productId) {
      console.log('No productId provided to AddOnManagement');
      return;
    }
    
    try {
      setLoading(true);
      
      // Load modifier categories for this specific product
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/menu/products/${productId}/modifiers`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('auth-token')}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        console.log('Loaded product modifiers:', data);
        setCategories(data.categories || []);
      } else {
        console.error('Failed to load product modifiers:', response.status);
      }
    } catch (error) {
      console.error('Failed to load add-ons:', error);
      toast.error('Failed to load add-ons');
    } finally {
      setLoading(false);
    }
  };

  const handleAddCategory = () => {
    setEditingCategory(null);
    setShowCategoryForm(true);
  };

  const handleEditCategory = (category: ModifierCategory) => {
    setEditingCategory(category);
    setShowCategoryForm(true);
  };

  const handleDeleteCategory = async (categoryId: string) => {
    if (!confirm('Are you sure you want to delete this add-on category?')) return;

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/modifier-categories/${categoryId}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('auth-token')}`,
          },
        }
      );

      if (response.ok) {
        setCategories(prev => prev.filter(cat => cat.id !== categoryId));
        toast.success('Add-on category deleted successfully');
      } else {
        toast.error('Failed to delete category');
      }
    } catch (error) {
      console.error('Error deleting category:', error);
      toast.error('Failed to delete category');
    }
  };

  const handleSave = async () => {
    if (!productId) {
      toast.error('No product ID available');
      return;
    }

    try {
      setLoading(true);
      
      // Extract category IDs from the current categories
      const categoryIds = categories.map(category => category.id);
      
      // Save the product-modifier associations
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/menu/products/${productId}/modifiers`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('auth-token')}`,
          },
          body: JSON.stringify(categoryIds),
        }
      );

      if (response.ok) {
        toast.success('Add-ons configuration saved successfully!');
        if (onSave) {
          onSave(categories);
        }
      } else {
        const errorData = await response.json();
        toast.error(errorData.message || 'Failed to save add-ons configuration');
      }
    } catch (error) {
      console.error('Error saving add-ons:', error);
      toast.error('Failed to save add-ons configuration');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className={`flex items-center justify-center h-64 ${className}`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading add-ons...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Add-ons Management</h3>
          <p className="text-sm text-gray-600">
            Configure add-on categories and modifiers for this product
          </p>
        </div>
        <button
          onClick={handleAddCategory}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
        >
          Add Add-ons
        </button>
      </div>

      {/* Categories List */}
      <div className="space-y-4">
        {categories.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
            <div className="w-16 h-16 bg-gray-200 rounded-full mx-auto mb-4 flex items-center justify-center">
              <span className="text-2xl text-gray-400 font-light">+</span>
            </div>
            <h4 className="text-lg font-medium text-gray-600 mb-2">No add-on categories yet</h4>
            <p className="text-gray-500 mb-6">
              Create categories like "Size", "Toppings", or "Extras" to organize your add-ons
            </p>
            <button
              onClick={handleAddCategory}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm"
            >
              Create First Add-ons
            </button>
          </div>
        ) : (
          categories.map((category) => (
            <CategoryCard
              key={category.id}
              category={category}
              onEdit={() => handleEditCategory(category)}
              onDelete={() => handleDeleteCategory(category.id)}
            />
          ))
        )}
      </div>

      {/* Category Form Modal */}
      {showCategoryForm && (
        <CategoryFormModal
          category={editingCategory}
          availableLanguages={availableLanguages}
          onSave={async (savedCategory) => {
            try {
              const categoryData = {
                name: savedCategory.name,
                description: savedCategory.description,
                selectionType: savedCategory.selectionType,
                isRequired: savedCategory.isRequired,
                minSelections: savedCategory.minSelections,
                maxSelections: savedCategory.maxSelections,
                displayNumber: savedCategory.priority, // Map priority to displayNumber for backend
              };

              if (editingCategory) {
                // Update existing category
                const response = await fetch(
                  `${process.env.NEXT_PUBLIC_API_URL}/modifier-categories/${savedCategory.id}`,
                  {
                    method: 'PATCH',
                    headers: {
                      'Content-Type': 'application/json',
                      'Authorization': `Bearer ${localStorage.getItem('auth-token')}`,
                    },
                    body: JSON.stringify(categoryData),
                  }
                );

                if (response.ok) {
                  const updatedCategory = await response.json();
                  setCategories(prev => 
                    prev.map(cat => cat.id === savedCategory.id ? { ...savedCategory, ...updatedCategory } : cat)
                  );
                  toast.success('Add-on category updated successfully');
                } else {
                  toast.error('Failed to update category');
                  return;
                }
              } else {
                // Create new category
                const response = await fetch(
                  `${process.env.NEXT_PUBLIC_API_URL}/modifier-categories`,
                  {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      'Authorization': `Bearer ${localStorage.getItem('auth-token')}`,
                    },
                    body: JSON.stringify(categoryData),
                  }
                );

                if (response.ok) {
                  const createdCategory = await response.json();
                  setCategories(prev => [...prev, { ...savedCategory, id: createdCategory.id }]);
                  toast.success('Add-on category created successfully');
                } else {
                  toast.error('Failed to create category');
                  return;
                }
              }

              setShowCategoryForm(false);
              setEditingCategory(null);
            } catch (error) {
              console.error('Error saving category:', error);
              toast.error('Failed to save category');
            }
          }}
          onCancel={() => {
            setShowCategoryForm(false);
            setEditingCategory(null);
          }}
        />
      )}

      {/* Actions */}
      <div className="flex items-center justify-between pt-6 border-t">
        <button
          onClick={onBack}
          className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
        >
          ← Back to Product Details
        </button>
        <button
          onClick={handleSave}
          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium text-sm"
        >
          Save Add-ons Configuration
        </button>
      </div>
    </div>
  );
};

// Category Card Component
interface CategoryCardProps {
  category: ModifierCategory;
  onEdit: () => void;
  onDelete: () => void;
}

const CategoryCard: React.FC<CategoryCardProps> = ({ category, onEdit, onDelete }) => {
  const getSelectionTypeLabel = (type: string) => {
    switch (type) {
      case 'single': return 'Single Choice (Radio)';
      case 'multiple': return 'Multiple Choice (Checkboxes)';
      case 'counter': return 'Counter (+/- buttons)';
      default: return type;
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h4 className="text-lg font-semibold text-gray-900">{category.name.en || category.name.ar || 'Unnamed Category'}</h4>
            {category.name.ar && category.name.en !== category.name.ar && (
              <span className="text-sm text-gray-500 font-arabic" dir="rtl">({category.name.ar})</span>
            )}
            <div className="flex items-center gap-2">
              {category.isRequired && (
                <span className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded-full">
                  Required
                </span>
              )}
              {!category.isActive && (
                <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                  Inactive
                </span>
              )}
            </div>
          </div>
          
          {(category.description?.en || category.description?.ar) && (
            <p className="text-sm text-gray-600 mb-2">
              {category.description.en || category.description.ar}
              {category.description.ar && category.description.en !== category.description.ar && (
                <span className="block text-xs text-gray-500 mt-1" dir="rtl">
                  {category.description.ar}
                </span>
              )}
            </p>
          )}
          
          <div className="flex items-center gap-4 text-sm text-gray-500">
            <span>{getSelectionTypeLabel(category.selectionType)}</span>
            <span>•</span>
            <span>
              {category.minSelections === category.maxSelections 
                ? `Exactly ${category.maxSelections}` 
                : `${category.minSelections}-${category.maxSelections} selections`}
            </span>
            <span>•</span>
            <span>{category.modifiers?.length || 0} options</span>
          </div>
        </div>
        
        <div className="flex items-center gap-2 ml-4">
          <button
            onClick={onEdit}
            className="px-3 py-1 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors font-medium border border-blue-200"
            title="Edit category"
          >
            Edit
          </button>
          <button
            onClick={onDelete}
            className="px-3 py-1 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors font-medium border border-red-200"
            title="Delete category"
          >
            Delete
          </button>
        </div>
      </div>

      {/* Modifiers Preview */}
      {category.modifiers && category.modifiers.length > 0 && (
        <div className="border-t pt-4">
          <h5 className="text-sm font-medium text-gray-700 mb-2">Options:</h5>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {category.modifiers.slice(0, 6).map((modifier) => (
              <div
                key={modifier.id}
                className="flex items-center justify-between bg-gray-50 px-3 py-2 rounded-md"
              >
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-gray-700 truncate">
                    {modifier.name.en || modifier.name.ar || 'Unnamed Item'}
                  </div>
                  {modifier.name.ar && modifier.name.en !== modifier.name.ar && (
                    <div className="text-xs text-gray-500 mt-1" dir="rtl">{modifier.name.ar}</div>
                  )}
                </div>
                <div className="text-xs text-gray-500 ml-2 text-right">
                  <div>Talabat: +{modifier.pricing?.talabat?.toFixed(2) || '0.00'}</div>
                  <div>Careem: +{modifier.pricing?.careem?.toFixed(2) || '0.00'}</div>
                </div>
              </div>
            ))}
            {category.modifiers.length > 6 && (
              <div className="flex items-center justify-center bg-gray-100 px-3 py-2 rounded-md text-sm text-gray-500">
                +{category.modifiers.length - 6} more
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// Complete Category Form Modal with multi-language and modifier management
interface CategoryFormModalProps {
  category: ModifierCategory | null;
  onSave: (category: ModifierCategory) => void;
  onCancel: () => void;
  availableLanguages: { code: string; name: string }[];
}

const CategoryFormModal: React.FC<CategoryFormModalProps> = ({ 
  category, 
  onSave, 
  onCancel, 
  availableLanguages 
}) => {
  const [formData, setFormData] = useState({
    name: availableLanguages.reduce((acc, lang) => ({
      ...acc,
      [lang.code]: category?.name?.[lang.code] || ''
    }), {}),
    description: availableLanguages.reduce((acc, lang) => ({
      ...acc,
      [lang.code]: category?.description?.[lang.code] || ''
    }), {}),
    selectionType: category?.selectionType || 'single' as const,
    isRequired: category?.isRequired || false,
    minSelections: category?.minSelections || 0,
    maxSelections: category?.maxSelections || 1,
    priority: category?.priority || 1,
    isActive: category?.isActive || true,
    platformAvailability: category?.platformAvailability || {
      talabat: true,
      careem: true,
      callCenter: true,
      website: true
    },
    modifiers: category?.modifiers || []
  });

  const [showModifierForm, setShowModifierForm] = useState(false);
  const [editingModifier, setEditingModifier] = useState<Modifier | null>(null);

  const handleSave = () => {
    // Validate required fields
    const englishName = formData.name['en'] || '';
    if (!englishName.trim()) {
      toast.error('English name is required');
      return;
    }

    const newCategory: ModifierCategory = {
      id: category?.id || `temp_${Date.now()}`,
      name: formData.name,
      description: formData.description,
      selectionType: formData.selectionType,
      isRequired: formData.isRequired,
      minSelections: formData.minSelections,
      maxSelections: formData.maxSelections,
      priority: formData.priority,
      isActive: formData.isActive,
      platformAvailability: formData.platformAvailability,
      modifiers: formData.modifiers
    };

    onSave(newCategory);
  };

  const addModifier = (modifier: Modifier) => {
    setFormData(prev => ({
      ...prev,
      modifiers: [...prev.modifiers, modifier]
    }));
    setShowModifierForm(false);
    setEditingModifier(null);
  };

  const updateModifier = (updatedModifier: Modifier) => {
    setFormData(prev => ({
      ...prev,
      modifiers: prev.modifiers.map(m => 
        m.id === updatedModifier.id ? updatedModifier : m
      )
    }));
    setShowModifierForm(false);
    setEditingModifier(null);
  };

  const deleteModifier = (modifierId: string) => {
    if (confirm('Are you sure you want to delete this modifier?')) {
      setFormData(prev => ({
        ...prev,
        modifiers: prev.modifiers.filter(m => m.id !== modifierId)
      }));
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-black bg-opacity-50" onClick={onCancel} />
        <div className="bg-white rounded-lg w-full max-w-4xl relative max-h-[90vh] overflow-y-auto">
          <div className="sticky top-0 bg-white border-b px-6 py-4">
            <h3 className="text-xl font-semibold">
              {category ? 'Edit Add-ons' : 'Add Add-ons'}
            </h3>
          </div>

          <div className="p-6 space-y-6">
            {/* Multi-language Names - Same Row */}
            <div className="space-y-2">
              <div className="border-l-4 border-gray-600 pl-4 mb-4">
                <h4 className="text-lg font-semibold text-gray-900">Category Names</h4>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    English Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name['en'] || ''}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      name: { ...prev.name, en: e.target.value }
                    }))}
                    placeholder="Category name in English"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-600 focus:border-transparent bg-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Arabic Name العربية
                  </label>
                  <input
                    type="text"
                    value={formData.name['ar'] || ''}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      name: { ...prev.name, ar: e.target.value }
                    }))}
                    placeholder="اسم الفئة بالعربية"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-600 focus:border-transparent bg-white"
                    dir="rtl"
                  />
                </div>
              </div>
            </div>

            {/* Multi-language Descriptions - Same Row */}
            <div className="space-y-2">
              <div className="border-l-4 border-gray-600 pl-4 mb-4">
                <h4 className="text-lg font-semibold text-gray-900">Category Descriptions</h4>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    English Description
                  </label>
                  <textarea
                    value={formData.description['en'] || ''}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      description: { ...prev.description, en: e.target.value }
                    }))}
                    placeholder="Optional description in English"
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-600 focus:border-transparent bg-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Arabic Description الوصف العربي
                  </label>
                  <textarea
                    value={formData.description['ar'] || ''}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      description: { ...prev.description, ar: e.target.value }
                    }))}
                    placeholder="وصف اختياري بالعربية"
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-600 focus:border-transparent bg-white"
                    dir="rtl"
                  />
                </div>
              </div>
            </div>

            {/* Configuration Settings */}
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-6">
              <div className="border-l-4 border-indigo-600 pl-4 mb-6">
                <h4 className="text-lg font-semibold text-gray-900">Category Configuration</h4>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Selection Type
                  </label>
                  <select
                    value={formData.selectionType}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      selectionType: e.target.value as 'single' | 'multiple' | 'counter'
                    }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white shadow-sm font-medium text-sm"
                  >
                    <option value="single">Single Choice (Radio)</option>
                    <option value="multiple">Multiple Choice (Checkbox)</option>
                    <option value="counter">Counter (Quantity)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
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
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white shadow-sm font-medium text-sm"
                    placeholder="1"
                  />
                  <p className="text-xs text-slate-600 mt-1 font-medium">Lower = shows first</p>
                </div>
              </div>

              {/* Required Category - Professional Toggle */}
              <div className="mt-8 pt-6 border-t border-slate-200">
                <div className="flex items-center justify-between p-3 bg-white border border-slate-300 rounded-lg shadow-sm hover:shadow-md transition-all duration-200">
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-br from-red-50 to-orange-50 border border-red-200 rounded-lg">
                      <div className="w-5 h-5 bg-gradient-to-br from-red-500 to-orange-500 rounded-full flex items-center justify-center">
                        <span className="text-white text-xs font-bold">!</span>
                      </div>
                    </div>
                    <div>
                      <h5 className="text-base font-bold text-gray-900">Required Category</h5>
                      <p className="text-sm text-slate-600 font-medium">Customers must make a selection</p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.isRequired}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        isRequired: e.target.checked
                      }))}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-3 peer-focus:ring-red-300 rounded-full peer peer-checked:after:translate-x-5 peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gradient-to-r peer-checked:from-red-500 peer-checked:to-orange-500 shadow-sm"></div>
                  </label>
                </div>
              </div>
            </div>

            {/* Selection Limits */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Minimum Selections
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.minSelections}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    minSelections: parseInt(e.target.value) || 0
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-600 focus:border-transparent bg-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Maximum Selections
                </label>
                <input
                  type="number"
                  min="1"
                  value={formData.maxSelections}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    maxSelections: parseInt(e.target.value) || 1
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-600 focus:border-transparent bg-white"
                />
              </div>
            </div>

            {/* Platform Availability */}
            <div className="space-y-4">
              <div className="border-l-4 border-blue-600 pl-4 mb-4">
                <h4 className="text-lg font-semibold text-gray-900">Platform Availability</h4>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <label className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer bg-white">
                  <input
                    type="checkbox"
                    checked={formData.platformAvailability.talabat}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      platformAvailability: { ...prev.platformAvailability, talabat: e.target.checked }
                    }))}
                    className="mr-3 h-4 w-4 text-blue-600 rounded focus:ring-blue-500"
                  />
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">Talabat</div>
                    <div className="text-xs text-gray-500">Delivery platform</div>
                  </div>
                </label>

                <label className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer bg-white">
                  <input
                    type="checkbox"
                    checked={formData.platformAvailability.careem}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      platformAvailability: { ...prev.platformAvailability, careem: e.target.checked }
                    }))}
                    className="mr-3 h-4 w-4 text-blue-600 rounded focus:ring-blue-500"
                  />
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">Careem</div>
                    <div className="text-xs text-gray-500">Delivery platform</div>
                  </div>
                </label>

                <label className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer bg-white">
                  <input
                    type="checkbox"
                    checked={formData.platformAvailability.callCenter}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      platformAvailability: { ...prev.platformAvailability, callCenter: e.target.checked }
                    }))}
                    className="mr-3 h-4 w-4 text-blue-600 rounded focus:ring-blue-500"
                  />
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">Call Center</div>
                    <div className="text-xs text-gray-500">Phone orders</div>
                  </div>
                </label>

                <label className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer bg-white">
                  <input
                    type="checkbox"
                    checked={formData.platformAvailability.website}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      platformAvailability: { ...prev.platformAvailability, website: e.target.checked }
                    }))}
                    className="mr-3 h-4 w-4 text-blue-600 rounded focus:ring-blue-500"
                  />
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">Website</div>
                    <div className="text-xs text-gray-500">Online orders</div>
                  </div>
                </label>
              </div>
            </div>

            {/* Modifiers Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-lg font-semibold text-gray-900">Add-on Items</h4>
                <button
                  onClick={() => {
                    setEditingModifier(null);
                    setShowModifierForm(true);
                  }}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium text-sm"
                >
                  Add Item
                </button>
              </div>

              {formData.modifiers.length === 0 ? (
                <div className="text-center py-8 bg-gray-50 rounded-lg">
                  <p className="text-gray-500">No add-on items yet. Add your first item!</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {formData.modifiers.sort((a, b) => a.priority - b.priority).map((modifier, index) => (
                    <div key={modifier.id} className="bg-gray-50 rounded-lg p-3">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <div className="font-medium text-gray-900">{modifier.name.en}</div>
                          {modifier.name.ar && modifier.name.en !== modifier.name.ar && (
                            <div className="text-sm text-gray-600 mt-1" dir="rtl">{modifier.name.ar}</div>
                          )}
                        </div>
                      </div>
                      <div className="text-xs text-gray-500 mb-3">
                        Talabat: {modifier.pricing.talabat.toFixed(2)} | 
                        Careem: {modifier.pricing.careem.toFixed(2)} | 
                        Call Center: {modifier.pricing.callCenter?.toFixed(2) || modifier.pricing.callcenter?.toFixed(2) || '0.00'} | 
                        Website: {modifier.pricing.website?.toFixed(2) || '0.00'}
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => {
                            setEditingModifier(modifier);
                            setShowModifierForm(true);
                          }}
                          className="px-2 py-1 text-xs text-blue-600 hover:bg-blue-50 rounded font-medium border border-blue-200"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => deleteModifier(modifier.id)}
                          className="px-2 py-1 text-xs text-red-600 hover:bg-red-50 rounded font-medium border border-red-200"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
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
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Save Add-ons
            </button>
          </div>
        </div>
      </div>

      {/* Modifier Form Modal */}
      {showModifierForm && (
        <ModifierFormModal
          modifier={editingModifier}
          availableLanguages={availableLanguages}
          categoryPlatformAvailability={formData.platformAvailability}
          onSave={editingModifier ? updateModifier : addModifier}
          onCancel={() => {
            setShowModifierForm(false);
            setEditingModifier(null);
          }}
        />
      )}
    </div>
  );
};