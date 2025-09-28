'use client';

import Link from 'next/link';
import { useRouter } from 'next/router';
import {
  HomeIcon,
  CogIcon,
  ChartBarIcon,
  DocumentTextIcon,
  ClipboardDocumentListIcon,
  MapIcon,
  BoltIcon,
  BuildingStorefrontIcon
} from '@heroicons/react/24/outline';
import { cn } from '@/lib/utils';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: HomeIcon },
  { name: 'Integrations', href: '/integrations', icon: BuildingStorefrontIcon },
  { name: 'Orders', href: '/orders', icon: ClipboardDocumentListIcon },
  { name: 'Menu Sync', href: '/menu', icon: DocumentTextIcon },
  { name: 'Webhooks', href: '/webhooks', icon: BoltIcon },
  { name: 'Settings', href: '/settings', icon: CogIcon },
];

export default function Navigation() {
  const router = useRouter();

  return (
    <nav className="space-y-1">
      {navigation.map((item) => {
        const isActive = router.pathname.startsWith(item.href);
        return (
          <Link
            key={item.name}
            href={item.href}
            className={cn(
              'group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors duration-150',
              isActive
                ? 'bg-primary text-primary-foreground'
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
            )}
          >
            <item.icon
              className={cn(
                'mr-3 h-5 w-5 flex-shrink-0',
                isActive ? 'text-primary-foreground' : 'text-gray-400 group-hover:text-gray-500'
              )}
              aria-hidden="true"
            />
            {item.name}
          </Link>
        );
      })}
    </nav>
  );
}