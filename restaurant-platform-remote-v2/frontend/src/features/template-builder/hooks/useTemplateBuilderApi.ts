import { useState, useCallback } from 'react';
import axios from 'axios';
import {
  Template,
  TemplateCategory,
  TemplateComponent,
  TemplateSearchParams,
  TemplateRenderRequest,
  TemplateRenderResult
} from '../types/template.types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}

interface Printer {
  id: string;
  name: string;
  type: string;
  status: string;
  isOnline: boolean;
  capabilities?: string[];
  location?: string;
}

interface TestPrintRequest {
  templateId: string;
  printerId?: string;
  textContent?: string;
  escPosContent?: string;
  contentType?: string;
  sampleData?: any;
}

interface UseTemplateBuilderApiReturn {
  // Categories
  getCategories: () => Promise<TemplateCategory[]>;

  // Templates
  getTemplates: (params?: TemplateSearchParams) => Promise<PaginatedResponse<Template>>;
  getTemplate: (id: string) => Promise<Template>;
  createTemplate: (data: Partial<Template>) => Promise<Template>;
  updateTemplate: (id: string, data: Partial<Template>) => Promise<Template>;
  deleteTemplate: (id: string) => Promise<void>;
  duplicateTemplate: (id: string, name: string) => Promise<Template>;

  // Components
  getComponents: (templateId: string) => Promise<TemplateComponent[]>;
  createComponent: (data: Partial<TemplateComponent>) => Promise<TemplateComponent>;
  updateComponent: (id: string, data: Partial<TemplateComponent>) => Promise<TemplateComponent>;
  deleteComponent: (id: string) => Promise<void>;

  // Rendering
  renderTemplate: (data: TemplateRenderRequest) => Promise<TemplateRenderResult>;
  generatePreview: (templateId: string, sampleData?: any) => Promise<TemplateRenderResult>;
  validateTemplate: (templateId: string) => Promise<{ isValid: boolean; errors: string[] }>;
  testPrint: (templateId: string, sampleData?: any) => Promise<{ success: boolean; message: string }>;
  testPrintWithPrinter: (request: TestPrintRequest) => Promise<{ success: boolean; message: string; printerName?: string }>;

  // Printer operations
  getAvailablePrinters: () => Promise<Printer[]>;
  getPrinterStatus: (printerId: string) => Promise<{ status: string; isOnline: boolean }>;
  validateTemplateForPrinter: (templateId: string, printerId: string) => Promise<{ compatible: boolean; warnings: string[] }>;

  // Bulk operations
  bulkDeleteTemplates: (templateIds: string[]) => Promise<{ success: number; failed: number; results: any[] }>;
  bulkUpdateTemplateStatus: (templateIds: string[], isActive: boolean) => Promise<{ success: number; failed: number; results: any[] }>;

  // Loading states
  isLoading: boolean;
  error: string | null;
}

export const useTemplateBuilderApi = (): UseTemplateBuilderApiReturn => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getAuthHeaders = () => {
    const token = localStorage.getItem('auth-token');
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
  };

  const handleApiCall = useCallback(async <T>(apiCall: () => Promise<T>): Promise<T> => {
    try {
      setIsLoading(true);
      setError(null);
      const result = await apiCall();
      return result;
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'An error occurred';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Categories
  const getCategories = useCallback(async (): Promise<TemplateCategory[]> => {
    return handleApiCall(async () => {
      const response = await axios.get(`${API_BASE}/api/v1/template-builder/categories`, {
        headers: getAuthHeaders()
      });
      return response.data;
    });
  }, [handleApiCall]);

  // Templates
  const getTemplates = useCallback(async (params?: TemplateSearchParams): Promise<PaginatedResponse<Template>> => {
    return handleApiCall(async () => {
      const response = await axios.get(`${API_BASE}/api/v1/template-builder/templates`, {
        headers: getAuthHeaders(),
        params
      });
      return {
        data: response.data.templates,
        pagination: response.data.pagination
      };
    });
  }, [handleApiCall]);

  const getTemplate = useCallback(async (id: string): Promise<Template> => {
    return handleApiCall(async () => {
      const response = await axios.get(`${API_BASE}/api/v1/template-builder/templates/${id}`, {
        headers: getAuthHeaders()
      });
      return response.data;
    });
  }, [handleApiCall]);

  const createTemplate = useCallback(async (data: Partial<Template>): Promise<Template> => {
    return handleApiCall(async () => {
      const response = await axios.post(`${API_BASE}/api/v1/template-builder/templates`, data, {
        headers: getAuthHeaders()
      });
      return response.data;
    });
  }, [handleApiCall]);

  const updateTemplate = useCallback(async (id: string, data: Partial<Template>): Promise<Template> => {
    return handleApiCall(async () => {
      const response = await axios.put(`${API_BASE}/api/v1/template-builder/templates/${id}`, data, {
        headers: getAuthHeaders()
      });
      return response.data;
    });
  }, [handleApiCall]);

  const deleteTemplate = useCallback(async (id: string): Promise<void> => {
    return handleApiCall(async () => {
      await axios.delete(`${API_BASE}/api/v1/template-builder/templates/${id}`, {
        headers: getAuthHeaders()
      });
    });
  }, [handleApiCall]);

  const duplicateTemplate = useCallback(async (id: string, name: string): Promise<Template> => {
    return handleApiCall(async () => {
      const response = await axios.post(`${API_BASE}/api/v1/template-builder/templates/${id}/duplicate`,
        { name },
        {
          headers: getAuthHeaders()
        }
      );
      return response.data;
    });
  }, [handleApiCall]);

  // Components
  const getComponents = useCallback(async (templateId: string): Promise<TemplateComponent[]> => {
    return handleApiCall(async () => {
      const response = await axios.get(`${API_BASE}/api/v1/template-builder/templates/${templateId}/components`, {
        headers: getAuthHeaders()
      });
      return response.data;
    });
  }, [handleApiCall]);

  const createComponent = useCallback(async (data: Partial<TemplateComponent>): Promise<TemplateComponent> => {
    return handleApiCall(async () => {
      const response = await axios.post(`${API_BASE}/api/v1/template-builder/components`, data, {
        headers: getAuthHeaders()
      });
      return response.data;
    });
  }, [handleApiCall]);

  const updateComponent = useCallback(async (id: string, data: Partial<TemplateComponent>): Promise<TemplateComponent> => {
    return handleApiCall(async () => {
      const response = await axios.put(`${API_BASE}/api/v1/template-builder/components/${id}`, data, {
        headers: getAuthHeaders()
      });
      return response.data;
    });
  }, [handleApiCall]);

  const deleteComponent = useCallback(async (id: string): Promise<void> => {
    return handleApiCall(async () => {
      await axios.delete(`${API_BASE}/api/v1/template-builder/components/${id}`, {
        headers: getAuthHeaders()
      });
    });
  }, [handleApiCall]);

  // Rendering
  const renderTemplate = useCallback(async (data: TemplateRenderRequest): Promise<TemplateRenderResult> => {
    return handleApiCall(async () => {
      const response = await axios.post(`${API_BASE}/api/v1/template-builder/render`, data, {
        headers: getAuthHeaders()
      });
      return response.data;
    });
  }, [handleApiCall]);

  const generatePreview = useCallback(async (templateId: string, sampleData?: any): Promise<TemplateRenderResult> => {
    return handleApiCall(async () => {
      const response = await axios.post(`${API_BASE}/api/v1/template-builder/preview`,
        { templateId, sampleData },
        {
          headers: getAuthHeaders()
        }
      );
      return response.data;
    });
  }, [handleApiCall]);

  const validateTemplate = useCallback(async (templateId: string): Promise<{ isValid: boolean; errors: string[] }> => {
    return handleApiCall(async () => {
      const response = await axios.get(`${API_BASE}/api/v1/template-builder/templates/${templateId}/validate`, {
        headers: getAuthHeaders()
      });
      return response.data;
    });
  }, [handleApiCall]);

  const testPrint = useCallback(async (templateId: string, sampleData?: any): Promise<{ success: boolean; message: string }> => {
    return handleApiCall(async () => {
      const response = await axios.post(`${API_BASE}/api/v1/template-builder/test-print`,
        { templateId, sampleData },
        {
          headers: getAuthHeaders()
        }
      );
      return response.data;
    });
  }, [handleApiCall]);

  // Bulk operations
  const bulkDeleteTemplates = useCallback(async (templateIds: string[]) => {
    return handleApiCall(async () => {
      const response = await axios.post(`${API_BASE}/api/v1/template-builder/templates/bulk-delete`,
        { templateIds },
        {
          headers: getAuthHeaders()
        }
      );
      return response.data;
    });
  }, [handleApiCall]);

  const bulkUpdateTemplateStatus = useCallback(async (templateIds: string[], isActive: boolean) => {
    return handleApiCall(async () => {
      const response = await axios.post(`${API_BASE}/api/v1/template-builder/templates/bulk-update-status`,
        { templateIds, isActive },
        {
          headers: getAuthHeaders()
        }
      );
      return response.data;
    });
  }, [handleApiCall]);

  // Enhanced test print with printer selection
  const testPrintWithPrinter = useCallback(async (request: TestPrintRequest): Promise<{ success: boolean; message: string; printerName?: string }> => {
    return handleApiCall(async () => {
      const response = await axios.post(`${API_BASE}/api/v1/template-builder/test-print`, request, {
        headers: getAuthHeaders()
      });
      return response.data;
    });
  }, [handleApiCall]);

  // Printer operations
  const getAvailablePrinters = useCallback(async (): Promise<Printer[]> => {
    return handleApiCall(async () => {
      const response = await axios.get(`${API_BASE}/api/v1/printing/printers`, {
        headers: getAuthHeaders()
      });
      return response.data.data || response.data;
    });
  }, [handleApiCall]);

  const getPrinterStatus = useCallback(async (printerId: string): Promise<{ status: string; isOnline: boolean }> => {
    return handleApiCall(async () => {
      const response = await axios.get(`${API_BASE}/api/v1/printing/printers/${printerId}`, {
        headers: getAuthHeaders()
      });
      return {
        status: response.data.status,
        isOnline: response.data.isOnline
      };
    });
  }, [handleApiCall]);

  const validateTemplateForPrinter = useCallback(async (templateId: string, printerId: string): Promise<{ compatible: boolean; warnings: string[] }> => {
    return handleApiCall(async () => {
      const response = await axios.post(`${API_BASE}/api/v1/template-builder/validate-for-printer`,
        { templateId, printerId },
        {
          headers: getAuthHeaders()
        }
      );
      return response.data;
    });
  }, [handleApiCall]);

  return {
    // Categories
    getCategories,

    // Templates
    getTemplates,
    getTemplate,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    duplicateTemplate,

    // Components
    getComponents,
    createComponent,
    updateComponent,
    deleteComponent,

    // Rendering
    renderTemplate,
    generatePreview,
    validateTemplate,
    testPrint,
    testPrintWithPrinter,

    // Printer operations
    getAvailablePrinters,
    getPrinterStatus,
    validateTemplateForPrinter,

    // Bulk operations
    bulkDeleteTemplates,
    bulkUpdateTemplateStatus,

    // State
    isLoading,
    error
  };
}

