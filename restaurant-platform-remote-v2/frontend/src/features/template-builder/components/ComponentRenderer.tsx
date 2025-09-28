import React from 'react';
import { TemplateComponent } from '../types/template.types';

interface ComponentRendererProps {
  component: TemplateComponent;
  zoom: number;
}

export function ComponentRenderer({ component, zoom }: ComponentRendererProps) {
  const { margin, padding, ...restStyles } = component.styles || {};
  const baseStyle = {
    width: '100%',
    height: '100%',
    fontSize: `${(component.properties?.fontSize || 14) * zoom}px`,
    fontWeight: component.properties?.fontWeight || 'normal',
    textAlign: component.properties?.textAlign || 'left',
    color: component.properties?.color || '#000000',
    backgroundColor: component.properties?.backgroundColor || 'transparent',
    ...restStyles,
    margin: margin ? `${margin.top}px ${margin.right}px ${margin.bottom}px ${margin.left}px` : undefined,
    padding: padding ? `${padding.top}px ${padding.right}px ${padding.bottom}px ${padding.left}px` : undefined,
  };

  switch (component.type) {
    case 'text':
      return (
        <div
          style={baseStyle}
          className="flex items-center justify-start p-1 overflow-hidden"
        >
          <span className="truncate">
            {component.properties?.text || 'Text Component'}
          </span>
        </div>
      );

    case 'image':
      return (
        <div style={baseStyle} className="relative overflow-hidden bg-gray-100 border border-gray-300">
          {component.properties?.src ? (
            <img
              src={component.properties.src}
              alt={component.properties?.alt || 'Image'}
              className="w-full h-full object-cover"
              style={{
                objectFit: component.properties?.fit || 'contain',
              }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">
              <div className="text-center">
                <div className="mb-1">📷</div>
                <div>Image</div>
              </div>
            </div>
          )}
        </div>
      );

    case 'line':
      const thickness = (component.properties?.thickness || 1) * zoom;
      const lineStyle = component.properties?.style || 'solid';

      return (
        <div style={baseStyle} className="relative">
          <div
            className="absolute inset-0"
            style={{
              borderTop: `${thickness}px ${lineStyle} ${component.properties?.color || '#000000'}`,
              top: '50%',
              transform: 'translateY(-50%)',
            }}
          />
        </div>
      );

    case 'table':
      const rows = component.properties?.rows || 3;
      const columns = component.properties?.columns || ['Col 1', 'Col 2'];
      const columnCount = Array.isArray(columns) ? columns.length : columns;
      const borderWidth = (component.properties?.borderWidth || 1) * zoom;
      const borderColor = component.properties?.borderColor || '#000000';
      const cellPadding = (component.properties?.cellPadding || 5) * zoom;

      return (
        <div style={baseStyle} className="overflow-hidden">
          <table
            className="w-full h-full"
            style={{
              borderCollapse: 'collapse',
              border: `${borderWidth}px solid ${borderColor}`,
              fontSize: `${12 * zoom}px`,
            }}
          >
            <tbody>
              {Array.from({ length: rows }, (_, rowIndex) => (
                <tr key={rowIndex}>
                  {Array.from({ length: columnCount }, (_, colIndex) => (
                    <td
                      key={colIndex}
                      style={{
                        border: `${borderWidth}px solid ${borderColor}`,
                        padding: cellPadding,
                        textAlign: 'left',
                        verticalAlign: 'top',
                      }}
                    >
                      Cell {rowIndex + 1},{colIndex + 1}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );

    case 'barcode':
      return (
        <div style={baseStyle} className="flex flex-col items-center justify-center bg-white border border-gray-300">
          {/* Simplified barcode visualization */}
          <div className="flex items-end justify-center space-x-1 mb-1">
            {Array.from({ length: 12 }, (_, i) => (
              <div
                key={i}
                className="bg-black"
                style={{
                  width: Math.max(1, 2 * zoom),
                  height: `${Math.random() * 60 + 20}%`,
                }}
              />
            ))}
          </div>
          {component.properties?.displayValue && (
            <div className="text-xs text-center">
              {component.properties?.value || '123456789'}
            </div>
          )}
        </div>
      );

    case 'qr':
      const qrSize = Math.min(component.position.width, component.position.height) * zoom;

      return (
        <div style={baseStyle} className="flex items-center justify-center bg-white border border-gray-300">
          {/* Simplified QR code visualization */}
          <div
            className="bg-gray-800 grid grid-cols-8 gap-px"
            style={{
              width: qrSize * 0.8,
              height: qrSize * 0.8,
            }}
          >
            {Array.from({ length: 64 }, (_, i) => (
              <div
                key={i}
                className={`${Math.random() > 0.5 ? 'bg-black' : 'bg-white'} aspect-square`}
              />
            ))}
          </div>
        </div>
      );

    // Shape component not applicable for thermal printer templates
    /*
    case 'shape':
      const shapeType = component.properties?.shapeType || 'rectangle';
      const fillColor = component.properties?.fillColor || 'transparent';
      const strokeColor = component.properties?.strokeColor || '#000000';
      const strokeWidth = (component.properties?.strokeWidth || 1) * zoom;

      const shapeStyle = {
        ...baseStyle,
        backgroundColor: fillColor,
        border: `${strokeWidth}px solid ${strokeColor}`,
      };

      switch (shapeType) {
        case 'circle':
          return (
            <div
              style={{
                ...shapeStyle,
                borderRadius: '50%',
              }}
            />
          );
        case 'rectangle':
        default:
          return <div style={shapeStyle} />;
      }
    */

    default:
      return (
        <div style={baseStyle} className="flex items-center justify-center bg-gray-100 border border-gray-300 text-gray-500 text-xs">
          <div className="text-center">
            <div className="mb-1">❓</div>
            <div>Unknown</div>
            <div>{component.type}</div>
          </div>
        </div>
      );
  }
}