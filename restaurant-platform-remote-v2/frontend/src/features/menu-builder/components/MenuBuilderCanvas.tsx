// Menu Builder Canvas - Drag-and-drop interface for menu construction
import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { DndProvider, useDrag, useDrop, DropTargetMonitor } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import {
  PlusIcon,
  TrashIcon,
  EyeIcon,
  ArrowsUpDownIcon,
  ClipboardDocumentListIcon,
  CheckCircleIcon,
  XCircleIcon,
  SparklesIcon
} from '@heroicons/react/24/outline';
import { Platform, PlatformMenu, MenuBuilderState } from '../../../types/menu-builder';
import { MenuProduct, MenuCategory } from '../../../types/menu';
import { getLocalizedText, formatCurrency } from '../../../lib/menu-utils';
import { useLanguage } from '../../../contexts/LanguageContext';
import toast from 'react-hot-toast';

interface MenuBuilderCanvasProps {
  platform: Platform;
  menu?: PlatformMenu;
  builderState: MenuBuilderState;
  onStateChange: (state: MenuBuilderState) => void;
  className?: string;
}

interface DragItem {
  type: string;
  id: string;
  index: number;
  productId?: string;
  categoryId?: string;
}

// Draggable Menu Category Component
const DraggableCategory: React.FC<{
  category: MenuCategory;
  products: MenuProduct[];
  index: number;
  onMove: (dragIndex: number, hoverIndex: number) => void;
  onRemove: (categoryId: string) => void;
  platform: Platform;
}> = ({ category, products, index, onMove, onRemove, platform }) => {
  const ref = useRef<HTMLDivElement>(null);
  const { language } = useLanguage();

  const [{ handlerId }, drop] = useDrop({
    accept: 'category',
    collect(monitor) {
      return {
        handlerId: monitor.getHandlerId(),
      };
    },
    hover(item: DragItem, monitor: DropTargetMonitor) {
      if (!ref.current) return;

      const dragIndex = item.index;
      const hoverIndex = index;

      if (dragIndex === hoverIndex) return;

      const hoverBoundingRect = ref.current?.getBoundingClientRect();
      const hoverMiddleY = (hoverBoundingRect.bottom - hoverBoundingRect.top) / 2;
      const clientOffset = monitor.getClientOffset();
      const hoverClientY = (clientOffset?.y || 0) - hoverBoundingRect.top;

      if (dragIndex < hoverIndex && hoverClientY < hoverMiddleY) return;
      if (dragIndex > hoverIndex && hoverClientY > hoverMiddleY) return;

      onMove(dragIndex, hoverIndex);
      item.index = hoverIndex;
    },
  });

  const [{ isDragging }, drag] = useDrag({
    type: 'category',
    item: () => ({ id: category.id, index, type: 'category' }),
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  drag(drop(ref));

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.2 }}
      className={`menu-category-builder bg-white rounded-xl border-2 border-gray-200 overflow-hidden shadow-sm ${
        isDragging ? 'opacity-50 shadow-lg border-blue-400' : 'hover:shadow-md hover:border-gray-300'
      }`}
      data-handler-id={handlerId}
    >
      {/* Category Header */}
      <div className="p-4 bg-gradient-to-r from-gray-50 to-white border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="cursor-move p-1 text-gray-400 hover:text-gray-600 rounded">
              <ArrowsUpDownIcon className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 text-lg">
                {getLocalizedText(category.name, language)}
              </h3>
              <p className="text-sm text-gray-500">
                {products.length} product{products.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => onRemove(category.id)}
              className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              title="Remove category from menu"
            >
              <TrashIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Products Grid */}
      <div className="p-4">
        {products.length > 0 ? (
          <Reorder.Group
            axis="y"
            values={products}
            onReorder={() => {}} // Handle product reordering
            className="space-y-3"
          >
            {products.map((product) => (
              <Reorder.Item
                key={product.id}
                value={product}
                className="bg-gray-50 rounded-lg p-3 border border-gray-200 hover:border-gray-300 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    {product.image && (
                      <img
                        src={product.image}
                        alt={getLocalizedText(product.name, language)}
                        className="w-12 h-12 object-cover rounded-lg"
                      />
                    )}
                    <div>
                      <h4 className="font-medium text-gray-900">
                        {getLocalizedText(product.name, language)}
                      </h4>
                      <p className="text-sm text-gray-500">
                        {Object.keys(product.pricing).length > 0
                          ? formatCurrency(Object.values(product.pricing)[0])
                          : 'No price set'
                        }
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <div className={`w-2 h-2 rounded-full ${
                      product.status === 1 ? 'bg-green-500' : 'bg-red-500'
                    }`} />
                    <button
                      className="p-1 text-gray-400 hover:text-gray-600 rounded"
                      title="Product settings"
                    >
                      <EyeIcon className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </Reorder.Item>
            ))}
          </Reorder.Group>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <ClipboardDocumentListIcon className="w-8 h-8 mx-auto mb-2 text-gray-300" />
            <p className="text-sm">No products in this category</p>
            <p className="text-xs">Drag products here to add them</p>
          </div>
        )}
      </div>
    </motion.div>
  );
};

// Drop Zone for adding new categories/products
const DropZone: React.FC<{
  onDrop: (item: DragItem) => void;
  children: React.ReactNode;
  className?: string;
}> = ({ onDrop, children, className = '' }) => {
  const [{ isOver, canDrop }, drop] = useDrop({
    accept: ['product', 'category'],
    drop: onDrop,
    collect: (monitor) => ({
      isOver: monitor.isOver(),
      canDrop: monitor.canDrop(),
    }),
  });

  return (
    <div
      ref={drop as any}
      className={`drop-zone ${className} ${
        isOver && canDrop
          ? 'bg-blue-50 border-blue-300 border-dashed'
          : 'border-gray-200 border-dashed'
      } transition-all duration-200`}
    >
      {children}
    </div>
  );
};

export const MenuBuilderCanvas: React.FC<MenuBuilderCanvasProps> = ({
  platform,
  menu,
  builderState,
  onStateChange,
  className = ''
}) => {
  const { language } = useLanguage();
  const [categories, setCategories] = useState<MenuCategory[]>(menu?.categories || []);
  const [menuProducts, setMenuProducts] = useState<Record<string, MenuProduct[]>>({});
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  // Auto-save functionality
  const saveMenu = useCallback(async () => {
    if (!menu) return;

    setSaveStatus('saving');
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/menu/platforms/${platform.id}/menu`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth-token')}`
        },
        body: JSON.stringify({
          categories,
          menuProducts,
          metadata: {
            lastModified: new Date(),
            modifiedBy: 'user' // Add actual user info
          }
        })
      });

      if (response.ok) {
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus('idle'), 2000);
      } else {
        throw new Error('Save failed');
      }
    } catch (error) {
      console.error('Menu save error:', error);
      setSaveStatus('error');
      toast.error('Failed to save menu changes');
    }
  }, [categories, menuProducts, menu, platform.id]);

  // Auto-save on changes
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (categories.length > 0) {
        saveMenu();
      }
    }, 2000);

    return () => clearTimeout(timeoutId);
  }, [categories, menuProducts, saveMenu]);

  // Handle category reordering
  const moveCategory = useCallback((dragIndex: number, hoverIndex: number) => {
    setCategories(prev => {
      const newCategories = [...prev];
      const draggedCategory = newCategories[dragIndex];
      newCategories.splice(dragIndex, 1);
      newCategories.splice(hoverIndex, 0, draggedCategory);
      return newCategories;
    });
  }, []);

  // Handle category removal
  const removeCategory = useCallback((categoryId: string) => {
    setCategories(prev => prev.filter(cat => cat.id !== categoryId));
    setMenuProducts(prev => {
      const newProducts = { ...prev };
      delete newProducts[categoryId];
      return newProducts;
    });
    toast.success('Category removed from menu');
  }, []);

  // Handle drop events
  const handleDrop = useCallback((item: DragItem) => {
    if (item.type === 'product' && item.productId) {
      // Add product to a category or create new category
      toast.success('Product added to menu');
    } else if (item.type === 'category' && item.categoryId) {
      // Add entire category to menu
      toast.success('Category added to menu');
    }
  }, []);

  // Menu preview mode
  const MenuPreview = useMemo(() => {
    if (!builderState.previewMode) return null;

    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
        onClick={() => onStateChange({ ...builderState, previewMode: false })}
      >
        <div
          className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[80vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="p-6 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900">
              {platform.name} Menu Preview
            </h2>
            <button
              onClick={() => onStateChange({ ...builderState, previewMode: false })}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-lg"
            >
              <XCircleIcon className="w-6 h-6" />
            </button>
          </div>

          <div className="p-6 space-y-6">
            {categories.map(category => (
              <div key={category.id} className="border-b border-gray-100 pb-6 last:border-b-0">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  {getLocalizedText(category.name, language)}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {(menuProducts[category.id] || []).map(product => (
                    <div key={product.id} className="bg-gray-50 rounded-lg p-4">
                      <h4 className="font-medium text-gray-900 mb-2">
                        {getLocalizedText(product.name, language)}
                      </h4>
                      <p className="text-sm text-gray-600 mb-2">
                        {getLocalizedText(product.description || { en: '', ar: '' }, language)}
                      </p>
                      <div className="font-bold text-green-600">
                        {Object.keys(product.pricing).length > 0
                          ? formatCurrency(Object.values(product.pricing)[0])
                          : 'Price not set'
                        }
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </motion.div>
    );
  }, [builderState.previewMode, categories, menuProducts, platform.name, language, onStateChange]);

  return (
    <DndProvider backend={HTML5Backend}>
      <div className={`menu-builder-canvas flex flex-col h-full bg-gray-50 ${className}`}>
        {/* Canvas Header */}
        <div className="bg-white border-b border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Menu Builder</h2>
              <p className="text-sm text-gray-500">
                Drag categories and products to build your {platform.name} menu
              </p>
            </div>

            <div className="flex items-center space-x-3">
              {/* Save Status Indicator */}
              <div className="flex items-center space-x-2">
                {saveStatus === 'saving' && (
                  <div className="flex items-center space-x-2 text-blue-600">
                    <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                    <span className="text-sm">Saving...</span>
                  </div>
                )}
                {saveStatus === 'saved' && (
                  <div className="flex items-center space-x-2 text-green-600">
                    <CheckCircleIcon className="w-4 h-4" />
                    <span className="text-sm">Saved</span>
                  </div>
                )}
                {saveStatus === 'error' && (
                  <div className="flex items-center space-x-2 text-red-600">
                    <XCircleIcon className="w-4 h-4" />
                    <span className="text-sm">Error</span>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <button
                onClick={() => onStateChange({ ...builderState, previewMode: true })}
                className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <EyeIcon className="w-4 h-4 mr-2" />
                Preview
              </button>

              <button
                onClick={saveMenu}
                disabled={saveStatus === 'saving'}
                className="inline-flex items-center px-3 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                <SparklesIcon className="w-4 h-4 mr-2" />
                Save Menu
              </button>
            </div>
          </div>
        </div>

        {/* Canvas Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <DropZone onDrop={handleDrop} className="min-h-full">
            {categories.length > 0 ? (
              <div className="space-y-6">
                <AnimatePresence>
                  {categories.map((category, index) => (
                    <DraggableCategory
                      key={category.id}
                      category={category}
                      products={menuProducts[category.id] || []}
                      index={index}
                      onMove={moveCategory}
                      onRemove={removeCategory}
                      platform={platform}
                    />
                  ))}
                </AnimatePresence>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center py-12">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                  <ClipboardDocumentListIcon className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Start building your {platform.name} menu
                </h3>
                <p className="text-gray-500 mb-6 max-w-md">
                  Drag categories and products from the sidebar to create a customized menu for this platform.
                </p>
                <button className="inline-flex items-center px-4 py-2 text-sm font-medium text-blue-700 bg-blue-100 rounded-lg hover:bg-blue-200 transition-colors">
                  <PlusIcon className="w-4 h-4 mr-2" />
                  Add First Category
                </button>
              </div>
            )}
          </DropZone>
        </div>

        {/* Menu Preview Modal */}
        <AnimatePresence>
          {MenuPreview}
        </AnimatePresence>
      </div>
    </DndProvider>
  );
};