// Menu Template Gallery - Template browsing and quick-apply functionality
import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  SparklesIcon,
  HeartIcon,
  StarIcon,
  EyeIcon,
  DocumentDuplicateIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
  TagIcon,
  CalendarIcon,
  UserIcon,
  CheckCircleIcon,
  PlusIcon
} from '@heroicons/react/24/outline';
import { HeartIcon as HeartIconSolid, StarIcon as StarIconSolid } from '@heroicons/react/24/solid';
import { Platform, MenuTemplate } from '../../../types/menu-builder';
import { useAuth } from '../../../contexts/AuthContext';
import { useLanguage } from '../../../contexts/LanguageContext';
import Image from 'next/image';
import toast from 'react-hot-toast';

interface MenuTemplateGalleryProps {
  selectedPlatform?: Platform | null;
  onTemplateSelect: (template: MenuTemplate) => void;
  className?: string;
}

interface TemplateFilter {
  search: string;
  platforms: string[];
  categories: string[];
  featured: boolean;
  favorites: boolean;
  sortBy: 'name' | 'popularity' | 'recent' | 'rating';
}

// Mock template data - in real app, this would come from API
const MOCK_TEMPLATES: MenuTemplate[] = [
  {
    id: '1',
    name: 'Fast Casual Restaurant',
    description: 'Perfect for quick-service restaurants with clear categories and fast checkout flow',
    platforms: ['call_center', 'pos', 'website'],
    categories: ['Burgers', 'Sides', 'Beverages', 'Desserts'],
    previewImage: '/templates/fast-casual.jpg',
    isDefault: true,
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-01-15')
  },
  {
    id: '2',
    name: 'Fine Dining Experience',
    description: 'Elegant layout for upscale restaurants with detailed descriptions and wine pairings',
    platforms: ['website', 'pos'],
    categories: ['Appetizers', 'Main Courses', 'Wine Selection', 'Desserts'],
    previewImage: '/templates/fine-dining.jpg',
    isDefault: false,
    createdAt: new Date('2024-01-20'),
    updatedAt: new Date('2024-01-20')
  },
  {
    id: '3',
    name: 'Delivery Optimized',
    description: 'Designed for delivery platforms with clear pricing and estimated prep times',
    platforms: ['talabat', 'careem'],
    categories: ['Popular Items', 'Family Meals', 'Individual Portions', 'Add-ons'],
    previewImage: '/templates/delivery.jpg',
    isDefault: false,
    createdAt: new Date('2024-01-25'),
    updatedAt: new Date('2024-01-25')
  },
  {
    id: '4',
    name: 'Coffee Shop Essentials',
    description: 'Simple layout focused on beverages, pastries, and quick bites',
    platforms: ['call_center', 'pos', 'website'],
    categories: ['Hot Beverages', 'Cold Drinks', 'Pastries', 'Light Meals'],
    previewImage: '/templates/coffee-shop.jpg',
    isDefault: false,
    createdAt: new Date('2024-02-01'),
    updatedAt: new Date('2024-02-01')
  },
  {
    id: '5',
    name: 'Pizza & Italian',
    description: 'Specialized for pizza restaurants with size options and Italian cuisine sections',
    platforms: ['call_center', 'talabat', 'careem', 'website', 'pos'],
    categories: ['Pizza', 'Pasta', 'Salads', 'Appetizers', 'Desserts'],
    previewImage: '/templates/pizza-italian.jpg',
    isDefault: false,
    createdAt: new Date('2024-02-05'),
    updatedAt: new Date('2024-02-05')
  },
  {
    id: '6',
    name: 'Middle Eastern Cuisine',
    description: 'Traditional layout for Middle Eastern restaurants with cultural menu organization',
    platforms: ['call_center', 'website', 'pos'],
    categories: ['Mezze', 'Grilled Items', 'Traditional Dishes', 'Beverages'],
    previewImage: '/templates/middle-eastern.jpg',
    isDefault: false,
    createdAt: new Date('2024-02-10'),
    updatedAt: new Date('2024-02-10')
  }
];

// Template Card Component
const TemplateCard: React.FC<{
  template: MenuTemplate;
  isSelected: boolean;
  isFavorited: boolean;
  onSelect: () => void;
  onPreview: () => void;
  onFavorite: () => void;
  onDuplicate: () => void;
}> = ({
  template,
  isSelected,
  isFavorited,
  onSelect,
  onPreview,
  onFavorite,
  onDuplicate
}) => {
  const { language } = useLanguage();
  const [isHovered, setIsHovered] = useState(false);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      whileHover={{ y: -4 }}
      transition={{ duration: 0.2 }}
      className={`template-card bg-white rounded-xl border-2 overflow-hidden shadow-sm cursor-pointer transition-all duration-200 ${
        isSelected
          ? 'border-blue-500 shadow-lg ring-2 ring-blue-200'
          : 'border-gray-200 hover:border-gray-300 hover:shadow-md'
      }`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Template Preview Image */}
      <div className="relative h-48 bg-gradient-to-br from-gray-100 to-gray-200 overflow-hidden">
        {template.previewImage ? (
          <Image
            src={template.previewImage}
            alt={template.name}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <SparklesIcon className="w-12 h-12 text-gray-400" />
          </div>
        )}

        {/* Overlay Actions */}
        <AnimatePresence>
          {isHovered && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center space-x-3"
            >
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onPreview();
                }}
                className="p-3 bg-white text-gray-900 rounded-full hover:bg-gray-100 transition-colors"
                title="Preview Template"
              >
                <EyeIcon className="w-5 h-5" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onSelect();
                }}
                className="p-3 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors"
                title="Use Template"
              >
                <CheckCircleIcon className="w-5 h-5" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDuplicate();
                }}
                className="p-3 bg-white text-gray-900 rounded-full hover:bg-gray-100 transition-colors"
                title="Duplicate Template"
              >
                <DocumentDuplicateIcon className="w-5 h-5" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Template Badges */}
        <div className="absolute top-3 left-3 flex space-x-2">
          {template.isDefault && (
            <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
              <SparklesIcon className="w-3 h-3 mr-1" />
              Default
            </span>
          )}
        </div>

        {/* Favorite Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onFavorite();
          }}
          className="absolute top-3 right-3 p-2 bg-white bg-opacity-90 rounded-full hover:bg-opacity-100 transition-all"
        >
          {isFavorited ? (
            <HeartIconSolid className="w-4 h-4 text-red-500" />
          ) : (
            <HeartIcon className="w-4 h-4 text-gray-600" />
          )}
        </button>
      </div>

      {/* Template Info */}
      <div className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900 text-lg leading-tight mb-1">
              {template.name}
            </h3>
            <p className="text-sm text-gray-600 line-clamp-2">
              {template.description}
            </p>
          </div>
        </div>

        {/* Platform Compatibility */}
        <div className="mb-3">
          <div className="flex flex-wrap gap-1">
            {template.platforms.slice(0, 3).map(platformId => (
              <span
                key={platformId}
                className="inline-block px-2 py-1 text-xs font-medium bg-gray-100 text-gray-600 rounded"
              >
                {platformId.replace('_', ' ')}
              </span>
            ))}
            {template.platforms.length > 3 && (
              <span className="text-xs text-gray-500">
                +{template.platforms.length - 3} more
              </span>
            )}
          </div>
        </div>

        {/* Categories Preview */}
        <div className="mb-3">
          <div className="flex items-center text-sm text-gray-500 mb-1">
            <TagIcon className="w-3 h-3 mr-1" />
            Categories
          </div>
          <div className="text-xs text-gray-600">
            {template.categories.slice(0, 3).join(', ')}
            {template.categories.length > 3 && ` +${template.categories.length - 3} more`}
          </div>
        </div>

        {/* Template Stats */}
        <div className="flex items-center justify-between pt-3 border-t border-gray-100">
          <div className="flex items-center space-x-3 text-xs text-gray-500">
            <div className="flex items-center">
              <CalendarIcon className="w-3 h-3 mr-1" />
              {template.createdAt.toLocaleDateString()}
            </div>
            <div className="flex items-center">
              <StarIcon className="w-3 h-3 mr-1" />
              4.8
            </div>
          </div>

          <button
            onClick={onSelect}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
              isSelected
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {isSelected ? 'Selected' : 'Use Template'}
          </button>
        </div>
      </div>
    </motion.div>
  );
};

// Filter Panel Component
const FilterPanel: React.FC<{
  filters: TemplateFilter;
  onFiltersChange: (filters: TemplateFilter) => void;
  availablePlatforms: string[];
  availableCategories: string[];
}> = ({ filters, onFiltersChange, availablePlatforms, availableCategories }) => {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-4">
      <h3 className="font-semibold text-gray-900">Filter Templates</h3>

      {/* Platforms */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Platforms
        </label>
        <div className="space-y-2">
          {availablePlatforms.map(platform => (
            <label key={platform} className="flex items-center">
              <input
                type="checkbox"
                checked={filters.platforms.includes(platform)}
                onChange={(e) => {
                  const newPlatforms = e.target.checked
                    ? [...filters.platforms, platform]
                    : filters.platforms.filter(p => p !== platform);
                  onFiltersChange({ ...filters, platforms: newPlatforms });
                }}
                className="mr-2 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700 capitalize">
                {platform.replace('_', ' ')}
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* Quick Filters */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Quick Filters
        </label>
        <div className="space-y-2">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={filters.featured}
              onChange={(e) => onFiltersChange({ ...filters, featured: e.target.checked })}
              className="mr-2 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">Featured Templates</span>
          </label>
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={filters.favorites}
              onChange={(e) => onFiltersChange({ ...filters, favorites: e.target.checked })}
              className="mr-2 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">My Favorites</span>
          </label>
        </div>
      </div>

      {/* Sort Options */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Sort By
        </label>
        <select
          value={filters.sortBy}
          onChange={(e) => onFiltersChange({
            ...filters,
            sortBy: e.target.value as TemplateFilter['sortBy']
          })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-sm"
        >
          <option value="name">Name</option>
          <option value="popularity">Popularity</option>
          <option value="recent">Recently Added</option>
          <option value="rating">Rating</option>
        </select>
      </div>
    </div>
  );
};

export const MenuTemplateGallery: React.FC<MenuTemplateGalleryProps> = ({
  selectedPlatform,
  onTemplateSelect,
  className = ''
}) => {
  const { user } = useAuth();
  const { language } = useLanguage();
  const [templates, setTemplates] = useState<MenuTemplate[]>(MOCK_TEMPLATES);
  const [selectedTemplate, setSelectedTemplate] = useState<MenuTemplate | null>(null);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [showFilters, setShowFilters] = useState(false);
  const [previewTemplate, setPreviewTemplate] = useState<MenuTemplate | null>(null);

  const [filters, setFilters] = useState<TemplateFilter>({
    search: '',
    platforms: selectedPlatform ? [selectedPlatform.id] : [],
    categories: [],
    featured: false,
    favorites: false,
    sortBy: 'popularity'
  });

  // Update platform filter when selectedPlatform changes
  useEffect(() => {
    if (selectedPlatform && !filters.platforms.includes(selectedPlatform.id)) {
      setFilters(prev => ({
        ...prev,
        platforms: [selectedPlatform.id]
      }));
    }
  }, [selectedPlatform, filters.platforms]);

  // Filter and sort templates
  const filteredTemplates = useMemo(() => {
    let filtered = [...templates];

    // Search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(template =>
        template.name.toLowerCase().includes(searchLower) ||
        template.description.toLowerCase().includes(searchLower) ||
        template.categories.some(cat => cat.toLowerCase().includes(searchLower))
      );
    }

    // Platform filter
    if (filters.platforms.length > 0) {
      filtered = filtered.filter(template =>
        filters.platforms.some(platform => template.platforms.includes(platform))
      );
    }

    // Featured filter
    if (filters.featured) {
      filtered = filtered.filter(template => template.isDefault);
    }

    // Favorites filter
    if (filters.favorites) {
      filtered = filtered.filter(template => favorites.has(template.id));
    }

    // Sort templates
    filtered.sort((a, b) => {
      switch (filters.sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'recent':
          return b.createdAt.getTime() - a.createdAt.getTime();
        case 'rating':
          // Mock rating sort
          return 0;
        case 'popularity':
        default:
          // Mock popularity sort - defaults first, then by name
          if (a.isDefault && !b.isDefault) return -1;
          if (!a.isDefault && b.isDefault) return 1;
          return a.name.localeCompare(b.name);
      }
    });

    return filtered;
  }, [templates, filters, favorites]);

  // Available platforms and categories for filters
  const availablePlatforms = useMemo(() => {
    const platforms = new Set<string>();
    templates.forEach(template => {
      template.platforms.forEach(platform => platforms.add(platform));
    });
    return Array.from(platforms);
  }, [templates]);

  const availableCategories = useMemo(() => {
    const categories = new Set<string>();
    templates.forEach(template => {
      template.categories.forEach(category => categories.add(category));
    });
    return Array.from(categories);
  }, [templates]);

  // Handle template selection
  const handleTemplateSelect = useCallback((template: MenuTemplate) => {
    setSelectedTemplate(template);
    onTemplateSelect(template);
  }, [onTemplateSelect]);

  // Handle favorite toggle
  const handleFavoriteToggle = useCallback((templateId: string) => {
    setFavorites(prev => {
      const newFavorites = new Set(prev);
      if (newFavorites.has(templateId)) {
        newFavorites.delete(templateId);
        toast.success('Removed from favorites');
      } else {
        newFavorites.add(templateId);
        toast.success('Added to favorites');
      }
      return newFavorites;
    });
  }, []);

  // Handle template duplication
  const handleTemplateDuplicate = useCallback((template: MenuTemplate) => {
    const duplicated: MenuTemplate = {
      ...template,
      id: `${template.id}-copy-${Date.now()}`,
      name: `${template.name} (Copy)`,
      isDefault: false,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    setTemplates(prev => [duplicated, ...prev]);
    toast.success('Template duplicated successfully');
  }, []);

  return (
    <div className={`menu-template-gallery h-full bg-gray-50 ${className}`}>
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Template Gallery</h1>
            <p className="text-gray-500 mt-1">
              Choose from professional menu templates or create your own
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`inline-flex items-center px-4 py-2 border rounded-lg transition-colors ${
                showFilters
                  ? 'border-blue-300 bg-blue-50 text-blue-700'
                  : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              <FunnelIcon className="w-4 h-4 mr-2" />
              Filters
            </button>

            <button className="inline-flex items-center px-4 py-2 text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 transition-colors">
              <PlusIcon className="w-4 h-4 mr-2" />
              Create Template
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search templates..."
            value={filters.search}
            onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>

      {/* Content */}
      <div className="flex h-[calc(100%-140px)]">
        {/* Filters Sidebar */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 300, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              className="flex-shrink-0 border-r border-gray-200 bg-gray-50"
            >
              <div className="p-4 h-full overflow-y-auto">
                <FilterPanel
                  filters={filters}
                  onFiltersChange={setFilters}
                  availablePlatforms={availablePlatforms}
                  availableCategories={availableCategories}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Templates Grid */}
        <div className="flex-1 overflow-y-auto p-6">
          {filteredTemplates.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              <AnimatePresence>
                {filteredTemplates.map(template => (
                  <TemplateCard
                    key={template.id}
                    template={template}
                    isSelected={selectedTemplate?.id === template.id}
                    isFavorited={favorites.has(template.id)}
                    onSelect={() => handleTemplateSelect(template)}
                    onPreview={() => setPreviewTemplate(template)}
                    onFavorite={() => handleFavoriteToggle(template.id)}
                    onDuplicate={() => handleTemplateDuplicate(template)}
                  />
                ))}
              </AnimatePresence>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <SparklesIcon className="w-16 h-16 text-gray-300 mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                No templates found
              </h3>
              <p className="text-gray-500 mb-6 max-w-md">
                No templates match your current filters. Try adjusting your search criteria or browse all templates.
              </p>
              <button
                onClick={() => setFilters({
                  search: '',
                  platforms: [],
                  categories: [],
                  featured: false,
                  favorites: false,
                  sortBy: 'popularity'
                })}
                className="px-4 py-2 text-blue-600 bg-blue-100 rounded-lg hover:bg-blue-200 transition-colors"
              >
                Clear Filters
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Template Preview Modal */}
      <AnimatePresence>
        {previewTemplate && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
            onClick={() => setPreviewTemplate(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Preview content would go here */}
              <div className="p-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">
                  {previewTemplate.name} Preview
                </h2>
                <p className="text-gray-600 mb-6">
                  {previewTemplate.description}
                </p>

                {/* Mock preview content */}
                <div className="bg-gray-100 rounded-lg p-8 text-center">
                  <SparklesIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">Template preview coming soon...</p>
                </div>

                <div className="flex justify-end space-x-3 mt-6">
                  <button
                    onClick={() => setPreviewTemplate(null)}
                    className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    Close
                  </button>
                  <button
                    onClick={() => {
                      handleTemplateSelect(previewTemplate);
                      setPreviewTemplate(null);
                    }}
                    className="px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Use Template
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};