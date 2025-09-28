import { useState, useCallback } from 'react';
import { Template, TemplateSearchParams, TemplateRenderRequest } from '../types/template.types';

// Mock API endpoints - replace with actual API calls
const API_BASE = '/api/template-builder';

interface UseTemplateApiReturn {
  loading: boolean;
  error: string | null;
  createTemplate: (template: Partial<Template>) => Promise<Template>;
  updateTemplate: (id: string, updates: Partial<Template>) => Promise<Template>;
  deleteTemplate: (id: string) => Promise<void>;
  getTemplate: (id: string) => Promise<Template>;
  searchTemplates: (params: TemplateSearchParams) => Promise<{ data: Template[]; total: number }>;
  duplicateTemplate: (id: string, name?: string) => Promise<Template>;
  renderTemplate: (request: TemplateRenderRequest) => Promise<any>;
  testPrint: (templateId: string, printerId?: string, testData?: any) => Promise<any>;
}

export function useTemplateApi(): UseTemplateApiReturn {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const apiCall = useCallback(async <T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE}${endpoint}`, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        ...options,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const createTemplate = useCallback(async (template: Partial<Template>): Promise<Template> => {
    return await apiCall<Template>('/templates', {
      method: 'POST',
      body: JSON.stringify(template),
    });
  }, [apiCall]);

  const updateTemplate = useCallback(async (id: string, updates: Partial<Template>): Promise<Template> => {
    return await apiCall<Template>(`/templates/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  }, [apiCall]);

  const deleteTemplate = useCallback(async (id: string): Promise<void> => {
    await apiCall<void>(`/templates/${id}`, {
      method: 'DELETE',
    });
  }, [apiCall]);

  const getTemplate = useCallback(async (id: string): Promise<Template> => {
    return await apiCall<Template>(`/templates/${id}`);
  }, [apiCall]);

  const searchTemplates = useCallback(async (params: TemplateSearchParams) => {
    const searchParams = new URLSearchParams();

    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        if (Array.isArray(value)) {
          value.forEach(v => searchParams.append(key, v.toString()));
        } else {
          searchParams.append(key, value.toString());
        }
      }
    });

    return await apiCall<{ data: Template[]; total: number }>(`/templates?${searchParams}`);
  }, [apiCall]);

  const duplicateTemplate = useCallback(async (id: string, name?: string): Promise<Template> => {
    return await apiCall<Template>(`/templates/${id}/duplicate`, {
      method: 'POST',
      body: JSON.stringify({ name }),
    });
  }, [apiCall]);

  const renderTemplate = useCallback(async (request: TemplateRenderRequest) => {
    return await apiCall<any>('/templates/render', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }, [apiCall]);

  const testPrint = useCallback(async (templateId: string, printerId?: string, testData?: any) => {
    return await apiCall<any>(`/templates/${templateId}/test-print`, {
      method: 'POST',
      body: JSON.stringify({ printerId, testData }),
    });
  }, [apiCall]);

  return {
    loading,
    error,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    getTemplate,
    searchTemplates,
    duplicateTemplate,
    renderTemplate,
    testPrint,
  };
}