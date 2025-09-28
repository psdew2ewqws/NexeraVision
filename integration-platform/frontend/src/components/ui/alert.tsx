import * as React from "react"

export interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "destructive" | "warning" | "success"
}

export const Alert = React.forwardRef<HTMLDivElement, AlertProps>(
  ({ className = "", variant = "default", children, ...props }, ref) => {
    const variantStyles = {
      default: "bg-white border-gray-200",
      destructive: "bg-red-50 border-red-200 text-red-900",
      warning: "bg-yellow-50 border-yellow-200 text-yellow-900",
      success: "bg-green-50 border-green-200 text-green-900"
    }

    return (
      <div
        ref={ref}
        role="alert"
        className={`relative w-full rounded-lg border p-4 ${variantStyles[variant]} ${className}`}
        {...props}
      >
        {children}
      </div>
    )
  }
)
Alert.displayName = "Alert"

export const AlertTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className = "", ...props }, ref) => (
  <h5
    ref={ref}
    className={`mb-1 font-medium leading-none tracking-tight ${className}`}
    {...props}
  />
))
AlertTitle.displayName = "AlertTitle"

export const AlertDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className = "", ...props }, ref) => (
  <div
    ref={ref}
    className={`text-sm opacity-90 ${className}`}
    {...props}
  />
))
AlertDescription.displayName = "AlertDescription"