import { Injectable, Logger } from '@nestjs/common';
import * as ReceiptLine from 'receiptline';
import { PrismaService } from '../../database/prisma.service';

interface RenderContext {
  order?: any;
  customer?: any;
  company?: any;
  branch?: any;
  user?: any;
  system?: {
    date: Date;
    time: string;
    timestamp: string;
  };
}

interface ComponentRenderResult {
  content: string;
  escposCommands?: Buffer;
  errors?: string[];
}

@Injectable()
export class EscposRenderService {
  private readonly logger = new Logger(EscposRenderService.name);

  constructor(private readonly prisma: PrismaService) {}

  async renderTemplate(templateId: string, context: RenderContext, format: 'escpos' | 'html' | 'markdown' = 'escpos'): Promise<ComponentRenderResult> {
    try {
      // Load template with components
      const template = await this.prisma.templateBuilderTemplate.findUnique({
        where: { id: templateId },
        include: {
          components: {
            orderBy: [
              { sortOrder: 'asc' },
              { position: 'asc' },
            ],
          },
          category: true,
          company: true,
          branch: true,
        },
      });

      if (!template) {
        throw new Error(`Template ${templateId} not found`);
      }

      // Add system context
      const fullContext: RenderContext = {
        ...context,
        company: template.company,
        branch: template.branch,
        system: {
          date: new Date(),
          time: new Date().toLocaleTimeString(),
          timestamp: new Date().toISOString(),
        },
      };

      // Render components to ReceiptLine markdown
      const markdown = await this.renderToMarkdown(template, fullContext);

      if (format === 'markdown') {
        return { content: markdown };
      }

      if (format === 'html') {
        const html = this.markdownToHtml(markdown);
        return { content: html };
      }

      // Generate ESC/POS commands
      const escposCommands = this.generateEscposCommands(markdown, template.printSettings);

      return {
        content: markdown,
        escposCommands,
      };

    } catch (error) {
      this.logger.error(`Error rendering template ${templateId}:`, error);
      return {
        content: '',
        errors: [error.message],
      };
    }
  }

  private async renderToMarkdown(template: any, context: RenderContext): Promise<string> {
    const lines: string[] = [];
    const settings = template.printSettings || {};
    const canvasSettings = template.canvasSettings || {};

    // Process paper width for character calculations
    const paperWidth = this.getPaperWidthChars(canvasSettings.paperSize || '80mm');

    // Process components in order
    for (const component of template.components) {
      if (!component.isVisible) continue;

      // Check conditions
      if (!this.evaluateConditions(component.conditions, context)) {
        continue;
      }

      const componentMarkdown = await this.renderComponent(component, context, paperWidth);
      if (componentMarkdown) {
        lines.push(componentMarkdown);
      }
    }

    return lines.join('\n');
  }

  private async renderComponent(component: any, context: RenderContext, paperWidth: number): Promise<string> {
    const { type, properties, position, styles } = component;

    // Resolve data binding
    const boundData = this.resolveDataBinding(component.dataBinding, context);
    const transformedData = this.applyTransformations(boundData, component.transformations, context);

    switch (type) {
      case 'text':
        return this.renderTextComponent(properties, transformedData, styles, paperWidth);

      case 'image':
        return this.renderImageComponent(properties, transformedData);

      case 'barcode':
        return this.renderBarcodeComponent(properties, transformedData);

      case 'qr':
        return this.renderQRComponent(properties, transformedData);

      case 'table':
        return this.renderTableComponent(properties, transformedData, paperWidth);

      case 'line':
        return this.renderLineComponent(properties, paperWidth);

      case 'spacer':
        return this.renderSpacerComponent(properties);

      case 'datetime':
        return this.renderDateTimeComponent(properties, context.system);

      case 'counter':
        return this.renderCounterComponent(properties, context);

      default:
        this.logger.warn(`Unknown component type: ${type}`);
        return `[Unknown component: ${type}]`;
    }
  }

  private renderTextComponent(properties: any, data: any, styles: any, paperWidth: number): string {
    let text = data || properties.text || '';

    // Apply text transformations
    if (properties.textTransform === 'uppercase') text = text.toUpperCase();
    if (properties.textTransform === 'lowercase') text = text.toLowerCase();
    if (properties.textTransform === 'capitalize') text = this.capitalizeWords(text);

    // Build ReceiptLine formatting
    let formatting = '';

    // Font size
    if (properties.fontSize && properties.fontSize > 12) {
      const size = Math.min(Math.floor(properties.fontSize / 6), 8);
      formatting += `<size:${size},${size}>`;
    }

    // Font weight
    if (properties.fontWeight === 'bold') {
      formatting += '<b>';
    }

    // Alignment
    let alignment = '';
    switch (properties.alignment) {
      case 'center':
        alignment = '<center>';
        break;
      case 'right':
        alignment = '<right>';
        break;
      default:
        alignment = '<left>';
    }

    // Line height (spacing)
    let spacing = '';
    if (properties.lineHeight && properties.lineHeight > 1.2) {
      spacing = '\n'.repeat(Math.floor(properties.lineHeight - 1));
    }

    return `${alignment}${formatting}${text}${spacing}`;
  }

  private renderImageComponent(properties: any, data: any): string {
    const src = data || properties.src;
    if (!src) return '';

    // ReceiptLine image syntax
    return `<img:${src}>`;
  }

  private renderBarcodeComponent(properties: any, data: any): string {
    const barcodeData = data || properties.data || '';
    if (!barcodeData) return '';

    const type = properties.type || 'CODE128';
    const width = properties.width || 2;
    const height = properties.height || 100;
    const showText = properties.showText !== false;

    return `<barcode:${barcodeData},${type},${width},${height},${showText ? 'true' : 'false'}>`;
  }

  private renderQRComponent(properties: any, data: any): string {
    const qrData = data || properties.data || '';
    if (!qrData) return '';

    const size = properties.size || 3;
    return `<qr:${qrData},${size}>`;
  }

  private renderTableComponent(properties: any, data: any, paperWidth: number): string {
    if (!data || !Array.isArray(data)) return '';

    const columns = properties.columns || ['Item', 'Quantity', 'Price'];
    const alignment = properties.alignment || 'left';

    // Calculate column widths
    const totalCols = columns.length;
    const colWidth = Math.floor(paperWidth / totalCols);

    let table = '';

    // Header
    table += '<b>';
    table += columns.map(col => this.padString(col, colWidth, alignment)).join('');
    table += '</b>\n';

    // Separator line
    table += '-'.repeat(paperWidth) + '\n';

    // Data rows
    for (const row of data) {
      if (Array.isArray(row)) {
        table += row.map((cell, index) =>
          this.padString(String(cell || ''), colWidth, alignment)
        ).join('') + '\n';
      } else if (typeof row === 'object') {
        table += columns.map(col =>
          this.padString(String(row[col] || ''), colWidth, alignment)
        ).join('') + '\n';
      }
    }

    return table;
  }

  private renderLineComponent(properties: any, paperWidth: number): string {
    const char = properties.character || '-';
    const style = properties.style || 'solid';

    let lineChar = char;
    if (style === 'double') lineChar = '=';
    if (style === 'dotted') lineChar = '.';
    if (style === 'dashed') lineChar = '-';

    return lineChar.repeat(paperWidth);
  }

  private renderSpacerComponent(properties: any): string {
    const height = properties.height || 1;
    return '\n'.repeat(height);
  }

  private renderDateTimeComponent(properties: any, systemData: any): string {
    if (!systemData) return '';

    const format = properties.format || 'datetime';
    const date = new Date();

    switch (format) {
      case 'date':
        return date.toLocaleDateString();
      case 'time':
        return date.toLocaleTimeString();
      case 'datetime':
        return date.toLocaleString();
      case 'timestamp':
        return date.toISOString();
      default:
        return date.toLocaleString();
    }
  }

  private renderCounterComponent(properties: any, context: RenderContext): string {
    // This would typically connect to a counter service
    // For now, return a placeholder
    const counterType = properties.counterType || 'order';
    return `${counterType.toUpperCase()}: #001`;
  }

  private resolveDataBinding(dataBinding: string, context: RenderContext): any {
    if (!dataBinding) return null;

    try {
      const path = dataBinding.split('.');
      let value = context;

      for (const key of path) {
        value = value?.[key];
      }

      return value;
    } catch (error) {
      this.logger.warn(`Error resolving data binding ${dataBinding}:`, error);
      return null;
    }
  }

  private applyTransformations(data: any, transformations: any[], context: RenderContext): any {
    if (!transformations || transformations.length === 0) return data;

    let result = data;

    for (const transformation of transformations) {
      switch (transformation.type) {
        case 'currency':
          result = this.formatCurrency(result, transformation.currency || 'JOD');
          break;
        case 'date':
          result = this.formatDate(result, transformation.format || 'DD/MM/YYYY');
          break;
        case 'uppercase':
          result = String(result).toUpperCase();
          break;
        case 'lowercase':
          result = String(result).toLowerCase();
          break;
        case 'truncate':
          result = this.truncateString(String(result), transformation.length || 50);
          break;
      }
    }

    return result;
  }

  private evaluateConditions(conditions: any[], context: RenderContext): boolean {
    if (!conditions || conditions.length === 0) return true;

    for (const condition of conditions) {
      const value = this.resolveDataBinding(condition.field, context);

      switch (condition.operator) {
        case 'equals':
          if (value !== condition.value) return false;
          break;
        case 'not_equals':
          if (value === condition.value) return false;
          break;
        case 'greater_than':
          if (!(value > condition.value)) return false;
          break;
        case 'less_than':
          if (!(value < condition.value)) return false;
          break;
        case 'exists':
          if (value == null || value === '') return false;
          break;
        case 'not_exists':
          if (value != null && value !== '') return false;
          break;
      }
    }

    return true;
  }

  private generateEscposCommands(markdown: string, printSettings: any): Buffer {
    try {
      // Configure receipt line settings
      const options = {
        command: 'escpos',
        encoding: printSettings.encoding || 'cp1252',
        spacing: printSettings.lineSpacing || 1,
        cutting: printSettings.cutType === 'full',
        upsideDown: false,
        ...printSettings,
      };

      // Use ReceiptLine transform function directly
      const result = ReceiptLine.transform(markdown, options);

      // Convert to Buffer if it's a string
      if (typeof result === 'string') {
        return Buffer.from(result, 'utf8');
      }

      return result as Buffer;
    } catch (error) {
      this.logger.error('Error generating ESC/POS commands:', error);
      throw new Error('Failed to generate ESC/POS commands');
    }
  }

  private markdownToHtml(markdown: string): string {
    // Simple markdown to HTML conversion for preview
    return markdown
      .replace(/<b>(.*?)<\/b>/g, '<strong>$1</strong>')
      .replace(/<center>/g, '<div style="text-align: center">')
      .replace(/<\/center>/g, '</div>')
      .replace(/<right>/g, '<div style="text-align: right">')
      .replace(/<\/right>/g, '</div>')
      .replace(/<left>/g, '<div style="text-align: left">')
      .replace(/<\/left>/g, '</div>')
      .replace(/\n/g, '<br>')
      .replace(/<img:(.*?)>/g, '<img src="$1" style="max-width: 200px">')
      .replace(/<barcode:(.*?),.*?>/g, '<div class="barcode">[$1]</div>')
      .replace(/<qr:(.*?),.*?>/g, '<div class="qr-code">QR: $1</div>');
  }

  // Helper methods
  private getPaperWidthChars(paperSize: string): number {
    switch (paperSize) {
      case '58mm': return 32;
      case '80mm': return 48;
      case '112mm': return 64;
      default: return 48;
    }
  }

  private padString(str: string, width: number, align: 'left' | 'center' | 'right' = 'left'): string {
    if (str.length >= width) return str.substring(0, width);

    const padding = width - str.length;

    switch (align) {
      case 'center':
        const leftPad = Math.floor(padding / 2);
        const rightPad = padding - leftPad;
        return ' '.repeat(leftPad) + str + ' '.repeat(rightPad);
      case 'right':
        return ' '.repeat(padding) + str;
      default:
        return str + ' '.repeat(padding);
    }
  }

  private capitalizeWords(str: string): string {
    return str.replace(/\b\w+/g, word =>
      word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    );
  }

  private formatCurrency(amount: any, currency: string): string {
    const num = parseFloat(amount) || 0;
    return `${num.toFixed(2)} ${currency}`;
  }

  private formatDate(dateValue: any, format: string): string {
    const date = new Date(dateValue);
    if (isNaN(date.getTime())) return String(dateValue);

    // Simple date formatting
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();

    return format
      .replace('DD', day)
      .replace('MM', month)
      .replace('YYYY', year.toString())
      .replace('YY', year.toString().slice(-2));
  }

  private truncateString(str: string, maxLength: number): string {
    if (str.length <= maxLength) return str;
    return str.substring(0, maxLength - 3) + '...';
  }
}