import { Card, CardTitle, CardDescription } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import {
  Bus,
  Route,
  MapPin,
  Fuel,
  Package,
  CreditCard,
  BarChart3,
  Wallet,
  ScrollText,
} from 'lucide-react';

/**
 * Dashboard placeholder page.
 * Shows a welcome message and a grid of upcoming modules.
 * Real dashboard content will replace this in a later phase.
 */
export default function DashboardPage() {
  const modules = [
    { name: 'Buses', icon: Bus, status: 'upcoming' },
    { name: 'Trips & Vouchers', icon: Route, status: 'upcoming' },
    { name: 'Adda', icon: MapPin, status: 'upcoming' },
    { name: 'Petrol Pump', icon: Fuel, status: 'upcoming' },
    { name: 'Cargo', icon: Package, status: 'upcoming' },
    { name: 'Installments', icon: CreditCard, status: 'upcoming' },
    { name: 'Reports', icon: BarChart3, status: 'upcoming' },
    { name: 'Personal Expenses', icon: Wallet, status: 'upcoming' },
    { name: 'Audit Logs', icon: ScrollText, status: 'upcoming' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500">
          Welcome to Sadaat Travels Management System.
        </p>
      </div>

      {/* Status banner */}
      <Card>
        <CardTitle>System Status</CardTitle>
        <CardDescription>
          Foundation is ready. Business modules are being implemented.
        </CardDescription>
        <div className="mt-4 flex flex-wrap gap-2">
          <Badge variant="success">Foundation ✓</Badge>
          <Badge variant="info">Routing ✓</Badge>
          <Badge variant="info">UI Components ✓</Badge>
          <Badge variant="warning">Auth — Pending</Badge>
          <Badge variant="warning">Business Modules — Pending</Badge>
        </div>
      </Card>

      {/* Module grid */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Modules</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {modules.map((mod) => (
            <div
              key={mod.name}
              className="flex items-center gap-4 rounded-xl border border-gray-200 bg-white p-4 opacity-60"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100 text-gray-400">
                <mod.icon className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-700">{mod.name}</p>
                <Badge variant="ghost" size="sm">Coming Soon</Badge>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
