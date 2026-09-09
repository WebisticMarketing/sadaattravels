import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ErrorBoundary } from './components/ui/ErrorBoundary';

// Layouts
import { AppLayout } from './layouts/AppLayout';
import { AuthLayout } from './layouts/AuthLayout';

// Pages
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import NotFoundPage from './pages/NotFoundPage';

/**
 * Application route definitions.
 *
 * Structure:
 *   /login              → AuthLayout → LoginPage
 *   /app/*              → AppLayout (authenticated shell)
 *     /app/dashboard    → DashboardPage
 *   /                   → Redirect to /app/dashboard
 *   *                   → NotFoundPage
 *
 * When authentication is implemented, a <ProtectedRoute> wrapper
 * will be added around the /app/* routes.
 */
export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Routes>
          {/* Root redirect */}
          <Route path="/" element={<Navigate to="/app/dashboard" replace />} />

          {/* Auth routes */}
          <Route element={<AuthLayout />}>
            <Route path="/login" element={<LoginPage />} />
          </Route>

          {/* Application routes (authenticated area) */}
          <Route path="/app" element={<AppLayout />}>
            <Route path="dashboard" element={<DashboardPage />} />

            {/* 
              Future module routes will be added here:
              <Route path="buses" element={<BusesPage />} />
              <Route path="trips" element={<TripsPage />} />
              <Route path="adda" element={<AddaPage />} />
              ...
            */}
          </Route>

          {/* 404 */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
