// Category Sidebar - Editable Categories for Menu Management
import React, { useState, useCallback, useEffect } from 'react';
import { 
  PlusIcon,
  PencilIcon, 
  TrashIcon,
  CheckIcon,
  XMarkIcon,
  Bars3Icon,
  EyeIcon,
  EyeSlashIcon
} from '@heroicons/react/24/outline';
import { MenuCategory } from '../../../types/menu';
import { useAuth } from '../../../contexts/AuthContext';
import { useLanguage } from '../../../contexts/LanguageContext';
import { getLocalizedText } from '../../../lib/menu-utils';
import toast from 'react-hot-toast';

interface CategorySidebarProps {
  categories: MenuCategory[];
  selectedCategoryId?: string;
  onCategorySelect: (categoryId: string | undefined) => void;
  onCategoryUpdate: (categoryId?: string, updates?: Partial<MenuCategory>) => void;
  className?: string;
}

interface EditingCategory {
  id: string;
  nameEn: string;
  nameAr: string;
  displayNumber: number;
  isActive: boolean;
}

export const CategorySidebar: React.FC<CategorySidebarProps> = ({
  categories,
  selectedCategoryId,
  onCategorySelect,
  onCategoryUpdate,
  className = ''
}) => {
  const { user } = useAuth();
  const { language, t } = useLanguage();
  const [editingCategory, setEditingCategory] = useState<EditingCategory | null>(null);
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [loading, setLoading] = useState(false);

  // New category form state - Calculate next available display number
  const getNextDisplayNumber = useCallback(() => {
    if (categories.length === 0) return 1;
    const maxNumber = Math.max(...categories.map(cat => cat.displayNumber));
    return maxNumber + 1;
  }, [categories]);

  const [newCategory, setNewCategory] = useState({
    nameEn: '',
    nameAr: '',
    displayNumber: 1,
    isActive: true
  });

  // Update display number when categories change
  useEffect(() => {
    if (isAddingCategory) {
      setNewCategory(prev => ({
        ...prev,
        displayNumber: getNextDisplayNumber()
      }));
    }
  }, [categories, isAddingCategory, getNextDisplayNumber]);

  const canEdit = user?.role !== 'cashier';
  const canDelete = user?.role === 'super_admin' || user?.role === 'company_owner';


  // Start editing a category
  const startEdit = useCallback((category: MenuCategory) => {
    setEditingCategory({
      id: category.id,
      nameEn: getLocalizedText(category.name, 'en'),
      nameAr: getLocalizedText(category.name, 'ar'),
      displayNumber: category.displayNumber,
      isActive: category.isActive
    });
  }, []);

  // Cancel editing
  const cancelEdit = useCallback(() => {
    setEditingCategory(null);
  }, []);

  // Save category changes
  const saveCategory = useCallback(async () => {
    if (!editingCategory) return;
    
    setLoading(true);
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/menu/categories/${editingCategory.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth-token')}`
        },
        body: JSON.stringify({
          name: {
            en: editingCategory.nameEn,
            ar: editingCategory.nameAr
          },
          displayNumber: editingCategory.displayNumber,
          isActive: editingCategory.isActive,
          ...(user?.companyId && { companyId: user.companyId })
        })
      });

      if (response.ok) {
        toast.success('Category updated successfully');
        setEditingCategory(null);
        onCategoryUpdate();
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || `Failed to update category: ${response.status}`);
      }
    } catch (error) {
      console.error('Category update error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to update category');
    } finally {
      setLoading(false);
    }
  }, [editingCategory, onCategoryUpdate]);

  // Toggle category active status (hide/show)
  const toggleCategoryStatus = useCallback(async (categoryId: string, currentStatus: boolean) => {
    setLoading(true);
    try {
      const category = categories.find(c => c.id === categoryId);
      if (!category) return;

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/menu/categories/${categoryId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth-token')}`
        },
        body: JSON.stringify({
          name: category.name,
          displayNumber: category.displayNumber,
          isActive: !currentStatus,
          ...(user?.companyId && { companyId: user.companyId })
        })
      });

      if (response.ok) {
        toast.success(`Category ${!currentStatus ? 'shown' : 'hidden'} successfully`);
        // Immediately update parent state with the new category status
        onCategoryUpdate(categoryId, { isActive: !currentStatus });
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || `Failed to update category: ${response.status}`);
      }
    } catch (error) {
      console.error('Category toggle error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to update category');
    } finally {
      setLoading(false);
    }
  }, [categories, onCategoryUpdate, user?.companyId]);

  // Add new category
  const addCategory = useCallback(async () => {
    if (!newCategory.nameEn.trim() && !newCategory.nameAr.trim()) {
      toast.error('Category name is required in at least one language');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/menu/categories`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth-token')}`
        },
        body: JSON.stringify({
          name: {
            en: newCategory.nameEn || newCategory.nameAr,
            ar: newCategory.nameAr || newCategory.nameEn
          },
          displayNumber: newCategory.displayNumber,
          isActive: newCategory.isActive,
          ...(user?.companyId && { companyId: user.companyId })
        })
      });

      if (response.ok) {
        toast.success('Category added successfully');
        // Reset form immediately
        setNewCategory({
          nameEn: '',
          nameAr: '',
          displayNumber: getNextDisplayNumber() + 1,
          isActive: true
        });
        setIsAddingCategory(false);
        // Refresh categories to show new category
        onCategoryUpdate();
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || `Failed to add category: ${response.status}`);
      }
    } catch (error) {
      console.error('Category creation error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to add category');
    } finally {
      setLoading(false);
    }
  }, [newCategory, user?.companyId, categories.length, onCategoryUpdate]);

  // Delete category
  const deleteCategory = useCallback(async (categoryId: string, categoryName: string) => {
    if (!confirm(`Are you sure you want to delete "${categoryName}"? This action cannot be undone.`)) {
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/menu/categories/${categoryId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth-token')}`
        }
      });

      if (response.ok) {
        toast.success('Category deleted successfully');
        onCategoryUpdate();
        if (selectedCategoryId === categoryId) {
          onCategorySelect(undefined);
        }
      } else {
        throw new Error('Failed to delete category');
      }
    } catch (error) {
      toast.error('Failed to delete category');
    } finally {
      setLoading(false);
    }
  }, [selectedCategoryId, onCategorySelect, onCategoryUpdate]);

  // Sort categories by display number
  const sortedCategories = [...categories].sort((a, b) => a.displayNumber - b.displayNumber);

  return (
    <div className={`category-sidebar bg-white border-l border-gray-200 w-80 h-full overflow-y-auto ${className}`}>
      {/* Header */}
      <div className="sticky top-0 bg-white border-b border-gray-200 p-4 z-10">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <Bars3Icon className="w-5 h-5 mr-2" />
            Categories
          </h3>
          {canEdit && (
            <button
              onClick={() => setIsAddingCategory(true)}
              className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-blue-700 bg-blue-100 hover:bg-blue-200 rounded-md transition-colors"
            >
              <PlusIcon className="w-4 h-4 mr-1" />
              Add
            </button>
          )}
        </div>
      </div>

      {/* All Products Option */}
      <div className="p-2">
        <button
          onClick={() => onCategorySelect(undefined)}
          className={`w-full text-left px-3 py-2 rounded-md transition-colors ${
            !selectedCategoryId 
              ? 'bg-blue-100 text-blue-700 font-medium' 
              : 'text-gray-700 hover:bg-gray-100'
          }`}
        >
          <div className="flex items-center justify-between">
            <span>All Products</span>
            <span className="text-xs text-gray-500">All</span>
          </div>
        </button>
      </div>

      {/* Categories List */}
      <div className="p-2 space-y-1">
        {sortedCategories.map((category, index) => (
          <div
            key={category.id}
            className={`category-item border rounded-lg ${
              selectedCategoryId === category.id 
                ? 'border-blue-500 bg-blue-50' 
                : !category.isActive 
                  ? 'border-gray-200 bg-gray-50 opacity-60' 
                  : 'border-gray-200'
            }`}
          >
            {editingCategory?.id === category.id ? (
              // Editing Mode
              <div className="p-3 space-y-3">
                <div className="space-y-2">
                  <input
                    type="text"
                    value={editingCategory.nameEn}
                    onChange={(e) => setEditingCategory(prev => prev ? { ...prev, nameEn: e.target.value } : null)}
                    placeholder="English name"
                    className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <input
                    type="text"
                    value={editingCategory.nameAr}
                    onChange={(e) => setEditingCategory(prev => prev ? { ...prev, nameAr: e.target.value } : null)}
                    placeholder="Arabic name"
                    className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    dir="rtl"
                  />
                  <div className="flex items-center space-x-2">
                    <input
                      type="number"
                      value={editingCategory.displayNumber}
                      onChange={(e) => setEditingCategory(prev => prev ? { ...prev, displayNumber: Math.max(1, parseInt(e.target.value) || 1) } : null)}
                      placeholder="Order"
                      min="1"
                      className="w-20 px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <label className="flex items-center text-sm">
                      <input
                        type="checkbox"
                        checked={editingCategory.isActive}
                        onChange={(e) => setEditingCategory(prev => prev ? { ...prev, isActive: e.target.checked } : null)}
                        className="mr-1.5"
                      />
                      Active
                    </label>
                  </div>
                </div>
                <div className="flex justify-end space-x-2">
                  <button
                    onClick={cancelEdit}
                    className="inline-flex items-center px-2 py-1 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
                  >
                    <XMarkIcon className="w-3 h-3 mr-1" />
                    Cancel
                  </button>
                  <button
                    onClick={saveCategory}
                    disabled={loading}
                    className="inline-flex items-center px-2 py-1 text-xs font-medium text-green-700 bg-green-100 hover:bg-green-200 rounded-md transition-colors disabled:opacity-50"
                  >
                    <CheckIcon className="w-3 h-3 mr-1" />
                    Save
                  </button>
                </div>
              </div>
            ) : (
              // Display Mode
              <div className="flex items-center justify-between p-3">
                <div
                  onClick={() => onCategorySelect(category.id)}
                  className="flex-1 text-left min-w-0 cursor-pointer"
                >
                  <div className="flex items-center justify-between">
                    <div className="min-w-0 flex-1">
                      <p className={`text-sm font-medium truncate ${
                        !category.isActive ? 'text-gray-500' : 'text-gray-900'
                      }`}>
                        {getLocalizedText(category.name, language)}
                        {!category.isActive && (
                          <span className="ml-2 text-xs text-gray-400">(Hidden)</span>
                        )}
                      </p>
                      {language === 'en' && getLocalizedText(category.name, 'ar') && (
                        <p className={`text-xs truncate ${
                          !category.isActive ? 'text-gray-400' : 'text-gray-500'
                        }`} dir="rtl">
                          {getLocalizedText(category.name, 'ar')}
                        </p>
                      )}
                      {language === 'ar' && getLocalizedText(category.name, 'en') && (
                        <p className={`text-xs truncate ${
                          !category.isActive ? 'text-gray-400' : 'text-gray-500'
                        }`}>
                          {getLocalizedText(category.name, 'en')}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center space-x-2 ml-2">
                      <span className="text-xs text-gray-500">#{category.displayNumber}</span>
                      {canEdit && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleCategoryStatus(category.id, category.isActive);
                          }}
                          className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                          title={category.isActive ? 'Hide category' : 'Show category'}
                        >
                          {category.isActive ? (
                            <EyeIcon className="w-4 h-4" />
                          ) : (
                            <EyeSlashIcon className="w-4 h-4" />
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
                
                {canEdit && (
                  <div className="flex items-center space-x-1 ml-2">
                    <button
                      onClick={() => startEdit(category)}
                      className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      <PencilIcon className="w-4 h-4" />
                    </button>
                    {canDelete && (
                      <button
                        onClick={() => deleteCategory(category.id, getLocalizedText(category.name, language))}
                        className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Add Category Form */}
      {isAddingCategory && canEdit && (
        <div className="p-2">
          <div className="border border-gray-200 rounded-lg p-3 space-y-3 bg-gray-50">
            <h4 className="text-sm font-medium text-gray-900">Add New Category</h4>
            <div className="space-y-2">
              <input
                type="text"
                value={newCategory.nameEn}
                onChange={(e) => setNewCategory(prev => ({ ...prev, nameEn: e.target.value }))}
                placeholder="English name"
                className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="text"
                value={newCategory.nameAr}
                onChange={(e) => setNewCategory(prev => ({ ...prev, nameAr: e.target.value }))}
                placeholder="Arabic name"
                className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                dir="rtl"
              />
              <div className="flex items-center space-x-2">
                <input
                  type="number"
                  value={newCategory.displayNumber}
                  onChange={(e) => setNewCategory(prev => ({ ...prev, displayNumber: Math.max(1, parseInt(e.target.value) || 1) }))}
                  placeholder="Display order"
                  min="1"
                  className="w-20 px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <label className="flex items-center text-sm">
                  <input
                    type="checkbox"
                    checked={newCategory.isActive}
                    onChange={(e) => setNewCategory(prev => ({ ...prev, isActive: e.target.checked }))}
                    className="mr-1.5"
                  />
                  Active
                </label>
              </div>
            </div>
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setIsAddingCategory(false)}
                className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={addCategory}
                disabled={loading}
                className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-blue-700 bg-blue-100 hover:bg-blue-200 rounded-md transition-colors disabled:opacity-50"
              >
                Add Category
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};