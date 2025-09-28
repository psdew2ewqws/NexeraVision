import React, { useState } from 'react';
import {
  XMarkIcon,
  ExclamationTriangleIcon,
  TrashIcon
} from '@heroicons/react/24/outline';
import { apiCall } from '../../../utils/api';
import toast from 'react-hot-toast';

interface WebhookDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  webhook: {
    id: string;
    provider: string;
    webhookUrl: string;
  } | null;
}

export const WebhookDeleteModal: React.FC<WebhookDeleteModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  webhook
}) => {
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    if (!webhook) return;

    setLoading(true);

    try {
      await apiCall(`integration/webhooks/${webhook.id}`, {
        method: 'DELETE'
      });

      toast.success('Webhook deleted successfully!');
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Failed to delete webhook:', error);
      toast.error(error.message || 'Failed to delete webhook');
    } finally {
      setLoading(false);
    }
  };

  const getProviderDisplayName = (provider: string): string => {
    const names: Record<string, string> = {
      careem: 'Careem Now',
      talabat: 'Talabat',
      deliveroo: 'Deliveroo',
      jahez: 'Jahez',
      dhub: 'Dhub',
      yallow: 'Yallow',
      jooddelivery: 'Jood Delivery',
      topdeliver: 'Top Deliver',
      nashmi: 'Nashmi',
      tawasi: 'Tawasi',
      delivergy: 'Delivergy',
      utrac: 'Utrac'
    };
    return names[provider] || provider.charAt(0).toUpperCase() + provider.slice(1);
  };

  const truncateUrl = (url: string, maxLength: number = 50): string => {
    if (url.length <= maxLength) return url;
    return url.substring(0, maxLength) + '...';
  };

  if (!isOpen || !webhook) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        {/* Backdrop */}
        <div className="fixed inset-0 bg-black bg-opacity-50 transition-opacity" onClick={onClose} />

        {/* Modal */}
        <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div className="flex items-center space-x-3">
              <div className="flex items-center justify-center w-8 h-8 bg-red-100 rounded-lg">
                <ExclamationTriangleIcon className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Delete Webhook</h2>
                <p className="text-sm text-gray-500">This action cannot be undone</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6">
            <div className="mb-4">
              <p className="text-gray-700 mb-4">
                Are you sure you want to delete this webhook? This will stop receiving webhook events from the provider.
              </p>

              {/* Webhook Details */}
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <div className="space-y-2">
                  <div>
                    <span className="text-sm font-medium text-gray-700">Provider: </span>
                    <span className="text-sm text-gray-900">{getProviderDisplayName(webhook.provider)}</span>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-700">URL: </span>
                    <span className="text-sm text-gray-900 font-mono">
                      {truncateUrl(webhook.webhookUrl)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Warning */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
              <div className="flex items-start space-x-3">
                <ExclamationTriangleIcon className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="text-sm font-medium text-yellow-800">Warning</h4>
                  <p className="text-sm text-yellow-700 mt-1">
                    Deleting this webhook will:
                  </p>
                  <ul className="text-sm text-yellow-700 mt-2 list-disc list-inside space-y-1">
                    <li>Stop receiving order updates from {getProviderDisplayName(webhook.provider)}</li>
                    <li>Potentially disrupt your order management workflow</li>
                    <li>Remove all webhook configuration permanently</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Confirmation */}
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm text-red-800">
                <strong>This action is permanent.</strong> You will need to reconfigure the webhook if you want to receive events from this provider again.
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 bg-gray-50">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
              disabled={loading}
            >
              Cancel
            </button>

            <button
              onClick={handleDelete}
              disabled={loading}
              className="px-6 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  Deleting...
                </>
              ) : (
                <>
                  <TrashIcon className="w-4 h-4 mr-2" />
                  Delete Webhook
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};