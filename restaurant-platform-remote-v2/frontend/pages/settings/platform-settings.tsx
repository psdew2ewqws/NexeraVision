import React from 'react';
import Head from 'next/head';
import { useAuth } from '../../src/contexts/AuthContext';
import { ProtectedRoute } from '../../src/components/shared/ProtectedRoute';
import { PlatformSettings } from '../../src/features/menu/components/PlatformSettings';

export default function PlatformSettingsPage() {
  const { user, isLoading, isAuthenticated } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <ProtectedRoute allowedRoles={['super_admin', 'company_owner']}>
      <Head>
        <title>Platform Settings - Restaurant Platform</title>
        <meta name="description" content="Manage delivery channel assignments and synchronization settings" />
      </Head>

      <PlatformSettings />
    </ProtectedRoute>
  );
}