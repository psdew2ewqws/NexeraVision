import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  TruckIcon, 
  CheckCircleIcon, 
  XCircleIcon, 
  CogIcon,
  ExclamationTriangleIcon,
  PlusIcon,
  BuildingOfficeIcon,
  MapPinIcon,
  ClockIcon,
  CurrencyDollarIcon,
  WifiIcon,
  DocumentTextIcon,
  ChartBarIcon,
  HeartIcon,
  BoltIcon
} from '@heroicons/react/24/outline';
import axios from 'axios';
import { useAuth } from 'src/contexts/AuthContext';
import CompanyProviderConfigModal from './CompanyProviderConfigModal';
import BranchProviderMappingModal from './BranchProviderMappingModal';
import ProviderConnectionTest from './ProviderConnectionTest';
import ProviderAnalyticsDashboard from './ProviderAnalyticsDashboard';
import DeliveryNotificationSystem, { useDeliveryNotifications } from './DeliveryNotificationSystem';
import ProviderConnectionTesting from './ProviderConnectionTesting';

interface CompanyProviderConfig {
  id: string;
  companyId: string;
  providerType: string;
  configuration: any;
  credentials: any;
  isActive: boolean;
  priority: number;
  maxDistance: number;
  baseFee: number;
  feePerKm: number;
  avgDeliveryTime: number;
  createdAt: string;
  updatedAt: string;
  company: {
    id: string;
    name: string;
    slug: string;
  };
  createdBy: {
    id: string;
    firstName: string;
    lastName: string;
  };
  _count: {
    branchMappings: number;
    providerOrders: number;
  };
}

interface BranchProviderMapping {
  id: string;
  branchId: string;
  companyProviderConfigId: string;
  providerBranchId: string;
  providerSiteId?: string;
  branchConfiguration?: any;
  isActive: boolean;
  priority: number;
  branch: {
    id: string;
    name: string;
    nameAr: string;
    company: {
      id: string;
      name: string;
    };
  };
  companyProviderConfig: {
    id: string;
    providerType: string;
    isActive: boolean;
    maxDistance: number;
    baseFee: number;
    avgDeliveryTime: number;
  };
  _count: {
    orders: number;
  };
}

interface ProviderStats {
  configurations: {
    total: number;
    active: number;
    inactive: number;
  };
  mappings: {
    total: number;
    active: number;
    inactive: number;
  };
  orders: {
    total: number;
    success: number;
    failed: number;
    pending: number;
  };
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002/api/v1';

// Professional B2B provider metadata
const PROVIDER_METADATA = {
  talabat: { 
    label: 'Talabat', 
    icon: TruckIcon, 
    description: 'Gulf states coverage',
    color: 'bg-orange-50 text-orange-600 border-orange-200',
    region: 'Gulf States'
  },
  careem: { 
    label: 'Careem', 
    icon: TruckIcon, 
    description: 'MENA premium service',
    color: 'bg-green-50 text-green-600 border-green-200',
    region: 'MENA'
  },
  careemexpress: { 
    label: 'Careem Express', 
    icon: TruckIcon, 
    description: 'UAE/Saudi 15-min',
    color: 'bg-blue-50 text-blue-600 border-blue-200',
    region: 'UAE/Saudi'
  },
  topdeliver: { 
    label: 'TopDeliver', 
    icon: TruckIcon, 
    description: 'Kuwait KNET',
    color: 'bg-purple-50 text-purple-600 border-purple-200',
    region: 'Kuwait'
  },
  nashmi: { 
    label: 'Nashmi', 
    icon: TruckIcon, 
    description: 'Qatar focused',
    color: 'bg-red-50 text-red-600 border-red-200',
    region: 'Qatar'
  },
  local_delivery: { 
    label: 'Local Delivery', 
    icon: BuildingOfficeIcon, 
    description: 'Restaurant managed',
    color: 'bg-gray-50 text-gray-600 border-gray-200',
    region: 'Local'
  },
  dhub: { 
    label: 'DHUB', 
    icon: TruckIcon, 
    description: 'Jordan local leader',
    color: 'bg-indigo-50 text-indigo-600 border-indigo-200',
    region: 'Jordan'
  },
  jahez: { 
    label: 'Jahez', 
    icon: TruckIcon, 
    description: 'Saudi Arabia focused',
    color: 'bg-yellow-50 text-yellow-600 border-yellow-200',
    region: 'Saudi Arabia'
  },
  deliveroo: { 
    label: 'Deliveroo', 
    icon: TruckIcon, 
    description: 'International coverage',
    color: 'bg-cyan-50 text-cyan-600 border-cyan-200',
    region: 'International'
  },
  yallow: { 
    label: 'Yallow', 
    icon: TruckIcon, 
    description: 'Jordan local',
    color: 'bg-amber-50 text-amber-600 border-amber-200',
    region: 'Jordan'
  },
  jooddelivery: { 
    label: 'Jood Delivery', 
    icon: TruckIcon, 
    description: 'Saudi focused',
    color: 'bg-emerald-50 text-emerald-600 border-emerald-200',
    region: 'Saudi Arabia'
  },
  tawasi: { 
    label: 'Tawasi', 
    icon: TruckIcon, 
    description: 'Lebanon local',
    color: 'bg-teal-50 text-teal-600 border-teal-200',
    region: 'Lebanon'
  },
  delivergy: { 
    label: 'Delivergy', 
    icon: CogIcon, 
    description: 'Multi-regional',
    color: 'bg-slate-50 text-slate-600 border-slate-200',
    region: 'Multi-regional'
  },
  utrac: { 
    label: 'U-Trac', 
    icon: MapPinIcon, 
    description: 'Logistics tracking',
    color: 'bg-rose-50 text-rose-600 border-rose-200',
    region: 'Logistics'
  },
};

// All providers available for Add Provider functionality
const ALL_PROVIDER_TYPES = Object.entries(PROVIDER_METADATA).map(([value, meta]) => ({
  value,
  label: meta.label,
  description: meta.description,
}));

export default function MultiTenantDeliveryProviders() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'overview' | 'configurations' | 'mappings' | 'analytics' | 'testing' | 'system-health'>('overview');
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [showMappingModal, setShowMappingModal] = useState(false);
  const [selectedConfig, setSelectedConfig] = useState<CompanyProviderConfig | null>(null);

  // Initialize notification system
  const notifications = useDeliveryNotifications();

  // Fetch provider configuration statistics
  const { data: stats, isLoading: statsLoading } = useQuery<ProviderStats>({
    queryKey: ['provider-stats', user?.companyId],
    queryFn: async () => {
      const token = localStorage.getItem('token');
      const params = user?.role !== 'super_admin' && user?.companyId ? `?companyId=${user.companyId}` : '';
      const response = await axios.get(`${API_BASE_URL}/delivery/provider-configuration-stats${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data;
    }
  });

  // Fetch company provider configurations
  const { data: configs = [], isLoading: configsLoading } = useQuery<CompanyProviderConfig[]>({
    queryKey: ['company-provider-configs', user?.companyId],
    queryFn: async () => {
      const token = localStorage.getItem('token');
      const params = user?.role !== 'super_admin' && user?.companyId ? `?companyId=${user.companyId}` : '';
      const response = await axios.get(`${API_BASE_URL}/delivery/company-provider-configs${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data;
    }
  });

  // Fetch branch provider mappings
  const { data: mappings = [], isLoading: mappingsLoading } = useQuery<BranchProviderMapping[]>({
    queryKey: ['branch-provider-mappings', user?.companyId],
    queryFn: async () => {
      const token = localStorage.getItem('token');
      const params = user?.role !== 'super_admin' && user?.companyId ? `?companyId=${user.companyId}` : '';
      const response = await axios.get(`${API_BASE_URL}/delivery/branch-provider-mappings${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data;
    }
  });

  // Fetch dashboard provider overview
  const { data: dashboardData } = useQuery({
    queryKey: ['dashboard-provider-overview', user?.companyId],
    queryFn: async () => {
      const token = localStorage.getItem('token');
      const params = user?.role !== 'super_admin' && user?.companyId ? `?companyId=${user.companyId}` : '';
      const response = await axios.get(`${API_BASE_URL}/delivery/dashboard/provider-overview${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data;
    }
  });

  // Fetch system health data
  const { data: systemHealth, isLoading: healthLoading } = useQuery({
    queryKey: ['delivery-system-health'],
    queryFn: async () => {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_BASE_URL}/delivery/monitoring/health`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data;
    },
    refetchInterval: 30000 // Refresh every 30 seconds
  });

  // Fetch real-time metrics
  const { data: systemMetrics } = useQuery({
    queryKey: ['delivery-system-metrics'],
    queryFn: async () => {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_BASE_URL}/delivery/monitoring/metrics`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data;
    },
    refetchInterval: 10000 // Refresh every 10 seconds
  });

  const getProviderInfo = (providerType: string) => {
    return PROVIDER_METADATA[providerType as keyof typeof PROVIDER_METADATA] || { 
      label: providerType.toUpperCase(),
      icon: TruckIcon,
      description: 'Unknown provider',
      color: 'bg-gray-50 text-gray-600 border-gray-200',
      region: 'Unknown'
    };
  };

  if (statsLoading || configsLoading || mappingsLoading) {
    return (
      <div className="p-6">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 relative">
      {/* Notification System */}
      <DeliveryNotificationSystem 
        notifications={notifications.notifications}
        onDismiss={notifications.removeNotification}
        maxVisible={3}
        position="top-right"
      />
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Multi-Tenant Delivery Providers</h2>
          <p className="text-gray-600 mt-1">
            Configure delivery providers per company and map branches to provider branches
          </p>
        </div>
        
        {user?.role === 'super_admin' && (
          <button
            onClick={() => setShowConfigModal(true)}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            <PlusIcon className="h-4 w-4 mr-2" />
            Add Provider Config
          </button>
        )}
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'overview', name: 'Overview', icon: ChartBarIcon },
            { id: 'configurations', name: 'Configurations', icon: CogIcon },
            { id: 'mappings', name: 'Branch Mappings', icon: MapPinIcon },
            { id: 'analytics', name: 'Analytics', icon: DocumentTextIcon },
            { id: 'testing', name: 'Connection Testing', icon: WifiIcon },
            { id: 'system-health', name: 'System Health', icon: HeartIcon }
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center space-x-2 py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="h-5 w-5" />
                <span>{tab.name}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Statistics Cards */}
          {stats && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
                <div className="flex items-center">
                  <CogIcon className="h-8 w-8 text-blue-500" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Configurations</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.configurations.active}/{stats.configurations.total}</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
                <div className="flex items-center">
                  <MapPinIcon className="h-8 w-8 text-green-500" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Branch Mappings</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.mappings.active}/{stats.mappings.total}</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
                <div className="flex items-center">
                  <TruckIcon className="h-8 w-8 text-purple-500" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Total Orders</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.orders.total}</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
                <div className="flex items-center">
                  <CheckCircleIcon className="h-8 w-8 text-emerald-500" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Success Rate</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {stats.orders.total > 0 ? Math.round((stats.orders.success / stats.orders.total) * 100) : 0}%
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Quick Access Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-lg border border-blue-200">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Company Configurations</h3>
                  <p className="text-gray-600 mt-1">Manage API keys and provider settings per company</p>
                  <div className="mt-4">
                    <span className="text-2xl font-bold text-blue-600">{configs.length}</span>
                    <span className="text-gray-600 ml-2">Active Configurations</span>
                  </div>
                </div>
                <BuildingOfficeIcon className="h-12 w-12 text-blue-500" />
              </div>
              <button
                onClick={() => setActiveTab('configurations')}
                className="mt-4 w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Manage Configurations
              </button>
            </div>

            <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-6 rounded-lg border border-green-200">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Branch Mappings</h3>
                  <p className="text-gray-600 mt-1">Map branches to provider branch IDs</p>
                  <div className="mt-4">
                    <span className="text-2xl font-bold text-green-600">{mappings.length}</span>
                    <span className="text-gray-600 ml-2">Active Mappings</span>
                  </div>
                </div>
                <MapPinIcon className="h-12 w-12 text-green-500" />
              </div>
              <button
                onClick={() => setActiveTab('mappings')}
                className="mt-4 w-full bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition-colors"
              >
                Manage Mappings
              </button>
            </div>
          </div>

          {/* Active Delivery Providers */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Active Delivery Providers</h3>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                {configs.filter(c => c.isActive).length} Active
              </span>
            </div>
            
            {configs.filter(c => c.isActive).length === 0 ? (
              <div className="text-center py-12">
                <TruckIcon className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-semibold text-gray-900">No active providers</h3>
                <p className="mt-1 text-sm text-gray-500">Get started by adding your first delivery provider.</p>
                <div className="mt-6">
                  <button
                    onClick={() => setShowConfigModal(true)}
                    className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                  >
                    <PlusIcon className="h-4 w-4 mr-2" />
                    Add Provider Configuration
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {configs.filter(c => c.isActive).map((config) => {
                  const metadata = PROVIDER_METADATA[config.providerType as keyof typeof PROVIDER_METADATA];
                  const IconComponent = metadata?.icon || TruckIcon;
                  
                  return (
                    <div key={config.id} className={`flex items-center justify-between p-4 rounded-lg border ${metadata?.color || 'bg-gray-50 text-gray-600 border-gray-200'}`}>
                      <div className="flex items-center">
                        <div className="flex-shrink-0">
                          <IconComponent className="h-6 w-6" />
                        </div>
                        <div className="ml-4">
                          <h4 className="font-semibold">{metadata?.label || config.providerType}</h4>
                          <p className="text-sm opacity-75">{metadata?.description || 'Delivery service'}</p>
                          <div className="flex items-center mt-1 text-xs opacity-60">
                            <span>{config.company.name}</span>
                            <span className="mx-2">•</span>
                            <span>{metadata?.region || 'Regional'}</span>
                            <span className="mx-2">•</span>
                            <span>{config._count.branchMappings} branches</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          config._count.branchMappings > 0 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {config._count.branchMappings > 0 ? 'Mapped' : 'Unmapped'}
                        </span>
                        <button
                          onClick={() => {
                            setSelectedConfig(config);
                            setShowConfigModal(true);
                          }}
                          className="p-1 text-gray-400 hover:text-gray-600"
                        >
                          <CogIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'configurations' && (
        <div className="space-y-4">
          {/* Configurations List */}
          <div className="bg-white rounded-lg border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-lg font-medium text-gray-900">Company Provider Configurations</h3>
              {user?.role === 'super_admin' && (
                <button
                  onClick={() => setShowConfigModal(true)}
                  className="inline-flex items-center px-3 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
                >
                  <PlusIcon className="h-4 w-4 mr-1" />
                  Add Configuration
                </button>
              )}
            </div>
            
            <div className="divide-y divide-gray-200">
              {configs.map((config) => {
                const providerInfo = getProviderInfo(config.providerType);
                const IconComponent = providerInfo.icon;
                return (
                  <div key={config.id} className="px-6 py-4 hover:bg-gray-50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                          <IconComponent className="h-6 w-6 text-gray-600" />
                        </div>
                        <div>
                          <div className="flex items-center space-x-2">
                            <h4 className="text-lg font-semibold text-gray-900">{providerInfo.label}</h4>
                            <span className="text-sm text-gray-500">•</span>
                            <span className="text-sm font-medium text-gray-600">{config.company.name}</span>
                          </div>
                          <p className="text-sm text-gray-600">{providerInfo.description}</p>
                          <div className="flex items-center space-x-4 mt-1 text-xs text-gray-500">
                            <span>Priority: {config.priority}</span>
                            <span>Max Distance: {config.maxDistance}km</span>
                            <span>Base Fee: ${config.baseFee}</span>
                            <span>Avg Time: {config.avgDeliveryTime}min</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-3">
                        <div className="text-right text-sm">
                          <div className="text-gray-600">{config._count.branchMappings} branches</div>
                          <div className="text-gray-600">{config._count.providerOrders} orders</div>
                        </div>
                        
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          config.isActive
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {config.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'mappings' && (
        <div className="space-y-4">
          {/* Branch Mappings List */}
          <div className="bg-white rounded-lg border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-lg font-medium text-gray-900">Branch Provider Mappings</h3>
              <button
                onClick={() => setShowMappingModal(true)}
                className="inline-flex items-center px-3 py-2 bg-green-600 text-white text-sm rounded-md hover:bg-green-700"
              >
                <PlusIcon className="h-4 w-4 mr-1" />
                Add Mapping
              </button>
            </div>
            
            <div className="divide-y divide-gray-200">
              {mappings.map((mapping) => {
                const providerInfo = getProviderInfo(mapping.companyProviderConfig.providerType);
                const IconComponent = providerInfo.icon;
                return (
                  <div key={mapping.id} className="px-6 py-4 hover:bg-gray-50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                          <IconComponent className="h-6 w-6 text-gray-600" />
                        </div>
                        <div>
                          <div className="flex items-center space-x-2">
                            <h4 className="text-base font-semibold text-gray-900">{mapping.branch.name}</h4>
                            <span className="text-sm text-gray-500">→</span>
                            <span className="text-sm font-medium text-blue-600">{providerInfo.label}</span>
                          </div>
                          <p className="text-sm text-gray-600">{mapping.branch.company.name}</p>
                          <div className="flex items-center space-x-4 mt-1 text-xs text-gray-500">
                            <span>Provider Branch ID: {mapping.providerBranchId}</span>
                            {mapping.providerSiteId && <span>Site ID: {mapping.providerSiteId}</span>}
                            <span>Priority: {mapping.priority}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-3">
                        <div className="text-right text-sm">
                          <div className="text-gray-600">{mapping._count.orders} orders</div>
                          <div className="text-gray-600">
                            Max: {mapping.companyProviderConfig.maxDistance}km
                          </div>
                        </div>
                        
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          mapping.isActive && mapping.companyProviderConfig.isActive
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {mapping.isActive && mapping.companyProviderConfig.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'analytics' && (
        <ProviderAnalyticsDashboard companyId={user?.role !== 'super_admin' ? user?.companyId : undefined} />
      )}

      {activeTab === 'testing' && (
        <ProviderConnectionTest configs={configs} />
      )}

      {activeTab === 'system-health' && (
        <div className="space-y-6">
          {/* System Health Overview */}
          {systemHealth && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className={`bg-white p-6 rounded-lg border-2 ${
                systemHealth.status === 'healthy' ? 'border-green-200 bg-green-50' :
                systemHealth.status === 'degraded' ? 'border-yellow-200 bg-yellow-50' :
                'border-red-200 bg-red-50'
              }`}>
                <div className="flex items-center">
                  <HeartIcon className={`h-8 w-8 ${
                    systemHealth.status === 'healthy' ? 'text-green-500' :
                    systemHealth.status === 'degraded' ? 'text-yellow-500' :
                    'text-red-500'
                  }`} />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">System Status</p>
                    <p className={`text-2xl font-bold ${
                      systemHealth.status === 'healthy' ? 'text-green-600' :
                      systemHealth.status === 'degraded' ? 'text-yellow-600' :
                      'text-red-600'
                    }`}>
                      {systemHealth.status.toUpperCase()}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
                <div className="flex items-center">
                  <TruckIcon className="h-8 w-8 text-blue-500" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Active Providers</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {systemHealth.providers?.filter(p => p.status === 'healthy').length || 0}/
                      {systemHealth.providers?.length || 0}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
                <div className="flex items-center">
                  <CheckCircleIcon className="h-8 w-8 text-green-500" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Success Rate</p>
                    <p className="text-2xl font-bold text-green-600">
                      {systemHealth.metrics?.successRate ? `${systemHealth.metrics.successRate.toFixed(1)}%` : '0%'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
                <div className="flex items-center">
                  <BoltIcon className="h-8 w-8 text-purple-500" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Avg Response</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {systemHealth.providers?.length > 0 ? 
                        `${Math.round(systemHealth.providers.reduce((acc, p) => acc + p.responseTime, 0) / systemHealth.providers.length)}ms` 
                        : '0ms'
                      }
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Provider Health Details */}
          {systemHealth?.providers && (
            <div className="bg-white rounded-lg border border-gray-200">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Provider Health Status</h3>
              </div>
              <div className="divide-y divide-gray-200">
                {systemHealth.providers.map((provider, index) => (
                  <div key={index} className="px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center">
                      <div className={`w-3 h-3 rounded-full mr-3 ${
                        provider.status === 'healthy' ? 'bg-green-500' :
                        provider.status === 'degraded' ? 'bg-yellow-500' :
                        'bg-red-500'
                      }`}></div>
                      <div>
                        <h4 className="text-sm font-medium text-gray-900">{provider.name}</h4>
                        <p className="text-sm text-gray-500 capitalize">{provider.status}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="text-right">
                        <div className="text-sm font-medium text-gray-900">
                          {provider.responseTime}ms
                        </div>
                        <div className="text-xs text-gray-500">Response Time</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* System Metrics */}
          {systemMetrics && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Order Metrics (Today)</h3>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total Orders</span>
                    <span className="font-semibold">{systemMetrics.totalOrders?.toLocaleString() || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Successful</span>
                    <span className="font-semibold text-green-600">{systemMetrics.successfulOrders?.toLocaleString() || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Failed</span>
                    <span className="font-semibold text-red-600">{systemMetrics.failedOrders?.toLocaleString() || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Pending</span>
                    <span className="font-semibold text-yellow-600">{systemMetrics.pendingOrders?.toLocaleString() || 0}</span>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance Metrics</h3>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Avg Delivery Time</span>
                    <span className="font-semibold">{systemMetrics.avgDeliveryTime || 0} min</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Provider Failover Rate</span>
                    <span className="font-semibold">{systemMetrics.failoverRate ? `${systemMetrics.failoverRate.toFixed(2)}%` : '0%'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">System Uptime</span>
                    <span className="font-semibold text-green-600">{systemMetrics.uptime ? `${systemMetrics.uptime.toFixed(1)}%` : '100%'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Error Rate</span>
                    <span className="font-semibold text-red-600">{systemMetrics.errorRate ? `${systemMetrics.errorRate.toFixed(2)}%` : '0%'}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Health Loading State */}
          {healthLoading && (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      {showConfigModal && (
        <CompanyProviderConfigModal
          isOpen={showConfigModal}
          onClose={() => {
            setShowConfigModal(false);
            setSelectedConfig(null);
          }}
          config={selectedConfig}
          onSuccess={() => {
            queryClient.invalidateQueries(['company-provider-configs']);
            queryClient.invalidateQueries(['provider-stats']);
            setShowConfigModal(false);
            setSelectedConfig(null);
            
            notifications.success(
              'Configuration Saved',
              selectedConfig 
                ? 'Provider configuration updated successfully' 
                : 'New provider configuration created successfully'
            );
          }}
        />
      )}

      {showMappingModal && (
        <BranchProviderMappingModal
          isOpen={showMappingModal}
          onClose={() => setShowMappingModal(false)}
          configs={configs}
          onSuccess={() => {
            queryClient.invalidateQueries(['branch-provider-mappings']);
            queryClient.invalidateQueries(['provider-stats']);
            setShowMappingModal(false);
            
            notifications.success(
              'Branch Mapping Created',
              'Branch successfully mapped to delivery provider'
            );
          }}
        />
      )}
    </div>
  );
}