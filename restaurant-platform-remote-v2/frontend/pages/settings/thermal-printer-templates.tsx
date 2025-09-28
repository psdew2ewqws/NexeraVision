/**
 * Enhanced Thermal Printer Template Builder Page for Jordan Market
 * Comprehensive template builder with printer detection, logo upload, and menu integration
 */

import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import {
  ArrowLeftIcon,
  PrinterIcon,
  PhotoIcon,
  CogIcon,
  DocumentTextIcon,
  BanknotesIcon,
  GlobeAltIcon,
  ShieldCheckIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '../../src/contexts/AuthContext';
import { useLanguage } from '../../src/contexts/LanguageContext';
import { ProtectedRoute } from '../../src/components/ProtectedRoute';
import { ThermalPrinterSetup } from '../../src/features/template-builder/components/ThermalPrinterSetup';
import toast from 'react-hot-toast';

interface TemplateSection {
  id: string;
  name: string;
  nameAr: string;
  description: string;
  icon: React.ComponentType<any>;
  isEnabled: boolean;
}

export default function ThermalPrinterTemplatesPage() {
  const { user } = useAuth();
  const { language, t } = useLanguage();
  const [activeSection, setActiveSection] = useState<'setup' | 'templates' | 'testing' | 'guidelines'>('setup');
  const [templateSections, setTemplateSections] = useState<TemplateSection[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasConfiguredPrinter, setHasConfiguredPrinter] = useState(false);

  // Template sections configuration
  const availableSections: TemplateSection[] = [
    {
      id: 'printer_setup',
      name: 'Printer Setup',
      nameAr: 'إعداد الطابعة',
      description: 'Detect and configure thermal printers',
      icon: PrinterIcon,
      isEnabled: true
    },
    {
      id: 'company_logo',
      name: 'Company Logo',
      nameAr: 'شعار الشركة',
      description: 'Upload and process company logo for receipts',
      icon: PhotoIcon,
      isEnabled: true
    },
    {
      id: 'receipt_templates',
      name: 'Receipt Templates',
      nameAr: 'قوالب الفواتير',
      description: 'Design receipt layouts for different business types',
      icon: DocumentTextIcon,
      isEnabled: hasConfiguredPrinter
    },
    {
      id: 'currency_settings',
      name: 'Currency & Pricing',
      nameAr: 'العملة والأسعار',
      description: 'Configure Jordan Dinar and multi-currency support',
      icon: BanknotesIcon,
      isEnabled: true
    },
    {
      id: 'language_support',
      name: 'Language Support',
      nameAr: 'دعم اللغات',
      description: 'Arabic and English text formatting',
      icon: GlobeAltIcon,
      isEnabled: true
    },
    {
      id: 'compliance',
      name: 'Jordan Compliance',
      nameAr: 'الامتثال الأردني',
      description: 'VAT, tax numbers, and legal requirements',
      icon: ShieldCheckIcon,
      isEnabled: true
    }
  ];

  useEffect(() => {
    setTemplateSections(availableSections);
  }, [hasConfiguredPrinter]);

  /**
   * Handle printer configuration completion
   */
  const handlePrinterConfigured = (printerId: string) => {
    setHasConfiguredPrinter(true);
    toast.success('Printer configured successfully! You can now design receipt templates.');
  };

  /**
   * Load Jordan printing guidelines
   */
  const loadJordanGuidelines = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/thermal-printer/guidelines/jordan`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth-token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        return data.guidelines;
      }
    } catch (error) {
      console.error('Error loading guidelines:', error);
    }
    return [];
  };

  /**
   * Get section status color
   */
  const getSectionStatusColor = (section: TemplateSection) => {
    if (!section.isEnabled) return 'text-gray-400 bg-gray-100';
    return 'text-blue-600 bg-blue-100 hover:bg-blue-200';
  };

  return (
    <ProtectedRoute requiredRoles={['super_admin', 'company_owner', 'branch_manager']}>
      <Head>
        <title>Thermal Printer Templates - Jordan Market | Restaurant Management</title>
        <meta name="description" content="Advanced thermal printer template builder optimized for Jordan restaurants" />
      </Head>

      <div className="min-h-screen bg-gray-50">
        {/* Professional Header */}
        <div className="bg-white border-b border-gray-200 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              {/* Navigation */}
              <div className="flex items-center space-x-4">
                <Link href="/dashboard" className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors">
                  <ArrowLeftIcon className="w-4 h-4 mr-2" />
                  Dashboard
                </Link>
                <div className="h-6 w-px bg-gray-300"></div>
                <div className="flex items-center space-x-3">
                  <PrinterIcon className="w-6 h-6 text-blue-600" />
                  <div>
                    <h1 className="text-xl font-semibold text-gray-900">Thermal Printer Templates</h1>
                    <p className="text-sm text-gray-500">Jordan Market Edition</p>
                  </div>
                </div>
              </div>

              {/* Quick Info */}
              <div className="flex items-center space-x-4">
                <div className="text-right">
                  <p className="text-xs text-gray-500">Company</p>
                  <p className="text-sm font-medium text-gray-900">{user?.company?.name}</p>
                </div>
                {hasConfiguredPrinter && (
                  <div className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    ✓ Printer Ready
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

          {/* Section Navigation */}
          <div className="bg-white rounded-lg border border-gray-200 mb-8 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">Template Builder Sections</h2>
              <p className="text-sm text-gray-500 mt-1">Configure your thermal printer templates for the Jordan market</p>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {templateSections.map((section) => (
                  <button
                    key={section.id}
                    onClick={() => section.isEnabled && setActiveSection(section.id as any)}
                    disabled={!section.isEnabled}
                    className={`p-4 rounded-lg border-2 transition-all duration-200 text-left ${
                      section.isEnabled
                        ? 'border-blue-200 hover:border-blue-300 hover:shadow-md cursor-pointer'
                        : 'border-gray-200 cursor-not-allowed opacity-60'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <section.icon className={`w-6 h-6 ${getSectionStatusColor(section).split(' ')[0]}`} />
                      {!section.isEnabled && (
                        <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded">Requires Setup</span>
                      )}
                    </div>
                    <h3 className={`font-medium ${section.isEnabled ? 'text-gray-900' : 'text-gray-500'}`}>
                      {language === 'ar' ? section.nameAr : section.name}
                    </h3>
                    <p className={`text-sm mt-1 ${section.isEnabled ? 'text-gray-600' : 'text-gray-400'}`}>
                      {section.description}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Section Content */}
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">

            {/* Printer Setup Section */}
            {activeSection === 'setup' && (
              <div>
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-medium text-gray-900">Thermal Printer Setup</h3>
                  <p className="text-sm text-gray-500 mt-1">Detect, configure, and test your thermal printers</p>
                </div>
                <div className="p-6">
                  <ThermalPrinterSetup onPrinterConfigured={handlePrinterConfigured} />
                </div>
              </div>
            )}

            {/* Jordan Guidelines Section */}
            {activeSection === 'guidelines' && (
              <div>
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-medium text-gray-900">Jordan Market Guidelines</h3>
                  <p className="text-sm text-gray-500 mt-1">Best practices for thermal receipt printing in Jordan</p>
                </div>
                <div className="p-6">
                  <JordanGuidelinesSection />
                </div>
              </div>
            )}

            {/* Template Design Section */}
            {activeSection === 'templates' && (
              <div>
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-medium text-gray-900">Receipt Template Design</h3>
                  <p className="text-sm text-gray-500 mt-1">Create and customize receipt layouts</p>
                </div>
                <div className="p-6">
                  {hasConfiguredPrinter ? (
                    <TemplateDesignSection />
                  ) : (
                    <div className="text-center py-12">
                      <PrinterIcon className="mx-auto h-12 w-12 text-gray-400" />
                      <h3 className="mt-2 text-sm font-medium text-gray-900">Printer Setup Required</h3>
                      <p className="mt-1 text-sm text-gray-500">
                        Please configure a thermal printer first to access template design features.
                      </p>
                      <button
                        onClick={() => setActiveSection('setup')}
                        className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200"
                      >
                        <CogIcon className="w-4 h-4 mr-2" />
                        Setup Printer
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Currency Section */}
            {activeSection === 'currency_settings' && (
              <div>
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-medium text-gray-900">Currency & Pricing Configuration</h3>
                  <p className="text-sm text-gray-500 mt-1">Configure Jordan Dinar and multi-currency support</p>
                </div>
                <div className="p-6">
                  <CurrencySettingsSection />
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}

/**
 * Jordan Guidelines Component
 */
const JordanGuidelinesSection: React.FC = () => {
  const [guidelines, setGuidelines] = useState<string[]>([]);

  useEffect(() => {
    const loadGuidelines = async () => {
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/thermal-printer/guidelines/jordan`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('auth-token')}`
          }
        });

        if (response.ok) {
          const data = await response.json();
          setGuidelines(data.guidelines);
        }
      } catch (error) {
        console.error('Error loading guidelines:', error);
      }
    };

    loadGuidelines();
  }, []);

  return (
    <div className="space-y-6">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="text-sm font-medium text-blue-900">Jordan Market Compliance</h4>
        <p className="text-sm text-blue-800 mt-1">
          Follow these guidelines to ensure your thermal receipts meet Jordan regulatory requirements.
        </p>
      </div>

      <div className="grid gap-4">
        {guidelines.map((guideline, index) => (
          <div key={index} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
            <div className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-medium">
              {index + 1}
            </div>
            <p className="text-sm text-gray-700">{guideline}</p>
          </div>
        ))}
      </div>

      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <h4 className="text-sm font-medium text-yellow-900">Important Notes</h4>
        <ul className="text-sm text-yellow-800 mt-2 space-y-1">
          <li>• VAT rate in Jordan is 16% and must be displayed separately</li>
          <li>• Business tax registration number is required on all receipts</li>
          <li>• Receipt numbering must be sequential for audit purposes</li>
          <li>• Arabic language support improves customer experience</li>
        </ul>
      </div>
    </div>
  );
};

/**
 * Template Design Component
 */
const TemplateDesignSection: React.FC = () => {
  return (
    <div className="text-center py-12">
      <DocumentTextIcon className="mx-auto h-12 w-12 text-gray-400" />
      <h3 className="mt-2 text-sm font-medium text-gray-900">Template Design Coming Soon</h3>
      <p className="mt-1 text-sm text-gray-500">
        Advanced template designer with drag-and-drop interface and real-time preview.
      </p>
    </div>
  );
};

/**
 * Currency Settings Component
 */
const CurrencySettingsSection: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="border border-gray-200 rounded-lg p-4">
          <h4 className="text-sm font-medium text-gray-900 mb-3">Primary Currency</h4>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Jordan Dinar (JOD)</span>
              <span className="text-sm font-medium text-green-600">Active</span>
            </div>
            <div className="text-xs text-gray-500">
              Format: 12.345 JD • Arabic: ١٢.٣٤٥ د.أ • 3 decimal places
            </div>
            <div className="text-xs text-gray-500">
              VAT Rate: 16% • Subunit: Fils (1000 fils = 1 JOD)
            </div>
          </div>
        </div>

        <div className="border border-gray-200 rounded-lg p-4">
          <h4 className="text-sm font-medium text-gray-900 mb-3">Secondary Currencies</h4>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">US Dollar (USD)</span>
              <span className="text-gray-400">Available</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Saudi Riyal (SAR)</span>
              <span className="text-gray-400">Available</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">UAE Dirham (AED)</span>
              <span className="text-gray-400">Available</span>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <h4 className="text-sm font-medium text-green-900">Currency Features</h4>
        <ul className="text-sm text-green-800 mt-2 space-y-1">
          <li>• Automatic rounding to nearest fils (0.001 JOD)</li>
          <li>• Arabic numeral support for Arabic receipts</li>
          <li>• Multi-currency exchange rate support</li>
          <li>• Jordan VAT calculation built-in</li>
          <li>• Thermal printer optimized formatting</li>
        </ul>
      </div>
    </div>
  );
};