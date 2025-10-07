/**
 * Localization Type Definitions
 * Provides type-safe handling of multi-language strings
 */

/**
 * Standard localized string structure
 * All localized fields should use this type instead of string | object | any
 */
export type LocalizedString = {
  en: string;
  ar?: string;
} | string;

/**
 * Type guard to check if a value is a localized object
 */
export function isLocalizedObject(value: unknown): value is { en: string; ar?: string } {
  return (
    typeof value === 'object' &&
    value !== null &&
    'en' in value &&
    typeof (value as any).en === 'string'
  );
}

/**
 * Type guard to check if a value is a valid localized string
 */
export function isValidLocalizedString(value: unknown): value is LocalizedString {
  return typeof value === 'string' || isLocalizedObject(value);
}

/**
 * Safely extract localized text from a LocalizedString
 * Handles both string and object formats with proper fallbacks
 *
 * @param text - The localized string to extract
 * @param language - Preferred language ('en' or 'ar')
 * @param fallback - Fallback text if extraction fails
 * @returns Extracted text in the preferred language
 */
export function getLocalizedText(
  text: LocalizedString | null | undefined,
  language: 'en' | 'ar' = 'en',
  fallback: string = ''
): string {
  // Handle null/undefined
  if (text == null) {
    return fallback;
  }

  // Handle plain string
  if (typeof text === 'string') {
    return text;
  }

  // Handle localized object
  if (isLocalizedObject(text)) {
    // Prefer requested language, fallback to English, then Arabic, then empty
    return text[language] || text.en || text.ar || fallback;
  }

  // Unexpected type - return fallback
  console.warn('Unexpected localized text format:', text);
  return fallback;
}

/**
 * Create a localized string from separate language values
 */
export function createLocalizedString(en: string, ar?: string): LocalizedString {
  if (ar) {
    return { en, ar };
  }
  return en;
}

/**
 * Type-safe platform display name
 * Replaces the permissive string | object | any pattern
 */
export type PlatformDisplayName = LocalizedString;

/**
 * Helper to get platform display name safely
 */
export function getPlatformDisplayName(
  platform: {
    displayName?: PlatformDisplayName;
    name?: string;
  },
  language: 'en' | 'ar' = 'en'
): string {
  // First try displayName
  if (platform.displayName) {
    const displayName = getLocalizedText(platform.displayName, language);
    if (displayName) return displayName;
  }

  // Fallback to name
  if (platform.name) {
    return getLocalizedText(platform.name as LocalizedString, language);
  }

  // Ultimate fallback
  return 'Unknown Platform';
}

/**
 * Helper to get branch name safely
 */
export function getBranchName(
  branch: {
    name?: LocalizedString;
  },
  language: 'en' | 'ar' = 'en'
): string {
  return getLocalizedText(branch.name, language, 'Unknown Branch');
}

/**
 * Helper to get category name safely
 */
export function getCategoryName(
  category: {
    name?: LocalizedString;
  },
  language: 'en' | 'ar' = 'en'
): string {
  return getLocalizedText(category.name, language, 'Unknown Category');
}

/**
 * Helper to get product name safely
 */
export function getProductName(
  product: {
    name?: LocalizedString;
  },
  language: 'en' | 'ar' = 'en'
): string {
  return getLocalizedText(product.name, language, 'Unknown Product');
}

/**
 * Helper to get channel display name safely
 */
export function getChannelDisplayName(
  channel: {
    displayName?: { en: string; ar?: string };
    name?: LocalizedString;
  },
  language: 'en' | 'ar' = 'en'
): string {
  // First try displayName
  if (channel.displayName) {
    const text = channel.displayName[language] || channel.displayName.en;
    if (text) return text;
  }

  // Fallback to name
  if (channel.name) {
    return getLocalizedText(channel.name, language);
  }

  // Ultimate fallback
  return 'Unknown Channel';
}

export default {
  getLocalizedText,
  createLocalizedString,
  getPlatformDisplayName,
  getBranchName,
  getCategoryName,
  getProductName,
  getChannelDisplayName,
  isLocalizedObject,
  isValidLocalizedString,
};
