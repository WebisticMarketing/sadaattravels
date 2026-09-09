import { EmptyState } from '../components/ui/EmptyState';
import { Construction } from 'lucide-react';

/**
 * Placeholder page for modules not yet implemented.
 * Shows a "coming soon" empty state.
 */
export default function PlaceholderPage({ title }: { title: string }) {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
      <EmptyState
        title="Module Under Construction"
        description={`The ${title} module is being implemented and will be available soon.`}
        icon={<Construction className="h-8 w-8" />}
      />
    </div>
  );
}
