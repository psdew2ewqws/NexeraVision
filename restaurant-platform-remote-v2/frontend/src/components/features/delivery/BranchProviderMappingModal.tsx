import React, { useState, useEffect } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { useMutation, useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { useAuth } from 'src/contexts/AuthContext';

interface BranchProviderMappingModalProps {
  isOpen: boolean;
  onClose: () => void;
  configs: any[];
  onSuccess: () => void;
}

interface Branch {
  id: string;
  name: string;
  nameAr: string;
  address: string;
  company: {
    id: string;
    name: string;
  };
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002/api/v1';

const PAYMENT_METHODS = [
  { value: 'cash', label: 'Cash on Delivery' },
  { value: 'card', label: 'Credit/Debit Card' },
  { value: 'online', label: 'Online Payment' },
  { value: 'wallet', label: 'Digital Wallet' },
  { value: 'pay_at_vendor', label: 'Pay at Vendor' },
  { value: 'knet', label: 'KNET (Kuwait)' }
];

export default function BranchProviderMappingModal({ 
  isOpen, 
  onClose, 
  configs, 
  onSuccess 
}: BranchProviderMappingModalProps) {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    branchId: '',
    companyProviderConfigId: '',
    providerBranchId: '',
    providerSiteId: '',
    branchConfiguration: {},
    isActive: true,
    priority: 1,
    minOrderValue: 0,
    maxOrderValue: 1000,
    supportedPaymentMethods: ['cash']
  });

  // Fetch branches
  const { data: branches = [] } = useQuery<Branch[]>({
    queryKey: ['branches-for-mapping', user?.companyId],
    queryFn: async () => {
      const token = localStorage.getItem('token');
      let url = `${API_BASE_URL}/branches`;
      if (user?.role !== 'super_admin' && user?.companyId) {
        url += `/my`;
      }
      const response = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      // Handle different response structures
      return response.data.branches || response.data || [];
    },
    enabled: isOpen
  });

  // Filter available configs based on selected branch
  const getAvailableConfigs = () => {
    if (!formData.branchId) return configs;
    
    const selectedBranch = branches.find(b => b.id === formData.branchId);
    if (!selectedBranch) return configs;
    
    // Show configs for the same company as the selected branch
    return configs.filter(config => config.company.id === selectedBranch.company.id);
  };

  // Create mapping mutation
  const mutation = useMutation({
    mutationFn: async (data: any) => {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${API_BASE_URL}/delivery/branch-provider-mappings`,
        data,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      return response.data;
    },
    onSuccess: () => {
      onSuccess();
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Clean up form data
    const submitData = {
      ...formData,
      minOrderValue: formData.minOrderValue || undefined,
      maxOrderValue: formData.maxOrderValue || undefined,
      providerSiteId: formData.providerSiteId || undefined,
      branchConfiguration: Object.keys(formData.branchConfiguration).length > 0 
        ? formData.branchConfiguration 
        : undefined
    };
    
    mutation.mutate(submitData);
  };

  const handlePaymentMethodsChange = (method: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      supportedPaymentMethods: checked
        ? [...prev.supportedPaymentMethods, method]
        : prev.supportedPaymentMethods.filter(m => m !== method)
    }));
  };

  const selectedConfig = configs.find(c => c.id === formData.companyProviderConfigId);
  const providerType = selectedConfig?.providerType;

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
                    Create Branch Provider Mapping
                  </Dialog.Title>
                  <button
                    onClick={onClose}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <XMarkIcon className="h-6 w-6" />
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Branch Selection */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Branch
                    </label>
                    <select
                      value={formData.branchId}
                      onChange={(e) => setFormData(prev => ({ ...prev, branchId: e.target.value, companyProviderConfigId: '' }))}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    >
                      <option value="">Select Branch</option>
                      {Array.isArray(branches) && branches.length > 0 ? branches.map((branch) => (
                        <option key={branch.id} value={branch.id}>
                          {branch.name} - {branch.company?.name || 'Unknown Company'}
                        </option>
                      )) : (
                        <option disabled>No branches available</option>
                      )}
                    </select>
                  </div>

                  {/* Provider Configuration */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Provider Configuration
                    </label>
                    <select
                      value={formData.companyProviderConfigId}
                      onChange={(e) => setFormData(prev => ({ ...prev, companyProviderConfigId: e.target.value }))}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                      disabled={!formData.branchId}
                    >
                      <option value="">Select Provider Configuration</option>
                      {getAvailableConfigs().map((config) => (
                        <option key={config.id} value={config.id}>
                          {config.providerType.toUpperCase()} - {config.company.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Provider Branch ID */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Provider Branch ID
                    </label>
                    <input
                      type="text"
                      value={formData.providerBranchId}
                      onChange={(e) => setFormData(prev => ({ ...prev, providerBranchId: e.target.value }))}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter provider-specific branch ID"
                      required
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      This is the branch ID provided by {providerType ? providerType.toUpperCase() : 'the provider'}
                    </p>
                  </div>

                  {/* Provider Site ID (Optional) */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Provider Site ID (Optional)
                    </label>
                    <input
                      type="text"
                      value={formData.providerSiteId}
                      onChange={(e) => setFormData(prev => ({ ...prev, providerSiteId: e.target.value }))}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter provider-specific site ID (if applicable)"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Some providers require a site ID in addition to branch ID
                    </p>
                  </div>

                  {/* Basic Settings */}
                  <div className="grid grid-cols-3 gap-4">
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
                        Min Order Value
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={formData.minOrderValue}
                        onChange={(e) => setFormData(prev => ({ ...prev, minOrderValue: parseFloat(e.target.value) }))}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Max Order Value
                      </label>
                      <input
                        type="number"
                        min="1"
                        step="0.01"
                        value={formData.maxOrderValue}
                        onChange={(e) => setFormData(prev => ({ ...prev, maxOrderValue: parseFloat(e.target.value) }))}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  {/* Supported Payment Methods */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      Supported Payment Methods
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      {PAYMENT_METHODS.map((method) => (
                        <label key={method.value} className="flex items-center">
                          <input
                            type="checkbox"
                            checked={formData.supportedPaymentMethods.includes(method.value)}
                            onChange={(e) => handlePaymentMethodsChange(method.value, e.target.checked)}
                            className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                          />
                          <span className="ml-2 text-sm text-gray-700">{method.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Branch Configuration */}
                  {providerType && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Branch-Specific Configuration
                      </label>
                      <div className="space-y-3 p-4 bg-gray-50 rounded-md">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">
                              Delivery Radius (km)
                            </label>
                            <input
                              type="number"
                              min="1"
                              step="0.1"
                              value={(formData.branchConfiguration as any)?.deliveryRadius || ''}
                              onChange={(e) => setFormData(prev => ({
                                ...prev,
                                branchConfiguration: {
                                  ...prev.branchConfiguration,
                                  deliveryRadius: parseFloat(e.target.value) || undefined
                                }
                              }))}
                              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                              placeholder="e.g., 10"
                            />
                          </div>
                          
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">
                              Preparation Time (minutes)
                            </label>
                            <input
                              type="number"
                              min="5"
                              value={(formData.branchConfiguration as any)?.preparationTimeMinutes || ''}
                              onChange={(e) => setFormData(prev => ({
                                ...prev,
                                branchConfiguration: {
                                  ...prev.branchConfiguration,
                                  preparationTimeMinutes: parseInt(e.target.value) || undefined
                                }
                              }))}
                              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                              placeholder="e.g., 25"
                            />
                          </div>
                        </div>
                        
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">
                            Special Instructions
                          </label>
                          <textarea
                            value={(formData.branchConfiguration as any)?.specialInstructions || ''}
                            onChange={(e) => setFormData(prev => ({
                              ...prev,
                              branchConfiguration: {
                                ...prev.branchConfiguration,
                                specialInstructions: e.target.value || undefined
                              }
                            }))}
                            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            rows={2}
                            placeholder="Any special instructions for this provider..."
                          />
                        </div>

                        <div>
                          <label className="flex items-center">
                            <input
                              type="checkbox"
                              checked={(formData.branchConfiguration as any)?.acceptsScheduledOrders || false}
                              onChange={(e) => setFormData(prev => ({
                                ...prev,
                                branchConfiguration: {
                                  ...prev.branchConfiguration,
                                  acceptsScheduledOrders: e.target.checked
                                }
                              }))}
                              className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                            />
                            <span className="ml-2 text-xs text-gray-700">Accepts Scheduled Orders</span>
                          </label>
                        </div>
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
                      <span className="ml-2 text-sm text-gray-700">Active Mapping</span>
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
                      className="px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50"
                    >
                      {mutation.isLoading ? 'Creating...' : 'Create Mapping'}
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