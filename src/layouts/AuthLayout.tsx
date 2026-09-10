import { Outlet } from 'react-router-dom';

/**
 * Layout for unauthenticated pages (login, etc.)
 * Simple centered layout - the page itself handles the card design.
 */
export function AuthLayout() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 px-4 py-8">
      <Outlet />
    </div>
  );
}
