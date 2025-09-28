import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { TemplateComponent } from '../types/template.types';
import { useAdvancedTemplateBuilderStore } from '../stores/advanced-template-builder.store';
import { ResizeHandles } from './ResizeHandles';
import { ComponentRenderer } from './ComponentRenderer';
import { Lock, Eye, EyeOff } from 'lucide-react';

interface AdvancedCanvasComponentProps {
  component: TemplateComponent;
  isSelected: boolean;
  isMultiSelected: boolean;
  isLocked: boolean;
  zoom: number;
  snapToGrid: boolean;
  gridSize: number;
  onSelect: (id: string, multiSelect?: boolean) => void;
}

export function AdvancedCanvasComponent({
  component,
  isSelected,
  isMultiSelected,
  isLocked,
  zoom,
  snapToGrid,
  gridSize,
  onSelect,
}: AdvancedCanvasComponentProps) {
  const componentRef = useRef<HTMLDivElement>(null);
  const [isResizing, setIsResizing] = useState(false);
  const [resizeHandle, setResizeHandle] = useState<string | null>(null);
  const [initialSize, setInitialSize] = useState({ width: 0, height: 0 });
  const [initialPosition, setInitialPosition] = useState({ x: 0, y: 0 });
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  const { updateComponent, isDragging } = useAdvancedTemplateBuilderStore();

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging: isDraggingThis,
  } = useDraggable({
    id: component.id,
    disabled: isLocked,
    data: {
      type: 'canvas-component',
      component,
    },
  });

  // Calculate component style
  const { margin, padding, ...restStyles } = component.styles;
  const componentStyle = {
    position: 'absolute' as const,
    left: component.position.x * zoom,
    top: component.position.y * zoom,
    width: component.position.width * zoom,
    height: component.position.height * zoom,
    zIndex: component.zIndex || 0,
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    opacity: isDraggingThis ? 0.5 : 1,
    ...restStyles,
    margin: margin ? `${margin.top}px ${margin.right}px ${margin.bottom}px ${margin.left}px` : undefined,
    padding: padding ? `${padding.top}px ${padding.right}px ${padding.bottom}px ${padding.left}px` : undefined,
  };

  // Handle component click
  const handleMouseDown = useCallback((event: React.MouseEvent) => {
    if (isLocked) return;

    event.stopPropagation();

    const multiSelect = event.ctrlKey || event.metaKey || event.shiftKey;
    onSelect(component.id, multiSelect);

    // Calculate drag offset for precise dragging
    if (componentRef.current) {
      const rect = componentRef.current.getBoundingClientRect();
      setDragOffset({
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
      });
    }
  }, [component.id, isLocked, onSelect]);

  // Handle resize start
  const handleResizeStart = useCallback((handle: string, event: React.MouseEvent) => {
    if (isLocked) return;

    event.stopPropagation();
    setIsResizing(true);
    setResizeHandle(handle);
    setInitialSize({
      width: component.position.width,
      height: component.position.height,
    });
    setInitialPosition({
      x: component.position.x,
      y: component.position.y,
    });
  }, [component.position, isLocked]);

  // Handle resize during drag
  const handleResize = useCallback((event: MouseEvent) => {
    if (!isResizing || !resizeHandle || isLocked) return;

    const deltaX = event.movementX / zoom;
    const deltaY = event.movementY / zoom;

    let newWidth = initialSize.width;
    let newHeight = initialSize.height;
    let newX = initialPosition.x;
    let newY = initialPosition.y;

    // Calculate new dimensions based on resize handle
    switch (resizeHandle) {
      case 'nw':
        newWidth = Math.max(10, initialSize.width - deltaX);
        newHeight = Math.max(10, initialSize.height - deltaY);
        newX = initialPosition.x + (initialSize.width - newWidth);
        newY = initialPosition.y + (initialSize.height - newHeight);
        break;
      case 'n':
        newHeight = Math.max(10, initialSize.height - deltaY);
        newY = initialPosition.y + (initialSize.height - newHeight);
        break;
      case 'ne':
        newWidth = Math.max(10, initialSize.width + deltaX);
        newHeight = Math.max(10, initialSize.height - deltaY);
        newY = initialPosition.y + (initialSize.height - newHeight);
        break;
      case 'e':
        newWidth = Math.max(10, initialSize.width + deltaX);
        break;
      case 'se':
        newWidth = Math.max(10, initialSize.width + deltaX);
        newHeight = Math.max(10, initialSize.height + deltaY);
        break;
      case 's':
        newHeight = Math.max(10, initialSize.height + deltaY);
        break;
      case 'sw':
        newWidth = Math.max(10, initialSize.width - deltaX);
        newHeight = Math.max(10, initialSize.height + deltaY);
        newX = initialPosition.x + (initialSize.width - newWidth);
        break;
      case 'w':
        newWidth = Math.max(10, initialSize.width - deltaX);
        newX = initialPosition.x + (initialSize.width - newWidth);
        break;
    }

    // Apply grid snapping if enabled
    if (snapToGrid) {
      newWidth = Math.round(newWidth / gridSize) * gridSize;
      newHeight = Math.round(newHeight / gridSize) * gridSize;
      newX = Math.round(newX / gridSize) * gridSize;
      newY = Math.round(newY / gridSize) * gridSize;
    }

    // Update component
    updateComponent(component.id, {
      position: {
        x: newX,
        y: newY,
        width: newWidth,
        height: newHeight,
      },
    });
  }, [
    isResizing,
    resizeHandle,
    isLocked,
    zoom,
    initialSize,
    initialPosition,
    snapToGrid,
    gridSize,
    component.id,
    updateComponent,
  ]);

  // Handle resize end
  const handleResizeEnd = useCallback(() => {
    setIsResizing(false);
    setResizeHandle(null);
  }, []);

  // Add resize event listeners
  useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleResize);
      document.addEventListener('mouseup', handleResizeEnd);

      return () => {
        document.removeEventListener('mousemove', handleResize);
        document.removeEventListener('mouseup', handleResizeEnd);
      };
    }
  }, [isResizing, handleResize, handleResizeEnd]);

  // Double-click to edit (future feature)
  const handleDoubleClick = useCallback((event: React.MouseEvent) => {
    event.stopPropagation();
    // TODO: Open component editor modal
    console.log('Edit component:', component.id);
  }, [component.id]);

  // Determine selection style
  const selectionClass = isSelected || isMultiSelected
    ? 'ring-2 ring-blue-500 ring-opacity-75'
    : 'hover:ring-1 hover:ring-gray-300';

  const isHighlighted = isSelected || isMultiSelected;

  return (
    <div
      ref={(node) => {
        setNodeRef(node);
        componentRef.current = node;
      }}
      style={componentStyle}
      className={`
        group cursor-move border border-transparent transition-all duration-150
        ${selectionClass}
        ${isLocked ? 'cursor-not-allowed opacity-75' : ''}
        ${isDraggingThis ? 'z-50' : ''}
      `}
      onMouseDown={handleMouseDown}
      onDoubleClick={handleDoubleClick}
      {...attributes}
      {...listeners}
    >
      {/* Component Content */}
      <div className="w-full h-full overflow-hidden">
        <ComponentRenderer component={component} zoom={zoom} />
      </div>

      {/* Selection Overlay */}
      {isHighlighted && (
        <div className="absolute inset-0 pointer-events-none">
          {/* Selection border */}
          <div className="absolute inset-0 border-2 border-blue-500 border-dashed"></div>

          {/* Component info */}
          <div className="absolute -top-6 left-0 bg-blue-600 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
            {component.name} ({Math.round(component.position.width)} × {Math.round(component.position.height)})
          </div>

          {/* Lock indicator */}
          {isLocked && (
            <div className="absolute -top-1 -right-1 bg-red-500 text-white p-1 rounded-full">
              <Lock size={10} />
            </div>
          )}
        </div>
      )}

      {/* Resize Handles */}
      {isHighlighted && !isLocked && (
        <ResizeHandles
          onResizeStart={handleResizeStart}
          zoom={zoom}
          isResizing={isResizing}
          activeHandle={resizeHandle}
        />
      )}

      {/* Multi-selection indicator */}
      {isMultiSelected && !isSelected && (
        <div className="absolute -top-2 -left-2 w-4 h-4 bg-blue-500 rounded-full border-2 border-white">
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-2 h-2 bg-white rounded-full"></div>
          </div>
        </div>
      )}

      {/* Component actions (show on hover) */}
      <div className="absolute -top-8 right-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex space-x-1">
        <button
          onClick={(e) => {
            e.stopPropagation();
            // TODO: Toggle visibility
          }}
          className="bg-gray-700 text-white p-1 rounded text-xs hover:bg-gray-600"
          title="Toggle Visibility"
        >
          <Eye size={10} />
        </button>

        <button
          onClick={(e) => {
            e.stopPropagation();
            // TODO: Toggle lock
          }}
          className="bg-gray-700 text-white p-1 rounded text-xs hover:bg-gray-600"
          title="Toggle Lock"
        >
          <Lock size={10} />
        </button>
      </div>
    </div>
  );
}