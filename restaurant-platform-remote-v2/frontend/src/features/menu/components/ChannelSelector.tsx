import React, { useState } from 'react';
import {
  XMarkIcon,
  CloudIcon,
  CheckIcon,
  Cog6ToothIcon,
  InformationCircleIcon,
} from '@heroicons/react/24/outline';
import { DeliveryChannel } from '../hooks/usePlatformSettings';

interface ChannelSelectorProps {
  availableChannels: DeliveryChannel[];
  onSelect: (channelId: string, config: any) => Promise<void>;
  onClose: () => void;
  isCreating: boolean;
}

export const ChannelSelector: React.FC<ChannelSelectorProps> = ({
  availableChannels,
  onSelect,
  onClose,
  isCreating,
}) => {
  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(null);
  const [showConfig, setShowConfig] = useState(false);
  const [config, setConfig] = useState({
    priority: 0,
    syncEnabled: true,
    autoSyncInterval: 15,
    credentials: {},
    channelSettings: {},
  });

  const selectedChannel = availableChannels.find(c => c.id === selectedChannelId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedChannelId) return;

    await onSelect(selectedChannelId, config);
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-0 border max-w-2xl shadow-lg rounded-lg bg-white">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Add Delivery Channel</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          {/* Channel Selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Select Delivery Channel
            </label>

            {availableChannels.length === 0 ? (
              <div className="text-center py-8">
                <CloudIcon className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-500">No channels available for assignment</p>
                <p className="text-sm text-gray-400 mt-1">
                  Contact support to enable additional delivery channels
                </p>
              </div>
            ) : (
              <div className="grid gap-3">
                {availableChannels.map((channel) => (
                  <div
                    key={channel.id}
                    className={`relative rounded-lg border p-4 cursor-pointer transition-all ${
                      selectedChannelId === channel.id
                        ? 'border-indigo-500 bg-indigo-50'
                        : 'border-gray-300 hover:border-gray-400 bg-white'
                    }`}
                    onClick={() => setSelectedChannelId(channel.id)}
                  >
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <CloudIcon className={`w-8 h-8 ${
                          selectedChannelId === channel.id ? 'text-indigo-600' : 'text-gray-400'
                        }`} />
                      </div>
                      <div className="ml-3 flex-1">
                        <h4 className="text-sm font-medium text-gray-900">
                          {channel.name}
                        </h4>
                        <p className="text-sm text-gray-500">
                          {channel.providerName} • {channel.channelType}
                          {channel.isSystemDefault && (
                            <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                              Default
                            </span>
                          )}
                        </p>
                        {channel.supportedFeatures && (
                          <div className="mt-1 flex flex-wrap gap-1">
                            {Object.entries(channel.supportedFeatures).map(([feature, enabled]) => (
                              enabled && (
                                <span
                                  key={feature}
                                  className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800"
                                >
                                  {feature}
                                </span>
                              )
                            ))}
                          </div>
                        )}
                      </div>
                      {selectedChannelId === channel.id && (
                        <div className="flex-shrink-0">
                          <CheckIcon className="w-5 h-5 text-indigo-600" />
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Configuration Options */}
          {selectedChannel && (
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <label className="block text-sm font-medium text-gray-700">
                  Configuration
                </label>
                <button
                  type="button"
                  onClick={() => setShowConfig(!showConfig)}
                  className="inline-flex items-center text-sm text-indigo-600 hover:text-indigo-500"
                >
                  <Cog6ToothIcon className="w-4 h-4 mr-1" />
                  {showConfig ? 'Hide' : 'Show'} Advanced
                </button>
              </div>

              {/* Basic Configuration */}
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Priority
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={config.priority}
                    onChange={(e) => setConfig(prev => ({
                      ...prev,
                      priority: parseInt(e.target.value) || 0
                    }))}
                    className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  />
                  <p className="mt-1 text-xs text-gray-500">Higher priority channels sync first</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Auto Sync Interval (minutes)
                  </label>
                  <input
                    type="number"
                    min="5"
                    max="1440"
                    value={config.autoSyncInterval}
                    onChange={(e) => setConfig(prev => ({
                      ...prev,
                      autoSyncInterval: parseInt(e.target.value) || 15
                    }))}
                    className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  />
                  <p className="mt-1 text-xs text-gray-500">How often to automatically sync</p>
                </div>
              </div>

              <div className="flex items-center mb-4">
                <input
                  type="checkbox"
                  id="syncEnabled"
                  checked={config.syncEnabled}
                  onChange={(e) => setConfig(prev => ({
                    ...prev,
                    syncEnabled: e.target.checked
                  }))}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                />
                <label htmlFor="syncEnabled" className="ml-2 block text-sm text-gray-900">
                  Enable automatic synchronization
                </label>
              </div>

              {/* Advanced Configuration */}
              {showConfig && (
                <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      API Credentials (JSON)
                    </label>
                    <textarea
                      rows={3}
                      placeholder='{"apiKey": "your-api-key", "secret": "your-secret"}'
                      value={JSON.stringify(config.credentials, null, 2)}
                      onChange={(e) => {
                        try {
                          const credentials = JSON.parse(e.target.value || '{}');
                          setConfig(prev => ({ ...prev, credentials }));
                        } catch (error) {
                          // Invalid JSON, don't update
                        }
                      }}
                      className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Channel Settings (JSON)
                    </label>
                    <textarea
                      rows={3}
                      placeholder='{"webhookUrl": "https://your-domain.com/webhook", "timeout": 30}'
                      value={JSON.stringify(config.channelSettings, null, 2)}
                      onChange={(e) => {
                        try {
                          const channelSettings = JSON.parse(e.target.value || '{}');
                          setConfig(prev => ({ ...prev, channelSettings }));
                        } catch (error) {
                          // Invalid JSON, don't update
                        }
                      }}
                      className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    />
                  </div>
                </div>
              )}

              {/* Info Box */}
              <div className="mt-4 bg-blue-50 border border-blue-200 rounded-md p-3">
                <div className="flex items-start">
                  <InformationCircleIcon className="w-5 h-5 text-blue-600 mt-0.5 mr-2 flex-shrink-0" />
                  <div className="text-sm text-blue-800">
                    <p className="font-medium mb-1">Channel Setup Notes:</p>
                    <ul className="list-disc list-inside space-y-0.5 text-blue-700">
                      <li>API credentials are required for most channels</li>
                      <li>Test the connection after setup to ensure proper configuration</li>
                      <li>Sync intervals should align with your business needs</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!selectedChannelId || isCreating}
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              {isCreating ? 'Adding Channel...' : 'Add Channel'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};