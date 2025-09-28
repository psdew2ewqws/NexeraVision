// Platform-Specific Menu Builder
// Enhanced builder with platform-specific configuration options

import React, { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CogIcon,
  SwatchIcon,
  ClockIcon,
  CurrencyDollarIcon,
  MapPinIcon,
  PhoneIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  PlusIcon,
  TrashIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '../../../contexts/AuthContext';
import { Platform, PlatformMenu } from '../../../types/menu-builder';
import toast from 'react-hot-toast';

interface PlatformSpecificBuilderProps {
  platform: Platform;
  menu?: PlatformMenu;
  onConfigChange: (config: any) => void;
  className?: string;
}

interface PlatformConfig {
  talabat?: TalabatConfig;
  careem?: CareemConfig;
  call_center?: CallCenterConfig;
}

interface TalabatConfig {
  restaurantId: string;
  currency: string;
  taxRate: number;
  deliveryZones: string[];
  operatingHours: Record<string, { open: string; close: string; available: boolean }>;
  specialOffers: {
    enabled: boolean;
    types: string[];
  };
  menuDisplay: {
    showNutrition: boolean;
    showCalories: boolean;
    showAllergens: boolean;
    groupByCategory: boolean;
  };
}

interface CareemConfig {
  storeId: string;
  currency: string;
  serviceArea: {
    city: string;
    zones: string[];
    maxDeliveryRadius: number;
  };
  deliverySettings: {
    estimatedDeliveryTime: number;
    minOrderValue: number;
    deliveryFee: number;
    freeDeliveryThreshold?: number;
  };
  operationalHours: Record<string, { open: string; close: string; isOpen: boolean }>;
  promotions: {
    enabled: boolean;
    types: string[];
    autoApply: boolean;
  };
  display: {
    showPreparationTime: boolean;
    showIngredients: boolean;
    showNutritionalFacts: boolean;
    enableItemCustomization: boolean;
  };
}

interface CallCenterConfig {
  branchId: string;
  phoneNumbers: string[];
  operatorSettings: {
    maxSimultaneousOrders: number;
    averageCallDuration: number;
    preferredLanguage: 'en' | 'ar' | 'both';
  };
  quickOrderCodes: {
    enabled: boolean;
    codeLength: number;
    includeCategory: boolean;
  };
  promotions: {
    phoneExclusive: boolean;
    timeBasedOffers: boolean;
    repeatCustomerDiscounts: boolean;
  };
  customerManagement: {
    enableCustomerDatabase: boolean;
    saveOrderHistory: boolean;
    suggestPreviousOrders: boolean;
  };
  orderProcessing: {
    confirmationRequired: boolean;
    readBackOrder: boolean;
    estimatedDeliveryTime: number;
    acceptCashOnDelivery: boolean;
    acceptCardPayments: boolean;
  };
}

const DAYS_OF_WEEK = [
  'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'
];

const DEFAULT_CONFIGS = {
  talabat: {
    restaurantId: '',
    currency: 'JOD',
    taxRate: 0.16,
    deliveryZones: ['amman'],
    operatingHours: Object.fromEntries(
      DAYS_OF_WEEK.map(day => [day, { open: '10:00', close: '23:00', available: true }])
    ),
    specialOffers: {
      enabled: true,
      types: ['discount', 'free_delivery']
    },
    menuDisplay: {
      showNutrition: false,
      showCalories: true,
      showAllergens: true,
      groupByCategory: true
    }
  } as TalabatConfig,
  careem: {
    storeId: '',
    currency: 'JOD',
    serviceArea: {
      city: 'Amman',
      zones: ['Downtown', 'Abdoun'],
      maxDeliveryRadius: 10
    },
    deliverySettings: {
      estimatedDeliveryTime: 30,
      minOrderValue: 5.0,
      deliveryFee: 1.5,
      freeDeliveryThreshold: 15.0
    },
    operationalHours: Object.fromEntries(
      DAYS_OF_WEEK.map(day => [day, { open: '10:00', close: '23:00', isOpen: true }])
    ),
    promotions: {
      enabled: true,
      types: ['percentage', 'fixed_amount'],
      autoApply: true
    },
    display: {
      showPreparationTime: true,
      showIngredients: false,
      showNutritionalFacts: false,
      enableItemCustomization: true
    }
  } as CareemConfig,
  call_center: {
    branchId: '',
    phoneNumbers: [],
    operatorSettings: {
      maxSimultaneousOrders: 3,
      averageCallDuration: 5,
      preferredLanguage: 'both'
    },
    quickOrderCodes: {
      enabled: true,
      codeLength: 3,
      includeCategory: false
    },
    promotions: {
      phoneExclusive: true,
      timeBasedOffers: false,
      repeatCustomerDiscounts: true
    },
    customerManagement: {
      enableCustomerDatabase: true,
      saveOrderHistory: true,
      suggestPreviousOrders: true
    },
    orderProcessing: {
      confirmationRequired: true,
      readBackOrder: true,
      estimatedDeliveryTime: 30,
      acceptCashOnDelivery: true,
      acceptCardPayments: false
    }
  } as CallCenterConfig
};

export const PlatformSpecificBuilder: React.FC<PlatformSpecificBuilderProps> = ({
  platform,
  menu,
  onConfigChange,
  className = ''
}) => {
  const { user } = useAuth();
  const [config, setConfig] = useState<PlatformConfig>(() => {
    const existingConfig = menu?.platformConfig || {};
    return {
      [platform.id]: existingConfig[platform.id] || DEFAULT_CONFIGS[platform.id as keyof typeof DEFAULT_CONFIGS]
    };
  });
  
  const [activeSection, setActiveSection] = useState('basic');
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [isValidating, setIsValidating] = useState(false);

  // Update configuration
  const updateConfig = useCallback((section: string, updates: any) => {
    setConfig(prev => {
      const newConfig = {
        ...prev,
        [platform.id]: {
          ...prev[platform.id as keyof PlatformConfig],
          [section]: {
            ...(prev[platform.id as keyof PlatformConfig] as any)?.[section],
            ...updates
          }
        }
      };
      onConfigChange(newConfig);
      return newConfig;
    });
  }, [platform.id, onConfigChange]);

  // Validate configuration
  const validateConfig = useCallback(async () => {
    setIsValidating(true);
    const errors: string[] = [];
    
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/platform-menus/specific/validate`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('auth-token')}`
          },
          body: JSON.stringify({
            platform: platform.id,
            config: config[platform.id as keyof PlatformConfig]
          })
        }
      );
      
      const result = await response.json();
      if (!result.valid) {
        errors.push(...(result.errors || ['Configuration validation failed']));
      }
    } catch (error) {
      errors.push('Failed to validate configuration');
    }
    
    setValidationErrors(errors);
    setIsValidating(false);
    
    if (errors.length === 0) {
      toast.success('Configuration is valid!');
    } else {
      toast.error(`${errors.length} validation error(s) found`);
    }
  }, [platform.id, config]);

  // Render platform-specific configuration
  const renderPlatformConfig = useMemo(() => {
    const platformConfig = config[platform.id as keyof PlatformConfig];
    
    switch (platform.id) {
      case 'talabat':
        return <TalabatConfigForm 
          config={platformConfig as TalabatConfig} 
          onChange={updateConfig}
          activeSection={activeSection}
        />;
      case 'careem':
        return <CareemConfigForm 
          config={platformConfig as CareemConfig} 
          onChange={updateConfig}
          activeSection={activeSection}
        />;
      case 'call_center':
        return <CallCenterConfigForm 
          config={platformConfig as CallCenterConfig} 
          onChange={updateConfig}
          activeSection={activeSection}
        />;
      default:
        return <div className="p-8 text-center text-gray-500">
          Configuration not available for {platform.name}
        </div>;
    }
  }, [platform.id, config, updateConfig, activeSection]);

  const configSections = useMemo(() => {
    switch (platform.id) {
      case 'talabat':
        return [
          { key: 'basic', label: 'Basic Settings', icon: CogIcon },
          { key: 'operatingHours', label: 'Operating Hours', icon: ClockIcon },
          { key: 'specialOffers', label: 'Special Offers', icon: CurrencyDollarIcon },
          { key: 'menuDisplay', label: 'Menu Display', icon: SwatchIcon }
        ];
      case 'careem':
        return [
          { key: 'basic', label: 'Basic Settings', icon: CogIcon },
          { key: 'serviceArea', label: 'Service Area', icon: MapPinIcon },
          { key: 'deliverySettings', label: 'Delivery Settings', icon: ClockIcon },
          { key: 'promotions', label: 'Promotions', icon: CurrencyDollarIcon },
          { key: 'display', label: 'Display Options', icon: SwatchIcon }
        ];
      case 'call_center':
        return [
          { key: 'basic', label: 'Basic Settings', icon: CogIcon },
          { key: 'operatorSettings', label: 'Operator Settings', icon: PhoneIcon },
          { key: 'quickOrderCodes', label: 'Quick Order Codes', icon: CogIcon },
          { key: 'promotions', label: 'Promotions', icon: CurrencyDollarIcon },
          { key: 'orderProcessing', label: 'Order Processing', icon: ClockIcon }
        ];
      default:
        return [];
    }
  }, [platform.id]);

  return (
    <div className={`platform-specific-builder bg-white rounded-xl shadow-sm border border-gray-200 ${className}`}>
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              {platform.name} Configuration
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              Configure platform-specific settings and preferences
            </p>
          </div>
          
          <div className="flex items-center space-x-3">
            {/* Validation Status */}
            {validationErrors.length > 0 && (
              <div className="flex items-center space-x-2 text-red-600">
                <ExclamationTriangleIcon className="w-5 h-5" />
                <span className="text-sm">{validationErrors.length} errors</span>
              </div>
            )}
            
            {/* Validate Button */}
            <button
              onClick={validateConfig}
              disabled={isValidating}
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 disabled:opacity-50"
            >
              {isValidating ? (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  className="w-4 h-4 mr-2"
                >
                  <CogIcon className="w-4 h-4" />
                </motion.div>
              ) : (
                <CheckCircleIcon className="w-4 h-4 mr-2" />
              )}
              Validate
            </button>
          </div>
        </div>
      </div>

      <div className="flex h-96">
        {/* Section Navigation */}
        <div className="w-64 border-r border-gray-200 p-4">
          <div className="space-y-1">
            {configSections.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setActiveSection(key)}
                className={`w-full flex items-center space-x-3 px-3 py-2 text-left rounded-lg transition-colors ${
                  activeSection === key
                    ? 'bg-blue-50 text-blue-700 border border-blue-200'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="text-sm font-medium">{label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Configuration Content */}
        <div className="flex-1 p-6 overflow-y-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeSection}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {renderPlatformConfig}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Validation Errors */}
      {validationErrors.length > 0 && (
        <div className="p-4 border-t border-gray-200 bg-red-50">
          <div className="flex">
            <ExclamationTriangleIcon className="w-5 h-5 text-red-400 mr-2 mt-0.5" />
            <div>
              <h4 className="text-sm font-medium text-red-800">Configuration Errors</h4>
              <ul className="mt-2 space-y-1">
                {validationErrors.map((error, index) => (
                  <li key={index} className="text-sm text-red-700">• {error}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Talabat Configuration Form
interface TalabatConfigFormProps {
  config: TalabatConfig;
  onChange: (section: string, updates: any) => void;
  activeSection: string;
}

const TalabatConfigForm: React.FC<TalabatConfigFormProps> = ({ config, onChange, activeSection }) => {
  const renderBasicSettings = () => (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Restaurant ID *
        </label>
        <input
          type="text"
          value={config.restaurantId}
          onChange={(e) => onChange('basic', { restaurantId: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          placeholder="Enter your Talabat restaurant ID"
        />
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Currency
        </label>
        <select
          value={config.currency}
          onChange={(e) => onChange('basic', { currency: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="JOD">Jordanian Dinar (JOD)</option>
          <option value="USD">US Dollar (USD)</option>
          <option value="EUR">Euro (EUR)</option>
        </select>
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Tax Rate (%)
        </label>
        <input
          type="number"
          min="0"
          max="100"
          step="0.01"
          value={config.taxRate * 100}
          onChange={(e) => onChange('basic', { taxRate: parseFloat(e.target.value) / 100 })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>
    </div>
  );

  const renderOperatingHours = () => (
    <div className="space-y-4">
      <h4 className="font-medium text-gray-900">Operating Hours</h4>
      {DAYS_OF_WEEK.map(day => (
        <div key={day} className="flex items-center space-x-4">
          <div className="w-20">
            <label className="text-sm font-medium text-gray-700 capitalize">
              {day}
            </label>
          </div>
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={config.operatingHours[day]?.available || false}
              onChange={(e) => onChange('operatingHours', {
                [day]: { ...config.operatingHours[day], available: e.target.checked }
              })}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-500">Open</span>
          </div>
          {config.operatingHours[day]?.available && (
            <>
              <input
                type="time"
                value={config.operatingHours[day]?.open || '10:00'}
                onChange={(e) => onChange('operatingHours', {
                  [day]: { ...config.operatingHours[day], open: e.target.value }
                })}
                className="px-2 py-1 border border-gray-300 rounded"
              />
              <span className="text-sm text-gray-500">to</span>
              <input
                type="time"
                value={config.operatingHours[day]?.close || '23:00'}
                onChange={(e) => onChange('operatingHours', {
                  [day]: { ...config.operatingHours[day], close: e.target.value }
                })}
                className="px-2 py-1 border border-gray-300 rounded"
              />
            </>
          )}
        </div>
      ))}
    </div>
  );

  switch (activeSection) {
    case 'basic':
      return renderBasicSettings();
    case 'operatingHours':
      return renderOperatingHours();
    case 'specialOffers':
      return (
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={config.specialOffers.enabled}
              onChange={(e) => onChange('specialOffers', { enabled: e.target.checked })}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <label className="text-sm font-medium text-gray-700">
              Enable Special Offers
            </label>
          </div>
          {/* Add more special offers configuration */}
        </div>
      );
    case 'menuDisplay':
      return (
        <div className="space-y-4">
          {Object.entries(config.menuDisplay).map(([key, value]) => (
            <div key={key} className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={value as boolean}
                onChange={(e) => onChange('menuDisplay', { [key]: e.target.checked })}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <label className="text-sm font-medium text-gray-700 capitalize">
                {key.replace(/([A-Z])/g, ' $1').toLowerCase()}
              </label>
            </div>
          ))}
        </div>
      );
    default:
      return renderBasicSettings();
  }
};

// Careem Configuration Form
interface CareemConfigFormProps {
  config: CareemConfig;
  onChange: (section: string, updates: any) => void;
  activeSection: string;
}

const CareemConfigForm: React.FC<CareemConfigFormProps> = ({ config, onChange, activeSection }) => {
  // Similar implementation to TalabatConfigForm but for Careem-specific fields
  switch (activeSection) {
    case 'basic':
      return (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Store ID *
            </label>
            <input
              type="text"
              value={config.storeId}
              onChange={(e) => onChange('basic', { storeId: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter your Careem store ID"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Currency
            </label>
            <select
              value={config.currency}
              onChange={(e) => onChange('basic', { currency: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="JOD">Jordanian Dinar (JOD)</option>
              <option value="USD">US Dollar (USD)</option>
              <option value="EUR">Euro (EUR)</option>
            </select>
          </div>
        </div>
      );
    case 'serviceArea':
      return (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              City
            </label>
            <input
              type="text"
              value={config.serviceArea.city}
              onChange={(e) => onChange('serviceArea', { city: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Maximum Delivery Radius (km)
            </label>
            <input
              type="number"
              min="1"
              max="50"
              value={config.serviceArea.maxDeliveryRadius}
              onChange={(e) => onChange('serviceArea', { maxDeliveryRadius: parseInt(e.target.value) })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
      );
    default:
      return <div>Configuration section not implemented</div>;
  }
};

// Call Center Configuration Form
interface CallCenterConfigFormProps {
  config: CallCenterConfig;
  onChange: (section: string, updates: any) => void;
  activeSection: string;
}

const CallCenterConfigForm: React.FC<CallCenterConfigFormProps> = ({ config, onChange, activeSection }) => {
  const [newPhoneNumber, setNewPhoneNumber] = useState('');
  
  const addPhoneNumber = () => {
    if (newPhoneNumber.trim()) {
      onChange('basic', { 
        phoneNumbers: [...config.phoneNumbers, newPhoneNumber.trim()]
      });
      setNewPhoneNumber('');
    }
  };
  
  const removePhoneNumber = (index: number) => {
    onChange('basic', {
      phoneNumbers: config.phoneNumbers.filter((_, i) => i !== index)
    });
  };

  switch (activeSection) {
    case 'basic':
      return (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Branch ID *
            </label>
            <input
              type="text"
              value={config.branchId}
              onChange={(e) => onChange('basic', { branchId: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter branch ID"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Phone Numbers
            </label>
            <div className="space-y-2">
              {config.phoneNumbers.map((phone, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => {
                      const newPhones = [...config.phoneNumbers];
                      newPhones[index] = e.target.value;
                      onChange('basic', { phoneNumbers: newPhones });
                    }}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <button
                    onClick={() => removePhoneNumber(index)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                  >
                    <TrashIcon className="w-4 h-4" />
                  </button>
                </div>
              ))}
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  value={newPhoneNumber}
                  onChange={(e) => setNewPhoneNumber(e.target.value)}
                  placeholder="Add new phone number"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  onKeyPress={(e) => e.key === 'Enter' && addPhoneNumber()}
                />
                <button
                  onClick={addPhoneNumber}
                  className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                >
                  <PlusIcon className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    case 'quickOrderCodes':
      return (
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={config.quickOrderCodes.enabled}
              onChange={(e) => onChange('quickOrderCodes', { enabled: e.target.checked })}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <label className="text-sm font-medium text-gray-700">
              Enable Quick Order Codes
            </label>
          </div>
          {config.quickOrderCodes.enabled && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Code Length
                </label>
                <select
                  value={config.quickOrderCodes.codeLength}
                  onChange={(e) => onChange('quickOrderCodes', { codeLength: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value={2}>2 digits</option>
                  <option value={3}>3 digits</option>
                  <option value={4}>4 digits</option>
                </select>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={config.quickOrderCodes.includeCategory}
                  onChange={(e) => onChange('quickOrderCodes', { includeCategory: e.target.checked })}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <label className="text-sm font-medium text-gray-700">
                  Include Category in Code
                </label>
              </div>
            </>
          )}
        </div>
      );
    default:
      return <div>Configuration section not implemented</div>;
  }
};