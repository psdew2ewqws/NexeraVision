import { NextPageContext } from 'next';
import Head from 'next/head';
import Link from 'next/link';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';

interface ErrorProps {
  statusCode?: number;
  hasGetInitialPropsRun?: boolean;
  err?: Error;
}

function Error({ statusCode, hasGetInitialPropsRun, err }: ErrorProps) {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <Head>
        <title>{statusCode ? `${statusCode} - Error` : 'Client Error'} | Restaurant Platform</title>
      </Head>
      
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <div className="text-center">
            <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-red-500" />
            <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
              {statusCode ? `Error ${statusCode}` : 'Client Error'}
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              {statusCode
                ? statusCode === 404
                  ? 'This page could not be found.'
                  : `A ${statusCode} error occurred on server.`
                : 'An error occurred on client.'}
            </p>
            {err && process.env.NODE_ENV === 'development' && (
              <div className="mt-4 text-left">
                <details className="bg-red-50 border border-red-200 rounded p-3">
                  <summary className="text-sm font-medium text-red-800 cursor-pointer">
                    Error Details (Development)
                  </summary>
                  <pre className="mt-2 text-xs text-red-700 whitespace-pre-wrap">
                    {err.stack || err.message}
                  </pre>
                </details>
              </div>
            )}
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

Error.getInitialProps = ({ res, err }: NextPageContext) => {
  const statusCode = res ? res.statusCode : err ? err.statusCode : 404;
  return { statusCode };
};

export default Error;