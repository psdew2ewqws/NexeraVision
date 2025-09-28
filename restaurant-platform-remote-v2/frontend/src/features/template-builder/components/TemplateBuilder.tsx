import React, { useEffect } from 'react';
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent } from '@dnd-kit/core';
import { useTemplateBuilderStore } from '../stores/template-builder.store';
import { ComponentLibrary } from './ComponentLibrary';
import { TemplateCanvas } from './TemplateCanvas';
import { PropertiesPanel } from './PropertiesPanel';
import { PreviewPanel } from './PreviewPanel';
import { TemplateHeader } from './TemplateHeader';
import { ComponentType } from '../types/template.types';

interface TemplateBuilderProps {
  template?: any;
  onChange?: (template: any) => void;
  onSave?: () => void;
  onCancel?: () => void;
}

export function TemplateBuilder({ template, onChange, onSave, onCancel }: TemplateBuilderProps) {
  const {
    currentTemplate,
    activePanel,
    isDragging,
    setDragging,
    addComponent,
    setActivePanel,
    setCurrentTemplate,
    setLoading,
    setError,
  } = useTemplateBuilderStore();

  const [draggedComponent, setDraggedComponent] = React.useState<ComponentType | null>(null);

  // Load template if template provided or use default
  useEffect(() => {
    if (template) {
      setCurrentTemplate(template);
    } else {
      // Initialize with a default template
      loadDefaultTemplate();
    }
  }, [template]);

  // Call onChange when template changes
  useEffect(() => {
    if (currentTemplate && onChange) {
      onChange(currentTemplate);
    }
  }, [currentTemplate, onChange]);

  const loadDefaultTemplate = async () => {
    setLoading(true);
    setError(null);

    try {
      // Create a basic default template
      const defaultTemplate = {
        id: 'new-template',
        companyId: 'company-1',
        categoryId: 'category-1',
        name: 'New Template',
        description: 'A new thermal printer template',
        designData: {
          components: [],
          settings: {},
          metadata: {},
        },
        canvasSettings: {
          paperSize: '80mm' as const,
          orientation: 'portrait' as const,
          margins: { top: 10, right: 10, bottom: 10, left: 10 },
          backgroundColor: '#ffffff',
          showGrid: true,
          gridSize: 10,
          snapToGrid: true,
          zoom: 1,
        },
        printSettings: {
          density: 'medium' as const,
          cutType: 'partial' as const,
          encoding: 'cp1252' as const,
          font: { family: 'monospace', size: 12, weight: 'normal' as const },
          thermalSettings: { speed: 'medium' as const, darkness: 'medium' as const },
          lineSpacing: 1,
          characterSpacing: 0,
        },
        tags: [],
        usageCount: 0,
        isDefault: false,
        isActive: true,
        isPublic: false,
        version: 1,
        createdBy: 'user-1',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      setCurrentTemplate(defaultTemplate);
    } catch (error) {
      setError('Failed to initialize template');
      console.error('Error initializing template:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadTemplate = async (id: string) => {
    setLoading(true);
    setError(null);

    try {
      // This would typically fetch from an API
      // For now, we'll create a mock template
      const mockTemplate = {
        id,
        companyId: 'company-1',
        categoryId: 'category-1',
        name: 'Sample Receipt Template',
        description: 'A sample receipt template for demonstration',
        designData: {
          components: [
            {
              id: 'comp-1',
              type: 'text' as ComponentType,
              name: 'Store Name',
              properties: {
                text: '{{company.name}}',
                fontSize: 18,
                fontWeight: 'bold' as const,
                textAlign: 'center' as const,
              },
              position: { x: 50, y: 20, width: 200, height: 30 },
              styles: {},
              zIndex: 1,
              dataBinding: 'company.name',
              conditions: [],
              transformations: [],
              isLocked: false,
              isVisible: true,
              sortOrder: 0,
            },
            {
              id: 'comp-2',
              type: 'line' as ComponentType,
              name: 'Separator',
              properties: {
                thickness: 1,
                style: 'solid' as const,
              },
              position: { x: 20, y: 60, width: 260, height: 2 },
              styles: { borderColor: '#000' },
              zIndex: 2,
              conditions: [],
              transformations: [],
              isLocked: false,
              isVisible: true,
              sortOrder: 1,
            },
          ],
          settings: {},
          metadata: {},
        },
        canvasSettings: {
          paperSize: '80mm' as const,
          orientation: 'portrait' as const,
          margins: { top: 10, right: 10, bottom: 10, left: 10 },
          backgroundColor: '#ffffff',
          showGrid: true,
          gridSize: 10,
          snapToGrid: true,
          zoom: 1,
        },
        printSettings: {
          density: 'medium' as const,
          cutType: 'partial' as const,
          encoding: 'cp1252' as const,
          font: { family: 'monospace', size: 12, weight: 'normal' as const },
          thermalSettings: { speed: 'medium' as const, darkness: 'medium' as const },
          lineSpacing: 1,
          characterSpacing: 0,
        },
        tags: ['receipt', 'default'],
        usageCount: 0,
        isDefault: false,
        isActive: true,
        isPublic: false,
        version: 1,
        createdBy: 'user-1',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      setCurrentTemplate(mockTemplate);
    } catch (error) {
      setError('Failed to load template');
      console.error('Error loading template:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;

    if (active.data.current?.isNew) {
      setDraggedComponent(active.id as ComponentType);
      setDragging(true);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    setDraggedComponent(null);
    setDragging(false);

    if (over && over.id === 'canvas' && active.data.current?.isNew) {
      const componentType = active.id as ComponentType;

      // Calculate drop position
      const canvasRect = document.getElementById('canvas')?.getBoundingClientRect();
      const dropPosition = {
        x: 50, // Default position
        y: 50,
        width: 150,
        height: 30,
      };

      addComponent(componentType, dropPosition);
    }
  };

  const renderDragOverlay = () => {
    if (!draggedComponent) return null;

    return (
      <div className="bg-white border border-gray-300 rounded shadow-lg p-2 opacity-80">
        <span className="text-sm font-medium">{draggedComponent}</span>
      </div>
    );
  };

  const renderSidebar = () => {
    switch (activePanel) {
      case 'components':
        return <ComponentLibrary className="w-80" />;
      case 'properties':
        return <PropertiesPanel className="w-80" />;
      case 'preview':
        return <PreviewPanel className="w-80" />;
      default:
        return <ComponentLibrary className="w-80" />;
    }
  };

  return (
    <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="flex flex-col h-screen bg-gray-50">
        {/* Header */}
        <TemplateHeader onSave={onSave} onCancel={onCancel} />

        {/* Main Content */}
        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar */}
          <div className="flex flex-col border-r border-gray-200 bg-white">
            {/* Panel Tabs */}
            <div className="flex border-b border-gray-200">
              {[
                { id: 'components', label: 'Components', icon: '🧩' },
                { id: 'properties', label: 'Properties', icon: '⚙️' },
                { id: 'preview', label: 'Preview', icon: '👁️' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActivePanel(tab.id as any)}
                  className={`
                    flex-1 px-4 py-3 text-sm font-medium border-b-2 transition-colors
                    ${activePanel === tab.id
                      ? 'border-blue-500 text-blue-600 bg-blue-50'
                      : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                    }
                  `}
                >
                  <span className="mr-2">{tab.icon}</span>
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Panel Content */}
            {renderSidebar()}
          </div>

          {/* Canvas Area */}
          <div className="flex-1 flex flex-col">
            <TemplateCanvas />
          </div>
        </div>

        {/* Drag Overlay */}
        <DragOverlay>
          {renderDragOverlay()}
        </DragOverlay>
      </div>
    </DndContext>
  );
}