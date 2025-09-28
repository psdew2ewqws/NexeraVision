import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  ChevronLeft,
  ChevronRight,
  Check,
  X,
  AlertTriangle,
  Settings,
  Zap,
  Shield,
  Globe,
  FileText,
  TestTube
} from 'lucide-react';

// Types
interface ProviderConfig {
  id: string;
  name: string;
  platform: 'careem' | 'talabat' | 'dhub' | 'jahez' | 'deliveroo';
  enabled: boolean;
  settings: {
    apiKey: string;
    apiSecret: string;
    endpoint: string;
    webhookUrl: string;
    timeout: number;
    retryAttempts: number;
    sandboxMode: boolean;
    customHeaders: Record<string, string>;
    features: string[];
  };
  credentials: {
    merchantId?: string;
    storeId?: string;
    terminalId?: string;
    accessToken?: string;
    refreshToken?: string;
  };
  businessSettings: {
    commissionRate: number;
    deliveryFee: number;
    minimumOrder: number;
    serviceAreas: string[];
    operatingHours: {
      [day: string]: { start: string; end: string; closed: boolean };
    };
  };
  testResults?: {
    connectionTest: boolean;
    authTest: boolean;
    webhookTest: boolean;
    orderTest: boolean;
    timestamp: string;
  };
}

interface WizardStep {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  validation: (config: Partial<ProviderConfig>) => string[];
}

// Predefined provider templates
const PROVIDER_TEMPLATES: Record<string, Partial<ProviderConfig>> = {
  careem: {
    platform: 'careem',
    name: 'Careem Now',
    settings: {
      endpoint: 'https://api.careem.com/v1',
      timeout: 30000,
      retryAttempts: 3,
      sandboxMode: true,
      features: ['orders', 'menu_sync', 'tracking', 'webhooks'],
      customHeaders: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      apiKey: '',
      apiSecret: '',
      webhookUrl: ''
    },
    businessSettings: {
      commissionRate: 15,
      deliveryFee: 2.5,
      minimumOrder: 10,
      serviceAreas: [],
      operatingHours: {
        monday: { start: '09:00', end: '23:00', closed: false },
        tuesday: { start: '09:00', end: '23:00', closed: false },
        wednesday: { start: '09:00', end: '23:00', closed: false },
        thursday: { start: '09:00', end: '23:00', closed: false },
        friday: { start: '09:00', end: '23:00', closed: false },
        saturday: { start: '09:00', end: '23:00', closed: false },
        sunday: { start: '09:00', end: '23:00', closed: false }
      }
    }
  },
  talabat: {
    platform: 'talabat',
    name: 'Talabat',
    settings: {
      endpoint: 'https://api.talabat.com/v2',
      timeout: 25000,
      retryAttempts: 2,
      sandboxMode: true,
      features: ['orders', 'menu_sync', 'promotions', 'analytics'],
      customHeaders: {
        'Content-Type': 'application/json'
      },
      apiKey: '',
      apiSecret: '',
      webhookUrl: ''
    },
    businessSettings: {
      commissionRate: 20,
      deliveryFee: 3.0,
      minimumOrder: 15,
      serviceAreas: [],
      operatingHours: {
        monday: { start: '10:00', end: '24:00', closed: false },
        tuesday: { start: '10:00', end: '24:00', closed: false },
        wednesday: { start: '10:00', end: '24:00', closed: false },
        thursday: { start: '10:00', end: '24:00', closed: false },
        friday: { start: '10:00', end: '24:00', closed: false },
        saturday: { start: '10:00', end: '24:00', closed: false },
        sunday: { start: '10:00', end: '24:00', closed: false }
      }
    }
  }
};

// Wizard steps definition
const WIZARD_STEPS: WizardStep[] = [
  {
    id: 'provider_selection',
    title: 'Select Provider',
    description: 'Choose the delivery provider you want to integrate',
    icon: Globe,
    validation: (config) => {
      const errors = [];
      if (!config.platform) errors.push('Please select a provider platform');
      if (!config.name?.trim()) errors.push('Provider name is required');
      return errors;
    }
  },
  {
    id: 'api_credentials',
    title: 'API Credentials',
    description: 'Configure API keys and authentication',
    icon: Shield,
    validation: (config) => {
      const errors = [];
      if (!config.settings?.apiKey?.trim()) errors.push('API Key is required');
      if (!config.settings?.apiSecret?.trim()) errors.push('API Secret is required');
      if (!config.settings?.endpoint?.trim()) errors.push('API Endpoint is required');
      return errors;
    }
  },
  {
    id: 'business_settings',
    title: 'Business Settings',
    description: 'Configure pricing and operational settings',
    icon: Settings,
    validation: (config) => {
      const errors = [];
      if (!config.businessSettings?.commissionRate || config.businessSettings.commissionRate < 0) {
        errors.push('Valid commission rate is required');
      }
      if (!config.businessSettings?.deliveryFee || config.businessSettings.deliveryFee < 0) {
        errors.push('Valid delivery fee is required');
      }
      if (!config.businessSettings?.minimumOrder || config.businessSettings.minimumOrder < 0) {
        errors.push('Valid minimum order amount is required');
      }
      return errors;
    }
  },
  {
    id: 'webhooks',
    title: 'Webhooks & Integration',
    description: 'Set up webhook endpoints and integration features',
    icon: Zap,
    validation: (config) => {
      const errors = [];
      if (!config.settings?.webhookUrl?.trim()) errors.push('Webhook URL is required');
      if (config.settings?.webhookUrl && !config.settings.webhookUrl.startsWith('http')) {
        errors.push('Webhook URL must be a valid HTTP/HTTPS URL');
      }
      return errors;
    }
  },
  {
    id: 'testing',
    title: 'Testing & Validation',
    description: 'Test the integration and validate configuration',
    icon: TestTube,
    validation: (config) => {
      const errors = [];
      if (!config.testResults?.connectionTest) errors.push('Connection test must pass');
      if (!config.testResults?.authTest) errors.push('Authentication test must pass');
      return errors;
    }
  }
];

interface ProviderSetupWizardProps {
  onComplete: (config: ProviderConfig) => void;
  onCancel: () => void;
  initialConfig?: Partial<ProviderConfig>;
}

// Individual step components
const ProviderSelectionStep: React.FC<{
  config: Partial<ProviderConfig>;
  onChange: (updates: Partial<ProviderConfig>) => void;
}> = ({ config, onChange }) => {
  const handleProviderSelect = (platform: string) => {
    const template = PROVIDER_TEMPLATES[platform];
    if (template) {
      onChange({ ...template, enabled: true });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4">Choose Provider Platform</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Object.entries(PROVIDER_TEMPLATES).map(([key, template]) => (
            <Card
              key={key}
              className={`cursor-pointer transition-all hover:shadow-md ${
                config.platform === key ? 'ring-2 ring-blue-500' : ''
              }`}
              onClick={() => handleProviderSelect(key)}
            >
              <CardContent className="p-6">
                <div className="text-center">
                  <div className="text-4xl mb-2">
                    {key === 'careem' ? '🚗' : key === 'talabat' ? '🍽️' : '📦'}
                  </div>
                  <h4 className="font-semibold">{template.name}</h4>
                  <p className="text-sm text-gray-600 mt-2">
                    Commission: {template.businessSettings?.commissionRate}%
                  </p>
                  {config.platform === key && (
                    <Badge className="mt-2 bg-blue-500">Selected</Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <Label htmlFor="provider-name">Provider Display Name</Label>
          <Input
            id="provider-name"
            value={config.name || ''}
            onChange={(e) => onChange({ name: e.target.value })}
            placeholder="Enter a display name for this provider"
          />
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox
            id="enable-provider"
            checked={config.enabled || false}
            onCheckedChange={(checked) => onChange({ enabled: checked === true })}
          />
          <Label htmlFor="enable-provider">Enable this provider immediately after setup</Label>
        </div>
      </div>
    </div>
  );
};

const APICredentialsStep: React.FC<{
  config: Partial<ProviderConfig>;
  onChange: (updates: Partial<ProviderConfig>) => void;
}> = ({ config, onChange }) => {
  const updateSettings = (updates: Partial<ProviderConfig['settings']>) => {
    onChange({
      settings: {
        ...config.settings,
        ...updates
      } as ProviderConfig['settings']
    });
  };

  return (
    <div className="space-y-6">
      <Alert>
        <Shield className="h-4 w-4" />
        <AlertDescription>
          Your API credentials are encrypted and stored securely. Never share these credentials with unauthorized parties.
        </AlertDescription>
      </Alert>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div>
            <Label htmlFor="api-key">API Key *</Label>
            <Input
              id="api-key"
              type="password"
              value={config.settings?.apiKey || ''}
              onChange={(e) => updateSettings({ apiKey: e.target.value })}
              placeholder="Enter your API key"
            />
          </div>

          <div>
            <Label htmlFor="api-secret">API Secret *</Label>
            <Input
              id="api-secret"
              type="password"
              value={config.settings?.apiSecret || ''}
              onChange={(e) => updateSettings({ apiSecret: e.target.value })}
              placeholder="Enter your API secret"
            />
          </div>

          <div>
            <Label htmlFor="api-endpoint">API Endpoint *</Label>
            <Input
              id="api-endpoint"
              value={config.settings?.endpoint || ''}
              onChange={(e) => updateSettings({ endpoint: e.target.value })}
              placeholder="https://api.provider.com/v1"
            />
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <Label htmlFor="merchant-id">Merchant ID</Label>
            <Input
              id="merchant-id"
              value={config.credentials?.merchantId || ''}
              onChange={(e) => onChange({
                credentials: {
                  ...config.credentials,
                  merchantId: e.target.value
                }
              })}
              placeholder="Your merchant identifier"
            />
          </div>

          <div>
            <Label htmlFor="store-id">Store ID</Label>
            <Input
              id="store-id"
              value={config.credentials?.storeId || ''}
              onChange={(e) => onChange({
                credentials: {
                  ...config.credentials,
                  storeId: e.target.value
                }
              })}
              placeholder="Your store identifier"
            />
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="sandbox-mode"
              checked={config.settings?.sandboxMode || false}
              onCheckedChange={(checked) => updateSettings({ sandboxMode: checked === true })}
            />
            <Label htmlFor="sandbox-mode">Enable sandbox/testing mode</Label>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h4 className="font-semibold">Advanced Settings</h4>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="timeout">Request Timeout (ms)</Label>
            <Input
              id="timeout"
              type="number"
              value={config.settings?.timeout || 30000}
              onChange={(e) => updateSettings({ timeout: parseInt(e.target.value) || 30000 })}
            />
          </div>

          <div>
            <Label htmlFor="retry-attempts">Retry Attempts</Label>
            <Input
              id="retry-attempts"
              type="number"
              min="0"
              max="5"
              value={config.settings?.retryAttempts || 3}
              onChange={(e) => updateSettings({ retryAttempts: parseInt(e.target.value) || 3 })}
            />
          </div>
        </div>

        <div>
          <Label htmlFor="custom-headers">Custom Headers (JSON)</Label>
          <Textarea
            id="custom-headers"
            value={JSON.stringify(config.settings?.customHeaders || {}, null, 2)}
            onChange={(e) => {
              try {
                const headers = JSON.parse(e.target.value);
                updateSettings({ customHeaders: headers });
              } catch (error) {
                // Invalid JSON, ignore
              }
            }}
            placeholder='{"X-Custom-Header": "value"}'
            rows={3}
          />
        </div>
      </div>
    </div>
  );
};

const BusinessSettingsStep: React.FC<{
  config: Partial<ProviderConfig>;
  onChange: (updates: Partial<ProviderConfig>) => void;
}> = ({ config, onChange }) => {
  const updateBusinessSettings = (updates: Partial<ProviderConfig['businessSettings']>) => {
    onChange({
      businessSettings: {
        ...config.businessSettings,
        ...updates
      } as ProviderConfig['businessSettings']
    });
  };

  const updateOperatingHours = (day: string, hours: { start: string; end: string; closed: boolean }) => {
    updateBusinessSettings({
      operatingHours: {
        ...config.businessSettings?.operatingHours,
        [day]: hours
      }
    });
  };

  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div>
          <Label htmlFor="commission-rate">Commission Rate (%)</Label>
          <Input
            id="commission-rate"
            type="number"
            min="0"
            max="100"
            step="0.1"
            value={config.businessSettings?.commissionRate || ''}
            onChange={(e) => updateBusinessSettings({ commissionRate: parseFloat(e.target.value) || 0 })}
          />
        </div>

        <div>
          <Label htmlFor="delivery-fee">Delivery Fee</Label>
          <Input
            id="delivery-fee"
            type="number"
            min="0"
            step="0.1"
            value={config.businessSettings?.deliveryFee || ''}
            onChange={(e) => updateBusinessSettings({ deliveryFee: parseFloat(e.target.value) || 0 })}
          />
        </div>

        <div>
          <Label htmlFor="minimum-order">Minimum Order</Label>
          <Input
            id="minimum-order"
            type="number"
            min="0"
            step="0.1"
            value={config.businessSettings?.minimumOrder || ''}
            onChange={(e) => updateBusinessSettings({ minimumOrder: parseFloat(e.target.value) || 0 })}
          />
        </div>
      </div>

      <div>
        <Label htmlFor="service-areas">Service Areas</Label>
        <Textarea
          id="service-areas"
          value={(config.businessSettings?.serviceAreas || []).join('\n')}
          onChange={(e) => updateBusinessSettings({ serviceAreas: e.target.value.split('\n').filter(area => area.trim()) })}
          placeholder="Enter service areas, one per line&#10;Downtown&#10;City Center&#10;Business District"
          rows={3}
        />
      </div>

      <div>
        <h4 className="font-semibold mb-4">Operating Hours</h4>
        <div className="space-y-3">
          {days.map(day => {
            const hours = config.businessSettings?.operatingHours?.[day] || { start: '09:00', end: '23:00', closed: false };

            return (
              <div key={day} className="flex items-center space-x-4">
                <div className="w-20 text-sm font-medium capitalize">{day}</div>

                <Checkbox
                  checked={hours.closed}
                  onCheckedChange={(checked) => updateOperatingHours(day, { ...hours, closed: checked === true })}
                />
                <Label className="text-sm">Closed</Label>

                {!hours.closed && (
                  <>
                    <Input
                      type="time"
                      value={hours.start}
                      onChange={(e) => updateOperatingHours(day, { ...hours, start: e.target.value })}
                      className="w-32"
                    />
                    <span className="text-sm">to</span>
                    <Input
                      type="time"
                      value={hours.end}
                      onChange={(e) => updateOperatingHours(day, { ...hours, end: e.target.value })}
                      className="w-32"
                    />
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

const WebhooksStep: React.FC<{
  config: Partial<ProviderConfig>;
  onChange: (updates: Partial<ProviderConfig>) => void;
}> = ({ config, onChange }) => {
  const updateSettings = (updates: Partial<ProviderConfig['settings']>) => {
    onChange({
      settings: {
        ...config.settings,
        ...updates
      } as ProviderConfig['settings']
    });
  };

  const toggleFeature = (feature: string, enabled: boolean) => {
    const currentFeatures = config.settings?.features || [];
    const updatedFeatures = enabled
      ? [...currentFeatures, feature]
      : currentFeatures.filter(f => f !== feature);

    updateSettings({ features: updatedFeatures });
  };

  const availableFeatures = [
    { id: 'orders', label: 'Order Management', description: 'Receive and manage orders from the platform' },
    { id: 'menu_sync', label: 'Menu Synchronization', description: 'Automatically sync menu items and pricing' },
    { id: 'tracking', label: 'Order Tracking', description: 'Real-time order status updates' },
    { id: 'webhooks', label: 'Webhook Notifications', description: 'Receive webhook notifications for events' },
    { id: 'promotions', label: 'Promotions', description: 'Manage promotional campaigns and discounts' },
    { id: 'analytics', label: 'Analytics Integration', description: 'Access to performance analytics and reports' }
  ];

  return (
    <div className="space-y-6">
      <div>
        <Label htmlFor="webhook-url">Webhook Endpoint URL *</Label>
        <Input
          id="webhook-url"
          value={config.settings?.webhookUrl || ''}
          onChange={(e) => updateSettings({ webhookUrl: e.target.value })}
          placeholder="https://your-domain.com/webhooks/provider"
        />
        <p className="text-sm text-gray-600 mt-1">
          This URL will receive webhook notifications from the provider
        </p>
      </div>

      <div>
        <h4 className="font-semibold mb-4">Integration Features</h4>
        <div className="space-y-3">
          {availableFeatures.map(feature => (
            <div key={feature.id} className="flex items-start space-x-3 p-3 border rounded-lg">
              <Checkbox
                checked={(config.settings?.features || []).includes(feature.id)}
                onCheckedChange={(checked) => toggleFeature(feature.id, checked === true)}
              />
              <div>
                <Label className="font-medium">{feature.label}</Label>
                <p className="text-sm text-gray-600">{feature.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <Alert>
        <Zap className="h-4 w-4" />
        <AlertDescription>
          Make sure your webhook endpoint can handle POST requests and responds with HTTP 200 status code.
          The system will retry failed webhook deliveries up to 3 times.
        </AlertDescription>
      </Alert>
    </div>
  );
};

const TestingStep: React.FC<{
  config: Partial<ProviderConfig>;
  onChange: (updates: Partial<ProviderConfig>) => void;
}> = ({ config, onChange }) => {
  const [testing, setTesting] = useState(false);
  const [testResults, setTestResults] = useState<ProviderConfig['testResults']>(config.testResults);

  const runTests = async () => {
    setTesting(true);

    try {
      // Connection test
      const connectionResult = await fetch('/api/providers/test/connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          endpoint: config.settings?.endpoint,
          timeout: config.settings?.timeout
        })
      });

      // Auth test
      const authResult = await fetch('/api/providers/test/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey: config.settings?.apiKey,
          apiSecret: config.settings?.apiSecret,
          endpoint: config.settings?.endpoint
        })
      });

      // Webhook test
      const webhookResult = await fetch('/api/providers/test/webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          webhookUrl: config.settings?.webhookUrl
        })
      });

      const results = {
        connectionTest: connectionResult.ok,
        authTest: authResult.ok,
        webhookTest: webhookResult.ok,
        orderTest: false, // Will be implemented separately
        timestamp: new Date().toISOString()
      };

      setTestResults(results);
      onChange({ testResults: results });

    } catch (error) {
      console.error('Test execution failed:', error);
      const results = {
        connectionTest: false,
        authTest: false,
        webhookTest: false,
        orderTest: false,
        timestamp: new Date().toISOString()
      };

      setTestResults(results);
      onChange({ testResults: results });
    } finally {
      setTesting(false);
    }
  };

  const testItems = [
    { key: 'connectionTest', label: 'API Connection', description: 'Test connection to provider API endpoint' },
    { key: 'authTest', label: 'Authentication', description: 'Verify API credentials and authentication' },
    { key: 'webhookTest', label: 'Webhook Endpoint', description: 'Test webhook endpoint accessibility' },
    { key: 'orderTest', label: 'Order Processing', description: 'Test order creation and processing flow' }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Integration Testing</h3>
          <p className="text-gray-600">Validate your configuration before activating the provider</p>
        </div>

        <Button onClick={runTests} disabled={testing} className="bg-blue-500 hover:bg-blue-600">
          {testing ? (
            <>
              <TestTube className="w-4 h-4 mr-2 animate-spin" />
              Running Tests...
            </>
          ) : (
            <>
              <TestTube className="w-4 h-4 mr-2" />
              Run All Tests
            </>
          )}
        </Button>
      </div>

      <div className="space-y-4">
        {testItems.map(test => {
          const result = testResults?.[test.key as keyof ProviderConfig['testResults']];
          const status = result === true ? 'passed' : result === false ? 'failed' : 'pending';

          return (
            <Card key={test.key}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">{test.label}</h4>
                    <p className="text-sm text-gray-600">{test.description}</p>
                  </div>

                  <div className="flex items-center space-x-2">
                    {status === 'passed' && (
                      <Badge className="bg-green-500">
                        <Check className="w-3 h-3 mr-1" />
                        Passed
                      </Badge>
                    )}
                    {status === 'failed' && (
                      <Badge variant="destructive">
                        <X className="w-3 h-3 mr-1" />
                        Failed
                      </Badge>
                    )}
                    {status === 'pending' && (
                      <Badge variant="secondary">
                        Pending
                      </Badge>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {testResults && (
        <Alert className={testResults.connectionTest && testResults.authTest ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {testResults.connectionTest && testResults.authTest ? (
              <span className="text-green-700">
                Tests completed successfully! Your provider configuration is ready to be activated.
              </span>
            ) : (
              <span className="text-red-700">
                Some tests failed. Please review your configuration and try again.
              </span>
            )}
            <p className="text-xs mt-1">
              Last tested: {new Date(testResults.timestamp).toLocaleString()}
            </p>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};

// Main wizard component
const ProviderSetupWizard: React.FC<ProviderSetupWizardProps> = ({ onComplete, onCancel, initialConfig = {} }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [config, setConfig] = useState<Partial<ProviderConfig>>(initialConfig);
  const [errors, setErrors] = useState<string[]>([]);

  const updateConfig = (updates: Partial<ProviderConfig>) => {
    setConfig(prev => ({
      ...prev,
      ...updates
    }));
  };

  const validateCurrentStep = () => {
    const step = WIZARD_STEPS[currentStep];
    const stepErrors = step.validation(config);
    setErrors(stepErrors);
    return stepErrors.length === 0;
  };

  const handleNext = () => {
    if (validateCurrentStep()) {
      if (currentStep < WIZARD_STEPS.length - 1) {
        setCurrentStep(currentStep + 1);
        setErrors([]);
      } else {
        // Complete wizard
        const completeConfig: ProviderConfig = {
          id: crypto.randomUUID(),
          enabled: config.enabled || false,
          ...config
        } as ProviderConfig;

        onComplete(completeConfig);
      }
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
      setErrors([]);
    }
  };

  const progress = ((currentStep + 1) / WIZARD_STEPS.length) * 100;
  const currentStepData = WIZARD_STEPS[currentStep];

  const renderStepContent = () => {
    switch (currentStepData.id) {
      case 'provider_selection':
        return <ProviderSelectionStep config={config} onChange={updateConfig} />;
      case 'api_credentials':
        return <APICredentialsStep config={config} onChange={updateConfig} />;
      case 'business_settings':
        return <BusinessSettingsStep config={config} onChange={updateConfig} />;
      case 'webhooks':
        return <WebhooksStep config={config} onChange={updateConfig} />;
      case 'testing':
        return <TestingStep config={config} onChange={updateConfig} />;
      default:
        return <div>Unknown step</div>;
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-2">Provider Setup Wizard</h1>
        <p className="text-gray-600 mb-4">Configure your delivery provider integration step by step</p>

        <Progress value={progress} className="w-full" />

        <div className="flex justify-between mt-2 text-sm text-gray-500">
          <span>Step {currentStep + 1} of {WIZARD_STEPS.length}</span>
          <span>{Math.round(progress)}% complete</span>
        </div>
      </div>

      {/* Steps navigation */}
      <div className="flex items-center justify-between mb-8">
        {WIZARD_STEPS.map((step, index) => {
          const isActive = index === currentStep;
          const isCompleted = index < currentStep;
          const IconComponent = step.icon;

          return (
            <div key={step.id} className="flex items-center">
              <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
                isCompleted ? 'bg-green-500 border-green-500 text-white' :
                isActive ? 'border-blue-500 text-blue-500' :
                'border-gray-300 text-gray-300'
              }`}>
                {isCompleted ? (
                  <Check className="w-5 h-5" />
                ) : (
                  <IconComponent className="w-5 h-5" />
                )}
              </div>

              {index < WIZARD_STEPS.length - 1 && (
                <div className={`w-16 h-0.5 mx-2 ${
                  isCompleted ? 'bg-green-500' : 'bg-gray-300'
                }`} />
              )}
            </div>
          );
        })}
      </div>

      {/* Step content */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center">
            <currentStepData.icon className="w-5 h-5 mr-2" />
            {currentStepData.title}
          </CardTitle>
          <p className="text-gray-600">{currentStepData.description}</p>
        </CardHeader>

        <CardContent>
          {renderStepContent()}

          {errors.length > 0 && (
            <Alert className="mt-4 border-red-200 bg-red-50">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-1">
                  {errors.map((error, index) => (
                    <div key={index} className="text-red-700">{error}</div>
                  ))}
                </div>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Navigation buttons */}
      <div className="flex justify-between">
        <div>
          <Button variant="outline" onClick={onCancel} className="mr-2">
            Cancel
          </Button>

          <Button
            variant="outline"
            onClick={handleBack}
            disabled={currentStep === 0}
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            Back
          </Button>
        </div>

        <Button onClick={handleNext} className="bg-blue-500 hover:bg-blue-600">
          {currentStep === WIZARD_STEPS.length - 1 ? 'Complete Setup' : 'Next'}
          {currentStep < WIZARD_STEPS.length - 1 && (
            <ChevronRight className="w-4 h-4 ml-1" />
          )}
        </Button>
      </div>
    </div>
  );
};

export default ProviderSetupWizard;