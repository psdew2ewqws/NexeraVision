'use client';

import { useState } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/contexts/auth-context';
import Sidebar from './sidebar';
import Header from './header';

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  // Pages that don't require authentication
  const publicPages = ['/login', '/menu', '/orders', '/dashboard', '/integrations', '/webhooks', '/webhooks/configuration', '/monitoring/dashboard'];

  // Don't show layout on login page
  if (router.pathname === '/login') {
    return <>{children}</>;
  }

  // For public demo pages, show the layout without auth check
  if (publicPages.includes(router.pathname)) {
    return (
      <div className="h-screen flex">
        <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

        <div className="lg:pl-72 flex flex-col flex-1">
          <Header setSidebarOpen={setSidebarOpen} />

          <main className="flex-1 overflow-auto">
            <div className="p-4 sm:p-6 lg:p-8">{children}</div>
          </main>
        </div>
      </div>
    );
  }

  // Show loading spinner while checking auth
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    router.replace('/login');
    return null;
  }

  return (
    <div className="h-screen flex">
      <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

      <div className="lg:pl-72 flex flex-col flex-1">
        <Header setSidebarOpen={setSidebarOpen} />

        <main className="flex-1 overflow-auto">
          <div className="p-4 sm:p-6 lg:p-8">{children}</div>
        </main>
      </div>
    </div>
  );
}