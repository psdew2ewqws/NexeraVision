import React, { useState } from 'react'
import { IntegrationLayout } from '@/components/integration/layout/IntegrationLayout'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/integration/ui/Card'
import { CodeBlock } from '@/components/integration/ui/CodeBlock'
import { Tabs } from '@/components/integration/ui/Tabs'
import { Badge } from '@/components/integration/ui/Badge'
import { clsx } from 'clsx'

interface ApiEndpoint {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  path: string
  description: string
  auth: boolean
  params?: Array<{ name: string; type: string; required: boolean; description: string }>
  body?: Array<{ name: string; type: string; required: boolean; description: string }>
  response: string
}

const API_ENDPOINTS: Record<string, ApiEndpoint[]> = {
  'Orders': [
    {
      method: 'GET',
      path: '/api/v1/orders',
      description: 'List all orders',
      auth: true,
      params: [
        { name: 'page', type: 'number', required: false, description: 'Page number (default: 1)' },
        { name: 'limit', type: 'number', required: false, description: 'Items per page (default: 20)' },
        { name: 'status', type: 'string', required: false, description: 'Filter by status' }
      ],
      response: `{
  "data": [
    {
      "id": "ord_123",
      "customerId": "cust_456",
      "items": [...],
      "total": 45.99,
      "status": "completed",
      "createdAt": "2024-09-30T10:30:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100
  }
}`
    },
    {
      method: 'POST',
      path: '/api/v1/orders',
      description: 'Create a new order',
      auth: true,
      body: [
        { name: 'customerId', type: 'string', required: true, description: 'Customer ID' },
        { name: 'items', type: 'array', required: true, description: 'Order items' },
        { name: 'deliveryAddress', type: 'string', required: false, description: 'Delivery address' }
      ],
      response: `{
  "id": "ord_123",
  "customerId": "cust_456",
  "items": [...],
  "total": 45.99,
  "status": "pending",
  "createdAt": "2024-09-30T10:30:00Z"
}`
    },
    {
      method: 'GET',
      path: '/api/v1/orders/:id',
      description: 'Get order by ID',
      auth: true,
      params: [
        { name: 'id', type: 'string', required: true, description: 'Order ID' }
      ],
      response: `{
  "id": "ord_123",
  "customerId": "cust_456",
  "items": [...],
  "total": 45.99,
  "status": "completed",
  "createdAt": "2024-09-30T10:30:00Z"
}`
    }
  ],
  'Products': [
    {
      method: 'GET',
      path: '/api/v1/products',
      description: 'List all products',
      auth: true,
      params: [
        { name: 'page', type: 'number', required: false, description: 'Page number' },
        { name: 'category', type: 'string', required: false, description: 'Filter by category' }
      ],
      response: `{
  "data": [
    {
      "id": "prod_123",
      "name": "Burger",
      "price": 9.99,
      "category": "food",
      "available": true
    }
  ]
}`
    },
    {
      method: 'POST',
      path: '/api/v1/products',
      description: 'Create a new product',
      auth: true,
      body: [
        { name: 'name', type: 'string', required: true, description: 'Product name' },
        { name: 'price', type: 'number', required: true, description: 'Product price' },
        { name: 'category', type: 'string', required: true, description: 'Product category' }
      ],
      response: `{
  "id": "prod_123",
  "name": "Burger",
  "price": 9.99,
  "category": "food",
  "available": true
}`
    }
  ],
  'Customers': [
    {
      method: 'GET',
      path: '/api/v1/customers',
      description: 'List all customers',
      auth: true,
      params: [
        { name: 'page', type: 'number', required: false, description: 'Page number' },
        { name: 'search', type: 'string', required: false, description: 'Search by name or email' }
      ],
      response: `{
  "data": [
    {
      "id": "cust_123",
      "name": "John Doe",
      "email": "john@example.com",
      "phone": "+1234567890",
      "createdAt": "2024-01-15T10:00:00Z"
    }
  ]
}`
    }
  ]
}

export default function DocsPage() {
  const [selectedSection, setSelectedSection] = useState('Orders')
  const [selectedEndpoint, setSelectedEndpoint] = useState<ApiEndpoint | null>(
    API_ENDPOINTS['Orders'][0]
  )

  return (
    <IntegrationLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-100">API Documentation</h1>
          <p className="text-sm text-gray-400 mt-1">
            Complete reference for the Restaurant Platform API
          </p>
        </div>

        {/* Getting Started */}
        <Card>
          <CardHeader>
            <CardTitle>Getting Started</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-200 mb-3">Base URL</h3>
                <CodeBlock
                  code="https://api.restaurant-platform.com/api/v1"
                  language="text"
                />
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-200 mb-3">Authentication</h3>
                <p className="text-sm text-gray-400 mb-3">
                  All API requests require authentication using an API key in the Authorization header:
                </p>
                <CodeBlock
                  code={`curl -H "Authorization: Bearer YOUR_API_KEY" \\
     https://api.restaurant-platform.com/api/v1/orders`}
                  language="bash"
                />
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-200 mb-3">Rate Limiting</h3>
                <p className="text-sm text-gray-400 mb-3">
                  API requests are limited to 1000 requests per hour per API key. Rate limit information is included in response headers:
                </p>
                <CodeBlock
                  code={`X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1609459200`}
                  language="text"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* API Reference */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <Card padding={false}>
              <div className="p-4 border-b border-gray-800">
                <h3 className="text-sm font-semibold text-gray-300">API Reference</h3>
              </div>
              <nav className="p-2">
                {Object.keys(API_ENDPOINTS).map((section) => (
                  <button
                    key={section}
                    onClick={() => {
                      setSelectedSection(section)
                      setSelectedEndpoint(API_ENDPOINTS[section][0])
                    }}
                    className={clsx(
                      'w-full text-left px-3 py-2 rounded text-sm transition-colors',
                      selectedSection === section
                        ? 'bg-indigo-600/20 text-indigo-400'
                        : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'
                    )}
                  >
                    {section}
                  </button>
                ))}
              </nav>
            </Card>
          </div>

          {/* Endpoints List */}
          <div className="lg:col-span-1">
            <Card padding={false}>
              <div className="p-4 border-b border-gray-800">
                <h3 className="text-sm font-semibold text-gray-300">{selectedSection}</h3>
              </div>
              <div className="divide-y divide-gray-800">
                {API_ENDPOINTS[selectedSection]?.map((endpoint, i) => (
                  <button
                    key={i}
                    onClick={() => setSelectedEndpoint(endpoint)}
                    className={clsx(
                      'w-full text-left p-4 transition-colors',
                      selectedEndpoint === endpoint
                        ? 'bg-gray-950'
                        : 'hover:bg-gray-950'
                    )}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Badge
                        variant={
                          endpoint.method === 'GET' ? 'info' :
                          endpoint.method === 'POST' ? 'success' :
                          endpoint.method === 'DELETE' ? 'error' : 'warning'
                        }
                        size="sm"
                      >
                        {endpoint.method}
                      </Badge>
                    </div>
                    <code className="text-xs text-gray-400 font-mono break-all">
                      {endpoint.path}
                    </code>
                  </button>
                ))}
              </div>
            </Card>
          </div>

          {/* Endpoint Details */}
          <div className="lg:col-span-2">
            {selectedEndpoint && (
              <Card>
                <CardContent>
                  <div className="space-y-6">
                    {/* Endpoint Header */}
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <Badge
                          variant={
                            selectedEndpoint.method === 'GET' ? 'info' :
                            selectedEndpoint.method === 'POST' ? 'success' :
                            selectedEndpoint.method === 'DELETE' ? 'error' : 'warning'
                          }
                        >
                          {selectedEndpoint.method}
                        </Badge>
                        <code className="text-lg text-gray-200 font-mono">
                          {selectedEndpoint.path}
                        </code>
                      </div>
                      <p className="text-sm text-gray-400">{selectedEndpoint.description}</p>
                    </div>

                    {/* Parameters */}
                    {selectedEndpoint.params && selectedEndpoint.params.length > 0 && (
                      <div>
                        <h4 className="text-sm font-semibold text-gray-300 mb-3">Parameters</h4>
                        <div className="space-y-3">
                          {selectedEndpoint.params.map((param) => (
                            <div key={param.name} className="p-3 bg-gray-950 border border-gray-800 rounded">
                              <div className="flex items-center gap-2 mb-1">
                                <code className="text-sm text-indigo-400 font-mono">{param.name}</code>
                                <Badge size="sm">{param.type}</Badge>
                                {param.required && (
                                  <Badge variant="error" size="sm">required</Badge>
                                )}
                              </div>
                              <p className="text-xs text-gray-500">{param.description}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Request Body */}
                    {selectedEndpoint.body && selectedEndpoint.body.length > 0 && (
                      <div>
                        <h4 className="text-sm font-semibold text-gray-300 mb-3">Request Body</h4>
                        <div className="space-y-3">
                          {selectedEndpoint.body.map((field) => (
                            <div key={field.name} className="p-3 bg-gray-950 border border-gray-800 rounded">
                              <div className="flex items-center gap-2 mb-1">
                                <code className="text-sm text-indigo-400 font-mono">{field.name}</code>
                                <Badge size="sm">{field.type}</Badge>
                                {field.required && (
                                  <Badge variant="error" size="sm">required</Badge>
                                )}
                              </div>
                              <p className="text-xs text-gray-500">{field.description}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Response */}
                    <div>
                      <h4 className="text-sm font-semibold text-gray-300 mb-3">Response</h4>
                      <CodeBlock
                        code={selectedEndpoint.response}
                        language="json"
                        showLineNumbers
                      />
                    </div>

                    {/* Code Examples */}
                    <div>
                      <h4 className="text-sm font-semibold text-gray-300 mb-3">Code Examples</h4>
                      <Tabs
                        tabs={[
                          {
                            id: 'curl',
                            label: 'cURL',
                            content: (
                              <CodeBlock
                                language="bash"
                                code={generateCurlExample(selectedEndpoint)}
                              />
                            )
                          },
                          {
                            id: 'javascript',
                            label: 'JavaScript',
                            content: (
                              <CodeBlock
                                language="javascript"
                                code={generateJavaScriptExample(selectedEndpoint)}
                              />
                            )
                          },
                          {
                            id: 'python',
                            label: 'Python',
                            content: (
                              <CodeBlock
                                language="python"
                                code={generatePythonExample(selectedEndpoint)}
                              />
                            )
                          }
                        ]}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Error Codes */}
        <Card>
          <CardHeader>
            <CardTitle>Error Codes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-800">
                    <th className="text-left py-3 px-4 text-gray-400 font-medium">Code</th>
                    <th className="text-left py-3 px-4 text-gray-400 font-medium">Description</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {[
                    { code: '200', desc: 'Success - Request completed successfully' },
                    { code: '201', desc: 'Created - Resource created successfully' },
                    { code: '400', desc: 'Bad Request - Invalid request parameters' },
                    { code: '401', desc: 'Unauthorized - Invalid or missing API key' },
                    { code: '403', desc: 'Forbidden - Insufficient permissions' },
                    { code: '404', desc: 'Not Found - Resource not found' },
                    { code: '429', desc: 'Too Many Requests - Rate limit exceeded' },
                    { code: '500', desc: 'Internal Server Error - Server error occurred' }
                  ].map((error) => (
                    <tr key={error.code}>
                      <td className="py-3 px-4">
                        <code className="text-indigo-400 font-mono">{error.code}</code>
                      </td>
                      <td className="py-3 px-4 text-gray-300">{error.desc}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </IntegrationLayout>
  )
}

// Helper functions to generate code examples
function generateCurlExample(endpoint: ApiEndpoint): string {
  let curl = `curl -X ${endpoint.method} \\\n  "https://api.restaurant-platform.com${endpoint.path}"`

  if (endpoint.auth) {
    curl += ` \\\n  -H "Authorization: Bearer YOUR_API_KEY"`
  }

  if (endpoint.body && endpoint.body.length > 0) {
    curl += ` \\\n  -H "Content-Type: application/json"`
    const bodyExample = endpoint.body.reduce((acc, field) => {
      acc[field.name] = field.type === 'string' ? 'example' : field.type === 'number' ? 0 : []
      return acc
    }, {} as Record<string, any>)
    curl += ` \\\n  -d '${JSON.stringify(bodyExample, null, 2)}'`
  }

  return curl
}

function generateJavaScriptExample(endpoint: ApiEndpoint): string {
  let code = `const response = await fetch('https://api.restaurant-platform.com${endpoint.path}', {\n`
  code += `  method: '${endpoint.method}',\n`
  code += `  headers: {\n`

  if (endpoint.auth) {
    code += `    'Authorization': 'Bearer YOUR_API_KEY',\n`
  }

  if (endpoint.body && endpoint.body.length > 0) {
    code += `    'Content-Type': 'application/json'\n`
    code += `  },\n`
    const bodyExample = endpoint.body.reduce((acc, field) => {
      acc[field.name] = field.type === 'string' ? 'example' : field.type === 'number' ? 0 : []
      return acc
    }, {} as Record<string, any>)
    code += `  body: JSON.stringify(${JSON.stringify(bodyExample, null, 2)})\n`
  } else {
    code += `  }\n`
  }

  code += `});\n\nconst data = await response.json();\nconsole.log(data);`

  return code
}

function generatePythonExample(endpoint: ApiEndpoint): string {
  let code = `import requests\n\n`
  code += `url = "https://api.restaurant-platform.com${endpoint.path}"\n`
  code += `headers = {\n`

  if (endpoint.auth) {
    code += `    "Authorization": "Bearer YOUR_API_KEY",\n`
  }

  if (endpoint.body && endpoint.body.length > 0) {
    code += `    "Content-Type": "application/json"\n`
    code += `}\n\n`
    const bodyExample = endpoint.body.reduce((acc, field) => {
      acc[field.name] = field.type === 'string' ? 'example' : field.type === 'number' ? 0 : []
      return acc
    }, {} as Record<string, any>)
    code += `data = ${JSON.stringify(bodyExample, null, 2)}\n\n`
    code += `response = requests.${endpoint.method.toLowerCase()}(url, headers=headers, json=data)\n`
  } else {
    code += `}\n\n`
    code += `response = requests.${endpoint.method.toLowerCase()}(url, headers=headers)\n`
  }

  code += `print(response.json())`

  return code
}
