import { Link, useLocation } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { FileQuestion } from 'lucide-react';

/**
 * 404 — Page not found.
 */
export default function NotFoundPage() {
  const location = useLocation();

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center px-4">
      <div className="mb-4 rounded-full bg-gray-100 p-4">
        <FileQuestion className="h-10 w-10 text-gray-400" />
      </div>
      <h1 className="text-3xl font-bold text-gray-900">404</h1>
      <p className="mt-2 text-gray-500">
        The page <code className="rounded bg-gray-100 px-1.5 py-0.5 text-sm">{location.pathname}</code> was not found.
      </p>
      <div className="mt-6 flex gap-3">
        <Link to="/app/dashboard">
          <Button variant="primary">Go to Dashboard</Button>
        </Link>
        <Link to="/login">
          <Button variant="secondary">Sign In</Button>
        </Link>
      </div>
    </div>
  );
}
