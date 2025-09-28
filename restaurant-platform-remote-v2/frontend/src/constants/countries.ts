// Arab country codes for phone validation
export const COUNTRY_CODES = [
  { code: '+962', country: 'Jordan', flag: '🇯🇴', pattern: /^[0-9]{9}$/ },
  { code: '+966', country: 'Saudi Arabia', flag: '🇸🇦', pattern: /^[0-9]{9}$/ },
  { code: '+971', country: 'United Arab Emirates', flag: '🇦🇪', pattern: /^[0-9]{9}$/ },
  { code: '+20', country: 'Egypt', flag: '🇪🇬', pattern: /^[0-9]{10}$/ },
  { code: '+961', country: 'Lebanon', flag: '🇱🇧', pattern: /^[0-9]{8}$/ },
  { code: '+965', country: 'Kuwait', flag: '🇰🇼', pattern: /^[0-9]{8}$/ },
  { code: '+973', country: 'Bahrain', flag: '🇧🇭', pattern: /^[0-9]{8}$/ },
  { code: '+974', country: 'Qatar', flag: '🇶🇦', pattern: /^[0-9]{8}$/ },
  { code: '+968', country: 'Oman', flag: '🇴🇲', pattern: /^[0-9]{8}$/ },
  { code: '+964', country: 'Iraq', flag: '🇮🇶', pattern: /^[0-9]{10}$/ },
  { code: '+963', country: 'Syria', flag: '🇸🇾', pattern: /^[0-9]{9}$/ },
  { code: '+212', country: 'Morocco', flag: '🇲🇦', pattern: /^[0-9]{9}$/ },
  { code: '+213', country: 'Algeria', flag: '🇩🇿', pattern: /^[0-9]{9}$/ },
  { code: '+216', country: 'Tunisia', flag: '🇹🇳', pattern: /^[0-9]{8}$/ }
] as const;