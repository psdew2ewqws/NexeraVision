import { forwardRef } from 'react'

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive' | 'success'
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  loading?: boolean
  icon?: React.ReactNode
  iconPosition?: 'left' | 'right'
  fullWidth?: boolean
}

const buttonVariants = {
  primary: 'bg-slate-800 hover:bg-slate-900 focus:bg-slate-900 text-white shadow-sm border-slate-800 hover:border-slate-900',
  secondary: 'bg-slate-100 hover:bg-slate-200 focus:bg-slate-200 text-slate-800 shadow-sm border-slate-200 hover:border-slate-300',
  outline: 'bg-transparent hover:bg-slate-50 focus:bg-slate-50 text-slate-700 border-slate-300 hover:border-slate-400',
  ghost: 'bg-transparent hover:bg-slate-100 focus:bg-slate-100 text-slate-700 border-transparent',
  destructive: 'bg-red-600 hover:bg-red-700 focus:bg-red-700 text-white shadow-sm border-red-600 hover:border-red-700',
  success: 'bg-emerald-600 hover:bg-emerald-700 focus:bg-emerald-700 text-white shadow-sm border-emerald-600 hover:border-emerald-700'
}

const buttonSizes = {
  xs: 'px-2 py-1 text-xs font-medium min-h-[24px]',
  sm: 'px-3 py-1.5 text-sm font-medium min-h-[32px]',
  md: 'px-4 py-2 text-sm font-medium min-h-[36px]',
  lg: 'px-6 py-2.5 text-base font-medium min-h-[44px]',
  xl: 'px-8 py-3 text-lg font-semibold min-h-[52px]'
}

export const PremiumButton = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ 
    className = '', 
    variant = 'primary', 
    size = 'md', 
    loading = false,
    icon,
    iconPosition = 'left',
    fullWidth = false,
    disabled,
    children,
    ...props 
  }, ref) => {
    
    const baseClasses = [
      'inline-flex items-center justify-center',
      'border rounded-lg',
      'transition-all duration-200 ease-out',
      'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1',
      'disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none',
      'select-none',
      'relative overflow-hidden',
      // Add subtle shadow and transform effects
      'hover:transform hover:-translate-y-0.5',
      'active:transform active:translate-y-0',
      // Professional typography
      'font-inter antialiased',
      // Ensure consistent spacing
      'gap-2'
    ].join(' ')

    const variantClasses = buttonVariants[variant]
    const sizeClasses = buttonSizes[size]
    const widthClasses = fullWidth ? 'w-full' : ''
    
    const allClasses = [
      baseClasses,
      variantClasses,
      sizeClasses,
      widthClasses,
      className
    ].filter(Boolean).join(' ')

    return (
      <button
        ref={ref}
        className={allClasses}
        disabled={disabled || loading}
        {...props}
      >
        {/* Loading state */}
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-inherit rounded-lg">
            <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin opacity-70"></div>
          </div>
        )}
        
        {/* Content container */}
        <div className={`flex items-center gap-2 ${loading ? 'opacity-0' : ''}`}>
          {icon && iconPosition === 'left' && (
            <span className="flex-shrink-0">{icon}</span>
          )}
          
          {children && (
            <span className="whitespace-nowrap">{children}</span>
          )}
          
          {icon && iconPosition === 'right' && (
            <span className="flex-shrink-0">{icon}</span>
          )}
        </div>
        
        {/* Subtle shine effect on hover */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-0 hover:opacity-100 transition-opacity duration-300 -skew-x-12 transform translate-x-full hover:translate-x-[-100%] pointer-events-none"></div>
      </button>
    )
  }
)

PremiumButton.displayName = 'PremiumButton'

// Utility component for button groups with proper right alignment
export const ButtonGroup = ({ 
  children, 
  align = 'right',
  spacing = 'normal',
  className = '' 
}: {
  children: React.ReactNode
  align?: 'left' | 'center' | 'right' | 'between'
  spacing?: 'tight' | 'normal' | 'loose'
  className?: string
}) => {
  const alignmentClasses = {
    left: 'justify-start',
    center: 'justify-center', 
    right: 'justify-end',
    between: 'justify-between'
  }
  
  const spacingClasses = {
    tight: 'gap-1',
    normal: 'gap-3',
    loose: 'gap-6'
  }
  
  return (
    <div className={`flex items-center ${alignmentClasses[align]} ${spacingClasses[spacing]} ${className}`}>
      {children}
    </div>
  )
}

// Specialized components for common patterns
export const ActionButton = ({ 
  children, 
  onClick,
  variant = 'outline',
  size = 'sm',
  icon,
  ...props 
}: Omit<ButtonProps, 'children'> & { 
  children: React.ReactNode
  onClick?: () => void 
}) => (
  <PremiumButton
    variant={variant}
    size={size}
    icon={icon}
    onClick={onClick}
    {...props}
  >
    {children}
  </PremiumButton>
)

export const PrimaryActionButton = ({ 
  children, 
  onClick,
  loading = false,
  icon,
  ...props 
}: Omit<ButtonProps, 'children' | 'variant'> & { 
  children: React.ReactNode
  onClick?: () => void 
}) => (
  <PremiumButton
    variant="primary"
    size="md"
    loading={loading}
    icon={icon}
    onClick={onClick}
    {...props}
  >
    {children}
  </PremiumButton>
)

export const DestructiveActionButton = ({ 
  children, 
  onClick,
  loading = false,
  icon,
  ...props 
}: Omit<ButtonProps, 'children' | 'variant'> & { 
  children: React.ReactNode
  onClick?: () => void 
}) => (
  <PremiumButton
    variant="destructive"
    size="md"
    loading={loading}
    icon={icon}
    onClick={onClick}
    {...props}
  >
    {children}
  </PremiumButton>
)

// Professional Card component to complement the button system
export const ProfessionalCard = ({ 
  children, 
  title,
  description,
  actions,
  className = '',
  padding = 'normal'
}: {
  children: React.ReactNode
  title?: string
  description?: string
  actions?: React.ReactNode
  className?: string
  padding?: 'none' | 'tight' | 'normal' | 'loose'
}) => {
  const paddingClasses = {
    none: '',
    tight: 'p-4',
    normal: 'p-6', 
    loose: 'p-8'
  }
  
  return (
    <div className={`bg-white rounded-xl shadow-sm border border-gray-200 ${paddingClasses[padding]} ${className}`}>
      {(title || description || actions) && (
        <div className="flex items-start justify-between mb-6">
          <div>
            {title && (
              <h3 className="text-lg font-semibold text-gray-900 mb-1">{title}</h3>
            )}
            {description && (
              <p className="text-sm text-gray-600">{description}</p>
            )}
          </div>
          {actions && (
            <div className="flex-shrink-0">
              {actions}
            </div>
          )}
        </div>
      )}
      {children}
    </div>
  )
}

// Professional input component
export const ProfessionalInput = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement> & {
  label?: string
  error?: string
  helpText?: string
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
}>(({ className = '', label, error, helpText, leftIcon, rightIcon, ...props }, ref) => {
  return (
    <div className="space-y-2">
      {label && (
        <label className="block text-sm font-medium text-gray-700">
          {label}
        </label>
      )}
      <div className="relative">
        {leftIcon && (
          <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
            {leftIcon}
          </div>
        )}
        <input
          ref={ref}
          className={`
            block w-full px-3 py-2 
            ${leftIcon ? 'pl-10' : ''}
            ${rightIcon ? 'pr-10' : ''}
            border border-gray-300 rounded-lg
            bg-white text-gray-900 placeholder-gray-500
            focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
            disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed
            transition-colors duration-200
            ${error ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : ''}
            ${className}
          `}
          {...props}
        />
        {rightIcon && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400">
            {rightIcon}
          </div>
        )}
      </div>
      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}
      {helpText && !error && (
        <p className="text-sm text-gray-600">{helpText}</p>
      )}
    </div>
  )
})

ProfessionalInput.displayName = 'ProfessionalInput'