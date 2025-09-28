import React, { useState } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
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
  Container
} from 'lucide-react';
import { ComponentType, ComponentLibraryItem } from '../types/template.types';

const componentLibrary: ComponentLibraryItem[] = [
  {
    type: 'text',
    name: 'Text',
    description: 'Add text labels, titles, and content',
    icon: 'Type',
    category: 'basic',
    defaultProperties: {
      text: 'Text Content',
      fontSize: 12,
      fontWeight: 'normal',
      textAlign: 'left',
    },
    defaultPosition: { x: 0, y: 0, width: 150, height: 30 },
    defaultStyles: {},
  },
  {
    type: 'image',
    name: 'Image',
    description: 'Insert logos, photos, and graphics',
    icon: 'Image',
    category: 'basic',
    defaultProperties: {
      src: '',
      alt: 'Image',
      fit: 'contain',
    },
    defaultPosition: { x: 0, y: 0, width: 100, height: 100 },
    defaultStyles: {},
  },
  {
    type: 'barcode',
    name: 'Barcode',
    description: 'Generate barcodes for products and orders',
    icon: 'BarChart3',
    category: 'data',
    defaultProperties: {
      data: '1234567890',
      barcodeType: 'CODE128',
      showText: true,
    },
    defaultPosition: { x: 0, y: 0, width: 200, height: 60 },
    defaultStyles: {},
  },
  {
    type: 'qr',
    name: 'QR Code',
    description: 'Create QR codes for URLs and data',
    icon: 'QrCode',
    category: 'data',
    defaultProperties: {
      data: 'https://example.com',
    },
    defaultPosition: { x: 0, y: 0, width: 80, height: 80 },
    defaultStyles: {},
  },
  {
    type: 'table',
    name: 'Table',
    description: 'Display structured data in rows and columns',
    icon: 'Table',
    category: 'data',
    defaultProperties: {
      columns: ['Item', 'Qty', 'Price'],
      dataSource: 'order.items',
    },
    defaultPosition: { x: 0, y: 0, width: 300, height: 150 },
    defaultStyles: {},
  },
  {
    type: 'line',
    name: 'Line',
    description: 'Add horizontal or vertical lines for separation',
    icon: 'Minus',
    category: 'layout',
    defaultProperties: {
      thickness: 1,
      style: 'solid',
      character: '-',
    },
    defaultPosition: { x: 0, y: 0, width: 200, height: 2 },
    defaultStyles: {},
  },
  {
    type: 'spacer',
    name: 'Spacer',
    description: 'Create empty space between elements',
    icon: 'Space',
    category: 'layout',
    defaultProperties: {
      height: 20,
    },
    defaultPosition: { x: 0, y: 0, width: 200, height: 20 },
    defaultStyles: {},
  },
  {
    type: 'datetime',
    name: 'Date/Time',
    description: 'Show current date, time, or timestamp',
    icon: 'Calendar',
    category: 'data',
    defaultProperties: {
      format: 'datetime',
    },
    defaultPosition: { x: 0, y: 0, width: 150, height: 25 },
    defaultStyles: {},
  },
  {
    type: 'counter',
    name: 'Counter',
    description: 'Display order numbers and sequential counters',
    icon: 'Hash',
    category: 'data',
    defaultProperties: {
      counterType: 'order',
      prefix: '#',
      padding: 3,
    },
    defaultPosition: { x: 0, y: 0, width: 100, height: 25 },
    defaultStyles: {},
  },
  {
    type: 'container',
    name: 'Container',
    description: 'Group components together',
    icon: 'Container',
    category: 'layout',
    defaultProperties: {},
    defaultPosition: { x: 0, y: 0, width: 200, height: 100 },
    defaultStyles: {
      borderWidth: 1,
      borderStyle: 'dashed',
      borderColor: '#ccc',
    },
  },
];

const iconMap = {
  Type,
  Image,
  BarChart3,
  QrCode,
  Table,
  Minus,
  Space,
  Calendar,
  Hash,
  Container,
};

interface DraggableComponentProps {
  component: ComponentLibraryItem;
}

function DraggableComponent({ component }: DraggableComponentProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: component.type,
    data: {
      type: component.type,
      isNew: true,
    },
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.5 : 1,
  };

  const IconComponent = iconMap[component.icon as keyof typeof iconMap];

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`
        flex flex-col items-center p-3 border border-gray-200 rounded-lg
        cursor-grab hover:bg-gray-50 hover:border-gray-300 transition-colors
        ${isDragging ? 'cursor-grabbing' : ''}
      `}
      title={component.description}
    >
      <div className="flex items-center justify-center w-8 h-8 mb-2 text-gray-600">
        {IconComponent && <IconComponent size={20} />}
      </div>
      <span className="text-xs font-medium text-gray-700 text-center">
        {component.name}
      </span>
    </div>
  );
}

interface ComponentLibraryProps {
  className?: string;
}

export function ComponentLibrary({ className }: ComponentLibraryProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const categories = [
    { id: 'all', name: 'All' },
    { id: 'basic', name: 'Basic' },
    { id: 'data', name: 'Data' },
    { id: 'layout', name: 'Layout' },
    { id: 'advanced', name: 'Advanced' },
  ];

  const filteredComponents = componentLibrary.filter(component => {
    const matchesCategory = selectedCategory === 'all' || component.category === selectedCategory;
    const matchesSearch = component.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         component.description.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesCategory && matchesSearch;
  });

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-3">Components</h3>

        {/* Search */}
        <div className="mb-3">
          <input
            type="text"
            placeholder="Search components..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm
                     focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Category Filter */}
        <div className="flex flex-wrap gap-2">
          {categories.map(category => (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              className={`
                px-3 py-1 text-xs font-medium rounded-full transition-colors
                ${selectedCategory === category.id
                  ? 'bg-blue-100 text-blue-800 border border-blue-200'
                  : 'bg-gray-100 text-gray-700 border border-gray-200 hover:bg-gray-200'
                }
              `}
            >
              {category.name}
            </button>
          ))}
        </div>
      </div>

      {/* Component Grid */}
      <div className="flex-1 p-4 overflow-y-auto">
        <div className="grid grid-cols-2 gap-3">
          {filteredComponents.map(component => (
            <DraggableComponent
              key={component.type}
              component={component}
            />
          ))}
        </div>

        {filteredComponents.length === 0 && (
          <div className="flex flex-col items-center justify-center h-32 text-gray-500">
            <Type size={32} className="mb-2 opacity-50" />
            <p className="text-sm">No components found</p>
            {searchTerm && (
              <p className="text-xs mt-1">Try a different search term</p>
            )}
          </div>
        )}
      </div>

      {/* Instructions */}
      <div className="p-4 border-t border-gray-200 bg-gray-50">
        <p className="text-xs text-gray-600 leading-relaxed">
          💡 <strong>Tip:</strong> Drag components onto the canvas to add them to your template.
          Click on components to edit their properties.
        </p>
      </div>
    </div>
  );
}

