import React, { useState, useEffect } from 'react';
import { useAuth } from '../src/contexts/AuthContext';

export default function DebugAuthTest() {
  const { user, isAuthenticated, isLoading, isHydrated, login } = useAuth();
  const [email, setEmail] = useState('step2@criptext.com');
  const [password, setPassword] = useState('123456');
  const [testResults, setTestResults] = useState<any[]>([]);

  const addTestResult = (test: string, result: any) => {
    setTestResults(prev => [...prev, { test, result, timestamp: new Date().toISOString() }]);
  };

  const testLogin = async () => {
    try {
      addTestResult('Login attempt', { email, password: password.substring(0, 3) + '...' });
      await login(email, password);
      addTestResult('Login success', 'User logged in successfully');
    } catch (error) {
      addTestResult('Login failed', error instanceof Error ? error.message : 'Unknown error');
    }
  };

  const testAPICall = async () => {
    try {
      const token = localStorage.getItem('auth-token');
      if (!token) {
        addTestResult('API test failed', 'No auth token found');
        return;
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/menu/categories`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      addTestResult('API test success', `Found ${data.categories?.length || 0} categories`);
    } catch (error) {
      addTestResult('API test failed', error instanceof Error ? error.message : 'Unknown error');
    }
  };

  const testMenuProductsAPI = async () => {
    try {
      const token = localStorage.getItem('auth-token');
      if (!token) {
        addTestResult('Products API test failed', 'No auth token found');
        return;
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/menu/products/paginated`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          page: 1,
          limit: 10
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      addTestResult('Products API test success', `Found ${data.products?.length || 0} products`);
    } catch (error) {
      addTestResult('Products API test failed', error instanceof Error ? error.message : 'Unknown error');
    }
  };

  useEffect(() => {
    addTestResult('Initial state', {
      isAuthenticated,
      isLoading,
      isHydrated,
      hasUser: !!user,
      userRole: user?.role,
      hasToken: !!localStorage.getItem('auth-token')
    });
  }, [isAuthenticated, isLoading, isHydrated, user]);

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Authentication Debug Test</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Auth Status */}
        <div className="bg-white p-6 rounded-lg border">
          <h2 className="text-lg font-semibold mb-4">Authentication Status</h2>
          <div className="space-y-2 text-sm">
            <div>Is Authenticated: {isAuthenticated ? '✅' : '❌'}</div>
            <div>Is Loading: {isLoading ? '⏳' : '✅'}</div>
            <div>Is Hydrated: {isHydrated ? '✅' : '❌'}</div>
            <div>User: {user ? `${user.email} (${user.role})` : 'None'}</div>
            <div>Company ID: {user?.companyId || 'None'}</div>
            <div>Token: {localStorage.getItem('auth-token')?.substring(0, 20) + '...' || 'None'}</div>
          </div>
        </div>

        {/* Login Form */}
        <div className="bg-white p-6 rounded-lg border">
          <h2 className="text-lg font-semibold mb-4">Test Login</h2>
          <div className="space-y-4">
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-2 border rounded"
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-2 border rounded"
            />
            <button
              onClick={testLogin}
              className="w-full bg-blue-500 text-white p-2 rounded hover:bg-blue-600"
            >
              Test Login
            </button>
          </div>
        </div>

        {/* API Tests */}
        <div className="bg-white p-6 rounded-lg border">
          <h2 className="text-lg font-semibold mb-4">API Tests</h2>
          <div className="space-y-2">
            <button
              onClick={testAPICall}
              className="w-full bg-green-500 text-white p-2 rounded hover:bg-green-600"
            >
              Test Categories API
            </button>
            <button
              onClick={testMenuProductsAPI}
              className="w-full bg-purple-500 text-white p-2 rounded hover:bg-purple-600"
            >
              Test Products API
            </button>
          </div>
        </div>

        {/* Test Results */}
        <div className="bg-white p-6 rounded-lg border">
          <h2 className="text-lg font-semibold mb-4">Test Results</h2>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {testResults.map((result, index) => (
              <div key={index} className="text-xs border-b pb-2">
                <div className="font-semibold text-blue-600">{result.test}</div>
                <div className="text-gray-600">{JSON.stringify(result.result, null, 2)}</div>
                <div className="text-gray-400">{result.timestamp}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Menu Products Page Link */}
      <div className="mt-6 bg-yellow-50 p-4 rounded-lg border">
        <h3 className="font-semibold mb-2">Test Menu Products Page</h3>
        <p className="text-sm text-gray-600 mb-4">Once authenticated, test the actual menu products page:</p>
        <a
          href="/menu/products"
          className="inline-block bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          Go to Menu Products Page
        </a>
      </div>
    </div>
  );
}