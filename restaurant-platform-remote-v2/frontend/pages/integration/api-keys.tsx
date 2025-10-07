import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { IntegrationLayout } from '@/components/integration/layout/IntegrationLayout'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/integration/ui/Card'
import { Button } from '@/components/integration/ui/Button'
import { Badge } from '@/components/integration/ui/Badge'
import { Modal } from '@/components/integration/ui/Modal'
import { Input, Select } from '@/components/integration/ui/Input'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { format } from 'date-fns'

interface ApiKey {
  id: string
  name: string
  key: string
  scopes: string[]
  createdAt: string
  lastUsed?: string
  requestCount: number
  isActive: boolean
}

const SCOPE_OPTIONS = [
  { value: 'read:orders', label: 'Read Orders' },
  { value: 'write:orders', label: 'Write Orders' },
  { value: 'read:products', label: 'Read Products' },
  { value: 'write:products', label: 'Write Products' },
  { value: 'read:customers', label: 'Read Customers' },
  { value: 'write:customers', label: 'Write Customers' },
  { value: 'webhooks', label: 'Manage Webhooks' },
]

export default function ApiKeysPage() {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [selectedKey, setSelectedKey] = useState<ApiKey | null>(null)
  const [showKey, setShowKey] = useState<string | null>(null)
  const queryClient = useQueryClient()

  // Fetch API keys
  const { data: apiKeys, isLoading } = useQuery({
    queryKey: ['api-keys'],
    queryFn: async () => {
      // Mock data - replace with actual API call
      return [
        {
          id: '1',
          name: 'Production API',
          key: 'pk_live_1234567890abcdef',
          scopes: ['read:orders', 'write:orders', 'read:products'],
          createdAt: '2024-01-15T10:00:00Z',
          lastUsed: '2024-09-30T14:23:00Z',
          requestCount: 45678,
          isActive: true
        },
        {
          id: '2',
          name: 'Development API',
          key: 'pk_test_abcdef1234567890',
          scopes: ['read:orders', 'read:products', 'read:customers'],
          createdAt: '2024-02-20T15:30:00Z',
          lastUsed: '2024-09-29T09:15:00Z',
          requestCount: 1234,
          isActive: true
        }
      ] as ApiKey[]
    }
  })

  // Create API key mutation
  const createKeyMutation = useMutation({
    mutationFn: async (data: { name: string; scopes: string[] }) => {
      // Replace with actual API call
      return {
        id: Date.now().toString(),
        ...data,
        key: `pk_${Math.random().toString(36).substr(2, 24)}`,
        createdAt: new Date().toISOString(),
        requestCount: 0,
        isActive: true
      }
    },
    onSuccess: (newKey) => {
      queryClient.invalidateQueries({ queryKey: ['api-keys'] })
      setShowKey(newKey.key)
      toast.success('API key created successfully')
    },
    onError: () => {
      toast.error('Failed to create API key')
    }
  })

  // Delete API key mutation
  const deleteKeyMutation = useMutation({
    mutationFn: async (id: string) => {
      // Replace with actual API call
      await new Promise(resolve => setTimeout(resolve, 500))
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['api-keys'] })
      toast.success('API key deleted')
    },
    onError: () => {
      toast.error('Failed to delete API key')
    }
  })

  const handleCopyKey = (key: string) => {
    navigator.clipboard.writeText(key)
    toast.success('API key copied to clipboard')
  }

  const handleDeleteKey = (key: ApiKey) => {
    if (confirm(`Are you sure you want to delete "${key.name}"?`)) {
      deleteKeyMutation.mutate(key.id)
    }
  }

  return (
    <IntegrationLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-100">API Keys</h1>
            <p className="text-sm text-gray-400 mt-1">
              Manage your API keys and access permissions
            </p>
          </div>
          <Button onClick={() => setIsCreateModalOpen(true)}>
            Create API Key
          </Button>
        </div>

        {/* API Keys List */}
        <Card>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-12 text-gray-400">Loading...</div>
            ) : apiKeys && apiKeys.length > 0 ? (
              <div className="space-y-4">
                {apiKeys.map((key) => (
                  <div
                    key={key.id}
                    className="flex items-start justify-between p-4 bg-gray-950 border border-gray-800 rounded-lg hover:border-gray-700 transition-colors"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-100">{key.name}</h3>
                        <Badge variant={key.isActive ? 'success' : 'default'}>
                          {key.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>

                      <div className="flex items-center gap-2 mb-3">
                        <code className="text-sm text-gray-400 font-mono bg-gray-900 px-3 py-1 rounded">
                          {key.key.slice(0, 20)}••••••••
                        </code>
                        <button
                          onClick={() => handleCopyKey(key.key)}
                          className="text-gray-400 hover:text-gray-200 transition-colors"
                          title="Copy full key"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                        </button>
                      </div>

                      <div className="flex flex-wrap gap-2 mb-3">
                        {key.scopes.map((scope) => (
                          <Badge key={scope} size="sm">
                            {scope}
                          </Badge>
                        ))}
                      </div>

                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span>Created {format(new Date(key.createdAt), 'MMM d, yyyy')}</span>
                        {key.lastUsed && (
                          <span>Last used {format(new Date(key.lastUsed), 'MMM d, yyyy HH:mm')}</span>
                        )}
                        <span>{key.requestCount.toLocaleString()} requests</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 ml-4">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => setSelectedKey(key)}
                      >
                        View Stats
                      </Button>
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => handleDeleteKey(key)}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <svg className="mx-auto h-12 w-12 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-gray-300">No API keys</h3>
                <p className="mt-1 text-sm text-gray-500">Get started by creating a new API key.</p>
                <div className="mt-6">
                  <Button onClick={() => setIsCreateModalOpen(true)}>
                    Create API Key
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Create Modal */}
        <CreateKeyModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          onSubmit={(data) => {
            createKeyMutation.mutate(data)
            setIsCreateModalOpen(false)
          }}
        />

        {/* Show Key Modal */}
        {showKey && (
          <Modal
            isOpen={!!showKey}
            onClose={() => setShowKey(null)}
            title="API Key Created"
            size="md"
          >
            <div className="space-y-4">
              <div className="p-4 bg-yellow-900/20 border border-yellow-800 rounded-lg">
                <p className="text-sm text-yellow-400">
                  ⚠️ Save this key securely. You won't be able to see it again!
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Your API Key
                </label>
                <div className="flex gap-2">
                  <code className="flex-1 text-sm text-gray-200 font-mono bg-gray-950 px-4 py-3 rounded border border-gray-800">
                    {showKey}
                  </code>
                  <Button onClick={() => handleCopyKey(showKey)}>
                    Copy
                  </Button>
                </div>
              </div>
            </div>
          </Modal>
        )}

        {/* Stats Modal */}
        {selectedKey && (
          <KeyStatsModal
            apiKey={selectedKey}
            isOpen={!!selectedKey}
            onClose={() => setSelectedKey(null)}
          />
        )}
      </div>
    </IntegrationLayout>
  )
}

// Create Key Modal Component
interface CreateKeyModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: { name: string; scopes: string[] }) => void
}

function CreateKeyModal({ isOpen, onClose, onSubmit }: CreateKeyModalProps) {
  const { register, handleSubmit, formState: { errors }, reset } = useForm()
  const [selectedScopes, setSelectedScopes] = useState<string[]>([])

  const handleFormSubmit = (data: any) => {
    onSubmit({ name: data.name, scopes: selectedScopes })
    reset()
    setSelectedScopes([])
  }

  const toggleScope = (scope: string) => {
    setSelectedScopes(prev =>
      prev.includes(scope) ? prev.filter(s => s !== scope) : [...prev, scope]
    )
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create API Key" size="md">
      <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
        <Input
          label="Key Name"
          placeholder="e.g., Production API"
          error={errors.name?.message as string}
          {...register('name', { required: 'Key name is required' })}
        />

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-3">
            Scopes & Permissions
          </label>
          <div className="space-y-2">
            {SCOPE_OPTIONS.map((scope) => (
              <label
                key={scope.value}
                className="flex items-center p-3 bg-gray-950 border border-gray-800 rounded-lg hover:border-gray-700 cursor-pointer transition-colors"
              >
                <input
                  type="checkbox"
                  checked={selectedScopes.includes(scope.value)}
                  onChange={() => toggleScope(scope.value)}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-700 rounded bg-gray-900"
                />
                <span className="ml-3 text-sm text-gray-300">{scope.label}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={selectedScopes.length === 0}>
            Create Key
          </Button>
        </div>
      </form>
    </Modal>
  )
}

// Key Stats Modal Component
interface KeyStatsModalProps {
  apiKey: ApiKey
  isOpen: boolean
  onClose: () => void
}

function KeyStatsModal({ apiKey, isOpen, onClose }: KeyStatsModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Stats: ${apiKey.name}`} size="lg">
      <div className="space-y-6">
        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardContent>
              <div className="text-center">
                <p className="text-sm text-gray-400">Total Requests</p>
                <p className="text-2xl font-bold text-gray-100 mt-1">
                  {apiKey.requestCount.toLocaleString()}
                </p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent>
              <div className="text-center">
                <p className="text-sm text-gray-400">Success Rate</p>
                <p className="text-2xl font-bold text-green-400 mt-1">99.2%</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent>
              <div className="text-center">
                <p className="text-sm text-gray-400">Avg Response</p>
                <p className="text-2xl font-bold text-gray-100 mt-1">45ms</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div>
          <h4 className="text-sm font-medium text-gray-300 mb-3">Recent Activity</h4>
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center justify-between p-3 bg-gray-950 border border-gray-800 rounded">
                <div>
                  <p className="text-sm text-gray-300">GET /api/v1/orders</p>
                  <p className="text-xs text-gray-500">2 minutes ago</p>
                </div>
                <Badge variant="success">200</Badge>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Modal>
  )
}
