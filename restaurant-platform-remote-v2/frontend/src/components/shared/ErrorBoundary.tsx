import React, { Component, ReactNode } from 'react'
import {
  ExclamationTriangleIcon,
  ArrowPathIcon,
  HomeIcon,
  ChatBubbleLeftRightIcon
} from '@heroicons/react/24/outline'

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
  errorInfo: React.ErrorInfo | null
  errorId: string
}

interface ErrorBoundaryProps {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void
  showDetails?: boolean
  level?: 'page' | 'component' | 'critical'
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: this.generateErrorId()
    }
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
      errorId: Date.now().toString(36) + Math.random().toString(36).substr(2)
    }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({
      error,
      errorInfo
    })

    // Log error to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('ErrorBoundary caught an error:', error, errorInfo)
    }

    // Call custom error handler
    this.props.onError?.(error, errorInfo)

    // Send error to monitoring service (if configured)
    this.logErrorToService(error, errorInfo)
  }

  private generateErrorId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2)
  }

  private logErrorToService(error: Error, errorInfo: React.ErrorInfo): void {
    try {
      // Log to external service (Sentry, LogRocket, etc.)
      const errorData = {
        message: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        errorId: this.state.errorId,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        url: window.location.href,
        level: this.props.level || 'component'
      }

      // Store in localStorage for debugging
      const existingErrors = JSON.parse(localStorage.getItem('dashboard_errors') || '[]')
      existingErrors.push(errorData)

      // Keep only last 10 errors
      const recentErrors = existingErrors.slice(-10)
      localStorage.setItem('dashboard_errors', JSON.stringify(recentErrors))

      // Send to monitoring endpoint (uncomment when monitoring is set up)
      // fetch('/api/errors', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(errorData)
      // }).catch(console.error)

    } catch (loggingError) {
      console.error('Failed to log error:', loggingError)
    }
  }

  private handleRetry = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: this.generateErrorId()
    })
  }

  private handleReload = (): void => {
    window.location.reload()
  }

  private handleGoHome = (): void => {
    window.location.href = '/dashboard'
  }

  private copyErrorToClipboard = (): void => {
    const errorText = `
Error ID: ${this.state.errorId}
Message: ${this.state.error?.message || 'Unknown error'}
Stack: ${this.state.error?.stack || 'No stack trace'}
Component Stack: ${this.state.errorInfo?.componentStack || 'No component stack'}
URL: ${window.location.href}
Timestamp: ${new Date().toISOString()}
    `.trim()

    navigator.clipboard.writeText(errorText).then(() => {
      alert('Error details copied to clipboard')
    }).catch(() => {
      // Fallback for older browsers
      const textArea = document.createElement('textarea')
      textArea.value = errorText
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand('copy')
      document.body.removeChild(textArea)
      alert('Error details copied to clipboard')
    })
  }

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback
      }

      const { level = 'component' } = this.props
      const isPageLevel = level === 'page'
      const isCritical = level === 'critical'

      return (
        <div className={`flex items-center justify-center ${
          isPageLevel ? 'min-h-screen bg-gray-50' : 'h-64'
        } p-6`}>
          <div className="max-w-md w-full">
            {/* Error Icon */}
            <div className={`text-center mb-6 ${isCritical ? 'text-red-600' : 'text-orange-600'}`}>
              <ExclamationTriangleIcon className={`mx-auto ${
                isPageLevel ? 'w-16 h-16' : 'w-12 h-12'
              }`} />
            </div>

            {/* Error Message */}
            <div className="text-center mb-6">
              <h2 className={`font-semibold text-gray-900 mb-2 ${
                isPageLevel ? 'text-xl' : 'text-lg'
              }`}>
                {isCritical ? 'Critical Error' : 'Something went wrong'}
              </h2>

              <p className="text-gray-600 text-sm mb-4">
                {isCritical
                  ? 'A critical error has occurred. Please contact support.'
                  : isPageLevel
                  ? 'We encountered an unexpected error. Please try refreshing the page.'
                  : 'This component failed to load properly.'
                }
              </p>

              {/* Error ID */}
              <p className="text-xs text-gray-500 font-mono">
                Error ID: {this.state.errorId}
              </p>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={this.handleRetry}
                  className="flex-1 flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <ArrowPathIcon className="w-4 h-4 mr-2" />
                  Try Again
                </button>

                {isPageLevel && (
                  <button
                    onClick={this.handleReload}
                    className="flex-1 flex items-center justify-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                  >
                    <ArrowPathIcon className="w-4 h-4 mr-2" />
                    Reload Page
                  </button>
                )}
              </div>

              {isPageLevel && (
                <button
                  onClick={this.handleGoHome}
                  className="w-full flex items-center justify-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  <HomeIcon className="w-4 h-4 mr-2" />
                  Go to Dashboard
                </button>
              )}

              {/* Error Details (Development/Debug) */}
              {(this.props.showDetails || process.env.NODE_ENV === 'development') && (
                <details className="mt-4">
                  <summary className="cursor-pointer text-sm text-gray-600 hover:text-gray-800">
                    Show Error Details
                  </summary>
                  <div className="mt-3 p-3 bg-gray-100 rounded-lg text-xs">
                    <div className="mb-2">
                      <strong>Error:</strong> {this.state.error?.message}
                    </div>
                    {this.state.error?.stack && (
                      <div className="mb-2">
                        <strong>Stack Trace:</strong>
                        <pre className="mt-1 text-xs overflow-x-auto whitespace-pre-wrap">
                          {this.state.error.stack}
                        </pre>
                      </div>
                    )}
                    {this.state.errorInfo?.componentStack && (
                      <div className="mb-2">
                        <strong>Component Stack:</strong>
                        <pre className="mt-1 text-xs overflow-x-auto whitespace-pre-wrap">
                          {this.state.errorInfo.componentStack}
                        </pre>
                      </div>
                    )}
                    <button
                      onClick={this.copyErrorToClipboard}
                      className="mt-2 text-xs text-blue-600 hover:text-blue-800"
                    >
                      Copy Error Details
                    </button>
                  </div>
                </details>
              )}

              {/* Support Contact */}
              <div className="text-center mt-4">
                <p className="text-xs text-gray-500 mb-2">
                  If this problem persists, please contact support
                </p>
                <button
                  onClick={() => {
                    // Open support chat or email
                    window.location.href = 'mailto:support@restaurant-platform.com?subject=Dashboard Error&body=' +
                      encodeURIComponent(`Error ID: ${this.state.errorId}\nURL: ${window.location.href}`)
                  }}
                  className="inline-flex items-center text-xs text-blue-600 hover:text-blue-800"
                >
                  <ChatBubbleLeftRightIcon className="w-3 h-3 mr-1" />
                  Contact Support
                </button>
              </div>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

// HOC for wrapping components with error boundary
export const withErrorBoundary = <T extends object>(
  Component: React.ComponentType<T>,
  errorBoundaryProps?: Omit<ErrorBoundaryProps, 'children'>
) => {
  const WrappedComponent = (props: T) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  )

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`
  return WrappedComponent
}

// Hook for error reporting
export const useErrorReporting = () => {
  const reportError = (error: Error, context?: string) => {
    const errorData = {
      message: error.message,
      stack: error.stack,
      context,
      timestamp: new Date().toISOString(),
      url: window.location.href
    }

    console.error('Manual error report:', errorData)

    // Store in localStorage
    const existingErrors = JSON.parse(localStorage.getItem('dashboard_errors') || '[]')
    existingErrors.push(errorData)
    localStorage.setItem('dashboard_errors', JSON.stringify(existingErrors.slice(-10)))
  }

  return { reportError }
}

export default ErrorBoundary