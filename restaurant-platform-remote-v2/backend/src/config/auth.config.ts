import { registerAs } from '@nestjs/config';

export const authConfig = registerAs('auth', () => ({
  // JWT configuration (inspired by Picolinate's 30-day tokens)
  jwt: {
    secret: process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production-2024',
    expiresIn: process.env.JWT_EXPIRES_IN || '30d', // 30 days like Picolinate
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-key',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '365d', // 1 year
    algorithm: 'HS256',
    issuer: process.env.JWT_ISSUER || 'restaurant-platform',
    audience: process.env.JWT_AUDIENCE || 'restaurant-users',
  },

  // Session configuration
  session: {
    secret: process.env.SESSION_SECRET || 'your-session-secret-key',
    name: process.env.SESSION_NAME || 'restaurant.session',
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: parseInt(process.env.SESSION_MAX_AGE, 10) || 30 * 24 * 60 * 60 * 1000, // 30 days
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
    },
  },

  // Password requirements (restaurant staff security)
  password: {
    minLength: parseInt(process.env.PASSWORD_MIN_LENGTH, 10) || 8,
    requireUppercase: process.env.PASSWORD_REQUIRE_UPPERCASE !== 'false',
    requireLowercase: process.env.PASSWORD_REQUIRE_LOWERCASE !== 'false',
    requireNumbers: process.env.PASSWORD_REQUIRE_NUMBERS !== 'false',
    requireSymbols: process.env.PASSWORD_REQUIRE_SYMBOLS !== 'false',
    maxAge: parseInt(process.env.PASSWORD_MAX_AGE_DAYS, 10) || 90, // 90 days
  },

  // Account security (like Picolinate's failed login tracking)
  security: {
    maxLoginAttempts: parseInt(process.env.MAX_LOGIN_ATTEMPTS, 10) || 5,
    lockoutDuration: parseInt(process.env.LOCKOUT_DURATION_MINUTES, 10) || 30,
    enableTwoFactor: process.env.ENABLE_2FA === 'true',
    sessionTimeout: parseInt(process.env.SESSION_TIMEOUT_MINUTES, 10) || 480, // 8 hours
    enablePasswordHistory: process.env.ENABLE_PASSWORD_HISTORY !== 'false',
    passwordHistoryCount: parseInt(process.env.PASSWORD_HISTORY_COUNT, 10) || 5,
  },

  // OAuth providers (for future integrations)
  oauth: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      enabled: process.env.GOOGLE_AUTH_ENABLED === 'true',
    },
    microsoft: {
      clientId: process.env.MICROSOFT_CLIENT_ID,
      clientSecret: process.env.MICROSOFT_CLIENT_SECRET,
      enabled: process.env.MICROSOFT_AUTH_ENABLED === 'true',
    },
  },

  // Multi-tenant auth settings
  multiTenant: {
    requireCompanyInToken: true,
    allowCrossCompanyAccess: false,
    enableBranchSpecificAuth: true,
    inheritPermissions: true, // branch users inherit company permissions
  },

  // Role-based access control (matching frontend roles)
  rbac: {
    roles: [
      'super_admin',
      'company_owner', 
      'manager',
      'callcenter',
      'cashier',
    ],
    defaultRole: 'cashier',
    enableRoleHierarchy: true,
    enablePermissionCaching: true,
    permissionCacheTtl: 300, // 5 minutes
  },
}));