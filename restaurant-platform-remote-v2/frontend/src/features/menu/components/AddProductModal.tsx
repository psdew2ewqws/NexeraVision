import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { 
  XMarkIcon, 
  PlusIcon, 
  TrashIcon,
  PhotoIcon,
  ArrowRightIcon,
  ClockIcon,
  CurrencyDollarIcon,
  TagIcon,
  LanguageIcon,
  StarIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '../../../contexts/AuthContext';
import { useLanguage } from '../../../contexts/LanguageContext';
import { MenuCategory } from '../../../types/menu';
import { AddOnManagement, ModifierCategory } from './AddOnManagement';
import toast from 'react-hot-toast';

interface AddProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProductAdded: () => void;
  categories: MenuCategory[];
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

interface ProductImages {
  files: File[];
  previews: string[];
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

export const AddProductModal: React.FC<AddProductModalProps> = ({
  isOpen,
  onClose,
  onProductAdded,
  categories
}) => {
  const { user } = useAuth();
  const { language, t } = useLanguage();
  
  // Get currency from user's company settings
  const currency = user?.company?.defaultCurrency || 'JOD';
  const fileInputRef = useRef<HTMLInputElement>(null);
  
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

  // Load companies for super admin
  useEffect(() => {
    if (user?.role === 'super_admin' && isOpen) {
      const loadCompanies = async () => {
        try {
          const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/companies/list`, {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('auth-token')}`
            }
          });
          if (response.ok) {
            const data = await response.json();
            console.log('Companies loaded:', data);
            setCompanies(data.companies || []);
          }
        } catch (error) {
          console.error('Failed to load companies:', error);
        }
      };
      loadCompanies();
    }
  }, [user?.role, isOpen]);
  
  // Form state
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(1); // 1: Basic Info, 2: Add-ons
  const [tempProductId, setTempProductId] = useState<string | null>(null);
  
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
  const [newChannelName, setNewChannelName] = useState('');
  
  // Other fields
  const [categoryId, setCategoryId] = useState('');
  const [companyId, setCompanyId] = useState('');
  const [companies, setCompanies] = useState<any[]>([]);
  const [basePrice, setBasePrice] = useState<number>(0);
  const [defaultPrice, setDefaultPrice] = useState<number>(0);
  const [priority, setPriority] = useState<number | ''>('');
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');
  const [status, setStatus] = useState<number>(1);
  
  // Preparation time is always auto-calculated
  const useAutoPreparationTime = true;

  // Filter categories based on selected company for super_admin users
  const availableCategories = useMemo(() => {
    if (user?.role === 'super_admin' && companyId) {
      // For super_admin: only show categories that belong to the selected company
      return categories.filter(category => category.companyId === companyId);
    }
    // For regular users: show all categories (already filtered by backend)
    return categories;
  }, [categories, user?.role, companyId]);
  
  // Images
  const [productImages, setProductImages] = useState<ProductImages>({
    files: [],
    previews: []
  });

  // Language dropdown state
  const [showNameLanguageDropdown, setShowNameLanguageDropdown] = useState(false);
  const [showDescriptionLanguageDropdown, setShowDescriptionLanguageDropdown] = useState(false);
  const [languageSearchTerm, setLanguageSearchTerm] = useState('');

  // Handle default price change - automatically apply to all enabled platforms
  const handleDefaultPriceChange = useCallback((newPrice: number) => {
    setDefaultPrice(newPrice);
    // Update basePrice to match
    setBasePrice(newPrice);
    // Apply to all enabled pricing channels
    if (newPrice > 0) {
      setPricingChannels(prev => prev.map(channel => ({
        ...channel,
        price: channel.enabled ? newPrice : channel.price
      })));
      setCustomChannels(prev => prev.map(channel => ({
        ...channel,
        price: channel.enabled ? newPrice : channel.price
      })));
    }
  }, []);

  // Add new language field (syncs between name and description)
  const addLanguageField = useCallback((languageCode: string) => {
    const language = AVAILABLE_LANGUAGES.find(lang => lang.code === languageCode);
    if (!language) return;
    
    if (nameFields.some(field => field.code === languageCode)) {
      toast.error('This language has already been added');
      return;
    }
    
    const newField = { code: language.code, name: language.name, value: '' };
    
    // Add to both name and description fields
    setNameFields(prev => [...prev, newField]);
    setDescriptionFields(prev => [...prev, newField]);
    setShowNameLanguageDropdown(false);
    setLanguageSearchTerm('');
  }, [nameFields]);

  // Filter available languages based on search
  const getAvailableLanguages = useCallback(() => {
    const usedLanguages = nameFields.map(field => field.code);
    
    return AVAILABLE_LANGUAGES
      .filter(lang => !usedLanguages.includes(lang.code))
      .filter(lang => 
        lang.name.toLowerCase().includes(languageSearchTerm.toLowerCase()) ||
        lang.code.toLowerCase().includes(languageSearchTerm.toLowerCase())
      );
  }, [nameFields, languageSearchTerm]);

  // Remove language field (syncs between name and description)
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

  // Add custom pricing channel
  const addCustomPricingChannel = useCallback(() => {
    if (!newChannelName.trim()) {
      toast.error('Please enter a channel name');
      return;
    }
    
    const newChannel: PricingChannel = {
      id: newChannelName.toLowerCase().replace(/\s+/g, '_'),
      name: newChannelName,
      price: 0,
      enabled: true
    };
    
    setCustomChannels(prev => [...prev, newChannel]);
    setNewChannelName('');
  }, [newChannelName]);

  // Remove custom pricing channel
  const removeCustomChannel = useCallback((id: string) => {
    setCustomChannels(prev => prev.filter(channel => channel.id !== id));
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

  // Handle image upload (single image only)
  const handleImageUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;

    const file = files[0]; // Only take the first file
    
    // Validate file
    const isValidType = file.type.startsWith('image/');
    const isValidSize = file.size <= 50 * 1024 * 1024; // 50MB
    
    if (!isValidType) {
      toast.error(`${file.name} is not a valid image file`);
      return;
    }
    if (!isValidSize) {
      toast.error(`${file.name} is too large. Maximum size is 50MB`);
      return;
    }

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setProductImages({
        files: [file],
        previews: [e.target?.result as string]
      });
    };
    reader.readAsDataURL(file);
  }, []);

  // Remove image
  const removeImage = useCallback((index: number) => {
    setProductImages(prev => ({
      files: prev.files.filter((_, i) => i !== index),
      previews: prev.previews.filter((_, i) => i !== index)
    }));
  }, []);

  // Submit form
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    const hasValidName = nameFields.some(field => field.value.trim());
    if (!hasValidName) {
      toast.error('Product name is required in at least one language');
      return;
    }
    
    if (user?.role === 'super_admin' && !companyId) {
      toast.error('Please select a company/brand');
      return;
    }
    
    if (!categoryId) {
      toast.error('Please select a category');
      return;
    }
    
    if (defaultPrice <= 0) {
      toast.error('Default pricing must be greater than 0');
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
      
      // Upload images first if any
      let imageUrls: string[] = [];
      if (productImages.files.length > 0) {
        const formData = new FormData();
        productImages.files.forEach(file => {
          formData.append('images', file);
        });
        
        const uploadResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/menu/products/upload-images`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('auth-token')}`
          },
          body: formData
        });
        
        if (uploadResponse.ok) {
          const uploadResult = await uploadResponse.json();
          imageUrls = uploadResult.map((img: any) => img.url);
          toast.success(`${uploadResult.length} images uploaded and optimized`);
        }
      }
      
      // Create product
      const productData = {
        name,
        description: Object.keys(description).length > 0 ? description : undefined,
        basePrice,
        pricing,
        categoryId,
        priority: priority === '' ? 999 : priority, // Default to 999 if not specified
        tags,
        status,
        images: imageUrls,
        image: imageUrls[0], // Primary image
        calculatePreparationTime: true,
        // Use selected company for super admin, user's company for others
        companyId: user?.role === 'super_admin' ? companyId : user?.companyId
      };

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/menu/products`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth-token')}`
        },
        body: JSON.stringify(productData)
      });

      if (response.ok) {
        const result = await response.json();
        
        // Update images with the new productId if any were uploaded
        if (imageUrls.length > 0 && result.id) {
          await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/menu/images/update-product`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('auth-token')}`
            },
            body: JSON.stringify({
              imageUrls,
              productId: result.id
            })
          });
        }
        
        toast.success('Product created successfully!');
        
        // Reset form
        resetForm();
        onProductAdded();
        onClose();
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create product');
      }
    } catch (error) {
      console.error('Error creating product:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to create product');
    } finally {
      setLoading(false);
    }
  }, [
    nameFields, descriptionFields, categoryId, basePrice, priority, tags, status,
    pricingChannels, customChannels, productImages, user?.companyId, user?.role, companyId, defaultPrice, onProductAdded, onClose
  ]);

  // Reset form
  const resetForm = useCallback(() => {
    setNameFields([
      { code: 'en', name: 'English', value: '' },
      { code: 'ar', name: 'العربية', value: '' }
    ]);
    setDescriptionFields([
      { code: 'en', name: 'English', value: '' },
      { code: 'ar', name: 'العربية', value: '' }
    ]);
    setCategoryId('');
    setCompanyId('');
    setBasePrice(0);
    setDefaultPrice(0);
    setPriority('');
    setTags([]);
    setNewTag('');
    setStatus(1);
    setPricingChannels(INITIAL_PRICING_CHANNELS);
    setCustomChannels([]);
    setNewChannelName('');
    // Preparation time is always auto-calculated
    setProductImages({ files: [], previews: [] });
    setCurrentStep(1);
    setTempProductId(null);
  }, []);

  // Handle close
  const handleClose = useCallback(() => {
    resetForm();
    onClose();
  }, [resetForm, onClose]);

  // Go to add-ons step
  const goToAddOnsStep = useCallback(async () => {
    // Validate required fields before proceeding
    const englishName = nameFields.find(field => field.code === 'en')?.value || '';
    if (!englishName || !categoryId || !basePrice || basePrice <= 0) {
      toast.error('Please fill in all required fields before proceeding to add-ons');
      return;
    }

    // First, save the basic product
    try {
      setLoading(true);
      
      // Upload images first if any
      let imageUrls: string[] = [];
      if (productImages.files.length > 0) {
        const formData = new FormData();
        productImages.files.forEach(file => {
          formData.append('images', file);
        });
        
        const uploadResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/menu/products/upload-images`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('auth-token')}`
          },
          body: formData,
        });

        if (!uploadResponse.ok) {
          throw new Error('Failed to upload images');
        }

        const uploadResult = await uploadResponse.json();
        imageUrls = uploadResult.map((img: any) => img.url);
      }
      
      const productData = {
        name: Object.fromEntries(nameFields.map(field => [field.code, field.value])),
        description: Object.fromEntries(descriptionFields.map(field => [field.code, field.value])),
        categoryId,
        basePrice,
        priority: priority || 1,
        tags,
        status,
        companyId: user?.role === 'super_admin' ? companyId : user?.companyId,
        images: imageUrls,
        pricing: {
          ...Object.fromEntries(
            pricingChannels.filter(channel => channel.enabled).map(channel => [channel.id, channel.price])
          ),
          customChannels: customChannels.filter(channel => channel.enabled)
        }
      };

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/menu/products`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth-token')}`,
        },
        body: JSON.stringify(productData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create product');
      }

      const savedProduct = await response.json();
      setCurrentStep(2);
      setTempProductId(savedProduct.id); // Store the product ID for add-ons
      toast.success('Product created! Now configure add-ons.');
    } catch (error: any) {
      console.error('Error creating product:', error);
      toast.error(error.message || 'Failed to create product');
    } finally {
      setLoading(false);
    }
  }, [nameFields, descriptionFields, categoryId, basePrice, priority, tags, status, companyId, user, productImages, pricingChannels]);

  if (!isOpen) return null;

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
                <PlusIcon className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Add New Product</h2>
                <p className="text-sm text-gray-500">Create a menu item with multi-language support and advanced pricing</p>
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
            {currentStep === 1 ? (
              <form onSubmit={handleSubmit} className="divide-y divide-gray-100">
              
              {/* Basic Information Section */}
              <div className="p-6 space-y-6">
                <div className="flex items-center space-x-2 mb-4">
                  <div className="w-1 h-6 bg-blue-500 rounded-full"></div>
                  <h3 className="text-lg font-semibold text-gray-900">Basic Information</h3>
                </div>
                
                {/* Company and Category */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Company Selector for Super Admin */}
                {user?.role === 'super_admin' && (
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Company/Brand *
                    </label>
                    <select
                      value={companyId}
                      onChange={(e) => setCompanyId(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    >
                      <option value="">Select a company/brand</option>
                      {companies.map((company) => (
                        <option key={company.id} value={company.id}>
                          {company.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Category *
                  </label>
                  <select
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  >
                    <option value="">
                      {availableCategories.length === 0 && user?.role === 'super_admin' && companyId 
                        ? 'No categories available for selected company' 
                        : 'Select a category'}
                    </option>
                    {availableCategories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name.en || category.name.ar}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

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

              </div>
              
              {/* Pricing Section */}
              <div className="p-6 space-y-6">
                <div className="flex items-center space-x-2 mb-4">
                  <div className="w-1 h-6 bg-green-500 rounded-full"></div>
                  <h3 className="text-lg font-semibold text-gray-900">Pricing & Channels</h3>
                </div>
                
                {/* Default Pricing */}
                <div className="border border-gray-200 p-4 rounded-lg bg-gray-50">
                <div className="flex items-center space-x-3">
                  <label className="text-sm font-medium text-gray-700 whitespace-nowrap">
                    Default Pricing:
                  </label>
                  <div className="flex items-center space-x-2">
                    <div className="relative">
                      <input
                        type="number"
                        value={defaultPrice}
                        onChange={(e) => handleDefaultPriceChange(Number(e.target.value))}
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                        className="w-24 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                      <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-xs text-gray-500 font-medium">{currency}</span>
                    </div>
                  </div>
                  <span className="text-xs text-gray-500">applies to all platforms</span>
                </div>
              </div>

                {/* Delivery Platform Pricing */}
                <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="flex items-center text-sm font-medium text-gray-700">
                    <CurrencyDollarIcon className="w-4 h-4 mr-2" />
                    Platform Pricing
                  </label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="text"
                      value={newChannelName}
                      onChange={(e) => setNewChannelName(e.target.value)}
                      placeholder="Custom channel name"
                      className="px-2 py-1 text-xs border border-gray-300 rounded"
                    />
                    <button
                      type="button"
                      onClick={addCustomPricingChannel}
                      className="text-xs text-blue-600 hover:text-blue-700 flex items-center"
                    >
                      <PlusIcon className="w-3 h-3 mr-1" />
                      Add
                    </button>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {[...pricingChannels, ...customChannels].map((channel) => (
                    <div key={channel.id} className="bg-white border border-gray-200 p-4 rounded-lg hover:shadow-sm transition-shadow">
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
                        {customChannels.some(c => c.id === channel.id) && (
                          <button
                            type="button"
                            onClick={() => removeCustomChannel(channel.id)}
                            className="text-gray-400 hover:text-red-500"
                          >
                            <TrashIcon className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                      <div className="relative">
                        <input
                          type="number"
                          value={channel.price}
                          onChange={(e) => updatePricingChannel(channel.id, 'price', Number(e.target.value))}
                          min="0"
                          step="0.01"
                          disabled={!channel.enabled}
                          className="w-full pl-3 pr-8 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500"
                        />
                        <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-xs text-gray-500">{currency}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              </div>
              
              {/* Settings & Configuration */}
              <div className="p-6 space-y-6">
                <div className="flex items-center space-x-2 mb-4">
                  <div className="w-1 h-6 bg-purple-500 rounded-full"></div>
                  <h3 className="text-lg font-semibold text-gray-900">Settings & Configuration</h3>
                </div>
                
                {/* Priority and Preparation Time */}
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
                      Preparation time is automatically calculated using delivery time data across all branches to provide accurate estimates.
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

              </div>
              
              {/* Media & Assets */}
              <div className="p-6 space-y-6">
                <div className="flex items-center space-x-2 mb-4">
                  <div className="w-1 h-6 bg-orange-500 rounded-full"></div>
                  <h3 className="text-lg font-semibold text-gray-900">Media & Assets</h3>
                </div>
                
                {/* Image Upload */}
                <div className="space-y-4">
                <label className="flex items-center text-sm font-medium text-gray-700">
                  <PhotoIcon className="w-4 h-4 mr-2" />
                  Product Images
                </label>
                
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 bg-gray-50 hover:bg-gray-100 transition-colors">
                  <div className="text-center">
                    <PhotoIcon className="mx-auto h-12 w-12 text-gray-400" />
                    <div className="mt-4">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="inline-flex items-center px-6 py-3 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200 shadow-sm hover:shadow-md"
                      >
                        <PhotoIcon className="w-4 h-4 mr-2" />
                        Upload Images
                      </button>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                      />
                    </div>
                    <p className="mt-2 text-xs text-gray-500">
                      Upload one image. Files will be automatically resized to 1280x720 and optimized to ~1MB.
                    </p>
                  </div>
                </div>

                {/* Image Preview */}
                {productImages.previews.length > 0 && (
                  <div className="flex justify-center">
                    <div className="relative group w-48 h-32">
                      <img
                        src={productImages.previews[0]}
                        alt="Product image"
                        className="w-full h-full object-cover rounded-lg border border-gray-300"
                      />
                      <button
                        type="button"
                        onClick={() => removeImage(0)}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <XMarkIcon className="w-3 h-3" />
                      </button>
                      <div className="absolute bottom-1 left-1 bg-blue-500 text-white px-1 py-0.5 rounded text-xs">
                        Product Image
                      </div>
                    </div>
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
            
            <div className="flex items-center space-x-3">
              <button
                type="button"
                onClick={handleSubmit}
                disabled={loading}
                className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? 'Creating...' : 'Create Product'}
              </button>
              
              <button
                type="button"
                onClick={goToAddOnsStep}
                disabled={loading}
                className="inline-flex items-center px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Next: Add-ons
                <ArrowRightIcon className="ml-2 w-4 h-4" />
              </button>
            </div>
          </div>
        </form>
            ) : currentStep === 2 && tempProductId ? (
              <AddOnManagement
                productId={tempProductId}
                onBack={() => setCurrentStep(1)}
                onSave={(categories) => {
                  toast.success('Add-ons configuration saved successfully!');
                  onProductAdded();
                  handleClose();
                }}
                className="p-6"
              />
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
};