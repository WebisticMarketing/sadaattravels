import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTrips } from '../hooks/useTrips';
import { useBuses } from '../hooks/useBuses';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Select } from '../components/ui/Select';
import { Input } from '../components/ui/Input';
import { Loading } from '../components/ui/Loading';
import { Alert } from '../components/ui/Alert';
import { Badge } from '../components/ui/Badge';
import { EmptyState } from '../components/ui/EmptyState';
import { formatCurrency, formatDate } from '../lib/utils';
import { Plus, Filter, Bus, Calendar, TrendingUp, TrendingDown } from 'lucide-react';

export default function TripsPage() {
  const navigate = useNavigate();
  const { buses } = useBuses();
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    busId: '',
    status: '',
  });

  const { trips, loading, error } = useTrips({
    startDate: filters.startDate || undefined,
    endDate: filters.endDate || undefined,
    busId: filters.busId || undefined,
    status: filters.status || undefined,
  });

  const [showFilters, setShowFilters] = useState(false);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loading size="lg" label="Loading trips..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4">
        <Alert variant="danger" title="Failed to load trips">
          {error}
        </Alert>
      </div>
    );
  }

  const activeTrips = trips.filter(t => t.status === 'active');
  const totalRevenue = activeTrips.reduce((sum, t) => sum + t.totalRevenue, 0);
  const totalExpenses = activeTrips.reduce((sum, t) => sum + t.totalExpenses, 0);
  const totalProfit = totalRevenue - totalExpenses;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Trips</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage trips and view financial summaries
          </p>
        </div>
        <Button onClick={() => navigate('/app/trips/new')}>
          <Plus className="mr-2 h-4 w-4" />
          New Trip
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
              <Calendar className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Trips</p>
              <p className="text-xl font-bold text-gray-900">{trips.length}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100">
              <TrendingUp className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Revenue</p>
              <p className="text-xl font-bold text-green-600">
                {formatCurrency(totalRevenue)}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-100">
              <TrendingDown className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Expenses</p>
              <p className="text-xl font-bold text-red-600">
                {formatCurrency(totalExpenses)}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100">
              <TrendingUp className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Profit</p>
              <p className={`text-xl font-bold ${totalProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(totalProfit)}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-gray-900">Filters</h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="mr-1 h-4 w-4" />
            {showFilters ? 'Hide' : 'Show'}
          </Button>
        </div>

        {showFilters && (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Input
              label="Start Date"
              type="date"
              value={filters.startDate}
              onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
            />
            <Input
              label="End Date"
              type="date"
              value={filters.endDate}
              onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
            />
            <Select
              label="Bus"
              value={filters.busId}
              onChange={(e) => setFilters({ ...filters, busId: e.target.value })}
              options={[
                { value: '', label: 'All buses' },
                ...buses.map(b => ({
                  value: b.id,
                  label: b.registration_number,
                })),
              ]}
            />
            <Select
              label="Status"
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              options={[
                { value: '', label: 'All statuses' },
                { value: 'active', label: 'Active' },
                { value: 'reversed', label: 'Reversed' },
                { value: 'cancelled', label: 'Cancelled' },
              ]}
            />
          </div>
        )}
      </Card>

      {/* Trips List */}
      {trips.length === 0 ? (
        <EmptyState
          title="No trips found"
          description={showFilters ? 'Try adjusting your filters' : 'Create your first trip to get started'}
          icon={<Bus className="h-8 w-8" />}
          action={
            !showFilters && (
              <Button onClick={() => navigate('/app/trips/new')}>
                <Plus className="mr-2 h-4 w-4" />
                Create First Trip
              </Button>
            )
          }
        />
      ) : (
        <div className="space-y-3">
          {trips.map((trip) => (
            <div
              key={trip.id}
              className="cursor-pointer"
              onClick={() => navigate(`/app/trips/${trip.id}`)}
            >
              <Card className="p-4 hover:shadow-md transition-shadow">
              <div className="space-y-3">
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-gray-900">
                        {trip.route}
                      </h3>
                      <Badge
                        variant={trip.status === 'active' ? 'success' : 'secondary'}
                        size="sm"
                      >
                        {trip.status}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-gray-500">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formatDate(new Date(trip.trip_date))}
                      </span>
                      <span className="flex items-center gap-1">
                        <Bus className="h-3 w-3" />
                        {trip.bus?.registration_number || 'Unknown'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Financial Summary */}
                <div className="grid grid-cols-3 gap-3 pt-3 border-t border-gray-200">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Revenue</p>
                    <p className="font-semibold text-green-600">
                      {formatCurrency(trip.totalRevenue)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Expenses</p>
                    <p className="font-semibold text-red-600">
                      {formatCurrency(trip.totalExpenses)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Profit</p>
                    <p className={`font-semibold ${trip.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(trip.profit)}
                    </p>
                  </div>
                </div>
              </div>
              </Card>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
