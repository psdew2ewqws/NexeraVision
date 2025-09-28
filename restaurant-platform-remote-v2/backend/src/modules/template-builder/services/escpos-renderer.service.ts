import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import * as ReceiptLine from 'receiptline';

interface ComponentData {
  type: string;
  properties: any;
  position: any;
  style: any;
  dataBinding?: string;
}

interface TemplateData {
  designData: any;
  canvasSettings: any;
  printSettings: any;
  components: ComponentData[];
}

@Injectable()
export class EscposRendererService {
  constructor(private readonly prisma: PrismaService) {}

  async renderTemplate(templateId: string, data: any, format: 'escpos' | 'text' | 'html' = 'escpos') {
    // Get template with components
    const template = await this.prisma.templateBuilderTemplate.findUnique({
      where: { id: templateId },
      include: {
        components: {
          orderBy: { sortOrder: 'asc' }
        }
      }
    });

    if (!template) {
      throw new BadRequestException('Template not found');
    }

    // Convert template to ReceiptLine format
    const receiptData = this.convertTemplateToReceiptLine(template, data);

    // Render using ReceiptLine
    const printSettings = template.printSettings as any;
    const canvasSettings = template.canvasSettings as any;

    const options = {
      cpl: this.getPaperWidth(canvasSettings),
      encoding: printSettings?.encoding || 'utf8',
      spacing: printSettings?.spacing || false,
      cutting: printSettings?.autocut || false,
      upsideDown: false,
      command: format as any
    };

    try {
      const result = ReceiptLine.transform(receiptData, options);

      return {
        data: result,
        format,
        settings: printSettings,
        metadata: {
          templateId,
          templateName: template.name,
          paperWidth: options.cpl,
          encoding: options.encoding
        }
      };
    } catch (error) {
      throw new BadRequestException(`Rendering failed: ${error.message}`);
    }
  }

  generatePreview(templateId: string, sampleData?: any) {
    const defaultSampleData = {
      restaurant: {
        name: 'Sample Restaurant',
        address: '123 Main St',
        phone: '+1-555-0123',
        email: 'info@restaurant.com'
      },
      order: {
        id: 'ORD-001',
        date: new Date().toISOString(),
        total: 25.50,
        tax: 2.30,
        items: [
          { name: 'Burger', quantity: 1, price: 12.99 },
          { name: 'Fries', quantity: 1, price: 4.99 },
          { name: 'Drink', quantity: 2, price: 3.99 }
        ]
      },
      customer: {
        name: 'John Doe',
        phone: '+1-555-0456'
      }
    };

    return this.renderTemplate(templateId, sampleData || defaultSampleData, 'html');
  }

  private convertTemplateToReceiptLine(template: any, data: any): string {
    let receiptContent = '';
    const components = template.components || [];

    // Add paper settings
    const canvasSettings = template.canvasSettings as any;
    const paperWidth = this.getPaperWidth(canvasSettings);
    receiptContent += `{width:${paperWidth}}\n`;

    // Process components in order
    for (const component of components) {
      receiptContent += this.renderComponent(component, data);
    }

    // Add cut command if enabled
    const printSettings = template.printSettings as any;
    if (printSettings?.autocut) {
      receiptContent += '{cut}\n';
    }

    return receiptContent;
  }

  private renderComponent(component: ComponentData, data: any): string {
    const { type, properties, style, dataBinding } = component;
    let content = '';

    // Resolve data binding
    const resolvedData = dataBinding ? this.resolveDataBinding(dataBinding, data) : properties.text || '';

    switch (type) {
      case 'text':
        content += this.renderText(resolvedData, properties, style);
        break;

      case 'image':
        content += this.renderImage(properties);
        break;

      case 'barcode':
        content += this.renderBarcode(resolvedData, properties);
        break;

      case 'qr':
        content += this.renderQRCode(resolvedData, properties);
        break;

      case 'table':
        content += this.renderTable(data, properties, style);
        break;

      case 'line':
        content += this.renderLine(properties);
        break;

      case 'space':
        content += this.renderSpace(properties);
        break;

      default:
        console.warn(`Unknown component type: ${type}`);
    }

    return content;
  }

  private renderText(text: string, properties: any, style: any): string {
    let content = '';

    // Text alignment
    const alignment = style?.textAlign || properties.alignment || 'left';
    if (alignment === 'center') content += '{center}';
    else if (alignment === 'right') content += '{right}';

    // Text styling
    if (style?.fontWeight === 'bold' || properties.bold) content += '{b}';
    if (style?.textDecoration === 'underline' || properties.underline) content += '{u}';
    if (properties.doubleWidth) content += '{w}';
    if (properties.doubleHeight) content += '{h}';

    // Font size
    const fontSize = style?.fontSize || properties.fontSize;
    if (fontSize === 'small') content += '{s}';
    else if (fontSize === 'large') content += '{w}{h}';

    // Add text content
    content += text || '';

    // Reset formatting
    content += '{normal}\n';

    return content;
  }

  private renderImage(properties: any): string {
    if (!properties.src) return '';

    // ReceiptLine image syntax
    return `{image:${properties.src}}\n`;
  }

  private renderBarcode(data: string, properties: any): string {
    if (!data) return '';

    const type = properties.barcodeType || 'code128';
    const height = properties.height || 2;

    return `{code:${data},${type},${height}}\n`;
  }

  private renderQRCode(data: string, properties: any): string {
    if (!data) return '';

    const size = properties.size || 'M';
    const errorCorrection = properties.errorCorrection || 'M';

    return `{qr:${data},${errorCorrection},${size}}\n`;
  }

  private renderTable(data: any, properties: any, style: any): string {
    const tableData = this.resolveDataBinding(properties.dataSource || 'order.items', data);

    if (!Array.isArray(tableData)) return '';

    let content = '';

    // Table headers
    if (properties.showHeaders && properties.columns) {
      content += '{b}';
      for (const column of properties.columns) {
        content += `${column.header || column.field}`.padEnd(column.width || 15);
      }
      content += '{/b}\n';
      content += '{line}\n';
    }

    // Table rows
    for (const row of tableData) {
      if (properties.columns) {
        for (const column of properties.columns) {
          const value = this.getNestedValue(row, column.field) || '';
          content += String(value).padEnd(column.width || 15);
        }
      } else {
        content += JSON.stringify(row);
      }
      content += '\n';
    }

    return content;
  }

  private renderLine(properties: any): string {
    const character = properties.character || '-';
    const length = properties.length || 32;

    return character.repeat(length) + '\n';
  }

  private renderSpace(properties: any): string {
    const lines = properties.lines || 1;
    return '\n'.repeat(lines);
  }

  private resolveDataBinding(binding: string, data: any): any {
    if (!binding || !data) return '';

    try {
      // Simple dot notation resolver
      return this.getNestedValue(data, binding);
    } catch (error) {
      console.warn(`Data binding resolution failed for ${binding}:`, error);
      return '';
    }
  }

  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : '';
    }, obj);
  }

  private getPaperWidth(canvasSettings: any): number {
    const paperType = canvasSettings?.paperType || '58mm';

    switch (paperType) {
      case '58mm':
        return 32; // Characters per line for 58mm paper
      case '80mm':
        return 48; // Characters per line for 80mm paper
      default:
        return canvasSettings?.width ? Math.floor(canvasSettings.width / 12) : 32;
    }
  }

  // Utility method to validate template before rendering
  async validateTemplate(templateId: string): Promise<{ isValid: boolean; errors: string[] }> {
    const template = await this.prisma.templateBuilderTemplate.findUnique({
      where: { id: templateId },
      include: {
        components: true
      }
    });

    const errors: string[] = [];

    if (!template) {
      return { isValid: false, errors: ['Template not found'] };
    }

    // Validate canvas settings
    if (!template.canvasSettings) {
      errors.push('Canvas settings missing');
    }

    // Validate print settings
    if (!template.printSettings) {
      errors.push('Print settings missing');
    }

    // Validate components
    for (const component of template.components) {
      if (!component.type) {
        errors.push(`Component ${component.id} missing type`);
      }

      if (!component.position) {
        errors.push(`Component ${component.id} missing position`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}