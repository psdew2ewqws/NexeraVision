import React, { useState, useEffect } from 'react';
import {
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  ArrowPathIcon,
  BoltIcon,
  EyeIcon,
  CodeBracketIcon,
  ChartBarIcon,
  FunnelIcon,
  CalendarIcon,
  ArrowRightIcon,
  InformationCircleIcon,
  ShieldCheckIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  PlayIcon,
  PauseIcon,
  BeakerIcon,
  Cog6ToothIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '../../../contexts/AuthContext';
import { apiCall } from '../../../utils/api';
import toast from 'react-hot-toast';
import { WebhookRegistrationModal } from './WebhookRegistrationModal';
import { WebhookEditModal } from './WebhookEditModal';
import { WebhookDeleteModal } from './WebhookDeleteModal';

interface Webhook {
  id: string;
  provider: string;
  webhookUrl: string;
  isActive: boolean;
  registeredAt: string;
  lastEventAt: string | null;
  createdAt: string;
  updatedAt: string;
  stats: {
    totalEvents: number;
    successRate: number;
    lastEventAt: string | null;
  };
}

interface WebhookLog {
  id: string;
  providerType: string;
  eventType: string;
  success: boolean;
  message: string;
  webhookData: any;
  sourceIp: string;
  processedAt: string;
  responseTime: number;
  retryCount?: number;
  errorDetails?: string;
}

interface WebhookStats {
  totalWebhooks: number;
  successfulWebhooks: number;
  failedWebhooks: number;
  successRate: number;
  providerBreakdown: Record<string, { total: number; success: number; failed: number }>;
  eventTypeBreakdown: Record<string, number>;
  timeSeriesData: Array<{ date: string; webhooks: number; success: number; failed: number }>;
  recentErrors: Array<{ provider: string; error: string; count: number; lastSeen: string }>;
}

interface WebhookFilter {
  providerType?: string;
  eventType?: string;
  success?: boolean | null;
  timeframe: '1h' | '24h' | '7d' | '30d';
  limit: number;
  offset: number;
}

const PROVIDER_TYPES = [
  'dhub', 'talabat', 'careem', 'careemexpress', 'jahez',
  'deliveroo', 'yallow', 'jooddelivery', 'topdeliver',
  'nashmi', 'tawasi', 'delivergy', 'utrac', 'local_delivery'
];

const EVENT_TYPES = [
  'order_created', 'order_confirmed', 'order_picked_up',
  'order_in_transit', 'order_delivered', 'order_cancelled',
  'driver_assigned', 'driver_arrived', 'delivery_failed',
  'payment_processed', 'refund_issued', 'status_update'
];

export default function WebhookManagementSystem() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'management' | 'monitoring'>('management');
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [webhookLogs, setWebhookLogs] = useState<WebhookLog[]>([]);
  const [webhookStats, setWebhookStats] = useState<WebhookStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedLog, setSelectedLog] = useState<WebhookLog | null>(null);
  const [selectedWebhook, setSelectedWebhook] = useState<Webhook | null>(null);

  // Modal states
  const [showRegistrationModal, setShowRegistrationModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Filter state
  const [filter, setFilter] = useState<WebhookFilter>({
    timeframe: '24h',
    limit: 50,
    offset: 0,
    providerType: undefined,
    eventType: undefined,
    success: null
  });

  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState<NodeJS.Timeout | null>(null);

  useEffect(() => {
    loadWebhooks();
    if (activeTab === 'monitoring') {
      loadMonitoringData();
    }

    if (autoRefresh && activeTab === 'monitoring') {
      const interval = setInterval(loadMonitoringData, 10000); // Refresh every 10 seconds
      setRefreshInterval(interval);
      return () => clearInterval(interval);
    }
  }, [activeTab, filter, autoRefresh]);

  const loadWebhooks = async () => {
    setIsLoading(true);
    try {
      const response = await apiCall('integration/webhooks');
      setWebhooks(response.webhooks || []);
    } catch (error) {
      console.error('Failed to load webhooks:', error);
      toast.error('Failed to load webhooks');
    } finally {
      setIsLoading(false);
    }
  };

  const loadMonitoringData = async () => {
    if (activeTab !== 'monitoring') return;

    if (!autoRefresh) setIsLoading(true);

    try {
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

      // Build query parameters
      const params = new URLSearchParams({
        timeframe: filter.timeframe,
        limit: filter.limit.toString(),
        offset: filter.offset.toString()
      });

      if (filter.providerType) params.append('providerType', filter.providerType);
      if (filter.eventType) params.append('eventType', filter.eventType);
      if (filter.success !== null && filter.success !== undefined) {
        params.append('success', filter.success.toString());
      }

      // Use safe fetch with proper error handling
      const [logsData, statsData] = await Promise.all([
        apiCall(`delivery/webhook-logs?${params}`)
          .catch(() => ({ logs: [], total: 0, hasMore: false })),
        apiCall(`delivery/webhook-stats?timeframe=${filter.timeframe}`)
          .catch(() => generateMockWebhookStats())
      ]);

      setWebhookLogs(logsData.logs || []);
      setWebhookStats(statsData);

      if (!autoRefresh) {
        toast.success('Monitoring data refreshed');
      }

    } catch (error) {
      console.error('Failed to load monitoring data:', error);

      // Fallback to mock data
      setWebhookLogs([]);
      setWebhookStats(generateMockWebhookStats());

      if (!autoRefresh) {
        toast.error('Failed to load monitoring data');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const generateMockWebhookStats = () => ({
    totalWebhooks: 0,
    successfulWebhooks: 0,
    failedWebhooks: 0,
    successRate: 0,
    providerBreakdown: {},
    eventTypeBreakdown: {},
    timeSeriesData: [],
    recentErrors: []
  });

  const handleWebhookAction = async (action: 'test' | 'toggle', webhook: Webhook) => {
    try {
      if (action === 'test') {
        setIsLoading(true);
        const result = await apiCall(`integration/webhooks/${webhook.id}/test`, {
          method: 'POST'
        });

        if (result.success) {
          toast.success('Webhook test successful!');
        } else {
          toast.error(result.message || 'Webhook test failed');
        }
      } else if (action === 'toggle') {
        await apiCall(`integration/webhooks/${webhook.id}`, {
          method: 'PUT',
          body: JSON.stringify({ isActive: !webhook.isActive })
        });

        toast.success(`Webhook ${webhook.isActive ? 'disabled' : 'enabled'} successfully`);
        loadWebhooks();
      }
    } catch (error: any) {
      console.error(`Failed to ${action} webhook:`, error);
      toast.error(error.message || `Failed to ${action} webhook`);
    } finally {
      setIsLoading(false);
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const getStatusBadge = (isActive: boolean) => {
    return isActive ? (
      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
        <div className="w-1.5 h-1.5 bg-green-500 rounded-full mr-1"></div>
        Active
      </span>
    ) : (
      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
        <div className="w-1.5 h-1.5 bg-gray-400 rounded-full mr-1"></div>
        Inactive
      </span>
    );
  };

  const getSuccessRateBadge = (rate: number) => {
    if (rate >= 95) return 'bg-green-100 text-green-800';
    if (rate >= 80) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Webhook Management System</h2>
            <p className="text-gray-600 mt-1">
              Configure and monitor delivery provider webhook integrations
            </p>
          </div>
          <div className="flex items-center space-x-4">
            {/* Tab Buttons */}
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setActiveTab('management')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === 'management'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Cog6ToothIcon className="h-4 w-4 inline mr-2" />
                Management
              </button>
              <button
                onClick={() => setActiveTab('monitoring')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === 'monitoring'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <ChartBarIcon className="h-4 w-4 inline mr-2" />
                Monitoring
              </button>
            </div>

            {activeTab === 'management' && (
              <button
                onClick={() => setShowRegistrationModal(true)}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                <PlusIcon className="h-4 w-4 mr-2" />
                Add Webhook
              </button>
            )}

            {activeTab === 'monitoring' && (
              <>
                <button
                  onClick={() => setAutoRefresh(!autoRefresh)}
                  className={`inline-flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    autoRefresh
                      ? 'bg-green-100 text-green-800 hover:bg-green-200'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <BoltIcon className="h-4 w-4 mr-2" />
                  {autoRefresh ? 'Auto-Refresh ON' : 'Auto-Refresh OFF'}
                </button>
                <button
                  onClick={loadMonitoringData}
                  disabled={isLoading}
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {isLoading ? (
                    <ArrowPathIcon className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <ArrowPathIcon className="h-4 w-4 mr-2" />
                  )}
                  Refresh
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Management Tab Content */}
      {activeTab === 'management' && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Webhook Configurations</h3>
            <p className="text-sm text-gray-600 mt-1">
              Manage webhook endpoints for delivery provider integrations
            </p>
          </div>

          {isLoading ? (
            <div className="p-12 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-gray-500 mt-4">Loading webhooks...</p>
            </div>
          ) : webhooks.length === 0 ? (
            <div className="p-12 text-center">
              <BoltIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-lg font-medium text-gray-900 mb-2">No webhooks configured</p>
              <p className="text-gray-600 mb-6">
                Start by adding your first webhook to receive delivery provider events
              </p>
              <button
                onClick={() => setShowRegistrationModal(true)}
                className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <PlusIcon className="h-5 w-5 mr-2" />
                Add Your First Webhook
              </button>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {webhooks.map((webhook) => (
                <div key={webhook.id} className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className={`w-3 h-3 rounded-full ${webhook.isActive ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                      <div>
                        <div className="flex items-center space-x-3">
                          <h4 className="text-lg font-medium text-gray-900">
                            {getProviderDisplayName(webhook.provider)}
                          </h4>
                          {getStatusBadge(webhook.isActive)}
                          {webhook.stats.totalEvents > 0 && (
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getSuccessRateBadge(webhook.stats.successRate)}`}>
                              {webhook.stats.successRate.toFixed(1)}% success
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 mt-1 font-mono">
                          {webhook.webhookUrl}
                        </p>
                        <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                          <span>Registered: {formatDate(webhook.registeredAt)}</span>
                          {webhook.lastEventAt && (
                            <span>Last event: {formatDate(webhook.lastEventAt)}</span>
                          )}
                          <span>{webhook.stats.totalEvents} total events</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleWebhookAction('test', webhook)}
                        disabled={isLoading || !webhook.isActive}
                        className="inline-flex items-center px-3 py-1.5 text-sm text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        title="Test webhook"
                      >
                        <BeakerIcon className="h-4 w-4 mr-1" />
                        Test
                      </button>

                      <button
                        onClick={() => handleWebhookAction('toggle', webhook)}
                        disabled={isLoading}
                        className={`inline-flex items-center px-3 py-1.5 text-sm rounded-md transition-colors ${
                          webhook.isActive
                            ? 'text-red-700 bg-red-100 hover:bg-red-200'
                            : 'text-green-700 bg-green-100 hover:bg-green-200'
                        } disabled:opacity-50 disabled:cursor-not-allowed`}
                        title={webhook.isActive ? 'Disable webhook' : 'Enable webhook'}
                      >
                        {webhook.isActive ? (
                          <>
                            <PauseIcon className="h-4 w-4 mr-1" />
                            Disable
                          </>
                        ) : (
                          <>
                            <PlayIcon className="h-4 w-4 mr-1" />
                            Enable
                          </>
                        )}
                      </button>

                      <button
                        onClick={() => {
                          setSelectedWebhook(webhook);
                          setShowEditModal(true);
                        }}
                        className="inline-flex items-center px-3 py-1.5 text-sm text-blue-700 bg-blue-100 rounded-md hover:bg-blue-200 transition-colors"
                        title="Edit webhook"
                      >
                        <PencilIcon className="h-4 w-4 mr-1" />
                        Edit
                      </button>

                      <button
                        onClick={() => {
                          setSelectedWebhook(webhook);
                          setShowDeleteModal(true);
                        }}
                        className="inline-flex items-center px-3 py-1.5 text-sm text-red-700 bg-red-100 rounded-md hover:bg-red-200 transition-colors"
                        title="Delete webhook"
                      >
                        <TrashIcon className="h-4 w-4 mr-1" />
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Monitoring Tab Content */}
      {activeTab === 'monitoring' && (
        <>
          {/* Statistics Overview */}
          {webhookStats && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center">
                  <div className="p-3 rounded-full bg-blue-50">
                    <ChartBarIcon className="h-6 w-6 text-blue-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Total Webhooks</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {webhookStats.totalWebhooks.toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center">
                  <div className="p-3 rounded-full bg-green-50">
                    <CheckCircleIcon className="h-6 w-6 text-green-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Success Rate</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {webhookStats.successRate.toFixed(1)}%
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center">
                  <div className="p-3 rounded-full bg-green-50">
                    <ShieldCheckIcon className="h-6 w-6 text-green-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Successful</p>
                    <p className="text-2xl font-bold text-green-600">
                      {webhookStats.successfulWebhooks.toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center">
                  <div className="p-3 rounded-full bg-red-50">
                    <XCircleIcon className="h-6 w-6 text-red-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Failed</p>
                    <p className="text-2xl font-bold text-red-600">
                      {webhookStats.failedWebhooks.toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Filters and Logs - Rest of monitoring implementation would go here */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <p className="text-gray-600">
              Webhook monitoring logs would be displayed here based on your existing monitoring system.
            </p>
          </div>
        </>
      )}

      {/* Modals */}
      <WebhookRegistrationModal
        isOpen={showRegistrationModal}
        onClose={() => setShowRegistrationModal(false)}
        onSuccess={() => {
          loadWebhooks();
          setShowRegistrationModal(false);
        }}
      />

      <WebhookEditModal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setSelectedWebhook(null);
        }}
        onSuccess={() => {
          loadWebhooks();
          setShowEditModal(false);
          setSelectedWebhook(null);
        }}
        webhook={selectedWebhook}
      />

      <WebhookDeleteModal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setSelectedWebhook(null);
        }}
        onSuccess={() => {
          loadWebhooks();
          setShowDeleteModal(false);
          setSelectedWebhook(null);
        }}
        webhook={selectedWebhook}
      />
    </div>
  );
}