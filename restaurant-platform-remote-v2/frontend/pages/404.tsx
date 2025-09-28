import Head from 'next/head';
import Link from 'next/link';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';

export default function Custom404() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <Head>
        <title>404 - Page Not Found | Restaurant Platform</title>
      </Head>
      
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <div className="text-center">
            <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
              404 - Page Not Found
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              Sorry, we couldn't find the page you're looking for.
            </p>
            <div className="mt-6">
              <Link
                href="/"
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Go back home
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}