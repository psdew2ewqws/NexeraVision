import * as React from "react"

export const DropdownMenu = ({ children }: { children: React.ReactNode }) => {
  const [isOpen, setIsOpen] = React.useState(false)

  return (
    <div className="relative inline-block text-left">
      {React.Children.map(children, child => {
        if (React.isValidElement(child)) {
          return React.cloneElement(child as any, { isOpen, setIsOpen })
        }
        return child
      })}
    </div>
  )
}

export const DropdownMenuTrigger = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & {
    isOpen?: boolean
    setIsOpen?: (open: boolean) => void
    asChild?: boolean
  }
>(({ children, isOpen, setIsOpen, asChild = false, ...props }, ref) => {
  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault()
    setIsOpen?.(!isOpen)
  }

  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children as any, {
      onClick: handleClick,
      ...props
    })
  }

  return (
    <button
      ref={ref}
      onClick={handleClick}
      type="button"
      className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
      {...props}
    >
      {children}
    </button>
  )
})
DropdownMenuTrigger.displayName = "DropdownMenuTrigger"

export const DropdownMenuContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    isOpen?: boolean
    setIsOpen?: (open: boolean) => void
    align?: "start" | "center" | "end"
    sideOffset?: number
  }
>(({ children, isOpen, setIsOpen, align = "start", className = "", ...props }, ref) => {
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      if (!target.closest('[role="menu"]') && !target.closest('button')) {
        setIsOpen?.(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen, setIsOpen])

  if (!isOpen) return null

  return (
    <div
      ref={ref}
      role="menu"
      className={`absolute right-0 z-50 mt-2 min-w-[8rem] overflow-hidden rounded-md border bg-white p-1 shadow-md animate-in data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 ${className}`}
      {...props}
    >
      {children}
    </div>
  )
})
DropdownMenuContent.displayName = "DropdownMenuContent"

export const DropdownMenuItem = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    inset?: boolean
    disabled?: boolean
  }
>(({ className = "", inset, disabled, ...props }, ref) => (
  <div
    ref={ref}
    className={`relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-gray-100 focus:bg-gray-100 ${
      disabled ? "pointer-events-none opacity-50" : ""
    } ${inset ? "pl-8" : ""} ${className}`}
    {...props}
  />
))
DropdownMenuItem.displayName = "DropdownMenuItem"

export const DropdownMenuCheckboxItem = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    checked?: boolean
    onCheckedChange?: (checked: boolean) => void
    disabled?: boolean
  }
>(({ className = "", children, checked, onCheckedChange, disabled, ...props }, ref) => (
  <DropdownMenuItem
    ref={ref}
    className={className}
    onClick={() => !disabled && onCheckedChange?.(!checked)}
    disabled={disabled}
    {...props}
  >
    <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
      {checked && (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      )}
    </span>
    <span className="pl-6">{children}</span>
  </DropdownMenuItem>
))
DropdownMenuCheckboxItem.displayName = "DropdownMenuCheckboxItem"

export const DropdownMenuRadioItem = DropdownMenuCheckboxItem

export const DropdownMenuLabel = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    inset?: boolean
  }
>(({ className = "", inset, ...props }, ref) => (
  <div
    ref={ref}
    className={`px-2 py-1.5 text-sm font-semibold ${inset ? "pl-8" : ""} ${className}`}
    {...props}
  />
))
DropdownMenuLabel.displayName = "DropdownMenuLabel"

export const DropdownMenuSeparator = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className = "", ...props }, ref) => (
  <div ref={ref} className={`-mx-1 my-1 h-px bg-gray-200 ${className}`} {...props} />
))
DropdownMenuSeparator.displayName = "DropdownMenuSeparator"

export const DropdownMenuShortcut = ({
  className = "",
  ...props
}: React.HTMLAttributes<HTMLSpanElement>) => {
  return (
    <span className={`ml-auto text-xs tracking-widest opacity-60 ${className}`} {...props} />
  )
}
DropdownMenuShortcut.displayName = "DropdownMenuShortcut"

export const DropdownMenuGroup = DropdownMenuItem
export const DropdownMenuPortal = ({ children }: { children: React.ReactNode }) => <>{children}</>
export const DropdownMenuSub = DropdownMenu
export const DropdownMenuSubContent = DropdownMenuContent
export const DropdownMenuSubTrigger = DropdownMenuItem
export const DropdownMenuRadioGroup = DropdownMenuGroup