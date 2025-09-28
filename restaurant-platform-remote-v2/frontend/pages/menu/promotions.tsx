// Enterprise Promotion Management - B2B Professional
import React, { useState, useCallback, useEffect, useMemo } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { 
  PlusIcon,
  DocumentDuplicateIcon,
  ChartBarIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  PlayIcon,
  PauseIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ArrowLeftIcon,
  TagIcon,
  ReceiptPercentIcon,
  UserGroupIcon,
  CalendarIcon,
  XMarkIcon,
  InformationCircleIcon,
  ClockIcon,
  GlobeAltIcon,
  CurrencyDollarIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '../../src/contexts/AuthContext';
import ProtectedRoute from '../../src/components/ProtectedRoute';
import toast from 'react-hot-toast';

// Types based on our backend schema
interface PromotionCampaign {
  id: string;
  name: Record<string, string>;
  description?: Record<string, string>;
  slug: string;
  type: 'percentage_discount' | 'fixed_discount' | 'buy_x_get_y' | 'free_shipping' | 'minimum_order' | 'loyalty_points' | 'first_time_customer' | 'happy_hour' | 'bulk_discount' | 'combo_deal' | 'platform_exclusive';
  status: 'draft' | 'active' | 'paused' | 'expired' | 'archived';
  priority: number;
  isPublic: boolean;
  isStackable: boolean;
  startsAt?: string;
  endsAt?: string;
  discountValue?: number;
  maxDiscountAmount?: number;
  minimumOrderAmount?: number;
  totalUsageLimit?: number;
  perCustomerLimit?: number;
  currentUsageCount: number;
  buyQuantity?: number;
  getQuantity?: number;
  getDiscountPercentage?: number;
  codes: PromotionCode[];
  targets: PromotionTarget[];
  targetPlatforms: string[];
  targetCustomerSegments: string[];
  createdAt: string;
  updatedAt: string;
  _count?: {
    usage: number;
    codes: number;
  };
}

interface PromotionCode {
  id: string;
  code: string;
  isActive: boolean;
  usageCount: number;
}

interface PromotionTarget {
  targetType: string;
  targetId: string;
}

interface PromotionFilters {
  status?: string;
  type?: string;
  platform?: string;
  search: string;
  sortBy: 'priority' | 'createdAt' | 'updatedAt' | 'currentUsageCount';
  sortOrder: 'asc' | 'desc';
}

const PromotionTypeLabels = {
  percentage_discount: 'Percentage Discount',
  fixed_discount: 'Fixed Amount',
  buy_x_get_y: 'Buy X Get Y',
  free_shipping: 'Free Shipping',
  minimum_order: 'Minimum Order',
  loyalty_points: 'Loyalty Points',
  first_time_customer: 'New Customer',
  happy_hour: 'Happy Hour',
  bulk_discount: 'Bulk Discount',
  combo_deal: 'Combo Deal',
  platform_exclusive: 'Platform Exclusive'
};

const StatusColors = {
  draft: 'bg-gray-100 text-gray-800 border-gray-200',
  active: 'bg-green-100 text-green-800 border-green-200',
  paused: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  expired: 'bg-red-100 text-red-800 border-red-200',
  archived: 'bg-gray-100 text-gray-600 border-gray-200'
};

const PlatformIcons = {
  talabat: '🛵',
  careem: '🚗',
  website: '🌐',
  call_center: '📞'
};

// Form data interface for creating campaigns
interface CreateCampaignFormData {
  name: { en: string; ar?: string };
  description?: { en?: string; ar?: string };
  slug: string;
  type: keyof typeof PromotionTypeLabels;
  status?: 'draft' | 'active' | 'paused' | 'expired' | 'archived';
  priority: number;
  isPublic: boolean;
  isStackable: boolean;
  startsAt?: string;
  endsAt?: string;
  discountValue?: number;
  maxDiscountAmount?: number;
  minimumOrderAmount?: number;
  totalUsageLimit?: number;
  perCustomerLimit?: number;
  buyQuantity?: number;
  getQuantity?: number;
  getDiscountPercentage?: number;
  targetPlatforms: string[];
  targetCustomerSegments: string[];
  codes: string[];
}

// Create Campaign Modal Component
interface CreateCampaignModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (campaign: PromotionCampaign) => void;
}

// Company interface for dropdown
interface Company {
  id: string;
  name: string;
  slug: string;
}

function CreateCampaignModal({ isOpen, onClose, onSuccess }: CreateCampaignModalProps) {
  const { token, user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [currentStep, setCurrentStep] = useState(1);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('');
  
  const [formData, setFormData] = useState<CreateCampaignFormData>({
    name: { en: '' },
    description: { en: '', ar: '' },
    slug: '',
    type: 'percentage_discount',
    priority: 999,
    isPublic: true,
    isStackable: false,
    startsAt: '',
    endsAt: '',
    discountValue: 0,
    maxDiscountAmount: undefined,
    minimumOrderAmount: undefined,
    totalUsageLimit: undefined,
    perCustomerLimit: 1,
    buyQuantity: undefined,
    getQuantity: undefined,
    getDiscountPercentage: undefined,
    targetPlatforms: [],
    targetCustomerSegments: [],
    codes: []
  });

  // Load companies for super admin
  useEffect(() => {
    if (user?.role === 'super_admin' && isOpen) {
      const fetchCompanies = async () => {
        try {
          const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1'}/companies/list`, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          });
          
          if (response.ok) {
            const result = await response.json();
            setCompanies(result.companies || []);
          }
        } catch (err) {
          console.error('Failed to load companies:', err);
        }
      };
      
      fetchCompanies();
    }
  }, [user, isOpen, token]);

  // Auto-generate slug from name
  const updateSlug = (name: string) => {
    const slug = name.toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
    setFormData(prev => ({ ...prev, slug }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.en.trim()) {
      setError('Campaign name is required');
      return;
    }
    if (!formData.slug.trim()) {
      setError('Campaign slug is required');
      return;
    }
    if (!formData.discountValue || formData.discountValue <= 0) {
      setError('Discount value must be greater than 0');
      return;
    }
    // For super admin, company selection is required
    if (user?.role === 'super_admin' && !selectedCompanyId) {
      setError('Please select a company for this campaign');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const payload = {
        ...formData,
        // Ensure required fields have proper defaults
        status: 'draft' as const,
        priority: formData.priority || 999,
        perCustomerLimit: formData.perCustomerLimit || 1,
        codes: formData.codes.length > 0 ? formData.codes : [`${formData.slug.toUpperCase()}${Math.floor(Math.random() * 1000)}`],
        // Fix date fields: convert empty strings to undefined or null
        startsAt: formData.startsAt && formData.startsAt.trim() ? formData.startsAt : undefined,
        endsAt: formData.endsAt && formData.endsAt.trim() ? formData.endsAt : undefined,
        // Add company assignment for super admin
        ...(user?.role === 'super_admin' && selectedCompanyId && { companyId: selectedCompanyId }),
      };

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1'}/promotion-campaigns`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        if (response.status === 401) {
          // Token is invalid or expired, redirect to login
          localStorage.removeItem('auth-token');
          localStorage.removeItem('user');
          window.location.href = '/login';
          return;
        }
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP ${response.status}`);
      }

      const result = await response.json();
      onSuccess(result.data);
      
      // Reset form
      setFormData({
        name: { en: '' },
        description: { en: '', ar: '' },
        slug: '',
        type: 'percentage_discount',
        priority: 999,
        isPublic: true,
        isStackable: false,
        startsAt: '',
        endsAt: '',
        discountValue: 0,
        maxDiscountAmount: undefined,
        minimumOrderAmount: undefined,
        totalUsageLimit: undefined,
        perCustomerLimit: 1,
        buyQuantity: undefined,
        getQuantity: undefined,
        getDiscountPercentage: undefined,
        targetPlatforms: [],
        targetCustomerSegments: [],
        codes: []
      });
      setCurrentStep(1);
      setSelectedCompanyId('');
      
    } catch (err: any) {
      setError(err.message || 'Failed to create campaign');
    } finally {
      setLoading(false);
    }
  };

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setError('');
      setCurrentStep(1);
      setSelectedCompanyId('');
      setFormData({
        name: { en: '' },
        description: { en: '', ar: '' },
        slug: '',
        type: 'percentage_discount',
        priority: 999,
        isPublic: true,
        isStackable: false,
        startsAt: '',
        endsAt: '',
        discountValue: 0,
        maxDiscountAmount: undefined,
        minimumOrderAmount: undefined,
        totalUsageLimit: undefined,
        perCustomerLimit: 1,
        buyQuantity: undefined,
        getQuantity: undefined,
        getDiscountPercentage: undefined,
        targetPlatforms: [],
        targetCustomerSegments: [],
        codes: []
      });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Create New Campaign</h2>
            <p className="text-sm text-gray-500 mt-1">Step {currentStep} of 3</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex">
                <ExclamationTriangleIcon className="h-5 w-5 text-red-400 mr-2" />
                <span className="text-sm text-red-700">{error}</span>
              </div>
            </div>
          )}

          {currentStep === 1 && (
            <div className="space-y-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Basic Information</h3>
              
              {/* Company Selection for Super Admin */}
              {user?.role === 'super_admin' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Target Company *
                  </label>
                  <select
                    value={selectedCompanyId}
                    onChange={(e) => setSelectedCompanyId(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                    required
                  >
                    <option value="">Select a company...</option>
                    {companies.map((company) => (
                      <option key={company.id} value={company.id}>
                        {company.name}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">Choose which company this campaign belongs to</p>
                </div>
              )}
              
              {/* Campaign Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Campaign Name (English) *
                </label>
                <input
                  type="text"
                  value={formData.name.en}
                  onChange={(e) => {
                    setFormData(prev => ({ 
                      ...prev, 
                      name: { ...prev.name, en: e.target.value }
                    }));
                    updateSlug(e.target.value);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g., Summer Sale 2024"
                />
              </div>

              {/* Campaign Name Arabic */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Campaign Name (Arabic)
                </label>
                <input
                  type="text"
                  value={formData.name.ar || ''}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    name: { ...prev.name, ar: e.target.value }
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g., تخفيضات الصيف ٢٠٢٤"
                  dir="rtl"
                />
              </div>

              {/* Slug */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  URL Slug *
                </label>
                <input
                  type="text"
                  value={formData.slug}
                  onChange={(e) => setFormData(prev => ({ ...prev, slug: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                  placeholder="summer-sale-2024"
                />
                <p className="text-xs text-gray-500 mt-1">Used in URLs and references</p>
              </div>

              {/* Campaign Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Promotion Type *
                </label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value as any }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                >
                  {Object.entries(PromotionTypeLabels).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description (English)
                </label>
                <textarea
                  value={formData.description?.en || ''}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    description: { ...prev.description, en: e.target.value }
                  }))}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Describe this promotion..."
                />
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div className="space-y-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Discount Configuration</h3>
              
              {/* Discount Value */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Discount Value * {formData.type === 'percentage_discount' ? '(%)' : '(JOD)'}
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.discountValue || ''}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    discountValue: e.target.value === '' ? undefined : parseFloat(e.target.value) 
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                  placeholder={formData.type === 'percentage_discount' ? '20' : '5.00'}
                />
              </div>

              {/* Max Discount Amount (for percentage) */}
              {formData.type === 'percentage_discount' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Maximum Discount Amount (JOD)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.maxDiscountAmount || ''}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      maxDiscountAmount: e.target.value === '' ? undefined : parseFloat(e.target.value) 
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                    placeholder="50.00"
                  />
                  <p className="text-xs text-gray-500 mt-1">Cap the discount amount for percentage discounts</p>
                </div>
              )}

              {/* Minimum Order Amount */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Minimum Order Amount (JOD)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.minimumOrderAmount || ''}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    minimumOrderAmount: e.target.value === '' ? undefined : parseFloat(e.target.value) 
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                  placeholder="25.00"
                />
              </div>

              {/* Usage Limits */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Total Usage Limit
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formData.totalUsageLimit || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, totalUsageLimit: parseInt(e.target.value) }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                    placeholder="1000"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Per Customer Limit *
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formData.perCustomerLimit}
                    onChange={(e) => setFormData(prev => ({ ...prev, perCustomerLimit: parseInt(e.target.value) }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Buy X Get Y Configuration */}
              {formData.type === 'buy_x_get_y' && (
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Buy Quantity
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={formData.buyQuantity || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, buyQuantity: parseInt(e.target.value) }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                      placeholder="2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Get Quantity
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={formData.getQuantity || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, getQuantity: parseInt(e.target.value) }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                      placeholder="1"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Get Discount (%)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={formData.getDiscountPercentage || ''}
                      onChange={(e) => setFormData(prev => ({ 
                        ...prev, 
                        getDiscountPercentage: e.target.value === '' ? undefined : parseFloat(e.target.value) 
                      }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                      placeholder="100"
                    />
                  </div>
                </div>
              )}

              {/* Date Range */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Start Date & Time
                  </label>
                  <input
                    type="datetime-local"
                    value={formData.startsAt}
                    onChange={(e) => setFormData(prev => ({ ...prev, startsAt: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    End Date & Time
                  </label>
                  <input
                    type="datetime-local"
                    value={formData.endsAt}
                    onChange={(e) => setFormData(prev => ({ ...prev, endsAt: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
            </div>
          )}

          {currentStep === 3 && (
            <div className="space-y-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Targeting & Settings</h3>
              
              {/* Settings */}
              <div className="space-y-4">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="isPublic"
                    checked={formData.isPublic}
                    onChange={(e) => setFormData(prev => ({ ...prev, isPublic: e.target.checked }))}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="isPublic" className="ml-2 text-sm text-gray-700">
                    Public campaign (visible to all customers)
                  </label>
                </div>
                
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="isStackable"
                    checked={formData.isStackable}
                    onChange={(e) => setFormData(prev => ({ ...prev, isStackable: e.target.checked }))}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="isStackable" className="ml-2 text-sm text-gray-700">
                    Stackable with other promotions
                  </label>
                </div>
              </div>

              {/* Priority */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Priority (1 = highest priority)
                </label>
                <input
                  type="number"
                  min="1"
                  max="999"
                  value={formData.priority}
                  onChange={(e) => setFormData(prev => ({ ...prev, priority: parseInt(e.target.value) }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* Target Platforms */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Target Platforms
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {['talabat', 'careem', 'website', 'call_center'].map(platform => (
                    <label key={platform} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={formData.targetPlatforms.includes(platform)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFormData(prev => ({ 
                              ...prev, 
                              targetPlatforms: [...prev.targetPlatforms, platform] 
                            }));
                          } else {
                            setFormData(prev => ({ 
                              ...prev, 
                              targetPlatforms: prev.targetPlatforms.filter(p => p !== platform) 
                            }));
                          }
                        }}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <span className="ml-2 text-sm text-gray-700 capitalize">
                        {PlatformIcons[platform as keyof typeof PlatformIcons]} {platform.replace('_', ' ')}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Promotion Codes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Promotion Codes (comma-separated)
                </label>
                <input
                  type="text"
                  value={formData.codes.join(', ')}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    codes: e.target.value.split(',').map(code => code.trim()).filter(Boolean)
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                  placeholder="SUMMER20, SAVE25"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Leave empty to auto-generate code based on campaign name
                </p>
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex justify-between mt-8 pt-6 border-t">
            <div>
              {currentStep > 1 && (
                <button
                  type="button"
                  onClick={() => setCurrentStep(prev => prev - 1)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  Previous
                </button>
              )}
            </div>
            
            <div className="flex space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Cancel
              </button>
              
              {currentStep < 3 ? (
                <button
                  type="button"
                  onClick={() => setCurrentStep(prev => prev + 1)}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                >
                  Next
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
                >
                  {loading ? 'Creating...' : 'Create Campaign'}
                </button>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

// Analytics Modal Component
interface AnalyticsModalProps {
  isOpen: boolean;
  onClose: () => void;
  campaign: PromotionCampaign;
}

function AnalyticsModal({ isOpen, onClose, campaign }: AnalyticsModalProps) {
  const { token } = useAuth();
  const [loading, setLoading] = useState(false);
  const [analytics, setAnalytics] = useState<any>(null);
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days ago
    endDate: new Date().toISOString().split('T')[0]
  });

  const fetchAnalytics = useCallback(async () => {
    if (!isOpen || !token) return;
    
    setLoading(true);
    try {
      const params = new URLSearchParams({
        startDate: dateRange.startDate,
        endDate: dateRange.endDate
      });
      
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1'}/promotion-campaigns/${campaign.id}/analytics?${params}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch analytics');
      }

      const result = await response.json();
      setAnalytics(result.data);
    } catch (error) {
      console.error('Error fetching analytics:', error);
      toast.error('Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  }, [isOpen, token, campaign.id, dateRange]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold flex items-center gap-2 text-slate-800">
                <div className="bg-blue-50 p-1.5 rounded-md">
                  <ChartBarIcon className="w-5 h-5 text-blue-600" />
                </div>
                Campaign Analytics
              </h2>
              <p className="text-slate-600 text-sm mt-1">
                {campaign.name.en || campaign.name.ar} • {campaign.slug}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 p-2 rounded-md hover:bg-gray-50 transition-colors"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          {/* Date Range Selector */}
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
              <CalendarIcon className="w-5 h-5" />
              Date Range
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Start Date
                </label>
                <input
                  type="date"
                  value={dateRange.startDate}
                  onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  End Date
                </label>
                <input
                  type="date"
                  value={dateRange.endDate}
                  onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              <span className="ml-3 text-gray-600">Loading analytics...</span>
            </div>
          ) : analytics ? (
            <div className="space-y-6">
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-lg border border-slate-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-slate-600 text-sm font-medium">Total Usage</p>
                      <p className="text-2xl font-bold text-slate-800">{analytics.summary?.totalUsage || 0}</p>
                    </div>
                    <ReceiptPercentIcon className="w-8 h-8 text-slate-500" />
                  </div>
                </div>
                
                <div className="bg-white p-4 rounded-lg border border-slate-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-slate-600 text-sm font-medium">Total Discount</p>
                      <p className="text-2xl font-bold text-slate-800">
                        ${analytics.summary?.totalDiscount?.toFixed(2) || '0.00'}
                      </p>
                    </div>
                    <CurrencyDollarIcon className="w-8 h-8 text-slate-500" />
                  </div>
                </div>
                
                <div className="bg-white p-4 rounded-lg border border-slate-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-slate-600 text-sm font-medium">Total Revenue</p>
                      <p className="text-2xl font-bold text-slate-800">
                        ${analytics.summary?.totalRevenue?.toFixed(2) || '0.00'}
                      </p>
                    </div>
                    <ChartBarIcon className="w-8 h-8 text-slate-500" />
                  </div>
                </div>
                
                <div className="bg-white p-4 rounded-lg border border-slate-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-slate-600 text-sm font-medium">Unique Customers</p>
                      <p className="text-2xl font-bold text-slate-800">{analytics.summary?.uniqueCustomers || 0}</p>
                    </div>
                    <UserGroupIcon className="w-8 h-8 text-slate-500" />
                  </div>
                </div>
              </div>

              {/* Platform Breakdown */}
              {analytics.summary?.platformBreakdown && Object.keys(analytics.summary.platformBreakdown).length > 0 && (
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                    <GlobeAltIcon className="w-5 h-5" />
                    Platform Usage Breakdown
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {Object.entries(analytics.summary.platformBreakdown).map(([platform, count]) => (
                      <div key={platform} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <span className="font-medium text-gray-700 capitalize">{platform}</span>
                        <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-sm font-semibold">
                          {count as number}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Performance Summary */}
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <InformationCircleIcon className="w-5 h-5" />
                  Campaign Performance
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Campaign Type:</span>
                      <span className="font-medium capitalize">{campaign.type.replace('_', ' ')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Current Status:</span>
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold
                        ${campaign.status === 'active' ? 'bg-green-100 text-green-800' : 
                          campaign.status === 'paused' ? 'bg-yellow-100 text-yellow-800' :
                          campaign.status === 'draft' ? 'bg-gray-100 text-gray-800' :
                          'bg-red-100 text-red-800'}`}>
                        {campaign.status.toUpperCase()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Priority Level:</span>
                      <span className="font-medium">{campaign.priority}</span>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Usage Limit:</span>
                      <span className="font-medium">{campaign.totalUsageLimit || 'Unlimited'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Per Customer Limit:</span>
                      <span className="font-medium">{campaign.perCustomerLimit || 'Unlimited'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Public Campaign:</span>
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                        campaign.isPublic ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {campaign.isPublic ? 'YES' : 'NO'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <ChartBarIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No analytics data available for the selected period</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
          <div className="flex justify-end">
            <button
              onClick={onClose}
              className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Edit Campaign Modal Component
interface EditCampaignModalProps {
  isOpen: boolean;
  onClose: () => void;
  campaign: PromotionCampaign;
  onSuccess: (campaign: PromotionCampaign) => void;
}

function EditCampaignModal({ isOpen, onClose, campaign, onSuccess }: EditCampaignModalProps) {
  const { token } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState<Partial<CreateCampaignFormData>>({});

  // Initialize form data when campaign changes
  useEffect(() => {
    if (campaign && isOpen) {
      setFormData({
        name: { en: campaign.name?.en || '', ar: campaign.name?.ar },
        description: { en: campaign.description?.en || '', ar: campaign.description?.ar },
        slug: campaign.slug,
        type: campaign.type,
        status: campaign.status,
        priority: campaign.priority,
        isPublic: campaign.isPublic,
        isStackable: campaign.isStackable,
        discountValue: campaign.discountValue,
        maxDiscountAmount: campaign.maxDiscountAmount,
        minimumOrderAmount: campaign.minimumOrderAmount,
        buyQuantity: campaign.buyQuantity,
        getQuantity: campaign.getQuantity,
        getDiscountPercentage: campaign.getDiscountPercentage,
        totalUsageLimit: campaign.totalUsageLimit,
        perCustomerLimit: campaign.perCustomerLimit,
        targetPlatforms: campaign.targetPlatforms || [],
        targetCustomerSegments: campaign.targetCustomerSegments || [],
      });
    }
  }, [campaign, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    setLoading(true);
    setError('');

    try {
      const updateData = {
        ...formData,
        // Ensure required fields are present
        name: formData.name,
        type: formData.type,
        status: formData.status,
      };

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1'}/promotion-campaigns/${campaign.id}`,
        {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(updateData),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update campaign');
      }

      const result = await response.json();
      onSuccess(result.data);
    } catch (err: any) {
      console.error('Error updating campaign:', err);
      setError(err.message || 'Failed to update campaign');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !campaign) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold flex items-center gap-2 text-slate-800">
                <div className="bg-emerald-50 p-1.5 rounded-md">
                  <PencilIcon className="w-5 h-5 text-emerald-600" />
                </div>
                Edit Campaign
              </h2>
              <p className="text-slate-600 text-sm mt-1">
                {campaign.name.en || campaign.name.ar} • {campaign.slug}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 p-2 rounded-md hover:bg-gray-50 transition-colors"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center">
                <ExclamationTriangleIcon className="w-5 h-5 text-red-600 mr-2" />
                <p className="text-red-800 text-sm">{error}</p>
              </div>
            </div>
          )}

          <div className="space-y-6">
            {/* Basic Information */}
            <div className="space-y-4">
              <h3 className="font-semibold text-gray-800 border-b pb-2">Basic Information</h3>
              
              {/* Campaign Name */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Campaign Name (English) *
                  </label>
                  <input
                    type="text"
                    value={formData.name?.en || ''}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      name: { ...prev.name, en: e.target.value }
                    }))}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    placeholder="e.g., Weekend Special"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Campaign Name (Arabic)
                  </label>
                  <input
                    type="text"
                    value={formData.name?.ar || ''}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      name: { ...prev.name, ar: e.target.value }
                    }))}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    placeholder="عرض نهاية الأسبوع"
                    dir="rtl"
                  />
                </div>
              </div>

              {/* Description */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description (English)
                  </label>
                  <textarea
                    value={formData.description?.en || ''}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      description: { ...prev.description, en: e.target.value }
                    }))}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    rows={3}
                    placeholder="Describe your promotion..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description (Arabic)
                  </label>
                  <textarea
                    value={formData.description?.ar || ''}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      description: { ...prev.description, ar: e.target.value }
                    }))}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    rows={3}
                    placeholder="وصف العرض..."
                    dir="rtl"
                  />
                </div>
              </div>

              {/* Campaign Type and Status */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Campaign Type *
                  </label>
                  <select
                    value={formData.type || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value as any }))}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    required
                  >
                    <option value="percentage_discount">Percentage Discount</option>
                    <option value="fixed_discount">Fixed Discount</option>
                    <option value="buy_x_get_y">Buy X Get Y</option>
                    <option value="free_shipping">Free Shipping</option>
                    <option value="minimum_order">Minimum Order</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Status *
                  </label>
                  <select
                    value={formData.status || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value as any }))}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    required
                  >
                    <option value="draft">Draft</option>
                    <option value="active">Active</option>
                    <option value="paused">Paused</option>
                    <option value="expired">Expired</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Priority
                  </label>
                  <input
                    type="number"
                    value={formData.priority || 1}
                    onChange={(e) => setFormData(prev => ({ ...prev, priority: parseInt(e.target.value) }))}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    min="1"
                    max="999"
                  />
                </div>
              </div>
            </div>

            {/* Discount Settings */}
            <div className="space-y-4">
              <h3 className="font-semibold text-gray-800 border-b pb-2">Discount Settings</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Discount Value
                  </label>
                  <input
                    type="number"
                    value={formData.discountValue || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, discountValue: parseFloat(e.target.value) }))}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    step="0.01"
                    min="0"
                    placeholder={formData.type === 'percentage_discount' ? '10 (for 10%)' : '5.00 (for $5)'}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Minimum Order Amount
                  </label>
                  <input
                    type="number"
                    value={formData.minimumOrderAmount || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, minimumOrderAmount: parseFloat(e.target.value) }))}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    step="0.01"
                    min="0"
                    placeholder="25.00"
                  />
                </div>
              </div>
            </div>

            {/* Campaign Settings */}
            <div className="space-y-4">
              <h3 className="font-semibold text-gray-800 border-b pb-2">Campaign Settings</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    id="isPublic"
                    checked={formData.isPublic || false}
                    onChange={(e) => setFormData(prev => ({ ...prev, isPublic: e.target.checked }))}
                    className="h-5 w-5 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                  />
                  <label htmlFor="isPublic" className="text-sm font-medium text-gray-700">
                    Public Campaign (visible to customers)
                  </label>
                </div>
                <div className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    id="isStackable"
                    checked={formData.isStackable || false}
                    onChange={(e) => setFormData(prev => ({ ...prev, isStackable: e.target.checked }))}
                    className="h-5 w-5 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                  />
                  <label htmlFor="isStackable" className="text-sm font-medium text-gray-700">
                    Stackable with other promotions
                  </label>
                </div>
              </div>
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading}
              className="px-6 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-colors disabled:opacity-50"
            >
              {loading ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Updating...
                </div>
              ) : (
                'Update Campaign'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function PromotionsPage() {
  const { user, token, isHydrated, isAuthenticated } = useAuth();
  const [campaigns, setCampaigns] = useState<PromotionCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedCampaigns, setSelectedCampaigns] = useState<string[]>([]);
  const [filters, setFilters] = useState<PromotionFilters>({
    search: '',
    sortBy: 'priority',
    sortOrder: 'asc'
  });
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<PromotionCampaign | null>(null);
  const [viewingAnalytics, setViewingAnalytics] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0
  });

  // Load campaigns
  const loadCampaigns = useCallback(async () => {
    // Don't make API calls if we don't have a token yet
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const queryParams = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        ...(filters.status && { status: filters.status }),
        ...(filters.type && { type: filters.type }),
        ...(filters.platform && { platform: filters.platform })
      });

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1'}/promotion-campaigns?${queryParams}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        if (response.status === 401) {
          // Token is invalid or expired, redirect to login
          localStorage.removeItem('auth-token');
          localStorage.removeItem('user');
          window.location.href = '/login';
          return;
        }
        throw new Error('Failed to load promotion campaigns');
      }

      const result = await response.json();
      setCampaigns(result.data || []);
      setPagination(prev => ({
        ...prev,
        total: result.meta?.total || 0,
        totalPages: result.meta?.totalPages || 0
      }));
      setError('');
    } catch (err) {
      console.error('Error loading campaigns:', err);
      setError('Failed to load promotion campaigns');
      toast.error('Failed to load promotion campaigns');
    } finally {
      setLoading(false);
    }
  }, [token, pagination.page, pagination.limit, filters.status, filters.type, filters.platform]);

  useEffect(() => {
    // Only load campaigns when auth context is hydrated
    if (isHydrated) {
      if (!isAuthenticated) {
        // User is not authenticated, redirect to login
        window.location.href = '/login';
        return;
      }
      loadCampaigns();
    }
  }, [isHydrated, isAuthenticated, loadCampaigns]);

  // Filter campaigns locally for search
  const filteredCampaigns = useMemo(() => {
    let result = campaigns;

    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      result = result.filter(campaign =>
        (campaign.name.en?.toLowerCase() || '').includes(searchLower) ||
        (campaign.name.ar?.toLowerCase() || '').includes(searchLower) ||
        campaign.slug.toLowerCase().includes(searchLower) ||
        campaign.codes.some(code => code.code.toLowerCase().includes(searchLower))
      );
    }

    // Sort campaigns
    result = [...result].sort((a, b) => {
      let aValue, bValue;
      
      switch (filters.sortBy) {
        case 'priority':
          aValue = a.priority;
          bValue = b.priority;
          break;
        case 'createdAt':
          aValue = new Date(a.createdAt).getTime();
          bValue = new Date(b.createdAt).getTime();
          break;
        case 'updatedAt':
          aValue = new Date(a.updatedAt).getTime();
          bValue = new Date(b.updatedAt).getTime();
          break;
        case 'currentUsageCount':
          aValue = a.currentUsageCount;
          bValue = b.currentUsageCount;
          break;
        default:
          aValue = a.priority;
          bValue = b.priority;
      }

      if (filters.sortOrder === 'desc') {
        return bValue > aValue ? 1 : -1;
      }
      return aValue > bValue ? 1 : -1;
    });

    return result;
  }, [campaigns, filters]);

  // Toggle campaign status
  const toggleCampaignStatus = async (campaignId: string, newStatus: string) => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1'}/promotion-campaigns/${campaignId}/status`,
        {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ status: newStatus }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to update campaign status');
      }

      toast.success(`Campaign ${newStatus === 'active' ? 'activated' : 'paused'} successfully`);
      loadCampaigns();
    } catch (err) {
      console.error('Error updating campaign status:', err);
      toast.error('Failed to update campaign status');
    }
  };

  // Duplicate campaign
  const duplicateCampaign = async (campaignId: string) => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1'}/promotion-campaigns/${campaignId}/duplicate`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to duplicate campaign');
      }

      toast.success('Campaign duplicated successfully');
      loadCampaigns();
    } catch (err) {
      console.error('Error duplicating campaign:', err);
      toast.error('Failed to duplicate campaign');
    }
  };

  // Delete campaign
  const deleteCampaign = async (campaignId: string) => {
    if (!confirm('Are you sure you want to delete this campaign? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1'}/promotion-campaigns/${campaignId}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to delete campaign');
      }

      toast.success('Campaign deleted successfully');
      loadCampaigns();
    } catch (err) {
      console.error('Error deleting campaign:', err);
      toast.error('Failed to delete campaign');
    }
  };

  // Calculate usage percentage
  const getUsagePercentage = (campaign: PromotionCampaign) => {
    if (!campaign.totalUsageLimit) return null;
    return Math.round((campaign.currentUsageCount / campaign.totalUsageLimit) * 100);
  };

  // Format discount display
  const formatDiscount = (campaign: PromotionCampaign) => {
    switch (campaign.type) {
      case 'percentage_discount':
        return `${campaign.discountValue}%`;
      case 'fixed_discount':
        return `JOD ${campaign.discountValue}`;
      case 'buy_x_get_y':
        return `Buy ${campaign.buyQuantity || 1} Get ${campaign.getQuantity || 1}`;
      case 'free_shipping':
        return 'Free Shipping';
      default:
        return campaign.discountValue ? `${campaign.discountValue}%` : 'Variable';
    }
  };

  // Show loading while auth context is hydrating
  if (!isHydrated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <ProtectedRoute allowedRoles={['super_admin', 'company_owner', 'branch_manager']}>
      <div className="min-h-screen bg-gray-50">
        <Head>
          <title>Promotion Management - Restaurant Platform</title>
          <meta name="description" content="Manage promotion campaigns and discount codes" />
        </Head>

        {/* Header */}
        <div className="bg-white shadow-sm border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-4">
              <div className="flex items-center space-x-4">
                <Link
                  href="/dashboard"
                  className="inline-flex items-center text-gray-500 hover:text-gray-700 transition-colors text-sm"
                >
                  <ArrowLeftIcon className="h-4 w-4 mr-2" />
                  Dashboard
                </Link>
                <div className="text-xl font-semibold flex items-center text-slate-800">
                  <div className="bg-slate-100 border border-slate-200 p-1.5 rounded-md mr-2">
                    <ReceiptPercentIcon className="h-6 w-6 text-slate-600" />
                  </div>
                  <span>Promotion Management</span>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => setIsCreateModalOpen(true)}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-slate-800 hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500 transition-colors"
                >
                  <PlusIcon className="h-4 w-4 mr-2" />
                  Create Campaign
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow-sm p-6 border border-slate-200 hover:shadow-md transition-shadow">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                    <TagIcon className="h-8 w-8 text-slate-600" />
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-slate-500">Total Campaigns</p>
                  <p className="text-2xl font-bold text-slate-900">{pagination.total}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6 border border-slate-200 hover:shadow-md transition-shadow">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="bg-emerald-50 p-3 rounded-lg border border-emerald-100">
                    <CheckCircleIcon className="h-8 w-8 text-emerald-600" />
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-slate-500">Active Campaigns</p>
                  <p className="text-2xl font-bold text-slate-900">
                    {campaigns.filter(c => c.status === 'active').length}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6 border border-slate-200 hover:shadow-md transition-shadow">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="bg-blue-50 p-3 rounded-lg border border-blue-100">
                    <UserGroupIcon className="h-8 w-8 text-blue-600" />
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-slate-500">Total Usage</p>
                  <p className="text-2xl font-bold text-slate-900">
                    {campaigns.reduce((sum, c) => sum + c.currentUsageCount, 0)}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6 border border-slate-200 hover:shadow-md transition-shadow">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="bg-amber-50 p-3 rounded-lg border border-amber-100">
                    <ChartBarIcon className="h-8 w-8 text-amber-600" />
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-slate-500">Draft Campaigns</p>
                  <p className="text-2xl font-bold text-slate-900">
                    {campaigns.filter(c => c.status === 'draft').length}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 mb-6">
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Search
                  </label>
                  <input
                    type="text"
                    placeholder="Search campaigns..."
                    value={filters.search}
                    onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Status
                  </label>
                  <select
                    value={filters.status || ''}
                    onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value || undefined }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">All Status</option>
                    <option value="draft">Draft</option>
                    <option value="active">Active</option>
                    <option value="paused">Paused</option>
                    <option value="expired">Expired</option>
                    <option value="archived">Archived</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Type
                  </label>
                  <select
                    value={filters.type || ''}
                    onChange={(e) => setFilters(prev => ({ ...prev, type: e.target.value || undefined }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">All Types</option>
                    {Object.entries(PromotionTypeLabels).map(([key, label]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Sort By
                  </label>
                  <select
                    value={`${filters.sortBy}-${filters.sortOrder}`}
                    onChange={(e) => {
                      const [sortBy, sortOrder] = e.target.value.split('-');
                      setFilters(prev => ({ ...prev, sortBy: sortBy as any, sortOrder: sortOrder as any }));
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="priority-asc">Priority (Low to High)</option>
                    <option value="priority-desc">Priority (High to Low)</option>
                    <option value="createdAt-desc">Newest First</option>
                    <option value="createdAt-asc">Oldest First</option>
                    <option value="currentUsageCount-desc">Most Used</option>
                    <option value="currentUsageCount-asc">Least Used</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Campaigns List */}
          {loading ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span className="ml-3 text-gray-600">Loading campaigns...</span>
              </div>
            </div>
          ) : error ? (
            <div className="bg-white rounded-xl shadow-sm border border-red-200 p-8">
              <div className="flex items-center justify-center text-red-600">
                <ExclamationTriangleIcon className="h-8 w-8 mr-3" />
                {error}
              </div>
            </div>
          ) : filteredCampaigns.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
              <div className="text-center">
                <ReceiptPercentIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Campaigns Found</h3>
                <p className="text-gray-500 mb-4">
                  {filters.search ? 'No campaigns match your search criteria.' : 'Create your first promotion campaign to get started.'}
                </p>
                <button
                  onClick={() => setIsCreateModalOpen(true)}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                >
                  <PlusIcon className="h-5 w-5 mr-2" />
                  Create First Campaign
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredCampaigns.map((campaign) => (
                <div key={campaign.id} className="bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                  <div className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h3 className="text-lg font-semibold text-gray-900">
                            {campaign.name.en || campaign.name.ar || campaign.slug}
                          </h3>
                          <span className={`px-2 py-1 text-xs font-medium border rounded-full ${StatusColors[campaign.status]}`}>
                            {campaign.status.charAt(0).toUpperCase() + campaign.status.slice(1)}
                          </span>
                          <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-700 border border-gray-200 rounded-full">
                            {PromotionTypeLabels[campaign.type]}
                          </span>
                          {campaign.isPublic && (
                            <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-700 border border-blue-200 rounded-full">
                              Public
                            </span>
                          )}
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                          <div>
                            <p className="text-xs text-gray-500">Discount</p>
                            <p className="text-sm font-medium text-gray-900">{formatDiscount(campaign)}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">Usage</p>
                            <p className="text-sm font-medium text-gray-900">
                              {campaign.currentUsageCount}
                              {campaign.totalUsageLimit && ` / ${campaign.totalUsageLimit}`}
                              {getUsagePercentage(campaign) && (
                                <span className="text-xs text-gray-500 ml-1">
                                  ({getUsagePercentage(campaign)}%)
                                </span>
                              )}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">Codes</p>
                            <p className="text-sm font-medium text-gray-900">
                              {campaign.codes.filter(c => c.isActive).length} active
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">Priority</p>
                            <p className="text-sm font-medium text-gray-900">{campaign.priority}</p>
                          </div>
                        </div>

                        {/* Platforms */}
                        {campaign.targetPlatforms.length > 0 && (
                          <div className="flex items-center space-x-2 mb-3">
                            <span className="text-xs text-gray-500">Platforms:</span>
                            {campaign.targetPlatforms.map(platform => (
                              <span key={platform} className="inline-flex items-center text-xs">
                                {PlatformIcons[platform as keyof typeof PlatformIcons] || '📱'} {platform}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Active Codes Preview */}
                        {campaign.codes.filter(c => c.isActive).length > 0 && (
                          <div className="flex items-center space-x-2">
                            <span className="text-xs text-gray-500">Codes:</span>
                            {campaign.codes.filter(c => c.isActive).slice(0, 3).map(code => (
                              <code key={code.id} className="px-2 py-1 text-xs bg-gray-100 text-gray-800 rounded border">
                                {code.code}
                              </code>
                            ))}
                            {campaign.codes.filter(c => c.isActive).length > 3 && (
                              <span className="text-xs text-gray-500">
                                +{campaign.codes.filter(c => c.isActive).length - 3} more
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center space-x-2 ml-4">
                        {/* Quick Actions */}
                        {campaign.status === 'draft' || campaign.status === 'paused' ? (
                          <button
                            onClick={() => toggleCampaignStatus(campaign.id, 'active')}
                            className="p-2 text-green-600 hover:bg-green-50 rounded-lg border border-green-200 transition-colors"
                            title="Activate Campaign"
                          >
                            <PlayIcon className="h-5 w-5" />
                          </button>
                        ) : campaign.status === 'active' ? (
                          <button
                            onClick={() => toggleCampaignStatus(campaign.id, 'paused')}
                            className="p-2 text-yellow-600 hover:bg-yellow-50 rounded-lg border border-yellow-200 transition-colors"
                            title="Pause Campaign"
                          >
                            <PauseIcon className="h-5 w-5" />
                          </button>
                        ) : null}

                        <button
                          onClick={() => setViewingAnalytics(campaign.id)}
                          className="p-2 text-slate-600 hover:text-slate-800 hover:bg-slate-50 rounded-md border border-slate-200 transition-colors"
                          title="View Analytics"
                        >
                          <ChartBarIcon className="h-5 w-5" />
                        </button>

                        <button
                          onClick={() => setEditingCampaign(campaign)}
                          className="p-2 text-slate-600 hover:text-slate-800 hover:bg-slate-50 rounded-md border border-slate-200 transition-colors"
                          title="Edit Campaign"
                        >
                          <PencilIcon className="h-5 w-5" />
                        </button>

                        <button
                          onClick={() => duplicateCampaign(campaign.id)}
                          className="p-2 text-slate-600 hover:text-slate-800 hover:bg-slate-50 rounded-md border border-slate-200 transition-colors"
                          title="Duplicate Campaign"
                        >
                          <DocumentDuplicateIcon className="h-5 w-5" />
                        </button>

                        <button
                          onClick={() => deleteCampaign(campaign.id)}
                          className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-md border border-red-200 transition-colors"
                          title="Delete Campaign"
                        >
                          <TrashIcon className="h-5 w-5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="mt-8 flex items-center justify-between bg-white px-6 py-3 border border-gray-100 rounded-xl">
              <div className="text-sm text-gray-700">
                Showing {Math.min((pagination.page - 1) * pagination.limit + 1, pagination.total)} to{' '}
                {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} campaigns
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setPagination(prev => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
                  disabled={pagination.page === 1}
                  className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <span className="px-3 py-2 text-sm font-medium text-gray-700">
                  Page {pagination.page} of {pagination.totalPages}
                </span>
                <button
                  onClick={() => setPagination(prev => ({ ...prev, page: Math.min(prev.totalPages, prev.page + 1) }))}
                  disabled={pagination.page === pagination.totalPages}
                  className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Create Campaign Modal - Updated */}
        <CreateCampaignModal 
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          onSuccess={(campaign) => {
            setIsCreateModalOpen(false);
            // Refresh campaigns list with a small delay to ensure backend writes complete
            setTimeout(() => {
              loadCampaigns();
            }, 500);
            toast.success(`Campaign "${campaign.name.en || campaign.name.ar}" created successfully!`);
          }}
        />

        {/* Analytics Modal */}
        {viewingAnalytics && (
          <AnalyticsModal
            isOpen={!!viewingAnalytics}
            onClose={() => setViewingAnalytics(null)}
            campaign={campaigns.find(c => c.id === viewingAnalytics)!}
          />
        )}

        {/* Edit Campaign Modal */}
        {editingCampaign && (
          <EditCampaignModal
            isOpen={!!editingCampaign}
            onClose={() => setEditingCampaign(null)}
            campaign={editingCampaign}
            onSuccess={(updatedCampaign) => {
              setEditingCampaign(null);
              // Refresh campaigns list with a small delay to ensure backend writes complete
              setTimeout(() => {
                loadCampaigns();
              }, 500);
              toast.success(`Campaign "${updatedCampaign.name.en || updatedCampaign.name.ar}" updated successfully!`);
            }}
          />
        )}
      </div>
    </ProtectedRoute>
  );
}

export default PromotionsPage;