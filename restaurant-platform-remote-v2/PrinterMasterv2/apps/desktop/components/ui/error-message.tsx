import { Button } from './button';
import { Alert } from './alert';

interface ErrorMessageProps {
  title?: string;
  message: string;
  onRetry?: () => void;
}

export function ErrorMessage({ title = 'Error', message, onRetry }: ErrorMessageProps) {
  return (
    <div className="space-y-4">
      <Alert variant="destructive">
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <div>
          <h4 className="font-semibold">{title}</h4>
          <p className="text-sm mt-1">{message}</p>
        </div>
      </Alert>
      
      {onRetry && (
        <div className="flex justify-center">
          <Button onClick={onRetry} variant="outline">
            Try Again
          </Button>
        </div>
      )}
    </div>
  );
}