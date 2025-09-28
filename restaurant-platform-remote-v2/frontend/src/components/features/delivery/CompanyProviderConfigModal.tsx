import React, { useState, useEffect } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import { XMarkIcon, EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';
import { useMutation, useQuery } from '@tanstack/react-query';
import { DeliveryTestingHelpers } from 'src/utils/testingHelpers';
import { useAuth } from 'src/contexts/AuthContext';

interface CompanyProviderConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  config?: any | null;
  onSuccess: () => void;
}

interface Company {
  id: string;
  name: string;
  slug: string;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002/api/v1';

const PROVIDER_TYPES = [
  { value: 'talabat', label: 'Talabat', description: 'Gulf states coverage' },
  { value: 'careem', label: 'Careem', description: 'MENA premium service' },
  { value: 'careemexpress', label: 'Careem Express', description: 'UAE/Saudi 15-min delivery' },
  { value: 'topdeliver', label: 'TopDeliver', description: 'Kuwait KNET integration' },
  { value: 'nashmi', label: 'Nashmi', description: 'Qatar focused service' },
  { value: 'local_delivery', label: 'Local Delivery', description: 'Restaurant managed delivery' },
  { value: 'dhub', label: 'DHUB', description: 'Jordan local leader' },
  { value: 'jahez', label: 'Jahez', description: 'Saudi Arabia focused' },
  { value: 'deliveroo', label: 'Deliveroo', description: 'International coverage' },
  { value: 'yallow', label: 'Yallow', description: 'Jordan local service' },
  { value: 'jooddelivery', label: 'Jood Delivery', description: 'Saudi focused delivery' },
  { value: 'tawasi', label: 'Tawasi', description: 'Lebanon local service' },
  { value: 'delivergy', label: 'Delivergy', description: 'Multi-regional platform' },
  { value: 'utrac', label: 'U-Trac', description: 'Logistics tracking service' },
];

const PROVIDER_CONFIG_TEMPLATES = {
  dhub: {
    configuration: {
      apiUrl: 'https://jordon.dhub.pro/',
      environment: 'production',
      countryCode: 'JO',
      isActive: true
    },
    credentials: {
      accessToken: '',
      companyId: '',
      officeId: '',
      branchIds: ''
    }
  },
  talabat: {
    configuration: {
      apiBaseUrl: 'https://api.talabat.com/v1',
      region: 'middle_east',
      environment: 'production',
      webhookUrl: '',
      isActive: true
    },
    credentials: {
      merchantId: '',
      apiKey: '',
      clientSecret: '',
      webhookSecret: ''
    }
  },
  careem: {
    configuration: {
      apiBaseUrl: 'https://api.careem.com/delivery/v1',
      region: 'middle_east',
      environment: 'production',
      isActive: true
    },
    credentials: {
      clientId: '',
      clientSecret: '',
      merchantId: '',
      accessToken: ''
    }
  },
  careemexpress: {
    configuration: {
      apiBaseUrl: 'https://api.careem.com/express/v1',
      region: 'uae_saudi',
      environment: 'production',
      isActive: true
    },
    credentials: {
      clientId: '',
      clientSecret: '',
      merchantId: '',
      accessToken: ''
    }
  },
  jahez: {
    configuration: {
      apiHost: 'https://integration-api-staging.jahez.net',
      environment: 'staging',
      region: 'saudi_arabia',
      isActive: true
    },
    credentials: {
      xApiKey: '',
      secret: '',
      token: ''
    }
  },
  deliveroo: {
    configuration: {
      apiHost: 'https://api-sandbox.developers.deliveroo.com',
      oauthHost: 'https://auth-sandbox.developers.deliveroo.com',
      environment: 'sandbox',
      brandId: '',
      siteIds: ''
    },
    credentials: {
      username: '',
      clientSecret: '',
      clientEncoding: '',
      accessToken: '',
      expiresAt: ''
    }
  },
  yallow: {
    configuration: {
      apiBaseUrl: 'https://api.yallow.jo/v1',
      region: 'jordan',
      environment: 'production',
      isActive: true
    },
    credentials: {
      merchantId: '',
      apiKey: '',
      secretKey: ''
    }
  },
  jooddelivery: {
    configuration: {
      apiBaseUrl: 'https://api.jooddelivery.com/v1',
      region: 'saudi_arabia',
      environment: 'production',
      isActive: true
    },
    credentials: {
      merchantId: '',
      apiKey: '',
      clientSecret: '',
      accessToken: ''
    }
  },
  topdeliver: {
    configuration: {
      apiBaseUrl: 'https://api.topdeliver.com/v1',
      region: 'kuwait',
      environment: 'production',
      isActive: true
    },
    credentials: {
      merchantId: '',
      apiKey: '',
      clientSecret: '',
      authToken: ''
    }
  },
  nashmi: {
    configuration: {
      apiBaseUrl: 'https://api.nashmi.qa/v1',
      region: 'qatar',
      environment: 'production',
      isActive: true
    },
    credentials: {
      merchantId: '',
      apiKey: '',
      secretKey: ''
    }
  },
  tawasi: {
    configuration: {
      apiBaseUrl: 'https://api.tawasi.com/v1',
      region: 'lebanon',
      environment: 'production',
      isActive: true
    },
    credentials: {
      merchantId: '',
      apiKey: '',
      secretKey: ''
    }
  },
  delivergy: {
    configuration: {
      apiBaseUrl: 'https://api.delivergy.com/v1',
      region: 'multi_regional',
      environment: 'production',
      isActive: true
    },
    credentials: {
      clientId: '',
      clientSecret: '',
      merchantId: '',
      accessToken: ''
    }
  },
  utrac: {
    configuration: {
      apiBaseUrl: 'https://api.utrac.com/v1',
      region: 'logistics',
      environment: 'production',
      isActive: true
    },
    credentials: {
      apiKey: '',
      trackingId: '',
      secretKey: ''
    }
  },
  local_delivery: {
    configuration: {
      environment: 'internal',
      operatingHours: 'restaurant_hours',
      isActive: true
    },
    credentials: {
      internalKey: '',
      managerContact: '',
      emergencyPhone: ''
    }
  }
};

export default function CompanyProviderConfigModal({ 
  isOpen, 
  onClose, 
  config = null, 
  onSuccess 
}: CompanyProviderConfigModalProps) {
  const { user } = useAuth();
  const [showCredentials, setShowCredentials] = useState(false);
  const [formData, setFormData] = useState({
    companyId: '',
    providerType: '',
    configuration: {},
    credentials: {},
    isActive: true,
    priority: 1,
    maxDistance: 15,
    baseFee: 2.5,
    feePerKm: 0.5,
    avgDeliveryTime: 30
  });

  // Fetch companies for super admin using safe fetch
  const { data: companies = [] } = useQuery<Company[]>({
    queryKey: ['companies-list'],
    queryFn: async () => {
      try {
        console.log('[CompanyProviderConfigModal] Fetching companies for user role:', user?.role);
        
        // Use the working /companies endpoint that doesn't require auth
        const response = await DeliveryTestingHelpers.safeFetch(`${API_BASE_URL}/companies`);
        
        // Handle different response structures
        const companiesData = response.companies || response.data || response || [];
        console.log('[CompanyProviderConfigModal] Raw companies data:', companiesData);
        
        // Ensure we have an array and return only active companies
        if (Array.isArray(companiesData)) {
          const filteredCompanies = companiesData.filter(company => company.status === 'active' || company.status === 'trial');
          console.log('[CompanyProviderConfigModal] Filtered companies:', filteredCompanies);
          return filteredCompanies;
        }
        
        return [];
      } catch (error) {
        console.error('Failed to fetch companies:', DeliveryTestingHelpers.getErrorMessage(error));
        
        // Return mock companies for testing
        const mockCompanies = [
          { id: 'demo-company-1', name: 'Demo Restaurant A', slug: 'demo-restaurant-a' },
          { id: 'demo-company-2', name: 'Demo Restaurant B', slug: 'demo-restaurant-b' },
          { id: 'demo-company-3', name: 'Demo Restaurant C', slug: 'demo-restaurant-c' }
        ];
        console.log('[CompanyProviderConfigModal] Using mock companies:', mockCompanies);
        return mockCompanies;
      }
    },
    enabled: user?.role === 'super_admin' && isOpen, // Only for super admin
    retry: 2,
    refetchOnWindowFocus: false
  });

  // Debug logging
  console.log('[CompanyProviderConfigModal] Current user role:', user?.role);
  console.log('[CompanyProviderConfigModal] Is super admin?', user?.role === 'super_admin');
  console.log('[CompanyProviderConfigModal] Modal is open?', isOpen);
  console.log('[CompanyProviderConfigModal] Query enabled?', user?.role === 'super_admin' && isOpen);
  console.log('[CompanyProviderConfigModal] Companies loaded:', companies.length);

  // Create/Update mutation with enhanced error handling
  const mutation = useMutation({
    mutationFn: async (data: any) => {
      try {
        let url = `${API_BASE_URL}/delivery/company-provider-configs`;
        let method = 'POST';
        
        if (config) {
          url = `${API_BASE_URL}/delivery/company-provider-configs/${config.id}`;
          method = 'PATCH';
        }

        console.log('[CompanyProviderConfigModal] Attempting to create/update provider config:', {
          url,
          method,
          data,
          hasToken: !!localStorage.getItem('token')
        });

        const response = await DeliveryTestingHelpers.safeFetch(url, {
          method,
          body: JSON.stringify(data),
        });

        console.log('[CompanyProviderConfigModal] Provider config created successfully:', response);
        return response;
      } catch (error) {
        const errorMessage = DeliveryTestingHelpers.getErrorMessage(error);
        console.error('Provider config mutation error:', errorMessage);
        
        // Check if it's an authentication error
        if (errorMessage.includes('Invalid token') || errorMessage.includes('Unauthorized')) {
          throw new Error(`Authentication failed. Please refresh the page and try again. (${errorMessage})`);
        }
        
        throw new Error(`Failed to ${config ? 'update' : 'create'} provider configuration: ${errorMessage}`);
      }
    },
    onSuccess: (data) => {
      console.log('[CompanyProviderConfigModal] Provider configuration saved successfully');
      onSuccess();
    },
    onError: (error: any) => {
      const errorMsg = DeliveryTestingHelpers.getErrorMessage(error);
      console.error('Provider configuration error:', errorMsg);
      
      // For now, we'll just log the error. In a real app, you'd show a toast notification
      alert(`Error: ${errorMsg}`);
    }
  });

  useEffect(() => {
    if (config) {
      setFormData({
        companyId: config.companyId,
        providerType: config.providerType,
        configuration: config.configuration,
        credentials: config.credentials,
        isActive: config.isActive,
        priority: config.priority,
        maxDistance: config.maxDistance,
        baseFee: config.baseFee,
        feePerKm: config.feePerKm,
        avgDeliveryTime: config.avgDeliveryTime
      });
    } else {
      setFormData({
        companyId: user?.role === 'super_admin' ? '' : user?.companyId || '',
        providerType: '',
        configuration: {},
        credentials: {},
        isActive: true,
        priority: 1,
        maxDistance: 15,
        baseFee: 2.5,
        feePerKm: 0.5,
        avgDeliveryTime: 30
      });
    }
  }, [config, user]);

  const handleProviderTypeChange = (providerType: string) => {
    console.log('[CompanyProviderConfigModal] Provider type changed to:', providerType);
    
    const template = PROVIDER_CONFIG_TEMPLATES[providerType as keyof typeof PROVIDER_CONFIG_TEMPLATES];
    const configuration = template?.configuration || {};
    const credentials = template?.credentials || {};
    
    console.log('[CompanyProviderConfigModal] Template found:', !!template);
    console.log('[CompanyProviderConfigModal] Configuration fields:', Object.keys(configuration));
    console.log('[CompanyProviderConfigModal] Credentials fields:', Object.keys(credentials));
    
    setFormData(prev => ({
      ...prev,
      providerType,
      configuration,
      credentials
    }));
  };

  const handleConfigurationChange = (key: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      configuration: {
        ...prev.configuration,
        [key]: value
      }
    }));
  };

  const handleCredentialsChange = (key: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      credentials: {
        ...prev.credentials,
        [key]: value
      }
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate(formData);
  };

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black bg-opacity-25" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-2xl transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                <div className="flex justify-between items-center mb-6">
                  <Dialog.Title className="text-lg font-medium text-gray-900">
                    {config ? 'Update Provider Configuration' : 'Add Provider Configuration'}
                  </Dialog.Title>
                  <button
                    onClick={onClose}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <XMarkIcon className="h-6 w-6" />
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Company Selection (Super Admin Only) */}
                  {user?.role === 'super_admin' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Company
                      </label>
                      <select
                        value={formData.companyId}
                        onChange={(e) => setFormData(prev => ({ ...prev, companyId: e.target.value }))}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                        disabled={!!config}
                      >
                        <option value="">Select Company</option>
                        {companies.map((company) => (
                          <option key={company.id} value={company.id}>
                            {company.name}
                          </option>
                        ))}
                      </select>
                      {companies.length === 0 && (
                        <p className="text-xs text-gray-500 mt-1">
                          Loading companies... If this persists, check your connection.
                        </p>
                      )}
                    </div>
                  )}

                  {/* Provider Type */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Provider Type
                    </label>
                    <select
                      value={formData.providerType}
                      onChange={(e) => handleProviderTypeChange(e.target.value)}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                      disabled={!!config}
                    >
                      <option value="">Select Provider</option>
                      {PROVIDER_TYPES.map((provider) => (
                        <option key={provider.value} value={provider.value}>
                          {provider.label} - {provider.description}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Basic Settings */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Priority
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={formData.priority}
                        onChange={(e) => setFormData(prev => ({ ...prev, priority: parseInt(e.target.value) }))}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Max Distance (km)
                      </label>
                      <input
                        type="number"
                        min="1"
                        step="0.1"
                        value={formData.maxDistance}
                        onChange={(e) => setFormData(prev => ({ ...prev, maxDistance: parseFloat(e.target.value) }))}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Base Fee ($)
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={formData.baseFee}
                        onChange={(e) => setFormData(prev => ({ ...prev, baseFee: parseFloat(e.target.value) }))}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Fee per KM ($)
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={formData.feePerKm}
                        onChange={(e) => setFormData(prev => ({ ...prev, feePerKm: parseFloat(e.target.value) }))}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Avg Delivery Time (min)
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={formData.avgDeliveryTime}
                        onChange={(e) => setFormData(prev => ({ ...prev, avgDeliveryTime: parseInt(e.target.value) }))}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>
                  </div>

                  {/* Configuration */}
                  {formData.providerType && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Configuration
                      </label>
                      <div className="space-y-3 p-4 bg-gray-50 rounded-md">
                        {Object.keys(formData.configuration).map((key) => (
                          <div key={key}>
                            <label className="block text-xs font-medium text-gray-600 mb-1">
                              {key.replace(/([A-Z])/g, ' $1').toLowerCase()}
                            </label>
                            <input
                              type="text"
                              value={(formData.configuration as any)[key] || ''}
                              onChange={(e) => handleConfigurationChange(key, e.target.value)}
                              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                              placeholder={`Enter ${key.toLowerCase()}`}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Credentials */}
                  {formData.providerType && (
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <label className="block text-sm font-medium text-gray-700">
                          Credentials (Secure)
                        </label>
                        <button
                          type="button"
                          onClick={() => setShowCredentials(!showCredentials)}
                          className="flex items-center text-xs text-gray-500 hover:text-gray-700"
                        >
                          {showCredentials ? (
                            <>
                              <EyeSlashIcon className="h-4 w-4 mr-1" />
                              Hide
                            </>
                          ) : (
                            <>
                              <EyeIcon className="h-4 w-4 mr-1" />
                              Show
                            </>
                          )}
                        </button>
                      </div>
                      <div className="space-y-3 p-4 bg-red-50 rounded-md">
                        {Object.keys(formData.credentials).map((key) => (
                          <div key={key}>
                            <label className="block text-xs font-medium text-gray-600 mb-1">
                              {key.replace(/([A-Z])/g, ' $1').toLowerCase()}
                            </label>
                            <input
                              type={showCredentials ? "text" : "password"}
                              value={(formData.credentials as any)[key] || ''}
                              onChange={(e) => handleCredentialsChange(key, e.target.value)}
                              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                              placeholder={`Enter ${key.toLowerCase()}`}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Active Status */}
                  <div>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={formData.isActive}
                        onChange={(e) => setFormData(prev => ({ ...prev, isActive: e.target.checked }))}
                        className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                      />
                      <span className="ml-2 text-sm text-gray-700">Active Configuration</span>
                    </label>
                  </div>

                  {/* Submit Button */}
                  <div className="flex justify-end space-x-3 pt-4">
                    <button
                      type="button"
                      onClick={onClose}
                      className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={mutation.isLoading}
                      className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                    >
                      {mutation.isLoading ? 'Saving...' : config ? 'Update' : 'Create'}
                    </button>
                  </div>
                </form>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}