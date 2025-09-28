// Platform Menu Builder - Main page for next-level menu management
import React from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../../src/contexts/AuthContext';
import { useLanguage } from '../../src/contexts/LanguageContext';
import { ProtectedRoute } from '../../src/components/shared/ProtectedRoute';
import { PlatformMenuManager } from '../../src/features/menu-builder/components/PlatformMenuManager';

export default function PlatformMenuBuilderPage() {
  const { user } = useAuth();
  const { language, t } = useLanguage();

  return (
    <ProtectedRoute>
      <Head>
        <title>Platform Menu Builder - Restaurant Management</title>
        <meta name="description" content="Advanced platform-specific menu management with drag-and-drop builder" />
      </Head>

      <div className="min-h-screen bg-gray-50">
        {/* Professional Header */}
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              {/* Navigation with Back Button */}
              <div className="flex items-center space-x-4">
                <Link
                  href="/dashboard"
                  className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
                >
                  <ArrowLeftIcon className="w-4 h-4 mr-2" />
                  Dashboard
                </Link>
                <div className="h-6 w-px bg-gray-300"></div>
                <div className="flex items-center space-x-2">
                  <div>
                    <h1 className="text-lg font-semibold text-gray-900">Platform Menu Builder</h1>
                    <p className="text-sm text-gray-500">Advanced menu management for multiple platforms</p>
                  </div>
                </div>
              </div>

              {/* User Info */}
              <div className="flex items-center space-x-3">
                <div className="text-sm text-gray-500">
                  {user?.email}
                </div>
                <div className={`px-2 py-1 text-xs font-medium rounded-full ${
                  user?.role === 'super_admin'
                    ? 'bg-purple-100 text-purple-800'
                    : user?.role === 'company_owner'
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-green-100 text-green-800'
                }`}>
                  {user?.role?.replace('_', ' ')}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Platform Menu Manager */}
        <div className="h-[calc(100vh-64px)]">
          <PlatformMenuManager />
        </div>
      </div>
    </ProtectedRoute>
  );
}