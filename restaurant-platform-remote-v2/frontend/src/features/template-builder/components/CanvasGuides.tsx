import React from 'react';
import { TemplateComponent } from '../types/template.types';

interface CanvasGuidesProps {
  canvasWidth: number;
  canvasHeight: number;
  zoom: number;
  components: TemplateComponent[];
}

export function CanvasGuides({ canvasWidth, canvasHeight, zoom, components }: CanvasGuidesProps) {
  if (components.length === 0) return null;

  // Get alignment guides based on selected components
  const guides: { x?: number; y?: number; type: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom' }[] = [];

  // Add guides for all other components to help with alignment
  const allOtherComponents = components; // In a real app, this would be filtered to exclude selected ones

  allOtherComponents.forEach(component => {
    const pos = component.position;

    // Vertical guides
    guides.push(
      { x: pos.x * zoom, type: 'left' },
      { x: (pos.x + pos.width / 2) * zoom, type: 'center' },
      { x: (pos.x + pos.width) * zoom, type: 'right' }
    );

    // Horizontal guides
    guides.push(
      { y: pos.y * zoom, type: 'top' },
      { y: (pos.y + pos.height / 2) * zoom, type: 'middle' },
      { y: (pos.y + pos.height) * zoom, type: 'bottom' }
    );
  });

  // Remove duplicates
  const uniqueGuides = guides.filter((guide, index, self) =>
    index === self.findIndex(g => g.x === guide.x && g.y === guide.y)
  );

  return (
    <div className="absolute inset-0 pointer-events-none">
      {uniqueGuides.map((guide, index) => (
        <div key={index}>
          {guide.x !== undefined && (
            <div
              className="absolute border-l border-dashed border-pink-400 opacity-60"
              style={{
                left: guide.x,
                top: 0,
                height: '100%',
                borderWidth: 0.5,
              }}
            />
          )}
          {guide.y !== undefined && (
            <div
              className="absolute border-t border-dashed border-pink-400 opacity-60"
              style={{
                top: guide.y,
                left: 0,
                width: '100%',
                borderWidth: 0.5,
              }}
            />
          )}
        </div>
      ))}
    </div>
  );
}