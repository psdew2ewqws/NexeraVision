import React, { useState, useCallback } from 'react';
import { useAdvancedTemplateBuilderStore } from '../stores/advanced-template-builder.store';
import {
  Palette,
  Type,
  Layout,
  Move,
  RotateCw,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  Trash2,
  Copy,
  Layers,
  Settings,
  ChevronDown,
  ChevronRight,
  Hash,
  Percent,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Bold,
  Italic,
  Underline,
  Strikethrough,
} from 'lucide-react';

interface CollapsibleSectionProps {
  title: string;
  icon: React.ReactNode;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

function CollapsibleSection({ title, icon, defaultOpen = true, children }: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border border-gray-200 rounded-lg mb-3">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-3 py-2 flex items-center justify-between text-left hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center space-x-2">
          {icon}
          <span className="text-sm font-medium text-gray-900">{title}</span>
        </div>
        {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
      </button>

      {isOpen && (
        <div className="px-3 pb-3 border-t border-gray-200">
          {children}
        </div>
      )}
    </div>
  );
}

interface PropertyInputProps {
  label: string;
  value: any;
  onChange: (value: any) => void;
  type: 'text' | 'number' | 'color' | 'select' | 'slider' | 'checkbox' | 'textarea';
  options?: { value: any; label: string }[];
  min?: number;
  max?: number;
  step?: number;
  placeholder?: string;
  suffix?: string;
}

function PropertyInput({
  label,
  value,
  onChange,
  type,
  options,
  min,
  max,
  step,
  placeholder,
  suffix,
}: PropertyInputProps) {
  const baseInputClass = "w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500";

  const renderInput = () => {
    switch (type) {
      case 'checkbox':
        return (
          <label className="flex items-center space-x-2 cursor-pointer">
            <input
              type="checkbox"
              checked={value}
              onChange={(e) => onChange(e.target.checked)}
              className="w-4 h-4 text-blue-600 border border-gray-300 rounded focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">{label}</span>
          </label>
        );

      case 'color':
        return (
          <div className="flex space-x-2">
            <input
              type="color"
              value={value || '#000000'}
              onChange={(e) => onChange(e.target.value)}
              className="w-8 h-8 border border-gray-300 rounded cursor-pointer"
            />
            <input
              type="text"
              value={value || ''}
              onChange={(e) => onChange(e.target.value)}
              className={`${baseInputClass} flex-1 font-mono`}
              placeholder="#000000"
            />
          </div>
        );

      case 'select':
        return (
          <select
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className={baseInputClass}
          >
            {options?.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        );

      case 'slider':
        return (
          <div className="space-y-2">
            <input
              type="range"
              value={value}
              onChange={(e) => onChange(Number(e.target.value))}
              min={min}
              max={max}
              step={step}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-gray-500">
              <span>{min}</span>
              <span className="font-medium">{value}{suffix}</span>
              <span>{max}</span>
            </div>
          </div>
        );

      case 'textarea':
        return (
          <textarea
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            rows={3}
            className={`${baseInputClass} resize-none`}
          />
        );

      case 'number':
        return (
          <div className="flex">
            <input
              type="number"
              value={value || ''}
              onChange={(e) => onChange(Number(e.target.value))}
              min={min}
              max={max}
              step={step}
              placeholder={placeholder}
              className={`${baseInputClass} ${suffix ? 'rounded-r-none' : ''}`}
            />
            {suffix && (
              <span className="px-2 py-1.5 bg-gray-100 border border-l-0 border-gray-300 rounded-r text-sm text-gray-600">
                {suffix}
              </span>
            )}
          </div>
        );

      default:
        return (
          <input
            type="text"
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className={baseInputClass}
          />
        );
    }
  };

  if (type === 'checkbox') {
    return <div className="mb-3">{renderInput()}</div>;
  }

  return (
    <div className="mb-3">
      <label className="block text-xs font-medium text-gray-700 mb-1">
        {label}
      </label>
      {renderInput()}
    </div>
  );
}

export function AdvancedPropertiesPanel({ className }: { className?: string }) {
  const {
    selectedComponentId,
    multiSelection,
    components,
    updateComponent,
    deleteComponents,
    duplicateComponents,
    lockComponents,
    unlockComponents,
    hideComponents,
    showComponents,
    lockedComponents,
    hiddenComponents,
  } = useAdvancedTemplateBuilderStore();

  // Get selected component(s)
  const selectedComponent = selectedComponentId
    ? components.find(c => c.id === selectedComponentId)
    : null;

  const selectedComponents = multiSelection.length > 0
    ? components.filter(c => multiSelection.includes(c.id))
    : [];

  const isMultiSelection = multiSelection.length > 1;
  const hasSelection = selectedComponent || isMultiSelection;

  // Update property for selected component(s)
  const updateProperty = useCallback((property: string, value: any) => {
    if (isMultiSelection) {
      // Update all selected components
      multiSelection.forEach(id => {
        updateComponent(id, {
          properties: {
            ...components.find(c => c.id === id)?.properties,
            [property]: value,
          },
        });
      });
    } else if (selectedComponent) {
      updateComponent(selectedComponent.id, {
        properties: {
          ...selectedComponent.properties,
          [property]: value,
        },
      });
    }
  }, [isMultiSelection, multiSelection, selectedComponent, updateComponent, components]);

  // Update position property
  const updatePosition = useCallback((property: string, value: any) => {
    if (isMultiSelection) {
      multiSelection.forEach(id => {
        const component = components.find(c => c.id === id);
        if (component) {
          updateComponent(id, {
            position: {
              ...component.position,
              [property]: value,
            },
          });
        }
      });
    } else if (selectedComponent) {
      updateComponent(selectedComponent.id, {
        position: {
          ...selectedComponent.position,
          [property]: value,
        },
      });
    }
  }, [isMultiSelection, multiSelection, selectedComponent, updateComponent, components]);

  // Update style property
  const updateStyle = useCallback((property: string, value: any) => {
    if (isMultiSelection) {
      multiSelection.forEach(id => {
        const component = components.find(c => c.id === id);
        if (component) {
          updateComponent(id, {
            styles: {
              ...component.styles,
              [property]: value,
            },
          });
        }
      });
    } else if (selectedComponent) {
      updateComponent(selectedComponent.id, {
        styles: {
          ...selectedComponent.styles,
          [property]: value,
        },
      });
    }
  }, [isMultiSelection, multiSelection, selectedComponent, updateComponent, components]);

  if (!hasSelection) {
    return (
      <div className={`flex flex-col h-full bg-white ${className}`}>
        <div className="p-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Properties</h3>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center text-gray-500">
            <Settings className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Select a component to edit its properties</p>
          </div>
        </div>
      </div>
    );
  }

  // Common properties for multi-selection
  const commonProperties = isMultiSelection ? {
    // Only show properties that are consistent across all selected components
  } : selectedComponent?.properties || {};

  const commonPosition = isMultiSelection
    ? { x: 0, y: 0, width: 0, height: 0 } // Don't show position for multi-selection
    : selectedComponent?.position || { x: 0, y: 0, width: 0, height: 0 };

  return (
    <div className={`flex flex-col h-full bg-white ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-semibold text-gray-900">Properties</h3>

          {/* Quick Actions */}
          <div className="flex space-x-1">
            <button
              onClick={() => duplicateComponents(multiSelection.length > 0 ? multiSelection : [selectedComponent!.id])}
              className="p-1.5 text-gray-600 hover:bg-gray-100 rounded transition-colors"
              title="Duplicate"
            >
              <Copy className="w-4 h-4" />
            </button>

            <button
              onClick={() => {
                const ids = multiSelection.length > 0 ? multiSelection : [selectedComponent!.id];
                const isLocked = ids.some(id => lockedComponents.includes(id));
                if (isLocked) {
                  unlockComponents(ids);
                } else {
                  lockComponents(ids);
                }
              }}
              className="p-1.5 text-gray-600 hover:bg-gray-100 rounded transition-colors"
              title={multiSelection.some(id => lockedComponents.includes(id)) ? "Unlock" : "Lock"}
            >
              {multiSelection.some(id => lockedComponents.includes(id)) ?
                <Unlock className="w-4 h-4" /> :
                <Lock className="w-4 h-4" />
              }
            </button>

            <button
              onClick={() => {
                const ids = multiSelection.length > 0 ? multiSelection : [selectedComponent!.id];
                const isHidden = ids.some(id => hiddenComponents.includes(id));
                if (isHidden) {
                  showComponents(ids);
                } else {
                  hideComponents(ids);
                }
              }}
              className="p-1.5 text-gray-600 hover:bg-gray-100 rounded transition-colors"
              title={multiSelection.some(id => hiddenComponents.includes(id)) ? "Show" : "Hide"}
            >
              {multiSelection.some(id => hiddenComponents.includes(id)) ?
                <Eye className="w-4 h-4" /> :
                <EyeOff className="w-4 h-4" />
              }
            </button>

            <button
              onClick={() => deleteComponents(multiSelection.length > 0 ? multiSelection : [selectedComponent!.id])}
              className="p-1.5 text-red-600 hover:bg-red-100 rounded transition-colors"
              title="Delete"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Selection Info */}
        <div className="text-sm text-gray-600">
          {isMultiSelection ? (
            <span>{multiSelection.length} components selected</span>
          ) : (
            <span>{selectedComponent?.name} ({selectedComponent?.type})</span>
          )}
        </div>
      </div>

      {/* Properties Content */}
      <div className="flex-1 overflow-y-auto p-4">

        {/* Position & Size (only for single selection) */}
        {!isMultiSelection && selectedComponent && (
          <CollapsibleSection title="Position & Size" icon={<Move className="w-4 h-4" />}>
            <div className="grid grid-cols-2 gap-2">
              <PropertyInput
                label="X"
                value={commonPosition.x}
                onChange={(value) => updatePosition('x', value)}
                type="number"
                suffix="px"
              />
              <PropertyInput
                label="Y"
                value={commonPosition.y}
                onChange={(value) => updatePosition('y', value)}
                type="number"
                suffix="px"
              />
              <PropertyInput
                label="Width"
                value={commonPosition.width}
                onChange={(value) => updatePosition('width', value)}
                type="number"
                min={1}
                suffix="px"
              />
              <PropertyInput
                label="Height"
                value={commonPosition.height}
                onChange={(value) => updatePosition('height', value)}
                type="number"
                min={1}
                suffix="px"
              />
            </div>
          </CollapsibleSection>
        )}

        {/* Typography (for text components) */}
        {(!isMultiSelection || selectedComponents.every(c => c.type === 'text')) && (
          <CollapsibleSection title="Typography" icon={<Type className="w-4 h-4" />}>
            {(!isMultiSelection && selectedComponent?.type === 'text') && (
              <PropertyInput
                label="Text Content"
                value={commonProperties.text}
                onChange={(value) => updateProperty('text', value)}
                type="textarea"
                placeholder="Enter text content..."
              />
            )}

            <PropertyInput
              label="Font Size"
              value={commonProperties.fontSize}
              onChange={(value) => updateProperty('fontSize', value)}
              type="slider"
              min={8}
              max={72}
              step={1}
              suffix="px"
            />

            <PropertyInput
              label="Font Weight"
              value={commonProperties.fontWeight}
              onChange={(value) => updateProperty('fontWeight', value)}
              type="select"
              options={[
                { value: 'normal', label: 'Normal' },
                { value: 'bold', label: 'Bold' },
                { value: '100', label: 'Thin' },
                { value: '300', label: 'Light' },
                { value: '500', label: 'Medium' },
                { value: '600', label: 'Semi Bold' },
                { value: '700', label: 'Bold' },
                { value: '900', label: 'Black' },
              ]}
            />

            <PropertyInput
              label="Text Align"
              value={commonProperties.textAlign}
              onChange={(value) => updateProperty('textAlign', value)}
              type="select"
              options={[
                { value: 'left', label: 'Left' },
                { value: 'center', label: 'Center' },
                { value: 'right', label: 'Right' },
                { value: 'justify', label: 'Justify' },
              ]}
            />

            <PropertyInput
              label="Text Color"
              value={commonProperties.color}
              onChange={(value) => updateProperty('color', value)}
              type="color"
            />
          </CollapsibleSection>
        )}

        {/* Appearance */}
        <CollapsibleSection title="Appearance" icon={<Palette className="w-4 h-4" />}>
          <PropertyInput
            label="Background Color"
            value={commonProperties.backgroundColor || selectedComponent?.styles?.backgroundColor}
            onChange={(value) => updateStyle('backgroundColor', value)}
            type="color"
          />

          <PropertyInput
            label="Border Width"
            value={commonProperties.borderWidth || selectedComponent?.styles?.borderWidth}
            onChange={(value) => updateStyle('borderWidth', value)}
            type="slider"
            min={0}
            max={10}
            step={1}
            suffix="px"
          />

          <PropertyInput
            label="Border Color"
            value={commonProperties.borderColor || selectedComponent?.styles?.borderColor}
            onChange={(value) => updateStyle('borderColor', value)}
            type="color"
          />

          <PropertyInput
            label="Border Radius"
            value={commonProperties.borderRadius || selectedComponent?.styles?.borderRadius}
            onChange={(value) => updateStyle('borderRadius', value)}
            type="slider"
            min={0}
            max={50}
            step={1}
            suffix="px"
          />

          <PropertyInput
            label="Opacity"
            value={commonProperties.opacity || selectedComponent?.styles?.opacity || 1}
            onChange={(value) => updateStyle('opacity', value)}
            type="slider"
            min={0}
            max={1}
            step={0.1}
          />
        </CollapsibleSection>

        {/* Component-specific properties */}
        {!isMultiSelection && selectedComponent && (
          <>
            {/* Barcode Properties */}
            {selectedComponent.type === 'barcode' && (
              <CollapsibleSection title="Barcode Settings" icon={<Hash className="w-4 h-4" />}>
                <PropertyInput
                  label="Barcode Value"
                  value={commonProperties.value}
                  onChange={(value) => updateProperty('value', value)}
                  type="text"
                  placeholder="123456789"
                />

                <PropertyInput
                  label="Format"
                  value={commonProperties.format}
                  onChange={(value) => updateProperty('format', value)}
                  type="select"
                  options={[
                    { value: 'CODE128', label: 'CODE 128' },
                    { value: 'CODE39', label: 'CODE 39' },
                    { value: 'EAN13', label: 'EAN-13' },
                    { value: 'EAN8', label: 'EAN-8' },
                    { value: 'UPC', label: 'UPC' },
                  ]}
                />

                <PropertyInput
                  label="Show Value"
                  value={commonProperties.displayValue}
                  onChange={(value) => updateProperty('displayValue', value)}
                  type="checkbox"
                />
              </CollapsibleSection>
            )}

            {/* QR Code Properties */}
            {selectedComponent.type === 'qr' && (
              <CollapsibleSection title="QR Code Settings" icon={<Hash className="w-4 h-4" />}>
                <PropertyInput
                  label="QR Code Value"
                  value={commonProperties.value}
                  onChange={(value) => updateProperty('value', value)}
                  type="textarea"
                  placeholder="https://example.com"
                />

                <PropertyInput
                  label="Error Correction"
                  value={commonProperties.errorCorrectionLevel}
                  onChange={(value) => updateProperty('errorCorrectionLevel', value)}
                  type="select"
                  options={[
                    { value: 'L', label: 'Low (~7%)' },
                    { value: 'M', label: 'Medium (~15%)' },
                    { value: 'Q', label: 'Quartile (~25%)' },
                    { value: 'H', label: 'High (~30%)' },
                  ]}
                />
              </CollapsibleSection>
            )}

            {/* Table Properties */}
            {selectedComponent.type === 'table' && (
              <CollapsibleSection title="Table Settings" icon={<Layout className="w-4 h-4" />}>
                <div className="grid grid-cols-2 gap-2">
                  <PropertyInput
                    label="Rows"
                    value={commonProperties.rows}
                    onChange={(value) => updateProperty('rows', value)}
                    type="number"
                    min={1}
                    max={20}
                  />
                  <PropertyInput
                    label="Columns"
                    value={commonProperties.columns}
                    onChange={(value) => updateProperty('columns', value)}
                    type="number"
                    min={1}
                    max={10}
                  />
                </div>

                <PropertyInput
                  label="Cell Padding"
                  value={commonProperties.cellPadding}
                  onChange={(value) => updateProperty('cellPadding', value)}
                  type="slider"
                  min={0}
                  max={20}
                  step={1}
                  suffix="px"
                />
              </CollapsibleSection>
            )}
          </>
        )}

        {/* Layer Order */}
        <CollapsibleSection title="Layer Order" icon={<Layers className="w-4 h-4" />}>
          <div className="text-xs text-gray-600 mb-2">
            Z-Index: {selectedComponent?.zIndex || 0}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => {
                const ids = multiSelection.length > 0 ? multiSelection : [selectedComponent!.id];
                // Implement bring forward
              }}
              className="px-3 py-1.5 text-xs bg-gray-100 hover:bg-gray-200 rounded transition-colors"
            >
              Bring Forward
            </button>
            <button
              onClick={() => {
                const ids = multiSelection.length > 0 ? multiSelection : [selectedComponent!.id];
                // Implement send backward
              }}
              className="px-3 py-1.5 text-xs bg-gray-100 hover:bg-gray-200 rounded transition-colors"
            >
              Send Backward
            </button>
          </div>
        </CollapsibleSection>

        {/* Advanced Settings */}
        <CollapsibleSection title="Advanced" icon={<Settings className="w-4 h-4" />} defaultOpen={false}>
          <PropertyInput
            label="Component Name"
            value={selectedComponent?.name}
            onChange={(value) => updateComponent(selectedComponent!.id, { name: value })}
            type="text"
            placeholder="Component name..."
          />

          {/* CSS Classes not applicable for thermal printer templates */}
          {/*
          <PropertyInput
            label="CSS Classes"
            value={selectedComponent?.styles?.className}
            onChange={(value) => updateStyle('className', value)}
            type="text"
            placeholder="custom-class-1 custom-class-2"
          />
          */}

          {/* Custom CSS not applicable for thermal printer templates */}
          {/*
          <PropertyInput
            label="Custom CSS"
            value={selectedComponent?.styles?.customCSS}
            onChange={(value) => updateStyle('customCSS', value)}
            type="textarea"
            placeholder="color: red; margin: 10px;"
          />
          */}
        </CollapsibleSection>
      </div>
    </div>
  );
}