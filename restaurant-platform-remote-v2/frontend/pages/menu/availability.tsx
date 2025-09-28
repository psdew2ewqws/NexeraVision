import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { 
  ArrowLeftIcon,
  CubeIcon,
  WifiIcon,
  EyeIcon,
  EyeSlashIcon
} from '@heroicons/react/24/outline';
import ProtectedRoute from '../../src/components/ProtectedRoute';
import { useAuth } from '../../src/contexts/AuthContext';
import { MenuProduct, Modifier, ModifierCategory } from '../../src/types/menu';
import toast from 'react-hot-toast';

interface Company {
  id: string;
  name: string;
  slug: string;
}

interface Branch {
  id: string;
  name: string;
  nameAr: string;
  isActive: boolean;
  company: {
    id: string;
    name: string;
    slug: string;
  };
}

interface AvailabilityItem {
  id: string;
  companyId: string;
  branchId: string;
  connectedId: string;
  connectedType: 'product' | 'modifier';
  name: string;
  nameAr?: string;
  isActive: boolean;
  platforms: {
    talabat: boolean;
    careem: boolean;
    website: boolean;
    call_center: boolean;
  };
  branch: {
    id: string;
    name: string;
    nameAr: string;
  };
  originalItem?: MenuProduct | Modifier | ModifierCategory;
  parentProduct?: MenuProduct; // For modifiers
  parentCategory?: any; // For modifier items
  modifierCount?: number; // For modifier categories
}

export default function MenuAvailabilityPage() {
  const { user } = useAuth();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('');
  const [selectedBranches, setSelectedBranches] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [availabilityItems, setAvailabilityItems] = useState<AvailabilityItem[]>([]);
  const [contentType, setContentType] = useState<'products' | 'modifiers' | 'modifier_items'>('products');
  const [stats, setStats] = useState({ totalItems: 0, activeItems: 0 });
  const [searchTerm, setSearchTerm] = useState('');
  const [modifiers, setModifiers] = useState<Modifier[]>([]);
  const [menuProducts, setMenuProducts] = useState<MenuProduct[]>([]);
  const [modifierCategories, setModifierCategories] = useState<ModifierCategory[]>([]);

  // Load companies
  const loadCompanies = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/v1/companies');
      if (response.ok) {
        const data = await response.json();
        setCompanies(data || []);
        if (data?.length > 0 && !selectedCompanyId) {
          setSelectedCompanyId(data[0].id);
        }
      }
    } catch (error) {
      console.error('Error loading companies:', error);
    }
  };

  // Load branches
  const loadBranches = async () => {
    if (!selectedCompanyId) return;
    
    try {
      const response = await fetch(`http://localhost:3001/api/v1/branches?companyId=${selectedCompanyId}`);
      if (response.ok) {
        const data = await response.json();
        const branchesArray = data?.branches || [];
        setBranches(branchesArray);
        if (branchesArray.length > 0 && selectedBranches.length === 0) {
          setSelectedBranches([branchesArray[0].id]);
        }
      }
    } catch (error) {
      console.error('Error loading branches:', error);
    }
  };

  // Load menu products from API
  const loadMenuProducts = async () => {
    if (!selectedCompanyId) return;
    
    try {
      const token = localStorage.getItem('auth-token');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/menu/products/paginated`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          page: 1,
          limit: 100,
          sortBy: 'name',
          sortOrder: 'asc'
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        setMenuProducts(data.products || []);
      } else {
        console.error('Failed to load products:', response.status);
      }
    } catch (error) {
      console.error('Error loading products:', error);
    }
  };

  // Load modifier categories from API
  const loadModifiers = async () => {
    if (!selectedCompanyId) return;
    
    try {
      const token = localStorage.getItem('auth-token');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1'}/modifier-categories`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        const categories = data.categories || data || [];
        setModifierCategories(categories);
        
        // Extract all individual modifiers for modifier_items tab
        const allModifiers: Modifier[] = [];
        categories.forEach((category: ModifierCategory) => {
          if (category.modifiers) {
            category.modifiers.forEach((modifier: Modifier) => {
              allModifiers.push({
                ...modifier,
                categoryName: category.name,
                modifierCategoryId: category.id
              });
            });
          }
        });
        setModifiers(allModifiers);
      } else {
        console.error('Failed to load modifiers:', response.status, await response.text());
      }
    } catch (error) {
      console.error('Error loading modifiers:', error);
    }
  };

  // Load availability data
  const loadAvailabilityData = async () => {
    if (!selectedCompanyId || selectedBranches.length === 0) return;

    setLoading(true);
    try {
      const availabilityItems: AvailabilityItem[] = [];
      
      selectedBranches.forEach(branchId => {
        const branch = branches.find(b => b.id === branchId);
        if (!branch) return;

        if (contentType === 'products') {
          // Add products to availability
          menuProducts.forEach((product, index) => {
            availabilityItems.push({
              id: `${branchId}-product-${product.id}`,
              companyId: selectedCompanyId,
              branchId: branchId,
              connectedId: product.id,
              connectedType: 'product',
              name: product.name.en || 'Unknown Product',
              nameAr: product.name.ar,
              isActive: product.status === 1,
              platforms: {
                talabat: !!(product.pricing.talabat || product.pricing.uber_eats),
                careem: !!(product.pricing.careem || product.pricing.doordash),
                website: !!(product.pricing.website || product.pricing.default),
                call_center: !!(product.pricing.call_center || product.pricing.default)
              },
              branch: {
                id: branch.id,
                name: branch.name,
                nameAr: branch.nameAr
              },
              originalItem: product
            });
          });
        } else if (contentType === 'modifiers') {
          // Add modifier categories to availability
          modifierCategories.forEach(category => {
            availabilityItems.push({
              id: `${branchId}-category-${category.id}`,
              companyId: selectedCompanyId,
              branchId: branchId,
              connectedId: category.id,
              connectedType: 'modifier',
              name: category.name.en || 'Unknown Category',
              nameAr: category.name.ar,
              isActive: true, // Categories are always active, individual modifiers control availability
              platforms: {
                talabat: true,
                careem: true,
                website: true,
                call_center: true
              },
              branch: {
                id: branch.id,
                name: branch.name,
                nameAr: branch.nameAr
              },
              originalItem: category,
              modifierCount: category.modifiers?.length || 0
            });
          });
        } else {
          // Add individual modifiers to availability
          modifiers.forEach(modifier => {
            availabilityItems.push({
              id: `${branchId}-modifier-${modifier.id}`,
              companyId: selectedCompanyId,
              branchId: branchId,
              connectedId: modifier.id,
              connectedType: 'modifier',
              name: modifier.name.en || 'Unknown Modifier',
              nameAr: modifier.name.ar,
              isActive: modifier.status === 1,
              platforms: {
                talabat: !!(modifier.pricing.talabat || modifier.pricing.uber_eats),
                careem: !!(modifier.pricing.careem || modifier.pricing.doordash),
                website: !!(modifier.pricing.website || modifier.pricing.default),
                call_center: !!(modifier.pricing.call_center || modifier.pricing.default)
              },
              branch: {
                id: branch.id,
                name: branch.name,
                nameAr: branch.nameAr
              },
              originalItem: modifier,
              parentCategory: modifier.categoryName
            });
          });
        }
      });

      setAvailabilityItems(availabilityItems);
      setStats({
        totalItems: availabilityItems.length,
        activeItems: availabilityItems.filter(item => item.isActive).length
      });
    } catch (error) {
      console.error('Error loading availability data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Toggle item availability and sync with menu
  const toggleItemAvailability = async (item: AvailabilityItem, isActive: boolean) => {
    // Update local state first for immediate UI feedback
    setAvailabilityItems(prevItems => 
      prevItems.map(prevItem => 
        prevItem.id === item.id ? { ...prevItem, isActive } : prevItem
      )
    );
    
    setStats(prevStats => ({
      ...prevStats,
      activeItems: availabilityItems.filter(i => 
        i.id === item.id ? isActive : i.isActive
      ).length
    }));
    
    // Sync with backend - update the actual menu item status
    try {
      const token = localStorage.getItem('auth-token');
      const endpoint = item.connectedType === 'product' 
        ? `/menu/products/${item.connectedId}`
        : `/modifiers/${item.connectedId}`;
        
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1'}${endpoint}`, {
        method: item.connectedType === 'product' ? 'PUT' : 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          status: isActive ? 1 : 0
        })
      });
      
      if (response.ok) {
        toast.success(`${item.name} ${isActive ? 'enabled' : 'disabled'} successfully`);
      } else {
        // Revert local state if API call failed
        setAvailabilityItems(prevItems => 
          prevItems.map(prevItem => 
            prevItem.id === item.id ? { ...prevItem, isActive: !isActive } : prevItem
          )
        );
        toast.error('Failed to update item status');
      }
    } catch (error) {
      console.error('Error updating item status:', error);
      // Revert local state
      setAvailabilityItems(prevItems => 
        prevItems.map(prevItem => 
          prevItem.id === item.id ? { ...prevItem, isActive: !isActive } : prevItem
        )
      );
      toast.error('Failed to update item status');
    }
  };

  // Toggle platform availability
  const togglePlatformAvailability = (item: AvailabilityItem, platform: keyof AvailabilityItem['platforms'], enabled: boolean) => {
    setAvailabilityItems(prevItems => 
      prevItems.map(prevItem => 
        prevItem.id === item.id 
          ? { 
              ...prevItem, 
              platforms: {
                ...prevItem.platforms,
                [platform]: enabled
              }
            }
          : prevItem
      )
    );
    
    toast.success(`${platform} ${enabled ? 'enabled' : 'disabled'} successfully`);
  };

  // Filter items based on search term
  const filteredItems = availabilityItems.filter(item => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return item.name.toLowerCase().includes(searchLower) ||
           (item.nameAr && item.nameAr.toLowerCase().includes(searchLower)) ||
           (item.parentCategory && typeof item.parentCategory === 'object' && 
            (item.parentCategory.en?.toLowerCase().includes(searchLower) ||
             item.parentCategory.ar?.toLowerCase().includes(searchLower)));
  });

  // Load companies on mount
  useEffect(() => {
    loadCompanies();
  }, []);

  // Load branches when company changes
  useEffect(() => {
    if (selectedCompanyId) {
      loadBranches();
    }
  }, [selectedCompanyId]);

  // Load menu data when company changes
  useEffect(() => {
    if (selectedCompanyId) {
      loadMenuProducts();
      loadModifiers();
    }
  }, [selectedCompanyId]);

  // Load availability data when branches, content type, or menu data changes
  useEffect(() => {
    if (selectedBranches.length > 0 && 
        ((contentType === 'products' && menuProducts.length > 0) || 
         (contentType === 'modifiers' && modifierCategories.length > 0) ||
         (contentType === 'modifier_items' && modifiers.length > 0))) {
      loadAvailabilityData();
    }
  }, [selectedBranches, contentType, branches, menuProducts, modifierCategories, modifiers]);

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        <Head>
          <title>Menu Availability Management - Restaurant Platform</title>
          <meta name="description" content="Professional menu availability and platform management system" />
        </Head>

        {/* Header */}
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-full px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <Link href="/dashboard" className="flex items-center text-gray-600 hover:text-gray-900">
                  <ArrowLeftIcon className="h-5 w-5 mr-2" />
                  Back to Dashboard
                </Link>
                <div className="h-6 border-l border-gray-300"></div>
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <CubeIcon className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900">Menu Availability</h1>
                    <p className="text-sm text-gray-600">Manage product and modifier availability across platforms</p>
                  </div>
                </div>
              </div>
              
              {/* Connection Status */}
              <div className="flex items-center space-x-2 px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-700">
                <div className="w-2 h-2 rounded-full bg-green-400"></div>
                <span>Connected</span>
                <WifiIcon className="h-4 w-4 ml-1" />
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-full px-4 sm:px-6 lg:px-8 py-6">
          {/* Company Selection */}
          <div className="mb-6 bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Select Company</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Company</label>
                <select
                  value={selectedCompanyId}
                  onChange={(e) => setSelectedCompanyId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select a company...</option>
                  {companies.map((company) => (
                    <option key={company.id} value={company.id}>
                      {company.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Branch Selection */}
          <div className="mb-6 bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Select Branches</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {branches.length > 0 ? branches.map((branch) => (
                <div key={branch.id} className="flex items-center">
                  <input
                    id={`branch-${branch.id}`}
                    type="checkbox"
                    checked={selectedBranches.includes(branch.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedBranches([...selectedBranches, branch.id]);
                      } else {
                        setSelectedBranches(selectedBranches.filter(id => id !== branch.id));
                      }
                    }}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor={`branch-${branch.id}`} className="ml-3 text-sm font-medium text-gray-700">
                    {branch.name} ({branch.nameAr})
                  </label>
                </div>
              )) : (
                <div className="col-span-full text-center py-8 text-gray-500">
                  {selectedCompanyId ? 'No branches found for selected company.' : 'Please select a company first.'}
                </div>
              )}
            </div>
          </div>

          {/* Stats */}
          <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-blue-100 rounded-md flex items-center justify-center">
                    <CubeIcon className="w-5 h-5 text-blue-600" />
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Total Items</dt>
                    <dd className="text-lg font-medium text-gray-900">{stats.totalItems}</dd>
                  </dl>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-green-100 rounded-md flex items-center justify-center">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Active Items</dt>
                    <dd className="text-lg font-medium text-gray-900">{stats.activeItems}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="inline-flex rounded-md shadow-sm" role="group">
                    <button
                      onClick={() => setContentType('products')}
                      className={`px-4 py-2 text-sm font-medium rounded-l-md border ${
                        contentType === 'products'
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      Products
                    </button>
                    <button
                      onClick={() => setContentType('modifiers')}
                      className={`px-4 py-2 text-sm font-medium border-t border-b ${
                        contentType === 'modifiers'
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      Categories
                    </button>
                    <button
                      onClick={() => setContentType('modifier_items')}
                      className={`px-4 py-2 text-sm font-medium rounded-r-md border-t border-b border-r ${
                        contentType === 'modifier_items'
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      Modifiers
                    </button>
                  </div>
                </div>
                {/* Search Bar */}
                <div className="flex-1 max-w-md ml-4">
                  <div className="relative">
                    <input
                      type="text"
                      placeholder={`Search ${contentType === 'products' ? 'products' : contentType === 'modifiers' ? 'categories' : 'modifiers'}...`}
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm pl-10"
                    />
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="p-6">
              {selectedBranches.length === 0 ? (
                <div className="text-center py-12">
                  <CubeIcon className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    {contentType === 'products' ? 'Products' : 'Modifiers'} Availability Management
                  </h3>
                  <p className="text-gray-600">
                    Select branches above to manage {contentType} availability across platforms.
                  </p>
                </div>
              ) : loading ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                  <p className="text-gray-600">Loading availability data...</p>
                </div>
              ) : filteredItems.length === 0 && availabilityItems.length > 0 ? (
                <div className="text-center py-12">
                  <CubeIcon className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    No results found
                  </h3>
                  <p className="text-gray-600">
                    No {contentType === 'products' ? 'products' : contentType === 'modifiers' ? 'categories' : 'modifiers'} match your search "{searchTerm}".
                  </p>
                </div>
              ) : availabilityItems.length === 0 ? (
                <div className="text-center py-12">
                  <CubeIcon className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    No {contentType} found
                  </h3>
                  <p className="text-gray-600">
                    {contentType === 'products' && menuProducts.length === 0 
                      ? 'No products found in the menu system. Please add products first.'
                      : contentType === 'modifiers' && modifierCategories.length === 0
                      ? 'No modifiers found in the menu system. Please add modifier categories first.'
                      : `No ${contentType} availability data found for the selected branches.`
                    }
                  </p>
                  {(contentType === 'products' && menuProducts.length === 0) || 
                   (contentType === 'modifiers' && modifierCategories.length === 0) ? (
                    <div className="mt-4">
                      <Link 
                        href="/menu/products" 
                        className="text-blue-600 hover:text-blue-800 font-medium"
                      >
                        Go to Menu Management →
                      </Link>
                    </div>
                  ) : null}
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h4 className="text-lg font-medium text-gray-900">
                      {contentType === 'products' ? 'Product' : 'Modifier'} Availability 
                      <span className="text-gray-500 text-sm ml-2">
                        ({availabilityItems.length} items)
                      </span>
                    </h4>
                  </div>
                  
                  <div className="bg-gray-50 rounded-lg overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-100">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Item
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Branch
                            </th>
                            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Status
                            </th>
                            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Talabat
                            </th>
                            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Careem
                            </th>
                            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Website
                            </th>
                            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Call Center
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {filteredItems.map((item) => (
                            <tr key={item.id} className="hover:bg-gray-50">
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div>
                                  <div className="text-sm font-medium text-gray-900">
                                    {item.name}
                                  </div>
                                  {item.nameAr && (
                                    <div className="text-sm text-gray-500" dir="rtl">
                                      {item.nameAr}
                                    </div>
                                  )}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-900">{item.branch.name}</div>
                                <div className="text-sm text-gray-500" dir="rtl">
                                  {item.branch.nameAr}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-center">
                                <button
                                  onClick={() => toggleItemAvailability(item, !item.isActive)}
                                  className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                                    item.isActive
                                      ? 'bg-green-100 text-green-800 hover:bg-green-200'
                                      : 'bg-red-100 text-red-800 hover:bg-red-200'
                                  }`}
                                >
                                  {item.isActive ? (
                                    <EyeIcon className="w-3 h-3 mr-1" />
                                  ) : (
                                    <EyeSlashIcon className="w-3 h-3 mr-1" />
                                  )}
                                  {item.isActive ? 'Active' : 'Disabled'}
                                </button>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-center">
                                <button
                                  onClick={() => togglePlatformAvailability(item, 'talabat', !item.platforms.talabat)}
                                  className={`w-8 h-8 rounded-full flex items-center justify-center ${
                                    item.platforms.talabat
                                      ? 'bg-orange-100 text-orange-800 hover:bg-orange-200'
                                      : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                                  }`}
                                >
                                  {item.platforms.talabat ? '✓' : '×'}
                                </button>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-center">
                                <button
                                  onClick={() => togglePlatformAvailability(item, 'careem', !item.platforms.careem)}
                                  className={`w-8 h-8 rounded-full flex items-center justify-center ${
                                    item.platforms.careem
                                      ? 'bg-green-100 text-green-800 hover:bg-green-200'
                                      : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                                  }`}
                                >
                                  {item.platforms.careem ? '✓' : '×'}
                                </button>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-center">
                                <button
                                  onClick={() => togglePlatformAvailability(item, 'website', !item.platforms.website)}
                                  className={`w-8 h-8 rounded-full flex items-center justify-center ${
                                    item.platforms.website
                                      ? 'bg-blue-100 text-blue-800 hover:bg-blue-200'
                                      : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                                  }`}
                                >
                                  {item.platforms.website ? '✓' : '×'}
                                </button>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-center">
                                <button
                                  onClick={() => togglePlatformAvailability(item, 'call_center', !item.platforms.call_center)}
                                  className={`w-8 h-8 rounded-full flex items-center justify-center ${
                                    item.platforms.call_center
                                      ? 'bg-purple-100 text-purple-800 hover:bg-purple-200'
                                      : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                                  }`}
                                >
                                  {item.platforms.call_center ? '✓' : '×'}
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}