import { cn } from '../../lib/utils';
import { AlertCircle } from 'lucide-react';
import { Button } from './Button';

interface ErrorDisplayProps {
  title?: string;
  message?: string;
  error?: Error | null;
  onRetry?: () => void;
  className?: string;
}

export function ErrorDisplay({
  title = 'Error',
  message = 'Something went wrong. Please try again.',
  error,
  onRetry,
  className,
}: ErrorDisplayProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-12 px-4 text-center', className)}>
      <div className="mb-4 rounded-full bg-red-100 p-4">
        <AlertCircle className="h-8 w-8 text-red-500" />
      </div>
      <h3 className="text-lg font-medium text-gray-900">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-gray-500">{message}</p>
      {error && (
        <p className="mt-2 text-xs text-gray-400">{error.message}</p>
      )}
      {onRetry && (
        <Button variant="secondary" size="sm" onClick={onRetry} className="mt-4">
          Try Again
        </Button>
      )}
    </div>
  );
}
