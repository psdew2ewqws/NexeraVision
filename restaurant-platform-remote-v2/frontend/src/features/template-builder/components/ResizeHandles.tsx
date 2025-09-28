import React from 'react';

interface ResizeHandlesProps {
  onResizeStart: (handle: string, event: React.MouseEvent) => void;
  zoom: number;
  isResizing: boolean;
  activeHandle: string | null;
}

export function ResizeHandles({ onResizeStart, zoom, isResizing, activeHandle }: ResizeHandlesProps) {
  const handleSize = Math.max(6, 8 / zoom); // Minimum 6px, scales with zoom

  const handles = [
    { id: 'nw', cursor: 'nw-resize', position: { top: -handleSize/2, left: -handleSize/2 } },
    { id: 'n', cursor: 'n-resize', position: { top: -handleSize/2, left: '50%', transform: 'translateX(-50%)' } },
    { id: 'ne', cursor: 'ne-resize', position: { top: -handleSize/2, right: -handleSize/2 } },
    { id: 'e', cursor: 'e-resize', position: { top: '50%', right: -handleSize/2, transform: 'translateY(-50%)' } },
    { id: 'se', cursor: 'se-resize', position: { bottom: -handleSize/2, right: -handleSize/2 } },
    { id: 's', cursor: 's-resize', position: { bottom: -handleSize/2, left: '50%', transform: 'translateX(-50%)' } },
    { id: 'sw', cursor: 'sw-resize', position: { bottom: -handleSize/2, left: -handleSize/2 } },
    { id: 'w', cursor: 'w-resize', position: { top: '50%', left: -handleSize/2, transform: 'translateY(-50%)' } },
  ];

  return (
    <>
      {handles.map((handle) => (
        <div
          key={handle.id}
          className={`
            absolute bg-blue-500 border border-white rounded-sm z-10 transition-all duration-150
            hover:bg-blue-600 hover:scale-110
            ${activeHandle === handle.id ? 'bg-blue-700 scale-110' : ''}
          `}
          style={{
            width: handleSize,
            height: handleSize,
            cursor: handle.cursor,
            ...handle.position,
          }}
          onMouseDown={(event) => {
            event.preventDefault();
            event.stopPropagation();
            onResizeStart(handle.id, event);
          }}
        >
          {/* Handle grip indicator */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-1 h-1 bg-white rounded-full opacity-75"></div>
          </div>
        </div>
      ))}
    </>
  );
}