import React, { useState } from 'react';
import { useDraggable } from '@dnd-kit/core';
import {
  Type,
  Image,
  Minus,
  Grid3X3,
  QrCode,
  Barcode,
  Square,
  Circle,
  Triangle,
  Star,
  Heart,
  Calendar,
  Clock,
  MapPin,
  Phone,
  Mail,
  User,
  Building,
  CreditCard,
  ShoppingCart,
  Package,
  Truck,
  Receipt,
  Calculator,
  Percent,
  Hash,
  DollarSign,
  Euro,
  PoundSterling,
  BadgeJapaneseYen,
  Bitcoin,
  Palette,
  Layers,
  Sparkles,
  Zap,
  Gauge
} from 'lucide-react';

interface ComponentCategory {
  id: string;
  name: string;
  icon: React.ReactNode;
  components: ComponentDefinition[];
}

interface ComponentDefinition {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  type: string;
  defaultProperties: any;
  tags: string[];
  category: string;
  isPro?: boolean;
}

interface DraggableComponentProps {
  component: ComponentDefinition;
}

function DraggableComponent({ component }: DraggableComponentProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging,
  } = useDraggable({
    id: component.type,
    data: {
      isNew: true,
      type: component.type,
    },
  });

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
  } : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`
        group relative p-3 bg-white border border-gray-200 rounded-lg hover:shadow-md hover:border-blue-300
        transition-all duration-200 cursor-grab active:cursor-grabbing
        ${isDragging ? 'opacity-50 shadow-lg' : ''}
        ${component.isPro ? 'border-l-4 border-l-amber-400' : ''}
      `}
    >
      <div className="flex flex-col items-center space-y-2">
        <div className={`
          p-2 rounded-lg transition-colors duration-200
          ${isDragging ? 'bg-blue-100' : 'bg-gray-50 group-hover:bg-blue-50'}
        `}>
          {component.icon}
        </div>

        <div className="text-center">
          <h4 className="text-sm font-medium text-gray-900 truncate w-full">
            {component.name}
          </h4>
          <p className="text-xs text-gray-500 mt-1 line-clamp-2">
            {component.description}
          </p>
        </div>

        {/* Pro badge */}
        {component.isPro && (
          <div className="absolute -top-1 -right-1 bg-amber-400 text-amber-900 text-xs px-1.5 py-0.5 rounded-full font-semibold">
            PRO
          </div>
        )}

        {/* Tags */}
        <div className="flex flex-wrap gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          {component.tags.slice(0, 2).map((tag) => (
            <span key={tag} className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">
              {tag}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

interface AdvancedComponentLibraryProps {
  className?: string;
}

export function AdvancedComponentLibrary({ className }: AdvancedComponentLibraryProps) {
  const [selectedCategory, setSelectedCategory] = useState('basic');
  const [searchTerm, setSearchTerm] = useState('');

  // Comprehensive component definitions
  const componentCategories: ComponentCategory[] = [
    {
      id: 'basic',
      name: 'Basic Elements',
      icon: <Layers className="w-4 h-4" />,
      components: [
        {
          id: 'text',
          name: 'Text',
          description: 'Add text content with formatting options',
          icon: <Type className="w-5 h-5 text-blue-600" />,
          type: 'text',
          defaultProperties: {
            text: 'Sample Text',
            fontSize: 14,
            fontWeight: 'normal',
            textAlign: 'left',
            color: '#000000',
          },
          tags: ['text', 'content', 'typography'],
          category: 'basic',
        },
        {
          id: 'image',
          name: 'Image',
          description: 'Insert images with resize and positioning',
          icon: <Image className="w-5 h-5 text-green-600" />,
          type: 'image',
          defaultProperties: {
            src: '',
            alt: 'Image',
            fit: 'contain',
          },
          tags: ['image', 'media', 'visual'],
          category: 'basic',
        },
        {
          id: 'line',
          name: 'Line',
          description: 'Horizontal or vertical line separator',
          icon: <Minus className="w-5 h-5 text-gray-600" />,
          type: 'line',
          defaultProperties: {
            thickness: 1,
            style: 'solid',
            color: '#000000',
          },
          tags: ['line', 'separator', 'divider'],
          category: 'basic',
        },
        {
          id: 'table',
          name: 'Table',
          description: 'Data table with customizable rows and columns',
          icon: <Grid3X3 className="w-5 h-5 text-purple-600" />,
          type: 'table',
          defaultProperties: {
            rows: 3,
            columns: 2,
            borderWidth: 1,
            borderColor: '#000000',
            cellPadding: 5,
          },
          tags: ['table', 'data', 'grid'],
          category: 'basic',
        },
      ],
    },
    {
      id: 'data',
      name: 'Data & Codes',
      icon: <QrCode className="w-4 h-4" />,
      components: [
        {
          id: 'barcode',
          name: 'Barcode',
          description: 'Generate various barcode formats',
          icon: <Barcode className="w-5 h-5 text-indigo-600" />,
          type: 'barcode',
          defaultProperties: {
            value: '123456789',
            format: 'CODE128',
            displayValue: true,
            height: 50,
          },
          tags: ['barcode', 'code', 'scanner'],
          category: 'data',
        },
        {
          id: 'qr_code',
          name: 'QR Code',
          description: 'Generate QR codes with error correction',
          icon: <QrCode className="w-5 h-5 text-indigo-600" />,
          type: 'qr_code',
          defaultProperties: {
            value: 'https://example.com',
            size: 100,
            errorCorrectionLevel: 'M',
          },
          tags: ['qr', 'code', 'scanner'],
          category: 'data',
        },
        {
          id: 'variable_text',
          name: 'Variable Text',
          description: 'Dynamic text from data sources',
          icon: <Hash className="w-5 h-5 text-blue-600" />,
          type: 'variable_text',
          defaultProperties: {
            variable: '{{order.number}}',
            fallback: 'N/A',
            format: 'string',
          },
          tags: ['variable', 'dynamic', 'data'],
          category: 'data',
          isPro: true,
        },
        {
          id: 'calculation',
          name: 'Calculation',
          description: 'Perform calculations on data fields',
          icon: <Calculator className="w-5 h-5 text-purple-600" />,
          type: 'calculation',
          defaultProperties: {
            formula: '{{quantity}} * {{price}}',
            format: 'currency',
            decimals: 2,
          },
          tags: ['calculation', 'formula', 'math'],
          category: 'data',
          isPro: true,
        },
      ],
    },
    {
      id: 'shapes',
      name: 'Shapes & Graphics',
      icon: <Square className="w-4 h-4" />,
      components: [
        {
          id: 'rectangle',
          name: 'Rectangle',
          description: 'Rectangular shape with fill and border',
          icon: <Square className="w-5 h-5 text-gray-600" />,
          type: 'shape',
          defaultProperties: {
            shapeType: 'rectangle',
            fillColor: 'transparent',
            strokeColor: '#000000',
            strokeWidth: 1,
          },
          tags: ['rectangle', 'shape', 'box'],
          category: 'shapes',
        },
        {
          id: 'circle',
          name: 'Circle',
          description: 'Circular shape with customizable styling',
          icon: <Circle className="w-5 h-5 text-blue-600" />,
          type: 'shape',
          defaultProperties: {
            shapeType: 'circle',
            fillColor: 'transparent',
            strokeColor: '#000000',
            strokeWidth: 1,
          },
          tags: ['circle', 'shape', 'round'],
          category: 'shapes',
        },
        {
          id: 'star',
          name: 'Star',
          description: 'Star shape for ratings and decorations',
          icon: <Star className="w-5 h-5 text-yellow-600" />,
          type: 'shape',
          defaultProperties: {
            shapeType: 'star',
            points: 5,
            fillColor: '#FCD34D',
            strokeColor: '#F59E0B',
            strokeWidth: 1,
          },
          tags: ['star', 'rating', 'decoration'],
          category: 'shapes',
          isPro: true,
        },
      ],
    },
    {
      id: 'business',
      name: 'Business Elements',
      icon: <Building className="w-4 h-4" />,
      components: [
        {
          id: 'logo_placeholder',
          name: 'Logo Placeholder',
          description: 'Designated area for company logo',
          icon: <Building className="w-5 h-5 text-blue-600" />,
          type: 'logo',
          defaultProperties: {
            placeholder: 'Company Logo',
            aspectRatio: '16:9',
            backgroundColor: '#F3F4F6',
          },
          tags: ['logo', 'branding', 'company'],
          category: 'business',
        },
        {
          id: 'address_block',
          name: 'Address Block',
          description: 'Formatted address with multiple lines',
          icon: <MapPin className="w-5 h-5 text-red-600" />,
          type: 'address',
          defaultProperties: {
            addressLines: ['{{company.address}}', '{{company.city}}, {{company.state}} {{company.zip}}'],
            fontSize: 12,
            lineHeight: 1.4,
          },
          tags: ['address', 'location', 'contact'],
          category: 'business',
        },
        {
          id: 'contact_info',
          name: 'Contact Info',
          description: 'Phone, email, and website information',
          icon: <Phone className="w-5 h-5 text-green-600" />,
          type: 'contact',
          defaultProperties: {
            phone: '{{company.phone}}',
            email: '{{company.email}}',
            website: '{{company.website}}',
            showIcons: true,
          },
          tags: ['contact', 'phone', 'email'],
          category: 'business',
        },
      ],
    },
    {
      id: 'receipt',
      name: 'Receipt Elements',
      icon: <Receipt className="w-4 h-4" />,
      components: [
        {
          id: 'order_header',
          name: 'Order Header',
          description: 'Receipt header with order number and date',
          icon: <Receipt className="w-5 h-5 text-blue-600" />,
          type: 'order_header',
          defaultProperties: {
            orderNumber: '{{order.number}}',
            date: '{{order.date}}',
            cashier: '{{order.cashier}}',
            showDate: true,
            showCashier: true,
          },
          tags: ['order', 'header', 'receipt'],
          category: 'receipt',
        },
        {
          id: 'line_items',
          name: 'Line Items',
          description: 'Order items with quantities and prices',
          icon: <ShoppingCart className="w-5 h-5 text-green-600" />,
          type: 'line_items',
          defaultProperties: {
            showQuantity: true,
            showUnitPrice: true,
            showTotalPrice: true,
            alignment: 'justified',
          },
          tags: ['items', 'products', 'list'],
          category: 'receipt',
        },
        {
          id: 'totals_section',
          name: 'Totals Section',
          description: 'Subtotal, tax, and grand total',
          icon: <Calculator className="w-5 h-5 text-purple-600" />,
          type: 'totals',
          defaultProperties: {
            showSubtotal: true,
            showTax: true,
            showDiscount: true,
            showGrandTotal: true,
            currency: 'USD',
          },
          tags: ['totals', 'calculation', 'summary'],
          category: 'receipt',
        },
        {
          id: 'payment_info',
          name: 'Payment Info',
          description: 'Payment method and transaction details',
          icon: <CreditCard className="w-5 h-5 text-indigo-600" />,
          type: 'payment',
          defaultProperties: {
            paymentMethod: '{{payment.method}}',
            transactionId: '{{payment.transactionId}}',
            lastFourDigits: '{{payment.lastFour}}',
            showTransactionId: true,
          },
          tags: ['payment', 'transaction', 'method'],
          category: 'receipt',
        },
      ],
    },
    {
      id: 'advanced',
      name: 'Advanced',
      icon: <Sparkles className="w-4 h-4" />,
      components: [
        {
          id: 'conditional_block',
          name: 'Conditional Block',
          description: 'Show/hide content based on conditions',
          icon: <Zap className="w-5 h-5 text-orange-600" />,
          type: 'conditional',
          defaultProperties: {
            condition: '{{order.type}} === "delivery"',
            trueContent: 'Delivery Information',
            falseContent: '',
            operator: 'equals',
          },
          tags: ['conditional', 'logic', 'dynamic'],
          category: 'advanced',
          isPro: true,
        },
        {
          id: 'chart',
          name: 'Simple Chart',
          description: 'Basic bar or pie chart visualization',
          icon: <Gauge className="w-5 h-5 text-blue-600" />,
          type: 'chart',
          defaultProperties: {
            chartType: 'bar',
            data: '{{analytics.data}}',
            width: 200,
            height: 100,
          },
          tags: ['chart', 'graph', 'visualization'],
          category: 'advanced',
          isPro: true,
        },
        {
          id: 'signature_field',
          name: 'Signature Field',
          description: 'Area for customer signature',
          icon: <User className="w-5 h-5 text-gray-600" />,
          type: 'signature',
          defaultProperties: {
            label: 'Customer Signature:',
            showLine: true,
            height: 40,
          },
          tags: ['signature', 'customer', 'field'],
          category: 'advanced',
        },
      ],
    },
  ];

  // Filter components based on search and category
  const filteredCategories = componentCategories
    .map(category => ({
      ...category,
      components: category.components.filter(component =>
        (selectedCategory === 'all' || component.category === selectedCategory) &&
        (searchTerm === '' ||
         component.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
         component.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
         component.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
        )
      ),
    }))
    .filter(category => category.components.length > 0);

  const allComponents = componentCategories.flatMap(cat => cat.components);
  const proComponents = allComponents.filter(comp => comp.isPro);

  return (
    <div className={`flex flex-col h-full bg-white ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Component Library</h3>

        {/* Search */}
        <div className="mb-4">
          <input
            type="text"
            placeholder="Search components..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Category Tabs */}
        <div className="flex space-x-1 mb-4">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-3 py-1.5 text-xs rounded-md transition-colors ${
              selectedCategory === 'all'
                ? 'bg-blue-100 text-blue-700'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            All ({allComponents.length})
          </button>
          {componentCategories.map((category) => (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              className={`px-3 py-1.5 text-xs rounded-md transition-colors flex items-center space-x-1 ${
                selectedCategory === category.id
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {category.icon}
              <span>{category.name}</span>
            </button>
          ))}
        </div>

        {/* Pro Features Banner */}
        {proComponents.length > 0 && (
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-lg p-3 mb-4">
            <div className="flex items-center space-x-2">
              <Sparkles className="w-4 h-4 text-amber-600" />
              <span className="text-sm font-medium text-amber-900">
                {proComponents.length} Pro Components Available
              </span>
            </div>
            <p className="text-xs text-amber-700 mt-1">
              Unlock advanced features with Pro subscription
            </p>
          </div>
        )}
      </div>

      {/* Components Grid */}
      <div className="flex-1 overflow-y-auto p-4">
        {filteredCategories.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-400 mb-2">
              <Layers className="w-12 h-12 mx-auto" />
            </div>
            <h4 className="text-sm font-medium text-gray-900 mb-1">No components found</h4>
            <p className="text-xs text-gray-500">
              Try adjusting your search or selecting a different category
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {filteredCategories.map((category) => (
              <div key={category.id}>
                {selectedCategory === 'all' && (
                  <div className="flex items-center space-x-2 mb-3">
                    {category.icon}
                    <h4 className="text-sm font-medium text-gray-900">{category.name}</h4>
                    <span className="text-xs text-gray-500">({category.components.length})</span>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {category.components.map((component) => (
                    <DraggableComponent key={component.id} component={component} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-gray-200 bg-gray-50">
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>Drag components to canvas</span>
          <span>{allComponents.length} total components</span>
        </div>
      </div>
    </div>
  );
}