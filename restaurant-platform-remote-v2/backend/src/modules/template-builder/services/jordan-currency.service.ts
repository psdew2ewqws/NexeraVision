/**
 * Jordan Currency Service
 * Handles Jordan Dinar (JOD) formatting and multi-currency support for thermal receipts
 */

import { Injectable, Logger } from '@nestjs/common';

export interface CurrencyConfig {
  code: string;
  symbol: string;
  symbolNative: string;
  symbolArabic?: string;
  name: string;
  nameArabic?: string;
  decimalDigits: number;
  rounding: number;
  subunit: string;
  subunitArabic?: string;
  subunitToUnit: number;
  symbolFirst: boolean;
  spaceBetweenAmountAndSymbol: boolean;
  thousandsSeparator: string;
  decimalSeparator: string;
  format: {
    positive: string;
    negative: string;
    zero: string;
  };
  isCommonInJordan: boolean;
}

export interface FormattedAmount {
  amount: number;
  currency: string;
  formatted: string;
  formattedArabic?: string;
  parts: {
    major: number;
    minor: number;
    majorText: string;
    minorText: string;
    majorTextArabic?: string;
    minorTextArabic?: string;
  };
}

@Injectable()
export class JordanCurrencyService {
  private readonly logger = new Logger(JordanCurrencyService.name);

  // Currency configurations
  private readonly currencies: Map<string, CurrencyConfig> = new Map([
    ['JOD', {
      code: 'JOD',
      symbol: 'JD',
      symbolNative: 'د.أ',
      symbolArabic: 'دينار أردني',
      name: 'Jordanian Dinar',
      nameArabic: 'دينار أردني',
      decimalDigits: 3,
      rounding: 0.001,
      subunit: 'fils',
      subunitArabic: 'فلس',
      subunitToUnit: 1000,
      symbolFirst: false,
      spaceBetweenAmountAndSymbol: true,
      thousandsSeparator: ',',
      decimalSeparator: '.',
      format: {
        positive: '%v %s',
        negative: '-%v %s',
        zero: '%v %s'
      },
      isCommonInJordan: true
    }],
    ['USD', {
      code: 'USD',
      symbol: '$',
      symbolNative: '$',
      name: 'US Dollar',
      nameArabic: 'دولار أمريكي',
      decimalDigits: 2,
      rounding: 0.01,
      subunit: 'cent',
      subunitArabic: 'سنت',
      subunitToUnit: 100,
      symbolFirst: true,
      spaceBetweenAmountAndSymbol: false,
      thousandsSeparator: ',',
      decimalSeparator: '.',
      format: {
        positive: '%s%v',
        negative: '-%s%v',
        zero: '%s%v'
      },
      isCommonInJordan: true
    }],
    ['EUR', {
      code: 'EUR',
      symbol: '€',
      symbolNative: '€',
      name: 'Euro',
      nameArabic: 'يورو',
      decimalDigits: 2,
      rounding: 0.01,
      subunit: 'cent',
      subunitArabic: 'سنت',
      subunitToUnit: 100,
      symbolFirst: false,
      spaceBetweenAmountAndSymbol: true,
      thousandsSeparator: ',',
      decimalSeparator: '.',
      format: {
        positive: '%v %s',
        negative: '-%v %s',
        zero: '%v %s'
      },
      isCommonInJordan: false
    }],
    ['SAR', {
      code: 'SAR',
      symbol: 'SR',
      symbolNative: 'ر.س',
      symbolArabic: 'ريال سعودي',
      name: 'Saudi Riyal',
      nameArabic: 'ريال سعودي',
      decimalDigits: 2,
      rounding: 0.01,
      subunit: 'halala',
      subunitArabic: 'هللة',
      subunitToUnit: 100,
      symbolFirst: false,
      spaceBetweenAmountAndSymbol: true,
      thousandsSeparator: ',',
      decimalSeparator: '.',
      format: {
        positive: '%v %s',
        negative: '-%v %s',
        zero: '%v %s'
      },
      isCommonInJordan: true
    }],
    ['AED', {
      code: 'AED',
      symbol: 'AED',
      symbolNative: 'د.إ',
      symbolArabic: 'درهم إماراتي',
      name: 'UAE Dirham',
      nameArabic: 'درهم إماراتي',
      decimalDigits: 2,
      rounding: 0.01,
      subunit: 'fils',
      subunitArabic: 'فلس',
      subunitToUnit: 100,
      symbolFirst: false,
      spaceBetweenAmountAndSymbol: true,
      thousandsSeparator: ',',
      decimalSeparator: '.',
      format: {
        positive: '%v %s',
        negative: '-%v %s',
        zero: '%v %s'
      },
      isCommonInJordan: true
    }]
  ]);

  // Jordan-specific VAT and tax information
  private readonly jordanTaxInfo = {
    vatRate: 0.16, // 16% VAT
    vatName: 'VAT',
    vatNameArabic: 'ضريبة القيمة المضافة',
    serviceTaxRate: 0.10, // 10% service tax for some sectors
    serviceTaxName: 'Service Tax',
    serviceTaxNameArabic: 'ضريبة الخدمة'
  };

  // Arabic number words for receipt text
  private readonly arabicNumbers = {
    0: 'صفر', 1: 'واحد', 2: 'اثنان', 3: 'ثلاثة', 4: 'أربعة', 5: 'خمسة',
    6: 'ستة', 7: 'سبعة', 8: 'ثمانية', 9: 'تسعة', 10: 'عشرة',
    20: 'عشرون', 30: 'ثلاثون', 40: 'أربعون', 50: 'خمسون',
    60: 'ستون', 70: 'سبعون', 80: 'ثمانون', 90: 'تسعون',
    100: 'مئة', 1000: 'ألف'
  };

  /**
   * Format amount for thermal receipt printing
   */
  formatAmount(
    amount: number,
    currencyCode: string = 'JOD',
    options?: {
      includeArabic?: boolean;
      thermalWidth?: 58 | 80;
      showSubunit?: boolean;
      alignment?: 'left' | 'right' | 'center';
    }
  ): FormattedAmount {
    const currency = this.getCurrency(currencyCode);
    const roundedAmount = this.roundAmount(amount, currency);

    // Split into major and minor units
    const major = Math.floor(roundedAmount);
    const minor = Math.round((roundedAmount - major) * currency.subunitToUnit);

    // Format the amount
    const formattedNumber = this.formatNumber(roundedAmount, currency);
    const formatted = this.applyFormat(formattedNumber, currency, 'positive');

    // Generate Arabic formatting if requested
    let formattedArabic: string | undefined;
    if (options?.includeArabic && currency.symbolArabic) {
      formattedArabic = this.formatAmountArabic(roundedAmount, currency);
    }

    // Generate text representations
    const majorText = this.numberToText(major, 'en');
    const minorText = this.numberToText(minor, 'en');
    const majorTextArabic = options?.includeArabic ? this.numberToText(major, 'ar') : undefined;
    const minorTextArabic = options?.includeArabic ? this.numberToText(minor, 'ar') : undefined;

    return {
      amount: roundedAmount,
      currency: currencyCode,
      formatted,
      formattedArabic,
      parts: {
        major,
        minor,
        majorText,
        minorText,
        majorTextArabic,
        minorTextArabic
      }
    };
  }

  /**
   * Format amount for Arabic thermal receipt
   */
  formatAmountArabic(amount: number, currency: CurrencyConfig): string {
    const roundedAmount = this.roundAmount(amount, currency);
    const formattedNumber = this.formatNumberArabic(roundedAmount, currency);

    // Arabic formatting: amount + currency symbol
    return `${formattedNumber} ${currency.symbolArabic || currency.symbolNative}`;
  }

  /**
   * Format number with proper separators
   */
  formatNumber(amount: number, currency: CurrencyConfig): string {
    const fixed = amount.toFixed(currency.decimalDigits);
    const parts = fixed.split('.');

    // Add thousands separator
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, currency.thousandsSeparator);

    return parts.join(currency.decimalSeparator);
  }

  /**
   * Format number for Arabic display
   */
  formatNumberArabic(amount: number, currency: CurrencyConfig): string {
    const formatted = this.formatNumber(amount, currency);

    // Convert Western numerals to Arabic numerals
    return this.convertToArabicNumerals(formatted);
  }

  /**
   * Convert Western numerals to Arabic numerals
   */
  convertToArabicNumerals(text: string): string {
    const westernToArabic = {
      '0': '٠', '1': '١', '2': '٢', '3': '٣', '4': '٤',
      '5': '٥', '6': '٦', '7': '٧', '8': '٨', '9': '٩'
    };

    return text.replace(/[0-9]/g, (digit) => westernToArabic[digit as keyof typeof westernToArabic]);
  }

  /**
   * Apply currency format template
   */
  applyFormat(amount: string, currency: CurrencyConfig, type: 'positive' | 'negative' | 'zero'): string {
    const template = currency.format[type];
    const symbol = currency.symbol;

    return template
      .replace('%v', amount)
      .replace('%s', symbol);
  }

  /**
   * Round amount according to currency rules
   */
  roundAmount(amount: number, currency: CurrencyConfig): number {
    return Math.round(amount / currency.rounding) * currency.rounding;
  }

  /**
   * Get currency configuration
   */
  getCurrency(code: string): CurrencyConfig {
    const currency = this.currencies.get(code);
    if (!currency) {
      throw new Error(`Unsupported currency: ${code}`);
    }
    return currency;
  }

  /**
   * Calculate Jordan VAT
   */
  calculateJordanVAT(amount: number, inclusive: boolean = true): {
    subtotal: number;
    vatAmount: number;
    total: number;
    vatRate: number;
  } {
    const vatRate = this.jordanTaxInfo.vatRate;

    if (inclusive) {
      // VAT is included in the amount
      const total = amount;
      const subtotal = total / (1 + vatRate);
      const vatAmount = total - subtotal;

      return {
        subtotal: this.roundAmount(subtotal, this.getCurrency('JOD')),
        vatAmount: this.roundAmount(vatAmount, this.getCurrency('JOD')),
        total: this.roundAmount(total, this.getCurrency('JOD')),
        vatRate
      };
    } else {
      // VAT is added to the amount
      const subtotal = amount;
      const vatAmount = subtotal * vatRate;
      const total = subtotal + vatAmount;

      return {
        subtotal: this.roundAmount(subtotal, this.getCurrency('JOD')),
        vatAmount: this.roundAmount(vatAmount, this.getCurrency('JOD')),
        total: this.roundAmount(total, this.getCurrency('JOD')),
        vatRate
      };
    }
  }

  /**
   * Convert number to text representation
   */
  numberToText(number: number, language: 'en' | 'ar'): string {
    if (language === 'ar') {
      return this.numberToArabicText(number);
    }
    return this.numberToEnglishText(number);
  }

  /**
   * Convert number to English text
   */
  private numberToEnglishText(number: number): string {
    if (number === 0) return 'zero';

    const ones = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine',
                  'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen',
                  'seventeen', 'eighteen', 'nineteen'];

    const tens = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];

    if (number < 20) return ones[number];
    if (number < 100) return tens[Math.floor(number / 10)] + (number % 10 !== 0 ? ' ' + ones[number % 10] : '');
    if (number < 1000) return ones[Math.floor(number / 100)] + ' hundred' + (number % 100 !== 0 ? ' ' + this.numberToEnglishText(number % 100) : '');

    return number.toString(); // Fallback for larger numbers
  }

  /**
   * Convert number to Arabic text (simplified)
   */
  private numberToArabicText(number: number): string {
    if (number <= 10 && this.arabicNumbers[number]) {
      return this.arabicNumbers[number];
    }

    // For complex numbers, return Arabic numerals
    return this.convertToArabicNumerals(number.toString());
  }

  /**
   * Get currencies common in Jordan
   */
  getJordanCurrencies(): CurrencyConfig[] {
    return Array.from(this.currencies.values()).filter(currency => currency.isCommonInJordan);
  }

  /**
   * Get all supported currencies
   */
  getAllCurrencies(): CurrencyConfig[] {
    return Array.from(this.currencies.values());
  }

  /**
   * Get Jordan tax information
   */
  getJordanTaxInfo() {
    return { ...this.jordanTaxInfo };
  }

  /**
   * Format thermal receipt totals for Jordan
   */
  formatReceiptTotals(
    totals: {
      subtotal: number;
      vatAmount?: number;
      serviceCharge?: number;
      deliveryFee?: number;
      discount?: number;
      total: number;
    },
    currencyCode: string = 'JOD',
    options?: {
      includeArabic?: boolean;
      thermalWidth?: 58 | 80;
      vatInclusive?: boolean;
    }
  ): {
    subtotal: FormattedAmount;
    vat?: FormattedAmount;
    serviceCharge?: FormattedAmount;
    deliveryFee?: FormattedAmount;
    discount?: FormattedAmount;
    total: FormattedAmount;
    vatInfo?: {
      rate: number;
      name: string;
      nameArabic: string;
    };
  } {
    const currency = this.getCurrency(currencyCode);

    const result: any = {
      subtotal: this.formatAmount(totals.subtotal, currencyCode, options),
      total: this.formatAmount(totals.total, currencyCode, options)
    };

    if (totals.vatAmount !== undefined) {
      result.vat = this.formatAmount(totals.vatAmount, currencyCode, options);
      result.vatInfo = {
        rate: this.jordanTaxInfo.vatRate * 100,
        name: this.jordanTaxInfo.vatName,
        nameArabic: this.jordanTaxInfo.vatNameArabic
      };
    }

    if (totals.serviceCharge !== undefined) {
      result.serviceCharge = this.formatAmount(totals.serviceCharge, currencyCode, options);
    }

    if (totals.deliveryFee !== undefined) {
      result.deliveryFee = this.formatAmount(totals.deliveryFee, currencyCode, options);
    }

    if (totals.discount !== undefined) {
      result.discount = this.formatAmount(totals.discount, currencyCode, options);
    }

    return result;
  }

  /**
   * Get thermal receipt formatting recommendations for Jordan
   */
  getThermalReceiptRecommendations(): {
    currency: string[];
    formatting: string[];
    compliance: string[];
  } {
    return {
      currency: [
        'Use JOD as primary currency with 3 decimal places',
        'Display amounts as "12.345 JD" for thermal receipts',
        'Include Arabic numerals: "١٢.٣٤٥ د.أ" for Arabic sections',
        'Round to nearest fils (0.001 JOD)',
        'Show major currency only for large amounts over 1000 JOD'
      ],
      formatting: [
        'Right-align monetary values on thermal receipts',
        'Use consistent decimal alignment for totals',
        'Separate thousands with commas: "1,234.567 JD"',
        'Bold or enlarge total amount on receipt',
        'Use monospace font for proper alignment'
      ],
      compliance: [
        'Display VAT at 16% separately on all receipts',
        'Include VAT registration number for business compliance',
        'Show tax-inclusive pricing clearly',
        'Provide receipt numbering for audit trail',
        'Include date and time for Jordan tax requirements'
      ]
    };
  }
}