import React, { useMemo } from 'react';
import { useTemplateBuilderStore } from '../stores/template-builder.store';
import { ComponentRenderer } from './ComponentRenderer';

interface PreviewPanelProps {
  className?: string;
}

export function PreviewPanel({ className }: PreviewPanelProps) {
  const { currentTemplate } = useTemplateBuilderStore();

  const sampleData = {
    company: {
      name: 'Demo Restaurant',
      address: '123 Main Street',
      phone: '(555) 123-4567',
    },
    order: {
      number: '#12345',
      date: new Date().toLocaleDateString(),
      time: new Date().toLocaleTimeString(),
      customerName: 'John Doe',
      items: [
        { name: 'Pizza Margherita', quantity: 2, price: 15.99 },
        { name: 'Coca Cola', quantity: 1, price: 2.50 },
      ],
      total: 34.48,
      tax: 4.48,
      subtotal: 30.00,
    },
  };

  const previewContent = useMemo(() => {
    if (!currentTemplate?.designData?.components) {
      return (
        <div className="bg-white border border-gray-300 rounded-lg p-4 text-center">
          <p className="text-sm text-gray-500">
            Add components to see preview
          </p>
        </div>
      );
    }

    const canvasSettings = currentTemplate.canvasSettings;
    const paperWidth = canvasSettings?.paperSize === '80mm' ? 304 :
                      canvasSettings?.paperSize === '58mm' ? 220 : 304;

    return (
      <div className="bg-white border border-gray-300 rounded-lg overflow-hidden">
        {/* Receipt Paper Simulation */}
        <div
          className="relative bg-white mx-auto"
          style={{
            width: paperWidth + 'px',
            minHeight: '400px',
            fontFamily: 'monospace',
            fontSize: '12px',
          }}
        >
          {/* Render components */}
          {currentTemplate.designData.components.map((component) => (
            <div
              key={component.id}
              style={{
                position: 'absolute',
                left: component.position.x + 'px',
                top: component.position.y + 'px',
                width: component.position.width + 'px',
                height: component.position.height + 'px',
                zIndex: component.zIndex || 1,
              }}
            >
              <ComponentRenderer component={component} zoom={1} />
            </div>
          ))}

          {/* Show sample receipt if no components */}
          {currentTemplate.designData.components.length === 0 && (
            <div className="p-4 text-center">
              <div className="text-lg font-bold mb-2">{sampleData.company.name}</div>
              <div className="text-sm mb-1">{sampleData.company.address}</div>
              <div className="text-sm mb-4">{sampleData.company.phone}</div>
              <div className="border-t border-gray-300 my-2"></div>
              <div className="text-sm mb-2">Order: {sampleData.order.number}</div>
              <div className="text-xs mb-4">{sampleData.order.date} {sampleData.order.time}</div>
              {sampleData.order.items.map((item, index) => (
                <div key={index} className="flex justify-between text-sm mb-1">
                  <span>{item.quantity}x {item.name}</span>
                  <span>${item.price.toFixed(2)}</span>
                </div>
              ))}
              <div className="border-t border-gray-300 my-2"></div>
              <div className="flex justify-between text-sm">
                <span>Total:</span>
                <span className="font-bold">${sampleData.order.total.toFixed(2)}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }, [currentTemplate]);

  return (
    <div className={`flex flex-col h-full ${className}`}>
      <div className="p-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">Live Preview</h3>
        <p className="text-sm text-gray-500">See how your template will look when printed</p>
      </div>

      <div className="flex-1 p-4 overflow-y-auto bg-gray-50">
        {previewContent}
      </div>

      {/* Preview Controls */}
      <div className="p-4 border-t border-gray-200 bg-white">
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Paper Size:</span>
            <span className="font-medium">
              {currentTemplate?.canvasSettings?.paperSize || '80mm'}
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Components:</span>
            <span className="font-medium">
              {currentTemplate?.designData?.components?.length || 0}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

