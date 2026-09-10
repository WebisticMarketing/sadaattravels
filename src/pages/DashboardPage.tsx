import { useDashboardMetrics } from '../hooks/useDashboard';
import { Card } from '../components/ui/Card';
import { Loading } from '../components/ui/Loading';
import { Alert } from '../components/ui/Alert';
import { formatCurrency } from '../lib/utils';
import { Bus, Fuel, TrendingUp, TrendingDown, Calendar, Route } from 'lucide-react';

/**
 * Dashboard - Main overview page
 * 
 * Shows today's and this month's business metrics
 * Mobile-friendly, simple, and fast
 */
export default function DashboardPage() {
  const { metrics, loading, error } = useDashboardMetrics();

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loading size="lg" label="Loading dashboard..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4">
        <Alert variant="danger" title="Failed to load dashboard">
          {error}
        </Alert>
      </div>
    );
  }

  if (!metrics) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500">
          Business overview for Sadaat Travels
        </p>
      </div>

      {/* Today's Summary */}
      <div>
        <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold text-gray-900">
          <Calendar className="h-5 w-5" />
          Today
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <MetricCard
            label="Trips"
            value={metrics.today.trips.toString()}
            icon={<Route className="h-5 w-5 text-blue-600" />}
          />
          <MetricCard
            label="Revenue"
            value={formatCurrency(metrics.today.revenue)}
            icon={<TrendingUp className="h-5 w-5 text-green-600" />}
          />
          <MetricCard
            label="Expenses"
            value={formatCurrency(metrics.today.expenses)}
            icon={<TrendingDown className="h-5 w-5 text-red-600" />}
          />
          <MetricCard
            label="Profit"
            value={formatCurrency(metrics.today.profit)}
            valueColor={metrics.today.profit >= 0 ? 'text-green-600' : 'text-red-600'}
            icon={<TrendingUp className="h-5 w-5 text-green-600" />}
          />
        </div>
      </div>

      {/* This Month's Summary */}
      <div>
        <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold text-gray-900">
          <Calendar className="h-5 w-5" />
          This Month
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <MetricCard
            label="Trips"
            value={metrics.thisMonth.trips.toString()}
            icon={<Route className="h-5 w-5 text-blue-600" />}
          />
          <MetricCard
            label="Revenue"
            value={formatCurrency(metrics.thisMonth.revenue)}
            icon={<TrendingUp className="h-5 w-5 text-green-600" />}
          />
          <MetricCard
            label="Expenses"
            value={formatCurrency(metrics.thisMonth.expenses)}
            icon={<TrendingDown className="h-5 w-5 text-red-600" />}
          />
          <MetricCard
            label="Profit"
            value={formatCurrency(metrics.thisMonth.profit)}
            valueColor={metrics.thisMonth.profit >= 0 ? 'text-green-600' : 'text-red-600'}
            icon={<TrendingUp className="h-5 w-5 text-green-600" />}
          />
        </div>
      </div>

      {/* Quick Stats */}
      <div>
        <h2 className="mb-3 text-lg font-semibold text-gray-900">Quick Stats</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
                <Bus className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Buses</p>
                <p className="text-xl font-bold text-gray-900">
                  {metrics.buses.active} / {metrics.buses.total}
                </p>
                <p className="text-xs text-gray-500">Active / Total</p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100">
                <Fuel className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Fuel Stock</p>
                <p className="text-xl font-bold text-gray-900">
                  {metrics.fuel.currentStock.toFixed(1)} L
                </p>
                <p className="text-xs text-gray-500">Current stock</p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100">
                <TrendingUp className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Month Profit</p>
                <p className={`text-xl font-bold ${metrics.thisMonth.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(metrics.thisMonth.profit)}
                </p>
                <p className="text-xs text-gray-500">This month</p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

/**
 * Metric card component
 */
interface MetricCardProps {
  label: string;
  value: string;
  icon: React.ReactNode;
  valueColor?: string;
}

function MetricCard({ label, value, icon, valueColor = 'text-gray-900' }: MetricCardProps) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100">
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm text-gray-500">{label}</p>
          <p className={`truncate text-xl font-bold ${valueColor}`}>{value}</p>
        </div>
      </div>
    </Card>
  );
}
