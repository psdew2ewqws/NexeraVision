/**
 * Centralized API Configuration
 *
 * This file provides a single source of truth for all API URL configuration.
 * All API calls throughout the application MUST use these utilities to prevent
 * URL duplication issues.
 */

/**
 * Get the base API URL without any path suffix
 * @returns Base URL (e.g., http://localhost:3001)
 */
export function getBaseUrl(): string {
  const envUrl = process.env.NEXT_PUBLIC_API_URL || '';

  // If env var includes /api/v1, strip it to get base
  if (envUrl.includes('/api/v1')) {
    return envUrl.replace('/api/v1', '');
  }

  // Default fallback
  return envUrl || 'http://localhost:3001';
}

/**
 * Get the complete API URL with /api/v1 prefix
 * @returns Full API base URL (e.g., http://localhost:3001/api/v1)
 */
export function getApiUrl(): string {
  return `${getBaseUrl()}/api/v1`;
}

/**
 * Build a full API endpoint URL
 * @param endpoint - The endpoint path (should start with /, e.g., '/auth/login')
 * @returns Complete URL (e.g., http://localhost:3001/api/v1/auth/login)
 */
export function buildApiUrl(endpoint: string): string {
  // Ensure endpoint starts with /
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${getApiUrl()}${cleanEndpoint}`;
}

/**
 * API Configuration object for easy access
 */
export const API_CONFIG = {
  baseUrl: getBaseUrl(),
  apiUrl: getApiUrl(),
  buildUrl: buildApiUrl,
} as const;

// Export for backward compatibility
export const API_BASE_URL = getApiUrl();
