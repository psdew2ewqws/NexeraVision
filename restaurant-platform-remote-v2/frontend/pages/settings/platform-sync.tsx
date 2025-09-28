import { NextPage } from 'next';
import Head from 'next/head';

const PlatformSyncPage: NextPage = () => {
  return (
    <>
      <Head>
        <title>Platform Sync Dashboard - Restaurant Platform</title>
        <meta name="description" content="Platform menu synchronization" />
      </Head>

      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold text-gray-900">Platform Sync Dashboard</h1>
          <p className="mt-2 text-gray-600">
            Platform synchronization feature coming soon.
          </p>
        </div>
      </div>
    </>
  );
};

export default PlatformSyncPage;