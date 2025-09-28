import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import {
  SparklesIcon,
  ArrowLeftIcon,
  ChartBarIcon,
  LightBulbIcon,
  DocumentDuplicateIcon,
  EyeIcon,
  PlusIcon
} from '@heroicons/react/24/outline';
import { ProtectedRoute } from '../../src/components/ProtectedRoute';
import { AITemplateGenerator } from '../../src/components/templates/AITemplateGenerator';
import { useAuth } from '../../src/contexts/AuthContext';
import toast from 'react-hot-toast';

interface TemplateAnalytics {
  totalGenerations: number;
  successRate: number;
  averageGenerationTime: number;
  mostPopularIndustry: string;
  trendsData: {
    month: string;
    generations: number;
    success: number;
  }[];
}

export default function AITemplateGeneratorPage() {
  const { user } = useAuth();
  const [analytics, setAnalytics] = useState<TemplateAnalytics | null>(null);
  const [recentGenerations, setRecentGenerations] = useState<any[]>([]);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPageData();
  }, []);

  const loadPageData = async () => {
    try {
      // Load analytics, recent generations, and suggestions in parallel
      const [analyticsRes, suggestionsRes] = await Promise.all([
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/templates/ai/trends`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('auth-token')}` }
        }),
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/templates/ai/suggestions?industry=restaurant&type=receipt&limit=5`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('auth-token')}` }
        })
      ]);

      if (analyticsRes.ok) {
        const analyticsData = await analyticsRes.json();
        setAnalytics(analyticsData.data);
      }

      if (suggestionsRes.ok) {
        const suggestionsData = await suggestionsRes.json();
        setSuggestions(suggestionsData.templates || []);
      }
    } catch (error) {
      console.error('Failed to load page data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTemplateGenerated = (templates: any[]) => {
    toast.success(`Generated ${templates.length} AI templates successfully!`);

    // Refresh analytics after generation
    loadPageData();
  };

  const AnalyticsCard = ({ title, value, subtitle, icon: Icon, color = 'blue' }: {
    title: string;
    value: string | number;
    subtitle?: string;
    icon: any;
    color?: string;
  }) => (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center">
        <div className={`flex-shrink-0 p-3 bg-${color}-100 rounded-lg`}>
          <Icon className={`w-6 h-6 text-${color}-600`} />
        </div>
        <div className="ml-4 flex-1">
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-semibold text-gray-900">{value}</p>
          {subtitle && (
            <p className="text-sm text-gray-500">{subtitle}</p>
          )}
        </div>
      </div>
    </div>
  );

  const SuggestionCard = ({ template }: { template: any }) => (
    <div className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="font-medium text-gray-900">{template.name}</h3>
          <p className="text-sm text-gray-500">{template.description}</p>
        </div>
        <div className="flex items-center text-yellow-500">
          <span className="text-sm font-medium mr-1">{template.averageRating}</span>
          <span>⭐</span>
        </div>
      </div>

      <div className="flex flex-wrap gap-1 mb-3">
        {template.tags?.slice(0, 3).map((tag: string) => (
          <span key={tag} className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
            {tag}
          </span>
        ))}
      </div>

      <div className="flex justify-between items-center text-sm">
        <span className="text-gray-500">
          {template.usageCount.toLocaleString()} uses
        </span>
        <div className="space-x-2">
          <button className="text-blue-600 hover:text-blue-700">
            <EyeIcon className="w-4 h-4 inline mr-1" />
            Preview
          </button>
          <button className="text-green-600 hover:text-green-700">
            <PlusIcon className="w-4 h-4 inline mr-1" />
            Use
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <ProtectedRoute allowedRoles={['super_admin', 'company_owner', 'branch_manager']}>
      <Head>
        <title>AI Template Generator - Restaurant Platform</title>
        <meta name="description" content="Generate optimized print templates with artificial intelligence" />
      </Head>

      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center space-x-4">
                <Link href="/dashboard" className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors">
                  <ArrowLeftIcon className="w-4 h-4 mr-2" />
                  Dashboard
                </Link>
                <div className="h-6 w-px bg-gray-300"></div>
                <div className="flex items-center space-x-2">
                  <SparklesIcon className="w-5 h-5 text-purple-600" />
                  <div>
                    <h1 className="text-lg font-semibold text-gray-900">AI Template Generator</h1>
                    <p className="text-sm text-gray-500">Create optimized templates with artificial intelligence</p>
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <Link
                  href="/templates"
                  className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
                >
                  <DocumentDuplicateIcon className="w-4 h-4 mr-2" />
                  My Templates
                </Link>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">

            {/* Main Content - AI Generator */}
            <div className="lg:col-span-3">
              <AITemplateGenerator
                onTemplateGenerated={handleTemplateGenerated}
                className="mb-8"
              />

              {/* Recent Generations */}
              {recentGenerations.length > 0 && (
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Recent Generations</h3>
                  <div className="space-y-3">
                    {recentGenerations.map((generation, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <p className="font-medium text-gray-900">{generation.industry} • {generation.printType}</p>
                          <p className="text-sm text-gray-500">{generation.templatesGenerated} templates • {generation.timeAgo}</p>
                        </div>
                        <button className="text-blue-600 hover:text-blue-700 text-sm font-medium">
                          View Results
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Sidebar */}
            <div className="lg:col-span-1 space-y-6">

              {/* Analytics Cards */}
              {analytics && (
                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-gray-900">Generation Stats</h3>

                  <AnalyticsCard
                    title="Total Generations"
                    value={analytics.totalGenerations}
                    subtitle="This month"
                    icon={SparklesIcon}
                    color="purple"
                  />

                  <AnalyticsCard
                    title="Success Rate"
                    value={`${Math.round(analytics.successRate * 100)}%`}
                    subtitle="Template quality"
                    icon={ChartBarIcon}
                    color="green"
                  />

                  <AnalyticsCard
                    title="Avg Generation Time"
                    value={`${(analytics.averageGenerationTime / 1000).toFixed(1)}s`}
                    subtitle="Processing speed"
                    icon={LightBulbIcon}
                    color="blue"
                  />
                </div>
              )}

              {/* Popular Templates */}
              {suggestions.length > 0 && (
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Popular Templates</h3>
                  <div className="space-y-3">
                    {suggestions.map((template) => (
                      <SuggestionCard key={template.id} template={template} />
                    ))}
                  </div>

                  <div className="mt-4">
                    <Link
                      href="/templates/marketplace"
                      className="block text-center py-2 px-4 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                    >
                      Browse All Templates
                    </Link>
                  </div>
                </div>
              )}

              {/* AI Tips */}
              <div className="bg-gradient-to-br from-purple-50 to-blue-50 border border-purple-200 rounded-lg p-4">
                <div className="flex items-center mb-3">
                  <LightBulbIcon className="w-5 h-5 text-purple-600 mr-2" />
                  <h3 className="font-medium text-purple-900">AI Tips</h3>
                </div>
                <ul className="text-sm text-purple-800 space-y-2">
                  <li>• Be specific about your business features</li>
                  <li>• Include key data requirements</li>
                  <li>• Mention your target customer type</li>
                  <li>• Specify any brand guidelines</li>
                  <li>• Consider paper size limitations</li>
                </ul>
              </div>

              {/* Quick Actions */}
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <h3 className="font-medium text-gray-900 mb-3">Quick Actions</h3>
                <div className="space-y-2">
                  <Link
                    href="/templates/builder"
                    className="block w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-md"
                  >
                    Template Builder
                  </Link>
                  <Link
                    href="/printing/settings"
                    className="block w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-md"
                  >
                    Printer Settings
                  </Link>
                  <Link
                    href="/templates/analytics"
                    className="block w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-md"
                  >
                    View Analytics
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}