import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { 
  WifiIcon, 
  CheckCircleIcon, 
  XCircleIcon, 
  ClockIcon,
  PlayIcon,
  DocumentTextIcon 
} from '@heroicons/react/24/outline';
import axios from 'axios';

interface ProviderConnectionTestProps {
  configs: any[];
}

interface TestResult {
  success: boolean;
  message: string;
  providerType: string;
  testDetails?: any;
  logId?: string;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002/api/v1';

const PROVIDER_ICONS = {
  dhub: '🚛',
  talabat: '🏍️',
  careem: '🚗',
  careemexpress: '⚡',
  jahez: '🍔',
  deliveroo: '🍕',
  yallow: '🟡',
  jooddelivery: '📦',
  topdeliver: '🔝',
  nashmi: '🏜️',
  tawasi: '🌊',
  delivergy: '⚙️',
  utrac: '📍',
  local_delivery: '🏪'
};

export default function ProviderConnectionTest({ configs }: ProviderConnectionTestProps) {
  const [selectedConfigId, setSelectedConfigId] = useState('');
  const [testParameters, setTestParameters] = useState({
    testLatitude: 31.905614,
    testLongitude: 35.922546,
    testAddress: 'Downtown Amman, Jordan',
    testOrderValue: 25.0
  });
  const [testResults, setTestResults] = useState<Record<string, TestResult>>({});

  // Test connection mutation
  const testMutation = useMutation({
    mutationFn: async (data: { companyProviderConfigId: string; testParameters?: any }) => {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${API_BASE_URL}/delivery/test-provider-connection`,
        data,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      return response.data;
    },
    onSuccess: (result, variables) => {
      setTestResults(prev => ({
        ...prev,
        [variables.companyProviderConfigId]: result
      }));
    }
  });

  const handleTestConnection = (configId: string) => {
    testMutation.mutate({
      companyProviderConfigId: configId,
      testParameters
    });
  };

  const handleTestAllConnections = () => {
    configs.forEach(config => {
      handleTestConnection(config.id);
    });
  };

  const getTestResult = (configId: string) => {
    return testResults[configId];
  };

  const getTestStatus = (configId: string) => {
    if (testMutation.isLoading && testMutation.variables?.companyProviderConfigId === configId) {
      return 'testing';
    }
    const result = getTestResult(configId);
    if (!result) return 'not-tested';
    return result.success ? 'success' : 'failed';
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'testing':
        return <ClockIcon className="h-5 w-5 text-yellow-500 animate-spin" />;
      case 'success':
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
      case 'failed':
        return <XCircleIcon className="h-5 w-5 text-red-500" />;
      default:
        return <WifiIcon className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'testing':
        return 'bg-yellow-50 border-yellow-200';
      case 'success':
        return 'bg-green-50 border-green-200';
      case 'failed':
        return 'bg-red-50 border-red-200';
      default:
        return 'bg-white border-gray-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Test Parameters */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium text-gray-900">Test Parameters</h3>
          <button
            onClick={handleTestAllConnections}
            disabled={testMutation.isLoading}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
          >
            <PlayIcon className="h-4 w-4 mr-2" />
            Test All Providers
          </button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Test Latitude
            </label>
            <input
              type="number"
              step="0.000001"
              value={testParameters.testLatitude}
              onChange={(e) => setTestParameters(prev => ({
                ...prev,
                testLatitude: parseFloat(e.target.value)
              }))}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Test Longitude
            </label>
            <input
              type="number"
              step="0.000001"
              value={testParameters.testLongitude}
              onChange={(e) => setTestParameters(prev => ({
                ...prev,
                testLongitude: parseFloat(e.target.value)
              }))}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Test Address
            </label>
            <input
              type="text"
              value={testParameters.testAddress}
              onChange={(e) => setTestParameters(prev => ({
                ...prev,
                testAddress: e.target.value
              }))}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Test Order Value ($)
            </label>
            <input
              type="number"
              min="1"
              step="0.01"
              value={testParameters.testOrderValue}
              onChange={(e) => setTestParameters(prev => ({
                ...prev,
                testOrderValue: parseFloat(e.target.value)
              }))}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Provider Tests */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {configs.map((config) => {
          const status = getTestStatus(config.id);
          const result = getTestResult(config.id);
          const providerIcon = PROVIDER_ICONS[config.providerType] || '📦';

          return (
            <div
              key={config.id}
              className={`rounded-lg border p-6 transition-all duration-200 ${getStatusColor(status)}`}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <span className="text-2xl">{providerIcon}</span>
                  <div>
                    <h4 className="text-lg font-semibold text-gray-900">
                      {config.providerType.toUpperCase()}
                    </h4>
                    <p className="text-sm text-gray-600">{config.company.name}</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  {getStatusIcon(status)}
                  <button
                    onClick={() => handleTestConnection(config.id)}
                    disabled={testMutation.isLoading}
                    className="inline-flex items-center px-3 py-1.5 bg-white border border-gray-300 text-sm rounded-md hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
                  >
                    <PlayIcon className="h-4 w-4 mr-1" />
                    Test
                  </button>
                </div>
              </div>

              {/* Test Result */}
              {result && (
                <div className="mt-4 p-4 bg-white/50 rounded-md">
                  <div className="flex items-start space-x-2">
                    {result.success ? (
                      <CheckCircleIcon className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                    ) : (
                      <XCircleIcon className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1">
                      <p className={`text-sm font-medium ${result.success ? 'text-green-800' : 'text-red-800'}`}>
                        {result.message}
                      </p>
                      
                      {result.testDetails && (
                        <div className="mt-2 text-xs text-gray-600 space-y-1">
                          {result.testDetails.apiBaseUrl && (
                            <div>API URL: {result.testDetails.apiBaseUrl}</div>
                          )}
                          {result.testDetails.tokenValid !== undefined && (
                            <div>Token Valid: {result.testDetails.tokenValid ? 'Yes' : 'No'}</div>
                          )}
                          {result.testDetails.brandId && (
                            <div>Brand ID: {result.testDetails.brandId}</div>
                          )}
                          {result.testDetails.clientId && (
                            <div>Client ID: {result.testDetails.clientId}</div>
                          )}
                          {result.testDetails.testLatitude && (
                            <div>
                              Test Location: {result.testDetails.testLatitude}, {result.testDetails.testLongitude}
                            </div>
                          )}
                          {result.testDetails.expiresAt && (
                            <div>Token Expires: {new Date(result.testDetails.expiresAt).toLocaleString()}</div>
                          )}
                        </div>
                      )}
                      
                      {result.logId && (
                        <div className="mt-2 flex items-center text-xs text-gray-500">
                          <DocumentTextIcon className="h-3 w-3 mr-1" />
                          Log ID: {result.logId}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Configuration Summary */}
              <div className="mt-4 pt-4 border-t border-gray-200/50">
                <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
                  <div>
                    <span className="font-medium">Status:</span> {config.isActive ? 'Active' : 'Inactive'}
                  </div>
                  <div>
                    <span className="font-medium">Priority:</span> {config.priority}
                  </div>
                  <div>
                    <span className="font-medium">Max Distance:</span> {config.maxDistance}km
                  </div>
                  <div>
                    <span className="font-medium">Avg Time:</span> {config.avgDeliveryTime}min
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Test Guidelines */}
      <div className="bg-blue-50 rounded-lg p-6 border border-blue-200">
        <div className="flex items-start space-x-3">
          <WifiIcon className="h-6 w-6 text-blue-600 flex-shrink-0" />
          <div>
            <h3 className="text-lg font-semibold text-blue-900">Connection Test Guidelines</h3>
            <div className="mt-2 text-sm text-blue-800 space-y-1">
              <p>• Tests verify API credentials, connectivity, and basic configuration</p>
              <p>• Location parameters help test delivery area coverage</p>
              <p>• Order value tests minimum order requirements and pricing</p>
              <p>• All test data is logged for debugging purposes</p>
              <p>• Failed tests indicate credential issues or API unavailability</p>
            </div>
          </div>
        </div>
      </div>

      {/* Summary Statistics */}
      {configs.length > 0 && (
        <div className="bg-gray-50 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Test Summary</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-lg">
              <div className="text-2xl font-bold text-gray-900">{configs.length}</div>
              <div className="text-sm text-gray-600">Total Configs</div>
            </div>
            
            <div className="bg-white p-4 rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {Object.values(testResults).filter(r => r.success).length}
              </div>
              <div className="text-sm text-gray-600">Successful Tests</div>
            </div>
            
            <div className="bg-white p-4 rounded-lg">
              <div className="text-2xl font-bold text-red-600">
                {Object.values(testResults).filter(r => !r.success).length}
              </div>
              <div className="text-sm text-gray-600">Failed Tests</div>
            </div>
            
            <div className="bg-white p-4 rounded-lg">
              <div className="text-2xl font-bold text-gray-600">
                {configs.length - Object.keys(testResults).length}
              </div>
              <div className="text-sm text-gray-600">Not Tested</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}