import { z } from 'zod';
import {
  SupportedProvider,
  WebhookEventType,
  SecretStrength,
  SecretValidation
} from '@/types/webhook';

// Base webhook configuration schema
export const webhookConfigSchema = z.object({
  provider: z.nativeEnum(SupportedProvider, {
    required_error: 'Provider is required',
    invalid_type_error: 'Invalid provider selected'
  }),
  url: z.string()
    .url('Must be a valid URL')
    .min(1, 'URL is required')
    .refine((url) => url.startsWith('https://'), {
      message: 'HTTPS URL is required for security'
    }),
  events: z.array(z.nativeEnum(WebhookEventType))
    .min(1, 'At least one event must be selected')
    .max(20, 'Maximum 20 events can be selected'),
  description: z.string()
    .max(500, 'Description must be less than 500 characters')
    .optional(),
  isActive: z.boolean().default(true),
  timeoutMs: z.number()
    .min(1000, 'Timeout must be at least 1 second')
    .max(30000, 'Timeout cannot exceed 30 seconds')
    .default(15000),
  enableSignatureValidation: z.boolean().default(true),
  secretKey: z.string()
    .min(16, 'Secret key must be at least 16 characters')
    .max(256, 'Secret key cannot exceed 256 characters')
    .refine(validateSecretStrength, {
      message: 'Secret key must be strong enough (use at least 32 characters with mixed case, numbers, and special characters)'
    }),
  retryConfig: z.object({
    maxRetries: z.number()
      .min(0, 'Max retries cannot be negative')
      .max(10, 'Max retries cannot exceed 10')
      .default(3),
    exponentialBackoff: z.boolean().default(true),
    initialDelay: z.number()
      .min(1000, 'Initial delay must be at least 1 second')
      .max(60000, 'Initial delay cannot exceed 60 seconds')
      .default(1000),
    maxDelay: z.number()
      .min(1000, 'Max delay must be at least 1 second')
      .max(300000, 'Max delay cannot exceed 5 minutes')
      .default(30000),
  }).optional().refine((config) => {
    if (config && config.maxDelay < config.initialDelay) {
      return false;
    }
    return true;
  }, {
    message: 'Max delay must be greater than or equal to initial delay'
  }),
  headers: z.array(z.object({
    name: z.string()
      .min(1, 'Header name is required')
      .max(100, 'Header name too long')
      .refine((name) => /^[a-zA-Z0-9\-_]+$/.test(name), {
        message: 'Header name can only contain letters, numbers, hyphens, and underscores'
      }),
    value: z.string()
      .min(1, 'Header value is required')
      .max(1000, 'Header value too long')
  })).optional(),
  metadata: z.record(z.any()).optional()
});

// Provider-specific validation schemas
export const careemMetadataSchema = z.object({
  careemStoreId: z.string().optional(),
  branchId: z.string().optional(),
  autoAcceptOrders: z.boolean().optional(),
  sendOrderConfirmation: z.boolean().optional(),
  defaultPrepTime: z.number().min(5).max(180).optional(),
  notifyOnNewOrder: z.boolean().optional(),
  notifyOnCancellation: z.boolean().optional(),
  notifyOnStatusUpdate: z.boolean().optional(),
  careemApiKey: z.string().min(1).optional(),
  careemMerchantId: z.string().optional(),
  errorWebhookUrl: z.string().url().optional(),
  retryFailedOrders: z.boolean().optional(),
  enableTestMode: z.boolean().optional(),
});

export const talabatMetadataSchema = z.object({
  talabatRegion: z.enum(['uae', 'saudi', 'kuwait', 'bahrain', 'oman', 'qatar', 'jordan', 'egypt']).optional(),
  talabatRestaurantId: z.string().optional(),
  talabatBranchCode: z.string().optional(),
  internalBranchId: z.string().optional(),
  autoConfirmOrders: z.boolean().optional(),
  requireOrderAcknowledgment: z.boolean().optional(),
  orderPrepTime: z.number().min(10).max(180).optional(),
  acknowledgmentTimeout: z.number().min(30).max(300).optional(),
  enableMenuSync: z.boolean().optional(),
  syncItemAvailability: z.boolean().optional(),
  syncPricing: z.boolean().optional(),
  menuSyncInterval: z.enum(['15', '30', '60', '180', '360']).optional(),
  talabatApiKey: z.string().min(1).optional(),
  talabatWebhookSecret: z.string().min(1).optional(),
  validateTalabatSignature: z.boolean().optional(),
  enableDeliveryTracking: z.boolean().optional(),
  sendDeliveryUpdates: z.boolean().optional(),
  trackDriverLocation: z.boolean().optional(),
  minimumOrderValue: z.number().min(0).optional(),
  maximumOrderValue: z.number().min(0).optional(),
  rejectOrdersOutsideHours: z.boolean().optional(),
  enableSandboxMode: z.boolean().optional(),
  logAllRequests: z.boolean().optional(),
});

export const deliverooMetadataSchema = z.object({
  deliverooMarket: z.enum(['uk', 'ireland', 'france', 'spain', 'italy', 'germany', 'netherlands', 'belgium', 'australia', 'singapore', 'uae', 'kuwait']).optional(),
  kitchenType: z.enum(['restaurant', 'dark_kitchen', 'virtual_brand', 'marketplace']).optional(),
  deliverooRestaurantId: z.string().optional(),
  deliverooSiteId: z.string().optional(),
  autoAcceptOrders: z.boolean().optional(),
  enableOrderBatching: z.boolean().optional(),
  preparationTime: z.number().min(5).max(120).optional(),
  pickupTime: z.number().min(1).max(30).optional(),
  maxAcceptanceTime: z.number().min(30).max(300).optional(),
  enableRealTimeMenu: z.boolean().optional(),
  syncItemAvailability: z.boolean().optional(),
  enableModifierSync: z.boolean().optional(),
  enablePriceSync: z.boolean().optional(),
  menuUpdateEndpoint: z.string().url().optional(),
  deliverooApiKey: z.string().min(1).optional(),
  webhookSigningSecret: z.string().min(1).optional(),
  clientId: z.string().optional(),
  clientSecret: z.string().optional(),
  enableSignatureValidation: z.boolean().optional(),
  notifyOnNewOrder: z.boolean().optional(),
  notifyOnOrderCancellation: z.boolean().optional(),
  notifyOnDeliveryUpdate: z.boolean().optional(),
  notifyOnMenuErrors: z.boolean().optional(),
  notificationEmail: z.string().email().optional(),
  riderAssignmentMode: z.enum(['auto', 'manual', 'hybrid']).optional(),
  deliveryRadius: z.number().min(1).max(50).optional(),
  enablePreOrders: z.boolean().optional(),
  enableTableService: z.boolean().optional(),
  enableCollectionOrders: z.boolean().optional(),
  errorCallbackUrl: z.string().url().optional(),
  enableDetailedLogging: z.boolean().optional(),
  monitoringNotes: z.string().max(1000).optional(),
  enableSandboxMode: z.boolean().optional(),
});

export const jahezMetadataSchema = z.object({
  jahezCity: z.enum(['riyadh', 'jeddah', 'dammam', 'mecca', 'medina', 'khobar', 'taif', 'tabuk', 'abha', 'khamis_mushait']).optional(),
  businessType: z.enum(['restaurant', 'cafe', 'bakery', 'fast_food', 'fine_dining', 'street_food', 'desserts', 'juice_bar']).optional(),
  jahezRestaurantId: z.string().optional(),
  commercialRegisterNumber: z.string().optional(),
  restaurantNameArabic: z.string().optional(),
  restaurantNameEnglish: z.string().optional(),
  addressArabic: z.string().optional(),
  enableArabicSupport: z.boolean().optional(),
  autoConfirmOrders: z.boolean().optional(),
  enableOrderScheduling: z.boolean().optional(),
  preparationTime: z.number().min(10).max(180).optional(),
  minimumOrderValue: z.number().min(0).optional(),
  deliveryFee: z.number().min(0).optional(),
  respectPrayerTimes: z.boolean().optional(),
  pauseOrdersDuringPrayer: z.boolean().optional(),
  enableRamadanHours: z.boolean().optional(),
  jahezApiKey: z.string().min(1).optional(),
  jahezWebhookSecret: z.string().min(1).optional(),
  acceptCash: z.boolean().optional(),
  acceptMada: z.boolean().optional(),
  acceptVisa: z.boolean().optional(),
  acceptSTCPay: z.boolean().optional(),
  acceptApplePay: z.boolean().optional(),
  acceptTamara: z.boolean().optional(),
  isHalalCertified: z.boolean().optional(),
  hasFoodSafetyLicense: z.boolean().optional(),
  hasHealthPermit: z.boolean().optional(),
  halalCertificateNumber: z.string().optional(),
  enableSMSNotifications: z.boolean().optional(),
  enableWhatsAppNotifications: z.boolean().optional(),
  sendArabicMessages: z.boolean().optional(),
  contactPhone: z.string().regex(/^\+966\s5\d{1}\s\d{3}\s\d{4}$/, 'Invalid Saudi phone number format').optional(),
  deliveryRadius: z.number().min(1).max(30).optional(),
  estimatedDeliveryTime: z.number().min(15).max(120).optional(),
  offerExpressDelivery: z.boolean().optional(),
  enableTestMode: z.boolean().optional(),
  enableDebugLogging: z.boolean().optional(),
});

// Secret strength validation function
export function validateSecretStrength(secret: string): boolean {
  const analysis = analyzeSecretStrength(secret);
  return analysis.strength !== 'weak';
}

// Analyze secret strength
export function analyzeSecretStrength(secret: string): SecretValidation {
  if (!secret) {
    return {
      strength: 'weak',
      score: 0,
      feedback: ['Secret is required'],
      minLength: false,
      hasUpperCase: false,
      hasLowerCase: false,
      hasNumbers: false,
      hasSpecialChars: false,
    };
  }

  const minLength = secret.length >= 32;
  const hasUpperCase = /[A-Z]/.test(secret);
  const hasLowerCase = /[a-z]/.test(secret);
  const hasNumbers = /[0-9]/.test(secret);
  const hasSpecialChars = /[^A-Za-z0-9]/.test(secret);

  let score = 0;
  const feedback: string[] = [];

  // Length scoring
  if (secret.length >= 64) {
    score += 3;
  } else if (secret.length >= 32) {
    score += 2;
  } else if (secret.length >= 16) {
    score += 1;
    feedback.push('Consider using a longer secret (32+ characters recommended)');
  } else {
    feedback.push('Secret is too short (minimum 16 characters)');
  }

  // Character variety scoring
  if (hasUpperCase) score += 1;
  else feedback.push('Add uppercase letters for better security');

  if (hasLowerCase) score += 1;
  else feedback.push('Add lowercase letters for better security');

  if (hasNumbers) score += 1;
  else feedback.push('Add numbers for better security');

  if (hasSpecialChars) score += 1;
  else feedback.push('Add special characters for better security');

  // Determine strength
  let strength: SecretStrength;
  if (score >= 7) {
    strength = 'strong';
  } else if (score >= 4) {
    strength = 'medium';
    if (feedback.length === 0) {
      feedback.push('Good security level, consider improvements for enterprise use');
    }
  } else {
    strength = 'weak';
    if (feedback.length === 0) {
      feedback.push('Secret needs significant improvement');
    }
  }

  return {
    strength,
    score,
    feedback,
    minLength,
    hasUpperCase,
    hasLowerCase,
    hasNumbers,
    hasSpecialChars,
  };
}

// URL validation for webhooks
export function validateWebhookUrl(url: string): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  try {
    const parsed = new URL(url);

    // Must be HTTPS
    if (parsed.protocol !== 'https:') {
      errors.push('HTTPS protocol is required for webhook URLs');
    }

    // Shouldn't be localhost in production
    if (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1') {
      warnings.push('Localhost URLs will not work in production environments');
    }

    // Should have a path
    if (parsed.pathname === '/') {
      warnings.push('Consider using a specific path for your webhook endpoint');
    }

    // Common webhook path validation
    const commonPaths = ['/webhook', '/webhooks', '/api/webhook', '/api/webhooks'];
    const hasCommonPath = commonPaths.some(path => parsed.pathname.includes(path));
    if (!hasCommonPath) {
      warnings.push('Consider using a standard webhook path like /webhooks or /api/webhooks');
    }

  } catch (error) {
    errors.push('Invalid URL format');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

// Event validation for providers
export function validateEventsForProvider(
  provider: SupportedProvider,
  events: WebhookEventType[]
): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Provider-specific event validation
  const providerSpecificEvents: Record<SupportedProvider, WebhookEventType[]> = {
    [SupportedProvider.CAREEM]: [WebhookEventType.CAREEM_ORDER_NOTIFICATION],
    [SupportedProvider.TALABAT]: [WebhookEventType.TALABAT_STATUS_UPDATE],
    [SupportedProvider.DELIVEROO]: [WebhookEventType.DELIVEROO_ORDER_EVENT],
    [SupportedProvider.JAHEZ]: [WebhookEventType.JAHEZ_ORDER_ACTION],
    [SupportedProvider.UBER_EATS]: [],
    [SupportedProvider.FOODPANDA]: [],
    [SupportedProvider.POS_SYSTEM]: [],
  };

  // Check for missing critical events
  const criticalEvents = [
    WebhookEventType.ORDER_CREATED,
    WebhookEventType.ORDER_CANCELLED,
  ];

  const missingCritical = criticalEvents.filter(event => !events.includes(event));
  if (missingCritical.length > 0) {
    warnings.push(`Consider adding critical events: ${missingCritical.join(', ')}`);
  }

  // Check for provider-specific events
  const providerEvents = providerSpecificEvents[provider];
  const hasProviderEvents = providerEvents.some(event => events.includes(event));
  if (providerEvents.length > 0 && !hasProviderEvents) {
    warnings.push(`Consider adding ${provider}-specific events for better integration`);
  }

  // Check for too many events (performance consideration)
  if (events.length > 15) {
    warnings.push('Large number of events may impact performance. Consider filtering to essential events only.');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

// Form validation helpers
export function getValidationSchema(provider: SupportedProvider) {
  let metadataSchema;

  switch (provider) {
    case SupportedProvider.CAREEM:
      metadataSchema = careemMetadataSchema;
      break;
    case SupportedProvider.TALABAT:
      metadataSchema = talabatMetadataSchema;
      break;
    case SupportedProvider.DELIVEROO:
      metadataSchema = deliverooMetadataSchema;
      break;
    case SupportedProvider.JAHEZ:
      metadataSchema = jahezMetadataSchema;
      break;
    default:
      metadataSchema = z.record(z.any()).optional();
  }

  return webhookConfigSchema.extend({
    metadata: metadataSchema,
  });
}

export type WebhookConfigFormData = z.infer<typeof webhookConfigSchema>;