import React, { useRef, useState, useCallback } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { useTemplateBuilderStore } from '../stores/template-builder.store';
import { TemplateComponent, ComponentPosition } from '../types/template.types';
import { CanvasComponent } from './CanvasComponent';
import { Grid, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';

interface TemplateCanvasProps {
  className?: string;
}

export function TemplateCanvas({ className }: TemplateCanvasProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });

  const {
    currentTemplate,
    canvasSettings,
    selectedComponentId,
    multiSelection,
    showGrid,
    zoom,
    isDragging,
    setZoom,
    toggleGrid,
    addComponent,
    selectComponent,
    clearSelection,
    updateCanvasSettings,
  } = useTemplateBuilderStore();

  const { setNodeRef, isOver } = useDroppable({
    id: 'canvas',
  });

  // Get paper dimensions in pixels (approximate conversion)
  const getPaperDimensions = () => {
    const paperSizes = {
      '58mm': { width: 220, height: 800 },
      '80mm': { width: 300, height: 800 },
      '112mm': { width: 420, height: 800 },
      'A4': { width: 595, height: 842 },
      'Letter': { width: 612, height: 792 },
      'custom': { width: 400, height: 600 },
    };

    return paperSizes[canvasSettings.paperSize] || paperSizes['80mm'];
  };

  const paperDimensions = getPaperDimensions();
  const canvasWidth = paperDimensions.width * zoom;
  const canvasHeight = paperDimensions.height * zoom;

  // Handle component drop
  const handleDrop = useCallback((event: React.DragEvent) => {
    if (!canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = (event.clientX - rect.left - panOffset.x) / zoom;
    const y = (event.clientY - rect.top - panOffset.y) / zoom;

    // Get dropped component type from drag data
    const componentType = event.dataTransfer.getData('component-type');
    if (componentType) {
      addComponent(componentType as any, { x, y, width: 150, height: 30 });
    }
  }, [addComponent, zoom, panOffset]);

  // Handle canvas click (for deselection)
  const handleCanvasClick = useCallback((event: React.MouseEvent) => {
    if (event.target === canvasRef.current) {
      clearSelection();
    }
  }, [clearSelection]);

  // Zoom controls
  const handleZoomIn = () => setZoom(zoom * 1.2);
  const handleZoomOut = () => setZoom(zoom / 1.2);
  const handleZoomReset = () => setZoom(1);

  // Pan controls
  const handleMouseDown = (event: React.MouseEvent) => {
    if (event.button === 1 || (event.button === 0 && event.altKey)) {
      setIsPanning(true);
      setPanStart({ x: event.clientX - panOffset.x, y: event.clientY - panOffset.y });
      event.preventDefault();
    }
  };

  const handleMouseMove = (event: React.MouseEvent) => {
    if (isPanning) {
      setPanOffset({
        x: event.clientX - panStart.x,
        y: event.clientY - panStart.y,
      });
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false);
  };

  // Grid pattern
  const gridPattern = showGrid ? (
    <defs>
      <pattern
        id="grid"
        width={canvasSettings.gridSize * zoom}
        height={canvasSettings.gridSize * zoom}
        patternUnits="userSpaceOnUse"
      >
        <path
          d={`M ${canvasSettings.gridSize * zoom} 0 L 0 0 0 ${canvasSettings.gridSize * zoom}`}
          fill="none"
          stroke="#e5e7eb"
          strokeWidth="0.5"
        />
      </pattern>
    </defs>
  ) : null;

  const components = currentTemplate?.designData.components || [];

  return (
    <div className={`flex flex-col h-full bg-gray-100 ${className}`}>
      {/* Toolbar */}
      <div className="flex items-center justify-between p-3 bg-white border-b border-gray-200">
        <div className="flex items-center space-x-2">
          <button
            onClick={toggleGrid}
            className={`
              flex items-center px-3 py-1.5 text-sm rounded border transition-colors
              ${showGrid
                ? 'bg-blue-50 text-blue-700 border-blue-200'
                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }
            `}
          >
            <Grid size={16} className="mr-1.5" />
            Grid
          </button>

          <div className="flex items-center space-x-1 ml-4">
            <button
              onClick={handleZoomOut}
              className="p-1.5 text-gray-600 hover:bg-gray-100 rounded transition-colors"
              title="Zoom Out"
            >
              <ZoomOut size={16} />
            </button>

            <span className="px-2 py-1 text-sm font-mono text-gray-700 bg-gray-100 rounded min-w-[4rem] text-center">
              {Math.round(zoom * 100)}%
            </span>

            <button
              onClick={handleZoomIn}
              className="p-1.5 text-gray-600 hover:bg-gray-100 rounded transition-colors"
              title="Zoom In"
            >
              <ZoomIn size={16} />
            </button>

            <button
              onClick={handleZoomReset}
              className="p-1.5 text-gray-600 hover:bg-gray-100 rounded transition-colors ml-2"
              title="Reset Zoom"
            >
              <RotateCcw size={16} />
            </button>
          </div>
        </div>

        <div className="flex items-center space-x-4 text-sm text-gray-600">
          <span>Paper: {canvasSettings.paperSize}</span>
          <span>Components: {components.length}</span>
          {selectedComponentId && (
            <span className="text-blue-600">Selected: 1</span>
          )}
        </div>
      </div>

      {/* Canvas Container */}
      <div className="flex-1 overflow-auto">
        <div
          className="relative min-h-full flex items-center justify-center p-8"
          style={{
            cursor: isPanning ? 'grabbing' : isDragging ? 'grabbing' : 'default',
          }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          {/* Canvas */}
          <div
            ref={(node) => {
              setNodeRef(node);
              canvasRef.current = node;
            }}
            className={`
              relative bg-white shadow-lg border border-gray-300 overflow-hidden
              ${isOver ? 'ring-2 ring-blue-400 ring-opacity-50' : ''}
            `}
            style={{
              width: canvasWidth,
              height: canvasHeight,
              transform: `translate(${panOffset.x}px, ${panOffset.y}px)`,
            }}
            onClick={handleCanvasClick}
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
          >
            {/* Grid Background */}
            {showGrid && (
              <svg
                className="absolute inset-0 pointer-events-none"
                width="100%"
                height="100%"
              >
                {gridPattern}
                <rect width="100%" height="100%" fill="url(#grid)" />
              </svg>
            )}

            {/* Margins Guide */}
            <div
              className="absolute border border-dashed border-gray-300 pointer-events-none"
              style={{
                left: canvasSettings.margins.left * zoom,
                top: canvasSettings.margins.top * zoom,
                right: canvasSettings.margins.right * zoom,
                bottom: canvasSettings.margins.bottom * zoom,
                width: `calc(100% - ${(canvasSettings.margins.left + canvasSettings.margins.right) * zoom}px)`,
                height: `calc(100% - ${(canvasSettings.margins.top + canvasSettings.margins.bottom) * zoom}px)`,
              }}
            />

            {/* Components */}
            {components
              .sort((a, b) => a.zIndex - b.zIndex)
              .map((component) => (
                <CanvasComponent
                  key={component.id}
                  component={component}
                  isSelected={selectedComponentId === component.id}
                  isMultiSelected={multiSelection.includes(component.id)}
                  zoom={zoom}
                  snapToGrid={canvasSettings.snapToGrid}
                  gridSize={canvasSettings.gridSize}
                />
              ))}

            {/* Drop Indicator */}
            {isOver && (
              <div className="absolute inset-0 bg-blue-50 bg-opacity-20 border-2 border-dashed border-blue-400 pointer-events-none flex items-center justify-center">
                <div className="bg-white px-4 py-2 rounded shadow text-sm text-gray-600">
                  Drop component here
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Status Bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-white border-t border-gray-200 text-xs text-gray-600">
        <div className="flex items-center space-x-4">
          <span>Canvas: {Math.round(canvasWidth)} × {Math.round(canvasHeight)}px</span>
          <span>Zoom: {Math.round(zoom * 100)}%</span>
        </div>
        <div className="flex items-center space-x-4">
          <span>Grid: {showGrid ? 'On' : 'Off'}</span>
          <span>Snap: {canvasSettings.snapToGrid ? 'On' : 'Off'}</span>
        </div>
      </div>
    </div>
  );
}

