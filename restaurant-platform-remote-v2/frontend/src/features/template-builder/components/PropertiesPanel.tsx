import React from 'react';
import { useTemplateBuilderStore } from '../stores/template-builder.store';

interface PropertiesPanelProps {
  className?: string;
}

export function PropertiesPanel({ className }: PropertiesPanelProps) {
  const { selectedComponentId, getComponentById, updateComponent } = useTemplateBuilderStore();

  const selectedComponent = selectedComponentId ? getComponentById(selectedComponentId) : null;

  if (!selectedComponent) {
    return (
      <div className={`flex flex-col h-full ${className}`}>
        <div className="p-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Properties</h3>
        </div>
        <div className="flex-1 flex items-center justify-center text-gray-500">
          <div className="text-center">
            <p className="text-sm">Select a component to edit its properties</p>
          </div>
        </div>
      </div>
    );
  }

  const handlePropertyChange = (property: string, value: any) => {
    updateComponent(selectedComponent.id, {
      properties: {
        ...selectedComponent.properties,
        [property]: value,
      },
    });
  };

  const renderTextProperties = () => (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Text Content
        </label>
        <textarea
          value={selectedComponent.properties.text || ''}
          onChange={(e) => handlePropertyChange('text', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm resize-none"
          rows={3}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Font Size
          </label>
          <input
            type="number"
            value={selectedComponent.properties.fontSize || 12}
            onChange={(e) => handlePropertyChange('fontSize', parseInt(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            min="6"
            max="72"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Font Weight
          </label>
          <select
            value={selectedComponent.properties.fontWeight || 'normal'}
            onChange={(e) => handlePropertyChange('fontWeight', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
          >
            <option value="normal">Normal</option>
            <option value="bold">Bold</option>
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Text Alignment
        </label>
        <select
          value={selectedComponent.properties.textAlign || 'left'}
          onChange={(e) => handlePropertyChange('textAlign', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
        >
          <option value="left">Left</option>
          <option value="center">Center</option>
          <option value="right">Right</option>
        </select>
      </div>
    </div>
  );

  const renderComponentProperties = () => {
    switch (selectedComponent.type) {
      case 'text':
        return renderTextProperties();
      default:
        return (
          <div className="text-sm text-gray-500">
            Properties for {selectedComponent.type} component coming soon...
          </div>
        );
    }
  };

  return (
    <div className={`flex flex-col h-full ${className}`}>
      <div className="p-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">Properties</h3>
        <p className="text-sm text-gray-600 mt-1">
          {selectedComponent.name || selectedComponent.type}
        </p>
      </div>

      <div className="flex-1 p-4 overflow-y-auto">
        {renderComponentProperties()}
      </div>
    </div>
  );
}

