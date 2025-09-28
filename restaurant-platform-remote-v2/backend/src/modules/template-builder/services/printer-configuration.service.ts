/**
 * Printer Configuration Service for Jordan Market
 * Manages printer settings, paper specifications, and country-specific configurations
 */

import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { ThermalPrinter } from './thermal-printer-detection.service';

export interface PrinterConfiguration {
  id: string;
  companyId: string;
  branchId?: string;
  printerInfo: ThermalPrinter;
  paperSettings: {
    width: 58 | 80; // mm
    charactersPerLine: 32 | 48;
    lineHeight: number; // pixels
    marginTop: number; // mm
    marginBottom: number; // mm
    marginLeft: number; // mm
    marginRight: number; // mm
  };
  printSettings: {
    printSpeed: number; // mm/s
    printDensity: 'light' | 'medium' | 'dark';
    cutType: 'none' | 'partial' | 'full';
    buzzer: boolean;
    cashdrawer: boolean;
  };
  jordanSettings: {
    currency: 'JOD' | 'USD';
    taxRate: number; // Jordan VAT rate
    taxInclusive: boolean;
    showTaxNumber: boolean;
    arabicSupport: boolean;
    receiptNumberFormat: string;
    timeFormat: '24h' | '12h';
    dateFormat: 'DD/MM/YYYY' | 'MM/DD/YYYY' | 'YYYY-MM-DD';
  };
  templates: {
    header: PrinterTemplateSection;
    items: PrinterTemplateSection;
    footer: PrinterTemplateSection;
    logo: PrinterLogoSettings;
  };
  isDefault: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface PrinterTemplateSection {
  enabled: boolean;
  template: string;
  variables: Record<string, any>;
  formatting: {
    alignment: 'left' | 'center' | 'right';
    fontSize: 'small' | 'normal' | 'large';
    bold: boolean;
    underline: boolean;
  };
}

export interface PrinterLogoSettings {
  enabled: boolean;
  position: 'top' | 'header' | 'footer';
  alignment: 'left' | 'center' | 'right';
  maxWidth: number; // pixels
  maxHeight: number; // pixels
}

export interface JordanReceiptStandards {
  requiredFields: string[];
  optionalFields: string[];
  taxCalculation: {
    rate: number;
    displayName: string;
    displayNameAr: string;
  };
  receiptFormat: {
    headerRequired: boolean;
    footerRequired: boolean;
    logoRecommended: boolean;
    contactInfoRequired: boolean;
  };
}

@Injectable()
export class PrinterConfigurationService {
  private readonly logger = new Logger(PrinterConfigurationService.name);

  // Jordan VAT and receipt standards
  private readonly jordanStandards: JordanReceiptStandards = {
    requiredFields: [
      'business_name',
      'tax_number',
      'receipt_number',
      'date_time',
      'items_detail',
      'subtotal',
      'tax_amount',
      'total_amount'
    ],
    optionalFields: [
      'customer_info',
      'delivery_address',
      'payment_method',
      'discount',
      'service_charge'
    ],
    taxCalculation: {
      rate: 0.16, // 16% VAT in Jordan
      displayName: 'VAT',
      displayNameAr: 'ضريبة القيمة المضافة'
    },
    receiptFormat: {
      headerRequired: true,
      footerRequired: true,
      logoRecommended: true,
      contactInfoRequired: true
    }
  };

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create or update printer configuration
   */
  async savePrinterConfiguration(
    config: Omit<PrinterConfiguration, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<PrinterConfiguration> {
    this.logger.log(`Saving printer configuration for company ${config.companyId}`);

    try {
      // Validate configuration against Jordan standards
      this.validateJordanCompliance(config);

      const savedConfig = await this.prisma.printerConfiguration.upsert({
        where: {
          companyId_printerInfoId: {
            companyId: config.companyId,
            printerInfoId: config.printerInfo.id
          }
        },
        update: {
          branchId: config.branchId,
          printerInfo: JSON.stringify(config.printerInfo),
          paperSettings: JSON.stringify(config.paperSettings),
          printSettings: JSON.stringify(config.printSettings),
          jordanSettings: JSON.stringify(config.jordanSettings),
          templates: JSON.stringify(config.templates),
          isDefault: config.isDefault,
          isActive: config.isActive,
          updatedAt: new Date()
        },
        create: {
          companyId: config.companyId,
          branchId: config.branchId,
          printerInfoId: config.printerInfo.id,
          printerInfo: JSON.stringify(config.printerInfo),
          paperSettings: JSON.stringify(config.paperSettings),
          printSettings: JSON.stringify(config.printSettings),
          jordanSettings: JSON.stringify(config.jordanSettings),
          templates: JSON.stringify(config.templates),
          isDefault: config.isDefault,
          isActive: config.isActive,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });

      return this.mapToConfiguration(savedConfig);

    } catch (error) {
      this.logger.error('Error saving printer configuration:', error);
      throw error;
    }
  }

  /**
   * Get printer configuration by company and printer
   */
  async getPrinterConfiguration(
    companyId: string,
    printerId: string
  ): Promise<PrinterConfiguration | null> {
    const config = await this.prisma.printerConfiguration.findUnique({
      where: {
        companyId_printerInfoId: {
          companyId,
          printerInfoId: printerId
        }
      }
    });

    return config ? this.mapToConfiguration(config) : null;
  }

  /**
   * Get all printer configurations for company
   */
  async getCompanyPrinterConfigurations(companyId: string): Promise<PrinterConfiguration[]> {
    const configs = await this.prisma.printerConfiguration.findMany({
      where: { companyId },
      orderBy: { createdAt: 'desc' }
    });

    return configs.map(config => this.mapToConfiguration(config));
  }

  /**
   * Create default configuration for Jordan market
   */
  createDefaultJordanConfiguration(
    companyId: string,
    printer: ThermalPrinter,
    branchId?: string
  ): Omit<PrinterConfiguration, 'id' | 'createdAt' | 'updatedAt'> {
    const paperSettings = {
      width: printer.paperWidth,
      charactersPerLine: printer.charactersPerLine,
      lineHeight: 24,
      marginTop: 5,
      marginBottom: 10,
      marginLeft: 2,
      marginRight: 2
    };

    const defaultConfig: Omit<PrinterConfiguration, 'id' | 'createdAt' | 'updatedAt'> = {
      companyId,
      branchId,
      printerInfo: printer,
      paperSettings,
      printSettings: {
        printSpeed: Math.min(printer.maxPrintSpeed, 200),
        printDensity: 'medium',
        cutType: 'partial',
        buzzer: true,
        cashdrawer: false
      },
      jordanSettings: {
        currency: 'JOD',
        taxRate: this.jordanStandards.taxCalculation.rate,
        taxInclusive: true,
        showTaxNumber: true,
        arabicSupport: printer.supportsArabic,
        receiptNumberFormat: 'RCP-{YYYYMMDD}-{####}',
        timeFormat: '24h',
        dateFormat: 'DD/MM/YYYY'
      },
      templates: {
        header: {
          enabled: true,
          template: this.getDefaultHeaderTemplate(printer.paperWidth),
          variables: {},
          formatting: {
            alignment: 'center',
            fontSize: 'large',
            bold: true,
            underline: false
          }
        },
        items: {
          enabled: true,
          template: this.getDefaultItemsTemplate(printer.paperWidth),
          variables: {},
          formatting: {
            alignment: 'left',
            fontSize: 'normal',
            bold: false,
            underline: false
          }
        },
        footer: {
          enabled: true,
          template: this.getDefaultFooterTemplate(printer.paperWidth),
          variables: {},
          formatting: {
            alignment: 'center',
            fontSize: 'small',
            bold: false,
            underline: false
          }
        },
        logo: {
          enabled: true,
          position: 'top',
          alignment: 'center',
          maxWidth: printer.paperWidth === 80 ? 300 : 200,
          maxHeight: printer.paperWidth === 80 ? 150 : 100
        }
      },
      isDefault: false,
      isActive: true
    };

    return defaultConfig;
  }

  /**
   * Get receipt template recommendations for Jordan
   */
  getJordanReceiptTemplates(paperWidth: 58 | 80): {
    restaurant: string;
    cafe: string;
    fastFood: string;
    delivery: string;
  } {
    const templates = {
      restaurant: this.getRestaurantTemplate(paperWidth),
      cafe: this.getCafeTemplate(paperWidth),
      fastFood: this.getFastFoodTemplate(paperWidth),
      delivery: this.getDeliveryTemplate(paperWidth)
    };

    return templates;
  }

  /**
   * Validate configuration against Jordan standards
   */
  private validateJordanCompliance(config: Omit<PrinterConfiguration, 'id' | 'createdAt' | 'updatedAt'>): void {
    const errors: string[] = [];

    // Check tax rate
    if (config.jordanSettings.taxRate !== this.jordanStandards.taxCalculation.rate) {
      errors.push(`Tax rate should be ${this.jordanStandards.taxCalculation.rate * 100}% for Jordan`);
    }

    // Check currency
    if (!['JOD', 'USD'].includes(config.jordanSettings.currency)) {
      errors.push('Currency must be JOD or USD for Jordan market');
    }

    // Check receipt format compliance
    if (!config.templates.header.enabled && this.jordanStandards.receiptFormat.headerRequired) {
      errors.push('Header template is required for Jordan receipts');
    }

    if (!config.templates.footer.enabled && this.jordanStandards.receiptFormat.footerRequired) {
      errors.push('Footer template is required for Jordan receipts');
    }

    if (errors.length > 0) {
      throw new Error(`Jordan compliance validation failed: ${errors.join(', ')}`);
    }
  }

  /**
   * Get default header template
   */
  private getDefaultHeaderTemplate(paperWidth: 58 | 80): string {
    const width = paperWidth === 80 ? 48 : 32;
    return `{LOGO}
${'-'.repeat(width)}
{COMPANY_NAME}
{COMPANY_ADDRESS}
Tel: {COMPANY_PHONE}
Tax No: {TAX_NUMBER}
${'-'.repeat(width)}
Receipt: {RECEIPT_NUMBER}
Date: {DATE} {TIME}
Cashier: {CASHIER_NAME}
${'-'.repeat(width)}`;
  }

  /**
   * Get default items template
   */
  private getDefaultItemsTemplate(paperWidth: 58 | 80): string {
    if (paperWidth === 80) {
      return `{ITEM_NAME} x{QTY}               {PRICE}
{ITEM_MODIFIERS}`;
    } else {
      return `{ITEM_NAME} x{QTY}
                      {PRICE}
{ITEM_MODIFIERS}`;
    }
  }

  /**
   * Get default footer template
   */
  private getDefaultFooterTemplate(paperWidth: 58 | 80): string {
    const width = paperWidth === 80 ? 48 : 32;
    return `${'-'.repeat(width)}
Subtotal:               {SUBTOTAL}
VAT (16%):              {TAX_AMOUNT}
${'-'.repeat(width)}
TOTAL:                  {TOTAL}
${'-'.repeat(width)}
Payment: {PAYMENT_METHOD}

Thank you for your visit!
شكراً لزيارتكم

{QR_CODE}`;
  }

  /**
   * Map database record to configuration object
   */
  private mapToConfiguration(record: any): PrinterConfiguration {
    return {
      id: record.id,
      companyId: record.companyId,
      branchId: record.branchId,
      printerInfo: JSON.parse(record.printerInfo),
      paperSettings: JSON.parse(record.paperSettings),
      printSettings: JSON.parse(record.printSettings),
      jordanSettings: JSON.parse(record.jordanSettings),
      templates: JSON.parse(record.templates),
      isDefault: record.isDefault,
      isActive: record.isActive,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt
    };
  }

  /**
   * Business-specific templates
   */
  private getRestaurantTemplate(paperWidth: 58 | 80): string {
    return `${this.getDefaultHeaderTemplate(paperWidth)}
Table: {TABLE_NUMBER}
Server: {SERVER_NAME}
${'-'.repeat(paperWidth === 80 ? 48 : 32)}
{ITEMS}
${this.getDefaultFooterTemplate(paperWidth)}`;
  }

  private getCafeTemplate(paperWidth: 58 | 80): string {
    return `${this.getDefaultHeaderTemplate(paperWidth)}
Order: {ORDER_TYPE}
${'-'.repeat(paperWidth === 80 ? 48 : 32)}
{ITEMS}
${this.getDefaultFooterTemplate(paperWidth)}`;
  }

  private getFastFoodTemplate(paperWidth: 58 | 80): string {
    return `${this.getDefaultHeaderTemplate(paperWidth)}
Order: {ORDER_NUMBER}
Type: {ORDER_TYPE}
${'-'.repeat(paperWidth === 80 ? 48 : 32)}
{ITEMS}
${this.getDefaultFooterTemplate(paperWidth)}
Ready Time: {READY_TIME}`;
  }

  private getDeliveryTemplate(paperWidth: 58 | 80): string {
    return `${this.getDefaultHeaderTemplate(paperWidth)}
DELIVERY ORDER
${'-'.repeat(paperWidth === 80 ? 48 : 32)}
Customer: {CUSTOMER_NAME}
Phone: {CUSTOMER_PHONE}
Address: {DELIVERY_ADDRESS}
${'-'.repeat(paperWidth === 80 ? 48 : 32)}
{ITEMS}
${'-'.repeat(paperWidth === 80 ? 48 : 32)}
Delivery Fee:           {DELIVERY_FEE}
${this.getDefaultFooterTemplate(paperWidth)}
Expected: {DELIVERY_TIME}`;
  }

  /**
   * Get Jordan-specific printing guidelines
   */
  getJordanPrintingGuidelines(): string[] {
    return [
      'Include company tax number on all receipts',
      'Display VAT separately at 16% rate',
      'Use JOD currency with 3 decimal places (fils)',
      'Include Arabic translation for customer-facing text',
      'Ensure receipt number is unique and sequential',
      'Print date and time in DD/MM/YYYY HH:mm format',
      'Include company contact information',
      'Consider thermal paper quality - use medium density',
      'Test Arabic text rendering on your specific printer',
      'Keep receipt copies for tax compliance (7 years)',
      'Use QR codes for digital receipt verification',
      'Consider environmental impact - optimize receipt length'
    ];
  }
}