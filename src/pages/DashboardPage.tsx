import { useState } from 'react';
import { useDashboardMetrics } from '../hooks/useDashboard';
import { 
  Loading, 
  Alert, 
  PageHeader, 
  MonthYearFilter,
  SummaryCard
} from '../components/ui';
import { formatCurrency } from '../lib/utils';
import { Bus, Fuel, TrendingUp, TrendingDown, Route } from 'lucide-react';

export default function DashboardPage() {
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  
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
      {/* Header with filters */}
      <PageHeader 
        title="Dashboard" 
        description="Business overview for Sadaat Travels"
      >
        <MonthYearFilter
          month={selectedMonth}
          year={selectedYear}
          onMonthChange={setSelectedMonth}
          onYearChange={setSelectedYear}
        />
      </PageHeader>

      {/* Today's Summary */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Today</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <SummaryCard
            label="Trips"
            value={metrics.today.trips}
            icon={<Route className="h-6 w-6" />}
          />
          <SummaryCard
            label="Revenue"
            value={formatCurrency(metrics.today.revenue)}
            icon={<TrendingUp className="h-6 w-6" />}
            variant="success"
          />
          <SummaryCard
            label="Expenses"
            value={formatCurrency(metrics.today.expenses)}
            icon={<TrendingDown className="h-6 w-6" />}
            variant="danger"
          />
          <SummaryCard
            label="Profit"
            value={formatCurrency(metrics.today.profit)}
            icon={<TrendingUp className="h-6 w-6" />}
            variant={metrics.today.profit >= 0 ? 'success' : 'danger'}
          />
        </div>
      </div>

      {/* This Month's Summary */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-3">This Month</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <SummaryCard
            label="Trips"
            value={metrics.thisMonth.trips}
            icon={<Route className="h-6 w-6" />}
          />
          <SummaryCard
            label="Revenue"
            value={formatCurrency(metrics.thisMonth.revenue)}
            icon={<TrendingUp className="h-6 w-6" />}
            variant="success"
          />
          <SummaryCard
            label="Expenses"
            value={formatCurrency(metrics.thisMonth.expenses)}
            icon={<TrendingDown className="h-6 w-6" />}
            variant="danger"
          />
          <SummaryCard
            label="Profit"
            value={formatCurrency(metrics.thisMonth.profit)}
            icon={<TrendingUp className="h-6 w-6" />}
            variant={metrics.thisMonth.profit >= 0 ? 'success' : 'danger'}
          />
        </div>
      </div>

      {/* Fleet Summary */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Fleet Summary</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <SummaryCard
            label="Active Buses"
            value={metrics.buses.active}
            icon={<Bus className="h-6 w-6" />}
          />
          <SummaryCard
            label="Total Buses"
            value={metrics.buses.total}
            icon={<Bus className="h-6 w-6" />}
          />
        </div>
      </div>

      {/* Fuel Summary */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Fuel Summary</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <SummaryCard
            label="Current Stock"
            value={`${metrics.fuel.currentStock.toFixed(0)} L`}
            icon={<Fuel className="h-6 w-6" />}
          />
        </div>
      </div>

      {/* Empty state message if no data */}
      {metrics.today.trips === 0 && metrics.thisMonth.trips === 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
          <p className="text-sm text-blue-700">
            No trip data available. Start by creating trips in the Trips & Vouchers section.
          </p>
        </div>
      )}
    </div>
  );
}
