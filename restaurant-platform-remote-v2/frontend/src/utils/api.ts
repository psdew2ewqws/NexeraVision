import envValidation from './env-validation';

export const getApiUrl = (): string => {
  return envValidation.getApiUrl();
};

export const getApiBaseUrl = (): string => {
  return envValidation.getApiUrl().replace('/api/v1', '');
};

export const createApiUrl = (endpoint: string): string => {
  const baseUrl = getApiUrl();
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
  return `${baseUrl}/${cleanEndpoint}`;
};

// Common headers for API requests
export const getAuthHeaders = (): Record<string, string> => {
  const token = localStorage.getItem('auth-token');
  return {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
  };
};

// Utility function for making authenticated API calls
export const apiCall = async (
  endpoint: string,
  options: RequestInit = {}
): Promise<any> => {
  const url = endpoint.startsWith('http') ? endpoint : createApiUrl(endpoint);
  
  const response = await fetch(url, {
    ...options,
    headers: {
      ...getAuthHeaders(),
      ...options.headers,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API call failed: ${response.status} - ${errorText}`);
  }

  return response.json();
};

export default {
  getApiUrl,
  getApiBaseUrl,
  createApiUrl,
  getAuthHeaders,
  apiCall,
};