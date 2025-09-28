// Multi-Tenant Dashboard Component
import React, { useState, useEffect, useCallback } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Alert } from './ui/alert';
import { LoadingSpinner } from './ui/loading-spinner';

interface CompanyInfo {
  id: string;
  name: string;
  slug: string;
  logo?: string;
  businessType: string;
  timezone: string;
  defaultCurrency: string;
  status: 'trial' | 'active' | 'suspended';
  subscriptionPlan?: string;
  subscriptionExpiresAt?: Date;
}

interface BranchInfo {
  id: string;
  companyId: string;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  country?: string;
  timezone: string;
  isDefault: boolean;
  isActive: boolean;
  allowsOnlineOrders: boolean;
  allowsDelivery: boolean;
  allowsPickup: boolean;
}

interface TenantConfiguration {
  companyId: string;
  branchId: string;
  licenseKey: string;
  deviceId: string;
  deviceFingerprint: string;
  lastValidation?: Date;
  features: string[];
  maxPrinters: number;
  isActivated: boolean;
}

interface UserProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  companyId: string;
  branchId?: string;
  permissions: string[];
  isActive: boolean;
}

interface PrinterInfo {
  id: string;
  name: string;
  type: string;
  status: 'online' | 'offline' | 'error';
  connection: string;
  lastSeen?: Date;
}

interface MultiTenantDashboardProps {
  onAuthenticated?: (data: any) => void;
  onError?: (error: string) => void;
}

export const MultiTenantDashboard: React.FC<MultiTenantDashboardProps> = ({
  onAuthenticated,
  onError
}) => {
  // Authentication State
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [licenseKey, setLicenseKey] = useState('');
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  
  // Multi-tenant State
  const [currentCompany, setCurrentCompany] = useState<CompanyInfo | null>(null);
  const [currentBranch, setCurrentBranch] = useState<BranchInfo | null>(null);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [currentTenant, setCurrentTenant] = useState<TenantConfiguration | null>(null);
  
  // Selection State
  const [availableCompanies, setAvailableCompanies] = useState<CompanyInfo[]>([]);
  const [availableBranches, setAvailableBranches] = useState<BranchInfo[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState('');
  const [selectedBranchId, setSelectedBranchId] = useState('');
  
  // Printer State
  const [printers, setPrinters] = useState<PrinterInfo[]>([]);
  const [isLoadingPrinters, setIsLoadingPrinters] = useState(false);
  
  // UI State
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'authentication' | 'tenant-selection' | 'dashboard'>('authentication');

  // Initialize component
  useEffect(() => {
    checkExistingAuthentication();
    setupEventListeners();
    
    return () => {
      cleanupEventListeners();
    };
  }, []);

  const checkExistingAuthentication = async () => {
    try {
      const result = await window.electronAPI?.multiTenant?.getCurrentTenant();
      if (result && result.tenant) {
        setCurrentTenant(result.tenant);
        setCurrentCompany(result.company);
        setCurrentBranch(result.branch);
        setCurrentUser(result.user);
        setIsAuthenticated(true);
        setActiveTab('dashboard');
        loadPrinters();
      }
    } catch (error) {
      console.error('Error checking authentication:', error);
    }
  };

  const setupEventListeners = () => {
    window.electronAPI.multiTenant.onTenantAuthenticated((data: any) => {
      setCurrentTenant(data.tenant);
      setCurrentCompany(data.company);
      setCurrentBranch(data.branch);
      setCurrentUser(data.user);
      setIsAuthenticated(true);
      setActiveTab('dashboard');
      setSuccess(`Successfully authenticated for ${data.company.name}`);
      loadPrinters();
      onAuthenticated?.(data);
    });

    window.electronAPI.multiTenant.onTenantSwitched((data: any) => {
      setCurrentTenant(data.tenant);
      setCurrentCompany(data.company);
      setCurrentBranch(data.branch);
      setSuccess(`Switched to ${data.company.name} - ${data.branch.name}`);
      loadPrinters();
    });

    window.electronAPI.multiTenant.onCompaniesLoaded((companies: CompanyInfo[]) => {
      setAvailableCompanies(companies);
    });

    window.electronAPI.multiTenant.onBranchesLoaded((branches: BranchInfo[]) => {
      setAvailableBranches(branches);
    });
  };

  const cleanupEventListeners = () => {
    // Remove event listeners if needed
  };

  // Authentication Methods
  const handleAuthenticate = async () => {
    if (!licenseKey.trim()) {
      setError('Please enter a license key');
      return;
    }

    setIsAuthenticating(true);
    setError('');

    try {
      const result = await window.electronAPI.multiTenant.authenticate(licenseKey);
      if (result.success) {
        // Authentication successful - handled by event listener
      } else {
        setError(result.error || 'Authentication failed');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Authentication failed';
      setError(errorMessage);
      onError?.(errorMessage);
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleLogout = async () => {
    setIsLoading(true);
    try {
      await window.electronAPI.multiTenant.logout();
      
      // Reset all state
      setIsAuthenticated(false);
      setCurrentTenant(null);
      setCurrentCompany(null);
      setCurrentBranch(null);
      setCurrentUser(null);
      setAvailableCompanies([]);
      setAvailableBranches([]);
      setPrinters([]);
      setLicenseKey('');
      setActiveTab('authentication');
      setSuccess('Logged out successfully');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setError('Logout failed: ' + errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Tenant Selection Methods
  const handleShowTenantSelection = async () => {
    setIsLoading(true);
    try {
      await window.electronAPI.multiTenant.fetchCompanies();
      setActiveTab('tenant-selection');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setError('Failed to load companies: ' + errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCompanySelect = async (companyId: string) => {
    setSelectedCompanyId(companyId);
    setSelectedBranchId('');
    setIsLoading(true);
    
    try {
      await window.electronAPI.multiTenant.fetchBranches(companyId);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setError('Failed to load branches: ' + errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTenantSwitch = async () => {
    if (!selectedCompanyId || !selectedBranchId) {
      setError('Please select both company and branch');
      return;
    }

    setIsLoading(true);
    try {
      const success = await window.electronAPI.multiTenant.switchTenant(
        selectedCompanyId, 
        selectedBranchId
      );
      
      if (success) {
        setActiveTab('dashboard');
      } else {
        setError('Failed to switch tenant');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setError('Tenant switch failed: ' + errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Printer Management
  const loadPrinters = async () => {
    setIsLoadingPrinters(true);
    try {
      const printerList = await window.electronAPI.printer.getDiscoveredPrinters();
      setPrinters(printerList || []);
    } catch (error) {
      console.error('Error loading printers:', error);
    } finally {
      setIsLoadingPrinters(false);
    }
  };

  const handleRefreshPrinters = () => {
    loadPrinters();
  };

  const handleDiscoverPrinters = async () => {
    setIsLoadingPrinters(true);
    try {
      await window.electronAPI.printer.startDiscovery();
      setTimeout(() => {
        loadPrinters();
      }, 3000); // Give time for discovery
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setError('Printer discovery failed: ' + errorMessage);
    } finally {
      setIsLoadingPrinters(false);
    }
  };

  // Clear messages after delay
  useEffect(() => {
    if (error || success) {
      const timer = setTimeout(() => {
        setError('');
        setSuccess('');
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error, success]);

  // Render Methods
  const renderAuthenticationTab = () => (
    <div className="max-w-md mx-auto">
      <div className="bg-white shadow-lg rounded-lg p-6">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">PrinterMaster Pro</h2>
          <p className="text-gray-600 mt-2">Enterprise Printer Management</p>
        </div>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              License Key
            </label>
            <Input
              type="text"
              value={licenseKey}
              onChange={(e) => setLicenseKey(e.target.value)}
              placeholder="Enter your license key"
              className="mt-1"
              onKeyPress={(e) => e.key === 'Enter' && handleAuthenticate()}
            />
          </div>
          
          <Button
            onClick={handleAuthenticate}
            disabled={isAuthenticating || !licenseKey.trim()}
            className="w-full"
          >
            {isAuthenticating ? (
              <>
                <LoadingSpinner className="mr-2 h-4 w-4" />
                Authenticating...
              </>
            ) : (
              'Authenticate'
            )}
          </Button>
        </div>
      </div>
    </div>
  );

  const renderTenantSelectionTab = () => (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white shadow-lg rounded-lg p-6">
        <h2 className="text-xl font-bold mb-4">Select Company & Branch</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Company
            </label>
            <select
              value={selectedCompanyId}
              onChange={(e) => handleCompanySelect(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md"
            >
              <option value="">Select Company</option>
              {availableCompanies.map((company) => (
                <option key={company.id} value={company.id}>
                  {company.name} ({company.status})
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Branch
            </label>
            <select
              value={selectedBranchId}
              onChange={(e) => setSelectedBranchId(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md"
              disabled={!selectedCompanyId}
            >
              <option value="">Select Branch</option>
              {availableBranches.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.name} - {branch.city}
                </option>
              ))}
            </select>
          </div>
        </div>
        
        <div className="mt-6 flex space-x-4">
          <Button
            onClick={handleTenantSwitch}
            disabled={!selectedCompanyId || !selectedBranchId || isLoading}
            className="flex-1"
          >
            {isLoading ? 'Switching...' : 'Switch Tenant'}
          </Button>
          <Button
            onClick={() => setActiveTab('dashboard')}
            variant="outline"
            className="flex-1"
          >
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );

  const renderDashboardTab = () => (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {currentCompany?.name}
            </h1>
            <p className="text-gray-600">
              {currentBranch?.name} - {currentBranch?.city}
            </p>
            <p className="text-sm text-gray-500">
              Licensed to: {currentUser?.firstName} {currentUser?.lastName}
            </p>
          </div>
          <div className="flex space-x-2">
            <Button
              onClick={handleShowTenantSelection}
              variant="outline"
              size="sm"
            >
              Switch Tenant
            </Button>
            <Button
              onClick={handleLogout}
              variant="outline"
              size="sm"
              className="text-red-600 border-red-300 hover:bg-red-50"
            >
              Logout
            </Button>
          </div>
        </div>
      </div>

      {/* Printers Section */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Discovered Printers</h2>
          <div className="flex space-x-2">
            <Button
              onClick={handleRefreshPrinters}
              variant="outline"
              size="sm"
              disabled={isLoadingPrinters}
            >
              {isLoadingPrinters ? 'Loading...' : 'Refresh'}
            </Button>
            <Button
              onClick={handleDiscoverPrinters}
              size="sm"
              disabled={isLoadingPrinters}
            >
              {isLoadingPrinters ? 'Discovering...' : 'Discover'}
            </Button>
          </div>
        </div>
        
        {printers.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {printers.map((printer) => (
              <div key={printer.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-medium">{printer.name}</h3>
                  <span
                    className={`px-2 py-1 rounded-full text-xs ${
                      printer.status === 'online'
                        ? 'bg-green-100 text-green-800'
                        : printer.status === 'offline'
                        ? 'bg-gray-100 text-gray-800'
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {printer.status}
                  </span>
                </div>
                <p className="text-sm text-gray-600">Type: {printer.type}</p>
                <p className="text-sm text-gray-600">Connection: {printer.connection}</p>
                {printer.lastSeen && (
                  <p className="text-xs text-gray-500 mt-2">
                    Last seen: {new Date(printer.lastSeen).toLocaleString()}
                  </p>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-gray-500">No printers discovered yet</p>
            <Button
              onClick={handleDiscoverPrinters}
              className="mt-4"
              disabled={isLoadingPrinters}
            >
              Start Discovery
            </Button>
          </div>
        )}
      </div>

      {/* Tenant Info */}
      {currentTenant && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-medium text-blue-900 mb-2">License Information</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-blue-700">Max Printers:</span> {currentTenant.maxPrinters}
            </div>
            <div>
              <span className="text-blue-700">Features:</span> {currentTenant.features.join(', ')}
            </div>
            <div>
              <span className="text-blue-700">Device ID:</span> {currentTenant.deviceId.substring(0, 16)}...
            </div>
            <div>
              <span className="text-blue-700">Last Validation:</span>{' '}
              {currentTenant.lastValidation 
                ? new Date(currentTenant.lastValidation).toLocaleString()
                : 'Never'
              }
            </div>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      {/* Messages */}
      {error && (
        <div className="mb-4">
          <Alert variant="destructive">
            {error}
          </Alert>
        </div>
      )}
      
      {success && (
        <div className="mb-4">
          <Alert>
            {success}
          </Alert>
        </div>
      )}

      {/* Content */}
      {activeTab === 'authentication' && renderAuthenticationTab()}
      {activeTab === 'tenant-selection' && renderTenantSelectionTab()}
      {activeTab === 'dashboard' && renderDashboardTab()}
    </div>
  );
};

export default MultiTenantDashboard;