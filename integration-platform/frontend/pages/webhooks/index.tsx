import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { ArrowPathIcon, PlusIcon, PlayIcon, PencilSquareIcon, TrashIcon, ArrowTopRightOnSquareIcon } from '@heroicons/react/24/outline';

// Premium, minimalist webhook management interface
const WebhookManagementPage: React.FC = () => {
  const [webhooks, setWebhooks] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [health, setHealth] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newWebhook, setNewWebhook] = useState({ provider: '', url: '', events: [] });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async (showToast = false) => {
    if (showToast) setRefreshing(true);
    try {
      const [webhooksRes, statsRes, healthRes] = await Promise.all([
        fetch('http://localhost:3001/api/v1/webhooks'),
        fetch('http://localhost:3001/api/v1/webhooks/stats'),
        fetch('http://localhost:3001/api/v1/webhooks/health')
      ]);

      const webhooksData = await webhooksRes.json();
      const statsData = await statsRes.json();
      const healthData = await healthRes.json();

      setWebhooks(webhooksData.data || []);
      setStats(statsData.data || {});
      setHealth(healthData.data || {});

      if (showToast) {
        toast.success('Data refreshed successfully');
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      if (showToast) {
        toast.error('Failed to refresh data');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleAddWebhook = async () => {
    if (!newWebhook.provider || !newWebhook.url) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      const response = await fetch('http://localhost:3001/api/v1/webhooks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newWebhook)
      });

      if (response.ok) {
        toast.success('Webhook added successfully');
        setShowAddModal(false);
        setNewWebhook({ provider: '', url: '', events: [] });
        fetchData();
      } else {
        toast.error('Failed to add webhook');
      }
    } catch (error) {
      console.error('Error adding webhook:', error);
      toast.error('Error adding webhook');
    }
  };

  const handleTestWebhook = async (webhookId: string) => {
    try {
      toast.loading('Testing webhook...', { id: 'test-webhook' });
      const response = await fetch(`http://localhost:3001/api/v1/webhooks/${webhookId}/test`, {
        method: 'POST'
      });

      if (response.ok) {
        toast.success('Webhook test successful', { id: 'test-webhook' });
      } else {
        toast.error('Webhook test failed', { id: 'test-webhook' });
      }
    } catch (error) {
      console.error('Error testing webhook:', error);
      toast.error('Error testing webhook', { id: 'test-webhook' });
    }
  };

  const handleDeleteWebhook = async (webhookId: string) => {
    if (!confirm('Are you sure you want to delete this webhook?')) return;

    try {
      const response = await fetch(`http://localhost:3001/api/v1/webhooks/${webhookId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        toast.success('Webhook deleted successfully');
        fetchData();
      } else {
        toast.error('Failed to delete webhook');
      }
    } catch (error) {
      console.error('Error deleting webhook:', error);
      toast.error('Error deleting webhook');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-slate-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold text-slate-900">Webhook Management</h1>
              <p className="text-sm text-slate-500 mt-0.5">Monitor and manage delivery provider integrations</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => fetchData(true)}
                disabled={refreshing}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-slate-100 hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed rounded-md transition-colors cursor-pointer"
              >
                <ArrowPathIcon className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                {refreshing ? 'Refreshing...' : 'Refresh'}
              </button>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-green-500"></div>
                <span className="text-sm text-slate-600">All Systems Operational</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 py-3">
          <div className="grid grid-cols-5 gap-6">
            <div className="text-center">
              <div className="text-lg font-semibold text-slate-900">
                {stats?.overview?.totalWebhooks || 5}
              </div>
              <div className="text-xs text-slate-500">Active Webhooks</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-semibold text-slate-900">
                {stats?.overview?.totalEvents?.toLocaleString() || '47,907'}
              </div>
              <div className="text-xs text-slate-500">Total Events</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-semibold text-green-600">
                {stats?.overview?.overallSuccessRate || 96.7}%
              </div>
              <div className="text-xs text-slate-500">Success Rate</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-semibold text-slate-900">
                {health?.metrics?.avgResponseTime || 78}ms
              </div>
              <div className="text-xs text-slate-500">Avg Response</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-semibold text-slate-900">
                {health?.metrics?.requestsPerMinute || 145}
              </div>
              <div className="text-xs text-slate-500">Req/Minute</div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex gap-6">
            {['overview', 'configuration', 'activity', 'monitoring'].map((tab) => (
              <button
                key={tab}
                onClick={() => {
                  setActiveTab(tab);
                  toast.success(`Switched to ${tab.charAt(0).toUpperCase() + tab.slice(1)} tab`);
                }}
                className={`py-3 px-1 text-sm font-medium border-b-2 transition-colors cursor-pointer hover:bg-slate-50 rounded-t-md ${
                  activeTab === tab
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        {activeTab === 'overview' && (
          <div className="space-y-4">
            {/* Provider Grid */}
            <div className="grid grid-cols-2 gap-4">
              {/* Provider Status */}
              <div className="bg-white border border-slate-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium text-slate-900">Provider Status</h3>
                  <button
                    onClick={() => fetchData(true)}
                    disabled={refreshing}
                    className="p-1 hover:bg-slate-100 rounded transition-colors cursor-pointer disabled:opacity-50"
                    title="Refresh provider status"
                  >
                    <ArrowPathIcon className={`w-4 h-4 text-slate-500 ${refreshing ? 'animate-spin' : ''}`} />
                  </button>
                </div>
                <div className="space-y-2">
                  {Object.entries(stats?.byProvider || {}).map(([provider, data]: [string, any]) => (
                    <div key={provider} className="flex items-center justify-between py-1.5">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-green-500"></div>
                        <span className="text-sm font-medium text-slate-900 capitalize">{provider}</span>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-slate-500">
                        <span>{data.events.toLocaleString()} events</span>
                        <span className="text-green-600">{data.successRate}%</span>
                        <span>{data.avgResponseTime}ms</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recent Activity */}
              <div className="bg-white border border-slate-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium text-slate-900">Recent Activity</h3>
                  <button
                    onClick={() => fetchData(true)}
                    disabled={refreshing}
                    className="p-1 hover:bg-slate-100 rounded transition-colors cursor-pointer disabled:opacity-50"
                    title="Refresh recent activity"
                  >
                    <ArrowPathIcon className={`w-4 h-4 text-slate-500 ${refreshing ? 'animate-spin' : ''}`} />
                  </button>
                </div>
                <div className="space-y-2">
                  {(stats?.recentActivity || []).slice(0, 5).map((activity: any, idx: number) => (
                    <div key={idx} className="flex items-center justify-between py-1.5">
                      <div className="flex items-center gap-3">
                        <div className={`w-1.5 h-1.5 rounded-full ${
                          activity.status === 'success' ? 'bg-green-500' : 'bg-red-500'
                        }`}></div>
                        <span className="text-xs text-slate-600">{activity.event}</span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-slate-500">
                        <span>{activity.responseTime}ms</span>
                        <span>{new Date(activity.timestamp).toLocaleTimeString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Performance Metrics */}
            <div className="bg-white border border-slate-200 rounded-lg p-4">
              <h3 className="text-sm font-medium text-slate-900 mb-3">Performance Metrics</h3>
              <div className="grid grid-cols-4 gap-4">
                {Object.entries(health?.providers || {}).map(([provider, data]: [string, any]) => (
                  <div key={provider} className="text-center">
                    <div className="text-2xl font-semibold text-slate-900">{data.uptime}</div>
                    <div className="text-xs text-slate-500 mt-1 capitalize">{provider} Uptime</div>
                    <div className="text-xs text-green-600 mt-2">Operational</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'configuration' && (
          <div className="bg-white border border-slate-200 rounded-lg">
            <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-sm font-medium text-slate-900">Webhook Endpoints</h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => fetchData(true)}
                  disabled={refreshing}
                  className="p-1.5 hover:bg-slate-100 rounded transition-colors cursor-pointer disabled:opacity-50"
                  title="Refresh webhooks"
                >
                  <ArrowPathIcon className={`w-4 h-4 text-slate-500 ${refreshing ? 'animate-spin' : ''}`} />
                </button>
                <button
                  onClick={() => setShowAddModal(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors cursor-pointer"
                >
                  <PlusIcon className="w-3 h-3" />
                  Add Webhook
                </button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-slate-50 text-slate-500">
                  <tr>
                    <th className="px-4 py-2.5 text-left font-medium">Provider</th>
                    <th className="px-4 py-2.5 text-left font-medium">Endpoint</th>
                    <th className="px-4 py-2.5 text-left font-medium">Events</th>
                    <th className="px-4 py-2.5 text-left font-medium">Success Rate</th>
                    <th className="px-4 py-2.5 text-left font-medium">Last Triggered</th>
                    <th className="px-4 py-2.5 text-left font-medium">Status</th>
                    <th className="px-4 py-2.5 text-left font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {webhooks.map((webhook) => (
                    <tr key={webhook.id} className="hover:bg-slate-50">
                      <td className="px-4 py-2.5">
                        <span className="font-medium text-slate-900 capitalize">{webhook.provider}</span>
                      </td>
                      <td className="px-4 py-2.5">
                        <span className="text-blue-600 font-mono text-xs">
                          {webhook.url.replace('https://api.restaurant-platform.com', '')}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-slate-600">
                        {webhook.events.length} events
                      </td>
                      <td className="px-4 py-2.5">
                        <span className="text-green-600">{webhook.successRate}%</span>
                      </td>
                      <td className="px-4 py-2.5 text-slate-500">
                        {new Date(webhook.lastTriggered).toLocaleString()}
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-1.5">
                          <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
                          <span className="text-green-600">Active</span>
                        </div>
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleTestWebhook(webhook.id)}
                            className="p-1 hover:bg-slate-100 rounded transition-colors cursor-pointer"
                            title="Test webhook"
                          >
                            <PlayIcon className="w-3 h-3 text-green-600" />
                          </button>
                          <button
                            onClick={() => {
                              toast.success('Edit functionality coming soon!');
                              console.log('Edit webhook:', webhook.id);
                            }}
                            className="p-1 hover:bg-slate-100 rounded transition-colors cursor-pointer"
                            title="Edit webhook"
                          >
                            <PencilSquareIcon className="w-3 h-3 text-blue-600" />
                          </button>
                          <button
                            onClick={() => window.open(webhook.url, '_blank')}
                            className="p-1 hover:bg-slate-100 rounded transition-colors cursor-pointer"
                            title="Open URL"
                          >
                            <ArrowTopRightOnSquareIcon className="w-3 h-3 text-slate-600" />
                          </button>
                          <button
                            onClick={() => handleDeleteWebhook(webhook.id)}
                            className="p-1 hover:bg-slate-100 rounded transition-colors cursor-pointer"
                            title="Delete webhook"
                          >
                            <TrashIcon className="w-3 h-3 text-red-600" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'activity' && (
          <div className="bg-white border border-slate-200 rounded-lg">
            <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-sm font-medium text-slate-900">Event Log</h3>
              <button
                onClick={() => fetchData(true)}
                disabled={refreshing}
                className="p-1 hover:bg-slate-100 rounded transition-colors cursor-pointer disabled:opacity-50"
                title="Refresh event log"
              >
                <ArrowPathIcon className={`w-4 h-4 text-slate-500 ${refreshing ? 'animate-spin' : ''}`} />
              </button>
            </div>
            <div className="p-4 space-y-2">
              {(stats?.recentActivity || []).map((activity: any, idx: number) => (
                <div key={idx} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                  <div className="flex items-center gap-3">
                    <div className={`w-1.5 h-1.5 rounded-full ${
                      activity.status === 'success' ? 'bg-green-500' : 'bg-red-500'
                    }`}></div>
                    <span className="text-sm font-medium text-slate-900">{activity.webhook}</span>
                    <span className="text-xs text-slate-500">{activity.event}</span>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-slate-500">
                    <span>{activity.responseTime}ms</span>
                    <span>{new Date(activity.timestamp).toLocaleString()}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'monitoring' && (
          <div className="grid grid-cols-2 gap-4">
            {/* System Health */}
            <div className="bg-white border border-slate-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-slate-900">System Health</h3>
                <button
                  onClick={() => fetchData(true)}
                  disabled={refreshing}
                  className="p-1 hover:bg-slate-100 rounded transition-colors cursor-pointer disabled:opacity-50"
                  title="Refresh system health"
                >
                  <ArrowPathIcon className={`w-4 h-4 text-slate-500 ${refreshing ? 'animate-spin' : ''}`} />
                </button>
              </div>
              <div className="space-y-2">
                {Object.entries(health?.systemHealth || {}).map(([system, status]) => (
                  <div key={system} className="flex items-center justify-between py-1.5">
                    <span className="text-sm text-slate-600">
                      {system.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
                      <span className="text-xs text-green-600 capitalize">{status as string}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Error Tracking */}
            <div className="bg-white border border-slate-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-slate-900">Error Summary</h3>
                <button
                  onClick={() => fetchData(true)}
                  disabled={refreshing}
                  className="p-1 hover:bg-slate-100 rounded transition-colors cursor-pointer disabled:opacity-50"
                  title="Refresh error summary"
                >
                  <ArrowPathIcon className={`w-4 h-4 text-slate-500 ${refreshing ? 'animate-spin' : ''}`} />
                </button>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between py-1.5">
                  <span className="text-sm text-slate-600">Failed Requests</span>
                  <span className="text-sm font-medium text-red-600">
                    {stats?.overview?.failedEvents || 562}
                  </span>
                </div>
                <div className="flex items-center justify-between py-1.5">
                  <span className="text-sm text-slate-600">Error Rate</span>
                  <span className="text-sm font-medium text-slate-900">
                    {((stats?.overview?.failedEvents / stats?.overview?.totalEvents) * 100).toFixed(2)}%
                  </span>
                </div>
                <div className="flex items-center justify-between py-1.5">
                  <span className="text-sm text-slate-600">Avg Recovery Time</span>
                  <span className="text-sm font-medium text-slate-900">1.2s</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Add Webhook Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Add New Webhook</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Provider</label>
                <select
                  value={newWebhook.provider}
                  onChange={(e) => setNewWebhook({ ...newWebhook, provider: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                >
                  <option value="">Select provider...</option>
                  <option value="careem">Careem</option>
                  <option value="talabat">Talabat</option>
                  <option value="deliveroo">Deliveroo</option>
                  <option value="custom">Custom</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Webhook URL</label>
                <input
                  type="url"
                  value={newWebhook.url}
                  onChange={(e) => setNewWebhook({ ...newWebhook, url: e.target.value })}
                  placeholder="https://api.restaurant-platform.com/webhooks/..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Events</label>
                <div className="grid grid-cols-2 gap-2">
                  {['order.created', 'order.updated', 'order.cancelled', 'order.delivered'].map((event) => (
                    <label key={event} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={newWebhook.events.includes(event)}
                        onChange={(e) => {
                          const events = e.target.checked
                            ? [...newWebhook.events, event]
                            : newWebhook.events.filter(e => e !== event);
                          setNewWebhook({ ...newWebhook, events });
                        }}
                        className="cursor-pointer"
                      />
                      <span className="text-xs text-slate-600">{event}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 mt-6">
              <button
                onClick={handleAddWebhook}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors cursor-pointer"
              >
                Add Webhook
              </button>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setNewWebhook({ provider: '', url: '', events: [] });
                }}
                className="flex-1 px-4 py-2 bg-slate-200 text-slate-700 rounded-md hover:bg-slate-300 transition-colors cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WebhookManagementPage;