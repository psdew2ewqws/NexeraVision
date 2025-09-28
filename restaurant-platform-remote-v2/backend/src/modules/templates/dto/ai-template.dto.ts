import { IsString, IsOptional, IsArray, IsEnum, IsObject, ValidateNested, IsNumber, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum PrintType {
  RECEIPT = 'receipt',
  INVOICE = 'invoice',
  LABEL = 'label',
  REPORT = 'report',
  TICKET = 'ticket'
}

export enum Industry {
  RESTAURANT = 'restaurant',
  RETAIL = 'retail',
  HEALTHCARE = 'healthcare',
  EDUCATION = 'education',
  SERVICE = 'service',
  HOSPITALITY = 'hospitality',
  MANUFACTURING = 'manufacturing',
  GENERAL = 'general'
}

export enum OptimizationGoal {
  READABILITY = 'readability',
  PRINT_SPEED = 'print_speed',
  COST_EFFICIENCY = 'cost_efficiency',
  USER_EXPERIENCE = 'user_experience'
}

export class TemplateRequirements {
  @ApiPropertyOptional({ example: 'A4' })
  @IsOptional()
  @IsString()
  paperSize?: string;

  @ApiPropertyOptional({ example: 'professional' })
  @IsOptional()
  @IsString()
  colorScheme?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  branding?: boolean;

  @ApiPropertyOptional({ example: ['customer_name', 'order_items', 'total_amount'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  fields?: string[];

  @ApiPropertyOptional({ example: { maxColors: 3, fontSizeMin: 8 } })
  @IsOptional()
  @IsObject()
  constraints?: Record<string, any>;
}

export class AITemplateGenerationRequest {
  @ApiProperty({ example: 'A modern coffee shop with delivery service and loyalty program' })
  @IsString()
  businessDescription: string;

  @ApiProperty({ enum: Industry, example: Industry.RESTAURANT })
  @IsEnum(Industry)
  industry: Industry;

  @ApiProperty({ enum: PrintType, example: PrintType.RECEIPT })
  @IsEnum(PrintType)
  printType: PrintType;

  @ApiPropertyOptional()
  @IsOptional()
  @ValidateNested()
  @Type(() => TemplateRequirements)
  requirements?: TemplateRequirements;

  @ApiProperty({ example: 'company-uuid-123' })
  @IsString()
  companyId: string;

  @ApiProperty({ example: 'user-uuid-456' })
  @IsString()
  userId: string;
}

export class BusinessContext {
  @ApiProperty()
  businessType: string;

  @ApiProperty({ enum: Industry })
  industry: Industry;

  @ApiProperty({ type: [String] })
  keyFeatures: string[];

  @ApiProperty()
  dataRequirements: {
    required: string[];
    optional: string[];
    computed: string[];
  };

  @ApiProperty()
  brandingStyle: string;

  @ApiProperty({ enum: PrintType })
  printType: PrintType;

  @ApiProperty()
  paperSize: string;

  @ApiProperty()
  colorScheme: string;

  @ApiProperty()
  complexity: number;
}

export class GeneratedTemplate {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  category: string;

  @ApiProperty({ enum: PrintType })
  printType: PrintType;

  @ApiProperty()
  paperSize: string;

  @ApiProperty()
  template: {
    version: string;
    metadata: any;
    layout: any;
    styling: any;
    sections: any;
    dataBindings: any;
  };

  @ApiProperty()
  optimizationScore: number;

  @ApiProperty()
  aiMetadata: {
    layoutVersion: string;
    businessType: string;
    keyFeatures: string[];
    generationParams: any;
  };

  @ApiProperty()
  scores: {
    readability: number;
    printEfficiency: number;
    businessAlignment: number;
    aesthetics: number;
    dataUtilization: number;
  };

  @ApiProperty()
  overallScore: number;
}

export class AITemplateGenerationResponse {
  @ApiProperty()
  success: boolean;

  @ApiProperty({ type: [GeneratedTemplate] })
  templates: GeneratedTemplate[];

  @ApiProperty()
  businessContext: BusinessContext;

  @ApiProperty()
  generationTime: number;

  @ApiProperty({ type: [String] })
  recommendations: string[];
}

export class OptimizationConstraints {
  @ApiPropertyOptional({ example: 210 })
  @IsOptional()
  @IsNumber()
  maxWidth?: number;

  @ApiPropertyOptional({ example: 297 })
  @IsOptional()
  @IsNumber()
  maxHeight?: number;

  @ApiPropertyOptional({ example: ['black', 'white'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  colorLimitations?: string[];

  @ApiPropertyOptional({ example: 8 })
  @IsOptional()
  @IsNumber()
  minFontSize?: number;

  @ApiPropertyOptional({ example: 5 })
  @IsOptional()
  @IsNumber()
  maxSections?: number;
}

export class TemplateOptimizationRequest {
  @ApiProperty({ example: 'template-uuid-123' })
  @IsString()
  templateId: string;

  @ApiProperty({
    type: [String],
    enum: OptimizationGoal,
    example: [OptimizationGoal.READABILITY, OptimizationGoal.PRINT_SPEED]
  })
  @IsArray()
  @IsEnum(OptimizationGoal, { each: true })
  optimizationGoals: OptimizationGoal[];

  @ApiPropertyOptional()
  @IsOptional()
  @ValidateNested()
  @Type(() => OptimizationConstraints)
  constraints?: OptimizationConstraints;

  @ApiPropertyOptional({ example: 'user-uuid-456' })
  @IsOptional()
  @IsString()
  userId?: string;
}

export class TemplateSuggestionRequest {
  @ApiProperty({ enum: Industry, example: Industry.RESTAURANT })
  @IsEnum(Industry)
  industry: Industry;

  @ApiProperty({ enum: PrintType, example: PrintType.RECEIPT })
  @IsEnum(PrintType)
  type: PrintType;

  @ApiPropertyOptional({ example: 10 })
  @IsOptional()
  @IsNumber()
  limit?: number;

  @ApiPropertyOptional({ example: 'company-uuid-123' })
  @IsOptional()
  @IsString()
  companyId?: string;
}

export class IndustryTemplate {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  description: string;

  @ApiProperty({ enum: Industry })
  industry: Industry;

  @ApiProperty({ enum: PrintType })
  printType: PrintType;

  @ApiProperty()
  popularityScore: number;

  @ApiProperty()
  usageCount: number;

  @ApiProperty()
  averageRating: number;

  @ApiProperty()
  previewImage?: string;

  @ApiProperty()
  tags: string[];
}

export class TemplateFeedbackRequest {
  @ApiProperty({ example: 'template-uuid-123' })
  @IsString()
  templateId: string;

  @ApiProperty({ example: 4.5, minimum: 1, maximum: 5 })
  @IsNumber()
  rating: number;

  @ApiPropertyOptional({ type: [String], example: ['faster_printing', 'better_layout'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  improvements?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  usageContext?: {
    printVolume: number;
    printerType: string;
    paperType: string;
    businessSize: string;
  };

  @ApiPropertyOptional({ example: 'user-uuid-456' })
  @IsOptional()
  @IsString()
  userId?: string;
}

export class TemplateAnalytics {
  @ApiProperty()
  templateId: string;

  @ApiProperty()
  usageCount: number;

  @ApiProperty()
  successRate: number;

  @ApiProperty()
  averagePrintTime: number;

  @ApiProperty()
  userRating: number;

  @ApiProperty()
  performanceMetrics: {
    averageGenerationTime: number;
    errorRate: number;
    customerSatisfaction: number;
    printQuality: number;
    costEfficiency: number;
  };

  @ApiProperty()
  trendsOverTime: {
    dailyUsage: number[];
    weeklyRating: number[];
    monthlySuccess: number[];
  };
}