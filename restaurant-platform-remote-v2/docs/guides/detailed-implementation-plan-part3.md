# Implementation Plan Part 3: Frontend Components & Testing

## Task 3.3: Template Canvas Component

File: `/home/admin/restaurant-platform-remote-v2/frontend/src/features/template-builder/components/TemplateCanvas.tsx`

```typescript
import React, { useRef, useEffect } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { useTemplateBuilderStore } from '../../../stores/templateBuilderStore';
import { CanvasComponent } from './CanvasComponent';

export const TemplateCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLDivElement>(null);
  const {
    currentTemplate,
    selectedComponentId,
    canvasZoom,
    showGrid,
    gridSize,
    selectComponent,
    clearSelection,
  } = useTemplateBuilderStore();

  const { setNodeRef } = useDroppable({
    id: 'canvas',
  });

  const handleCanvasClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      clearSelection();
    }
  };

  const canvasSettings = currentTemplate?.designData.settings || {
    width: 576,
    height: 800,
    margins: { top: 10, bottom: 10, left: 5, right: 5 },
  };

  const gridPattern = showGrid ? `
    <defs>
      <pattern id="grid" width="${gridSize}" height="${gridSize}" patternUnits="userSpaceOnUse">
        <path d="M ${gridSize} 0 L 0 0 0 ${gridSize}" fill="none" stroke="#e0e0e0" stroke-width="0.5"/>
      </pattern>
    </defs>
    <rect width="100%" height="100%" fill="url(#grid)" />
  ` : '';

  return (
    <div className="flex-1 bg-gray-100 p-4 overflow-auto">
      <div className="flex justify-center">
        <div
          ref={setNodeRef}
          className="bg-white shadow-lg border relative"
          style={{
            width: canvasSettings.width * canvasZoom,
            height: canvasSettings.height * canvasZoom,
            transform: `scale(${canvasZoom})`,
            transformOrigin: 'top center',
            minHeight: '400px',
          }}
          onClick={handleCanvasClick}
        >
          {/* Grid overlay */}
          {showGrid && (
            <svg
              className="absolute inset-0 pointer-events-none"
              width="100%"
              height="100%"
              style={{ zIndex: 1 }}
            >
              <defs>
                <pattern
                  id="grid"
                  width={gridSize}
                  height={gridSize}
                  patternUnits="userSpaceOnUse"
                >
                  <path
                    d={`M ${gridSize} 0 L 0 0 0 ${gridSize}`}
                    fill="none"
                    stroke="#e0e0e0"
                    strokeWidth="0.5"
                  />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#grid)" />
            </svg>
          )}

          {/* Template components */}
          {currentTemplate?.designData.components.map((component) => (
            <CanvasComponent
              key={component.id}
              component={component}
              isSelected={selectedComponentId === component.id}
              onSelect={() => selectComponent(component.id)}
            />
          ))}

          {/* Canvas info overlay */}
          <div className="absolute top-2 left-2 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded">
            {currentTemplate?.paperSize || '80mm'} • {canvasSettings.width}x{canvasSettings.height}px
          </div>
        </div>
      </div>
    </div>
  );
};
```

## Task 3.4: Canvas Component (Draggable Items)

File: `/home/admin/restaurant-platform-remote-v2/frontend/src/features/template-builder/components/CanvasComponent.tsx`

```typescript
import React from 'react';
import { useDraggable } from '@dnd-kit/core';
import { TemplateComponent } from '../../../stores/templateBuilderStore';

interface CanvasComponentProps {
  component: TemplateComponent;
  isSelected: boolean;
  onSelect: () => void;
}

export const CanvasComponent: React.FC<CanvasComponentProps> = ({
  component,
  isSelected,
  onSelect,
}) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: component.id,
    data: {
      type: 'canvas-component',
      component,
    },
  });

  const style = {
    position: 'absolute' as const,
    left: component.position.x,
    top: component.position.y,
    width: component.position.width,
    height: component.position.height,
    zIndex: component.zIndex + 10,
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    opacity: isDragging ? 0.5 : 1,
  };

  const renderComponentContent = () => {
    const props = component.properties;

    switch (component.type) {
      case 'text':
        return (
          <div
            className="text-component h-full flex items-center"
            style={{
              fontSize: props.fontSize || 14,
              fontWeight: props.fontWeight || 'normal',
              textAlign: props.textAlign || 'left',
              color: props.color || '#000000',
              padding: '2px',
            }}
          >
            {props.content || 'Sample Text'}
          </div>
        );

      case 'barcode':
        return (
          <div className="barcode-component h-full flex flex-col items-center justify-center bg-gray-100 border text-xs">
            <div className="font-mono text-center">||||| ||||| |||||</div>
            {props.showText && (
              <div className="mt-1 text-xs">{props.data || '123456789'}</div>
            )}
          </div>
        );

      case 'qr':
        return (
          <div className="qr-component h-full flex items-center justify-center bg-gray-100 border">
            <div className="grid grid-cols-8 gap-px">
              {Array.from({ length: 64 }).map((_, i) => (
                <div
                  key={i}
                  className={`w-1 h-1 ${Math.random() > 0.5 ? 'bg-black' : 'bg-white'}`}
                />
              ))}
            </div>
          </div>
        );

      case 'table':
        return (
          <div className="table-component h-full overflow-hidden border">
            <table className="w-full text-xs">
              {props.headers && (
                <thead>
                  <tr className="bg-gray-100">
                    {props.headers.map((header: string, i: number) => (
                      <th key={i} className="border px-1 py-0.5 text-left">
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
              )}
              <tbody>
                {props.rows?.slice(0, 3).map((row: string[], i: number) => (
                  <tr key={i}>
                    {row.map((cell: string, j: number) => (
                      <td key={j} className="border px-1 py-0.5">
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );

      case 'line':
        return (
          <div
            className="line-component h-full flex items-center"
            style={{ color: props.color || '#000000' }}
          >
            <div
              className="w-full"
              style={{
                height: props.thickness || 1,
                backgroundColor: props.color || '#000000',
                borderTop: props.style === 'dashed' ? '1px dashed' : props.style === 'dotted' ? '1px dotted' : '1px solid',
                borderColor: props.color || '#000000',
              }}
            />
          </div>
        );

      case 'image':
        return (
          <div className="image-component h-full bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center text-gray-500 text-xs">
            {props.src ? (
              <img src={props.src} alt="Template" className="max-w-full max-h-full object-contain" />
            ) : (
              <span>Image Placeholder</span>
            )}
          </div>
        );

      default:
        return (
          <div className="default-component h-full bg-gray-200 border flex items-center justify-center text-xs text-gray-600">
            {component.type}
          </div>
        );
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`canvas-component cursor-pointer border-2 ${
        isSelected ? 'border-blue-500 shadow-lg' : 'border-transparent hover:border-gray-300'
      } ${component.isLocked ? 'cursor-not-allowed opacity-75' : ''}`}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
      {...listeners}
      {...attributes}
    >
      {renderComponentContent()}

      {/* Selection handles */}
      {isSelected && !component.isLocked && (
        <>
          <div className="absolute -top-1 -left-1 w-2 h-2 bg-blue-500 border border-white" />
          <div className="absolute -top-1 -right-1 w-2 h-2 bg-blue-500 border border-white" />
          <div className="absolute -bottom-1 -left-1 w-2 h-2 bg-blue-500 border border-white" />
          <div className="absolute -bottom-1 -right-1 w-2 h-2 bg-blue-500 border border-white" />
        </>
      )}

      {/* Lock indicator */}
      {component.isLocked && (
        <div className="absolute top-0 right-0 bg-red-500 text-white text-xs px-1 rounded-bl">
          🔒
        </div>
      )}
    </div>
  );
};
```

## Task 3.5: Component Library Panel

File: `/home/admin/restaurant-platform-remote-v2/frontend/src/features/template-builder/components/ComponentLibrary.tsx`

```typescript
import React from 'react';
import { useDraggable } from '@dnd-kit/core';

interface DraggableComponentProps {
  type: string;
  label: string;
  icon: string;
  description: string;
}

const DraggableComponent: React.FC<DraggableComponentProps> = ({
  type,
  label,
  icon,
  description,
}) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `library-${type}`,
    data: {
      type: 'component-library',
      componentType: type,
    },
  });

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
    opacity: isDragging ? 0.5 : 1,
  } : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="component-library-item p-3 border border-gray-200 rounded-lg cursor-grab hover:border-blue-300 hover:shadow-md transition-all duration-200 bg-white"
      {...listeners}
      {...attributes}
    >
      <div className="flex items-center space-x-3">
        <div className="text-2xl">{icon}</div>
        <div className="flex-1">
          <div className="font-medium text-sm text-gray-900">{label}</div>
          <div className="text-xs text-gray-500">{description}</div>
        </div>
      </div>
    </div>
  );
};

export const ComponentLibrary: React.FC = () => {
  const componentTypes = [
    {
      type: 'text',
      label: 'Text',
      icon: '📝',
      description: 'Add text content',
    },
    {
      type: 'barcode',
      label: 'Barcode',
      icon: '📊',
      description: 'Add barcode',
    },
    {
      type: 'qr',
      label: 'QR Code',
      icon: '🔲',
      description: 'Add QR code',
    },
    {
      type: 'table',
      label: 'Table',
      icon: '📋',
      description: 'Add data table',
    },
    {
      type: 'line',
      label: 'Line',
      icon: '➖',
      description: 'Add separator line',
    },
    {
      type: 'image',
      label: 'Image',
      icon: '🖼️',
      description: 'Add image',
    },
  ];

  return (
    <div className="component-library p-4">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Components</h3>
      <div className="space-y-3">
        {componentTypes.map((component) => (
          <DraggableComponent
            key={component.type}
            type={component.type}
            label={component.label}
            icon={component.icon}
            description={component.description}
          />
        ))}
      </div>

      <div className="mt-6 p-4 bg-blue-50 rounded-lg">
        <h4 className="font-medium text-blue-900 mb-2">How to use</h4>
        <p className="text-sm text-blue-700">
          Drag components from this panel onto the canvas to build your template.
        </p>
      </div>
    </div>
  );
};
```

---

# PHASE 4: INTEGRATION & TESTING (4-6 hours)

## Task 4.1: API Integration Service

File: `/home/admin/restaurant-platform-remote-v2/frontend/src/services/templateBuilderApi.ts`

```typescript
import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export interface ApiTemplate {
  id: string;
  name: string;
  description?: string;
  categoryId: string;
  designData: any;
  paperSize: string;
  orientation: string;
  isDefault: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ApiTemplateCategory {
  id: string;
  name: string;
  type: string;
  description?: string;
  icon?: string;
  sortOrder: number;
}

class TemplateBuilderApiService {
  private getHeaders() {
    const token = localStorage.getItem('access_token');
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
  }

  // Categories
  async getCategories(): Promise<ApiTemplateCategory[]> {
    const response = await axios.get(
      `${API_BASE_URL}/api/v1/template-builder/categories`,
      { headers: this.getHeaders() }
    );
    return response.data;
  }

  // Templates
  async getTemplates(branchId?: string): Promise<ApiTemplate[]> {
    const params = branchId ? { branchId } : {};
    const response = await axios.get(
      `${API_BASE_URL}/api/v1/template-builder/templates`,
      {
        headers: this.getHeaders(),
        params
      }
    );
    return response.data;
  }

  async getTemplate(id: string): Promise<ApiTemplate> {
    const response = await axios.get(
      `${API_BASE_URL}/api/v1/template-builder/templates/${id}`,
      { headers: this.getHeaders() }
    );
    return response.data;
  }

  async createTemplate(template: Partial<ApiTemplate>): Promise<ApiTemplate> {
    const response = await axios.post(
      `${API_BASE_URL}/api/v1/template-builder/templates`,
      template,
      { headers: this.getHeaders() }
    );
    return response.data;
  }

  async updateTemplate(id: string, template: Partial<ApiTemplate>): Promise<ApiTemplate> {
    const response = await axios.put(
      `${API_BASE_URL}/api/v1/template-builder/templates/${id}`,
      template,
      { headers: this.getHeaders() }
    );
    return response.data;
  }

  async deleteTemplate(id: string): Promise<void> {
    await axios.delete(
      `${API_BASE_URL}/api/v1/template-builder/templates/${id}`,
      { headers: this.getHeaders() }
    );
  }

  async duplicateTemplate(id: string): Promise<ApiTemplate> {
    const response = await axios.post(
      `${API_BASE_URL}/api/v1/template-builder/templates/${id}/duplicate`,
      {},
      { headers: this.getHeaders() }
    );
    return response.data;
  }

  // Preview and rendering
  async generatePreview(id: string, sampleData: any): Promise<{ imageUrl: string }> {
    const response = await axios.post(
      `${API_BASE_URL}/api/v1/template-builder/templates/${id}/preview`,
      sampleData,
      { headers: this.getHeaders() }
    );
    return response.data;
  }

  async renderTemplate(id: string, printData: any): Promise<{ success: boolean; data: number[]; size: number }> {
    const response = await axios.post(
      `${API_BASE_URL}/api/v1/template-builder/templates/${id}/render`,
      printData,
      { headers: this.getHeaders() }
    );
    return response.data;
  }
}

export const templateBuilderApi = new TemplateBuilderApiService();
```

## Task 4.2: Integration Hook

File: `/home/admin/restaurant-platform-remote-v2/frontend/src/hooks/useTemplateBuilderApi.ts`

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { templateBuilderApi, ApiTemplate } from '../services/templateBuilderApi';
import { useTemplateBuilderStore } from '../stores/templateBuilderStore';
import { toast } from 'react-hot-toast';

export const useTemplateBuilderApi = () => {
  const queryClient = useQueryClient();
  const { setTemplates, setCategories, setCurrentTemplate } = useTemplateBuilderStore();

  // Categories query
  const categoriesQuery = useQuery({
    queryKey: ['template-categories'],
    queryFn: templateBuilderApi.getCategories,
    onSuccess: (data) => {
      setCategories(data);
    },
  });

  // Templates query
  const templatesQuery = useQuery({
    queryKey: ['templates'],
    queryFn: () => templateBuilderApi.getTemplates(),
    onSuccess: (data) => {
      setTemplates(data);
    },
  });

  // Create template mutation
  const createTemplateMutation = useMutation({
    mutationFn: templateBuilderApi.createTemplate,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['templates'] });
      setCurrentTemplate(data);
      toast.success('Template created successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to create template');
    },
  });

  // Update template mutation
  const updateTemplateMutation = useMutation({
    mutationFn: ({ id, template }: { id: string; template: Partial<ApiTemplate> }) =>
      templateBuilderApi.updateTemplate(id, template),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['templates'] });
      setCurrentTemplate(data);
      toast.success('Template updated successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to update template');
    },
  });

  // Delete template mutation
  const deleteTemplateMutation = useMutation({
    mutationFn: templateBuilderApi.deleteTemplate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates'] });
      toast.success('Template deleted successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to delete template');
    },
  });

  // Duplicate template mutation
  const duplicateTemplateMutation = useMutation({
    mutationFn: templateBuilderApi.duplicateTemplate,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['templates'] });
      setCurrentTemplate(data);
      toast.success('Template duplicated successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to duplicate template');
    },
  });

  // Generate preview mutation
  const generatePreviewMutation = useMutation({
    mutationFn: ({ id, sampleData }: { id: string; sampleData: any }) =>
      templateBuilderApi.generatePreview(id, sampleData),
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to generate preview');
    },
  });

  return {
    // Queries
    categories: categoriesQuery.data || [],
    templates: templatesQuery.data || [],
    isLoadingCategories: categoriesQuery.isLoading,
    isLoadingTemplates: templatesQuery.isLoading,

    // Mutations
    createTemplate: createTemplateMutation.mutate,
    updateTemplate: updateTemplateMutation.mutate,
    deleteTemplate: deleteTemplateMutation.mutate,
    duplicateTemplate: duplicateTemplateMutation.mutate,
    generatePreview: generatePreviewMutation.mutate,

    // Loading states
    isCreating: createTemplateMutation.isPending,
    isUpdating: updateTemplateMutation.isPending,
    isDeleting: deleteTemplateMutation.isPending,
    isDuplicating: duplicateTemplateMutation.isPending,
    isGeneratingPreview: generatePreviewMutation.isPending,

    // Utility functions
    refetchTemplates: () => queryClient.invalidateQueries({ queryKey: ['templates'] }),
    refetchCategories: () => queryClient.invalidateQueries({ queryKey: ['template-categories'] }),
  };
};
```

---

# PHASE 5: TESTING & VALIDATION

## Task 5.1: Backend Tests

File: `/home/admin/restaurant-platform-remote-v2/backend/src/modules/template-builder/template-builder.service.spec.ts`

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { TemplateBuilderService } from './template-builder.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('TemplateBuilderService', () => {
  let service: TemplateBuilderService;
  let prisma: PrismaService;

  const mockPrismaService = {
    templateCategory: {
      findMany: jest.fn(),
    },
    printTemplateAdvanced: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    templateVersion: {
      create: jest.fn(),
    },
    templateUsageAnalytics: {
      create: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TemplateBuilderService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<TemplateBuilderService>(TemplateBuilderService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getCategories', () => {
    it('should return active categories ordered by sortOrder', async () => {
      const mockCategories = [
        { id: '1', name: 'Receipt', type: 'receipt', sortOrder: 1, isActive: true },
        { id: '2', name: 'Kitchen', type: 'kitchen', sortOrder: 2, isActive: true },
      ];

      mockPrismaService.templateCategory.findMany.mockResolvedValue(mockCategories);

      const result = await service.getCategories();

      expect(result).toEqual(mockCategories);
      expect(mockPrismaService.templateCategory.findMany).toHaveBeenCalledWith({
        where: { isActive: true },
        orderBy: { sortOrder: 'asc' },
      });
    });
  });

  describe('createTemplate', () => {
    it('should create a new template with default design data', async () => {
      const mockTemplate = {
        id: '123',
        name: 'Test Template',
        categoryId: 'cat1',
        companyId: 'comp1',
        createdBy: 'user1',
      };

      const mockCreatedTemplate = {
        ...mockTemplate,
        designData: {
          components: [],
          settings: {
            width: 576,
            height: 800,
            margins: { top: 10, bottom: 10, left: 5, right: 5 },
          },
        },
        category: { id: 'cat1', name: 'Receipt' },
        components: [],
      };

      mockPrismaService.printTemplateAdvanced.create.mockResolvedValue(mockCreatedTemplate);
      mockPrismaService.templateVersion.create.mockResolvedValue({});

      const result = await service.createTemplate(mockTemplate, 'user1', 'comp1');

      expect(result).toEqual(mockCreatedTemplate);
      expect(mockPrismaService.printTemplateAdvanced.create).toHaveBeenCalled();
      expect(mockPrismaService.templateVersion.create).toHaveBeenCalled();
    });
  });
});
```

## Task 5.2: Frontend Tests

File: `/home/admin/restaurant-platform-remote-v2/frontend/src/features/template-builder/__tests__/TemplateBuilder.test.tsx`

```typescript
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { DndContext } from '@dnd-kit/core';
import { TemplateBuilder } from '../TemplateBuilder';
import { useTemplateBuilderStore } from '../../../stores/templateBuilderStore';

// Mock the store
jest.mock('../../../stores/templateBuilderStore');

// Mock child components
jest.mock('../components/TemplateCanvas', () => {
  return {
    TemplateCanvas: () => <div data-testid="template-canvas">Canvas</div>,
  };
});

jest.mock('../components/ComponentLibrary', () => {
  return {
    ComponentLibrary: () => <div data-testid="component-library">Library</div>,
  };
});

jest.mock('../components/PropertyPanel', () => {
  return {
    PropertyPanel: () => <div data-testid="property-panel">Properties</div>,
  };
});

jest.mock('../components/TemplateToolbar', () => {
  return {
    TemplateToolbar: ({ onTemplateListClick }: any) => (
      <div data-testid="template-toolbar">
        <button onClick={onTemplateListClick}>Templates</button>
      </div>
    ),
  };
});

jest.mock('../components/TemplateList', () => {
  return {
    TemplateList: ({ onTemplateSelect, onNewTemplate }: any) => (
      <div data-testid="template-list">
        <button onClick={() => onTemplateSelect({ id: '1', name: 'Test Template' })}>
          Select Template
        </button>
        <button onClick={onNewTemplate}>New Template</button>
      </div>
    ),
  };
});

const mockStoreState = {
  currentTemplate: {
    id: '1',
    name: 'Test Template',
    categoryId: 'cat1',
    designData: {
      components: [],
      settings: {
        width: 576,
        height: 800,
        margins: { top: 10, bottom: 10, left: 5, right: 5 },
        paperSize: '80mm',
        orientation: 'portrait',
      },
    },
    paperSize: '80mm',
    orientation: 'portrait',
    isDefault: false,
    isActive: true,
  },
  templates: [],
  categories: [],
  selectedComponentId: null,
  draggedComponent: null,
  canvasZoom: 1,
  showGrid: true,
  snapToGrid: true,
  gridSize: 10,
  history: [],
  historyIndex: -1,
  isLoading: false,
  isSaving: false,
  setCurrentTemplate: jest.fn(),
  setTemplates: jest.fn(),
  setCategories: jest.fn(),
  addComponent: jest.fn(),
  updateComponent: jest.fn(),
  deleteComponent: jest.fn(),
  selectComponent: jest.fn(),
  moveComponent: jest.fn(),
  duplicateComponent: jest.fn(),
  setCanvasZoom: jest.fn(),
  toggleGrid: jest.fn(),
  toggleSnapToGrid: jest.fn(),
  setGridSize: jest.fn(),
  undo: jest.fn(),
  redo: jest.fn(),
  saveToHistory: jest.fn(),
  clearSelection: jest.fn(),
  resetCanvas: jest.fn(),
};

describe('TemplateBuilder', () => {
  beforeEach(() => {
    (useTemplateBuilderStore as jest.Mock).mockReturnValue(mockStoreState);
  });

  it('renders without crashing', () => {
    render(<TemplateBuilder />);
    expect(screen.getByTestId('template-toolbar')).toBeInTheDocument();
    expect(screen.getByTestId('component-library')).toBeInTheDocument();
    expect(screen.getByTestId('template-canvas')).toBeInTheDocument();
    expect(screen.getByTestId('property-panel')).toBeInTheDocument();
  });

  it('shows template list when no current template', () => {
    (useTemplateBuilderStore as jest.Mock).mockReturnValue({
      ...mockStoreState,
      currentTemplate: null,
    });

    render(<TemplateBuilder />);
    expect(screen.getByTestId('template-list')).toBeInTheDocument();
  });

  it('shows loading state', () => {
    (useTemplateBuilderStore as jest.Mock).mockReturnValue({
      ...mockStoreState,
      isLoading: true,
    });

    render(<TemplateBuilder />);
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it('handles template selection from list', () => {
    (useTemplateBuilderStore as jest.Mock).mockReturnValue({
      ...mockStoreState,
      currentTemplate: null,
    });

    render(<TemplateBuilder />);

    const selectButton = screen.getByText('Select Template');
    fireEvent.click(selectButton);

    expect(mockStoreState.setCurrentTemplate).toHaveBeenCalledWith({
      id: '1',
      name: 'Test Template',
    });
  });
});
```

---

# EXECUTION COMMANDS

## Install All Dependencies
```bash
# Backend
cd /home/admin/restaurant-platform-remote-v2/backend
npm install receiptline @types/node uuid @types/uuid

# Frontend
cd /home/admin/restaurant-platform-remote-v2/frontend
npm install @dnd-kit/core @dnd-kit/utilities @dnd-kit/sortable zustand react-hotkeys-hook react-use @tanstack/react-query react-hot-toast
```

## Database Setup
```bash
cd /home/admin/restaurant-platform-remote-v2/backend
npx prisma db push
npx tsx src/scripts/seed-templates.ts
```

## Run Tests
```bash
# Backend tests
cd /home/admin/restaurant-platform-remote-v2/backend
npm test

# Frontend tests
cd /home/admin/restaurant-platform-remote-v2/frontend
npm test
```

## Final Verification
```bash
# Start all services
cd /home/admin/restaurant-platform-remote-v2/backend && PORT=3001 npm run start:dev &
cd /home/admin/restaurant-platform-remote-v2/frontend && PORT=3003 npm run dev &
cd /home/admin/restaurant-platform-remote-v2/PrinterMasterv2 && npm run start:dev &

# Access template builder
# http://localhost:3003/settings/printing (after login: admin@test.com / test123)
```

This completes the comprehensive implementation plan for the printing template platform!