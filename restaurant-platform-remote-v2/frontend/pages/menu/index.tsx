import { useEffect } from 'react';
import { useRouter } from 'next/router';
import ProtectedRoute from '../../src/components/shared/ProtectedRoute';

/**
 * Redirect page - /menu now redirects to /menu/list
 * This prevents duplicate menu functionality and maintains a single source of truth
 */
export default function MenuIndexRedirect() {
  const router = useRouter();

  useEffect(() => {
    // Immediately redirect to /menu/list
    router.replace('/menu/list');
  }, [router]);

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Redirecting to Menu Management...</p>
        </div>
      </div>
    </ProtectedRoute>
  );
}
