import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { PhotoIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../../../contexts/AuthContext';
import { useLanguage } from '../../../contexts/LanguageContext';
import { getImageUrl, getPlaceholderUrl, getCategoryPlaceholderUrl } from '../../../utils/imageUrl';

interface ProductPreviewItem {
  id: string;
  name: string;
  image?: string;
}

// Separate component for individual product preview to handle state properly
interface ProductPreviewCardProps {
  product: ProductPreviewItem;
  index: number;
  language: string;
}

const ProductPreviewCard: React.FC<ProductPreviewCardProps> = ({ product, index, language }) => {
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);

  const productName = typeof product.name === 'string'
    ? product.name
    : product.name[language] || product.name['en'] || 'Product';

  return (
    <div className="relative group">
      <div className="w-full h-48 rounded-md overflow-hidden bg-gradient-to-br from-gray-50 to-gray-100 border-2 border-gray-200 hover:border-blue-300 transition-all duration-200 hover:shadow-md">
        {product.image && !imageError ? (
          <>
            <Image
              src={getImageUrl(product.image)}
              alt={productName}
              fill
              sizes="(max-width: 768px) 100vw, 400px"
              className={`object-cover transition-opacity duration-300 ${
                imageLoading ? 'opacity-0' : 'opacity-100'
              }`}
              loading="lazy"
              onLoad={() => setImageLoading(false)}
              onError={() => {
                setImageError(true);
                setImageLoading(false);
              }}
            />
            {imageLoading && (
              <div className="absolute inset-0 bg-gray-200 animate-pulse flex items-center justify-center">
                <PhotoIcon className="w-4 h-4 text-gray-400" />
              </div>
            )}
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50">
            <PhotoIcon className="w-6 h-6 text-gray-400" />
          </div>
        )}
      </div>

      {/* Enhanced tooltip with product name */}
      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-all duration-200 bg-gray-900 text-white text-xs px-2 py-1 rounded-md whitespace-nowrap z-20 pointer-events-none shadow-lg">
        {productName}
        <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-2 border-r-2 border-t-2 border-l-transparent border-r-transparent border-t-gray-900"></div>
      </div>

      {/* Index indicator */}
      <div className="absolute -top-1 -right-1 w-4 h-4 bg-blue-500 text-white text-xs rounded-full flex items-center justify-center font-bold opacity-0 group-hover:opacity-100 transition-opacity">
        {index + 1}
      </div>
    </div>
  );
};

interface PlatformProductPreviewProps {
  platformId: string;
  platformName: string;
  selectedBranches?: string[];
}

export const PlatformProductPreview: React.FC<PlatformProductPreviewProps> = ({
  platformId,
  platformName,
  selectedBranches = [],
}) => {
  const { user } = useAuth();
  const { language } = useLanguage();
  const [products, setProducts] = useState<ProductPreviewItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadProducts = async () => {
      if (!user || !platformId) return;

      setLoading(true);
      try {
        const token = localStorage.getItem('auth-token');
        const apiUrl = `${process.env.NEXT_PUBLIC_API_URL}/menu/products/paginated`;

        console.log('🔍 PlatformProductPreview Debug:', {
          platformId,
          user: user?.email,
          apiUrl,
          hasToken: !!token,
        });

        const requestBody = {
          page: 1,
          limit: 4, // Show max 4 product images in 2x2 grid
          status: 1, // Active products only
          companyId: user.companyId, // Ensure we get products for the user's company
          ...(selectedBranches.length > 0 && { branchIds: selectedBranches }),
        };

        console.log('📤 API Request:', requestBody);

        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(requestBody),
        });

        console.log('📥 API Response:', {
          status: response.status,
          statusText: response.statusText,
          ok: response.ok
        });

        if (response.ok) {
          const data = await response.json();
          console.log('✅ Products loaded:', data);
          setProducts(data.products?.slice(0, 4) || []); // Ensure max 4 items for 2x2 grid
        } else {
          const errorData = await response.text();
          console.error('❌ API Error Response:', {
            status: response.status,
            statusText: response.statusText,
            body: errorData
          });
        }
      } catch (error) {
        console.error('❌ Failed to load platform products:', error);
      } finally {
        setLoading(false);
      }
    };

    loadProducts();
  }, [platformId, user, selectedBranches]);

  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-4">
        {[...Array(4)].map((_, index) => (
          <div key={index} className="w-full h-48 bg-gradient-to-br from-gray-200 to-gray-300 rounded-md animate-pulse flex items-center justify-center">
            <PhotoIcon className="w-6 h-6 text-gray-400" />
          </div>
        ))}
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="w-full h-48 bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-dashed border-gray-300 rounded-md mx-auto mb-4 flex items-center justify-center">
          <div className="text-center">
            <PhotoIcon className="w-12 h-12 text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-gray-500 font-medium">No products available</p>
            <p className="text-xs text-gray-400">Add products to see previews</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-4">
      {products.map((product, index) => (
        <ProductPreviewCard
          key={product.id}
          product={product}
          index={index}
          language={language}
        />
      ))}

      {/* Fill remaining slots with empty placeholders if less than 4 products */}
      {products.length < 4 && [...Array(4 - products.length)].map((_, index) => (
        <div key={`empty-${index}`} className="w-full h-48 rounded-md bg-gray-50 border border-gray-100 opacity-50" />
      ))}
    </div>
  );
};