// Debug page to manually test authentication
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';

export default function DebugAuth() {
  const router = useRouter();
  const [authData, setAuthData] = useState<any>(null);

  useEffect(() => {
    // Check current auth state
    const token = localStorage.getItem('auth-token');
    const user = localStorage.getItem('user');
    setAuthData({ token: token?.substring(0, 50) + '...', user: user ? JSON.parse(user) : null });
  }, []);

  const setDemoAuth = () => {
    const demoToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxZWMwMmRlYy05YTgxLTQ3M2EtOWNkZi0zMTQ1NGUyZTk1OWEiLCJlbWFpbCI6ImFkbWluQHJlc3RhdXJhbnRwbGF0Zm9ybS5jb20iLCJyb2xlIjoic3VwZXJfYWRtaW4iLCJjb21wYW55SWQiOiJkYzNjNmExMC05NmM2LTQ0NjctOTc3OC0zMTNhZjY2OTU2YWYiLCJicmFuY2hJZCI6IjQwZjg2M2U3LWI3MTktNDE0Mi04ZTk0LTcyNDU3MjAwMmQ5YiIsImlhdCI6MTc1Nzc1NzA1MiwiZXhwIjoxNzU3ODQzNDUyfQ.sbLj-C4UQZ3lfzJAsA-CT97a_9BL86kNf32ul08-vL4";
    const demoUser = {
      id: "1ec02dec-9a81-473a-9cdf-31454e2e959a",
      email: "admin@restaurantplatform.com",
      name: "System Administrator",
      role: "super_admin",
      companyId: "dc3c6a10-96c6-4467-9778-313af66956af",
      branchId: "40f863e7-b719-4142-8e94-724572002d9b",
      company: {
        id: "dc3c6a10-96c6-4467-9778-313af66956af",
        name: "Default Restaurant"
      }
    };

    localStorage.setItem('auth-token', demoToken);
    localStorage.setItem('user', JSON.stringify(demoUser));
    
    // Force reload to trigger AuthContext hydration
    window.location.reload();
  };

  const clearAuth = () => {
    localStorage.removeItem('auth-token');
    localStorage.removeItem('user');
    setAuthData(null);
  };

  const testMenuPage = () => {
    router.push('/menu/products');
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold mb-8">Authentication Debug</h1>
        
        <div className="bg-white p-6 rounded-lg shadow mb-6">
          <h2 className="text-lg font-semibold mb-4">Current Auth State</h2>
          <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto">
            {JSON.stringify(authData, null, 2)}
          </pre>
        </div>

        <div className="bg-white p-6 rounded-lg shadow mb-6">
          <h2 className="text-lg font-semibold mb-4">Actions</h2>
          <div className="space-y-4">
            <button 
              onClick={setDemoAuth}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              Set Demo Authentication
            </button>
            
            <button 
              onClick={clearAuth}
              className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 ml-4"
            >
              Clear Authentication
            </button>

            <button 
              onClick={testMenuPage}
              className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 ml-4"
            >
              Test Menu/Products Page
            </button>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4">Instructions</h2>
          <ol className="list-decimal list-inside space-y-2 text-sm">
            <li>Click "Set Demo Authentication" to set valid auth tokens</li>
            <li>Page will reload to trigger AuthContext hydration</li>
            <li>Click "Test Menu/Products Page" to navigate to the menu page</li>
            <li>Check browser console for any authentication logs</li>
          </ol>
        </div>
      </div>
    </div>
  );
}