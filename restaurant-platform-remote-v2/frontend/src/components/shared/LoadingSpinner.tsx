import React from 'react'
import { ArrowPathIcon } from '@heroicons/react/24/outline'

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl'
  text?: string
  overlay?: boolean
  className?: string
  color?: 'blue' | 'green' | 'gray' | 'white'
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'md',
  text,
  overlay = false,
  className = '',
  color = 'blue'
}) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
    xl: 'w-12 h-12'
  }

  const colorClasses = {
    blue: 'text-blue-600',
    green: 'text-green-600',
    gray: 'text-gray-600',
    white: 'text-white'
  }

  const textSizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
    xl: 'text-lg'
  }

  const spinner = (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      <ArrowPathIcon
        className={`${sizeClasses[size]} ${colorClasses[color]} animate-spin`}
      />
      {text && (
        <p className={`mt-2 ${textSizeClasses[size]} ${colorClasses[color]} font-medium`}>
          {text}
        </p>
      )}
    </div>
  )

  if (overlay) {
    return (
      <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-10">
        {spinner}
      </div>
    )
  }

  return spinner
}

// Skeleton loader components for different layouts
export const SkeletonCard: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`animate-pulse ${className}`}>
    <div className="bg-gray-200 rounded-lg h-32"></div>
  </div>
)

export const SkeletonText: React.FC<{
  lines?: number
  className?: string
}> = ({ lines = 3, className = '' }) => (
  <div className={`animate-pulse space-y-2 ${className}`}>
    {Array.from({ length: lines }).map((_, i) => (
      <div
        key={i}
        className={`bg-gray-200 rounded h-4 ${
          i === lines - 1 ? 'w-3/4' : 'w-full'
        }`}
      ></div>
    ))}
  </div>
)

export const SkeletonTable: React.FC<{
  rows?: number
  columns?: number
  className?: string
}> = ({ rows = 5, columns = 4, className = '' }) => (
  <div className={`animate-pulse ${className}`}>
    <div className="space-y-3">
      {/* Header */}
      <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
        {Array.from({ length: columns }).map((_, i) => (
          <div key={i} className="bg-gray-200 rounded h-4"></div>
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
          {Array.from({ length: columns }).map((_, colIndex) => (
            <div key={colIndex} className="bg-gray-100 rounded h-6"></div>
          ))}
        </div>
      ))}
    </div>
  </div>
)

export const SkeletonChart: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`animate-pulse ${className}`}>
    <div className="bg-gray-200 rounded-lg h-64 flex items-end justify-around p-4">
      {Array.from({ length: 12 }).map((_, i) => (
        <div
          key={i}
          className="bg-gray-300 rounded-t"
          style={{
            height: `${Math.random() * 60 + 20}%`,
            width: '6%'
          }}
        ></div>
      ))}
    </div>
  </div>
)

export default LoadingSpinner