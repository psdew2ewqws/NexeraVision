import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { IntegrationLayout } from '@/components/integration/layout/IntegrationLayout'
import { ProviderCard } from '@/components/integration/ProviderCard'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/integration/ui/Card'
import { Button } from '@/components/integration/ui/Button'
import { Modal } from '@/components/integration/ui/Modal'
import { Input } from '@/components/integration/ui/Input'
import { deliveryProviders } from '@/lib/integration-api'
import type { DeliveryProvider, ProviderStats } from '@/types/integration'
import toast from 'react-hot-toast'
import { useRouter } from 'next/router'

export default function ProvidersPage() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [selectedProvider, setSelectedProvider] = useState<DeliveryProvider | null>(null)
  const [configModalOpen, setConfigModalOpen] = useState(false)

  const { data: providers, isLoading } = useQuery({
    queryKey: ['delivery-providers'],
    queryFn: () => deliveryProviders.getAll(),
    staleTime: 0, // Always fetch fresh data
    cacheTime: 0, // Don't cache results
    retry: 1 // Only retry once on failure
  })

  const { data: providerStats } = useQuery({
    queryKey: ['provider-stats'],
    queryFn: async () => {
      if (!providers) return {}
      const stats: Record<string, ProviderStats> = {}
      await Promise.all(
        providers.map(async (p) => {
          try {
            stats[p.id] = await deliveryProviders.getStats(p.id)
          } catch (error) {
            console.error(`Failed to fetch stats for ${p.name}:`, error)
          }
        })
      )
      return stats
    },
    enabled: !!providers
  })

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      deliveryProviders.toggle(id, isActive),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['delivery-providers'] })
      toast.success('Provider status updated')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to update provider')
    }
  })

  const testMutation = useMutation({
    mutationFn: (id: string) => deliveryProviders.test(id),
    onSuccess: (data) => {
      if (data.success) {
        toast.success(data.message || 'Provider test successful')
      } else {
        toast.error(data.message || 'Provider test failed')
      }
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to test provider')
    }
  })

  const handleConfigure = (provider: DeliveryProvider) => {
    setSelectedProvider(provider)
    setConfigModalOpen(true)
  }

  const handleTest = (provider: DeliveryProvider) => {
    toast.loading('Testing provider connection...')
    testMutation.mutate(provider.id)
  }

  const handleToggle = (provider: DeliveryProvider, isActive: boolean) => {
    toggleMutation.mutate({ id: provider.id, isActive })
  }

  const handleViewLogs = (provider: DeliveryProvider) => {
    router.push(`/integration/webhooks?provider=${provider.id}`)
  }

  if (isLoading) {
    return (
      <IntegrationLayout>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-100">Provider Management</h1>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-gray-900 border border-gray-800 rounded-lg p-6 animate-pulse">
                <div className="h-6 bg-gray-800 rounded w-3/4"></div>
                <div className="h-4 bg-gray-800 rounded w-1/2 mt-4"></div>
              </div>
            ))}
          </div>
        </div>
      </IntegrationLayout>
    )
  }

  return (
    <IntegrationLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-100">Provider Management</h1>
            <p className="text-sm text-gray-400 mt-1">
              Manage delivery provider integrations and configurations
            </p>
          </div>
        </div>

        {providers && providers.length === 0 && (
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
                    d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
                  />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-gray-200">No providers configured</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Delivery providers will appear here once configured in the backend.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {providers?.map((provider) => (
            <ProviderCard
              key={provider.id}
              provider={provider}
              stats={providerStats?.[provider.id]}
              onConfigure={handleConfigure}
              onTest={handleTest}
              onToggle={handleToggle}
              onViewLogs={handleViewLogs}
            />
          ))}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Integration Status</CardTitle>
            <CardDescription>Overview of provider integrations</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-gray-950 border border-gray-800 rounded-lg p-4">
                <p className="text-sm text-gray-400">Total Providers</p>
                <p className="text-2xl font-bold text-gray-100 mt-2">{providers?.length || 0}</p>
              </div>
              <div className="bg-gray-950 border border-gray-800 rounded-lg p-4">
                <p className="text-sm text-gray-400">Active Providers</p>
                <p className="text-2xl font-bold text-green-400 mt-2">
                  {providers?.filter(p => p.isActive).length || 0}
                </p>
              </div>
              <div className="bg-gray-950 border border-gray-800 rounded-lg p-4">
                <p className="text-sm text-gray-400">Total Orders</p>
                <p className="text-2xl font-bold text-gray-100 mt-2">
                  {Object.values(providerStats || {}).reduce((acc, s) => acc + s.totalOrders, 0).toLocaleString()}
                </p>
              </div>
              <div className="bg-gray-950 border border-gray-800 rounded-lg p-4">
                <p className="text-sm text-gray-400">Avg Success Rate</p>
                <p className="text-2xl font-bold text-gray-100 mt-2">
                  {Object.values(providerStats || {}).length > 0
                    ? (Object.values(providerStats || {}).reduce((acc, s) => acc + s.successRate, 0) /
                        Object.values(providerStats || {}).length
                      ).toFixed(1)
                    : '0.0'}
                  %
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {selectedProvider && (
        <Modal
          isOpen={configModalOpen}
          onClose={() => {
            setConfigModalOpen(false)
            setSelectedProvider(null)
          }}
          title={`Configure ${selectedProvider.name}`}
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Provider Name
              </label>
              <Input value={selectedProvider.name} disabled />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Provider Slug
              </label>
              <Input value={selectedProvider.slug} disabled />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Configuration
              </label>
              <div className="bg-gray-950 border border-gray-800 rounded p-3 text-xs text-gray-400 font-mono max-h-64 overflow-auto">
                {JSON.stringify(selectedProvider.config, null, 2)}
              </div>
            </div>
            <p className="text-sm text-gray-500">
              Provider configuration is managed through the backend API.
              Use the Branch Configuration page to configure provider settings per branch.
            </p>
            <div className="flex justify-end space-x-3">
              <Button
                variant="secondary"
                onClick={() => {
                  setConfigModalOpen(false)
                  setSelectedProvider(null)
                }}
              >
                Close
              </Button>
              <Button onClick={() => router.push('/integration/branch-config')}>
                Branch Configuration
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </IntegrationLayout>
  )
}
