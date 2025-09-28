import React, { useState } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';
import {
  SupportedProvider,
  WebhookEventType,
  RegisterWebhookDto,
  WebhookHeader,
  WebhookRetryConfig
} from '../../types/webhook';
import { WebhookApi } from '../../lib/webhook-api';

interface WebhookRegistrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const WebhookRegistrationModal: React.FC<WebhookRegistrationModalProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const [formData, setFormData] = useState<RegisterWebhookDto>({
    clientId: '',
    provider: SupportedProvider.CAREEM,
    url: '',
    events: [WebhookEventType.ORDER_CREATED],
    headers: [],
    description: '',
    isActive: true,
    timeoutMs: 30000,
    enableSignatureValidation: true,
    retryConfig: {
      maxRetries: 3,
      exponentialBackoff: true,
      initialDelay: 1000,
      maxDelay: 30000
    }
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.clientId.trim()) {
      errors.clientId = 'Client ID is required';
    } else if (formData.clientId.length < 3) {
      errors.clientId = 'Client ID must be at least 3 characters';
    }

    if (!formData.url.trim()) {
      errors.url = 'Webhook URL is required';
    } else {
      try {
        const url = new URL(formData.url);
        if (url.protocol !== 'https:') {
          errors.url = 'URL must use HTTPS protocol';
        }
      } catch {
        errors.url = 'Invalid URL format';
      }
    }

    if (formData.events.length === 0) {
      errors.events = 'At least one event type must be selected';
    }

    if (formData.timeoutMs && (formData.timeoutMs < 1000 || formData.timeoutMs > 60000)) {
      errors.timeoutMs = 'Timeout must be between 1000 and 60000 milliseconds';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await WebhookApi.registerWebhook(formData);
      onSuccess();
      onClose();
      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to register webhook');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      clientId: '',
      provider: SupportedProvider.CAREEM,
      url: '',
      events: [WebhookEventType.ORDER_CREATED],
      headers: [],
      description: '',
      isActive: true,
      timeoutMs: 30000,
      enableSignatureValidation: true,
      retryConfig: {
        maxRetries: 3,
        exponentialBackoff: true,
        initialDelay: 1000,
        maxDelay: 30000
      }
    });
    setError(null);
    setValidationErrors({});
  };

  const addHeader = () => {
    setFormData(prev => ({
      ...prev,
      headers: [...(prev.headers || []), { name: '', value: '' }]
    }));
  };

  const updateHeader = (index: number, field: 'name' | 'value', value: string) => {
    setFormData(prev => ({
      ...prev,
      headers: prev.headers?.map((header, i) =>
        i === index ? { ...header, [field]: value } : header
      ) || []
    }));
  };

  const removeHeader = (index: number) => {
    setFormData(prev => ({
      ...prev,
      headers: prev.headers?.filter((_, i) => i !== index) || []
    }));
  };

  const toggleEvent = (event: WebhookEventType) => {
    setFormData(prev => ({
      ...prev,
      events: prev.events.includes(event)
        ? prev.events.filter(e => e !== event)
        : [...prev.events, event]
    }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg border border-slate-200 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <h2 className="text-lg font-medium text-gray-900">Register Webhook</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            {/* Client ID */}
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
                Client ID
              </label>
              <input
                type="text"
                value={formData.clientId}
                onChange={(e) => setFormData(prev => ({ ...prev, clientId: e.target.value }))}
                placeholder="restaurant-abc-123"
                className={`w-full border rounded-md px-3 py-2 text-sm transition-colors ${
                  validationErrors.clientId ? 'border-red-300 focus:border-red-400' : 'border-gray-200 focus:border-blue-500'
                } focus:outline-none focus:ring-0`}
              />
              {validationErrors.clientId && (
                <p className="text-xs text-red-600 mt-1">{validationErrors.clientId}</p>
              )}
            </div>

            {/* Provider */}
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
                Provider
              </label>
              <select
                value={formData.provider}
                onChange={(e) => setFormData(prev => ({ ...prev, provider: e.target.value as SupportedProvider }))}
                className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-blue-500 transition-colors"
              >
                {Object.values(SupportedProvider).map(provider => (
                  <option key={provider} value={provider} className="capitalize">
                    {provider.replace('_', ' ')}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Webhook URL */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Webhook URL
            </label>
            <input
              type="url"
              value={formData.url}
              onChange={(e) => setFormData(prev => ({ ...prev, url: e.target.value }))}
              placeholder="https://your-restaurant.com/webhooks/orders"
              className={`w-full border rounded-md px-3 py-2 text-sm transition-colors ${
                validationErrors.url ? 'border-red-300 focus:border-red-400' : 'border-gray-200 focus:border-blue-500'
              } focus:outline-none focus:ring-0`}
            />
            {validationErrors.url && (
              <p className="text-xs text-red-600 mt-1">{validationErrors.url}</p>
            )}
            <p className="text-xs text-gray-500 mt-1">
              Must be a secure HTTPS URL
            </p>
          </div>

          {/* Events */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Event Types
            </label>
            <div className="grid grid-cols-2 gap-2">
              {Object.values(WebhookEventType).map(event => (
                <label key={event} className="flex items-center space-x-2 text-sm">
                  <input
                    type="checkbox"
                    checked={formData.events.includes(event)}
                    onChange={() => toggleEvent(event)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 focus:ring-offset-0 focus:ring-1"
                  />
                  <span className="text-gray-700">{event}</span>
                </label>
              ))}
            </div>
            {validationErrors.events && (
              <p className="text-xs text-red-600 mt-1">{validationErrors.events}</p>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Optional description"
              rows={2}
              className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>

          {/* Headers */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-900">
                Custom Headers
              </label>
              <button
                type="button"
                onClick={addHeader}
                className="inline-flex items-center px-2 py-1 text-xs font-medium text-blue-600 hover:text-blue-700 transition-colors"
              >
                <Plus className="h-3 w-3 mr-1" />
                Add
              </button>
            </div>
            <div className="space-y-2">
              {formData.headers?.map((header, index) => (
                <div key={index} className="flex space-x-2">
                  <input
                    type="text"
                    placeholder="Name"
                    value={header.name}
                    onChange={(e) => updateHeader(index, 'name', e.target.value)}
                    className="flex-1 border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-blue-500 transition-colors"
                  />
                  <input
                    type="text"
                    placeholder="Value"
                    value={header.value}
                    onChange={(e) => updateHeader(index, 'value', e.target.value)}
                    className="flex-1 border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-blue-500 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => removeHeader(index)}
                    className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Advanced Settings */}
          <div className="border-t border-slate-200 pt-4">
            <h3 className="text-sm font-medium text-gray-900 mb-3">Advanced Settings</h3>

            <div className="grid grid-cols-2 gap-4">
              {/* Timeout */}
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  Timeout (ms)
                </label>
                <input
                  type="number"
                  value={formData.timeoutMs}
                  onChange={(e) => setFormData(prev => ({ ...prev, timeoutMs: parseInt(e.target.value) }))}
                  min="1000"
                  max="60000"
                  className={`w-full border rounded-md px-3 py-2 text-sm transition-colors ${
                    validationErrors.timeoutMs ? 'border-red-300 focus:border-red-400' : 'border-gray-200 focus:border-blue-500'
                  } focus:outline-none focus:ring-0`}
                />
                {validationErrors.timeoutMs && (
                  <p className="text-xs text-red-600 mt-1">{validationErrors.timeoutMs}</p>
                )}
              </div>

              {/* Active Status */}
              <div className="flex items-center space-x-2 mt-6">
                <input
                  type="checkbox"
                  checked={formData.isActive}
                  onChange={(e) => setFormData(prev => ({ ...prev, isActive: e.target.checked }))}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 focus:ring-offset-0 focus:ring-1"
                />
                <span className="text-sm text-gray-700">
                  Activate immediately
                </span>
              </div>
            </div>

            {/* Retry Configuration */}
            <div className="mt-4">
              <h4 className="text-sm font-medium text-gray-900 mb-3">Retry Configuration</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-700 mb-1">
                    Max Retries
                  </label>
                  <input
                    type="number"
                    value={formData.retryConfig?.maxRetries}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      retryConfig: { ...prev.retryConfig!, maxRetries: parseInt(e.target.value) }
                    }))}
                    min="0"
                    max="10"
                    className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-700 mb-1">
                    Initial Delay (ms)
                  </label>
                  <input
                    type="number"
                    value={formData.retryConfig?.initialDelay}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      retryConfig: { ...prev.retryConfig!, initialDelay: parseInt(e.target.value) }
                    }))}
                    min="100"
                    className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>
              </div>

              <div className="mt-3 space-y-2">
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={formData.retryConfig?.exponentialBackoff}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      retryConfig: { ...prev.retryConfig!, exponentialBackoff: e.target.checked }
                    }))}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 focus:ring-offset-0 focus:ring-1"
                  />
                  <span className="text-sm text-gray-700">
                    Exponential backoff
                  </span>
                </label>

                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={formData.enableSignatureValidation}
                    onChange={(e) => setFormData(prev => ({ ...prev, enableSignatureValidation: e.target.checked }))}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 focus:ring-offset-0 focus:ring-1"
                  />
                  <span className="text-sm text-gray-700">
                    Enable signature validation
                  </span>
                </label>
              </div>
            </div>
          </div>

          {/* Submit Buttons */}
          <div className="flex justify-end space-x-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2 inline-block"></div>
                  Registering...
                </>
              ) : (
                'Register'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};