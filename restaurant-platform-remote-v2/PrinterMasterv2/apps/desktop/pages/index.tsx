import { useState, useEffect } from 'react';

export default function HomePage() {
  const [licenseKey, setLicenseKey] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isElectron, setIsElectron] = useState(false);

  useEffect(() => {
    // Check if running in Electron
    console.log('Checking for Electron API...', {
      window: typeof window,
      electronAPI: typeof window?.electronAPI,
      location: window?.location?.href
    });
    
    if (typeof window !== 'undefined' && window.electronAPI) {
      console.log('Electron API detected!');
      setIsElectron(true);
    } else {
      console.log('No Electron API found');
      // Force Electron detection in desktop environment
      if (typeof window !== 'undefined' && window.location.protocol === 'file:') {
        setIsElectron(true);
      }
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      if (isElectron && window.electronAPI) {
        // Use Electron API to validate license (using branch ID as license key)
        const result = await window.electronAPI.validateLicense(licenseKey);
        if (result.success) {
          const license = result.data;
          
          // Show success message briefly
          const message = `Branch License validated successfully!\n\n` +
            `Branch ID: ${license.branchId}\n` +
            `Branch Name: ${license.branchName}\n` +
            `Company: ${license.companyName}\n` +
            `Status: ${license.status}\n` +
            `Features: ${license.features?.join(', ') || 'All features'}\n` +
            `Max Printers: ${license.maxPrinters || 'Unlimited'}\n` +
            `Device ID: ${license.deviceId}\n\n` +
            `Redirecting to main dashboard...`;
          
          alert(message);
          
          // Navigate to the main dashboard
          setTimeout(async () => {
            try {
              const navResult = await window.electronAPI.navigateToDashboard();
              if (!navResult.success) {
                console.error('Navigation failed:', navResult.error);
                setError('License validated but failed to navigate to dashboard: ' + navResult.error);
              }
            } catch (navError) {
              console.error('Navigation error:', navError);
              setError('License validated but failed to navigate to dashboard: ' + (navError as Error).message);
            }
          }, 2000); // 2 second delay to show success message
        } else {
          setError(result.error || 'License validation failed');
        }
      } else {
        // Fallback for web version
        alert('Branch ID entered: ' + licenseKey + '\n\nNote: Full branch license validation requires desktop app.');
      }
    } catch (err) {
      setError('Failed to validate license: ' + (err as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #dbeafe 0%, #e0e7ff 100%)',
      padding: '1rem',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      <div style={{ maxWidth: '28rem', width: '100%' }}>
        <div style={{
          backgroundColor: 'white',
          borderRadius: '0.5rem',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
          padding: '2rem'
        }}>
          {/* Logo and Title */}
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <div style={{
              width: '4rem',
              height: '4rem',
              backgroundColor: '#2563eb',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1rem',
              color: 'white'
            }}>
              <svg 
                style={{ width: '2rem', height: '2rem' }}
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" 
                />
              </svg>
            </div>
            <h1 style={{
              fontSize: '1.875rem',
              fontWeight: 'bold',
              color: '#111827',
              marginBottom: '0.5rem',
              margin: '0'
            }}>
              RestaurantPrint Pro
            </h1>
            <p style={{
              color: '#6b7280',
              margin: '0.5rem 0 0 0'
            }}>
              Enterprise Printer Management System
            </p>
          </div>

          {/* Status Badge */}
          <div style={{ marginBottom: '1.5rem', textAlign: 'center' }}>
            <span style={{
              display: 'inline-flex',
              padding: '0.25rem 0.75rem',
              borderRadius: '9999px',
              fontSize: '0.75rem',
              fontWeight: '500',
              backgroundColor: isElectron ? '#dcfce7' : '#fef3c7',
              color: isElectron ? '#166534' : '#92400e'
            }}>
              {isElectron ? '🖥️ Desktop Mode' : '🌐 Web Mode'}
            </span>
          </div>

          {/* License Form */}
          <form onSubmit={handleSubmit} style={{ marginBottom: '2rem' }}>
            <div style={{ marginBottom: '1rem' }}>
              <label 
                htmlFor="license" 
                style={{
                  display: 'block',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  color: '#374151',
                  marginBottom: '0.5rem'
                }}
              >
                Branch ID (License Key)
              </label>
              <input
                id="license"
                type="text"
                value={licenseKey}
                onChange={(e) => setLicenseKey(e.target.value)}
                placeholder="e.g., 40f863e7-b719-4142-8e94-724572002d9b"
                style={{
                  width: '100%',
                  padding: '0.5rem 0.75rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.375rem',
                  fontSize: '1rem',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
                required
                disabled={isLoading}
              />
            </div>

            {error && (
              <div style={{
                backgroundColor: '#fef2f2',
                border: '1px solid #fecaca',
                color: '#b91c1c',
                padding: '0.75rem 1rem',
                borderRadius: '0.375rem',
                fontSize: '0.875rem',
                marginBottom: '1rem'
              }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading || !licenseKey.trim()}
              style={{
                width: '100%',
                backgroundColor: isLoading || !licenseKey.trim() ? '#9ca3af' : '#2563eb',
                color: 'white',
                fontWeight: '600',
                padding: '0.5rem 1rem',
                borderRadius: '0.375rem',
                border: 'none',
                cursor: isLoading || !licenseKey.trim() ? 'not-allowed' : 'pointer',
                transition: 'background-color 0.2s',
                fontSize: '1rem'
              }}
              onMouseOver={(e) => {
                if (!isLoading && licenseKey.trim()) {
                  (e.target as HTMLButtonElement).style.backgroundColor = '#1d4ed8';
                }
              }}
              onMouseOut={(e) => {
                if (!isLoading && licenseKey.trim()) {
                  (e.target as HTMLButtonElement).style.backgroundColor = '#2563eb';
                }
              }}
            >
              {isLoading ? 'Validating...' : 'Activate License'}
            </button>
          </form>

          {/* Footer */}
          <div style={{
            textAlign: 'center',
            fontSize: '0.875rem',
            color: '#6b7280'
          }}>
            <p style={{ margin: '0 0 0.25rem 0' }}>Phase 5 - Desktop Application</p>
            <p style={{ margin: '0' }}>Version 2.0.0</p>
          </div>
        </div>
      </div>
    </div>
  );
}