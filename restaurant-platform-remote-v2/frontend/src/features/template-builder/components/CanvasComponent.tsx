import React, { useState, useRef, useCallback } from 'react';
import { Rnd } from 'react-rnd';
import { TemplateComponent, ComponentPosition } from '../types/template.types';
import { useTemplateBuilderStore } from '../stores/template-builder.store';
import {
  Type,
  Image,
  BarChart3,
  QrCode,
  Table,
  Minus,
  Space,
  Calendar,
  Hash,
  Lock,
  Eye,
  EyeOff,
} from 'lucide-react';

interface CanvasComponentProps {
  component: TemplateComponent;
  isSelected: boolean;
  isMultiSelected: boolean;
  zoom: number;
  snapToGrid: boolean;
  gridSize: number;
}

const componentIcons = {
  text: Type,
  image: Image,
  barcode: BarChart3,
  qr: QrCode,
  table: Table,
  line: Minus,
  spacer: Space,
  datetime: Calendar,
  counter: Hash,
  container: Space,
  logo: Image,
};

export function CanvasComponent({
  component,
  isSelected,
  isMultiSelected,
  zoom,
  snapToGrid,
  gridSize,
}: CanvasComponentProps) {
  const [isHovered, setIsHovered] = useState(false);
  const rndRef = useRef<Rnd>(null);

  const {
    selectComponent,
    updateComponent,
    addToSelection,
    removeFromSelection,
    setDragging,
    setResizing,
    markAsChanged,
    addToHistory,
  } = useTemplateBuilderStore();

  const handleClick = useCallback((event: React.MouseEvent) => {
    event.stopPropagation();

    if (event.ctrlKey || event.metaKey) {
      // Multi-selection
      if (isMultiSelected) {
        removeFromSelection(component.id);
      } else {
        addToSelection(component.id);
      }
    } else {
      selectComponent(component.id);
    }
  }, [component.id, isMultiSelected, selectComponent, addToSelection, removeFromSelection]);

  const handleDragStart = useCallback(() => {
    setDragging(true);
    if (!isSelected && !isMultiSelected) {
      selectComponent(component.id);
    }
  }, [component.id, isSelected, isMultiSelected, selectComponent, setDragging]);

  const handleDragStop = useCallback((e: any, data: any) => {
    setDragging(false);

    const newPosition: ComponentPosition = {
      ...component.position,
      x: snapToGrid ? Math.round(data.x / gridSize) * gridSize : data.x,
      y: snapToGrid ? Math.round(data.y / gridSize) * gridSize : data.y,
    };

    updateComponent(component.id, { position: newPosition });
    markAsChanged();
    addToHistory();
  }, [component.id, component.position, updateComponent, snapToGrid, gridSize, setDragging, markAsChanged, addToHistory]);

  const handleResizeStart = useCallback(() => {
    setResizing(true);
  }, [setResizing]);

  const handleResizeStop = useCallback((e: any, direction: any, ref: any, delta: any, position: any) => {
    setResizing(false);

    const newPosition: ComponentPosition = {
      x: snapToGrid ? Math.round(position.x / gridSize) * gridSize : position.x,
      y: snapToGrid ? Math.round(position.y / gridSize) * gridSize : position.y,
      width: snapToGrid ? Math.round(ref.offsetWidth / gridSize) * gridSize : ref.offsetWidth,
      height: snapToGrid ? Math.round(ref.offsetHeight / gridSize) * gridSize : ref.offsetHeight,
    };

    updateComponent(component.id, { position: newPosition });
    markAsChanged();
    addToHistory();
  }, [component.id, updateComponent, snapToGrid, gridSize, setResizing, markAsChanged, addToHistory]);

  const renderComponentContent = () => {
    const { type, properties } = component;

    switch (type) {
      case 'text':
        return (
          <div
            className="w-full h-full flex items-center justify-start overflow-hidden"
            style={{
              fontSize: `${(properties.fontSize || 12) * zoom}px`,
              fontWeight: properties.fontWeight || 'normal',
              textAlign: properties.textAlign || 'left',
              fontFamily: properties.fontFamily || 'inherit',
              lineHeight: properties.lineHeight || 1.2,
              color: component.styles?.color || '#000',
            }}
          >
            {properties.text || 'Text'}
          </div>
        );

      case 'image':
      case 'logo':
        return (
          <div className="w-full h-full flex items-center justify-center bg-gray-100 border border-dashed border-gray-300">
            {properties.src ? (
              <img
                src={properties.src}
                alt={properties.alt || 'Image'}
                className="max-w-full max-h-full object-contain"
              />
            ) : (
              <div className="flex flex-col items-center text-gray-400">
                <Image size={Math.min(24, component.position.width / 4)} />
                <span className="text-xs mt-1">Image</span>
              </div>
            )}
          </div>
        );

      case 'barcode':
        return (
          <div className="w-full h-full flex items-center justify-center bg-gray-50 border border-gray-200">
            <div className="flex flex-col items-center text-gray-600">
              <BarChart3 size={Math.min(24, component.position.width / 6)} />
              <span className="text-xs mt-1 font-mono">
                {properties.data || '1234567890'}
              </span>
            </div>
          </div>
        );

      case 'qr':
        return (
          <div className="w-full h-full flex items-center justify-center bg-gray-50 border border-gray-200">
            <QrCode size={Math.min(component.position.width, component.position.height) * 0.8} className="text-gray-700" />
          </div>
        );

      case 'table':
        return (
          <div className="w-full h-full overflow-hidden">
            <div className="w-full h-full flex flex-col text-xs">
              <div className="flex bg-gray-100 border-b border-gray-300">
                {(properties.columns || ['Col 1', 'Col 2']).map((col: string, index: number) => (
                  <div key={index} className="flex-1 px-1 py-1 font-semibold text-center border-r border-gray-300 last:border-r-0">
                    {col}
                  </div>
                ))}
              </div>
              <div className="flex-1 flex flex-col">
                {[1, 2].map((row) => (
                  <div key={row} className="flex border-b border-gray-200 last:border-b-0">
                    {(properties.columns || ['Col 1', 'Col 2']).map((col: string, index: number) => (
                      <div key={index} className="flex-1 px-1 py-1 text-center border-r border-gray-200 last:border-r-0">
                        Data
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      case 'line':
        return (
          <div
            className="w-full h-full flex items-center justify-center"
            style={{
              borderTop: component.position.height <= 5 ? `${properties.thickness || 1}px ${properties.style || 'solid'} ${component.styles?.borderColor || '#000'}` : 'none',
              borderLeft: component.position.width <= 5 ? `${properties.thickness || 1}px ${properties.style || 'solid'} ${component.styles?.borderColor || '#000'}` : 'none',
            }}
          >
            {component.position.height > 5 && component.position.width > 5 && (
              <Minus className="text-gray-400" size={16} />
            )}
          </div>
        );

      case 'spacer':
        return (
          <div className="w-full h-full border border-dashed border-gray-300 bg-gray-50 flex items-center justify-center">
            <span className="text-xs text-gray-400">Spacer</span>
          </div>
        );

      case 'datetime':
        return (
          <div className="w-full h-full flex items-center justify-start px-2">
            <Calendar size={14} className="mr-2 text-gray-600" />
            <span className="text-sm text-gray-700">
              {properties.format === 'date' ? '2024-01-15' :
               properties.format === 'time' ? '14:30:00' :
               '2024-01-15 14:30:00'}
            </span>
          </div>
        );

      case 'counter':
        return (
          <div className="w-full h-full flex items-center justify-start px-2">
            <Hash size={14} className="mr-2 text-gray-600" />
            <span className="text-sm font-mono text-gray-700">
              {properties.prefix || '#'}001
            </span>
          </div>
        );

      case 'container':
        return (
          <div className="w-full h-full border-2 border-dashed border-gray-400 bg-transparent flex items-center justify-center">
            <span className="text-xs text-gray-500">Container</span>
          </div>
        );

      default:
        const IconComponent = componentIcons[type as keyof typeof componentIcons];
        return (
          <div className="w-full h-full flex items-center justify-center bg-gray-100 border border-gray-300">
            {IconComponent && <IconComponent size={20} className="text-gray-400" />}
          </div>
        );
    }
  };

  const isVisible = component.isVisible !== false;
  const isLocked = component.isLocked === true;

  return (
    <Rnd
      ref={rndRef}
      size={{
        width: component.position.width,
        height: component.position.height,
      }}
      position={{
        x: component.position.x,
        y: component.position.y,
      }}
      onDragStart={handleDragStart}
      onDragStop={handleDragStop}
      onResizeStart={handleResizeStart}
      onResizeStop={handleResizeStop}
      disableDragging={isLocked}
      enableResizing={!isLocked && isSelected}
      className={`
        template-component
        ${isSelected ? 'selected' : ''}
        ${isMultiSelected ? 'multi-selected' : ''}
        ${isLocked ? 'locked' : ''}
        ${!isVisible ? 'invisible' : ''}
      `}
      style={{
        zIndex: component.zIndex + (isSelected ? 1000 : 0),
        opacity: isVisible ? (component.styles?.opacity ?? 1) : 0.3,
      }}
      bounds="parent"
      resizeHandleStyles={{
        bottomRight: {
          bottom: -5,
          right: -5,
          width: 10,
          height: 10,
          backgroundColor: '#3b82f6',
          border: '1px solid #ffffff',
          borderRadius: '2px',
        },
        bottomLeft: {
          bottom: -5,
          left: -5,
          width: 10,
          height: 10,
          backgroundColor: '#3b82f6',
          border: '1px solid #ffffff',
          borderRadius: '2px',
        },
        topRight: {
          top: -5,
          right: -5,
          width: 10,
          height: 10,
          backgroundColor: '#3b82f6',
          border: '1px solid #ffffff',
          borderRadius: '2px',
        },
        topLeft: {
          top: -5,
          left: -5,
          width: 10,
          height: 10,
          backgroundColor: '#3b82f6',
          border: '1px solid #ffffff',
          borderRadius: '2px',
        },
        top: {
          top: -5,
          left: '50%',
          transform: 'translateX(-50%)',
          width: 10,
          height: 10,
          backgroundColor: '#3b82f6',
          border: '1px solid #ffffff',
          borderRadius: '2px',
        },
        bottom: {
          bottom: -5,
          left: '50%',
          transform: 'translateX(-50%)',
          width: 10,
          height: 10,
          backgroundColor: '#3b82f6',
          border: '1px solid #ffffff',
          borderRadius: '2px',
        },
        left: {
          left: -5,
          top: '50%',
          transform: 'translateY(-50%)',
          width: 10,
          height: 10,
          backgroundColor: '#3b82f6',
          border: '1px solid #ffffff',
          borderRadius: '2px',
        },
        right: {
          right: -5,
          top: '50%',
          transform: 'translateY(-50%)',
          width: 10,
          height: 10,
          backgroundColor: '#3b82f6',
          border: '1px solid #ffffff',
          borderRadius: '2px',
        },
      }}
    >
      <div
        className={`
          relative w-full h-full cursor-pointer transition-all duration-200
          ${isSelected ? 'ring-2 ring-blue-500' : ''}
          ${isMultiSelected ? 'ring-2 ring-purple-500' : ''}
          ${isHovered && !isSelected && !isMultiSelected ? 'ring-1 ring-gray-400' : ''}
        `}
        style={{
          backgroundColor: component.styles?.backgroundColor,
          borderRadius: component.styles?.borderRadius,
          border: component.styles?.borderWidth
            ? `${component.styles.borderWidth}px ${component.styles.borderStyle || 'solid'} ${component.styles.borderColor || '#000'}`
            : undefined,
          transform: component.styles?.rotation
            ? `rotate(${component.styles.rotation}deg)`
            : undefined,
        }}
        onClick={handleClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {renderComponentContent()}

        {/* Component badges */}
        {(isLocked || !isVisible) && (
          <div className="absolute top-1 right-1 flex space-x-1">
            {isLocked && (
              <div className="w-4 h-4 bg-red-500 text-white flex items-center justify-center rounded-sm">
                <Lock size={10} />
              </div>
            )}
            {!isVisible && (
              <div className="w-4 h-4 bg-gray-500 text-white flex items-center justify-center rounded-sm">
                <EyeOff size={10} />
              </div>
            )}
          </div>
        )}

        {/* Component label (when selected) */}
        {isSelected && (
          <div className="absolute -top-6 left-0 bg-blue-500 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
            {component.name || component.type}
          </div>
        )}
      </div>
    </Rnd>
  );
}