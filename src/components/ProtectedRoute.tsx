/**
 * Protected route component.
 *
 * Redirects unauthenticated users to login.
 * Shows loading state while restoring session.
 */

import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Loading } from './ui/Loading';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: string;
  requiredPermission?: string;
}

export function ProtectedRoute({
  children,
  requiredRole,
  requiredPermission,
}: ProtectedRouteProps) {
  const { user, loading, isAuthenticated, error } = useAuth();
  const location = useLocation();

  // Show loading while restoring session
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loading size="lg" label="Restoring session..." />
      </div>
    );
  }

  // Show system error if there was an auth resolution error
  // This is different from "Access Denied" - it's a system problem
  if (error && (error.code === 'SESSION_RESTORE_FAILED' || error.code === 'LOGIN_FAILED')) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="text-center max-w-md">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">System Error</h2>
          <p className="text-gray-600 mb-4">
            An error occurred while loading your account. Please try again or contact support if the problem persists.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Block access if user has no profile or no authorized role
  // This covers: no profile, no roles, or unauthorized roles
  if (!user?.profile || !user.roles || user.roles.length === 0) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="text-center max-w-md">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600 mb-4">
            Your account is not authorized to access this system. Please contact the system administrator.
          </p>
        </div>
      </div>
    );
  }

  // Check role requirement
  if (requiredRole && !user?.roles.includes(requiredRole)) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600">
            You don't have permission to access this page.
          </p>
        </div>
      </div>
    );
  }

  // Check permission requirement
  if (requiredPermission && !user?.permissions.includes(requiredPermission)) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600">
            You don't have permission to access this page.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
