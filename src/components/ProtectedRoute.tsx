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
  const { user, loading, isAuthenticated, needsBootstrap } = useAuth();
  const location = useLocation();

  // Show loading while restoring session
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loading size="lg" label="Restoring session..." />
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Redirect to bootstrap if authenticated but no profile
  if (needsBootstrap) {
    return <Navigate to="/bootstrap" replace />;
  }

  // Block access if user has profile but no OWNER/MANAGER role
  if (user?.profile && (!user.roles || user.roles.length === 0)) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="text-center max-w-md">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600 mb-4">
            Your account has not been assigned a role. Please contact an administrator.
          </p>
          <p className="text-sm text-gray-500">
            Only users with OWNER or MANAGER roles can access the application.
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
