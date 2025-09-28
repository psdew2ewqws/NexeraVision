import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import { ArrowLeftIcon, PlusIcon, MapPinIcon, TruckIcon, ChartBarIcon, ShieldCheckIcon, BoltIcon, CogIcon } from '@heroicons/react/24/outline';
import ProtectedRoute from 'src/components/ProtectedRoute';
import LicenseWarningHeader from 'src/components/LicenseWarningHeader';
import LocationsGrid from 'src/components/features/delivery/LocationsGrid';
import MultiTenantDeliveryProviders from 'src/components/features/delivery/MultiTenantDeliveryProviders';
import DeliveryStats from 'src/components/features/delivery/DeliveryStats';
import IntegrationReadinessCenter from 'src/components/features/delivery/IntegrationReadinessCenter';
import WebhookMonitoringSystem from 'src/components/features/delivery/WebhookMonitoringSystem';
import FailoverManagementSystem from 'src/components/features/delivery/FailoverManagementSystem';
import DeliveryNotificationSystem from 'src/components/features/delivery/DeliveryNotificationSystem';
import CompanyProviderConfigModal from 'src/components/features/delivery/CompanyProviderConfigModal';
import { useAuth } from 'src/contexts/AuthContext';

export default function DeliverySettings() {
  const router = useRouter();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('locations');
  const [isLoading, setIsLoading] = useState(true);
  const [showAddProviderModal, setShowAddProviderModal] = useState(false);

  const handleProviderAdded = () => {
    setShowAddProviderModal(false);
    // The MultiTenantDeliveryProviders component will automatically refresh via react-query
  };

  const tabs = [
    { id: 'locations', name: 'Jordan Locations', icon: MapPinIcon, roles: ['super_admin', 'company_owner', 'branch_manager'] },
    { id: 'providers', name: 'Delivery Providers', icon: TruckIcon, roles: ['super_admin', 'company_owner'] },
    { id: 'readiness', name: 'Integration Readiness', icon: ShieldCheckIcon, roles: ['super_admin', 'company_owner'] },
    { id: 'webhooks', name: 'Webhook Monitoring', icon: BoltIcon, roles: ['super_admin', 'company_owner'] },
    { id: 'failover', name: 'Failover Management', icon: CogIcon, roles: ['super_admin', 'company_owner'] },
    { id: 'stats', name: 'Statistics', icon: ChartBarIcon, roles: ['super_admin', 'company_owner', 'branch_manager'] },
  ].filter(tab => tab.roles.includes(user?.role || ''));

  useEffect(() => {
    setIsLoading(false);
  }, []);

  if (isLoading) {
    return (
      <ProtectedRoute allowedRoles={['super_admin', 'company_owner', 'branch_manager']}>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute allowedRoles={['super_admin', 'company_owner', 'branch_manager']}>
      <Head>
        <title>Delivery Settings - Restaurant Platform</title>
        <meta name="description" content="Manage Jordan locations, assign to companies/branches, and configure delivery settings" />
      </Head>
      
      <LicenseWarningHeader />
      
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-none mx-auto px-2 sm:px-4 lg:px-6 py-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <Link href="/dashboard" className="mr-4">
                  <ArrowLeftIcon className="h-6 w-6 text-gray-600 hover:text-gray-800 transition-colors" />
                </Link>
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">Delivery Settings</h1>
                  <p className="mt-2 text-gray-600">
                    Manage Jordan locations, assign to companies/branches, and configure delivery settings
                  </p>
                </div>
              </div>
              
              {/* Quick Actions */}
              <div className="flex space-x-3">
                {user?.role !== 'branch_manager' && (
                  <button 
                    onClick={() => setShowAddProviderModal(true)}
                    className="inline-flex items-center px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                  >
                    <PlusIcon className="h-4 w-4 mr-2" />
                    Add Provider
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-8">
            <nav className="flex space-x-8 px-6" aria-label="Tabs">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`
                      flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm transition-all duration-200
                      ${activeTab === tab.id
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }
                    `}
                  >
                    <Icon className="h-5 w-5" />
                    <span>{tab.name}</span>
                    {tab.id === 'locations' && (
                      <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        546+
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Tab Content */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            {activeTab === 'locations' && <LocationsGrid />}
            {activeTab === 'providers' && <MultiTenantDeliveryProviders />}
            {activeTab === 'readiness' && <IntegrationReadinessCenter />}
            {activeTab === 'webhooks' && <WebhookMonitoringSystem />}
            {activeTab === 'failover' && <FailoverManagementSystem />}
            {activeTab === 'stats' && <DeliveryStats />}
          </div>
          
          {/* Notification System - Self-contained with hook */}
        </div>

        {/* Add Provider Modal */}
        <CompanyProviderConfigModal
          isOpen={showAddProviderModal}
          onClose={() => setShowAddProviderModal(false)}
          onSuccess={handleProviderAdded}
        />
      </div>
    </ProtectedRoute>
  );
}