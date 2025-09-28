# Implementation Plan Part 2: Backend Services & Frontend

## Task 2.3: ESC/POS Rendering Service

File: `/home/admin/restaurant-platform-remote-v2/backend/src/modules/template-builder/services/escpos.service.ts`

```typescript
import { Injectable } from '@nestjs/common';
import * as ReceiptLine from 'receiptline';

@Injectable()
export class ESCPOSService {
  private receiptLine: any;

  constructor() {
    this.receiptLine = ReceiptLine;
  }

  async renderTemplate(template: any, data: any): Promise<Uint8Array> {
    try {
      // Convert template to ReceiptLine markdown
      const markdown = this.buildMarkdown(template, data);

      // Configure printer settings
      const config = {
        command: 'escpos',
        encoding: 'cp1252',
        width: this.getPaperWidth(template.paperSize),
        resolution: 'normal',
      };

      // Generate ESC/POS commands
      const escposCommands = this.receiptLine.transform(markdown, config);

      return new Uint8Array(escposCommands);
    } catch (error) {
      throw new Error(`ESC/POS rendering failed: ${error.message}`);
    }
  }

  private buildMarkdown(template: any, data: any): string {
    let markdown = '';

    // Add header settings
    markdown += `{width:${this.getPaperWidth(template.paperSize)}}\n`;

    // Process components in z-index order
    const sortedComponents = [...template.components].sort((a, b) => a.zIndex - b.zIndex);

    for (const component of sortedComponents) {
      markdown += this.renderComponent(component, data);
    }

    // Add footer
    markdown += '\n{cut}\n';

    return markdown;
  }

  private renderComponent(component: any, data: any): string {
    const props = component.properties;

    switch (component.type) {
      case 'text':
        return this.renderTextComponent(component, data);
      case 'table':
        return this.renderTableComponent(component, data);
      case 'barcode':
        return this.renderBarcodeComponent(component, data);
      case 'qr':
        return this.renderQRComponent(component, data);
      case 'image':
        return this.renderImageComponent(component, data);
      case 'line':
        return this.renderLineComponent(component);
      default:
        return '';
    }
  }

  private renderTextComponent(component: any, data: any): string {
    const props = component.properties;
    let text = this.resolveDataBinding(props.content || '', data);

    // Apply formatting
    let markdown = '';

    // Font size
    if (props.fontSize && props.fontSize !== 'normal') {
      markdown += `{size:${props.fontSize}}`;
    }

    // Alignment
    if (props.textAlign) {
      markdown += `{align:${props.textAlign}}`;
    }

    // Bold
    if (props.fontWeight === 'bold') {
      markdown += `{b}${text}{/b}`;
    } else {
      markdown += text;
    }

    markdown += '\n';

    return markdown;
  }

  private renderTableComponent(component: any, data: any): string {
    const props = component.properties;
    let markdown = '';

    if (props.headers && props.headers.length > 0) {
      // Render headers
      const headerRow = props.headers.map((header: string) =>
        this.resolveDataBinding(header, data)
      ).join('|');
      markdown += `|${headerRow}|\n`;

      // Add separator
      const separator = props.headers.map(() => '---').join('|');
      markdown += `|${separator}|\n`;
    }

    // Render rows
    if (props.rows && Array.isArray(props.rows)) {
      for (const row of props.rows) {
        const rowData = row.map((cell: string) =>
          this.resolveDataBinding(cell, data)
        ).join('|');
        markdown += `|${rowData}|\n`;
      }
    }

    return markdown;
  }

  private renderBarcodeComponent(component: any, data: any): string {
    const props = component.properties;
    const barcodeData = this.resolveDataBinding(props.data || '', data);

    const format = props.format || 'code128';
    const height = props.height || 50;

    return `{code:${format},${height}:${barcodeData}}\n`;
  }

  private renderQRComponent(component: any, data: any): string {
    const props = component.properties;
    const qrData = this.resolveDataBinding(props.data || '', data);

    const size = props.size || 3;

    return `{qr:${size}:${qrData}}\n`;
  }

  private renderImageComponent(component: any, data: any): string {
    const props = component.properties;

    if (props.src) {
      return `{img:${props.src}}\n`;
    }

    return '';
  }

  private renderLineComponent(component: any): string {
    const props = component.properties;
    const style = props.style || 'solid';
    const width = props.width || 'full';

    if (style === 'dashed') {
      return '{hr:dashed}\n';
    } else if (style === 'dotted') {
      return '{hr:dotted}\n';
    } else {
      return '{hr}\n';
    }
  }

  private resolveDataBinding(content: string, data: any): string {
    if (!content || typeof content !== 'string') return '';

    // Replace {{variable}} patterns with data
    return content.replace(/\{\{([^}]+)\}\}/g, (match, path) => {
      const value = this.getNestedValue(data, path.trim());
      return value !== undefined ? String(value) : match;
    });
  }

  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : undefined;
    }, obj);
  }

  private getPaperWidth(paperSize: string): number {
    switch (paperSize) {
      case '58mm': return 384;
      case '80mm': return 576;
      case '112mm': return 832;
      case 'A4': return 2480;
      default: return 576;
    }
  }
}
```

## Task 2.4: Template Controller

File: `/home/admin/restaurant-platform-remote-v2/backend/src/modules/template-builder/template-builder.controller.ts`

```typescript
import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { TemplateBuilderService } from './template-builder.service';
import { ESCPOSService } from './services/escpos.service';
import { PreviewService } from './services/preview.service';
import { CreateTemplateDto, UpdateTemplateDto } from './dto/create-template.dto';

@Controller('api/v1/template-builder')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TemplateBuilderController {
  constructor(
    private templateService: TemplateBuilderService,
    private escposService: ESCPOSService,
    private previewService: PreviewService,
  ) {}

  @Get('categories')
  async getCategories() {
    return this.templateService.getCategories();
  }

  @Get('templates')
  async getTemplates(@Req() req: any, @Query('branchId') branchId?: string) {
    const { companyId } = req.user;
    return this.templateService.getTemplates(companyId, branchId);
  }

  @Get('templates/:id')
  async getTemplate(@Param('id') id: string, @Req() req: any) {
    const { companyId } = req.user;
    return this.templateService.getTemplate(id, companyId);
  }

  @Post('templates')
  @Roles('super_admin', 'company_owner', 'branch_manager')
  async createTemplate(@Body() dto: CreateTemplateDto, @Req() req: any) {
    const { userId, companyId } = req.user;
    return this.templateService.createTemplate(dto, userId, companyId);
  }

  @Put('templates/:id')
  @Roles('super_admin', 'company_owner', 'branch_manager')
  async updateTemplate(
    @Param('id') id: string,
    @Body() dto: UpdateTemplateDto,
    @Req() req: any,
  ) {
    const { userId, companyId } = req.user;
    return this.templateService.updateTemplate(id, dto, userId, companyId);
  }

  @Delete('templates/:id')
  @Roles('super_admin', 'company_owner', 'branch_manager')
  async deleteTemplate(@Param('id') id: string, @Req() req: any) {
    const { companyId } = req.user;
    return this.templateService.deleteTemplate(id, companyId);
  }

  @Post('templates/:id/duplicate')
  @Roles('super_admin', 'company_owner', 'branch_manager')
  async duplicateTemplate(@Param('id') id: string, @Req() req: any) {
    const { userId, companyId } = req.user;
    return this.templateService.duplicateTemplate(id, userId, companyId);
  }

  @Post('templates/:id/preview')
  async generatePreview(
    @Param('id') id: string,
    @Body() sampleData: any,
    @Req() req: any,
  ) {
    const { companyId } = req.user;
    const template = await this.templateService.getTemplate(id, companyId);
    return this.previewService.generatePreview(template, sampleData);
  }

  @Post('templates/:id/render')
  async renderTemplate(
    @Param('id') id: string,
    @Body() printData: any,
    @Req() req: any,
  ) {
    const { companyId } = req.user;
    const template = await this.templateService.getTemplate(id, companyId);
    const escposData = await this.escposService.renderTemplate(template, printData);

    return {
      success: true,
      data: Array.from(escposData),
      size: escposData.length,
    };
  }

  @Get('templates/:id/analytics')
  async getTemplateAnalytics(@Param('id') id: string, @Req() req: any) {
    const { companyId } = req.user;
    // Implementation for analytics
    return { message: 'Analytics endpoint - to be implemented' };
  }
}
```

---

# PHASE 3: FRONTEND DEVELOPMENT (8-12 hours)

## Task 3.1: Template Builder Store (Zustand)

File: `/home/admin/restaurant-platform-remote-v2/frontend/src/stores/templateBuilderStore.ts`

```typescript
import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

export interface TemplateComponent {
  id: string;
  type: 'text' | 'image' | 'barcode' | 'qr' | 'table' | 'line' | 'spacer';
  name?: string;
  properties: Record<string, any>;
  position: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  zIndex: number;
  dataBinding?: string;
  styles: Record<string, any>;
  isLocked: boolean;
}

export interface Template {
  id?: string;
  name: string;
  description?: string;
  categoryId: string;
  designData: {
    components: TemplateComponent[];
    settings: {
      width: number;
      height: number;
      margins: { top: number; bottom: number; left: number; right: number };
      paperSize: string;
      orientation: string;
    };
  };
  paperSize: string;
  orientation: string;
  isDefault: boolean;
  isActive: boolean;
}

interface TemplateBuilderState {
  // Template data
  currentTemplate: Template | null;
  templates: Template[];
  categories: any[];

  // UI state
  selectedComponentId: string | null;
  draggedComponent: TemplateComponent | null;
  canvasZoom: number;
  showGrid: boolean;
  snapToGrid: boolean;
  gridSize: number;

  // History
  history: Template[];
  historyIndex: number;

  // Loading states
  isLoading: boolean;
  isSaving: boolean;

  // Actions
  setCurrentTemplate: (template: Template | null) => void;
  setTemplates: (templates: Template[]) => void;
  setCategories: (categories: any[]) => void;

  // Component actions
  addComponent: (component: Omit<TemplateComponent, 'id'>) => void;
  updateComponent: (id: string, updates: Partial<TemplateComponent>) => void;
  deleteComponent: (id: string) => void;
  selectComponent: (id: string | null) => void;
  moveComponent: (id: string, position: { x: number; y: number }) => void;
  duplicateComponent: (id: string) => void;

  // Canvas actions
  setCanvasZoom: (zoom: number) => void;
  toggleGrid: () => void;
  toggleSnapToGrid: () => void;
  setGridSize: (size: number) => void;

  // History actions
  undo: () => void;
  redo: () => void;
  saveToHistory: () => void;

  // Utility actions
  clearSelection: () => void;
  resetCanvas: () => void;
}

export const useTemplateBuilderStore = create<TemplateBuilderState>()(
  subscribeWithSelector((set, get) => ({
    // Initial state
    currentTemplate: null,
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

    // Template actions
    setCurrentTemplate: (template) => {
      set({ currentTemplate: template });
      if (template) {
        get().saveToHistory();
      }
    },

    setTemplates: (templates) => set({ templates }),
    setCategories: (categories) => set({ categories }),

    // Component actions
    addComponent: (componentData) => {
      const state = get();
      if (!state.currentTemplate) return;

      const newComponent: TemplateComponent = {
        ...componentData,
        id: `component-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        zIndex: state.currentTemplate.designData.components.length,
      };

      const updatedTemplate = {
        ...state.currentTemplate,
        designData: {
          ...state.currentTemplate.designData,
          components: [...state.currentTemplate.designData.components, newComponent],
        },
      };

      set({
        currentTemplate: updatedTemplate,
        selectedComponentId: newComponent.id,
      });

      get().saveToHistory();
    },

    updateComponent: (id, updates) => {
      const state = get();
      if (!state.currentTemplate) return;

      const updatedComponents = state.currentTemplate.designData.components.map(comp =>
        comp.id === id ? { ...comp, ...updates } : comp
      );

      const updatedTemplate = {
        ...state.currentTemplate,
        designData: {
          ...state.currentTemplate.designData,
          components: updatedComponents,
        },
      };

      set({ currentTemplate: updatedTemplate });
      get().saveToHistory();
    },

    deleteComponent: (id) => {
      const state = get();
      if (!state.currentTemplate) return;

      const updatedComponents = state.currentTemplate.designData.components.filter(
        comp => comp.id !== id
      );

      const updatedTemplate = {
        ...state.currentTemplate,
        designData: {
          ...state.currentTemplate.designData,
          components: updatedComponents,
        },
      };

      set({
        currentTemplate: updatedTemplate,
        selectedComponentId: state.selectedComponentId === id ? null : state.selectedComponentId,
      });

      get().saveToHistory();
    },

    selectComponent: (id) => set({ selectedComponentId: id }),

    moveComponent: (id, position) => {
      const state = get();

      // Apply snap to grid if enabled
      let finalPosition = position;
      if (state.snapToGrid) {
        finalPosition = {
          x: Math.round(position.x / state.gridSize) * state.gridSize,
          y: Math.round(position.y / state.gridSize) * state.gridSize,
        };
      }

      get().updateComponent(id, {
        position: {
          ...get().currentTemplate?.designData.components.find(c => c.id === id)?.position,
          ...finalPosition,
        },
      });
    },

    duplicateComponent: (id) => {
      const state = get();
      if (!state.currentTemplate) return;

      const original = state.currentTemplate.designData.components.find(c => c.id === id);
      if (!original) return;

      const duplicate = {
        ...original,
        id: `component-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        position: {
          ...original.position,
          x: original.position.x + 20,
          y: original.position.y + 20,
        },
        name: original.name ? `${original.name} Copy` : undefined,
      };

      get().addComponent(duplicate);
    },

    // Canvas actions
    setCanvasZoom: (zoom) => set({ canvasZoom: Math.max(0.1, Math.min(3, zoom)) }),
    toggleGrid: () => set(state => ({ showGrid: !state.showGrid })),
    toggleSnapToGrid: () => set(state => ({ snapToGrid: !state.snapToGrid })),
    setGridSize: (size) => set({ gridSize: Math.max(5, Math.min(50, size)) }),

    // History actions
    saveToHistory: () => {
      const state = get();
      if (!state.currentTemplate) return;

      const newHistory = state.history.slice(0, state.historyIndex + 1);
      newHistory.push(JSON.parse(JSON.stringify(state.currentTemplate)));

      // Limit history size
      if (newHistory.length > 50) {
        newHistory.shift();
      }

      set({
        history: newHistory,
        historyIndex: newHistory.length - 1,
      });
    },

    undo: () => {
      const state = get();
      if (state.historyIndex > 0) {
        const newIndex = state.historyIndex - 1;
        set({
          currentTemplate: JSON.parse(JSON.stringify(state.history[newIndex])),
          historyIndex: newIndex,
        });
      }
    },

    redo: () => {
      const state = get();
      if (state.historyIndex < state.history.length - 1) {
        const newIndex = state.historyIndex + 1;
        set({
          currentTemplate: JSON.parse(JSON.stringify(state.history[newIndex])),
          historyIndex: newIndex,
        });
      }
    },

    // Utility actions
    clearSelection: () => set({ selectedComponentId: null }),
    resetCanvas: () => set({
      selectedComponentId: null,
      canvasZoom: 1,
      showGrid: true,
      snapToGrid: true,
    }),
  }))
);
```

## Task 3.2: Main Template Builder Component

File: `/home/admin/restaurant-platform-remote-v2/frontend/src/features/template-builder/TemplateBuilder.tsx`

```typescript
import React, { useEffect, useState } from 'react';
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent } from '@dnd-kit/core';
import { useTemplateBuilderStore } from '../../stores/templateBuilderStore';
import { TemplateCanvas } from './components/TemplateCanvas';
import { ComponentLibrary } from './components/ComponentLibrary';
import { PropertyPanel } from './components/PropertyPanel';
import { TemplateToolbar } from './components/TemplateToolbar';
import { TemplateList } from './components/TemplateList';

interface TemplateBuilderProps {
  className?: string;
}

export const TemplateBuilder: React.FC<TemplateBuilderProps> = ({ className }) => {
  const {
    currentTemplate,
    selectedComponentId,
    draggedComponent,
    isLoading,
    setCurrentTemplate,
    addComponent,
    moveComponent,
    selectComponent,
  } = useTemplateBuilderStore();

  const [activeId, setActiveId] = useState<string | null>(null);
  const [showTemplateList, setShowTemplateList] = useState(!currentTemplate);

  useEffect(() => {
    // Initialize with default template if none selected
    if (!currentTemplate) {
      const defaultTemplate = {
        name: 'New Template',
        categoryId: '',
        designData: {
          components: [],
          settings: {
            width: 576, // 80mm
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
      };
      setCurrentTemplate(defaultTemplate);
    }
  }, [currentTemplate, setCurrentTemplate]);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over, delta } = event;

    if (over && over.id === 'canvas') {
      // Adding new component from library
      if (active.data.current?.type === 'component-library') {
        const componentType = active.data.current.componentType;
        const canvasRect = over.rect;

        const newComponent = {
          type: componentType,
          properties: getDefaultProperties(componentType),
          position: {
            x: Math.max(0, event.activatorEvent.clientX - canvasRect.left),
            y: Math.max(0, event.activatorEvent.clientY - canvasRect.top),
            width: getDefaultWidth(componentType),
            height: getDefaultHeight(componentType),
          },
          styles: {},
          isLocked: false,
        };

        addComponent(newComponent);
      }
      // Moving existing component
      else if (active.data.current?.type === 'canvas-component') {
        const componentId = active.id as string;
        moveComponent(componentId, {
          x: delta.x,
          y: delta.y,
        });
      }
    }

    setActiveId(null);
  };

  const getDefaultProperties = (type: string) => {
    switch (type) {
      case 'text':
        return {
          content: 'Sample Text',
          fontSize: 14,
          fontWeight: 'normal',
          textAlign: 'left',
          color: '#000000',
        };
      case 'barcode':
        return {
          data: '123456789',
          format: 'code128',
          height: 50,
          showText: true,
        };
      case 'qr':
        return {
          data: 'https://example.com',
          size: 3,
          errorLevel: 'M',
        };
      case 'table':
        return {
          headers: ['Item', 'Qty', 'Price'],
          rows: [
            ['Product 1', '2', '$10.00'],
            ['Product 2', '1', '$5.00'],
          ],
          borderStyle: 'solid',
        };
      case 'line':
        return {
          style: 'solid',
          thickness: 1,
          color: '#000000',
        };
      default:
        return {};
    }
  };

  const getDefaultWidth = (type: string) => {
    switch (type) {
      case 'text': return 200;
      case 'barcode': return 150;
      case 'qr': return 80;
      case 'table': return 300;
      case 'line': return 200;
      default: return 100;
    }
  };

  const getDefaultHeight = (type: string) => {
    switch (type) {
      case 'text': return 24;
      case 'barcode': return 60;
      case 'qr': return 80;
      case 'table': return 100;
      case 'line': return 2;
      default: return 50;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (showTemplateList) {
    return (
      <TemplateList
        onTemplateSelect={(template) => {
          setCurrentTemplate(template);
          setShowTemplateList(false);
        }}
        onNewTemplate={() => setShowTemplateList(false)}
      />
    );
  }

  return (
    <div className={`template-builder h-screen flex flex-col ${className || ''}`}>
      {/* Toolbar */}
      <TemplateToolbar
        onTemplateListClick={() => setShowTemplateList(true)}
      />

      {/* Main workspace */}
      <div className="flex flex-1 overflow-hidden">
        <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          {/* Component Library */}
          <div className="w-64 bg-gray-50 border-r border-gray-200 overflow-y-auto">
            <ComponentLibrary />
          </div>

          {/* Canvas Area */}
          <div className="flex-1 flex flex-col">
            <TemplateCanvas />
          </div>

          {/* Property Panel */}
          <div className="w-80 bg-gray-50 border-l border-gray-200 overflow-y-auto">
            <PropertyPanel />
          </div>

          <DragOverlay>
            {activeId && draggedComponent && (
              <div className="bg-blue-100 border-2 border-blue-300 rounded p-2 opacity-75">
                {draggedComponent.type}
              </div>
            )}
          </DragOverlay>
        </DndContext>
      </div>
    </div>
  );
};

function getDefaultProperties(type: string) {
  // Implementation moved to component
  return {};
}

function getDefaultWidth(type: string) {
  // Implementation moved to component
  return 100;
}

function getDefaultHeight(type: string) {
  // Implementation moved to component
  return 50;
}
```

Continue to Part 3 for Canvas and Component implementations...