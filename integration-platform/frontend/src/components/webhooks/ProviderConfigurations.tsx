import React, { useState } from 'react';
import {
  Settings,
  Shield,
  Clock,
  AlertCircle,
  CheckCircle,
  ExternalLink,
  Copy,
  Eye,
  EyeOff
} from 'lucide-react';
import { SupportedProvider, WebhookConfig } from '../../types/webhook';

interface ProviderConfigurationsProps {
  webhooks: WebhookConfig[];
  onUpdateWebhook: (clientId: string, config: Partial<WebhookConfig>) => Promise<void>;
}

const ProviderCard: React.FC<{
  provider: SupportedProvider;
  webhooks: WebhookConfig[];
  onUpdateWebhook: (clientId: string, config: Partial<WebhookConfig>) => Promise<void>;
}> = ({ provider, webhooks, onUpdateWebhook }) => {
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});
  const [updating, setUpdating] = useState<Record<string, boolean>>({});

  const providerWebhooks = webhooks.filter(w => w.provider === provider);

  const getProviderInfo = (provider: SupportedProvider) => {
    const configs = {
      [SupportedProvider.CAREEM]: {
        name: 'Careem Now',
        color: 'bg-green-100 text-green-800 border-green-200',
        icon: '🚗',
        documentation: 'https://developers.careem.com/docs/webhooks',
        description: 'Real-time order notifications and status updates from Careem Now platform',
        requiredHeaders: ['X-Careem-Signature'],
        eventTypes: ['order_created', 'order_updated', 'order_cancelled'],
        tips: [
          'Ensure your endpoint responds within 10 seconds',
          'Return HTTP 200 status for successful processing',
          'Verify webhook signatures for security'
        ]
      },
      [SupportedProvider.TALABAT]: {
        name: 'Talabat',
        color: 'bg-orange-100 text-orange-800 border-orange-200',
        icon: '🍽️',
        documentation: 'https://developers.talabat.com/webhooks',
        description: 'Order management and delivery tracking from Talabat platform',
        requiredHeaders: ['Authorization'],
        eventTypes: ['order_notification', 'status_update', 'delivery_update'],
        tips: [
          'Use HTTPS endpoints only',
          'Implement idempotency for duplicate events',
          'Store webhook IDs to prevent duplicate processing'
        ]
      },
      [SupportedProvider.DELIVEROO]: {
        name: 'Deliveroo',
        color: 'bg-blue-100 text-blue-800 border-blue-200',
        icon: '🛵',
        documentation: 'https://developers.deliveroo.com/docs/webhooks',
        description: 'Order lifecycle events and menu synchronization from Deliveroo',
        requiredHeaders: ['X-Deliveroo-Signature'],
        eventTypes: ['order_event', 'menu_update', 'restaurant_status'],
        tips: [
          'Validate webhook signatures using HMAC-SHA256',
          'Handle webhook retries gracefully',
          'Use structured logging for debugging'
        ]
      },
      [SupportedProvider.JAHEZ]: {
        name: 'Jahez',
        color: 'bg-purple-100 text-purple-800 border-purple-200',
        icon: '🏠',
        documentation: 'https://api.jahez.com/docs',
        description: 'Saudi Arabia food delivery platform integration',
        requiredHeaders: ['X-Jahez-Token'],
        eventTypes: ['order_action', 'payment_update', 'delivery_status'],
        tips: [
          'Test webhooks thoroughly in sandbox environment',
          'Handle Arabic text encoding properly',
          'Respect rate limits for API calls'
        ]
      },
      [SupportedProvider.UBER_EATS]: {
        name: 'Uber Eats',
        color: 'bg-gray-100 text-gray-800 border-gray-200',
        icon: '🚚',
        documentation: 'https://developer.uber.com/docs/eats',
        description: 'Order management and delivery tracking from Uber Eats',
        requiredHeaders: ['X-Uber-Signature'],
        eventTypes: ['order_created', 'order_updated', 'delivery_status'],
        tips: [
          'Implement webhook verification',
          'Handle high-volume events efficiently',
          'Use exponential backoff for retries'
        ]
      },
      [SupportedProvider.FOODPANDA]: {
        name: 'Foodpanda',
        color: 'bg-pink-100 text-pink-800 border-pink-200',
        icon: '🐼',
        documentation: 'https://developers.foodpanda.com',
        description: 'Asian market food delivery platform integration',
        requiredHeaders: ['Authorization'],
        eventTypes: ['order_notification', 'menu_sync', 'restaurant_update'],
        tips: [
          'Support multiple currencies and languages',
          'Handle timezone differences properly',
          'Implement proper error handling'
        ]
      },
      [SupportedProvider.POS_SYSTEM]: {
        name: 'POS System',
        color: 'bg-indigo-100 text-indigo-800 border-indigo-200',
        icon: '💳',
        documentation: '/docs/pos-integration',
        description: 'Point of Sale system integration for order synchronization',
        requiredHeaders: ['X-POS-Auth'],
        eventTypes: ['pos_order', 'payment_processed', 'inventory_update'],
        tips: [
          'Ensure real-time synchronization',
          'Handle offline scenarios gracefully',
          'Validate payment information securely'
        ]
      }
    };

    return configs[provider] || {
      name: provider,
      color: 'bg-gray-100 text-gray-800 border-gray-200',
      icon: '🔗',
      documentation: '#',
      description: 'Custom provider integration',
      requiredHeaders: [],
      eventTypes: [],
      tips: []
    };
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const toggleSecretVisibility = (webhookId: string) => {
    setShowSecrets(prev => ({
      ...prev,
      [webhookId]: !prev[webhookId]
    }));
  };

  const handleToggleActive = async (webhook: WebhookConfig) => {
    setUpdating(prev => ({ ...prev, [webhook.id]: true }));
    try {
      await onUpdateWebhook(webhook.clientId, { isActive: !webhook.isActive });
    } catch (error) {
      console.error('Failed to update webhook:', error);
    } finally {
      setUpdating(prev => ({ ...prev, [webhook.id]: false }));
    }
  };

  const info = getProviderInfo(provider);

  return (
    <div className="rounded-lg border border-slate-200 bg-white">
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <span className="text-lg">{info.icon}</span>
            <div>
              <h3 className="text-sm font-medium text-gray-900">{info.name}</h3>
              <p className="text-xs text-gray-600 mt-0.5">{info.description}</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <span className="px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-700">
              {providerWebhooks.length} webhook{providerWebhooks.length !== 1 ? 's' : ''}
            </span>
            <a
              href={info.documentation}
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-400 hover:text-blue-600 transition-colors"
            >
              <ExternalLink className="h-4 w-4" />
            </a>
          </div>
        </div>
      </div>

      {/* Webhooks List */}
      <div className="p-4">
        {providerWebhooks.length === 0 ? (
          <div className="text-center py-6">
            <div className="text-gray-400 mb-3">
              <Settings className="h-8 w-8 mx-auto" />
            </div>
            <p className="text-sm text-gray-500 mb-3">No webhooks configured</p>
            <button className="inline-flex items-center px-3 py-1.5 text-sm font-medium rounded text-blue-600 hover:text-blue-700 transition-colors">
              Configure Webhook
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {providerWebhooks.map((webhook) => (
              <div key={webhook.id} className="border border-gray-200 rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <h4 className="text-sm font-medium text-gray-900">{webhook.clientId}</h4>
                    {webhook.description && (
                      <p className="text-xs text-gray-500 mt-0.5">{webhook.description}</p>
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    {webhook.isActive ? (
                      <div className="h-2 w-2 bg-green-500 rounded-full"></div>
                    ) : (
                      <div className="h-2 w-2 bg-red-500 rounded-full"></div>
                    )}
                    <span className={`text-xs font-medium ${
                      webhook.isActive ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {webhook.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-gray-500 mb-1">URL</label>
                      <div className="flex items-center space-x-1">
                        <code className="bg-gray-50 px-2 py-1 rounded text-xs flex-1 truncate">
                          {webhook.url}
                        </code>
                        <button
                          onClick={() => copyToClipboard(webhook.url)}
                          className="text-gray-400 hover:text-blue-600 transition-colors"
                        >
                          <Copy className="h-3 w-3" />
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-gray-500 mb-1">Secret</label>
                      <div className="flex items-center space-x-1">
                        <code className="bg-gray-50 px-2 py-1 rounded text-xs flex-1">
                          {showSecrets[webhook.id] ? webhook.secretKey : '••••••••••••••••'}
                        </code>
                        <button
                          onClick={() => toggleSecretVisibility(webhook.id)}
                          className="text-gray-400 hover:text-gray-600 transition-colors"
                        >
                          {showSecrets[webhook.id] ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                        </button>
                        <button
                          onClick={() => copyToClipboard(webhook.secretKey)}
                          className="text-gray-400 hover:text-blue-600 transition-colors"
                        >
                          <Copy className="h-3 w-3" />
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-gray-500 mb-1">Events</label>
                      <div className="flex flex-wrap gap-1">
                        {webhook.events.slice(0, 2).map(event => (
                          <span key={event} className="bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded text-xs">
                            {event}
                          </span>
                        ))}
                        {webhook.events.length > 2 && (
                          <span className="bg-gray-50 text-gray-600 px-1.5 py-0.5 rounded text-xs">
                            +{webhook.events.length - 2}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                    <div className="flex items-center space-x-3 text-xs text-gray-500">
                      <span className="flex items-center">
                        <Clock className="h-3 w-3 mr-1" />
                        {webhook.timeoutMs}ms
                      </span>
                      <span className="flex items-center">
                        <Shield className="h-3 w-3 mr-1" />
                        {webhook.enableSignatureValidation ? 'Secured' : 'Unsigned'}
                      </span>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleToggleActive(webhook)}
                        disabled={updating[webhook.id]}
                        className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                          webhook.isActive
                            ? 'text-red-600 hover:text-red-700'
                            : 'text-green-600 hover:text-green-700'
                        } disabled:opacity-50`}
                      >
                        {updating[webhook.id] ? 'Updating...' : webhook.isActive ? 'Disable' : 'Enable'}
                      </button>
                      <button className="px-2 py-1 text-blue-600 hover:text-blue-700 rounded text-xs font-medium transition-colors">
                        Edit
                      </button>
                    </div>
                  </div>
                </div>

              </div>
            ))}
          </div>
        )}
      </div>

      {/* Configuration Tips */}
      <div className="border-t border-slate-200 p-4 bg-gray-50">
        <h4 className="text-sm font-medium text-gray-900 mb-2">Integration Guide</h4>
        <ul className="space-y-1">
          {info.tips.slice(0, 3).map((tip, index) => (
            <li key={index} className="flex items-start space-x-2">
              <div className="w-1 h-1 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
              <span className="text-xs text-gray-600">{tip}</span>
            </li>
          ))}
        </ul>

        <div className="mt-3 flex flex-wrap gap-2">
          {info.requiredHeaders.slice(0, 3).map(header => (
            <code key={header} className="bg-white px-2 py-1 rounded text-xs border border-gray-200">
              {header}
            </code>
          ))}
          {info.eventTypes.slice(0, 3).map(event => (
            <span key={event} className="bg-blue-50 px-2 py-1 rounded text-xs text-blue-700">
              {event}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};

export const ProviderConfigurations: React.FC<ProviderConfigurationsProps> = ({
  webhooks,
  onUpdateWebhook
}) => {
  const providers = Object.values(SupportedProvider);

  return (
    <div className="space-y-4">
      <div className="mb-4">
        <h2 className="text-lg font-medium text-gray-900 mb-1">Provider Configurations</h2>
        <p className="text-sm text-gray-600">
          Manage webhook configurations for each delivery provider
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {providers.map(provider => (
          <ProviderCard
            key={provider}
            provider={provider}
            webhooks={webhooks}
            onUpdateWebhook={onUpdateWebhook}
          />
        ))}
      </div>
    </div>
  );
};