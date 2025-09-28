import React from 'react';
import { cn } from '@/lib/utils';

interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'destructive';
}

const Alert = React.forwardRef<HTMLDivElement, AlertProps>(
  ({ className, variant = 'default', ...props }, ref) => {
    return (
      <div
        ref={ref}
        role="alert"
        className={cn(
          'relative w-full rounded-lg border p-4 [&>svg~*]:pl-7 [&>svg+div]:translate-y-[-3px] [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg]:text-foreground',
          {
            'border-border bg-background text-foreground': variant === 'default',
            'border-destructive/50 text-destructive dark:border-destructive [&>svg]:text-destructive': variant === 'destructive',
          },
          className
        )}
        {...props}
      />
    );
  }
);

Alert.displayName = 'Alert';

export { Alert };