import React, { useState, useCallback, useRef, useEffect } from 'react';
import { 
  XMarkIcon, 
  PlusIcon, 
  TrashIcon,
  PhotoIcon,
  ClockIcon,
  CurrencyDollarIcon,
  TagIcon,
  LanguageIcon,
  StarIcon,
  PencilIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '../../../contexts/AuthContext';
import { useLanguage } from '../../../contexts/LanguageContext';
import { MenuCategory, MenuProduct } from '../../../types/menu';
import toast from 'react-hot-toast';

interface EditProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProductUpdated: () => void;
  categories: MenuCategory[];
  product: MenuProduct | null;
}

interface PricingChannel {
  id: string;
  name: string;
  price: number;
  enabled: boolean;
}

interface LanguageField {
  code: string;
  name: string;
  value: string;
}

const INITIAL_PRICING_CHANNELS: PricingChannel[] = [
  { id: 'talabat', name: 'Talabat', price: 0, enabled: true },
  { id: 'careem', name: 'Careem', price: 0, enabled: true },
  { id: 'callcenter', name: 'Call Center', price: 0, enabled: true },
  { id: 'website', name: 'Website', price: 0, enabled: true }
];

const AVAILABLE_LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'ar', name: 'العربية' },
  { code: 'tr', name: 'Türkçe' },
  { code: 'fa', name: 'فارسی' },
  { code: 'ur', name: 'اردو' },
  { code: 'ku', name: 'کوردی' },
  { code: 'fr', name: 'Français' },
  { code: 'de', name: 'Deutsch' },
  { code: 'es', name: 'Español' },
  { code: 'ru', name: 'Русский' }
];

export const EditProductModal: React.FC<EditProductModalProps> = ({
  isOpen,
  onClose,
  onProductUpdated,
  categories,
  product
}) => {
  const { user } = useAuth();
  const { language, t } = useLanguage();
  
  const currency = user?.company?.defaultCurrency || 'JOD';
  
  // Form state
  const [loading, setLoading] = useState(false);
  
  // Multi-language fields
  const [nameFields, setNameFields] = useState<LanguageField[]>([
    { code: 'en', name: 'English', value: '' },
    { code: 'ar', name: 'العربية', value: '' }
  ]);
  
  const [descriptionFields, setDescriptionFields] = useState<LanguageField[]>([
    { code: 'en', name: 'English', value: '' },
    { code: 'ar', name: 'العربية', value: '' }
  ]);
  
  // Pricing
  const [pricingChannels, setPricingChannels] = useState<PricingChannel[]>(INITIAL_PRICING_CHANNELS);
  const [customChannels, setCustomChannels] = useState<PricingChannel[]>([]);
  
  // Other fields
  const [categoryId, setCategoryId] = useState('');
  const [basePrice, setBasePrice] = useState<number>(0);
  const [priority, setPriority] = useState<number | ''>('');
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');
  const [status, setStatus] = useState<number>(1);
  
  // Language dropdown state
  const [showNameLanguageDropdown, setShowNameLanguageDropdown] = useState(false);
  const [showDescriptionLanguageDropdown, setShowDescriptionLanguageDropdown] = useState(false);
  const [languageSearchTerm, setLanguageSearchTerm] = useState('');

  // Initialize form with product data when modal opens
  useEffect(() => {
    if (isOpen && product) {
      // Initialize name fields
      const nameEntries = Object.entries(product.name || {});
      const initialNameFields = nameEntries.length > 0 
        ? nameEntries.map(([code, value]) => ({
            code,
            name: AVAILABLE_LANGUAGES.find(lang => lang.code === code)?.name || code.toUpperCase(),
            value: (value as string) || ''
          }))
        : [{ code: 'en', name: 'English', value: '' }, { code: 'ar', name: 'العربية', value: '' }];
      
      setNameFields(initialNameFields);

      // Initialize description fields  
      const descEntries = Object.entries(product.description || {});
      const initialDescFields = descEntries.length > 0
        ? descEntries.map(([code, value]) => ({
            code,
            name: AVAILABLE_LANGUAGES.find(lang => lang.code === code)?.name || code.toUpperCase(),
            value: (value as string) || ''
          }))
        : [{ code: 'en', name: 'English', value: '' }, { code: 'ar', name: 'العربية', value: '' }];
      
      setDescriptionFields(initialDescFields);

      // Initialize other fields
      setCategoryId(product.categoryId || '');
      setBasePrice(product.basePrice || 0);
      setPriority(product.priority || '');
      setTags(product.tags || []);
      setStatus(product.status || 1);

      // Initialize pricing channels
      const productPricing = product.pricing || {};
      const initialPricing = INITIAL_PRICING_CHANNELS.map(channel => ({
        ...channel,
        price: productPricing[channel.id] || 0,
        enabled: productPricing.hasOwnProperty(channel.id)
      }));
      setPricingChannels(initialPricing);

      // Find custom channels (not in INITIAL_PRICING_CHANNELS)
      const standardChannelIds = INITIAL_PRICING_CHANNELS.map(c => c.id);
      const customPricing = Object.entries(productPricing)
        .filter(([channelId]) => !standardChannelIds.includes(channelId))
        .map(([id, price]) => ({
          id,
          name: id.charAt(0).toUpperCase() + id.slice(1),
          price: price as number,
          enabled: true
        }));
      setCustomChannels(customPricing);
    }
  }, [isOpen, product]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('[data-dropdown]')) {
        setShowNameLanguageDropdown(false);
        setShowDescriptionLanguageDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Add new language field
  const addLanguageField = useCallback((languageCode: string) => {
    const language = AVAILABLE_LANGUAGES.find(lang => lang.code === languageCode);
    if (!language) return;
    
    if (nameFields.some(field => field.code === languageCode)) {
      toast.error('This language has already been added');
      return;
    }
    
    const newField = { code: language.code, name: language.name, value: '' };
    
    setNameFields(prev => [...prev, newField]);
    setDescriptionFields(prev => [...prev, newField]);
    setShowNameLanguageDropdown(false);
    setLanguageSearchTerm('');
  }, [nameFields]);

  // Filter available languages
  const getAvailableLanguages = useCallback(() => {
    const usedLanguages = nameFields.map(field => field.code);
    
    return AVAILABLE_LANGUAGES
      .filter(lang => !usedLanguages.includes(lang.code))
      .filter(lang => 
        lang.name.toLowerCase().includes(languageSearchTerm.toLowerCase()) ||
        lang.code.toLowerCase().includes(languageSearchTerm.toLowerCase())
      );
  }, [nameFields, languageSearchTerm]);

  // Remove language field
  const removeLanguageField = useCallback((code: string) => {
    setNameFields(prev => prev.filter(field => field.code !== code));
    setDescriptionFields(prev => prev.filter(field => field.code !== code));
  }, []);

  // Update language field
  const updateLanguageField = useCallback((type: 'name' | 'description', code: string, value: string) => {
    if (type === 'name') {
      setNameFields(prev => prev.map(field => 
        field.code === code ? { ...field, value } : field
      ));
    } else {
      setDescriptionFields(prev => prev.map(field => 
        field.code === code ? { ...field, value } : field
      ));
    }
  }, []);

  // Update pricing channel
  const updatePricingChannel = useCallback((id: string, field: keyof PricingChannel, value: any) => {
    setPricingChannels(prev => prev.map(channel =>
      channel.id === id ? { ...channel, [field]: value } : channel
    ));
    setCustomChannels(prev => prev.map(channel =>
      channel.id === id ? { ...channel, [field]: value } : channel
    ));
  }, []);

  // Add tag
  const addTag = useCallback(() => {
    if (!newTag.trim() || tags.includes(newTag.trim())) return;
    setTags(prev => [...prev, newTag.trim()]);
    setNewTag('');
  }, [newTag, tags]);

  // Remove tag
  const removeTag = useCallback((tagToRemove: string) => {
    setTags(prev => prev.filter(tag => tag !== tagToRemove));
  }, []);

  // Submit form
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!product) {
      toast.error('No product to update');
      return;
    }
    
    // Validation
    const hasValidName = nameFields.some(field => field.value.trim());
    if (!hasValidName) {
      toast.error('Product name is required in at least one language');
      return;
    }
    
    if (!categoryId) {
      toast.error('Please select a category');
      return;
    }
    
    if (basePrice <= 0) {
      toast.error('Base price must be greater than 0');
      return;
    }

    setLoading(true);
    
    try {
      // Build localized objects
      const name = nameFields.reduce((obj, field) => {
        if (field.value.trim()) obj[field.code] = field.value.trim();
        return obj;
      }, {} as Record<string, string>);
      
      const description = descriptionFields.reduce((obj, field) => {
        if (field.value.trim()) obj[field.code] = field.value.trim();
        return obj;
      }, {} as Record<string, string>);
      
      // Build pricing object
      const allChannels = [...pricingChannels, ...customChannels];
      const enabledChannels = allChannels.filter(channel => channel.enabled);
      const pricing = enabledChannels.reduce((obj, channel) => {
        obj[channel.id] = channel.price;
        return obj;
      }, {} as Record<string, number>);
      
      // Update product
      const productData = {
        name,
        description: Object.keys(description).length > 0 ? description : undefined,
        basePrice,
        pricing,
        categoryId,
        priority: priority === '' ? 999 : priority, // Default to 999 if not specified
        tags,
        status
      };

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/menu/products/${product.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth-token')}`
        },
        body: JSON.stringify(productData)
      });

      if (response.ok) {
        toast.success('Product updated successfully!');
        onProductUpdated();
        onClose();
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update product');
      }
    } catch (error) {
      console.error('Error updating product:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to update product');
    } finally {
      setLoading(false);
    }
  }, [nameFields, descriptionFields, categoryId, basePrice, priority, tags, status, pricingChannels, customChannels, product, onProductUpdated, onClose]);

  // Handle close
  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  if (!isOpen || !product) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        {/* Backdrop */}
        <div className="fixed inset-0 bg-black bg-opacity-50 transition-opacity" onClick={handleClose} />
        
        {/* Modal */}
        <div className="relative bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div className="flex items-center space-x-3">
              <div className="flex items-center justify-center w-8 h-8 bg-blue-100 rounded-lg">
                <PencilIcon className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Edit Product</h2>
                <p className="text-sm text-gray-500">Update product information</p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="overflow-y-auto max-h-[calc(90vh-200px)]">
            <form onSubmit={handleSubmit} className="p-6 space-y-8">
              
              {/* Multi-language Names */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="flex items-center text-sm font-medium text-gray-700">
                    <LanguageIcon className="w-4 h-4 mr-2" />
                    Product Name *
                  </label>
                  <div className="relative" data-dropdown>
                    <button
                      type="button"
                      onClick={() => setShowNameLanguageDropdown(!showNameLanguageDropdown)}
                      className="text-xs text-blue-600 hover:text-blue-700 flex items-center"
                    >
                      <PlusIcon className="w-3 h-3 mr-1" />
                      Add Language
                    </button>
                    
                    {showNameLanguageDropdown && (
                      <div className="absolute right-0 top-6 bg-white border border-gray-300 rounded-lg shadow-lg z-50 w-48">
                        <div className="p-2">
                          <input
                            type="text"
                            placeholder="Search languages..."
                            value={languageSearchTerm}
                            onChange={(e) => setLanguageSearchTerm(e.target.value)}
                            className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        </div>
                        <div className="max-h-32 overflow-y-auto">
                          {getAvailableLanguages().map((lang) => (
                            <button
                              key={lang.code}
                              type="button"
                              onClick={() => addLanguageField(lang.code)}
                              className="w-full text-left px-3 py-2 text-xs hover:bg-gray-100 flex items-center justify-between"
                            >
                              <span>{lang.name}</span>
                              <span className="text-gray-500">{lang.code.toUpperCase()}</span>
                            </button>
                          ))}
                          {getAvailableLanguages().length === 0 && (
                            <div className="px-3 py-2 text-xs text-gray-500">No languages available</div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {nameFields.map((field) => (
                    <div key={field.code} className="relative">
                      <div className="flex items-center space-x-2">
                        <input
                          type="text"
                          value={field.value}
                          onChange={(e) => updateLanguageField('name', field.code, e.target.value)}
                          placeholder={`Product name in ${field.name}`}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          dir={field.code === 'ar' ? 'rtl' : 'ltr'}
                        />
                        <span className="text-xs text-gray-500 w-8">{field.code.toUpperCase()}</span>
                        {nameFields.length > 1 && field.code !== 'en' && (
                          <button
                            type="button"
                            onClick={() => removeLanguageField(field.code)}
                            className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                          >
                            <TrashIcon className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Multi-language Descriptions */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="flex items-center text-sm font-medium text-gray-700">
                    <LanguageIcon className="w-4 h-4 mr-2" />
                    Description
                  </label>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {descriptionFields.map((field) => (
                    <div key={field.code} className="relative">
                      <div className="flex items-start space-x-2">
                        <textarea
                          value={field.value}
                          onChange={(e) => updateLanguageField('description', field.code, e.target.value)}
                          placeholder={`Description in ${field.name}`}
                          rows={3}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                          dir={field.code === 'ar' ? 'rtl' : 'ltr'}
                        />
                        <div className="flex flex-col items-center space-y-1">
                          <span className="text-xs text-gray-500 w-8">{field.code.toUpperCase()}</span>
                          {descriptionFields.length > 1 && field.code !== 'en' && (
                            <button
                              type="button"
                              onClick={() => removeLanguageField(field.code)}
                              className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                            >
                              <TrashIcon className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Category and Base Price */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Category *
                  </label>
                  <select
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  >
                    <option value="">Select a category</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name.en || category.name.ar}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                    <CurrencyDollarIcon className="w-4 h-4 mr-2" />
                    Default Price *
                  </label>
                  <input
                    type="number"
                    value={basePrice}
                    onChange={(e) => setBasePrice(Number(e.target.value))}
                    min="0"
                    step="0.01"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    required
                  />
                </div>
              </div>

              {/* Platform Pricing */}
              <div className="space-y-4">
                <label className="flex items-center text-sm font-medium text-gray-700">
                  <CurrencyDollarIcon className="w-4 h-4 mr-2" />
                  Platform Pricing
                </label>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[...pricingChannels, ...customChannels].map((channel) => (
                    <div key={channel.id} className="bg-gray-50 p-3 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <label className="flex items-center text-xs font-medium">
                          <input
                            type="checkbox"
                            checked={channel.enabled}
                            onChange={(e) => updatePricingChannel(channel.id, 'enabled', e.target.checked)}
                            className="mr-2"
                          />
                          {channel.name}
                        </label>
                      </div>
                      <input
                        type="number"
                        value={channel.price}
                        onChange={(e) => updatePricingChannel(channel.id, 'price', Number(e.target.value))}
                        min="0"
                        step="0.01"
                        disabled={!channel.enabled}
                        className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Priority */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                    <StarIcon className="w-4 h-4 mr-2" />
                    Display Priority (Lower = Higher Priority)
                  </label>
                  <input
                    type="number"
                    value={priority}
                    onChange={(e) => setPriority(e.target.value === '' ? '' : Number(e.target.value))}
                    min="1"
                    placeholder="Enter priority number"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Controls display order in menus (lower numbers appear first)
                  </p>
                </div>
                
                <div>
                  <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                    <ClockIcon className="w-4 h-4 mr-2" />
                    Preparation Time
                  </label>
                  <div className="bg-blue-50 p-3 rounded-lg">
                    <p className="text-sm text-blue-700 font-medium flex items-center mb-2">
                      ⚡ Auto-calculated
                    </p>
                    <p className="text-xs text-blue-600">
                      Current: {product?.preparationTime || 0} minutes
                    </p>
                  </div>
                </div>
              </div>

              {/* Tags */}
              <div className="space-y-4">
                <label className="flex items-center text-sm font-medium text-gray-700">
                  <TagIcon className="w-4 h-4 mr-2" />
                  Tags
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                    placeholder="Add a tag"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <button
                    type="button"
                    onClick={addTag}
                    className="px-3 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
                  >
                    Add
                  </button>
                </div>
                {tags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {tags.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-700 text-sm rounded-md"
                      >
                        {tag}
                        <button
                          type="button"
                          onClick={() => removeTag(tag)}
                          className="ml-1 text-blue-500 hover:text-blue-700"
                        >
                          <XMarkIcon className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Status */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Status
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value={1}>Active</option>
                  <option value={0}>Inactive</option>
                </select>
              </div>
            </form>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 bg-gray-50">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            
            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Updating...' : 'Update Product'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};