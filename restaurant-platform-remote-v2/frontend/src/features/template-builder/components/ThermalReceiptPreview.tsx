import React, { useMemo } from 'react';
import { TemplateToggleConfig } from '../types/template.types';
import { thermalFormatter } from '../utils/ThermalFormatter';

interface ThermalReceiptPreviewProps {
  toggleConfig: TemplateToggleConfig;
  sampleData?: any;
  className?: string;
}

// Sample order data for preview
const defaultSampleData = {
  company: {
    name: 'Restaurant Pro',
    phone: '+962 6 123 4567',
    address: '123 Main St, Amman, Jordan',
    email: 'info@restaurantpro.com',
    taxNumber: 'TAX123456789'
  },
  branch: {
    name: 'Downtown Branch',
    address: 'City Center, Amman'
  },
  order: {
    id: 'ORD-12345',
    createdAt: new Date(),
    type: 'Delivery',
    source: 'Website',
    subtotal: 15.50,
    deliveryFee: 2.00,
    tax: 1.24,
    discount: 0.00,
    total: 18.74,
    items: [
      {
        name: 'Margherita Pizza',
        quantity: 1,
        price: 12.50,
        options: ['Extra Cheese', 'Thin Crust']
      },
      {
        name: 'Coca Cola',
        quantity: 2,
        price: 1.50,
        options: []
      }
    ]
  },
  customer: {
    name: 'John Doe',
    phone: '+962 79 123 4567',
    address: '456 Second St, Apt 12, Amman, Jordan'
  }
};

export const ThermalReceiptPreview: React.FC<ThermalReceiptPreviewProps> = ({
  toggleConfig,
  sampleData = defaultSampleData,
  className = ''
}) => {
  const { content } = toggleConfig;

  // Helper function to get style with defaults
  const getStyleWithDefaults = (styleKey: keyof typeof content) => {
    const defaultStyle = {
      fontSize: 12,
      fontWeight: 'normal' as const,
      textAlign: 'left' as const,
      textTransform: 'none' as const,
      color: '#000000'
    };

    const style = content?.[styleKey] as any;
    return style ? { ...defaultStyle, ...style } : defaultStyle;
  };

  // Helper function to get content with defaults
  const getContentWithDefault = (key: string, defaultValue: string = '') => {
    return content?.[key as keyof typeof content] || defaultValue;
  };

  // Process template variables
  const processTemplate = (template: string): string => {
    if (!template) return '';
    return template
      .replace(/\{\{company\.name\}\}/g, sampleData.company.name)
      .replace(/\{\{company\.phone\}\}/g, sampleData.company.phone)
      .replace(/\{\{company\.address\}\}/g, sampleData.company.address)
      .replace(/\{\{company\.email\}\}/g, sampleData.company.email)
      .replace(/\{\{company\.taxNumber\}\}/g, sampleData.company.taxNumber)
      .replace(/\{\{branch\.name\}\}/g, sampleData.branch.name)
      .replace(/\{\{branch\.address\}\}/g, sampleData.branch.address)
      .replace(/\{\{order\.id\}\}/g, sampleData.order.id)
      .replace(/\{\{order\.createdAt \| date\}\}/g, sampleData.order.createdAt.toLocaleDateString())
      .replace(/\{\{order\.createdAt \| time\}\}/g, sampleData.order.createdAt.toLocaleTimeString())
      .replace(/\{\{order\.type\}\}/g, sampleData.order.type)
      .replace(/\{\{order\.source\}\}/g, sampleData.order.source)
      .replace(/\{\{order\.subtotal \| currency\}\}/g, `$${sampleData.order.subtotal.toFixed(2)}`)
      .replace(/\{\{order\.deliveryFee \| currency\}\}/g, `$${sampleData.order.deliveryFee.toFixed(2)}`)
      .replace(/\{\{order\.tax \| currency\}\}/g, `$${sampleData.order.tax.toFixed(2)}`)
      .replace(/\{\{order\.discount \| currency\}\}/g, `$${sampleData.order.discount.toFixed(2)}`)
      .replace(/\{\{order\.total \| currency\}\}/g, `$${sampleData.order.total.toFixed(2)}`)
      .replace(/\{\{customer\.name\}\}/g, sampleData.customer.name)
      .replace(/\{\{customer\.phone\}\}/g, sampleData.customer.phone)
      .replace(/\{\{customer\.address\}\}/g, sampleData.customer.address)
      .replace(/\{\{order\.trackingUrl\}\}/g, `https://track.order/${sampleData.order.id}`);
  };

  const receiptContent = useMemo(() => {
    const sections: React.ReactElement[] = [];

    // Header Section
    if (toggleConfig.isLogo) {
      sections.push(
        <div
          key="logo"
          className="text-center py-2"
          style={{
            fontSize: `${getStyleWithDefaults('headerStyle').fontSize}px`,
            fontWeight: getStyleWithDefaults('headerStyle').fontWeight,
            textAlign: getStyleWithDefaults('headerStyle').textAlign as any,
            textTransform: getStyleWithDefaults('headerStyle').textTransform as any,
            color: getStyleWithDefaults('headerStyle').color
          }}
        >
          [{getContentWithDefault('logoText', 'LOGO')}]
        </div>
      );
    }

    if (toggleConfig.isCompanyName) {
      sections.push(
        <div
          key="company-name"
          style={{
            fontSize: `${getStyleWithDefaults('headerStyle').fontSize}px`,
            fontWeight: getStyleWithDefaults('headerStyle').fontWeight,
            textAlign: getStyleWithDefaults('headerStyle').textAlign as any,
            textTransform: getStyleWithDefaults('headerStyle').textTransform as any,
            color: getStyleWithDefaults('headerStyle').color
          }}
        >
          {processTemplate(getContentWithDefault('companyName', '{{company.name}}'))}
        </div>
      );
    }

    if (toggleConfig.isCompanyPhone) {
      sections.push(
        <div
          key="company-phone"
          style={{
            fontSize: `${getStyleWithDefaults('headerStyle').fontSize}px`,
            fontWeight: getStyleWithDefaults('headerStyle').fontWeight,
            textAlign: getStyleWithDefaults('headerStyle').textAlign as any,
            textTransform: getStyleWithDefaults('headerStyle').textTransform as any,
            color: getStyleWithDefaults('headerStyle').color
          }}
        >
          {processTemplate(getContentWithDefault('companyPhone', '{{company.phone}}'))}
        </div>
      );
    }

    if (toggleConfig.isBranchName) {
      sections.push(
        <div
          key="branch-name"
          style={{
            fontSize: `${getStyleWithDefaults('headerStyle').fontSize}px`,
            fontWeight: getStyleWithDefaults('headerStyle').fontWeight,
            textAlign: getStyleWithDefaults('headerStyle').textAlign as any,
            textTransform: getStyleWithDefaults('headerStyle').textTransform as any,
            color: getStyleWithDefaults('headerStyle').color
          }}
        >
          {processTemplate(getContentWithDefault('branchName', '{{branch.name}}'))}
        </div>
      );
    }

    if (toggleConfig.isBranchAddress) {
      sections.push(
        <div
          key="branch-address"
          style={{
            fontSize: `${getStyleWithDefaults('headerStyle').fontSize}px`,
            fontWeight: getStyleWithDefaults('headerStyle').fontWeight,
            textAlign: getStyleWithDefaults('headerStyle').textAlign as any,
            textTransform: getStyleWithDefaults('headerStyle').textTransform as any,
            color: getStyleWithDefaults('headerStyle').color
          }}
        >
          {processTemplate(getContentWithDefault('branchAddress', '{{branch.address}}'))}
        </div>
      );
    }

    // Separator
    if (sections.length > 0) {
      sections.push(<div key="header-sep" className="border-t border-gray-400 my-2"></div>);
    }

    // Order Information
    if (toggleConfig.isOrderNumber) {
      sections.push(
        <div
          key="order-number"
          style={{
            fontSize: `${getStyleWithDefaults('orderStyle').fontSize}px`,
            fontWeight: getStyleWithDefaults('orderStyle').fontWeight,
            textAlign: getStyleWithDefaults('orderStyle').textAlign as any,
            textTransform: getStyleWithDefaults('orderStyle').textTransform as any,
            color: getStyleWithDefaults('orderStyle').color
          }}
        >
          {processTemplate(`${getContentWithDefault('orderNumberLabel', 'Order #')} ${getContentWithDefault('orderNumberFormat', '{{order.id}}')}`)}
        </div>
      );
    }

    if (toggleConfig.isOrderDate) {
      sections.push(
        <div
          key="order-date"
          style={{
            fontSize: `${getStyleWithDefaults('orderStyle').fontSize}px`,
            fontWeight: getStyleWithDefaults('orderStyle').fontWeight,
            textAlign: getStyleWithDefaults('orderStyle').textAlign as any,
            textTransform: getStyleWithDefaults('orderStyle').textTransform as any,
            color: getStyleWithDefaults('orderStyle').color
          }}
        >
          {processTemplate(`${getContentWithDefault('orderDateLabel', 'Date:')} ${getContentWithDefault('dateFormat', '{{order.createdAt | date}}')}`)}
        </div>
      );
    }

    if (toggleConfig.isOrderTime) {
      sections.push(
        <div
          key="order-time"
          style={{
            fontSize: `${getStyleWithDefaults('orderStyle').fontSize}px`,
            fontWeight: getStyleWithDefaults('orderStyle').fontWeight,
            textAlign: getStyleWithDefaults('orderStyle').textAlign as any,
            textTransform: getStyleWithDefaults('orderStyle').textTransform as any,
            color: getStyleWithDefaults('orderStyle').color
          }}
        >
          {processTemplate(`${getContentWithDefault('orderTimeLabel', 'Time:')} ${getContentWithDefault('timeFormat', '{{order.createdAt | time}}')}`)}
        </div>
      );
    }

    if (toggleConfig.isOrderType) {
      sections.push(
        <div
          key="order-type"
          style={{
            fontSize: `${getStyleWithDefaults('orderStyle').fontSize}px`,
            fontWeight: getStyleWithDefaults('orderStyle').fontWeight,
            textAlign: getStyleWithDefaults('orderStyle').textAlign as any,
            textTransform: getStyleWithDefaults('orderStyle').textTransform as any,
            color: getStyleWithDefaults('orderStyle').color
          }}
        >
          {getContentWithDefault('orderTypeLabel', 'Type:')} {sampleData.order.type}
        </div>
      );
    }

    // Customer Information
    if (toggleConfig.isCustomerName || toggleConfig.isCustomerPhone || toggleConfig.isCustomerAddress) {
      sections.push(<div key="customer-sep" className="border-t border-gray-400 my-2"></div>);

      if (toggleConfig.isCustomerName) {
        sections.push(
          <div
            key="customer-name"
            style={{
              fontSize: `${getStyleWithDefaults('customerStyle')?.fontSize || 14}px`,
              fontWeight: getStyleWithDefaults('customerStyle')?.fontWeight || 'normal',
              textAlign: (getStyleWithDefaults('customerStyle')?.textAlign || 'left') as any,
              textTransform: (getStyleWithDefaults('customerStyle')?.textTransform || 'none') as any,
              color: getStyleWithDefaults('customerStyle')?.color || '#000000'
            }}
          >
            {getContentWithDefault('customerNameLabel', 'Customer:')} {sampleData.customer.name}
          </div>
        );
      }

      if (toggleConfig.isCustomerPhone) {
        sections.push(
          <div
            key="customer-phone"
            style={{
              fontSize: `${getStyleWithDefaults('customerStyle')?.fontSize || 14}px`,
              fontWeight: getStyleWithDefaults('customerStyle')?.fontWeight || 'normal',
              textAlign: (getStyleWithDefaults('customerStyle')?.textAlign || 'left') as any,
              textTransform: (getStyleWithDefaults('customerStyle')?.textTransform || 'none') as any,
              color: getStyleWithDefaults('customerStyle')?.color || '#000000'
            }}
          >
            {getContentWithDefault('customerPhoneLabel', 'Phone:')} {sampleData.customer.phone}
          </div>
        );
      }

      if (toggleConfig.isCustomerAddress) {
        sections.push(
          <div
            key="customer-address"
            style={{
              fontSize: `${getStyleWithDefaults('customerStyle')?.fontSize || 14}px`,
              fontWeight: getStyleWithDefaults('customerStyle')?.fontWeight || 'normal',
              textAlign: (getStyleWithDefaults('customerStyle')?.textAlign || 'left') as any,
              textTransform: (getStyleWithDefaults('customerStyle')?.textTransform || 'none') as any,
              color: getStyleWithDefaults('customerStyle')?.color || '#000000'
            }}
          >
            {getContentWithDefault('customerAddressLabel', 'Address:')} {sampleData.customer.address}
          </div>
        );
      }
    }

    // Products Section
    if (toggleConfig.isProductInfo) {
      sections.push(<div key="products-sep" className="border-t border-gray-400 my-2"></div>);

      sections.push(
        <div
          key="products-header"
          className="text-center font-bold py-1"
          style={{
            fontSize: `${getStyleWithDefaults('productsStyle').fontSize + 2}px`,
            fontWeight: 'bold',
            textAlign: 'center',
            textTransform: getStyleWithDefaults('productsStyle').textTransform as any,
            color: getStyleWithDefaults('productsStyle').color
          }}
        >
          {getContentWithDefault('productsHeaderText', 'ORDER ITEMS')}
        </div>
      );

      // Product table headers
      const headers: string[] = [];
      if (toggleConfig.isProductQuantity) headers.push(getContentWithDefault('productQuantityHeader', 'Qty'));
      if (toggleConfig.isProductName) headers.push(getContentWithDefault('productNameHeader', 'Item'));
      if (toggleConfig.isProductPrice) headers.push(getContentWithDefault('productPriceHeader', 'Price'));

      if (headers.length > 0) {
        sections.push(
          <div key="product-headers" className="flex justify-between py-1 border-b border-gray-300">
            {headers.map((header, index) => (
              <div
                key={index}
                className={`${index === 1 ? 'flex-1 text-left' : 'w-12 text-center'}`}
                style={{
                  fontSize: `${getStyleWithDefaults('productsStyle').fontSize}px`,
                  fontWeight: 'bold',
                  color: getStyleWithDefaults('productsStyle').color
                }}
              >
                {header}
              </div>
            ))}
          </div>
        );
      }

      // Product items
      sampleData.order.items.forEach((item: any, index: number) => {
        const productCells: (string | number)[] = [];
        if (toggleConfig.isProductQuantity) productCells.push(item.quantity);
        if (toggleConfig.isProductName) productCells.push(item.name);
        if (toggleConfig.isProductPrice) productCells.push(`$${item.price.toFixed(2)}`);

        sections.push(
          <div key={`product-${index}`} className="flex justify-between py-1">
            {productCells.map((cell, cellIndex) => (
              <div
                key={cellIndex}
                className={`${cellIndex === 1 ? 'flex-1 text-left' : 'w-12 text-center'}`}
                style={{
                  fontSize: `${getStyleWithDefaults('productsStyle').fontSize}px`,
                  fontWeight: getStyleWithDefaults('productsStyle').fontWeight,
                  color: getStyleWithDefaults('productsStyle').color
                }}
              >
                {cell}
              </div>
            ))}
          </div>
        );

        // Product options
        if (toggleConfig.isProductAttributes && item.options.length > 0) {
          sections.push(
            <div
              key={`product-options-${index}`}
              className="text-sm text-gray-600 ml-4"
              style={{
                fontSize: `${getStyleWithDefaults('productsStyle').fontSize - 1}px`,
                color: '#666666'
              }}
            >
              {getContentWithDefault('productAttributesLabel', 'Options:')} {item.options.join(', ')}
            </div>
          );
        }
      });
    }

    // Totals Section
    sections.push(<div key="totals-sep" className="border-t border-gray-400 my-2"></div>);

    if (toggleConfig.isSubtotal) {
      sections.push(
        <div
          key="subtotal"
          className="flex justify-between"
          style={{
            fontSize: `${getStyleWithDefaults('totalsStyle').fontSize}px`,
            fontWeight: getStyleWithDefaults('totalsStyle').fontWeight,
            color: getStyleWithDefaults('totalsStyle').color
          }}
        >
          <span>{getContentWithDefault('subtotalLabel', 'Subtotal')}</span>
          <span>${sampleData.order.subtotal.toFixed(2)}</span>
        </div>
      );
    }

    if (toggleConfig.isDeliveryFees) {
      sections.push(
        <div
          key="delivery"
          className="flex justify-between"
          style={{
            fontSize: `${getStyleWithDefaults('totalsStyle').fontSize}px`,
            fontWeight: getStyleWithDefaults('totalsStyle').fontWeight,
            color: getStyleWithDefaults('totalsStyle').color
          }}
        >
          <span>{getContentWithDefault('deliveryFeesLabel', 'Delivery Fee')}</span>
          <span>${sampleData.order.deliveryFee.toFixed(2)}</span>
        </div>
      );
    }

    if (toggleConfig.isTaxValue) {
      sections.push(
        <div
          key="tax"
          className="flex justify-between"
          style={{
            fontSize: `${getStyleWithDefaults('totalsStyle').fontSize}px`,
            fontWeight: getStyleWithDefaults('totalsStyle').fontWeight,
            color: getStyleWithDefaults('totalsStyle').color
          }}
        >
          <span>{getContentWithDefault('taxValueLabel', 'Tax')}</span>
          <span>${sampleData.order.tax.toFixed(2)}</span>
        </div>
      );
    }

    if (toggleConfig.isDiscount && sampleData.order.discount > 0) {
      sections.push(
        <div
          key="discount"
          className="flex justify-between"
          style={{
            fontSize: `${getStyleWithDefaults('totalsStyle').fontSize}px`,
            fontWeight: getStyleWithDefaults('totalsStyle').fontWeight,
            color: getStyleWithDefaults('totalsStyle').color
          }}
        >
          <span>{getContentWithDefault('discountLabel', 'Discount')}</span>
          <span>-${sampleData.order.discount.toFixed(2)}</span>
        </div>
      );
    }

    if (toggleConfig.isTotal) {
      sections.push(
        <div
          key="total"
          className="flex justify-between font-bold border-t border-gray-400 pt-1 mt-1"
          style={{
            fontSize: `${getStyleWithDefaults('totalsStyle').fontSize + 2}px`,
            fontWeight: 'bold',
            color: getStyleWithDefaults('totalsStyle').color
          }}
        >
          <span>{getContentWithDefault('totalLabel', 'Total')}</span>
          <span>${sampleData.order.total.toFixed(2)}</span>
        </div>
      );
    }

    // Footer Section
    if (toggleConfig.isThankYouMessage) {
      sections.push(<div key="footer-spacer" className="my-3"></div>);
      sections.push(
        <div
          key="thank-you"
          className="text-center"
          style={{
            fontSize: `${getStyleWithDefaults('footerStyle').fontSize}px`,
            fontWeight: getStyleWithDefaults('footerStyle').fontWeight,
            textAlign: getStyleWithDefaults('footerStyle').textAlign as any,
            textTransform: getStyleWithDefaults('footerStyle').textTransform as any,
            color: getStyleWithDefaults('footerStyle').color
          }}
        >
          {getContentWithDefault('thankYouMessage', 'Thank you for your order!')}
        </div>
      );
    }

    if (toggleConfig.isContactInfo) {
      sections.push(
        <div
          key="contact"
          className="text-center"
          style={{
            fontSize: `${getStyleWithDefaults('footerStyle').fontSize}px`,
            fontWeight: getStyleWithDefaults('footerStyle').fontWeight,
            textAlign: getStyleWithDefaults('footerStyle').textAlign as any,
            textTransform: getStyleWithDefaults('footerStyle').textTransform as any,
            color: getStyleWithDefaults('footerStyle').color
          }}
        >
          {processTemplate(getContentWithDefault('contactInfo', '{{company.phone}}'))}
        </div>
      );
    }

    if (toggleConfig.isTaxNumber) {
      sections.push(
        <div
          key="tax-number"
          className="text-center"
          style={{
            fontSize: `${getStyleWithDefaults('footerStyle').fontSize}px`,
            fontWeight: getStyleWithDefaults('footerStyle').fontWeight,
            textAlign: getStyleWithDefaults('footerStyle').textAlign as any,
            textTransform: getStyleWithDefaults('footerStyle').textTransform as any,
            color: getStyleWithDefaults('footerStyle').color
          }}
        >
          Tax ID: {processTemplate(getContentWithDefault('taxNumber', '{{company.taxNumber}}'))}
        </div>
      );
    }

    if (toggleConfig.isBarcode) {
      sections.push(
        <div key="barcode" className="text-center py-2">
          <div className="inline-block bg-black text-white px-2 py-1 font-mono text-xs">
            |||| {processTemplate(getContentWithDefault('barcodeContent', '{{order.id}}'))} ||||
          </div>
        </div>
      );
    }

    if (toggleConfig.isQRCode) {
      sections.push(
        <div key="qr-code" className="text-center py-2">
          <div className="inline-block border-2 border-black w-16 h-16 flex items-center justify-center text-xs">
            QR
          </div>
        </div>
      );
    }

    return sections;
  }, [toggleConfig, content, sampleData]);

  return (
    <div className={`bg-white border border-gray-300 rounded-lg overflow-hidden shadow-sm ${className}`} style={{ width: '384px', maxWidth: '100%' }}>
      {/* Thermal Receipt Header */}
      <div className="bg-gray-800 text-white text-center py-2 text-xs font-bold uppercase tracking-wide">
        🧾 Live Preview
      </div>

      {/* Receipt Content */}
      <div
        className="p-4 font-mono text-xs leading-relaxed"
        style={{
          fontFamily: '"Courier New", "Liberation Mono", "DejaVu Sans Mono", monospace',
          fontSize: '11px',
          lineHeight: '1.2',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-all'
        }}
      >
        <div className="space-y-1">
          {receiptContent}
        </div>
      </div>

      {/* Preview Info */}
      <div className="bg-gray-50 px-4 py-2 text-center border-t">
        <div className="text-xs text-gray-600">
          📏 80mm thermal paper (48 chars) | ⚡ Real-time preview
        </div>
      </div>
    </div>
  );
};

export default ThermalReceiptPreview;