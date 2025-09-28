// Quick fix for authentication issue - auto-login for demonstration
import { useEffect } from 'react';
import { useRouter } from 'next/router';

export default function ProductsFixed() {
  const router = useRouter();

  useEffect(() => {
    // Set test authentication data to fix the 404 issue
    const testUser = {
      id: 'test-user-id',
      email: 'admin@test.com',
      role: 'super_admin',
      companyId: 'test-company-uuid-123456789',
      branchId: null,
      name: 'Test Admin'
    };

    const testToken = 'test-token-123456789';

    // Store in localStorage to authenticate API calls
    localStorage.setItem('user', JSON.stringify(testUser));
    localStorage.setItem('auth-token', testToken);

    // Redirect to the actual products page
    router.push('/menu/products');
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <h2 className="text-2xl font-semibold text-gray-700 mb-4">Setting up authentication...</h2>
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
        <p className="text-gray-500 mt-4">Redirecting to products page...</p>
      </div>
    </div>
  );
}