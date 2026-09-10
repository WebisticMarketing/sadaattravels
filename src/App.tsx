import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ErrorBoundary } from './components/ui/ErrorBoundary';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AppLayout } from './layouts/AppLayout';
import { AuthLayout } from './layouts/AuthLayout';
import LoginPage from './pages/LoginPage';
import BootstrapPage from './pages/BootstrapPage';
import DashboardPage from './pages/DashboardPage';
import BusesPage from './pages/BusesPage';
import TripsPage from './pages/TripsPage';
import TripFormPage from './pages/TripFormPage';
import TripDetailPage from './pages/TripDetailPage';
import MaintenancePage from './pages/MaintenancePage';
import MaintenanceFormPage from './pages/MaintenanceFormPage';
import MaintenanceDetailPage from './pages/MaintenanceDetailPage';
import TyresPage from './pages/TyresPage';
import TyreFormPage from './pages/TyreFormPage';
import TyreDetailPage from './pages/TyreDetailPage';
import FuelPurchasesPage from './pages/FuelPurchasesPage';
import FuelPurchaseFormPage from './pages/FuelPurchaseFormPage';
import FuelSalesPage from './pages/FuelSalesPage';
import FuelSaleFormPage from './pages/FuelSaleFormPage';
import AddaPage from './pages/AddaPage';
import AddaIncomeFormPage from './pages/AddaIncomeFormPage';
import AddaExpenseFormPage from './pages/AddaExpenseFormPage';
import CargoPage from './pages/CargoPage';
import CargoFormPage from './pages/CargoFormPage';
import InstallmentsPage from './pages/InstallmentsPage';
import InstallmentFormPage from './pages/InstallmentFormPage';
import InstallmentDetailPage from './pages/InstallmentDetailPage';
import PersonalExpensesPage from './pages/PersonalExpensesPage';
import PersonalExpenseFormPage from './pages/PersonalExpenseFormPage';
import PersonalExpenseDetailPage from './pages/PersonalExpenseDetailPage';
import ReportsPage from './pages/ReportsPage';
import UsersPage from './pages/UsersPage';
import UserFormPage from './pages/UserFormPage';
import UserDetailPage from './pages/UserDetailPage';
import AuditLogsPage from './pages/AuditLogsPage';
import NotFoundPage from './pages/NotFoundPage';

/**
 * Application route definitions.
 *
 * Structure:
 *   /login              → AuthLayout → LoginPage
 *   /app/*              → AppLayout (authenticated shell)
 *     /app/dashboard    → DashboardPage (protected)
 *   /                   → Redirect to /app/dashboard
 *   *                   → NotFoundPage
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

          {/* Bootstrap route (authenticated but no profile) */}
          <Route path="/bootstrap" element={<BootstrapPage />} />

          {/* Application routes (authenticated area) */}
          <Route
            path="/app"
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="buses" element={<BusesPage />} />
            <Route path="trips" element={<TripsPage />} />
            <Route path="trips/new" element={<TripFormPage />} />
            <Route path="trips/:id" element={<TripDetailPage />} />
            <Route path="maintenance" element={<MaintenancePage />} />
            <Route path="maintenance/new" element={<MaintenanceFormPage />} />
            <Route path="maintenance/:id" element={<MaintenanceDetailPage />} />
            <Route path="maintenance/:id/edit" element={<MaintenanceFormPage />} />
            <Route path="tyres" element={<TyresPage />} />
            <Route path="tyres/new" element={<TyreFormPage />} />
            <Route path="tyres/:id" element={<TyreDetailPage />} />
            <Route path="tyres/:id/edit" element={<TyreFormPage />} />
            <Route path="petrol" element={<FuelSalesPage />} />
            <Route path="petrol/purchases" element={<FuelPurchasesPage />} />
            <Route path="petrol/purchases/new" element={<FuelPurchaseFormPage />} />
            <Route path="petrol/sales" element={<FuelSalesPage />} />
            <Route path="petrol/sales/new" element={<FuelSaleFormPage />} />
            <Route path="adda" element={<AddaPage />} />
            <Route path="adda/income/new" element={<AddaIncomeFormPage />} />
            <Route path="adda/expenses/new" element={<AddaExpenseFormPage />} />
            <Route path="cargo" element={<CargoPage />} />
            <Route path="cargo/new" element={<CargoFormPage />} />
            <Route path="installments" element={<InstallmentsPage />} />
            <Route path="installments/new" element={<InstallmentFormPage />} />
            <Route path="installments/:id" element={<InstallmentDetailPage />} />
            <Route path="expenses" element={<PersonalExpensesPage />} />
            <Route path="expenses/new" element={<PersonalExpenseFormPage />} />
            <Route path="expenses/:id" element={<PersonalExpenseDetailPage />} />
            <Route path="reports" element={<ReportsPage />} />
            <Route path="users" element={<UsersPage />} />
            <Route path="users/new" element={<UserFormPage />} />
            <Route path="users/:id" element={<UserDetailPage />} />
            <Route path="audit" element={<AuditLogsPage />} />

            {/* 
              Future module routes will be added here:
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
