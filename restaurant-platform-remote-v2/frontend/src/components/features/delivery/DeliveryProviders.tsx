import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  TruckIcon, 
  CheckCircleIcon, 
  XCircleIcon, 
  CogIcon,
  ExclamationTriangleIcon 
} from '@heroicons/react/24/outline';
import axios from 'axios';
import DeliveryProviderConfig from './DeliveryProviderConfig';

interface DeliveryProvider {
  id: string;
  name: string;
  displayName: {
    en: string;
    ar: string;
  };
  apiBaseUrl: string;
  isActive: boolean;
  priority: number;
  avgDeliveryTime: number;
  baseFee: string;
  feePerKm: string;
  maxDistance: string;
  configuration: any;
  createdAt: string;
  updatedAt: string;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002/api/v1';

export default function DeliveryProviders() {
  const [activeView, setActiveView] = useState<'overview' | 'configuration'>('overview');

  // Fetch delivery providers
  const { data: providers = [], isLoading, error } = useQuery({
    queryKey: ['delivery-providers'],
    queryFn: async () => {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_BASE_URL}/delivery/providers`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data;
    }
  });

  const getProviderIcon = (providerName: string) => {
    switch (providerName.toLowerCase()) {
      case 'dhub':
        return '🚛';
      case 'careem':
        return '🚗';
      case 'careemexpress':
        return '⚡';
      case 'talabat':
        return '🏍️';
      case 'jahez':
        return '🍔';
      case 'deliveroo':
        return '🍕';
      case 'yallow':
        return '🟡';
      case 'jooddelivery':
        return '📦';
      case 'topdeliver':
        return '🔝';
      case 'nashmi':
        return '🏜️';
      case 'tawasi':
        return '🌊';
      case 'delivergy':
        return '⚙️';
      case 'utrac':
        return '📍';
      case 'local_delivery':
        return '🏪';
      default:
        return '📦';
    }
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="text-center py-8">
          <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-red-400" />
          <h3 className="mt-2 text-lg font-medium text-red-600">Failed to load delivery providers</h3>
          <p className="mt-2 text-gray-600">Please try again later.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header with View Toggle */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Delivery Providers</h2>
          <p className="text-gray-600 mt-1">
            Manage integration with Jordan delivery services (DHUB, Careem, Talabat)
          </p>
        </div>
        
        <div className="flex space-x-2">
          <button
            onClick={() => setActiveView('overview')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeView === 'overview'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <TruckIcon className="h-4 w-4 mr-2 inline" />
            Overview
          </button>
          <button
            onClick={() => setActiveView('configuration')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeView === 'configuration'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <CogIcon className="h-4 w-4 mr-2 inline" />
            Configuration
          </button>
        </div>
      </div>

      {/* Content based on active view */}
      {activeView === 'overview' ? (
        <div>
          {/* Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg p-4 text-white">
              <div className="flex items-center">
                <TruckIcon className="h-8 w-8" />
                <div className="ml-3">
                  <p className="text-sm font-medium opacity-90">Total Providers</p>
                  <p className="text-2xl font-bold">{providers.length}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-lg p-4 text-white">
              <div className="flex items-center">
                <CheckCircleIcon className="h-8 w-8" />
                <div className="ml-3">
                  <p className="text-sm font-medium opacity-90">Active</p>
                  <p className="text-2xl font-bold">
                    {providers.filter((p: DeliveryProvider) => p.isActive).length}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="bg-gradient-to-r from-yellow-500 to-yellow-600 rounded-lg p-4 text-white">
              <div className="flex items-center">
                <XCircleIcon className="h-8 w-8" />
                <div className="ml-3">
                  <p className="text-sm font-medium opacity-90">Inactive</p>
                  <p className="text-2xl font-bold">
                    {providers.filter((p: DeliveryProvider) => !p.isActive).length}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg p-4 text-white">
              <div className="flex items-center">
                <CogIcon className="h-8 w-8" />
                <div className="ml-3">
                  <p className="text-sm font-medium opacity-90">Avg Delivery</p>
                  <p className="text-2xl font-bold">
                    {Math.round(
                      providers.reduce((acc: number, p: DeliveryProvider) => acc + p.avgDeliveryTime, 0) / 
                      providers.length
                    )} min
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Providers List */}
          <div className="bg-white rounded-lg border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Available Providers</h3>
            </div>
            
            <div className="divide-y divide-gray-200">
              {providers.map((provider: DeliveryProvider) => (
                <div key={provider.id} className="px-6 py-4 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <span className="text-3xl">{getProviderIcon(provider.name)}</span>
                      <div>
                        <h4 className="text-lg font-semibold text-gray-900">
                          {provider.displayName.en}
                        </h4>
                        <p className="text-gray-600 text-sm">{provider.displayName.ar}</p>
                        <p className="text-gray-500 text-sm mt-1">
                          Priority #{provider.priority} • Avg {provider.avgDeliveryTime} mins
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-4">
                      <div className="text-right">
                        <div className="text-sm text-gray-600">
                          Base: {provider.baseFee} JOD
                        </div>
                        <div className="text-sm text-gray-600">
                          Per KM: {provider.feePerKm} JOD
                        </div>
                        <div className="text-sm text-gray-600">
                          Max: {provider.maxDistance} KM
                        </div>
                      </div>
                      
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                        provider.isActive
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {provider.isActive ? (
                          <>
                            <CheckCircleIcon className="h-4 w-4 mr-1" />
                            Active
                          </>
                        ) : (
                          <>
                            <XCircleIcon className="h-4 w-4 mr-1" />
                            Inactive
                          </>
                        )}
                      </span>
                    </div>
                  </div>
                  
                  <div className="mt-3 flex items-center justify-between">
                    <div className="text-sm text-gray-500">
                      API: {provider.apiBaseUrl}
                    </div>
                    <div className="text-sm text-gray-400">
                      Updated: {new Date(provider.updatedAt).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Jordan Market Info */}
          <div className="mt-8 bg-gradient-to-r from-green-50 to-blue-50 rounded-lg p-6 border border-green-200">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <span className="text-2xl">🇯🇴</span>
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-semibold text-gray-900">Complete Middle East Delivery Ecosystem</h3>
                <p className="text-gray-600 mt-1">
                  Our platform integrates with 14 delivery providers covering the entire Middle East region, 
                  plus international markets. Multi-tenant, multi-currency, and multi-payment method support.
                </p>
                
                {/* Major Providers */}
                <div className="mt-4">
                  <h4 className="font-medium text-gray-900 mb-2">🌟 Major Regional Providers</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 text-sm">
                    <div className="bg-white/50 p-2 rounded-lg">
                      <span className="font-medium text-gray-900">🚛 DHUB:</span>
                      <span className="text-gray-600 ml-1 block">Jordan leader, fastest times</span>
                    </div>
                    <div className="bg-white/50 p-2 rounded-lg">
                      <span className="font-medium text-gray-900">🏍️ Talabat:</span>
                      <span className="text-gray-600 ml-1 block">Gulf states, multi-payment</span>
                    </div>
                    <div className="bg-white/50 p-2 rounded-lg">
                      <span className="font-medium text-gray-900">🚗 Careem:</span>
                      <span className="text-gray-600 ml-1 block">MENA region, premium service</span>
                    </div>
                    <div className="bg-white/50 p-2 rounded-lg">
                      <span className="font-medium text-gray-900">⚡ Careem Express:</span>
                      <span className="text-gray-600 ml-1 block">UAE/Saudi, 15-min express</span>
                    </div>
                    <div className="bg-white/50 p-2 rounded-lg">
                      <span className="font-medium text-gray-900">🍔 Jahez:</span>
                      <span className="text-gray-600 ml-1 block">Saudi Arabia, rapid growth</span>
                    </div>
                    <div className="bg-white/50 p-2 rounded-lg">
                      <span className="font-medium text-gray-900">🍕 Deliveroo:</span>
                      <span className="text-gray-600 ml-1 block">International, UK & UAE</span>
                    </div>
                  </div>
                </div>

                {/* Local Providers */}
                <div className="mt-4">
                  <h4 className="font-medium text-gray-900 mb-2">🏪 Local & Specialized Providers</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2 text-sm">
                    <div className="bg-white/50 p-2 rounded-lg">
                      <span className="font-medium text-gray-900">🟡 Yallow:</span>
                      <span className="text-gray-600 ml-1 block">Jordan local</span>
                    </div>
                    <div className="bg-white/50 p-2 rounded-lg">
                      <span className="font-medium text-gray-900">📦 Jood:</span>
                      <span className="text-gray-600 ml-1 block">Saudi focused</span>
                    </div>
                    <div className="bg-white/50 p-2 rounded-lg">
                      <span className="font-medium text-gray-900">🔝 TopDeliver:</span>
                      <span className="text-gray-600 ml-1 block">Kuwait, KNET</span>
                    </div>
                    <div className="bg-white/50 p-2 rounded-lg">
                      <span className="font-medium text-gray-900">🏜️ Nashmi:</span>
                      <span className="text-gray-600 ml-1 block">Qatar focused</span>
                    </div>
                    <div className="bg-white/50 p-2 rounded-lg">
                      <span className="font-medium text-gray-900">🌊 Tawasi:</span>
                      <span className="text-gray-600 ml-1 block">Lebanon local</span>
                    </div>
                    <div className="bg-white/50 p-2 rounded-lg">
                      <span className="font-medium text-gray-900">⚙️ Delivergy:</span>
                      <span className="text-gray-600 ml-1 block">Multi-regional</span>
                    </div>
                    <div className="bg-white/50 p-2 rounded-lg">
                      <span className="font-medium text-gray-900">📍 U-Trac:</span>
                      <span className="text-gray-600 ml-1 block">Logistics tracking</span>
                    </div>
                    <div className="bg-white/50 p-2 rounded-lg">
                      <span className="font-medium text-gray-900">🏪 Local:</span>
                      <span className="text-gray-600 ml-1 block">Restaurant-managed</span>
                    </div>
                  </div>
                </div>

                {/* Payment Methods */}
                <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-1">💳 Payment Methods Supported</h4>
                  <div className="text-sm text-gray-600">
                    <span className="inline-block mr-3">💰 Cash</span>
                    <span className="inline-block mr-3">💳 Cards</span>
                    <span className="inline-block mr-3">🏪 Pay at Vendor</span>
                    <span className="inline-block mr-3">📦 Pay at Pickup</span>
                    <span className="inline-block mr-3">🔄 Digital Wallets</span>
                    <span className="inline-block mr-3">🇰🇼 KNET</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <DeliveryProviderConfig />
      )}
    </div>
  );
}