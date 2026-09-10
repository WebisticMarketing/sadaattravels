import { Outlet } from 'react-router-dom';

/**
 * Layout for unauthenticated pages (login, etc.)
 * Centred card on a branded background.
 */
export function AuthLayout() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 via-white to-gray-50 px-4">
      <div className="w-full max-w-md">
        {/* Branding */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-blue-600 text-white font-bold text-xl shadow-lg">
            ST
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Sadaat Travels</h1>
          <p className="mt-1 text-sm text-gray-500">Management System</p>
        </div>

        {/* Auth content */}
        <div className="rounded-xl border border-gray-200 bg-white p-8 shadow-sm">
          <Outlet />
        </div>

        {/* Footer */}
        <p className="mt-6 text-center text-xs text-gray-400">
          © {new Date().getFullYear()} Sadaat Travels. All rights reserved.
        </p>
      </div>
    </div>
  );
}
