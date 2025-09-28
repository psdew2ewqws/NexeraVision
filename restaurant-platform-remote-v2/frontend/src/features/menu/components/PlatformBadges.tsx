// Platform Badges Component - Show platform assignments on product cards
import React from 'react';
import {
  GlobeAltIcon,
  DevicePhoneMobileIcon,
  PhoneIcon,
  BuildingStorefrontIcon,
  ComputerDesktopIcon,
  TruckIcon
} from '@heroicons/react/24/outline';

interface Platform {
  id: string;
  name: string;
  platformType: string;
  status: string;
}

interface PlatformBadgesProps {
  platforms: Platform[];
  maxVisible?: number;
  size?: 'sm' | 'md' | 'lg';
  showTooltip?: boolean;
  className?: string;
}

const platformTypeConfig = {
  'dine-in': {
    icon: BuildingStorefrontIcon,
    color: 'bg-green-100 text-green-800 border-green-200',
    label: 'Dine In'
  },
  'careem': {
    icon: TruckIcon,
    color: 'bg-orange-100 text-orange-800 border-orange-200',
    label: 'Careem'
  },
  'talabat': {
    icon: TruckIcon,
    color: 'bg-red-100 text-red-800 border-red-200',
    label: 'Talabat'
  },
  'phone': {
    icon: PhoneIcon,
    color: 'bg-blue-100 text-blue-800 border-blue-200',
    label: 'Phone'
  },
  'call-center': {
    icon: PhoneIcon,
    color: 'bg-purple-100 text-purple-800 border-purple-200',
    label: 'Call Center'
  },
  'website': {
    icon: GlobeAltIcon,
    color: 'bg-indigo-100 text-indigo-800 border-indigo-200',
    label: 'Website'
  },
  'kiosk': {
    icon: ComputerDesktopIcon,
    color: 'bg-gray-100 text-gray-800 border-gray-200',
    label: 'Kiosk'
  },
  'mobile-app': {
    icon: DevicePhoneMobileIcon,
    color: 'bg-cyan-100 text-cyan-800 border-cyan-200',
    label: 'Mobile App'
  },
  'custom': {
    icon: GlobeAltIcon,
    color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    label: 'Custom'
  }
};

const sizeConfig = {
  sm: {
    container: 'space-x-1',
    badge: 'px-1.5 py-0.5 text-xs',
    icon: 'w-3 h-3',
    overflow: 'text-xs px-1.5 py-0.5'
  },
  md: {
    container: 'space-x-1.5',
    badge: 'px-2 py-1 text-xs',
    icon: 'w-3.5 h-3.5',
    overflow: 'text-xs px-2 py-1'
  },
  lg: {
    container: 'space-x-2',
    badge: 'px-2.5 py-1.5 text-sm',
    icon: 'w-4 h-4',
    overflow: 'text-sm px-2.5 py-1.5'
  }
};

export const PlatformBadges: React.FC<PlatformBadgesProps> = ({
  platforms = [],
  maxVisible = 3,
  size = 'sm',
  showTooltip = true,
  className = ''
}) => {
  if (!platforms || platforms.length === 0) {
    return null;
  }

  const activePlatforms = platforms.filter(p => p.status === 'active');
  const visiblePlatforms = activePlatforms.slice(0, maxVisible);
  const remainingCount = activePlatforms.length - maxVisible;
  const sizeClasses = sizeConfig[size];

  const getPlatformConfig = (platform: Platform) => {
    const config = platformTypeConfig[platform.platformType as keyof typeof platformTypeConfig];
    if (config) {
      return config;
    }

    // Fallback for custom platforms
    return {
      icon: GlobeAltIcon,
      color: 'bg-gray-100 text-gray-800 border-gray-200',
      label: platform.name
    };
  };

  const allPlatformNames = activePlatforms.map(p => getPlatformConfig(p).label).join(', ');

  return (
    <div
      className={`flex items-center flex-wrap ${sizeClasses.container} ${className}`}
      title={showTooltip ? `Available on: ${allPlatformNames}` : undefined}
    >
      {visiblePlatforms.map((platform) => {
        const config = getPlatformConfig(platform);
        const Icon = config.icon;

        return (
          <span
            key={platform.id}
            className={`inline-flex items-center ${sizeClasses.badge} font-medium rounded-md border ${config.color} transition-colors`}
            title={showTooltip ? config.label : undefined}
          >
            <Icon className={`${sizeClasses.icon} mr-1`} />
            {size === 'lg' ? config.label : ''}
          </span>
        );
      })}

      {remainingCount > 0 && (
        <span
          className={`inline-flex items-center ${sizeClasses.overflow} font-medium rounded-md border bg-gray-100 text-gray-600 border-gray-200`}
          title={showTooltip ? `+${remainingCount} more platforms` : undefined}
        >
          +{remainingCount}
        </span>
      )}
    </div>
  );
};

// Platform Badge for single platform display
interface SinglePlatformBadgeProps {
  platform: Platform;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  showTooltip?: boolean;
  className?: string;
}

export const SinglePlatformBadge: React.FC<SinglePlatformBadgeProps> = ({
  platform,
  size = 'sm',
  showIcon = true,
  showTooltip = true,
  className = ''
}) => {
  const config = platformTypeConfig[platform.platformType as keyof typeof platformTypeConfig] || {
    icon: GlobeAltIcon,
    color: 'bg-gray-100 text-gray-800 border-gray-200',
    label: platform.name
  };

  const sizeClasses = sizeConfig[size];
  const Icon = config.icon;

  return (
    <span
      className={`inline-flex items-center ${sizeClasses.badge} font-medium rounded-md border ${config.color} ${className}`}
      title={showTooltip ? config.label : undefined}
    >
      {showIcon && <Icon className={`${sizeClasses.icon} ${size === 'lg' ? 'mr-1.5' : 'mr-1'}`} />}
      {size === 'lg' || !showIcon ? config.label : ''}
    </span>
  );
};

// Platform assignment status indicator
interface PlatformStatusIndicatorProps {
  totalPlatforms: number;
  assignedPlatforms: number;
  size?: 'sm' | 'md';
  className?: string;
}

export const PlatformStatusIndicator: React.FC<PlatformStatusIndicatorProps> = ({
  totalPlatforms,
  assignedPlatforms,
  size = 'sm',
  className = ''
}) => {
  const percentage = totalPlatforms > 0 ? Math.round((assignedPlatforms / totalPlatforms) * 100) : 0;
  const isComplete = assignedPlatforms === totalPlatforms;
  const isPartial = assignedPlatforms > 0 && assignedPlatforms < totalPlatforms;

  let colorClass = 'bg-gray-100 text-gray-600 border-gray-200';
  let statusText = 'No platforms';

  if (isComplete) {
    colorClass = 'bg-green-100 text-green-700 border-green-200';
    statusText = 'All platforms';
  } else if (isPartial) {
    colorClass = 'bg-yellow-100 text-yellow-700 border-yellow-200';
    statusText = `${assignedPlatforms}/${totalPlatforms} platforms`;
  }

  const sizeClasses = sizeConfig[size];

  return (
    <span
      className={`inline-flex items-center ${sizeClasses.badge} font-medium rounded-md border ${colorClass} ${className}`}
      title={`${assignedPlatforms} of ${totalPlatforms} platforms (${percentage}%)`}
    >
      <GlobeAltIcon className={`${sizeClasses.icon} mr-1`} />
      {statusText}
    </span>
  );
};

export default PlatformBadges;