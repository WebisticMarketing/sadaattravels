import { Outlet } from 'react-router-dom';

/**
 * Layout for unauthenticated pages (login, etc.)
 * Centred card on a branded background.
 */
export function AuthLayout() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 via-white to-gray-50 px-4">
      <div className="w-full max-w-md">
        {/* Auth content */}
        <div className="rounded-xl border border-gray-200 bg-white p-8 shadow-sm">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
