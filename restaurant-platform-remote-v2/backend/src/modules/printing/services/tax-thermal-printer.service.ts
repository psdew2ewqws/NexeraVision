import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { ESCPOSService } from './escpos.service';
import { TaxesService } from '../../taxes/taxes.service';
import { PrismaService } from '../../database/prisma.service';
import { TaxDisplayMode, TaxRoundingMode } from '@prisma/client';

interface TaxReceiptItem {
  productId: string;
  productName: any; // JSON with en/ar
  quantity: number;
  unitPrice: number;
  unitPriceExcludingTax: number;
  unitPriceIncludingTax: number;
  unitTaxAmount: number;
  totalPrice: number;
  totalPriceExcludingTax: number;
  totalPriceIncludingTax: number;
  totalTaxAmount: number;
  taxDetails: Array<{
    taxId: string;
    taxName: any;
    taxType: string;
    appliedValue: number;
    calculationMethod: string;
  }>;
  modifiers?: Array<{
    modifierId: string;
    name: any;
    price: number;
  }>;
}

interface TaxReceiptSummary {
  subtotal: number;
  totalTax: number;
  total: number;
  taxBreakdown: Array<{
    taxId: string;
    taxName: any;
    taxType: string;
    rate: number;
    amount: number;
  }>;
  taxableItems: TaxReceiptItem[];
}

interface CompanyInfo {
  name: string;
  logo?: any;
  taxRegistrationNumber?: string;
  vatNumber?: string;
  address?: string;
  phone?: string;
  email?: string;
}

interface ThermalReceiptOptions {
  includeHeader: boolean;
  includeFooter: boolean;
  showTaxBreakdown: boolean;
  showTaxInclusiveText: boolean;
  language: 'en' | 'ar' | 'both';
  paperWidth: 58 | 80; // mm
  jordanVATCompliance: boolean;
}

@Injectable()
export class TaxThermalPrinterService {
  private readonly logger = new Logger(TaxThermalPrinterService.name);

  constructor(
    private readonly escposService: ESCPOSService,
    @Inject(forwardRef(() => TaxesService))
    private readonly taxesService: TaxesService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Generate complete tax-compliant thermal receipt
   */
  async generateTaxReceipt(
    orderItems: Array<{
      productId: string;
      quantity: number;
      unitPrice: number;
      modifiers?: Array<{
        modifierId: string;
        price: number;
      }>;
    }>,
    companyId: string,
    options: Partial<ThermalReceiptOptions> = {},
    orderInfo?: {
      orderNumber?: string;
      customerName?: string;
      customerPhone?: string;
      orderType?: string;
      paymentMethod?: string;
    }
  ) {
    const defaultOptions: ThermalReceiptOptions = {
      includeHeader: true,
      includeFooter: true,
      showTaxBreakdown: true,
      showTaxInclusiveText: true,
      language: 'both',
      paperWidth: 80,
      jordanVATCompliance: true,
      ...options,
    };

    // Get receipt data with tax calculations
    const receiptData = await this.taxesService.generateReceiptTaxSummary(
      orderItems,
      companyId
    );

    // Get company information
    const companyInfo = await this.getCompanyInfo(companyId);

    // Build thermal printer content
    const content = this.buildThermalReceiptContent(
      receiptData.summary,
      companyInfo,
      receiptData.settings,
      defaultOptions,
      orderInfo
    );

    return content;
  }

  /**
   * Generate Jordan VAT compliant receipt
   */
  async generateJordanVATReceipt(
    orderItems: Array<{
      productId: string;
      quantity: number;
      unitPrice: number;
      modifiers?: Array<{
        modifierId: string;
        price: number;
      }>;
    }>,
    companyId: string,
    orderInfo?: {
      orderNumber?: string;
      customerName?: string;
      customerPhone?: string;
      orderType?: string;
      paymentMethod?: string;
    }
  ) {
    return this.generateTaxReceipt(
      orderItems,
      companyId,
      {
        jordanVATCompliance: true,
        showTaxBreakdown: true,
        showTaxInclusiveText: true,
        language: 'both',
      },
      orderInfo
    );
  }

  /**
   * Build thermal receipt content with proper ESC/POS formatting
   */
  private buildThermalReceiptContent(
    summary: TaxReceiptSummary,
    companyInfo: CompanyInfo,
    taxSettings: any,
    options: ThermalReceiptOptions,
    orderInfo?: any
  ) {
    const content = [];

    // Initialize printer
    content.push({
      type: 'text',
      value: '',
      align: 'left'
    });

    // Header
    if (options.includeHeader) {
      this.addReceiptHeader(content, companyInfo, options);
    }

    // Order information
    if (orderInfo) {
      this.addOrderInfo(content, orderInfo, options);
    }

    // Separator
    content.push({
      type: 'text',
      value: this.getSeparatorLine(options.paperWidth),
      align: 'center'
    });

    // Items
    this.addReceiptItems(content, summary.taxableItems, options);

    // Separator
    content.push({
      type: 'text',
      value: this.getSeparatorLine(options.paperWidth),
      align: 'center'
    });

    // Tax calculations
    this.addTaxCalculations(content, summary, taxSettings, options);

    // Jordan VAT compliance information
    if (options.jordanVATCompliance) {
      this.addJordanVATCompliance(content, taxSettings, options);
    }

    // Footer
    if (options.includeFooter) {
      this.addReceiptFooter(content, companyInfo, options);
    }

    // Cut paper
    content.push({
      type: 'cut'
    });

    return {
      type: 'receipt' as const,
      content
    };
  }

  private addReceiptHeader(content: any[], companyInfo: CompanyInfo, options: ThermalReceiptOptions) {
    // Company name
    content.push({
      type: 'text',
      value: companyInfo.name,
      align: 'center',
      size: 'double',
      bold: true
    });

    content.push({
      type: 'text',
      value: '\n',
      align: 'center'
    });

    // Date and time
    const now = new Date();
    const dateTime = now.toLocaleString('en-GB', {
      timeZone: 'Asia/Amman'
    });

    content.push({
      type: 'text',
      value: `Date: ${dateTime}`,
      align: 'left'
    });

    // VAT/Tax registration numbers (Jordan compliance)
    if (companyInfo.vatNumber || companyInfo.taxRegistrationNumber) {
      if (companyInfo.vatNumber) {
        const vatLabel = options.language === 'ar' ? 'الرقم الضريبي' :
                        options.language === 'both' ? 'VAT Number / الرقم الضريبي' : 'VAT Number';
        content.push({
          type: 'text',
          value: `${vatLabel}: ${companyInfo.vatNumber}`,
          align: 'left'
        });
      }

      if (companyInfo.taxRegistrationNumber) {
        const taxLabel = options.language === 'ar' ? 'رقم التسجيل الضريبي' :
                        options.language === 'both' ? 'Tax Reg. No. / رقم التسجيل الضريبي' : 'Tax Reg. No.';
        content.push({
          type: 'text',
          value: `${taxLabel}: ${companyInfo.taxRegistrationNumber}`,
          align: 'left'
        });
      }
    }

    // Contact information
    if (companyInfo.phone) {
      content.push({
        type: 'text',
        value: `Tel: ${companyInfo.phone}`,
        align: 'left'
      });
    }

    content.push({
      type: 'text',
      value: '\n',
      align: 'center'
    });
  }

  private addOrderInfo(content: any[], orderInfo: any, options: ThermalReceiptOptions) {
    if (orderInfo.orderNumber) {
      const orderLabel = options.language === 'ar' ? 'رقم الطلب' :
                        options.language === 'both' ? 'Order No. / رقم الطلب' : 'Order No.';
      content.push({
        type: 'text',
        value: `${orderLabel}: ${orderInfo.orderNumber}`,
        align: 'left',
        bold: true
      });
    }

    if (orderInfo.customerName) {
      const customerLabel = options.language === 'ar' ? 'العميل' :
                           options.language === 'both' ? 'Customer / العميل' : 'Customer';
      content.push({
        type: 'text',
        value: `${customerLabel}: ${orderInfo.customerName}`,
        align: 'left'
      });
    }

    if (orderInfo.orderType) {
      const typeLabel = options.language === 'ar' ? 'نوع الطلب' :
                       options.language === 'both' ? 'Type / نوع الطلب' : 'Type';
      content.push({
        type: 'text',
        value: `${typeLabel}: ${orderInfo.orderType}`,
        align: 'left'
      });
    }

    content.push({
      type: 'text',
      value: '\n',
      align: 'center'
    });
  }

  private addReceiptItems(content: any[], items: TaxReceiptItem[], options: ThermalReceiptOptions) {
    // Items header
    const itemsHeader = options.language === 'ar' ? 'الأصناف' :
                       options.language === 'both' ? 'ITEMS / الأصناف' : 'ITEMS';
    content.push({
      type: 'text',
      value: itemsHeader,
      align: 'left',
      bold: true,
      underline: true
    });

    content.push({
      type: 'text',
      value: '\n',
      align: 'center'
    });

    // Item details
    for (const item of items) {
      // Product name
      const productName = this.getLocalizedText(item.productName, options.language);
      content.push({
        type: 'text',
        value: productName,
        align: 'left',
        bold: true
      });

      // Quantity and price line
      const qtyLabel = options.language === 'ar' ? 'الكمية' :
                      options.language === 'both' ? 'Qty / الكمية' : 'Qty';
      const priceLabel = options.language === 'ar' ? 'السعر' :
                        options.language === 'both' ? 'Price / السعر' : 'Price';

      content.push({
        type: 'text',
        value: `${qtyLabel}: ${item.quantity} x ${item.unitPriceIncludingTax.toFixed(2)} = ${item.totalPriceIncludingTax.toFixed(2)} JOD`,
        align: 'left'
      });

      // Tax information for item (if detailed breakdown is enabled)
      if (options.showTaxBreakdown && item.totalTaxAmount > 0) {
        const taxLabel = options.language === 'ar' ? 'الضريبة' :
                        options.language === 'both' ? 'Tax / الضريبة' : 'Tax';
        content.push({
          type: 'text',
          value: `  ${taxLabel}: ${item.totalTaxAmount.toFixed(2)} JOD`,
          align: 'left'
        });
      }

      // Modifiers
      if (item.modifiers?.length) {
        for (const modifier of item.modifiers) {
          const modifierName = this.getLocalizedText(modifier.name, options.language);
          content.push({
            type: 'text',
            value: `  + ${modifierName}: ${modifier.price.toFixed(2)} JOD`,
            align: 'left'
          });
        }
      }

      content.push({
        type: 'text',
        value: '\n',
        align: 'center'
      });
    }
  }

  private addTaxCalculations(content: any[], summary: TaxReceiptSummary, taxSettings: any, options: ThermalReceiptOptions) {
    // Subtotal (excluding tax)
    const subtotalLabel = options.language === 'ar' ? 'المجموع الفرعي' :
                         options.language === 'both' ? 'Subtotal / المجموع الفرعي' : 'Subtotal';
    content.push({
      type: 'text',
      value: this.formatReceiptLine(subtotalLabel, `${summary.subtotal.toFixed(2)} JOD`, options.paperWidth),
      align: 'left'
    });

    // Tax breakdown
    if (options.showTaxBreakdown && summary.taxBreakdown.length > 0) {
      for (const tax of summary.taxBreakdown) {
        const taxName = this.getLocalizedText(tax.taxName, options.language);
        const taxDisplay = tax.taxType === 'percentage' ? `${tax.rate}%` : `${tax.rate} JOD`;

        content.push({
          type: 'text',
          value: this.formatReceiptLine(
            `${taxName} (${taxDisplay})`,
            `${tax.amount.toFixed(2)} JOD`,
            options.paperWidth
          ),
          align: 'left'
        });
      }
    } else if (summary.totalTax > 0) {
      // Simple tax total
      const taxLabel = options.language === 'ar' ? 'إجمالي الضريبة' :
                      options.language === 'both' ? 'Total Tax / إجمالي الضريبة' : 'Total Tax';
      content.push({
        type: 'text',
        value: this.formatReceiptLine(taxLabel, `${summary.totalTax.toFixed(2)} JOD`, options.paperWidth),
        align: 'left'
      });
    }

    // Separator for total
    content.push({
      type: 'text',
      value: this.getSeparatorLine(options.paperWidth, '-'),
      align: 'center'
    });

    // Total (including tax)
    const totalLabel = options.language === 'ar' ? 'المجموع الكلي' :
                      options.language === 'both' ? 'TOTAL / المجموع الكلي' : 'TOTAL';
    content.push({
      type: 'text',
      value: this.formatReceiptLine(totalLabel, `${summary.total.toFixed(2)} JOD`, options.paperWidth),
      align: 'left',
      bold: true,
      size: 'wide'
    });

    // Tax inclusive note
    if (options.showTaxInclusiveText && summary.totalTax > 0) {
      const inclusiveText = options.language === 'ar' ? 'شامل الضريبة' :
                           options.language === 'both' ? 'Tax Inclusive / شامل الضريبة' : 'Tax Inclusive';
      content.push({
        type: 'text',
        value: inclusiveText,
        align: 'center'
      });
    }

    content.push({
      type: 'text',
      value: '\n',
      align: 'center'
    });
  }

  private addJordanVATCompliance(content: any[], taxSettings: any, options: ThermalReceiptOptions) {
    // Jordan VAT compliance footer
    const complianceText = options.language === 'ar' ?
      'هذه الفاتورة خاضعة لأحكام قانون ضريبة القيمة المضافة الأردني' :
      options.language === 'both' ?
      'Subject to Jordan VAT Law\nخاضعة لأحكام قانون ضريبة القيمة المضافة الأردني' :
      'Subject to Jordan VAT Law';

    content.push({
      type: 'text',
      value: complianceText,
      align: 'center',
      size: 'normal'
    });

    content.push({
      type: 'text',
      value: '\n',
      align: 'center'
    });
  }

  private addReceiptFooter(content: any[], companyInfo: CompanyInfo, options: ThermalReceiptOptions) {
    // Thank you message
    const thankYouText = options.language === 'ar' ? 'شكراً لكم' :
                        options.language === 'both' ? 'Thank You / شكراً لكم' : 'Thank You';
    content.push({
      type: 'text',
      value: thankYouText,
      align: 'center',
      bold: true
    });

    // QR Code for digital receipt (optional)
    // content.push({
    //   type: 'qr',
    //   value: `Receipt data or URL`,
    //   align: 'center'
    // });

    content.push({
      type: 'text',
      value: '\n\n',
      align: 'center'
    });
  }

  private async getCompanyInfo(companyId: string): Promise<CompanyInfo> {
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
      include: {
        companyTaxSetting: true
      }
    });

    return {
      name: company?.name || 'Restaurant',
      vatNumber: company?.companyTaxSetting?.vatNumber,
      taxRegistrationNumber: company?.companyTaxSetting?.taxRegistrationNumber,
      // Add other company fields as needed
    };
  }

  private getLocalizedText(text: any, language: 'en' | 'ar' | 'both'): string {
    if (typeof text === 'string') return text;
    if (!text || typeof text !== 'object') return '';

    switch (language) {
      case 'ar':
        return text.ar || text.en || '';
      case 'en':
        return text.en || text.ar || '';
      case 'both':
        if (text.en && text.ar) {
          return `${text.en} / ${text.ar}`;
        }
        return text.en || text.ar || '';
      default:
        return text.en || text.ar || '';
    }
  }

  private formatReceiptLine(label: string, value: string, paperWidth: number): string {
    const maxLength = paperWidth === 58 ? 32 : 48; // Approximate characters per line
    const totalLength = label.length + value.length;

    if (totalLength <= maxLength) {
      const spacesNeeded = maxLength - totalLength;
      return label + ' '.repeat(spacesNeeded) + value;
    } else {
      // If too long, put on separate lines
      return label + '\n' + ' '.repeat(Math.max(0, maxLength - value.length)) + value;
    }
  }

  private getSeparatorLine(paperWidth: number, char: string = '='): string {
    const length = paperWidth === 58 ? 32 : 48;
    return char.repeat(length);
  }

  /**
   * Print tax receipt to thermal printer
   */
  async printTaxReceipt(
    printerId: string,
    orderItems: Array<{
      productId: string;
      quantity: number;
      unitPrice: number;
      modifiers?: Array<{
        modifierId: string;
        price: number;
      }>;
    }>,
    companyId: string,
    options?: Partial<ThermalReceiptOptions>,
    orderInfo?: any
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Get printer information
      const printer = await this.prisma.printer.findUnique({
        where: { id: printerId }
      });

      if (!printer) {
        throw new Error('Printer not found');
      }

      // Generate receipt content
      const receiptContent = await this.generateTaxReceipt(
        orderItems,
        companyId,
        options,
        orderInfo
      );

      // Print using ESCPOS service
      const result = await this.escposService.printContent(
        {
          id: printer.id,
          name: printer.name,
          ip: printer.ip,
          port: printer.port,
          connection: printer.connection.toString(),
          type: printer.type.toString(),
          capabilities: printer.capabilities
        },
        receiptContent
      );

      this.logger.log(`Tax receipt printed successfully to ${printer.name}`);
      return result;

    } catch (error) {
      this.logger.error('Failed to print tax receipt:', error);
      return {
        success: false,
        error: error.message || 'Failed to print tax receipt'
      };
    }
  }
}