import React, { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { IntegrationLayout } from '@/components/integration/layout/IntegrationLayout'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/integration/ui/Card'
import { Button } from '@/components/integration/ui/Button'
import { Input } from '@/components/integration/ui/Input'
import { deliveryProviders, branchConfig } from '@/lib/integration-api'
import { StatusBadge } from '@/components/integration/StatusBadge'
import toast from 'react-hot-toast'
import { useAuth } from '@/contexts/AuthContext'
import type { DeliveryProvider, BranchDeliveryConfig } from '@/types/integration'

export default function BranchConfigPage() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [selectedBranch, setSelectedBranch] = useState<string>(user?.branchId || '')
  const [selectedProvider, setSelectedProvider] = useState<string>('')
  // Provider-specific configuration interfaces
  interface DeliverooConfig {
    siteId: string
    brandId: string
    menuId: string
    webhookSecret: string
    autoAccept: boolean
    autoPrint: boolean
  }

  interface JahezConfig {
    branchId: string
    excludeBranches: string[]
    autoAccept: boolean
    autoPrint: boolean
  }

  interface CareemConfig {
    branchId: string
    storeId: string
    menuId: string
    autoAccept: boolean
    autoPrint: boolean
  }

  interface TalabatConfig {
    restaurantId: string
    menuId: string
    autoAccept: boolean
    autoPrint: boolean
  }

  interface UberEatsConfig {
    storeUuid: string
    menuId: string
    autoAccept: boolean
    autoPrint: boolean
  }

  interface ZomatoConfig {
    restaurantId: string
    menuId: string
    autoAccept: boolean
    autoPrint: boolean
  }

  const [configData, setConfigData] = useState<any>({
    webhookSecret: '',
    autoPrint: false,
    autoAccept: false,
    locationId: '',
    menuId: '',
    // Deliveroo specific
    siteId: '',
    brandId: '',
    // Jahez specific
    branchId: '',
    excludeBranches: [],
    // Careem specific
    storeId: '',
    careemBranchId: '',
    // Talabat specific
    restaurantId: '',
    // Uber Eats specific
    storeUuid: ''
  })

  const { data: providers } = useQuery({
    queryKey: ['delivery-providers'],
    queryFn: () => deliveryProviders.getAll()
  })

  const { data: currentConfig, isLoading: configLoading } = useQuery({
    queryKey: ['branch-config', selectedBranch, selectedProvider],
    queryFn: () => branchConfig.get(selectedBranch, selectedProvider),
    enabled: !!selectedBranch && !!selectedProvider
  })

  // Load configuration data when it changes
  useEffect(() => {
    if (currentConfig?.config) {
      setConfigData({
        ...currentConfig.config  // Spread all fields including provider-specific ones
      })
    }
  }, [currentConfig])

  const saveMutation = useMutation({
    mutationFn: () => branchConfig.save(selectedBranch, selectedProvider, {
      isActive: currentConfig?.isActive ?? true,
      config: configData
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['branch-config'] })
      toast.success('Configuration saved successfully')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to save configuration')
    }
  })

  const deleteMutation = useMutation({
    mutationFn: () => branchConfig.delete(selectedBranch, selectedProvider),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['branch-config'] })
      setConfigData({
        webhookSecret: '',
        autoPrint: false,
        autoAccept: false,
        locationId: '',
        menuId: ''
      })
      toast.success('Configuration deleted')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to delete configuration')
    }
  })

  const handleSave = () => {
    if (!selectedBranch || !selectedProvider) {
      toast.error('Please select a branch and provider')
      return
    }
    saveMutation.mutate()
  }

  const handleDelete = () => {
    if (!confirm('Are you sure you want to delete this configuration?')) return
    deleteMutation.mutate()
  }

  return (
    <IntegrationLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-100">Branch Configuration</h1>
          <p className="text-sm text-gray-400 mt-1">
            Configure delivery provider settings for specific branches
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Select Branch and Provider</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Branch
                </label>
                <Input
                  value={selectedBranch}
                  onChange={(e) => setSelectedBranch(e.target.value)}
                  placeholder="Enter branch ID"
                />
                <p className="text-xs text-gray-500 mt-1">
                  {user?.branchId && 'Your current branch: ' + user.branchId}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Delivery Provider
                </label>
                <select
                  value={selectedProvider}
                  onChange={(e) => setSelectedProvider(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Select a provider</option>
                  {providers?.map((provider) => (
                    <option key={provider.id} value={provider.id}>
                      {provider.name} ({provider.slug})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {currentConfig && (
              <div className="mt-4 p-3 bg-gray-950 border border-gray-800 rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-400">Configuration Status:</span>
                    <StatusBadge status={currentConfig.isActive ? 'active' : 'inactive'} />
                  </div>
                  <span className="text-xs text-gray-500">
                    Last updated: {new Date(currentConfig.updatedAt).toLocaleString()}
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

{selectedBranch && selectedProvider && (
          <Card>
            <CardHeader>
              <CardTitle>Provider Configuration</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Deliveroo Configuration */}
                {providers?.find(p => p.id === selectedProvider)?.slug === 'deliveroo' && (
                  <>
                    <div className="border-b border-gray-800 pb-4">
                      <h3 className="text-sm font-semibold text-gray-300 mb-3">Provider IDs</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-2">
                            Site ID <span className="text-red-500">*</span>
                          </label>
                          <Input
                            value={configData.siteId}
                            onChange={(e) => setConfigData({ ...configData, siteId: e.target.value })}
                            placeholder="Deliveroo site UUID"
                          />
                          <p className="text-xs text-gray-500 mt-1">Deliveroo location/site identifier</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-2">
                            Brand ID <span className="text-red-500">*</span>
                          </label>
                          <Input
                            value={configData.brandId}
                            onChange={(e) => setConfigData({ ...configData, brandId: e.target.value })}
                            placeholder="Deliveroo brand UUID"
                          />
                          <p className="text-xs text-gray-500 mt-1">Deliveroo brand identifier</p>
                        </div>
                      </div>
                    </div>

                    <div className="border-b border-gray-800 pb-4">
                      <h3 className="text-sm font-semibold text-gray-300 mb-3">Menu & Security</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-2">
                            Menu ID
                          </label>
                          <Input
                            value={configData.menuId}
                            onChange={(e) => setConfigData({ ...configData, menuId: e.target.value })}
                            placeholder="Menu UUID (auto-generated after sync)"
                          />
                          <p className="text-xs text-gray-500 mt-1">Generated during menu synchronization</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-2">
                            Webhook Secret
                          </label>
                          <Input
                            type="password"
                            value={configData.webhookSecret}
                            onChange={(e) => setConfigData({ ...configData, webhookSecret: e.target.value })}
                            placeholder="HMAC-SHA256 signing secret"
                          />
                          <p className="text-xs text-gray-500 mt-1">For webhook signature validation</p>
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {/* Jahez Configuration */}
                {providers?.find(p => p.id === selectedProvider)?.slug === 'jahez' && (
                  <>
                    <div className="border-b border-gray-800 pb-4">
                      <h3 className="text-sm font-semibold text-gray-300 mb-3">Branch Configuration</h3>
                      <div className="grid grid-cols-1 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-2">
                            Branch ID <span className="text-red-500">*</span>
                          </label>
                          <Input
                            value={configData.branchId}
                            onChange={(e) => setConfigData({ ...configData, branchId: e.target.value })}
                            placeholder="Jahez branch UUID"
                          />
                          <p className="text-xs text-gray-500 mt-1">Jahez branch identifier</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-2">
                            Exclude Branches (Optional)
                          </label>
                          <Input
                            value={Array.isArray(configData.excludeBranches) ? configData.excludeBranches.join(',') : ''}
                            onChange={(e) => setConfigData({
                              ...configData,
                              excludeBranches: e.target.value.split(',').map(s => s.trim()).filter(s => s)
                            })}
                            placeholder="branch-id-1, branch-id-2"
                          />
                          <p className="text-xs text-gray-500 mt-1">Comma-separated branch IDs to exclude from sync</p>
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {/* Careem Configuration */}
                {providers?.find(p => p.id === selectedProvider)?.slug === 'careem' && (
                  <>
                    <div className="border-b border-gray-800 pb-4">
                      <h3 className="text-sm font-semibold text-gray-300 mb-3">Branch & Store Configuration</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-2">
                            Branch ID <span className="text-red-500">*</span>
                          </label>
                          <Input
                            value={configData.careemBranchId || configData.branchId}
                            onChange={(e) => setConfigData({ ...configData, careemBranchId: e.target.value, branchId: e.target.value })}
                            placeholder="Careem branch identifier"
                          />
                          <p className="text-xs text-gray-500 mt-1">Careem branch/location ID (providerBranchId)</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-2">
                            Store ID <span className="text-red-500">*</span>
                          </label>
                          <Input
                            value={configData.storeId}
                            onChange={(e) => setConfigData({ ...configData, storeId: e.target.value })}
                            placeholder="Careem store identifier"
                          />
                          <p className="text-xs text-gray-500 mt-1">Careem store ID (same as branch ID typically)</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-2">
                            Menu ID
                          </label>
                          <Input
                            value={configData.menuId}
                            onChange={(e) => setConfigData({ ...configData, menuId: e.target.value })}
                            placeholder="Careem menu identifier"
                          />
                          <p className="text-xs text-gray-500 mt-1">Menu synchronization ID</p>
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {/* Talabat Configuration */}
                {providers?.find(p => p.id === selectedProvider)?.slug === 'talabat' && (
                  <>
                    <div className="border-b border-gray-800 pb-4">
                      <h3 className="text-sm font-semibold text-gray-300 mb-3">Restaurant Configuration</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-2">
                            Restaurant ID <span className="text-red-500">*</span>
                          </label>
                          <Input
                            value={configData.restaurantId}
                            onChange={(e) => setConfigData({ ...configData, restaurantId: e.target.value })}
                            placeholder="Talabat restaurant identifier"
                          />
                          <p className="text-xs text-gray-500 mt-1">Talabat restaurant/location ID</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-2">
                            Menu ID
                          </label>
                          <Input
                            value={configData.menuId}
                            onChange={(e) => setConfigData({ ...configData, menuId: e.target.value })}
                            placeholder="Talabat menu identifier"
                          />
                          <p className="text-xs text-gray-500 mt-1">Menu synchronization ID</p>
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {/* Uber Eats Configuration */}
                {providers?.find(p => p.id === selectedProvider)?.slug === 'ubereats' && (
                  <>
                    <div className="border-b border-gray-800 pb-4">
                      <h3 className="text-sm font-semibold text-gray-300 mb-3">Store Configuration</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-2">
                            Store UUID <span className="text-red-500">*</span>
                          </label>
                          <Input
                            value={configData.storeUuid}
                            onChange={(e) => setConfigData({ ...configData, storeUuid: e.target.value })}
                            placeholder="Uber Eats store UUID"
                          />
                          <p className="text-xs text-gray-500 mt-1">Uber Eats store identifier</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-2">
                            Menu ID
                          </label>
                          <Input
                            value={configData.menuId}
                            onChange={(e) => setConfigData({ ...configData, menuId: e.target.value })}
                            placeholder="Menu identifier"
                          />
                          <p className="text-xs text-gray-500 mt-1">Menu synchronization ID</p>
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {/* Zomato Configuration */}
                {providers?.find(p => p.id === selectedProvider)?.slug === 'zomato' && (
                  <>
                    <div className="border-b border-gray-800 pb-4">
                      <h3 className="text-sm font-semibold text-gray-300 mb-3">Restaurant Configuration</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-2">
                            Restaurant ID <span className="text-red-500">*</span>
                          </label>
                          <Input
                            value={configData.restaurantId}
                            onChange={(e) => setConfigData({ ...configData, restaurantId: e.target.value })}
                            placeholder="Zomato restaurant identifier"
                          />
                          <p className="text-xs text-gray-500 mt-1">Zomato restaurant/location ID</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-2">
                            Menu ID
                          </label>
                          <Input
                            value={configData.menuId}
                            onChange={(e) => setConfigData({ ...configData, menuId: e.target.value })}
                            placeholder="Menu identifier"
                          />
                          <p className="text-xs text-gray-500 mt-1">Menu synchronization ID</p>
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {/* Common Automation Settings - All Providers */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-300 mb-3">Automation Settings</h3>
                  <div className="space-y-3">
                    <label className="flex items-center space-x-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={configData.autoPrint}
                        onChange={(e) => setConfigData({ ...configData, autoPrint: e.target.checked })}
                        className="w-4 h-4 text-indigo-600 bg-gray-800 border-gray-700 rounded focus:ring-indigo-500"
                      />
                      <div>
                        <span className="text-sm font-medium text-gray-300">Auto Print</span>
                        <p className="text-xs text-gray-500">Automatically print orders when received</p>
                      </div>
                    </label>

                    <label className="flex items-center space-x-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={configData.autoAccept}
                        onChange={(e) => setConfigData({ ...configData, autoAccept: e.target.checked })}
                        className="w-4 h-4 text-indigo-600 bg-gray-800 border-gray-700 rounded focus:ring-indigo-500"
                      />
                      <div>
                        <span className="text-sm font-medium text-gray-300">Auto Accept</span>
                        <p className="text-xs text-gray-500">Automatically accept incoming orders</p>
                      </div>
                    </label>
                  </div>
                </div>

                <div className="flex items-center space-x-3 pt-4 border-t border-gray-800">
                  <Button onClick={handleSave} disabled={saveMutation.isLoading}>
                    {saveMutation.isLoading ? 'Saving...' : 'Save Configuration'}
                  </Button>
                  {currentConfig && (
                    <Button
                      variant="danger"
                      onClick={handleDelete}
                      disabled={deleteMutation.isLoading}
                    >
                      {deleteMutation.isLoading ? 'Deleting...' : 'Delete Configuration'}
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {!selectedBranch || !selectedProvider && (
          <Card>
            <CardContent>
              <div className="text-center py-12">
                <svg
                  className="mx-auto h-12 w-12 text-gray-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-gray-200">Select Branch and Provider</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Choose a branch and delivery provider to configure settings.
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </IntegrationLayout>
  )
}
