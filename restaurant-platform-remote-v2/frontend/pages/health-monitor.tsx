import React from 'react';
import { GetServerSideProps } from 'next';
import Head from 'next/head';
import { useAuth } from '../src/contexts/AuthContext';
import HealthMonitoringDashboard from '../src/components/health/HealthMonitoringDashboard';

/**
 * Health Monitor Page
 *
 * Provides real-time monitoring of all platform services and pages
 * - System health overview
 * - Service status monitoring
 * - Page accessibility checks
 * - Performance metrics
 * - Critical issue alerts
 */

const HealthMonitorPage: React.FC = () => {
  const { user, isLoading } = useAuth();

  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading health monitor...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>System Health Monitor - Restaurant Platform</title>
        <meta
          name="description"
          content="Real-time monitoring dashboard for Restaurant Platform services and pages"
        />
        <meta name="robots" content="noindex" />
      </Head>

      <div className="min-h-screen bg-gray-50">
        <HealthMonitoringDashboard />
      </div>
    </>
  );
};

export default HealthMonitorPage;

// No authentication required for health monitoring
// This allows checking system health even when auth is broken
export const getServerSideProps: GetServerSideProps = async (context) => {
  return {
    props: {},
  };
};