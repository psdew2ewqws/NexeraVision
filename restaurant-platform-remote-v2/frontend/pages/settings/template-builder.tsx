import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import {
  ArrowLeftIcon,
  PlusIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  DocumentDuplicateIcon,
  PrinterIcon,
  Squares2X2Icon,
  RectangleStackIcon,
  PlayIcon,
  CogIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '../../src/contexts/AuthContext';
import { ProtectedRoute } from '../../src/components/shared/ProtectedRoute';
import { useTemplateBuilderApi } from '../../src/features/template-builder/hooks/useTemplateBuilderApi';
import { Template, TemplateCategory } from '../../src/features/template-builder/types/template.types';
import toast from 'react-hot-toast';

export default function TemplateBuilderPage() {
  const { user } = useAuth();
  const {
    getCategories,
    getTemplates,
    createTemplate,
    deleteTemplate,
    duplicateTemplate,
    generatePreview,
    isLoading,
    error
  } = useTemplateBuilderApi();

  const [categories, setCategories] = useState<TemplateCategory[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState('');
  const [selectedCategoryForNew, setSelectedCategoryForNew] = useState('');

  // Load data
  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      const [categoriesData, templatesData] = await Promise.all([
        getCategories(),
        getTemplates()
      ]);

      setCategories(categoriesData);
      setTemplates(templatesData.data);

      if (categoriesData.length > 0) {
        setSelectedCategoryForNew(categoriesData[0].id);
      }
    } catch (error) {
      console.error('Failed to load data:', error);
      toast.error('Failed to load template data');
    }
  };

  const filteredTemplates = selectedCategory === 'all'
    ? templates
    : templates.filter(t => t.categoryId === selectedCategory);

  const handleCreateTemplate = async () => {
    if (!newTemplateName.trim() || !selectedCategoryForNew) {
      toast.error('Please provide a template name and select a category');
      return;
    }

    try {
      const newTemplate = await createTemplate({
        name: newTemplateName,
        categoryId: selectedCategoryForNew,
        tags: [],
        isDefault: false,
        isPublic: false
      });

      setTemplates(prev => [...prev, newTemplate]);
      setIsCreateModalOpen(false);
      setNewTemplateName('');
      toast.success('Template created successfully');
    } catch (error) {
      console.error('Failed to create template:', error);
      toast.error('Failed to create template');
    }
  };

  const handleDeleteTemplate = async (template: Template) => {
    if (!confirm(`Are you sure you want to delete "${template.name}"?`)) {
      return;
    }

    try {
      await deleteTemplate(template.id);
      setTemplates(prev => prev.filter(t => t.id !== template.id));
      toast.success('Template deleted successfully');
    } catch (error) {
      console.error('Failed to delete template:', error);
      toast.error('Failed to delete template');
    }
  };

  const handleDuplicateTemplate = async (template: Template) => {
    const newName = prompt(`Enter name for duplicated template:`, `${template.name} (Copy)`);
    if (!newName) return;

    try {
      const duplicatedTemplate = await duplicateTemplate(template.id, newName);
      setTemplates(prev => [...prev, duplicatedTemplate]);
      toast.success('Template duplicated successfully');
    } catch (error) {
      console.error('Failed to duplicate template:', error);
      toast.error('Failed to duplicate template');
    }
  };

  const handlePreviewTemplate = (template: Template) => {
    // Redirect to edit page where the real preview functionality exists
    window.open(`/settings/template-builder/${template.id}/edit`, '_blank');
  };

  const getCategoryIcon = (type: string) => {
    switch (type) {
      case 'receipt': return '🧾';
      case 'kitchen': return '👨‍🍳';
      case 'confirmation': return '✅';
      case 'delivery': return '🚚';
      case 'custom': return '🎨';
      default: return '📄';
    }
  };

  return (
    <ProtectedRoute>
      <Head>
        <title>Template Builder - Restaurant Management</title>
        <meta name="description" content="Design and manage thermal printer templates" />
      </Head>

      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              {/* Navigation */}
              <div className="flex items-center space-x-4">
                <Link href="/settings/printing" className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors">
                  <ArrowLeftIcon className="w-4 h-4 mr-2" />
                  Back to Printing
                </Link>
                <div className="h-6 w-px bg-gray-300"></div>
                <div className="flex items-center space-x-2">
                  <Squares2X2Icon className="w-5 h-5 text-gray-600" />
                  <div>
                    <h1 className="text-lg font-semibold text-gray-900">Template Builder</h1>
                    <p className="text-sm text-gray-500">Design thermal printer templates</p>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => setIsCreateModalOpen(true)}
                  className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
                >
                  <PlusIcon className="w-4 h-4 mr-2" />
                  New Template
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

          {/* Category Filter */}
          <div className="mb-8">
            <div className="border-b border-gray-200">
              <nav className="-mb-px flex space-x-8">
                <button
                  onClick={() => setSelectedCategory('all')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    selectedCategory === 'all'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  All Templates ({templates.length})
                </button>
                {categories.map((category) => (
                  <button
                    key={category.id}
                    onClick={() => setSelectedCategory(category.id)}
                    className={`py-2 px-1 border-b-2 font-medium text-sm ${
                      selectedCategory === category.id
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    {getCategoryIcon(category.type)} {category.name} ({templates.filter(t => t.categoryId === category.id).length})
                  </button>
                ))}
              </nav>
            </div>
          </div>

          {/* Templates Grid */}
          {isLoading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p className="mt-4 text-gray-500">Loading templates...</p>
            </div>
          ) : filteredTemplates.length === 0 ? (
            <div className="text-center py-12">
              <RectangleStackIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No templates</h3>
              <p className="mt-1 text-sm text-gray-500">
                {selectedCategory === 'all'
                  ? 'Get started by creating your first template.'
                  : 'No templates found in this category.'}
              </p>
              <div className="mt-6">
                <button
                  onClick={() => setIsCreateModalOpen(true)}
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                >
                  <PlusIcon className="w-4 h-4 mr-2" />
                  New Template
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredTemplates.map((template) => (
                <div key={template.id} className="bg-white rounded-lg border border-gray-200 hover:shadow-md transition-shadow">
                  {/* Template Preview */}
                  <div className="h-48 bg-gray-50 rounded-t-lg border-b border-gray-200 flex items-center justify-center">
                    {template.previewImage ? (
                      <img
                        src={template.previewImage}
                        alt={template.name}
                        className="max-h-full max-w-full object-contain"
                      />
                    ) : (
                      <div className="text-center">
                        <PrinterIcon className="mx-auto h-12 w-12 text-gray-400" />
                        <p className="mt-2 text-sm text-gray-500">No preview</p>
                      </div>
                    )}
                  </div>

                  {/* Template Info */}
                  <div className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="min-w-0 flex-1">
                        <h3 className="text-lg font-medium text-gray-900 truncate">
                          {template.name}
                        </h3>
                        <p className="text-sm text-gray-500 mb-2">
                          {categories.find(c => c.id === template.categoryId)?.name || 'Unknown Category'}
                        </p>

                        {/* Template Stats */}
                        <div className="flex items-center space-x-4 text-xs text-gray-500">
                          <span>Used {template.usageCount} times</span>
                          <span>v{template.version}</span>
                          {template.isDefault && (
                            <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full">Default</span>
                          )}
                          {template.isPublic && (
                            <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full">Public</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="mt-4 flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handlePreviewTemplate(template)}
                          className="inline-flex items-center px-2 py-1 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
                        >
                          <EyeIcon className="w-3 h-3 mr-1" />
                          Preview
                        </button>

                        <button
                          onClick={() => handleDuplicateTemplate(template)}
                          className="inline-flex items-center px-2 py-1 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
                        >
                          <DocumentDuplicateIcon className="w-3 h-3 mr-1" />
                          Copy
                        </button>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Link
                          href={`/settings/template-builder/${template.id}/edit`}
                          className="inline-flex items-center px-2 py-1 text-xs font-medium text-blue-600 bg-blue-100 hover:bg-blue-200 rounded-md transition-colors"
                        >
                          <CogIcon className="w-3 h-3 mr-1" />
                          Toggle Edit
                        </Link>

                        {(user?.role === 'super_admin' || user?.role === 'company_owner') && (
                          <button
                            onClick={() => handleDeleteTemplate(template)}
                            className="inline-flex items-center px-2 py-1 text-xs font-medium text-red-600 bg-red-100 hover:bg-red-200 rounded-md transition-colors"
                          >
                            <TrashIcon className="w-3 h-3 mr-1" />
                            Delete
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {error && (
            <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}
        </div>

        {/* Create Template Modal */}
        {isCreateModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Create New Template</h3>
              </div>

              <div className="px-6 py-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Template Name
                  </label>
                  <input
                    type="text"
                    value={newTemplateName}
                    onChange={(e) => setNewTemplateName(e.target.value)}
                    placeholder="e.g., Receipt Template"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Category
                  </label>
                  <select
                    value={selectedCategoryForNew}
                    onChange={(e) => setSelectedCategoryForNew(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {getCategoryIcon(category.type)} {category.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
                <button
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateTemplate}
                  disabled={!newTemplateName.trim() || !selectedCategoryForNew}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 rounded-md transition-colors"
                >
                  Create Template
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}