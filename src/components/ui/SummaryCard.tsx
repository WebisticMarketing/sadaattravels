import { cn } from '../../lib/utils';
import type { ReactNode } from 'react';

interface SummaryCardProps {
  label: string;
  value: string | number;
  icon?: ReactNode;
  trend?: {
    value: number;
    label: string;
  };
  className?: string;
  variant?: 'default' | 'success' | 'warning' | 'danger';
}

export function SummaryCard({
  label,
  value,
  icon,
  trend,
  className,
  variant = 'default'
}: SummaryCardProps) {
  const variantStyles = {
    default: 'bg-white',
    success: 'bg-green-50',
    warning: 'bg-amber-50',
    danger: 'bg-red-50'
  };

  return (
    <div className={cn(
      'rounded-lg border border-gray-200 p-4',
      variantStyles[variant],
      className
    )}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600 mb-1">{label}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          {trend && (
            <div className="mt-2 flex items-center gap-1 text-xs">
              <span className={cn(
                'font-medium',
                trend.value > 0 ? 'text-green-600' : 'text-red-600'
              )}>
                {trend.value > 0 ? '↑' : '↓'} {Math.abs(trend.value)}%
              </span>
              <span className="text-gray-500">{trend.label}</span>
            </div>
          )}
        </div>
        {icon && (
          <div className="flex-shrink-0 text-gray-400">
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}
