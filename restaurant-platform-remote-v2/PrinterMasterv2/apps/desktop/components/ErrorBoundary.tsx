import React from 'react';
import { Button } from './ui/button';

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends React.Component<
  React.PropsWithChildren<{}>,
  ErrorBoundaryState
> {
  constructor(props: React.PropsWithChildren<{}>) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    // Log to Electron main process if available
    if (typeof window !== 'undefined' && window.electronAPI) {
      // Note: log method might not exist in ElectronAPI, using console for now
      console.error('React ErrorBoundary', {
        error: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
      });
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
          <div className="max-w-md w-full space-y-6 p-6">
            <div className="text-center">
              <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                Something went wrong
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                An unexpected error occurred in the application.
              </p>
            </div>
            
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
              <h3 className="font-semibold text-red-800 dark:text-red-200 mb-2">Error Details:</h3>
              <code className="text-sm text-red-700 dark:text-red-300 break-all">
                {this.state.error?.message}
              </code>
            </div>
            
            <div className="space-y-3">
              <Button
                onClick={() => {
                  this.setState({ hasError: false, error: undefined });
                  window.location.reload();
                }}
                className="w-full"
              >
                Reload Application
              </Button>
              
              <Button
                onClick={() => {
                  if (window.electronAPI) {
                    window.electronAPI.restartApp();
                  }
                }}
                variant="outline"
                className="w-full"
              >
                Restart Application
              </Button>
            </div>
            
            <div className="text-center text-sm text-gray-500 dark:text-gray-400">
              <p>If this problem persists, please contact support.</p>
              <p className="mt-1">Error ID: {Date.now()}</p>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}