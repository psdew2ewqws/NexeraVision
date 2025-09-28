/**
 * Convert relative image URL to full backend URL for static serving
 */
export function getImageUrl(relativeUrl: string | null | undefined): string {
  if (!relativeUrl) {
    return '/api/placeholder/300x200'; // Fallback placeholder
  }

  // If already a full URL, return as is
  if (relativeUrl.startsWith('http')) {
    return relativeUrl;
  }

  // Convert relative URL to full backend URL
  // Static files are served directly (not through /api/v1)
  const backendUrl = 'http://localhost:3001';
  
  // Remove leading slash if present to avoid double slashes
  const cleanUrl = relativeUrl.startsWith('/') ? relativeUrl.slice(1) : relativeUrl;
  
  return `${backendUrl}/${cleanUrl}`;
}

/**
 * Get placeholder image URL
 */
export function getPlaceholderUrl(width = 300, height = 200): string {
  return `/api/placeholder.svg`;
}