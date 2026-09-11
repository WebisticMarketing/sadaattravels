import { Printer } from 'lucide-react';
import { Button } from './Button';
import { cn } from '../../lib/utils';

interface PrintButtonProps {
  className?: string;
  label?: string;
}

export function PrintButton({ className, label = 'Print' }: PrintButtonProps) {
  const handlePrint = () => {
    window.print();
  };

  return (
    <Button
      variant="secondary"
      onClick={handlePrint}
      className={cn('gap-2', className)}
    >
      <Printer className="h-4 w-4" />
      {label}
    </Button>
  );
}
