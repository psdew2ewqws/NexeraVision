import React from 'react'
import { useLicense } from 'src/contexts/LicenseContext'
import { ExclamationTriangleIcon, XMarkIcon } from '@heroicons/react/24/outline'
import { ClockIcon, ExclamationCircleIcon } from '@heroicons/react/24/solid'

const LicenseWarningHeader: React.FC = () => {
  const { license, notifications, dismissNotification } = useLicense()

  if (!license || (!license.is_near_expiry && !license.is_expired && notifications.length === 0)) {
    return null
  }

  const getWarningStyles = () => {
    if (license.is_expired) {
      return 'bg-red-600 border-red-700 text-white'
    } else if (license.is_critical || license.warning_level === 'critical') {
      return 'bg-red-500 border-red-600 text-white'
    } else if (license.warning_level === 'warning') {
      return 'bg-amber-500 border-amber-600 text-white'
    } else if (license.warning_level === 'notice') {
      return 'bg-orange-500 border-orange-600 text-white'
    }
    return 'bg-blue-500 border-blue-600 text-white'
  }

  const getWarningIcon = () => {
    if (license.is_expired || license.is_critical) {
      return <ExclamationCircleIcon className="w-5 h-5" />
    } else if (license.is_near_expiry) {
      return <ClockIcon className="w-5 h-5" />
    }
    return <ExclamationTriangleIcon className="w-5 h-5" />
  }

  const getWarningMessage = () => {
    if (license.is_expired) {
      return `Your ${license.type} license has EXPIRED! Please renew immediately to continue using the system.`
    } else if (license.is_critical) {
      return `URGENT: Your ${license.type} license expires in ${license.days_remaining} days! Please renew immediately.`
    } else if (license.warning_level === 'warning') {
      return `WARNING: Your ${license.type} license expires in ${license.days_remaining} days. Please plan for renewal.`
    } else if (license.warning_level === 'notice') {
      return `NOTICE: Your ${license.type} license expires in ${license.days_remaining} days. Consider renewal soon.`
    }
    return ''
  }

  const shouldShowWarning = license.is_expired || license.is_near_expiry || license.warning_level !== 'active'

  return (
    <>
      {/* Main License Warning Banner */}
      {shouldShowWarning && (
        <div className={`${getWarningStyles()} border-b px-4 py-3 sticky top-0 z-50 shadow-lg`}>
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                {getWarningIcon()}
                <div className="flex-1">
                  <p className="font-semibold text-sm">
                    {getWarningMessage()}
                  </p>
                  <div className="flex items-center space-x-4 mt-1">
                    <span className="text-xs opacity-90">
                      License Type: {license.type?.toUpperCase()}
                    </span>
                    {license.expires_at && (
                      <span className="text-xs opacity-90">
                        Expires: {new Date(license.expires_at).toLocaleDateString()}
                      </span>
                    )}
                    <span className="text-xs opacity-90">
                      Features: {license.features?.join(', ') || 'Basic'}
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <button 
                  className="px-4 py-1.5 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-md text-xs font-medium transition-colors"
                  onClick={() => {
                    // You can implement a contact sales or renewal flow here
                    window.open('mailto:sales@restaurantplatform.com?subject=License Renewal Request', '_blank')
                  }}
                >
                  {license.is_expired ? 'Renew Now' : 'Contact Sales'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Individual Notifications */}
      {notifications.map((notification) => (
        <div
          key={notification.id}
          className={`${
            notification.severity === 'critical' 
              ? 'bg-red-500 text-white' 
              : notification.severity === 'warning' 
              ? 'bg-amber-500 text-white' 
              : 'bg-blue-500 text-white'
          } border-b px-4 py-2`}
        >
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <ExclamationTriangleIcon className="w-4 h-4" />
                <div>
                  <span className="font-medium text-sm">{notification.title}</span>
                  <p className="text-xs opacity-90 mt-0.5">{notification.message}</p>
                </div>
              </div>
              
              <button
                onClick={() => dismissNotification(notification.id)}
                className="p-1 hover:bg-white hover:bg-opacity-20 rounded-full transition-colors"
              >
                <XMarkIcon className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      ))}
    </>
  )
}

export default LicenseWarningHeader