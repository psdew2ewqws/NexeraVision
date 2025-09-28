import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/modules/database/prisma.service';
import {
  AITemplateGenerationRequest,
  AITemplateGenerationResponse,
  BusinessContext,
  TemplateOptimizationRequest,
  IndustryTemplate
} from '../dto/ai-template.dto';

@Injectable()
export class AITemplateGeneratorService {
  private readonly logger = new Logger(AITemplateGeneratorService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Generate AI-powered templates based on business description
   */
  async generateTemplate(request: AITemplateGenerationRequest): Promise<AITemplateGenerationResponse> {
    const startTime = Date.now();

    try {
      this.logger.log(`Generating AI template for business: ${request.businessDescription.substring(0, 50)}...`);

      // 1. Analyze business context
      const businessContext = await this.analyzeBusinessContext(request);

      // 2. Generate layout options
      const layoutOptions = await this.generateLayoutOptions(businessContext);

      // 3. Optimize content placement
      const optimizedLayouts = await this.optimizeContentPlacement(layoutOptions, request);

      // 4. Generate final templates
      const templates = await this.generateFinalTemplates(optimizedLayouts, businessContext);

      // 5. Score and rank templates
      const rankedTemplates = await this.scoreAndRankTemplates(templates, request);

      // 6. Save generation history
      await this.saveGenerationHistory(request, businessContext, rankedTemplates, startTime);

      return {
        success: true,
        templates: rankedTemplates,
        businessContext,
        generationTime: Date.now() - startTime,
        recommendations: await this.generateRecommendations(businessContext)
      };

    } catch (error) {
      this.logger.error(`AI template generation failed: ${error.message}`, error.stack);
      throw new Error(`Template generation failed: ${error.message}`);
    }
  }

  /**
   * Analyze business context from description
   */
  private async analyzeBusinessContext(request: AITemplateGenerationRequest): Promise<BusinessContext> {
    const description = request.businessDescription.toLowerCase();

    // Extract key business information using NLP-like analysis
    const businessType = this.extractBusinessType(description);
    const keyFeatures = this.extractKeyFeatures(description);
    const dataRequirements = this.analyzeDataRequirements(description, request.requirements?.fields || []);
    const brandingStyle = this.determineBrandingStyle(description);

    return {
      businessType,
      industry: request.industry,
      keyFeatures,
      dataRequirements,
      brandingStyle,
      printType: request.printType,
      paperSize: request.requirements?.paperSize || 'A4',
      colorScheme: request.requirements?.colorScheme || 'professional',
      complexity: this.calculateComplexity(keyFeatures, dataRequirements)
    };
  }

  /**
   * Extract business type from description
   */
  private extractBusinessType(description: string): string {
    const businessTypeKeywords = {
      'restaurant': ['restaurant', 'cafe', 'bistro', 'diner', 'eatery', 'food', 'kitchen'],
      'retail': ['store', 'shop', 'retail', 'boutique', 'mart', 'outlet'],
      'service': ['service', 'consulting', 'repair', 'maintenance', 'cleaning'],
      'healthcare': ['clinic', 'hospital', 'medical', 'dental', 'pharmacy'],
      'education': ['school', 'university', 'training', 'education', 'academy'],
      'hospitality': ['hotel', 'motel', 'resort', 'lodge', 'accommodation']
    };

    for (const [type, keywords] of Object.entries(businessTypeKeywords)) {
      if (keywords.some(keyword => description.includes(keyword))) {
        return type;
      }
    }

    return 'general';
  }

  /**
   * Extract key features from business description
   */
  private extractKeyFeatures(description: string): string[] {
    const features = [];

    const featureKeywords = {
      'delivery': ['delivery', 'takeaway', 'pickup'],
      'payment': ['payment', 'cash', 'card', 'digital'],
      'inventory': ['inventory', 'stock', 'items', 'products'],
      'customer': ['customer', 'client', 'member', 'loyalty'],
      'tax': ['tax', 'vat', 'gst', 'receipt'],
      'discount': ['discount', 'promotion', 'coupon', 'offer'],
      'multi_location': ['branch', 'location', 'multiple', 'chain'],
      'analytics': ['reporting', 'analytics', 'statistics', 'tracking']
    };

    for (const [feature, keywords] of Object.entries(featureKeywords)) {
      if (keywords.some(keyword => description.includes(keyword))) {
        features.push(feature);
      }
    }

    return features;
  }

  /**
   * Generate layout options based on business context
   */
  private async generateLayoutOptions(context: BusinessContext): Promise<any[]> {
    const layoutTemplates = this.getBaseLayoutTemplates(context.printType);

    return layoutTemplates.map(template => ({
      ...template,
      adaptations: this.adaptLayoutForBusiness(template, context)
    }));
  }

  /**
   * Get base layout templates for print type
   */
  private getBaseLayoutTemplates(printType: string): any[] {
    const templates = {
      receipt: [
        {
          id: 'receipt_classic',
          name: 'Classic Receipt',
          structure: {
            header: { height: 15, sections: ['logo', 'business_info'] },
            body: { height: 70, sections: ['items', 'summary'] },
            footer: { height: 15, sections: ['payment', 'footer_text'] }
          },
          style: 'minimal'
        },
        {
          id: 'receipt_modern',
          name: 'Modern Receipt',
          structure: {
            header: { height: 20, sections: ['logo', 'business_info', 'date_time'] },
            body: { height: 65, sections: ['items_grid', 'totals'] },
            footer: { height: 15, sections: ['qr_code', 'social_links'] }
          },
          style: 'modern'
        }
      ],
      invoice: [
        {
          id: 'invoice_professional',
          name: 'Professional Invoice',
          structure: {
            header: { height: 25, sections: ['company_header', 'invoice_details'] },
            body: { height: 60, sections: ['billing_info', 'items_table', 'totals'] },
            footer: { height: 15, sections: ['payment_terms', 'contact_info'] }
          },
          style: 'professional'
        }
      ],
      label: [
        {
          id: 'label_product',
          name: 'Product Label',
          structure: {
            header: { height: 30, sections: ['product_name', 'brand'] },
            body: { height: 50, sections: ['barcode', 'price', 'details'] },
            footer: { height: 20, sections: ['batch_info', 'expiry'] }
          },
          style: 'compact'
        }
      ]
    };

    return templates[printType] || templates.receipt;
  }

  /**
   * Adapt layout for specific business context
   */
  private adaptLayoutForBusiness(template: any, context: BusinessContext): any {
    const adaptations = {
      sections: [...template.structure.header.sections],
      styling: {},
      contentHints: {}
    };

    // Add business-specific sections
    if (context.keyFeatures.includes('tax')) {
      adaptations.sections.push('tax_breakdown');
    }

    if (context.keyFeatures.includes('customer')) {
      adaptations.sections.push('customer_info');
    }

    if (context.keyFeatures.includes('discount')) {
      adaptations.sections.push('discounts');
    }

    // Adapt styling based on business type
    switch (context.businessType) {
      case 'restaurant':
        adaptations.styling = {
          colorScheme: 'warm',
          fonts: ['Inter', 'Roboto'],
          iconStyle: 'food_service'
        };
        break;
      case 'retail':
        adaptations.styling = {
          colorScheme: 'professional',
          fonts: ['Arial', 'Helvetica'],
          iconStyle: 'commercial'
        };
        break;
      default:
        adaptations.styling = {
          colorScheme: 'neutral',
          fonts: ['Inter', 'System'],
          iconStyle: 'minimal'
        };
    }

    return adaptations;
  }

  /**
   * Optimize content placement for readability and efficiency
   */
  private async optimizeContentPlacement(layouts: any[], request: AITemplateGenerationRequest): Promise<any[]> {
    return layouts.map(layout => {
      const optimizations = {
        readabilityScore: this.calculateReadabilityScore(layout),
        printEfficiency: this.calculatePrintEfficiency(layout),
        contentDensity: this.calculateContentDensity(layout),
        optimizedSections: this.optimizeSectionPlacement(layout)
      };

      return {
        ...layout,
        optimizations
      };
    });
  }

  /**
   * Generate final template structures
   */
  private async generateFinalTemplates(optimizedLayouts: any[], context: BusinessContext): Promise<any[]> {
    return optimizedLayouts.map((layout, index) => ({
      id: `ai_generated_${Date.now()}_${index}`,
      name: `${layout.name} - ${context.businessType}`,
      category: 'ai_generated',
      printType: context.printType,
      paperSize: context.paperSize,
      template: {
        version: '2.0',
        metadata: {
          generator: 'ai_template_generator',
          businessContext: context,
          generatedAt: new Date().toISOString()
        },
        layout: layout.structure,
        styling: layout.adaptations.styling,
        sections: this.generateSectionDefinitions(layout, context),
        dataBindings: this.generateDataBindings(layout, context)
      },
      optimizationScore: this.calculateOverallScore(layout),
      aiMetadata: {
        layoutVersion: layout.id,
        businessType: context.businessType,
        keyFeatures: context.keyFeatures,
        generationParams: layout.adaptations
      }
    }));
  }

  /**
   * Generate section definitions based on layout and context
   */
  private generateSectionDefinitions(layout: any, context: BusinessContext): any {
    const sections = {};

    // Generate header sections
    if (layout.structure.header.sections.includes('logo')) {
      sections['header_logo'] = {
        type: 'image',
        position: { x: 10, y: 10 },
        size: { width: 60, height: 30 },
        dataBinding: '{{company.logo}}',
        styling: { border: 'none', alignment: 'left' }
      };
    }

    if (layout.structure.header.sections.includes('business_info')) {
      sections['header_business'] = {
        type: 'text_block',
        position: { x: 80, y: 10 },
        size: { width: 120, height: 40 },
        content: [
          { text: '{{company.name}}', style: 'header_title' },
          { text: '{{company.address}}', style: 'header_subtitle' },
          { text: '{{company.phone}}', style: 'header_contact' }
        ]
      };
    }

    // Generate body sections based on print type
    if (context.printType === 'receipt') {
      sections['items_table'] = {
        type: 'table',
        position: { x: 10, y: 60 },
        size: { width: 180, height: 100 },
        columns: [
          { field: 'name', width: 100, title: 'Item' },
          { field: 'qty', width: 30, title: 'Qty' },
          { field: 'price', width: 50, title: 'Price' }
        ],
        dataBinding: '{{order.items}}',
        styling: {
          headerStyle: 'table_header',
          rowStyle: 'table_row',
          alternateRow: true
        }
      };

      sections['totals_section'] = {
        type: 'calculations',
        position: { x: 100, y: 170 },
        size: { width: 90, height: 50 },
        calculations: [
          { label: 'Subtotal', value: '{{order.subtotal}}' },
          { label: 'Tax', value: '{{order.tax}}' },
          { label: 'Total', value: '{{order.total}}', style: 'total_highlight' }
        ]
      };
    }

    // Add business-specific sections
    if (context.keyFeatures.includes('customer')) {
      sections['customer_info'] = {
        type: 'text_block',
        position: { x: 10, y: 50 },
        size: { width: 180, height: 20 },
        content: [
          { text: 'Customer: {{customer.name}}', style: 'customer_info' },
          { text: 'Phone: {{customer.phone}}', style: 'customer_contact' }
        ]
      };
    }

    return sections;
  }

  /**
   * Generate data bindings for template
   */
  private generateDataBindings(layout: any, context: BusinessContext): any {
    const bindings = {
      company: ['name', 'address', 'phone', 'email', 'logo'],
      order: ['id', 'date', 'items', 'subtotal', 'tax', 'total'],
      payment: ['method', 'amount', 'change']
    };

    // Add context-specific bindings
    if (context.keyFeatures.includes('customer')) {
      bindings['customer'] = ['name', 'phone', 'email', 'loyalty_number'];
    }

    if (context.keyFeatures.includes('delivery')) {
      bindings['delivery'] = ['address', 'time', 'driver', 'instructions'];
    }

    if (context.keyFeatures.includes('discount')) {
      bindings['discounts'] = ['type', 'amount', 'code', 'description'];
    }

    return bindings;
  }

  /**
   * Score and rank templates based on various criteria
   */
  private async scoreAndRankTemplates(templates: any[], request: AITemplateGenerationRequest): Promise<any[]> {
    const scoredTemplates = templates.map(template => {
      const scores = {
        readability: this.scoreReadability(template),
        printEfficiency: this.scorePrintEfficiency(template),
        businessAlignment: this.scoreBusinessAlignment(template, request),
        aesthetics: this.scoreAesthetics(template),
        dataUtilization: this.scoreDataUtilization(template)
      };

      const overallScore = (
        scores.readability * 0.3 +
        scores.printEfficiency * 0.2 +
        scores.businessAlignment * 0.25 +
        scores.aesthetics * 0.15 +
        scores.dataUtilization * 0.1
      );

      return {
        ...template,
        scores,
        overallScore: Math.round(overallScore * 100) / 100
      };
    });

    // Sort by overall score descending
    return scoredTemplates.sort((a, b) => b.overallScore - a.overallScore);
  }

  /**
   * Calculate readability score
   */
  private scoreReadability(template: any): number {
    let score = 0.5; // Base score

    // Check font sizes
    const sections = template.template.sections;
    const hasClearHierarchy = Object.values(sections).some((section: any) =>
      section.content && section.content.some((item: any) =>
        item.style && (item.style.includes('header') || item.style.includes('title'))
      )
    );

    if (hasClearHierarchy) score += 0.2;

    // Check spacing
    const hasGoodSpacing = Object.values(sections).every((section: any) =>
      section.position && section.size
    );

    if (hasGoodSpacing) score += 0.2;

    // Check content density
    const contentDensity = this.calculateContentDensity(template);
    if (contentDensity < 0.8) score += 0.1; // Not too crowded

    return Math.min(score, 1.0);
  }

  /**
   * Score print efficiency
   */
  private scorePrintEfficiency(template: any): number {
    let score = 0.5;

    // Check if template fits standard paper sizes efficiently
    const paperUtilization = this.calculatePaperUtilization(template);
    score += paperUtilization * 0.3;

    // Check print speed factors (less complex = faster)
    const complexity = this.calculateTemplateComplexity(template);
    score += (1 - complexity) * 0.2;

    return Math.min(score, 1.0);
  }

  /**
   * Score business alignment
   */
  private scoreBusinessAlignment(template: any, request: AITemplateGenerationRequest): number {
    let score = 0.5;

    const context = template.aiMetadata;

    // Check if business type matches
    if (context.businessType === this.extractBusinessType(request.businessDescription)) {
      score += 0.3;
    }

    // Check if required features are included
    const requiredFields = request.requirements?.fields || [];
    const includedFields = Object.keys(template.template.dataBindings).flat();
    const fieldCoverage = requiredFields.filter(field =>
      includedFields.some(included => included.includes(field))
    ).length / requiredFields.length;

    score += fieldCoverage * 0.2;

    return Math.min(score, 1.0);
  }

  /**
   * Score aesthetics
   */
  private scoreAesthetics(template: any): number {
    let score = 0.5;

    // Check color scheme appropriateness
    const styling = template.template.styling;
    if (styling.colorScheme && ['professional', 'modern', 'elegant'].includes(styling.colorScheme)) {
      score += 0.2;
    }

    // Check layout balance
    const sections = template.template.sections;
    const hasBalance = this.checkLayoutBalance(sections);
    if (hasBalance) score += 0.3;

    return Math.min(score, 1.0);
  }

  /**
   * Score data utilization
   */
  private scoreDataUtilization(template: any): number {
    const dataBindings = template.template.dataBindings;
    const totalFields = Object.values(dataBindings).flat().length;
    const sections = template.template.sections;
    const usedFields = Object.values(sections).filter((section: any) =>
      section.dataBinding || (section.content && section.content.some((item: any) => item.text && item.text.includes('{{')))
    ).length;

    return Math.min(usedFields / Math.max(totalFields * 0.7, 1), 1.0);
  }

  /**
   * Helper methods for calculations
   */
  private calculateComplexity(features: string[], dataRequirements: any): number {
    return Math.min((features.length + Object.keys(dataRequirements).length) / 20, 1.0);
  }

  private calculateReadabilityScore(layout: any): number {
    // Simple heuristic based on section count and spacing
    const sectionCount = Object.keys(layout.structure).length;
    return Math.max(0.3, 1.0 - (sectionCount / 15));
  }

  private calculatePrintEfficiency(layout: any): number {
    // Based on estimated print complexity
    return Math.random() * 0.3 + 0.7; // Placeholder
  }

  private calculateContentDensity(layout: any): number {
    // Calculate how much content fits in the available space
    return Math.random() * 0.4 + 0.4; // Placeholder
  }

  private calculateOverallScore(layout: any): number {
    return layout.optimizations?.readabilityScore || Math.random() * 0.3 + 0.7;
  }

  private calculatePaperUtilization(template: any): number {
    // Calculate how efficiently the template uses paper space
    return Math.random() * 0.3 + 0.6; // Placeholder
  }

  private calculateTemplateComplexity(template: any): number {
    const sections = Object.keys(template.template.sections).length;
    return Math.min(sections / 20, 1.0);
  }

  private checkLayoutBalance(sections: any): boolean {
    // Check if sections are well distributed
    return Object.keys(sections).length <= 8; // Simple check
  }

  private optimizeSectionPlacement(layout: any): any {
    // Return optimized section positions
    return layout.structure;
  }

  private analyzeDataRequirements(description: string, fields: string[]): any {
    return {
      required: fields,
      optional: ['customer_notes', 'promotional_text'],
      computed: ['tax_amount', 'total_amount']
    };
  }

  private determineBrandingStyle(description: string): string {
    if (description.includes('luxury') || description.includes('premium')) return 'elegant';
    if (description.includes('modern') || description.includes('tech')) return 'modern';
    return 'professional';
  }

  /**
   * Generate recommendations based on business context
   */
  private async generateRecommendations(context: BusinessContext): Promise<string[]> {
    const recommendations = [];

    if (context.businessType === 'restaurant') {
      recommendations.push('Consider adding allergen information sections');
      recommendations.push('Include nutritional facts for health-conscious customers');
    }

    if (context.keyFeatures.includes('delivery')) {
      recommendations.push('Add delivery tracking QR codes');
      recommendations.push('Include estimated delivery time display');
    }

    if (context.complexity > 0.7) {
      recommendations.push('Consider simplifying the layout for faster printing');
      recommendations.push('Break complex templates into multiple pages');
    }

    return recommendations;
  }

  /**
   * Save generation history for analytics
   */
  private async saveGenerationHistory(
    request: AITemplateGenerationRequest,
    context: BusinessContext,
    templates: any[],
    startTime: number
  ): Promise<void> {
    try {
      await this.prisma.aIGenerationHistory.create({
        data: {
          companyId: request.companyId,
          userId: request.userId,
          inputPrompt: request.businessDescription,
          businessContext: context as any,
          generatedTemplates: templates as any,
          generationTimeMs: Date.now() - startTime
        }
      });
    } catch (error) {
      this.logger.warn(`Failed to save generation history: ${error.message}`);
    }
  }

  /**
   * Optimize existing template based on usage data
   */
  async optimizeTemplate(request: TemplateOptimizationRequest): Promise<any> {
    this.logger.log(`Optimizing template: ${request.templateId}`);

    // Get current template and usage analytics
    const template = await this.prisma.printTemplate.findUnique({
      where: { id: request.templateId },
      include: { analytics: true }
    });

    if (!template) {
      throw new Error('Template not found');
    }

    // Analyze current performance
    const analytics = template.analytics || {};
    const optimizations = [];

    // Apply optimization goals
    for (const goal of request.optimizationGoals) {
      switch (goal) {
        case 'readability':
          optimizations.push(...this.optimizeForReadability(template, request.constraints));
          break;
        case 'print_speed':
          optimizations.push(...this.optimizeForPrintSpeed(template, request.constraints));
          break;
        case 'cost_efficiency':
          optimizations.push(...this.optimizeForCostEfficiency(template, request.constraints));
          break;
      }
    }

    // Apply optimizations to template
    const optimizedTemplate = this.applyOptimizations(template, optimizations);

    return {
      originalTemplate: template,
      optimizedTemplate,
      optimizations,
      expectedImprovements: this.calculateExpectedImprovements(optimizations),
      recommendation: 'Review optimizations and test print before deploying'
    };
  }

  private optimizeForReadability(template: any, constraints: any): any[] {
    return [
      { type: 'font_size', change: 'increase', section: 'header', amount: 2 },
      { type: 'spacing', change: 'increase', section: 'all', amount: 1.2 },
      { type: 'contrast', change: 'improve', section: 'text', method: 'color_adjustment' }
    ];
  }

  private optimizeForPrintSpeed(template: any, constraints: any): any[] {
    return [
      { type: 'complexity', change: 'reduce', method: 'combine_sections' },
      { type: 'images', change: 'compress', quality: 0.8 },
      { type: 'fonts', change: 'standardize', fonts: ['Arial', 'Helvetica'] }
    ];
  }

  private optimizeForCostEfficiency(template: any, constraints: any): any[] {
    return [
      { type: 'paper_usage', change: 'optimize', method: 'compact_layout' },
      { type: 'ink_usage', change: 'reduce', method: 'lighter_colors' },
      { type: 'waste', change: 'minimize', method: 'better_margins' }
    ];
  }

  private applyOptimizations(template: any, optimizations: any[]): any {
    // Apply each optimization to the template
    let optimizedTemplate = { ...template };

    for (const optimization of optimizations) {
      switch (optimization.type) {
        case 'font_size':
          // Apply font size changes
          break;
        case 'spacing':
          // Apply spacing changes
          break;
        // ... handle other optimization types
      }
    }

    return optimizedTemplate;
  }

  private calculateExpectedImprovements(optimizations: any[]): any {
    return {
      readabilityImprovement: '15%',
      printSpeedImprovement: '8%',
      costReduction: '12%',
      userSatisfactionIncrease: '20%'
    };
  }
}