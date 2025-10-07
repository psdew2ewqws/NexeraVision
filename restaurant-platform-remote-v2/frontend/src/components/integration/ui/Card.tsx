import React from 'react'
import { clsx } from 'clsx'

interface CardProps {
  children: React.ReactNode
  className?: string
  padding?: boolean
}

export const Card: React.FC<CardProps> = ({
  children,
  className,
  padding = true
}) => {
  return (
    <div className={clsx(
      'bg-gray-900 border border-gray-800 rounded-lg',
      padding && 'p-6',
      className
    )}>
      {children}
    </div>
  )
}

export const CardHeader: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className
}) => {
  return (
    <div className={clsx('border-b border-gray-800 pb-4 mb-4', className)}>
      {children}
    </div>
  )
}

export const CardTitle: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className
}) => {
  return (
    <h3 className={clsx('text-lg font-semibold text-gray-100', className)}>
      {children}
    </h3>
  )
}

export const CardDescription: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className
}) => {
  return (
    <p className={clsx('text-sm text-gray-400 mt-1', className)}>
      {children}
    </p>
  )
}

export const CardContent: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className
}) => {
  return (
    <div className={className}>
      {children}
    </div>
  )
}
