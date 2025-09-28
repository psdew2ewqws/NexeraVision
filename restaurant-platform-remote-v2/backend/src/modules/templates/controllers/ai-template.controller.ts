import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  Param,
  UseGuards,
  Logger,
  HttpException,
  HttpStatus
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiBearerAuth
} from '@nestjs/swagger';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { Roles } from '@/common/decorators/roles.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { AITemplateGeneratorService } from '../services/ai-template-generator.service';
import {
  AITemplateGenerationRequest,
  AITemplateGenerationResponse,
  TemplateOptimizationRequest,
  TemplateSuggestionRequest,
  TemplateFeedbackRequest,
  IndustryTemplate,
  Industry,
  PrintType
} from '../dto/ai-template.dto';

@ApiTags('AI Template Generation')
@Controller('templates/ai')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class AITemplateController {
  private readonly logger = new Logger(AITemplateController.name);

  constructor(
    private readonly aiTemplateService: AITemplateGeneratorService
  ) {}

  @Post('generate')
  @ApiOperation({
    summary: 'Generate AI-powered templates',
    description: 'Create optimized templates based on business description and requirements'
  })
  @ApiResponse({
    status: 201,
    description: 'Templates generated successfully',
    type: AITemplateGenerationResponse
  })
  @ApiResponse({ status: 400, description: 'Invalid request parameters' })
  @ApiResponse({ status: 500, description: 'Template generation failed' })
  @Roles('company_owner', 'branch_manager', 'super_admin')
  async generateTemplate(
    @Body() request: AITemplateGenerationRequest,
    @CurrentUser() user: any
  ): Promise<AITemplateGenerationResponse> {
    try {
      this.logger.log(`Generating AI template for user: ${user.id}, business: ${request.industry}`);

      // Set user context
      request.userId = user.id;
      request.companyId = user.companyId;

      const result = await this.aiTemplateService.generateTemplate(request);

      this.logger.log(`Generated ${result.templates.length} templates in ${result.generationTime}ms`);

      return result;
    } catch (error) {
      this.logger.error(`Template generation failed: ${error.message}`, error.stack);
      throw new HttpException(
        `Template generation failed: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Post('optimize')
  @ApiOperation({
    summary: 'Optimize existing template',
    description: 'Apply AI optimizations to improve template performance'
  })
  @ApiResponse({ status: 200, description: 'Template optimized successfully' })
  @ApiResponse({ status: 404, description: 'Template not found' })
  @Roles('company_owner', 'branch_manager', 'super_admin')
  async optimizeTemplate(
    @Body() request: TemplateOptimizationRequest,
    @CurrentUser() user: any
  ): Promise<any> {
    try {
      this.logger.log(`Optimizing template: ${request.templateId} for user: ${user.id}`);

      request.userId = user.id;

      const result = await this.aiTemplateService.optimizeTemplate(request);

      this.logger.log(`Template optimized with ${result.optimizations.length} improvements`);

      return {
        success: true,
        data: result,
        message: 'Template optimized successfully'
      };
    } catch (error) {
      this.logger.error(`Template optimization failed: ${error.message}`, error.stack);
      throw new HttpException(
        `Template optimization failed: ${error.message}`,
        error.message.includes('not found') ? HttpStatus.NOT_FOUND : HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('suggestions')
  @ApiOperation({
    summary: 'Get industry-specific template suggestions',
    description: 'Retrieve curated templates based on industry and print type'
  })
  @ApiQuery({ name: 'industry', enum: Industry, required: true })
  @ApiQuery({ name: 'type', enum: PrintType, required: true })
  @ApiQuery({ name: 'limit', type: Number, required: false, example: 10 })
  @ApiResponse({
    status: 200,
    description: 'Template suggestions retrieved successfully',
    type: [IndustryTemplate]
  })
  async getTemplateSuggestions(
    @Query() query: TemplateSuggestionRequest,
    @CurrentUser() user: any
  ): Promise<{ templates: IndustryTemplate[]; totalCount: number }> {
    try {
      this.logger.log(`Getting template suggestions for ${query.industry}/${query.type}`);

      query.companyId = user.companyId;

      const suggestions = await this.getIndustryTemplates(query);

      return {
        templates: suggestions,
        totalCount: suggestions.length
      };
    } catch (error) {
      this.logger.error(`Failed to get template suggestions: ${error.message}`, error.stack);
      throw new HttpException(
        'Failed to retrieve template suggestions',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Post('feedback')
  @ApiOperation({
    summary: 'Submit template feedback',
    description: 'Provide feedback on template performance for AI learning'
  })
  @ApiResponse({ status: 201, description: 'Feedback submitted successfully' })
  @ApiResponse({ status: 404, description: 'Template not found' })
  async submitFeedback(
    @Body() feedback: TemplateFeedbackRequest,
    @CurrentUser() user: any
  ): Promise<{ success: boolean; message: string }> {
    try {
      this.logger.log(`Receiving feedback for template: ${feedback.templateId}`);

      feedback.userId = user.id;

      await this.processFeedback(feedback);

      return {
        success: true,
        message: 'Feedback submitted successfully'
      };
    } catch (error) {
      this.logger.error(`Failed to submit feedback: ${error.message}`, error.stack);
      throw new HttpException(
        'Failed to submit feedback',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('analytics/:templateId')
  @ApiOperation({
    summary: 'Get template analytics',
    description: 'Retrieve performance analytics for a specific template'
  })
  @ApiResponse({ status: 200, description: 'Analytics retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Template not found' })
  @Roles('company_owner', 'branch_manager', 'super_admin')
  async getTemplateAnalytics(
    @Param('templateId') templateId: string,
    @CurrentUser() user: any
  ): Promise<any> {
    try {
      this.logger.log(`Getting analytics for template: ${templateId}`);

      const analytics = await this.getAnalyticsData(templateId, user.companyId);

      return {
        success: true,
        data: analytics
      };
    } catch (error) {
      this.logger.error(`Failed to get analytics: ${error.message}`, error.stack);
      throw new HttpException(
        error.message.includes('not found') ? 'Template not found' : 'Failed to retrieve analytics',
        error.message.includes('not found') ? HttpStatus.NOT_FOUND : HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('trends')
  @ApiOperation({
    summary: 'Get AI template generation trends',
    description: 'Retrieve insights about template generation patterns'
  })
  @ApiResponse({ status: 200, description: 'Trends retrieved successfully' })
  @Roles('company_owner', 'super_admin')
  async getGenerationTrends(
    @CurrentUser() user: any
  ): Promise<any> {
    try {
      this.logger.log(`Getting generation trends for company: ${user.companyId}`);

      const trends = await this.getGenerationTrendsData(user.companyId);

      return {
        success: true,
        data: trends
      };
    } catch (error) {
      this.logger.error(`Failed to get trends: ${error.message}`, error.stack);
      throw new HttpException(
        'Failed to retrieve generation trends',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Get industry-specific template suggestions
   */
  private async getIndustryTemplates(query: TemplateSuggestionRequest): Promise<IndustryTemplate[]> {
    // Mock data for now - would be replaced with actual database queries
    const mockTemplates: IndustryTemplate[] = [
      {
        id: 'template_restaurant_receipt_classic',
        name: 'Classic Restaurant Receipt',
        description: 'Traditional receipt layout optimized for restaurants',
        industry: Industry.RESTAURANT,
        printType: PrintType.RECEIPT,
        popularityScore: 0.95,
        usageCount: 15420,
        averageRating: 4.7,
        tags: ['classic', 'professional', 'fast-print']
      },
      {
        id: 'template_restaurant_receipt_modern',
        name: 'Modern Restaurant Receipt',
        description: 'Contemporary design with QR codes and social media',
        industry: Industry.RESTAURANT,
        printType: PrintType.RECEIPT,
        popularityScore: 0.88,
        usageCount: 8930,
        averageRating: 4.5,
        tags: ['modern', 'qr-code', 'social-media']
      },
      {
        id: 'template_retail_invoice_professional',
        name: 'Professional Retail Invoice',
        description: 'Business-grade invoice template for retail operations',
        industry: Industry.RETAIL,
        printType: PrintType.INVOICE,
        popularityScore: 0.92,
        usageCount: 12350,
        averageRating: 4.6,
        tags: ['professional', 'detailed', 'tax-compliant']
      }
    ];

    // Filter by industry and type
    const filtered = mockTemplates.filter(template =>
      template.industry === query.industry && template.printType === query.type
    );

    // Apply limit
    const limit = query.limit || 10;
    return filtered.slice(0, limit);
  }

  /**
   * Process user feedback
   */
  private async processFeedback(feedback: TemplateFeedbackRequest): Promise<void> {
    // Here we would:
    // 1. Store feedback in database
    // 2. Update template analytics
    // 3. Train AI model with feedback data
    // 4. Generate insights for template improvements

    this.logger.log(`Processing feedback: Rating ${feedback.rating}/5 for template ${feedback.templateId}`);

    // Mock processing
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  /**
   * Get analytics data for a template
   */
  private async getAnalyticsData(templateId: string, companyId: string): Promise<any> {
    // Mock analytics data
    const mockAnalytics = {
      templateId,
      usageStats: {
        totalUsage: 1250,
        lastWeekUsage: 85,
        successRate: 0.97,
        averagePrintTime: 2.3
      },
      userFeedback: {
        averageRating: 4.5,
        totalReviews: 42,
        satisfactionScore: 0.89
      },
      performance: {
        printSpeed: 'Fast',
        reliability: 'Excellent',
        costEfficiency: 'Good',
        userExperience: 'Very Good'
      },
      trends: {
        usageGrowth: 0.15,
        ratingTrend: 0.03,
        popularityRank: 3
      },
      recommendations: [
        'Consider optimizing for mobile printing',
        'Add more customization options',
        'Improve color contrast for better readability'
      ]
    };

    return mockAnalytics;
  }

  /**
   * Get generation trends data
   */
  private async getGenerationTrendsData(companyId: string): Promise<any> {
    // Mock trends data
    const mockTrends = {
      overview: {
        totalGenerations: 245,
        successRate: 0.94,
        averageGenerationTime: 3200,
        mostPopularIndustry: 'restaurant'
      },
      industryBreakdown: {
        restaurant: { count: 98, rating: 4.6 },
        retail: { count: 76, rating: 4.4 },
        service: { count: 45, rating: 4.3 },
        healthcare: { count: 26, rating: 4.7 }
      },
      printTypeBreakdown: {
        receipt: { count: 156, satisfaction: 0.91 },
        invoice: { count: 67, satisfaction: 0.89 },
        label: { count: 22, satisfaction: 0.86 }
      },
      monthlyTrends: [
        { month: 'Jan', generations: 45, success: 0.92 },
        { month: 'Feb', generations: 52, success: 0.94 },
        { month: 'Mar', generations: 61, success: 0.95 },
        { month: 'Apr', generations: 87, success: 0.96 }
      ],
      topOptimizations: [
        { type: 'readability', count: 34, improvement: 0.18 },
        { type: 'print_speed', count: 28, improvement: 0.15 },
        { type: 'cost_efficiency', count: 19, improvement: 0.12 }
      ],
      userSatisfaction: {
        overall: 4.5,
        easeOfUse: 4.6,
        templateQuality: 4.4,
        generationSpeed: 4.3
      }
    };

    return mockTrends;
  }
}