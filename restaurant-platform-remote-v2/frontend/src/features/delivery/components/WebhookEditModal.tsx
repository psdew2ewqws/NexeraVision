import React, { useState, useEffect } from 'react';
import {
  XMarkIcon,
  PlusIcon,
  TrashIcon,
  CheckCircleIcon,
  DocumentTextIcon,
  LinkIcon,
  PencilIcon,
  KeyIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '../../../contexts/AuthContext';
import { apiCall } from '../../../utils/api';
import toast from 'react-hot-toast';

interface WebhookEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  webhook: {
    id: string;
    provider: string;
    webhookUrl: string;
    isActive: boolean;
    events?: string[];
    authHeaders?: Record<string, string>;
  } | null;
}

interface Event {
  id: string;
  name: string;
  description: string;
}

interface WebhookConfig {
  providers: any[];
  events: Event[];
}

interface FormData {
  webhookUrl: string;
  events: string[];
  authHeaders: { key: string; value: string }[];
  isActive: boolean;
}

export const WebhookEditModal: React.FC<WebhookEditModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  webhook
}) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [webhookConfig, setWebhookConfig] = useState<WebhookConfig | null>(null);
  const [formData, setFormData] = useState<FormData>({
    webhookUrl: '',
    events: [],
    authHeaders: [{ key: '', value: '' }],
    isActive: true
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Load webhook configuration and populate form when modal opens
  useEffect(() => {
    if (isOpen) {
      loadWebhookConfig();
      if (webhook) {
        populateForm(webhook);
      }
    }
  }, [isOpen, webhook]);

  const loadWebhookConfig = async () => {
    try {
      const config = await apiCall('integration/webhooks/config');
      setWebhookConfig(config);
    } catch (error) {
      console.error('Failed to load webhook config:', error);
      toast.error('Failed to load webhook configuration');
    }
  };

  const populateForm = (webhookData: any) => {
    const authHeadersArray = webhookData.authHeaders
      ? Object.entries(webhookData.authHeaders).map(([key, value]) => ({ key, value: value as string }))
      : [{ key: '', value: '' }];

    setFormData({
      webhookUrl: webhookData.webhookUrl || '',
      events: webhookData.events || [],
      authHeaders: authHeadersArray.length > 0 ? authHeadersArray : [{ key: '', value: '' }],
      isActive: webhookData.isActive !== undefined ? webhookData.isActive : true
    });
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.webhookUrl) {
      newErrors.webhookUrl = 'Webhook URL is required';
    } else {
      try {
        new URL(formData.webhookUrl);
      } catch {
        newErrors.webhookUrl = 'Invalid URL format';
      }
    }

    if (formData.events.length === 0) {
      newErrors.events = 'At least one event must be selected';
    }

    // Validate auth headers
    const invalidHeaders = formData.authHeaders.some(header =>
      (header.key && !header.value) || (!header.key && header.value)
    );
    if (invalidHeaders) {
      newErrors.authHeaders = 'Both key and value are required for authentication headers';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!webhook || !validateForm()) {
      return;
    }

    setLoading(true);

    try {
      // Filter out empty auth headers
      const cleanAuthHeaders = formData.authHeaders
        .filter(header => header.key && header.value)
        .reduce((acc, header) => {
          acc[header.key] = header.value;
          return acc;
        }, {} as Record<string, string>);

      const payload = {
        webhookUrl: formData.webhookUrl,
        events: formData.events,
        authHeaders: cleanAuthHeaders,
        isActive: formData.isActive
      };

      await apiCall(`integration/webhooks/${webhook.id}`, {
        method: 'PUT',
        body: JSON.stringify(payload)
      });

      toast.success('Webhook updated successfully!');
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Failed to update webhook:', error);
      toast.error(error.message || 'Failed to update webhook');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setErrors({});
    onClose();
  };

  const updateFormData = (field: keyof FormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const addAuthHeader = () => {
    setFormData(prev => ({
      ...prev,
      authHeaders: [...prev.authHeaders, { key: '', value: '' }]
    }));
  };

  const removeAuthHeader = (index: number) => {
    setFormData(prev => ({
      ...prev,
      authHeaders: prev.authHeaders.filter((_, i) => i !== index)
    }));
  };

  const updateAuthHeader = (index: number, field: 'key' | 'value', value: string) => {
    setFormData(prev => ({
      ...prev,
      authHeaders: prev.authHeaders.map((header, i) =>
        i === index ? { ...header, [field]: value } : header
      )
    }));
  };

  const toggleEvent = (eventId: string) => {
    setFormData(prev => ({
      ...prev,
      events: prev.events.includes(eventId)
        ? prev.events.filter(id => id !== eventId)
        : [...prev.events, eventId]
    }));
  };

  const selectAllEvents = () => {
    if (!webhookConfig) return;
    setFormData(prev => ({
      ...prev,
      events: webhookConfig.events.map(event => event.id)
    }));
  };

  const clearAllEvents = () => {
    setFormData(prev => ({ ...prev, events: [] }));
  };

  if (!isOpen || !webhook) return null;

  const providerName = webhookConfig?.providers.find(p => p.id === webhook.provider)?.name || webhook.provider;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        {/* Backdrop */}
        <div className="fixed inset-0 bg-black bg-opacity-50 transition-opacity" onClick={handleClose} />

        {/* Modal */}
        <div className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div className="flex items-center space-x-3">
              <div className="flex items-center justify-center w-8 h-8 bg-orange-100 rounded-lg">
                <PencilIcon className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Edit Webhook</h2>
                <p className="text-sm text-gray-500">
                  Modify webhook configuration for {providerName}
                </p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="overflow-y-auto max-h-[calc(90vh-200px)]">
            <form onSubmit={handleSubmit} className="p-6 space-y-6">

              {/* Provider Info (Read-only) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Delivery Provider
                </label>
                <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-gray-700">
                  {providerName}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Provider cannot be changed. Create a new webhook to use a different provider.
                </p>
              </div>

              {/* Webhook URL */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <LinkIcon className="w-4 h-4 inline mr-1" />
                  Webhook URL *
                </label>
                <input
                  type="url"
                  value={formData.webhookUrl}
                  onChange={(e) => updateFormData('webhookUrl', e.target.value)}
                  placeholder="https://your-domain.com/webhooks/delivery"
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.webhookUrl ? 'border-red-300' : 'border-gray-300'
                  }`}
                  required
                />
                {errors.webhookUrl && (
                  <p className="text-sm text-red-600 mt-1">{errors.webhookUrl}</p>
                )}
                <p className="text-xs text-gray-500 mt-1">
                  This URL will receive webhook events from {providerName}
                </p>
              </div>

              {/* Event Selection */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="block text-sm font-medium text-gray-700">
                    <DocumentTextIcon className="w-4 h-4 inline mr-1" />
                    Events to Subscribe *
                  </label>
                  <div className="flex space-x-2">
                    <button
                      type="button"
                      onClick={selectAllEvents}
                      className="text-xs text-blue-600 hover:text-blue-700"
                    >
                      Select All
                    </button>
                    <span className="text-xs text-gray-400">|</span>
                    <button
                      type="button"
                      onClick={clearAllEvents}
                      className="text-xs text-gray-600 hover:text-gray-700"
                    >
                      Clear All
                    </button>
                  </div>
                </div>

                <div className="border border-gray-200 rounded-lg p-4 max-h-48 overflow-y-auto">
                  <div className="grid grid-cols-1 gap-3">
                    {webhookConfig?.events.map((event) => (
                      <label key={event.id} className="flex items-start space-x-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.events.includes(event.id)}
                          onChange={() => toggleEvent(event.id)}
                          className="mt-0.5 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <div className="flex-1">
                          <div className="text-sm font-medium text-gray-900">{event.name}</div>
                          <div className="text-xs text-gray-600">{event.description}</div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                {errors.events && (
                  <p className="text-sm text-red-600 mt-1">{errors.events}</p>
                )}

                <p className="text-xs text-gray-500 mt-2">
                  Selected: {formData.events.length} event{formData.events.length !== 1 ? 's' : ''}
                </p>
              </div>

              {/* Authentication Headers */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="block text-sm font-medium text-gray-700">
                    <KeyIcon className="w-4 h-4 inline mr-1" />
                    Authentication Headers
                  </label>
                  <button
                    type="button"
                    onClick={addAuthHeader}
                    className="text-xs text-blue-600 hover:text-blue-700 flex items-center"
                  >
                    <PlusIcon className="w-3 h-3 mr-1" />
                    Add Header
                  </button>
                </div>

                <div className="space-y-3">
                  {formData.authHeaders.map((header, index) => (
                    <div key={index} className="grid grid-cols-5 gap-3">
                      <div className="col-span-2">
                        <input
                          type="text"
                          value={header.key}
                          onChange={(e) => updateAuthHeader(index, 'key', e.target.value)}
                          placeholder="Header name"
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                      <div className="col-span-2">
                        <input
                          type="text"
                          value={header.value}
                          onChange={(e) => updateAuthHeader(index, 'value', e.target.value)}
                          placeholder="Header value"
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <button
                          type="button"
                          onClick={() => removeAuthHeader(index)}
                          className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                          disabled={formData.authHeaders.length === 1}
                        >
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {errors.authHeaders && (
                  <p className="text-sm text-red-600 mt-1">{errors.authHeaders}</p>
                )}

                <p className="text-xs text-gray-500 mt-2">
                  Optional: Add custom headers for authentication (e.g., Authorization, X-API-Key)
                </p>
              </div>

              {/* Active Status */}
              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData.isActive}
                  onChange={(e) => updateFormData('isActive', e.target.checked)}
                  className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label htmlFor="isActive" className="text-sm font-medium text-gray-700">
                  Webhook is active
                </label>
              </div>

            </form>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 bg-gray-50">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>

            <button
              onClick={handleSubmit}
              disabled={loading}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  Updating...
                </>
              ) : (
                <>
                  <CheckCircleIcon className="w-4 h-4 mr-2" />
                  Update Webhook
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};