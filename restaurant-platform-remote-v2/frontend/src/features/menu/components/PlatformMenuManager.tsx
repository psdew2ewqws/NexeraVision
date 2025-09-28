// Enterprise Platform Menu Manager - B2B Professional Interface
import React, { useState, useCallback } from 'react';
import { MenuProduct, Platform } from '../../../types/menu';
import { useLanguage } from '../../../contexts/LanguageContext';
import { MenuProductSelectionUI } from './MenuProductSelectionUI';

interface PlatformMenuManagerProps {
  platform: Platform;
  onProductSelect?: (productId: string) => void;
  onProductEdit?: (product: MenuProduct) => void;
  onProductRemove?: (productId: string) => void;
  selectedProducts?: string[];
  className?: string;
}

export const PlatformMenuManager: React.FC<PlatformMenuManagerProps> = ({
  platform,
  onProductSelect,
  onProductEdit,
  onProductRemove,
  selectedProducts = [],
  className = ''
}) => {
  const { language } = useLanguage();
  const [productCount, setProductCount] = useState(0);

  // Handle product count updates from the MenuProductSelectionUI
  const handleProductCountChange = useCallback((count: number) => {
    setProductCount(count);
  }, []);

  return (
    <div className={`${className}`}>
      {/* Use the new MenuProductSelectionUI component */}
      <MenuProductSelectionUI
        platform={platform}
        onProductCountChange={handleProductCountChange}
        className="h-full"
      />
    </div>
  );
};