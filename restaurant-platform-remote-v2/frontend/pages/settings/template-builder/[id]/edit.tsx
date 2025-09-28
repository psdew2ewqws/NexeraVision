import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import {
  ArrowLeftIcon,
  CogIcon,
  EyeIcon,
  PrinterIcon,
  CheckCircleIcon,
  XCircleIcon,
  InformationCircleIcon,
  PencilIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '../../../../src/contexts/AuthContext';
import { ProtectedRoute } from '../../../../src/components/shared/ProtectedRoute';
import { useTemplateBuilderStore } from '../../../../src/features/template-builder/stores/template-builder.store';
import { useTemplateBuilderApi } from '../../../../src/features/template-builder/hooks/useTemplateBuilderApi';
import { TemplateSection, TemplateToggleConfig, TemplateEditableContent } from '../../../../src/features/template-builder/types/template.types';
import ThermalReceiptPreview from '../../../../src/features/template-builder/components/ThermalReceiptPreview';
import { thermalFormatter } from '../../../../src/features/template-builder/utils/ThermalFormatter';
import PrinterDropdown from '../../../../src/components/printers/PrinterDropdown';

// Sample data for preview generation
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
import toast from 'react-hot-toast';

export default function TemplateBuilderEditPage() {
  const router = useRouter();
  const { id } = router.query;
  const { user } = useAuth();
  const {
    currentTemplate,
    toggleConfig,
    availableSections,
    selectedCategory,
    isToggleMode,
    hasUnsavedChanges,
    isLoading,
    isSaving,
    selectedPrinterId,
    availablePrinters,
    isLoadingPrinters,
    printerError,
    setCurrentTemplate,
    setToggleMode,
    updateToggleConfig,
    updateEditableContent,
    toggleSection,
    resetToggleConfig,
    setSelectedCategory,
    generateTemplateFromToggles,
    setComponents,
    setSelectedPrinterId,
    fetchPrinters
  } = useTemplateBuilderStore();

  const {
    getTemplate,
    updateTemplate,
    generatePreview,
    testPrint,
    testPrintWithPrinter
  } = useTemplateBuilderApi();

  const [templateName, setTemplateName] = useState('');
  const [expandedSections, setExpandedSections] = useState<{[key: string]: boolean}>({});
  const [previewMode, setPreviewMode] = useState(false);

  // Generate thermal receipt text content for physical printing (no HTML)
  const generateThermalReceiptText = () => {
    const { content } = toggleConfig;
    const sampleData = defaultSampleData;

    // Safety check for content object
    if (!content) {
      console.warn('Content object is undefined in toggleConfig');
      return 'Template content not available';
    }

    // Helper function to safely get content values with fallback defaults
    const getContentValue = (key: string, defaultValue: string = '') => {
      return content[key] || defaultValue;
    };

    // Ensure required content properties exist with defaults
    const safeContent = {
      logoText: content.logoText || 'LOGO',
      companyName: content.companyName || '{{company.name}}',
      companyPhone: content.companyPhone || '{{company.phone}}',
      branchName: content.branchName || '{{branch.name}}',
      branchAddress: content.branchAddress || '{{branch.address}}',
      orderNumberLabel: content.orderNumberLabel || 'Order #',
      orderNumberFormat: content.orderNumberFormat || '{{order.id}}',
      orderDateLabel: content.orderDateLabel || 'Date:',
      dateFormat: content.dateFormat || '{{order.createdAt | date}}',
      orderTimeLabel: content.orderTimeLabel || 'Time:',
      timeFormat: content.timeFormat || '{{order.createdAt | time}}',
      orderTypeLabel: content.orderTypeLabel || 'Type:',
      orderSourceLabel: content.orderSourceLabel || 'Source:',
      customerNameLabel: content.customerNameLabel || 'Customer:',
      customerPhoneLabel: content.customerPhoneLabel || 'Phone:',
      customerAddressLabel: content.customerAddressLabel || 'Address:',
      productsHeaderText: content.productsHeaderText || 'ITEMS',
      productQuantityHeader: content.productQuantityHeader || 'Qty',
      productNameHeader: content.productNameHeader || 'Item',
      productPriceHeader: content.productPriceHeader || 'Price',
      subtotalLabel: content.subtotalLabel || 'Subtotal:',
      deliveryFeesLabel: content.deliveryFeesLabel || 'Delivery:',
      taxValueLabel: content.taxValueLabel || 'Tax:',
      discountLabel: content.discountLabel || 'Discount:',
      totalLabel: content.totalLabel || 'TOTAL:',
      thankYouMessage: content.thankYouMessage || 'Thank you for your order!',
      contactInfo: content.contactInfo || '{{company.phone}} | {{company.email}}',
      taxNumber: content.taxNumber || '{{company.taxNumber}}',
      barcodeContent: content.barcodeContent || '{{order.id}}',
      qrCodeContent: content.qrCodeContent || '{{order.trackingUrl}}'
    };

    // Process template variables
    const processTemplate = (template: string): string => {
      if (!template || typeof template !== 'string') {
        return '';
      }
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
        .replace(/\{\{order\.subtotal \| currency\}\}/g, thermalFormatter.formatCurrency(sampleData.order.subtotal))
        .replace(/\{\{order\.deliveryFee \| currency\}\}/g, thermalFormatter.formatCurrency(sampleData.order.deliveryFee))
        .replace(/\{\{order\.tax \| currency\}\}/g, thermalFormatter.formatCurrency(sampleData.order.tax))
        .replace(/\{\{order\.discount \| currency\}\}/g, thermalFormatter.formatCurrency(sampleData.order.discount))
        .replace(/\{\{order\.total \| currency\}\}/g, thermalFormatter.formatCurrency(sampleData.order.total))
        .replace(/\{\{customer\.name\}\}/g, sampleData.customer.name)
        .replace(/\{\{customer\.phone\}\}/g, sampleData.customer.phone)
        .replace(/\{\{customer\.address\}\}/g, sampleData.customer.address)
        .replace(/\{\{order\.trackingUrl\}\}/g, `https://track.order/${sampleData.order.id}`);
    };

    let receiptLines: string[] = [];

    // Header Section
    if (toggleConfig.isLogo) {
      receiptLines.push(thermalFormatter.centerText(`[${safeContent.logoText}]`));
    }

    if (toggleConfig.isCompanyName) {
      receiptLines.push(thermalFormatter.centerText(processTemplate(safeContent.companyName)));
    }

    if (toggleConfig.isCompanyPhone) {
      receiptLines.push(thermalFormatter.centerText(processTemplate(safeContent.companyPhone)));
    }

    if (toggleConfig.isBranchName) {
      receiptLines.push(thermalFormatter.centerText(processTemplate(safeContent.branchName)));
    }

    if (toggleConfig.isBranchAddress) {
      receiptLines.push(thermalFormatter.centerText(processTemplate(safeContent.branchAddress)));
    }

    // Add separator if header exists
    if (toggleConfig.isLogo || toggleConfig.isCompanyName || toggleConfig.isCompanyPhone ||
        toggleConfig.isBranchName || toggleConfig.isBranchAddress) {
      receiptLines.push(thermalFormatter.separator());
    }

    // Order Information
    if (toggleConfig.isOrderNumber) {
      receiptLines.push(processTemplate(`${safeContent.orderNumberLabel} ${safeContent.orderNumberFormat}`));
    }

    if (toggleConfig.isOrderDate) {
      receiptLines.push(processTemplate(`${safeContent.orderDateLabel} ${safeContent.dateFormat}`));
    }

    if (toggleConfig.isOrderTime) {
      receiptLines.push(processTemplate(`${safeContent.orderTimeLabel} ${safeContent.timeFormat}`));
    }

    if (toggleConfig.isOrderType) {
      receiptLines.push(`${safeContent.orderTypeLabel} ${sampleData.order.type}`);
    }

    if (toggleConfig.isOrderSource) {
      receiptLines.push(`${safeContent.orderSourceLabel} ${sampleData.order.source}`);
    }

    // Customer Information
    if (toggleConfig.isCustomerName || toggleConfig.isCustomerPhone || toggleConfig.isCustomerAddress) {
      receiptLines.push(thermalFormatter.separator());

      if (toggleConfig.isCustomerName) {
        receiptLines.push(`${safeContent.customerNameLabel} ${sampleData.customer.name}`);
      }

      if (toggleConfig.isCustomerPhone) {
        receiptLines.push(`${safeContent.customerPhoneLabel} ${sampleData.customer.phone}`);
      }

      if (toggleConfig.isCustomerAddress) {
        receiptLines.push(safeContent.customerAddressLabel);
        // Wrap long address lines
        const addressLines = thermalFormatter.wrapText(sampleData.customer.address, 2);
        receiptLines.push(...addressLines);
      }
    }

    // Products Section
    if (toggleConfig.isProductInfo) {
      receiptLines.push(thermalFormatter.separator());
      receiptLines.push(thermalFormatter.centerText(safeContent.productsHeaderText));
      receiptLines.push(thermalFormatter.separator());

      // Table headers
      const headerLine = thermalFormatter.formatProductHeader(
        toggleConfig.isProductQuantity,
        toggleConfig.isProductPrice
      );
      receiptLines.push(headerLine);
      receiptLines.push(thermalFormatter.separator());

      // Product items
      sampleData.order.items.forEach((item) => {
        if (toggleConfig.isProductQuantity && toggleConfig.isProductName && toggleConfig.isProductPrice) {
          receiptLines.push(thermalFormatter.formatProductLine(item.quantity, item.name, item.price));
        } else {
          // Custom product line formatting for partial configurations
          let productLine = '';
          if (toggleConfig.isProductQuantity) {
            productLine += item.quantity.toString().padEnd(3);
          }
          if (toggleConfig.isProductName) {
            const nameWidth = 48 - (toggleConfig.isProductQuantity ? 3 : 0) - (toggleConfig.isProductPrice ? 8 : 0);
            productLine += item.name.substring(0, nameWidth).padEnd(nameWidth);
          }
          if (toggleConfig.isProductPrice) {
            productLine += thermalFormatter.formatCurrency(item.price).padStart(8);
          }
          receiptLines.push(productLine);
        }

        // Product options
        if (toggleConfig.isProductAttributes && item.options.length > 0) {
          receiptLines.push(`  ${safeContent.productAttributesLabel} ${item.options.join(', ')}`);
        }
      });
    }

    // Totals Section
    receiptLines.push(thermalFormatter.separator());

    if (toggleConfig.isSubtotal) {
      receiptLines.push(thermalFormatter.leftRightAlign(
        safeContent.subtotalLabel,
        thermalFormatter.formatCurrency(sampleData.order.subtotal)
      ));
    }

    if (toggleConfig.isDeliveryFees) {
      receiptLines.push(thermalFormatter.leftRightAlign(
        safeContent.deliveryFeesLabel,
        thermalFormatter.formatCurrency(sampleData.order.deliveryFee)
      ));
    }

    if (toggleConfig.isTaxValue) {
      receiptLines.push(thermalFormatter.leftRightAlign(
        safeContent.taxValueLabel,
        thermalFormatter.formatCurrency(sampleData.order.tax)
      ));
    }

    if (toggleConfig.isDiscount && sampleData.order.discount > 0) {
      receiptLines.push(thermalFormatter.leftRightAlign(
        safeContent.discountLabel,
        `-${thermalFormatter.formatCurrency(sampleData.order.discount)}`
      ));
    }

    if (toggleConfig.isTotal) {
      receiptLines.push(thermalFormatter.doubleSeparator());
      receiptLines.push(thermalFormatter.leftRightAlign(
        safeContent.totalLabel,
        thermalFormatter.formatCurrency(sampleData.order.total)
      ));
      receiptLines.push(thermalFormatter.doubleSeparator());
    }

    // Footer Section
    if (toggleConfig.isThankYouMessage) {
      receiptLines.push(''); // Empty line
      receiptLines.push(thermalFormatter.centerText(safeContent.thankYouMessage));
    }

    if (toggleConfig.isContactInfo) {
      receiptLines.push(thermalFormatter.centerText(processTemplate(safeContent.contactInfo)));
    }

    if (toggleConfig.isTaxNumber) {
      receiptLines.push(thermalFormatter.centerText(`Tax ID: ${processTemplate(safeContent.taxNumber)}`));
    }

    if (toggleConfig.isBarcode) {
      receiptLines.push(''); // Empty line
      receiptLines.push(thermalFormatter.centerText('|||| ' + processTemplate(safeContent.barcodeContent) + ' ||||'));
    }

    if (toggleConfig.isQRCode) {
      receiptLines.push(''); // Empty line
      receiptLines.push(thermalFormatter.centerText('█████████████████'));
      receiptLines.push(thermalFormatter.centerText('█ QR CODE HERE  █'));
      receiptLines.push(thermalFormatter.centerText('█████████████████'));
    }

    return receiptLines.join('\n');
  };

  // Generate thermal receipt HTML content for browser preview
  const generateThermalReceiptHTML = () => {
    const { content } = toggleConfig;
    const sampleData = defaultSampleData;

    // Process template variables
    const processTemplate = (template: string): string => {
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
        .replace(/\{\{order\.subtotal \| currency\}\}/g, thermalFormatter.formatCurrency(sampleData.order.subtotal))
        .replace(/\{\{order\.deliveryFee \| currency\}\}/g, thermalFormatter.formatCurrency(sampleData.order.deliveryFee))
        .replace(/\{\{order\.tax \| currency\}\}/g, thermalFormatter.formatCurrency(sampleData.order.tax))
        .replace(/\{\{order\.discount \| currency\}\}/g, thermalFormatter.formatCurrency(sampleData.order.discount))
        .replace(/\{\{order\.total \| currency\}\}/g, thermalFormatter.formatCurrency(sampleData.order.total))
        .replace(/\{\{customer\.name\}\}/g, sampleData.customer.name)
        .replace(/\{\{customer\.phone\}\}/g, sampleData.customer.phone)
        .replace(/\{\{customer\.address\}\}/g, sampleData.customer.address)
        .replace(/\{\{order\.trackingUrl\}\}/g, `https://track.order/${sampleData.order.id}`);
    };

    let receiptLines: string[] = [];

    // Header Section
    if (toggleConfig.isLogo) {
      receiptLines.push(thermalFormatter.centerText(`[${safeContent.logoText}]`));
    }

    if (toggleConfig.isCompanyName) {
      receiptLines.push(thermalFormatter.centerText(processTemplate(safeContent.companyName)));
    }

    if (toggleConfig.isCompanyPhone) {
      receiptLines.push(thermalFormatter.centerText(processTemplate(safeContent.companyPhone)));
    }

    if (toggleConfig.isBranchName) {
      receiptLines.push(thermalFormatter.centerText(processTemplate(safeContent.branchName)));
    }

    if (toggleConfig.isBranchAddress) {
      receiptLines.push(thermalFormatter.centerText(processTemplate(safeContent.branchAddress)));
    }

    // Add separator if header exists
    if (toggleConfig.isLogo || toggleConfig.isCompanyName || toggleConfig.isCompanyPhone ||
        toggleConfig.isBranchName || toggleConfig.isBranchAddress) {
      receiptLines.push(thermalFormatter.separator());
    }

    // Order Information
    if (toggleConfig.isOrderNumber) {
      receiptLines.push(processTemplate(`${safeContent.orderNumberLabel} ${safeContent.orderNumberFormat}`));
    }

    if (toggleConfig.isOrderDate) {
      receiptLines.push(processTemplate(`${safeContent.orderDateLabel} ${safeContent.dateFormat}`));
    }

    if (toggleConfig.isOrderTime) {
      receiptLines.push(processTemplate(`${safeContent.orderTimeLabel} ${safeContent.timeFormat}`));
    }

    if (toggleConfig.isOrderType) {
      receiptLines.push(`${safeContent.orderTypeLabel} ${sampleData.order.type}`);
    }

    if (toggleConfig.isOrderSource) {
      receiptLines.push(`${safeContent.orderSourceLabel} ${sampleData.order.source}`);
    }

    // Customer Information
    if (toggleConfig.isCustomerName || toggleConfig.isCustomerPhone || toggleConfig.isCustomerAddress) {
      receiptLines.push(thermalFormatter.separator());

      if (toggleConfig.isCustomerName) {
        receiptLines.push(`${safeContent.customerNameLabel} ${sampleData.customer.name}`);
      }

      if (toggleConfig.isCustomerPhone) {
        receiptLines.push(`${safeContent.customerPhoneLabel} ${sampleData.customer.phone}`);
      }

      if (toggleConfig.isCustomerAddress) {
        receiptLines.push(safeContent.customerAddressLabel);
        // Wrap long address lines
        const addressLines = thermalFormatter.wrapText(sampleData.customer.address, 2);
        receiptLines.push(...addressLines);
      }
    }

    // Products Section
    if (toggleConfig.isProductInfo) {
      receiptLines.push(thermalFormatter.separator());
      receiptLines.push(thermalFormatter.centerText(safeContent.productsHeaderText));
      receiptLines.push(thermalFormatter.separator());

      // Table headers
      const headerLine = thermalFormatter.formatProductHeader(
        toggleConfig.isProductQuantity,
        toggleConfig.isProductPrice
      );
      receiptLines.push(headerLine);
      receiptLines.push(thermalFormatter.separator());

      // Product items
      sampleData.order.items.forEach((item) => {
        if (toggleConfig.isProductQuantity && toggleConfig.isProductName && toggleConfig.isProductPrice) {
          receiptLines.push(thermalFormatter.formatProductLine(item.quantity, item.name, item.price));
        } else {
          // Custom product line formatting for partial configurations
          let productLine = '';
          if (toggleConfig.isProductQuantity) {
            productLine += item.quantity.toString().padEnd(3);
          }
          if (toggleConfig.isProductName) {
            const nameWidth = 48 - (toggleConfig.isProductQuantity ? 3 : 0) - (toggleConfig.isProductPrice ? 8 : 0);
            productLine += item.name.substring(0, nameWidth).padEnd(nameWidth);
          }
          if (toggleConfig.isProductPrice) {
            productLine += thermalFormatter.formatCurrency(item.price).padStart(8);
          }
          receiptLines.push(productLine);
        }

        // Product options
        if (toggleConfig.isProductAttributes && item.options.length > 0) {
          receiptLines.push(`  ${safeContent.productAttributesLabel} ${item.options.join(', ')}`);
        }
      });
    }

    // Totals Section
    receiptLines.push(thermalFormatter.separator());

    if (toggleConfig.isSubtotal) {
      receiptLines.push(thermalFormatter.leftRightAlign(
        safeContent.subtotalLabel,
        thermalFormatter.formatCurrency(sampleData.order.subtotal)
      ));
    }

    if (toggleConfig.isDeliveryFees) {
      receiptLines.push(thermalFormatter.leftRightAlign(
        safeContent.deliveryFeesLabel,
        thermalFormatter.formatCurrency(sampleData.order.deliveryFee)
      ));
    }

    if (toggleConfig.isTaxValue) {
      receiptLines.push(thermalFormatter.leftRightAlign(
        safeContent.taxValueLabel,
        thermalFormatter.formatCurrency(sampleData.order.tax)
      ));
    }

    if (toggleConfig.isDiscount && sampleData.order.discount > 0) {
      receiptLines.push(thermalFormatter.leftRightAlign(
        safeContent.discountLabel,
        `-${thermalFormatter.formatCurrency(sampleData.order.discount)}`
      ));
    }

    if (toggleConfig.isTotal) {
      receiptLines.push(thermalFormatter.doubleSeparator());
      receiptLines.push(thermalFormatter.leftRightAlign(
        safeContent.totalLabel,
        thermalFormatter.formatCurrency(sampleData.order.total)
      ));
      receiptLines.push(thermalFormatter.doubleSeparator());
    }

    // Footer Section
    if (toggleConfig.isThankYouMessage) {
      receiptLines.push(''); // Empty line
      receiptLines.push(thermalFormatter.centerText(safeContent.thankYouMessage));
    }

    if (toggleConfig.isContactInfo) {
      receiptLines.push(thermalFormatter.centerText(processTemplate(safeContent.contactInfo)));
    }

    if (toggleConfig.isTaxNumber) {
      receiptLines.push(thermalFormatter.centerText(`Tax ID: ${processTemplate(safeContent.taxNumber)}`));
    }

    if (toggleConfig.isBarcode) {
      receiptLines.push(''); // Empty line
      receiptLines.push(thermalFormatter.centerText('|||| ' + processTemplate(safeContent.barcodeContent) + ' ||||'));
    }

    if (toggleConfig.isQRCode) {
      receiptLines.push(''); // Empty line
      receiptLines.push(thermalFormatter.centerText('█████████████████'));
      receiptLines.push(thermalFormatter.centerText('█ QR CODE HERE  █'));
      receiptLines.push(thermalFormatter.centerText('█████████████████'));
    }

    return receiptLines.join('\n');
  };

  // Load template data
  useEffect(() => {
    if (id && typeof id === 'string') {
      loadTemplate(id);
    }
  }, [id]);

  // Fetch available printers on component mount
  useEffect(() => {
    fetchPrinters();
  }, []);

  const loadTemplate = async (templateId: string) => {
    try {
      const template = await getTemplate(templateId);
      setCurrentTemplate(template);
      setTemplateName(template.name);
    } catch (error) {
      console.error('Failed to load template:', error);
      toast.error('Failed to load template');
      router.push('/settings/template-builder');
    }
  };

  const handleSave = async () => {
    if (!currentTemplate) return;

    try {
      // Generate components from toggle configuration
      const generatedComponents = generateTemplateFromToggles();

      const updatedTemplate = {
        ...currentTemplate,
        name: templateName,
        designData: {
          ...currentTemplate.designData,
          components: generatedComponents,
          toggleConfig: toggleConfig
        }
      };

      await updateTemplate(currentTemplate.id, updatedTemplate);
      setCurrentTemplate(updatedTemplate);
      setComponents(generatedComponents);
      toast.success('Template saved successfully');
    } catch (error) {
      console.error('Failed to save template:', error);
      toast.error('Failed to save template');
    }
  };

  const handlePreview = async () => {
    if (!currentTemplate) return;

    try {
      // Open preview window with thermal receipt styling
      const previewWindow = window.open('', '_blank', 'width=450,height=700,scrollbars=yes,resizable=yes');
      if (previewWindow) {
        // Generate thermal receipt content using ThermalFormatter
        const receiptContent = generateThermalReceiptHTML();

        // Generate complete HTML using ThermalFormatter
        const completeHTML = thermalFormatter.generateThermalHTML(receiptContent);

        previewWindow.document.write(completeHTML);
        previewWindow.document.close();
      }
    } catch (error) {
      console.error('Failed to generate preview:', error);
      toast.error('Failed to generate preview');
    }
  };

  const handleTestPrint = async () => {
    if (!currentTemplate) return;

    // Check if a printer is selected
    if (!selectedPrinterId) {
      toast.error('Please select a printer first');
      return;
    }

    try {
      const generatedComponents = generateTemplateFromToggles();
      setComponents(generatedComponents);

      // Generate plain text content for thermal printing
      const thermalTextContent = generateThermalReceiptText();

      console.log('[FRONTEND-DEBUG] Generated thermal text content:', thermalTextContent.substring(0, 200) + '...');
      console.log('[FRONTEND-DEBUG] Selected printer:', selectedPrinterId);

      // Use the enhanced testPrintWithPrinter function that includes printer selection
      await testPrintWithPrinter({
        templateId: currentTemplate.id,
        printerId: selectedPrinterId,
        textContent: thermalTextContent,
        contentType: 'thermal_text'
      });

      const selectedPrinter = availablePrinters.find(p => p.name === selectedPrinterId);
      toast.success(`Test print sent to ${selectedPrinter?.name || 'selected printer'}`);
    } catch (error) {
      console.error('Failed to test print:', error);
      toast.error('Failed to test print');
    }
  };

  const categoriesWithCounts = [
    { id: 'all', name: 'All Sections', count: availableSections.length },
    { id: 'header', name: 'Header', count: availableSections.filter(s => s.category === 'header').length },
    { id: 'order', name: 'Order Info', count: availableSections.filter(s => s.category === 'order').length },
    { id: 'customer', name: 'Customer', count: availableSections.filter(s => s.category === 'customer').length },
    { id: 'products', name: 'Products', count: availableSections.filter(s => s.category === 'products').length },
    { id: 'totals', name: 'Totals', count: availableSections.filter(s => s.category === 'totals').length },
    { id: 'footer', name: 'Footer', count: availableSections.filter(s => s.category === 'footer').length },
    { id: 'options', name: 'Options', count: availableSections.filter(s => s.category === 'options').length }
  ];

  const filteredSections = selectedCategory === 'all'
    ? availableSections
    : availableSections.filter(section => section.category === selectedCategory);

  const getSectionIcon = (category: string) => {
    switch (category) {
      case 'header': return '🏢';
      case 'order': return '📋';
      case 'customer': return '👤';
      case 'products': return '🛒';
      case 'totals': return '💰';
      case 'footer': return '📄';
      case 'options': return '⚙️';
      default: return '📝';
    }
  };

  const isSectionEnabled = (sectionId: keyof TemplateToggleConfig): boolean => {
    const value = toggleConfig[sectionId];
    return typeof value === 'boolean' ? value : false;
  };

  const isSectionDisabled = (section: TemplateSection): boolean => {
    if (!section.dependsOn) return false;
    return section.dependsOn.some(dep => !isSectionEnabled(dep as keyof TemplateToggleConfig));
  };

  const toggleSectionExpansion = (sectionId: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionId]: !prev[sectionId]
    }));
  };

  const renderEditableInput = (
    label: string,
    field: keyof TemplateEditableContent,
    type: 'text' | 'textarea' = 'text',
    placeholder?: string
  ) => {
    const value = toggleConfig.content[field] as string;
    const Component = type === 'textarea' ? 'textarea' : 'input';

    return (
      <div className="mb-3">
        <label className="block text-xs font-medium text-gray-700 mb-1">
          {label}
        </label>
        <Component
          type={type === 'text' ? 'text' : undefined}
          value={value || ''}
          onChange={(e) => updateEditableContent({ [field]: e.target.value })}
          placeholder={placeholder}
          className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
          rows={type === 'textarea' ? 3 : undefined}
        />
      </div>
    );
  };

  const getEditableFieldsForSection = (sectionId: keyof TemplateToggleConfig) => {
    switch (sectionId) {
      case 'isCompanyName':
        return [renderEditableInput('Company Name', 'companyName', 'text', 'e.g., {{company.name}}')];
      case 'isCompanyPhone':
        return [renderEditableInput('Company Phone', 'companyPhone', 'text', 'e.g., {{company.phone}}')];
      case 'isBranchName':
        return [renderEditableInput('Branch Name', 'branchName', 'text', 'e.g., {{branch.name}}')];
      case 'isBranchAddress':
        return [renderEditableInput('Branch Address', 'branchAddress', 'text', 'e.g., {{branch.address}}')];
      case 'isLogo':
        return [renderEditableInput('Logo Text', 'logoText', 'text', 'e.g., LOGO')];
      case 'isOrderNumber':
        return [
          renderEditableInput('Order Number Label', 'orderNumberLabel', 'text', 'e.g., Order #'),
          renderEditableInput('Order Number Format', 'orderNumberFormat', 'text', 'e.g., {{order.id}}')
        ];
      case 'isOrderDate':
        return [
          renderEditableInput('Date Label', 'orderDateLabel', 'text', 'e.g., Date:'),
          renderEditableInput('Date Format', 'dateFormat', 'text', 'e.g., {{order.createdAt | date}}')
        ];
      case 'isOrderTime':
        return [
          renderEditableInput('Time Label', 'orderTimeLabel', 'text', 'e.g., Time:'),
          renderEditableInput('Time Format', 'timeFormat', 'text', 'e.g., {{order.createdAt | time}}')
        ];
      case 'isOrderType':
        return [renderEditableInput('Order Type Label', 'orderTypeLabel', 'text', 'e.g., Type:')];
      case 'isOrderSource':
        return [renderEditableInput('Order Source Label', 'orderSourceLabel', 'text', 'e.g., Source:')];
      case 'isCustomerName':
        return [renderEditableInput('Customer Name Label', 'customerNameLabel', 'text', 'e.g., Customer:')];
      case 'isCustomerPhone':
        return [renderEditableInput('Customer Phone Label', 'customerPhoneLabel', 'text', 'e.g., Phone:')];
      case 'isCustomerAddress':
        return [renderEditableInput('Customer Address Label', 'customerAddressLabel', 'text', 'e.g., Address:')];
      case 'isProductInfo':
        return [renderEditableInput('Products Header Text', 'productsHeaderText', 'text', 'e.g., ITEMS')];
      case 'isProductName':
        return [renderEditableInput('Product Name Header', 'productNameHeader', 'text', 'e.g., Item')];
      case 'isProductQuantity':
        return [renderEditableInput('Product Quantity Header', 'productQuantityHeader', 'text', 'e.g., Qty')];
      case 'isProductPrice':
        return [renderEditableInput('Product Price Header', 'productPriceHeader', 'text', 'e.g., Price')];
      case 'isProductAttributes':
        return [renderEditableInput('Product Attributes Label', 'productAttributesLabel', 'text', 'e.g., Options:')];
      case 'isSubtotal':
        return [renderEditableInput('Subtotal Label', 'subtotalLabel', 'text', 'e.g., Subtotal:')];
      case 'isDeliveryFees':
        return [renderEditableInput('Delivery Fees Label', 'deliveryFeesLabel', 'text', 'e.g., Delivery:')];
      case 'isTaxValue':
        return [renderEditableInput('Tax Value Label', 'taxValueLabel', 'text', 'e.g., Tax:')];
      case 'isDiscount':
        return [renderEditableInput('Discount Label', 'discountLabel', 'text', 'e.g., Discount:')];
      case 'isTotal':
        return [renderEditableInput('Total Label', 'totalLabel', 'text', 'e.g., TOTAL:')];
      case 'isThankYouMessage':
        return [renderEditableInput('Thank You Message', 'thankYouMessage', 'textarea', 'e.g., Thank you for your order!')];
      case 'isTaxNumber':
        return [renderEditableInput('Tax Number', 'taxNumber', 'text', 'e.g., {{company.taxNumber}}')];
      case 'isContactInfo':
        return [renderEditableInput('Contact Information', 'contactInfo', 'text', 'e.g., {{company.phone}} | {{company.email}}')];
      case 'isBarcode':
        return [renderEditableInput('Barcode Content', 'barcodeContent', 'text', 'e.g., {{order.id}}')];
      case 'isQRCode':
        return [renderEditableInput('QR Code Content', 'qrCodeContent', 'text', 'e.g., {{order.trackingUrl}}')];
      default:
        return [];
    }
  };

  return (
    <ProtectedRoute>
      <Head>
        <title>Edit Template - {templateName || 'Loading...'}</title>
        <meta name="description" content="Edit thermal printer template using toggle interface" />
      </Head>

      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              {/* Navigation */}
              <div className="flex items-center space-x-4">
                <Link href="/settings/template-builder" className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors">
                  <ArrowLeftIcon className="w-4 h-4 mr-2" />
                  Back to Templates
                </Link>
                <div className="h-6 w-px bg-gray-300"></div>
                <div className="flex items-center space-x-2">
                  <CogIcon className="w-5 h-5 text-gray-600" />
                  <div>
                    <h1 className="text-lg font-semibold text-gray-900">Toggle Template Builder</h1>
                    <p className="text-sm text-gray-500">Configure template sections with on/off toggles</p>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center space-x-3">
                <button
                  onClick={handlePreview}
                  disabled={!currentTemplate}
                  className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 transition-colors"
                >
                  <EyeIcon className="w-4 h-4 mr-2" />
                  Preview
                </button>

                {/* Printer Selection */}
                <PrinterDropdown
                  value={selectedPrinterId}
                  onChange={setSelectedPrinterId}
                  placeholder="Select printer..."
                  className="w-48"
                  showStatus={true}
                  onlyOnline={true}
                />

                <button
                  onClick={handleTestPrint}
                  disabled={!currentTemplate || !selectedPrinterId}
                  className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 transition-colors"
                >
                  <PrinterIcon className="w-4 h-4 mr-2" />
                  Test Print
                </button>

                <button
                  onClick={handleSave}
                  disabled={!hasUnsavedChanges || isSaving}
                  className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 transition-colors"
                >
                  {isSaving ? 'Saving...' : 'Save Template'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">

            {/* Left Panel - Template Configuration */}
            <div className="lg:col-span-3">
              {/* Template Name */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
                <h2 className="text-lg font-medium text-gray-900 mb-4">Template Settings</h2>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Template Name
                  </label>
                  <input
                    type="text"
                    value={templateName}
                    onChange={(e) => setTemplateName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter template name"
                  />
                </div>
              </div>

              {/* Category Filter */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
                <h2 className="text-lg font-medium text-gray-900 mb-4">Section Categories</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {categoriesWithCounts.map((category) => (
                    <button
                      key={category.id}
                      onClick={() => setSelectedCategory(category.id)}
                      className={`p-3 text-sm font-medium rounded-md border transition-colors ${
                        selectedCategory === category.id
                          ? 'bg-blue-50 border-blue-200 text-blue-700'
                          : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      <div className="text-center">
                        <div className="text-lg mb-1">{getSectionIcon(category.id)}</div>
                        <div className="font-medium">{category.name}</div>
                        <div className="text-xs text-gray-500">({category.count})</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Toggle Sections */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-medium text-gray-900">Template Sections</h2>
                  <div className="flex items-center space-x-3">
                    <button
                      onClick={() => {
                        const allExpanded = availableSections.reduce((acc, section) => {
                          acc[section.id] = true;
                          return acc;
                        }, {} as {[key: string]: boolean});
                        setExpandedSections(allExpanded);
                      }}
                      className="text-sm text-blue-600 hover:text-blue-900 underline"
                    >
                      Expand All
                    </button>
                    <button
                      onClick={() => setExpandedSections({})}
                      className="text-sm text-blue-600 hover:text-blue-900 underline"
                    >
                      Collapse All
                    </button>
                    <button
                      onClick={resetToggleConfig}
                      className="text-sm text-gray-600 hover:text-gray-900 underline"
                    >
                      Reset to Default
                    </button>
                  </div>
                </div>

                <div className="space-y-4">
                  {filteredSections.map((section) => {
                    const isEnabled = isSectionEnabled(section.id);
                    const isDisabled = isSectionDisabled(section);
                    const isExpanded = expandedSections[section.id];
                    const editableFields = getEditableFieldsForSection(section.id);

                    return (
                      <div key={section.id} className={`border rounded-lg ${
                        isDisabled ? 'bg-gray-50 border-gray-200' : 'bg-white border-gray-200'
                      }`}>
                        <div className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex items-center space-x-3">
                                <button
                                  onClick={() => !isDisabled && toggleSection(section.id)}
                                  disabled={isDisabled}
                                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                                    isDisabled
                                      ? 'bg-gray-200 cursor-not-allowed'
                                      : isEnabled
                                      ? 'bg-blue-600'
                                      : 'bg-gray-200'
                                  }`}
                                >
                                  <span
                                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                      isEnabled ? 'translate-x-6' : 'translate-x-1'
                                    }`}
                                  />
                                </button>

                                <div className="flex-1">
                                  <h3 className={`text-sm font-medium ${
                                    isDisabled ? 'text-gray-400' : 'text-gray-900'
                                  }`}>
                                    {section.name}
                                    {section.isRequired && (
                                      <span className="ml-1 text-red-500">*</span>
                                    )}
                                  </h3>
                                  <p className={`text-xs ${
                                    isDisabled ? 'text-gray-400' : 'text-gray-500'
                                  }`}>
                                    {section.description}
                                  </p>
                                  {section.dependsOn && (
                                    <p className="text-xs text-orange-600 mt-1">
                                      Requires: {section.dependsOn.join(', ')}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </div>

                            <div className="ml-4 flex items-center space-x-2">
                              {isEnabled && editableFields.length > 0 && (
                                <button
                                  onClick={() => toggleSectionExpansion(section.id)}
                                  className="p-1 text-gray-400 hover:text-gray-600 rounded transition-colors"
                                  title="Edit content"
                                >
                                  <PencilIcon className="w-4 h-4" />
                                </button>
                              )}
                              {isEnabled ? (
                                <CheckCircleIcon className="w-5 h-5 text-green-500" />
                              ) : (
                                <XCircleIcon className="w-5 h-5 text-gray-300" />
                              )}
                            </div>
                          </div>

                          {/* Editable Content Fields */}
                          {isEnabled && isExpanded && editableFields.length > 0 && (
                            <div className="mt-4 pt-4 border-t border-gray-200 bg-gray-50 -mx-4 -mb-4 p-4 rounded-b-lg">
                              <h4 className="text-sm font-medium text-gray-900 mb-3">Customize Content</h4>
                              <div className="space-y-2">
                                {editableFields.map((field, index) => (
                                  <div key={index}>{field}</div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Right Panel - Live Preview */}
            <div className="lg:col-span-2 space-y-6">
              {/* Live Preview */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900">Live Preview</h3>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setPreviewMode(!previewMode)}
                      className={`px-3 py-1 text-sm rounded-md transition-colors ${
                        previewMode
                          ? 'bg-blue-100 text-blue-700 border border-blue-200'
                          : 'bg-gray-100 text-gray-700 border border-gray-200'
                      }`}
                    >
                      {previewMode ? 'Live' : 'Static'}
                    </button>
                  </div>
                </div>

                {/* Thermal Receipt Preview */}
                <div className="flex justify-center">
                  <ThermalReceiptPreview
                    toggleConfig={toggleConfig}
                    className="shadow-lg"
                  />
                </div>

                <div className="mt-4 text-center">
                  <p className="text-xs text-gray-500">
                    Preview updates automatically as you edit
                  </p>
                </div>
              </div>

              {/* Template Info */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Template Info</h3>
                <div className="space-y-3">
                  <div>
                    <span className="text-sm font-medium text-gray-500">Template Type:</span>
                    <p className="text-sm text-gray-900">Toggle-based Receipt</p>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-500">Enabled Sections:</span>
                    <p className="text-sm text-gray-900">
                      {Object.entries(toggleConfig).filter(([key, value]) => key !== 'content' && value === true).length} of {availableSections.length}
                    </p>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-500">Paper Size:</span>
                    <p className="text-sm text-gray-900">80mm (Thermal)</p>
                  </div>
                  {hasUnsavedChanges && (
                    <div className="flex items-center space-x-2 text-orange-600">
                      <InformationCircleIcon className="w-4 h-4" />
                      <span className="text-sm">Unsaved changes</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Quick Actions */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h3>
                <div className="space-y-3">
                  <button
                    onClick={() => {
                      const allSections = availableSections
                        .filter(s => !s.dependsOn)
                        .reduce((acc, section) => {
                          if (section.id !== 'content') {
                            acc[section.id] = true;
                          }
                          return acc;
                        }, {} as Partial<TemplateToggleConfig>);
                      updateToggleConfig(allSections);
                    }}
                    className="w-full px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
                  >
                    Enable All Main Sections
                  </button>

                  <button
                    onClick={() => {
                      const minimalConfig = {
                        isCompanyName: true,
                        isOrderNumber: true,
                        isOrderDate: true,
                        isProductInfo: true,
                        isProductName: true,
                        isProductQuantity: true,
                        isProductPrice: true,
                        isTotal: true
                      };
                      updateToggleConfig(minimalConfig);
                    }}
                    className="w-full px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
                  >
                    Minimal Receipt
                  </button>

                  <button
                    onClick={() => {
                      const fullConfig = availableSections.reduce((acc, section) => {
                        if (section.id !== 'content') {
                          acc[section.id] = true;
                        }
                        return acc;
                      }, {} as Partial<TemplateToggleConfig>);
                      updateToggleConfig(fullConfig);
                    }}
                    className="w-full px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
                  >
                    Enable Everything
                  </button>
                </div>
              </div>

              {/* Help */}
              <div className="bg-blue-50 rounded-lg border border-blue-200 p-6">
                <h3 className="text-lg font-medium text-blue-900 mb-2">💡 How it works</h3>
                <div className="text-sm text-blue-800 space-y-2">
                  <p>• Toggle sections on/off to customize your receipt template</p>
                  <p>• Some sections depend on others (e.g., product details require product info)</p>
                  <p>• Required sections cannot be disabled</p>
                  <p>• Preview shows how your receipt will look</p>
                  <p>• Save to apply changes to your template</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}