import { cn } from '../../lib/utils';

interface DateFilterProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export function DateFilter({ label = 'Date', value, onChange, className }: DateFilterProps) {
  return (
    <div className={cn('flex flex-col gap-1', className)}>
      {label && (
        <label className="text-xs font-medium text-gray-700">{label}</label>
      )}
      <input
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      />
    </div>
  );
}
