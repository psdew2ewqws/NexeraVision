import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import ProtectedRoute from 'src/components/ProtectedRoute';
import LicenseWarningHeader from 'src/components/LicenseWarningHeader';
import OrderTrackingDashboard from 'src/components/features/delivery/OrderTrackingDashboard';
import { useAuth } from 'src/contexts/AuthContext';

export default function LiveOrders() {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(false);
  }, []);

  if (isLoading) {
    return (
      <ProtectedRoute allowedRoles={['super_admin', 'company_owner', 'branch_manager', 'call_center']}>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute allowedRoles={['super_admin', 'company_owner', 'branch_manager', 'call_center']}>
      <Head>
        <title>Live Orders - Restaurant Platform</title>
        <meta name="description" content="Real-time order tracking and monitoring dashboard" />
      </Head>
      
      <LicenseWarningHeader />
      
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-none mx-auto px-2 sm:px-4 lg:px-6 py-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <Link href="/dashboard" className="mr-4">
                  <ArrowLeftIcon className="h-6 w-6 text-gray-600 hover:text-gray-800 transition-colors" />
                </Link>
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">Live Orders</h1>
                  <p className="mt-2 text-gray-600">
                    Real-time order monitoring and tracking dashboard
                  </p>
                </div>
              </div>
              
              {/* Quick Stats */}
              <div className="hidden lg:flex space-x-4">
                <div className="bg-white px-4 py-2 rounded-lg border border-gray-200 shadow-sm">
                  <div className="text-lg font-bold text-blue-600">Live</div>
                  <div className="text-sm text-gray-600">Updates</div>
                </div>
                <div className="bg-white px-4 py-2 rounded-lg border border-gray-200 shadow-sm">
                  <div className="text-lg font-bold text-green-600">Real-time</div>
                  <div className="text-sm text-gray-600">Tracking</div>
                </div>
              </div>
            </div>
          </div>

          {/* Order Tracking Dashboard */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <OrderTrackingDashboard 
              branchId={user?.role === 'branch_manager' ? user?.branchId : undefined}
              companyId={user?.role !== 'super_admin' ? user?.companyId : undefined}
            />
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}