import { cn } from '../../lib/utils';

interface CurrencyDisplayProps {
  value: number;
  className?: string;
  showSign?: boolean;
}

export function CurrencyDisplay({ value, className, showSign = false }: CurrencyDisplayProps) {
  const formatted = new Intl.NumberFormat('en-PK', {
    style: 'currency',
    currency: 'PKR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Math.abs(value));

  const sign = showSign && value !== 0 ? (value > 0 ? '+' : '-') : '';
  const colorClass = value > 0 ? 'text-green-600' : value < 0 ? 'text-red-600' : 'text-gray-900';

  return (
    <span className={cn('font-medium', showSign && colorClass, className)}>
      {sign}Rs {formatted}
    </span>
  );
}
