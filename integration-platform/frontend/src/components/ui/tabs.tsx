import * as React from "react"

export interface TabsProps extends React.HTMLAttributes<HTMLDivElement> {
  defaultValue?: string
  value?: string
  onValueChange?: (value: string) => void
}

export const Tabs = React.forwardRef<HTMLDivElement, TabsProps>(
  ({ className = "", defaultValue, value, onValueChange, children, ...props }, ref) => {
    const [selectedValue, setSelectedValue] = React.useState(defaultValue || "")

    const handleValueChange = (newValue: string) => {
      setSelectedValue(newValue)
      onValueChange?.(newValue)
    }

    return (
      <div ref={ref} className={`tabs-container ${className}`} {...props}>
        {React.Children.map(children, child => {
          if (React.isValidElement(child)) {
            return React.cloneElement(child as any, {
              selectedValue: value || selectedValue,
              onValueChange: handleValueChange
            })
          }
          return child
        })}
      </div>
    )
  }
)
Tabs.displayName = "Tabs"

export const TabsList = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className = "", children, ...props }, ref) => (
    <div ref={ref} className={`inline-flex h-10 items-center justify-center rounded-md bg-gray-100 p-1 ${className}`} {...props}>
      {children}
    </div>
  )
)
TabsList.displayName = "TabsList"

export const TabsTrigger = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & { value: string; selectedValue?: string; onValueChange?: (value: string) => void }
>(({ className = "", value, selectedValue, onValueChange, children, ...props }, ref) => {
  const isSelected = selectedValue === value

  return (
    <button
      ref={ref}
      className={`inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 ${
        isSelected ? "bg-white text-black shadow-sm" : "text-gray-600 hover:text-gray-900"
      } ${className}`}
      onClick={() => onValueChange?.(value)}
      {...props}
    >
      {children}
    </button>
  )
})
TabsTrigger.displayName = "TabsTrigger"

export const TabsContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { value: string; selectedValue?: string }
>(({ className = "", value, selectedValue, children, ...props }, ref) => {
  if (selectedValue !== value) return null

  return (
    <div ref={ref} className={`mt-2 ${className}`} {...props}>
      {children}
    </div>
  )
})
TabsContent.displayName = "TabsContent"