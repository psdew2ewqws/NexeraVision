/**
 * Thermal Printer Setup Component for Jordan Market
 * Handles printer detection, configuration, and logo upload
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  WifiIcon,
  PrinterIcon,
  PhotoIcon,
  CogIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  CloudArrowUpIcon,
  TrashIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '../../../contexts/AuthContext';
import toast from 'react-hot-toast';

interface ThermalPrinter {
  id: string;
  name: string;
  brand: string;
  model: string;
  connection: 'USB' | 'Serial' | 'Ethernet' | 'Bluetooth';
  paperWidth: 58 | 80;
  charactersPerLine: 32 | 48;
  supportsArabic: boolean;
  status: 'online' | 'offline' | 'error' | 'paper_empty' | 'cover_open';
  capabilities: string[];
}

interface ProcessedLogo {
  id: string;
  originalName: string;
  companyId: string;
  thermal58: {
    width: number;
    height: number;
    base64: string;
  };
  thermal80: {
    width: number;
    height: number;
    base64: string;
  };
  web: {
    width: number;
    height: number;
    url: string;
  };
}

interface ThermalPrinterSetupProps {
  onPrinterConfigured?: (printerId: string) => void;
  className?: string;
}

export const ThermalPrinterSetup: React.FC<ThermalPrinterSetupProps> = ({
  onPrinterConfigured,
  className = ''
}) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'detect' | 'configure' | 'logo' | 'test'>('detect');
  const [detectedPrinters, setDetectedPrinters] = useState<ThermalPrinter[]>([]);
  const [selectedPrinter, setSelectedPrinter] = useState<ThermalPrinter | null>(null);
  const [companyLogo, setCompanyLogo] = useState<ProcessedLogo | null>(null);
  const [isDetecting, setIsDetecting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [recommendations, setRecommendations] = useState<any>(null);

  // Detect printers on component mount
  useEffect(() => {
    detectPrinters();
    loadCompanyLogo();
  }, []);

  /**
   * Detect connected thermal printers
   */
  const detectPrinters = useCallback(async () => {
    setIsDetecting(true);
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/thermal-printer/detect`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth-token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setDetectedPrinters(data.printers);
        setRecommendations(data.recommendations);

        if (data.printers.length > 0) {
          toast.success(`Detected ${data.printers.length} thermal printer(s)`);
        } else {
          toast.info('No thermal printers detected. Check connections and try again.');
        }
      } else {
        throw new Error('Failed to detect printers');
      }
    } catch (error) {
      console.error('Printer detection error:', error);
      toast.error('Failed to detect printers');
    } finally {
      setIsDetecting(false);
    }
  }, []);

  /**
   * Load company logo
   */
  const loadCompanyLogo = useCallback(async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/thermal-printer/logo`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth-token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setCompanyLogo(data.logo);
      }
    } catch (error) {
      console.error('Error loading company logo:', error);
    }
  }, []);

  /**
   * Handle logo upload
   */
  const handleLogoUpload = useCallback(async (file: File) => {
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('logo', file);

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/thermal-printer/logo/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth-token')}`
        },
        body: formData
      });

      if (response.ok) {
        const data = await response.json();
        setCompanyLogo(data.logo);
        toast.success('Logo uploaded and processed successfully!');
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to upload logo');
      }
    } catch (error) {
      console.error('Logo upload error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to upload logo');
    } finally {
      setIsUploading(false);
    }
  }, []);

  /**
   * Handle logo deletion
   */
  const handleLogoDelete = useCallback(async () => {
    if (!confirm('Are you sure you want to delete the company logo?')) return;

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/thermal-printer/logo`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth-token')}`
        }
      });

      if (response.ok) {
        setCompanyLogo(null);
        toast.success('Logo deleted successfully');
      } else {
        throw new Error('Failed to delete logo');
      }
    } catch (error) {
      console.error('Logo deletion error:', error);
      toast.error('Failed to delete logo');
    }
  }, []);

  /**
   * Configure selected printer
   */
  const configurePrinter = useCallback(async (printer: ThermalPrinter) => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/thermal-printer/configuration`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth-token')}`
        },
        body: JSON.stringify({
          printerInfo: printer,
          isDefault: detectedPrinters.length === 1 // Set as default if only one printer
        })
      });

      if (response.ok) {
        const data = await response.json();
        toast.success(`Printer "${printer.name}" configured successfully!`);
        onPrinterConfigured?.(printer.id);
        setSelectedPrinter(printer);
        setActiveTab('test');
      } else {
        throw new Error('Failed to configure printer');
      }
    } catch (error) {
      console.error('Printer configuration error:', error);
      toast.error('Failed to configure printer');
    }
  }, [detectedPrinters.length, onPrinterConfigured]);

  /**
   * Test printer configuration
   */
  const testPrinter = useCallback(async (printer: ThermalPrinter) => {
    setIsTesting(true);
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/thermal-printer/test/${printer.id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth-token')}`
        },
        body: JSON.stringify({
          includeArabic: true,
          includeLogo: !!companyLogo,
          receiptType: 'restaurant'
        })
      });

      if (response.ok) {
        const data = await response.json();
        toast.success('Test receipt generated! Check your printer.');
      } else {
        throw new Error('Failed to test printer');
      }
    } catch (error) {
      console.error('Printer test error:', error);
      toast.error('Failed to test printer');
    } finally {
      setIsTesting(false);
    }
  }, [companyLogo]);

  /**
   * Get printer status icon
   */
  const getPrinterStatusIcon = (status: string) => {
    switch (status) {
      case 'online':
        return <CheckCircleIcon className="w-5 h-5 text-green-500" />;
      case 'offline':
        return <ExclamationTriangleIcon className="w-5 h-5 text-red-500" />;
      case 'paper_empty':
        return <ExclamationTriangleIcon className="w-5 h-5 text-yellow-500" />;
      case 'cover_open':
        return <ExclamationTriangleIcon className="w-5 h-5 text-orange-500" />;
      default:
        return <InformationCircleIcon className="w-5 h-5 text-gray-500" />;
    }
  };

  return (
    <div className={`thermal-printer-setup ${className}`}>
      {/* Tab Navigation */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'detect', label: 'Detect Printers', icon: WifiIcon },
            { id: 'configure', label: 'Configure', icon: CogIcon },
            { id: 'logo', label: 'Company Logo', icon: PhotoIcon },
            { id: 'test', label: 'Test Print', icon: PrinterIcon }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`whitespace-nowrap flex items-center py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <tab.icon className="w-5 h-5 mr-2" />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Detect Printers Tab */}
      {activeTab === 'detect' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900">Thermal Printer Detection</h3>
            <button
              onClick={detectPrinters}
              disabled={isDetecting}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
            >
              <WifiIcon className="w-4 h-4 mr-2" />
              {isDetecting ? 'Detecting...' : 'Scan for Printers'}
            </button>
          </div>

          {detectedPrinters.length > 0 ? (
            <div className="grid gap-4">
              {detectedPrinters.map((printer) => (
                <div
                  key={printer.id}
                  className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      {getPrinterStatusIcon(printer.status)}
                      <div className="ml-3">
                        <h4 className="text-sm font-medium text-gray-900">{printer.name}</h4>
                        <p className="text-xs text-gray-500">
                          {printer.brand} {printer.model} • {printer.paperWidth}mm • {printer.connection}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {printer.supportsArabic && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          Arabic Support
                        </span>
                      )}
                      <button
                        onClick={() => configurePrinter(printer)}
                        className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200"
                      >
                        Configure
                      </button>
                    </div>
                  </div>

                  <div className="mt-2">
                    <p className="text-xs text-gray-600">
                      Capabilities: {printer.capabilities.join(', ')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <PrinterIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No printers detected</h3>
              <p className="mt-1 text-sm text-gray-500">
                Make sure your thermal printer is connected and powered on.
              </p>
            </div>
          )}

          {/* Printer Recommendations */}
          {recommendations && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="text-sm font-medium text-blue-900">Recommended Printers for Jordan</h4>
              <div className="mt-2 grid grid-cols-1 md:grid-cols-3 gap-4">
                {['recommended', 'budgetFriendly', 'enterprise'].map((category) => (
                  <div key={category} className="text-xs">
                    <h5 className="font-medium text-blue-800 capitalize">
                      {category.replace(/([A-Z])/g, ' $1')}
                    </h5>
                    <ul className="mt-1 space-y-1">
                      {recommendations[category]?.slice(0, 3).map((printer: any, index: number) => (
                        <li key={index} className="text-blue-700">
                          {printer.brand} {printer.model}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Company Logo Tab */}
      {activeTab === 'logo' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900">Company Logo</h3>
            {companyLogo && (
              <button
                onClick={handleLogoDelete}
                className="inline-flex items-center px-3 py-2 border border-red-300 text-sm font-medium rounded-md text-red-700 bg-red-50 hover:bg-red-100"
              >
                <TrashIcon className="w-4 h-4 mr-2" />
                Delete Logo
              </button>
            )}
          </div>

          {companyLogo ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Web Version */}
              <div className="border border-gray-200 rounded-lg p-4">
                <h4 className="text-sm font-medium text-gray-900 mb-2">Web Version</h4>
                <img
                  src={`${process.env.NEXT_PUBLIC_API_URL}${companyLogo.web.url}`}
                  alt="Company Logo"
                  className="w-full max-w-xs mx-auto rounded"
                />
                <p className="text-xs text-gray-500 mt-2 text-center">
                  {companyLogo.web.width} × {companyLogo.web.height}px
                </p>
              </div>

              {/* 80mm Thermal */}
              <div className="border border-gray-200 rounded-lg p-4">
                <h4 className="text-sm font-medium text-gray-900 mb-2">80mm Thermal</h4>
                <img
                  src={`data:image/png;base64,${companyLogo.thermal80.base64}`}
                  alt="80mm Thermal Logo"
                  className="w-full max-w-xs mx-auto rounded border"
                />
                <p className="text-xs text-gray-500 mt-2 text-center">
                  {companyLogo.thermal80.width} × {companyLogo.thermal80.height}px
                </p>
              </div>

              {/* 58mm Thermal */}
              <div className="border border-gray-200 rounded-lg p-4">
                <h4 className="text-sm font-medium text-gray-900 mb-2">58mm Thermal</h4>
                <img
                  src={`data:image/png;base64,${companyLogo.thermal58.base64}`}
                  alt="58mm Thermal Logo"
                  className="w-full max-w-xs mx-auto rounded border"
                />
                <p className="text-xs text-gray-500 mt-2 text-center">
                  {companyLogo.thermal58.width} × {companyLogo.thermal58.height}px
                </p>
              </div>
            </div>
          ) : (
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
              <div className="text-center">
                <CloudArrowUpIcon className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">Upload Company Logo</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Upload your logo to include it in thermal receipts
                </p>
                <div className="mt-4">
                  <label htmlFor="logo-upload" className="cursor-pointer">
                    <span className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700">
                      {isUploading ? 'Uploading...' : 'Choose File'}
                    </span>
                    <input
                      id="logo-upload"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      disabled={isUploading}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleLogoUpload(file);
                      }}
                    />
                  </label>
                </div>
                <p className="mt-2 text-xs text-gray-500">
                  Supports: JPG, PNG, GIF, BMP, WebP • Max size: 5MB
                </p>
              </div>
            </div>
          )}

          {/* Logo Optimization Tips */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h4 className="text-sm font-medium text-yellow-900">Logo Optimization Tips</h4>
            <ul className="mt-2 text-xs text-yellow-800 space-y-1">
              <li>• Use high contrast designs - thermal printers work best with solid black and white</li>
              <li>• Avoid gradients and fine details - they may not print clearly</li>
              <li>• Simple designs print faster and use less paper</li>
              <li>• Test your logo on both 58mm and 80mm paper sizes</li>
            </ul>
          </div>
        </div>
      )}

      {/* Test Print Tab */}
      {activeTab === 'test' && (
        <div className="space-y-6">
          <h3 className="text-lg font-medium text-gray-900">Test Printer Configuration</h3>

          {selectedPrinter ? (
            <div className="space-y-4">
              <div className="border border-gray-200 rounded-lg p-4">
                <h4 className="text-sm font-medium text-gray-900">Selected Printer</h4>
                <p className="text-sm text-gray-600 mt-1">
                  {selectedPrinter.name} ({selectedPrinter.paperWidth}mm)
                </p>
              </div>

              <button
                onClick={() => testPrinter(selectedPrinter)}
                disabled={isTesting}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 disabled:opacity-50"
              >
                <PrinterIcon className="w-4 h-4 mr-2" />
                {isTesting ? 'Printing Test...' : 'Print Test Receipt'}
              </button>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="text-sm font-medium text-blue-900">Test Receipt Includes</h4>
                <ul className="mt-2 text-xs text-blue-800 space-y-1">
                  <li>• Company information with Arabic and English text</li>
                  <li>• Sample menu items with Jordan pricing (JOD)</li>
                  <li>• VAT calculation at 16% (Jordan standard)</li>
                  <li>• Receipt formatting optimized for {selectedPrinter.paperWidth}mm paper</li>
                  {companyLogo && <li>• Your company logo</li>}
                </ul>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <PrinterIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No printer selected</h3>
              <p className="mt-1 text-sm text-gray-500">
                Please detect and configure a printer first.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};