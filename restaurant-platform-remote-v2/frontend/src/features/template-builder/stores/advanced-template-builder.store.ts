import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import {
  Template,
  TemplateComponent,
  TemplateCategory,
  CanvasSettings,
  PrintSettings,
  ComponentType,
} from '../types/template.types';

interface AdvancedTemplateBuilderState {
  // Current template being edited
  currentTemplate?: Template;

  // Components in the current template
  components: TemplateComponent[];

  // Available categories
  categories: TemplateCategory[];

  // Canvas and print settings
  canvasSettings: CanvasSettings;
  printSettings: PrintSettings;

  // UI state
  selectedComponentId?: string;
  multiSelection: string[];
  isPreviewMode: boolean;
  isDragging: boolean;
  zoom: number;
  activePanel: 'components' | 'properties' | 'preview';
  showGrid: boolean;
  showRulers: boolean;
  showGuides: boolean;

  // Advanced selection and editing
  clipboardComponents: TemplateComponent[];
  undoStack: any[];
  redoStack: any[];
  groupedComponents: { [groupId: string]: string[] };
  lockedComponents: string[];
  hiddenComponents: string[];

  // Real-time collaboration features
  collaborators: {
    id: string;
    name: string;
    color: string;
    cursor: { x: number; y: number };
    isActive: boolean;
    lastSeen: Date;
  }[];

  // Performance tracking
  performanceMetrics: {
    renderTime: number;
    componentCount: number;
    lastUpdate: Date;
  };

  // Loading states
  isLoading: boolean;
  isSaving: boolean;
  error?: string;

  // Actions
  setCurrentTemplate: (template?: Template) => void;
  setComponents: (components: TemplateComponent[]) => void;
  addComponent: (componentType: ComponentType, position: { x: number; y: number; width: number; height: number }) => void;
  updateComponent: (id: string, updates: Partial<TemplateComponent>) => void;
  removeComponent: (id: string) => void;

  // Advanced Selection
  selectComponent: (id?: string, multiSelect?: boolean) => void;
  selectMultiple: (ids: string[]) => void;
  addToSelection: (id: string) => void;
  removeFromSelection: (id: string) => void;
  selectAll: () => void;
  clearSelection: () => void;
  invertSelection: () => void;
  selectInArea: (area: { x: number; y: number; width: number; height: number }) => void;

  // Component Operations
  duplicateComponents: (ids: string[]) => void;
  deleteComponents: (ids: string[]) => void;
  copyComponents: (ids: string[]) => void;
  pasteComponents: () => void;
  groupComponents: (ids: string[]) => void;
  ungroupComponents: (groupId: string) => void;
  lockComponents: (ids: string[]) => void;
  unlockComponents: (ids: string[]) => void;
  hideComponents: (ids: string[]) => void;
  showComponents: (ids: string[]) => void;

  // Alignment Tools
  alignLeft: (ids: string[]) => void;
  alignCenter: (ids: string[]) => void;
  alignRight: (ids: string[]) => void;
  alignTop: (ids: string[]) => void;
  alignMiddle: (ids: string[]) => void;
  alignBottom: (ids: string[]) => void;
  distributeHorizontally: (ids: string[]) => void;
  distributeVertically: (ids: string[]) => void;

  // Z-Index Management
  bringToFront: (ids: string[]) => void;
  sendToBack: (ids: string[]) => void;
  bringForward: (ids: string[]) => void;
  sendBackward: (ids: string[]) => void;

  // Undo/Redo
  undo: () => void;
  redo: () => void;
  pushToUndoStack: (action: any) => void;

  // UI State
  setActivePanel: (panel: 'components' | 'properties' | 'preview') => void;
  toggleGrid: () => void;
  toggleRulers: () => void;
  toggleGuides: () => void;
  setError: (error?: string) => void;

  // Zoom and Canvas
  setZoom: (zoom: number) => void;
  zoomToFit: () => void;
  zoomToSelection: () => void;
  panToComponent: (id: string) => void;

  // Real-time Collaboration
  addCollaborator: (collaborator: any) => void;
  removeCollaborator: (id: string) => void;
  updateCollaboratorCursor: (id: string, position: { x: number; y: number }) => void;

  // Keyboard Shortcuts
  handleKeyDown: (event: KeyboardEvent) => void;

  setCategories: (categories: TemplateCategory[]) => void;
  updateCanvasSettings: (settings: Partial<CanvasSettings>) => void;
  setPrintSettings: (settings: Partial<PrintSettings>) => void;

  setPreviewMode: (enabled: boolean) => void;
  setDragging: (dragging: boolean) => void;
  setPreviewData: (data: any) => void;

  setLoading: (loading: boolean) => void;
  setSaving: (saving: boolean) => void;

  // Clear state
  reset: () => void;
}

const defaultCanvasSettings: CanvasSettings = {
  paperSize: '80mm',
  orientation: 'portrait',
  margins: { top: 10, right: 10, bottom: 10, left: 10 },
  backgroundColor: '#ffffff',
  showGrid: true,
  gridSize: 10,
  snapToGrid: true,
  zoom: 1,
};

const defaultPrintSettings: PrintSettings = {
  density: 'medium',
  cutType: 'partial',
  encoding: 'cp1252',
  font: { family: 'monospace', size: 12, weight: 'normal' },
  thermalSettings: { speed: 'medium', darkness: 'medium' },
  lineSpacing: 1,
  characterSpacing: 0,
};

export const useAdvancedTemplateBuilderStore = create<AdvancedTemplateBuilderState>()(
  devtools(
    immer((set, get) => ({
      // Initial state
      components: [],
      categories: [],
      canvasSettings: defaultCanvasSettings,
      printSettings: defaultPrintSettings,
      multiSelection: [],
      isPreviewMode: false,
      isDragging: false,
      zoom: 1,
      activePanel: 'components',
      showGrid: true,
      showRulers: false,
      showGuides: false,
      clipboardComponents: [],
      undoStack: [],
      redoStack: [],
      groupedComponents: {},
      lockedComponents: [],
      hiddenComponents: [],
      collaborators: [],
      performanceMetrics: {
        renderTime: 0,
        componentCount: 0,
        lastUpdate: new Date(),
      },
      isLoading: false,
      isSaving: false,

      // Template management
      setCurrentTemplate: (template) =>
        set((state) => {
          state.currentTemplate = template;
          state.components = template?.designData.components || [];
          state.canvasSettings = template?.canvasSettings || defaultCanvasSettings;
          state.printSettings = template?.printSettings || defaultPrintSettings;
          state.performanceMetrics.componentCount = state.components.length;
          state.performanceMetrics.lastUpdate = new Date();
        }),

      setComponents: (components) =>
        set((state) => {
          state.components = components;
          state.performanceMetrics.componentCount = components.length;
          state.performanceMetrics.lastUpdate = new Date();
        }),

      addComponent: (componentType, position) =>
        set((state) => {
          const newComponent: TemplateComponent = {
            id: `comp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            type: componentType,
            name: `${componentType.charAt(0).toUpperCase() + componentType.slice(1)} ${state.components.length + 1}`,
            properties: getDefaultPropertiesForType(componentType),
            position,
            styles: {},
            zIndex: Math.max(...state.components.map(c => c.zIndex || 0), 0) + 1,
            conditions: [],
            transformations: [],
            isLocked: false,
            isVisible: true,
            sortOrder: state.components.length,
          };

          state.components.push(newComponent);
          state.selectedComponentId = newComponent.id;
          state.multiSelection = [newComponent.id];

          // Push to undo stack
          state.undoStack.push({
            type: 'ADD_COMPONENT',
            component: { ...newComponent },
          });
          state.redoStack = [];

          state.performanceMetrics.componentCount = state.components.length;
          state.performanceMetrics.lastUpdate = new Date();
        }),

      updateComponent: (id, updates) =>
        set((state) => {
          const componentIndex = state.components.findIndex(c => c.id === id);
          if (componentIndex !== -1) {
            const oldComponent = { ...state.components[componentIndex] };

            // Push to undo stack
            state.undoStack.push({
              type: 'UPDATE_COMPONENT',
              id,
              oldComponent,
              newUpdates: updates,
            });
            state.redoStack = [];

            state.components[componentIndex] = { ...state.components[componentIndex], ...updates };
            state.performanceMetrics.lastUpdate = new Date();
          }
        }),

      removeComponent: (id) =>
        set((state) => {
          const componentIndex = state.components.findIndex(c => c.id === id);
          if (componentIndex !== -1) {
            const removedComponent = { ...state.components[componentIndex] };

            // Push to undo stack
            state.undoStack.push({
              type: 'REMOVE_COMPONENT',
              component: removedComponent,
              index: componentIndex,
            });
            state.redoStack = [];

            state.components.splice(componentIndex, 1);

            // Update selection
            if (state.selectedComponentId === id) {
              state.selectedComponentId = undefined;
            }
            state.multiSelection = state.multiSelection.filter(cId => cId !== id);

            state.performanceMetrics.componentCount = state.components.length;
            state.performanceMetrics.lastUpdate = new Date();
          }
        }),

      // Advanced Selection
      selectComponent: (id, multiSelect = false) =>
        set((state) => {
          if (!multiSelect) {
            state.selectedComponentId = id;
            state.multiSelection = id ? [id] : [];
          } else if (id) {
            if (state.multiSelection.includes(id)) {
              state.multiSelection = state.multiSelection.filter(cId => cId !== id);
              state.selectedComponentId = state.multiSelection[0];
            } else {
              state.multiSelection.push(id);
              state.selectedComponentId = id;
            }
          }
        }),

      selectMultiple: (ids) =>
        set((state) => {
          state.multiSelection = ids;
          state.selectedComponentId = ids[0];
        }),

      addToSelection: (id) =>
        set((state) => {
          if (!state.multiSelection.includes(id)) {
            state.multiSelection.push(id);
            state.selectedComponentId = id;
          }
        }),

      removeFromSelection: (id) =>
        set((state) => {
          state.multiSelection = state.multiSelection.filter(cId => cId !== id);
          if (state.selectedComponentId === id) {
            state.selectedComponentId = state.multiSelection[0];
          }
        }),

      selectAll: () =>
        set((state) => {
          const visibleComponents = state.components
            .filter(c => !state.hiddenComponents.includes(c.id))
            .map(c => c.id);
          state.multiSelection = visibleComponents;
          state.selectedComponentId = visibleComponents[0];
        }),

      clearSelection: () =>
        set((state) => {
          state.selectedComponentId = undefined;
          state.multiSelection = [];
        }),

      invertSelection: () =>
        set((state) => {
          const allComponentIds = state.components.map(c => c.id);
          const newSelection = allComponentIds.filter(id => !state.multiSelection.includes(id));
          state.multiSelection = newSelection;
          state.selectedComponentId = newSelection[0];
        }),

      selectInArea: (area) =>
        set((state) => {
          const componentsInArea = state.components
            .filter(component => {
              const pos = component.position;
              return (
                pos.x >= area.x &&
                pos.y >= area.y &&
                pos.x + pos.width <= area.x + area.width &&
                pos.y + pos.height <= area.y + area.height
              );
            })
            .map(c => c.id);

          state.multiSelection = componentsInArea;
          state.selectedComponentId = componentsInArea[0];
        }),

      // Component Operations
      duplicateComponents: (ids) =>
        set((state) => {
          const componentsToDuplicate = state.components.filter(c => ids.includes(c.id));
          const duplicatedComponents = componentsToDuplicate.map(component => ({
            ...component,
            id: `comp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            name: `${component.name} (Copy)`,
            position: {
              ...component.position,
              x: component.position.x + 10,
              y: component.position.y + 10,
            },
            zIndex: Math.max(...state.components.map(c => c.zIndex || 0), 0) + 1,
          }));

          state.components.push(...duplicatedComponents);
          state.multiSelection = duplicatedComponents.map(c => c.id);
          state.selectedComponentId = duplicatedComponents[0]?.id;

          // Push to undo stack
          state.undoStack.push({
            type: 'DUPLICATE_COMPONENTS',
            components: duplicatedComponents,
          });
          state.redoStack = [];

          state.performanceMetrics.componentCount = state.components.length;
          state.performanceMetrics.lastUpdate = new Date();
        }),

      deleteComponents: (ids) =>
        set((state) => {
          const componentsToDelete = state.components.filter(c => ids.includes(c.id));

          // Push to undo stack
          state.undoStack.push({
            type: 'DELETE_COMPONENTS',
            components: componentsToDelete,
          });
          state.redoStack = [];

          state.components = state.components.filter(c => !ids.includes(c.id));
          state.multiSelection = state.multiSelection.filter(id => !ids.includes(id));

          if (ids.includes(state.selectedComponentId!)) {
            state.selectedComponentId = undefined;
          }

          state.performanceMetrics.componentCount = state.components.length;
          state.performanceMetrics.lastUpdate = new Date();
        }),

      copyComponents: (ids) =>
        set((state) => {
          const componentsToCopy = state.components.filter(c => ids.includes(c.id));
          state.clipboardComponents = componentsToCopy.map(c => ({ ...c }));
        }),

      pasteComponents: () =>
        set((state) => {
          if (state.clipboardComponents.length === 0) return;

          const pastedComponents = state.clipboardComponents.map(component => ({
            ...component,
            id: `comp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            position: {
              ...component.position,
              x: component.position.x + 20,
              y: component.position.y + 20,
            },
            zIndex: Math.max(...state.components.map(c => c.zIndex || 0), 0) + 1,
          }));

          state.components.push(...pastedComponents);
          state.multiSelection = pastedComponents.map(c => c.id);
          state.selectedComponentId = pastedComponents[0]?.id;

          // Push to undo stack
          state.undoStack.push({
            type: 'PASTE_COMPONENTS',
            components: pastedComponents,
          });
          state.redoStack = [];

          state.performanceMetrics.componentCount = state.components.length;
          state.performanceMetrics.lastUpdate = new Date();
        }),

      // Alignment Tools
      alignLeft: (ids) =>
        set((state) => {
          if (ids.length < 2) return;

          const components = state.components.filter(c => ids.includes(c.id));
          const leftmostX = Math.min(...components.map(c => c.position.x));

          components.forEach(component => {
            const index = state.components.findIndex(c => c.id === component.id);
            if (index !== -1) {
              state.components[index].position.x = leftmostX;
            }
          });

          state.performanceMetrics.lastUpdate = new Date();
        }),

      alignCenter: (ids) =>
        set((state) => {
          if (ids.length < 2) return;

          const components = state.components.filter(c => ids.includes(c.id));
          const centerX = components.reduce((sum, c) => sum + c.position.x + c.position.width / 2, 0) / components.length;

          components.forEach(component => {
            const index = state.components.findIndex(c => c.id === component.id);
            if (index !== -1) {
              state.components[index].position.x = centerX - component.position.width / 2;
            }
          });

          state.performanceMetrics.lastUpdate = new Date();
        }),

      alignRight: (ids) =>
        set((state) => {
          if (ids.length < 2) return;

          const components = state.components.filter(c => ids.includes(c.id));
          const rightmostX = Math.max(...components.map(c => c.position.x + c.position.width));

          components.forEach(component => {
            const index = state.components.findIndex(c => c.id === component.id);
            if (index !== -1) {
              state.components[index].position.x = rightmostX - component.position.width;
            }
          });

          state.performanceMetrics.lastUpdate = new Date();
        }),

      alignTop: (ids) =>
        set((state) => {
          if (ids.length < 2) return;

          const components = state.components.filter(c => ids.includes(c.id));
          const topmostY = Math.min(...components.map(c => c.position.y));

          components.forEach(component => {
            const index = state.components.findIndex(c => c.id === component.id);
            if (index !== -1) {
              state.components[index].position.y = topmostY;
            }
          });

          state.performanceMetrics.lastUpdate = new Date();
        }),

      alignMiddle: (ids) =>
        set((state) => {
          if (ids.length < 2) return;

          const components = state.components.filter(c => ids.includes(c.id));
          const centerY = components.reduce((sum, c) => sum + c.position.y + c.position.height / 2, 0) / components.length;

          components.forEach(component => {
            const index = state.components.findIndex(c => c.id === component.id);
            if (index !== -1) {
              state.components[index].position.y = centerY - component.position.height / 2;
            }
          });

          state.performanceMetrics.lastUpdate = new Date();
        }),

      alignBottom: (ids) =>
        set((state) => {
          if (ids.length < 2) return;

          const components = state.components.filter(c => ids.includes(c.id));
          const bottommostY = Math.max(...components.map(c => c.position.y + c.position.height));

          components.forEach(component => {
            const index = state.components.findIndex(c => c.id === component.id);
            if (index !== -1) {
              state.components[index].position.y = bottommostY - component.position.height;
            }
          });

          state.performanceMetrics.lastUpdate = new Date();
        }),

      distributeHorizontally: (ids) =>
        set((state) => {
          if (ids.length < 3) return;

          const components = state.components
            .filter(c => ids.includes(c.id))
            .sort((a, b) => a.position.x - b.position.x);

          const leftmost = components[0].position.x;
          const rightmost = components[components.length - 1].position.x + components[components.length - 1].position.width;
          const totalSpace = rightmost - leftmost;
          const totalComponentWidth = components.reduce((sum, c) => sum + c.position.width, 0);
          const spaceBetween = (totalSpace - totalComponentWidth) / (components.length - 1);

          let currentX = leftmost;
          components.forEach((component, index) => {
            const componentIndex = state.components.findIndex(c => c.id === component.id);
            if (componentIndex !== -1 && index > 0) {
              state.components[componentIndex].position.x = currentX;
            }
            currentX += component.position.width + spaceBetween;
          });

          state.performanceMetrics.lastUpdate = new Date();
        }),

      distributeVertically: (ids) =>
        set((state) => {
          if (ids.length < 3) return;

          const components = state.components
            .filter(c => ids.includes(c.id))
            .sort((a, b) => a.position.y - b.position.y);

          const topmost = components[0].position.y;
          const bottommost = components[components.length - 1].position.y + components[components.length - 1].position.height;
          const totalSpace = bottommost - topmost;
          const totalComponentHeight = components.reduce((sum, c) => sum + c.position.height, 0);
          const spaceBetween = (totalSpace - totalComponentHeight) / (components.length - 1);

          let currentY = topmost;
          components.forEach((component, index) => {
            const componentIndex = state.components.findIndex(c => c.id === component.id);
            if (componentIndex !== -1 && index > 0) {
              state.components[componentIndex].position.y = currentY;
            }
            currentY += component.position.height + spaceBetween;
          });

          state.performanceMetrics.lastUpdate = new Date();
        }),

      // Z-Index Management
      bringToFront: (ids) =>
        set((state) => {
          const maxZ = Math.max(...state.components.map(c => c.zIndex || 0));
          ids.forEach((id, index) => {
            const componentIndex = state.components.findIndex(c => c.id === id);
            if (componentIndex !== -1) {
              state.components[componentIndex].zIndex = maxZ + index + 1;
            }
          });
          state.performanceMetrics.lastUpdate = new Date();
        }),

      sendToBack: (ids) =>
        set((state) => {
          const minZ = Math.min(...state.components.map(c => c.zIndex || 0));
          ids.forEach((id, index) => {
            const componentIndex = state.components.findIndex(c => c.id === id);
            if (componentIndex !== -1) {
              state.components[componentIndex].zIndex = minZ - ids.length + index;
            }
          });
          state.performanceMetrics.lastUpdate = new Date();
        }),

      bringForward: (ids) =>
        set((state) => {
          ids.forEach(id => {
            const componentIndex = state.components.findIndex(c => c.id === id);
            if (componentIndex !== -1) {
              state.components[componentIndex].zIndex = (state.components[componentIndex].zIndex || 0) + 1;
            }
          });
          state.performanceMetrics.lastUpdate = new Date();
        }),

      sendBackward: (ids) =>
        set((state) => {
          ids.forEach(id => {
            const componentIndex = state.components.findIndex(c => c.id === id);
            if (componentIndex !== -1) {
              state.components[componentIndex].zIndex = Math.max((state.components[componentIndex].zIndex || 0) - 1, 0);
            }
          });
          state.performanceMetrics.lastUpdate = new Date();
        }),

      // Undo/Redo
      undo: () =>
        set((state) => {
          if (state.undoStack.length === 0) return;

          const lastAction = state.undoStack.pop()!;
          state.redoStack.push(lastAction);

          switch (lastAction.type) {
            case 'ADD_COMPONENT':
              state.components = state.components.filter(c => c.id !== lastAction.component.id);
              break;
            case 'REMOVE_COMPONENT':
              state.components.splice(lastAction.index, 0, lastAction.component);
              break;
            case 'UPDATE_COMPONENT':
              const index = state.components.findIndex(c => c.id === lastAction.id);
              if (index !== -1) {
                state.components[index] = lastAction.oldComponent;
              }
              break;
            // Add more undo cases as needed
          }

          state.performanceMetrics.componentCount = state.components.length;
          state.performanceMetrics.lastUpdate = new Date();
        }),

      redo: () =>
        set((state) => {
          if (state.redoStack.length === 0) return;

          const action = state.redoStack.pop()!;
          state.undoStack.push(action);

          switch (action.type) {
            case 'ADD_COMPONENT':
              state.components.push(action.component);
              break;
            case 'REMOVE_COMPONENT':
              state.components = state.components.filter(c => c.id !== action.component.id);
              break;
            case 'UPDATE_COMPONENT':
              const index = state.components.findIndex(c => c.id === action.id);
              if (index !== -1) {
                state.components[index] = { ...state.components[index], ...action.newUpdates };
              }
              break;
            // Add more redo cases as needed
          }

          state.performanceMetrics.componentCount = state.components.length;
          state.performanceMetrics.lastUpdate = new Date();
        }),

      pushToUndoStack: (action) =>
        set((state) => {
          state.undoStack.push(action);
          if (state.undoStack.length > 50) {
            state.undoStack.shift();
          }
          state.redoStack = [];
        }),

      // Keyboard Shortcuts
      handleKeyDown: (event) => {
        const state = get();

        // Ctrl/Cmd + Z - Undo
        if ((event.ctrlKey || event.metaKey) && event.key === 'z' && !event.shiftKey) {
          event.preventDefault();
          state.undo();
          return;
        }

        // Ctrl/Cmd + Shift + Z or Ctrl + Y - Redo
        if (((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 'z') ||
            (event.ctrlKey && event.key === 'y')) {
          event.preventDefault();
          state.redo();
          return;
        }

        // Ctrl/Cmd + A - Select All
        if ((event.ctrlKey || event.metaKey) && event.key === 'a') {
          event.preventDefault();
          state.selectAll();
          return;
        }

        // Ctrl/Cmd + C - Copy
        if ((event.ctrlKey || event.metaKey) && event.key === 'c' && state.multiSelection.length > 0) {
          event.preventDefault();
          state.copyComponents(state.multiSelection);
          return;
        }

        // Ctrl/Cmd + V - Paste
        if ((event.ctrlKey || event.metaKey) && event.key === 'v') {
          event.preventDefault();
          state.pasteComponents();
          return;
        }

        // Ctrl/Cmd + D - Duplicate
        if ((event.ctrlKey || event.metaKey) && event.key === 'd' && state.multiSelection.length > 0) {
          event.preventDefault();
          state.duplicateComponents(state.multiSelection);
          return;
        }

        // Delete/Backspace - Delete selected
        if ((event.key === 'Delete' || event.key === 'Backspace') && state.multiSelection.length > 0) {
          event.preventDefault();
          state.deleteComponents(state.multiSelection);
          return;
        }

        // Escape - Clear selection
        if (event.key === 'Escape') {
          event.preventDefault();
          state.clearSelection();
          return;
        }
      },

      // UI State
      setActivePanel: (panel) =>
        set((state) => {
          state.activePanel = panel;
        }),

      toggleGrid: () =>
        set((state) => {
          state.showGrid = !state.showGrid;
          state.canvasSettings.showGrid = state.showGrid;
        }),

      toggleRulers: () =>
        set((state) => {
          state.showRulers = !state.showRulers;
        }),

      toggleGuides: () =>
        set((state) => {
          state.showGuides = !state.showGuides;
        }),

      setError: (error) =>
        set((state) => {
          state.error = error;
        }),

      // Zoom and Canvas
      setZoom: (zoom) =>
        set((state) => {
          state.zoom = Math.max(0.1, Math.min(5, zoom));
          state.canvasSettings.zoom = state.zoom;
        }),

      zoomToFit: () =>
        set((state) => {
          if (state.components.length === 0) return;

          const bounds = state.components.reduce(
            (acc, component) => ({
              minX: Math.min(acc.minX, component.position.x),
              minY: Math.min(acc.minY, component.position.y),
              maxX: Math.max(acc.maxX, component.position.x + component.position.width),
              maxY: Math.max(acc.maxY, component.position.y + component.position.height),
            }),
            { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity }
          );

          const canvasWidth = 800; // Approximate canvas width
          const canvasHeight = 600; // Approximate canvas height
          const padding = 50;

          const scaleX = (canvasWidth - padding * 2) / (bounds.maxX - bounds.minX);
          const scaleY = (canvasHeight - padding * 2) / (bounds.maxY - bounds.minY);
          const newZoom = Math.min(scaleX, scaleY, 2);

          state.zoom = newZoom;
          state.canvasSettings.zoom = newZoom;
        }),

      zoomToSelection: () =>
        set((state) => {
          if (state.multiSelection.length === 0) return;

          const selectedComponents = state.components.filter(c => state.multiSelection.includes(c.id));
          const bounds = selectedComponents.reduce(
            (acc, component) => ({
              minX: Math.min(acc.minX, component.position.x),
              minY: Math.min(acc.minY, component.position.y),
              maxX: Math.max(acc.maxX, component.position.x + component.position.width),
              maxY: Math.max(acc.maxY, component.position.y + component.position.height),
            }),
            { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity }
          );

          const canvasWidth = 800;
          const canvasHeight = 600;
          const padding = 100;

          const scaleX = (canvasWidth - padding * 2) / (bounds.maxX - bounds.minX);
          const scaleY = (canvasHeight - padding * 2) / (bounds.maxY - bounds.minY);
          const newZoom = Math.min(scaleX, scaleY, 3);

          state.zoom = newZoom;
          state.canvasSettings.zoom = newZoom;
        }),

      panToComponent: (id) =>
        set((state) => {
          const component = state.components.find(c => c.id === id);
          if (!component) return;

          // This would typically trigger a pan animation
          // For now, we'll just select the component
          state.selectedComponentId = id;
          state.multiSelection = [id];
        }),

      // Real-time Collaboration
      addCollaborator: (collaborator) =>
        set((state) => {
          state.collaborators.push(collaborator);
        }),

      removeCollaborator: (id) =>
        set((state) => {
          state.collaborators = state.collaborators.filter(c => c.id !== id);
        }),

      updateCollaboratorCursor: (id, position) =>
        set((state) => {
          const collaborator = state.collaborators.find(c => c.id === id);
          if (collaborator) {
            collaborator.cursor = position;
            collaborator.lastSeen = new Date();
          }
        }),

      // Other required actions
      setCategories: (categories) =>
        set((state) => {
          state.categories = categories;
        }),

      updateCanvasSettings: (settings) =>
        set((state) => {
          state.canvasSettings = { ...state.canvasSettings, ...settings };
        }),

      setPrintSettings: (settings) =>
        set((state) => {
          state.printSettings = { ...state.printSettings, ...settings };
        }),

      setPreviewMode: (enabled) =>
        set((state) => {
          state.isPreviewMode = enabled;
        }),

      setDragging: (dragging) =>
        set((state) => {
          state.isDragging = dragging;
        }),

      setPreviewData: (data) =>
        set((state) => {
          // This would be used for preview data
        }),

      setLoading: (loading) =>
        set((state) => {
          state.isLoading = loading;
        }),

      setSaving: (saving) =>
        set((state) => {
          state.isSaving = saving;
        }),

      reset: () =>
        set((state) => {
          Object.assign(state, {
            currentTemplate: undefined,
            components: [],
            multiSelection: [],
            selectedComponentId: undefined,
            clipboardComponents: [],
            undoStack: [],
            redoStack: [],
            groupedComponents: {},
            lockedComponents: [],
            hiddenComponents: [],
            collaborators: [],
            zoom: 1,
            showGrid: true,
            showRulers: false,
            showGuides: false,
            activePanel: 'components',
            isPreviewMode: false,
            isDragging: false,
            isLoading: false,
            isSaving: false,
            error: undefined,
            canvasSettings: defaultCanvasSettings,
            printSettings: defaultPrintSettings,
          });
        }),

      // Lock/Unlock/Hide/Show Components
      lockComponents: (ids) =>
        set((state) => {
          state.lockedComponents = [...new Set([...state.lockedComponents, ...ids])];
        }),

      unlockComponents: (ids) =>
        set((state) => {
          state.lockedComponents = state.lockedComponents.filter(id => !ids.includes(id));
        }),

      hideComponents: (ids) =>
        set((state) => {
          state.hiddenComponents = [...new Set([...state.hiddenComponents, ...ids])];
          state.multiSelection = state.multiSelection.filter(id => !ids.includes(id));
          if (ids.includes(state.selectedComponentId!)) {
            state.selectedComponentId = undefined;
          }
        }),

      showComponents: (ids) =>
        set((state) => {
          state.hiddenComponents = state.hiddenComponents.filter(id => !ids.includes(id));
        }),

      // Group/Ungroup
      groupComponents: (ids) =>
        set((state) => {
          if (ids.length < 2) return;

          const groupId = `group-${Date.now()}`;
          state.groupedComponents[groupId] = ids;

          // Push to undo stack
          state.undoStack.push({
            type: 'GROUP_COMPONENTS',
            groupId,
            componentIds: ids,
          });
          state.redoStack = [];
        }),

      ungroupComponents: (groupId) =>
        set((state) => {
          const componentIds = state.groupedComponents[groupId];
          if (componentIds) {
            delete state.groupedComponents[groupId];

            // Push to undo stack
            state.undoStack.push({
              type: 'UNGROUP_COMPONENTS',
              groupId,
              componentIds,
            });
            state.redoStack = [];
          }
        }),
    })),
    {
      name: 'template-builder-store',
    }
  )
);

// Helper function to get default properties for component types
function getDefaultPropertiesForType(type: ComponentType): any {
  switch (type) {
    case 'text':
      return {
        text: 'Sample Text',
        fontSize: 14,
        fontWeight: 'normal',
        textAlign: 'left',
        color: '#000000',
      };
    case 'image':
      return {
        src: '',
        alt: 'Image',
        fit: 'contain',
      };
    case 'line':
      return {
        thickness: 1,
        style: 'solid',
        color: '#000000',
      };
    case 'table':
      return {
        rows: 3,
        columns: 2,
        borderWidth: 1,
        borderColor: '#000000',
        cellPadding: 5,
      };
    case 'barcode':
      return {
        value: '123456789',
        format: 'CODE128',
        displayValue: true,
      };
    case 'qr':
      return {
        value: 'https://example.com',
        size: 100,
        errorCorrectionLevel: 'M',
      };
    default:
      return {};
  }
}