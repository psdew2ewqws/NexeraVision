import React from 'react';
import { NextPage } from 'next';
import Head from 'next/head';
import { useAuth } from '@/contexts/AuthContext';
import { useLicense } from '@/contexts/LicenseContext';
import { IntegrationDashboard } from '@/features/integration-management/components/IntegrationDashboard';
import LicenseWarningHeader from '@/shared/components/LicenseWarningHeader';

const IntegrationManagementPage: NextPage = () => {
  const { user, isLoading: authLoading } = useAuth();
  const { license } = useLicense();

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    return null; // ProtectedRoute will handle redirect
  }

  // Check if user has permission to access integration management
  const hasPermission = ['super_admin', 'company_owner', 'branch_manager'].includes(user.role);

  if (!hasPermission) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h1>
          <p className="text-gray-600 mb-6">
            You don't have permission to access the Integration Management system.
          </p>
          <p className="text-sm text-gray-500">
            Required roles: Super Admin, Company Owner, or Branch Manager
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Integration Management - Restaurant Platform</title>
        <meta
          name="description"
          content="Manage POS systems, delivery providers, and real-time integrations"
        />
      </Head>

      <div className="min-h-screen bg-gray-50">
        {/* License Warning */}
        <LicenseWarningHeader />

        {/* Main Content */}
        <div className="container mx-auto">
          <IntegrationDashboard />
        </div>

        {/* License Status Footer */}
        {(license?.is_expired || (license?.days_remaining && license.days_remaining <= 7)) && (
          <div className="fixed bottom-0 left-0 right-0 bg-red-600 text-white p-2 text-center text-sm">
            {license?.is_expired
              ? "⚠️ License expired - Integration features may be limited"
              : `⚠️ License expires in ${license?.days_remaining} days`
            }
          </div>
        )}
      </div>
    </>
  );
};

// This page requires authentication
IntegrationManagementPage.displayName = 'IntegrationManagement';

export default IntegrationManagementPage;