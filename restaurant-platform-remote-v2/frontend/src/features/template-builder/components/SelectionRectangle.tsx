import React from 'react';

interface SelectionRectangleProps {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function SelectionRectangle({ x, y, width, height }: SelectionRectangleProps) {
  return (
    <div
      className="absolute border-2 border-dashed border-blue-500 bg-blue-100 bg-opacity-20 pointer-events-none"
      style={{
        left: x,
        top: y,
        width: Math.max(width, 0),
        height: Math.max(height, 0),
      }}
    >
      {/* Selection info */}
      <div className="absolute -top-6 left-0 bg-blue-600 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
        {Math.round(width)} × {Math.round(height)}
      </div>
    </div>
  );
}