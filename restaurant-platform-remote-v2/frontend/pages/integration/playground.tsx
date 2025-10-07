import React, { useState } from 'react'
import { IntegrationLayout } from '@/components/integration/layout/IntegrationLayout'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/integration/ui/Card'
import { Button } from '@/components/integration/ui/Button'
import { Badge } from '@/components/integration/ui/Badge'
import { Input, Select, Textarea } from '@/components/integration/ui/Input'
import { CodeBlock } from '@/components/integration/ui/CodeBlock'
import { Tabs } from '@/components/integration/ui/Tabs'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'

interface SavedRequest {
  id: string
  name: string
  method: string
  endpoint: string
  body?: string
  headers: Record<string, string>
}

const COMMON_ENDPOINTS = [
  { value: '/api/v1/orders', label: 'GET /orders - List orders' },
  { value: '/api/v1/orders/:id', label: 'GET /orders/:id - Get order' },
  { value: '/api/v1/orders', label: 'POST /orders - Create order' },
  { value: '/api/v1/products', label: 'GET /products - List products' },
  { value: '/api/v1/products/:id', label: 'GET /products/:id - Get product' },
  { value: '/api/v1/customers', label: 'GET /customers - List customers' }
]

export default function PlaygroundPage() {
  const [method, setMethod] = useState('GET')
  const [endpoint, setEndpoint] = useState('/api/v1/orders')
  const [headers, setHeaders] = useState<Array<{ key: string; value: string }>>([
    { key: 'Authorization', value: 'Bearer YOUR_API_KEY' },
    { key: 'Content-Type', value: 'application/json' }
  ])
  const [body, setBody] = useState('')
  const [response, setResponse] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [responseTime, setResponseTime] = useState<number | null>(null)
  const [savedRequests, setSavedRequests] = useState<SavedRequest[]>([
    {
      id: '1',
      name: 'List All Orders',
      method: 'GET',
      endpoint: '/api/v1/orders',
      headers: { 'Authorization': 'Bearer pk_live_xxx' }
    }
  ])
  const [showSaveModal, setShowSaveModal] = useState(false)

  const handleSendRequest = async () => {
    setLoading(true)
    setResponse(null)
    setResponseTime(null)

    try {
      const startTime = Date.now()

      // Build headers object
      const headerObj = headers.reduce((acc, { key, value }) => {
        if (key && value) acc[key] = value
        return acc
      }, {} as Record<string, string>)

      // Mock API response - replace with actual API call
      await new Promise(resolve => setTimeout(resolve, Math.random() * 1000 + 200))

      const endTime = Date.now()
      setResponseTime(endTime - startTime)

      // Mock response data
      const mockResponse = {
        status: 200,
        statusText: 'OK',
        headers: {
          'content-type': 'application/json',
          'x-ratelimit-limit': '1000',
          'x-ratelimit-remaining': '999'
        },
        data: method === 'GET' ? {
          data: [
            { id: '1', name: 'Order #1', total: 45.99, status: 'completed' },
            { id: '2', name: 'Order #2', total: 32.50, status: 'pending' }
          ],
          pagination: { page: 1, limit: 20, total: 100 }
        } : {
          id: '123',
          success: true,
          message: 'Operation completed successfully'
        }
      }

      setResponse(mockResponse)
      toast.success('Request completed successfully')
    } catch (error: any) {
      setResponse({
        status: 500,
        statusText: 'Internal Server Error',
        data: { error: error.message }
      })
      toast.error('Request failed')
    } finally {
      setLoading(false)
    }
  }

  const handleAddHeader = () => {
    setHeaders([...headers, { key: '', value: '' }])
  }

  const handleRemoveHeader = (index: number) => {
    setHeaders(headers.filter((_, i) => i !== index))
  }

  const handleUpdateHeader = (index: number, field: 'key' | 'value', value: string) => {
    const newHeaders = [...headers]
    newHeaders[index][field] = value
    setHeaders(newHeaders)
  }

  const handleLoadRequest = (request: SavedRequest) => {
    setMethod(request.method)
    setEndpoint(request.endpoint)
    setHeaders(Object.entries(request.headers).map(([key, value]) => ({ key, value })))
    setBody(request.body || '')
    toast.success('Request loaded')
  }

  const handleSaveRequest = (name: string) => {
    const headerObj = headers.reduce((acc, { key, value }) => {
      if (key && value) acc[key] = value
      return acc
    }, {} as Record<string, string>)

    const newRequest: SavedRequest = {
      id: Date.now().toString(),
      name,
      method,
      endpoint,
      body: body || undefined,
      headers: headerObj
    }

    setSavedRequests([...savedRequests, newRequest])
    setShowSaveModal(false)
    toast.success('Request saved')
  }

  const generateCurlCommand = () => {
    let curl = `curl -X ${method} \\\n  "${process.env.NEXT_PUBLIC_API_URL || 'https://api.restaurant-platform.com'}${endpoint}"`

    headers.forEach(({ key, value }) => {
      if (key && value) {
        curl += ` \\\n  -H "${key}: ${value}"`
      }
    })

    if (body && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
      curl += ` \\\n  -d '${body}'`
    }

    return curl
  }

  return (
    <IntegrationLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-100">API Playground</h1>
            <p className="text-sm text-gray-400 mt-1">
              Test API endpoints interactively
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Saved Requests Sidebar */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle>Saved Requests</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {savedRequests.map((request) => (
                    <button
                      key={request.id}
                      onClick={() => handleLoadRequest(request)}
                      className="w-full text-left p-3 bg-gray-950 border border-gray-800 rounded-lg hover:border-indigo-500 transition-colors"
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <Badge
                          variant={
                            request.method === 'GET' ? 'info' :
                            request.method === 'POST' ? 'success' :
                            request.method === 'DELETE' ? 'error' : 'warning'
                          }
                          size="sm"
                        >
                          {request.method}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-300">{request.name}</p>
                      <code className="text-xs text-gray-500 font-mono">{request.endpoint}</code>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Request Builder */}
          <div className="lg:col-span-3 space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Request Builder</CardTitle>
                  <Button variant="secondary" size="sm" onClick={() => setShowSaveModal(true)}>
                    Save Request
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Method and Endpoint */}
                  <div className="flex gap-3">
                    <Select
                      value={method}
                      onChange={(e) => setMethod(e.target.value)}
                      options={[
                        { value: 'GET', label: 'GET' },
                        { value: 'POST', label: 'POST' },
                        { value: 'PUT', label: 'PUT' },
                        { value: 'PATCH', label: 'PATCH' },
                        { value: 'DELETE', label: 'DELETE' }
                      ]}
                      className="w-32"
                    />
                    <Input
                      value={endpoint}
                      onChange={(e) => setEndpoint(e.target.value)}
                      placeholder="/api/v1/endpoint"
                      className="flex-1"
                    />
                    <Button
                      onClick={handleSendRequest}
                      loading={loading}
                      className="w-32"
                    >
                      Send
                    </Button>
                  </div>

                  {/* Quick Select */}
                  <div>
                    <label className="text-xs text-gray-500 uppercase tracking-wider mb-2 block">
                      Quick Select
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {COMMON_ENDPOINTS.map((ep) => (
                        <button
                          key={ep.value}
                          onClick={() => {
                            const [method, path] = ep.label.split(' ')
                            setMethod(method)
                            setEndpoint(ep.value)
                          }}
                          className="px-3 py-1 text-xs bg-gray-950 border border-gray-800 rounded hover:border-indigo-500 text-gray-300 transition-colors"
                        >
                          {ep.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <Tabs
                    tabs={[
                      {
                        id: 'headers',
                        label: 'Headers',
                        content: (
                          <div className="space-y-3">
                            {headers.map((header, index) => (
                              <div key={index} className="flex gap-2">
                                <Input
                                  placeholder="Header name"
                                  value={header.key}
                                  onChange={(e) => handleUpdateHeader(index, 'key', e.target.value)}
                                  className="flex-1"
                                />
                                <Input
                                  placeholder="Header value"
                                  value={header.value}
                                  onChange={(e) => handleUpdateHeader(index, 'value', e.target.value)}
                                  className="flex-1"
                                />
                                <Button
                                  variant="danger"
                                  size="sm"
                                  onClick={() => handleRemoveHeader(index)}
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                  </svg>
                                </Button>
                              </div>
                            ))}
                            <Button variant="secondary" size="sm" onClick={handleAddHeader}>
                              Add Header
                            </Button>
                          </div>
                        )
                      },
                      {
                        id: 'body',
                        label: 'Body',
                        content: (
                          <Textarea
                            value={body}
                            onChange={(e) => setBody(e.target.value)}
                            placeholder='{"key": "value"}'
                            rows={10}
                            className="font-mono text-sm"
                          />
                        )
                      },
                      {
                        id: 'curl',
                        label: 'cURL',
                        content: (
                          <CodeBlock
                            code={generateCurlCommand()}
                            language="bash"
                          />
                        )
                      }
                    ]}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Response */}
            {response && (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <CardTitle>Response</CardTitle>
                      <Badge
                        variant={response.status >= 500 ? 'error' : response.status >= 400 ? 'warning' : 'success'}
                      >
                        {response.status} {response.statusText}
                      </Badge>
                      {responseTime && (
                        <span className="text-sm text-gray-500">{responseTime}ms</span>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <Tabs
                    tabs={[
                      {
                        id: 'body',
                        label: 'Body',
                        content: (
                          <CodeBlock
                            code={JSON.stringify(response.data, null, 2)}
                            language="json"
                            showLineNumbers
                          />
                        )
                      },
                      {
                        id: 'headers',
                        label: 'Headers',
                        content: (
                          <div className="space-y-2">
                            {Object.entries(response.headers || {}).map(([key, value]) => (
                              <div key={key} className="flex items-center gap-4 p-2 bg-gray-950 rounded">
                                <code className="text-sm text-indigo-400 font-mono flex-1">{key}</code>
                                <code className="text-sm text-gray-400 font-mono">{value as string}</code>
                              </div>
                            ))}
                          </div>
                        )
                      }
                    ]}
                  />
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Save Request Modal */}
        {showSaveModal && (
          <SaveRequestModal
            onSave={handleSaveRequest}
            onClose={() => setShowSaveModal(false)}
          />
        )}
      </div>
    </IntegrationLayout>
  )
}

// Save Request Modal
interface SaveRequestModalProps {
  onSave: (name: string) => void
  onClose: () => void
}

function SaveRequestModal({ onSave, onClose }: SaveRequestModalProps) {
  const { register, handleSubmit, formState: { errors } } = useForm()

  const onSubmit = (data: any) => {
    onSave(data.name)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-gray-900 border border-gray-800 rounded-lg shadow-xl w-full max-w-md mx-4 p-6">
        <h2 className="text-xl font-semibold text-gray-100 mb-4">Save Request</h2>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input
            label="Request Name"
            placeholder="e.g., List All Orders"
            error={errors.name?.message as string}
            {...register('name', { required: 'Name is required' })}
          />
          <div className="flex justify-end gap-3">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">
              Save
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
