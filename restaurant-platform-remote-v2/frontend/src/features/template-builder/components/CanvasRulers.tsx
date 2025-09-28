import React from 'react';

interface CanvasRulersProps {
  canvasWidth: number;
  canvasHeight: number;
  zoom: number;
  panOffset: { x: number; y: number };
}

export function CanvasRulers({ canvasWidth, canvasHeight, zoom, panOffset }: CanvasRulersProps) {
  const rulerSize = 20;
  const tickInterval = 10; // pixels at 100% zoom
  const majorTickInterval = 50; // pixels at 100% zoom

  // Generate horizontal ruler ticks
  const horizontalTicks = [];
  const horizontalRange = canvasWidth / zoom;
  for (let i = 0; i <= horizontalRange; i += tickInterval) {
    const isMajor = i % majorTickInterval === 0;
    const x = i * zoom;

    horizontalTicks.push(
      <g key={`h-${i}`}>
        <line
          x1={x}
          y1={isMajor ? 0 : rulerSize / 2}
          x2={x}
          y2={rulerSize}
          stroke="#666"
          strokeWidth={isMajor ? 1 : 0.5}
        />
        {isMajor && i > 0 && (
          <text
            x={x + 2}
            y={rulerSize - 4}
            fontSize={9}
            fill="#666"
            fontFamily="monospace"
          >
            {i}
          </text>
        )}
      </g>
    );
  }

  // Generate vertical ruler ticks
  const verticalTicks = [];
  const verticalRange = canvasHeight / zoom;
  for (let i = 0; i <= verticalRange; i += tickInterval) {
    const isMajor = i % majorTickInterval === 0;
    const y = i * zoom;

    verticalTicks.push(
      <g key={`v-${i}`}>
        <line
          x1={isMajor ? 0 : rulerSize / 2}
          y1={y}
          x2={rulerSize}
          y2={y}
          stroke="#666"
          strokeWidth={isMajor ? 1 : 0.5}
        />
        {isMajor && i > 0 && (
          <text
            x={4}
            y={y - 2}
            fontSize={9}
            fill="#666"
            fontFamily="monospace"
            transform={`rotate(-90, 4, ${y - 2})`}
          >
            {i}
          </text>
        )}
      </g>
    );
  }

  return (
    <>
      {/* Horizontal Ruler */}
      <div
        className="absolute bg-gray-100 border-b border-gray-300"
        style={{
          left: panOffset.x + rulerSize,
          top: panOffset.y - rulerSize,
          width: canvasWidth,
          height: rulerSize,
        }}
      >
        <svg width="100%" height={rulerSize}>
          {horizontalTicks}
        </svg>
      </div>

      {/* Vertical Ruler */}
      <div
        className="absolute bg-gray-100 border-r border-gray-300"
        style={{
          left: panOffset.x - rulerSize,
          top: panOffset.y + rulerSize,
          width: rulerSize,
          height: canvasHeight,
        }}
      >
        <svg width={rulerSize} height="100%">
          {verticalTicks}
        </svg>
      </div>

      {/* Corner Square */}
      <div
        className="absolute bg-gray-200 border border-gray-300 flex items-center justify-center"
        style={{
          left: panOffset.x - rulerSize,
          top: panOffset.y - rulerSize,
          width: rulerSize,
          height: rulerSize,
        }}
      >
        <div className="w-2 h-2 bg-gray-400 rounded"></div>
      </div>
    </>
  );
}