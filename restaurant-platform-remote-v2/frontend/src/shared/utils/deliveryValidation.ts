// Enhanced validation utility for delivery providers and integrations
// Zero-mistake integration validation system

export interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string[]>;
  warnings: Record<string, string[]>;
  suggestions: Record<string, string[]>;
}

export interface ProviderCredentials {
  [key: string]: any;
}

export interface ProviderConfiguration {
  [key: string]: any;
}

// Provider-specific validation schemas
interface ValidationRules {
  required?: {
    credentials?: string[];
    configuration?: string[];
  };
  validation?: {
    [key: string]: any;
  };
}

const PROVIDER_VALIDATION_RULES: Record<string, ValidationRules> = {
  dhub: {
    required: {
      credentials: ['apiKey', 'branchId'],
      configuration: ['environment', 'webhookUrl']
    },
    validation: {
      apiKey: { minLength: 20, pattern: /^[A-Za-z0-9_-]+$/ },
      branchId: { minLength: 5, pattern: /^[A-Za-z0-9]+$/ },
      webhookUrl: { pattern: /^https:\/\/.+/ }
    }
  },
  
  talabat: {
    required: {
      credentials: ['clientId', 'clientSecret'],
      configuration: ['market', 'environment']
    },
    validation: {
      clientId: { minLength: 10, pattern: /^[A-Za-z0-9]+$/ },
      clientSecret: { minLength: 20, pattern: /^[A-Za-z0-9_-]+$/ },
      market: { enum: ['jordan', 'saudi', 'uae', 'kuwait', 'qatar', 'bahrain', 'oman'] }
    }
  },

  careem: {
    required: {
      credentials: ['clientId', 'clientSecret'],
      configuration: ['market', 'environment']
    },
    validation: {
      clientId: { minLength: 10, pattern: /^[A-Za-z0-9]+$/ },
      clientSecret: { minLength: 20, pattern: /^[A-Za-z0-9_-]+$/ },
      market: { enum: ['jordan', 'saudi', 'uae', 'egypt', 'pakistan'] }
    }
  },

  careemexpress: {
    required: {
      credentials: ['clientId', 'clientSecret'],
      configuration: ['market', 'serviceType']
    },
    validation: {
      clientId: { minLength: 10, pattern: /^[A-Za-z0-9]+$/ },
      clientSecret: { minLength: 20, pattern: /^[A-Za-z0-9_-]+$/ },
      market: { enum: ['uae', 'saudi'] },
      serviceType: { enum: ['express', 'now'] }
    }
  },

  jahez: {
    required: {
      credentials: ['apiKey', 'merchantId'],
      configuration: ['region', 'environment']
    },
    validation: {
      apiKey: { minLength: 20, pattern: /^[A-Za-z0-9_-]+$/ },
      merchantId: { minLength: 5, pattern: /^[0-9]+$/ },
      region: { enum: ['riyadh', 'jeddah', 'dammam', 'mecca', 'medina'] }
    }
  },

  deliveroo: {
    required: {
      credentials: ['clientId', 'clientSecret'],
      configuration: ['market', 'environment']
    },
    validation: {
      clientId: { minLength: 10, pattern: /^[A-Za-z0-9]+$/ },
      clientSecret: { minLength: 20, pattern: /^[A-Za-z0-9_-]+$/ },
      market: { enum: ['uk', 'france', 'belgium', 'uae', 'singapore', 'australia'] }
    }
  },

  yallow: {
    required: {
      credentials: ['apiKey'],
      configuration: ['branchCode', 'city']
    },
    validation: {
      apiKey: { minLength: 15, pattern: /^[A-Za-z0-9_-]+$/ },
      branchCode: { minLength: 3, pattern: /^[A-Z0-9]+$/ },
      city: { enum: ['amman', 'zarqa', 'irbid'] }
    }
  },

  jooddelivery: {
    required: {
      credentials: ['apiKey', 'storeId'],
      configuration: ['city', 'environment']
    },
    validation: {
      apiKey: { minLength: 20, pattern: /^[A-Za-z0-9_-]+$/ },
      storeId: { minLength: 3, pattern: /^[0-9]+$/ },
      city: { enum: ['riyadh', 'jeddah', 'dammam'] }
    }
  },

  topdeliver: {
    required: {
      credentials: ['apiKey', 'merchantCode'],
      configuration: ['paymentMethod', 'environment']
    },
    validation: {
      apiKey: { minLength: 20, pattern: /^[A-Za-z0-9_-]+$/ },
      merchantCode: { minLength: 5, pattern: /^[A-Z0-9]+$/ },
      paymentMethod: { enum: ['knet', 'visa', 'mastercard'] }
    }
  },

  nashmi: {
    required: {
      credentials: ['apiKey', 'vendorId'],
      configuration: ['zone', 'environment']
    },
    validation: {
      apiKey: { minLength: 20, pattern: /^[A-Za-z0-9_-]+$/ },
      vendorId: { minLength: 3, pattern: /^[0-9]+$/ },
      zone: { enum: ['doha', 'al_wakra', 'al_rayyan'] }
    }
  },

  tawasi: {
    required: {
      credentials: ['apiKey', 'restaurantId'],
      configuration: ['region', 'environment']
    },
    validation: {
      apiKey: { minLength: 20, pattern: /^[A-Za-z0-9_-]+$/ },
      restaurantId: { minLength: 3, pattern: /^[0-9]+$/ },
      region: { enum: ['beirut', 'tripoli', 'sidon'] }
    }
  },

  delivergy: {
    required: {
      credentials: ['apiKey', 'clientId'],
      configuration: ['region', 'serviceType']
    },
    validation: {
      apiKey: { minLength: 20, pattern: /^[A-Za-z0-9_-]+$/ },
      clientId: { minLength: 10, pattern: /^[A-Za-z0-9]+$/ },
      region: { enum: ['gcc', 'levant', 'north_africa'] },
      serviceType: { enum: ['standard', 'express', 'bulk'] }
    }
  },

  utrac: {
    required: {
      credentials: ['apiKey', 'trackingId'],
      configuration: ['trackingMode', 'environment']
    },
    validation: {
      apiKey: { minLength: 20, pattern: /^[A-Za-z0-9_-]+$/ },
      trackingId: { minLength: 5, pattern: /^[A-Za-z0-9]+$/ },
      trackingMode: { enum: ['real_time', 'batch', 'webhook'] }
    }
  },

  local_delivery: {
    required: {
      configuration: ['deliveryRadius', 'baseFee']
    },
    validation: {
      deliveryRadius: { min: 1, max: 50, type: 'number' },
      baseFee: { min: 0, max: 100, type: 'number' }
    }
  }
};

export function validateProviderConfig(
  providerType: string,
  credentials: ProviderCredentials,
  configuration: ProviderConfiguration
): ValidationResult {
  const result: ValidationResult = {
    isValid: true,
    errors: {},
    warnings: {},
    suggestions: {}
  };

  const rules = PROVIDER_VALIDATION_RULES[providerType as keyof typeof PROVIDER_VALIDATION_RULES];
  if (!rules) {
    result.isValid = false;
    result.errors.general = [`Unknown provider type: ${providerType}`];
    return result;
  }

  // Validate required credentials
  if (rules.required?.credentials) {
    for (const field of rules.required.credentials) {
      if (!credentials[field] || credentials[field].trim() === '') {
        result.isValid = false;
        if (!result.errors.credentials) result.errors.credentials = [];
        result.errors.credentials.push(`${field} is required`);
      }
    }
  }

  // Validate required configuration
  if (rules.required?.configuration) {
    for (const field of rules.required.configuration) {
      if (!configuration[field] || (typeof configuration[field] === 'string' && configuration[field].trim() === '')) {
        result.isValid = false;
        if (!result.errors.configuration) result.errors.configuration = [];
        result.errors.configuration.push(`${field} is required`);
      }
    }
  }

  // Validate field formats and constraints
  if (rules.validation) {
    for (const [field, constraints] of Object.entries(rules.validation)) {
      const value = credentials[field] || configuration[field];
      if (value) {
        if (constraints.minLength && value.length < constraints.minLength) {
          result.isValid = false;
          if (!result.errors[field]) result.errors[field] = [];
          result.errors[field].push(`Minimum length is ${constraints.minLength} characters`);
        }

        if (constraints.pattern && !constraints.pattern.test(value)) {
          result.isValid = false;
          if (!result.errors[field]) result.errors[field] = [];
          result.errors[field].push(`Invalid format for ${field}`);
        }

        if (constraints.enum && !constraints.enum.includes(value)) {
          result.isValid = false;
          if (!result.errors[field]) result.errors[field] = [];
          result.errors[field].push(`Must be one of: ${constraints.enum.join(', ')}`);
        }

        if (constraints.type === 'number') {
          const numValue = parseFloat(value);
          if (isNaN(numValue)) {
            result.isValid = false;
            if (!result.errors[field]) result.errors[field] = [];
            result.errors[field].push(`Must be a valid number`);
          } else {
            if (constraints.min !== undefined && numValue < constraints.min) {
              result.isValid = false;
              if (!result.errors[field]) result.errors[field] = [];
              result.errors[field].push(`Minimum value is ${constraints.min}`);
            }
            if (constraints.max !== undefined && numValue > constraints.max) {
              result.isValid = false;
              if (!result.errors[field]) result.errors[field] = [];
              result.errors[field].push(`Maximum value is ${constraints.max}`);
            }
          }
        }
      }
    }
  }

  // Add provider-specific suggestions
  addProviderSuggestions(providerType, credentials, configuration, result);

  return result;
}

function addProviderSuggestions(
  providerType: string,
  credentials: ProviderCredentials,
  configuration: ProviderConfiguration,
  result: ValidationResult
) {
  switch (providerType) {
    case 'dhub':
      if (!result.suggestions.dhub) result.suggestions.dhub = [];
      result.suggestions.dhub.push('Test with sandbox environment first before switching to production');
      if (configuration.environment === 'production' && !configuration.webhookUrl) {
        if (!result.warnings.webhookUrl) result.warnings.webhookUrl = [];
        result.warnings.webhookUrl.push('Webhook URL recommended for real-time order updates');
      }
      break;

    case 'talabat':
      if (!result.suggestions.talabat) result.suggestions.talabat = [];
      result.suggestions.talabat.push('Ensure your restaurant is approved by Talabat before going live');
      if (configuration.market && ['jordan', 'saudi'].includes(configuration.market)) {
        result.suggestions.talabat.push(`${configuration.market} market requires local business registration`);
      }
      break;

    case 'careem':
    case 'careemexpress':
      if (!result.suggestions.careem) result.suggestions.careem = [];
      result.suggestions.careem.push('Careem requires restaurant verification and menu approval');
      if (providerType === 'careemexpress' && !['uae', 'saudi'].includes(configuration.market)) {
        if (!result.warnings.market) result.warnings.market = [];
        result.warnings.market.push('Careem Express is only available in UAE and Saudi Arabia');
      }
      break;

    case 'deliveroo':
      if (!result.suggestions.deliveroo) result.suggestions.deliveroo = [];
      result.suggestions.deliveroo.push('Deliveroo has strict quality standards - ensure menu photos and descriptions are high quality');
      break;

    case 'local_delivery':
      if (!result.suggestions.local_delivery) result.suggestions.local_delivery = [];
      result.suggestions.local_delivery.push('Consider integrating with a tracking system for customer visibility');
      if (configuration.deliveryRadius > 20) {
        if (!result.warnings.deliveryRadius) result.warnings.deliveryRadius = [];
        result.warnings.deliveryRadius.push('Large delivery radius may impact delivery times and customer satisfaction');
      }
      break;
  }
}

export function validateApiEndpoint(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' && parsed.hostname !== '';
  } catch {
    return false;
  }
}

export function validateWebhookUrl(url: string): boolean {
  return validateApiEndpoint(url) && url.includes('/webhook');
}

export function generateSecureCredentials(): { apiKey: string; secret: string } {
  const apiKey = Array.from(crypto.getRandomValues(new Uint8Array(32)))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  
  const secret = Array.from(crypto.getRandomValues(new Uint8Array(64)))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');

  return { apiKey, secret };
}

// Test configuration connectivity
export async function testProviderConnection(
  providerType: string,
  credentials: ProviderCredentials,
  configuration: ProviderConfiguration
): Promise<{ success: boolean; message: string; details?: any }> {
  // This would integrate with your backend API to test actual connections
  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002/api/v1';
  
  try {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_BASE_URL}/delivery/test-provider-connection`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        providerType,
        credentials,
        configuration
      })
    });

    const result = await response.json();
    return result;
  } catch (error) {
    return {
      success: false,
      message: 'Failed to test connection - check your network and try again',
      details: error
    };
  }
}

export const INTEGRATION_CHECKLIST = {
  pre_integration: [
    'Verify provider account is active and approved',
    'Confirm API credentials are valid and not expired',
    'Test connection in sandbox/staging environment first',
    'Ensure webhook URLs are accessible and secure (HTTPS)',
    'Verify restaurant/branch details match provider records',
  ],
  
  during_integration: [
    'Monitor API response times and error rates',
    'Validate order data mapping and field completeness',
    'Test error handling and fallback scenarios',
    'Verify webhook payload formats and signatures',
    'Check timezone and currency handling',
  ],
  
  post_integration: [
    'Monitor order success rates and delivery times',
    'Set up alerting for failed orders and API errors',
    'Regularly validate API credentials and refresh tokens',
    'Monitor provider-specific metrics and KPIs',
    'Schedule periodic integration health checks',
  ]
};