import React, { useState, useCallback } from 'react';
import {
  SparklesIcon,
  CogIcon,
  DocumentDuplicateIcon,
  ClockIcon,
  StarIcon,
  ChartBarIcon,
  LightBulbIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';

interface AITemplateGeneratorProps {
  onTemplateGenerated?: (templates: any[]) => void;
  className?: string;
}

interface GenerationRequest {
  businessDescription: string;
  industry: string;
  printType: string;
  requirements: {
    paperSize: string;
    colorScheme: string;
    branding: boolean;
    fields: string[];
  };
}

interface GeneratedTemplate {
  id: string;
  name: string;
  category: string;
  printType: string;
  optimizationScore: number;
  scores: {
    readability: number;
    printEfficiency: number;
    businessAlignment: number;
    aesthetics: number;
    dataUtilization: number;
  };
  overallScore: number;
  template: any;
  aiMetadata: {
    businessType: string;
    keyFeatures: string[];
  };
}

export const AITemplateGenerator: React.FC<AITemplateGeneratorProps> = ({
  onTemplateGenerated,
  className = ''
}) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [generatedTemplates, setGeneratedTemplates] = useState<GeneratedTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [generationTime, setGenerationTime] = useState<number>(0);
  const [recommendations, setRecommendations] = useState<string[]>([]);

  const [formData, setFormData] = useState<GenerationRequest>({
    businessDescription: '',
    industry: 'restaurant',
    printType: 'receipt',
    requirements: {
      paperSize: 'A4',
      colorScheme: 'professional',
      branding: true,
      fields: []
    }
  });

  const industries = [
    { value: 'restaurant', label: 'Restaurant & Food Service', icon: '🍽️' },
    { value: 'retail', label: 'Retail & Commerce', icon: '🛍️' },
    { value: 'healthcare', label: 'Healthcare & Medical', icon: '🏥' },
    { value: 'education', label: 'Education & Training', icon: '🎓' },
    { value: 'service', label: 'Professional Services', icon: '💼' },
    { value: 'hospitality', label: 'Hospitality & Travel', icon: '🏨' },
    { value: 'manufacturing', label: 'Manufacturing & Production', icon: '🏭' },
    { value: 'general', label: 'General Business', icon: '🏢' }
  ];

  const printTypes = [
    { value: 'receipt', label: 'Receipt', description: 'Point of sale receipts' },
    { value: 'invoice', label: 'Invoice', description: 'Business invoices and bills' },
    { value: 'label', label: 'Label', description: 'Product and shipping labels' },
    { value: 'report', label: 'Report', description: 'Business reports and statements' },
    { value: 'ticket', label: 'Ticket', description: 'Event and service tickets' }
  ];

  const colorSchemes = [
    { value: 'professional', label: 'Professional', colors: ['#1f2937', '#374151', '#6b7280'] },
    { value: 'modern', label: 'Modern', colors: ['#3b82f6', '#1e40af', '#1e3a8a'] },
    { value: 'elegant', label: 'Elegant', colors: ['#7c3aed', '#5b21b6', '#4c1d95'] },
    { value: 'warm', label: 'Warm', colors: ['#f59e0b', '#d97706', '#b45309'] },
    { value: 'cool', label: 'Cool', colors: ['#10b981', '#059669', '#047857'] }
  ];

  const commonFields = [
    'company_name', 'company_address', 'company_phone', 'company_email',
    'customer_name', 'customer_phone', 'customer_email', 'customer_address',
    'order_id', 'order_date', 'order_time', 'order_items',
    'subtotal', 'tax_amount', 'discount_amount', 'total_amount',
    'payment_method', 'payment_status', 'cashier_name', 'receipt_number'
  ];

  const generateTemplates = useCallback(async () => {
    if (!formData.businessDescription.trim()) {
      toast.error('Please describe your business');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/templates/ai/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth-token')}`
        },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to generate templates');
      }

      const result = await response.json();
      setGeneratedTemplates(result.templates);
      setGenerationTime(result.generationTime);
      setRecommendations(result.recommendations || []);
      setCurrentStep(2);

      toast.success(`Generated ${result.templates.length} templates in ${(result.generationTime / 1000).toFixed(1)}s`);

      if (onTemplateGenerated) {
        onTemplateGenerated(result.templates);
      }
    } catch (error) {
      console.error('Template generation error:', error);
      toast.error('Failed to generate templates');
    } finally {
      setLoading(false);
    }
  }, [formData, onTemplateGenerated]);

  const handleFieldToggle = useCallback((field: string) => {
    setFormData(prev => ({
      ...prev,
      requirements: {
        ...prev.requirements,
        fields: prev.requirements.fields.includes(field)
          ? prev.requirements.fields.filter(f => f !== field)
          : [...prev.requirements.fields, field]
      }
    }));
  }, []);

  const ScoreBar = ({ label, score, color = 'blue' }: { label: string; score: number; color?: string }) => (
    <div className="mb-2">
      <div className="flex justify-between text-sm">
        <span className="text-gray-600">{label}</span>
        <span className="font-medium">{Math.round(score * 100)}%</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className={`bg-${color}-600 h-2 rounded-full transition-all duration-300`}
          style={{ width: `${score * 100}%` }}
        />
      </div>
    </div>
  );

  const TemplateCard = ({ template }: { template: GeneratedTemplate }) => (
    <div
      className={`border rounded-lg p-4 cursor-pointer transition-all duration-200 ${
        selectedTemplate === template.id
          ? 'border-blue-500 bg-blue-50 shadow-md'
          : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
      }`}
      onClick={() => setSelectedTemplate(template.id)}
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="font-medium text-gray-900">{template.name}</h3>
          <p className="text-sm text-gray-500">{template.category}</p>
        </div>
        <div className="flex items-center">
          <StarIcon className="w-4 h-4 text-yellow-500 mr-1" />
          <span className="text-sm font-medium">{template.overallScore.toFixed(1)}</span>
        </div>
      </div>

      <div className="space-y-2 mb-3">
        <ScoreBar label="Readability" score={template.scores.readability} color="green" />
        <ScoreBar label="Print Efficiency" score={template.scores.printEfficiency} color="blue" />
        <ScoreBar label="Business Alignment" score={template.scores.businessAlignment} color="purple" />
      </div>

      <div className="flex flex-wrap gap-1 mb-3">
        {template.aiMetadata.keyFeatures.slice(0, 3).map((feature) => (
          <span key={feature} className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
            {feature.replace('_', ' ')}
          </span>
        ))}
      </div>

      <div className="flex justify-between items-center text-sm">
        <span className="text-gray-500">
          {template.printType} • {template.aiMetadata.businessType}
        </span>
        {selectedTemplate === template.id && (
          <span className="text-blue-600 font-medium">Selected</span>
        )}
      </div>
    </div>
  );

  return (
    <div className={`bg-white rounded-lg border border-gray-200 ${className}`}>
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center">
          <SparklesIcon className="w-6 h-6 text-purple-600 mr-3" />
          <div>
            <h2 className="text-xl font-semibold text-gray-900">AI Template Generator</h2>
            <p className="text-sm text-gray-600">Create optimized templates with artificial intelligence</p>
          </div>
        </div>

        {/* Step Indicator */}
        <div className="flex items-center mt-4">
          <div className={`flex items-center ${currentStep >= 1 ? 'text-blue-600' : 'text-gray-400'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
              currentStep >= 1 ? 'bg-blue-600 text-white' : 'bg-gray-200'
            }`}>1</div>
            <span className="ml-2 text-sm font-medium">Configure</span>
          </div>
          <div className="flex-1 h-0.5 bg-gray-200 mx-4" />
          <div className={`flex items-center ${currentStep >= 2 ? 'text-blue-600' : 'text-gray-400'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
              currentStep >= 2 ? 'bg-blue-600 text-white' : 'bg-gray-200'
            }`}>2</div>
            <span className="ml-2 text-sm font-medium">Review & Select</span>
          </div>
        </div>
      </div>

      <div className="p-6">
        {currentStep === 1 && (
          <div className="space-y-6">
            {/* Business Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Describe Your Business *
              </label>
              <textarea
                value={formData.businessDescription}
                onChange={(e) => setFormData(prev => ({ ...prev, businessDescription: e.target.value }))}
                placeholder="e.g., We're a modern coffee shop with delivery service, loyalty program, and focus on organic ingredients..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <p className="mt-1 text-xs text-gray-500">
                Be specific about your services, features, and business model for better AI recommendations
              </p>
            </div>

            {/* Industry Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Industry</label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {industries.map((industry) => (
                  <button
                    key={industry.value}
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, industry: industry.value }))}
                    className={`p-3 text-left border rounded-lg transition-all duration-200 ${
                      formData.industry === industry.value
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="text-lg mb-1">{industry.icon}</div>
                    <div className="text-sm font-medium">{industry.label}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Print Type Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Print Type</label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {printTypes.map((type) => (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, printType: type.value }))}
                    className={`p-4 text-left border rounded-lg transition-all duration-200 ${
                      formData.printType === type.value
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="font-medium text-gray-900">{type.label}</div>
                    <div className="text-sm text-gray-500">{type.description}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Requirements */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Paper Size & Color Scheme */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Paper Size</label>
                <select
                  value={formData.requirements.paperSize}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    requirements: { ...prev.requirements, paperSize: e.target.value }
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="A4">A4 (210 × 297 mm)</option>
                  <option value="Letter">Letter (8.5 × 11 in)</option>
                  <option value="Thermal80">Thermal 80mm</option>
                  <option value="Thermal58">Thermal 58mm</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Color Scheme</label>
                <div className="grid grid-cols-1 gap-2">
                  {colorSchemes.map((scheme) => (
                    <button
                      key={scheme.value}
                      type="button"
                      onClick={() => setFormData(prev => ({
                        ...prev,
                        requirements: { ...prev.requirements, colorScheme: scheme.value }
                      }))}
                      className={`flex items-center p-2 border rounded-md ${
                        formData.requirements.colorScheme === scheme.value
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex space-x-1 mr-3">
                        {scheme.colors.map((color, index) => (
                          <div
                            key={index}
                            className="w-4 h-4 rounded"
                            style={{ backgroundColor: color }}
                          />
                        ))}
                      </div>
                      <span className="text-sm">{scheme.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Data Fields */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Required Data Fields
              </label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {commonFields.map((field) => (
                  <label key={field} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.requirements.fields.includes(field)}
                      onChange={() => handleFieldToggle(field)}
                      className="mr-2 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">
                      {field.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Branding Option */}
            <div>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.requirements.branding}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    requirements: { ...prev.requirements, branding: e.target.checked }
                  }))}
                  className="mr-2 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-gray-700">Include branding elements</span>
              </label>
              <p className="ml-6 text-xs text-gray-500">
                Add space for logos, colors, and brand-specific styling
              </p>
            </div>

            {/* Generate Button */}
            <div className="flex justify-end">
              <button
                onClick={generateTemplates}
                disabled={loading || !formData.businessDescription.trim()}
                className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <ArrowPathIcon className="w-5 h-5 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <SparklesIcon className="w-5 h-5 mr-2" />
                    Generate AI Templates
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {currentStep === 2 && (
          <div className="space-y-6">
            {/* Generation Summary */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center mb-2">
                <SparklesIcon className="w-5 h-5 text-green-600 mr-2" />
                <span className="font-medium text-green-800">
                  Successfully generated {generatedTemplates.length} templates
                </span>
              </div>
              <div className="text-sm text-green-700">
                <div className="flex items-center space-x-4">
                  <span className="flex items-center">
                    <ClockIcon className="w-4 h-4 mr-1" />
                    {(generationTime / 1000).toFixed(1)}s generation time
                  </span>
                  <span className="flex items-center">
                    <ChartBarIcon className="w-4 h-4 mr-1" />
                    Optimized for {formData.industry}
                  </span>
                </div>
              </div>
            </div>

            {/* AI Recommendations */}
            {recommendations.length > 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center mb-2">
                  <LightBulbIcon className="w-5 h-5 text-blue-600 mr-2" />
                  <span className="font-medium text-blue-800">AI Recommendations</span>
                </div>
                <ul className="text-sm text-blue-700 space-y-1">
                  {recommendations.map((rec, index) => (
                    <li key={index} className="flex items-start">
                      <span className="w-1 h-1 bg-blue-600 rounded-full mt-2 mr-2 flex-shrink-0" />
                      {rec}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Generated Templates */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Generated Templates</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {generatedTemplates.map((template) => (
                  <TemplateCard key={template.id} template={template} />
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-between">
              <button
                onClick={() => setCurrentStep(1)}
                className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                Back to Configuration
              </button>

              <div className="space-x-3">
                <button
                  onClick={() => {
                    // Regenerate with current settings
                    generateTemplates();
                  }}
                  disabled={loading}
                  className="inline-flex items-center px-4 py-2 border border-purple-300 text-sm font-medium rounded-md text-purple-700 bg-purple-50 hover:bg-purple-100 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 disabled:opacity-50"
                >
                  <ArrowPathIcon className="w-4 h-4 mr-2" />
                  Regenerate
                </button>

                <button
                  disabled={!selectedTemplate}
                  className="inline-flex items-center px-6 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <DocumentDuplicateIcon className="w-4 h-4 mr-2" />
                  Use Selected Template
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};