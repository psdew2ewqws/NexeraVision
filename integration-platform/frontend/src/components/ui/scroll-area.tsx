import * as React from 'react';

interface ScrollAreaProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
}

export const ScrollArea = React.forwardRef<HTMLDivElement, ScrollAreaProps>(
  ({ className = '', children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={`relative overflow-auto ${className}`}
        {...props}
      >
        <div className="h-full w-full">{children}</div>
      </div>
    );
  }
);

ScrollArea.displayName = 'ScrollArea';

export const ScrollBar = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className = '', ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={`absolute right-0 top-0 w-2 bg-gray-300 rounded ${className}`}
      {...props}
    />
  );
});

ScrollBar.displayName = 'ScrollBar';