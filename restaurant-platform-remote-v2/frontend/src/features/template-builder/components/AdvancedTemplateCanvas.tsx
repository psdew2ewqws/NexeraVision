import React, { useRef, useState, useCallback, useEffect } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { useAdvancedTemplateBuilderStore } from '../stores/advanced-template-builder.store';
import { TemplateComponent, ComponentPosition } from '../types/template.types';
import { AdvancedCanvasComponent } from './AdvancedCanvasComponent';
import { SelectionRectangle } from './SelectionRectangle';
import { CanvasRulers } from './CanvasRulers';
import { CanvasGuides } from './CanvasGuides';
import { CollaboratorCursors } from './CollaboratorCursors';
import {
  Grid,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Square,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignStartVertical,
  AlignCenterVertical,
  AlignEndVertical,
  AlignHorizontalSpaceAround,
  AlignVerticalSpaceAround,
  MoveUp,
  MoveDown,
  Move3D,
  Move,
  Copy,
  Trash2,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  Group,
  Ungroup,
  Undo,
  Redo
} from 'lucide-react';

interface AdvancedTemplateCanvasProps {
  className?: string;
}

export function AdvancedTemplateCanvas({ className }: AdvancedTemplateCanvasProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [isPanning, setIsPanning] = useState(false);
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionStart, setSelectionStart] = useState({ x: 0, y: 0 });
  const [selectionEnd, setSelectionEnd] = useState({ x: 0, y: 0 });
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });

  const {
    currentTemplate,
    components,
    canvasSettings,
    selectedComponentId,
    multiSelection,
    showGrid,
    showRulers,
    showGuides,
    zoom,
    isDragging,
    collaborators,
    lockedComponents,
    hiddenComponents,
    groupedComponents,
    undoStack,
    redoStack,
    setZoom,
    toggleGrid,
    toggleRulers,
    toggleGuides,
    addComponent,
    selectComponent,
    selectMultiple,
    clearSelection,
    selectAll,
    selectInArea,
    updateCanvasSettings,
    duplicateComponents,
    deleteComponents,
    copyComponents,
    pasteComponents,
    groupComponents,
    ungroupComponents,
    lockComponents,
    unlockComponents,
    hideComponents,
    showComponents,
    alignLeft,
    alignCenter,
    alignRight,
    alignTop,
    alignMiddle,
    alignBottom,
    distributeHorizontally,
    distributeVertically,
    bringToFront,
    sendToBack,
    bringForward,
    sendBackward,
    undo,
    redo,
    zoomToFit,
    zoomToSelection,
    handleKeyDown,
  } = useAdvancedTemplateBuilderStore();

  const { setNodeRef, isOver } = useDroppable({
    id: 'canvas',
  });

  // Keyboard event listener
  useEffect(() => {
    const handleKeyDownWrapper = (event: KeyboardEvent) => {
      // Only handle if canvas or its children are focused
      if (canvasRef.current?.contains(document.activeElement) ||
          document.activeElement === document.body) {
        handleKeyDown(event);
      }
    };

    document.addEventListener('keydown', handleKeyDownWrapper);
    return () => document.removeEventListener('keydown', handleKeyDownWrapper);
  }, [handleKeyDown]);

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

  // Handle mouse down for selection rectangle and panning
  const handleMouseDown = useCallback((event: React.MouseEvent) => {
    if (!canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = (event.clientX - rect.left - panOffset.x) / zoom;
    const y = (event.clientY - rect.top - panOffset.y) / zoom;

    // Middle mouse button or Alt+Click for panning
    if (event.button === 1 || (event.button === 0 && event.altKey)) {
      setIsPanning(true);
      setPanStart({ x: event.clientX - panOffset.x, y: event.clientY - panOffset.y });
      event.preventDefault();
      return;
    }

    // Left click for selection
    if (event.button === 0 && event.target === canvasRef.current) {
      if (!event.ctrlKey && !event.metaKey) {
        clearSelection();
      }

      setIsSelecting(true);
      setSelectionStart({ x, y });
      setSelectionEnd({ x, y });
      event.preventDefault();
    }
  }, [clearSelection, zoom, panOffset]);

  // Handle mouse move for selection rectangle and panning
  const handleMouseMove = useCallback((event: React.MouseEvent) => {
    if (!canvasRef.current) return;

    // Handle panning
    if (isPanning) {
      setPanOffset({
        x: event.clientX - panStart.x,
        y: event.clientY - panStart.y,
      });
      return;
    }

    // Handle selection rectangle
    if (isSelecting) {
      const rect = canvasRef.current.getBoundingClientRect();
      const x = (event.clientX - rect.left - panOffset.x) / zoom;
      const y = (event.clientY - rect.top - panOffset.y) / zoom;
      setSelectionEnd({ x, y });
    }
  }, [isPanning, isSelecting, panStart, zoom, panOffset]);

  // Handle mouse up
  const handleMouseUp = useCallback((event: React.MouseEvent) => {
    if (isPanning) {
      setIsPanning(false);
    }

    if (isSelecting) {
      setIsSelecting(false);

      // Calculate selection area
      const selectionArea = {
        x: Math.min(selectionStart.x, selectionEnd.x),
        y: Math.min(selectionStart.y, selectionEnd.y),
        width: Math.abs(selectionEnd.x - selectionStart.x),
        height: Math.abs(selectionEnd.y - selectionStart.y),
      };

      // Only select if area is significant (avoid accidental selections)
      if (selectionArea.width > 5 || selectionArea.height > 5) {
        selectInArea(selectionArea);
      }
    }
  }, [isPanning, isSelecting, selectionStart, selectionEnd, selectInArea]);

  // Zoom controls
  const handleZoomIn = () => setZoom(zoom * 1.2);
  const handleZoomOut = () => setZoom(zoom / 1.2);
  const handleZoomReset = () => setZoom(1);

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

  const visibleComponents = components.filter(c => !hiddenComponents.includes(c.id));
  const selectedComponents = components.filter(c => multiSelection.includes(c.id));
  const canUndo = undoStack.length > 0;
  const canRedo = redoStack.length > 0;

  // Selection rectangle coordinates
  const selectionRect = isSelecting ? {
    x: Math.min(selectionStart.x, selectionEnd.x) * zoom,
    y: Math.min(selectionStart.y, selectionEnd.y) * zoom,
    width: Math.abs(selectionEnd.x - selectionStart.x) * zoom,
    height: Math.abs(selectionEnd.y - selectionStart.y) * zoom,
  } : null;

  return (
    <div className={`flex flex-col h-full bg-gray-100 ${className}`}>
      {/* Enhanced Toolbar */}
      <div className="flex items-center justify-between p-3 bg-white border-b border-gray-200">
        <div className="flex items-center space-x-2">
          {/* View Controls */}
          <div className="flex items-center space-x-1 border-r border-gray-200 pr-3">
            <button
              onClick={toggleGrid}
              className={`
                flex items-center px-2 py-1.5 text-xs rounded border transition-colors
                ${showGrid
                  ? 'bg-blue-50 text-blue-700 border-blue-200'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }
              `}
              title="Toggle Grid"
            >
              <Grid size={14} className="mr-1" />
              Grid
            </button>

            <button
              onClick={toggleRulers}
              className={`
                flex items-center px-2 py-1.5 text-xs rounded border transition-colors
                ${showRulers
                  ? 'bg-blue-50 text-blue-700 border-blue-200'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }
              `}
              title="Toggle Rulers"
            >
              <Square size={14} className="mr-1" />
              Rulers
            </button>

            <button
              onClick={toggleGuides}
              className={`
                flex items-center px-2 py-1.5 text-xs rounded border transition-colors
                ${showGuides
                  ? 'bg-blue-50 text-blue-700 border-blue-200'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }
              `}
              title="Toggle Guides"
            >
              <Move size={14} className="mr-1" />
              Guides
            </button>
          </div>

          {/* Zoom Controls */}
          <div className="flex items-center space-x-1 border-r border-gray-200 pr-3">
            <button
              onClick={handleZoomOut}
              className="p-1.5 text-gray-600 hover:bg-gray-100 rounded transition-colors"
              title="Zoom Out"
            >
              <ZoomOut size={14} />
            </button>

            <span className="px-2 py-1 text-xs font-mono text-gray-700 bg-gray-100 rounded min-w-[3rem] text-center">
              {Math.round(zoom * 100)}%
            </span>

            <button
              onClick={handleZoomIn}
              className="p-1.5 text-gray-600 hover:bg-gray-100 rounded transition-colors"
              title="Zoom In"
            >
              <ZoomIn size={14} />
            </button>

            <button
              onClick={handleZoomReset}
              className="p-1.5 text-gray-600 hover:bg-gray-100 rounded transition-colors"
              title="Reset Zoom"
            >
              <RotateCcw size={14} />
            </button>

            <button
              onClick={zoomToFit}
              className="px-2 py-1.5 text-xs text-gray-600 hover:bg-gray-100 rounded transition-colors"
              title="Zoom to Fit"
            >
              Fit
            </button>

            <button
              onClick={zoomToSelection}
              disabled={multiSelection.length === 0}
              className="px-2 py-1.5 text-xs text-gray-600 hover:bg-gray-100 rounded transition-colors disabled:opacity-50"
              title="Zoom to Selection"
            >
              Selection
            </button>
          </div>

          {/* Undo/Redo */}
          <div className="flex items-center space-x-1 border-r border-gray-200 pr-3">
            <button
              onClick={undo}
              disabled={!canUndo}
              className="p-1.5 text-gray-600 hover:bg-gray-100 rounded transition-colors disabled:opacity-50"
              title="Undo (Ctrl+Z)"
            >
              <Undo size={14} />
            </button>

            <button
              onClick={redo}
              disabled={!canRedo}
              className="p-1.5 text-gray-600 hover:bg-gray-100 rounded transition-colors disabled:opacity-50"
              title="Redo (Ctrl+Y)"
            >
              <Redo size={14} />
            </button>
          </div>

          {/* Selection Tools */}
          {multiSelection.length > 0 && (
            <div className="flex items-center space-x-1 border-r border-gray-200 pr-3">
              <button
                onClick={() => copyComponents(multiSelection)}
                className="p-1.5 text-gray-600 hover:bg-gray-100 rounded transition-colors"
                title="Copy (Ctrl+C)"
              >
                <Copy size={14} />
              </button>

              <button
                onClick={() => duplicateComponents(multiSelection)}
                className="p-1.5 text-gray-600 hover:bg-gray-100 rounded transition-colors"
                title="Duplicate (Ctrl+D)"
              >
                <Copy size={14} />
              </button>

              <button
                onClick={() => deleteComponents(multiSelection)}
                className="p-1.5 text-red-600 hover:bg-red-100 rounded transition-colors"
                title="Delete (Del)"
              >
                <Trash2 size={14} />
              </button>
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="flex items-center space-x-4 text-xs text-gray-600">
          <span>Paper: {canvasSettings.paperSize}</span>
          <span>Components: {visibleComponents.length}</span>
          {multiSelection.length > 0 && (
            <span className="text-blue-600">Selected: {multiSelection.length}</span>
          )}
          {collaborators.length > 0 && (
            <span className="text-green-600">Collaborators: {collaborators.length}</span>
          )}
        </div>
      </div>

      {/* Alignment Tools (when multiple components selected) */}
      {multiSelection.length > 1 && (
        <div className="flex items-center justify-center p-2 bg-blue-50 border-b border-blue-200">
          <div className="flex items-center space-x-1">
            <span className="text-xs text-blue-700 mr-2">Alignment:</span>

            <button
              onClick={() => alignLeft(multiSelection)}
              className="p-1.5 text-blue-700 hover:bg-blue-100 rounded transition-colors"
              title="Align Left"
            >
              <AlignLeft size={14} />
            </button>

            <button
              onClick={() => alignCenter(multiSelection)}
              className="p-1.5 text-blue-700 hover:bg-blue-100 rounded transition-colors"
              title="Align Center"
            >
              <AlignCenter size={14} />
            </button>

            <button
              onClick={() => alignRight(multiSelection)}
              className="p-1.5 text-blue-700 hover:bg-blue-100 rounded transition-colors"
              title="Align Right"
            >
              <AlignRight size={14} />
            </button>

            <div className="w-px h-4 bg-blue-300 mx-1"></div>

            <button
              onClick={() => alignTop(multiSelection)}
              className="p-1.5 text-blue-700 hover:bg-blue-100 rounded transition-colors"
              title="Align Top"
            >
              <AlignStartVertical size={14} />
            </button>

            <button
              onClick={() => alignMiddle(multiSelection)}
              className="p-1.5 text-blue-700 hover:bg-blue-100 rounded transition-colors"
              title="Align Middle"
            >
              <AlignCenterVertical size={14} />
            </button>

            <button
              onClick={() => alignBottom(multiSelection)}
              className="p-1.5 text-blue-700 hover:bg-blue-100 rounded transition-colors"
              title="Align Bottom"
            >
              <AlignEndVertical size={14} />
            </button>

            {multiSelection.length > 2 && (
              <>
                <div className="w-px h-4 bg-blue-300 mx-1"></div>

                <button
                  onClick={() => distributeHorizontally(multiSelection)}
                  className="p-1.5 text-blue-700 hover:bg-blue-100 rounded transition-colors"
                  title="Distribute Horizontally"
                >
                  <AlignHorizontalSpaceAround size={14} />
                </button>

                <button
                  onClick={() => distributeVertically(multiSelection)}
                  className="p-1.5 text-blue-700 hover:bg-blue-100 rounded transition-colors"
                  title="Distribute Vertically"
                >
                  <AlignVerticalSpaceAround size={14} />
                </button>
              </>
            )}

            <div className="w-px h-4 bg-blue-300 mx-1"></div>

            <button
              onClick={() => bringToFront(multiSelection)}
              className="p-1.5 text-blue-700 hover:bg-blue-100 rounded transition-colors"
              title="Bring to Front"
            >
              <MoveUp size={14} />
            </button>

            <button
              onClick={() => sendToBack(multiSelection)}
              className="p-1.5 text-blue-700 hover:bg-blue-100 rounded transition-colors"
              title="Send to Back"
            >
              <MoveDown size={14} />
            </button>

            <div className="w-px h-4 bg-blue-300 mx-1"></div>

            <button
              onClick={() => groupComponents(multiSelection)}
              className="p-1.5 text-blue-700 hover:bg-blue-100 rounded transition-colors"
              title="Group Components"
            >
              <Group size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Canvas Container */}
      <div className="flex-1 overflow-auto" style={{ cursor: isPanning ? 'grabbing' : isDragging ? 'grabbing' : 'default' }}>
        <div
          className="relative min-h-full flex items-center justify-center p-8"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          {/* Rulers */}
          {showRulers && (
            <CanvasRulers
              canvasWidth={canvasWidth}
              canvasHeight={canvasHeight}
              zoom={zoom}
              panOffset={panOffset}
            />
          )}

          {/* Canvas */}
          <div
            ref={(node) => {
              setNodeRef(node);
              canvasRef.current = node;
            }}
            className={`
              relative bg-white shadow-lg border border-gray-300 overflow-hidden focus:outline-none
              ${isOver ? 'ring-2 ring-blue-400 ring-opacity-50' : ''}
            `}
            style={{
              width: canvasWidth,
              height: canvasHeight,
              transform: `translate(${panOffset.x}px, ${panOffset.y}px)`,
            }}
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            tabIndex={0} // Make canvas focusable for keyboard events
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

            {/* Guides */}
            {showGuides && (
              <CanvasGuides
                canvasWidth={canvasWidth}
                canvasHeight={canvasHeight}
                zoom={zoom}
                components={selectedComponents}
              />
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
            {visibleComponents
              .sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0))
              .map((component) => (
                <AdvancedCanvasComponent
                  key={component.id}
                  component={component}
                  isSelected={selectedComponentId === component.id}
                  isMultiSelected={multiSelection.includes(component.id)}
                  isLocked={lockedComponents.includes(component.id)}
                  zoom={zoom}
                  snapToGrid={canvasSettings.snapToGrid}
                  gridSize={canvasSettings.gridSize}
                  onSelect={(id, multiSelect) => selectComponent(id, multiSelect)}
                />
              ))}

            {/* Selection Rectangle */}
            {selectionRect && (
              <SelectionRectangle
                x={selectionRect.x}
                y={selectionRect.y}
                width={selectionRect.width}
                height={selectionRect.height}
              />
            )}

            {/* Collaborator Cursors */}
            <CollaboratorCursors collaborators={collaborators} zoom={zoom} />

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

      {/* Enhanced Status Bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-white border-t border-gray-200 text-xs text-gray-600">
        <div className="flex items-center space-x-4">
          <span>Canvas: {Math.round(canvasWidth)} × {Math.round(canvasHeight)}px</span>
          <span>Zoom: {Math.round(zoom * 100)}%</span>
          {multiSelection.length > 0 && (
            <span>Selection: {multiSelection.length} components</span>
          )}
        </div>
        <div className="flex items-center space-x-4">
          <span>Grid: {showGrid ? 'On' : 'Off'}</span>
          <span>Snap: {canvasSettings.snapToGrid ? 'On' : 'Off'}</span>
          <span>Rulers: {showRulers ? 'On' : 'Off'}</span>
          <span>Guides: {showGuides ? 'On' : 'Off'}</span>
          {collaborators.length > 0 && (
            <span className="text-green-600">🟢 {collaborators.length} online</span>
          )}
        </div>
      </div>
    </div>
  );
}