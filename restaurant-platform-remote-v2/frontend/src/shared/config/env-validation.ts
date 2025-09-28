interface ClientEnvironmentConfig {
  NEXT_PUBLIC_API_URL: string;
  NODE_ENV: string;
  NEXTAUTH_URL?: string;
  NEXTAUTH_SECRET?: string;
}

class EnvValidationService {
  private config: ClientEnvironmentConfig;
  private errors: string[] = [];
  private warnings: string[] = [];

  constructor() {
    this.validateEnvironment();
  }

  private validateEnvironment(): void {
    // Required client-side variables
    const requiredClientVars = {
      NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
      NODE_ENV: process.env.NODE_ENV,
    };

    // Optional variables (for NextAuth if used)
    const optionalVars = {
      NEXTAUTH_URL: process.env.NEXTAUTH_URL,
      NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
    };

    // Check required variables
    Object.entries(requiredClientVars).forEach(([key, value]) => {
      if (!value || value.trim() === '') {
        this.errors.push(`Missing required environment variable: ${key}`);
      }
    });

    // Validate API URL format
    if (process.env.NEXT_PUBLIC_API_URL) {
      if (!process.env.NEXT_PUBLIC_API_URL.startsWith('http')) {
        this.errors.push('NEXT_PUBLIC_API_URL must be a valid HTTP/HTTPS URL');
      }
      if (process.env.NEXT_PUBLIC_API_URL.endsWith('/')) {
        this.warnings.push('NEXT_PUBLIC_API_URL should not end with a trailing slash');
      }
    }

    // Production-specific validations
    if (process.env.NODE_ENV === 'production') {
      if (process.env.NEXT_PUBLIC_API_URL?.includes('localhost')) {
        this.errors.push('NEXT_PUBLIC_API_URL should not use localhost in production');
      }
      
      if (process.env.NEXTAUTH_SECRET === 'your-nextauth-secret-key-change-in-production') {
        this.errors.push('NEXTAUTH_SECRET must be changed from default value in production');
      }

      if (!process.env.NEXTAUTH_URL) {
        this.warnings.push('NEXTAUTH_URL should be set in production for proper NextAuth functionality');
      }
    }

    // Development-specific validations
    if (process.env.NODE_ENV === 'development') {
      if (process.env.NEXT_PUBLIC_API_URL && !process.env.NEXT_PUBLIC_API_URL.includes('localhost') && !process.env.NEXT_PUBLIC_API_URL.includes('127.0.0.1')) {
        this.warnings.push('Using remote API URL in development - ensure this is intentional');
      }
    }

    // Build configuration object with defaults
    this.config = {
      NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001',
      NODE_ENV: process.env.NODE_ENV || 'development',
      NEXTAUTH_URL: process.env.NEXTAUTH_URL,
      NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
    };

    // Log results (only in development)
    if (process.env.NODE_ENV === 'development') {
      if (this.errors.length > 0) {
        console.error('❌ Frontend environment validation failed:');
        this.errors.forEach(error => console.error(`  - ${error}`));
      }

      if (this.warnings.length > 0) {
        console.warn('⚠️ Frontend environment validation warnings:');
        this.warnings.forEach(warning => console.warn(`  - ${warning}`));
      }

      if (this.errors.length === 0) {
        console.log('✅ Frontend environment validation passed');
        console.log(`🚀 Frontend connecting to API: ${this.config.NEXT_PUBLIC_API_URL}`);
      }
    }

    // Throw error if validation failed
    if (this.errors.length > 0) {
      throw new Error(`Frontend environment validation failed: ${this.errors.join(', ')}`);
    }
  }

  getConfig(): ClientEnvironmentConfig {
    return this.config;
  }

  get(key: keyof ClientEnvironmentConfig): any {
    return this.config[key];
  }

  getApiUrl(): string {
    return this.config.NEXT_PUBLIC_API_URL;
  }

  isDevelopment(): boolean {
    return this.config.NODE_ENV === 'development';
  }

  isProduction(): boolean {
    return this.config.NODE_ENV === 'production';
  }

  isTest(): boolean {
    return this.config.NODE_ENV === 'test';
  }

  hasErrors(): boolean {
    return this.errors.length > 0;
  }

  hasWarnings(): boolean {
    return this.warnings.length > 0;
  }

  getErrors(): string[] {
    return [...this.errors];
  }

  getWarnings(): string[] {
    return [...this.warnings];
  }
}

// Singleton instance
export const envValidation = new EnvValidationService();
export default envValidation;