import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { IntegrationLayout } from '@/components/integration/layout/IntegrationLayout'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/integration/ui/Card'
import { Button } from '@/components/integration/ui/Button'
import { Badge } from '@/components/integration/ui/Badge'
import { Modal } from '@/components/integration/ui/Modal'
import { Input, Select } from '@/components/integration/ui/Input'
import { Tabs } from '@/components/integration/ui/Tabs'
import { CodeBlock } from '@/components/integration/ui/CodeBlock'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { format } from 'date-fns'

interface Webhook {
  id: string
  url: string
  events: string[]
  secret: string
  isActive: boolean
  createdAt: string
  lastTriggered?: string
  successRate: number
  totalDeliveries: number
}

interface WebhookDelivery {
  id: string
  webhookId: string
  event: string
  status: 'success' | 'failed' | 'pending'
  statusCode?: number
  responseTime?: number
  timestamp: string
  retryCount: number
}

const EVENT_TYPES = [
  { value: 'order.created', label: 'Order Created' },
  { value: 'order.updated', label: 'Order Updated' },
  { value: 'order.completed', label: 'Order Completed' },
  { value: 'order.cancelled', label: 'Order Cancelled' },
  { value: 'product.created', label: 'Product Created' },
  { value: 'product.updated', label: 'Product Updated' },
  { value: 'customer.created', label: 'Customer Created' },
  { value: 'payment.success', label: 'Payment Success' },
  { value: 'payment.failed', label: 'Payment Failed' },
]

export default function WebhooksPage() {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [selectedWebhook, setSelectedWebhook] = useState<Webhook | null>(null)
  const [testingWebhook, setTestingWebhook] = useState<string | null>(null)
  const queryClient = useQueryClient()

  // Fetch webhooks
  const { data: webhooks } = useQuery({
    queryKey: ['webhooks'],
    queryFn: async () => {
      return [
        {
          id: '1',
          url: 'https://api.example.com/webhooks/orders',
          events: ['order.created', 'order.updated', 'order.completed'],
          secret: 'whsec_1234567890abcdef',
          isActive: true,
          createdAt: '2024-01-15T10:00:00Z',
          lastTriggered: '2024-09-30T14:23:00Z',
          successRate: 99.5,
          totalDeliveries: 1247
        },
        {
          id: '2',
          url: 'https://webhook.site/unique-id',
          events: ['payment.success', 'payment.failed'],
          secret: 'whsec_abcdef1234567890',
          isActive: true,
          createdAt: '2024-02-20T15:30:00Z',
          lastTriggered: '2024-09-29T09:15:00Z',
          successRate: 98.2,
          totalDeliveries: 567
        }
      ] as Webhook[]
    }
  })

  // Fetch deliveries for selected webhook
  const { data: deliveries } = useQuery({
    queryKey: ['webhook-deliveries', selectedWebhook?.id],
    queryFn: async () => {
      if (!selectedWebhook) return []

      return Array.from({ length: 10 }, (_, i) => ({
        id: `delivery-${i}`,
        webhookId: selectedWebhook.id,
        event: selectedWebhook.events[i % selectedWebhook.events.length],
        status: i % 8 === 0 ? 'failed' : 'success',
        statusCode: i % 8 === 0 ? 500 : 200,
        responseTime: Math.floor(Math.random() * 200) + 50,
        timestamp: new Date(Date.now() - i * 3600000).toISOString(),
        retryCount: i % 8 === 0 ? 3 : 0
      })) as WebhookDelivery[]
    },
    enabled: !!selectedWebhook
  })

  // Create webhook mutation
  const createWebhookMutation = useMutation({
    mutationFn: async (data: { url: string; events: string[] }) => {
      return {
        id: Date.now().toString(),
        ...data,
        secret: `whsec_${Math.random().toString(36).substr(2, 24)}`,
        isActive: true,
        createdAt: new Date().toISOString(),
        successRate: 100,
        totalDeliveries: 0
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['webhooks'] })
      toast.success('Webhook created successfully')
      setIsCreateModalOpen(false)
    },
    onError: () => {
      toast.error('Failed to create webhook')
    }
  })

  // Test webhook mutation
  const testWebhookMutation = useMutation({
    mutationFn: async (webhookId: string) => {
      await new Promise(resolve => setTimeout(resolve, 1000))
      return { success: true, statusCode: 200, responseTime: 145 }
    },
    onSuccess: (data) => {
      toast.success(`Test successful! Status: ${data.statusCode}, Response: ${data.responseTime}ms`)
      setTestingWebhook(null)
    },
    onError: () => {
      toast.error('Test failed')
      setTestingWebhook(null)
    }
  })

  // Delete webhook mutation
  const deleteWebhookMutation = useMutation({
    mutationFn: async (id: string) => {
      await new Promise(resolve => setTimeout(resolve, 500))
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['webhooks'] })
      toast.success('Webhook deleted')
    }
  })

  // Retry delivery mutation
  const retryDeliveryMutation = useMutation({
    mutationFn: async (deliveryId: string) => {
      await new Promise(resolve => setTimeout(resolve, 1000))
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['webhook-deliveries'] })
      toast.success('Delivery retried successfully')
    }
  })

  const handleTestWebhook = (webhookId: string) => {
    setTestingWebhook(webhookId)
    testWebhookMutation.mutate(webhookId)
  }

  const handleDeleteWebhook = (webhook: Webhook) => {
    if (confirm(`Delete webhook for ${webhook.url}?`)) {
      deleteWebhookMutation.mutate(webhook.id)
    }
  }

  return (
    <IntegrationLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-100">Webhooks</h1>
            <p className="text-sm text-gray-400 mt-1">
              Configure webhook endpoints and monitor deliveries
            </p>
          </div>
          <Button onClick={() => setIsCreateModalOpen(true)}>
            Add Webhook
          </Button>
        </div>

        {/* Webhooks List */}
        <Card>
          <CardContent>
            {webhooks && webhooks.length > 0 ? (
              <div className="space-y-4">
                {webhooks.map((webhook) => (
                  <div
                    key={webhook.id}
                    className="p-4 bg-gray-950 border border-gray-800 rounded-lg hover:border-gray-700 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <code className="text-sm text-gray-200 font-mono">{webhook.url}</code>
                          <Badge variant={webhook.isActive ? 'success' : 'default'}>
                            {webhook.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </div>

                        <div className="flex flex-wrap gap-2 mb-3">
                          {webhook.events.map((event) => (
                            <Badge key={event} size="sm">
                              {event}
                            </Badge>
                          ))}
                        </div>

                        <div className="grid grid-cols-4 gap-4 text-xs">
                          <div>
                            <span className="text-gray-500">Deliveries</span>
                            <p className="text-gray-300 font-medium mt-0.5">
                              {webhook.totalDeliveries.toLocaleString()}
                            </p>
                          </div>
                          <div>
                            <span className="text-gray-500">Success Rate</span>
                            <p className="text-green-400 font-medium mt-0.5">
                              {webhook.successRate}%
                            </p>
                          </div>
                          <div>
                            <span className="text-gray-500">Last Triggered</span>
                            <p className="text-gray-300 font-medium mt-0.5">
                              {webhook.lastTriggered ? format(new Date(webhook.lastTriggered), 'MMM d, HH:mm') : 'Never'}
                            </p>
                          </div>
                          <div>
                            <span className="text-gray-500">Created</span>
                            <p className="text-gray-300 font-medium mt-0.5">
                              {format(new Date(webhook.createdAt), 'MMM d, yyyy')}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 ml-4">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handleTestWebhook(webhook.id)}
                          loading={testingWebhook === webhook.id}
                        >
                          Test
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => setSelectedWebhook(webhook)}
                        >
                          View Logs
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => handleDeleteWebhook(webhook)}
                        >
                          Delete
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <svg className="mx-auto h-12 w-12 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-gray-300">No webhooks configured</h3>
                <p className="mt-1 text-sm text-gray-500">Get started by adding a webhook endpoint.</p>
                <div className="mt-6">
                  <Button onClick={() => setIsCreateModalOpen(true)}>
                    Add Webhook
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Webhook Signature Verification */}
        <Card>
          <CardHeader>
            <CardTitle>Webhook Signature Verification</CardTitle>
            <CardDescription>
              Verify webhook payloads to ensure they're from our servers
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs
              tabs={[
                {
                  id: 'node',
                  label: 'Node.js',
                  content: (
                    <CodeBlock
                      language="javascript"
                      code={`const crypto = require('crypto');

function verifyWebhookSignature(payload, signature, secret) {
  const hmac = crypto.createHmac('sha256', secret);
  const digest = hmac.update(payload).digest('hex');
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(digest)
  );
}

// Express middleware example
app.post('/webhooks', (req, res) => {
  const signature = req.headers['x-webhook-signature'];
  const payload = JSON.stringify(req.body);

  if (!verifyWebhookSignature(payload, signature, process.env.WEBHOOK_SECRET)) {
    return res.status(401).send('Invalid signature');
  }

  // Process webhook
  res.status(200).send('OK');
});`}
                    />
                  )
                },
                {
                  id: 'python',
                  label: 'Python',
                  content: (
                    <CodeBlock
                      language="python"
                      code={`import hmac
import hashlib

def verify_webhook_signature(payload: str, signature: str, secret: str) -> bool:
    expected_signature = hmac.new(
        secret.encode(),
        payload.encode(),
        hashlib.sha256
    ).hexdigest()
    return hmac.compare_digest(signature, expected_signature)

# Flask example
@app.route('/webhooks', methods=['POST'])
def handle_webhook():
    signature = request.headers.get('X-Webhook-Signature')
    payload = request.get_data(as_text=True)

    if not verify_webhook_signature(payload, signature, os.environ['WEBHOOK_SECRET']):
        return 'Invalid signature', 401

    # Process webhook
    return 'OK', 200`}
                    />
                  )
                }
              ]}
            />
          </CardContent>
        </Card>

        {/* Create Modal */}
        <CreateWebhookModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          onSubmit={(data) => createWebhookMutation.mutate(data)}
        />

        {/* Deliveries Modal */}
        {selectedWebhook && (
          <DeliveriesModal
            webhook={selectedWebhook}
            deliveries={deliveries || []}
            isOpen={!!selectedWebhook}
            onClose={() => setSelectedWebhook(null)}
            onRetry={(id) => retryDeliveryMutation.mutate(id)}
          />
        )}
      </div>
    </IntegrationLayout>
  )
}

// Create Webhook Modal
interface CreateWebhookModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: { url: string; events: string[] }) => void
}

function CreateWebhookModal({ isOpen, onClose, onSubmit }: CreateWebhookModalProps) {
  const { register, handleSubmit, formState: { errors } } = useForm()
  const [selectedEvents, setSelectedEvents] = useState<string[]>([])

  const handleFormSubmit = (data: any) => {
    onSubmit({ url: data.url, events: selectedEvents })
  }

  const toggleEvent = (event: string) => {
    setSelectedEvents(prev =>
      prev.includes(event) ? prev.filter(e => e !== event) : [...prev, event]
    )
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add Webhook" size="md">
      <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
        <Input
          label="Endpoint URL"
          placeholder="https://api.example.com/webhooks"
          error={errors.url?.message as string}
          {...register('url', {
            required: 'URL is required',
            pattern: {
              value: /^https?:\/\/.+/,
              message: 'Must be a valid URL'
            }
          })}
        />

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-3">
            Events to Subscribe
          </label>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {EVENT_TYPES.map((event) => (
              <label
                key={event.value}
                className="flex items-center p-3 bg-gray-950 border border-gray-800 rounded-lg hover:border-gray-700 cursor-pointer transition-colors"
              >
                <input
                  type="checkbox"
                  checked={selectedEvents.includes(event.value)}
                  onChange={() => toggleEvent(event.value)}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-700 rounded bg-gray-900"
                />
                <span className="ml-3 text-sm text-gray-300">{event.label}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={selectedEvents.length === 0}>
            Create Webhook
          </Button>
        </div>
      </form>
    </Modal>
  )
}

// Deliveries Modal
interface DeliveriesModalProps {
  webhook: Webhook
  deliveries: WebhookDelivery[]
  isOpen: boolean
  onClose: () => void
  onRetry: (id: string) => void
}

function DeliveriesModal({ webhook, deliveries, isOpen, onClose, onRetry }: DeliveriesModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Deliveries: ${webhook.url}`} size="xl">
      <div className="space-y-4">
        {deliveries.map((delivery) => (
          <div
            key={delivery.id}
            className="p-4 bg-gray-950 border border-gray-800 rounded-lg"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <code className="text-sm text-gray-300 font-mono">{delivery.event}</code>
                  <Badge variant={delivery.status === 'success' ? 'success' : 'error'}>
                    {delivery.statusCode || delivery.status}
                  </Badge>
                  {delivery.responseTime && (
                    <span className="text-xs text-gray-500">{delivery.responseTime}ms</span>
                  )}
                </div>

                <div className="flex items-center gap-4 text-xs text-gray-500">
                  <span>{format(new Date(delivery.timestamp), 'MMM d, yyyy HH:mm:ss')}</span>
                  {delivery.retryCount > 0 && (
                    <span>{delivery.retryCount} retries</span>
                  )}
                </div>
              </div>

              {delivery.status === 'failed' && (
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => onRetry(delivery.id)}
                >
                  Retry
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>
    </Modal>
  )
}
