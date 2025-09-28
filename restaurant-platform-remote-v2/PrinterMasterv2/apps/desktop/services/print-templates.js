class PrintTemplateService {
  constructor() {
    this.templates = new Map();
    this.initializeDefaultTemplates();
  }

  initializeDefaultTemplates() {
    // Test Print Template
    this.templates.set('test', {
      name: 'Test Print',
      type: 'test',
      thermal: this.getTestThermalTemplate(),
      regular: this.getTestRegularTemplate(),
      kitchen: this.getTestKitchenTemplate()
    });

    // Receipt Template
    this.templates.set('receipt', {
      name: 'Customer Receipt',
      type: 'receipt',
      thermal: this.getReceiptThermalTemplate(),
      regular: this.getReceiptRegularTemplate()
    });

    // Kitchen Order Template
    this.templates.set('kitchen_order', {
      name: 'Kitchen Order',
      type: 'kitchen_order',
      thermal: this.getKitchenOrderThermalTemplate(),
      kitchen: this.getKitchenOrderThermalTemplate()
    });

    // Label Template
    this.templates.set('label', {
      name: 'Product Label',
      type: 'label',
      thermal: this.getLabelThermalTemplate()
    });
  }

  // ================================
  // Test Print Templates
  // ================================

  getTestThermalTemplate() {
    return {
      header: {
        align: 'center',
        bold: true,
        content: [
          '================================',
          '    RESTAURANT PLATFORM',
          '        TEST PRINT',
          '================================'
        ]
      },
      body: {
        align: 'left',
        bold: false,
        content: [
          '',
          'Printer: {{printerName}}',
          'Type: {{printerType}}',
          'Connection: {{connection}}',
          'Time: {{timestamp}}',
          'Branch: {{branchName}}',
          'Company: {{companyName}}',
          '================================',
          '',
          'This is a test print to verify',
          'printer connectivity and',
          'functionality.',
          '',
          'Print quality check:',
          '{{testPattern}}',
          '{{numbers}}',
          'Special chars: {{specialChars}}',
          ''
        ]
      },
      footer: {
        align: 'center',
        bold: true,
        content: [
          '================================',
          'Status: SUCCESS',
          '================================'
        ]
      },
      cut: true
    };
  }

  getTestRegularTemplate() {
    return {
      content: [
        '================================',
        '    RESTAURANT PLATFORM',
        '        TEST PRINT',
        '================================',
        '',
        'Printer: {{printerName}}',
        'Type: {{printerType}}',
        'Connection: {{connection}}',
        'Time: {{timestamp}}',
        'Branch: {{branchName}}',
        'Company: {{companyName}}',
        '================================',
        '',
        'This is a test print to verify',
        'printer connectivity and functionality.',
        '',
        'Print quality check:',
        '{{testPattern}}',
        '{{numbers}}',
        'Special chars: {{specialChars}}',
        '',
        '================================',
        'Status: SUCCESS',
        '================================'
      ]
    };
  }

  getTestKitchenTemplate() {
    return {
      header: {
        align: 'center',
        bold: true,
        size: 'large',
        content: [
          '================================',
          '       KITCHEN TEST',
          '================================'
        ]
      },
      body: {
        align: 'left',
        bold: false,
        content: [
          '',
          'Kitchen Printer: {{printerName}}',
          'Station: {{assignedTo}}',
          'Time: {{timestamp}}',
          '================================',
          '',
          'KITCHEN PRINTER TEST',
          'All systems operational',
          '',
          'Quality Check:',
          '{{testPattern}}',
          '{{numbers}}',
          ''
        ]
      },
      footer: {
        align: 'center',
        bold: true,
        content: [
          '================================',
          'KITCHEN READY ✓',
          '================================'
        ]
      },
      cut: true,
      buzzer: true
    };
  }

  // ================================
  // Receipt Templates
  // ================================

  getReceiptThermalTemplate() {
    return {
      header: {
        align: 'center',
        bold: true,
        content: [
          '{{companyName}}',
          '{{branchName}}',
          '================================',
          'CUSTOMER RECEIPT',
          '================================'
        ]
      },
      orderInfo: {
        align: 'left',
        bold: false,
        content: [
          '',
          'Order #: {{orderNumber}}',
          'Date: {{orderDate}}',
          'Time: {{orderTime}}',
          'Cashier: {{cashierName}}',
          'Table: {{tableNumber}}',
          '--------------------------------'
        ]
      },
      items: {
        align: 'left',
        bold: false,
        format: '{{quantity}}x {{name}} ... {{price}}'
      },
      totals: {
        align: 'right',
        content: [
          '--------------------------------',
          'Subtotal: {{subtotal}}',
          'Tax: {{tax}}',
          'Discount: {{discount}}',
          '================================',
          'TOTAL: {{total}}',
          '================================'
        ]
      },
      payment: {
        align: 'left',
        content: [
          'Payment: {{paymentMethod}}',
          'Amount Paid: {{amountPaid}}',
          'Change: {{change}}'
        ]
      },
      footer: {
        align: 'center',
        content: [
          '',
          'Thank you for your order!',
          'Visit us again soon',
          '',
          '{{website}}',
          '{{phone}}',
          ''
        ]
      },
      cut: true
    };
  }

  getReceiptRegularTemplate() {
    return {
      content: [
        '{{companyName}}',
        '{{branchName}}',
        '================================',
        'CUSTOMER RECEIPT',
        '================================',
        '',
        'Order #: {{orderNumber}}',
        'Date: {{orderDate}}',
        'Time: {{orderTime}}',
        'Cashier: {{cashierName}}',
        'Table: {{tableNumber}}',
        '--------------------------------',
        '{{#items}}',
        '{{quantity}}x {{name}} ... {{price}}',
        '{{/items}}',
        '--------------------------------',
        'Subtotal: {{subtotal}}',
        'Tax: {{tax}}',
        'Discount: {{discount}}',
        '================================',
        'TOTAL: {{total}}',
        '================================',
        'Payment: {{paymentMethod}}',
        'Amount Paid: {{amountPaid}}',
        'Change: {{change}}',
        '',
        'Thank you for your order!',
        'Visit us again soon',
        '',
        '{{website}}',
        '{{phone}}'
      ]
    };
  }

  // ================================
  // Kitchen Order Templates
  // ================================

  getKitchenOrderThermalTemplate() {
    return {
      header: {
        align: 'center',
        bold: true,
        size: 'large',
        content: [
          '================================',
          '      KITCHEN ORDER',
          '================================'
        ]
      },
      orderInfo: {
        align: 'left',
        bold: true,
        content: [
          '',
          'Order #: {{orderNumber}}',
          'Table: {{tableNumber}}',
          'Time: {{orderTime}}',
          'Server: {{serverName}}',
          '================================'
        ]
      },
      items: {
        align: 'left',
        bold: false,
        content: [
          '{{#items}}',
          '{{quantity}}x {{name}}',
          '{{#modifiers}}',
          '   + {{name}}',
          '{{/modifiers}}',
          '{{#notes}}',
          '   NOTE: {{note}}',
          '{{/notes}}',
          '',
          '{{/items}}'
        ]
      },
      specialInstructions: {
        align: 'left',
        bold: true,
        content: [
          '================================',
          'SPECIAL INSTRUCTIONS:',
          '{{specialInstructions}}',
          '================================'
        ]
      },
      timing: {
        align: 'center',
        bold: true,
        content: [
          'Prep Time: {{prepTime}} mins',
          'Priority: {{priority}}',
          ''
        ]
      },
      cut: true,
      buzzer: true
    };
  }

  // ================================
  // Label Templates
  // ================================

  getLabelThermalTemplate() {
    return {
      header: {
        align: 'center',
        bold: true,
        content: [
          '{{productName}}'
        ]
      },
      body: {
        align: 'left',
        content: [
          'Price: {{price}}',
          'Category: {{category}}',
          'Date: {{date}}',
          'Exp: {{expiryDate}}'
        ]
      },
      barcode: {
        type: 'CODE128',
        data: '{{barcode}}',
        height: 50
      }
    };
  }

  // ================================
  // Template Processing
  // ================================

  /**
   * Get template by type and printer type
   */
  getTemplate(templateType, printerType = 'thermal') {
    const template = this.templates.get(templateType);
    if (!template) {
      throw new Error(`Template not found: ${templateType}`);
    }

    return template[printerType] || template.thermal || template.regular;
  }

  /**
   * Render template with data
   */
  renderTemplate(templateType, data, printerType = 'thermal') {
    const template = this.getTemplate(templateType, printerType);
    return this.processTemplate(template, data);
  }

  /**
   * Process template with data substitution
   */
  processTemplate(template, data) {
    if (typeof template === 'string') {
      return this.substituteVariables(template, data);
    }

    if (Array.isArray(template)) {
      return template.map(line => this.substituteVariables(line, data));
    }

    if (typeof template === 'object') {
      const processed = {};
      for (const [key, value] of Object.entries(template)) {
        if (typeof value === 'string') {
          processed[key] = this.substituteVariables(value, data);
        } else if (Array.isArray(value)) {
          processed[key] = value.map(line => this.substituteVariables(line, data));
        } else if (typeof value === 'object') {
          processed[key] = this.processTemplate(value, data);
        } else {
          processed[key] = value;
        }
      }
      return processed;
    }

    return template;
  }

  /**
   * Substitute template variables with actual data
   */
  substituteVariables(text, data) {
    if (typeof text !== 'string') return text;

    return text.replace(/\{\{([^}]+)\}\}/g, (match, key) => {
      const keys = key.split('.');
      let value = data;

      for (const k of keys) {
        if (value && typeof value === 'object' && k in value) {
          value = value[k];
        } else {
          return match; // Keep original placeholder if not found
        }
      }

      return value !== null && value !== undefined ? value.toString() : match;
    });
  }

  /**
   * Convert template to ESC/POS commands
   */
  templateToESCPOS(template, data) {
    const processed = this.processTemplate(template, data);
    return this.generateESCPOSFromTemplate(processed);
  }

  /**
   * Generate ESC/POS commands from processed template
   */
  generateESCPOSFromTemplate(template) {
    const ESC = '\x1b';
    const GS = '\x1d';
    let commands = '';

    // Initialize printer
    commands += ESC + '@'; // Initialize

    if (template.header) {
      commands += this.processTemplateSection(template.header, ESC, GS);
    }

    if (template.orderInfo) {
      commands += this.processTemplateSection(template.orderInfo, ESC, GS);
    }

    if (template.body) {
      commands += this.processTemplateSection(template.body, ESC, GS);
    }

    if (template.items) {
      commands += this.processTemplateSection(template.items, ESC, GS);
    }

    if (template.totals) {
      commands += this.processTemplateSection(template.totals, ESC, GS);
    }

    if (template.payment) {
      commands += this.processTemplateSection(template.payment, ESC, GS);
    }

    if (template.specialInstructions) {
      commands += this.processTemplateSection(template.specialInstructions, ESC, GS);
    }

    if (template.timing) {
      commands += this.processTemplateSection(template.timing, ESC, GS);
    }

    if (template.footer) {
      commands += this.processTemplateSection(template.footer, ESC, GS);
    }

    // Barcode
    if (template.barcode) {
      commands += this.generateBarcode(template.barcode, GS);
    }

    // Cut paper
    if (template.cut) {
      commands += GS + 'V' + String.fromCharCode(65) + String.fromCharCode(0); // Partial cut
    }

    // Sound buzzer
    if (template.buzzer) {
      commands += ESC + '(A' + String.fromCharCode(4, 0, 48, 55, 3, 15); // Buzzer
    }

    return commands;
  }

  processTemplateSection(section, ESC, GS) {
    let commands = '';

    // Set alignment
    if (section.align === 'center') {
      commands += ESC + 'a' + String.fromCharCode(1);
    } else if (section.align === 'right') {
      commands += ESC + 'a' + String.fromCharCode(2);
    } else {
      commands += ESC + 'a' + String.fromCharCode(0); // Left align
    }

    // Set text formatting
    if (section.bold) {
      commands += ESC + 'E' + String.fromCharCode(1); // Bold on
    }

    if (section.size === 'large') {
      commands += GS + '!' + String.fromCharCode(17); // Double width and height
    }

    // Add content
    if (Array.isArray(section.content)) {
      for (const line of section.content) {
        commands += line + '\n';
      }
    } else if (typeof section.content === 'string') {
      commands += section.content + '\n';
    }

    // Reset formatting
    commands += ESC + 'E' + String.fromCharCode(0); // Bold off
    commands += GS + '!' + String.fromCharCode(0); // Reset size
    commands += ESC + 'a' + String.fromCharCode(0); // Left align

    return commands;
  }

  generateBarcode(barcodeConfig, GS) {
    let commands = '';

    // Set barcode height
    commands += GS + 'h' + String.fromCharCode(barcodeConfig.height || 50);

    // Set barcode type (CODE128 = 73)
    const barcodeType = barcodeConfig.type === 'CODE128' ? 73 : 73;

    // Print barcode
    commands += GS + 'k' + String.fromCharCode(barcodeType);
    commands += String.fromCharCode(barcodeConfig.data.length);
    commands += barcodeConfig.data;

    return commands;
  }

  // ================================
  // Template Management
  // ================================

  /**
   * Add custom template
   */
  addTemplate(type, template) {
    this.templates.set(type, template);
  }

  /**
   * Get all template types
   */
  getTemplateTypes() {
    return Array.from(this.templates.keys());
  }

  /**
   * Get template info
   */
  getTemplateInfo(type) {
    const template = this.templates.get(type);
    return template ? {
      name: template.name,
      type: template.type,
      availableFormats: Object.keys(template).filter(key => !['name', 'type'].includes(key))
    } : null;
  }
}

module.exports = PrintTemplateService;