import React from 'react';
import { 
  XMarkIcon,
  EyeIcon,
  CurrencyDollarIcon,
  ClockIcon,
  StarIcon,
  TagIcon,
  BuildingOfficeIcon,
  CheckCircleIcon,
  XCircleIcon
} from '@heroicons/react/24/outline';
import { MenuProduct } from '../../../types/menu';
import { useLanguage } from '../../../contexts/LanguageContext';
import { getLocalizedText, formatCurrency } from '../../../lib/menu-utils';
import { getImageUrl, getPlaceholderUrl } from '../../../utils/imageUrl';
import Image from 'next/image';

interface ProductViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: MenuProduct | null;
}

export const ProductViewModal: React.FC<ProductViewModalProps> = ({
  isOpen,
  onClose,
  product
}) => {
  const { language } = useLanguage();

  if (!isOpen || !product) return null;

  const productName = getLocalizedText(product.name, language);
  const categoryName = product.category ? getLocalizedText(product.category.name, language) : 'Uncategorized';
  const description = product.description ? getLocalizedText(product.description, language) : '';

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        {/* Backdrop */}
        <div className="fixed inset-0 bg-black bg-opacity-50 transition-opacity" onClick={onClose} />
        
        {/* Modal */}
        <div className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gray-50">
            <div className="flex items-center space-x-3">
              <div className="flex items-center justify-center w-8 h-8 bg-blue-100 rounded-lg">
                <EyeIcon className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Product Details</h2>
                <p className="text-sm text-gray-500">View product information</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="overflow-y-auto max-h-[calc(90vh-180px)]">
            <div className="p-6 space-y-6">
              
              {/* Product Image and Basic Info */}
              <div className="flex flex-col lg:flex-row gap-6">
                {/* Image */}
                <div className="flex-shrink-0">
                  {product.image ? (
                    <div className="relative w-48 h-32 bg-gray-100 rounded-lg overflow-hidden">
                      <Image
                        src={getImageUrl(product.image)}
                        alt={productName}
                        fill
                        className="object-cover"
                      />
                    </div>
                  ) : (
                    <div className="w-48 h-32 bg-gray-100 rounded-lg flex items-center justify-center">
                      <div className="text-gray-400 text-center">
                        <CurrencyDollarIcon className="w-8 h-8 mx-auto mb-2" />
                        <span className="text-sm">No Image</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Basic Info */}
                <div className="flex-1">
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">{productName}</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center text-sm text-gray-600">
                      <TagIcon className="w-4 h-4 mr-2 text-gray-400" />
                      <span className="font-medium">Category:</span>
                      <span className="ml-2">{categoryName}</span>
                    </div>
                    
                    {product.company && (
                      <div className="flex items-center text-sm text-gray-600">
                        <BuildingOfficeIcon className="w-4 h-4 mr-2 text-gray-400" />
                        <span className="font-medium">Company:</span>
                        <span className="ml-2">{product.company.name}</span>
                      </div>
                    )}
                    
                    <div className="flex items-center text-sm text-gray-600">
                      <StarIcon className="w-4 h-4 mr-2 text-gray-400" />
                      <span className="font-medium">Priority:</span>
                      <span className="ml-2">{product.priority}</span>
                    </div>
                    
                    <div className="flex items-center text-sm text-gray-600">
                      <ClockIcon className="w-4 h-4 mr-2 text-gray-400" />
                      <span className="font-medium">Prep Time:</span>
                      <span className="ml-2">{product.preparationTime} minutes</span>
                    </div>
                  </div>
                  
                  {/* Status Badge */}
                  <div className="mt-4">
                    <div className="flex items-center">
                      {product.status === 1 ? (
                        <>
                          <CheckCircleIcon className="w-5 h-5 text-green-500 mr-2" />
                          <span className="px-3 py-1 text-sm font-medium text-green-800 bg-green-100 rounded-full">
                            Active
                          </span>
                        </>
                      ) : (
                        <>
                          <XCircleIcon className="w-5 h-5 text-red-500 mr-2" />
                          <span className="px-3 py-1 text-sm font-medium text-red-800 bg-red-100 rounded-full">
                            Inactive
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Description */}
              {description && (
                <div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-3">Description</h4>
                  <p className="text-gray-600 bg-gray-50 p-4 rounded-lg leading-relaxed">
                    {description}
                  </p>
                </div>
              )}

              {/* Pricing Information */}
              <div>
                <h4 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                  <CurrencyDollarIcon className="w-5 h-5 mr-2" />
                  Pricing
                </h4>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div className="bg-white p-3 rounded border">
                      <div className="text-sm font-medium text-gray-500">Base Price</div>
                      <div className="text-lg font-semibold text-gray-900">
                        {formatCurrency(product.basePrice)} JOD
                      </div>
                    </div>
                    
                    {Object.entries(product.pricing).map(([platform, price]) => (
                      <div key={platform} className="bg-white p-3 rounded border">
                        <div className="text-sm font-medium text-gray-500 capitalize">
                          {platform.replace('_', ' ')}
                        </div>
                        <div className="text-lg font-semibold text-gray-900">
                          {formatCurrency(price as number)} JOD
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Tags */}
              {product.tags && product.tags.length > 0 && (
                <div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-3">Tags</h4>
                  <div className="flex flex-wrap gap-2">
                    {product.tags.map((tag, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center px-3 py-1 text-sm font-medium text-blue-700 bg-blue-100 rounded-full"
                      >
                        <TagIcon className="w-3 h-3 mr-1" />
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Multi-language Support */}
              <div>
                <h4 className="text-lg font-semibold text-gray-900 mb-3">Available Languages</h4>
                <div className="bg-gray-50 p-4 rounded-lg space-y-3">
                  {Object.entries(product.name).map(([langCode, name]) => (
                    <div key={langCode} className="flex justify-between items-center py-2 border-b border-gray-200 last:border-b-0">
                      <span className="font-medium text-gray-700 uppercase text-sm">{langCode}:</span>
                      <span className="text-gray-900" dir={langCode === 'ar' ? 'rtl' : 'ltr'}>
                        {name}
                      </span>
                    </div>
                  ))}
                  
                  {product.description && Object.keys(product.description).length > 0 && (
                    <div className="mt-4">
                      <div className="text-sm font-medium text-gray-500 mb-2">Descriptions:</div>
                      {Object.entries(product.description).map(([langCode, desc]) => desc && (
                        <div key={langCode} className="mb-2">
                          <span className="text-xs text-gray-500 uppercase">{langCode}:</span>
                          <p className="text-sm text-gray-700 mt-1" dir={langCode === 'ar' ? 'rtl' : 'ltr'}>
                            {desc}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Timestamps */}
              <div className="pt-4 border-t border-gray-200">
                <div className="grid grid-cols-2 gap-4 text-sm text-gray-500">
                  <div>
                    <span className="font-medium">Created:</span>
                    <div>{new Date(product.createdAt).toLocaleString()}</div>
                  </div>
                  <div>
                    <span className="font-medium">Updated:</span>
                    <div>{new Date(product.updatedAt).toLocaleString()}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-end px-6 py-4 border-t border-gray-200 bg-gray-50">
            <button
              onClick={onClose}
              className="px-6 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};