/**
 * ThermalFormatter - Utility for formatting thermal receipt content
 * Optimized for 80mm thermal paper (48 characters width)
 */

export interface ThermalFormatterConfig {
  paperWidth: number; // Character width (48 for 80mm, 32 for 58mm)
  font: 'monospace' | 'condensed';
  lineSpacing: 1 | 1.2 | 1.5;
}

export class ThermalFormatter {
  private config: ThermalFormatterConfig;

  constructor(config: Partial<ThermalFormatterConfig> = {}) {
    this.config = {
      paperWidth: 48, // 80mm thermal paper standard
      font: 'monospace',
      lineSpacing: 1,
      ...config
    };
  }

  /**
   * Center text within the paper width
   */
  centerText(text: string): string {
    const cleanText = this.sanitizeText(text);
    if (cleanText.length >= this.config.paperWidth) {
      return cleanText.substring(0, this.config.paperWidth);
    }

    const padding = Math.max(0, this.config.paperWidth - cleanText.length);
    const leftPad = Math.floor(padding / 2);
    return ' '.repeat(leftPad) + cleanText;
  }

  /**
   * Right align text within the paper width
   */
  rightAlign(text: string): string {
    const cleanText = this.sanitizeText(text);
    if (cleanText.length >= this.config.paperWidth) {
      return cleanText.substring(0, this.config.paperWidth);
    }

    const padding = Math.max(0, this.config.paperWidth - cleanText.length);
    return ' '.repeat(padding) + cleanText;
  }

  /**
   * Left align text (default behavior)
   */
  leftAlign(text: string): string {
    const cleanText = this.sanitizeText(text);
    return cleanText.substring(0, this.config.paperWidth);
  }

  /**
   * Create two-column layout with left and right aligned text
   */
  leftRightAlign(leftText: string, rightText: string): string {
    const cleanLeft = this.sanitizeText(leftText);
    const cleanRight = this.sanitizeText(rightText);

    const totalLength = cleanLeft.length + cleanRight.length;

    if (totalLength >= this.config.paperWidth) {
      // If combined text is too long, truncate left text
      const maxLeftLength = this.config.paperWidth - cleanRight.length - 1;
      const truncatedLeft = cleanLeft.substring(0, Math.max(0, maxLeftLength));
      return truncatedLeft + ' ' + cleanRight;
    }

    const padding = this.config.paperWidth - totalLength;
    return cleanLeft + ' '.repeat(padding) + cleanRight;
  }

  /**
   * Create a separator line
   */
  separator(character: string = '-'): string {
    return character.repeat(this.config.paperWidth);
  }

  /**
   * Create a double separator line
   */
  doubleSeparator(): string {
    return '='.repeat(this.config.paperWidth);
  }

  /**
   * Wrap long text to multiple lines
   */
  wrapText(text: string, indent: number = 0): string[] {
    const cleanText = this.sanitizeText(text);
    const availableWidth = this.config.paperWidth - indent;
    const lines: string[] = [];

    if (availableWidth <= 0) return [cleanText];

    let currentLine = '';
    const words = cleanText.split(' ');

    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;

      if (testLine.length <= availableWidth) {
        currentLine = testLine;
      } else {
        if (currentLine) {
          lines.push(' '.repeat(indent) + currentLine);
          currentLine = word;
        } else {
          // Single word is too long, force break
          lines.push(' '.repeat(indent) + word.substring(0, availableWidth));
          currentLine = word.substring(availableWidth);
        }
      }
    }

    if (currentLine) {
      lines.push(' '.repeat(indent) + currentLine);
    }

    return lines;
  }

  /**
   * Format currency values consistently
   */
  formatCurrency(amount: number, currency: string = '$'): string {
    return `${currency}${amount.toFixed(2)}`;
  }

  /**
   * Format product line with quantity, name, and price
   */
  formatProductLine(quantity: number, name: string, price: number, currency: string = '$'): string {
    const qtyStr = quantity.toString().padEnd(3); // "2  "
    const priceStr = this.formatCurrency(price, currency);
    const priceWidth = 8; // Space for price
    const nameWidth = this.config.paperWidth - 3 - priceWidth; // Remaining space for name

    const truncatedName = name.substring(0, nameWidth).padEnd(nameWidth);

    return `${qtyStr}${truncatedName}${priceStr.padStart(priceWidth)}`;
  }

  /**
   * Create table header for products
   */
  formatProductHeader(showQty: boolean = true, showPrice: boolean = true): string {
    let header = '';

    if (showQty) {
      header += 'Qty'.padEnd(3);
    }

    const priceWidth = showPrice ? 8 : 0;
    const nameWidth = this.config.paperWidth - (showQty ? 3 : 0) - priceWidth;
    header += 'Item'.padEnd(nameWidth);

    if (showPrice) {
      header += 'Price'.padStart(priceWidth);
    }

    return header;
  }

  /**
   * Generate thermal receipt HTML with proper styling
   */
  generateThermalHTML(content: string): string {
    const lines = content.split('\n').filter(line => line !== ''); // Remove empty lines

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Thermal Receipt</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: 'Courier New', 'Liberation Mono', 'DejaVu Sans Mono', monospace;
      background: #f5f5f5;
      padding: 20px;
      color: #000;
    }

    .thermal-receipt {
      width: 384px; /* 80mm at 96 DPI (80mm = ~384px) */
      max-width: 100%;
      margin: 0 auto;
      background: #fff;
      border: 1px solid #ddd;
      border-radius: 6px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      overflow: hidden;
    }

    .receipt-header {
      background: #333;
      color: #fff;
      padding: 12px;
      text-align: center;
      font-size: 12px;
      font-weight: bold;
      text-transform: uppercase;
      letter-spacing: 1px;
    }

    .receipt-content {
      padding: 20px 16px;
      font-size: 12px;
      line-height: ${this.config.lineSpacing};
      white-space: pre-wrap;
      font-feature-settings: "tnum" 1; /* Tabular numbers */
      word-break: break-all;
    }

    .print-controls {
      text-align: center;
      margin: 20px 0;
      gap: 10px;
      display: flex;
      justify-content: center;
      flex-wrap: wrap;
    }

    .btn {
      background: #007cba;
      color: white;
      border: none;
      padding: 12px 20px;
      border-radius: 6px;
      cursor: pointer;
      font-size: 14px;
      font-weight: 500;
      transition: all 0.2s;
      display: inline-flex;
      align-items: center;
      gap: 8px;
    }

    .btn:hover {
      background: #005f8a;
      transform: translateY(-1px);
      box-shadow: 0 2px 8px rgba(0,124,186,0.3);
    }

    .btn-secondary {
      background: #6b7280;
    }

    .btn-secondary:hover {
      background: #4b5563;
    }

    .receipt-info {
      text-align: center;
      margin-top: 20px;
      padding: 16px;
      background: #f8fafc;
      border-radius: 8px;
      border: 1px solid #e2e8f0;
    }

    .receipt-info small {
      color: #64748b;
      font-size: 13px;
      line-height: 1.5;
    }

    .char-count {
      font-family: 'Courier New', monospace;
      font-size: 11px;
      color: #9ca3af;
      background: #f3f4f6;
      padding: 8px;
      border-radius: 4px;
      margin-top: 10px;
    }

    /* Print styles */
    @media print {
      body {
        background: white;
        padding: 0;
        margin: 0;
      }

      .thermal-receipt {
        border: none;
        box-shadow: none;
        margin: 0;
        width: 80mm;
        max-width: 80mm;
        border-radius: 0;
      }

      .print-controls,
      .receipt-info {
        display: none !important;
      }

      .receipt-header {
        background: white;
        color: black;
        border-bottom: 2px solid #000;
      }

      .receipt-content {
        padding: 10px 8px;
        font-size: 11px;
      }
    }

    /* Mobile responsiveness */
    @media (max-width: 480px) {
      body {
        padding: 10px;
      }

      .thermal-receipt {
        width: 100%;
        max-width: 384px;
      }

      .print-controls {
        flex-direction: column;
        align-items: center;
      }

      .btn {
        width: 200px;
        justify-content: center;
      }
    }
  </style>
</head>
<body>
  <div class="print-controls">
    <button class="btn" onclick="window.print()">
      🖨️ Print Receipt
    </button>
    <button class="btn btn-secondary" onclick="window.close()">
      ✕ Close Window
    </button>
  </div>

  <div class="thermal-receipt">
    <div class="receipt-header">
      🧾 Thermal Receipt Preview
    </div>
    <div class="receipt-content">${content}</div>
  </div>

  <div class="receipt-info">
    <small>
      📏 <strong>Paper Format:</strong> 80mm thermal paper (48 characters width)<br>
      📱 <strong>Preview:</strong> Shows actual receipt appearance<br>
      🖨️ <strong>Print:</strong> Optimized for thermal printers
    </small>
    <div class="char-count">
      Character Width: ${this.config.paperWidth} | Lines: ${lines.length}
    </div>
  </div>

  <script>
    // Auto-focus print dialog if requested
    if (window.location.search.includes('autoprint=true')) {
      setTimeout(() => window.print(), 500);
    }
  </script>
</body>
</html>`;
  }

  /**
   * Clean and sanitize text input
   */
  private sanitizeText(text: string): string {
    return text
      .replace(/[\r\n\t]/g, ' ') // Replace line breaks and tabs with spaces
      .replace(/\s+/g, ' ') // Collapse multiple spaces
      .trim();
  }

  /**
   * Add line break
   */
  newLine(): string {
    return '\n';
  }

  /**
   * Add multiple line breaks
   */
  newLines(count: number): string {
    return '\n'.repeat(count);
  }

  /**
   * ESC/POS Commands for Physical Thermal Printers
   */

  /**
   * Generate ESC/POS initialize command
   */
  escInitialize(): string {
    return '\x1b@'; // ESC @
  }

  /**
   * Generate ESC/POS center alignment command
   */
  escCenterAlign(): string {
    return '\x1ba\x01'; // ESC a 1
  }

  /**
   * Generate ESC/POS left alignment command
   */
  escLeftAlign(): string {
    return '\x1ba\x00'; // ESC a 0
  }

  /**
   * Generate ESC/POS right alignment command
   */
  escRightAlign(): string {
    return '\x1ba\x02'; // ESC a 2
  }

  /**
   * Generate ESC/POS bold on command
   */
  escBoldOn(): string {
    return '\x1bE\x01'; // ESC E 1
  }

  /**
   * Generate ESC/POS bold off command
   */
  escBoldOff(): string {
    return '\x1bE\x00'; // ESC E 0
  }

  /**
   * Generate ESC/POS underline on command
   */
  escUnderlineOn(): string {
    return '\x1b-\x01'; // ESC - 1
  }

  /**
   * Generate ESC/POS underline off command
   */
  escUnderlineOff(): string {
    return '\x1b-\x00'; // ESC - 0
  }

  /**
   * Generate ESC/POS partial cut command
   */
  escPartialCut(): string {
    return '\x1dV\x00'; // GS V 0
  }

  /**
   * Generate ESC/POS full cut command
   */
  escFullCut(): string {
    return '\x1dV\x01'; // GS V 1
  }

  /**
   * Generate ESC/POS line feed command
   */
  escLineFeed(): string {
    return '\x0a'; // LF
  }

  /**
   * Generate ESC/POS carriage return and line feed
   */
  escCRLF(): string {
    return '\x0d\x0a'; // CR LF
  }

  /**
   * Generate ESC/POS form feed (for paper advance)
   */
  escFormFeed(): string {
    return '\x0c'; // FF
  }

  /**
   * Generate text with center alignment using ESC/POS commands
   */
  escCenterText(text: string): string {
    const cleanText = this.sanitizeText(text);
    return this.escCenterAlign() + cleanText + this.escLineFeed() + this.escLeftAlign();
  }

  /**
   * Generate text with bold formatting using ESC/POS commands
   */
  escBoldText(text: string): string {
    const cleanText = this.sanitizeText(text);
    return this.escBoldOn() + cleanText + this.escBoldOff();
  }

  /**
   * Generate centered and bold text using ESC/POS commands
   */
  escCenterBoldText(text: string): string {
    const cleanText = this.sanitizeText(text);
    return this.escCenterAlign() + this.escBoldOn() + cleanText + this.escBoldOff() + this.escLineFeed() + this.escLeftAlign();
  }

  /**
   * Generate thermal receipt text content with ESC/POS commands for physical printing
   */
  generateThermalReceiptText(content: string): string {
    // Initialize printer
    let output = this.escInitialize();

    // Process each line and apply appropriate formatting
    const lines = content.split('\n');

    for (const line of lines) {
      const trimmedLine = line.trim();

      if (!trimmedLine) {
        // Empty line
        output += this.escLineFeed();
        continue;
      }

      // Check for separator lines
      if (trimmedLine.match(/^[=-]{20,}$/)) {
        output += this.escCenterAlign() + trimmedLine + this.escLineFeed() + this.escLeftAlign();
        continue;
      }

      // Check if line should be centered (headers, titles)
      if (this.shouldCenterLine(trimmedLine)) {
        output += this.escCenterBoldText(trimmedLine);
        continue;
      }

      // Check if line should be bold (totals, important info)
      if (this.shouldBoldLine(trimmedLine)) {
        output += this.escBoldText(trimmedLine) + this.escLineFeed();
        continue;
      }

      // Regular line
      output += trimmedLine + this.escLineFeed();
    }

    // Add paper cut
    output += this.escLineFeed() + this.escLineFeed() + this.escPartialCut();

    return output;
  }

  /**
   * Determine if a line should be centered
   */
  private shouldCenterLine(line: string): boolean {
    const centerPatterns = [
      /RESTAURANT/i,
      /PLATFORM/i,
      /RECEIPT/i,
      /TEST PRINT/i,
      /THANK YOU/i,
      /VISIT/i,
      /COME AGAIN/i,
      /Status:/i,
      /^\[[^\]]+\]$/, // Text in brackets like [LOGO]
    ];

    return centerPatterns.some(pattern => pattern.test(line));
  }

  /**
   * Determine if a line should be bold
   */
  private shouldBoldLine(line: string): boolean {
    const boldPatterns = [
      /^TOTAL:/i,
      /^Status:/i,
      /^Order #/i,
      /^Receipt #/i,
      /^\s*TOTAL\s*$/i,
      /================================/,
    ];

    return boldPatterns.some(pattern => pattern.test(line));
  }

  /**
   * Generate receipt content optimized for thermal printing
   * This version outputs plain text with proper line breaks for thermal printers
   */
  generateThermalReceiptPlainText(receiptData: any): string {
    let lines: string[] = [];

    // Header Section
    if (receiptData.company?.name) {
      lines.push(this.centerText(receiptData.company.name));
    }

    if (receiptData.company?.address) {
      lines.push(this.centerText(receiptData.company.address));
    }

    if (receiptData.company?.phone) {
      lines.push(this.centerText(receiptData.company.phone));
    }

    lines.push(this.separator());

    // Order Information
    if (receiptData.order?.id) {
      lines.push(`Receipt #: ${receiptData.order.id}`);
    }

    if (receiptData.order?.createdAt) {
      const date = new Date(receiptData.order.createdAt);
      lines.push(`Date: ${date.toLocaleDateString()}`);
      lines.push(`Time: ${date.toLocaleTimeString()}`);
    }

    if (receiptData.cashier?.name) {
      lines.push(`Cashier: ${receiptData.cashier.name}`);
    }

    lines.push(this.separator());

    // Items
    if (receiptData.order?.items && receiptData.order.items.length > 0) {
      receiptData.order.items.forEach((item: any) => {
        lines.push(this.formatProductLine(item.quantity || 1, item.name, item.price || 0));

        // Add options if available
        if (item.options && item.options.length > 0) {
          lines.push(`  Options: ${item.options.join(', ')}`);
        }
      });
    }

    lines.push(this.separator('-'));

    // Totals
    if (receiptData.order?.subtotal !== undefined) {
      lines.push(this.leftRightAlign('Subtotal:', this.formatCurrency(receiptData.order.subtotal)));
    }

    if (receiptData.order?.tax !== undefined && receiptData.order.tax > 0) {
      lines.push(this.leftRightAlign('Tax:', this.formatCurrency(receiptData.order.tax)));
    }

    if (receiptData.order?.total !== undefined) {
      lines.push(this.separator('-'));
      lines.push(this.leftRightAlign('TOTAL:', this.formatCurrency(receiptData.order.total)));
    }

    lines.push(this.doubleSeparator());

    // Payment Information
    if (receiptData.payment?.method) {
      lines.push(`Payment: ${receiptData.payment.method}`);

      if (receiptData.payment.amount) {
        lines.push(this.leftRightAlign('Paid:', this.formatCurrency(receiptData.payment.amount)));
      }

      if (receiptData.payment.change) {
        lines.push(this.leftRightAlign('Change:', this.formatCurrency(receiptData.payment.change)));
      }
    }

    lines.push(this.doubleSeparator());

    // Footer
    lines.push(this.centerText('Thank you for your'));
    lines.push(this.centerText('visit today!'));
    lines.push(this.centerText('Please come again'));

    lines.push(this.doubleSeparator());

    return lines.join('\n');
  }
}

// Export default instance with 80mm configuration
export const thermalFormatter = new ThermalFormatter({
  paperWidth: 48,
  font: 'monospace',
  lineSpacing: 1
});

// Export 58mm version for smaller receipts
export const thermalFormatter58mm = new ThermalFormatter({
  paperWidth: 32,
  font: 'monospace',
  lineSpacing: 1
});