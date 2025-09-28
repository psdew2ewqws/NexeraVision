import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number, currency = 'JOD') {
  return new Intl.NumberFormat('en-JO', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(amount);
}

export function formatDateTime(date: string | Date) {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(dateObj);
}

export function formatDate(date: string | Date) {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(dateObj);
}

export function formatRelativeTime(date: string | Date) {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - dateObj.getTime()) / 1000);

  if (diffInSeconds < 60) return 'Just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)}d ago`;
  return formatDate(dateObj);
}

export function capitalize(str: string) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export function getProviderColor(provider: string) {
  const colors = {
    careem: 'bg-green-500',
    talabat: 'bg-orange-500',
    deliveroo: 'bg-blue-500',
    uber_eats: 'bg-black',
    jahez: 'bg-purple-500',
  };
  return colors[provider as keyof typeof colors] || 'bg-gray-500';
}

export function getStatusColor(status: string) {
  const colors = {
    active: 'bg-green-500',
    healthy: 'bg-green-500',
    inactive: 'bg-gray-500',
    error: 'bg-red-500',
    critical: 'bg-red-500',
    warning: 'bg-yellow-500',
    pending: 'bg-yellow-500',
    confirmed: 'bg-blue-500',
    preparing: 'bg-orange-500',
    ready: 'bg-purple-500',
    delivered: 'bg-green-500',
    cancelled: 'bg-red-500',
  };
  return colors[status as keyof typeof colors] || 'bg-gray-500';
}

export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

export function generateId() {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

export function truncate(str: string, length: number) {
  if (str.length <= length) return str;
  return str.substring(0, length) + '...';
}