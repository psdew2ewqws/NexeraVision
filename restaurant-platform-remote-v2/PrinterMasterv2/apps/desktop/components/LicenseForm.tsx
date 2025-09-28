import { useState } from 'react';
import { useAppStore } from '@/stores/app-store';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert } from '@/components/ui/alert';

export function LicenseForm() {
  const [licenseKey, setLicenseKey] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const { validateLicense } = useAppStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!licenseKey.trim()) {
      setValidationError('Please enter a license key');
      return;
    }

    // Basic format validation
    const licensePattern = /^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/;
    if (!licensePattern.test(licenseKey.toUpperCase())) {
      setValidationError('License key must be in format: XXXX-XXXX-XXXX-XXXX');
      return;
    }

    setIsValidating(true);
    setValidationError(null);

    try {
      const success = await validateLicense(licenseKey.toUpperCase());
      if (!success) {
        setValidationError('Invalid license key. Please check and try again.');
      }
    } catch (error) {
      setValidationError(
        error instanceof Error ? error.message : 'License validation failed'
      );
    } finally {
      setIsValidating(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    
    // Auto-format with dashes
    if (value.length > 0) {
      value = value.match(/.{1,4}/g)?.join('-') || value;
      if (value.length > 19) { // XXXX-XXXX-XXXX-XXXX = 19 chars
        value = value.substring(0, 19);
      }
    }
    
    setLicenseKey(value);
    
    // Clear validation error when user starts typing
    if (validationError) {
      setValidationError(null);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          License Activation
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Enter your RestaurantPrint Pro license key to get started
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label 
            htmlFor="licenseKey" 
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
          >
            License Key
          </label>
          <Input
            id="licenseKey"
            type="text"
            value={licenseKey}
            onChange={handleInputChange}
            placeholder="XXXX-XXXX-XXXX-XXXX"
            className="text-center font-mono text-lg tracking-wider"
            disabled={isValidating}
            autoFocus
          />
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Enter the license key provided by your system administrator
          </p>
        </div>

        {validationError && (
          <Alert variant="destructive">
            <svg 
              className="w-4 h-4" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" 
              />
            </svg>
            <span>{validationError}</span>
          </Alert>
        )}

        <Button
          type="submit"
          className="w-full"
          disabled={isValidating || !licenseKey.trim()}
        >
          {isValidating ? (
            <>
              <LoadingSpinner size="sm" className="mr-2" />
              Validating License...
            </>
          ) : (
            'Activate License'
          )}
        </Button>
      </form>

      <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
        <div className="text-center text-sm text-gray-500 dark:text-gray-400">
          <p>Need help? Contact your system administrator</p>
          <p className="mt-1">
            Version: {typeof window !== 'undefined' && window.electronAPI?.version ? 
              window.electronAPI.version : '2.0.0'}
          </p>
        </div>
      </div>
    </div>
  );
}